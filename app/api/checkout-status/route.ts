import { NextResponse } from "next/server";
import { getCheckoutSession, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called when the customer returns from Stripe Checkout. Confirms the session was
// actually paid before the client unlocks the paid try-on tier.
export async function GET(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments not configured." }, { status: 503 });
  }
  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim();
  if (!sessionId) return NextResponse.json({ error: "session_id required." }, { status: 400 });

  try {
    const s = await getCheckoutSession(sessionId);
    const paid = s.paymentStatus === "paid" || s.paymentStatus === "no_payment_required";
    return NextResponse.json({
      paid,
      status: s.status,
      tier: s.metadata.tier ?? "",
      lookId: s.metadata.lookId ?? "",
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not verify payment." }, { status: 502 });
  }
}
