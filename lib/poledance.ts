/**
 * DER TANZ — ein Geschenk, ein Prompt, ein Set.
 *
 * Owner 03.08.2026: „Surprise him — du machst das Video rein, das ich dir in Public unter
 * Pooldance reingemacht habe. Über den gleichen Trichter wie Kiss. Der gleiche Preis. Das
 * gleiche Design. Der Upload-Mann wird nicht mehr gebraucht. Die Frau wird hochgeladen, sie
 * selbst, und sie wird in den Klamotten abgebildet, die ich dir als Bild in dem gleichen
 * Ordner abgelegt habe."
 *
 * WARUM DIESE DATEI: Dieselbe Begründung wie bei `lib/kuss-szenen.ts` — der Prompt, mit dem
 * das Beispielvideo entstand, ist das Produkt. Die Kundin klickt, WEIL sie genau dieses Video
 * gesehen hat; jede Umformulierung ist eine andere Stimmung. Er steht deshalb an EINER Stelle
 * und wird nirgends im Code neu getippt.
 */

/**
 * DER PROMPT, WÖRTLICH VOM OWNER (03.08.2026, auf Nachfrage geschickt: „das ist der Promt").
 *
 * NICHTS DARAN ÄNDERN — auch keine „Verbesserung". Insbesondere fehlen hier absichtlich die
 * Zusätze, die der Kuss-Prompt trägt (Gesicht festhalten, feste Kamera, Musik-Klausel): Das
 * Beispielvideo ist MIT diesem Text entstanden und sieht gut aus. Was man dazuschreibt, kann
 * es nur verschieben.
 *
 * WIE DIE BILDER GEBUNDEN WERDEN (app/api/generate-tryon-video, pixverseStartReference):
 *   @image1 → das Foto der Frau      (im Trichter `person`)
 *   @image2 → das freigestellte Set  (im Trichter `garment`)
 * Die Route sucht zuerst nach bekannten Namen (@1, @person, @frau …); „image1" ist keiner
 * davon, also greift der Rückfall „erstes @-Token = die Person, zweites = das Outfit" — und
 * der trifft hier genau richtig. Der Punkt direkt hinter `@image2` ist ebenfalls versorgt:
 * Die Route schiebt ein Leerzeichen dazwischen, weil Pixverse ihn sonst in den Namen liest
 * (Fehler 400017).
 *
 * NEUTRALE WÖRTER, wie die Hausregel es verlangt: „outfit" statt „lingerie", kein „lace",
 * kein „skin". Deshalb hat Pixverse den Auftrag angenommen — der Beweis liegt als
 * `public/Pooldance/poledance.mp4` im Repo.
 */
export const POLEDANCE_PROMPT =
  "The woman from @image1 dances in slow motion on a pole in a club, wearing the outfit " +
  "from @image2. Neon colors and lighting.";

/**
 * DAS FREIGESTELLTE SET — das zweite Referenzbild.
 *
 * Der Owner hat es selbst erzeugt („PixVerse Image Effect: extrahiere die Kleidung") und in
 * denselben Ordner gelegt. Es liegt als statische Datei im Repo und NICHT im Storage: Ein
 * signierter Link läuft ab, dieser Pfad nie — und das Set ist Teil des Produkts, nicht
 * gepflegter Inhalt.
 */
export const POLEDANCE_SET = "/Pooldance/poledance-set.jpg";

/**
 * DAS BEISPIELVIDEO und sein Standbild. Der Ordnername bleibt „Pooldance", so wie der Owner
 * ihn angelegt hat — seine nächsten Dateien landen dort, und ein umbenannter Ordner wäre ein
 * Ordner, in den niemand mehr schaut. Nur die Dateinamen sind aufgeräumt (sie hießen nach der
 * Pixverse-Ausgabe, mit Leerzeichen — als URL unbrauchbar).
 *
 * Das Standbild ist Pflicht, nicht Zierde: Ohne Poster zeigt ein Video beim Laden einen
 * schwarzen Rahmen, und ein schwarzer Rahmen ist auf einer Verkaufsseite ein kaputtes Video.
 */
export const POLEDANCE_VIDEO = "/Pooldance/poledance.mp4";
export const POLEDANCE_POSTER = "/Pooldance/poledance-poster.jpg";

/**
 * DIE SET-AUSWAHL (Owner 03.08.2026: „ich habe dir Bilder generiert, schon mit BG und
 * Unterwäsche, die kannst du nehmen").
 *
 * VIER SETS STATT EINEM — und zwar genau in der Bauart, die nachweislich funktioniert: die
 * Waesche VOR dem Neon, mit Boden und Tiefe. Das ist der Unterschied, an dem der Versuch mit
 * dem Kleiderschrank gescheitert ist: Ein freigestelltes Produktfoto auf Weiss gibt Pixverse
 * das Outfit und KEINEN Ort — heraus kam eine Frau, die in ihrem Wohnzimmer springt. Diese
 * Bilder tragen die Szene mit, genau wie das erste.
 *
 * ZWEI VON IHNEN TRAGEN LEUCHTSCHRIFT („HEART LATEX", „ELECTRIC LATEX"). Pixverse schreibt
 * solche Schriftzuege gern ins Video — deshalb steht im Prompt ausdruecklich, dass kein Text
 * ins Bild gehoert. Dieselbe Falle wie bei Bellas Geburtstagsvorlage.
 */
export const POLEDANCE_SETS: { id: string; bild: string; name: string }[] = [
  { id: "haus",    bild: POLEDANCE_SET,                    name: "Pink Neon" },
  { id: "pink",    bild: "/Pooldance/set-pink.png",        name: "Pink Harness" },
  { id: "blau",    bild: "/Pooldance/set-blau.png",        name: "Blue Lace" },
  { id: "rot",     bild: "/Pooldance/set-rot-latex.png",   name: "Red Latex" },
  { id: "schwarz", bild: "/Pooldance/set-schwarz-latex.png", name: "Black Latex" },
];

/**
 * DER PROMPT FUER EIN GEWAEHLTES SET.
 *
 * Der Grundtext bleibt woertlich der des Owners — daran wird nichts angefasst. Angehaengt wird
 * nur der Satz gegen die Leuchtschrift, und der gilt fuer ALLE Sets: Auch die ohne Schrift
 * haben Leuchtreklame im Hintergrund, die Pixverse als Buchstaben missdeuten kann.
 */
export const poledancePromptFuerSet = (): string =>
  POLEDANCE_PROMPT + " No text, no letters, no writing anywhere in the frame.";

