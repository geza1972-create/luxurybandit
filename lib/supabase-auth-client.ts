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

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("luxurybandit-auth-updated"));
  return session;
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
  displayName?: string
): Promise<{ session: SupabaseAuthSession | null; confirmationRequired: boolean }> {
  const data: Record<string, string> = { app: "luxurybandit" };
  if (displayName?.trim()) {
    data.username = displayName.trim();
    data.full_name = displayName.trim();
  }
  const payload = await authFetch<Partial<SupabaseAuthSession> & { user?: SupabaseAuthUser }>("/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, data })
  });
  const session = normalizeSession(payload);
  if (session) {
    return { session: saveAuthSession(session), confirmationRequired: false };
  }
  return { session: null, confirmationRequired: true };
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
  await authFetch("/recover", {
    method: "POST",
    body: JSON.stringify({ email })
  });
  // Supabase returns 200 whether the email exists or not (security by design)
}
