import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * DIE DAVID-SITZUNG — LEAD UND SCREENING IN EINER DATEI (`david/<id>.json`).
 *
 * Dasselbe Muster wie `lib/kandidaten-store.ts` und `lib/lebenslauf-store.ts`: eine Datei je
 * Sitzung, kein Merge zweier Listen, jeder Schreibvorgang steht für sich.
 *
 * WARUM EIN EIGENER SPEICHER UND NICHT DER KANDIDATEN-POOL (Abweichung von meinem eigenen
 * Plan vom 28.08.2026, und zwar mit Absicht): Der Pool bedeutet „LuxuryBandit darf dich
 * Arbeitgebern vorstellen" — eine ausdrückliche Einwilligung, die David gar nicht einholt.
 * Davids Datenschutzhinweis erlaubt etwas anderes: das Screening durchzuführen, zu speichern
 * und die Nutzung auszuwerten. Zwei verschiedene Zustimmungen in eine Datei zu legen, heisst
 * früher oder später, die eine für die andere zu halten — und das ist genau der Fehler, den
 * man bei Einwilligungen nicht machen darf. Wer später in den Pool will, sagt das dort
 * eigens.
 *
 * PROGRESSIV GESPEICHERT (Haltung wie im Kandidaten-Trichter): Der Lead steht, sobald
 * Vorname, E-Mail und Bestätigung da sind — nicht erst nach dem Lebenslauf, nicht erst nach
 * dem Screening. Wer abbricht, ist trotzdem erfasst.
 */

/** Eine Frage des Screenings mit der Antwort des Bewerbers. */
export type DavidFrage = {
  frage: string;
  antwort?: string;
  /** War das eine Nachfrage zu einer zu allgemeinen Antwort? */
  nachhaken?: boolean;
  /**
   * ER HAT DIESE FRAGE ÜBERSPRUNGEN (Owner 29.08.2026: „hier machst du es ihm schwer. Er
   * kann ohne Antwort weder vor noch zurück.").
   *
   * Wichtig zu unterscheiden von „noch nicht beantwortet": Eine übersprungene Frage ist
   * ERLEDIGT — David darf nicht darauf zurückkommen, und der Bericht darf sie nicht als
   * offenen Punkt zählen. Ohne dieses Feld sähe beides gleich aus.
   */
  uebersprungen?: boolean;
  /**
   * WELCHE LÜCKE DIESE FRAGE SCHLIESSEN SOLLTE (Owner 29.08.2026, Qualitätsauftrag).
   *
   * Das Modell muss zu jeder Frage benennen, warum es sie stellt — wer die Lücke nennen muss,
   * stellt keine Füllfrage mehr. Der Bewerber sieht das nie; es steht hier, damit man in der
   * Admin-Liste nachlesen kann, ob David wirklich Lücken schliesst.
   */
  luecke?: string;
  bereich?: DavidBereich;
  gestelltAm?: string;
};

/** Die fünf Dinge, die David im Gespräch herausfinden soll (Owner-Vorgabe §12). */
export type DavidBereich = "passung" | "belege" | "motivation" | "recruiterfragen" | "selbstbild";

export type DavidErkenntnisse = {
  passung: string[];
  belege: string[];
  motivation: string[];
  recruiterfragen: string[];
  selbstbild: string[];
};

/**
 * Der fertige Bericht — die vier Abschnitte plus Davids persönliche Einordnung.
 *
 * `titel` und `tags` kamen am 28.08.2026 mit dem Design des Owners dazu: Die Karten tragen
 * eine kurze Überschrift („End-to-End Impact") und darunter zwei bis drei Häkchen-Wörter.
 * Beide sind OPTIONAL — Berichte, die vor dem Design entstanden sind, haben sie nicht, und
 * die Ansicht muss sie deshalb ohne Lücke weglassen können.
 */
