import { BUCKET, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * ── WER KEINE ADRESSE GIBT, DESSEN BILDER GEHEN NACH EINEM TAG (Owner 14.09.2026: „die leute
 * die keine email angeben dann bilder löschen nach einem tag") ────────────────────────────────
 *
 * ── WARUM ES DIESE REGEL BRAUCHT ─────────────────────────────────────────────────────────────
 *
 * Im Protokoll liegen die hochgeladenen Werke, damit der Owner sieht, was Leute mitbringen.
 * Wer abbricht, hinterlässt sie trotzdem: Ein Künstler hat am 13.09.2026 ZEHN Werke hochgeladen
 * und ist an der Frage nach Name und Adresse ausgestiegen. Seine Bilder lagen danach bei uns,
 * ohne dass jemand sagen könnte, wem sie gehören oder wen man fragen müsste.
 *
 * Fremde Werke ohne Besitzer und ohne Einwilligung sind nichts, was man sammelt. Nach einem Tag
 * sind sie weg.
 *
 * ── WAS BLEIBT ───────────────────────────────────────────────────────────────────────────────
 *
 * DER TEXT BLEIBT. Gelöscht werden nur die Bilder — die Züge (Zeiten, Kosten, Sprüche, wie weit
 * jemand kam) sind die Auswertung des Trichters und enthalten keine fremden Werke.
 *
 * WER SICH GENANNT HAT, IST AUSGENOMMEN: Sobald an einem Zug eine Adresse hängt (`kontakt.mail`,
 * seit 14.09.2026) oder das Gespräch mit `abschluss_schicken` endete, gibt es einen Menschen,
 * der weiss, dass seine Bilder bei uns sind. Dann bleiben sie.
 */

/** Einen Tag, wie angesagt. */
export const LAUF_FOTO_TAGE = 1;

const FOTO_ORDNER = "versusforge-lauf-fotos";
const ZUG_ORDNER = "versusforge-lauf";

type Eintrag = { name?: string; id?: string | null; created_at?: string | null };

async function liste(prefix: string, limit = 1000): Promise<Eintrag[] | null> {
  const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit }),
  }).catch(() => null);
  if (!res?.ok) return null;
  const daten = await res.json().catch(() => null);
  return Array.isArray(daten) ? (daten as Eintrag[]) : null;
}

async function lesen(pfad: string): Promise<Record<string, unknown> | null> {
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${pfad}`).catch(() => null);
  if (!res?.ok) return null;
  try { return (await res.json()) as Record<string, unknown>; } catch { return null; }
}

export type LaufAufraeumBericht = {
  gespraeche: number;
  geprueft: number;
  behalten: number;
  faellig: number;
  bilder: number;
  geloescht: number;
  fehler?: string;
  /** Im Probelauf: welche Gespräche fällig wären, gekürzt. */
  vorschau?: string[];
};

export async function laufFotosAufraeumen(opt: { nurZeigen?: boolean; tage?: number } = {}): Promise<LaufAufraeumBericht> {
  const tage = Number.isFinite(opt.tage) ? Number(opt.tage) : LAUF_FOTO_TAGE;
  const grenze = Date.now() - tage * 24 * 60 * 60 * 1000;
  const leer: LaufAufraeumBericht = { gespraeche: 0, geprueft: 0, behalten: 0, faellig: 0, bilder: 0, geloescht: 0 };

  const ordner = await liste(`${FOTO_ORDNER}/`, 1000);
  if (!ordner) return { ...leer, fehler: "Ordnerliste nicht lesbar" };

  const bericht: LaufAufraeumBericht = { ...leer, gespraeche: ordner.length };
  const wegPfade: string[] = [];
  const vorschau: string[] = [];

  for (const o of ordner) {
    const gespraech = String(o.name ?? "");
    if (!gespraech) continue;
    bericht.geprueft++;

    const bilder = await liste(`${FOTO_ORDNER}/${gespraech}/`, 200);
    /* NICHT LESBAR HEISST NICHT LÖSCHEN: lieber ein Ordner zu viel als fremde Werke, die wir
       auf Verdacht wegwerfen (dieselbe Regel wie in `mandantLoeschen`). */
    if (!bilder) continue;
    const echte = bilder.filter(b => b.id && b.name);
    if (!echte.length) continue;

    /* ── HAT ER SICH GENANNT? ──────────────────────────────────────────────────────────────
       Die Züge tragen es: seit 14.09. als `kontakt.mail`, davor als Werkzeug
       `abschluss_schicken`. Findet sich eines von beiden, bleiben die Bilder. */
    const zuege = await liste(`${ZUG_ORDNER}/${gespraech}/`, 100);
    let hatKontakt = false;
    let juengste = 0;
    for (const z of zuege ?? []) {
      const n = String(z.name ?? "");
      if (!n.endsWith(".json")) continue;
      const d = await lesen(`${ZUG_ORDNER}/${gespraech}/${n}`);
      if (!d) continue;
      const zeit = Date.parse(String(d.zeit ?? ""));
      if (Number.isFinite(zeit)) juengste = Math.max(juengste, zeit);
      const mail = String((d.kontakt as { mail?: string } | undefined)?.mail ?? "").trim();
      const werkzeuge = Array.isArray(d.werkzeuge) ? d.werkzeuge.map(String) : [];
      if (mail.includes("@") || werkzeuge.includes("abschluss_schicken")) hatKontakt = true;
    }

    if (hatKontakt) { bericht.behalten++; continue; }

    /* Ohne lesbaren Zug zählt das Alter der Bilder selbst — sonst bliebe ein Ordner ewig
       liegen, nur weil sein Protokoll fehlt. */
    if (!juengste) {
      const zeiten = echte.map(b => Date.parse(String(b.created_at ?? ""))).filter(Number.isFinite);
      juengste = zeiten.length ? Math.max(...zeiten) : 0;
    }
    if (!juengste || juengste > grenze) continue;

    bericht.faellig++;
    bericht.bilder += echte.length;
    if (opt.nurZeigen) {
      vorschau.push(`${gespraech.slice(0, 8)} · ${echte.length} Bilder · ${new Date(juengste).toISOString().slice(0, 16)}`);
      continue;
    }
    for (const b of echte) wegPfade.push(`${FOTO_ORDNER}/${gespraech}/${String(b.name)}`);
  }

  if (opt.nurZeigen) return { ...bericht, vorschau };
  if (!wegPfade.length) return bericht;

  /* SAMMEL-LÖSCHEN wie im Haus üblich (`mandantLoeschen`): ein Aufruf mit allen Pfaden. */
  const weg = await supabaseFetch(`/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: wegPfade }),
  }).catch(() => null);
  if (!weg?.ok) {
    console.error("[lauf-aufraeumen] Löschen fehlgeschlagen:", weg?.status);
    return { ...bericht, fehler: `Löschen fehlgeschlagen (${weg?.status ?? "kein Zugang"})` };
  }
  return { ...bericht, geloescht: wegPfade.length };
}
