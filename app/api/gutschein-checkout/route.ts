import { NextResponse } from "next/server";
import { createPackCheckout, stripeConfigured } from "@/lib/stripe";
import { GUTSCHEIN_STUFEN, gutscheinStufe, themenPreisCents, eur, type ThemenSchluessel } from "@/lib/pricing";

/**
 * JEDES TOPIC ALS GUTSCHEIN (Owner 06.08.2026: „dann machen wir unsere Gutscheine. für
 * unsere Topics" · „jeder Topic als Gutschein einfügen").
 *
 * Der Käufer legt der Gutschein-Karte ein LuxuryBandit-Geschenk bei: ein Kussvideo, eine
 * Geburtstagskarte, einen Tanz, eine Urlaubs- oder Hochzeitseinladung. Technisch bleibt es
 * GUTHABEN auf dem Konto des Beschenkten (EIN Topf für alle Themen) — das Thema bestimmt den
 * Betrag (aus der Preistabelle, `themenPreisCents`) und wohin der Knopf auf der Karte führt.
 *
 * DER CHAT FEHLT MIT ABSICHT: Sein Freischalten läuft nicht übers Guthaben
 * (`chat-zugang-checkout`, eigener Stripe-Weg). Ein „Chat-Gutschein" wäre Guthaben, das
 * genau das Versprochene nicht kaufen kann — erst wenn der Chat aus dem Konto zahlbar ist,
 * darf er in diese Liste.
 */
