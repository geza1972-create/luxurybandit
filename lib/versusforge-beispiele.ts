/**
 * DIE TOP-BEISPIELE — was am Anfang gezeigt wird (Owner 09.09.2026: „ich würde eher Top-
 * Beispiele nehmen, nicht mit seinem Namen und seinen Bildern am Anfang" · „und auch nicht
 * mit seinem Text").
 *
 * ── WARUM NICHT AUS SEINEM SATZ ────────────────────────────────────────────────────────────
 *
 * Mein erster Bau machte das Beispiel aus dem einen Satz, den er getippt hatte. Drei
 * Einwände des Owners, und alle drei stimmen:
 *
 *  · SEIN BILD KANN DANEBENLIEGEN. Wir nehmen das erste brauchbare Foto seiner Startseite —
 *    das kann der Sommergarten sein oder ein Teller von 2019, oder genau das, wofür er NICHT
 *    werben will. Sehen kann es niemand von uns.
 *  · SEIN NAME AUF EINEM ENTWURF ist eine Behauptung. Was aus einem Satz entsteht, ist noch
 *    nicht seine Anzeige — sie trotzdem mit seinem Namen zu zeigen, verspricht ein Ergebnis,
 *    das erst nach den Fragen entsteht.
 *  · SEIN TEXT IST NOCH NICHT GUT. Aus einer Zeile wird kein starker Hook. Der erste
 *    Eindruck vom Ergebnis wäre damit ausgerechnet das schwächste, was die Maschine kann.
 *
 * ── WARUM FESTE BEISPIELE BESSER SIND ──────────────────────────────────────────────────────
 *
 * Sie sind unsere besten, und wir kennen sie. Kein Zufall, keine Panne, kein fremdes Foto.
 * Und sie beweisen genau das, worum es geht: So sieht der Satz aus, den du am Ende bekommst.
 *
 * ── HANDGESCHRIEBEN JE SPRACHE, NICHT ÜBERSETZT ────────────────────────────────────────────
 *
 * Ein Hook überlebt keine maschinelle Übersetzung. „Sie lachen auf Fotos mit geschlossenem
 * Mund" lebt vom Bild im Kopf, nicht von den Wörtern — wortwörtlich übertragen wird daraus
 * ein Satz, der nichts mehr auslöst. Also drei eigene Fassungen, jede für sich geschrieben.
 *
 * ── JEDER FOLGT DEM REZEPT ─────────────────────────────────────────────────────────────────
 *
 * Höchstens zwölf Wörter · kein Werbewort · spricht über den Leser, nicht über den Betrieb ·
 * eine Sache, die man sich vorstellen kann. Dieselben Regeln, an denen `hook_pruefen` misst.
 *
 * KEIN FOTO. Diese Kacheln sind Schrift auf Weiss — das ist das Format, das der Betrieb am
 * Ende selbst bekommt, und es kostet nichts. Sobald es eigene, freie Fotos gibt, kann hier
 * je Beispiel eines dazukommen; ein fremdes Bild kommt nicht in Frage.
 */

export type Beispiel = {
  /** Wozu es passt — grob, für die Auswahl. */
  fach: string;
  /** Wörter, die auf dieses Fach hindeuten. Klein geschrieben. */
  woerter: string[];
  hook: Record<string, string>;
  aufruf: Record<string, string>;
};

export const BEISPIELE: Beispiel[] = [
  {
    fach: "Gastronomie",
    woerter: ["restaurant", "lokal", "bistro", "gastro", "küche", "bucatarie", "terasa", "pizza", "bar", "café", "cafe", "catering", "food"],
    hook: {
      de: "Das Lamm liegt neun Stunden über Buchenholz. Deshalb ist Samstag voll.",
      en: "The lamb sits nine hours over beechwood. That is why Saturday is full.",
      ro: "Mielul stă nouă ore pe lemn de fag. De asta sâmbăta e plin.",
    },
    aufruf: { de: "Tisch reservieren", en: "Book a table", ro: "Rezervă o masă" },
  },
  {
    fach: "Zahnarzt und Gesundheit",
    woerter: ["zahnarzt", "zahn", "dental", "praxis", "arzt", "medic", "stomatolog", "clinic", "klinik", "physio", "therapie"],
    hook: {
      de: "Sie lachen auf Fotos mit geschlossenem Mund. Das muss nicht bleiben.",
      en: "You smile with your mouth closed in photos. It does not have to stay that way.",
      ro: "Zâmbești în poze cu gura închisă. Nu trebuie să rămână așa.",
    },
    aufruf: { de: "Termin anfragen", en: "Request an appointment", ro: "Cere o programare" },
  },
  {
    fach: "Handwerk und Bau",
    woerter: ["handwerk", "bau", "sanierung", "maler", "elektriker", "installateur", "constructii", "instalator", "tamplar", "schreiner", "dach", "bad"],
    hook: {
      de: "Ihr Bad ist von 1994. In vierzehn Tagen ist es das nicht mehr.",
      en: "Your bathroom is from 1994. In fourteen days it will not be.",
      ro: "Baia ta e din 1994. În paisprezece zile nu mai e.",
    },
    aufruf: { de: "Angebot anfragen", en: "Get a quote", ro: "Cere ofertă" },
  },
  {
    fach: "Räume und Veranstaltungen",
    woerter: ["event", "saal", "hochzeit", "nunta", "nunți", "veranstaltung", "location", "vermietung", "inchiriere", "feier", "seminar"],
    hook: {
      de: "120 Gäste, ein Pool, kein Saal mit Teppichboden.",
      en: "120 guests, a pool, no hall with carpet on the floor.",
      ro: "120 de invitați, o piscină, nicio sală cu mochetă.",
    },
    aufruf: { de: "Termin sichern", en: "Check a date", ro: "Verifică o dată" },
  },
  {
    fach: "Dienstleistung allgemein",
    woerter: [],
    hook: {
      de: "Sie haben dreimal angerufen und niemand ist rangegangen. Bei uns schon.",
      en: "You called three times and nobody picked up. Here someone does.",
      ro: "Ai sunat de trei ori și nu a răspuns nimeni. La noi da.",
    },
    aufruf: { de: "Jetzt anfragen", en: "Get in touch", ro: "Scrie-ne acum" },
  },
];

/**
 * Das Beispiel, das am ehesten zu dem passt, was er gesagt hat.
 *
 * KEINE KLUGE SUCHE, EIN WÖRTERVERGLEICH. Es geht nicht darum, sein Fach zu treffen, sondern
 * darum, ihn nicht zu verwirren: Ein Wirt, dem eine Zahnarzt-Kachel gezeigt wird, denkt eine
 * Sekunde lang, er sei falsch. Findet sich nichts, gewinnt das letzte — es passt auf jeden
 * Betrieb, bei dem jemand anruft.
 */
export function beispielFuer(text: string): Beispiel {
  const t = String(text ?? "").toLowerCase();
  for (const b of BEISPIELE) {
    if (b.woerter.some(w => t.includes(w))) return b;
  }
  return BEISPIELE[BEISPIELE.length - 1];
}

/** Hook und Aufruf in seiner Sprache; unbekannte Sprache fällt auf Deutsch zurück. */
export function beispielText(b: Beispiel, sprache: string): { hook: string; aufruf: string } {
  const l = String(sprache ?? "de").slice(0, 2).toLowerCase();
  return { hook: b.hook[l] ?? b.hook.de, aufruf: b.aufruf[l] ?? b.aufruf.de };
}
