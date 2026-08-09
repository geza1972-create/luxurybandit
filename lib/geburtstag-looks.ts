import { GEBURTSTAG_SET } from "@/lib/geburtstag";

/**
 * DIE LOOKS DES GEBURTSTAGS — was der Käufer aussucht.
 *
 * Owner 07.08.2026: „Die Leute werden sich den look aussehen wollen. Die müssen absolut
 * cool werden. Es gibt jetzt nur eins die Frau mit der Torte." Bis dahin stand EIN fester
 * Prompt in der Route, und jeder Käufer bekam dasselbe Bild.
 *
 * WARUM EINE EIGENE DATEI, wie bei `lib/kuss-szenen.ts` und `lib/poledance.ts`: Der Prompt,
 * mit dem ein Look entstanden ist, IST das Produkt. Der Käufer tippt auf eine Kachel, weil
 * er genau dieses Bild gesehen hat — Kachelbild und Prompt gehören deshalb in dieselbe
 * Zeile, nicht in zwei Dateien, die auseinanderlaufen können.
 *
 * DAS GERÜST STEHT NUR EINMAL (`avatarPrompt` unten). Zwei Sätze darin sind keine Zierde:
 *
 * 1. „ein einziges Bild, keine Collage, keine zweite Person" — die Wache gegen das
 *    Doppelbild. Am 07.08. hat ein Look-Prompt, der „ein Kleid für eine Frau, ein Anzug
 *    für einen Mann" sagte, tatsächlich ein zweigeteiltes Bild geliefert: links die Frau,
 *    rechts ein fremder Mann. Deshalb nennt hier KEIN Look ein Geschlecht — die Kleidung
 *    soll zu DIESER Person passen, und welche das ist, sieht das Modell auf dem Foto.
 * 2. „vollständig und züchtig bedeckt" — ohne diesen Satz weist OpenAI Aufträge als
 *    `sexual` ab (Memory `openai-tryon-safety-rule`).
 *
 * Ein neuer Look beschreibt deshalb nur noch Torte, Kleidung, Umgebung und Bewegung. Die
 * beiden Wachen kann er gar nicht vergessen.
 */
export type GeburtstagLook = {
  id: string;
  /** Was unter der Kachel steht. Kurz und in allen Sprachen lesbar — die Kachel zeigt das
   *  Bild, das Wort ordnet es nur ein. */
  name: string;
  /** Das Kachelbild, fest im Repo (3:4, das Kartenmass). Ein signierter Link liefe ab. */
  bild: string;
  /** Die Torte in seinen Händen. */
  torte: string;
  /**
   * WIE ER DASTEHT — nur wo die Vorgabe nicht passt.
   *
   * Vorgabe ist das Bildnis: Torte in BEIDEN Händen, gerade in die Kamera. Ein Selfie
   * kann das nicht — eine Hand hält die Kamera. Ohne diese Zeile hätte der Skyline-Look
   * zwei Hände an der Torte UND einen ausgestreckten Arm gebraucht, also drei.
   *
   * Der Text bekommt `${torte}` eingesetzt, damit die Torte auch hier an EINER Stelle steht.
   */
  haltung?: string;
  /** Wie die Person angezogen ist — NIE mit Geschlecht, siehe oben. */
  kleidung: string;
  /** Wo sie steht und in welchem Licht. */
  umgebung: string;
  /** Was sich im Video bewegt (HeyGen `motion_prompt`). */
  bewegung: string;
  /**
   * DIE KACHEL IST DIE STIL-ANWEISUNG (Owner 09.08.2026, nach dem Vergleich mit ChatGPT).
   *
   * Steht hier ein Pfad, schickt die Route ZWEI Bilder an OpenAI: das Kundenfoto als
   * Identität und dieses Bild als Bildwelt — und dazu einen KURZEN Text. Der Grund ist
   * gemessen: Mit einem Bild plus 500 Wörtern Stilbeschreibung muss das Modell den Stil
   * aus Worten erraten und landet bei „Fantasy-Palast mit fotorealistischem Gesicht".
   * Sieht es den Stil, trifft es ihn.
   *
   * Für so einen Look sind `kleidung`/`umgebung`/`torte` NICHT die Anweisung — die Kachel
   * ist es. Sie beschreiben dann nur noch, was zusätzlich im Bild sein soll.
   */
  stilBild?: string;
};