export type DavidReport = {
  /** A) „Das spricht für dich" — Punkt + Beleg aus CV oder Gespräch. */
  spricht: { punkt: string; beleg: string; titel?: string; tags?: string[] }[];
  /** B) „Das könnte Fragen auslösen" — nie als Ablehnungsgrund formuliert. */
  offeneFragen: { punkt: string; warum: string; titel?: string }[];
  /** C) „Was dein Lebenslauf noch nicht erzählt" — aus dem Gespräch, nicht aus dem CV. */
  fehltImCv: { punkt: string; warum: string }[];
  /** D) „Darauf solltest du vorbereitet sein" — 3–5 Fragen zu genau diesem Fall. */
  vorbereiten: string[];
  /**
   * E) „SO SAGST DU ES BESSER" (Owner 29.08.2026: „magst eine Zusammenfassung und gleich
   * Vorschlag. Der User kann deinen Vorschlag übernehmen." · „besser ist es am Ende das zu
   * machen, sonst wird das Ganze zu kompliziert").
   *
   * Zuerst hatte ich es MITTEN ins Gespräch gebaut — nach jeder dünnen Antwort ein Vorschlag
   * zum Übernehmen. Der Owner hat es gestoppt, und zu Recht: Wer bei jeder Frage zusätzlich
   * einen Textbaustein angeboten bekommt, verliert den Faden. Am Ende, wenn alles gesagt ist,
   * steht dasselbe in Ruhe da — und dort ist es zugleich der Beleg für das bezahlte Produkt.
   *
   * `gesagt` ist SEIN Satz (sinngemäss, nie wörtlich blossgestellt), `besser` die Fassung, die
   * ein Recruiter braucht — mit sichtbaren Lücken in eckigen Klammern für Zahlen, die er
   * selbst kennt. Erfunden wird nichts.
   */
  besserSagen?: { gesagt: string; besser: string }[];
  /** Davids persönliche Einordnung zum Schluss (§18) — eine Beobachtung, kein Zuspruch. */
  einordnung: string;
  /**
   * DER EINE SATZ, DER HÄNGEN BLEIBT (Design des Owners 28.08.2026: im Insight-Block steht
   * ein kurzer Kernsatz, dessen Schluss in Gold gesetzt ist). Er stammt aus der Einordnung
   * und wird nicht zusätzlich erfunden.
   */
  kernsatz?: string;
};

export type DavidNuetzlich = "sehr" | "nuetzlich" | "teilweise" | "kaum";

