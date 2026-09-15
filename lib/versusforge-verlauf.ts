import { BUCKET, supabaseFetch } from "@/lib/try-this-look-store";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";

/**
 * WANN WIRD ES BENUTZT (Owner 14.09.2026: „ich will eine Grafik, die zeigt die Uhrzeit wenn das
 * Portal am meisten benutzt wird" · „also Timeline").
 *
 * ── DIE ZEITEN STEHEN IN DEN DATEINAMEN, DIE DATEIEN BLEIBEN ZU ─────────────────────────────
 *
 * Diese Auswertung öffnet KEINE einzige Datei. Sie braucht nur Zeitpunkte, und die stehen schon
 * in der Liste:
 *
 *  · Ereignisse liegen als `versusforge-ereignis/<Tag>/<HHMMSS>-…json` — Tag im Ordner, Uhrzeit
 *    im Namen. Zählen heisst hier: Namen lesen.
 *  · Trichter-Schritte tragen den Zeitpunkt nicht im Namen, aber die Ablage liefert `created_at`
 *    mit der Liste — und das IST der erste Besuch, weil die Datei beim ersten Schritt entsteht.
 *
 * Die Alternative wäre, für einen Balken über vierzehn Tage tausend Dateien einzeln zu holen.
 * Genau das tut `trichterZaehlen`, und dort ist es richtig (es braucht die weiteste Stufe aus dem
 * Inhalt) — hier wäre es nur teuer.
 *
 * ── ORTSZEIT, NICHT UTC ─────────────────────────────────────────────────────────────────────
 *
 * „Am meisten benutzt um 21 Uhr" ist eine Aussage über den Feierabend der Künstler, nicht über
 * einen Zeitzonen-Nullpunkt. In UTC gezählt läge derselbe Abend bei 18 Uhr, und der Owner würde
 * seine Anzeigen nach einer Uhrzeit schalten, die niemandes Tag beschreibt.
 */

/** Wo die Leute sind, deren Tag wir zählen. */
const ZONE = "Europe/Bucharest";

export type Stunde = { stunde: number; trichter: number; portal: number };
export type Tag = { tag: string; trichter: number; portal: number };

export type Verlauf = {
  /** 0–23 in Ortszeit, immer vollständig — auch die leeren Stunden gehören zur Grafik. */
  stunden: Stunde[];
  /**
   * Dieselben 24 Stunden, aber NUR der heutige Tag (Owner 14.09.2026: „ich will die Grafik auch
   * am Tag sehen").
   *
   * Hier sind die Stunden nach jetzt tatsächlich leer — das ist der Unterschied zur Verteilung
   * über vierzehn Tage, in der jede Stunde gefüllt ist und deshalb wie Zukunft aussah.
   */
  stundenHeute: Stunde[];
  /** Die letzten Tage, ältester zuerst, ohne Lücken. */
  tage: Tag[];
  /** Wie viele Tage der Ausschnitt umfasst. */
  fensterTage: number;
};

/* `sv-SE` schreibt „2026-09-14 21" — die einzige Schreibweise, aus der sich Tag und Stunde ohne
   Umweg schneiden lassen. */
const teile = (() => {
  const f = new Intl.DateTimeFormat("sv-SE", {
    timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  });
  return (ms: number) => {
    const s = f.format(new Date(ms));
    return { tag: s.slice(0, 10), stunde: Number(s.slice(11, 13)) };
  };
})();

/** Die Tage des Ausschnitts, ältester zuerst — in Ortszeit, damit sie zu den Zählungen passen. */
const tageListe = (fensterTage: number): string[] => {
  const tage: string[] = [];
  for (let i = fensterTage - 1; i >= 0; i--) tage.push(teile(Date.now() - i * 86400000).tag);
  return tage;
};

type Eintrag = { name?: string; id?: string | null; created_at?: string; updated_at?: string };

const listen = async (prefix: string, limit: number): Promise<Eintrag[]> => {
  const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit }),
  }).catch(() => null);
  if (!res?.ok) return [];
  const d = await res.json().catch(() => []);
  return Array.isArray(d) ? (d as Eintrag[]) : [];
};

/**
 * Der Verlauf über `fensterTage` Tage.
 *
 * SIE HÄLT NIE ETWAS AUF: Scheitert eine Liste, fehlt ihr Anteil und der Rest steht trotzdem da.
 * Eine leere Grafik ist besser als eine Fehlerseite für eine Statistik.
 */
