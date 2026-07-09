import { NextResponse } from "next/server";
import { createSubscriptionCheckout, hasActiveSubscription, stripeConfigured } from "@/lib/stripe";
import { grantMonthlySubscriptionCredits } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Premium monthly price. Override with STRIPE_PREMIUM_PRICE_ID on Vercel to
// swap the plan/price without a code change.
const PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID?.trim() || "price_1TqvRE1jPNCWoiztVkIaOg7x";
// First-month discount coupon ("Erster Monat Rabatt" — $41 off once → $8 first month).
// Auto-applied at checkout. Override via env to swap the promo without a code change.
const FIRST_MONTH_COUPON = process.env.STRIPE_PREMIUM_FIRST_MONTH_COUPON?.trim() || "CjOJYKVV";

// GET /api/premium?email=…  → { premium, credits? }  (queries Stripe live)
// Subscribers also get their monthly video-credit allowance topped up here (idempotent per
// month), since the client calls this to learn subscription status.
export async function GET(request: Request) {
  const email = (new URL(request.url).searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email || !stripeConfigured()) return NextResponse.json({ premium: false });
  try {
    const premium = await hasActiveSubscription(email);
    if (!premium) return NextResponse.json({ premium: false });
    let credits: number | undefined;
    try { credits = await grantMonthlySubscriptionCredits(email); } catch { /* grant is best-effort */ }
    return NextResponse.json({ premium: true, ...(credits !== undefined ? { credits } : {}) });
  } catch {
    return NextResponse.json({ premium: false });
  }
}

// POST /api/premium { email, returnPath } → { url }  (hosted subscription checkout)
export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments aren't set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { email?: string; returnPath?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Sign in first so we can link your subscription." }, { status: 401 });
  }
  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const rp = String(body.returnPath ?? "/stores");
  const safeRp = rp.startsWith("/") && !rp.startsWith("//") ? rp : "/stores";
  const sep = safeRp.includes("?") ? "&" : "?";
  try {
    const { url } = await createSubscriptionCheckout({
      priceId: PRICE_ID,
      email,
      coupon: FIRST_MONTH_COUPON || undefined,
      successUrl: `${origin}${safeRp}${sep}premium=success`,
      cancelUrl: `${origin}${safeRp}${sep}premium=cancelled`,
    });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
