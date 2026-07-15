"use client";

import { useEffect, useState } from "react";
import { Crown, Check, X, Loader2 } from "lucide-react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { startPremiumCheckout } from "@/lib/start-premium-checkout";
import { logFunnelEvent } from "@/lib/track-funnel";

// Membership dialog — the ONE $4.99/mo Stripe subscription that unlocks everything:
// free unlimited chat, every private video, Super Follow, and buying influencers. Uses the
// hosted subscription checkout at /api/premium (which reads the membership price from the admin
// price list); Stripe returns to the current page with ?premium=success, where it re-checks.
export default function SubscribeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Funnel: paywall seen (fires once when the dialog opens).
  useEffect(() => { if (open) logFunnelEvent("paywall_view", { paywall: "community", lookName: "Premium" }); }, [open]);
  if (!open) return null;
  const close = () => { setError(""); onClose(); };
  const signedIn = !!getStoredAuthSession()?.user?.email;

  // Capture the visitor as a free signup (no Premium, no charge) instead of losing them.
  const freeSignup = () => {
    logFunnelEvent("free_signup_click", { paywall: "community" });
    const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/stores";
    window.location.href = `/login?mode=signup&returnTo=${encodeURIComponent(here)}`;
  };

  const subscribe = async () => {
    setError("");
    logFunnelEvent("premium_click", { paywall: "community", lookName: "Premium" });
    const email = getStoredAuthSession()?.user?.email?.trim().toLowerCase();
    // Not signed in → mark a pending checkout, then sign in. PremiumSync forwards straight to
    // Stripe the moment they're signed in, wherever the login round-trip lands them.
    if (!email) {
      try { localStorage.setItem("lb_pending_checkout", String(Date.now())); } catch { /**/ }
      window.location.href = `/login?returnTo=${encodeURIComponent("/go/premium")}`;
      return;
    }
    setBusy(true);
    // API checkout — applies the first-month $8 coupon (the hosted Payment Link did not).
    logFunnelEvent("checkout_start", { paywall: "community", lookName: "Premium" });
    const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/stores";
    try { await startPremiumCheckout(email, here); }
    catch (e) { setBusy(false); setError(e instanceof Error ? e.message : "Could not start checkout."); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm" onClick={close}>
      <div className="relative w-full max-w-sm rounded-3xl border border-amber-400/20 bg-[#141210] p-6 text-center" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={close} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white"><X className="h-4 w-4" /></button>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black"><Crown className="h-7 w-7" /></span>
        <h3 className="mt-4 text-lg font-black text-white">Membership</h3>
        <p className="mt-1.5 text-[13px] font-semibold leading-6 text-white/55">One price. The whole marketplace.</p>

        <div className="mt-5 grid gap-2 text-left">
          {["Free unlimited chat with any model", "See every private video", "Super Follow anyone", "Buy & own influencers"].map(perk => (
            <div key={perk} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5">
              <Check className="h-4 w-4 shrink-0 text-amber-400" />
              <span className="text-[13px] font-bold text-white/80">{perk}</span>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => void subscribe()} disabled={busy}
          className="lb-gold mt-5 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-black active:scale-95 transition-transform disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Get membership — $4.99/mo</>}
        </button>
        {error && <p className="mt-2 text-[12px] font-bold text-red-400">{error}</p>}
        {signedIn ? (
          <button type="button" onClick={close} className="mt-2 w-full py-2 text-[13px] font-black text-white/45">Maybe later</button>
        ) : (
          <button type="button" onClick={freeSignup} className="mt-3 flex w-full flex-col items-center justify-center rounded-full border-2 border-amber-400/60 px-5 py-2.5 active:scale-95 transition-transform">
            <span className="text-sm font-black text-amber-300">Create free account · $0</span>
            <span className="text-[11px] font-bold text-amber-300/70">1 free credit + free chat</span>
          </button>
        )}
      </div>
    </div>
  );
}
