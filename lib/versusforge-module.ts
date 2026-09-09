/**
 * DIE MODULE VON VERSUSFORGE — ALS DATEN, NICHT ALS BILD (Owner 08.09.2026: „das soll echt
 * aus Text sein, im ASCII-Format, weil das dynamisch sein wird").
 *
 * WARUM KEIN DIAGRAMM: Ein gezeichnetes Schaubild ist am Tag nach dem Zeichnen falsch. Diese
 * Liste ist die Quelle; die Ansicht malt daraus die Kästen. Wird ein Modul fertig, ändert
 * sich EIN Wort hier — und die Seite stimmt wieder.
 *
 * ZWEI ARTEN VON ZUSTAND, und der Unterschied ist wichtig genug, um ihn zu benennen:
 *
 *  · GEMESSEN (`pruefung`) — die Anwendung sieht selbst nach: Liegt ein Schlüssel in der
 *    Umgebung? Dann ist die Anzeige nie veraltet, egal wer was vergisst.
 *  · BEHAUPTET (`fest`) — jemand hat es hier eingetragen. Ehrlich beschriftet, damit
 *    niemand einer Angabe glaubt, die nur ein Wunsch ist.
 *
 * Was messbar ist, wird gemessen. Der Rest steht als Behauptung da und ist als solche
 * erkennbar.
 */

export type Zustand = "laeuft" | "teils" | "fehlt";

export type Modul = {
  /** Der Name im Kasten — kurz, Versalien in der Ansicht. */
  name: string;
  /** Eine Zeile darunter: was es tut. Höchstens rund 34 Zeichen, sonst bricht der Kasten. */
  zeile: string;
  /** Fest eingetragener Zustand — gilt, wenn es nichts zu messen gibt. */
  fest: Zustand;
  /**
   * Gemessener Zustand. Bekommt die Umgebungsvariablen herein und darf `undefined`
   * zurückgeben, wenn sich nichts belastbar sagen lässt — dann gilt `fest`.
   */
  pruefung?: (env: NodeJS.ProcessEnv) => Zustand | undefined;
  /** Wo es liegt — für uns, nicht für den Kunden. */
  wo: string;
};

export const MODULE: Modul[] = [
  {
    name: "Startseite",
    zeile: "Feld, Beispiele, drei Sprachen",
    fest: "laeuft",
    wo: "components/VersusForgeStart.tsx",
  },
  {
    name: "Der Agent",
    zeile: "fragt nach, plant, warnt",
    fest: "laeuft",
    /* Ohne Schlüssel antwortet die Route mit 503 — dann läuft er eben nicht, und das soll
       man sehen, statt es beim ersten Besucher zu merken. */
    pruefung: e => (e.OPENAI_API_KEY ? "laeuft" : "fehlt"),
    wo: "app/api/versusforge/route.ts",
  },
  {
    name: "Kampagne anlegen",
    zeile: "pausiert bei Meta",
    fest: "fehlt",
    /* Der Zugang steht seit dem 08.09., das Schreiben nicht. „teils" ist hier die ehrliche
       Antwort: Die Tür ist offen, es geht nur noch niemand hindurch. */
    pruefung: e => (e.META_ADS_TOKEN ? "teils" : "fehlt"),
    wo: "— Token da, Schreiben fehlt",
  },
  {
    name: "Kunden-Trichter",
    zeile: "unter seinem Namen",
    fest: "fehlt",
    wo: "— Vorlage /joburi, Mandant fehlt",
  },
  {
    name: "Die Liste",
    zeile: "wer sich gemeldet hat",
    fest: "fehlt",
    /* Der Empfänger ist gebaut (`/api/meta-leads`); ohne Seiten-Token holt er die Antworten
       aber nicht ab. */
    pruefung: e => (e.META_PAGE_ACCESS_TOKEN ? "laeuft" : "teils"),
    wo: "app/api/meta-leads/route.ts",
  },
  {
    name: "Dashboard",
    zeile: "was eine Anfrage kostet",
    fest: "teils",
    wo: "— eigene Messung ja, Meta-Zahlen nein",
  },
];

/** Der Zustand eines Moduls: gemessen, wo möglich; sonst der eingetragene. */
export const zustandVon = (m: Modul, env: NodeJS.ProcessEnv): Zustand =>
  m.pruefung?.(env) ?? m.fest;

/** Ob der Zustand gemessen wurde oder nur behauptet ist — die Ansicht zeigt das an. */
export const istGemessen = (m: Modul, env: NodeJS.ProcessEnv): boolean =>
  m.pruefung?.(env) !== undefined;