const GUTSCHEIN_TOPICS = new Set<ThemenSchluessel>(["kiss", "birthday", "surprise", "holiday", "wedding"]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DER LUXURYBANDIT-GUTSCHEIN — Guthaben für JEMAND ANDEREN kaufen (Owner 05.08.2026:
 * „Sollen wir aber hier tatsächlich Gutscheine für unser Portal verkaufen, falls die Leute
 * keine Ideen haben?" · „Credits? Warum nicht.").
 *
 * ES IST FAST DIE AUFLADUNG, MIT EINEM UNTERSCHIED — und der ist der ganze Punkt: Das Geld
 * landet auf der Adresse des BESCHENKTEN, nicht auf der des Käufers. Deshalb reist
 * `empfaenger` als Kassenvermerk mit; `/api/checkout-status` lädt nach der Zahlung genau diese
 * Adresse auf. Der Browser sagt das nie selbst — er könnte sonst jede beliebige Adresse
 * behaupten und sich Guthaben schenken lassen.
 *
 * DER BETRAG KOMMT AUS DER TABELLE, NIE AUS DEM AUFRUF. `gutscheinStufe` ist eine weisse
 * Liste: 15 · 30 · 60 €. Ein unbekannter Wert fällt auf die kleinste Stufe zurück, statt einen
 * Kauf über einen erfundenen Betrag zu bauen — dieselbe Regel wie beim Kuss und beim Chat.
 *
 * WARUM DIE 5 UND DIE 10 HIER FEHLEN: Sie stehen in der Aufladeleiter, kaufen aber kein
 * einziges Produkt (das billigste kostet 15 €). Ein Gutschein, den man öffnet und der nichts
 * kauft, ist eine Enttäuschung mit Schleife — und zwar vor den Augen dessen, der ihn
 * geschenkt hat. Die Begründung steht ausführlich bei GUTSCHEIN_STUFEN.
 *
 * KEIN ABLAUFDATUM. Auf jedem Geschenk liegen 30 Tage; auf diesem Guthaben ausdrücklich nicht.
 * Verfallendes Guthaben ist in mehreren EU-Ländern nicht haltbar und überall der zuverlässigste
 * Weg zu Beschwerden. Hier steht deshalb keine Frist — und wer je eine einbaut, ändert damit
 * die Rechtslage, nicht nur eine Zahl.
 *
 * UND WIR VERKAUFEN HIER UNSEREN EIGENEN, NIE EINEN FREMDEN (Konzept §3b, Regel 1): Ein
 * fremder Gutschein wäre fremdes Geld und eine fremde Zahlungsverpflichtung — mit Verfall,
 * Haftung und Aufsicht. Unserer ist ein Einzweckgutschein auf unsere eigene Leistung.
 */
export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    cents?: number; topic?: string; empfaenger?: string; email?: string; returnTo?: string;
    eingebettet?: boolean; lang?: string;
  };

  /**
   * DAS THEMA IST EINE WEISSE LISTE, DER PREIS KOMMT AUS DER TABELLE. Der Browser sagt nur,
   * WELCHES Geschenk gemeint ist — was es kostet, entscheidet `themenPreisCents`. Ein
   * unbekanntes Thema fällt auf die nackte Guthaben-Leiter zurück (15 · 30 · 60).
   */
  const topic = GUTSCHEIN_TOPICS.has(body.topic as ThemenSchluessel) ? (body.topic as ThemenSchluessel) : "";
  const cents = topic ? themenPreisCents(topic as ThemenSchluessel) : gutscheinStufe(body.cents);

  /**
   * DIE ADRESSE DES BESCHENKTEN — normalisiert, bevor irgendetwas damit passiert.
   *
   * Kleinschreibung allein reicht nicht: Das Guthaben hängt an genau dieser Zeichenkette
   * (Memory `guthaben-haengt-an-einer-adresse`), und „Anna@Gmail.com" und „anna@gmail.com"
   * wären zwei verschiedene Konten. Wer sein Geschenk dann sucht, findet ein leeres.
   */
  const empfaenger = String(body.empfaenger ?? "").trim().toLowerCase();
  if (!empfaenger || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(empfaenger)) {
    return NextResponse.json({ error: "Bitte die E-Mail-Adresse des Beschenkten angeben." }, { status: 400 });
  }

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const returnTo = String(body.returnTo ?? "").startsWith("/") ? String(body.returnTo) : "/themes/gutschein";
  const back = `${origin}${returnTo}`;

  try {
    const { id, url, clientSecret } = await createPackCheckout({
      /* Kein Preis-Kennung, sondern `price_data` mit dem Betrag von oben: Preisschild und
         Kasse sind damit dieselbe Zahl und koennen nicht auseinanderlaufen (Regel aus
         UEBERGABE-05-08.md §1). Eine Stripe-Kennung je Stufe waeren drei Gelegenheiten mehr,
         eine davon zu vergessen. */
      amount: cents,
      currency: "usd",
      /* Auf dem Stripe-Beleg steht das THEMA, wenn eines gewählt wurde — der Käufer soll
         wiedererkennen, was er verschenkt hat, nicht nur einen Betrag. */
      productName: topic
        ? `LuxuryBandit gift voucher — ${topic} (${eur(cents, "en")})`
        : `LuxuryBandit Gutschein ${eur(cents, "en")}`,
      /**
       * `kind: "gutschein"` — bewusst NICHT „aufladung": Der Block in `/api/checkout-status`,
       * der Aufladungen verbucht, schreibt dem KÄUFER gut. Hier muss das Geld woandershin,
       * und dafuer braucht es einen eigenen Zweig, der `empfaenger` liest.
       */
      /* `topic` reist im Kassenvermerk mit: Die Einladungs-Route liest ihn nach der Zahlung
         von STRIPE zurück (nie vom Browser) und schreibt ihn auf die Karte. */
      metadata: { kind: "gutschein", cents: String(cents), empfaenger, ...(topic ? { topic } : {}) },
      successUrl: `${back}${back.includes("?") ? "&" : "?"}gutschein=1&cs={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${back}${back.includes("?") ? "&" : "?"}abgebrochen=1`,
      /* Die Adresse des KAEUFERS — fuer den Beleg. Sie bekommt kein Guthaben. */
      email: String(body.email ?? "").trim().toLowerCase() || undefined,
      /* KASSE IN DER SEITE + SPRACHE DER SEITE (15.08.2026, Owner: „die muss du alle
         umbauen"). Ohne oeffentlichen Stripe-Schluessel bleibt es beim Seitenwechsel. */
      eingebettet: body?.eingebettet === true,
      sprache: String(body?.lang ?? "").trim().toLowerCase(),
    });
    return NextResponse.json({ url, sessionId: id, cents, stufen: GUTSCHEIN_STUFEN, ...(clientSecret ? { clientSecret } : {}) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout failed." }, { status: 500 });
  }
}
