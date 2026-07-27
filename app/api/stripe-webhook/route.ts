import crypto from "crypto";
import { NextResponse } from "next/server";
import { enrollWetter } from "@/lib/wetter-enroll";
import { setWetterPaid } from "@/lib/try-this-look-store";

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

    // JEDER Kunde — egal welches Thema, Abo oder Einzelkauf — kommt in die Wetter-Liste und
    // bekommt die Tagespost (Owner). Abgemeldete werden dabei nicht reaktiviert.
    const buyerEmail = String((session.customer_details as { email?: string } | undefined)?.email ?? session.customer_email ?? "").trim();
    const buyerName = String((session.customer_details as { name?: string } | undefined)?.name ?? "").trim();
    if (buyerEmail) {
      try {
        const r = await enrollWetter({ email: buyerEmail, name: buyerName, note: kind });
        console.info(`[stripe-webhook] wetter enroll (${kind}) ${buyerEmail} → ${r}`);
      } catch (e) { console.warn("[stripe-webhook] wetter enroll fehlgeschlagen", e); }
    }
  }

  return NextResponse.json({ received: true });
}
