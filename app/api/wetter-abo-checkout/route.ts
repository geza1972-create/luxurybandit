import { NextResponse } from "next/server";
import { couponFor } from "@/lib/promo";
import { topicPriceId, standardCoupon } from "@/lib/pricing";
import { createSubscriptionCheckout } from "@/lib/stripe";
import { readWetterSubscribers } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";
// Wetter-Abo = 24 €/Monat (Owner-Preis in Stripe). Env überschreibt, sonst dieser Fallback.
const PRICE_ID = topicPriceId();

// POST { subId, modelId?, modelSlug? } → startet das 24-€-Abo (Stripe Checkout, mode:subscription).
// Nach Zahlung markiert der Stripe-Webhook den Abonnenten als „paid" → Chat + Video wieder frei.
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    subId?: string; modelId?: string; modelSlug?: string; code?: string; email?: string; returnTo?: string;
  };
  const subId = String(body.subId ?? "").trim();
  const modelId = String(body.modelId ?? "").trim() || BELLA_ID;
  const modelSlug = String(body.modelSlug ?? "").trim() || "bella";

  // ZWEI WEGE hierher:
  //  a) aus der Wetter-Seite: `subId` ist bekannt, die E-Mail steht im Datensatz
  //  b) ohne Abonnenten-Datensatz (z. B. direkt von einer Themenseite): nur die E-Mail
  const sub = subId ? (await readWetterSubscribers(modelId)).find(s => s.id === subId) : undefined;
  const email = (sub?.email || String(body.email ?? "")).trim();
  if (!subId && !email) return NextResponse.json({ error: "subId oder E-Mail nötig." }, { status: 400 });

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const back = subId
    ? `${origin}/themes/wetter/${encodeURIComponent(modelSlug)}?s=${encodeURIComponent(subId)}`
    : `${origin}${String(body.returnTo ?? "").startsWith("/") ? body.returnTo : "/themes/wetter/bella"}`;

  try {
    const { id, url } = await createSubscriptionCheckout({
      priceId: topicPriceId(),
      email: email || undefined,
      coupon: couponFor(String((body as { code?: string })?.code ?? "")) ?? standardCoupon(),
      successUrl: subId ? `${back}&wetterpaid=1&cs={CHECKOUT_SESSION_ID}` : `${back}${back.includes("?") ? "&" : "?"}paid=1&cs={CHECKOUT_SESSION_ID}`,
      cancelUrl: subId ? `${back}&wettercancelled=1` : `${back}${back.includes("?") ? "&" : "?"}cancelled=1`,
      metadata: { kind: "wetter-abo", ...(subId ? { subId } : {}), modelId },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
