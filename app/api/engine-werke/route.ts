import { NextResponse } from "next/server";
import { BUCKET, supabaseFetch } from "@/lib/try-this-look-store";
import { gespraechLesen } from "@/lib/versusforge-lauf";

/**
 * WAS SIE HOCHGELADEN HABEN (Owner 14.09.2026: „ich will die Werke sehen, wenn da steht Werke
 * hochgeladen" · „ich will wissen, sind es Amateure oder nicht").
 *
 * ── WARUM EINE ZAHL NICHT REICHT ────────────────────────────────────────────────────────────
 *
 * „73 haben ein Werk hochgeladen" beantwortet, WIE VIELE kommen — nicht, WER kommt. Ob das
 * Maler sind oder Leute, die ein Handyfoto ihrer Wand hochladen, steht in keiner Kennzahl. Das
 * sieht man nur, wenn man die Bilder ansieht.
 *
 * ── DIE BILDER LIEGEN LÄNGST DA ─────────────────────────────────────────────────────────────
 *
 * `portal-vorschau` legt jedes hochgeladene Werk unter `versusforge-lauf-fotos/<gespräch>/…` ab
 * und vermerkt den Pfad am Zug (`fotos`). Hier wird nichts Neues gespeichert — nur
 * zusammengesucht, was das Protokoll ohnehin führt.
 *
 * ── AUSGELIEFERT WIRD NICHT VON HIER ────────────────────────────────────────────────────────
 *
 * Diese Route gibt PFADE zurück, keine Bilddaten. Das Bild selbst holt der Browser über
 * `api/versusforge-lauf-foto`, das denselben Schlüssel verlangt und nur aus diesem einen Ordner
 * ausliefert. Zwei Wege für dieselbe Sache wären zwei Stellen, an denen man sich vertun kann.
 *
 * ── ES IST EINE TEURE ABFRAGE ───────────────────────────────────────────────────────────────
 *
 * Je Gespräch wird das Protokoll gelesen. Deshalb eine eigene Route, die das Bauteil EINMAL beim
 * Öffnen holt — nicht im Takt der Live-Ansicht.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Wie viele Gespräche durchsucht werden.
 *
 * ── WARUM ÜBERHAUPT EINE BREITE SUCHE (14.09.2026) ─────────────────────────────────────────
 *
 * Die Ablage sortiert nach NAMEN, und die Gesprächskennungen sind zufällige UUIDs — „die
 * neuesten 40 Ordner" gibt es also gar nicht, man bekommt 40 beliebige. Deshalb wird alles
 * eingesammelt und erst am Ende nach Zeit sortiert.
 *
 * Gemessen am 14.09.2026 existieren insgesamt 34 Gesprächsordner, davon 15 mit Fotos. Die Zahl
 * hier ist also reichlich bemessen und kostet heute nichts; sie ist die Obergrenze für den Tag,
 * an dem es mehr werden.
 */
const GESPRAECHE = 150;
/** Wie viele Werke höchstens zurückkommen. */
const WERKE = 24;

export type Werk = {
  /** Pfad in der Ablage — der Browser reicht ihn an `api/versusforge-lauf-foto` weiter. */
  pfad: string;
  zeit: string;
  gespraech: string;
  /**
   * ── WEM GEHÖRT DAS BILD? (Owner 14.09.2026: „ich kann sowas nicht zuordnen") ───────────────
   *
   * Die Galerie zeigte nur Uhrzeiten. Wer sich genannt hat, steht seit dem 14.09. am Zug
   * (`kontakt`); wer nicht, bleibt leer — und genau das ist die Auskunft, die fehlte: Man sieht
   * auf einen Blick, welche Werke jemandem gehören und welche herrenlos sind.
   */
  name?: string;
  mail?: string;
};

export async function GET(request: Request) {
  const schluessel = process.env.VERSUSFORGE_DASHBOARD_KEY ?? "";
  const s = new URL(request.url).searchParams.get("s") ?? "";
  if (!schluessel || s !== schluessel) return NextResponse.json({ ok: false }, { status: 403 });

  const liste = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "versusforge-lauf", limit: GESPRAECHE, sortBy: { column: "name", order: "desc" } }),
  }).catch(() => null);

  if (!liste?.ok) return NextResponse.json({ ok: true, werke: [] });

  /* Supabase gibt Ordner ohne `id` zurück — echte Dateien haben eine. */
  const ordner = ((await liste.json().catch(() => [])) as { name?: string; id?: string | null }[])
    .filter(d => !d?.id && d?.name)
    .map(d => String(d.name));

  /**
   * ── KEIN ABBRUCH, SOBALD 24 BEISAMMEN SIND (14.09.2026) ────────────────────────────────────
   *
   * Hier stand `if (werke.length >= WERKE) break;`. Das klang sparsam und war falsch: Die Ordner
   * kommen in Namensreihenfolge, und die Namen sind zufällige UUIDs — wer nach 24 Funden aufhört,
   * hat 24 BELIEBIGE Werke, nicht die neuesten. Messbar daran, dass als jüngstes Werk eines vom
   * Vortag dastand, während in derselben Minute jemand hochlud.
   *
   * Also alles einsammeln, dann nach Zeit sortieren, dann kappen. In Stapeln PARALLEL, weil
   * sonst jedes Gespräch einzeln abgewartet wird und die Breite erst recht nicht zu bezahlen ist.
   */
  const werke: Werk[] = [];
  const STAPEL = 20;

  for (let i = 0; i < ordner.length; i += STAPEL) {
    const teile = await Promise.all(ordner.slice(i, i + STAPEL).map(async g => {
      const zuege = await gespraechLesen(g).catch(() => []);
      /* Der Kontakt hängt an EINEM Zug (dem ersten mit Angaben), gilt aber für das ganze
         Gespräch — deshalb einmal suchen und an alle Werke daraus schreiben. */
      const kontakt = zuege.map(z => z.kontakt).find(k => k?.mail);
      const gefunden: Werk[] = [];
      for (const z of zuege) {
        for (const pfad of z.fotos ?? []) {
          /* Nur aus dem Foto-Ordner — derselbe Riegel wie in der Ausliefer-Route. */
          if (!String(pfad).startsWith("versusforge-lauf-fotos/")) continue;
          gefunden.push({
            pfad, zeit: String(z.zeit ?? ""), gespraech: g,
            ...(kontakt?.mail ? { name: kontakt.name, mail: kontakt.mail } : {}),
          });
        }
      }
      return gefunden;
    }));
    for (const t of teile) werke.push(...t);
  }

  werke.sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)));
  return NextResponse.json({ ok: true, werke: werke.slice(0, WERKE) });
}
