"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Upload, Sparkles, Lock, Play, Loader2, Check, Download } from "lucide-react";
import { logFunnelEvent } from "@/lib/track-funnel";
import { trackMetaPixel } from "@/lib/meta-pixel";

// Self-insertion funnel — "You, in a video, in any look."
// The user picks one of our looks, uploads a selfie, watches a (staged) render,
// and pays $3.99 to unlock the finished clip. Payment goes through a hosted Stripe
// Payment Link; on success Stripe returns to this page with ?paid=1 and we reveal
// the video that was stashed in localStorage before the redirect.

const STRIPE_LINK = "https://buy.stripe.com/3cI9ALeO0c3Y5PY2RecIE03";
const PRICE_LABEL = "$3.99";
const LS_PENDING = "lb_yiv_pending"; // JSON of the picked clip, kept across the Stripe hop

type Clip = { id: string; videoUrl: string; imageUrl: string; thumbUrl?: string };

export default function YouInVideoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0b0a]" />}>
      <YouInVideoInner />
    </Suspense>
  );
}

function YouInVideoInner() {
  const router = useRouter();
  const params = useSearchParams();
  const lang = (params.get("lang") === "ro" ? "ro" : "en") as "ro" | "en";
  const L = (ro: string, en: string) => (lang === "ro" ? ro : en);

  type Step = "pick" | "upload" | "generating" | "paywall" | "unlocked";
  const [step, setStep] = useState<Step>("pick");
  const [clips, setClips] = useState<Clip[]>([]);
  const [loadingClips, setLoadingClips] = useState(true);
  const [picked, setPicked] = useState<Clip | null>(null);
  const [photo, setPhoto] = useState<string>(""); // data URL of the uploaded selfie
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load the pickable looks (public feed videos) ────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/try-this-look?community=1");
        const data = await res.json();
        const list: Clip[] = (data.community ?? data.items ?? [])
          .filter((g: { videoUrl?: string; imageUrl?: string }) => g.videoUrl && g.imageUrl)
          .slice(0, 12)
          .map((g: { id: string; videoUrl: string; imageUrl: string; thumbUrl?: string }) => ({
            id: g.id, videoUrl: g.videoUrl, imageUrl: g.imageUrl, thumbUrl: g.thumbUrl,
          }));
        if (alive) setClips(list);
      } catch { /* ignore */ }
      if (alive) setLoadingClips(false);
    })();
    return () => { alive = false; };
  }, []);

  // ── Came back from Stripe (?paid=1) → reveal the stashed clip ────────────────
  useEffect(() => {
    if (params.get("paid") !== "1") return;
    try {
      const raw = localStorage.getItem(LS_PENDING);
      if (raw) {
        setPicked(JSON.parse(raw) as Clip);
        setStep("unlocked");
        trackMetaPixel("Purchase", { value: 3.99, currency: "USD" });
        logFunnelEvent("yiv_paid");
      }
    } catch { /* ignore */ }
  }, [params]);

  // ── Log the funnel open once ────────────────────────────────────────────────
  useEffect(() => { logFunnelEvent("yiv_open"); }, []);

  // ── Fake render: 0→100 over ~7s, then straight to the paywall ───────────────
  useEffect(() => {
    if (step !== "generating") return;
    setProgress(0);
    const started = performance.now();
    const DURATION = 7000;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(100, Math.round(((now - started) / DURATION) * 100));
      setProgress(p);
      if (p < 100) raf = requestAnimationFrame(tick);
      else setTimeout(() => setStep("paywall"), 400);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  const onPick = (c: Clip) => { setPicked(c); setStep("upload"); logFunnelEvent("yiv_pick"); };

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { setPhoto(String(reader.result || "")); };
    reader.readAsDataURL(f);
  }, []);

  const pay = () => {
    try { if (picked) localStorage.setItem(LS_PENDING, JSON.stringify(picked)); } catch { /* ignore */ }
    trackMetaPixel("InitiateCheckout", { value: 3.99, currency: "USD" });
    logFunnelEvent("yiv_pay_click");
    window.location.href = STRIPE_LINK;
  };

  const genStatus = [
    L("Îți analizăm fața…", "Mapping your face…"),
    L("Potrivim look-ul pe tine…", "Fitting the look to you…"),
    L("Randăm videoul tău…", "Rendering your video…"),
    L("Finisăm detaliile…", "Polishing the details…"),
  ][Math.min(3, Math.floor(progress / 26))];

  return (
    <div className="min-h-screen bg-[#0d0b0a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#0d0b0a]/90 px-3 py-3 backdrop-blur">
        <button type="button" onClick={() => (step === "pick" ? router.back() : setStep("pick"))}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 active:scale-90">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-[13px] font-black tracking-widest text-[#e7c877]">LUXURYBANDIT</span>
        <div className="w-9" />
      </div>

      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-5">
        {/* ── Step: pick a look ─────────────────────────────────────────────── */}
        {step === "pick" && (
          <>
            <h1 className="text-center text-[24px] font-black leading-tight">{L("Tu, într-un video 🎬", "You, in a video 🎬")}</h1>
            <p className="mx-auto mt-2 max-w-xs text-center text-[13px] font-bold text-white/55">{L("Alege un look și pune-ți fața pe el. Primești videoul tău în câteva secunde.", "Pick a look, add your face — get your own video in seconds.")}</p>
            {loadingClips ? (
              <div className="mt-10 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-white/40" /></div>
            ) : clips.length === 0 ? (
              <p className="mt-10 text-center text-[13px] font-bold text-white/40">{L("Momentan nu sunt look-uri disponibile.", "No looks available right now.")}</p>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3">
                {clips.map((c) => (
                  <button key={c.id} type="button" onClick={() => onPick(c)}
                    className="group relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] active:scale-95 transition">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.thumbUrl || c.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-black/40 backdrop-blur"><Play className="h-5 w-5" fill="currentColor" /></span>
                    </span>
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#e7c877] px-3 py-1 text-[11px] font-black text-black opacity-0 group-active:opacity-100">{L("Alege", "Pick")}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Step: upload your photo ───────────────────────────────────────── */}
        {step === "upload" && picked && (
          <>
            <h1 className="text-center text-[22px] font-black leading-tight">{L("Adaugă poza ta", "Add your photo")}</h1>
            <p className="mx-auto mt-2 max-w-xs text-center text-[13px] font-bold text-white/55">{L("O poză clară cu fața ta — o folosim doar pentru videoul tău.", "A clear photo of your face — used only for your video.")}</p>
            <div className="mx-auto mt-6 max-w-xs">
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-[#c9a23f]/50 bg-[#c9a23f]/[0.06] active:scale-[0.98] transition">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-2 text-[#e7c877]">
                    <Upload className="h-8 w-8" />
                    <span className="text-[13px] font-black">{L("Alege o poză", "Choose a photo")}</span>
                  </span>
                )}
              </button>
            </div>
            <button type="button" disabled={!photo} onClick={() => { setStep("generating"); logFunnelEvent("yiv_generate"); }}
              className="lb-gold mx-auto mt-6 flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition disabled:opacity-40">
              <Sparkles className="h-5 w-5" /> {L("Creează videoul meu", "Create my video")}
            </button>
          </>
        )}

        {/* ── Step: staged render ───────────────────────────────────────────── */}
        {step === "generating" && (
          <div className="pt-6 text-center">
            <div className="relative mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-3xl border border-white/10">
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="h-full w-full object-cover" />
              )}
              {/* scanning line */}
              <span className="pointer-events-none absolute inset-x-0 h-1/4 animate-[yivscan_2s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-[#e7c877]/40 to-transparent" />
              <span className="absolute inset-0 bg-black/20" />
            </div>
            <p className="mt-6 text-[15px] font-black">{genStatus}</p>
            <div className="mx-auto mt-3 h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#e7c877] transition-[width] duration-150" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-[12px] font-bold text-white/40">{progress}%</p>
            <style>{`@keyframes yivscan{0%{top:-25%}100%{top:100%}}`}</style>
          </div>
        )}

        {/* ── Step: paywall (blurred result) ────────────────────────────────── */}
        {step === "paywall" && picked && (
          <div className="pt-2 text-center">
            <h1 className="text-[22px] font-black leading-tight">{L("Videoul tău e gata! 💛", "Your video is ready! 💛")}</h1>
            <p className="mx-auto mt-2 max-w-xs text-[13px] font-bold text-white/55">{L("Deblochează-l și descarcă-l în calitate maximă.", "Unlock it and download it in full quality.")}</p>
            <div className="relative mx-auto mt-5 aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-3xl border border-[#c9a23f]/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={picked.thumbUrl || picked.imageUrl} alt="" className="h-full w-full scale-110 object-cover object-top blur-xl" />
              <span className="absolute inset-0 grid place-items-center bg-black/40">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-[#e7c877] text-black"><Lock className="h-6 w-6" /></span>
              </span>
            </div>
            <button type="button" onClick={pay}
              className="lb-gold mx-auto mt-6 flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition">
              <Lock className="h-5 w-5" /> {L(`Deblochează videoul — ${PRICE_LABEL}`, `Unlock your video — ${PRICE_LABEL}`)}
            </button>
            <div className="mx-auto mt-3 flex max-w-xs items-center justify-center gap-1.5 text-[11px] font-bold text-white/40">
              <Check className="h-3.5 w-3.5 text-emerald-400" /> {L("Plată securizată prin Stripe", "Secure checkout by Stripe")}
            </div>
            <button type="button" onClick={() => setStep("unlocked")}
              className="mx-auto mt-4 block text-[11px] font-bold text-white/35 underline underline-offset-2">
              {L("Am plătit deja — vezi videoul", "Already paid? View my video")}
            </button>
          </div>
        )}

        {/* ── Step: unlocked ────────────────────────────────────────────────── */}
        {step === "unlocked" && picked && (
          <div className="pt-2 text-center">
            <h1 className="text-[22px] font-black leading-tight">{L("Gata! Bucură-te 💛", "Done! Enjoy 💛")}</h1>
            <div className="relative mx-auto mt-5 aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-3xl border border-[#c9a23f]/40 bg-black">
              <video src={picked.videoUrl} poster={picked.imageUrl} controls autoPlay loop playsInline
                className="h-full w-full object-cover" />
            </div>
            <a href={picked.videoUrl} download
              className="lb-gold mx-auto mt-6 flex h-13 w-full max-w-xs items-center justify-center gap-2 rounded-full py-3.5 text-base font-black active:scale-95 transition">
              <Download className="h-5 w-5" /> {L("Descarcă videoul", "Download video")}
            </a>
            <button type="button" onClick={() => { setPicked(null); setPhoto(""); setStep("pick"); }}
              className="mx-auto mt-3 flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full border border-[#c9a23f]/40 bg-[#c9a23f]/10 text-[13px] font-black text-[#e7c877] active:scale-95 transition">
              {L("Fă încă unul", "Make another")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
