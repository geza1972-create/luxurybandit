import { holidayPrompt } from "@/lib/holiday-scenes";
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
   * ORT UND HANDLUNG FUER DIE BEWAEHRTE VORLAGE (Owner 03.08.2026: „die Videos die der Typ
   * generiert hat waren sehr schön … ich bräuchte solche Szenen" — und er hat die drei
   * Prompts der Gast-Videos wortwoertlich eingefuegt: exakt `holidayPrompt(szene, {kuss})`).
   *
   * Die alten `video`-Saetze oben waren eine EIGENE, kuerzere Bauart — ohne Drehung, ohne
   * zweiten Kuss, ohne Musik-Klausel, und vor allem ohne @-Token (die „falschen Personen").
   * Statt sie nachzubauen, laufen die Kacheln jetzt durch DIESELBE Maschine wie die
   * bewunderten Videos: `ort` fuellt das „They are together …", `aktion` das „Around that
   * they …". Der Rest — Kuss als Haupthandlung, Gesichter festhalten, ihre Kleidung 1:1,
   * die Drehung, nur Musik — kommt aus holidayPrompt und bleibt an EINER Stelle gepflegt.
   */
  ort: string;
  aktion: string;
  /**
   * LINGERIE-SZENE = 3,99 STATT 1,49 (Owner 03.08.2026: „auch das ist ein Lingerie-Video
   * für 3,99" — auf die graue Korsett-Kachel gezeigt). Vor dem Pixverse-Lauf zieht FASHN
   * sie in einen Lingerie-Look aus der Garderobe um; der Aufpreis bezahlt diesen zweiten
   * Erzeugungslauf. Preis kommt aus lib/pricing (LINGERIE_CENTS), nie von hier.
   */
  /**
   * WOERTLICH FESTGEHALTENER AUFTRAG (Owner 03.08.2026, zur Surprise-Kachel: er hat den
   * kompletten Pixverse-Prompt mitgeliefert). Steht er hier, gewinnt er unveraendert —
   * kussSzeneVideoPrompt baut dann NICHTS aus ort/aktion zusammen. Fuer Szenen, deren
   * Beispielvideo mit genau diesem Text entstand: nur der gleiche Text liefert wieder
   * dieselbe Stimmung.
   */
  promptFest?: string;
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
    ort: "on a picturesque old-town square at golden hour, pastel facades glowing behind them, both in light elegant summer clothing",
    aktion: "they stroll slowly across the cobblestones, she points at the pretty facades",
  },
  {
    id: "terrasse",
    kachel: "/szenen/kiss-terrasse.jpg",
    name: "Frühstücks-Terrasse",
    bild: "a bright breakfast terrace in the morning, a set table with coffee and orange juice in the foreground, soft daylight, relaxed holiday mood; both in light elegant summer clothing",
    video: "On a bright breakfast terrace in the morning with coffee on the table, both in light elegant summer clothing, the two people look at each other, smile, lean in slowly and share a brief tender kiss, then smile at each other happily. Fixed camera, no zoom, fluid natural motion, photorealistic.",
    ort: "on a bright breakfast terrace in the morning, coffee and orange juice on the table, both in light elegant summer clothing",
    aktion: "they sit close together over breakfast, he reaches for her hand across the table",
  },
  /**
   * DIE KORSETT-KACHEL („draussen") IST RAUS (Owner 03.08.2026: „das dritte Video haben wir
   * doch schon weiter unten, also raus"). Sie zeigte dasselbe Motiv wie die
   * Lingerie-Vorlage „lingerie-abend" — zweimal dieselbe Karte ist keine Auswahl, sondern
   * ein Suchbild. Eine gespeicherte Wahl „draussen" faellt still auf den Standard zurueck
   * (kussSzene liefert null), die Dateien kiss-draussen.jpg/.mp4 bleiben liegen.
   */
  {
    /**
     * DIE SURPRISE-KACHEL (Owner 03.08.2026: „du musst noch eine Kachel anlegen mit
     * surprise für 1,49 — Video4-kiss-normal.mp4 mit dem Prompt: …"). Der Auftrag steht
     * WOERTLICH in promptFest — es ist der Text, mit dem das Beispielvideo entstand
     * (Sommerregen, Jacke ueber den Koepfen). @1/@2 statt @image1/@image2 ist in Ordnung:
     * die Route bindet die Fotos an die ERSTEN zwei @-Token, egal wie sie heissen.
     */
    id: "surprise",
    kachel: "/szenen/kiss-surprise.jpg",
    name: "Surprise — Sommerregen",
    bild: "a summer street in light warm rain, everything glistening, soft daylight; both in light elegant summer clothing",
    video: "",   // ungenutzt — promptFest gewinnt
    ort: "on a summer street in light warm rain, everything glistening",
    aktion: "they run under one jacket held over their heads, laughing",
    promptFest:
      "Wide shot, full figures: show the man from @1 and the woman from @2 from their knees " +
      "up to their heads, both complete in frame with space around them, filmed from slightly " +
      "below. Never crop the woman above her knees. They are together on a summer street in " +
      "light warm rain, everything glistening. The main action is a kiss: they look into each " +
      "other's eyes, lean in slowly and kiss on the lips, clearly and tenderly, holding the " +
      "kiss for a moment. Around that they they run under one jacket held over their heads, " +
      "laughing, smiling and laughing softly. Please keep the clothes from @2 exactly 1:1 — " +
      "the same cut, colour, fabric and details. Keep the face of @1 and the face of @2 " +
      "EXACTLY as in the reference photos — do not change either face. The woman turns once " +
      "so her look is fully visible, then they kiss on the lips once more and afterwards " +
      "smile at each other, happy. Natural daylight, cinematic, photorealistic, fluid " +
      "natural motion. Fixed camera, no zoom. No text or logos. Audio: soft, elegant " +
      "instrumental background music only — ONLY music: absolutely no voices, no talking, " +
      "no whispering, no singing, no footsteps, no ambient or foley sound effects.",
  },
  {
    id: "closeup",
    kachel: "/szenen/kiss-closeup.jpg",
    name: "Closeup — ganz nah",
    bild: "an intimate close-up of the two of them, faces filling the frame, soft window light, shallow depth of field, tender mood; both in light elegant summer clothing",
    video: "An intimate close-up, their faces filling the frame in soft light, the two people look at each other, smile, lean in slowly and share a brief tender kiss, then smile at each other happily. Fixed camera, no zoom, fluid natural motion, photorealistic.",
    ort: "in soft golden evening light, a calm softly blurred background behind them, both in light elegant summer clothing",
    aktion: "they stand very close, he gently strokes a strand of hair from her face",
  },
];

