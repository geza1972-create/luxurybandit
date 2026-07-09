"use client";

import { useEffect } from "react";
import { getStoredAuthSession, refreshSession, isSessionExpiring, saveAuthSession, type SupabaseAuthSession } from "@/lib/supabase-auth-client";

// Keeps the login alive. Supabase access tokens expire after ~1h; without a refresh the
// user got silently 401'd and "flew out". This mounts app-wide (root layout) and:
//  • refreshes ~1 min before the token expires (self-rescheduling),
//  • refreshes on tab focus / regained connectivity if the token is near/after expiry,
// so a returning user is never kicked out mid-session.
export default function AuthRefresh() {
  // Catch a magic-link / OAuth token that landed on a page other than /auth/confirm and
  // establish the session — but ONLY from the implicit-flow hash of a FRESH redirect. This
  // is deliberately strict: a leftover/stale token sitting in a URL must never silently
  // hijack the session (that once auto-signed the admin in as a test model).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/auth/")) return; // dedicated pages handle their own flow
    try {
      if (getStoredAuthSession()?.access_token) return; // already signed in
      // ONLY the hash (#access_token=…&token_type=bearer) — the real Supabase implicit-flow
      // landing. We ignore ?token= query params: those collide with storage signed-URL tokens
      // and with stale/bookmarked URLs, which is exactly what caused the wrong auto-login.
      const hashP = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const at = hashP.get("access_token");
      const tokenType = hashP.get("token_type");
      if (!at || !(tokenType === "bearer" || tokenType === "signup")) return;
      const claims = JSON.parse(atob(at.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: string; email?: string; exp?: number; iat?: number };
      if (!claims.sub || typeof claims.sub !== "string") return; // must be a real auth token
      // FRESHNESS: only accept a token issued in the last ~2 minutes (a login that just
      // happened). Anything older is a leftover and must be ignored.
      const nowSec = Math.floor(Date.now() / 1000);
      if (typeof claims.iat !== "number" || nowSec - claims.iat > 120) return;
      const rt = hashP.get("refresh_token") || undefined;
      const expiresAt = Number(hashP.get("expires_at") || 0) || undefined;
      const session: SupabaseAuthSession = { access_token: at, refresh_token: rt, expires_at: expiresAt ?? claims.exp, user: { id: claims.sub, email: claims.email } };
      saveAuthSession(session);
      // Strip the token from the URL so it isn't left in history or re-processed.
      const url = new URL(window.location.href);
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