export type DavidSitzung = {
  id: string;
  device?: string;
  sprache?: string;

  /* ── Der Lead (§6) ───────────────────────────────────────────────────────── */
  vorname?: string;
  email?: string;
  /** Die NOTWENDIGE Bestätigung am E-Mail-Schritt — NICHT Werbe-Einwilligung (§5). */
  datenschutzBestaetigt?: boolean;
  datenschutzAm?: string;
  datenschutzVersion?: string;
  /** Woher der Besuch kam — falls die Adresse UTM-Werte trug. */
  utm?: Record<string, string>;

  /* ── Lebenslauf und Stelle ───────────────────────────────────────────────── */
  cvPath?: string;
  cvName?: string;
  /**
   * Was David im Lebenslauf gesehen hat — SEINE Beobachtungen, nie erfundene Fakten.
   *
   * `zusammenfassung` ist der wichtigste Teil: eine nüchterne Faktenfassung des Dokuments,
   * die ALLE weiteren Schritte als Quelle benutzen. Dadurch geht das PDF genau EINMAL an
   * die KI statt bei jeder Frage erneut (siehe app/api/david-screening/route.ts).
   */
  cvBefund?: {
    beobachtungen: string[]; rolle?: string; schwerpunkte?: string[]; zusammenfassung: string;
    /**
     * WIE DER LEBENSLAUF AUSSIEHT — NUR DIE STUFE, KEINE KRITIK IM DETAIL (Owner
     * 28.08.2026: „Ich würde nur eine kurze Analyse machen aber nicht genau sagen was da
     * falsch ist nur Layout sehr gut, geht so, suboptimal").
     *
     * Der Grund ist kaufmännisch und richtig: Die Einstufung schafft Problembewusstsein,
     * die Lösung ist das Produkt. Wer die vollständige Layout-Kritik gratis bekommt,
     * bastelt selbst weiter.
     *
     * NUR AUS EINEM PDF: Eine Word-Datei geht als reiner TEXT in die Analyse — ihr Layout
     * entsteht erst beim Öffnen, wir sehen es nicht. Dann bleibt das Feld leer, und die
     * Anzeige lässt die Zeile weg, statt zu raten.
     */
    layout?: "gut" | "mittel" | "schwach";
    /** Trägt der Lebenslauf ein Bewerbungsfoto? (ebenfalls nur bei PDF erkennbar) */
    foto?: boolean;
    /**
     * WAS ER AUF DIESEM FOTO TRÄGT (Owner 28.08.2026: „man kann es auch aus seinem cv bild
     * ableiten") — die ehrlichste Vorlage für den Look im Video: So hat er sich selbst
     * entschieden zu zeigen. Rein beschreibend und nur die Kleidung; über den Menschen auf
     * dem Bild wird nichts abgeleitet (siehe REGELN in app/api/david-screening).
     */
    kleidungImFoto?: string;
  };
  jobText?: string;
  /**
   * ER HAT BEWUSST OHNE STELLE WEITERGEMACHT (Owner 29.08.2026, Weg „A").
   *
   * Nicht dasselbe wie „jobText fehlt": Das kann auch ein Abbruch mitten im Schritt sein.
   * Dieses Feld sagt, dass er die Rückfrage gelesen und sich entschieden hat — Bericht und
   * Angebot verhalten sich daraufhin anders, statt eine fehlende Anzeige als Fehler zu
   * behandeln.
   */
  ohneStelle?: boolean;
  jobTitel?: string;
  /** Aus der Anzeige gelesen — für die Kopfzeile des Ergebnisses („München, hybrid · Vollzeit"). */
  jobOrt?: string;
  jobArt?: string;
  jobBefund?: { aufgaben: string[]; anforderungen: string[]; offen: string[] };

  /* ── Das Gespräch ────────────────────────────────────────────────────────── */
  fragen?: DavidFrage[];
  erkenntnisse?: DavidErkenntnisse;
  screeningFertigAm?: string;
  report?: DavidReport;
  reportGesehenAm?: string;
  /**
   * WANN DIE „DEINE ANALYSE IST FERTIG"-MAIL RAUSGING (28.08.2026).
   *
   * Sie ist der einzige Faden, an dem der spätere Kauf noch hängt — und genau deshalb darf
   * sie nur EINMAL klingeln. Der Stempel steht, BEVOR geschickt wird: Lieber eine Mail zu
   * wenig als zwei, wenn der Bewerber die Seite neu lädt.
   */
  berichtMailAt?: string;
  /**
   * DER EINE FREIE ANLAUF (Owner 29.08.2026: „er kann hier nicht immer wieder neue Versuche
   * machen umsonst" → „oder wir sagen, er hat noch einen Anlauf frei").
   *
   * Der Stempel ist der Riegel, und er gehört auf den SERVER: Ein Merker im Browser wäre in
   * zehn Sekunden gelöscht. Steht er, ist der Anlauf verbraucht — der Knopf verschwindet dann
   * ganz, statt ausgegraut dazustehen.
   *
   * WARUM ER TROTZDEM GRATIS SEIN DARF: Der Anlauf ersetzt nur gespeicherte Antworten. Es
   * läuft kein zusätzlicher Modell-Aufruf — der Bericht wäre ohnehin einmal entstanden. Er
   * kostet uns also nichts und macht aus einem dünnen Bericht einen, der verkauft.
   */
  nachbesserungAm?: string;
  /**
   * WANN DER RÜCKWEG VERSCHICKT WURDE (Owner 29.08.2026) — die Mail direkt nach dem Lead,
   * die ihn jederzeit in SEINE Sitzung zurückbringt. Derselbe Einmal-Stempel wie bei
   * `berichtMailAt`: Jeder weitere POST auf den Lead-Schritt (Neuladen, Korrektur des
   * Namens, ein zweiter Tab) darf nicht erneut klingeln.
   */
  rueckwegMailAt?: string;


  /* ── Danach (§27–30) ─────────────────────────────────────────────────────── */
  nuetzlichkeit?: DavidNuetzlich;
  /** Freitext, nur bei „teilweise"/„kaum" gefragt. */
  feedback?: string;
  /** Mehrfachauswahl künftiger Leistungen — reine Produktentwicklung, kein Verkauf. */
  interessen?: string[];
  /** FREIWILLIG und getrennt von der Datenschutzbestätigung (§30). */
  marketingOptIn?: boolean;
  marketingOptInAm?: string;

  /**
   * WAS DIESE SITZUNG AN MODELL-LEISTUNG VERBRAUCHT HAT (Owner 28.08.2026: „ich will
   * wissen, was mich das kostet") — gezählt aus der `usage` jeder Antwort, nicht geschätzt.
   * Getrennt nach kleinem Modell (das Gespräch) und grossem (Bericht und Einordnung), weil
   * die beiden unterschiedlich kosten.
   */
  verbrauch?: {
    aufrufe: number;
    kleinHinein: number; kleinHeraus: number;
    grossHinein: number; grossHeraus: number;
  };

  erstelltAm: string;
  aktualisiertAm: string;
};

