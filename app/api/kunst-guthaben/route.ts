import { NextResponse } from "next/server";
import { kunstGuthaben, geraetSauber } from "@/lib/lakatosbandi-kunst-riegel";

/**
 * Wie viele Läufe dieses Gerät offen hat.
 *
 * ── WOZU EINE EIGENE ABFRAGE ────────────────────────────────────────────────────────────────
 *
 * Nach der Zahlung schreibt STRIPE den Betrag gut, nicht der Browser — und der Webhook braucht
 * ein paar Sekunden. Die Kachel fragt hier nach, bis das Guthaben da ist, und setzt dann die
 * Erzeugung von selbst fort ([[aufladen-setzt-den-kauf-fort]]). Ohne das müsste der Käufer
 * raten, wann er wieder drücken darf.
 *
 * Sie verrät nur eine Zahl zu einer Zufallskennung — kein Name, keine Adresse, kein Bild.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const geraet = geraetSauber(new URL(request.url).searchParams.get("geraet"));
  if (!geraet) return NextResponse.json({ offen: 0 });
  return NextResponse.json({ offen: await kunstGuthaben(geraet) });
}
