import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * DIE STELLENLISTE — EIN EIGENER, KLEINER SPEICHER (Owner 31.08.2026).
 *
 * WARUM ES DIESEN TRICHTER GIBT: „Menschen wollen keinen Pre-Screening-Agenten. Sie wollen
 * einen besseren Job." David verkauft den Weg; dieser Trichter verkauft das Ziel. Er fragt
 * drei Dinge per Klick, zeigt ECHTE offene Stellen und holt die Adresse erst, wenn der
 * Bewerber gesehen hat, dass es etwas zu holen gibt.
 *
 * KEINE ERFUNDENEN JOBS (Owner ausdrücklich): „Wenn wir schreiben ‚Es gibt Jobs für
 * Deutschsprachige', müssen dahinter echte Stellen stehen." Die KI darf später sagen,
 * WELCHE drei am besten passen — sie darf keine dazuerfinden. Deshalb ist diese Liste
 * handgepflegt und die einzige Quelle; es gibt keinen Pfad, auf dem ein Modell hier
 * hineinschreibt.
 *
 * WARUM NICHT IN DEN GEMEINSAMEN BLOB: Dieselbe Begründung wie beim Lebenslauf-Speicher —
 * der grosse `TryThisLookState` trägt drei bekannte Fallen beim Schreiben (Memory
 * `delete-resurrection-merge-bug`). Hier liegt EINE Datei mit der ganzen Liste; sie ist
 * klein, wird selten geschrieben und immer als Ganzes.
 *
 * WARUM EINE DATEI UND NICHT EINE JE STELLE: Der Trichter braucht bei jedem Besuch ALLE
 * aktiven Stellen zum Zuordnen. Bei einer Datei je Stelle wären das 20 bis 100 Abrufe pro
 * Besucher; so ist es einer.
 */

const PFAD = "joburi/liste.json";

export type Arbeitsform = "remote" | "hibrid" | "birou";
export type Deutschniveau = "A2" | "B1" | "B2" | "C1" | "C2";
export type Erfahrung = "junior" | "mid" | "senior";

export type Stelle = {
  id: string;
  /** Wann sie eingetragen wurde — für „neu seit deinem letzten Besuch". */
  erstelltAm: string;
  aktualisiertAm?: string;

  titel: string;
  firma: string;
  /** Frei geschrieben, mehrere erlaubt: „Timișoara, Arad, Sibiu" oder „Remote (RO)". */
  ort: string;
  /** Land, damit später auch Stellen ausserhalb Rumäniens sauber getrennt werden können. */
  land?: string;
  arbeitsform: Arbeitsform;

  /**
   * DAS DEUTSCHNIVEAU IST DAS HERZ DES MATCHINGS: Die erste Frage im Trichter fragt danach,
   * und wer C1 hat, soll auch B1-Stellen sehen — nicht umgekehrt. Deshalb steht hier das
   * MINDESTNIVEAU, nicht das gewünschte.
   */
  deutschMin: Deutschniveau;

  /**
   * DAS GEHALT IST DAS ZUGPFERD (abgelesen an der Liste, die der Owner am 31.08. gezeigt
   * hat): Erst die Zahl bringt jemanden dazu, seine Adresse herzugeben. Beide Felder sind
   * optional — eine Stelle ohne Angabe wird gezeigt, aber ohne Zahl.
   */
  gehaltVon?: number;
  gehaltBis?: number;
  /** Falls die Zahl geschätzt ist und nicht in der Anzeige stand — muss dann auch so
      dastehen, sonst versprechen wir etwas, das der Arbeitgeber nie gesagt hat. */
  gehaltGeschaetzt?: boolean;
  waehrung?: string;

  berufsfeld?: string;
  vertragsart?: string;
  erfahrung?: Erfahrung;
  kurzbeschreibung?: string;

  /** WIR VERLINKEN, WIR KOPIEREN NICHT: Die Bewerbung läuft auf der Originalanzeige. */
  link?: string;
  logoUrl?: string;

  relocation?: boolean;
  /** Muss der Bewerber in Rumänien sitzen? */
  rumaenienNoetig?: boolean;

  aktiv: boolean;
  /** Nach diesem Tag wird sie nicht mehr gezeigt — eine tote Stelle ist schlimmer als keine. */
  laeuftAbAm?: string;
};

type Liste = { stellen: Stelle[]; gespeichertAm: string };

