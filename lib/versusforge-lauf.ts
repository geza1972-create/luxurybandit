import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";
import { compressImage } from "@/lib/image-compress";

/**
 * DAS PROTOKOLL DER AGENTEN-GESPRÄCHE — SEHEN UND MESSEN.
 *
 * ── WARUM ES DIESE DATEI GIBT (Owner 10.09.2026) ────────────────────────────────────────────
 *
 * Auf die Frage, was einem Agenten noch fehlt, standen am Ende zwei Lücken ganz oben, und
 * beide sind Betrieb, nicht Technik:
 *
 *   · Ein Gespräch wurde NIRGENDS gespeichert, ausser es lief bis zum Ende durch. Wer bei Zug
 *     drei aufhörte — und das werden die meisten —, hinterliess keine Spur. Wo Menschen
 *     aussteigen und warum, war schlicht unbekannt.
 *   · Der Verbrauch kam vom Modell zurück und wurde WEGGEWORFEN. Was ein Gespräch kostet, war
 *     unbekannt. Bei David sind es gemessene 4 Cent ([[david-kosten-je-screening]]); hier gab
 *     es keine Zahl.
 *
 * Owner: „du musst kosteneffizient arbeiten und schnell" ([[agenten-schnell-und-billig]]).
 * Beides lässt sich ohne Messung nicht einmal behaupten.
 *
 * ── EINE DATEI JE ZUG, NICHT EINE JE GESPRÄCH ───────────────────────────────────────────────
 *
 * Ein Gespräch, das nach jedem Zug neu geschrieben wird, ist lesen-ändern-schreiben — und
 * genau daran hat sich das Haus schon zweimal die Finger verbrannt
 * ([[delete-resurrection-merge-bug]]). Ein Zug ist ein Ereignis: einmal geschrieben, nie
 * geändert. Der Ordnername ist das Gespräch, die Dateien darin sind die Züge in Reihenfolge.
 *
 * ── WAS NICHT MITGESCHRIEBEN WIRD ───────────────────────────────────────────────────────────
 *
 * KEINE E-MAIL-ADRESSE, KEINE TELEFONNUMMER. Wer sie hinterlässt, steht ohnehin als Anfrage
 * im Dashboard; hier geht es um den VERLAUF, nicht um die Person. Das Gerät ist eine
 * Zufallskennung aus dem Browser, kein Mensch.
 *
 * DIE REGELFASSUNG REIST MIT (`fassung`): Ändert sich der Auftragstext, ändert sich das
 * Ergebnis. Ohne diese Zahl kann hinterher niemand sagen, ob eine neue Regel geholfen hat.
 */

/** Was ein Zug kostet — gerundet auf ein Zehntausendstel Euro, damit Summen stimmen. */
const PREIS = {
  /* gpt-5-mini, Stand 09.2026, in Euro je 1 Mio Token. Ändert sich der Preis, ändert sich
     diese Zahl — sie steht bewusst NICHT im Code verstreut. */
  hinein: 0.23,
  heraus: 1.84,
};

export function laufKosten(v: { hinein: number; heraus: number }): number {
  return Math.round(((v.hinein / 1e6) * PREIS.hinein + (v.heraus / 1e6) * PREIS.heraus) * 1e6) / 1e6;
}

/**
 * ── SEINE BILDER JETZT DOCH SPEICHERN (Owner 11.09.2026: „ich will alles sehen, was sie hochladen,
 * schon hier" · „ja speichern erst mal, wir löschen sie irgendwann") ────────────────────────────
 *
 * KEHRT DIE ENTSCHEIDUNG VOM 09.09.2026 UM: Damals hiess es „auch nicht nach Bildern, die er
 * eventuell hochladen kann" — bewusst nichts speichern, aus Kosten- und Datenschutzgründen. Jetzt
 * will der Owner genau das sehen können, solange ein Gespräch noch nicht bis zum Künstlerprofil
 * geführt hat (danach liegt das Bild ohnehin im Profil). „Wir löschen sie irgendwann" heisst: kein
 * Löschmechanismus JETZT, nur die Speicherung — Aufräumen ist ein späterer Schritt.
 *
 * KOMPRIMIERT, NICHT ROH: dieselbe Funktion wie beim Künstlerprofil (`compressImage`, WebP,
 * höchstens 1920px) — sonst kostet ein Handyfoto mit 8 MB dasselbe Zehnfache an Speicher.
 */
