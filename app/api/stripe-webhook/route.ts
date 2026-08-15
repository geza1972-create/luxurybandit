import crypto from "crypto";
import { NextResponse } from "next/server";
import { enrollWetter } from "@/lib/wetter-enroll";
import { setWetterPaid, grantMonthlySubscriptionCredits } from "@/lib/try-this-look-store";
import { bezahltVermerken, lieferungAnstossen } from "@/lib/kiss-delivery";
import { capiKaufMelden } from "@/lib/meta-capi";

export const runtime = "nodejs";

// NOTE: this webhook no longer grants credits. Every paid flow is fulfilled elsewhere:
//   • per-try-on payments  → client polls /api/checkout-status on return
//   • the (retired) $8 pack → client polled /api/checkout-status too
//   • Premium subscription → pull-based: PremiumSync → /api/premium →
//     grantMonthlySubscriptionCredits (see [premium-subscription] memory)
// The old branch here wrote CREDITS_PER_PURCHASE into lib/credits-store, a ledger nothing
// reads, so a subscriber got phantom credits that never surfaced. Kept as a verified,
// logging-only endpoint (safe to point Stripe at) — no credit writes.

function verifyStripeSignature(rawBody: string, header: string, secret: string): boolean {
  try {
    const parts = header.split(",");
    const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
    const signatures = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
    if (!timestamp || signatures.length === 0) return false;

    // Reject if timestamp is more than 5 minutes old
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    return signatures.some((sig) => {
      try {
        return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set.");
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";

  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    console.warn("[stripe-webhook] Invalid signature.");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  /**
   * DIE VERLAENGERUNG (Owner 30.07.2026: „bekommt er dann nach 30 Tagen 5 videos wieder bei
   * abo zahlung?").
   *
   * Bisher: nein. Gutgeschrieben wurde nur bei der Rueckkehr von einer Kasse — bei der
   * automatischen Verlaengerung kommt niemand zurueck, es gibt keine Kassensitzung, und der
   * Abonnent stand im neuen Monat mit leeren Haenden da. Stripe meldet die bezahlte Rechnung;
   * genau daran haengt jetzt die Gutschrift. Idempotent je Kalendermonat und Adresse, also
   * schadet auch ein doppelt zugestelltes Ereignis nicht.
   */
  if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
    const inv = event.data.object as { customer_email?: string; billing_reason?: string };
    const mail = String(inv?.customer_email ?? "").trim().toLowerCase();
    if (mail) {
      try {
        const stand = await grantMonthlySubscriptionCredits(mail);
        console.info(`[stripe-webhook] ${event.type} (${inv?.billing_reason ?? "?"}) → Monatsguthaben fuer ${mail}: ${stand}`);
      } catch (e) { console.warn("[stripe-webhook] Monatsguthaben fehlgeschlagen", e); }
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const meta = (session.metadata as Record<string, unknown> | undefined) ?? {};
    const kind = String(meta?.kind ?? "") || "subscription/other";
    const ref = String(session.client_reference_id ?? "").trim();
    // Wetter-Abo (24 €): Abonnenten als zahlend markieren → Chat + Video wieder frei.
    if (kind === "wetter-abo") {
      const subId = String(meta?.subId ?? "").trim();
      const modelId = String(meta?.modelId ?? "").trim() || undefined;
      if (subId) {
        try { await setWetterPaid(subId, modelId); console.info(`[stripe-webhook] wetter-abo bezahlt → freigeschaltet: ${subId}`); }
        catch (e) { console.warn("[stripe-webhook] setWetterPaid fehlgeschlagen", e); }
      }
    } else {
      // Log-only — fulfilment happens client-side (checkout-status) or via PremiumSync.
      console.info(`[stripe-webhook] checkout.session.completed (${kind}) — ${session.id}${ref ? ` · ${ref}` : ""} · no action (fulfilled elsewhere)`);
    }

    /**
     * DAS BEZAHLTE KISS-VIDEO — hier ist der einzige Weg, der auch dann noch funktioniert,
     * wenn der Kunde seinen Browser geschlossen hat (Owner 30.07.2026: „nach dem ich bezahlt
     * habe ist nichts passiert, der Kunde wurde ausgeraubt").
     *
     * Wir merken den Auftrag vor und stoßen die Lieferung an; gerendert und verschickt wird in
     * `/api/kiss-deliver`, damit Stripe nicht auf ein Video wartet. Kommt der Kunde doch
     * zurück, macht `/api/checkout-status` denselben Vermerk — doppelt schadet nicht.
     */
    /**
     * EINE AUFLADUNG IST KEIN KAUF (07.08.2026).
     *
     * Genau diese Weiche steht seit dem 03.08. in `/api/checkout-status` und war hier nie
     * nachgezogen — mit ihrer eigenen Begründung, wörtlich: „Die Aufladung traegt eine genId
     * (damit der Trichter danach weiss, welches Video er vom Guthaben kaufen soll), aber sie
     * IST kein Videokauf. Ohne diese Weiche wuerde die 9,99-Aufladung den Eintrag als bezahlt
     * stempeln und ein Gratis-Video anstossen."
     *
     * DER WEBHOOK IST DER SCHLIMMERE ORT DAFÜR, denn er feuert IMMER — auch wenn der Kunde
     * nie zurückkommt, und genau dafür gibt es ihn. Zwei Schäden nebeneinander:
     *
     *   1. Wer auflädt, bekommt das Geschenk umsonst: Der Auftrag steht auf bezahlt, und
     *      `lieferungAnstossen` rendert und verschickt es. Bezahlt ist damit gar nichts —
     *      das Geld liegt auf dem KONTO, abgebucht wurde nie.
     *   2. `paidKind` bleibt leer (der Stempel setzt es nur bei „kiss-video"). Ein solcher
     *      Auftrag gilt in `/api/generate-tryon-video` als ABO-Auftrag und wird mit „Your 5
     *      videos for this month are used up." abgewiesen — einem Satz ohne jeden Sinn für
     *      jemanden, der gerade aufgeladen hat.
     *
     * SICHTBAR AM 07.08.2026 im Auftragsprotokoll: zwei Urlaubs-Aufträge um 14:01, 23
     * Sekunden auseinander — der erste ohne `paidKind` (dieser Weg, die Aufladung), der
     * zweite mit „once" (der echte Kauf vom Guthaben danach).
     *
     * Die Gutschrift der Aufladung selbst passiert unverändert in `/api/checkout-status`,
     * idempotent über die Sitzungskennung.
     */
    const kissGenId = kind === "aufladung" ? "" : String(meta?.genId ?? "").trim();
    if (kissGenId) {
      const mail = String((session.customer_details as { email?: string } | undefined)?.email ?? session.customer_email ?? "");
      try {
        /* Stripes `amount_total` ist der Betrag NACH Rabatt — genau das, was er bezahlt hat. */
        const gezahltCents = Number((session as { amount_total?: number }).amount_total ?? 0) || 0;
        await bezahltVermerken(kissGenId, mail, kind, new URL(request.url).origin, gezahltCents);
        lieferungAnstossen(new URL(request.url).origin, kissGenId);
        console.info(`[stripe-webhook] kiss-Auftrag vorgemerkt (${kind}) — ${kissGenId}`);
      } catch (e) { console.warn("[stripe-webhook] kiss-Auftrag konnte nicht vorgemerkt werden", e); }
    }

    // JEDER Kunde — egal welches Thema, Abo oder Einzelkauf — kommt in die Wetter-Liste und
    // bekommt die Tagespost (Owner). Abgemeldete werden dabei nicht reaktiviert.
    const buyerEmail = String((session.customer_details as { email?: string } | undefined)?.email ?? session.customer_email ?? "").trim();
    const buyerName = String((session.customer_details as { name?: string } | undefined)?.name ?? "").trim();

    /**
     * DER KAUF AN META — VOM SERVER AUS (15.08.2026, Owner: „ok").
     *
     * Bisher meldete nur der Browser; wer den Tab schloss oder einen Werbeblocker fährt, kam
     * in Metas Zahlen nie vor. Hier ist der Kauf bewiesen — Stripe hat abgerechnet.
     *
     * DIE AUFLADUNG IST AUCH HIER KEIN KAUF. Dieselbe Weiche wie zwei Bildschirme weiter oben
     * und dieselbe wie seit heute im Pixel: Wer Guthaben lädt, kauft noch nichts. Gekauft
     * wird das Geschenk, das er gleich danach vom Guthaben nimmt — und das laeuft NICHT ueber
     * Stripe, meldet sich also allein ueber das Browser-Pixel. Ohne diese Zeile zaehlte Meta
     * die Aufladung UND das Geschenk, also wieder zwei Kaeufe fuer einen Kunden.
     *
     * `session.id` als `event_id`: Der Trichter sendet dieselbe Kennung als `eventID` ans
     * Pixel (siehe `logTunnelEvent`), damit Meta beide Meldungen zu EINEM Kauf zusammenlegt.
     */
    /**
     * OHNE ZUSTIMMUNG KEINE MELDUNG. Die Conversions API umgeht das Cookie-Banner technisch —
     * rechtlich umgeht sie gar nichts (DSGVO/ePrivacy). Der Trichter legt deshalb bei jeder
     * Kasse `einwilligung` in die Stripe-Sitzung; fehlt das Feld (aeltere Sitzung, ein noch
     * nicht angeschlossener Weg wie Chat oder Gutschein), gilt NEIN. Lieber zu wenig melden
     * als ungefragt — zu wenig kostet Optimierung, ungefragt kostet mehr.
     */
    if (kind !== "aufladung" && String(meta?.einwilligung ?? "") === "1") {
      try {
        const ergebnis = await capiKaufMelden({
          eventId: String(session.id ?? ""),
          email: buyerEmail,
          cents: Number((session as { amount_total?: number }).amount_total ?? 0) || 0,
          produkt: String(meta?.theme ?? meta?.produkt ?? "") || kind,
          quelle: new URL(request.url).origin,
        });
        console.info(`[stripe-webhook] Meta-CAPI Kauf (${kind}) — ${session.id} → ${ergebnis}`);
      } catch (e) { console.warn("[stripe-webhook] Meta-CAPI fehlgeschlagen", e); }
    }

    if (buyerEmail) {
      try {
        const r = await enrollWetter({ email: buyerEmail, name: buyerName, note: kind });
        console.info(`[stripe-webhook] wetter enroll (${kind}) ${buyerEmail} → ${r}`);
      } catch (e) { console.warn("[stripe-webhook] wetter enroll fehlgeschlagen", e); }
    }
  }

  return NextResponse.json({ received: true });
}
