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
    namen: {
      en: "Villa & sports car",
      ro: "Vilă & mașină sport",
      es: "Villa y deportivo",
      fr: "Villa & voiture de sport",
      pt: "Villa e carro desportivo",
      it: "Villa e auto sportiva",
    },
    /* Die Kachel, die der Kunde vor der Aufnahme sieht — reine ANZEIGE. */
    bild: VERSPRECHEN_SET,
    /**
     * KEIN `stilBild` — UND DAS IST DER GANZE UNTERSCHIED ZUM GEBURTSTAG (11.08.2026, an
     * genau dieser Zeile fast ein falsches Video erzeugt; Owner: „was wird generiert will
     * ich jetzt wissen bevor ich ein falsches video generiere").
     *
     * WAS EIN `stilBild` AUSLÖST: In `/api/geburtstag-video` schaltet allein seine Existenz
     * den Prompt um — statt `geburtstagAvatarPrompt` (fotorealistisch, Identitätssperre)
     * läuft dann `geburtstagStilPrompt`. Und der ist der TRAUMWELT-Prompt des Geburtstags:
     * „painterly-surreal visual language", „Do not preserve photographic skin rendering",
     * „the cake … painted by the same artist". Für eine Torten-Traumwelt genau richtig —
     * für ein Versprechen vor Villa und Wagen falsch: Es käme ein GEMÄLDE heraus, kein
     * Mensch, der seinem zukünftigen Ich etwas verspricht.
     *
     * Bis heute stand hier `stilBild: VERSPRECHEN_SET`, und es fiel nur deshalb nicht auf,
     * weil die Datei (`look-villa.png`) gelöscht war: Der Abruf scheiterte, `stilBytes`
     * blieb leer, und die Kette nahm zufällig den richtigen Prompt. Mit einem wieder
     * vorhandenen Bild wäre aus dem Zufall ein falsches Produkt geworden.
     *
     * Die Bildwelt trägt hier der TEXT (kleidung/umgebung/torte unten) — sie ist
     * fotografisch beschreibbar, anders als eine Handschrift, die man zeigen muss.
     */
    /* `torte` heisst im Prompt „was zusätzlich im Bild ist" — beim Geburtstag die Torte,
       hier der Wagen. Der Name des Feldes bleibt, damit die Kette unverändert läuft; ihn
       umzubenennen hiesse, die Route und beide Look-Listen anzufassen. */
    torte:
      "a low, dark, glossy sports car parked beside them, catching the warm light on its " +
      "flanks — no brand logos, no visible badges, no lettering anywhere",
    /**
     * DIE HALTUNG MUSS HIER STEHEN — SONST HÄLT ER DAS AUTO IN DEN HÄNDEN (11.08.2026, an
     * seinem ersten echten Lauf gefunden; Owner: „das bild ist unspektakulär", und im Bild
     * hielt er einen Autoschlüssel).
     *
     * `geburtstagAvatarPrompt` setzt ohne dieses Feld die Vorgabe des GEBURTSTAGS ein:
     * `holding ${torte} in both hands` — beim Geburtstag die Torte, hier also „ein dunkler
     * Sportwagen in beiden Händen". Das Bildmodell rettet sich aus dem Unsinn mit dem
     * Nächstbesten, das in zwei Hände passt: dem Autoschlüssel. Deshalb steht hier ab jetzt
     * eine eigene Haltung — beiläufig an den Wagen gelehnt, Hände frei.
     */
    haltung:
      "leaning back casually against the front wing of ${torte}, one hand relaxed in a " +
      "trouser pocket, weight on one leg, shoulders open, nothing in their hands",
    /**
     * DIE KLEIDUNG MACHT DEN UNTERSCHIED (Owner 11.08.2026, im Vergleich mit dem
     * Beispielvideo: „schau dir mal den anderen typ an, sein anzug, haus, licht").
     *
     * Hier stand „confident, well-cut everyday clothing … nothing flashy". „Everyday" und
     * „nothing flashy" sind zwei Bremsen auf einmal — das Modell liefert daraufhin genau
     * das: Alltag. Wer sich ein Leben verspricht, steht nicht in der Jacke da, in der er
     * einkaufen geht. Also die Bildwelt des Beispielvideos ausgeschrieben: heller Leinen-
     * und Baumwollton, Riviera statt Büro, gut sitzend. „Suits this person" bleibt (Memory
     * `bildprompt-nie-zwei-geschlechter`), damit dieselbe Beschreibung Frau wie Mann trägt.
     */
    kleidung:
      "Dress them in refined warm-toned resort wear that suits this person — soft cream, " +
      "ivory or sand, fine knit or linen, impeccably cut and lightly relaxed, quietly " +
      "expensive. Elegant sunglasses and a slim classic watch if they suit the person. No " +
      "costume, no uniform, no printed slogans, no visible brand names.",
    /**
     * DAS LICHT UND DER ORT (derselbe Owner-Hinweis). „Warm late-afternoon light, calm blue
     * sky" ergab flaches Mittagslicht über einer Auffahrt — beschrieben war ja auch eine
     * Auffahrt. Das Beispielvideo lebt von der GOLDENEN STUNDE tief am Horizont, vom Wasser
     * und von der offenen Terrasse; genau das steht jetzt hier. Kein Ort der Welt wird
     * benannt (keine erfundene Adresse), nur das Licht und die Architektur.
     */
    umgebung:
      "They are on the pool terrace of a bright modern villa at golden hour: low sun just " +
      "above the horizon, warm amber light raking across them from behind, long soft " +
      "shadows, glowing sky. Behind them the villa's large glass fronts and clean stone, a " +
      "still infinity pool reflecting the light, a few mediterranean pines. Cinematic, " +
      "photorealistic, shallow depth of field, rich contrast — editorial quality.",
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