export async function verlaufLesen(fensterTage = 14): Promise<Verlauf> {
  const tage = tageListe(fensterTage);
  const imFenster = new Set(tage);

  const stunden: Stunde[] = Array.from({ length: 24 }, (_, stunde) => ({ stunde, trichter: 0, portal: 0 }));
  const stundenHeute: Stunde[] = Array.from({ length: 24 }, (_, stunde) => ({ stunde, trichter: 0, portal: 0 }));
  const proTag = new Map<string, Tag>(tage.map(tag => [tag, { tag, trichter: 0, portal: 0 }]));

  /* Der letzte Tag der Liste IST heute — sie wird von jetzt aus rückwärts gebaut. */
  const heute = tage[tage.length - 1];

  const zaehlen = (ms: number, feld: "trichter" | "portal") => {
    const { tag, stunde } = teile(ms);
    /* Ausserhalb des Ausschnitts zählt auch die Stunde nicht — sonst stünde in der Stundengrafik
       ein halbes Jahr und in der Zeitleiste zwei Wochen, und beide hiessen „jetzt". */
    if (!imFenster.has(tag)) return;
    const t = proTag.get(tag);
    if (t) t[feld] += 1;
    const s = stunden[stunde];
    if (s) s[feld] += 1;
    if (tag === heute) {
      const h = stundenHeute[stunde];
      if (h) h[feld] += 1;
    }
  };

  /* ── DER TRICHTER: eine Datei je Besucher, angelegt beim ersten Schritt ── */
  for (const d of await listen(`versusforge-schritt/${EIGENER_MANDANT}/`, 1000)) {
    if (!String(d.name ?? "").endsWith(".json")) continue;
    const ms = Date.parse(String(d.created_at || d.updated_at || ""));
    if (Number.isFinite(ms)) zaehlen(ms, "trichter");
  }

  /* ── DAS PORTAL: eine Datei je Handgriff, Tag im Ordner, Uhrzeit im Namen ── */
  await Promise.all(tage.map(async tag => {
    for (const d of await listen(`versusforge-ereignis/${tag}/`, 1000)) {
      const name = String(d.name ?? "");
      if (!d.id || !name.endsWith(".json")) continue;
      /* `HHMMSS-…` — die Uhrzeit steht schon in Ortszeit? Nein: geschrieben wird UTC. Deshalb
         wieder zu einem Zeitpunkt zusammensetzen und wie alles andere umrechnen. */
      const hh = name.slice(0, 2), mm = name.slice(2, 4), ss = name.slice(4, 6);
      const ms = Date.parse(`${tag}T${hh}:${mm}:${ss}Z`);
      if (Number.isFinite(ms)) zaehlen(ms, "portal");
    }
  }));

  return {
    stunden,
    stundenHeute,
    tage: tage.map(t => proTag.get(t) ?? { tag: t, trichter: 0, portal: 0 }),
    fensterTage,
  };
}

/**
 * WIE VIELE WERKE WIRKLICH ANGEKOMMEN SIND (Owner 14.09.2026: „zweite Stufe").
 *
 * ── WARUM DAS NICHT DIE STUFE „WERK HOCHGELADEN" IST ────────────────────────────────────────
 *
 * Jene Stufe meldet `AgentChat`, sobald jemand Dateien AUSWÄHLT — die Bilder bleiben dabei im
 * Browser (so gewollt: ein Abbrecher soll keinen Modellaufruf kosten). Bei uns liegt ein Werk
 * erst, wenn er danach die Analyse auslöst. Zwischen beidem klafft die grösste Abbruchstelle des
 * Trichters, und genau die soll sichtbar werden.
 *
 * ── WARUM KEINE NEUE STUFE IN DER LEITER ────────────────────────────────────────────────────
 *
 * Die Leiter speichert die weiteste Stufe als ZAHL. Eine neue Stufe dazwischen verschiebt jede
 * bestehende Zahl: Wer heute `weit = 2` („Website beantwortet") hat, wäre morgen „Werk
 * angekommen". Das verfälscht rückwirkend alles, was je gemessen wurde.
 *
 * Gezählt wird deshalb, was ohnehin dasteht: ein Ordner je Gespräch unter
 * `versusforge-lauf-fotos/`, darin die Bilder. Kein Eingriff, keine Wanderung alter Daten.
 */
export async function angekommeneWerke(): Promise<{ gespraeche: number; bilder: number }> {
  /* Supabase gibt Ordner ohne `id` zurück — echte Dateien haben eine. */
  const ordner = (await listen("versusforge-lauf-fotos/", 1000))
    .filter(d => !d.id && d.name)
    .map(d => String(d.name));

  if (!ordner.length) return { gespraeche: 0, bilder: 0 };

  const jeOrdner = await Promise.all(
    ordner.map(async g => (await listen(`versusforge-lauf-fotos/${g}/`, 100)).filter(d => d.id).length),
  );

  return { gespraeche: ordner.length, bilder: jeOrdner.reduce((a, b) => a + b, 0) };
}
