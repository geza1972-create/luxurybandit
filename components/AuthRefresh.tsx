"use client";

import { useEffect } from "react";
import { getStoredAuthSession, refreshSession, isSessionExpiring, saveAuthSession, type SupabaseAuthSession } from "@/lib/supabase-auth-client";

// Keeps the login alive. Supabase access tokens expire after ~1h; without a refresh the
// user got silently 401'd and "flew out". This mounts app-wide (root layout) and:
//  • refreshes ~1 min before the token expires (self-rescheduling),
//  • refreshes on tab focus / regained connectivity if the token is near/after expiry,
// so a returning user is never kicked out mid-session.
export default function AuthRefresh() {
  // Catch a magic-link / OAuth token that landed on ANY page (not just /auth/confirm).
  // Supabase redirects sometimes drop the tokens (#access_token=… or ?token=…) on the
  // homepage, where nothing consumed them → the user stayed "Not signed in". Parse & save
  // the session here so the login sticks no matter where the link lands.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/auth/")) return; // dedicated pages handle their own flow
    try {
      if (getStoredAuthSession()?.access_token) return; // already signed in
      const hashP = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const qP = new URLSearchParams(window.location.search);
      const looksJwt = (t: string | null) => (t && t.split(".").length === 3 ? t : null);
      const at = hashP.get("access_token") || qP.get("access_token") || looksJwt(qP.get("token")) || looksJwt(hashP.get("token"));
      if (!at) return;
      const rt = hashP.get("refresh_token") || qP.get("refresh_token") || undefined;
      const expiresAt = Number(hashP.get("expires_at") || qP.get("expires_at") || 0) || undefined;
      const claims = JSON.parse(atob(at.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: string; email?: string; exp?: number; role?: string };
      // Only a real AUTH token has a `sub` (user id). Storage signed-URL tokens are JWTs too
      // (?token=… on image URLs) but carry no sub — never treat those as a login.
      if (!claims.sub || typeof claims.sub !== "string") return;
      const session: SupabaseAuthSession = { access_token: at, refresh_token: rt, expires_at: expiresAt ?? claims.exp, user: { id: claims.sub, email: claims.email } };
      saveAuthSession(session);
      // Strip the token from the URL so it isn't left in history or re-processed.
      const url = new URL(window.location.href);
      ["access_token", "refresh_token", "token", "token_type", "expires_at", "expires_in", "type", "provider_token", "provider_refresh_token"].forEach(k => url.searchParams.delete(k));
      url.hash = "";
      window.history.replaceState(null, "", url.pathname + (url.search || ""));
      window.dispatchEvent(new Event("luxurybandit-auth-updated"));
    } catch { /* not a valid token → ignore */ }
  }, []);

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
