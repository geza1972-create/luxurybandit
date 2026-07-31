import { NextResponse } from "next/server";
import { createTryonCheckout, stripeConfigured } from "@/lib/stripe";
import { EXTRA_VIDEO_CENTS } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Jedes WEITERE Holiday-Video: 3,99 € einzeln (das erste startet das Abo — siehe
// holiday-abo-checkout). Preis serverseitig fixiert; dem Client nie vertrauen.
// PREIS AUS DER TABELLE, nicht von Hand (Owner 31.07.2026: „und auch wo 3,99 steht
// auch 2,99"). Jedes weitere Holiday-Video. Hier stand 399 fest — beim Preiswechsel haette diese Route
// als einzige weiter den alten Betrag abgebucht, waehrend die Seite 2,99 verspricht.
const PRICE_CENTS = EXTRA_VIDEO_CENTS;

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { returnTo?: string };
  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const back = String(body?.returnTo ?? "").startsWith("/") ? `${origin}${body.returnTo}` : `${origin}/themes/holiday`;
  try {
    const { id, url } = await createTryonCheckout({
      amount: PRICE_CENTS,
      currency: "eur",
      productName: "LuxuryBandit — holiday video",
      successUrl: `${back}${back.includes("?") ? "&" : "?"}paid=1`,
      cancelUrl: `${back}${back.includes("?") ? "&" : "?"}cancelled=1`,
      metadata: { kind: "holiday-video", topic: "holiday" },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
