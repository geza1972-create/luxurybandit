import { NextResponse } from "next/server";
import { createSubscriptionCheckout, hasActiveSubscription, stripeConfigured } from "@/lib/stripe";
import { readTryThisLookState, saveTryThisLookState, getPricingConfig } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Super Follow = the SAME $4.99/month membership subscription owners have (just without buying a
// model). A member who follows an influencer is her "Super Follower": he unlocks her PRIVATE
// videos and adds +$1 to her LB-Value. So this route:
//   • already a member → just record the follow (no new charge), return { followed:true }
//   • not a member yet → start the membership subscription; on return the follow is recorded.
export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as { curatorId?: string; email?: string; followerId?: string; returnPath?: string } | null;
  const curatorId = String(body?.curatorId ?? "").trim();
  const followerId = String(body?.followerId ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!curatorId) return NextResponse.json({ error: "curatorId required." }, { status: 400 });
  if (!followerId) return NextResponse.json({ error: "Please sign in first to Super Follow." }, { status: 401 });

  const state = await readTryThisLookState();
  const model = (state.curators ?? []).find(c => c.id === curatorId) as { firstName?: string } | undefined;
  if (!model) return NextResponse.json({ error: "Model not found." }, { status: 404 });

  const recordFollow = async () => {
    const st = await readTryThisLookState();
    const follows = (st.follows = st.follows ?? []);
    if (!follows.some((f: any) => f.followeeType === "user" && f.followeeSlug === curatorId && f.followerId === followerId)) {
      follows.push({ id: `follow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, followerId, followeeSlug: curatorId, followeeType: "user", createdAt: new Date().toISOString() } as any);
      await saveTryThisLookState(st);
    }
  };

  // Already a paying member → Super Following is free; just record the follow.
  if (email && await hasActiveSubscription(email)) {
    await recordFollow();
    return NextResponse.json({ followed: true });
  }

  // Not a member yet → start the $4.99/mo membership. The Stripe price is the one from the
  // price list (same as the owner membership).
  const pricing = await getPricingConfig();
  const priceId = (pricing.stripeIds?.subscriptionMonthlyCents || process.env.STRIPE_PREMIUM_PRICE_ID || "").trim();
  if (!priceId) return NextResponse.json({ error: "Membership price not configured." }, { status: 503 });

  const rp = String(body?.returnPath ?? `/curator/${curatorId}`).trim();
  const safeReturn = rp.startsWith("/") && !rp.startsWith("//") ? rp : `/curator/${curatorId}`;
  const rsep = safeReturn.includes("?") ? "&" : "?";
  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";

  try {
    const { id, url } = await createSubscriptionCheckout({
      priceId,
      email: email || undefined,
      successUrl: `${origin}${safeReturn}${rsep}superfollowpaid=${curatorId}&cs={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}${safeReturn}${rsep}superfollowcancelled=1`,
      metadata: { kind: "super-follow", curatorId, followerId },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
