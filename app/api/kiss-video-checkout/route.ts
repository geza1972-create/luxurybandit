import { NextResponse } from "next/server";
import { createTryonCheckout, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// $3.99-Checkout: EIN Kiss-Video freischalten (das Ergebnis läuft verpixelt, bis bezahlt ist).
// Popup-Flow wie model-video-checkout: Client öffnet `url` im Popup und pollt
// /api/checkout-status?session_id= bis `paid` — dann wird das Video entblurrt.
// Preis ist serverseitig fixiert — dem Client nie vertrauen. (Preis-Quelle:
// docs/pricing-and-subscriptions.md — Video = 3,99 Einzelkauf, kein Abo.)
const PRICE_CENTS = 399;

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { genId?: string };
  const genId = String(body?.genId ?? "").trim();
  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  try {
    const { id, url } = await createTryonCheckout({
      amount: PRICE_CENTS,
      currency: "usd",
      productName: "LuxuryBandit — your kiss video",
      successUrl: `${origin}/pay-done?paid=1`,
      cancelUrl: `${origin}/pay-done?cancelled=1`,
      metadata: { kind: "kiss-video", ...(genId ? { genId } : {}) },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
