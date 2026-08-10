"use client";

import { ABGEMELDET_KEY, spurenLoeschen } from "@/lib/abmelden-spuren";

export type SupabaseAuthUser = {
  id: string;
  email?: string;
};

export type SupabaseAuthSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;  // unix seconds when the access token expires
  expires_in?: number;  // seconds until expiry (GoTrue returns this; we derive expires_at)
  user: SupabaseAuthUser;
};

const AUTH_STORAGE_KEY = "luxurybandit-auth-session";

const getSupabaseAuthConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "").replace(/\/$/, "") ?? "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, "") ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim().replace(/^["']|["']$/g, "") ||
    "";

  if (!url || !anonKey) {
    throw new Error("Supabase Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
  }

  return { url, anonKey };
};

const authFetch = async <T,>(path: string, init: RequestInit = {}) => {
  const { url, anonKey } = getSupabaseAuthConfig();
  const response = await fetch(`${url}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) as T & { error_description?: string; msg?: string; message?: string } : null;
  if (!response.ok) {
    throw new Error(payload?.error_description ?? payload?.msg ?? payload?.message ?? "Supabase Auth request failed.");
  }
  return payload as T;
};

const normalizeSession = (payload: Partial<SupabaseAuthSession>) => {
  if (!payload.access_token || !payload.user?.id) return null;
  return payload as SupabaseAuthSession;
};

/**
 * EINE ABGELAUFENE SITZUNG IST KEINE SITZUNG (Owner 31.07.2026: „er bleibt nicht eingeloggt
 * oder doch, weiss ich nicht").
 *
 * Genau dieses „weiss ich nicht" war der Fehler, und zwar hier: Geprueft wurden nur
 * `access_token` und `user.id`, NIE das Ablaufdatum. Ein Zugangs-Token laeuft nach etwa einer
 * Stunde ab. Danach zeigte die Oberflaeche weiter „angemeldet" — waehrend jeder Serveraufruf
 * mit 401 zurueckkam. Angemeldet aussehen und abgemeldet sein ist schlimmer als beides
 * einzeln: Man sucht den Fehler ueberall, nur nicht bei der Anmeldung.
 *
 * `erneuerbar` ist der Grund fuer die Ausnahme: Wer ein Refresh-Token hat, ist NICHT
 * abgemeldet — er wartet nur auf die Erneuerung, die `AuthRefresh` beim naechsten Blick auf
 * die Seite ohnehin anstoesst. Wuerde man ihn hier abweisen, floege er trotz gueltiger
 * Anmeldung raus, sobald er das Handy eine Stunde weglegt.
 */
export function getStoredAuthSession() {
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    const s = normalizeSession(JSON.parse(stored) as Partial<SupabaseAuthSession>);
    if (!s) return null;
    const abgelaufen = !!s.expires_at && s.expires_at * 1000 <= Date.now();
    const erneuerbar = !!s.refresh_token;
    if (abgelaufen && !erneuerbar) {
      // Kein Weg zurueck: aufraeumen, statt einen toten Ausweis herumliegen zu lassen.
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return s;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function getAuthStorageKey() {
  return AUTH_STORAGE_KEY;
}

export function saveAuthSession(session: SupabaseAuthSession | null) {
  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event("luxurybandit-auth-updated"));
    return null;
  }

  // A fresh sign-in as a Supabase user (Google/Facebook/password/link) invalidates a
  // LEFTOVER curator session that belongs to a DIFFERENT person — otherwise the new
  // user lands in that curator's profile/studio (identity bleed). Same-email curator
  // sessions are kept (the curator just signed in another way).
  try {
    const cur = JSON.parse(window.localStorage.getItem("lb_curator") ?? "{}");
    const email = session.user?.email?.toLowerCase();
    if (cur?.email && email && String(cur.email).toLowerCase() !== email) {
      window.localStorage.removeItem("lb_curator");
    }
  } catch { /* ignore */ }

  // Stamp an absolute expiry so we know WHEN to refresh (GoTrue returns expires_in seconds).
  if (!session.expires_at && typeof session.expires_in === "number") {
    session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  /* Wieder angemeldet → die Abmelde-Marke fällt. Ab jetzt darf dieses Gerät wieder als
     Ausweis gelten (siehe `lib/abmelden-spuren`). */
  try { window.localStorage.removeItem(ABGEMELDET_KEY); } catch { /**/ }
  // Bridge the two identity systems: if this email belongs to a curator, mirror it
  // into lb_curator so the studio & curator UI recognise them — ONE login, role
  // auto-detected (no separate "curator sign in").
  if (session.user?.email) void syncCuratorByEmail(session.user.email);
  window.dispatchEvent(new Event("luxurybandit-auth-updated"));
  return session;
}

// Look up a curator by email and mirror it into lb_curator (fire-and-forget).
async function syncCuratorByEmail(email: string) {
  try {
    const res = await fetch("/api/curator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "signin", email }),
    });
    const data = await res.json().catch(() => ({})) as { curator?: { id: string; firstName?: string; email?: string; style?: string } };
    if (data?.curator?.id) {
      window.localStorage.setItem("lb_curator", JSON.stringify({
        id: data.curator.id, firstName: data.curator.firstName, email: data.curator.email, style: data.curator.style,
      }));
      window.dispatchEvent(new Event("luxurybandit-auth-updated"));
    }
  } catch { /* ignore — not a curator, or offline */ }
}

export async function signInWithPassword(email: string, password: string) {
  const payload = await authFetch<SupabaseAuthSession>("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  const session = normalizeSession(payload);
  if (!session) throw new Error("Login did not return a session.");
  return saveAuthSession(session);
}

export async function signUpWithPassword(
  email: string,
  password: string,
  displayName?: string,
  opts?: { marketingOptIn?: boolean }
): Promise<{ session: SupabaseAuthSession | null; confirmationRequired: boolean }> {
  const data: Record<string, string> = { app: "luxurybandit" };
  if (displayName?.trim()) {
    data.username = displayName.trim();
    data.full_name = displayName.trim();
  }
  // Record terms acceptance (sign-up gates on it) + newsletter consent + timestamp,
  // so we have a durable record of what the user agreed to at registration.
  data.terms_accepted = "true";
  data.terms_accepted_at = new Date().toISOString();
  data.marketing_opt_in = opts?.marketingOptIn ? "true" : "false";
  const emailRedirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/confirm`
      : undefined;
  const payload = await authFetch<Partial<SupabaseAuthSession> & { user?: SupabaseAuthUser }>("/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, data, ...(emailRedirectTo ? { emailRedirectTo } : {}) })
  });
  const session = normalizeSession(payload);
  if (session) {
    // Fire-and-forget welcome email (non-blocking)
    fetch("/api/welcome-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name: displayName ?? "" }),
    }).catch(() => {});
    return { session: saveAuthSession(session), confirmationRequired: false };
  }
  return { session: null, confirmationRequired: true };
}

