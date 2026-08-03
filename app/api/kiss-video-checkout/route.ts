import { NextResponse } from "next/server";
import { topicPriceId, standardCoupon, ONCE_CENTS, EXTRA_VIDEO_CENTS, TOPUP_CENTS, LINGERIE_CENTS } from "@/lib/pricing";
import { guthabenAbbuchen } from "@/lib/try-this-look-store";
import { bezahltVermerken, lieferungAnstossen } from "@/lib/kiss-delivery";
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
  const body = (await request.json().catch(() => ({}))) as { genId?: string; subId?: string; returnTo?: string; once?: boolean; extra?: boolean; email?: string; aufladen?: boolean; lingerie?: boolean };
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
  /**
   * EIN VIDEO MEHR, ZUM ABO-PREIS (Owner 30.07.2026: „kann er dann weiter Videos kaufen für
   * 3,99?"). Für den, dessen Monatskontingent aufgebraucht ist — kein zweites Abo, kein
   * voller Einzelpreis.
   *
   * `kind: "model-video"` ist bewusst wiederverwendet: `/api/checkout-status` schreibt bei
   * diesem Kennzeichen genau EIN Video-Guthaben auf die mitgegebene Adresse gut, idempotent
   * je Kassensitzung. Ein eigener Zweig würde dieselbe Logik ein zweites Mal beschreiben.
   */
  if (body.extra) {
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Email required." }, { status: 400 });
    }
    try {
      const { id, url } = await createTryonCheckout({
        amount: EXTRA_VIDEO_CENTS,
        currency: "eur",
        productName: "One more video",
        successUrl: `${back}${back.includes("?") ? "&" : "?"}paid=1&extra=1&cs={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${back}${back.includes("?") ? "&" : "?"}cancelled=1`,
        metadata: { kind: "model-video", email, ...(genId ? { genId } : {}) },
      });
      return NextResponse.json({ url, sessionId: id });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
    }
  }

  /**
   * KONTO AUFLADEN — 9,99 (Owner 01.08.2026, Variante B: Zusatzangebot; der Einzelkauf
   * bleibt). Die Rueckkehr traegt `topup=1`, NICHT `paid=1`: Eine Aufladung ist kein
   * Videokauf — sie darf weder den Eintrag als bezahlt stempeln noch ein Video anstossen.
   * Das erledigt der Trichter danach selbst, indem er den Einzelkauf wiederholt, der nun
   * aus dem Guthaben bezahlt wird.
   */
  if (body.aufladen) {
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Email required." }, { status: 400 });
    }
    try {
      const { id, url } = await createTryonCheckout({
        amount: TOPUP_CENTS,
        currency: "eur",
        productName: "Account credit",
        successUrl: `${back}${back.includes("?") ? "&" : "?"}topup=1&cs={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${back}${back.includes("?") ? "&" : "?"}cancelled=1`,
        metadata: { kind: "aufladung", email, cents: String(TOPUP_CENTS), ...(genId ? { genId } : {}) },
      });
      return NextResponse.json({ url, sessionId: id });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
    }
  }

  if (body.once) {
    /**
     * ERST DAS GUTHABEN, DANN STRIPE (Variante B). Wer aufgeladen hat, zahlt hier ohne
     * Kasse: abbuchen (idempotent je genId — ein Doppelklick bucht nie zweimal), den
     * Eintrag als bezahlt stempeln, die Server-Lieferung vormerken, fertig. Der Trichter
     * behandelt `walletPaid` wie eine bestaetigte Zahlung.
     */
    /**
     * LINGERIE KOSTET MEHR (Owner 03.08.2026: „das kostet 3,99 … die Frau mit FASHN
     * anziehen und dann in Video umwandeln"): Der Aufpreis bezahlt den FASHN-Lauf VOR dem
     * Pixverse-Lauf. Der Trichter meldet die Wahl mit; der Preis selbst kommt wie immer aus
     * der Preistabelle. Der Abbuchungs-Schluessel traegt die Wahl mit, damit derselbe
     * Eintrag erst ein normales und spaeter ein Lingerie-Video kaufen kann — sonst hielte
     * die Idempotenz den zweiten, teureren Kauf faelschlich fuer den Doppelklick des ersten.
     */
    const preis = body.lingerie === true ? LINGERIE_CENTS : ONCE_CENTS;
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
    if (email && genId) {
      try {
        const ab = await guthabenAbbuchen(email, `wallet-${genId}${body.lingerie ? "-lingerie" : ""}`, preis);
        if (ab.ok) {
          await bezahltVermerken(genId, email, "kiss-video");
          lieferungAnstossen(origin, genId);
          return NextResponse.json({ walletPaid: true, rest: ab.rest });
        }
      } catch { /* Guthaben-Weg kaputt → normale Kasse, der Kunde merkt nichts */ }
    }
    try {
      const { id, url } = await createTryonCheckout({
        amount: preis,
        currency: "eur",
        productName: body.lingerie ? "Kiss lingerie video — one-off" : "Kiss video — one-off",
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
