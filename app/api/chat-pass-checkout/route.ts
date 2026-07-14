import { NextResponse } from "next/server";
import { createTryonCheckout, stripeConfigured } from "@/lib/stripe";
import { readTryThisLookState } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// $3.99 for a 30-minute chat pass with ONE influencer. Opens in a popup; the chat polls
// /api/checkout-status, which credits the influencer's owner 30% on success (kind:"chat-pass")
// and tells the client to unlock the chat for 30 minutes. Price is fixed server-side.
const PRICE_CENTS = 399;

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as { curatorId?: string } | null;
  const curatorId = String(body?.curatorId ?? "").trim();
  if (!curatorId) return NextResponse.json({ error: "curatorId required." }, { status: 400 });

  const state = await readTryThisLookState();
  const model = (state.curators ?? []).find(c => c.id === curatorId) as { firstName?: string } | undefined;
  if (!model) return NextResponse.json({ error: "Model not found." }, { status: 404 });

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";

  try {
    const { id, url } = await createTryonCheckout({
      amount: PRICE_CENTS,
      currency: "usd",
      productName: `LuxuryBandit — 30-min chat with ${model.firstName || "her"}`,
      successUrl: `${origin}/pay-done?paid=1`,
      cancelUrl: `${origin}/pay-done?cancelled=1`,
      clientReferenceId: curatorId,
      metadata: { kind: "chat-pass", curatorId },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
