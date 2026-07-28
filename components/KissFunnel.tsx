"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ImageUp, Lock, RefreshCw, Check, Sparkles } from "lucide-react";

// „Kiss any Model" — Funnel mit FAKE-FIRST-Monetarisierung (Owner-Entscheidung):
// Der Besucher wählt Model + eigenes Foto → wir spielen eine RENDER-SHOW (kostet nichts,
// KEIN API-Call) → „Dein Video ist fertig" läuft VERPIXELT (in Wahrheit das Model-Foto
// hinter starkem Blur) → „🔓 Unlock — Abo" (Stripe-Popup + Status-Poll) → ERST NACH der
// Zahlung (24-€-Abo, 5 Videos/Monat) startet die ECHTE Pixverse-Generierung (gleiche Pipeline wie Try-On: zwei
// Referenzen an @-Tokens, Raw-Prompt, 360p = Pixverse-Minimum) → Video klar anzeigen.
// Staff (Admin-PIN) überspringt alles: echte Generierung sofort, unverpixelt.
// Welche Models im Grid stehen, wählt der Admin im Kiss-Models-Tool (/api/kiss-config).

type Model = { id: string; name: string; photoUrl: string };

// Referenz-Look fürs Billing/Routing der Route (gleicher Default wie der Try-On-Funnel).
const KISS_LOOK_ID = "look-1784191032626-70e3608b";

// Platzhalter im Upload-Feld: ein MÄNNERGESICHT (Peter), abgedunkelt hinterlegt. Ohne das
// laden Nutzer erfahrungsgemäß noch ein Model hoch statt sich selbst. Als statische Datei
// im Repo, damit die URL nie abläuft (signierte Storage-Links tun das).
const PLACEHOLDER_MAN = "/kiss-placeholder.jpg";

// Pixverse-Prompt (V6, Raw): @person = das Model (1. Referenz), @Bild2 = das hochgeladene
// Foto (2. Referenz — Token „Bild2" ist einer der erlaubten Binder der Route). NEUTRALE
// Wortwahl (keine Intim-/Haut-Wörter — Pixverse flaggt sie), feste Kamera (kein Zoom),
// Gesichter bleiben exakt gleich. Kurzer, zarter Kuss + Lächeln danach.
export const KISS_PROMPT =
  "@person and @Bild2 stand close together in a warm, softly lit evening setting with gentle glowing lights behind them. They look at each other and smile, lean in slowly, and share a brief, tender kiss. Then they step back a little and smile at each other, happy. Keep @person and @Bild2 faces and appearance exactly the same throughout. Fixed camera, no zoom, no camera movement. Fluid natural motion, photorealistic, high-end look. No text or logos.";

// „Your Idol with you": die beiden zusammen auf einer schönen Party — kein Kuss, sondern
// ein gemeinsamer Moment. Wieder NEUTRALE Wortwahl (Pixverse flaggt Intim-/Haut-Wörter),
// feste Kamera, Gesichter bleiben exakt gleich.
export const IDOL_PROMPT =
  "@person and @Bild2 are together at an elegant evening party, warm golden lights and a festive atmosphere around them. They stand side by side, smiling and laughing, raising their glasses and enjoying the moment together. Keep @person and @Bild2 faces and appearance exactly the same throughout. Fixed camera, no zoom, no camera movement. Fluid natural motion, photorealistic, high-end look. No text or logos.";

// Eigenes Foto klein rechnen (Data-URL) — wie im Try-On-Funnel.
async function fileToDataUrl(file: File, max = 1000, quality = 0.85): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", quality);
}

// Die Render-Show: gestaffelte Status-Texte, damit es sich wie eine echte Generierung anfühlt.
const RENDER_STEPS: [number, string][] = [
  [0, "Analyzing your photo …"],
  [4000, "Matching the two of you …"],
  [9000, "Rendering the kiss …"],
  [14000, "Finishing touches …"],
];
const RENDER_MS = 17000; // Gesamtdauer der Show (~17 s)

export type FunnelVariant = "kiss" | "idol";

