import { NextResponse } from "next/server";
import { createSubscriptionCheckout, stripeConfigured } from "@/lib/stripe";
import { couponFor } from "@/lib/promo";
import { topicPriceId, firstMonthCoupon } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Themen-Abo „Chat" — 24 €/Monat wie jedes Thema. Enthält täglichen Chat und 5 Looks
 * pro Monat; jeder weitere Look kostet 3,99 € (chat-look-checkout).
 *
 * Bis eine eigene Preis-ID existiert, läuft es über dieselbe 24-€-Preis-ID wie das
 * Wetter-Abo; `metadata.topic` trennt die Themen für die Konto-Übersicht (/account).
 */
// Preis kommt aus lib/pricing (49 €/Monat laufend).
const PRICE_ID = topicPriceId();

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { returnTo?: string; email?: string; code?: string };
  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const back = String(body?.returnTo ?? "").startsWith("/") ? `${origin}${body.returnTo}` : `${origin}/themes/chat`;
  try {
    const { id, url } = await createSubscriptionCheckout({
      priceId: topicPriceId(),
      email: String(body?.email ?? "").trim() || undefined,
      // Aktionscode aus der Anzeige → Gutschein (Zuordnung liegt serverseitig, siehe lib/promo).
      // Aktionscode aus der Anzeige schlägt den Standard; sonst gilt der
      // Einstiegs-Gutschein: 8 € im ersten Monat, danach 49 €.
      coupon: couponFor(String(body?.code ?? "")) ?? firstMonthCoupon(),
      successUrl: `${back}${back.includes("?") ? "&" : "?"}paid=1`,
      cancelUrl: `${back}${back.includes("?") ? "&" : "?"}cancelled=1`,
      metadata: { kind: "chat-abo", topic: "chat" },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
