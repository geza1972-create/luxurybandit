import { NextResponse } from "next/server";
import { GEBURTSTAG_CENTS } from "@/lib/pricing";
import { createTryonCheckout, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Geburtstagsvideo = EINZELKAUF 3,99 € (Owner-Entscheidung) — bewusst NICHT das 24-€-Abo:
// so ein Video verschenkt man einmal, dafür schließt niemand ein Abo ab.
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
const PRICE_CENTS = GEBURTSTAG_CENTS;

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { genId?: string; returnTo?: string };
  const genId = String(body?.genId ?? "").trim();
  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const back = String(body?.returnTo ?? "").startsWith("/") ? `${origin}${body.returnTo}` : `${origin}/themes/birthday`;
  try {
    const { id, url } = await createTryonCheckout({
      amount: PRICE_CENTS,
      currency: "eur",
      productName: "LuxuryBandit — birthday video",
      successUrl: `${back}${back.includes("?") ? "&" : "?"}paid=1`,
      cancelUrl: `${back}${back.includes("?") ? "&" : "?"}cancelled=1`,
      metadata: { kind: "birthday-video", ...(genId ? { genId } : {}) },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
