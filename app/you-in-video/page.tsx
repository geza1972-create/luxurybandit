"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Upload, Sparkles, Lock, Play, Loader2, Check, Download } from "lucide-react";
import { logFunnelEvent } from "@/lib/track-funnel";
import { trackMetaPixel } from "@/lib/meta-pixel";
import { EXTRA_VIDEO_CENTS, eur } from "@/lib/pricing";

// Self-insertion funnel — "You, in a video, in any look."
// The user picks one of our looks, uploads a selfie, watches a (staged) render,
// and pays $3.99 to unlock the finished clip. Payment goes through a hosted Stripe
// Payment Link; on success Stripe returns to this page with ?paid=1 and we reveal
// the video that was stashed in localStorage before the redirect.

const STRIPE_LINK = "https://buy.stripe.com/3cI9ALeO0c3Y5PY2RecIE03";
// EINE Zahl fuer Beschriftung UND Pixel-Meldung (Owner 31.07.2026). Vorher stand 3,99 hier
// dreimal: als Text und zweimal als Zahl an Meta — die liefen beim Preiswechsel auseinander.
const PRICE_LABEL = eur(EXTRA_VIDEO_CENTS);
const PRICE_VALUE = EXTRA_VIDEO_CENTS / 100;
const LS_PENDING = "lb_yiv_pending"; // JSON of the picked clip, kept across the Stripe hop

type Clip = { id: string; videoUrl: string; imageUrl: string; thumbUrl?: string };

export default function YouInVideoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen lb-bg" />}>
      <YouInVideoInner />
    </Suspense>
  );
}