export async function leseStellen(): Promise<Stelle[]> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(PFAD)}?frisch=${Date.now()}`);
    if (!res.ok) return [];
    const daten = (await res.json().catch(() => null)) as Liste | null;
    return Array.isArray(daten?.stellen) ? daten.stellen : [];
  } catch {
    return [];
  }
}

export async function schreibeStellen(stellen: Stelle[]): Promise<boolean> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(PFAD)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
      body: JSON.stringify({ stellen: stellen.slice(0, 500), gespeichertAm: new Date().toISOString() } satisfies Liste),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * WAS DER BEWERBER SEHEN DARF: aktiv, nicht abgelaufen. Der Filter steht hier und nicht in
 * der Route, damit keine zweite Stelle ihn vergessen kann.
 */
export function sichtbare(stellen: Stelle[]): Stelle[] {
  const heute = new Date().toISOString().slice(0, 10);
  return stellen.filter(s => s.aktiv && (!s.laeuftAbAm || s.laeuftAbAm >= heute));
}

/**
 * DIE ZUORDNUNG — OHNE MODELL, MIT REGELN.
 *
 * Drei Klickfragen, drei Regeln. Ein Modell wäre hier teurer, langsamer und weniger
 * nachvollziehbar; bei 20 Stellen und drei Kriterien rechnet das der Server in
 * Millisekunden. Wenn die Liste einmal gross ist, kann ein Modell die Reihenfolge der
 * besten zehn verfeinern — erfinden darf es weiterhin nichts.
 *
 * NIEMALS LEER: Passt nichts genau, kommen die besten Näherungen. Ein Trichter, der „keine
 * Treffer" sagt, hat den Besucher verloren — und die Anzeige hat für ihn bezahlt.
 */
const NIVEAUS: Deutschniveau[] = ["A2", "B1", "B2", "C1", "C2"];

export function passende(stellen: Stelle[], wunsch: {
  deutsch?: Deutschniveau;
  arbeitsform?: Arbeitsform | "egal";
  ziel?: "salariu" | "remote" | "job-nou" | "intoarcere";
}): Stelle[] {
  const offen = sichtbare(stellen);
  const meinNiveau = wunsch.deutsch ? NIVEAUS.indexOf(wunsch.deutsch) : NIVEAUS.length - 1;

  const punkte = (s: Stelle): number => {
    let p = 0;
    /* Das Sprachniveau ist die harte Bedingung: Was er nicht erfüllt, gehört nicht in seine
       Liste — eine Stelle, auf die er sich nicht bewerben kann, ist eine Enttäuschung mit
       Ansage. Erfüllt er es, zählt die Nähe: C1 auf eine C1-Stelle ist ein besserer Treffer
       als C2 auf eine A2-Stelle. */
    const noetig = NIVEAUS.indexOf(s.deutschMin);
    if (noetig > meinNiveau) return -1;
    p += 10 - (meinNiveau - noetig);

    if (wunsch.arbeitsform && wunsch.arbeitsform !== "egal") {
      if (s.arbeitsform === wunsch.arbeitsform) p += 6;
      /* „Remote gewünscht, hybrid vorhanden" ist eine Näherung, keine Absage. */
      else if (wunsch.arbeitsform === "remote" && s.arbeitsform === "hibrid") p += 2;
    } else {
      p += 1;
    }

    /* Wer wegen des Gehalts sucht, sieht die bestbezahlten zuerst; wer remote will, die
       Remote-Stellen; wer zurück nach Rumänien will, die mit Standort im Land. */
    if (wunsch.ziel === "salariu" && (s.gehaltBis || s.gehaltVon)) p += Math.min(6, Math.round(((s.gehaltBis || s.gehaltVon || 0) / 500)));
    if (wunsch.ziel === "remote" && s.arbeitsform === "remote") p += 5;
    if (wunsch.ziel === "intoarcere" && (s.land === "RO" || /rom[aâ]ni/i.test(s.ort))) p += 4;
    return p;
  };

  const bewertet = offen.map(s => ({ s, p: punkte(s) })).filter(x => x.p >= 0);
  bewertet.sort((a, b) => b.p - a.p || (b.s.gehaltBis || 0) - (a.s.gehaltBis || 0));
  /* Keine Treffer trotz allem (z. B. A2 und alle Stellen verlangen B2): dann die mit dem
     niedrigsten Anspruch zeigen, damit er sieht, wohin die Reise ginge. */
  if (!bewertet.length) {
    return [...offen].sort((a, b) => NIVEAUS.indexOf(a.deutschMin) - NIVEAUS.indexOf(b.deutschMin)).slice(0, 6);
  }
  return bewertet.map(x => x.s);
}
