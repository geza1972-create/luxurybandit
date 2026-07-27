"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Lock, Sparkles, ImageUp, RefreshCw, Mail, Check } from "lucide-react";

/**
 * „Surprise him" — SIE lädt ihr eigenes Foto hoch, gibt seine E-Mail ein und schickt ihm
 * ein privates Video. Gleiches Schema wie Kiss/Idol/Birthday: Radar-Show → verpixelter
 * Teaser → 3,99 € → ERST DANN echter Render → Versand als privater Link.
 *
 * Die Zustimmung ist hier keine Formalie: Das Video zeigt eine echte Person und geht an
 * eine fremde E-Mail-Adresse. Ohne Häkchen läuft nichts, und der Wortlaut wandert in den
 * Nachweis (surprise-log.json). Der Empfänger kann den Link jederzeit töten.
 */

const LOOK_ID = "look-1784191032626-70e3608b";   // Referenz-Look fürs Routing der Video-Route

// Bewusst NEUTRALE Wörter — Pixverse blockt sonst (siehe Memory „Pixverse-Prompt"):
// keine expliziten Begriffe, die Bewegung trägt die Stimmung.
export const SURPRISE_PROMPT =
  `@person stands in a warmly lit bedroom with soft evening light, looks straight into the camera, smiles, slowly turns once and walks a step towards the camera. Keep @person face, hair and outfit exactly as in the reference. Fluid natural motion, cinematic, photorealistic, shallow depth of field. Fixed camera, no zoom. No text or logos.`;

const CONSENT_TEXT =
  "This is me in the photo, I am 18 or older, the person I am sending it to wants to receive it, and I take responsibility for sending it.";

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

export default function SurpriseFunnel() {
  const [photo, setPhoto] = useState("");
  const [email, setEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [consent, setConsent] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [teaser, setTeaser] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const runRef = useRef(0);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p); setIsStaff(!!p && !localStorage.getItem("lb_preview_model"));
    } catch { /**/ }
    return () => { runRef.current = -1; };
  }, []);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const ready = !!photo && emailOk && consent;

  const onFile = async (f?: File | null) => { if (f) try { setPhoto(await fileToDataUrl(f)); } catch { /**/ } };

  // ECHTE Generierung — läuft erst nach Zahlung (oder für Staff).
  const realGenerate = async (token: number) => {
    setStatus("Rendering your video … (~1–3 min)");
    try {
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
        body: JSON.stringify({ lookId: LOOK_ID, person: photo, garment: photo, prompt: SURPRISE_PROMPT }),
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
    setBusy(true); setTeaser(false); setVideoUrl(""); setSent(false); setStatus("");
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

  // Versand: neutrale Mail mit privatem Link (kein Vorschaubild, 7 Tage gültig).
  const send = async () => {
    if (!videoUrl || sendBusy) return;
    setSendBusy(true); setStatus("");
    try {
      const r = await fetch("/api/surprise-send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, to: email.trim(), fromName: fromName.trim(), consentText: CONSENT_TEXT }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d?.ok) { setSent(true); setStatus(""); }
      else setStatus(d?.error || "Could not send.");
    } catch { setStatus("Network error."); }
    setSendBusy(false);
  };

  const input = "mt-2 h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#f6cf51]";

  return (
    <div className="mt-8">
      {/* 1 — ihr Foto */}
      <p className="text-[12px] font-black uppercase tracking-wide text-white/50">1 · Your photo</p>
      <button type="button" onClick={() => fileRef.current?.click()}
        className="relative mx-auto mt-2 flex aspect-[3/4] w-[56vw] max-w-[230px] flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed border-[#f6cf51]/40 bg-[#f6cf51]/[0.06] active:scale-[0.98] transition">
        {photo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={photo} alt="" className="h-full w-full object-cover object-top" />
          : (<>
              <ImageUp className="h-8 w-8 text-[#f6cf51]" />
              <span className="px-4 text-center text-[13px] font-black text-[#f6cf51]">Upload a photo of yourself</span>
              <span className="px-5 text-center text-[11px] font-bold leading-snug text-white/60">Whatever you would send him yourself — you decide how much you show.</span>
            </>)}
      </button>
      {photo && (
        <button type="button" onClick={() => fileRef.current?.click()} className="mx-auto mt-2 flex items-center gap-1.5 text-[12px] font-black text-white/60">
          <RefreshCw className="h-3.5 w-3.5" /> Change photo
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => void onFile(e.target.files?.[0])} />

      {/* 2 — wohin */}
      <p className="mt-6 text-[12px] font-black uppercase tracking-wide text-white/50">2 · Where it goes</p>
      <input value={email} onChange={e => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="off"
        placeholder="His email address" className={input} />
      <input value={fromName} onChange={e => setFromName(e.target.value)} maxLength={40}
        placeholder="Your name (optional — he sees who it's from)" className={input} />
      <p className="mt-2 text-[13px] font-bold leading-snug text-white/55">
        He gets a plain email with a private link — no preview picture, nothing visible in a
        notification. The link works for 7 days, then it disappears. He can delete it any time.
      </p>

      {/* 3 — Zustimmung + generieren */}
      <p className="mt-6 text-[12px] font-black uppercase tracking-wide text-white/50">3 · Your video</p>
      <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#f6cf51]" />
        <span className="text-[12px] font-bold leading-snug text-white/70">{CONSENT_TEXT}</span>
      </label>
      <button type="button" onClick={generate} disabled={!ready || busy}
        className="lb-gold mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {busy ? "Rendering …" : "Create the video"}
      </button>
      {status && <p className="mt-2 text-center text-[12px] font-bold text-white/60">{status}</p>}

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
            {sent ? (
              <p className="mt-3 flex items-center justify-center gap-2 text-[14px] font-black text-[#f6cf51]">
                <Check className="h-4 w-4" /> Sent to {email.trim()}
              </p>
            ) : (
              <button type="button" onClick={() => void send()} disabled={sendBusy}
                className="lb-gold mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black active:scale-95 transition disabled:opacity-60">
                {sendBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send it to him
              </button>
            )}
            <a href={videoUrl} download="my-video.mp4" target="_blank" rel="noreferrer"
              className="mt-2 block text-center text-[12px] font-bold text-white/60 underline">Download for yourself</a>
            <p className="mx-auto mt-3 max-w-[280px] text-center text-[12px] font-bold leading-snug text-white/55">
              Nothing is posted anywhere. It exists as your download and as one private link for him.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
