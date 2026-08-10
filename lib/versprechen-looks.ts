import type { GeburtstagLook } from "@/lib/geburtstag-looks";
import { VERSPRECHEN_SET } from "@/lib/versprechen";

/**
 * DIE LOOKS DES VERSPRECHENS (Owner 10.08.2026: „Am Ende muss ein Video raus kommen wo du
 * mit Pirsche und Villa dargestellt bist und sagst. Ich werde es schaffen und werde hard
 * dafür arbeiten.").
 *
 * DERSELBE BAUPLAN WIE BEIM GEBURTSTAG, absichtlich: `GeburtstagLook` ist die Form, die
 * `/api/geburtstag-video` versteht — vier Textfelder (was in der Hand ist, was er trägt, wo
 * er steht, wie er sich bewegt) plus optional eine Stil-Vorlage. Eine zweite, eigene Form zu
 * erfinden hiesse, die ganze Kette ein zweites Mal zu bauen und ab dem ersten Fehler zwei
 * Ketten zu pflegen. Der Trichter ist derselbe, der Prompt-Bau ist derselbe; nur diese vier
 * Texte sind andere.
 *
 * DER MENSCH BLEIBT, WIE ER IST — genau wie beim Geburtstag: kein hinzuerfundenes Lächeln,
 * keine erfundenen Zähne. Wer sich etwas verspricht, tut das ernst; ein Grinsen, das das
 * Modell dazudichtet, macht aus einem Vorsatz eine Werbung.
 *
 * KEIN GELDREGEN, KEINE SCHEINE, KEINE MARKENZEICHEN: Der Wagen ist „a dark sports car",
 * nicht der Name eines Herstellers. Ein Logo im Bild ist fremdes Eigentum, und ein
 * Geldbündel macht aus einem Versprechen ein Angeberbild — das verschickt niemand an seine
 * Freunde.
 */
export const VERSPRECHEN_LOOKS: GeburtstagLook[] = [
  {
    id: "villa",
    name: "Villa & Sportwagen",
    /* Die Kachel ist zugleich die Vorlage, sobald es eine gibt (`VERSPRECHEN_SET`). Solange
       sie leer ist, zeigt der Trichter gar keine Auswahl (er blendet eine Reihe mit einer
       einzigen Kachel aus) und die Kette baut den Look aus dem Text darunter. */
    bild: VERSPRECHEN_SET,
    ...(VERSPRECHEN_SET ? { stilBild: VERSPRECHEN_SET } : {}),
    /* `torte` heisst im Prompt „was zusätzlich im Bild ist" — beim Geburtstag die Torte,
       hier der Wagen. Der Name des Feldes bleibt, damit die Kette unverändert läuft; ihn
       umzubenennen hiesse, die Route und beide Look-Listen anzufassen. */
    torte:
      "a dark, elegant sports car standing behind them on the driveway — no brand logos, " +
      "no visible badges, no lettering anywhere",
    kleidung:
      "Dress them in confident, well-cut everyday clothing that suits this person — no " +
      "costume, no uniform, nothing flashy.",
    umgebung:
      "They stand in front of a bright modern villa with large windows and a clean stone " +
      "driveway, warm late-afternoon light, calm blue sky.",
    bewegung:
      "They keep the calm, determined expression from the photo — no smile added, no grin, " +
      "no invented teeth — and look straight into the camera while speaking. Subtle natural " +
      "movement of head, hair and shoulders; the light shifts gently. Quiet, serious, " +
      "self-assured energy — a promise, not a boast.",
  },
];

/** Der Look zur Kennung — unbekannt oder leer ergibt immer den ersten. */
export function versprechenLook(id: unknown): GeburtstagLook {
  const gesucht = String(id ?? "").trim();
  return VERSPRECHEN_LOOKS.find(l => l.id === gesucht) ?? VERSPRECHEN_LOOKS[0];
}
