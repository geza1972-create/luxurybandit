"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ImageUp, Lock, RefreshCw, Check, Sparkles } from "lucide-react";

// „Kiss any Model" — Funnel: Model wählen + eigenes Foto → Pixverse V6 Fusion (gleiche
// Pipeline wie Try-On: /api/generate-tryon-video, zwei Referenzen an @-Tokens, Raw-Prompt,
// 360p = Pixverse-Minimum; ein 320p-Tier gibt es nicht).
//
// Monetarisierung (wie Try-On): JEDER darf generieren (1 Gratis-Lauf pro Gerät als Kosten-
// bremse; wer schon gezahlt hat, darf weiter generieren). Das fertige Video läuft VERPIXELT
// — „🔓 Unlock — $3.99" öffnet Stripe im Popup, wir pollen /api/checkout-status, bei `paid`
// wird sanft entblurrt. Admin/Staff sieht alles klar und generiert unbegrenzt.
// Welche Models im Grid stehen, wählt der Admin im Kiss-Models-Tool (/api/kiss-config).

type Model = { id: string; name: string; photoUrl: string };

// Referenz-Look fürs Billing/Routing der Route (gleicher Default wie der Try-On-Funnel).
const KISS_LOOK_ID = "look-1784191032626-70e3608b";

// Pixverse-Prompt (V6, Raw): @person = das Model (1. Referenz), @Bild2 = das hochgeladene
// Foto (2. Referenz — Token „Bild2" ist einer der erlaubten Binder der Route). NEUTRALE
// Wortwahl (keine Intim-/Haut-Wörter — Pixverse flaggt sie), feste Kamera (kein Zoom),
// Gesichter bleiben exakt gleich. Kurzer, zarter Kuss + Lächeln danach.
export const KISS_PROMPT =
  "@person and @Bild2 stand close together in a warm, softly lit evening setting with gentle glowing lights behind them. They look at each other and smile, lean in slowly, and share a brief, tender kiss. Then they step back a little and smile at each other, happy. Keep @person and @Bild2 faces and appearance exactly the same throughout. Fixed camera, no zoom, no camera movement. Fluid natural motion, photorealistic, high-end look. No text or logos.";

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

