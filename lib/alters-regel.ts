/**
 * DIE ALTERS-REGEL DES HAUSES — EINE ZEILE FÜR ALLE THEMEN (Owner 18.08.2026).
 *
 * „ich weiss nicht wie chatgpt das alter misst, aber er muss sie beide jünger machen nicht
 * älter. Niemand will sich älter sehen." — und davor, an seinem eigenen Paar: „sie ist 27
 * jahre jünger und das muss so bleiben".
 *
 * WARUM SIE ÜBERHAUPT NÖTIG IST: Kein Prompt bittet je darum, jemanden zu altern. Es passiert
 * trotzdem — „cinematic", „dramatic light", „elegant", „premium" schieben ein Gesicht
 * zuverlässig Richtung reifer und ernster, weil die Trainingsbilder zu diesen Wörtern so
 * aussehen. Gemessen am ersten echten Kuss-Lauf: beide Gesichter deutlich gealtert, ohne dass
 * ein Wort im Prompt danach verlangt hätte.
 *
 * ZWEI DINGE STEHEN DARIN, UND BEIDE SIND NÖTIG:
 *   1. Die RICHTUNG. Ein Geschenk, auf dem man müder aussieht als im Spiegel, verschickt
 *      niemand. Also nicht „halte das Alter", sondern ein paar Jahre jünger.
 *   2. Die GRENZE. Verjüngung ohne Halt macht einen Fremden — und gegen Fremde ist die ganze
 *      Kette gebaut. Deshalb „unmistakably the same person" im selben Atemzug.
 *   3. JE PERSON EINZELN. Ein Modell, das zwei Gesichter in EIN Bild setzt, zieht sie in
 *      dieselbe Generation, weil ein Paar „stimmig" aussehen soll. Der Altersunterschied ist
 *      aber keine Unstimmigkeit, er ist das echte Paar.
 *
 * WER SIE ANHÄNGT: jede Kette, die einen echten Menschen in ein erzeugtes Bild setzt — Kuss,
 * Geburtstag, Versprechen, Hochzeit. Sie gehört ans ENDE des Prompts, hinter die Szene: Was
 * zuletzt steht, wiegt bei Bildmodellen schwerer.
 */
export const JUENGER_REGEL =
  "NEVER make anyone look older than in their uploaded photo. Every person should look a few "
  + "years YOUNGER than their reference photo: rested, healthy, smooth skin, no wrinkles, no "
  + "grey shadows, no tired or weathered look — but unmistakably the same person, with the same "
  + "facial features, the same face shape and the same hair. "
  + "Treat each person separately: if one of them is clearly older and another clearly younger, "
  + "that age difference must stay — never even out their ages, never make them look like the "
  + "same generation, never age the younger one up to match the other.";
