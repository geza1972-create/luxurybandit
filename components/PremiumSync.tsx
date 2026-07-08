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

    const sync = async () => {
      const email = emailNow();
      const flagEmail = (() => { try { return localStorage.getItem("lb_paid_email") || ""; } catch { return ""; } })();
      const clearPaid = () => { try { localStorage.removeItem("lb_paid"); localStorage.removeItem("lb_paid_email"); } catch { /**/ } };
      if (!email) { if (flagEmail) clearPaid(); return; }        // signed out → drop a stale flag
      if (flagEmail && flagEmail !== email) clearPaid();          // different user on this device

      const paid = await hasCredits(email);
      const was = localStorage.getItem("lb_paid");
      if (paid) {
        localStorage.setItem("lb_paid", "1");
        try { localStorage.setItem("lb_paid_email", email); } catch { /**/ }
        window.dispatchEvent(new Event("lb-paid-updated"));
        if (was !== "1") window.location.reload(); // first detection → re-read gates
      } else if (was === "1") {
        // Out of credits (or never bought) → re-lock the paid content.
        clearPaid();
        window.dispatchEvent(new Event("lb-paid-updated"));
        window.location.reload();
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
