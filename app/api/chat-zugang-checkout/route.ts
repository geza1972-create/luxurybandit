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
  const body = (await request.json().catch(() => ({}))) as { monate?: number; returnTo?: string; email?: string; empfaenger?: string; eingebettet?: boolean; lang?: string };

  /**
   * ZWEI ADRESSEN: DEINE UND DIE DES BESCHENKTEN (Owner 05.08.2026: „man muss bei denen zwei
   * Email angeben. Deine und für wen das ist. Fertig.").
   *
   * DAS WAR DER HAKEN, den er selbst gefunden hat: „sonst steht es mit der E-Mail des Käufers
   * in Verbindung." Beim Kuss ist das egal — dort entsteht eine DATEI, die er selbst
   * verschickt. Der Chat-Monat ist aber eine BERECHTIGUNG, und auf der Adresse des Käufers ist
   * sie für den Beschenkten wertlos: Der Monat läuft auf dem falschen Konto ab, während der
   * andere vor der Wand steht.
   *
   * LEER HEISST „FÜR MICH SELBST" — der Fall, den der Owner ausdrücklich mitgenannt hat („es
   * sei denn, jemand kauft das für sich"). Dann bekommt der Käufer den Monat, wie bisher.
   *
   * Kleingeschrieben, bevor irgendetwas damit passiert: Der Zugang hängt an genau dieser
   * Zeichenkette (`chatZugang[e]`), und „Anna@Gmail.com" wäre ein anderes Konto als
   * „anna@gmail.com". Wer sein Geschenk dann sucht, findet ein leeres.
   */
  const empfaenger = String(body.empfaenger ?? "").trim().toLowerCase();
  if (empfaenger && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(empfaenger)) {
    return NextResponse.json({ error: "Die Adresse des Beschenkten sieht nicht wie eine E-Mail aus." }, { status: 400 });
  }

  /**
   * WEISSE LISTE STATT ZAHL AUS DEM AUFRUF: Nur Laufzeiten, die es wirklich gibt. Ein
   * unbekannter Wert faellt auf die erste Stufe zurueck, statt einen Kauf ueber 0 EUR zu bauen.
   */
  const stufe = CHAT_STUFEN.find(s => s.monate === Number(body.monate)) ?? CHAT_STUFEN[0];

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const returnTo = String(body.returnTo ?? "/themes/chat");
  try {
    const { id, url, clientSecret } = await createPackCheckout({
      /**
       * KEINE PREIS-KENNUNG MEHR (Owner 13.08.2026: „das kostet wie Hochzeit. 9,99 dann
       * 14,99 im monat") — die alte Kennung trug fest 14,99 € und hätte den neuen
       * Tabellenpreis überstimmt. Einmalkäufe rechnen über `price_data` aus der Tabelle
       * (Skill `bezahlung`, Regel 2); `CHAT_STUFEN` ist die eine Zahl.
       */
      amount: stufe.cents,
      currency: "eur",
      /* Die Adresse des Beschenkten reist als KASSEN-Vermerk mit, nicht als Behauptung des
         Browsers: `/api/checkout-status` liest sie nach der Zahlung von Stripe zurueck. Waere
         es umgekehrt, koennte sich jeder Zugang auf eine beliebige Adresse buchen. */
      metadata: { kind: "chat-zugang", monate: String(stufe.monate), ...(empfaenger ? { empfaenger } : {}) },
      /* Nur ein Rueckfall: Steht die Preis-Kennung, kommt der Name aus Stripes Katalog. */
      productName: `Chat access — ${stufe.monate} month`,
      successUrl: `${origin}${returnTo}${returnTo.includes("?") ? "&" : "?"}chat_paid=1`,
      cancelUrl: `${origin}${returnTo}`,
      email: String(body.email ?? "").trim() || undefined,
      /* KASSE IN DER SEITE + SPRACHE DER SEITE (15.08.2026, Owner: „die muss du alle
         umbauen"). Ohne oeffentlichen Stripe-Schluessel bleibt es beim Seitenwechsel. */
      eingebettet: body?.eingebettet === true,
      sprache: String(body?.lang ?? "").trim().toLowerCase(),
    });
    return NextResponse.json({ url, sessionId: id, monate: stufe.monate, cents: stufe.cents, ...(clientSecret ? { clientSecret } : {}) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout failed." }, { status: 500 });
  }
}
