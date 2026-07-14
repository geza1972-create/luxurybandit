import { NextResponse } from "next/server";
import { createPackCheckout, stripeConfigured } from "@/lib/stripe";
import { readTryThisLookState } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// $3.99 for a 30-minute chat pass with ONE influencer. Opens in a popup; the chat polls
// /api/checkout-status, which credits the influencer's owner 30% on success (kind:"chat-pass")
// and tells the client to unlock the chat for 30 minutes.
// Uses the STRIPE_CHAT_PASS_PRICE_ID Stripe Price when set (so the price is managed in Stripe);
// otherwise falls back to a fixed $3.99 built in code.
const PRICE_CENTS = 399;

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as { curatorId?: string; returnPath?: string } | null;
  const curatorId = String(body?.curatorId ?? "").trim();
  if (!curatorId) return NextResponse.json({ error: "curatorId required." }, { status: 400 });
  // Return the buyer to the SAME chat page (never dump them on a dead page → funnel exit).
  const rp = String(body?.returnPath ?? "").trim();
  const safeReturn = rp.startsWith("/") && !rp.startsWith("//") ? rp : "/";
  const rsep = safeReturn.includes("?") ? "&" : "?";

  const state = await readTryThisLookState();
  const model = (state.curators ?? []).find(c => c.id === curatorId) as { firstName?: string } | undefined;
  if (!model) return NextResponse.json({ error: "Model not found." }, { status: 404 });

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";

  const priceId = process.env.STRIPE_CHAT_PASS_PRICE_ID?.trim();

  try {
    const { id, url } = await createPackCheckout({
      ...(priceId
        ? { priceId }
        : { amount: PRICE_CENTS, currency: "usd", productName: `LuxuryBandit — 30-min chat with ${model.firstName || "her"}` }),
      // Back into the chat with a verify marker; the page confirms via /api/checkout-status,
      // activates the 30-min pass and re-opens the chat — so paying never leaves the funnel.
      successUrl: `${origin}${safeReturn}${rsep}chatpaid=${curatorId}&cs={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}${safeReturn}${rsep}chatcancelled=1`,
      clientReferenceId: curatorId,
      metadata: { kind: "chat-pass", curatorId },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
