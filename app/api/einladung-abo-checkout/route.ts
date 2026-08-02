import { NextResponse } from "next/server";
import { couponFor } from "@/lib/promo";
import { topicPriceId, standardCoupon } from "@/lib/pricing";
import { createSubscriptionCheckout } from "@/lib/stripe";
import { readEinladungen } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DIE ABO-KASSE DER EINLADUNG (Ä11, Owner 02.08.2026: „für 1,49 bekommt er die Einladung
 * ohne die anderen Features. Wenn er die auch nutzen will, dann muss er gleich Abo
 * abschliessen").
 *
 * Portiert aus `wetter-abo-checkout` — derselbe Preis (`topicPriceId()`, 24,50 €/Monat mit
 * dem dauerhaften 50-%-Gutschein), dieselbe Kasse, nur ein anderes `metadata.kind`. Bewusst
 * NICHT „…-abo" als Namen gewählt: `/api/checkout-status` schreibt jedem Kauf, dessen `kind`
 * auf „-abo" endet, automatisch das themenübergreifende Monatsguthaben (5 Videos) gut — das
 * ist ein ANDERES Produkt (mehr Kiss/Holiday/Wetter-Videos). Dieses Abo hier schaltet
 * Zusagen/Menü/Gruppenchat frei und hält die Einladungsseite am Laufen; „einladung-plan"
 * bleibt darum absichtlich außerhalb dieser Regel.
 *
 * Nach der Zahlung markiert `/api/checkout-status` GENAU DIESE Einladung als bezahlt
 * (`einladungAboVermerken`) — der Client behauptet das nie selbst.
 */
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { einladungId?: string; email?: string; code?: string };
  const einladungId = String(body.einladungId ?? "").trim();
  if (!einladungId) return NextResponse.json({ error: "Einladung fehlt." }, { status: 400 });

  // Nur fuer eine wirklich existierende Einladung eine Kasse oeffnen — sonst liesse sich mit
  // einer erfundenen Kennung ein Abo anlegen, das nirgends etwas freischaltet.
  const e = (await readEinladungen().catch(() => [])).find(x => x.id === einladungId);
  if (!e) return NextResponse.json({ error: "Einladung nicht gefunden." }, { status: 404 });

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const back = `${origin}/einladung/${encodeURIComponent(einladungId)}`;
  const email = (String(body.email ?? "").trim() || e.email || "").trim();

  try {
    const { id, url } = await createSubscriptionCheckout({
      priceId: topicPriceId(),
      email: email || undefined,
      coupon: couponFor(String(body.code ?? "")) ?? standardCoupon(),
      successUrl: `${back}?abopaid=1&cs={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${back}?abocancelled=1`,
      metadata: { kind: "einladung-plan", einladungId },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e2) {
    return NextResponse.json({ error: e2 instanceof Error ? e2.message : "Could not start checkout." }, { status: 502 });
  }
}
