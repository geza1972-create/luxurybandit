import { NextResponse } from "next/server";
import { createTryonCheckout, getCheckoutSession, stripeConfigured } from "@/lib/stripe";
import { VERSUSFORGE_ANALYSE_CENTS } from "@/lib/pricing";
import { guthabenDazu, guthabenLesen } from "@/lib/versusforge-guthaben";
import { adminPinMatches } from "@/lib/admin-auth";

/**
 * DIE KASSE FÜR EINE WEITERE ANALYSE (Owner 08.09.2026: „9,99 — und wir müssen was liefern";
 * gewählt: „einfach eine weitere Analyse").
 *
 * WARUM EINE EIGENE ROUTE und nicht `kiss-video-checkout`: Die grosse Route hängt am
 * Geschenk-Auftrag-Modell (genId, Mappe, Video-Aufpreis, Guthaben je Konto). VersusForge
 * kauft nichts davon — es kauft einen Durchlauf. Sie dort einzuhängen hiesse, an einer
 * Route zu schrauben, durch die heute echtes Geld von sechs laufenden Produkten fliesst.
 * Hausregel: die dürfen nicht angehen.
 *
 * ZWEI SCHRITTE, UND DER ZWEITE IST DER WICHTIGE:
 *  · `start`  — eröffnet die Kassensitzung, eingebettet in unsere Seite.
 *  · `einloesen` — fragt STRIPE, ob wirklich bezahlt wurde, und schreibt erst dann gut.
 *
 * DER BROWSER SAGT NIE, DASS BEZAHLT WURDE. Er nennt nur die Sitzungsnummer; ob daran Geld
 * hängt, beantwortet Stripe. Andernfalls wäre der Preis eine Bitte.
 */

export const dynamic = "force-dynamic";

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try { body = (await request.json()) as Record<string, unknown>; } catch { /* leer */ }

  const was = str(body.was, 20);
  const geraet = str(body.device, 80);
  if (!geraet) return NextResponse.json({ error: "Dieses Gerät lässt sich nicht zuordnen." }, { status: 400 });

  /* ── EINLÖSEN ── */
  if (was === "einloesen") {
    const sitzung = str(body.sessionId, 200);
    if (!sitzung) return NextResponse.json({ error: "Keine Sitzung angegeben." }, { status: 400 });
    if (!stripeConfigured()) return NextResponse.json({ error: "Die Kasse ist nicht eingerichtet." }, { status: 503 });
    try {
      const s = await getCheckoutSession(sitzung);
      const bezahlt = s.paymentStatus === "paid" || s.paymentStatus === "no_payment_required";
      if (!bezahlt) return NextResponse.json({ bezahlt: false });
      /**
       * DIE SITZUNG MUSS ZU DIESEM GERÄT GEHÖREN. Sonst könnte jemand eine fremde,
       * öffentlich gewordene Sitzungsnummer einreichen und sich auf fremde Rechnung
       * gutschreiben lassen.
       */
      if (str(s.metadata?.kind, 40) !== "versusforge-analyse") {
        return NextResponse.json({ error: "Diese Zahlung gehört nicht hierher." }, { status: 400 });
      }
      if (str(s.metadata?.device, 80) !== geraet) {
        return NextResponse.json({ error: "Diese Zahlung gehört zu einem anderen Gerät." }, { status: 400 });
      }
      /**
       * DOPPELT EINLÖSEN VERHINDERN: Wer die Seite mit derselben Sitzungsnummer neu lädt,
       * bekäme sonst jedes Mal einen Durchlauf geschenkt. Die Nummer wird als verbraucht
       * abgelegt, bevor gutgeschrieben wird.
       */
      const { einmalig } = await import("@/lib/versusforge-guthaben-sperre");
      if (!(await einmalig(sitzung))) {
        return NextResponse.json({ bezahlt: true, schon: true, offen: await guthabenLesen(geraet) });
      }
      const offen = await guthabenDazu(geraet, 1);
      return NextResponse.json({ bezahlt: true, offen });
    } catch (e) {
      console.error("[versusforge-kasse] Einlösen fehlgeschlagen", e);
      return NextResponse.json({ error: "Die Zahlung liess sich gerade nicht prüfen." }, { status: 502 });
    }
  }

  /* ── STARTEN ── */

  /**
   * DER EIGENE KAUFWEG WIRD NICHT MIT ECHTEM GELD GEPRÜFT (08.09.2026, beim ersten Messen
   * aufgefallen: Die Kasse lieferte eine `cs_live_`-Sitzung — jeder Testkauf hätte 9,99 €
   * gekostet).
   *
   * Mit gültiger Admin-PIN wird sofort gutgeschrieben, ohne Kasse. Dieselbe Umgehung hat der
   * David-Trichter (`components/DavidAngebote.tsx`).
   *
   * UND DIE WARNUNG DAZU, weil sie im Haus schon einmal Geld gekostet hat
   * ([[admin-testet-den-kaufweg-nicht]]): Wer so testet, prüft ALLES ausser der Kasse. Bevor
   * der Weg für Fremde freigegeben wird, muss er einmal ohne PIN durchlaufen sein — sonst
   * ist ausgerechnet die Stelle ungeprüft, an der das Geld fliesst.
   */
  if (adminPinMatches(request)) {
    const offen = await guthabenDazu(geraet, 1);
    console.warn("[versusforge-kasse] ADMIN — ohne Zahlung gutgeschrieben, Stand:", offen);
    return NextResponse.json({ adminFrei: true, offen });
  }

  if (!stripeConfigured()) return NextResponse.json({ error: "Die Kasse ist nicht eingerichtet." }, { status: 503 });

  const origin = new URL(request.url).origin;
  /* Nur eigene Pfade als Rückweg — eine fremde Adresse hier wäre eine offene Weiterleitung. */
  const zurueck = str(body.returnTo, 300).startsWith("/") ? str(body.returnTo, 300) : "/themes/versusforge/start";

  try {
    const { id, url, clientSecret } = await createTryonCheckout({
      amount: VERSUSFORGE_ANALYSE_CENTS,
      currency: "eur",
      productName: "VersusForge — eine weitere Analyse",
      successUrl: `${origin}${zurueck}${zurueck.includes("?") ? "&" : "?"}vf_kasse={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}${zurueck}`,
      /* Das Gerät steht in den Angaben der Sitzung — nur so kann das Einlösen später
         prüfen, WEM die Zahlung gehört. */
      metadata: { kind: "versusforge-analyse", device: geraet },
      ...(body.eingebettet ? { eingebettet: true as const } : {}),
    });
    return NextResponse.json({ sessionId: id, url, clientSecret });
  } catch (e) {
    console.error("[versusforge-kasse] Start fehlgeschlagen", e);
    return NextResponse.json({ error: "Die Kasse liess sich gerade nicht öffnen." }, { status: 502 });
  }
}
