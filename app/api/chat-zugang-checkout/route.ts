import { NextResponse } from "next/server";
import { createPackCheckout, stripeConfigured } from "@/lib/stripe";
import { CHAT_STUFEN, chatPriceId } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * CHAT-ZUGANG KAUFEN — einmalig, mit gewaehlter Laufzeit (Owner 03.08.2026: „er kauft ein
 * Model, ein Chat" · „die Stufen von vorhin").
 *
 * ERSETZT `chat-abo-checkout`, das ein STRIPE-ABO startete (`createSubscriptionCheckout`).
 * Damit faellt die letzte Abo-Kasse der Plattform: keine Kuendigung, kein
 * `hasActiveSubscription`, keine Monatsgutschriften. Danach gibt es genau einen Kaufweg.
 *
 * DER PREIS WIRD SERVERSEITIG AUS DER TABELLE GEHOLT, nie aus dem Aufruf. Der Browser schickt
 * nur, WELCHE Stufe gemeint ist; welche Zahl daran haengt, entscheidet der Server. Alles andere
 * hiesse, den Preis dem Kunden zu ueberlassen — dieselbe Regel wie beim Kuss.
 */
export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { monate?: number; returnTo?: string; email?: string };

  /**
   * WEISSE LISTE STATT ZAHL AUS DEM AUFRUF: Nur Laufzeiten, die es wirklich gibt. Ein
   * unbekannter Wert faellt auf die erste Stufe zurueck, statt einen Kauf ueber 0 EUR zu bauen.
   */
  const stufe = CHAT_STUFEN.find(s => s.monate === Number(body.monate)) ?? CHAT_STUFEN[0];

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const returnTo = String(body.returnTo ?? "/themes/chat");
  try {
    const { id, url } = await createPackCheckout({
      /**
       * DIE PREIS-KENNUNG SCHLAEGT DEN SELBSTGEBAUTEN BETRAG (Owner 03.08.2026). Damit steht der
       * Preis in Stripes eigenem Katalog: richtige Belege, richtige Auswertung, richtige Steuer.
       * `amount` und `currency` bleiben als Rueckfall, falls die Kennung je fehlt.
       */
      priceId: chatPriceId(),
      amount: stufe.cents,
      currency: "eur",
      metadata: { kind: "chat-zugang", monate: String(stufe.monate) },
      /* Nur ein Rueckfall: Steht die Preis-Kennung, kommt der Name aus Stripes Katalog. */
      productName: `Chat access — ${stufe.monate} month`,
      successUrl: `${origin}${returnTo}${returnTo.includes("?") ? "&" : "?"}chat_paid=1`,
      cancelUrl: `${origin}${returnTo}`,
      email: String(body.email ?? "").trim() || undefined,
    });
    return NextResponse.json({ url, sessionId: id, monate: stufe.monate, cents: stufe.cents });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout failed." }, { status: 500 });
  }
}