export const GEBURTSTAG_LOOKS: GeburtstagLook[] = [
  {
    /**
     * DIE TRAUMWELT (Owner 09.08.2026, nach einem Vormittag Prompt-Vergleich: „ja, das ist
     * besser" · „mach die Vorlage mit der rothaarigen Frau").
     *
     * Der Look, der das Urteil „es wirkt trocken" beantwortet. Die Kachel ist zugleich die
     * STIL-VORLAGE (`stilBild`): Sie zeigt dieselbe Frau wie „Black Tie", aber vollständig
     * gemalt — und genau diese Handschrift bekommt der Käufer auf sein eigenes Gesicht.
     *
     * Entstanden aus zwei Bild-Eingaben (Black-Tie-Kachel als Identität, eine erzeugte
     * Stil-Platte als Bildwelt) plus acht Zeilen Text. Der entscheidende Satz darin:
     * „Do not preserve photographic skin rendering. Preserve identity, transfer rendering
     * style." Er löst den Widerspruch, an dem alle früheren Versuche scheiterten —
     * Identität bewahren heisst für das Modell sonst „fotografisch bewahren", und dann
     * steht ein Fotogesicht in einer Illustration.
     */
    id: "traum",
    name: "Dream World",
    bild: "/Birthday/look-traum.jpg",
    stilBild: "/Birthday/look-traum.jpg",
    torte:
      "an extravagant surreal birthday cake with lit candles that belongs to the same " +
      "fantasy world — a defined round tiered silhouette on a plate, clearly separated " +
      "from the dress and the background",
    kleidung: "",
    umgebung: "",
    bewegung:
      "They keep the calm neutral expression from the photo — no smile added, no grin, no " +
      "invented teeth — and gently present the cake slightly towards the camera. Bubbles " +
      "drift, the water shimmers, the candle flames flicker. Joyful dreamlike energy.",
  },
  {
    /**
     * DER ABGENOMMENE (Owner 07.08.2026: „alles passt perfekt" · „der Look und die Torte
     * sind sehr gut"). Er steht an erster Stelle und ist die Vorgabe: Aus ihm ist das
     * Beispielvideo der Landingpage entstanden (`GEBURTSTAG_VIDEO`). Wer ihn hier
     * herausnimmt, muss dieses Video neu erzeugen — sonst verspricht die Anzeige einen
     * Look und der Käufer bekommt einen anderen.
     */
    id: "blacktie",
    name: "Black Tie",
    bild: GEBURTSTAG_SET,
    torte:
      "a beautiful elegant chocolate birthday cake: dark glossy chocolate ganache, delicate " +
      "chocolate curls, gold sprinkle accents and one lit golden candle",
    kleidung: "Dress them in beautiful festive celebration attire that suits this person.",
    umgebung: "Neutral warm grey studio background, soft light.",
    bewegung:
      "They keep the calm neutral expression from the photo — no smile added, no grin, no " +
      "invented teeth — and gently present the chocolate cake slightly towards the camera. Subtle " +
      "natural movement of head, hair and shoulders, the candle flame flickers softly. " +
      "Calm elegant celebratory energy.",
  },
  {
    /**
     * MANN MIT FLIEGE STATT MANN AUF DEM DACH (Owner 08.08.2026: „ich brauche auch eine
     * Vorlage Mann mit fliege. Statt Mann auf dem Dach"). Der Skyline-Selfie-Look ist
     * damit raus; alte Auftraege mit `skyline` fallen ueber `geburtstagLook` auf den
     * abgenommenen Black-Tie zurueck.
     *
     * AUF DIESER KACHEL STEHT WEITER EIN MANN (Owner 07.08.2026: „mach den typ auch
     * rein") — zeigen alle Kacheln eine Frau, sieht ein Mann sich nirgends. Das Bild ist
     * der HeyGen-Testlauf vom 08.08. (synthetische Person, KEIN Kundengesicht), aus
     * GENAU dieser Torte-Kleidung-Umgebung-Beschreibung entstanden: Smoking, Fliege,
     * Schokotorte, Dachterrasse im Abendlicht. Es ist zugleich der Beweis, dass der
     * Look traegt. Der Prompt nennt wie immer KEIN Geschlecht — auch eine Kaeuferin
     * bekommt dieses Set, dann sitzt der Smoking eben an ihr.
     */
    id: "fliege",
    name: "Bow Tie",
    bild: "/Birthday/look-fliege.jpg",
    torte:
      "a rich chocolate birthday cake with dark glossy ganache swirls and many lit slim candles",
    kleidung:
      "Dress them in an elegant black tuxedo with a crisp white shirt and a black bow tie " +
      "that suits this person.",
    umgebung:
      "On an elegant rooftop terrace at sunset, a softly blurred warm city skyline glowing " +
      "far behind them, golden evening light.",
    bewegung:
      "They keep the calm neutral expression from the photo — no smile added, no grin, no " +
      "invented teeth — and gently present the chocolate cake slightly towards the camera. Subtle " +
      "natural movement of head, hair and shoulders, the candle flames flicker softly in " +
      "the evening air. Elegant, festive rooftop energy.",
  },
  {
    /**
     * DER GEWÄHLTE (Owner 07.08.2026, aus sechs Kandidaten: „Bild 3"). Goldballons,
     * Pailletten, Blattgold-Torte — der lauteste der sechs und der einzige, der ohne
     * Nachtlicht auskommt: Neon und Kerzen waren dunkel, und ein dunkles Gesicht ist
     * genau das, woran die Video-Stufe schwächelt.
     */
    id: "konfetti",
    name: "Gold & Confetti",
    bild: "/Birthday/look-konfetti.jpg",
    torte:
      "a tall white birthday cake with gold leaf, a gold drip and three lit slim golden candles",
    kleidung:
      "Dress them in shimmering champagne-gold party attire that suits this person, " +
      "with fine sequins catching the light.",
    umgebung:
      "Golden balloons floating behind them, fine gold confetti falling through the air, " +
      "bright warm party light, soft cream background.",
    bewegung:
      "They keep the calm neutral expression from the photo — no smile added, no grin, no " +
      "invented teeth — and gently present the golden cake slightly towards the camera. Subtle " +
      "natural movement of head, hair and shoulders, the candle flames flicker softly and " +
      "the confetti drifts down behind them. Bright joyful celebratory energy.",
  },
];

