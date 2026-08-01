/**
 * DIE KUSS-SZENEN — vier feste Vorlagen mit BEHALTENEN Prompts (Owner 01.08.2026: „die User
 * suchen sich eine Szene aus und wollen diese Szene nachbauen. Also brauchen wir die Prompts.
 * Bild soll die Szene nachbauen und Video dann komplett mit Kuss. … 4 Stück und Prompt
 * behalten").
 *
 * WARUM FESTE PROMPTS STATT FREIER BESCHREIBUNG: Der Kunde wählt eine Szene, weil er GENAU
 * dieses Beispiel gesehen hat. Nur ein wortgleich behaltener Prompt liefert wieder diese
 * Stimmung — jede Umformulierung ist eine andere Szene. Deshalb liegen sie hier als Quelle
 * und werden nirgends im Code neu getippt.
 *
 * ZWEI PROMPTS JE SZENE, weil zwei Maschinen bedient werden:
 *   - `bild`: der Szenen-Satz fürs GRATIS-BILD (OpenAI). Er beschreibt nur den ORT und das
 *     Licht — die Kuss-Leiter (Kuss/Fast-Kuss/Umarmung) und die Deckungsregel hängt
 *     free-preview selbst an, wie immer.
 *   - `video`: der Satz fürs BEZAHLTE VIDEO (Pixverse), komplett mit Kuss. NEUTRALE Wörter
 *     (Hausregel: kein „lingerie/skin/lace" — Pixverse flaggt sonst).
 *
 * OHNE WAHL ÄNDERT SICH NICHTS (Owner: „wobei, die wir gerade generieren sind sehr schön in
 * der Natur draussen") — wählt der Kunde keine Szene, läuft der bisherige Auftrag ohne
 * Szenen-Satz, und das Modell malt weiter seine Natur.
 */

export type KussSzene = {
  id: string;
  /** Kurzname fürs Werkzeug/Admin — die Kunden sehen das Beispielvideo, keinen Text. */
  name: string;
  /** Ort + Licht fürs Gratis-Bild. WIRD ANGEHÄNGT als „Setting: …" — kein eigener Satzbau. */
  bild: string;
  /** Komplette Szene mit Kuss fürs bezahlte Video (Pixverse, neutrale Wörter). */
  video: string;
  /**
   * Die Auswahl-Kachel im Trichter — ein STANDBILD AUS DEN ECHTEN BEISPIELVIDEOS
   * (Owner 01.08.2026: die KI-Templates waren „furchtbar", die Video-Standbilder „toll").
   * Liegt in public/szenen/, damit es versioniert mit dem Code reist.
   */
  kachel: string;
};

export const KUSS_SZENEN: KussSzene[] = [
  /**
   * KURATIERT vom Owner am 01.08.2026 an den Standbildern der echten Beispielvideos:
   * Altstadt und Terrasse „sind toll", dazu bestellt: „wir brauchen noch welche draussen
   * und closeup". Lichterkette und Strandpromenade sind wieder raus.
   *
   * „light elegant summer clothing" steht in JEDEM Bild-Prompt (Owner: „du hast
   * Winterklamotten"): Die Deckungsregel verlangt blickdichten Stoff, und ohne Jahreszeit
   * uebersetzt das Modell „bedeckt" in Jacken und Pullover — sogar am Sommerstrand.
   * Bedeckt bleibt bedeckt, aber sommerlich.
   */
  {
    id: "altstadt",
    kachel: "/szenen/kiss-altstadt.jpg",
    name: "Altstadt-Platz am Abend",
    bild: "a picturesque old-town square at golden hour, pastel-coloured historic facades and cobblestones softly blurred behind them, warm evening light; both in light elegant summer clothing",
    video: "On a picturesque old-town square at golden hour, pastel facades behind them, both in light elegant summer clothing, the two people look at each other, smile, lean in slowly and share a brief tender kiss, then smile at each other happily. Fixed camera, no zoom, fluid natural motion, photorealistic.",
  },
  {
    id: "terrasse",
    kachel: "/szenen/kiss-terrasse.jpg",
    name: "Frühstücks-Terrasse",
    bild: "a bright breakfast terrace in the morning, a set table with coffee and orange juice in the foreground, soft daylight, relaxed holiday mood; both in light elegant summer clothing",
    video: "On a bright breakfast terrace in the morning with coffee on the table, both in light elegant summer clothing, the two people look at each other, smile, lean in slowly and share a brief tender kiss, then smile at each other happily. Fixed camera, no zoom, fluid natural motion, photorealistic.",
  },
  {
    id: "draussen",
    kachel: "/szenen/kiss-draussen.jpg",
    name: "Draussen in der Natur",
    bild: "outdoors in beautiful nature at golden hour, soft green landscape and warm sunlight behind them, gentle breeze; both in light elegant summer clothing",
    video: "Outdoors in beautiful nature at golden hour, warm sunlight behind them, both in light elegant summer clothing, the two people look at each other, smile, lean in slowly and share a brief tender kiss, then smile at each other happily. Fixed camera, no zoom, fluid natural motion, photorealistic.",
  },
  {
    id: "closeup",
    kachel: "/szenen/kiss-closeup.jpg",
    name: "Closeup — ganz nah",
    bild: "an intimate close-up of the two of them, faces filling the frame, soft window light, shallow depth of field, tender mood; both in light elegant summer clothing",
    video: "An intimate close-up, their faces filling the frame in soft light, the two people look at each other, smile, lean in slowly and share a brief tender kiss, then smile at each other happily. Fixed camera, no zoom, fluid natural motion, photorealistic.",
  },
];

/** Szene per Kennung — unbekannte Kennung heisst bewusst „keine Szene" (Standard bleibt). */
export function kussSzene(id: unknown): KussSzene | null {
  const s = String(id ?? "").trim();
  return KUSS_SZENEN.find(x => x.id === s) ?? null;
}
