"use client";

import { useEffect, useState } from "react";
import { Crown, Check } from "lucide-react";
import { Dialog, Knopf, Laden, Fehlerzeile } from "@/components/CI";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { startPremiumCheckout } from "@/lib/start-premium-checkout";
import { logFunnelEvent } from "@/lib/track-funnel";

// Membership dialog — the ONE $4.99/mo Stripe subscription that unlocks everything:
// free unlimited chat, every private video, Super Follow, and buying influencers. Uses the
// hosted subscription checkout at /api/premium (which reads the membership price from the admin
// price list); Stripe returns to the current page with ?premium=success, where it re-checks.
export default function SubscribeDialog({ open, onClose, modelName, avatarUrl }: { open: boolean; onClose: () => void; modelName?: string; avatarUrl?: string }) {
  const personal = !!modelName;   // opened from a model's chat → personal framing
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Monthly price from the admin price list (first month is $8 via the Stripe coupon).
  const [monthlyCents, setMonthlyCents] = useState(4999);
  useEffect(() => { if (!open) return; fetch("/api/try-this-look?pricing=1").then(r => r.json()).then(d => { if (d?.pricing?.subscriptionMonthlyCents) setMonthlyCents(d.pricing.subscriptionMonthlyCents); }).catch(() => {}); }, [open]);
  const monthly = `$${(monthlyCents / 100).toFixed(2)}`;
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
    <Dialog art="dunkel" z={100} zu={close}>
      {personal && avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={modelName} className="mx-auto h-16 w-16 rounded-full border-2 border-[#f6cf51]/50 object-cover" />
      ) : (
        <span className="lb-gold mx-auto grid h-14 w-14 place-items-center rounded-2xl text-black"><Crown className="h-7 w-7" /></span>
      )}
      <h3 className="mt-4 text-lg font-black text-white">{personal ? `Unlock ${modelName}'s private world` : "Unlock her private world"}</h3>

      <div className="mt-5 grid gap-2 text-left">
        {(personal
          ? [`Unlimited chat with ${modelName}`, `All ${modelName}'s private photos & videos`, "Cancel anytime"]
          : ["Unlimited chat with her", "All her private photos & videos", "Cancel anytime"]
        ).map(perk => (
          <div key={perk} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5">
            <Check className="h-4 w-4 shrink-0 text-[#f6cf51]" />
            <span className="text-[13px] font-bold text-white/85">{perk}</span>
          </div>
        ))}
      </div>

      <Knopf art="gold" onClick={() => void subscribe()} disabled={busy} className="mt-5">
        {busy ? <Laden /> : <>Continue — subscribe</>}
      </Knopf>
      <p className="mt-1.5 text-center text-[11px] font-bold text-white/80">Start with $8 the first month, then {monthly}/mo · one subscription per model</p>
      {error && <Fehlerzeile>{error}</Fehlerzeile>}
      {signedIn ? (
        <button type="button" onClick={close} className="mt-2 w-full py-2 text-[13px] font-black text-white/85">Maybe later</button>
      ) : (
        <button type="button" onClick={freeSignup} className="mt-3 flex w-full flex-col items-center justify-center rounded-full border-2 border-[#f6cf51]/60 px-5 py-2.5 active:scale-95 transition-transform">
          <span className="text-sm font-black text-[#f6cf51]">Create free account · $0</span>
          <span className="text-[11px] font-bold text-[#f6cf51]/75">Newsletter — her new looks by email</span>
        </button>
      )}
    </Dialog>
  );
}
