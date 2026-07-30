import { NextResponse } from "next/server";
import { topicPriceId, standardCoupon, ONCE_CENTS } from "@/lib/pricing";
import { couponFor } from "@/lib/promo";
import { createSubscriptionCheckout, createTryonCheckout } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ABO statt Einzelkauf (Owner-Entscheidung 2026-07-27): dasselbe 24-€-Abo wie beim Wetter,
// darin sind 5 Videos pro Monat enthalten. Der frühere 3,99-Einzelkauf ist damit abgelöst.
// Preis-ID identisch mit wetter-abo-checkout — es ist EIN Abo, nicht zwei.
// Ein Preis fuer alle Themen (lib/pricing): 49 EUR/Monat. Die alte 24-EUR-ID ist raus.
const PRICE_ID = topicPriceId();

// POST { genId?, subId?, returnTo? } → startet das Abo. Nach Zahlung schaltet der
// Stripe-Webhook frei; der Client pollt /api/checkout-status.
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { genId?: string; subId?: string; returnTo?: string; once?: boolean };
  const genId = String(body?.genId ?? "").trim();
  const subId = String(body?.subId ?? "").trim();
  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const back = String(body?.returnTo ?? "").startsWith("/") ? `${origin}${body.returnTo}` : `${origin}/themes/kiss`;
  /**
   * EINMALKAUF STATT ABO (Owner 30.07.2026: „wir müssen einmalige zahlungen machen nicht nur
   * abos … 9,99 euro … für ein Video einmalig beim Küssen").
   *
   * Das Bild ist gratis, bezahlt wird das VIDEO. Wer kein Abo will, kauft dieses eine Video —
   * ohne Anmeldung, ohne Verlängerung. Preis steht in lib/pricing (ONCE_CENTS), nicht hier.
   *
   * Bewusst `price_data` statt einer Preis-ID: so muss in Stripe nichts angelegt werden, und
   * eine Preisänderung ist eine Zahl in der Preistabelle.
   *
   * `kind: "kiss-video"` ist dasselbe Kennzeichen wie beim Abo-Weg — checkout-status markiert
   * damit den Log-Eintrag als bezahlt, ohne dass dort etwas geändert werden muss.
   */
  if (body.once) {
    try {
      const { id, url } = await createTryonCheckout({
        amount: ONCE_CENTS,
        currency: "eur",
        productName: "Kiss video — one-off",
        successUrl: `${back}${back.includes("?") ? "&" : "?"}paid=1&cs={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${back}${back.includes("?") ? "&" : "?"}cancelled=1`,
        metadata: { kind: "kiss-video", ...(genId ? { genId } : {}), ...(subId ? { subId } : {}) },
      });
      return NextResponse.json({ url, sessionId: id });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
    }
  }

  try {
    const { id, url } = await createSubscriptionCheckout({
      priceId: PRICE_ID,
      coupon: couponFor(String((body as { code?: string })?.code ?? "")) ?? standardCoupon(),
      successUrl: `${back}${back.includes("?") ? "&" : "?"}paid=1&cs={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${back}${back.includes("?") ? "&" : "?"}cancelled=1`,
      // kind bleibt "wetter-abo", damit der bestehende Webhook den Abonnenten freischaltet.
      metadata: { kind: "wetter-abo", ...(subId ? { subId } : {}), ...(genId ? { genId } : {}) },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
