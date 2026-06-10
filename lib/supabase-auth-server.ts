// Server-side Supabase auth — verifies a JWT from the client
// and returns the Supabase user object (or null if invalid).

export type SupabaseServerUser = {
  id: string;
  email?: string;
};

function getConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\/$/, "") ?? "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, "") ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim().replace(/^["']|["']$/g, "") ||
    "";
  return { url, anonKey };
}

/** Extract + verify a Bearer token from the Authorization header. */
export async function getSellerFromRequest(request: Request): Promise<SupabaseServerUser | null> {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  return verifySellerToken(token);
}

/** Call Supabase /auth/v1/user with the token to verify it. */
export async function verifySellerToken(token: string): Promise<SupabaseServerUser | null> {
  const { url, anonKey } = getConfig();
  if (!url || !anonKey) return null;

  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const user = await res.json();
    if (!user?.id) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}
