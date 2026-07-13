import { NextResponse } from "next/server";
import { createTryonCheckout, stripeConfigured } from "@/lib/stripe";
import { readTryThisLookState } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// $9.99 to CLAIM a unique AI face from the library. Opens in a popup; the page polls
// /api/checkout-status, which books the face to her (kind:"avatar-face") on success.
// Price is fixed server-side; the face must still be FREE at checkout time.
const PRICE_CENTS = 999;

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as { faceId?: string; curatorId?: string } | null;
  const faceId = String(body?.faceId ?? "").trim();
  const curatorId = String(body?.curatorId ?? "").trim();
  if (!faceId || !curatorId) return NextResponse.json({ error: "faceId + curatorId required." }, { status: 400 });

  const state = await readTryThisLookState();
  const face = (state.avatarFaces ?? []).find(f => f.id === faceId);
  if (!face) return NextResponse.json({ error: "Face not found." }, { status: 404 });
  if (face.claimedBy && face.claimedBy !== curatorId) return NextResponse.json({ error: "This face is already booked.", alreadyClaimed: true }, { status: 409 });

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  try {
    const { id, url } = await createTryonCheckout({
      amount: PRICE_CENTS,
      currency: "usd",
      productName: "LuxuryBandit — your unique influencer face",
      successUrl: `${origin}/pay-done?paid=1`,
      cancelUrl: `${origin}/pay-done?cancelled=1`,
      clientReferenceId: curatorId,
      metadata: { kind: "avatar-face", faceId, curatorId },
    });
    return NextResponse.json({ url, sessionId: id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}
