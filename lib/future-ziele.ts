/**
 * DIE ZIELE — DER EINE SCHRITT, DER DEM PROGRAMM SEINE RICHTUNG GIBT (Owner 11.08.2026:
 * „WHERE DO YOU WANT TO BE IN 5 YEARS?" · „Der User soll maximal 3 Hauptziele auswählen
 * können").
 *
 * WARUM ES DIESEN SCHRITT ÜBERHAUPT GIBT: Die persönliche Programmseite zeigt später einen
 * Abschnitt „YOUR DIRECTION" — und der darf NICHTS erfinden. Was dort steht, muss der Kunde
 * selbst gewählt haben. Bis heute fragte der Trichter nur nach Name, Look und Aufnahme; es
 * gab schlicht keine Daten für diesen Abschnitt.
 *
 * GESPEICHERT WIRD DIE KENNUNG, NIE DAS WORT. Der Auftrag trägt `["business","freedom"]`,
 * nicht „Mein eigenes Business" — sonst steht in einem rumänischen Auftrag ein deutsches
 * Wort, und die Programmseite könnte es nie in seiner Sprache zeigen. Die Wörter stehen hier
 * und nur hier; die Seite schlägt sie nach.
 *
 * HANDGESCHRIEBEN IN SIEBEN SPRACHEN statt durch die Übersetzungsmaschine: Es sind neun
 * kurze Begriffe, die auf Chips passen müssen (`min-h-11`, zwei Zeilen höchstens). Eine
 * Maschine liefert dafür gern „Finanzielle Unabhängigkeit und Freiheit" — richtig übersetzt
 * und trotzdem unbrauchbar, weil es den Chip sprengt.
 *
 * HÖCHSTENS DREI (`MAX_ZIELE`): Wer neun Ziele hat, hat keins. Die Zahl steht hier, damit
 * Trichter und Programmseite dieselbe lesen.
 */

/** Die Kennungen, die es gibt — der Wertevorrat für `ziele` am Auftrag. */
export const ZIEL_IDS = [
  "business", "freedom", "home", "travel", "career", "health", "family", "independence", "else",
] as const;

export type ZielId = (typeof ZIEL_IDS)[number];

/** „Something else" trägt als einziges einen freien Text (`zieleFrei` am Auftrag). */
export const ZIEL_FREI: ZielId = "else";

/**
 * DREI (Owner 11.08.2026: „maximal 3 Hauptziele"). Nicht als Schranke gedacht, sondern als
 * Entscheidung: Das 30-Tage-Programm fragt an Tag 3 „welches EINE Ziel verändert am meisten?"
 * — wer vorher neun angekreuzt hat, kommt an dieser Frage nicht vorbei, sondern hängt daran.
 */
export const MAX_ZIELE = 3;

type ZielTexte = {
  /** Die Überschrift über den Chips. */
  frage: string;
  /** Die Zeile darunter: „Wähl bis zu 3." */
  hinweis: string;
  /** Steht sie beisammen: „2 / 3" — die Zahl kommt aus dem Trichter. */
  zaehler: string;
  /** Platzhalter im Feld, das „Something else" aufmacht. */
  freiPlatzhalter: string;
  namen: Record<ZielId, string>;
};

export const ZIEL_TEXTE: Record<string, ZielTexte> = {
  en: {
    frage: "Where do you want to be in 5 years?",
    hinweis: "Choose up to 3.",
    zaehler: "chosen",
    freiPlatzhalter: "What exactly?",
    namen: {
      business: "My own business", freedom: "Financial freedom", home: "My dream home",
      travel: "Travel & freedom", career: "Career", health: "Health & fitness",
      family: "Family", independence: "Independence", else: "Something else",
    },
  },
  de: {
    frage: "Wo willst du in 5 Jahren sein?",
    hinweis: "Wähl bis zu 3.",
    zaehler: "gewählt",
    freiPlatzhalter: "Was genau?",
    namen: {
      business: "Mein eigenes Business", freedom: "Finanzielle Freiheit", home: "Mein Traumhaus",
      travel: "Reisen & Freiheit", career: "Karriere", health: "Gesundheit & Fitness",
      family: "Familie", independence: "Unabhängigkeit", else: "Etwas anderes",
    },
  },
  ro: {
    frage: "Unde vrei să fii peste 5 ani?",
    hinweis: "Alege până la 3.",
    zaehler: "alese",
    freiPlatzhalter: "Ce anume?",
    namen: {
      business: "Afacerea mea", freedom: "Libertate financiară", home: "Casa visurilor mele",
      travel: "Călătorii & libertate", career: "Carieră", health: "Sănătate & fitness",
      family: "Familie", independence: "Independență", else: "Altceva",
    },
  },
  es: {
    frage: "¿Dónde quieres estar dentro de 5 años?",
    hinweis: "Elige hasta 3.",
    zaehler: "elegidos",
    freiPlatzhalter: "¿Qué exactamente?",
    namen: {
      business: "Mi propio negocio", freedom: "Libertad financiera", home: "La casa de mis sueños",
      travel: "Viajar & libertad", career: "Carrera", health: "Salud & forma física",
      family: "Familia", independence: "Independencia", else: "Otra cosa",
    },
  },
  fr: {
    frage: "Où veux-tu être dans 5 ans ?",
    hinweis: "Choisis jusqu'à 3.",
    zaehler: "choisis",
    freiPlatzhalter: "Quoi exactement ?",
    namen: {
      business: "Ma propre entreprise", freedom: "Liberté financière", home: "La maison de mes rêves",
      travel: "Voyages & liberté", career: "Carrière", health: "Santé & forme",
      family: "Famille", independence: "Indépendance", else: "Autre chose",
    },
  },
  pt: {
    frage: "Onde queres estar daqui a 5 anos?",
    hinweis: "Escolhe até 3.",
    zaehler: "escolhidos",
    freiPlatzhalter: "O quê exatamente?",
    namen: {
      business: "O meu próprio negócio", freedom: "Liberdade financeira", home: "A casa dos meus sonhos",
      travel: "Viagens & liberdade", career: "Carreira", health: "Saúde & forma",
      family: "Família", independence: "Independência", else: "Outra coisa",
    },
  },
  it: {
    frage: "Dove vuoi essere fra 5 anni?",
    hinweis: "Scegli fino a 3.",
    zaehler: "scelti",
    freiPlatzhalter: "Cosa esattamente?",
    namen: {
      business: "La mia attività", freedom: "Libertà finanziaria", home: "La casa dei miei sogni",
      travel: "Viaggi & libertà", career: "Carriera", health: "Salute & forma",
      family: "Famiglia", independence: "Indipendenza", else: "Altro",
    },
  },
};

/** Die Texte in seiner Sprache — unbekannte Sprache fällt auf Englisch zurück. */
export function zielTexte(lang: string | undefined): ZielTexte {
  return ZIEL_TEXTE[String(lang ?? "en").slice(0, 2)] ?? ZIEL_TEXTE.en;
}

/**
 * Aus dem, was der Browser schickt, wird eine saubere Liste: nur bekannte Kennungen,
 * keine Doppelten, höchstens drei. Die Kasse und die Programmseite lesen dasselbe.
 */
export function zieleSaeubern(roh: unknown): ZielId[] {
  if (!Array.isArray(roh)) return [];
  const erlaubt = new Set<string>(ZIEL_IDS);
  const raus: ZielId[] = [];
  for (const x of roh) {
    const id = String(x ?? "").trim();
    if (erlaubt.has(id) && !raus.includes(id as ZielId)) raus.push(id as ZielId);
    if (raus.length >= MAX_ZIELE) break;
  }
  return raus;
}
