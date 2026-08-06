/**
 * DER AUFTRAG FÜR „DU IN FÜNF JAHREN" — das Gratis-Bild des LuxuryBandit Systems.
 *
 * Owner 04.08.2026: „und dann weiter mit Bild-Upload, Generierung gratis und Plan gegen Geld."
 *
 * WAS GRATIS IST UND WAS NICHT — die Aufteilung ist keine Willkür, sondern folgt den Kosten:
 *
 *   „Du heute"        = sein hochgeladenes Foto. Kostet nichts, wird nicht erzeugt.
 *   „Du in 2 Jahren"  = EIN Lauf über gpt-image-1 in der Stufe „low" — das Gratis-Bild.
 *   „Du in 5 Jahren"  = gehört zum bezahlten Lauf. Wer zahlt, bekommt die ganze Strecke.
 *
 * UMGEDREHT AM 05.08.2026 (Owner: „bei dem können wir ein bild gratis verschenken, du in 2
 * Jahren"). Vorher war es genau andersherum, mit der Begründung, das Fünf-Jahres-Bild sei das,
 * weswegen er gekommen ist. Genau deshalb gehört es hinter die Kasse: Der Beweis muss zeigen,
 * dass es mit SEINEM Gesicht funktioniert — dafür reichen zwei Jahre. Das Ziel selbst zu
 * verschenken heisst, das Produkt zu verschenken.
 *
 * Und die zwei Jahre sind das ehrlichere Bild: „Zwei Jahre sind nicht die Villa. Zwei Jahre
 * sind der erste eigene Wagen, den du bar bezahlt hast" (KONZEPT). Wer sich darin wiedererkennt,
 * glaubt auch den Rest; wer sich vor der Villa sieht, hat schon alles bekommen.
 *
 * GEBAUT WIE `lib/wedding-prompt.ts` und `lib/holiday-invite.ts`: Der Auftrag geht als
 * `prompt` an `/api/free-preview`, das Foto als `person`. Die OpenAI-Bedeckungszusage hängt
 * die Route selbst an — sie darf hier NICHT noch einmal stehen (Memory
 * `openai-tryon-safety-rule`).
 *
 * NEUTRALE WORTE, KEINE MARKEN. Kein „Porsche", kein „Rolex", kein Firmenname: Bildmodelle
 * weigern sich bei Markenzeichen oder bauen etwas, das dem Original ähnelt und dann ein
 * Rechtsproblem ist. „A dark sports car" liefert dasselbe Gefühl und ist unbedenklich —
 * dieselbe Regel, die schon beim 360°-Auftrag galt (Memory `pixverse-360-turnaround-prompt`).
 *
 * KEINE ZAHLEN, KEIN GELD IM BILD. Keine Geldscheine, keine Uhrzeiten auf Displays, keine
 * Beschriftungen. Ein Bild mit einem Betrag darin wäre genau das Einkommensversprechen, das
 * dieses Produkt nirgends gibt (Skill `business-analyse`, §6).
 */

/** Die Kulissen, aus denen „in fünf Jahren" gebaut wird — gehoben, aber erreichbar. */
export type PlanSzene = {
  id: string;
  /** Kurzname für den Admin — Kunden sehen nur das Bild. */
  label: string;
  /** Was zu sehen ist. Fliesst wörtlich in den Auftrag. */
  kulisse: string;
};

export const PLAN_SZENEN: PlanSzene[] = [
  {
    id: "terrasse",
    label: "Dachterrasse am Abend",
    kulisse:
      "standing on a rooftop terrace of a modern house at golden hour, city and sea far below, warm low sun from the side",
  },
  {
    id: "wagen",
    label: "Vor dem dunklen Wagen",
    kulisse:
      "standing in front of a polished dark sports car outside a modern villa at sunset, no visible badges or lettering anywhere",
  },
  {
    id: "marina",
    label: "Am Hafen",
    kulisse:
      "standing on a marina promenade at sunset, white yachts and calm water behind, warm golden light",
  },
  {
    id: "buero",
    label: "Eigenes Büro",
    kulisse:
      "standing in a bright modern office with floor-to-ceiling windows and a city view, late afternoon light",
  },
];

/**
 * DIE KULISSEN DER ZWEI JAHRE — der erste Schritt, nicht das Ziel.
 *
 * Sie müssen eine eigene Liste sein und nicht dieselben: Eine Dachterrasse über dem Meer nach
 * zwei Jahren ist entweder gelogen oder macht das Fünf-Jahres-Bild überflüssig. Hier steht,
 * was nach zwei Jahren echt aussieht — ein eigener Laden, ein bezahlter Wagen, ein Schreibtisch,
 * der ihm gehört. Dieselben Regeln wie oben: keine Marken, keine Schrift, kein Geld im Bild.
 */
