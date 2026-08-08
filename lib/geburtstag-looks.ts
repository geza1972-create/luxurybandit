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
};

export const GEBURTSTAG_LOOKS: GeburtstagLook[] = [
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
      "They keep their natural expression from the photo — no exaggerated grin, no invented " +
      "teeth — and gently present the chocolate cake slightly towards the camera. Subtle " +
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
      "They keep their natural expression from the photo — no exaggerated grin, no invented " +
      "teeth — and gently present the chocolate cake slightly towards the camera. Subtle " +
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
      "They keep their natural expression from the photo — no exaggerated grin, no invented " +
      "teeth — and gently present the golden cake slightly towards the camera. Subtle " +
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

/** Das Bild-Gerüst mit den beiden Wachen — siehe die Erklärung oben. */
export function geburtstagAvatarPrompt(look: GeburtstagLook): string {
  /* Vorgabe-Haltung ist das Bildnis; ein Look darf sie ersetzen (`haltung`). Die Torte wird
     dort als `${torte}` eingesetzt, damit sie auch im Selfie an EINER Stelle steht. */
  const haltung = look.haltung
    ? look.haltung.replace(/\$\{torte\}/g, look.torte)
    : `holding ${look.torte} in both hands`;
  return (
    /* DIE LEITREGEL (Owner 08.08.2026: „es muss sehr am original bleiben. Was zählt sind
       die klamotten und die umgebung") — die Person ist unantastbar, gewechselt wird nur
       ihre Ausstattung. */
    "Use the exact same person from the reference photo, completely unchanged: same face, " +
    "same features, same hair, same skin, same expression. Only the clothing, the cake and " +
    "the surroundings change — nothing about the person. " +
    "A single portrait of that one person only - one single image, not a collage, not a split " +
    "image, no second person. Photorealistic, 3:4 framing, they look straight into the camera " +
    /* NICHTS AM MUND ERFINDEN (Owner 08.08.2026, in zwei Schritten: „Heygen macht mir
       fremde zähne … Furchtbares Ergebnis", dann: „nicht erzwingen den mund zu
       schliessen oder zu öffnen"). Die Regel ist nicht „Mund zu", sondern TREUE: Der
       Mund bleibt exakt wie auf dem Kundenfoto — zeigt es Zaehne, bleiben SEINE Zaehne;
       ist es geschlossen, wird keins dazuerfunden. Erfundene Zaehne sind der schnellste
       Weg, ein Gesicht fremd zu machen. */
    "keeping the exact same natural facial expression and mouth as in the reference " +
    "photo — do not change the smile, never invent or alter teeth" +
    `, ${haltung}. ` +
    `${look.kleidung} Fully and modestly covered, full coverage guaranteed. ` +
    `${look.umgebung} No text, no letters, no logos anywhere in the image.`
  );
}
