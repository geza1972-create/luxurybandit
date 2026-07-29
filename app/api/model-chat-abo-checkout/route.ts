import { NextResponse } from "next/server";
import { topicPriceId, standardCoupon } from "@/lib/pricing";
import { createSubscriptionCheckout } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Model-Chat-Abo = DASSELBE 24-€-Wetter-Abo (Owner-Entscheidung 2026-07-26). Env überschreibt,
// sonst dieser Fallback-Preis. Wer 24 € zahlt, chattet unbegrenzt mit dem Model (Stripe sammelt
// die E-Mail selbst; hier gibt es keine vorab bekannte Adresse).
// Ein Preis fuer alle Themen (lib/pricing): 49 EUR/Monat. Die alte 24-EUR-ID ist raus.
const PRICE_ID = topicPriceId();

// POST { curatorId, returnPath? } → startet das 24-€-Abo (Stripe Checkout, mode:subscription).
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { curatorId?: string; returnPath?: string };
  const curatorId = String(body.curatorId ?? "").trim();
  if (!curatorId) return NextResponse.json({ error: "curatorId fehlt." }, { status: 400 });

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const rp = String(body.returnPath ?? `/curator/${curatorId}`).trim();
  const back = `${origin}${rp.startsWith("/") ? rp : `/${rp}`}`;
  const sep = back.includes("?") ? "&" : "?";

  try {
    const { id, url } = await createSubscriptionCheckout({
      priceId: PRICE_ID,
      // 50 % dauerhaft für JEDEN (Owner 29.07.2026) — diese Kasse lief bisher als einzige
      // ohne Gutschein durch und hat volle 49 € abgebucht.
      coupon: standardCoupon(),
      successUrl: `${back}${sep}chatpaid=1&cs={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${back}${sep}chatcancelled=1`,
      metadata: { kind: "model-chat-abo", curatorId },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
