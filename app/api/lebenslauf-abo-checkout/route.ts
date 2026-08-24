import { NextResponse } from "next/server";
import { createSubscriptionCheckout, getCheckoutSession } from "@/lib/stripe";
import { LEBENSLAUF_MONAT_CENTS } from "@/lib/pricing";
import { leseLebenslauf, lebenslaufAboFreischalten } from "@/lib/lebenslauf-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DAS ABO „SEITE BLEIBT ONLINE" — 4,99/MONAT (Owner-Seitentext 24.08.2026: „Seite bleibt
 * online, unbegrenzt aktualisieren, monatlich kündbar. Ohne Abo bleibt deine Seite 30 Tage
 * erreichbar.").
 *
 * POST { id, email?, returnTo? }  → startet die Stripe-Subscription-Kasse (Monatspreis
 *      inline über `price_data`, kein Dashboard-Price nötig) und gibt { url, sessionId }.
 * GET  ?id=…&session=…            → die Rückkehr-Bestätigung: prüft die Sitzung bei Stripe
 *      und schaltet das Abo am Profil frei — idempotent, dieselbe Doppelung wie überall im
 *      Haus (Browser bestätigt sofort, der Webhook fängt den geschlossenen Browser auf;
 *      Memory `paid-jobs-must-survive-the-browser`).
 *
 * Der Preis kommt aus der Tabelle (LEBENSLAUF_MONAT_CENTS, Memory
 * `prices-only-from-pricing-table`).
 */

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY missing)." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { id?: string; email?: string; returnTo?: string };
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });
  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  if (profil.aboAktiv) return NextResponse.json({ error: "Das Abo läuft bereits." }, { status: 400 });

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const zurueck = String(body.returnTo ?? "").startsWith("/") ? String(body.returnTo) : `/lebenslauf/${encodeURIComponent(id)}`;
  const back = `${origin}${zurueck}`;
  const email = String(body.email ?? profil.email ?? "").trim();

  try {
    const { id: sessionId, url } = await createSubscriptionCheckout({
      amount: LEBENSLAUF_MONAT_CENTS,
      productName: "Application page — stays online + unlimited updates",
      email: email || undefined,
      successUrl: `${back}${back.includes("?") ? "&" : "?"}abo=1&abocs={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${back}${back.includes("?") ? "&" : "?"}abocancel=1`,
      metadata: { kind: "lebenslauf-abo", lebenslaufId: id },
    });
    return NextResponse.json({ url, sessionId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not start checkout." }, { status: 502 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = String(url.searchParams.get("id") ?? "").trim();
  const session = String(url.searchParams.get("session") ?? "").trim();
  if (!id || !session) return NextResponse.json({ error: "Kennung oder Sitzung fehlt." }, { status: 400 });
  try {
    const s = await getCheckoutSession(session);
    /* NUR die Sitzung DIESES Profils darf freischalten — sonst würde irgendeine bezahlte
       fremde Sitzungskennung genügen, um ein beliebiges Profil zu aktivieren. */
    if (String(s.metadata?.lebenslaufId ?? "") !== id) return NextResponse.json({ aktiv: false });
    const bezahlt = s.paymentStatus === "paid" || s.status === "complete";
    if (!bezahlt) return NextResponse.json({ aktiv: false });
    /* Die Subscription-Kennung kennt diese Antwort nicht — der Webhook
       (checkout.session.completed) trägt sie am selben Profil nach. */
    const ok = await lebenslaufAboFreischalten(id, "");
    return NextResponse.json({ aktiv: ok });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Prüfung fehlgeschlagen." }, { status: 502 });
  }
}
