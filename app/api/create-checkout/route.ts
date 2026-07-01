import { NextResponse } from "next/server";
import { createTryonCheckout, stripeConfigured } from "@/lib/stripe";
import { tryonPriceCents, tierLabel, TRYON_CURRENCY, type PaidTier } from "@/lib/tryon-pricing";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import { getAccountId } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TIERS: PaidTier[] = ["photo", "video", "video360"];

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as
    | { lookId?: string; tier?: string; returnPath?: string }
    | null;
  if (!body) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const tier = body.tier as PaidTier;
  if (!VALID_TIERS.includes(tier)) return NextResponse.json({ error: "Unknown tier." }, { status: 400 });

  const lookId = String(body.lookId ?? "").trim();
  if (!lookId) return NextResponse.json({ error: "lookId required." }, { status: 400 });

  // Determine the price SERVER-SIDE from the look (never trust a client-sent amount or
  // lingerie flag): lingerie tiers cost more.
  const state = await readTryThisLookState();
  const look = state.looks.find((l) => l.id === lookId);
  if (!look) return NextResponse.json({ error: "Look not found." }, { status: 404 });
  const lingerie = (look as any).lingerie === true || (look as any).category === "boudoir";

  const amount = tryonPriceCents(tier, lingerie);
  if (amount <= 0) return NextResponse.json({ error: "This try-on is free — no payment needed." }, { status: 400 });

  // Where to send the customer back to. The client passes its own path; we bolt the
  // site origin on so success/cancel URLs are absolute and same-origin.
  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  // Checkout opens in a POPUP; the main try-on page stays alive and polls the session
  // status, so there's no full-page redirect (which would lose the user's photo/result).
  // The popup just needs a "you can close this" landing page on success/cancel.
  const successUrl = `${origin}/pay-done?paid=1`;
  const cancelUrl = `${origin}/pay-done?cancelled=1`;

  const accountId = getAccountId(request);

  try {
    const { id, url } = await createTryonCheckout({
      amount,
      currency: TRYON_CURRENCY,
      productName: `${tierLabel(tier)} — ${String((look as any).name ?? "LuxuryBandit look").slice(0, 60)}`,
      successUrl,
      cancelUrl,
      clientReferenceId: accountId,
      metadata: { tier, lookId },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
