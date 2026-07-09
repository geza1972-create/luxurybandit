import crypto from "crypto";
import { NextResponse } from "next/server";

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const kind = String((session.metadata as Record<string, unknown> | undefined)?.kind ?? "") || "subscription/other";
    const ref = String(session.client_reference_id ?? "").trim();
    // Log-only — fulfilment happens client-side (checkout-status) or via PremiumSync.
    console.info(`[stripe-webhook] checkout.session.completed (${kind}) — ${session.id}${ref ? ` · ${ref}` : ""} · no action (fulfilled elsewhere)`);
  }

  return NextResponse.json({ received: true });
}
