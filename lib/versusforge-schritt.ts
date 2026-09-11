import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { mandantSauber, EIGENER_MANDANT } from "@/lib/versusforge-namen";

/**
 * WO DIE LEUTE ABSPRINGEN (Owner 09.09.2026: „der sieht nicht, wo die User abbrechen, keine
 * Insights" · „dann müsste ich jetzt schon alles messen").
 *
 * DAS IST DIE ZAHL, DIE ER SONST NIRGENDS BEKOMMT. Anfragen sieht er am Telefon. Was er
 * nicht sieht, sind die Leute, die angefangen und aufgehört haben — und genau dazwischen
 * liegt das Geld:
 *
 *   Seite gesehen → Trichter gestartet → Frage 1 … 4 → Nummer hinterlassen
 *
 * Bricht es zwischen „gesehen" und „gestartet" ein, stimmt der Hook nicht. Bricht es bei
 * Frage 3 ein, ist die Frage falsch. Bricht es erst am Namensfeld ein, ist das Vertrauen
 * das Problem. Drei verschiedene Befunde, drei verschiedene Reparaturen — und ohne diese
 * Messung raten alle drei.
 *
 * ── EINE DATEI JE BESUCHER, NICHT EIN ZÄHLER JE MANDANT ────────────────────────────────
 *
 * Ein Zähler in EINER Datei wäre der erste der drei Fallen beim Speichern
 * ([[delete-resurrection-merge-bug]]): Zwei Besucher in derselben Sekunde lesen beide den
 * Stand 7, schreiben beide 8 — einer ist verloren. Eine Datei je Besucher hat genau einen
 * Schreiber und kann das nicht.
 *
 * SIE HÄLT NUR DIE WEITESTE STUFE, nicht jeden Schritt einzeln. Damit ist die Datei klein,
 * das Zählen ist ein Durchlauf, und die Frage, die er stellt, ist direkt beantwortet: „wie
 * viele sind bis hierher gekommen?" Ein Ereignisstrom müsste dafür erst zusammengerechnet
 * werden und wäre bei jedem Neuladen doppelt gezählt.
 *
 * WAS NICHT GESPEICHERT WIRD: keine Antworten, keine Namen, keine Adresse. Nur eine
 * Gerätekennung, die weiteste Stufe und zwei Zeitstempel. Wer die Anfrage abschickt, steht
 * ohnehin mit Namen im Anfragen-Fach; wer abbricht, bleibt eine Zahl.
 */

/** Die Stationen des MANDANTEN-Trichters, in der Reihenfolge, in der man sie durchläuft. */
export const STUFEN_MANDANT = [
  { schluessel: "seite", wort: "Seite gesehen" },
  { schluessel: "start", wort: "Trichter gestartet" },
  { schluessel: "antwort1", wort: "1. Frage beantwortet" },
  { schluessel: "antwort2", wort: "2. Frage beantwortet" },
  { schluessel: "antwort3", wort: "3. Frage beantwortet" },
  { schluessel: "antwort4", wort: "4. Frage beantwortet" },
  { schluessel: "abschluss", wort: "Nummer hinterlassen" },
] as const;

/**
 * Die Stationen des EIGENEN Trichters (VersusForge selbst — Mandant Nummer eins, siehe
 * [[mein-trichter-ist-ihr-trichter]]). Andere Strecke, dieselbe Mechanik.
 */
export const STUFEN_ENGINE = [
  { schluessel: "seite", wort: "Startseite gesehen" },
  { schluessel: "start", wort: "Trichter gestartet" },
  { schluessel: "webseite", wort: "Website beantwortet" },
  { schluessel: "antwort1", wort: "1. Frage beantwortet" },
  { schluessel: "antwort2", wort: "2. Frage beantwortet" },
  { schluessel: "antwort3", wort: "3. Frage beantwortet" },
  { schluessel: "antwort4", wort: "4. Frage beantwortet" },
  { schluessel: "plan", wort: "Plan gesehen" },
  { schluessel: "lead", wort: "E-Mail hinterlassen" },
] as const;

export type Stufe = { schluessel: string; wort: string };

/** Welche Leiter für welchen Trichter gilt. */
export const leiterFuer = (mandant: string): readonly Stufe[] =>
  mandantSauber(mandant) === EIGENER_MANDANT ? STUFEN_ENGINE : STUFEN_MANDANT;

type Stand = { weit: number; stufe: string; erst: string; zeit: string };

const ordner = (mandant: string) => `versusforge-schritt/${mandantSauber(mandant) || EIGENER_MANDANT}`;
/* Die Kennung landet in einem Pfad — nur Harmloses durchlassen. */
const besucherSauber = (roh: string) => String(roh ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);

/**
 * Die weiteste Stufe eines Besuchers festhalten.
 *
 * NUR VORWÄRTS: Wer zurückgeht oder die Seite neu lädt, darf seinen Stand nicht senken —
 * sonst sähe ein Trichter mit vielen Rückwärts-Schritten schlechter aus, als er ist. Und es
 * spart den Schreibvorgang: Ist die Stufe nicht weiter als die gespeicherte, passiert nichts.
 */
