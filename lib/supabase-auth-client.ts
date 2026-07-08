"use client";

export type SupabaseAuthUser = {
  id: string;
  email?: string;
};

export type SupabaseAuthSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
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

export function getStoredAuthSession() {
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    return normalizeSession(JSON.parse(stored) as Partial<SupabaseAuthSession>);
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

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
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

export function signOut() {
  saveAuthSession(null);
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
    throw new Error(p.error_description ?? p.message ?? "Passwort konnte nicht geändert werden.");
  }
}
