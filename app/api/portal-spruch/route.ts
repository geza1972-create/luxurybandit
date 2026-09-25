import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { istKuenstler } from "@/lib/lakatosbandi";
import { schluesselStimmt } from "@/lib/schluessel-vergleich";
import { spruchFuerWerk, motivLesen } from "@/lib/kuenstler-sprueche";
import { ereignisMerken } from "@/lib/versusforge-ereignis";
import { darfKi } from "@/lib/versusforge-abo";

/**
 * EINEN SPRUCH FÜR EIN WERK SCHREIBEN (Owner 13.09.2026: „Ich glaube man muss einen Button unter
 * jedem Werk machen. Beschreibung AI generieren").
 *
 * ── WARUM ES DIESEN WEG BRAUCHT ─────────────────────────────────────────────────────────────
 *
 * Sätze entstanden bisher nur im Hintergrund nach dem Speichern, für alle fehlenden Werke in
 * einem Zug. Blieb einer aus — weil das Modell weniger Sätze lieferte als Bilder, weil das Bild
 * noch in der Prüfung lag, weil der Hintergrundlauf abbrach —, gab es keinen zweiten Versuch und
 * keine Meldung. Szidonia sah genau das: bei einigen Werken ein Text, bei anderen nicht.
 *
 * Jetzt kann sie es selbst auslösen, je Werk, so oft sie will — und einen Satz auch ersetzen,
 * der ihr nicht gefällt.
 *
 * ── ER SPEICHERT NICHT ──────────────────────────────────────────────────────────────────────
 *
 * Der Vorschlag geht in ihr Feld zurück. Erst „Speichern" macht ihn zu ihrem Text. Ein Knopf,
 * der ungefragt ihre Seite ändert, wäre kein Vorschlag, sondern ein Eingriff.
 *
 * ── UND ER BRAUCHT IHREN SCHLÜSSEL ──────────────────────────────────────────────────────────
 *
 * Nicht wegen der Daten (es werden keine geschrieben ausser dem Bildbefund), sondern wegen der
 * Kosten: Ohne Prüfung löst jeder Fremde beliebig Modellaufrufe auf unsere Rechnung aus.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/* Ein Modellaufruf auf ein Bild — knapp über dem Vercel-Standard wäre er regelmässig abgeschnitten
   (siehe `portal-vorschau`). */
export const maxDuration = 60;

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mandant = str(b.mandant, 80);
  const m = mandant ? await mandantLesen(mandant) : null;
  if (!m || !istKuenstler(m)) return NextResponse.json({ ok: false }, { status: 404 });
  if (!schluesselStimmt(m.schluessel, str(b.k, 200))) return NextResponse.json({ ok: false }, { status: 403 });

  /* KI IST PREMIUM (Owner 14.09.2026). Geprüft VOR dem Modellaufruf — sonst hätten wir schon
     bezahlt, wenn wir ablehnen. */
  if (!darfKi(m)) return NextResponse.json({ ok: false, grund: "premium" }, { status: 402 });

  const i = Math.round(Number(b.i));
  /* Dieselben Grenzen wie beim Speichern: -1 ist das Standardmotiv, 11 die höchste Kachel. */
  if (!Number.isInteger(i) || i < -1 || i > 11) return NextResponse.json({ ok: false }, { status: 400 });

  /* Liegt das Bild noch nicht in der Ablage (gewählt, aber nicht gespeichert), gibt es nichts
     anzusehen — das ist kein Fehler des Modells und braucht eine eigene Antwort. */
  if (!(await motivLesen(mandant, i).catch(() => ""))) return NextResponse.json({ ok: false, grund: "kein-bild" }, { status: 409 });

  const { spruch, titel } = await spruchFuerWerk(mandant, i).catch(e => {
    console.warn("[portal-spruch] gescheitert:", mandant, i, e);
    return { spruch: "", titel: "" };
  });
  /* Leer heisst: kein Bild lesbar (noch in der Prüfung oder nie hochgeladen) oder das Modell
     hat nichts geliefert. Der Browser sagt es ihr, statt stumm zu bleiben. */
  if (!spruch) return NextResponse.json({ ok: false }, { status: 502 });
  void ereignisMerken(mandant, String(m.name ?? ""), "spruchErzeugt", i);
  /* `titel` kann leer bleiben (das Modell findet nicht immer einen guten Namen) — dann rührt
     das Dashboard das Titelfeld gar nicht an, siehe dort. */
  return NextResponse.json({ ok: true, spruch, titel });
}