/** Der Look zur Kennung — unbekannt oder leer ergibt IMMER den ersten (den abgenommenen),
 *  damit ein alter Auftrag oder ein Tippfehler nie ohne Prompt dasteht. */
export function geburtstagLook(id: unknown): GeburtstagLook {
  const gesucht = String(id ?? "").trim();
  return GEBURTSTAG_LOOKS.find(l => l.id === gesucht) ?? GEBURTSTAG_LOOKS[0];
}

/**
 * DER KURZE PROMPT FÜR STIL-VORLAGEN-LOOKS (`stilBild`).
 *
 * Er sagt bewusst NICHT „preserve skin tone / facial structure": Das Bildmodell liest
 * solche Sätze als „Gesicht fotografisch konservieren" und liefert dann ein Fotogesicht in
 * einer gemalten Welt — der Fehler, an dem am 09.08. vier Versuche hintereinander
 * gescheitert sind. Stattdessen wird Identität von Rendering getrennt: die Person kommt
 * aus Bild 1, die Handschrift aus Bild 2.
 */
export function geburtstagStilPrompt(look: GeburtstagLook): string {
  return (
    "Use image 1 for the person's identity and image 2 for the visual art direction. " +
    "Recreate the person from image 1 inside the artistic universe of image 2. " +
    "They must remain recognizably the same person — same face, same hair, same overall " +
    "likeness — but render their face, skin, hair, clothing, the cake and the surroundings " +
    "in the SAME painterly-surreal visual language as image 2. " +
    "Do not preserve photographic skin rendering. Do not place a photorealistic face into " +
    "an illustrated background. The identity comes from image 1; the rendering style, " +
    "colour language, texture, atmosphere and surrealism come from image 2. " +
    `They are holding ${look.torte}. ` +
    "The cake, the person and the environment must look as if they were painted by the " +
    "same artist in one single artwork. Fully and modestly covered, full coverage " +
    "guaranteed. One single image, not a collage, no second person. " +
    "Avoid princess fantasy and royal palace portraiture. " +
    "Preserve identity, transfer rendering style. No text, no letters, no watermark."
  );
}

