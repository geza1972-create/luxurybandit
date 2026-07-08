"use client";

import { useEffect } from "react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

// Keeps the client's premium flag (localStorage.lb_paid) in sync with the real Stripe
// subscription for the signed-in email. Stripe is the source of truth — we just ask
// "does this email have an active subscription?" and grant access if so. Also handles
// the ?premium=success return from Stripe checkout.
export default function PremiumSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const emailNow = () => {
      try { return getStoredAuthSession()?.user?.email?.trim().toLowerCase() || ""; } catch { return ""; }
    };
    const checkStripe = async (email: string): Promise<boolean> => {
      try {
        const d = await fetch(`/api/premium?email=${encodeURIComponent(email)}`).then(r => r.json());
        return !!d?.premium;
      } catch { return false; }
    };

    const params = new URLSearchParams(window.location.search);
    const justPaid = params.get("premium") === "success";
    // Strip the ?premium=… marker so it doesn't linger / re-trigger.
    if (params.has("premium")) {
      params.delete("premium");
      const q = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : "") + window.location.hash);
    }

    const sync = async () => {
      const email = emailNow();
      if (!email) return;
      let premium = await checkStripe(email);
      // Right after checkout Stripe may take a moment to register the subscription.
      if (!premium && justPaid) { await new Promise(r => setTimeout(r, 1800)); premium = await checkStripe(email); }
      if (premium) {
        const was = localStorage.getItem("lb_paid");
        localStorage.setItem("lb_paid", "1");
        window.dispatchEvent(new Event("lb-paid-updated"));
        // First time we detect it → reload once so every "isPaid" gate re-reads the flag.
        if (was !== "1") window.location.reload();
      }
    };

    void sync();
    const onAuth = () => void sync();
    window.addEventListener("luxurybandit-auth-updated", onAuth);
    return () => window.removeEventListener("luxurybandit-auth-updated", onAuth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
