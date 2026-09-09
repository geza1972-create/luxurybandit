/**
 * DER STEIN — DIE VORFÜHRUNG AM ANFANG (Owner 09.09.2026: „in dem Beispiel mit dem Stein,
 * genau deswegen haben sie den Stein genommen. Der war allgemein formuliert." · auf die
 * Frage, was ganz am Anfang gezeigt wird: „Den Stein vorführen").
 *
 * ── WAS ER GESEHEN HAT, DAS ICH NICHT GESEHEN HABE ─────────────────────────────────────────
 *
 * Meine erste Sammlung waren Beispiel-Hooks je Fach: „Das Lamm liegt neun Stunden über
 * Buchenholz." Konkret, nach Rezept — und trotzdem falsch an DIESER Stelle. Ein solcher Satz
 * steht und fällt mit dem Detail. Trifft das Detail nicht, fällt der ganze Beweis, und der
 * erste Eindruck vom Produkt ist ein Satz, der danebenliegt.
 *
 * DER STEIN HAT KEIN DETAIL, DAS DANEBENLIEGEN KANN. Jeder versteht ihn, niemand muss in
 * einer Branche sein, und er beweist nicht EIN Ergebnis, sondern die METHODE. Genau deshalb
 * hat der Marketer im Karussell einen Stein genommen und kein Restaurant.
 *
 * ── UND ER BERÜHRT SEIN GESCHÄFT NICHT ─────────────────────────────────────────────────────
 *
 * Owner, im selben Zug: „nicht mit seinem Namen und seinen Bildern am Anfang" · „und auch
 * nicht mit seinem Text" · „das wäre ein Mega-Fehler". Der Stein löst das von selbst: Es gibt
 * nichts von ihm darauf, also kann nichts von ihm falsch sein.
 *
 * ── WAS WIR NEHMEN UND WAS NICHT ───────────────────────────────────────────────────────────
 *
 * Der Pet Rock ist Zeitgeschichte von 1975 — ein Produkt, das es gab, mit Zahlen, die
 * nachschlagbar sind. Das gehört niemandem. Was dem Autor des Karussells gehört, sind SEINE
 * Sätze, SEIN Layout, SEINE Bildfolge; davon steht hier nichts. Die Sätze unten sind neu
 * geschrieben (vgl. `lib/versusforge-hook-rezept.ts`, wo dieselbe Grenze gezogen ist).
 *
 * ── DAS REZEPT BLEIBT DRINNEN ──────────────────────────────────────────────────────────────
 *
 * Die Vorführung zeigt, DASS aus einem Nichts ein Wollen wird — sie zählt nicht auf, WIE.
 * Kein Hebel wird benannt ([[hook-rezept-vorfuehren]], und Owner: „gute Restaurants
 * veröffentlichen ihr Rezept auch nicht").
 *
 * ── VON HAND JE SPRACHE ────────────────────────────────────────────────────────────────────
 *
 * Wie bei den Hooks: Das hier ist der erste Eindruck vom Produkt. Eine maschinelle
 * Übersetzung würde den Rhythmus verlieren, und der Rhythmus ist die halbe Wirkung.
 */

/**
 * ── MEHRERE KACHELN, UNTEREINANDER (Owner 09.09.2026: „der muss aber aus mehreren Slides
 * bestehen" · „untereinander") ────────────────────────────────────────────────────────────
 *
 * EINE KACHEL IST EINE BEHAUPTUNG, MEHRERE SIND EINE VORFÜHRUNG. Steht alles auf einem
 * Bild, liest man ein Ergebnis; kommt es Kachel für Kachel, sieht man den Wert ENTSTEHEN —
 * und genau das ist der Punkt des Karussells gewesen ([[hook-rezept-vorfuehren]]:
 * „Verwandlung Schritt für Schritt zeigen").
 *
 * UNTEREINANDER, NICHT ZUM WISCHEN. Im Chat ist Scrollen die einzige Bewegung, die jeder
 * ohne Erklärung macht. Ein Karussell in einer Sprechblase müsste man entdecken — und was
 * man entdecken muss, sehen die meisten nie.
 *
 * VIER STÜCK. Weniger zeigt keine Entwicklung, mehr schiebt das Gespräch aus dem Bild.
 * Die letzte ist die, auf die es ankommt: Der Gegenstand hat sich nicht geändert.
 */