/** Das Bild-Gerüst mit den beiden Wachen — siehe die Erklärung oben. */
export function geburtstagAvatarPrompt(look: GeburtstagLook): string {
  /* Vorgabe-Haltung ist das Bildnis; ein Look darf sie ersetzen (`haltung`). Die Torte wird
     dort als `${torte}` eingesetzt, damit sie auch im Selfie an EINER Stelle steht. */
  const haltung = look.haltung
    ? look.haltung.replace(/\$\{torte\}/g, look.torte)
    : `holding ${look.torte} in both hands`;
  return (
    /**
     * DIE IDENTITAETSSPERRE STEHT GANZ OBEN (Owner 08.08.2026, nach acht Vergleichslaeufen
     * an einem Abend — der Wortlaut stammt aus seinem eigenen Vergleich mit ChatGPT).
     *
     * Warum genau DIESE Saetze: Jede Aufforderung, das Bild „schoen" oder „editorial" zu
     * machen, hat das Modell dazu gebracht, auch das GESICHT zu verbessern — und
     * verbessert heisst fremd. „Do not redesign or beautify her face" ist deshalb keine
     * Hoeflichkeit, sondern die Wache. Kein Look kann sie umgehen, sie steht hier einmal.
     */
    "IDENTITY LOCK: The uploaded person's face is the source of truth. Do not alter, " +
    "reinterpret, beautify, age, or replace the face. Only modify the requested clothing, " +
    "environment and objects. " +
    "Edit the provided image. Keep the person's face, identity, facial features, hairstyle, " +
    "skin tone, expression and overall likeness unchanged. Do not redesign or beautify the " +
    "face. They must remain clearly the same person from the reference photo. " +
    "A single portrait of that one person only - one single image, not a collage, not a split " +
    "image, no second person. Photorealistic, 3:4 framing, they look straight into the camera " +
    /* NICHTS AM MUND ERFINDEN (Owner 08.08.2026, in zwei Schritten: „Heygen macht mir
       fremde zähne … Furchtbares Ergebnis", dann: „nicht erzwingen den mund zu
       schliessen oder zu öffnen"). Die Regel ist nicht „Mund zu", sondern TREUE: Der
       Mund bleibt exakt wie auf dem Kundenfoto — zeigt es Zaehne, bleiben SEINE Zaehne;
       ist es geschlossen, wird keins dazuerfunden. Erfundene Zaehne sind der schnellste
       Weg, ein Gesicht fremd zu machen. */
    /* NEUTRAL, NICHT LAECHELND (Owner 08.08.2026: „es ist ein übertriebenes lächeln" →
       „neutraler Ausdruck ja"). Jede Aufforderung zum Laecheln laedt das Modell ein, den
       Mund neu zu bauen — und mit ihm Zaehne, die es nie gesehen hat. */
    "with a calm neutral expression, exactly the same face and mouth as in the reference " +
    "photo — do not add or widen a smile, never invent or alter teeth" +
    `, ${haltung}. ` +
    `${look.kleidung} Fully and modestly covered, full coverage guaranteed. ` +
    `${look.umgebung} No text, no letters, no logos anywhere in the image.`
  );
}
