import { NextResponse } from "next/server";
import { hasActiveSubscription, stripeConfigured } from "@/lib/stripe";
import { grantMonthlySubscriptionCredits, videoCreditBalance, readGuthabenCents } from "@/lib/try-this-look-store";
import { INCLUDED_VIDEOS_PER_MONTH } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * KENNEN WIR IHN? (Owner 30.07.2026, zum Abo: „wird er dann gesperrt wenn er abo kündigt,
 * kann er überhaupt in seinem account?")
 *
 * Bis hierher war „bezahlt" im Kuss-Trichter ein Zustand der laufenden Sitzung. Wer gestern
 * ein Abo abgeschlossen hatte und heute wiederkam, war wieder ein Fremder und hätte ein
 * zweites Mal zahlen sollen. Dieser Endpunkt beantwortet die eine Frage, die dafür fehlte:
 * Läuft zu dieser Adresse ein Abo — und wie viele Videos hat er diesen Monat noch?
 *
 * NEBENBEI DIE VERLÄNGERUNG: Ist ein Abo aktiv, wird der Monat hier gutgeschrieben (idempotent
 * je Monat). Wer den Trichter öffnet, hat sein Kontingent damit sicher, auch wenn der
 * Webhook einmal nicht durchkommt.
 *
 * KEINE FREMDEN DATEN: Zurück kommen nur ja/nein und eine Zahl — kein Name, keine Bilder,
 * keine Kaufhistorie. Damit taugt der Endpunkt nicht zum Ausspähen fremder Adressen.
 */
const GUELTIG = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const email = String(params.get("email") ?? "").trim().toLowerCase();
  /**
   * DIE ZWEITE ADRESSE DIESES GERAETS (Owner 03.08.2026: „mein Kontostand zeigt 0 Euro an,
   * aber ich habe Geld drauf").
   *
   * Guthaben haengt an einer E-Mail. Welche E-Mail der Besucher gerade IST, entscheidet sich
   * aber daran, ob er angemeldet ist: Wer als Gast auflaedt (`lb_kiss_mail`) und sich danach
   * mit einem anderen Konto anmeldet, sieht 0,00 € — sein Geld liegt unberuehrt auf der
   * Gastadresse. Genau das ist dem Owner passiert (8,50 € auf der einen Adresse, angemeldet
   * mit der anderen), und einem echten Kunden liest sich das als Diebstahl.
   *
   * Hier wird nichts umgebucht — Geld zwischen Adressen zu schieben, weil ein Browser eine
   * Adresse BEHAUPTET, waere die Tuer fuer fremde Konten. Wir sagen nur, wo es liegt.
   *
   * Gefragt wird ausserdem nur, wenn das Hauptkonto WIRKLICH leer ist, und ohne zweiten
   * Stripe-Aufruf: Guthaben und Credits sind reine Zustandslesungen.
   */
  const auch = String(params.get("auch") ?? "").trim().toLowerCase();
  if (!GUELTIG.test(email)) {
    return NextResponse.json({ abo: false, left: 0, includes: INCLUDED_VIDEOS_PER_MONTH });
  }
  if (!stripeConfigured()) {
    return NextResponse.json({ abo: false, left: 0, includes: INCLUDED_VIDEOS_PER_MONTH });
  }
  try {
    const abo = await hasActiveSubscription(email);
    if (abo) await grantMonthlySubscriptionCredits(email).catch(() => 0);
    // Das Guthaben zählt auch ohne Abo: wer ein Einzelvideo für 3,99 € nachgekauft hat, hat
    // eines offen, ohne Abonnent zu sein.
    const left = await videoCreditBalance(email).catch(() => 0);
    // Das Euro-Guthaben der Aufladung (Owner 01.08.2026) — fuer die Zeile im Trichter.
    const walletCents = await readGuthabenCents(email).catch(() => 0);
    let gestrandet: { adresse: string; cents: number; links: number } | null = null;
    if (auch && auch !== email && GUELTIG.test(auch) && left <= 0 && walletCents <= 0) {
      const cents = await readGuthabenCents(auch).catch(() => 0);
      const links = await videoCreditBalance(auch).catch(() => 0);
      if (cents > 0 || links > 0) gestrandet = { adresse: auch, cents, links };
    }
    return NextResponse.json({ abo, left, includes: INCLUDED_VIDEOS_PER_MONTH, walletCents, gestrandet });
  } catch {
    return NextResponse.json({ abo: false, left: 0, includes: INCLUDED_VIDEOS_PER_MONTH });
  }
}
