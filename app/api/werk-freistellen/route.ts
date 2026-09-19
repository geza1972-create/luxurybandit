import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { mandantPruefen } from "@/lib/versusforge-mandant";
import { werkEcken, werkFreistellen } from "@/lib/lakatosbandi-freistellen";
import { keinMensch } from "@/lib/kein-mensch";

/**
 * ── „KUNST FREISTELLEN" — NUR EINE VORSCHAU (Owner 18.09.2026) ───────────────────────────────
 *
 * Die Route gibt ein NEUES Bild zurück und speichert nichts. Übernommen wird es erst, wenn der
 * Künstler im Dashboard Ja sagt und das Werk wie jedes andere Bild hochlädt — sein Original
 * bleibt bis dahin unangetastet.
 *
 * Das ist keine Vorsicht um der Vorsicht willen: Bei einem Werk, das ABSICHTLICH im Raum
 * fotografiert wurde, ist die Entzerrung ein Schaden. Diese Entscheidung kann nur der treffen,
 * der es gemalt hat.
 *
 * ── NUR MIT SCHLÜSSEL ───────────────────────────────────────────────────────────────────────
 *
 * Jeder Aufruf kostet uns einen Sehen-Schritt. Ohne Prüfung wäre das ein offener Knopf, an dem
 * Fremde unser Guthaben ausgeben ([[kein-token-fuer-abbrecher]]).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (keinMensch(request)) return NextResponse.json({ ok: false }, { status: 403 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mandant = str(b.mandant, 80);
  const schluessel = str(b.schluessel, 200);
  const bild = typeof b.bild === "string" ? b.bild : "";
  if (!mandant || !bild.startsWith("data:image/")) {
    return NextResponse.json({ ok: false, grund: "unvollstaendig" }, { status: 400 });
  }
  if (!mandantPruefen(mandant, schluessel).ok) {
    return NextResponse.json({ ok: false, grund: "kein-zugang" }, { status: 403 });
  }

  const ecken = await werkEcken(bild);
  if (!ecken) return NextResponse.json({ ok: false, grund: "keine-ecken" }, { status: 422 });

  const frei = await werkFreistellen(bild, ecken);
  if (!frei) return NextResponse.json({ ok: false, grund: "fehler" }, { status: 502 });

  return NextResponse.json({ ok: true, bild: frei });
}
