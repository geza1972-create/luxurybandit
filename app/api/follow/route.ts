import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, Follow } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

const nameSlug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

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

// The follower identity — a Supabase user OR a curator session (our only login).
async function getFollowerId(request: Request): Promise<string | null> {
  const user = await getUserFromBearer(request.headers.get("Authorization"));
  if (user?.id) return user.id;
  const curatorId = request.headers.get("x-curator-id")?.trim();
  return curatorId ? `curator:${curatorId}` : null;
}

// GET /api/follow?slug=X&type=user|store
// Returns { followerCount, following } — `following` requires Bearer token
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Admin: ALL follows, resolved to curator names (for the admin followers list).
  if (searchParams.get("all") === "1") {
    if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
    const state = await readTryThisLookState();
    const curators = state.curators ?? [];
    const bySlug = new Map(curators.map(c => [nameSlug(`${(c as any).firstName ?? ""} ${(c as any).lastName ?? ""}`), c]));
    const byId = new Map(curators.map(c => [c.id, `${(c as any).firstName ?? ""} ${(c as any).lastName ?? ""}`.trim()]));
    const follows = (state.follows ?? []).map(f => {
      const followee = f.followeeType === "user" ? bySlug.get(f.followeeSlug) : undefined;
      const rawFollower = f.followerId.startsWith("curator:") ? f.followerId.slice(8) : f.followerId;
      return {
        id: f.id, createdAt: (f as any).createdAt, followeeType: f.followeeType, followeeSlug: f.followeeSlug,
        followeeName: followee ? `${(followee as any).firstName ?? ""} ${(followee as any).lastName ?? ""}`.trim() : f.followeeSlug,
        followeeCuratorId: followee?.id,
        followerName: (f as any).followerName || byId.get(rawFollower) || (f.followerId.startsWith("curator:") ? "Model" : "Member"),
        followerIsCurator: f.followerId.startsWith("curator:"),
      };
    });
    return NextResponse.json({ follows });
  }

  const slug = searchParams.get("slug")?.trim().toLowerCase() ?? "";
  const type = (searchParams.get("type") ?? "user") as "user" | "store";
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const state = await readTryThisLookState();
  const follows = state.follows ?? [];
  const realFollowers = follows.filter(
    f => f.followeeSlug === slug && f.followeeType === type
  ).length;
  // Curators carry an admin-set baseline (followerBoost) added to real follows,
  // so we can show a realistic audience without storing millions of records.
  const boost = type === "user"
    ? Math.max(0, Math.floor(Number((state.curators ?? []).find(c => c.id === slug)?.followerBoost) || 0))
    : 0;
  const followerCount = realFollowers + boost;

  const followerId = await getFollowerId(request);
  const following = followerId
    ? follows.some(f => f.followeeSlug === slug && f.followeeType === type && f.followerId === followerId)
    : false;

  return NextResponse.json({ followerCount, following });
}

// POST /api/follow  body: { slug, type }
// Toggles follow. Requires Bearer token.
export async function POST(request: Request) {
  const followerId = await getFollowerId(request);
  if (!followerId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json() as { slug?: string; type?: string };
  const slug = body.slug?.trim().toLowerCase() ?? "";
  const type = (body.type === "store" ? "store" : "user") as "user" | "store";
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const state = await readTryThisLookState();
  const follows = state.follows ?? [];
  const existingIdx = follows.findIndex(
    f => f.followeeSlug === slug && f.followeeType === type && f.followerId === followerId
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
      followerId,
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
