"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { startPremiumCheckout } from "@/lib/start-premium-checkout";
import { logFunnelEvent } from "@/lib/track-funnel";

// Payment resume route. A guest who taps "Start Premium" is sent to /login?returnTo=/go/premium;
// after signing in (password OR Google OAuth via /auth/confirm) they land HERE — and we forward
// straight to the Stripe checkout with their now-known email. This is what stops the customer
// from "falling out" of the payment after login: the intent survives the auth round-trip.
export default function GoPremiumPage() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;

    const attempt = () => {
      const email = getStoredAuthSession()?.user?.email?.trim().toLowerCase();
      if (email) {
        // Signed in → API checkout (applies the $8 coupon). Clear the pending flag so
        // PremiumSync's safety-net resume doesn't also fire (avoids a double event).
        try { localStorage.removeItem("lb_pending_checkout"); } catch { /**/ }
        logFunnelEvent("checkout_start", { paywall: "resume", lookName: "Premium" });
        // ?code=1 → open a checkout WITH a promo-code field (to redeem a 100%-off test code)
        // instead of the automatic $8 first-month coupon.
        const allowPromo = new URLSearchParams(window.location.search).get("code") === "1";
        startPremiumCheckout(email, "/stores", allowPromo).catch(() => setStuck(true));
        return;
      }
      // Session may still be settling right after OAuth — retry briefly before giving up.
      if (tries++ < 12) { timer = setTimeout(attempt, 300); return; }
      // Still no session → send to login, then come straight back here to resume.
      if (new URLSearchParams(window.location.search).get("tried") === "1") { setStuck(true); return; }
      window.location.replace("/login?returnTo=" + encodeURIComponent("/go/premium?tried=1"));
    };

    attempt();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0d0b0a] px-6 text-center">
      <div className="flex flex-col items-center gap-4 text-white">
        {stuck ? (
          <>
            <p className="text-base font-black">Almost there</p>
            <p className="max-w-xs text-sm font-semibold text-white/55">
              We couldn&apos;t confirm your sign-in. Please sign in again to continue to checkout.
            </p>
            <a href={"/login?returnTo=" + encodeURIComponent("/go/premium")}
              className="lb-gold mt-1 rounded-full px-6 py-3 text-sm font-black">Sign in &amp; continue</a>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            <p className="text-sm font-black">Taking you to checkout…</p>
          </>
        )}
      </div>
    </div>
  );
}
