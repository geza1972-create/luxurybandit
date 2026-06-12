import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, Follow } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "") ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || "";

async function getUserFromBearer(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return await res.json() as { id: string; user_metadata?: { username?: string } };
}

// GET /api/follow?slug=X&type=user|store
// Returns { followerCount, following } — `following` requires Bearer token
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim().toLowerCase() ?? "";
  const type = (searchParams.get("type") ?? "user") as "user" | "store";
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const state = await readTryThisLookState();
  const follows = state.follows ?? [];
  const followerCount = follows.filter(
    f => f.followeeSlug === slug && f.followeeType === type
  ).length;

  const user = await getUserFromBearer(request.headers.get("Authorization"));
  const following = user
    ? follows.some(f => f.followeeSlug === slug && f.followeeType === type && f.followerId === user.id)
    : false;

  return NextResponse.json({ followerCount, following });
}

// POST /api/follow  body: { slug, type }
// Toggles follow. Requires Bearer token.
export async function POST(request: Request) {
  const user = await getUserFromBearer(request.headers.get("Authorization"));
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json() as { slug?: string; type?: string };
  const slug = body.slug?.trim().toLowerCase() ?? "";
  const type = (body.type === "store" ? "store" : "user") as "user" | "store";
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const state = await readTryThisLookState();
  const follows = state.follows ?? [];
  const existingIdx = follows.findIndex(
    f => f.followeeSlug === slug && f.followeeType === type && f.followerId === user.id
  );

  let following: boolean;
  let nextFollows: Follow[];

  if (existingIdx >= 0) {
    // Unfollow
    nextFollows = follows.filter((_, i) => i !== existingIdx);
    following = false;
  } else {
    // Follow
    const newFollow: Follow = {
      id: crypto.randomUUID(),
      followerId: user.id,
      followeeSlug: slug,
      followeeType: type,
      createdAt: new Date().toISOString(),
    };
    nextFollows = [...follows, newFollow];
    following = true;
  }

  const followerCount = nextFollows.filter(
    f => f.followeeSlug === slug && f.followeeType === type
  ).length;

  await saveTryThisLookState({ ...state, follows: nextFollows });
  return NextResponse.json({ following, followerCount });
}
