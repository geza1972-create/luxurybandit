import { NextResponse } from "next/server";
import { getCheckoutSession, stripeConfigured } from "@/lib/stripe";
import { grantVideoCredits, readTryThisLookState, saveTryThisLookState } from "@/lib/try-this-look-store";

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

    // $8 video pack → grant the credits (idempotent per session id) to the buyer email.
    let credits: number | undefined;
    if (paid && s.metadata.kind === "pack4") {
      const email = (s.clientReferenceId || s.customerEmail || "").trim().toLowerCase();
      if (email) {
        const n = Number(s.metadata.credits ?? 4) || 4;
        const res = await grantVideoCredits(email, sessionId, n);
        credits = res.credits;
      }
    }
    // Creator paid $3.99 to CLAIM a unique AI face → book it to her (once-only, idempotent).
    if (paid && s.metadata.kind === "avatar-face") {
      const faceId = String(s.metadata.faceId ?? "").trim();
      const curatorId = String(s.metadata.curatorId ?? s.clientReferenceId ?? "").trim();
      if (faceId && curatorId) {
        const st = await readTryThisLookState();
        const face = (st.avatarFaces ?? []).find(f => f.id === faceId);
        if (face && (!face.claimedBy || face.claimedBy === curatorId)) {
          face.claimedBy = curatorId; face.claimedAt = face.claimedAt || new Date().toISOString();
          const cur = (st.curators ?? []).find(c => c.id === curatorId);
          if (cur) (cur as any).avatarFaceId = faceId;
          await saveTryThisLookState(st);
        }
      }
    }

    // Model paid $3.99 for one more video → grant 1 credit to her email (idempotent).
    if (paid && s.metadata.kind === "model-video") {
      const email = (s.metadata.email || s.clientReferenceId || s.customerEmail || "").trim().toLowerCase();
      if (email) {
        const res = await grantVideoCredits(email, sessionId, 1);
        credits = res.credits;
      }
    }

    return NextResponse.json({
      paid,
      status: s.status,
      tier: s.metadata.tier ?? "",
      lookId: s.metadata.lookId ?? "",
      kind: s.metadata.kind ?? "",
      ...(credits !== undefined ? { credits } : {}),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not verify payment." }, { status: 502 });
  }
}
