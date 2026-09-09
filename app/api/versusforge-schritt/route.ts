import { NextResponse } from "next/server";
import { stufeMerken } from "@/lib/versusforge-schritt";
import { str } from "@/lib/agent-modell";

/**
 * DIE MESSUNG (Owner 09.09.2026: „dann müsste ich jetzt schon alles messen").
 *
 * Eine Zeile je Besucher, die weiteste erreichte Stufe. Warum das die richtige Form ist,
 * steht in `lib/versusforge-schritt.ts`.
 *
 * SIE ANTWORTET IMMER MIT OK — auch wenn nichts gespeichert wurde. Eine Messung darf einen
 * Trichter niemals aufhalten oder eine Fehlermeldung erzeugen: Der Mensch davor will eine
 * Anfrage abschicken, nicht erfahren, dass unsere Statistik hakt (dieselbe Haltung wie in
 * `logTunnelEventServer`).
 *
 * KEIN DECKEL, KEINE ANMELDUNG: Was hier hineinläuft, ist eine Gerätekennung und ein Wort
 * aus einer festen Liste. Ein erfundener Mandantenname legt einen leeren Ordner an, mehr
 * kann hier nicht passieren — und unbekannte Stufen weist `stufeMerken` selbst ab.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await stufeMerken(str(b.mandant, 80), str(b.besucher, 80), str(b.stufe, 32));
  } catch { /* siehe oben: eine Messung hält nie etwas auf */ }
  return NextResponse.json({ ok: true });
}
