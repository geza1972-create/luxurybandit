import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { verlaufLesen, angekommeneWerke } from "@/lib/versusforge-verlauf";
import { markeSetzen, markenLesen } from "@/lib/versusforge-marke";
import { trichterZaehlen } from "@/lib/versusforge-schritt";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";

/**
 * DIE ZEITLEISTE (Owner 14.09.2026: „ich will eine Grafik, die zeigt die Uhrzeit wenn das Portal
 * am meisten benutzt wird" · „und ich will noch einen Punkt, an dem wir eine Anzeige geändert
 * haben, um zu sehen ob die Insights auf dem Trichter steigen oder sinken" · „also Timeline").
 *
 * ── WARUM NICHT IN `engine-live` ────────────────────────────────────────────────────────────
 *
 * Die Live-Ansicht fragt alle acht Sekunden. Sie darf das, weil sie nur den frischen Rand liest.
 * Der Verlauf listet vierzehn Tagesordner und bis zu tausend Besucherdateien — das alle acht
 * Sekunden wäre Geld für eine Zahl, die sich stündlich kaum bewegt. Deshalb ein eigener Weg, den
 * das Bauteil EINMAL beim Öffnen holt.
 *
 * ── DIESELBE TÜR ────────────────────────────────────────────────────────────────────────────
 *
 * Derselbe Dashboard-Schlüssel wie die Seite und `engine-live`. Auch der POST liegt hier und
 * nicht in einer eigenen Route: Ein zweiter Endpunkt mit eigener Prüfung wäre eine zweite Tür
 * zum selben Schloss.
 *
 * ── WER DARF SCHREIBEN ──────────────────────────────────────────────────────────────────────
 *
 * Nur der Owner, und nur einen kurzen Satz. Eine Marke ist eine Behauptung über die Ursache; sie
 * wird nie aus Daten erraten (Begründung in `lib/versusforge-marke.ts`).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Wie weit die Zeitleiste zurückreicht — lang genug, um ein Vorher und ein Nachher zu zeigen. */
const FENSTER_TAGE = 14;

const darfRein = (request: Request) => {
  const schluessel = process.env.VERSUSFORGE_DASHBOARD_KEY ?? "";
  const s = new URL(request.url).searchParams.get("s") ?? "";
  return !!schluessel && s === schluessel;
};

export async function GET(request: Request) {
  if (!darfRein(request)) return NextResponse.json({ ok: false }, { status: 403 });

  /**
   * ── LADEN SIE HOCH ODER GUCKEN SIE NUR (Owner 14.09.2026: „ich will wissen was Leute hochladen
   * oder glotzen sie nur") ────────────────────────────────────────────────────────────────────
   *
   * Die Stundengrafik zählt Besuche und kann diese Frage nicht beantworten: Wie weit einer
   * gekommen ist, steht IM Datensatz, nicht im Dateinamen. `trichterZaehlen` öffnet sie dafür
   * einzeln — es ist die teuerste Abfrage hier, und sie ist der Preis für die Antwort.
   */
  const [verlauf, marken, trichter, angekommen] = await Promise.all([
    verlaufLesen(FENSTER_TAGE),
    markenLesen(20),
    trichterZaehlen(EIGENER_MANDANT, FENSTER_TAGE),
    angekommeneWerke(),
  ]);

  return NextResponse.json({
    ok: true,
    ...verlauf,
    marken,
    trichter: {
      besucher: trichter.besucher,
      leiter: trichter.leiter.map(l => ({
        schluessel: l.stufe.schluessel,
        anzahl: l.anzahl,
      })),
      /* WOHER SIE KAMEN — hier vergessen, als die Messung gebaut wurde (15.09.2026): Die Zahlen
         standen in der Ablage, das Dashboard zeigte eine leere Zeile. Wer eine Antwort nur bis
         zur vorletzten Station bringt, hat sie nicht gebaut. */
      quellen: trichter.quellen,
    },
    /* Die zweite Stufe: nicht „hat ein Bild gewählt", sondern „das Bild liegt bei uns". */
    angekommen,
  });
}

export async function POST(request: Request) {
  if (!darfRein(request)) return NextResponse.json({ ok: false }, { status: 403 });

  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const text = str(b.text, 120).trim();
  if (!text) return NextResponse.json({ ok: false, grund: "leer" }, { status: 400 });

  const ok = await markeSetzen(text);
  if (!ok) return NextResponse.json({ ok: false }, { status: 502 });

  /* Die frische Liste gleich zurück: Das Bauteil zeichnet die neue Marke, ohne noch einmal den
     ganzen Verlauf zu holen. */
  return NextResponse.json({ ok: true, marken: await markenLesen(20) });
}
