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
/** „unbekannt" ist ein eigener Wert, keine Lücke: Wenn in der Anzeige kein Niveau stand,
    dürfen wir keines behaupten — und die Stelle darf trotzdem jedem gezeigt werden. */
export type Deutschniveau = "A2" | "B1" | "B2" | "C1" | "C2" | "unbekannt";
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
  /**
   * WOHER DIE STELLE STAMMT (Owner 31.08.2026) — die Jobplattform, auf der sie gefunden
   * wurde. Nur für uns: Sie sagt, welche Quelle brauchbare Stellen liefert, und sie ist der
   * Beleg dafür, dass hinter jeder Zeile eine echte Anzeige steht.
   */
  quelle?: string;
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

/** Wie gut die Stelle passt — der Bewerber sieht die Stufe, nicht die Punktzahl. */
export type Guete = "sehr-gut" | "gut" | "interessant";
export type Treffer = { stelle: Stelle; guete: Guete };

/**
 * DIE ZUORDNUNG — OHNE MODELL, MIT REGELN, UND BEWUSST NICHT ZU STRENG
 * (Owner 31.08.2026: „Nicht zu streng filtern. Ein Nutzer soll bei wenigen vorhandenen Jobs
 * möglichst nicht sofort 0 Treffer bekommen.").
 *
 * WAS SICH GEÄNDERT HAT: Das Sprachniveau war eine harte Bedingung — wer B1 angab, sah keine
 * einzige C1-Stelle. Bei zehn Stellen im Bestand führt das zu einer leeren Liste, und eine
 * leere Liste ist das Ende des Trichters. Jetzt schliesst nichts mehr aus: Eine Stelle über
 * seinem Niveau rutscht in „Ar putea fi interesant" statt zu verschwinden. Er sieht das
 * geforderte Niveau auf der Karte und entscheidet selbst — das ist ehrlicher als ein
 * stiller Filter.
 *
 * Ein Modell wäre hier teurer, langsamer und weniger nachvollziehbar; bei 20 Stellen rechnet
 * das der Server in Millisekunden. Erfinden darf ohnehin nichts etwas dazu.
 */
export function passendeMitGuete(stellen: Stelle[], wunsch: {
  deutsch?: Deutschniveau;
  arbeitsform?: Arbeitsform | "egal";
  /* Die vier Antworten auf Frage 3 (Owner 31.08.2026: „Mai multă flexibilitate" und
     „Oportunități de carieră" statt „Remote" und „Un job nou"). `flexibilitate` ist breiter
     als Remote — Hybrid zählt mit; `cariera` ist bewusst kein Filter, wer das wählt, ist
     offen, und dann entscheiden die ersten beiden Antworten allein. */
  ziel?: "salariu" | "flexibilitate" | "cariera" | "intoarcere";
  berufsfeld?: string;
  erfahrung?: Erfahrung;
}): Treffer[] {
  const offen = sichtbare(stellen);
  const meinNiveau = wunsch.deutsch && wunsch.deutsch !== "unbekannt"
    ? NIVEAUS.indexOf(wunsch.deutsch) : NIVEAUS.length - 1;

  const punkte = (s: Stelle): number => {
    let p = 0;

    /* SPRACHE — die wichtigste Zahl, aber kein Ausschluss mehr.
       Steht in der Anzeige kein Niveau („unbekannt"), gilt sie als offen und bekommt die
       mittlere Wertung: Wir behaupten weder, dass sie passt, noch dass sie es nicht tut. */
    if (s.deutschMin === "unbekannt") {
      p += 6;
    } else {
      const noetig = NIVEAUS.indexOf(s.deutschMin);
      if (noetig <= meinNiveau) {
        /* Er erfüllt es — je näher am geforderten Niveau, desto besser der Treffer. */
        p += 10 - (meinNiveau - noetig);
      } else {
        /* Er erfüllt es NICHT. Ein Schritt darüber ist erreichbar (B2 auf C1), zwei sind
           weit weg — beides bleibt sichtbar, aber weit unten. */
        p += Math.max(0, 4 - (noetig - meinNiveau) * 2);
      }
    }

    /* ARBEITSFORM */
    if (wunsch.arbeitsform && wunsch.arbeitsform !== "egal") {
      if (s.arbeitsform === wunsch.arbeitsform) p += 6;
      else if (wunsch.arbeitsform === "remote" && s.arbeitsform === "hibrid") p += 3;
      else if (wunsch.arbeitsform === "hibrid" && s.arbeitsform === "remote") p += 3;
    } else {
      p += 2;
    }

    /* HAUPTINTERESSE */
    if (wunsch.ziel === "salariu" && (s.gehaltBis || s.gehaltVon)) {
      p += Math.min(6, Math.round((s.gehaltBis || s.gehaltVon || 0) / 500));
    }
    if (wunsch.ziel === "flexibilitate") {
      if (s.arbeitsform === "remote") p += 5;
      else if (s.arbeitsform === "hibrid") p += 3;
    }
    if (wunsch.ziel === "intoarcere" && (s.land === "RO" || /rom[aâ]ni/i.test(s.ort))) p += 4;
    /* „Oportunități de carieră" ist kein Filter — wer das wählt, ist offen; dann zählen die
       anderen beiden Antworten allein. */

    /* KATEGORIE UND ERFAHRUNG — nur wenn beide Seiten etwas dazu sagen (Owner: „können
       berücksichtigt werden, wenn vorhanden"). */
    if (wunsch.berufsfeld && s.berufsfeld
      && s.berufsfeld.toLowerCase().includes(wunsch.berufsfeld.toLowerCase())) p += 3;
    if (wunsch.erfahrung && s.erfahrung === wunsch.erfahrung) p += 2;

    return p;
  };

  const bewertet = offen.map(s => ({ stelle: s, p: punkte(s) }));
  bewertet.sort((a, b) => b.p - a.p || (b.stelle.gehaltBis || 0) - (a.stelle.gehaltBis || 0));

  /* DIE STUFEN werden am BESTEN Treffer gemessen, nicht an einer festen Punktzahl: Bei zehn
     Stellen im Bestand wäre eine absolute Schwelle willkürlich — „sehr gut" heisst hier
     „das Beste, was wir für dich haben, und es passt wirklich". */
  const bester = bewertet[0]?.p ?? 0;
  return bewertet.map(({ stelle, p }) => ({
    stelle,
    guete: (p >= 14 && p >= bester * 0.85) ? "sehr-gut" as const
      : (p >= 9 || p >= bester * 0.6) ? "gut" as const
      : "interessant" as const,
  }));
}

/** Der alte Weg ohne Güte — bleibt, damit bestehende Aufrufer nicht brechen. */
export function passende(stellen: Stelle[], wunsch: Parameters<typeof passendeMitGuete>[1]): Stelle[] {
  return passendeMitGuete(stellen, wunsch).map(t => t.stelle);
}
