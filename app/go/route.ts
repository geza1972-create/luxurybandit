import { NextResponse } from "next/server";
import { createSubscriptionCheckout, stripeConfigured } from "@/lib/stripe";
import { couponFor } from "@/lib/promo";
import { topicPriceId, firstMonthCoupon } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DIREKT IN DIE KASSE — für Besucher, die ihre Daten schon woanders eingegeben haben
 * (Meta-Sofortformular: Name, Vorname, Multiple Choice).
 *
 * Warum ohne eigenes Formular: Meta kann die Antworten nicht an uns übergeben. Ein zweites
 * Formular wäre also dieselbe Abfrage nochmal — er tippt zweimal, wir können ihn trotzdem
 * nicht zuordnen. Hier überspringen wir das: ein Klick, und er steht bei Stripe, wo die
 * E-Mail ohnehin gebraucht wird. Eine Eingabe, eine Identität.
 *
 *   /go?code=BELLA            → Chat-Abo, 19 € erster Monat
 *   /go?code=BELLA&topic=holiday
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") ?? "").trim();
  const topic = (url.searchParams.get("topic") ?? "chat").trim();
  const src = (url.searchParams.get("src") ?? "").trim();
  const origin = url.origin;

  // Zahlungen aus, kaputte Konfiguration → nicht ins Leere laufen lassen, sondern auf die
  // normale Anmeldeseite, wo er wenigstens weiterkommt.
  if (!stripeConfigured()) {
    return NextResponse.redirect(`${origin}/join?code=${encodeURIComponent(code)}`, 302);
  }

  const back = `${origin}/join?paid=1&code=${encodeURIComponent(code)}&topic=${encodeURIComponent(topic)}${src ? `&src=${encodeURIComponent(src)}` : ""}`;
  try {
    const { url: checkoutUrl } = await createSubscriptionCheckout({
      priceId: topicPriceId(),
      coupon: couponFor(code) ?? firstMonthCoupon(),
      successUrl: `${back}&cs={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/join?code=${encodeURIComponent(code)}&cancelled=1`,
      metadata: { kind: `${topic}-abo`, topic, ...(code ? { code: code.toUpperCase() } : {}), ...(src ? { src } : {}) },
    });
    return NextResponse.redirect(checkoutUrl, 302);
  } catch {
    return NextResponse.redirect(`${origin}/join?code=${encodeURIComponent(code)}`, 302);
  }
}
