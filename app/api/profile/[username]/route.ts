import { NextResponse } from "next/server";
import { readTryThisLookState } from "@/lib/try-this-look-store";

export const runtime = "nodejs";

function toSlug(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function GET(
  _request: Request,
  { params }: { params: { username: string } }
) {
  const targetSlug = toSlug(params.username ?? "");
  if (!targetSlug) return NextResponse.json({ error: "Invalid username." }, { status: 400 });

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  // Fetch all auth users and find the one with matching username slug
  const res = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) return NextResponse.json({ error: "Could not fetch users." }, { status: 500 });

  const data = await res.json() as {
    users: Array<{
      id: string;
      email?: string;
      user_metadata?: Record<string, string | undefined>;
    }>;
  };

  const user = data.users.find((u) => {
    const meta = u.user_metadata ?? {};
    return toSlug(meta.username ?? meta.full_name ?? "") === targetSlug;
  });

  if (!user) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const meta = user.user_metadata ?? {};
  const displayName = meta.username ?? meta.full_name ?? targetSlug;

  // Look up store if they have one
  const state = await readTryThisLookState();
  const store = (state.stores ?? []).find((s) => s.ownerUserId === user.id);

  return NextResponse.json({
    userId: user.id,
    username: targetSlug,
    displayName,
    bio: meta.bio ?? null,
    website: meta.website ?? null,
    instagram: meta.instagram ?? null,
    avatarUrl: meta.avatar_url ?? null,
    storeSlug: store?.slug ?? null,
    storeName: store?.name ?? null,
    // Note: phone, address, notification_email, whatsapp_number are NOT returned (private)
  });
}
