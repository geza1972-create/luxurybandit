import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readTryThisLookState, saveTryThisLookState } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DIE GESTALT DER THEMEN-KACHELN — EIN SCHALTER FÜR ALLE (Owner 06.08.2026: „ich habe in der
 * Biblio auf volle Breite geschaltet aber online ist es nicht auf live aktiv" · „ja mach es").
 *
 * Vorher lag die Wahl im `localStorage`, und der gehört EINEM Browser auf EINER Adresse: Auf
 * localhost geschaltet blieb sie auf localhost, und selbst auf der echten Seite geschaltet sah
 * sie nur der Owner — jeder Besucher kam mit leerem Speicher. Der Umschalter auf `/ci` war
 * damit ein Vorschaufenster, das aussah wie ein Hebel.
 *
 * Jetzt steht die Wahl im Zustand auf dem Server. Sie gilt für alle, und ein Wechsel braucht
 * keine Auslieferung mehr — der Owner tippt auf `/ci`, und die nächste Seite trägt es.
 *
 * LESEN DARF JEDER, SCHREIBEN NUR DER BETREIBER. Das ist nicht Förmlichkeit: Ohne die Sperre
 * könnte jeder Besucher das Aussehen der Startseite für ALLE umstellen. Der Umschalter selbst
 * bleibt für Besucher trotzdem bedienbar — ohne Kennung ändert er nur ihre eigene Ansicht
 * (localStorage), und diese Route sagt dann schlicht Nein.
 */
const ERLAUBT = new Set(["reihe", "voll"]);

export async function GET() {
  const state = await readTryThisLookState().catch(() => null);
  const art = state?.themenGestalt;
  return NextResponse.json({ art: art && ERLAUBT.has(art) ? art : null });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { art?: string };
  const art = String(body.art ?? "");
  if (!ERLAUBT.has(art)) {
    return NextResponse.json({ error: "Unknown shape." }, { status: 400 });
  }
  /* Lesen, EIN Feld setzen, zurückschreiben — nie ein frisch gebautes Objekt speichern, sonst
     fallen die Felder weg, die diese Route nicht kennt (Memory `delete-resurrection-merge-bug`). */
  const state = await readTryThisLookState();
  state.themenGestalt = art as "reihe" | "voll";
  await saveTryThisLookState(state);
  return NextResponse.json({ ok: true, art });
}
