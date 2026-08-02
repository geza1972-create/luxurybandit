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

export const weddingPrompt = (kleid: string) =>
  // DIE ROLLEN MUESSEN AM TOKEN HAENGEN, nicht im Satz danach: Die Route bindet @1 an das
  // erste Bild (SEIN Foto) und @2 an das zweite (IHRES). Stuende nur „she in a dress, he in a
  // suit" im Text, ohne die Zuordnung, zieht Pixverse das Kleid mit gleicher
  // Wahrscheinlichkeit dem Mann an. Deshalb hier ausdruecklich: @1 ist der Mann, @2 die Frau.
  "Wide shot, full figures: show @1 and @2 from their knees up to their heads, filmed from "
  + "slightly below. It is their wedding day: @1 is the groom and wears an elegant WHITE suit "
  + "with a white shirt, "
  + `@2 is the bride and wears ${kleid || KLEID_VORGABE}. They stand close together in a ` +
  + "beautiful sunlit wedding setting with white flowers behind them. BOTH LOOK STRAIGHT INTO "
  + "THE CAMERA the whole time, faces fully visible and turned to the camera, never turning to "
  + "each other. He puts his arm around her and holds her close, she leans slightly against "
  + "him; they smile warmly at the camera and laugh happily. They do NOT kiss and their faces "
  + "never touch. Keep the face and appearance of @1 and of @2 exactly the same "
  + "throughout. Fixed camera, no zoom, no camera movement. Fluid natural motion, "
  + "photorealistic, high-end look. No text or logos. "
  + "Audio: soft, elegant instrumental wedding music only — ONLY music: absolutely no voices, "
  + "no talking, no singing, no footsteps, no ambient or foley sound effects.";

export const WEDDING_PROMPT = weddingPrompt("");
