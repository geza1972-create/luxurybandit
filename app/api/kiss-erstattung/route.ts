import { NextResponse } from "next/server";
import { readKissLog, writeKissLog, guthabenAufladen } from "@/lib/try-this-look-store";
import { POLEDANCE_CENTS, ONCE_CENTS } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GELD ZURUECK, WENN DAS VIDEO UNBRAUCHBAR IST (Owner 03.08.2026, zu einem Lauf, in dem das
 * Set ueber der Kleidung der Kundin lag: „hier gehört eigentlich ein Refund").
 *
 * ER HAT RECHT, UND ZWAR AUS EINEM GRUND, DER UEBER DEN EINZELFALL HINAUSGEHT: Der Kunde hat
 * bezahlt und geliefert bekommen, was das Modell hergab — nicht, was wir versprochen haben.
 * Zwischen „technisch erzeugt" und „brauchbar" liegt bei erzeugten Videos ein Abstand, den
 * niemand vorher kennt. Wer diesen Abstand dem Kunden aufbuerdet, verkauft ein Los, kein
 * Geschenk. Und ein Los kauft man nur einmal.
 *
 * WARUM DER KUNDE ENTSCHEIDET, NICHT WIR: Ob ein Video „gut" ist, kann keine Pruefung
 * feststellen — das Modell haelt sein Ergebnis fuer korrekt, der Server sieht ein fertiges
 * MP4. Nur der Mensch davor sieht, dass sie zwei Oberteile uebereinander traegt.
 *
 * WAS DEN MISSBRAUCH BEGRENZT — bewusst kein Formular, keine Pruefung, kein Warten:
 *   - EINMAL je Auftrag (`erstattetAm` am Eintrag, plus `redeemed`-Liste im Guthaben).
 *   - Nur wer BEZAHLT hat und ein Video BEKOMMEN hat. Ein gescheiterter Lauf wird ohnehin
 *     nie abgebucht.
 *   - Das Guthaben wandert zurueck, kein Geld: Es bleibt im Haus, und der naechste Versuch
 *     kostet ihn nichts extra. Genau das will man — er soll es NOCH einmal versuchen.
 *
 * Der Betrag ist der des Themas, nicht ein pauschaler: Ein Tanz kostet 3,99, ein Kuss 1,49.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { genId?: string; email?: string };
  const genId = String(body.genId ?? "").trim();
  if (!genId) return NextResponse.json({ error: "genId fehlt." }, { status: 400 });

  const log = await readKissLog();
  const eintrag = log.find(x => x.id === genId) as
    | (Record<string, unknown> & { paid?: boolean; videoUrl?: string; theme?: string; email?: string; paidEmail?: string })
    | undefined;
  if (!eintrag) return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });

  const adresse = String(eintrag.paidEmail || eintrag.email || body.email || "").trim().toLowerCase();
  if (!eintrag.paid || !adresse) {
    return NextResponse.json({ error: "Für diesen Auftrag wurde nichts abgebucht." }, { status: 400 });
  }
  if ((eintrag as { erstattetAm?: string }).erstattetAm) {
    return NextResponse.json({ ok: true, schon: true });
  }

  const thema = String(eintrag.theme || "kiss");
  const cents = (thema === "poledance" || thema === "birthday") ? POLEDANCE_CENTS : ONCE_CENTS;

  /* Der Schluessel haengt am Auftrag: Zweimal dieselbe Anfrage — der Browser wiederholt gern —
     zahlt trotzdem nur einmal zurueck. */
  const r = await guthabenAufladen(adresse, `erstattung-${genId}`, cents);
  if (!r.granted) return NextResponse.json({ ok: true, schon: true, cents: r.cents });

  (eintrag as { erstattetAm?: string }).erstattetAm = new Date().toISOString();
  await writeKissLog(log).catch(() => { /* die Gutschrift steht; der Vermerk holt der naechste Lauf nach */ });
  return NextResponse.json({ ok: true, erstattet: cents, cents: r.cents });
}
