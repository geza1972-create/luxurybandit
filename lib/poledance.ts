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
/**
 * NEU AUF DEM TRY-ON-GERUEST (Owner 15.08.2026: „es ist der selbe, nur der prompt ist anders.
 * Statt rumlaufen dann tanzen an der Stange. Wir haben den prompt schon").
 *
 * Das hebt die Regel „NICHTS DARAN AENDERN" darueber auf — und zwar auf Ansage des Owners,
 * nicht als Verbesserungsidee. Der Anlass: ein Lauf, in dem das Set UEBER ihrem schwarzen
 * Rollkragen lag (15.08.2026). Sein erstes Video war „perfekt in rosa", die Kette ist also in
 * Ordnung; der Text hat nur bei einem hochgeschlossenen Foto nicht getragen.
 *
 * ZWEI DINGE KOMMEN VOM TRY-ON, der genau dasselbe tut (anziehen und filmen in EINEM Lauf) —
 * `REF_PRESENT_PROMPT` in app/api/generate-tryon-video:
 *
 *   1. DIE BENANNTEN PLATZHALTER `@person` / `@outfit`. Die Route sucht ausdruecklich nach
 *      diesen Namen; `@image1`/`@image2` trafen nur ueber den Rueckfall „erstes Token ist die
 *      Person". Das war bisher richtig geraten — geraten bleibt es trotzdem.
 *   2. DER SATZ, DER DAS AUSSEHEN FESTHAELT („Keep @person face and appearance … exactly the
 *      same"). Er fehlte hier ganz.
 *
 * Geblieben ist die Handlung des Owners (Zeitlupe, Stange, Neon) und die Umzieh-Klausel, die
 * am 03.08. aus einem echten Fehllauf entstand. Neutrale Woerter wie immer — kein „lingerie",
 * kein „lace", kein „skin".
 *
 * KEINE UMZIEH-KLAUSEL MEHR — PIXVERSE ZIEHT NICHTS AUS (Owner 15.08.2026: „Pixverse entfernt
 * keine Klamotten"). Das ist die Einsicht, an der die ganze Kette haengt:
 *
 * Pixverse LEGT AN, es ENTFERNT NICHT. Jeder Versuch, das Umziehen in den Text zu schreiben,
 * ist deshalb entweder wirkungslos (das Set lag ueber ihrem Rollkragen) oder faellt dem
 * Textfilter zum Opfer. Beides an einem Tag gesehen: erst der Pulli unter dem Set, dann
 * „The text you entered contains sensitive information. Please re-enter." fuer den Versuch,
 * es deutlicher zu sagen („no top, no shirt, no dress, no sleeves" — eine Liste verneinter
 * Kleidungsstuecke liest ein Filter als Ausziehen).
 *
 * ALSO ZIEHT FASHN VORHER AN (siehe `KissFunnel`, Zweig `V.nurSie`): An Pixverse geht ein Foto,
 * auf dem sie das Set BEREITS TRAEGT — plus dasselbe Set-Bild als `@outfit`, das ausserdem die
 * Szene mitbringt (Neon, Stange). Der Prompt muss ueber Kleidung nun gar nichts mehr sagen; er
 * beschreibt nur noch Bewegung und Licht und haelt Gesicht und Outfit fest.
 *
 * WER HIER JE WIEDER „replace/remove/without clothing" HINEINSCHREIBT, baut beide Fehler auf
 * einmal zurueck.
 */
export const POLEDANCE_PROMPT =
  "@person dances in slow motion on a pole in a neon-lit club, wearing the @outfit. " +
  "Keep @person face, hair and appearance and the @outfit exactly the same. " +
  /**
   * DER BILDAUSSCHNITT GEHOERT IN DEN PROMPT (Owner 15.08.2026: „hier musst du sagen, er soll
   * die Frau bis zum Knie zeigen").
   *
   * WARUM: An Pixverse geht das FASHN-Bild, und das ist ein Portraet — Kopf, Schultern, oberer
   * Oberkoerper. Alles darunter erfindet Pixverse ohnehin; ohne Ansage entscheidet es auch den
   * Schnitt selbst und bleibt gern zu eng am Gesicht. Fuer einen Tanz an der Stange ist das
   * der falsche Ausschnitt.
   *
   * Bewusst als KAMERA-Anweisung formuliert („medium-wide shot", „in frame") statt als
   * Aufzaehlung von Koerperteilen — dieselbe Vorsicht wie beim Umziehen: Was nach Anatomie
   * klingt, faellt schneller in den Textfilter als was nach Regie klingt.
   */
  "Medium-wide shot: @person is in frame from head to knees, the pole fully visible. " +
  "Fluid calm motion, photorealistic, neon colors and lighting. No text, no letters, no logos.";

