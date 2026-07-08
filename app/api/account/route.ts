import { NextResponse } from "next/server";
import { deleteAuthUser } from "@/lib/supabase-admin-users";
import { readTryThisLookState, saveTryThisLookState } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supaUrl = () => (process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "").replace(/\/$/, "") ?? "");
const anonKey = () =>
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, "") ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim().replace(/^["']|["']$/g, "") || "");

// POST /api/account { action: "delete" } with Authorization: Bearer <access_token>
// Self-service account deletion: verifies the caller's own token, then removes their auth
// user (deleteAuthUser also drops any linked model/curator profile) and their try-ons.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "delete") return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const url = supaUrl();
  const anon = anonKey();
  if (!url || !anon) return NextResponse.json({ error: "Auth not configured." }, { status: 500 });

  // Verify the token belongs to a real user (so a caller can only delete THEMSELVES).
  const uRes = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!uRes.ok) return NextResponse.json({ error: "Session expired — sign in again." }, { status: 401 });
  const user = await uRes.json().catch(() => null) as { id?: string; email?: string } | null;
  const id = String(user?.id ?? "").trim();
  const email = String(user?.email ?? "").trim().toLowerCase();
  if (!id) return NextResponse.json({ error: "Could not verify your account." }, { status: 401 });

  // Remove their try-ons from the store (their data) before deleting the login.
  if (email) {
    try {
      const state = await readTryThisLookState();
      const toDelete = state.generations.filter(g => String((g as any).ownerEmail ?? "").trim().toLowerCase() === email);
      if (toDelete.length) {
        const ids = new Set(toDelete.map(g => g.id));
        state.generations = state.generations.filter(g => !ids.has(g.id));
        await saveTryThisLookState(state, { deletedGenerationIds: [...ids] });
      }
    } catch { /* best-effort — still delete the login below */ }
  }

  // Delete the Supabase auth user (also removes any linked model/curator profile).
  const ok = await deleteAuthUser(id).catch(() => false);
  if (!ok) return NextResponse.json({ error: "Could not delete the account. Please contact support." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
