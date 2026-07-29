import { NextResponse } from "next/server";
import { getCheckoutSession, stripeConfigured } from "@/lib/stripe";
import { grantMonthlySubscriptionCredits, grantVideoCredits, readTryThisLookState, saveTryThisLookState, readKissLog, writeKissLog } from "@/lib/try-this-look-store";

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

    // THEMEN-ABO (chat/holiday/wetter/…): schreibt dem Kaeufer die 5 Videos des Monats gut.
    // Das Abo gilt themenuebergreifend — ein Guthaben, egal in welchem Thema er generiert.
    if (paid && /-abo$/.test(String(s.metadata.kind ?? ""))) {
      const email = (s.customerEmail || s.clientReferenceId || "").trim().toLowerCase();
      if (email) {
        try { await grantMonthlySubscriptionCredits(email); }
        catch (e) { console.warn("[checkout-status] Monatsguthaben fehlgeschlagen", e); }
      }
    }

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
    // Creator paid $9.99 to CLAIM a unique AI face → book it to her (once-only, idempotent).
    if (paid && s.metadata.kind === "avatar-face") {
      const faceId = String(s.metadata.faceId ?? "").trim();
      const curatorId = String(s.metadata.curatorId ?? s.clientReferenceId ?? "").trim();
      if (faceId && curatorId) {
        const st = await readTryThisLookState();
        const face = (st.avatarFaces ?? []).find(f => f.id === faceId);
        if (face && (!face.claimedBy || face.claimedBy === curatorId)) {
          face.claimedBy = curatorId; face.claimedAt = face.claimedAt || new Date().toISOString();
          const cur = (st.curators ?? []).find(c => c.id === curatorId);
          let creatorEmail = "";
          if (cur) { (cur as any).avatarFaceId = faceId; creatorEmail = String((cur as any).email ?? "").trim().toLowerCase(); }
          await saveTryThisLookState(st);
          // Buying an AI face ($9.99) INCLUDES one free video generation (idempotent per session).
          if (creatorEmail) { const res = await grantVideoCredits(creatorEmail, sessionId, 1); credits = res.credits; }
        }
      }
    }

    // Kiss-Video bezahlt → den Log-Eintrag als bezahlt markieren (idempotent: paid bleibt true).
    if (paid && s.metadata.kind === "kiss-video") {
      const genId = String(s.metadata.genId ?? "").trim();
      if (genId) {
        try {
          const entries = await readKissLog();
          const e = entries.find(x => x.id === genId);
          if (e && e.paid !== true) { e.paid = true; await writeKissLog(entries); }
        } catch { /* Log ist Best-effort — die Freischaltung beim Kunden blockiert das nie */ }
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

    // Fan paid $3.99 for a 30-min chat pass → credit the influencer's OWNER 30% (idempotent
    // via the shared redeemed-session list). The client activates the 30-min pass on `paid`.
    let chatPassCuratorId = "";
    if (paid && s.metadata.kind === "chat-pass") {
      const curatorId = String(s.metadata.curatorId ?? s.clientReferenceId ?? "").trim();
      if (curatorId) {
        chatPassCuratorId = curatorId;
        const st = await readTryThisLookState();
        const vc = (st.videoCredits = st.videoCredits ?? { balances: {}, redeemed: [] });
        vc.redeemed = vc.redeemed ?? [];
        if (!vc.redeemed.includes(sessionId)) {
          const cur = (st.curators ?? []).find(c => c.id === curatorId) as { earningsCents?: number } | undefined;
          if (cur) {
            const sharePct = Number(process.env.MODEL_EARNING_SHARE_PCT ?? 30) || 30;
            cur.earningsCents = (cur.earningsCents ?? 0) + Math.round(399 * sharePct / 100);
          }
          vc.redeemed.push(sessionId);
          await saveTryThisLookState(st);
        }
      }
    }

    // Buyer paid the (dynamic) price to OWN an influencer → transfer ownership: set her
    // ownerEmail + purchasedAt = now (her appreciation restarts). Idempotent per session id.
    let boughtCuratorId = "", boughtOwnerEmail = "";
    if (paid && s.metadata.kind === "buy-influencer") {
      const curatorId = String(s.metadata.curatorId ?? "").trim();
      const buyer = (s.clientReferenceId || s.customerEmail || "").trim().toLowerCase();
      if (curatorId && buyer) {
        const st = await readTryThisLookState();
        const vc = (st.videoCredits = st.videoCredits ?? { balances: {}, redeemed: [] });
        vc.redeemed = vc.redeemed ?? [];
        const cur = (st.curators ?? []).find(c => c.id === curatorId) as any;
        if (cur && !vc.redeemed.includes(sessionId)) {
          // Only claim if still unowned (or already this buyer) — never steal an owned model.
          if (!cur.ownerEmail || cur.ownerEmail === buyer) {
            cur.ownerEmail = buyer;
            cur.purchasedAt = new Date().toISOString();
          }
          vc.redeemed.push(sessionId);
          await saveTryThisLookState(st);
        }
        if (cur) { boughtCuratorId = curatorId; boughtOwnerEmail = String(cur.ownerEmail ?? ""); }
      }
    }

    // Fan paid to SUPER FOLLOW → record the follow (→ +$1 to her LB-Value) + credit her owner.
    // Idempotent per session id AND per (follower × influencer) so it can't double-add.
    let superFollowCuratorId = "";
    if (paid && s.metadata.kind === "super-follow") {
      const curatorId = String(s.metadata.curatorId ?? "").trim();
      const followerId = String(s.metadata.followerId ?? s.clientReferenceId ?? "").trim();
      if (curatorId && followerId) {
        superFollowCuratorId = curatorId;
        const st = await readTryThisLookState();
        const vc = (st.videoCredits = st.videoCredits ?? { balances: {}, redeemed: [] });
        vc.redeemed = vc.redeemed ?? [];
        if (!vc.redeemed.includes(sessionId)) {
          // Super Follow uses the shared $4.99/mo membership — record the follow (→ +$1 to her
          // LB-Value + unlocks her private videos for this fan). Membership revenue is platform.
          const follows = (st.follows = st.follows ?? []);
          const already = follows.some((f: any) => f.followeeType === "user" && f.followeeSlug === curatorId && f.followerId === followerId);
          if (!already) {
            follows.push({ id: `follow-${sessionId}`, followerId, followeeSlug: curatorId, followeeType: "user", createdAt: new Date().toISOString() } as any);
          }
          vc.redeemed.push(sessionId);
          await saveTryThisLookState(st);
        }
      }
    }

    return NextResponse.json({
      paid,
      // E-Mail der Zahlung: damit die Seite den Kunden nach der Rückkehr kennt und ihn
      // seinem Guthaben zuordnen kann (er hat sich ja nirgends angemeldet).
      email: (s.customerEmail || s.clientReferenceId || "").trim().toLowerCase() || undefined,
      status: s.status,
      tier: s.metadata.tier ?? "",
      lookId: s.metadata.lookId ?? "",
      kind: s.metadata.kind ?? "",
      ...(chatPassCuratorId ? { chatPassCuratorId } : {}),
      ...(boughtCuratorId ? { boughtCuratorId, boughtOwnerEmail } : {}),
      ...(superFollowCuratorId ? { superFollowCuratorId } : {}),
      ...(credits !== undefined ? { credits } : {}),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not verify payment." }, { status: 502 });
  }
}
