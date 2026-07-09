"use client";

import { useEffect } from "react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

// Keeps the client's unlock flags in sync with the signed-in user. Premium is a single
// €49/mo subscription (first month €8) that grants 40 video credits/month and unlocks all
// locked models / looks / full videos + Community. Calling /api/premium tops up the monthly
// allowance server-side; lb_subscribed tracks the sub, lb_paid tracks having credits (which
// re-locks at 0). Flags are tied to the email that earned them so they can't leak on a shared
// device.
export default function PremiumSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const emailNow = () => {
      try { return getStoredAuthSession()?.user?.email?.trim().toLowerCase() || ""; } catch { return ""; }
    };
    const hasCredits = async (email: string): Promise<boolean> => {
      try {
        const d = await fetch(`/api/video-pack?email=${encodeURIComponent(email)}`).then(r => r.json());
        return (d?.credits ?? 0) > 0;
      } catch { return false; }
    };
    // Active $49/mo subscription? This ALSO tops up the monthly video-credit allowance
    // server-side, so we run it BEFORE the credit check below.
    const isSubscribed = async (email: string): Promise<boolean> => {
      try {
        const d = await fetch(`/api/premium?email=${encodeURIComponent(email)}`).then(r => r.json());
        return !!d?.premium;
      } catch { return false; }
    };

    const sync = async () => {
      const email = emailNow();

      // Resume a checkout the guest started before logging in. A guest who taps "Start Premium"
      // sets lb_pending_checkout, then signs in. The OAuth round-trip can land them ANYWHERE
      // (dashboard/home/…) and sessionStorage return-paths can be dropped — so instead of
      // relying on where they land, we forward straight to Stripe the moment they're signed in.
      // This is what stops the customer "falling out" before paying after a Google login.
      if (email) {
        try {
          const pend = Number(localStorage.getItem("lb_pending_checkout") || 0);
          if (pend && Date.now() - pend < 30 * 60 * 1000) {
            localStorage.removeItem("lb_pending_checkout");
            const [{ startPremiumCheckout }, { logFunnelEvent }] = await Promise.all([
              import("@/lib/start-premium-checkout"), import("@/lib/track-funnel"),
            ]);
            logFunnelEvent("checkout_start", { paywall: "resume", lookName: "Premium" });
            await startPremiumCheckout(email, "/stores");
            return;
          }
        } catch { /**/ }
      }

      const flagEmail = (() => { try { return localStorage.getItem("lb_paid_email") || ""; } catch { return ""; } })();
      const clearAll = () => { try { localStorage.removeItem("lb_paid"); localStorage.removeItem("lb_paid_email"); localStorage.removeItem("lb_subscribed"); } catch { /**/ } };
      if (!email) { if (flagEmail) clearAll(); return; }          // signed out → drop stale flags
      if (flagEmail && flagEmail !== email) clearAll();            // different user on this device

      let changed = false;

      // 1) Subscription (unlocks Community + unlimited chat; grants the monthly credits).
      const sub = await isSubscribed(email);
      const wasSub = localStorage.getItem("lb_subscribed");
      if (sub) {
        localStorage.setItem("lb_subscribed", "1");
        if (wasSub !== "1") {
          changed = true;
          // Funnel: a subscription just went active on this device → the completed conversion.
          try { const { logFunnelEvent } = await import("@/lib/track-funnel"); logFunnelEvent("subscribe_success", { lookName: "Premium" }); } catch { /**/ }
        }
      }
      else if (wasSub === "1") { localStorage.removeItem("lb_subscribed"); changed = true; }

      // 2) Video credits → lb_paid (includes any monthly allowance just granted in step 1).
      const paid = await hasCredits(email);
      const was = localStorage.getItem("lb_paid");
      if (paid) { localStorage.setItem("lb_paid", "1"); if (was !== "1") changed = true; }
      else if (was === "1") { localStorage.removeItem("lb_paid"); changed = true; }

      try { localStorage.setItem("lb_paid_email", email); } catch { /**/ }
      window.dispatchEvent(new Event("lb-paid-updated"));
      if (changed) window.location.reload(); // first detection / re-lock → re-read gates
    };

    void sync();
    const onAuth = () => void sync();
    window.addEventListener("luxurybandit-auth-updated", onAuth);
    return () => window.removeEventListener("luxurybandit-auth-updated", onAuth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
