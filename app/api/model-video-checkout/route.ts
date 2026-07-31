import { NextResponse } from "next/server";
import { createTryonCheckout, stripeConfigured } from "@/lib/stripe";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import { EXTRA_VIDEO_CENTS } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// $3.99 checkout for a model to generate ONE more video (her first is free). Opens in a
// popup; the profile page polls /api/checkout-status, which grants 1 video credit to her
// email on success (kind:"model-video"). Price is fixed server-side — never trust a client.
// PREIS AUS DER TABELLE, nicht von Hand (Owner 31.07.2026: „und auch wo 3,99 steht
// auch 2,99"). Ein weiteres Video fuer ein Model. Hier stand 399 fest — beim Preiswechsel haette diese Route
// als einzige weiter den alten Betrag abgebucht, waehrend die Seite 2,99 verspricht.
const PRICE_CENTS = EXTRA_VIDEO_CENTS;

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as { curatorId?: string } | null;
  const curatorId = String(body?.curatorId ?? "").trim();
  if (!curatorId) return NextResponse.json({ error: "curatorId required." }, { status: 400 });

  const state = await readTryThisLookState();
  const model = (state.curators ?? []).find(c => c.id === curatorId) as { email?: string } | undefined;
  const email = String(model?.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Model not found." }, { status: 404 });

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";

  try {
    const { id, url } = await createTryonCheckout({
      amount: PRICE_CENTS,
      currency: "usd",
      productName: "LuxuryBandit — one try-on video",
      successUrl: `${origin}/pay-done?paid=1`,
      cancelUrl: `${origin}/pay-done?cancelled=1`,
      clientReferenceId: email,
      metadata: { kind: "model-video", email },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
