"use client";

import { useEffect } from "react";
import { getStoredAuthSession, refreshSession, isSessionExpiring } from "@/lib/supabase-auth-client";

// Keeps the login alive. Supabase access tokens expire after ~1h; without a refresh the
// user got silently 401'd and "flew out". This mounts app-wide (root layout) and:
//  • refreshes ~1 min before the token expires (self-rescheduling),
//  • refreshes on tab focus / regained connectivity if the token is near/after expiry,
// so a returning user is never kicked out mid-session.
export default function AuthRefresh() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      const s = getStoredAuthSession();
      if (!s?.refresh_token) return; // not logged in → nothing to keep alive
      const expMs = s.expires_at ? s.expires_at * 1000 : 0;
      // Refresh 60s before expiry. If expiry is unknown or already past, do it now.
      // Cap the wait at 20 min so we re-check periodically even on odd clocks.
      const delay = expMs ? Math.max(0, Math.min(expMs - Date.now() - 60_000, 20 * 60_000)) : 0;
      timer = setTimeout(async () => { await refreshSession(); schedule(); }, delay);
    };

    // On load: if the stored token is already expiring/expired, refresh immediately.
    if (isSessionExpiring(60)) { void refreshSession().then(schedule); } else { schedule(); }

    const onWake = () => { if (isSessionExpiring(120)) void refreshSession().then(schedule); };
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, []);

  return null;
}