// Passwordless: send a magic sign-in link to the email. Creates the user if new.
// The link redirects to /auth/confirm, which saves the session.
export async function sendMagicLink(email: string, displayName?: string) {
  const data: Record<string, string> = { app: "luxurybandit" };
  if (displayName?.trim()) { data.username = displayName.trim(); data.full_name = displayName.trim(); }
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/confirm` : "";
  const path = `/otp${redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ""}`;
  await authFetch(path, { method: "POST", body: JSON.stringify({ email, create_user: true, data }) });
}

// Social sign-in (Google / Facebook). Redirects the browser to Supabase's OAuth
// authorize endpoint; after the provider dance Supabase redirects back to
// `redirectTo` with the session in the URL hash, which /auth/confirm parses & saves.
// Requires the provider to be enabled in Supabase (Auth → Providers) with valid
// OAuth credentials — otherwise the provider returns an error page.
export function signInWithOAuth(provider: "google" | "facebook", redirectTo: string) {
  const { url } = getSupabaseAuthConfig();
  const u = new URL(`${url}/auth/v1/authorize`);
  u.searchParams.set("provider", provider);
  u.searchParams.set("redirect_to", redirectTo);
  window.location.href = u.toString();
}

/**
 * ABMELDEN RÄUMT DAS GERÄT AUF (Owner 10.08.2026: „wenn er sich abmeldet dann ist es weg. Das
 * ist datenschutz auch. Kann sein dass jemand anders sein gerät in die Hand nimmt und dann
 * sieht er seine gallerie").
 *
 * Hier stand nur `saveAuthSession(null)` — der Ausweis weg, alles andere liegengeblieben:
 * Adresse, Auftragsnummern, zwischengespeicherte Fotos, die eigene Aufnahme. Wer danach das
 * Handy in die Hand bekam, sah in der Galerie fremde Bilder. Der Grund, WARUM das hier steht
 * und nicht an den sechs Abmelde-Knöpfen: Es gibt sechs davon, und der siebte wird vergessen.
 */
export function signOut() {
  saveAuthSession(null);
  spurenLoeschen();
}

// Exchange the refresh_token for a fresh access_token so the user stays logged in past
// the ~1h access-token expiry (without this they got silently 401'd → "flew out").
// Single-flight: GoTrue rotates the refresh_token on each use, so two concurrent refreshes
// would make the 2nd fail — everyone shares the one in-flight promise. On a network error
// we KEEP the current session (transient); only a real "invalid token" clears it.
let refreshInFlight: Promise<SupabaseAuthSession | null> | null = null;
export async function refreshSession(): Promise<SupabaseAuthSession | null> {
  if (refreshInFlight) return refreshInFlight;
  const cur = getStoredAuthSession();
  if (!cur?.refresh_token) return cur;
  refreshInFlight = (async () => {
    try {
      const payload = await authFetch<SupabaseAuthSession>("/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: cur.refresh_token }),
      });
      const session = normalizeSession(payload);
      if (session) return saveAuthSession(session);
      return cur;
    } catch (e) {
      // "Invalid Refresh Token" / "refresh_token_not_found" → the token is truly dead, sign out.
      const msg = e instanceof Error ? e.message.toLowerCase() : "";
      if (msg.includes("refresh") || msg.includes("invalid") || msg.includes("token")) {
        return saveAuthSession(null);
      }
      return cur; // network/transient → keep the session, try again later
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// Is the stored access token expired (or within `skewSec` of expiry)?
export function isSessionExpiring(skewSec = 60): boolean {
  const s = getStoredAuthSession();
  if (!s?.expires_at) return false;
  return s.expires_at * 1000 - Date.now() <= skewSec * 1000;
}

export type AuthUserFull = {
  id: string;
  email?: string;
  user_metadata?: {
    username?: string;
    full_name?: string;
    phone?: string;
    address?: string;
    app?: string;
    avatar_url?: string;
    bio?: string;
    website?: string;
    instagram?: string;
    notification_email?: string;
    whatsapp_number?: string;
    callmebot_key?: string;
  };
};

export async function getAuthUser(accessToken: string): Promise<AuthUserFull> {
  const { url, anonKey } = getSupabaseAuthConfig();
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error("Could not fetch user.");
  return await res.json() as AuthUserFull;
}

export type ProfileUpdate = {
  displayName?: string;
  phone?: string;
  address?: string;
  bio?: string;
  website?: string;
  instagram?: string;
  notificationEmail?: string;
  whatsappNumber?: string;
  callmebotKey?: string;
  newPassword?: string;
};

export async function updateUserProfile(accessToken: string, update: ProfileUpdate) {
  const body: Record<string, unknown> = {};
  if (update.newPassword) body.password = update.newPassword;
  const data: Record<string, string> = {};
  if (update.displayName !== undefined) { data.username = update.displayName; data.full_name = update.displayName; }
  if (update.phone !== undefined) data.phone = update.phone;
  if (update.address !== undefined) data.address = update.address;
  if (update.bio !== undefined) data.bio = update.bio;
  if (update.website !== undefined) data.website = update.website;
  if (update.instagram !== undefined) data.instagram = update.instagram;
  if (update.notificationEmail !== undefined) data.notification_email = update.notificationEmail;
  if (update.whatsappNumber !== undefined) data.whatsapp_number = update.whatsappNumber;
  if (update.callmebotKey !== undefined) data.callmebot_key = update.callmebotKey;
  if (Object.keys(data).length) body.data = data;
  if (!Object.keys(body).length) return;

  const { url, anonKey } = getSupabaseAuthConfig();
  const res = await fetch(`${url}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const p = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(p.message ?? "Profile update failed.");
  }
  return await res.json();
}

export async function resetPassword(email: string) {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/reset-password`
      : undefined;
  await authFetch("/recover", {
    method: "POST",
    body: JSON.stringify({ email, ...(redirectTo ? { redirectTo } : {}) })
  });
  // Supabase returns 200 whether the email exists or not (security by design)
}

/** Called from /auth/reset-password after the user clicks the email link.
 *  The recovery access_token comes from the URL hash; use it to set a new password. */
export async function updatePasswordWithToken(accessToken: string, newPassword: string) {
  const { url, anonKey } = getSupabaseAuthConfig();
  const res = await fetch(`${url}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: newPassword }),
  });
  if (!res.ok) {
    const p = await res.json().catch(() => ({})) as { message?: string; error_description?: string };
    throw new Error(p.error_description ?? p.message ?? "Could not change your password.");
  }
}
