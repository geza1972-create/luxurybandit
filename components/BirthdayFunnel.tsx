"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Lock, Sparkles, Share2 } from "lucide-react";

// „Birthdays" — GLEICHES SCHEMA wie Kiss/Idol (Owner: „zuerst Render-Radar, dann bezahlen"):
// Name eingeben → Radar-Show (kostet nichts, KEIN API-Call) → verpixelter Teaser →
// bezahlen → ERST DANN rendert Pixverse echt → Video + Teilen.
//
// Unterschied zu Kiss/Idol: hier zahlt man EINZELN 3,99 € statt Abo — so ein Video
// verschenkt man einmal, dafür schließt niemand ein Abo ab.

const BIRTHDAY_LOOK_ID = "look-1784191032626-70e3608b";   // Referenz-Look fürs Routing der Route

// Prompt: sie gratuliert mit Namen. Beide @-Token zeigen auf dasselbe Bild (die Route bindet
// immer zwei Referenzen) — im Text kommt nur @person vor.
export const birthdayPrompt = (name: string) =>
  `@person stands in a festive room with balloons, candles and warm golden lights, holding a birthday cake. She smiles happily at the camera, waves, and says out loud: "Happy birthday to you, dear ${name}!" Keep @person face and appearance exactly the same throughout. Fixed camera, no zoom, no camera movement. Fluid natural motion, photorealistic, high-end look. No text or logos.`;

const RENDER_STEPS: [number, string][] = [
  [0, "Preparing the room …"],
  [4000, "Lighting the candles …"],
  [9000, "Recording her greeting …"],
  [14000, "Finishing touches …"],
];
const RENDER_MS = 17000;

export default function BirthdayFunnel({ modelPhoto, modelName = "Bella" }: { modelPhoto: string; modelName?: string }) {
  const [name, setName] = useState("");
  const [isStaff, setIsStaff] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [teaser, setTeaser] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const runRef = useRef(0);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p); setIsStaff(!!p && !localStorage.getItem("lb_preview_model"));
    } catch { /**/ }
    return () => { runRef.current = -1; };
  }, []);

  // ECHTE Generierung — läuft erst nach Zahlung (oder für Staff).
  const realGenerate = async (token: number) => {
    setStatus("Rendering her greeting … (~1–3 min)");
    try {
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
        // Beide Referenzen = ihr Foto; der Prompt nennt nur @person.
        body: JSON.stringify({ lookId: BIRTHDAY_LOOK_ID, person: modelPhoto, garment: modelPhoto, prompt: birthdayPrompt(name.trim()) }),
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

  // Generieren = IMMER erst die Fake-Show (auch für Staff), damit der Owner den Kundenweg sieht.
  const generate = () => {
    if (!name.trim() || busy) return;
    setBusy(true); setTeaser(false); setVideoUrl(""); setStatus("");
    const token = Date.now(); runRef.current = token;
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    for (const [at, text] of RENDER_STEPS) {
      setTimeout(() => { if (runRef.current === token) setStatus(text); }, at);
    }
    setTimeout(() => {
      if (runRef.current !== token) return;
      setBusy(false); setStatus(""); setTeaser(true);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }, RENDER_MS);
  };

  // Freischalten: Staff gratis, Kunde 3,99 € (Popup + Status-Poll) → dann echter Render.
  const unlock = async () => {
    if (payBusy) return;
    if (isStaff) { setBusy(true); const t = Date.now(); runRef.current = t; await realGenerate(t); return; }
    setPayBusy(true); setStatus("");
    try {
      const start = await fetch("/api/birthday-video-checkout", {
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

  // Teilen: das fertige Video an den Geburtstagskind weitergeben.
  const share = async () => {
    const url = videoUrl;
    try {
      if (navigator.share) { await navigator.share({ title: `Happy birthday, ${name}!`, url }); return; }
      await navigator.clipboard.writeText(url);
      setStatus("Link copied — paste it in WhatsApp.");
    } catch { /**/ }
  };

  return (
    <div className="mt-8">
      <p className="text-[12px] font-black uppercase tracking-wide text-white/50">1 · Who is it for?</p>
      <input value={name} onChange={e => setName(e.target.value)} maxLength={40}
        placeholder="Their first name — e.g. Maria"
        className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#c9a23f]" />
      <p className="mt-1.5 text-[12px] font-bold text-white/50">
        {modelName} says it out loud: “Happy birthday to you, dear {name.trim() || "…"}!”
      </p>

      <p className="mt-5 text-[12px] font-black uppercase tracking-wide text-white/50">2 · The video</p>
      <button type="button" onClick={generate} disabled={!name.trim() || busy}
        className="lb-gold mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "🎂"} {busy ? "Rendering …" : "Create the birthday video"}
      </button>
      {status && <p className="mt-2 text-center text-[12px] font-bold text-white/60">{status}</p>}

      <div ref={resultRef}>
        {/* Radar-Scan — gleiche Optik wie im Try-on/Kiss */}
        {busy && !videoUrl && modelPhoto && (
          <div className="mx-auto mt-4 w-fit">
            <div className="relative overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={modelPhoto} alt="" className="aspect-[3/4] max-h-[60vh] w-auto object-cover object-top blur-[6px] brightness-75" />
              <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-white shadow-[0_0_18px_5px_rgba(255,255,255,0.7)]" />
              <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-14 -translate-y-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
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

        {/* Verpixelter Teaser + Bezahl-CTA */}
        {teaser && !videoUrl && modelPhoto && (
          <div className="mx-auto mt-4 w-fit">
            <div className="relative overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={modelPhoto} alt="" className="aspect-[3/4] max-h-[60vh] w-auto scale-110 object-cover blur-2xl" />
              <div className="absolute inset-0 grid place-items-center bg-black/30">
                <div className="px-6 text-center">
                  <Lock className="mx-auto h-8 w-8 text-amber-400" />
                  <p className="lb-onmedia mt-2 text-[15px] font-black">The birthday video for {name.trim()} is ready 🎂</p>
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

        {/* Fertiges Video + Teilen */}
        {videoUrl && (
          <div className="mx-auto mt-4 w-fit">
            <div className="overflow-hidden rounded-3xl border border-white/10">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={videoUrl} controls autoPlay loop playsInline className="aspect-[3/4] max-h-[60vh] w-auto" />
            </div>
            <button type="button" onClick={() => void share()}
              className="lb-gold mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black active:scale-95 transition">
              <Share2 className="h-4 w-4" /> Send it to {name.trim()}
            </button>
            <a href={videoUrl} download={`birthday-${name.trim() || "video"}.mp4`} target="_blank" rel="noreferrer"
              className="mt-2 block text-center text-[12px] font-bold text-white/60 underline">Download</a>
          </div>
        )}
      </div>
    </div>
  );
}
