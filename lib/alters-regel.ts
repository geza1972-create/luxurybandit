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
/**
 * DIE IDENTITÄTSSPERRE — DER WORTLAUT, DER GEMESSEN HÄLT (Owner 18.08.2026: „das open ai
 * foto muss stimmen").
 *
 * Er stammt nicht von mir, sondern aus der Geburtstags-Kette, wo der Owner ihn am 08.08.2026
 * in acht Vergleichsläufen an einem Abend gegen seine eigenen ChatGPT-Ergebnisse geprüft hat
 * („das letzte war perfekt"). Dort steht er seither ganz oben im Prompt und hält das Gesicht.
 *
 * WARUM ER AUCH BEIM KUSS OBEN STEHEN MUSS: Die Szenen-Prompts des Owners sagen „preserve
 * both faces clearly and realistically" — ein Satz. Dahinter folgen zwanzig Zeilen über Licht,
 * Kleidung, Stimmung und Kamera, und jede davon zieht das Modell vom Gesicht weg. Ein Satz
 * gegen zwanzig verliert. Diese Sperre gewinnt, weil sie zuerst kommt, konkret ist und jede
 * Änderung EINZELN verbietet.
 *
 * Sie ersetzt nichts an seinen Prompts — sie steht davor, sein Text bleibt unangetastet.
 */
export const IDENTITAETS_SPERRE =
  "IDENTITY LOCK: the uploaded faces are the source of truth. Do not alter, reinterpret, "
  + "beautify, age or replace any face. Keep every face, its features, proportions, hairstyle, "
  + "hair colour, skin tone and overall likeness exactly as in the reference photo — each "
  + "person must remain clearly the same person, recognisable at a glance. Never swap two "
  + "faces, never merge them, never invent a face. Only clothing, environment and lighting may "
  + "follow the description below.";

export const JUENGER_REGEL =
  /**
   * ÄHNLICHKEIT SCHLÄGT JUGEND (Owner 18.08.2026, am ersten geglückten Lauf: „aber wir sehen
   * uns jetzt gar nicht mehr ähnlich. Du hast mächtig an den Prompt was geändert").
   *
   * HIER STAND ZU VIEL VON MIR: „a few years younger, rested, healthy, smooth skin, no
   * wrinkles". Das ist eine VERSCHÖNERUNGS-Anweisung — und genau die verbietet die
   * Geburtstags-Kette seit dem 08.08. ausdrücklich („do not redesign or beautify the face"),
   * weil ein verschönertes Gesicht ein fremdes ist. Falten sind bei einem erwachsenen Gesicht
   * kein Makel, sondern das Erkennungsmerkmal; wer sie glättet, tauscht den Menschen aus.
   *
   * EINE ZAHL STATT EINER RICHTUNG (Owner 18.08.2026, nach den Platform-Testläufen: „Falten
   * auch nur 3-4 Jahre jünger wenn schon. Aber jeder kann sein Alter haben"). „Ein paar Jahre
   * jünger" war zu offen und liess sich als Verschönerung lesen; eine Zahl ist eine Grenze,
   * keine Richtung. Und „jeder kann sein Alter haben" ist die Erlaubnis, es auch ganz zu
   * lassen — die Verjüngung ist eine Kappung nach oben, keine Pflicht.
   */
  "Do NOT make anyone look older than in their uploaded photo: no added wrinkles, no grey or "
  + "tired shadows, no weathered or worn look. At most, each person may look 3-4 years younger "
  + "than their reference photo — a slight softening of wrinkles, nothing more. It is equally "
  + "fine to keep their exact real age and existing lines untouched. But do NOT beautify, "
  + "smooth, slim or rejuvenate the face itself beyond that: keep every facial feature, the "
  + "face shape, the natural skin texture and the real age of each person essentially as in "
  + "their own photo. "
  + "Treat each person separately: if one is clearly older and another clearly younger, that "
  + "age difference must stay — never even out their ages, never make them look like the same "
  + "generation. "
  + "If there is ever a conflict between looking good and looking like themselves, LIKENESS "
  + "WINS: the people in the picture must be immediately recognisable to their own family.";
