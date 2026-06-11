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

export async function signUpWithPassword(email: string, password: string) {
  const payload = await authFetch<Partial<SupabaseAuthSession> & { user?: SupabaseAuthUser }>("/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, data: { app: "luxurybandit" } })
  });
  const session = normalizeSession(payload);
  if (session) return saveAuthSession(session);
  throw new Error("Account created. Please confirm your email, then log in.");
}

export function signOut() {
  saveAuthSession(null);
}

export async function resetPassword(email: string) {
  await authFetch("/recover", {
    method: "POST",
    body: JSON.stringify({ email })
  });
  // Supabase returns 200 whether the email exists or not (security by design)
}
