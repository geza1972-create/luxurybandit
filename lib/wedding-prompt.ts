/**
 * DER HOCHZEITS-AUFTRAG — AN EINER STELLE, fuer Bild UND Video (02.08.2026).
 *
 * Stand vorher nur in `components/KissFunnel.tsx`, weil dort der Wedding-Video-Kauf gebaut
 * wurde. Der lebt seit 31.07.2026 aber in `components/EinladungBauen.tsx` — ein Component-zu-
 * Component-Import haette das ganze (sehr grosse) `KissFunnel`-Bundle mit in die Hochzeitsseite
 * gezogen. Hier liegt die Wahrheit jetzt fuer beide.
 */

export const KISS_LOOK_ID = "look-1784191032626-70e3608b";

export type Kleid = { id: string; bild: string; beschreibung: string };
export const WEDDING_KLEIDER: Kleid[] = [
  { id: "klassisch",  bild: "/kleid-klassisch.jpg",  beschreibung: "a sculptural Italian couture wedding gown in heavy ivory silk mikado with a structured off-shoulder corset bodice, a full duchesse satin skirt and a long cathedral train" },
  { id: "prinzessin", bild: "/kleid-prinzessin.jpg", beschreibung: "a grand Italian couture ball gown in layers of silk organza with a hand-draped sweetheart bodice and an immense romantic skirt" },
  { id: "spitze",     bild: "/kleid-spitze.jpg",     beschreibung: "a fitted Italian couture mermaid gown covered in hand-appliqued Chantilly lace with long lace sleeves and an illusion neckline" },
  { id: "seide",      bild: "/kleid-seide.jpg",      beschreibung: "a minimal Italian couture column gown in heavy silk crepe with architectural draping and a deep open back" },
  { id: "perlen",     bild: "/kleid-perlen.jpg",     beschreibung: "an Italian couture gown hand-embroidered with pearls and crystals on fine tulle, a shimmering fitted silhouette" },
];
const KLEID_VORGABE = "an elegant white wedding dress";

/**
 * DIE VIER HOCHZEITS-SZENEN (Owner 03.08.2026: „bei Video erstellung machen wir 4
 * templatevideos wie beim kissing. Und user sucht sich aus die Szene. Eins davon ist
 * küssen.") — derselbe Mechanismus wie `lib/kuss-szenen.ts`, nur mit BRAUT/BRAEUTIGAM statt
 * Braut/Braut: drei Szenen bleiben bei „kein Kuss, beide schauen in die Kamera" (die
 * bisherige, einzige Vorgabe), eine vierte Szene ersetzt das durch einen Kuss.
 *
 * OHNE WAHL ÄNDERT SICH NICHTS (dieselbe Regel wie bei Kiss): `weddingPrompt("")` ohne
 * zweites Argument liefert wortgleich den bisherigen Auftrag.
 *
 * DIE VIER KACHELN (03.08.2026, Owner: „man sieht die braut gar nicht" — die erste Fassung
 * zeigte die Brautkleid-Katalogfotos aus `WEDDING_KLEIDER` als Platzhalter, was wie eine
 * Kleiderauswahl aussah, nicht wie eine Szenenauswahl). Jetzt vier ECHTE Standbilder mit
 * Bella & Peter als Referenzpaar (dieselben, die auch das Urlaubs-/Holiday-Thema zeigt —
 * `lib/bella-card.ts`, `/kiss-placeholder.jpg`) — dieselbe Kette wie beim echten Kauf
 * (`weddingBildPrompt` über `/api/free-preview`), einmalig erzeugt und in
 * `public/szenen-hochzeit/` abgelegt, damit sie mit dem Code reisen (wie `public/szenen/`
 * bei Kiss). Kein Platzhalter mehr — das ist genau das, was die jeweilige Szene liefert.
 */
export type WeddingSzene = {
  id: string;
  /** Kurzname für die Kachel-Beschriftung im Admin — Kunden sehen nur das Bild. */
  name: string;
  /** Ort + Licht, an beide Aufträge (Bild und Video) angehängt. */
  ort: string;
  /** Nur EINE Szene setzt das auf true — dort ersetzt ein Kuss das „schaut in die Kamera". */
  kuss: boolean;
  /** Platzhalter-Kachel, siehe Kommentar oben. */
  kachel: string;
};

/**
 * NUR NOCH ZWEI SZENEN (Owner 06.08.2026: „brauchen wir nur 2 Szenen. Das erste und letzte
 * mit dem Kuss. Szene 123 sind ehe gleich."). Garten und Ballsaal sahen auf den Kacheln aus
 * wie die Kirche — vier Kacheln, die dasselbe versprechen, sind keine Wahl, sondern Rätselei.
 * Der echte Unterschied ist das VERHALTEN: Blick in die Kamera oder der erste Kuss.
 * Alte Kennungen („garten", „ballsaal") fallen über `weddingSzene` auf „keine Szene" zurück —
 * gespeicherte Entwürfe brechen nicht.
 */