// Beide Themen teilen sich DIESEN Funnel — nur Prompt und Beschriftungen unterscheiden
// sich. Kopieren wäre doppelte Wartung: jeder Fix müsste sonst zweimal gemacht werden.
const VARIANTS: Record<FunnelVariant, {
  prompt: string; step1: string; step3: string; cta: string; ready: string; done: string;
  pickHint: string; upTitle: string; upHint: string; upFirst: boolean; upPlaceholder?: string;
}> = {
  kiss: {
    prompt: KISS_PROMPT,
    step1: "1 · Pick her", step3: "3 · The kiss",
    cta: "Generate the kiss video", ready: "Your kiss video is ready 💋", done: "kiss-video.mp4",
    pickHint: "Swipe the models — your pick stands up front.",
    upTitle: "Your model", upHint: "Kiss any superstar — just upload a screenshot.", upFirst: false,
  },
  idol: {
    prompt: IDOL_PROMPT,
    step1: "1 · Pick your idol", step3: "3 · The moment",
    cta: "Generate the video", ready: "Your video is ready ✨", done: "your-idol-video.mp4",
    // Bei „Your Idol" ist das EIGENE Idol der Sinn der Sache — deshalb steht die Upload-Karte
    // vorn und ist von Anfang an gewählt; unsere Models sind nur die Alternative daneben.
    pickHint: "Any singer, actress, athlete or influencer — swipe to your own upload, or take one of ours.",
    upTitle: "Your idol", upHint: "Any star you like — just upload one screenshot of her or him.", upFirst: true,
    // Platzhalter-Gesicht auf der Upload-Karte (Aria, abgedunkelt): zeigt auf einen Blick,
    // dass hier ein FOTO hineingehört — genau wie Peter beim eigenen Foto.
    upPlaceholder: "/idol-placeholder.jpg",
  },
};

