"use client";

import { useState } from "react";
import { QrCode, X, Sparkles } from "lucide-react";

// Absolute base URL so the QR works when scanned from another device (e.g. a phone
// scanning a projected wall). Falls back to the current origin in dev.
function siteUrl() {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (env) return env.startsWith("http") ? env : `https://${env}`;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function qrUrl(tryUrl: string, size = 720) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(tryUrl)}`;
}

// Full-screen QR — the biggest, most scannable version (for wall projection).
function FullscreenQR({ lookId, lookName, qrSrc, onClose }: { lookId: string; lookName?: string; qrSrc: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-white px-6 text-center"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <button type="button" aria-label="Close" onClick={onClose}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-black/5 text-black/60">
        <X className="h-5 w-5" />
      </button>
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/40">Scan to try on</p>
      {lookName && <h2 className="mt-1 max-w-md text-2xl font-black leading-tight text-black">{lookName}</h2>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrSrc} alt="Try-on QR code" width={460} height={460}
        className="mt-6 h-[min(82vw,520px)] w-[min(82vw,520px)] rounded-2xl border border-black/10 bg-white object-contain p-2 shadow-xl" />
      <p className="mt-5 max-w-sm text-sm font-bold leading-relaxed text-black/55">
        Point your phone camera at the code to try this look on yourself — image &amp; 5-second video.
      </p>
      <a href={`/tryon/${lookId}`}
        className="mt-6 flex h-12 items-center justify-center gap-2 rounded-full bg-black px-8 text-sm font-black text-white active:scale-95 transition-transform">
        <Sparkles className="h-4 w-4" /> Try it on this device
      </a>
    </div>
  );
}

/**
 * "Scan to try on" QR linking to the look's try-on page — so anyone can scan
 * (e.g. a projected wall) and try the look on themselves.
 *  - "inline" → a large, always-visible QR card (best for projection)
 *  - "button" → a "QR" pill that opens the full-screen code
 *  - "icon"   → a round QR chip that opens the full-screen code
 */
export default function TryOnQR({ lookId, lookName, variant = "button" }: { lookId: string; lookName?: string; variant?: "button" | "icon" | "inline" }) {
  const [open, setOpen] = useState(false);
  const tryUrl = `${siteUrl()}/tryon/${lookId}`;

  if (variant === "inline") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-black/10 bg-black/[0.015] px-4 py-5 text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/40">Scan to try it on</p>
        <button type="button" onClick={() => setOpen(true)} aria-label="Enlarge QR code" className="active:scale-95 transition-transform">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl(tryUrl, 600)} alt="Try-on QR code" width={320} height={320}
            className="h-[min(74vw,340px)] w-[min(74vw,340px)] rounded-2xl border border-black/10 bg-white object-contain p-2 shadow-lg" />
        </button>
        <p className="max-w-xs text-[13px] font-bold leading-snug text-black/55">
          Point your phone camera at the code — try this look on yourself with AI. Tap to enlarge.
        </p>
        {open && <FullscreenQR lookId={lookId} lookName={lookName} qrSrc={qrUrl(tryUrl)} onClose={() => setOpen(false)} />}
      </div>
    );
  }

  return (
    <>
      {variant === "icon" ? (
        <button type="button" aria-label="Scan to try on" onClick={() => setOpen(true)}
          className="grid h-11 w-11 place-items-center rounded-full border border-black/15 bg-white text-black active:scale-90 transition-transform">
          <QrCode className="h-5 w-5" />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)}
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-5 text-sm font-black text-black active:scale-95 transition-transform">
          <QrCode className="h-4 w-4" /> QR
        </button>
      )}
      {open && <FullscreenQR lookId={lookId} lookName={lookName} qrSrc={qrUrl(tryUrl)} onClose={() => setOpen(false)} />}
    </>
  );
}
