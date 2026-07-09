"use client";

import { useState } from "react";
import { Crown, Check, X, Loader2 } from "lucide-react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { premiumCheckoutUrl } from "@/lib/premium-link";

// Community membership dialog — a $49/mo Stripe subscription (separate from the $8 video
// pack, which is pay-per-use for generating videos). Seeing the Community feed requires an
// active subscription. Uses the hosted subscription checkout at /api/premium; Stripe returns
// to the current page with ?premium=success, where the page re-checks the subscription.
export default function SubscribeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!open) return null;
  const close = () => { setError(""); onClose(); };

  const subscribe = () => {
    setError("");
    const email = getStoredAuthSession()?.user?.email?.trim().toLowerCase();
    const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/stores";
    if (!email) { window.location.href = `/login?returnTo=${encodeURIComponent(here)}`; return; }
    setBusy(true);
    // Same Premium subscription as everywhere else — the Stripe Payment Link (first month $8).
    window.location.href = premiumCheckoutUrl(email);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm" onClick={close}>
      <div className="relative w-full max-w-sm rounded-3xl border border-amber-400/20 bg-[#141210] p-6 text-center" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={close} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white"><X className="h-4 w-4" /></button>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black"><Crown className="h-7 w-7" /></span>
        <h3 className="mt-4 text-lg font-black text-white">Members only</h3>
        <p className="mt-1.5 text-[13px] font-semibold leading-6 text-white/55">The Community feed is for members. Subscribe to unlock it.</p>

        <div className="mt-5 grid gap-2 text-left">
          {["Full access to the Community feed", "New members-only drops", "Cancel anytime"].map(perk => (
            <div key={perk} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5">
              <Check className="h-4 w-4 shrink-0 text-amber-400" />
              <span className="text-[13px] font-bold text-white/80">{perk}</span>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => void subscribe()} disabled={busy}
          className="lb-gold mt-5 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-black active:scale-95 transition-transform disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start Premium — $8 first month</>}
        </button>
        {error && <p className="mt-2 text-[12px] font-bold text-red-400">{error}</p>}
        <button type="button" onClick={close} className="mt-2 w-full py-2 text-[13px] font-black text-white/45">Maybe later</button>
      </div>
    </div>
  );
}
