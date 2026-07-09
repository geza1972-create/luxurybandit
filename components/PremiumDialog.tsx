"use client";

import { useState } from "react";
import { Crown, Check, X, Loader2 } from "lucide-react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { premiumCheckoutUrl } from "@/lib/premium-link";

// Unlock dialog for locked models / looks / full videos / chats. Premium is now a single
// $49/mo subscription — first month $8 (coupon built into the Stripe Payment Link) — which
// grants 40 try-on videos every month and unlocks all locked content. Redirects to the
// hosted Stripe Payment Link; when the user returns, PremiumSync re-checks the subscription
// and tops up the monthly credits.
export default function PremiumDialog({ open, onClose, title = "Unlock the full experience", subtitle = "40 try-on videos every month — unlock every model, look & full video." }: {
  open: boolean; onClose: () => void; title?: string; subtitle?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!open) return null;
  const close = () => { setError(""); onClose(); };

  const buy = () => {
    setError("");
    const email = getStoredAuthSession()?.user?.email?.trim().toLowerCase();
    const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/stores";
    if (!email) {
      // Not signed in → sign in first so the subscription ties to their email, then come back.
      window.location.href = `/login?returnTo=${encodeURIComponent(here)}`;
      return;
    }
    setBusy(true);
    // Redirect to the Stripe Payment Link (first month $8 via its built-in coupon).
    window.location.href = premiumCheckoutUrl(email);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm" onClick={close}>
      <div className="relative w-full max-w-sm rounded-3xl border border-amber-400/20 bg-[#141210] p-6 text-center" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={close} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white"><X className="h-4 w-4" /></button>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black"><Crown className="h-7 w-7" /></span>
        <p className="mt-2.5 text-[12px] font-black uppercase tracking-[0.2em] text-amber-400">Premium</p>
        <h3 className="mt-1 text-lg font-black text-white">{title}</h3>
        <p className="mt-1.5 text-[13px] font-semibold leading-6 text-white/55">{subtitle}</p>

        {/* Price — $8 first month, shown BIG. */}
        <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-4">
          <p className="flex items-end justify-center gap-2">
            <span className="text-6xl font-black leading-none text-white">$8</span>
            <span className="mb-1 text-left text-[13px] font-black leading-tight text-amber-300">first<br />month</span>
          </p>
          <p className="mt-2 text-[12px] font-bold text-white/50">then $49/month · cancel anytime</p>
        </div>

        {/* Perks */}
        <div className="mt-4 grid gap-2 text-left">
          {["40 try-on videos every month", "Every model, look & full video unlocked", "Cancel anytime"].map(perk => (
            <div key={perk} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5">
              <Check className="h-4 w-4 shrink-0 text-amber-400" />
              <span className="text-[13px] font-bold text-white/80">{perk}</span>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => buy()} disabled={busy}
          className="lb-gold mt-5 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-black active:scale-95 transition-transform disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start Premium — $8 first month</>}
        </button>
        {error && <p className="mt-2 text-[12px] font-bold text-red-400">{error}</p>}
        <button type="button" onClick={close} className="mt-2 w-full py-2 text-[13px] font-black text-white/45">Maybe later</button>
      </div>
    </div>
  );
}