export async function laufFotoSpeichern(gespraech: string, nr: number, i: number, dataUrl: string): Promise<string | null> {
  try {
    const [header, base64] = dataUrl.split(",");
    const rawMime = header?.match(/data:(.*);base64/)?.[1] ?? "image/png";
    if (!base64) return null;
    const { buffer, extension, mimeType } = await compressImage(base64, rawMime);
    const sauber = String(gespraech ?? "").replace(/[^a-zA-Z0-9_-]/g, "");
    const pfad = `versusforge-lauf-fotos/${sauber}/${String(nr).padStart(3, "0")}-${i}.${extension}`;
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`, {
      method: "POST",
      headers: { "Content-Type": mimeType, "x-upsert": "true" },
      body: new Uint8Array(buffer) as unknown as BodyInit,
    });
    if (!res.ok) return null;
    return pfad;
  } catch { return null; }
}

export type LaufZug = {
  /** Das Gespräch, zu dem dieser Zug gehört. */
  gespraech: string;
  /** Der wievielte Zug — 1 ist der erste. */
  nr: number;
  zeit: string;
  sprache: string;
  /** Zufallskennung des Browsers, kein Mensch. */
  geraet: string;
  /** Was der Mensch geschrieben hat, gekürzt. */
  mensch: string;
  /** Was der Agent geantwortet hat, gekürzt. */
  agent: string;
  /** Welche Werkzeuge gelaufen sind. */
  werkzeuge: string[];
  /** Token hinein und heraus, Anzahl Modellaufrufe. */
  hinein: number;
  heraus: number;
  aufrufe: number;
  /** Euro für diesen einen Zug. */
  euro: number;
  /** Wie lange der Mensch gewartet hat, in Millisekunden. */
  dauer: number;
  /** Anzahl der Regelzeilen im Auftrag — die Fassung, unter der das hier entstand. */
  fassung: number;
  /** Die Speicherpfade seiner Bilder in diesem Zug, falls er welche gezeigt hat (Owner 11.09.2026). */
  fotos?: string[];
  /**
   * ── NAME UND ADRESSE, WIRKLICH GESPEICHERT (Owner 14.09.2026: „warum steht ihre email nicht
   * drin? einfach sammeln") ───────────────────────────────────────────────────────────────────
   *
   * Vorher stand hier nur der feste Platzhalter „[Werk hochgeladen]" — er hätte den Anschein
   * erweckt, es gäbe keine Adresse, obwohl der Knopf im Browser ohne sie gar nicht drückbar ist.
   * Gesetzt nur beim ERSTEN Zug (nicht bei „neu schreiben"): Da wird sie erfasst, nicht danach.
   */
  kontakt?: { name: string; mail: string };
};

const ordner = (gespraech: string) => `versusforge-lauf/${gespraech.replace(/[^a-zA-Z0-9_-]/g, "")}`;

/**
 * Ein Zug wird abgelegt. Schlägt es fehl, ist das KEIN Grund, das Gespräch zu stören —
 * deshalb gibt es kein Werfen und keinen Rückgabewert, auf den jemand wartet.
 */
export async function zugSchreiben(zug: LaufZug): Promise<void> {
  const pfad = `${ordner(zug.gespraech)}/${String(zug.nr).padStart(3, "0")}.json`;
  try {
    await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-upsert": "true" },
      body: JSON.stringify(zug),
    });
  } catch { /* Protokoll ist best-effort — es darf nie ein Gespräch kosten */ }
}

/**
 * ── EIN GESPRÄCH MIT ABSCHLUSS IST ZU ENDE (Owner 11.09.2026: „der wird ein Ende haben nach der Adressenmitteilung und
 * sich bedanken") ──────────────────────────────────────────────────────────────────────────────────────────────────
 *
 * Nach `abschluss_schicken` fragt der Server kein Modell mehr — egal, was danach noch geschickt wird. Der Merker liegt
 * AUF DEM SERVER, nicht nur im Browser: Ein Skript, das den Merker `abgeschlossen` einfach weglässt, käme sonst weiter.
 * Eigener Ordner, damit `gespraechLesen` keine fremde Datei als Zug liest.
 */
const endePfad = (gespraech: string) => `versusforge-ende/${gespraech.replace(/[^a-zA-Z0-9_-]/g, "")}.json`;

export async function gespraechBeenden(gespraech: string): Promise<void> {
  if (!gespraech || gespraech === "ohne") return;
  try {
    await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(endePfad(gespraech))}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-upsert": "true" },
      body: JSON.stringify({ zeit: new Date().toISOString() }),
    });
  } catch { /* best-effort — der Browser hat seinen eigenen Riegel */ }
}

export async function gespraechBeendet(gespraech: string): Promise<boolean> {
  if (!gespraech || gespraech === "ohne") return false;
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(endePfad(gespraech))}`);
    return res.ok;
  } catch { return false; }
}

/** Alle Züge eines Gesprächs, in Reihenfolge. */
export async function gespraechLesen(gespraech: string): Promise<LaufZug[]> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: ordner(gespraech), limit: 200, sortBy: { column: "name", order: "asc" } }),
    });
    if (!res.ok) return [];
    const liste = (await res.json()) as { name: string }[];
    const zuege = await Promise.all(liste.map(async (d) => {
      const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(`${ordner(gespraech)}/${d.name}`)}`);
      return r.ok ? ((await r.json()) as LaufZug) : null;
    }));
    return zuege.filter((z): z is LaufZug => !!z).sort((a, b) => a.nr - b.nr);
  } catch { return []; }
}

/**
 * Die Übersicht: alle Gespräche der letzten Tage, mit dem, was zählt — wie weit sie kamen
 * und was sie gekostet haben.
 *
 * ES WERDEN NUR DIE ORDNER GELISTET, nicht jede Datei gelesen: Bei hundert Gesprächen mit je
 * zehn Zügen wären das tausend Abrufe. Der letzte Zug je Gespräch reicht für die Übersicht —
 * er trägt die Nummer, und die ist die Antwort auf „wie weit ist er gekommen".
 */
export async function gespraecheListe(grenze = 100): Promise<{ gespraech: string; zuege: number; letzter: LaufZug | null }[]> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "versusforge-lauf", limit: grenze, sortBy: { column: "name", order: "desc" } }),
    });
    if (!res.ok) return [];
    const ordnerListe = ((await res.json()) as { name: string; id: string | null }[])
      /* Supabase gibt Ordner ohne `id` zurück — echte Dateien haben eine. */
      .filter(d => !d.id)
      .map(d => d.name);
    return await Promise.all(ordnerListe.map(async (g) => {
      const zuege = await gespraechLesen(g);
      return { gespraech: g, zuege: zuege.length, letzter: zuege[zuege.length - 1] ?? null };
    }));
  } catch { return []; }
}
