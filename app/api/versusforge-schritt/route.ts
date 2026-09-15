import { NextResponse } from "next/server";
import { stufeMerken } from "@/lib/versusforge-schritt";
import { interesseMelden } from "@/lib/versusforge-besuch-post";
import { str } from "@/lib/agent-modell";
import { keinMensch } from "@/lib/kein-mensch";

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
 *
 * ── MAIL AN DEN KÜNSTLER ERST BEI INTERESSE (Owner 11.09.2026: „bei jedem Besuch eine E-Mail ist zu viel für den
 * Künstler. Ich will erst, wenn jemand drückt: Da, mă interesează lucrarea") ───────────────────────────────────────
 *
 * Hier ging bis eben bei jedem neuen Besucher eine Mail raus. Jetzt nur bei Stufe „start" (= „Da, mă interesează
 * această lucrare" im Agenten) — höchstens einmal je Besucher und Werk (`interesseMelden`). Besuche werden weiter
 * gezählt und stehen im Dashboard. Bots, Vorschau-Dienste und Skripte werden weder gezählt noch gemeldet.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    /* Die Liste steht jetzt in lib/kein-mensch.ts — dieselbe für die Agenten. */
    if (!keinMensch(request)) {
      const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const mandant = str(b.mandant, 80);
      const besucher = str(b.besucher, 80);
      const stufe = str(b.stufe, 32);
      /* Die Herkunft reist mit (Owner 15.09.2026: „keine ahnung woher") — der Server nimmt sie
         nur beim ersten Datensatz an, siehe `stufeMerkenGenau`. */
      await stufeMerken(mandant, besucher, stufe, str(b.quelle, 60));
      if (stufe === "start" && b.werk !== undefined) await interesseMelden(mandant, besucher, str(b.werk, 6));
    }
  } catch { /* siehe oben: eine Messung hält nie etwas auf */ }
  return NextResponse.json({ ok: true });
}
