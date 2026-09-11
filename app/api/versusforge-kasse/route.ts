import { NextResponse } from "next/server";
import { createSubscriptionCheckout, createTryonCheckout, getCheckoutSession, stripeConfigured } from "@/lib/stripe";
import { VERSUSFORGE_ABO_PRICE_ID, VERSUSFORGE_ANALYSE_CENTS, VERSUSFORGE_START_CENTS } from "@/lib/pricing";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { guthabenDazu, guthabenLesen } from "@/lib/versusforge-guthaben";
import { adminPinMatches } from "@/lib/admin-auth";
import { VF_KAUF_PROBE } from "@/lib/versusforge-schalter";
import crypto from "node:crypto";

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

  /**
   * ── DAS DASHBOARD KAUFEN (Owner 09.09.2026: „wie soll ich den scharf schalten, wenn der
   * Kunde am Ende nichts kaufen kann?") ─────────────────────────────────────────────────────
   *
   * ── WAS ICH BEIM NACHSEHEN GEFUNDEN HABE ──────────────────────────────────────────────────
   *
   * Der Knopf „Für 299 € freischalten" führte auf `/contact?reason=versusforge` — ein
   * KONTAKTFORMULAR. Die gebaute Kasse verkauft ausschliesslich die 9,99-Analyse. Das
   * teuerste Produkt des Hauses hatte keinen Kaufweg, und niemandem ist es aufgefallen,
   * weil der Knopf aussah wie einer.
   *
   * ── WAS GEKAUFT WIRD, IST EIN ZUSTAND, KEIN GUTHABEN ──────────────────────────────────────
   *
   * Die Analyse zählt Durchläufe je Gerät. Das Dashboard nicht: Es gehört einem TRICHTER, für
   * immer, egal von welchem Gerät er später hineinsieht. Deshalb wird nichts gutgeschrieben,
   * sondern `stand` auf „scharf" gesetzt — dasselbe Feld, das das Dashboard schon prüft.
   *
   * ── DER TRICHTER STEHT IN DEN ANGABEN DER SITZUNG ─────────────────────────────────────────
   *
   * Nicht das Gerät. Wer auf dem Telefon kauft und am Rechner nachsieht, ist derselbe Kunde —
   * und der Schlüssel in seiner Mail ist ohnehin die Tür. Ein Gerätevergleich hier würde
   * genau den aussperren, der gerade bezahlt hat.
   */
  if (was === "dashboard") {
    const mandant = str(body.mandant, 60);
    if (!mandant) return NextResponse.json({ error: "Kein Trichter angegeben." }, { status: 400 });
    const m = await mandantLesen(mandant);
    if (!m) return NextResponse.json({ error: "Diesen Trichter gibt es nicht." }, { status: 404 });
    if (m.stand === "scharf") return NextResponse.json({ schon: true });

    /**
     * DER PROBEKAUF (Owner 09.09.2026: „erst mal kostenlos … wenn alles klappt, dann baust du
     * Stripe ein"). Er verlangt den Dashboard-Schlüssel — nur der Besitzer hat ihn.
     */
    if (VF_KAUF_PROBE) {
      const k = str(body.k, 200);
      const soll = Buffer.from(String(m.schluessel ?? ""), "utf8");
      const ist = Buffer.from(k, "utf8");
      const passt = soll.length > 0 && soll.length === ist.length && crypto.timingSafeEqual(soll, ist);
      /**
       * DIE ABSAGE SAGT, WAS ZU TUN IST (09.09.2026, im eigenen Prüflauf gefunden).
       *
       * Auf der offenen Anzeigen-Seite kennt niemand den Dashboard-Schlüssel — auch der
       * Besitzer nicht, denn in seiner Mail steht dort ein Link OHNE Schlüssel. Er hätte
       * „gehört jemand anderem" gelesen, über seinem eigenen Trichter. Ein Fremder liest
       * denselben Satz und erfährt nichts, was er nicht ohnehin wüsste.
       */
      if (!passt) return NextResponse.json({ error: "Zum Freischalten brauchst du dein Dashboard — der Link steht in deiner E-Mail." }, { status: 403 });
      await mandantSpeichern(mandant, { ...m, stand: "scharf" });
      console.warn("[versusforge-kasse] PROBEKAUF — ohne Zahlung freigeschaltet:", mandant);
      return NextResponse.json({ probe: true });
    }

    /* Admin-Umgehung wie beim kleinen Kauf — mit derselben Warnung
       ([[admin-testet-den-kaufweg-nicht]]): Wer so freischaltet, prüft alles ausser der Kasse. */
    if (adminPinMatches(request)) {
      await mandantSpeichern(mandant, { ...m, stand: "scharf" });
      console.warn("[versusforge-kasse] ADMIN — Dashboard ohne Zahlung freigeschaltet:", mandant);
      return NextResponse.json({ adminFrei: true });
    }
    if (!stripeConfigured()) return NextResponse.json({ error: "Die Kasse ist nicht eingerichtet." }, { status: 503 });

    const origin0 = new URL(request.url).origin;
    const zurueck0 = `/versusforge/${mandant}/dashboard`;
    try {
      const { id, url, clientSecret } = await createTryonCheckout({
        amount: VERSUSFORGE_START_CENTS,
        currency: "eur",
        productName: `VersusForge — Dashboard für ${m.name}`,
        successUrl: `${origin0}${zurueck0}?k=${encodeURIComponent(m.schluessel)}&vf_kasse={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin0}${zurueck0}?k=${encodeURIComponent(m.schluessel)}`,
        metadata: { kind: "versusforge-dashboard", mandant },
        /* Seine Adresse kennen wir aus dem Trichter — sie an der Kasse noch einmal tippen zu
           lassen ist die Stelle, an der ein Kauf in zwei Hälften zerfällt. */
        ...(m.mail ? { email: m.mail } : {}),
        ...(body.eingebettet ? { eingebettet: true as const } : {}),
      });
      return NextResponse.json({ sessionId: id, url, clientSecret });
    } catch (e) {
      console.error("[versusforge-kasse] Dashboard-Start fehlgeschlagen", e);
      return NextResponse.json({ error: "Die Kasse liess sich gerade nicht öffnen." }, { status: 502 });
    }
  }

  /**
   * ── DAS ART-MARKETING-ABO (Owner 10.09.2026: „Du zahlst, wenn unser Agent für dich arbeitet und
   * du ihn behalten willst" · 10 € im Monat) ──────────────────────────────────────────────────
   *
   * DER KUNST-WEG STATT DER 299 €. Die Einmal-Kasse darüber bleibt für ein späteres anderes
   * Rezept stehen („3 behalten"). Die Regeln, was das Abo freischaltet, stehen in
   * `lib/versusforge-abo.ts`.
   *
   * ABGEBUCHT WIRD ÜBER DIE STRIPE-KENNUNG (`VERSUSFORGE_ABO_PRICE_ID`), nicht über einen Betrag —
   * bei einem Abo verlangt Stripe den angelegten Preis (Skill `bezahlung`, Regel 2).
   *
   * ZWEI WEGE ZUM „AKTIV", WIE BEIM LEBENSLAUF-ABO: Die Rückkehr des Browsers (`abo-einloesen`)
   * und der Webhook (`checkout.session.completed`, kind `versusforge-abo`). Wer den Browser nach
   * der Zahlung schliesst, ist trotzdem freigeschaltet. Die Kündigung kommt nur über den Webhook.
   */
  if (was === "abo") {
    const mandant = str(body.mandant, 60);
    if (!mandant) return NextResponse.json({ error: "Kein Künstler angegeben." }, { status: 400 });
    const m = await mandantLesen(mandant);
    if (!m) return NextResponse.json({ error: "Diesen Künstler gibt es nicht." }, { status: 404 });
    if (m.abo?.aktiv) return NextResponse.json({ schon: true });

    /* Admin-Umgehung wie bei den anderen Wegen — mit derselben Warnung
       ([[admin-testet-den-kaufweg-nicht]]): Sie prüft alles ausser der Kasse. */
    if (adminPinMatches(request)) {
      await mandantSpeichern(mandant, { ...m, abo: { aktiv: true, seit: new Date().toISOString() } });
      console.warn("[versusforge-kasse] ADMIN — Abo ohne Zahlung aktiviert:", mandant);
      return NextResponse.json({ adminFrei: true });
    }
    if (!stripeConfigured()) return NextResponse.json({ error: "Die Kasse ist nicht eingerichtet." }, { status: 503 });

    const origin1 = new URL(request.url).origin;
    const zurueck1 = `/versusforge/${mandant}/dashboard`;
    try {
      const { id, url } = await createSubscriptionCheckout({
        priceId: VERSUSFORGE_ABO_PRICE_ID,
        ...(m.mail ? { email: m.mail } : {}),
        successUrl: `${origin1}${zurueck1}?k=${encodeURIComponent(m.schluessel)}&vf_abo={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin1}${zurueck1}?k=${encodeURIComponent(m.schluessel)}`,
        /* `kind` überschreibt das „premium" der Hilfsfunktion — Webhook und Einlösen erkennen
           das Abo daran, und `mandant` sagt, WESSEN Abo es ist. */
        metadata: { kind: "versusforge-abo", mandant },
      });
      return NextResponse.json({ sessionId: id, url });
    } catch (e) {
      console.error("[versusforge-kasse] Abo-Start fehlgeschlagen", e);
      return NextResponse.json({ error: "Die Kasse liess sich gerade nicht öffnen." }, { status: 502 });
    }
  }

  /* Die Rückkehr von der Abo-Kasse — schaltet das Abo aktiv, erst nachdem Stripe es bestätigt. */
  if (was === "abo-einloesen") {
    const sitzung = str(body.sessionId, 200);
    const mandant = str(body.mandant, 60);
    if (!sitzung || !mandant) return NextResponse.json({ error: "Angaben fehlen." }, { status: 400 });
    if (!stripeConfigured()) return NextResponse.json({ error: "Die Kasse ist nicht eingerichtet." }, { status: 503 });
    try {
      const s = await getCheckoutSession(sitzung);
      /* „no_payment_required" gehört dazu: Ein 100-%-Gutschein schliesst die Sitzung ohne
         Zahlung ab (Skill `bezahlung`, Regel 6) — sonst schaltet der Test nichts frei. */
      const bezahlt = s.paymentStatus === "paid" || s.paymentStatus === "no_payment_required";
      if (!bezahlt) return NextResponse.json({ bezahlt: false });
      if (str(s.metadata?.kind, 40) !== "versusforge-abo") {
        return NextResponse.json({ error: "Diese Zahlung gehört nicht hierher." }, { status: 400 });
      }
      /* Das Abo gehört GENAU diesem Künstler — sonst schaltet eine Sitzung einen fremden frei. */
      if (str(s.metadata?.mandant, 60) !== mandant) {
        return NextResponse.json({ error: "Diese Zahlung gehört zu einem anderen Künstler." }, { status: 400 });
      }
      const m = await mandantLesen(mandant);
      if (!m) return NextResponse.json({ error: "Diesen Künstler gibt es nicht." }, { status: 404 });
      if (!m.abo?.aktiv) {
        await mandantSpeichern(mandant, { ...m, abo: { ...(m.abo ?? {}), aktiv: true, seit: m.abo?.seit ?? new Date().toISOString(), bis: undefined } });
      }
      return NextResponse.json({ bezahlt: true });
    } catch (e) {
      console.error("[versusforge-kasse] Abo-Einlösen fehlgeschlagen", e);
      return NextResponse.json({ error: "Die Zahlung liess sich gerade nicht prüfen." }, { status: 502 });
    }
  }

  /* Die Zahlung fürs Dashboard einlösen — sie schaltet den Trichter scharf. */
  if (was === "dashboard-einloesen") {
    const sitzung = str(body.sessionId, 200);
    const mandant = str(body.mandant, 60);
    if (!sitzung || !mandant) return NextResponse.json({ error: "Angaben fehlen." }, { status: 400 });
    if (!stripeConfigured()) return NextResponse.json({ error: "Die Kasse ist nicht eingerichtet." }, { status: 503 });
    try {
      const s = await getCheckoutSession(sitzung);
      const bezahlt = s.paymentStatus === "paid" || s.paymentStatus === "no_payment_required";
      if (!bezahlt) return NextResponse.json({ bezahlt: false });
      if (str(s.metadata?.kind, 40) !== "versusforge-dashboard") {
        return NextResponse.json({ error: "Diese Zahlung gehört nicht hierher." }, { status: 400 });
      }
      /* DIE ZAHLUNG GEHÖRT GENAU DIESEM TRICHTER. Ohne diesen Vergleich könnte eine Sitzung
         einen fremden Trichter freischalten — 299 € für den Nachbarn. */
      if (str(s.metadata?.mandant, 60) !== mandant) {
        return NextResponse.json({ error: "Diese Zahlung gehört zu einem anderen Trichter." }, { status: 400 });
      }
      const m = await mandantLesen(mandant);
      if (!m) return NextResponse.json({ error: "Diesen Trichter gibt es nicht." }, { status: 404 });
      if (m.stand !== "scharf") await mandantSpeichern(mandant, { ...m, stand: "scharf" });
      return NextResponse.json({ bezahlt: true });
    } catch (e) {
      console.error("[versusforge-kasse] Dashboard-Einlösen fehlgeschlagen", e);
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
  const zurueck = str(body.returnTo, 300).startsWith("/") ? str(body.returnTo, 300) : "/engine/start";

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
