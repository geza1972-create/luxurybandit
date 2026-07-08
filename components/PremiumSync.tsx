"use client";

import { useEffect } from "react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

// Keeps the client's unlock flag (localStorage.lb_paid) in sync with the signed-in user's
// video-pack balance. There is no subscription anymore: buying the $8 pack (4 videos) makes
// you a paying customer, so locked models / looks / full videos unlock while you still have
// credits. When the balance hits 0 the content re-locks. The flag is tied to the email that
// earned it so it can't leak to a different account on a shared device.
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
      const flagEmail = (() => { try { return localStorage.getItem("lb_paid_email") || ""; } catch { return ""; } })();
      const clearAll = () => { try { localStorage.removeItem("lb_paid"); localStorage.removeItem("lb_paid_email"); localStorage.removeItem("lb_subscribed"); } catch { /**/ } };
      if (!email) { if (flagEmail) clearAll(); return; }          // signed out → drop stale flags
      if (flagEmail && flagEmail !== email) clearAll();            // different user on this device

      let changed = false;

      // 1) Subscription (unlocks Community + unlimited chat; grants the monthly credits).
      const sub = await isSubscribed(email);
      const wasSub = localStorage.getItem("lb_subscribed");
      if (sub) { localStorage.setItem("lb_subscribed", "1"); if (wasSub !== "1") changed = true; }
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
