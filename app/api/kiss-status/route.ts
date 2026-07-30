import { NextResponse } from "next/server";
import { hasActiveSubscription, stripeConfigured } from "@/lib/stripe";
import { grantMonthlySubscriptionCredits, videoCreditBalance } from "@/lib/try-this-look-store";
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
export async function GET(request: Request) {
  const email = String(new URL(request.url).searchParams.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
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
    return NextResponse.json({ abo, left, includes: INCLUDED_VIDEOS_PER_MONTH });
  } catch {
    return NextResponse.json({ abo: false, left: 0, includes: INCLUDED_VIDEOS_PER_MONTH });
  }
}
