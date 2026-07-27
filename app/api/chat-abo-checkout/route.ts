import { NextResponse } from "next/server";
import { createSubscriptionCheckout, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Themen-Abo „Chat" — 24 €/Monat wie jedes Thema. Enthält täglichen Chat und 5 Looks
 * pro Monat; jeder weitere Look kostet 3,99 € (chat-look-checkout).
 *
 * Bis eine eigene Preis-ID existiert, läuft es über dieselbe 24-€-Preis-ID wie das
 * Wetter-Abo; `metadata.topic` trennt die Themen für die Konto-Übersicht (/account).
 */
const PRICE_ID =
  process.env.STRIPE_CHAT_ABO_PRICE_ID?.trim() ||
  process.env.STRIPE_WETTER_ABO_PRICE_ID?.trim() ||
  "price_1TxPxR1jPNCWoiztgmJMNNdF";

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { returnTo?: string; email?: string };
  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const back = String(body?.returnTo ?? "").startsWith("/") ? `${origin}${body.returnTo}` : `${origin}/themes/chat`;
  try {
    const { id, url } = await createSubscriptionCheckout({
      priceId: PRICE_ID,
      email: String(body?.email ?? "").trim() || undefined,
      successUrl: `${back}${back.includes("?") ? "&" : "?"}paid=1`,
      cancelUrl: `${back}${back.includes("?") ? "&" : "?"}cancelled=1`,
      metadata: { kind: "chat-abo", topic: "chat" },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
