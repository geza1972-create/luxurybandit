"use client";

import { useEffect, useState } from "react";

// The whole portal is 18+. This blocks EVERY page (it mounts in the root layout, above
// all content) until the visitor confirms they are 18 or older — a simple yes/no, no
// date of birth. Once confirmed we remember it in localStorage so it only appears once
// per device. Admins (who carry the try-look PIN) are never gated.
const OK_KEY = "lb_age_verified";
const ADMIN_KEYS = ["luxurybandit-try-look-admin-pin", "x-try-look-admin-pin"];

export default function AgeGate() {
  // Render nothing until mounted so we never hydrate a mismatched overlay.
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    setReady(true);
    try {
      if (localStorage.getItem(OK_KEY) === "1") return;
      if (ADMIN_KEYS.some((k) => localStorage.getItem(k))) return; // admins bypass
    } catch { /* localStorage blocked → still gate */ }
    setOpen(true);
  }, []);

  if (!ready || !open) return null;

  const confirm = () => {
    try { localStorage.setItem(OK_KEY, "1"); } catch { /* ignore */ }
    try { window.dispatchEvent(new Event("lb-age-ok")); } catch { /**/ } // let the cookie banner appear now
    setOpen(false);
  };

  return (
    <div className="lb-phone-col fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-md">
      <div className="relative w-full rounded-t-3xl bg-white p-6 shadow-2xl" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.75rem)" }}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/15" />
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-black px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white">18+</div>
        {denied ? (
          <>
            <p className="mt-2 text-xl font-black leading-tight text-black">Sorry</p>
            <p className="mt-1.5 text-[13px] font-bold leading-relaxed text-black/55">
              LuxuryBandit is for adults only (18+). You can&apos;t use this site.
            </p>
            <button
              type="button"
              onClick={() => setDenied(false)}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-full border border-black/15 text-sm font-black text-black/60 transition-transform active:scale-95"
            >
              Back
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-xl font-black leading-tight text-black">Are you 18 or older?</p>
            <p className="mt-1.5 text-[13px] font-bold leading-relaxed text-black/55">
              LuxuryBandit is for adults only (18+). Please confirm your age to continue.
            </p>
            <button
              type="button"
              onClick={confirm}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-black text-white transition-transform active:scale-95"
            >
              Yes, I&apos;m 18 or older
            </button>
            <button
              type="button"
              onClick={() => setDenied(true)}
              className="mt-2 flex h-12 w-full items-center justify-center rounded-full text-sm font-black text-black/45 transition-transform active:scale-95"
            >
              No
            </button>
          </>
        )}
      </div>
    </div>
  );
}