export default function KissFunnel({ variant = "kiss", code = "" }: { variant?: FunnelVariant; code?: string }) {
  const V = VARIANTS[variant];
  const [models, setModels] = useState<Model[]>([]);
  const [picked, setPicked] = useState<Model | null>(null);
  const [customModel, setCustomModel] = useState(""); // „Your Model": eigenes Model-Foto (Data-URL)
  const [useCustom, setUseCustom] = useState(VARIANTS[variant].upFirst); // „Your Model"-Karte vorn
  const [photo, setPhoto] = useState("");          // eigenes Foto (Data-URL)
  const [isStaff, setIsStaff] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);         // Render-Show oder echte Generierung läuft
  const [status, setStatus] = useState("");
  const [teaser, setTeaser] = useState(false);     // Fake-„fertig": verpixeltes Ergebnis + Kauf-CTA
  const [videoUrl, setVideoUrl] = useState("");    // ECHTES Video (erst nach Zahlung / Staff)
  const [genId, setGenId] = useState("");          // Kiss-Log-Eintrag dieser Generierung
  const [payBusy, setPayBusy] = useState(false);
  // AKTIVE ZUSTIMMUNG (Owner-Vorgabe): niemand rendert ein Video aus fremden Fotos, ohne
  // vorher ausdrücklich bestätigt zu haben, dass er das darf und die Verantwortung trägt.
  const [consent, setConsent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const modelFileRef = useRef<HTMLInputElement>(null); // Upload fürs eigene Model-Foto
  const runRef = useRef(0);
  const swipeRef = useRef(0);      // Coverflow: Pointer-X beim Swipe-Start
  const swipedRef = useRef(false); // ein Swipe war's → den nachlaufenden Klick schlucken
  const resultRef = useRef<HTMLDivElement>(null); // Radar/Ergebnis — der Screen springt dorthin

  useEffect(() => {
    // Model-Grid: Admin-Auswahl aus /api/kiss-config (leer = alle Models).
    Promise.all([
      fetch("/api/try-this-look?models=1").then(r => r.json()).catch(() => ({})),
      fetch("/api/kiss-config").then(r => r.json()).catch(() => ({})),
    ]).then(([m, c]) => {
      const all: Model[] = (Array.isArray(m.models) ? m.models : []).filter((x: Model) => !!x.photoUrl);
      const wanted: string[] = Array.isArray(c.modelIds) ? c.modelIds : [];
      let list = wanted.length ? wanted.map(id => all.find(x => x.id === id)).filter(Boolean) as Model[] : all;
      // Bella steht IMMER als Erste (Owner-Vorgabe) — sie ist das Gesicht des Portals.
      const bellaIdx = list.findIndex(x => x.id === "curator-1783683672619-td4cy" || /^bella\b/i.test(x.name));
      if (bellaIdx > 0) list = [list[bellaIdx], ...list.slice(0, bellaIdx), ...list.slice(bellaIdx + 1)];
      setModels(list);
      // Coverflow: die vorderste Karte IST die Auswahl → mit dem ersten Model (Bella) starten.
      // Bei „Your Idol" bleibt die Upload-Karte vorn, `picked` ist nur der Fallback dahinter.
      if (list.length) setPicked(p => p ?? list[0]);
    });
    try {
      const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p); setIsStaff(!!p && !localStorage.getItem("lb_preview_model"));
    } catch { /**/ }
    return () => { runRef.current = -1; };
  }, []);

  const onFile = async (f?: File | null) => { if (f) try { setPhoto(await fileToDataUrl(f)); } catch { /**/ } };
  const onModelFile = async (f?: File | null) => { if (f) try { setCustomModel(await fileToDataUrl(f)); setUseCustom(true); } catch { /**/ } };

  // Die aktive Auswahl: entweder die „Your Model"-Karte (eigenes Foto) oder ein Katalog-Model.
  const selPhoto = useCustom ? customModel : (picked?.photoUrl ?? "");
  const selName = useCustom ? V.upTitle : (picked?.name ?? "");
  const selId = useCustom ? "custom" : (picked?.id ?? "");

  // ECHTE Generierung (Pixverse) — läuft nur nach Zahlung oder für Staff.
  const realGenerate = async (token: number): Promise<void> => {
    if (!selPhoto || !photo) return;
    setStatus("Rendering your kiss in full quality … (~1–3 min)");
    try {
      // Gleiche Pipeline wie Try-On: person = Model (@person), garment = dein Foto (@Bild2).
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
        body: JSON.stringify({ lookId: KISS_LOOK_ID, person: selPhoto, garment: photo, prompt: V.prompt }),
      }).then(r => r.json());
      if (!start?.videoId) { setStatus(start?.error || "Could not start."); setBusy(false); return; }
      for (let i = 0; i < 72; i++) {
        await new Promise(r => setTimeout(r, 5000));
        if (runRef.current !== token) return;
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json()).catch(() => null);
        if (p?.status === "done" && p.videoUrl) {
          setVideoUrl(p.videoUrl); setTeaser(false); setStatus(""); setBusy(false);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
          // Video-URL im Log nachtragen (Staff: Eintrag jetzt erst anlegen).
          try {
            if (genId) await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ update: genId, videoUrl: p.videoUrl }) });
            else await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId: selId, modelName: selName, videoUrl: p.videoUrl }) });
          } catch { /**/ }
          return;
        }
        if (p?.status === "failed") { setStatus(p.error || "Generation failed."); setBusy(false); return; }
      }
      setStatus("Timeout — please try again later."); setBusy(false);
    } catch { setStatus("Network error."); setBusy(false); }
  };

  // Klick auf „Generate": IMMER erst die Fake-Render-Show (Radar-Scan wie im Try-On,
  // kein API-Call, keine Kosten) — auch für Staff, damit der Owner den Kunden-Flow sieht.
  // Das ECHTE Rendern passiert erst beim Freischalten (Kunde: nach Stripe; Staff: gratis).
  const generate = async () => {
    if (!selPhoto || !photo || busy) return;
    setBusy(true); setTeaser(false); setVideoUrl(""); setGenId(""); setStatus("");
    const token = Date.now(); runRef.current = token;

    // Der Screen springt runter zum Radar (wie im Try-On).
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);

    // Fake-Render-Show: gestaffelte Texte, dann „fertig" (verpixelt).
    for (const [at, text] of RENDER_STEPS) {
      setTimeout(() => { if (runRef.current === token) setStatus(text); }, at);
    }
    setTimeout(async () => {
      if (runRef.current !== token) return;
      setBusy(false); setStatus(""); setTeaser(true);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
      // Interesse fürs Admin-Tool loggen (noch ohne Video — das echte rendert nach dem Kauf).
      try {
        const log = await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId: selId, modelName: selName }) }).then(r => r.json());
        if (log?.id && runRef.current === token) setGenId(log.id);
      } catch { /**/ }
    }, RENDER_MS);
  };

  // 🔓 Freischalten: Kunde → Stripe-Popup + Status-Poll, bei `paid` startet die ECHTE
  // Generierung. Staff → gratis direkt zur echten Generierung (kein Stripe).
  const unlock = async () => {
    if (payBusy) return;
    if (isStaff) {
      setBusy(true);
      const token = Date.now(); runRef.current = token;
      await realGenerate(token);
      return;
    }
    setPayBusy(true); setStatus("");
    try {
      const start = await fetch("/api/kiss-video-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, genId, subId: new URLSearchParams(window.location.search).get("s") || "", returnTo: window.location.pathname + window.location.search }) }).then(r => r.json());
      if (!start?.url || !start?.sessionId) { setStatus(start?.error || "Checkout could not start."); setPayBusy(false); return; }
      const popup = window.open(start.url, "_blank", "popup,width=480,height=780");
      if (!popup) { window.location.href = start.url; return; } // Popup blockiert → gleiche Seite
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (s?.paid) {
          try { popup.close(); } catch { /**/ }
          setPayBusy(false);
          // Bezahlt → JETZT das echte Video rendern.
          setBusy(true);
          const token = Date.now(); runRef.current = token;
          await realGenerate(token);
          return;
        }
        if (popup.closed && i > 2) break; // Popup zu ohne Zahlung → aufhören zu pollen
      }
      setPayBusy(false);
    } catch { setStatus("Network error."); setPayBusy(false); }
  };

  return (
    <div className="mt-8">
      {/* 1) Model wählen — das 3D-Coverflow aus dem Try-On-Funnel: die Gewählte steht groß
          vorn, die Nachbarinnen kippen seitlich weg; Tipp auf eine Seitenkarte oder Swipe
          holt sie nach vorn (= Auswahl). */}
      <p className="text-[12px] font-black uppercase tracking-wide text-white/50">{V.step1}</p>
      <p className="mt-1 text-[13px] font-bold text-white/85">{V.pickHint}</p>
      {(() => {
        if (models.length === 0) return <div className="grid h-[46vw] max-h-[240px] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>;
        // „Your Model" lebt IM Karussell als Karte (3. Position, wie „Your photo" im Try-On):
        // eigenes Model-Foto hochladen — die Karte vorn = Auswahl.
        const YOURMODEL: Model = { id: "__yourmodel", name: V.upTitle, photoUrl: "" };
        const cards = [...models];
        const uploadIdx = V.upFirst ? 0 : Math.min(2, cards.length);
        cards.splice(uploadIdx, 0, YOURMODEL);
        const active = useCustom ? uploadIdx : Math.max(0, cards.findIndex(m => m.id === picked?.id));
        // Nach-vorn-holen zentriert NUR (auch die „Your model"-Karte — Owner-Vorgabe);
        // das Upload-Fenster öffnet erst der Tipp auf die bereits VORDERE Karte (im onClick).
        const setFront = (m: Model) => {
          if (m.id === "__yourmodel") { setUseCustom(true); return; }
          setUseCustom(false); setPicked(m);
        };
        const slide = (dir: number) => {
          const ni = Math.min(cards.length - 1, Math.max(0, active + dir));
          if (ni !== active) setFront(cards[ni]);
        };
        return (
          <div className="relative mx-auto mt-2 h-[72vw] max-h-[300px] select-none overflow-hidden touch-pan-y" style={{ perspective: "1100px" }}
            onPointerDown={(e) => { swipeRef.current = e.clientX; swipedRef.current = false; }}
            onPointerUp={(e) => { const dx = e.clientX - swipeRef.current; if (Math.abs(dx) > 30) { swipedRef.current = true; slide(dx < 0 ? 1 : -1); } }}>
            {cards.map((m, i) => {
              const off = i - active;
              if (Math.abs(off) > 2) return null;
              const isActive = off === 0;
              const isUpload = m.id === "__yourmodel";
              return (
                <div key={m.id}
                  onClick={() => { if (swipedRef.current) { swipedRef.current = false; return; } if (isUpload) { if (!isActive) { setFront(m); return; } modelFileRef.current?.click(); return; } if (!isActive) setFront(m); }}
                  className="absolute left-1/2 top-1/2 w-[54%] max-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl transition-all duration-300 ease-out"
                  style={{ transform: `translate(-50%,-50%) translateX(${off * 56}%) rotateY(${-off * 38}deg) scale(${isActive ? 1 : 0.82})`, zIndex: 20 - Math.abs(off), opacity: Math.abs(off) === 2 ? 0.45 : 1, cursor: "pointer" }}>
                  <div className="relative aspect-[3/4] w-full">
                    {isUpload && !customModel ? (
                      // Solide Fläche (nicht transparent — Owner-Vorgabe): warmes Dunkelbraun.
                      <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 bg-[#241c11] px-3 text-center">
                        {V.upPlaceholder && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={V.upPlaceholder} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-25 grayscale" />
                        )}
                        <ImageUp className="relative h-9 w-9 text-[#f6cf51]" />
                        <span className="relative text-[13px] font-black text-[#f6cf51]">{V.upTitle}</span>
                        <span className="relative text-[11px] font-bold leading-snug text-white/80">{V.upHint}</span>
                      </div>
                    ) : (<>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={isUpload ? customModel : m.photoUrl} alt={m.name} draggable={false} className="h-full w-full object-cover object-top" />
                      {isUpload && isActive && (
                        <span className="absolute inset-x-3 bottom-8 rounded-full bg-black/60 py-1 text-center text-[10px] font-black text-white backdrop-blur">Tap to change photo</span>
                      )}
                    </>)}
                    {isActive && (!isUpload || !!customModel) && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#f6cf51] shadow"><Check className="h-4 w-4 text-black" /></span>}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-6">
                      <p className="lb-onmedia truncate text-[13px] font-black">{m.name}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
      <input ref={modelFileRef} type="file" accept="image/*" className="hidden" onChange={e => void onModelFile(e.target.files?.[0])} />

      {/* 2) Eigenes Foto */}
      <p className="mt-5 text-[12px] font-black uppercase tracking-wide text-white/50">2 · Your photo</p>
      <button type="button" onClick={() => fileRef.current?.click()}
        className="relative mx-auto mt-2 flex aspect-square w-[46vw] max-w-[210px] flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed border-[#f6cf51]/40 bg-[#f6cf51]/[0.06] active:scale-[0.98] transition">
        {photo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={photo} alt="" className="h-full w-full object-cover" />
          : (<>
              {/* Platzhalter-Gesicht (abgedunkelt): zeigt auf einen Blick, dass hier ein
                  MANN bzw. der Nutzer selbst hingehört — nicht noch ein Model. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={PLACEHOLDER_MAN} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 grayscale" />
              <ImageUp className="relative h-8 w-8 text-[#f6cf51]" />
              <span className="relative text-[13px] font-black text-[#f6cf51]">Upload your photo</span>
            </>)}
      </button>
      {photo && (
        <button type="button" onClick={() => fileRef.current?.click()} className="mx-auto mt-2 flex items-center gap-1.5 text-[12px] font-black text-white/60">
          <RefreshCw className="h-3.5 w-3.5" /> Change photo
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => void onFile(e.target.files?.[0])} />

      {/* 3) Generieren */}
      <p className="mt-5 text-[12px] font-black uppercase tracking-wide text-white/50">{V.step3}</p>
      <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#f6cf51]" />
        <span className="text-[12px] font-bold leading-snug text-white/70">
          Yes, I want this video. I may use these photos, everyone shown is an adult, I keep it
          private — and I take responsibility for it.
        </span>
      </label>
      <button type="button" onClick={() => void generate()} disabled={!selPhoto || !photo || !consent || busy}
        className="lb-gold mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "💋"} {busy ? "Rendering …" : V.cta}
      </button>
      {status && <p className="mt-2 text-center text-[12px] font-bold text-white/60">{status}</p>}

      {/* Ergebnisbereich — der Screen springt hierher (Radar → Teaser → echtes Video). */}
      <div ref={resultRef}>
        {/* Radar-Scan (wie der Try-On-„Reveal"): Scanner-Balken + Sucher-Ecken über dem Model-Foto. */}
        {busy && !videoUrl && !!selPhoto && (
          <div className="mx-auto mt-4 w-fit">
            <div className="relative overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selPhoto} alt="" className="aspect-[3/4] max-h-[60vh] w-auto object-cover object-top blur-[6px] brightness-75" />
              {/* Weißer Scanner-Balken, fährt runter und wieder hoch. */}
              <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-white shadow-[0_0_18px_5px_rgba(255,255,255,0.7)]" />
              <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-14 -translate-y-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
              {/* Kamera-Sucher-Ecken. */}
              <div className="pointer-events-none absolute left-3 top-3 z-20 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-white/90" />
              <div className="pointer-events-none absolute right-3 top-3 z-20 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-white/90" />
              <div className="pointer-events-none absolute bottom-3 left-3 z-20 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-white/90" />
              <div className="pointer-events-none absolute bottom-3 right-3 z-20 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-white/90" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 text-white">
                <Sparkles className="h-4 w-4 animate-pulse" />
                <span className="text-[12px] font-black">{status || "Rendering …"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Fake-Teaser: „fertig", aber verpixelt (Model-Foto hinter starkem Blur) + Kauf-CTA */}
        {teaser && !videoUrl && !!selPhoto && (
          <div className="mx-auto mt-4 w-fit">
            <div className="relative overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selPhoto} alt="" className="aspect-[3/4] max-h-[60vh] w-auto blur-2xl scale-110 object-cover" />
              <div className="absolute inset-0 grid place-items-center bg-black/30">
                <div className="px-6 text-center">
                  <Lock className="mx-auto h-8 w-8 text-[#f6cf51]" />
                  <p className="lb-onmedia mt-2 text-[15px] font-black">{V.ready}</p>
                  <button type="button" onClick={() => void unlock()} disabled={payBusy}
                    className="lb-gold mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-[14px] font-black active:scale-95 transition disabled:opacity-60">
                    {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} {isStaff ? "Reveal (Admin — free)" : "Unlock the hottest AI experience ever — €19"}
                  </button>
                  {!isStaff && <p className="lb-onmedia mt-2 text-[11px] font-bold opacity-80">Secure checkout by Stripe</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Das ECHTE Video (nach Zahlung / Admin-Reveal) — klar + Download. */}
        {videoUrl && (
          <div className="mx-auto mt-4 w-fit">
            <div className="overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={videoUrl} controls autoPlay loop playsInline className="aspect-[3/4] max-h-[60vh] w-auto" />
            </div>
            <a href={videoUrl} download={V.done} target="_blank" rel="noreferrer"
              className="lb-gold mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black active:scale-95 transition">
              ⬇ Download your video
            </a>
            {/* Privat-Hinweis (Owner-Vorgabe): nicht in sozialen Medien teilen. */}
            <p className="mx-auto mt-2 max-w-[280px] text-center text-[11px] font-bold leading-snug text-white/55">
              🔒 This video is private — for you only. Please don't share it on social media.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
