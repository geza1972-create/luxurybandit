"use client";

import { useState } from "react";
import { Crown, Check, X, Loader2 } from "lucide-react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

// Unlock dialog for locked models / looks / full videos / chats. One model only now:
// the $8 video pack (4 try-on videos, no subscription). Buying it marks the visitor as
// a paying customer (localStorage.lb_paid), which unlocks the locked content for as long
// as they have credits left — see PremiumSync. Uses a Stripe popup opened synchronously
// in the click gesture (so it isn't blocked) + poll, same as the try-on funnel.
export default function PremiumDialog({ open, onClose, title = "Unlock the full experience", subtitle = "Get 4 try-on videos — and unlock every model, look and full video." }: {
  open: boolean; onClose: () => void; title?: string; subtitle?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!open) return null;
  const close = () => { setError(""); onClose(); };

  const buy = async () => {
    setError("");
    const email = getStoredAuthSession()?.user?.email?.trim().toLowerCase();
    const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/stores";
    if (!email) {
      // Not signed in → sign in first so the purchase ties to their email, then come back.
      window.location.href = `/login?returnTo=${encodeURIComponent(here)}`;
      return;
    }
    // Open the popup NOW (synchronously in the click) — a popup opened after the await is blocked.
    const payWin = window.open("about:blank", "lb_pay", "width=480,height=800");
    setBusy(true);
    try {
      const res = await fetch("/api/video-pack", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.url) { try { payWin?.close(); } catch { /**/ } throw new Error(d.error ?? "Could not start checkout."); }
      if (payWin && !payWin.closed) payWin.location.href = d.url;
      else { window.location.href = d.url; return; } // popup blocked → full-page fallback
      // Poll until Stripe reports the session paid (credits granted), then unlock + reload.
      for (let i = 0; i < 150; i++) {
        await new Promise(r => setTimeout(r, 2000));
        try {
          const st = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(d.sessionId)}`).then(r => r.json());
          if (st?.paid) {
            try { payWin?.close(); } catch { /**/ }
            try { localStorage.setItem("lb_paid", "1"); localStorage.setItem("lb_paid_email", email); } catch { /**/ }
            window.dispatchEvent(new Event("lb-paid-updated"));
            window.location.reload();
            return;
          }
        } catch { /**/ }
        if (payWin && payWin.closed) break;
      }
      setError("Payment wasn't completed.");
      setBusy(false);
    } catch (e) {
      try { payWin?.close(); } catch { /**/ }
      setError(e instanceof Error ? e.message : "Could not start checkout.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm" onClick={close}>
      <div className="relative w-full max-w-sm rounded-3xl border border-amber-400/20 bg-[#141210] p-6 text-center" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={close} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white"><X className="h-4 w-4" /></button>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black"><Crown className="h-7 w-7" /></span>
        <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
        <p className="mt-1.5 text-[13px] font-semibold leading-6 text-white/55">{subtitle}</p>

        {/* Perks */}
        <div className="mt-5 grid gap-2 text-left">
          {["4 try-on videos included", "Unlocks every model & full video", "Yours to keep — no subscription"].map(perk => (
            <div key={perk} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5">
              <Check className="h-4 w-4 shrink-0 text-amber-400" />
              <span className="text-[13px] font-bold text-white/80">{perk}</span>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => void buy()} disabled={busy}
          className="lb-gold mt-5 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-black active:scale-95 transition-transform disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Get 4 videos — $8</>}
        </button>
        {error && <p className="mt-2 text-[12px] font-bold text-red-400">{error}</p>}
        <button type="button" onClick={close} className="mt-2 w-full py-2 text-[13px] font-black text-white/45">Maybe later</button>
      </div>
    </div>
  );
}
