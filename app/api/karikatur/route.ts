import { NextResponse } from "next/server";
import { karikaturErzeugen, KARIKATUR_STILE, type KarikaturStil } from "@/lib/lakatosbandi-kunst";
import { kunstGuthaben, kunstVerbrauchen, geraetSauber } from "@/lib/lakatosbandi-kunst-riegel";
import { kunstMelden } from "@/lib/lakatosbandi-kunst-melden";
import { keinMensch } from "@/lib/kein-mensch";

/**
 * ── DAS KARIKATUREN-WERKZEUG (Owner 19.09.2026) ──────────────────────────────────────────────
 *
 * Sein Foto, ein Stil, ein Bild zurück. Kein Künstlerwerk als Vorlage — die Stile stehen in
 * `KARIKATUR_STILE` (lib/lakatosbandi-kunst.ts), dort steht auch, warum es nicht über PixVerse
 * läuft.
 *
 * ── DIESELBEN RIEGEL WIE BEIM POSTER ────────────────────────────────────────────────────────
 *
 * Ein Lauf kostet echtes Geld. Deshalb: derselbe Hauptschalter (`KUNST_AN`), dasselbe Guthaben
 * je Gerät, dieselbe Meldung an den Owner. Ein zweiter Weg mit eigenen Regeln wäre die Stelle,
 * an der in vier Wochen einer davon offen steht.
 *
 * ABGEBUCHT WIRD NACH DEM BILD, nicht davor ([[paid-jobs-must-survive-the-browser]]).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  if (keinMensch(request)) return NextResponse.json({ fehler: "nein" }, { status: 403 });
  if (process.env.KUNST_AN?.trim() !== "1") return NextResponse.json({ fehler: "aus" }, { status: 503 });

  const b = (await request.json().catch(() => null)) as { foto?: string; stil?: string; geraet?: string } | null;
  const foto = String(b?.foto ?? "");
  const stil = String(b?.stil ?? "karikatur") as KarikaturStil;
  const geraet = geraetSauber(b?.geraet);
  if (!foto.startsWith("data:image/")) return NextResponse.json({ fehler: "unvollstaendig" }, { status: 400 });
  if (!(stil in KARIKATUR_STILE)) return NextResponse.json({ fehler: "stil-unbekannt" }, { status: 400 });

  if (await kunstGuthaben(geraet) < 1) return NextResponse.json({ fehler: "bezahlen" }, { status: 402 });

  const ergebnis = await karikaturErzeugen(foto, stil);
  if (!ergebnis.ok) {
    return NextResponse.json({ fehler: ergebnis.grund }, { status: ergebnis.grund === "abgelehnt" ? 422 : 502 });
  }

  await kunstVerbrauchen(geraet).catch(() => 0);
  kunstMelden({ mandant: "karikatur", werk: stil });
  return NextResponse.json({ ok: true, bild: ergebnis.bild, stil });
}
