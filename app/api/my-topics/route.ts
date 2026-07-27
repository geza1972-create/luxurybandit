import { NextResponse } from "next/server";
import { listTopicSubscriptions, cancelSubscription, stripeConfigured } from "@/lib/stripe";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * „Meine Themen" — die Themen-Abos EINES Nutzers, direkt aus Stripe (Quelle der Wahrheit,
 * kein zweiter Datenstand, der auseinanderlaufen kann).
 *
 * Wer darf was sehen? Nur die eigene Adresse. Die E-Mail kommt aus dem Login-Token
 * (Supabase). Ohne Token gibt es NICHTS zurück — sonst könnte jeder mit einer fremden
 * Adresse nachsehen, wer was abonniert hat, und Abos kündigen.
 */

export async function GET(request: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });
  const user = await getSellerFromRequest(request);
  const email = (user?.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Please sign in first.", signedIn: false }, { status: 401 });
  try {
    const subs = await listTopicSubscriptions(email);
    return NextResponse.json({ signedIn: true, email, subs });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load your topics." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });
  const user = await getSellerFromRequest(request);
  const email = (user?.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { cancel?: string };
  const id = String(body.cancel ?? "").trim();
  if (!id) return NextResponse.json({ error: "Nothing to cancel." }, { status: 400 });

  // Nur eigene Abos: erst prüfen, ob die ID zu DIESER Adresse gehört.
  const mine = await listTopicSubscriptions(email);
  if (!mine.some(s => s.id === id)) return NextResponse.json({ error: "Not your subscription." }, { status: 403 });

  try {
    // Kündigen zum Periodenende — nicht sofort. Sie hat den Monat bezahlt, sie behält ihn.
    const ok = await cancelSubscription(id);
    if (!ok) return NextResponse.json({ error: "Could not cancel. Please try again." }, { status: 502 });
    return NextResponse.json({ ok: true, subs: await listTopicSubscriptions(email) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not cancel." }, { status: 502 });
  }
}
