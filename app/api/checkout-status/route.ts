import { NextResponse } from "next/server";
import { getCheckoutSession, stripeConfigured } from "@/lib/stripe";
import { grantMonthlySubscriptionCredits, grantVideoCredits, readTryThisLookState, saveTryThisLookState } from "@/lib/try-this-look-store";
import { bezahltVermerken, lieferungAnstossen } from "@/lib/kiss-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DIE TESTKLAPPE FÜR DEN KAUFWEG — nur auf dem Entwicklungsrechner.
 *
 * Warum es sie gibt (Owner 31.07.2026): Der Stripe-Schluessel dieses Projekts ist der
 * LIVE-Schluessel. Der Weg „bezahlt → Video kommt" liess sich deshalb nie pruefen, ohne
 * echtes Geld auszugeben — und genau darum brach er am 31.07.2026 unbemerkt: Nach der
 * Zahlung passierte nichts, „also Kunde wurde ausgeraubt. Das ist fatal."
 *
 * Ein Weg, den man nicht pruefen kann, bricht irgendwann. Und er bricht an der teuersten
 * Stelle, die es gibt — nach der Zahlung.
 *
 * DREI SCHLOESSER, und alle drei muessen offen sein:
 *   1. `LB_TEST_CHECKOUT` muss gesetzt sein. Diese Variable existiert auf Vercel NICHT und
 *      gehoert dort auch nie hinein — sie steht nur in der lokalen `.env.local`.
 *   2. `NODE_ENV` darf nicht `production` sein. Selbst wenn jemand die Variable versehentlich
 *      in die Produktion traegt, passiert nichts.
 *   3. Die Sitzungsnummer muss mit `TEST-` beginnen. Eine echte Stripe-Nummer beginnt mit
 *      `cs_`; eine echte Zahlung kann also nie in diesen Zweig geraten.
 *
 * Was hier zurueckkommt, ist genau das, was der Browser nach einer echten Zahlung sieht —
 * mehr nicht. Es wird nichts gutgeschrieben und nichts geliefert; geprueft wird der WEG,
 * nicht die Buchhaltung.
 */
const testKlappeOffen = (sessionId: string) =>
  !!process.env.LB_TEST_CHECKOUT
  && process.env.NODE_ENV !== "production"
  && sessionId.startsWith("TEST-");

// Called when the customer returns from Stripe Checkout. Confirms the session was
// actually paid before the client unlocks the paid try-on tier.
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim();
  if (!sessionId) return NextResponse.json({ error: "session_id required." }, { status: 400 });

  if (testKlappeOffen(sessionId)) {
    console.warn("[checkout-status] TESTKLAPPE — vorgetaeuschte Zahlung, nur lokal:", sessionId);
    return NextResponse.json({ paid: true, status: "complete", tier: "", lookId: "", kind: "kiss-video", test: true });
  }

  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments not configured." }, { status: 503 });
  }

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

    /**
     * KISS/IDOL BEZAHLT → Eintrag als bezahlt vermerken UND den Auftrag vormerken.
     *
     * Gilt für beide Kaufwege: den Einzelkauf (`kiss-video`) und das Abo, das aus demselben
     * Trichter startet und deshalb ebenfalls eine `genId` mitschickt.
     *
     * Die Zahlung ist die EINZIGE Stelle, an der ein anonymer Kiss-Besucher eine E-Mail
     * hinterlässt — Stripe fragt sie an der Kasse ab. Ohne diesen Vermerk ist der Käufer
     * hinterher namenlos und sein Video unauffindbar.
     *
     * `bezahltVermerken` setzt zusätzlich die Frist, ab der der SERVER das Video zu Ende
     * bringt, falls der Browser des Kunden es nicht tut (Owner: „der Kunde wurde ausgeraubt").
     */
    const kissGenId = String(s.metadata.genId ?? "").trim();
    if (paid && kissGenId) {
      try {
        await bezahltVermerken(kissGenId, String(s.customerEmail ?? ""), String(s.metadata.kind ?? ""));
        lieferungAnstossen(new URL(request.url).origin, kissGenId);
      } catch { /* Log ist Best-effort — die Freischaltung beim Kunden blockiert das nie */ }
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