export const PLAN_SZENEN_2J: PlanSzene[] = [
  {
    id: "laden",
    label: "Eigener Laden",
    kulisse:
      "standing in the doorway of his own small shop in the morning, clean plain facade without any lettering, street light soft behind him",
  },
  {
    id: "wagen2",
    label: "Der erste eigene Wagen",
    kulisse:
      "standing beside a clean, ordinary mid-range car on a quiet street, no visible badges or lettering anywhere, bright overcast daylight",
  },
  {
    id: "werkstatt",
    label: "Am eigenen Arbeitsplatz",
    kulisse:
      "standing at his own tidy workbench or desk in a small plain workspace, daylight from a side window",
  },
  {
    id: "kaffee",
    label: "Vor dem Feierabend",
    kulisse:
      "sitting at an outdoor cafe table in a small town square in the late afternoon, relaxed, warm side light",
  },
];

/**
 * DIE SZENE WIRD NICHT GEFRAGT, SIE WIRD GEZOGEN.
 *
 * Beim Kuss hat der Owner die Szenenauswahl am 03.08.2026 abgeschafft: „wir machen die ganze
 * Videoauswahl raus. Die Leute bekommen ein Zufalls-Video als Überraschung." Der Grund gilt
 * hier genauso — wer vier Kulissen vergleicht, zweifelt; wer eine bekommt, ist überrascht.
 * Und es ist ein Schritt weniger zwischen ihm und dem Ergebnis.
 */
export function zufallsSzene(jahre: 2 | 5 = 5): PlanSzene {
  const liste = jahre === 2 ? PLAN_SZENEN_2J : PLAN_SZENEN;
  return liste[Math.floor(Math.random() * liste.length)];
}

/**
 * Der fertige Auftrag für das Gratis-Bild.
 *
 * @param szene  Kulisse; ohne Angabe wird gezogen.
 * @param idee   Seine Idee in einem Satz — sie färbt die Kleidung, nicht die Kulisse. Wer ein
 *               Handwerk plant, soll nicht im Anzug dastehen; das Bild soll seins sein, nicht
 *               das eines Bankers. Leer lassen ist erlaubt.
 */
export function planBildPrompt(szene?: PlanSzene, idee?: string, jahre: 2 | 5 = 5): string {
  const s = szene ?? zufallsSzene(jahre);
  const beruf = String(idee ?? "").trim().slice(0, 200);
  const wort = jahre === 2 ? "two" : "five";

  return [
    // 1 · Wer — und dass es DERSELBE Mensch bleibt. Das ist die ganze Leistung des Bildes.
    `Photorealistic portrait of the SAME man as in the reference photo, ${wort} years older.`,
    `Keep his face, his bone structure, his hair type and his skin tone exactly as in the reference — he must be recognisable at a glance. Do not beautify, do not slim, do not change his ethnicity or his age beyond ${wort} years.`,

    // 2 · Was sich verändert hat: Haltung und Auftreten, nicht das Gesicht.
    "What changed is his bearing, not his face: upright posture, relaxed shoulders, calm and self-assured expression, looking slightly off camera. Well groomed, fitter, rested.",

    // 3 · Kleidung — nach zwei Jahren ordentlich, nach fünf gehoben. Der Unterschied muss im
    //     Auftrag stehen, sonst malt das Modell beide Male denselben Anzug.
    jahre === 2
      ? "Wearing simple, clean everyday clothing that fits him well — nothing expensive, nothing flashy, fully covered from shoulders to ankles, no logos, no lettering, no visible brand marks."
      : "Wearing well-fitted smart-casual clothing in quiet colours, fully covered from shoulders to ankles, no logos, no lettering, no visible brand marks.",
    beruf ? `His clothing should suit someone who runs this kind of business: ${beruf}.` : "",

    // 4 · Die Kulisse.
    `He is ${s.kulisse}.`,

    // 5 · Wie es aussieht.
    "Cinematic editorial photograph, shallow depth of field, warm natural light, rich contrast, 4:5 vertical framing, waist-up to three-quarter view.",

    // 6 · Was NICHT hineingehört.
    "No text, no numbers, no price tags, no money, no watermarks, no brand badges, no other people, no phone in hand.",
  ].filter(Boolean).join(" ");
}