function YouInVideoInner() {
  const router = useRouter();
  const params = useSearchParams();
  const lang = "en" as "ro" | "en"; // English forced everywhere (RO strings kept as a dormant fallback)
  const L = (ro: string, en: string) => (lang === "ro" ? ro : en);

  type Step = "pick" | "upload" | "generating" | "paywall" | "unlocked";
  const [step, setStep] = useState<Step>("pick");
  const [clips, setClips] = useState<Clip[]>([]);
  const [loadingClips, setLoadingClips] = useState(true);
  const [picked, setPicked] = useState<Clip | null>(null);
  const [rawPhoto, setRawPhoto] = useState<string>(""); // uncropped upload
  const [photo, setPhoto] = useState<string>(""); // cropped selfie fed to the render
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

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
        trackMetaPixel("Purchase", { value: PRICE_VALUE, currency: "USD" });
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
    reader.onload = () => { setRawPhoto(String(reader.result || "")); setZoom(1); setOffset({ x: 0, y: 0 }); };
    reader.readAsDataURL(f);
  }, []);

  // Drag to reposition the face inside the crop frame.
  const onDragStart = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setOffset({ x: dragRef.current.ox + (e.clientX - dragRef.current.x), y: dragRef.current.oy + (e.clientY - dragRef.current.y) });
  };
  const onDragEnd = () => { dragRef.current = null; };

  // Bake the current pan/zoom crop (an object-cover frame + translate/scale) to a data URL.
  const cropToDataUrl = (): string => {
    const box = cropBoxRef.current, img = imgRef.current;
    if (!box || !img || !img.naturalWidth) return rawPhoto;
    const bw = box.clientWidth, bh = box.clientHeight;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const cover = Math.max(bw / nw, bh / nh);
    const w0 = nw * cover, h0 = nh * cover;
    const x0 = (bw - w0) / 2, y0 = (bh - h0) / 2; // object-cover, centered
    const cx = bw / 2, cy = bh / 2;
    // CSS applies translate(offset) scale(zoom) about the center → scale first, then offset.
    const dx = cx + (x0 - cx) * zoom + offset.x;
    const dy = cy + (y0 - cy) * zoom + offset.y;
    const SS = 3; // supersample for a crisp result
    const canvas = document.createElement("canvas");
    canvas.width = bw * SS; canvas.height = bh * SS;
    const ctx = canvas.getContext("2d");
    if (!ctx) return rawPhoto;
    ctx.drawImage(img, dx * SS, dy * SS, w0 * zoom * SS, h0 * zoom * SS);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const confirmCrop = () => {
    setPhoto(cropToDataUrl());
    setStep("generating");
    logFunnelEvent("yiv_generate");
  };

  const pay = () => {
    try { if (picked) localStorage.setItem(LS_PENDING, JSON.stringify(picked)); } catch { /* ignore */ }
    trackMetaPixel("InitiateCheckout", { value: PRICE_VALUE, currency: "USD" });
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
    <div className="min-h-screen lb-bg text-white">
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
            <p className="mx-auto mt-2 max-w-xs text-center text-[13px] font-bold text-white/75">{L("Alege un look și pune-ți fața pe el. Primești videoul tău în câteva secunde.", "Pick a look, add your face — get your own video in seconds.")}</p>
            {loadingClips ? (
              <div className="mt-10 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-white/80" /></div>
            ) : clips.length === 0 ? (
              <p className="mt-10 text-center text-[13px] font-bold text-white/80">{L("Momentan nu sunt look-uri disponibile.", "No looks available right now.")}</p>
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

        {/* ── Step: upload + crop your photo ────────────────────────────────── */}
        {step === "upload" && picked && (
          <>
            <h1 className="text-center text-[22px] font-black leading-tight">{L("Adaugă poza ta", "Add your photo")}</h1>
            <p className="mx-auto mt-2 max-w-xs text-center text-[13px] font-bold text-white/75">
              {rawPhoto
                ? L("Potrivește-ți fața în contur. Trage și mărește.", "Line your face up with the outline. Drag & zoom.")
                : L("O poză clară cu fața ta — o folosim doar pentru videoul tău.", "A clear photo of your face — used only for your video.")}
            </p>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

            {!rawPhoto ? (
              <div className="mx-auto mt-6 max-w-xs">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-[#f6cf51]/50 bg-[#f6cf51]/[0.06] active:scale-[0.98] transition">
                  <span className="flex flex-col items-center gap-2 text-[#e7c877]">
                    <Upload className="h-8 w-8" />
                    <span className="text-[13px] font-black">{L("Alege o poză", "Choose a photo")}</span>
                  </span>
                </button>
              </div>
            ) : (
              <>
                {/* Crop frame with a dashed face-contour guide */}
                <div ref={cropBoxRef}
                  className="relative mx-auto mt-5 aspect-[3/4] w-full max-w-[280px] touch-none select-none overflow-hidden rounded-3xl border border-[#f6cf51]/40 bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img ref={imgRef} src={rawPhoto} alt="" draggable={false}
                    onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}
                    className="absolute inset-0 h-full w-full cursor-grab object-cover active:cursor-grabbing"
                    style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, willChange: "transform" }} />
                  {/* dashed face outline */}
                  <svg viewBox="0 0 100 133" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
                    <path d="M50 20 C66 20 74 34 74 50 C74 72 63 92 50 92 C37 92 26 72 26 50 C26 34 34 20 50 20 Z"
                      fill="none" stroke="#ffffff" strokeWidth="0.9" strokeDasharray="3 2.5" opacity="0.85" />
                  </svg>
                  <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[10px] font-black text-white/85 backdrop-blur">{L("Trage ca să potrivești", "Drag to fit your face")}</span>
                </div>

                {/* zoom */}
                <div className="mx-auto mt-4 flex w-full max-w-[280px] items-center gap-3">
                  <span className="text-[11px] font-black text-white/80">–</span>
                  <input type="range" min={1} max={3} step={0.01} value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-[#e7c877]" />
                  <span className="text-[13px] font-black text-white/80">+</span>
                </div>

                <button type="button" onClick={confirmCrop}
                  className="lb-gold mx-auto mt-5 flex h-14 w-full max-w-[280px] items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition">
                  <Sparkles className="h-5 w-5" /> {L("Creează videoul meu", "Create my video")}
                </button>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="mx-auto mt-3 block text-[12px] font-bold text-white/80 underline underline-offset-2">
                  {L("Alege altă poză", "Choose another photo")}
                </button>
              </>
            )}
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
            <p className="mt-2 text-[12px] font-bold text-white/80">{progress}%</p>
            <style>{`@keyframes yivscan{0%{top:-25%}100%{top:100%}}`}</style>
          </div>
        )}

        {/* ── Step: paywall (blurred result) ────────────────────────────────── */}
        {step === "paywall" && picked && (
          <div className="pt-2 text-center">
            <h1 className="text-[22px] font-black leading-tight">{L("Videoul tău e gata! 💛", "Your video is ready! 💛")}</h1>
            <p className="mx-auto mt-2 max-w-xs text-[13px] font-bold text-white/75">{L("Deblochează-l și descarcă-l în calitate maximă.", "Unlock it and download it in full quality.")}</p>
            <div className="relative mx-auto mt-5 aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-3xl border border-[#f6cf51]/40">
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
            <div className="mx-auto mt-3 flex max-w-xs items-center justify-center gap-1.5 text-[11px] font-bold text-white/80">
              <Check className="h-3.5 w-3.5 text-amber-400" /> {L("Plată securizată prin Stripe", "Secure checkout by Stripe")}
            </div>
            <button type="button" onClick={() => setStep("unlocked")}
              className="mx-auto mt-4 block text-[11px] font-bold text-white/75 underline underline-offset-2">
              {L("Am plătit deja — vezi videoul", "Already paid? View my video")}
            </button>
          </div>
        )}

        {/* ── Step: unlocked ────────────────────────────────────────────────── */}
        {step === "unlocked" && picked && (
          <div className="pt-2 text-center">
            <h1 className="text-[22px] font-black leading-tight">{L("Gata! Bucură-te 💛", "Done! Enjoy 💛")}</h1>
            <div className="relative mx-auto mt-5 aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-3xl border border-[#f6cf51]/40 bg-black">
              <video src={picked.videoUrl} poster={picked.imageUrl} controls autoPlay loop playsInline
                className="h-full w-full object-cover" />
            </div>
            <a href={picked.videoUrl} download
              className="lb-gold mx-auto mt-6 flex h-13 w-full max-w-xs items-center justify-center gap-2 rounded-full py-3.5 text-base font-black active:scale-95 transition">
              <Download className="h-5 w-5" /> {L("Descarcă videoul", "Download video")}
            </a>
            <button type="button" onClick={() => { setPicked(null); setPhoto(""); setStep("pick"); }}
              className="mx-auto mt-3 flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full border border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[13px] font-black text-[#e7c877] active:scale-95 transition">
              {L("Fă încă unul", "Make another")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
