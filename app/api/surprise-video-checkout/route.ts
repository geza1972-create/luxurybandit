import { NextResponse } from "next/server";
import { GESCHENK_VIDEO_CENTS, WAEHRUNG } from "@/lib/pricing";
import { createTryonCheckout, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// „Surprise him" = EINZELKAUF 3,99 € wie beim Geburtstagsvideo (Owner-Entscheidung).
// Preis serverseitig fixiert; dem Client nie vertrauen.
/**
 * DER PREIS KOMMT AUS DER TABELLE (Owner 31.07.2026: „das ist falsch. 9,99 Euro").
 *
 * Hier stand eine fest eingetippte 399. Genau das soll die Preistabelle verhindern: Wer den
 * Preis an einer Stelle aendert, aendert ihn ueberall — sonst kassiert eine vergessene Route
 * weiter den alten Betrag, und das merkt niemand, weil Stripe ja anstandslos bucht.
 *
 * 399 war ausserdem der Abo-AUFPREIS (jedes Video ueber die fuenf hinaus). Fuer einen Kauf
 * ohne Abo gilt der Einzelpreis.
 */
/* Der Tanz kostet, was jedes Geschenk-Video kostet — 4,99 € seit 10.08.2026 (Owner: „wir
   haben ab jetzt für 4,99: Geburtstag, Kuss, Tanz, Urlaub"). Eine Zahl, eine Quelle. */
const PRICE_CENTS = GESCHENK_VIDEO_CENTS;

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { returnTo?: string };
  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const back = String(body?.returnTo ?? "").startsWith("/") ? `${origin}${body.returnTo}` : `${origin}/themes/surprise`;
  try {
    const { id, url } = await createTryonCheckout({
      amount: PRICE_CENTS,
      currency: WAEHRUNG,
      productName: "LuxuryBandit — private video",
      successUrl: `${back}${back.includes("?") ? "&" : "?"}paid=1`,
      cancelUrl: `${back}${back.includes("?") ? "&" : "?"}cancelled=1`,
      metadata: { kind: "surprise-video" },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
