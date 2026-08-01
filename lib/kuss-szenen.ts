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
};

export const KUSS_SZENEN: KussSzene[] = [
  {
    id: "lichterkette",
    name: "Abend im Lichterketten-Zimmer",
    bild: "a cozy living room in the evening, warm strings of small fairy lights glowing on the wall behind them, soft warm indoor light, intimate homely atmosphere",
    video: "In a cozy living room in the evening, warm fairy lights glowing on the wall behind them, the two people look at each other, smile, lean in slowly and share a brief tender kiss, then smile at each other happily. Fixed camera, no zoom, fluid natural motion, photorealistic.",
  },
  {
    id: "altstadt",
    name: "Altstadt-Gasse am Nachmittag",
    bild: "a picturesque old-town street with pastel-coloured historic facades and cobblestones, soft afternoon daylight, a few blurred passers-by far in the background",
    video: "On a picturesque old-town street with pastel historic facades and cobblestones in soft afternoon light, the two people look at each other, smile, lean in slowly and share a brief tender kiss, then smile at each other happily. Fixed camera, no zoom, fluid natural motion, photorealistic.",
  },
  {
    id: "terrasse",
    name: "Frühstücks-Terrasse",
    bild: "a bright breakfast terrace in the morning, a set table with coffee and orange juice in the foreground, city rooftops softly blurred behind them, fresh morning light",
    video: "On a bright breakfast terrace in the morning with coffee on the table, the two people look at each other, smile, lean in slowly and share a brief tender kiss, then smile at each other happily. Fixed camera, no zoom, fluid natural motion, photorealistic.",
  },
  {
    id: "strandpromenade",
    name: "Strandpromenade bei Sonnenuntergang",
    bild: "a seaside promenade at golden hour, palm trees and the sea behind them, warm sunset light on their faces, gentle breeze in the hair",
    video: "On a seaside promenade at golden hour with palm trees and the sea behind them, the two people look at each other, smile, lean in slowly and share a brief tender kiss, then smile at each other happily. Fixed camera, no zoom, fluid natural motion, photorealistic.",
  },
];

/** Szene per Kennung — unbekannte Kennung heisst bewusst „keine Szene" (Standard bleibt). */
export function kussSzene(id: unknown): KussSzene | null {
  const s = String(id ?? "").trim();
  return KUSS_SZENEN.find(x => x.id === s) ?? null;
}
