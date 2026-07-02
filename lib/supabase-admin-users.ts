// Server-only helper to list/edit Supabase Auth users (Google / Facebook / password
// sign-ins) via the Admin API, using the service-role key. Never import client-side.

function cfg() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Supabase admin not configured.");
  return { url: url.replace(/\/$/, ""), key };
}

function adminHeaders(key: string): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  provider: string;        // "google" | "facebook" | "email" | ...
  createdAt: string;
  lastSignInAt?: string;
};

function nameOf(u: any): string {
  const m = u?.user_metadata ?? {};
  return String(m.name || m.full_name || [m.firstName, m.lastName].filter(Boolean).join(" ") || m.given_name || "").trim();
}
function providerOf(u: any): string {
  return String(u?.app_metadata?.provider || (u?.app_metadata?.providers ?? [])[0] || "email");
}

// List ALL auth users (paginated). Newest first.
export async function listAuthUsers(): Promise<AuthUser[]> {
  const { url, key } = cfg();
  const out: AuthUser[] = [];
  for (let page = 1; page <= 20; page++) { // safety cap: 20 pages × 200 = 4000
    const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: adminHeaders(key),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Supabase listUsers failed (${res.status})`);
    const data = await res.json().catch(() => null) as { users?: any[] } | null;
    const users = data?.users ?? [];
    for (const u of users) {
      out.push({
        id: String(u.id),
        email: String(u.email ?? "").toLowerCase(),
        name: nameOf(u),
        provider: providerOf(u),
        createdAt: String(u.created_at ?? ""),
        lastSignInAt: u.last_sign_in_at ? String(u.last_sign_in_at) : undefined,
      });
    }
    if (users.length < 200) break; // last page
  }
  out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return out;
}

// Edit an auth user's display name (stored in user_metadata.name).
export async function updateAuthUserName(id: string, name: string): Promise<boolean> {
  const { url, key } = cfg();
  const res = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: adminHeaders(key),
    body: JSON.stringify({ user_metadata: { name: name.trim() } }),
  });
  return res.ok;
}

// Delete an auth user entirely.
export async function deleteAuthUser(id: string): Promise<boolean> {
  const { url, key } = cfg();
  const res = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: adminHeaders(key),
  });
  return res.ok;
}