export type SteinFolie = {
  /** Der grosse Satz auf der Kachel. */
  gross: string;
  /** Die kleine Zeile unten. Leer lassen ist erlaubt. */
  klein?: string;
};

export type SteinText = {
  /** Was der Agent dazu sagt — drei kurze Absätze, ohne die Frage am Ende. */
  vorfuehrung: string;
  /** Die Kacheln, in dieser Reihenfolge untereinander. */
  folien: SteinFolie[];
  /**
   * DER SATZ NACH DEN KACHELN (Owner 09.09.2026, im Wortlaut: „Und das ist deine Werbung,
   * wenn wir fertig sind").
   *
   * ER IST DAS SCHARNIER. Ohne ihn hat jemand eine hübsche Geschichte über einen Stein
   * gelesen und weiss nicht, was das mit ihm zu tun hat. Mit ihm ist die Vorführung ein
   * Versprechen — und die Fragen danach sind der Weg dorthin, nicht eine Zumutung.
   *
   * ER STEHT NACH DEN BILDERN, nicht davor: Erst sehen, dann verstehen, wofür.
   */
  abschluss: string;
};

const STEIN: Record<string, SteinText> = {
  de: {
    vorfuehrung: [
      "1975 hat jemand Steine vom Strand verkauft. Vier Dollar das Stück, anderthalb Millionen Stück in einem halben Jahr.",
      "Der Stein konnte nichts. Er hat sich nicht verändert — nur der Grund, ihn haben zu wollen, war plötzlich da.",
    ].join("\n\n"),
    folien: [
      { gross: "Ein Stein vom Strand.", klein: "Wert: nichts" },
      { gross: "In einer Schachtel mit Luftlöchern.", klein: "immer noch ein Stein" },
      { gross: "Mit einer Anleitung, wie er sitzen lernt.", klein: "immer noch ein Stein" },
      { gross: "Vier Dollar. 1,5 Millionen Stück in sechs Monaten.", klein: "1975 · Pet Rock" },
    ],
    abschluss: "Und genau das ist deine Werbung, wenn wir fertig sind. Dein Angebot kann mehr als ein Stein — ich brauche nur ein paar Antworten von dir.",
  },
  en: {
    vorfuehrung: [
      "In 1975 someone sold stones from the beach. Four dollars each, one and a half million in half a year.",
      "The stone could do nothing. It never changed — only the reason to want it was suddenly there.",
    ].join("\n\n"),
    folien: [
      { gross: "A stone from the beach.", klein: "worth: nothing" },
      { gross: "In a box with air holes.", klein: "still a stone" },
      { gross: "With a manual on how to teach it to sit.", klein: "still a stone" },
      { gross: "Four dollars. 1.5 million sold in six months.", klein: "1975 · Pet Rock" },
    ],
    abschluss: "And that is your advertising once we are done. What you sell can do more than a stone — I only need a few answers from you.",
  },
  ro: {
    vorfuehrung: [
      "În 1975 cineva a vândut pietre de pe plajă. Patru dolari bucata, un milion și jumătate în șase luni.",
      "Piatra nu făcea nimic. Nu s-a schimbat deloc — doar motivul de a o vrea a apărut dintr-odată.",
    ].join("\n\n"),
    folien: [
      { gross: "O piatră de pe plajă.", klein: "valoare: zero" },
      { gross: "Într-o cutie cu găuri de aer.", klein: "tot o piatră" },
      { gross: "Cu instrucțiuni cum să stea cuminte.", klein: "tot o piatră" },
      { gross: "Patru dolari. 1,5 milioane în șase luni.", klein: "1975 · Pet Rock" },
    ],
    abschluss: "Și exact asta va fi reclama ta când terminăm. Ce oferi tu poate mai mult decât o piatră — am nevoie doar de câteva răspunsuri de la tine.",
  },
};

/** Die Vorführung in seiner Sprache; unbekannte Sprache fällt auf Deutsch zurück. */
export function steinText(sprache: string): SteinText {
  return STEIN[String(sprache ?? "de").slice(0, 2).toLowerCase()] ?? STEIN.de;
}
