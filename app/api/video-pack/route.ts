import { NextResponse } from "next/server";
import { createPackCheckout, stripeConfigured } from "@/lib/stripe";
import { getVideoCredits, spendVideoCredit, grantVideoCredits, setVideoCreditsBalance } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";
import { WAEHRUNG } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The pack: 8 € → 4 video generations. Override via env without a code change.
export const PACK_CENTS = Number(process.env.VIDEO_PACK_PRICE_CENTS ?? 800);
export const PACK_CREDITS = Number(process.env.VIDEO_PACK_CREDITS ?? 4);
const CURRENCY = process.env.VIDEO_PACK_CURRENCY ?? WAEHRUNG;

// GET /api/video-pack?email=…  → { credits }
// A free account starts with ZERO credits — generating a video costs money (Premium, or the
// per-video $3.99). The old auto-granted welcome credit is gone; the model's own first video
// is free via a separate grant in the generate-tryon-video gate, not here.
export async function GET(request: Request) {
  const email = (new URL(request.url).searchParams.get("email") ?? "").trim().toLowerCase();
  const credits = email ? await getVideoCredits(email) : 0;
  return NextResponse.json({ credits, packCredits: PACK_CREDITS, packCents: PACK_CENTS });
}

// POST /api/video-pack { email, action? } →
//   action:"spend" → decrements a credit (used just before a real generation)
//   default        → { url, sessionId }  (Stripe one-time checkout for the pack)
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; action?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Sign in first so we can save your videos." }, { status: 401 });
  }

  // Spend one credit for a generation (server-side, so it can't be bypassed client-side).
  if (body.action === "spend") {
    const left = await spendVideoCredit(email);
    if (left === null) return NextResponse.json({ error: "No video credits left.", credits: 0 }, { status: 402 });
    return NextResponse.json({ ok: true, credits: left });
  }

  // Refund one credit — called when a generation failed, so the buyer isn't charged for nothing.
  if (body.action === "refund") {
    const res = await grantVideoCredits(email, "", 1);
    return NextResponse.json({ ok: true, credits: res.credits });
  }

  // Admin: set a user's video-credit balance to an absolute value (e.g. 0 = reset).
  // Requires the admin PIN header — the only way to overwrite (not just add) a balance.
  if (body.action === "admin-set") {
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: "Admin access required." }, { status: 401 });
    }
    const n = Number((body as { credits?: unknown }).credits);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "credits must be a number >= 0." }, { status: 400 });
    }
    const credits = await setVideoCreditsBalance(email, n);
    return NextResponse.json({ ok: true, credits });
  }

  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments aren't set up yet." }, { status: 503 });
  }
  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  try {
    const { id, url } = await createPackCheckout({
      amount: PACK_CENTS,
      currency: CURRENCY,
      productName: `${PACK_CREDITS} try-on videos`,
      email,
      // Popup lands here; the funnel polls /api/checkout-status?session_id=… to grant.
      successUrl: `${origin}/pay-done?paid=1`,
      cancelUrl: `${origin}/pay-done?cancelled=1`,
      metadata: { kind: "pack4", credits: String(PACK_CREDITS) },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