/**
 * DAS FREIGESTELLTE SET — das zweite Referenzbild.
 *
 * Der Owner hat es selbst erzeugt („PixVerse Image Effect: extrahiere die Kleidung") und in
 * denselben Ordner gelegt. Es liegt als statische Datei im Repo und NICHT im Storage: Ein
 * signierter Link läuft ab, dieser Pfad nie — und das Set ist Teil des Produkts, nicht
 * gepflegter Inhalt.
 */
/**
 * WEBP STATT PNG/JPEG (Owner 03.08.2026: „natürlich verkleinern, in WebP sogar").
 *
 * Die vier neuen Sets kamen als PNG mit je gut zwei Megabyte — zusammen 16 MB im Repo, die bei
 * jedem Deploy mitreisen und beim Kunden geladen werden, nur damit sie als Referenz an Pixverse
 * gehen. Auf 1080 Breite und WebP/82 sind es 145 bis 189 kB: rund 92 % weniger, ohne dass man
 * einen Unterschied sieht. Groesser braucht es nicht — Pixverse rendert 540p bis 1080p.
 *
 * GEPRUEFT, BEVOR DIE PNG GELOESCHT WURDEN: Pixverse nimmt WebP an (Probelauf, Bild-Kennung
 * 884296575 zurueckgemeldet). Ein Format, das der Anbieter ablehnt, waere die teuerste Art,
 * Speicherplatz zu sparen.
 */