/**
 * DIE VERSION DES HINWEISES, DEM ER ZUGESTIMMT HAT. Ändert sich der Text, ändert sich diese
 * Zeichenkette — sonst lässt sich später nicht mehr sagen, WOZU jemand Ja gesagt hat.
 */
export const DAVID_DATENSCHUTZ_VERSION = "david-v1-2026-08";

/** Die Auswahl aus §28 — Wert = Speicherwert, Beschriftung steht im Funnel. */
export const DAVID_INTERESSEN = [
  "jobs-weltweit", "komplette-bewerbung", "bewerbungsseite",
  "video-bewerbung", "karriereanalyse", "beratung", "nichts",
] as const;

const pfad = (id: string) => `david/${id}.json`;

export async function leseDavid(id: string): Promise<DavidSitzung | null> {
  if (!id) return null;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(id))}`);
  if (!res.ok) return null;
  try { return (await res.json()) as DavidSitzung; } catch { return null; }
}

export async function schreibeDavid(s: DavidSitzung): Promise<boolean> {
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(s.id))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(s),
  });
  return res.ok;
}

/** NUR für die Admin-Liste — dasselbe Muster wie `listeKandidaten`. */
export async function listeDavid(): Promise<DavidSitzung[]> {
  const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "david/", limit: 1000 }),
  });
  if (!res.ok) return [];
  const dateien = (await res.json().catch(() => [])) as { name?: string }[];
  const ids = (Array.isArray(dateien) ? dateien : [])
    .map(d => String(d?.name ?? ""))
    .filter(n => n.endsWith(".json"))
    .map(n => n.replace(/\.json$/, ""));
  const alle = await Promise.all(ids.map(leseDavid));
  return alle
    .filter((s): s is DavidSitzung => !!s)
    .sort((a, b) => (b.aktualisiertAm || "").localeCompare(a.aktualisiertAm || ""));
}

/**
 * DER TAGES-DECKEL JE GERÄT — weil jeder Durchlauf uns Geld kostet.
 *
 * Ein vollständiges Screening sind rund zehn KI-Aufrufe (Lebenslauf lesen, Anzeige
 * vergleichen, vier bis sieben Fragen, Bericht, Einordnung). Gratis heisst für den Bewerber
 * gratis, nicht für uns — ohne Deckel schreibt ein einziges Skript unsere Rechnung voll
 * (dieselbe Haltung wie beim Gratis-Bild: ein Versuch je Gerät und Tag).
 *
 * Gezählt werden GESTARTETE Screenings, nicht Aufrufe: Wer seinen Bericht noch einmal
 * ansieht, zahlt nichts nach.
 */
/**
 * ZWEI WAREN ZU WENIG (Owner 29.08.2026: „ich kann's nicht testen" — der Deckel sperrte ihn
 * beim eigenen Produkt aus, und zwar mitten in der Abnahme vor dem Anzeigenstart).
 *
 * Der Deckel schützt vor Missbrauch, nicht vor Interesse. Zwei je Tag trifft auch den
 * ehrlichen Fall: Wer sich auf zwei Stellen bewirbt und danach eine dritte findet, steht vor
 * einer Sperre — bei einem Produkt, das GRATIS überzeugen soll. Fünf kosten uns im
 * schlimmsten Fall rund 25 Cent je Gerät und Tag; ein verlorener Interessent kostet mehr.
 */
export const DAVID_PRO_TAG = 5;

type Zaehler = { tag: string; anzahl: number };
const zaehlerPfad = (device: string) => `david-limit/${device}.json`;

/** Wie viele Screenings dieses Gerät heute schon gestartet hat. */
export async function davidHeuteGezaehlt(device: string): Promise<number> {
  if (!device) return 0;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(zaehlerPfad(device))}`);
  if (!res.ok) return 0;
  try {
    const z = (await res.json()) as Zaehler;
    return z?.tag === new Date().toISOString().slice(0, 10) ? Number(z.anzahl) || 0 : 0;
  } catch { return 0; }
}

/** Einen Start verbuchen. Gibt die neue Zahl zurück (0, wenn kein Gerät bekannt ist). */
export async function davidHeuteHochzaehlen(device: string): Promise<number> {
  if (!device) return 0;
  const heute = new Date().toISOString().slice(0, 10);
  const anzahl = (await davidHeuteGezaehlt(device)) + 1;
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(zaehlerPfad(device))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify({ tag: heute, anzahl } satisfies Zaehler),
  });
  return anzahl;
}
