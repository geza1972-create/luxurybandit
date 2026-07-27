"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Lock, Sparkles, ImageUp, RefreshCw, Check, Download } from "lucide-react";

type Look = { id: string; name?: string; imageUrl?: string };

/**
 * „Surprise him" — SIE lädt ihr Foto hoch, wählt ein Lingerie-Set, gibt seinen Vornamen ein
 * und bekommt ein Video, in dem sie ihn anspricht. Gleiches Schema wie Kiss/Idol/Birthday:
 * Radar-Show → verpixelter Teaser → 3,99 € → ERST DANN echter Render → Download.
 *
 * BEWUSST EINFACH (Owner, 27.07.2026): KEIN E-Mail-Versand, KEIN Nachrichtenfeld. Sie lädt
 * das Video runter und verschickt es selbst — weniger Felder, weniger Abbrüche, und das
 * intime Material verlässt unsere Seite nur über ihre Hand.
 *
 * Die Zustimmung bleibt: das Video zeigt eine echte Person. Ohne Häkchen läuft nichts.
 */

const LOOK_ID = "look-1784191032626-70e3608b";   // Referenz-Look fürs Routing der Video-Route

// Bewusst NEUTRALE Wörter — Pixverse blockt sonst (siehe Memory „Pixverse-Prompt"):
// keine expliziten Begriffe, die Bewegung trägt die Stimmung.
export const surprisePrompt = (name: string) => {
  const line = name.trim()
    ? `says out loud, clearly and warmly: "Hello ${name.trim()}, how are you?"`
    : `says out loud, clearly and warmly: "Hello, how are you?"`;
  // BILDAUSSCHNITT — der Trick, der wirklich funktioniert (Owner): explizit sagen, WIE WEIT
  // die Frau zu sehen ist und dass von unten nach oben gefilmt wird. Ohne diesen Satz
  // klebt Pixverse an einem Brustporträt, egal wie das Referenzfoto aussieht.
  const framing =
    `Show the woman from her knees up to her head, full figure in frame, filmed from below ` +
    `pointing slightly upwards, low camera angle tilting up.`;
  return `${framing} @person stands in a warmly lit bedroom with soft evening light, looks straight into the camera, smiles and ${line} Her lips move in sync with the words. Keep @person face, hair, body and outfit EXACTLY as in the reference photo — do not change her face and do not change what she is wearing. Fluid natural motion, cinematic, photorealistic. Fixed camera, no zoom. No text or logos.`;
};

const CONSENT_TEXT =
  "This is me in the photo, I am 18 or older, and I take responsibility for what I do with the video.";

const RENDER_STEPS: [number, string][] = [
  [0, "Reading your photo …"],
  [4000, "Setting the light …"],
  [9000, "Adding the motion …"],
  [14000, "Almost there …"],
];
const RENDER_MS = 17000;

const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f);
});

