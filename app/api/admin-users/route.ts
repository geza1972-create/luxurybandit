import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import { listAuthUsers, updateAuthUserName, deleteAuthUser } from "@/lib/supabase-admin-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET → everyone who signed up on the site, from BOTH sources:
//  • leads   = email-gate captures (state.leads)
//  • authUsers = Google / Facebook / password sign-ins (Supabase Auth)
// Admin-only.
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const state = await readTryThisLookState();
  const leads = (state.leads ?? []).map((l) => ({
    id: l.id,
    email: (l.email ?? "").toLowerCase(),
    name: l.name ?? "",
    source: l.leadSource ?? "email",
    status: l.status ?? "new",
    createdAt: (l as any).createdAt ?? "",
    lookName: (l as any).lookName ?? "",
  }));
  let authUsers: Awaited<ReturnType<typeof listAuthUsers>> = [];
  let authError = "";
  try {
    authUsers = await listAuthUsers();
  } catch (e) {
    authError = e instanceof Error ? e.message : "Could not list auth users.";
  }
  return NextResponse.json({ leads, authUsers, authError });
}

// POST → edit / delete a Supabase Auth user. (Leads are edited via the existing
// /api/try-this-look actions: update-lead / delete-lead.)
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as { action?: string; id?: string; name?: string } | null;
  if (!body?.action || !body.id) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  try {
    if (body.action === "update-auth-user") {
      const ok = await updateAuthUserName(body.id, String(body.name ?? ""));
      return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Update failed." }, { status: 502 });
    }
    if (body.action === "delete-auth-user") {
      const ok = await deleteAuthUser(body.id);
      return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Delete failed." }, { status: 502 });
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed." }, { status: 502 });
  }
}