export const WEDDING_SZENEN: WeddingSzene[] = [
  {
    id: "kirche", name: "Kirche — am Altar", kuss: false, kachel: "/szenen-hochzeit/hochzeit-kirche.jpg",
    ort: "in a grand church at the altar, tall arched windows with soft light streaming in behind them, white flowers along the aisle",
  },
  {
    id: "kuss", name: "Der erste Kuss", kuss: true, kachel: "/szenen-hochzeit/hochzeit-kuss.jpg",
    ort: "outdoors in soft golden-hour light just after the ceremony, flower petals gently falling around them",
  },
];

/** Szene per Kennung — unbekannte Kennung heisst bewusst „keine Szene" (bisheriger Standard). */
export function weddingSzene(id: unknown): WeddingSzene | null {
  const s = String(id ?? "").trim();
  return WEDDING_SZENEN.find(x => x.id === s) ?? null;
}

export const weddingPrompt = (kleid: string, szeneId?: string) => {
  const sz = weddingSzene(szeneId);
  const ort = sz?.ort ?? "in a beautiful sunlit wedding setting with white flowers behind them";
  const verhalten = sz?.kuss
    ? "@1 and @2 look at each other, smile joyfully, lean in slowly and share a brief tender "
      + "kiss as newlyweds, then smile at each other happily and embrace."
    : "BOTH LOOK STRAIGHT INTO THE CAMERA the whole time, faces fully visible and turned to "
      + "the camera, never turning to each other. He puts his arm around her and holds her "
      + "close, she leans slightly against him; they smile warmly at the camera and laugh "
      + "happily. They do NOT kiss and their faces never touch.";
  // DIE ROLLEN MUESSEN AM TOKEN HAENGEN, nicht im Satz danach: Die Route bindet @1 an das
  // erste Bild (SEIN Foto) und @2 an das zweite (IHRES). Stuende nur „she in a dress, he in a
  // suit" im Text, ohne die Zuordnung, zieht Pixverse das Kleid mit gleicher
  // Wahrscheinlichkeit dem Mann an. Deshalb hier ausdruecklich: @1 ist der Mann, @2 die Frau.
  return "Wide shot, full figures: show @1 and @2 from their knees up to their heads, filmed "
    + "from slightly below. It is their wedding day: @1 is the groom and wears an elegant "
    + "WHITE suit with a white shirt, "
    + `@2 is the bride and wears ${kleid || KLEID_VORGABE}. They stand close together ${ort}. `
    + verhalten + " "
    + "Keep the face and appearance of @1 and of @2 exactly the same "
    + "throughout. Fixed camera, no zoom, no camera movement. Fluid natural motion, "
    + "photorealistic, high-end look. No text or logos. "
    + "Audio: soft, elegant instrumental wedding music only — ONLY music: absolutely no voices, "
    + "no talking, no singing, no footsteps, no ambient or foley sound effects.";
};

export const WEDDING_PROMPT = weddingPrompt("");

/**
 * DERSELBE AUFTRAG FÜRS GRATIS-STANDBILD (OpenAI statt Pixverse — daher eigener, kürzerer
 * Satzbau ohne @-Tokens: `app/api/free-preview/route.ts` ordnet die Fotos schon über
 * `vorlagenSatz` zu). Bisher stand dieser Text dort fest verdrahtet, ohne Szenen-Wahl; jetzt
 * teilt er sich Ort und Kuss/Nicht-Kuss-Verhalten mit `weddingPrompt` — eine Quelle für beide.
 */
export function weddingBildPrompt(kleid: string, szeneId?: string): string {
  const sz = weddingSzene(szeneId);
  const ortSatz = sz
    ? `They are ${sz.ort}.`
    : "Warm sunlight, white flowers and a beautiful wedding setting around them.";
  const verhaltenSatz = sz?.kuss
    ? "They look at each other, lean in and share a tender kiss on the lips, eyes closed, "
      + "faces close together, a joyful newlywed moment."
    : "They stand close together and BOTH LOOK STRAIGHT INTO THE CAMERA, faces fully visible, "
      + "smiling warmly; he has his arm around her. They do NOT kiss and their faces do not touch.";
  return "Generate ONE photorealistic image of these two people on their wedding day: the woman in "
    + kleid + ", the man in an elegant WHITE suit with a white shirt. "
    + verhaltenSatz + " " + ortSatz;
}
