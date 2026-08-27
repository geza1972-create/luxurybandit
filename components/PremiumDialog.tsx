"use client";

import { useEffect, useState } from "react";
import { Crown, Check } from "lucide-react";
import { Dialog, Knopf, Laden, Kasten, Fehlerzeile } from "@/components/CI";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { startPremiumCheckout } from "@/lib/start-premium-checkout";
import { logFunnelEvent } from "@/lib/track-funnel";

// Unlock dialog for locked models / looks / private videos / chats. Membership is the ONE
// $4.99/mo subscription that unlocks everything: free unlimited chat, every private video,
// Super Follow anyone, and buying influencers. Uses the API subscription checkout at
// /api/premium (which reads the membership price from the admin price list); when the user
// returns, PremiumSync re-checks the subscription.
export default function PremiumDialog({ open, onClose, title = "Unlock her private world", subtitle = "See her private photos & videos and chat with her unlimited." }: {
  open: boolean; onClose: () => void; title?: string; subtitle?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [monthlyCents, setMonthlyCents] = useState(4999);
  useEffect(() => { if (!open) return; fetch("/api/try-this-look?pricing=1").then(r => r.json()).then(d => { if (d?.pricing?.subscriptionMonthlyCents) setMonthlyCents(d.pricing.subscriptionMonthlyCents); }).catch(() => {}); }, [open]);
  const monthly = `$${(monthlyCents / 100).toFixed(2)}`;
  // Funnel: paywall seen (fires once when the dialog opens).
  useEffect(() => { if (open) logFunnelEvent("paywall_view", { paywall: "premium", lookName: "Premium" }); }, [open]);
  /**
   * DAS ABO IST ZU (Owner 27.08.2026: „und wir haben immer noch ein Abo" — mit Bild dieses
   * Dialogs: „$8 first month, then $49.99/mo · Unlimited chat with her").
   *
   * ES WIDERSPRACH DREI DINGEN GLEICHZEITIG:
   * · der Hausregel „nur EIN Abo: die Hochzeitsseite, alles andere Einmalkauf",
   * · dem Produkt darunter — dieselbe Seite verkauft das Video laengst einmalig zu 9,99,
   * · und seinem eigenen Versprechen: „Unlimited chat with her" gibt es nicht mehr, der
   *   Modell-Chat ist am selben Tag gesperrt worden (app/api/model-chat).
   *
   * DER RIEGEL SITZT HIER UND NICHT IN DEN FUENF AUFRUFERN (try/[lookId], curator/[id],
   * stores, HomeFeed, AboutStep1Models). Eine Stelle zu, ueberall zu — und wer ihn zurueck
   * will, dreht EINE Konstante statt fuenf Dateien zu suchen. Die Aufrufer duerfen weiter
   * `setShowPremium(true)` rufen; es passiert dann nichts.
   *
   * ACHTUNG BEIM ZURUECKDREHEN: Der Dialog verkauft ein Stripe-ABO ueber
   * `startPremiumCheckout` und verlaesst dabei die Seite (checkout.stripe.com). Wer ihn
   * zurueckholt, muss ihn zuerst auf die Kasse-in-der-Seite umbauen.
   */
  const ABO_GESPERRT = true;
  if (ABO_GESPERRT) return null;

  if (!open) return null;
  const close = () => { setError(""); onClose(); };
  const signedIn = !!getStoredAuthSession()?.user?.email;

  // "Create free account" — the alternative to "Maybe later": capture the visitor as a
  // free signup (no Premium, no charge) instead of losing them. Lands on the register
  // form and returns to the funnel; no pending-checkout flag, so PremiumSync won't upsell.
  const freeSignup = () => {
    logFunnelEvent("free_signup_click", { paywall: "premium" });
    const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/stores";
    window.location.href = `/login?mode=signup&returnTo=${encodeURIComponent(here)}`;
  };

  const buy = async () => {
    setError("");
    logFunnelEvent("premium_click", { paywall: "premium", lookName: "Premium" });
    const email = getStoredAuthSession()?.user?.email?.trim().toLowerCase();
    if (!email) {
      // Not signed in → mark a pending checkout, then sign in. PremiumSync resumes it straight
      // to Stripe the moment they're signed in — no matter where the OAuth round-trip lands
      // them (this is the durable net that stops the customer "falling out" after a Google login;
      // /go/premium is the fast path when the return survives, checkout_start fires from either).
      try { localStorage.setItem("lb_pending_checkout", String(Date.now())); } catch { /**/ }
      window.location.href = `/login?returnTo=${encodeURIComponent("/go/premium")}`;
      return;
    }
    setBusy(true);
    // Signed in → API subscription checkout at the $4.99/mo membership price (from the price list).
    logFunnelEvent("checkout_start", { paywall: "premium", lookName: "Premium" });
    const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/stores";
    try { await startPremiumCheckout(email, here); }
    catch (e) { setBusy(false); setError(e instanceof Error ? e.message : "Could not start checkout."); }
  };

  return (
    <Dialog art="dunkel" z={100} zu={close}>
      <span className="lb-gold mx-auto grid h-14 w-14 place-items-center rounded-2xl text-black"><Crown className="h-7 w-7" /></span>
      <p className="mt-2.5 text-[12px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">Subscription</p>
      <h3 className="mt-1 text-lg font-black text-white">{title}</h3>
      <p className="mt-1.5 text-[13px] font-semibold leading-6 text-white/85">{subtitle}</p>

      {/* Price — $8 first month, then the monthly price from the price list, shown BIG. */}
      <Kasten art="gold" polster="px-4 py-4" className="mt-4">
        <p className="flex items-end justify-center gap-2">
          <span className="text-6xl font-black leading-none text-white">$8</span>
          <span className="mb-1 text-left text-[13px] font-black leading-tight text-[#f6cf51]">first<br />month</span>
        </p>
        <p className="mt-2 text-[12px] font-bold text-white/85">then {monthly}/mo · cancel anytime</p>
      </Kasten>

      {/* Perks */}
      <div className="mt-4 grid gap-2 text-left">
        {["Unlimited chat with her", "All her private photos & videos", "Cancel anytime"].map(perk => (
          <div key={perk} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5">
            <Check className="h-4 w-4 shrink-0 text-[#f6cf51]" />
            <span className="text-[13px] font-bold text-white/85">{perk}</span>
          </div>
        ))}
      </div>

      <Knopf art="gold" onClick={() => buy()} disabled={busy} className="mt-5">
        {busy ? <Laden /> : <>Subscribe — $8 first month</>}
      </Knopf>
      {error && <Fehlerzeile>{error}</Fehlerzeile>}
      {signedIn ? (
        <button type="button" onClick={close} className="mt-2 w-full py-2 text-[13px] font-black text-white/85">Maybe later</button>
      ) : (
        <>
          <button type="button" onClick={freeSignup} className="mt-3 flex w-full flex-col items-center justify-center rounded-full border-2 border-[#f6cf51]/60 px-5 py-2.5 active:scale-95 transition-transform">
            <span className="text-sm font-black text-[#f6cf51]">Create free account · $0</span>
            <span className="text-[11px] font-bold text-[#f6cf51]/75">Watch &amp; chat — free</span>
          </button>
          <a href="/curators/apply" className="mt-2 block w-full py-1.5 text-center text-[12px] font-black text-white/85 underline underline-offset-2">
            Register as a Model →
          </a>
        </>
      )}
    </Dialog>
  );
}