export const POLEDANCE_SET = "/Pooldance/poledance-set.webp";

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
 * DIE ZWEITE FUHRE (Owner 03.08.2026: „ich habe dir neue Bilder reingelegt und getestet in
 * Pixverse, die werden alle angenommen"). Er hat sie selbst dort durchlaufen lassen, bevor er
 * sie geschickt hat — die erste Reihe ersetzt, nicht ergaenzt.
 *
 * EINES TRAEGT LEUCHTSCHRIFT („Play Dirty Love"). Pixverse schreibt solche Zuege gern ins
 * Video — deshalb steht im Prompt ausdruecklich, dass kein Text ins Bild gehoert, und zwar
 * fuer alle: Auch die uebrigen haben Leuchtreklame im Hintergrund. Dieselbe Falle wie bei
 * Bellas Geburtstagsvorlage.
 */
export const POLEDANCE_SETS: { id: string; bild: string; name: string }[] = [
  { id: "haus",    bild: POLEDANCE_SET,                    name: "Pink Neon" },
  { id: "rot",     bild: "/Pooldance/set-rot-satin.webp",  name: "Red Satin" },
  { id: "schwarz", bild: "/Pooldance/set-schwarz.webp",    name: "Black Leather" },
  { id: "blau",    bild: "/Pooldance/set-blau.webp",       name: "Blue Lace" },
  { id: "gruen",   bild: "/Pooldance/set-gruen.webp",      name: "Neon Green" },
  { id: "lack",    bild: "/Pooldance/set-rot-lack.webp",   name: "Red Latex" },
  /**
   * DAS ROTE STUDIO-SET — angenommen (Owner 03.08.2026: „ich habe dir noch eins reingemacht und
   * das wird angenommen").
   *
   * UND ES WIDERLEGT, WAS ICH EINE HALBE STUNDE VORHER ALS REGEL AUFGESCHRIEBEN HATTE. Nach der
   * Absage des schwarzen Harness-Sets stand hier: „Ein Set traegt den Auftrag nur, wenn es die
   * SZENE mitbringt, die im Prompt steht." Dieses Bild hat DENSELBEN dunklen Studio-Hintergrund
   * wie das abgelehnte — nur ist die Waesche rot statt schwarz — und es geht durch.
   *
   * Die Szene war also nicht der Grund. Woran es wirklich liegt, wissen wir nicht: Farbe,
   * Kontrast, wie viel Haut die Silhouette suggeriert — Pixverse sagt es nicht. Was bleibt, ist
   * die einzige Regel, die heute jedes Mal gestimmt hat: VORHER IN PIXVERSE TESTEN, wie der
   * Owner es tut. Ein Set gehoert erst in diese Liste, wenn es dort durchgelaufen ist.
   */
  { id: "rotstudio", bild: "/Pooldance/set-rot-studio.webp", name: "Red Studio" },
];

/**
 * DER PROMPT FUER EIN GEWAEHLTES SET.
 *
 * Der Grundtext bleibt woertlich der des Owners — daran wird nichts angefasst. Angehaengt sind
 * zwei Klauseln, jede gegen einen Fehler, den wir GESEHEN haben:
 *
 * 1) UMZIEHEN, NICHT ANZIEHEN. „wearing the outfit from @image2" liest Pixverse als
 *    ZUSAETZLICH — im Lauf des Owners lag das gruene Set ueber ihrem roten Oberteil, sie trug
 *    beides uebereinander. Beim ersten Beispielvideo fiel das nie auf, weil die Vorlage keine
 *    konkurrierende Kleidung zeigte. Der Zusatz sagt jetzt ausdruecklich: NUR dieses Set,
 *    nichts darunter, nichts darueber.
 *
 * 2) KEIN TEXT. Eines der Sets traegt Leuchtschrift, alle haben Leuchtreklame im Hintergrund;
 *    Pixverse schreibt solche Zuege gern mit ins Video.
 *
 * Beides steht im Prompt und nicht im Bild, weil wir die Bilder des Owners nicht anfassen —
 * sie sind in Pixverse getestet, so wie sie sind.
 */
/**
 * DER ANHANG IST IN DEN GRUNDTEXT GEWANDERT (15.08.2026) — und das musste er, nicht aus
 * Ordnungsliebe: Er sprach noch von `@image2`, waehrend der neue Grundtext `@person`/`@outfit`
 * benutzt. Zusammen waeren das DREI Platzhalter fuer ZWEI Bilder gewesen. Die Route bindet das
 * erste und ein zweites Token an die beiden Bildplaetze — was uebrig bleibt, haengt in der
 * Luft, und Pixverse fuellt es mit einer Erfindung. Genau so entstanden am 03.08. „falsche
 * Personen im Video".
 *
 * Die Funktion bleibt als EINE Stelle stehen, an der der Lauf-Prompt entsteht — der Aufrufer
 * im Trichter muss davon nichts wissen.
 */
export const poledancePromptFuerSet = (): string => POLEDANCE_PROMPT;

/**
 * DER AUSTAUSCH-PROMPT — „REPLACE MODEL", DER ECHTE.
 *
 * Owner 04.08.2026: „das ist kein echter faceswap beim Pooldance. Du musst nach dem Model
 * schauen bei Pixverse. Im Ergebnis werden die Klamotten nicht uebernommen aus dem Video."
 *
 * ER HAT RECHT GEHABT, UND ZWAR AUS EINEM ANDEREN GRUND ALS GEDACHT. Bis heute lief der Tanz
 * ueber `video/mimic/generate` — „Motion Control". Was das laut Pixverse tut, steht in deren
 * eigener Doku: „the subject's appearance from the reference image with motion from the video".
 * Also: die BEWEGUNG aus dem Video, das AUSSEHEN aus dem Foto — und Aussehen schliesst ihre
 * Kleidung ein. Mimic ist kein Austausch, sondern eine Bewegungsschablone. Genau das Ergebnis,
 * das er beschrieben hat.
 *
 * WAS STATTDESSEN GILT — GEMESSEN, NICHT GELESEN (drei bezahlte Laeufe am 04.08.2026 gegen
 * `public/Pooldance/poledance.mp4`, jeweils Standbilder angesehen):
 *
 *   1. `video/swap/generate` (das „Replace Model" der Oberflaeche): Gesicht, Haare und Figur
 *      der Vorlage sitzen perfekt, Stange, Neon, Kamera und Choreografie bleiben exakt das
 *      Original — aber sie tanzt in der STRASSENKLEIDUNG aus ihrem Foto. Die Waesche des
 *      Videos ist weg. 72 Credits, 540p, 54 s.
 *   2. Dasselbe als `video/modify/generate` MIT dem ausdruecklichen Satz „She wears exactly
 *      the same outfit as the woman in the original video — do not change the outfit":
 *      identisches Ergebnis, Bluse und Hose. Der Satz aendert nichts. 80 Credits, 102 s.
 *   3. Feinere Masken gibt es nicht: `video/mask/selection` liefert an drei Zeitpunkten nur
 *      `person`, `background` und zwei Requisiten — kein Gesicht, keine Kleidung einzeln.
 *
 * DARAUS FOLGT DIE UMKEHRUNG, AUF DER DIESER PROMPT STEHT: Kein Pixverse-Weg holt das Outfit
 * AUS dem Video. Jeder holt es aus der VORLAGE. Also wird das Set zur zweiten Vorlage — dann
 * ist „ihre Kleidung" eben das Set. Vierter Lauf, mit @img1 als Set: Ihr Gesicht, das rote
 * Set, die Stange und die Bewegung des Originals. Ein Lauf, 80 Credits — der Preis aus
 * KONZEPT-POLEDANCE.md §5 traegt sich also weiterhin, es braucht KEINEN FASHN-Lauf davor.
 *
 * DIE DREI MARKEN SIND VORGESCHRIEBEN, nicht frei gewaehlt (Pixverse-Doku zu Modify):
 *   @selection0 → die Maske (die Taenzerin im Video)   @img0 → SIE   @img1 → das Set
 * Und: „the number of masks and images must match the references used in the prompt" — wer
 * @img1 schreibt, muss ein zweites Bild mitschicken, sonst bricht der Auftrag ab.
 *
 * NEUTRALE WOERTER wie ueberall: „outfit", kein „lingerie", kein „lace", kein „skin".
 */
export const poledanceSwapPrompt = (): string =>
  "Replace the woman in @selection0 with the woman from @img0. Keep the face and hair of " +
  "the woman from @img0 exactly. She wears only the outfit from @img1. The pole, the club, " +
  "the neon lighting, the camera and all movements stay exactly as in the original video. " +
  "No text, no letters, no writing anywhere in the frame.";

/**
 * WEITERE BEISPIELVIDEOS (Owner 03.08.2026: „ich brauche auf dieser Seite noch einige Beispiel-
 * Videos als Cards, ich habe dir noch zwei reingelegt").
 *
 * ALS KARTEN, NICHT ALS NACKTE VIDEOS — Hausregel seit heute (PLAN-GESCHENKE-FLOW.md §2). Ein
 * Beispiel, das anders aussieht als das Ergebnis, verkauft das falsche Produkt: Die Karte IST
 * das Geschenk, das Video nur ihr Inhalt.
 *
 * Alle drei sind 3:4 mit Tonspur, wie die Kette sie ausgibt. Das erste ist zugleich das
 * Beispiel IM Trichter (`POLEDANCE_VIDEO`) — dort steht es oben in der Karte, hier unten in
 * der Reihe; dasselbe Video an zwei Orten mit verschiedener Aufgabe ist kein Doppel.
 */
export const POLEDANCE_BEISPIELE: { id: string; video: string }[] = [
  { id: "b1", video: POLEDANCE_VIDEO },
  { id: "b2", video: "/Pooldance/ref-1.mp4" },
  { id: "b3", video: "/Pooldance/ref-5.mp4" },
];

/**
 * DIE REFERENZVIDEOS FUER DIE BEWEGUNGSSTEUERUNG (Owner 03.08.2026: „ich habe dir noch
 * Referenzvideos reingemacht" · „es muss auf jeder Karte ein Replace Model stehen").
 *
 * DAS IST DER GANZE TRICHTER IN EINER LISTE. Jede Karte zeigt einen fertigen Tanz — Bewegung,
 * Outfit, Stange, Neon sind darin schon richtig — und der Knopf darauf heisst: nimm DIESEN und
 * setz mich hinein. Es gibt nichts zu beschreiben und nichts zu mischen; genau daran sind
 * heute alle Versuche mit Prompt und Set-Bild gescheitert.
 *
 * Alle 3:4 mit Tonspur, 3 bis 7 Sekunden, vom Owner in Pixverse erzeugt.
 */
export const POLEDANCE_REFERENZEN: { id: string; video: string }[] = [
  { id: "r0", video: POLEDANCE_VIDEO },
  { id: "r1", video: "/Pooldance/ref-1.mp4" },
  { id: "r2", video: "/Pooldance/ref-2.mp4" },
  { id: "r3", video: "/Pooldance/ref-3.mp4" },
  { id: "r4", video: "/Pooldance/ref-4.mp4" },
  { id: "r5", video: "/Pooldance/ref-5.mp4" },
  /* ALLE, die da sind (Owner 03.08.2026: „du sollst alle Videos nehmen"). Die beiden
     Beispielvideos von vorhin sind ebenfalls fertige Taenze — sie nur unten auf der Seite zu
     zeigen und hier nicht anzubieten, waere eine Trennung ohne Grund. */
  { id: "r6", video: "/Pooldance/beispiel-2.mp4" },
  { id: "r7", video: "/Pooldance/beispiel-3.mp4" },
];

