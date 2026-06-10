import { addCreditsToLedger } from "@/lib/billing";
import { addPurchasedCredits } from "@/lib/credits-store";
import crypto from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// How many try-on credits does each Stripe purchase give?
const CREDITS_PER_PURCHASE = Number(process.env.STRIPE_CREDITS_PER_PURCHASE ?? 10);

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const accountId = String(session.client_reference_id ?? "").trim();

    if (!accountId) {
      console.warn("[stripe-webhook] checkout.session.completed without client_reference_id — credits not assigned.");
      return NextResponse.json({ received: true });
    }

    // Persist to disk + update live in-memory ledger
    const newTotal = addPurchasedCredits(accountId, CREDITS_PER_PURCHASE);
    addCreditsToLedger(accountId, CREDITS_PER_PURCHASE);

    console.info(`[stripe-webhook] +${CREDITS_PER_PURCHASE} credits → ${accountId} (total purchased: ${newTotal})`);
  }

  return NextResponse.json({ received: true });
}
