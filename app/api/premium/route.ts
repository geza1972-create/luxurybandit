import { NextResponse } from "next/server";
import { createSubscriptionCheckout, createBillingPortalSession, hasActiveSubscription, listSubscribers, stripeConfigured } from "@/lib/stripe";
import { grantMonthlySubscriptionCredits } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Premium monthly price. Override with STRIPE_PREMIUM_PRICE_ID on Vercel to
// swap the plan/price without a code change.
const PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID?.trim() || "price_1TqvRE1jPNCWoiztVkIaOg7x";
// The €9.99/mo "own an AI influencer" Starter plan. Override via STRIPE_STARTER_PRICE_ID.
const STARTER_PRICE_ID = process.env.STRIPE_STARTER_PRICE_ID?.trim() || "price_1Tsoio1jPNCWoizthtENtj9d";
// First-month discount coupon ("Erster Monat Rabatt" — $41 off once → $8 first month).
// Auto-applied at checkout. Override via env to swap the promo without a code change.
const FIRST_MONTH_COUPON = process.env.STRIPE_PREMIUM_FIRST_MONTH_COUPON?.trim() || "CjOJYKVV";

// GET /api/premium?email=…  → { premium, credits? }  (queries Stripe live)
// Subscribers also get their monthly video-credit allowance topped up here (idempotent per
// month), since the client calls this to learn subscription status.
export async function GET(request: Request) {
  const url = new URL(request.url);
  // Admin: list all current subscribers (who's paying).
  if (url.searchParams.get("subscribers") === "1") {
    if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
    if (!stripeConfigured()) return NextResponse.json({ subscribers: [] });
    try { return NextResponse.json({ subscribers: await listSubscribers() }); }
    catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Could not list subscribers.", subscribers: [] }, { status: 502 }); }
  }
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
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
  const body = (await request.json().catch(() => ({}))) as { email?: string; returnPath?: string; allowPromo?: boolean; action?: string; plan?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Sign in first so we can link your subscription." }, { status: 401 });
  }
  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const rp = String(body.returnPath ?? "/stores");
  const safeRp = rp.startsWith("/") && !rp.startsWith("//") ? rp : "/stores";
  const sep = safeRp.includes("?") ? "&" : "?";

  // Customer Portal — manage/cancel the subscription + payment method.
  if (body.action === "portal") {
    try {
      const res = await createBillingPortalSession(email, `${origin}${safeRp}`);
      if (!res) return NextResponse.json({ error: "No subscription found for this account." }, { status: 404 });
      return NextResponse.json({ url: res.url });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Could not open the billing portal." }, { status: 502 });
    }
  }
  // allowPromo → skip the auto first-month coupon so Stripe shows a promo-code field instead
  // (Stripe forbids a coupon + a promo box together). Used to redeem a 100%-off test code.
  // "starter" = the $9.99/mo "own an AI influencer" plan; anything else = Premium.
  const isStarter = body.plan === "starter";
  if (isStarter && !STARTER_PRICE_ID) {
    return NextResponse.json({ error: "Starter plan not set up yet (STRIPE_STARTER_PRICE_ID missing on Vercel)." }, { status: 503 });
  }
  const priceId = isStarter ? STARTER_PRICE_ID : PRICE_ID;
  const coupon = isStarter ? undefined : (body.allowPromo ? undefined : (FIRST_MONTH_COUPON || undefined));
  try {
    const { url } = await createSubscriptionCheckout({
      priceId,
      email,
      coupon,
      successUrl: `${origin}${safeRp}${sep}premium=success`,
      cancelUrl: `${origin}${safeRp}${sep}premium=cancelled`,
    });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