export default function SurpriseFunnel({ example = "" }: { example?: string }) {
  const [photo, setPhoto] = useState("");
  const [himName, setHimName] = useState("");           // sein Vorname — sie spricht ihn im Video an
  const [looks, setLooks] = useState<Look[]>([]);       // Lingerie-Sets aus dem Katalog
  const [pickIdx, setPickIdx] = useState(0);            // die vordere Karte IST die Auswahl
  const [consent, setConsent] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [teaser, setTeaser] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const runRef = useRef(0);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p); setIsStaff(!!p && !localStorage.getItem("lb_preview_model"));
    } catch { /**/ }
    // ALLE Kleidungsstücke aus dem Katalog (Owner): Kleider, Outfits UND Dessous — sie
    // entscheidet selbst, wie viel sie zeigt. Dessous stehen vorn, weil sie hier gemeint sind.
    Promise.all([
      fetch("/api/try-this-look", { cache: "no-store" }).then(r => r.json()).catch(() => ({})),
      // Nur saubere Kleidungsfotos — Bilder mit fremder Frau gehören nicht in die Auswahl.
      fetch("/api/wardrobe-garments", { cache: "no-store" }).then(r => r.json()).catch(() => ({ ids: null })),
    ])
      .then(([d, wg]) => {
        const ok: Set<string> | null = Array.isArray(wg?.ids) ? new Set(wg.ids.map(String)) : null;
        const all: (Look & { hot?: boolean })[] = (Array.isArray(d?.looks) ? d.looks : [])
          .filter((l: { id: string; imageUrl?: string }) => !!l.imageUrl && (!ok || ok.has(l.id)))
          .map((l: Look & { lingerie?: boolean; category?: string }) =>
            ({ id: l.id, name: l.name, imageUrl: l.imageUrl, hot: l.lingerie === true || l.category === "boudoir" }));
        // ALLE Teile aus dem Katalog (kein Deckel) — Dessous vorn, dann der Rest.
        setLooks([...all.filter(l => l.hot), ...all.filter(l => !l.hot)]);
      })
      .catch(() => {});
    return () => { runRef.current = -1; };
  }, []);

  const picked = looks[pickIdx];
  const ready = !!photo && !!picked?.imageUrl && consent && !!himName.trim();

  const onFile = async (f?: File | null) => { if (f) try { setPhoto(await fileToDataUrl(f)); } catch { /**/ } };


  // ECHTE Generierung — läuft erst nach Zahlung (oder für Staff).
  //
  // ZWEI SCHRITTE, unsere eigene Pipeline (nicht zwei Referenzen an Pixverse werfen —
  // dabei erfindet Pixverse Gesichter neu):
  //   1) ANZIEHEN: FASHN setzt das gewählte Set auf IHR Foto → fertiges Foto von ihr.
  //   2) ANIMIEREN: dieses EINE Foto geht als Referenz ins Video, sie spricht ihn an.
  const realGenerate = async (token: number) => {
    const H = { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) };
    try {
      setStatus("Putting the set on your photo …");
      const toFile = async (src: string, name: string) => {
        const blob = await fetch(src).then(r => r.blob());
        return new File([blob], name, { type: blob.type || "image/jpeg" });
      };
      const fd = new FormData();
      fd.append("modelImage", await toFile(photo, "person.jpg"));           // sie
      fd.append("image", await toFile(picked!.imageUrl!, "garment.jpg"));   // das Set
      fd.append("lookId", picked!.id);
      fd.append("mode", "fashion-model");
      fd.append("aspectRatio", "9:16");
      fd.append("prompt", "Dress the person from the model photo in the garment shown in the reference image. Keep her face, hair and body exactly as they are. Natural light, photorealistic, full body in frame.");
      const dressed = await fetch("/api/generate-fashn", {
        method: "POST", body: fd, ...(pin ? { headers: { "x-try-look-admin-pin": pin } } : {}),
      }).then(r => r.json());
      if (runRef.current !== token) return;
      const dressedImage: string = dressed?.image || dressed?.imageUrl || "";
      if (!dressedImage) { setStatus(dressed?.error || "Could not put the set on your photo. Try a full-body photo."); setBusy(false); return; }

      setStatus("Bringing it to life … (~1–3 min)");
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST", headers: H,
        // EINE Referenz (das angezogene Foto) auf beide Slots — der Prompt nennt nur @person.
        body: JSON.stringify({ lookId: picked?.id || LOOK_ID, person: dressedImage, garment: dressedImage, prompt: surprisePrompt(himName) }),
      }).then(r => r.json());
      if (!start?.videoId) { setStatus(start?.error || "Could not start."); setBusy(false); return; }
      for (let i = 0; i < 72; i++) {
        await new Promise(r => setTimeout(r, 5000));
        if (runRef.current !== token) return;
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json()).catch(() => null);
        if (p?.status === "done" && p.videoUrl) {
          setVideoUrl(p.videoUrl); setTeaser(false); setStatus(""); setBusy(false);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
          return;
        }
        if (p?.status === "failed") { setStatus(p.error || "Generation failed."); setBusy(false); return; }
      }
      setStatus("Timeout — please try again later."); setBusy(false);
    } catch { setStatus("Network error."); setBusy(false); }
  };

  // Generieren = IMMER erst die Fake-Show (auch für Staff), damit der Kundenweg sichtbar bleibt.
  const generate = () => {
    if (!ready || busy) return;
    setBusy(true); setTeaser(false); setVideoUrl(""); setStatus("");
    const token = Date.now(); runRef.current = token;
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    for (const [at, text] of RENDER_STEPS) setTimeout(() => { if (runRef.current === token) setStatus(text); }, at);
    setTimeout(() => {
      if (runRef.current !== token) return;
      setBusy(false); setStatus(""); setTeaser(true);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }, RENDER_MS);
  };

  const unlock = async () => {
    if (payBusy) return;
    if (isStaff) { setBusy(true); const t = Date.now(); runRef.current = t; await realGenerate(t); return; }
    setPayBusy(true); setStatus("");
    try {
      const start = await fetch("/api/surprise-video-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: window.location.pathname + window.location.search }),
      }).then(r => r.json());
      if (!start?.url || !start?.sessionId) { setStatus(start?.error || "Checkout could not start."); setPayBusy(false); return; }
      const popup = window.open(start.url, "_blank", "popup,width=480,height=780");
      if (!popup) { window.location.href = start.url; return; }
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (s?.paid) {
          try { popup.close(); } catch { /**/ }
          setPayBusy(false); setBusy(true);
          const t = Date.now(); runRef.current = t;
          await realGenerate(t);
          return;
        }
        if (popup.closed && i > 2) break;
      }
      setPayBusy(false);
    } catch { setStatus("Network error."); setPayBusy(false); }
  };


  const input = "mt-2 h-12 w-full rounded-xl border border-white/30 bg-white/[0.08] px-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/60 focus:border-[#f6cf51]";

  return (
    <div className="mt-8">
      {/* 1 — ihr Foto */}
      <p className="text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">1 · Your photo</p>
      <button type="button" onClick={() => fileRef.current?.click()}
        className="relative mx-auto mt-2 flex aspect-[3/4] w-[56vw] max-w-[230px] flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed border-[#f6cf51]/40 bg-[#f6cf51]/[0.06] active:scale-[0.98] transition">
        {photo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={photo} alt="" className="h-full w-full object-cover object-top" />
          : (<>
              {example && (
                // Beispiel: so eine Aufnahme reicht. Abgedunkelt, damit die Aufforderung führt.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={example} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-40" />
              )}
              <ImageUp className="relative h-8 w-8 text-[#f6cf51]" />
              <span className="relative px-4 text-center text-[13px] font-black text-[#f6cf51]">Upload a photo of yourself</span>
              <span className="relative px-5 text-center text-[12px] font-bold leading-snug text-white">A full-body photo works best — the outfit is put on YOU.</span>
            </>)}
      </button>
      {photo && (
        <button type="button" onClick={() => fileRef.current?.click()} className="mx-auto mt-2 flex items-center gap-1.5 text-[12px] font-black text-white/60">
          <RefreshCw className="h-3.5 w-3.5" /> Change photo
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => void onFile(e.target.files?.[0])} />

      {/* 2 — Lingerie aus dem Katalog wählen (Coverflow wie im Try-On/Kiss) */}
      <p className="mt-6 text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">2 · Pick what you wear</p>
      <p className="mt-1 text-[13px] font-bold text-white">Swipe and tap what you want to wear — a dress, an outfit, or lingerie.</p>
      {looks.length === 0 ? (
        <div className="grid h-24 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>
      ) : (
        // GARDEROBE = EINFACHER SLIDER (Owner-Regel): eine Reihe, horizontal wischen,
        // Antippen wählt. Kein 3D-Coverflow — das ist die Kiss-Optik und gehört nicht hierher.
        <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]{display:none}">
          {looks.map((l, i) => {
            const on = i === pickIdx;
            return (
              <button key={l.id} type="button" onClick={() => setPickIdx(i)}
                className={`relative w-[104px] shrink-0 snap-start overflow-hidden rounded-xl border-2 bg-white transition ${on ? "border-[#f6cf51]" : "border-white/20"}`}>
                <span className="block aspect-[3/4] w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.imageUrl} alt="" draggable={false} className="h-full w-full object-cover" />
                </span>
                {on && (
                  <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#f6cf51] shadow">
                    <Check className="h-3.5 w-3.5 text-black" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 3 — sein Vorname: mehr braucht es nicht. Kein Versand, keine Nachricht —
          sie lädt das Video runter und schickt es selbst, wie sie will. */}
      <p className="mt-6 text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">3 · His name</p>
      <input value={himName} onChange={e => setHimName(e.target.value)} maxLength={30}
        placeholder="His first name — she says it in the video" className={input} />
      <p className="mt-2 text-[13px] font-bold leading-snug text-white/70">
        In the video you say: “Hello {himName.trim() || "…"}, how are you?”
      </p>

      {/* 4 — Zustimmung + generieren */}
      <p className="mt-6 text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">4 · Your video</p>
      <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-2xl border border-white/25 bg-white/[0.07] p-3">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#f6cf51]" />
        <span className="text-[12px] font-bold leading-snug text-white/85">{CONSENT_TEXT}</span>
      </label>
      <button type="button" onClick={generate} disabled={!ready || busy}
        className="lb-gold mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {busy ? "Rendering …" : "Create the video"}
      </button>
      {status && <p className="mt-2 text-center text-[13px] font-bold text-white/80">{status}</p>}

      <div ref={resultRef}>
        {/* Radar-Show */}
        {busy && !videoUrl && photo && (
          <div className="mx-auto mt-4 w-fit">
            <div className="relative overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" className="aspect-[3/4] max-h-[60vh] w-auto object-cover object-top blur-[6px] brightness-75" />
              <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-white shadow-[0_0_18px_5px_rgba(255,255,255,0.7)]" />
              <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-14 -translate-y-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 text-white">
                <Sparkles className="h-4 w-4 animate-pulse" />
                <span className="text-[12px] font-black">{status || "Rendering …"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Verpixelter Teaser + Bezahlung */}
        {teaser && !videoUrl && photo && (
          <div className="mx-auto mt-4 w-fit">
            <div className="relative overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="" className="aspect-[3/4] max-h-[60vh] w-auto scale-110 object-cover blur-2xl" />
              <div className="absolute inset-0 grid place-items-center bg-black/30">
                <div className="px-6 text-center">
                  <Lock className="mx-auto h-8 w-8 text-[#f6cf51]" />
                  <p className="lb-onmedia mt-2 text-[15px] font-black">Your video is ready ✨</p>
                  <button type="button" onClick={() => void unlock()} disabled={payBusy}
                    className="lb-gold mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-[14px] font-black active:scale-95 transition disabled:opacity-60">
                    {payBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} {isStaff ? "Reveal (Admin — free)" : "Unlock & send — €3.99"}
                  </button>
                  {!isStaff && <p className="lb-onmedia mt-2 text-[11px] font-bold opacity-80">Secure checkout by Stripe</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fertig: erst ansehen, DANN bewusst absenden */}
        {videoUrl && (
          <div className="mx-auto mt-4 w-fit">
            <div className="overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={videoUrl} controls autoPlay loop playsInline className="aspect-[3/4] max-h-[60vh] w-auto" />
            </div>
            <a href={videoUrl} download="my-video.mp4" target="_blank" rel="noreferrer"
              className="mt-2 block text-center text-[12px] font-bold text-white/60 underline">Download for yourself</a>
            <p className="mx-auto mt-3 max-w-[290px] text-center text-[12px] font-bold leading-snug text-white/70">
              Nothing is posted anywhere. It is yours — send it to him however you like.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