export async function stufeMerken(mandantRoh: string, besucherRoh: string, stufe: string): Promise<boolean> {
  return (await stufeMerkenGenau(mandantRoh, besucherRoh, stufe)).ok;
}

/**
 * Wie `stufeMerken` — sagt aber auch, ob dieser Besucher NEU ist (Owner 11.09.2026: „eine E-Mail jedes Mal bei neuen
 * Besuchern"). Neu heisst: Für dieses Gerät gab es bei diesem Mandanten noch keine Datei.
 */
export async function stufeMerkenGenau(mandantRoh: string, besucherRoh: string, stufe: string): Promise<{ ok: boolean; neu: boolean }> {
  const mandant = mandantSauber(mandantRoh) || EIGENER_MANDANT;
  const besucher = besucherSauber(besucherRoh);
  if (!besucher) return { ok: false, neu: false };

  const leiter = leiterFuer(mandant);
  const weit = leiter.findIndex(s => s.schluessel === stufe);
  if (weit < 0) return { ok: false, neu: false };

  const pfad = `${ordner(mandant)}/${besucher}.json`;
  const jetzt = new Date().toISOString();

  let alt: Stand | null = null;
  const da = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`);
  if (da.ok) { try { alt = (await da.json()) as Stand; } catch { /* kaputt = wie neu */ } }
  if (alt && Number(alt.weit) >= weit) return { ok: true, neu: false };

  const neu: Stand = { weit, stufe, erst: alt?.erst ?? jetzt, zeit: jetzt };
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(neu),
  });
  return { ok: res.ok, neu: res.ok && !alt };
}

export type Trichterzahl = {
  stufe: Stufe;
  /** Wie viele mindestens bis hierher gekommen sind. */
  anzahl: number;
  /** Anteil an denen, die überhaupt angefangen haben (Stufe 0 = 100 %). */
  anteil: number;
  /** Wie viele GENAU hier stehen geblieben sind — der eigentliche Befund. */
  verloren: number;
};

/**
 * Die Leiter zählen.
 *
 * ES WIRD JEDE DATEI EINZELN GEHOLT — dieselbe Entscheidung wie bei den Anfragen: Bei
 * Hunderten gehört hier eine Übersichtsdatei hin, heute sind es Dutzende, und eine
 * Optimierung, bevor jemand wartet, ist verschwendete Zeit.
 *
 * `tage` schneidet ab: Ein Trichter, den man vor drei Monaten geändert hat, wird von seinen
 * eigenen alten Zahlen verdorben.
 */
export async function trichterZaehlen(mandantRoh: string, tage = 30, grenze = 1000, neuSeit = ""): Promise<{
  leiter: Trichterzahl[];
  besucher: number;
  /** Besucher, die NACH `neuSeit` zum ersten Mal kamen — der rote Punkt im Dashboard (Owner 11.09.2026). */
  neu: number;
}> {
  const mandant = mandantSauber(mandantRoh) || EIGENER_MANDANT;
  const leiter = leiterFuer(mandant);
  const leer = { leiter: leiter.map(stufe => ({ stufe, anzahl: 0, anteil: 0, verloren: 0 })), besucher: 0, neu: 0 };

  const liste = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: `${ordner(mandant)}/`, limit: grenze }),
  });
  if (!liste.ok) return leer;
  const dateien = (await liste.json().catch(() => [])) as { name?: string }[];
  const namen = (Array.isArray(dateien) ? dateien : [])
    .map(d => String(d?.name ?? "")).filter(n => n.endsWith(".json"));
  if (!namen.length) return leer;

  const grenzZeit = Date.now() - tage * 24 * 3600 * 1000;
  const staende = (await Promise.all(namen.map(async n => {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(`${ordner(mandant)}/${n}`)}`);
    if (!res.ok) return null;
    try { return (await res.json()) as Stand; } catch { return null; }
  }))).filter((s): s is Stand => !!s && Date.parse(s.zeit) > grenzZeit);

  if (!staende.length) return leer;

  /* „Bis hierher gekommen" heisst: weiteste Stufe >= dieser Stufe. */
  const zahlen = leiter.map((stufe, i) => {
    const anzahl = staende.filter(s => Number(s.weit) >= i).length;
    return { stufe, anzahl, anteil: 0, verloren: 0 };
  });
  const basis = zahlen[0]?.anzahl || 1;
  zahlen.forEach((z, i) => {
    z.anteil = Math.round((z.anzahl / basis) * 100);
    /* Wer GENAU hier aufgehört hat: bis hierher gekommen, aber nicht weiter. */
    z.verloren = z.anzahl - (zahlen[i + 1]?.anzahl ?? z.anzahl);
  });

  const seit = Date.parse(neuSeit) || 0;
  return { leiter: zahlen, besucher: staende.length, neu: staende.filter(s => (Date.parse(s.erst) || 0) > seit).length };
}
