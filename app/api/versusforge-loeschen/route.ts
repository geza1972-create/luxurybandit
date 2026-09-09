import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { mandantLesen, mandantLoeschen } from "@/lib/versusforge-mandanten";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vergleicht ohne Zeitverrat — dieselbe Bauart wie beim Dashboard-Schlüssel. */
function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let unterschied = 0;
  for (let i = 0; i < a.length; i++) unterschied |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return unterschied === 0;
}

/**
 * LÖSCHEN (Owner 09.09.2026: „hier kommt noch löschen" · „fürs Löschen muss er einen Link
 * bekommen" · „er bekommt das an seiner E-Mail").
 *
 * WARUM ES DAS GEBEN MUSS: In seinem Trichter liegen die Namen und Telefonnummern anderer
 * Menschen. Wer so etwas anlegt, muss es auch wieder wegräumen können — und zwar ohne uns zu
 * fragen und ohne dafür zu zahlen.
 *
 * DER SCHLÜSSEL IST EIN EIGENER, nicht der fürs Dashboard: Löschen darf nie an einer Zahlung
 * hängen.
 *
 * KEINE AUSKUNFT DARÜBER, OB ES DEN MANDANTEN GIBT — falscher Schlüssel und unbekannter Name
 * bekommen dieselbe Antwort. Sonst wäre die Route ein Verzeichnis aller Trichter.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try { body = (await request.json()) as Record<string, unknown>; } catch { /* leer */ }

  const kennung = str(body.mandant, 40);
  const schluessel = str(body.k, 80).trim();
  const m = await mandantLesen(kennung);

  if (!m || !schluessel || !m.loeschSchluessel || !gleich(schluessel, m.loeschSchluessel)) {
    return NextResponse.json({ error: "Dieser Link stimmt nicht." }, { status: 403 });
  }

  const weg = await mandantLoeschen(kennung);
  /* Beim Fehlschlag NICHT „ist gelöscht" sagen. Wer das liest, hakt es ab — und die Daten
     liegen weiter. */
  if (!weg) return NextResponse.json({ error: "Das ging gerade nicht. Bitte noch einmal." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