export default function KissFunnel() {
  const [models, setModels] = useState<Model[]>([]);
  const [picked, setPicked] = useState<Model | null>(null);
  const [photo, setPhoto] = useState("");          // eigenes Foto (Data-URL)
  const [isStaff, setIsStaff] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");        // Fortschritts-/Fehlertext
  const [videoUrl, setVideoUrl] = useState("");
  const [unlocked, setUnlocked] = useState(false); // bezahlt → entblurrt
  const [payBusy, setPayBusy] = useState(false);
  const [gensUsed, setGensUsed] = useState(0);     // Gratis-Läufe dieses Geräts
  const [paidAny, setPaidAny] = useState(false);   // hat schon mal bezahlt → darf weiter generieren
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef(0);

  useEffect(() => {
    // Model-Grid: Admin-Auswahl aus /api/kiss-config (leer = alle Models).
    Promise.all([
      fetch("/api/try-this-look?models=1").then(r => r.json()).catch(() => ({})),
      fetch("/api/kiss-config").then(r => r.json()).catch(() => ({})),
    ]).then(([m, c]) => {
      const all: Model[] = (Array.isArray(m.models) ? m.models : []).filter((x: Model) => !!x.photoUrl);
      const wanted: string[] = Array.isArray(c.modelIds) ? c.modelIds : [];
      setModels(wanted.length ? wanted.map(id => all.find(x => x.id === id)).filter(Boolean) as Model[] : all);
    });
    try {
      const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p); setIsStaff(!!p && !localStorage.getItem("lb_preview_model"));
      setGensUsed(Number(localStorage.getItem("lb_kiss_gens") ?? 0) || 0);
      setPaidAny(localStorage.getItem("lb_kiss_paid_any") === "1");
    } catch { /**/ }
    return () => { pollRef.current = -1; };
  }, []);

  const onFile = async (f?: File | null) => { if (f) try { setPhoto(await fileToDataUrl(f)); } catch { /**/ } };

  // Kostenbremse: 1 Gratis-Lauf pro Gerät; wer schon bezahlt hat (oder Staff ist) darf weiter.
  const mayGenerate = isStaff || paidAny || gensUsed < 1;

  const generate = async () => {
    if (!picked || !photo || busy || !mayGenerate) return;
    setBusy(true); setVideoUrl(""); setUnlocked(false); setStatus("Starting …");
    try {
      // Gleiche Pipeline wie Try-On: person = Model (@person), garment = dein Foto (@Bild2).
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
        body: JSON.stringify({ lookId: KISS_LOOK_ID, person: picked.photoUrl, garment: photo, prompt: KISS_PROMPT }),
      }).then(r => r.json());
      if (!start?.videoId) { setStatus(start?.error || "Could not start."); setBusy(false); return; }
      try { const n = gensUsed + 1; setGensUsed(n); localStorage.setItem("lb_kiss_gens", String(n)); } catch { /**/ }
      setStatus("Rendering your kiss … (~1–3 min)");
      // Pollen wie der Try-On-Funnel (alle 5 s, max ~6 Min).
      const token = Date.now(); pollRef.current = token;
      for (let i = 0; i < 72; i++) {
        await new Promise(r => setTimeout(r, 5000));
        if (pollRef.current !== token) return; // Seite verlassen / neuer Lauf
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json()).catch(() => null);
        if (p?.status === "done" && p.videoUrl) { setVideoUrl(p.videoUrl); setUnlocked(isStaff); setStatus(""); setBusy(false); return; }
        if (p?.status === "failed") { setStatus(p.error || "Generation failed."); setBusy(false); return; }
      }
      setStatus("Timeout — please try again later."); setBusy(false);
    } catch {
      setStatus("Network error."); setBusy(false);
    }
  };

  // 🔓 Bezahlen: Stripe-Checkout im Popup + Status-Poll — bei `paid` wird entblurrt.
  const unlock = async () => {
    if (payBusy) return;
    setPayBusy(true); setStatus("");
    try {
      const start = await fetch("/api/kiss-video-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then(r => r.json());
      if (!start?.url || !start?.sessionId) { setStatus(start?.error || "Checkout could not start."); setPayBusy(false); return; }
      const popup = window.open(start.url, "_blank", "popup,width=480,height=780");
      if (!popup) { window.location.href = start.url; return; } // Popup blockiert → gleiche Seite
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (s?.paid) {
          setUnlocked(true); setPaidAny(true);
          try { localStorage.setItem("lb_kiss_paid_any", "1"); } catch { /**/ }
          try { popup.close(); } catch { /**/ }
          setPayBusy(false); return;
        }
        if (popup.closed && i > 2) break; // Popup zu ohne Zahlung → aufhören zu pollen
      }
      setPayBusy(false);
    } catch { setStatus("Network error."); setPayBusy(false); }
  };

  return (
    <div className="mt-8">
      {/* 1) Model wählen */}
      <p className="text-[12px] font-black uppercase tracking-wide text-white/50">1 · Pick her</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {models.slice(0, 12).map(m => (
          <button key={m.id} type="button" onClick={() => setPicked(m)}
            className={`overflow-hidden rounded-2xl border transition active:scale-[0.98] ${picked?.id === m.id ? "border-[#c9a23f]" : "border-white/10"}`}>
            <div className="relative aspect-[9/16] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.photoUrl} alt={m.name} className="h-full w-full object-cover object-top" />
              {picked?.id === m.id && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#c9a23f]"><Check className="h-3.5 w-3.5 text-black" /></span>}
            </div>
            <div className="px-1.5 py-1"><span className="lb-onmedia line-clamp-1 text-[11px] font-black">{m.name}</span></div>
          </button>
        ))}
      </div>

      {/* 2) Eigenes Foto */}
      <p className="mt-5 text-[12px] font-black uppercase tracking-wide text-white/50">2 · Your photo</p>
      <button type="button" onClick={() => fileRef.current?.click()}
        className="mx-auto mt-2 flex aspect-square w-[46vw] max-w-[210px] flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed border-amber-400/40 bg-amber-400/[0.06] active:scale-[0.98] transition">
        {photo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={photo} alt="" className="h-full w-full object-cover" />
          : (<><ImageUp className="h-8 w-8 text-amber-400" /><span className="text-[13px] font-black text-amber-400">Upload photo</span></>)}
      </button>
      {photo && (
        <button type="button" onClick={() => fileRef.current?.click()} className="mx-auto mt-2 flex items-center gap-1.5 text-[12px] font-black text-white/60">
          <RefreshCw className="h-3.5 w-3.5" /> Change photo
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => void onFile(e.target.files?.[0])} />

      {/* 3) Generieren */}
      <p className="mt-5 text-[12px] font-black uppercase tracking-wide text-white/50">3 · The kiss</p>
      {mayGenerate ? (
        <button type="button" onClick={() => void generate()} disabled={!picked || !photo || busy}
          className="lb-gold mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "💋"} {busy ? "Rendering …" : "Generate the kiss video"}
        </button>
      ) : (
        <div className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 text-[13px] font-black text-white/60">
          <Lock className="h-4 w-4" /> Free video used — unlock below to make more
        </div>
      )}
      {status && <p className="mt-2 text-center text-[12px] font-bold text-white/60">{status}</p>}

      {/* Rendering-Platzhalter (der „Radar": pulsierende Fläche mit Funkeln) */}
      {busy && !videoUrl && (
        <div className="mx-auto mt-4 grid aspect-[3/4] w-[64vw] max-w-[280px] animate-pulse place-items-center rounded-3xl border border-amber-400/20 bg-gradient-to-b from-amber-400/[0.10] to-white/[0.03]">
          <Sparkles className="h-8 w-8 text-amber-400/70" />
        </div>
      )}

      {/* Ergebnis: verpixelt bis bezahlt (Staff sieht klar) */}
      {videoUrl && (
        <div className="mx-auto mt-4 w-fit">
          <div className="relative overflow-hidden rounded-3xl border border-white/10">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={videoUrl} controls={unlocked} autoPlay loop muted={!unlocked} playsInline
              className={`aspect-[3/4] max-h-[60vh] w-auto transition-[filter] duration-1000 ${unlocked ? "" : "blur-2xl scale-110"}`} />
            {!unlocked && (
              <div className="absolute inset-0 grid place-items-center bg-black/30">
                <div className="px-6 text-center">
                  <Lock className="mx-auto h-8 w-8 text-amber-400" />
                  <p className="lb-onmedia mt-2 text-[15px] font-black">Your kiss video is ready 💋</p>
                  <button type="button" onClick={() => void unlock()} disabled={payBusy}
                    className="lb-gold mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-[14px] font-black active:scale-95 transition disabled:opacity-60">
                    {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Unlock your video — $3.99
                  </button>
                  <p className="lb-onmedia mt-2 text-[11px] font-bold opacity-80">Secure checkout by Stripe</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
