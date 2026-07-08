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
    const premiumFlag = params.get("premium");
    const justPaid = premiumFlag === "success";
    const wantsCheckout = premiumFlag === "checkout"; // resumed after login
    // Strip the ?premium=… marker so it doesn't linger / re-trigger.
    if (params.has("premium")) {
      params.delete("premium");
      const q = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : "") + window.location.hash);
    }

    // Resume the purchase after a login round-trip (came back with ?premium=checkout).
    if (wantsCheckout) {
      const email = emailNow();
      if (email) {
        const returnPath = window.location.pathname + window.location.search;
        fetch("/api/premium", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, returnPath }),
        }).then(r => r.json()).then(d => { if (d?.url) window.location.href = d.url; }).catch(() => {});
      }
    }

    const sync = async () => {
      const email = emailNow();
      // The premium flag is tied to the email that earned it. If the current user is
      // different (e.g. a subscriber logged out and a free user logged in on the same
      // device), the leftover flag must NOT leak → clear it.
      const flagEmail = (() => { try { return localStorage.getItem("lb_paid_email") || ""; } catch { return ""; } })();
      const clearPaid = () => { try { localStorage.removeItem("lb_paid"); localStorage.removeItem("lb_paid_email"); } catch { /**/ } };
      if (!email) { if (flagEmail) clearPaid(); return; } // signed out → drop a stale flag
      if (flagEmail && flagEmail !== email) clearPaid();

      let premium = await checkStripe(email);
      // Right after checkout Stripe may take a moment to register the subscription.
      if (!premium && justPaid) { await new Promise(r => setTimeout(r, 1800)); premium = await checkStripe(email); }
      const was = localStorage.getItem("lb_paid");
      if (premium) {
        localStorage.setItem("lb_paid", "1");
        try { localStorage.setItem("lb_paid_email", email); } catch { /**/ }
        window.dispatchEvent(new Event("lb-paid-updated"));
        if (was !== "1") window.location.reload(); // first detection → re-read gates
      } else {
        // Definitively not a subscriber → make sure no stale flag unlocks the app.
        if (was === "1") { clearPaid(); window.dispatchEvent(new Event("lb-paid-updated")); window.location.reload(); }
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