/** Szene per Kennung — unbekannte Kennung heisst bewusst „keine Szene" (Standard bleibt). */
export function kussSzene(id: unknown): KussSzene | null {
  const s = String(id ?? "").trim();
  return KUSS_SZENEN.find(x => x.id === s) ?? null;
}

/**
 * EINE ZUFAELLIGE KUSS-SZENE — die Ueberraschung (Owner 03.08.2026: „wir machen die ganze
 * Videoauswahl raus. Die Leute bekommen ein Zufalls-Video als Ueberraschung mit Kuss").
 *
 * Die vier Prompts sind dieselben, die vorher hinter den Kacheln lagen — es geht nichts
 * verloren ausser der Wahl. Ohne `Math.random()`: Der Trichter rendert erst auf dem Server und
 * dann im Browser; eine echte Zufallszahl waere dort zweimal verschieden und React wuerde die
 * Seite beim ersten Zeichnen einmal komplett neu aufbauen. Die Auftragsnummer ist ohnehin je
 * Kunde verschieden und damit die bessere Quelle: derselbe Auftrag, dieselbe Szene — wer neu
 * laedt, bekommt nicht ploetzlich eine andere Kulisse versprochen.
 */
export function zufallsSzene(saat?: string): KussSzene {
  const s = String(saat ?? "");
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return KUSS_SZENEN[n % KUSS_SZENEN.length];
}

/**
 * DER VIDEO-AUFTRAG EINER SZENE — MIT DEN BEIDEN GESICHTERN (Owner 03.08.2026: „auch noch
 * falsche Personen im video", nach einem BEZAHLTEN Lauf mit gewaehlter Szene).
 *
 * Die `video`-Saetze oben beschreiben nur die SZENE — „the two people look at each other …"
 * — ohne ein einziges @-Token. Die Route bindet die zwei hochgeladenen Fotos aber an
 * @-Token im Text (siehe pixverseStartReference): Kommt KEINES vor, haengen die Referenzen
 * an Namen, die der Auftrag nie nennt, und Pixverse erfindet die Personen aus der
 * Beschreibung. Der Kunde bekam ein huebsches Video — mit einem fremden Paar. Das ist der
 * schlimmste Fehler, den dieses Produkt haben kann: Er zahlt fuer SEIN Gesicht.
 *
 * Deshalb wird der Szenen-Satz hier in denselben Rahmen gestellt wie bei holidayPrompt:
 * @image1 ist der MANN, @image2 die FRAU — exakt die Reihenfolge, in der der Trichter und
 * kiss-deliver die Fotos schicken (person=seins, garment=ihres). Und wie dort wird die
 * Gesichtstreue ausdruecklich verlangt; ein Modell haelt nur, was man ihm benennt.
 */
/**
 * DIE LINGERIE-VORLAGEN SIND RAUS (Owner 03.08.2026: „das mit der Lingerie ist eh nicht allzu
 * seriös" — „wir machen das raus").
 *
 * Hier standen vier Dessous-Vorlagen mit eigenem Preis, eigenem Prompt und einem FASHN-Lauf
 * VOR dem Pixverse-Lauf. Sie waren die Wurzel fast aller Umstaendlichkeit im Kuss-Trichter:
 * zweiter Preis, Waesche-Schritt, zweite Kachelreihe, getrennte Bild-Kette (OpenAI weist
 * Dessous am Eingang ab, Pixverse nicht). Und sie passten nicht zu dem, was der Kuss seit dem
 * 03.08. ist: eine Grusskarte an einen Menschen, den man liebt.
 *
 * Die Videos liegen weiter unter `public/Kisslingerie/` — sie sind bezahlte Arbeit, und ein
 * `git revert` dieses Umbaus soll nicht an fehlenden Dateien scheitern.
 */


export function kussSzeneVideoPrompt(szene: KussSzene): string {
  // Ein woertlich festgehaltener Auftrag gewinnt (Surprise-Kachel, Owner 03.08.2026).
  if (szene.promptFest) return szene.promptFest;
  // DIESELBE MASCHINE WIE DIE BEWUNDERTEN VIDEOS (Owner 03.08.2026: „ich bräuchte solche
  // Szenen" — mit den drei Gast-Prompts als Beleg, allesamt holidayPrompt-Ausgaben).
  // Nur Ort und Handlung kommen von der Kachel; Kuss, Gesichter, Kleidung 1:1, Drehung und
  // Musik-Klausel liefert holidayPrompt — eine Vorlage, ein Pflegeort.
  return holidayPrompt(
    { id: szene.id, label: szene.name, emoji: "", place: szene.ort, action: szene.aktion },
    { kuss: true },
  );
}
