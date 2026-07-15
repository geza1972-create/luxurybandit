import { NextResponse } from "next/server";
import { createPackCheckout, stripeConfigured } from "@/lib/stripe";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import { influencerPriceCents, fmtPriceCents } from "@/lib/influencer-price";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Buy an influencer at her CURRENT grow-price (dynamic — no fixed Stripe Price needed). The
// amount is computed server-side at checkout time, so it's always today's value and can't be
// forged by the client. On return, /api/checkout-status (kind:"buy-influencer") transfers
// ownership (ownerEmail + purchasedAt = now → her appreciation restarts for the new owner).
export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as { curatorId?: string; email?: string; returnPath?: string } | null;
  const curatorId = String(body?.curatorId ?? "").trim();
  if (!curatorId) return NextResponse.json({ error: "curatorId required." }, { status: 400 });

  const state = await readTryThisLookState();
  const c = (state.curators ?? []).find(x => x.id === curatorId) as any;
  if (!c) return NextResponse.json({ error: "Influencer not found." }, { status: 404 });
  if (c.ownerEmail) return NextResponse.json({ error: "She's already owned — not for sale." }, { status: 409 });

  // Current value = base (+ real-model floor / flagship) + $1/video + $1/day. Recompute here.
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  const nmKey = name.toLowerCase();
  let lookCount = 0, videoCount = 0;
  for (const g of (state.generations ?? [])) {
    if ((g as any).feed !== true) continue;
    const gn = String((g as any).customerName ?? "").trim().toLowerCase();
    if (gn && gn === nmKey) { lookCount++; if ((g as any).videoUrl) videoCount++; }
  }
  const superFollowers = (state.follows ?? []).filter((f: any) => f.followeeType === "user" && f.followeeSlug === curatorId).length;
  const priceCents = influencerPriceCents({
    name, flagship: c.flagship, realModel: c.realModel === true,
    videoCount, lookCount, followerCount: superFollowers, purchasedAt: c.purchasedAt, createdAt: c.createdAt,
  });
  if (!(priceCents > 0)) return NextResponse.json({ error: "Price unavailable." }, { status: 400 });

  const buyerEmail = String(body?.email ?? "").trim().toLowerCase();
  const returnPath = (() => {
    const p = String(body?.returnPath ?? `/curator/${curatorId}`).trim();
    return p.startsWith("/") ? p : `/curator/${curatorId}`;
  })();
  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const sep = returnPath.includes("?") ? "&" : "?";

  try {
    const { id, url } = await createPackCheckout({
      amount: priceCents,
      currency: "usd",
      productName: `Own ${name || "this influencer"} — LuxuryBandit`,
      ...(buyerEmail ? { email: buyerEmail } : {}),
      successUrl: `${origin}${returnPath}${sep}bought=${curatorId}&cs={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}${returnPath}${sep}buycancelled=1`,
      metadata: { kind: "buy-influencer", curatorId },
    });
    return NextResponse.json({ url, sessionId: id, priceCents, priceLabel: fmtPriceCents(priceCents) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
