import { frageModell, KLEIN, str, strListe, type Verbrauch } from "@/lib/agent-modell";
import { KUNST_KATEGORIEN } from "@/lib/versusforge-kunst-rezept";

/**
 * DER AGENT SIEHT DAS WERK (Owner 10.09.2026: „Klar muss er das sehen und analysieren" · Kunst-
 * Rezept Schritt 1: „Kannst du mir zeigen, was du malst?").
 *
 * ── WAS ES TUT ────────────────────────────────────────────────────────────────────────────
 *
 * Ein Bild, ein Aufruf des kleinen Modells in niedriger Auflösung. Zurück kommt, was das Rezept
 * braucht: Medium, Stil und Motiv aus den Artsy-Kategorien, die sichtbaren Merkmale, das Seltene
 * daran und — nur wenn es wirklich passt — bekannte Künstler mit ähnlichem Stil.
 *
 * DER CODE RUFT ES AUF, NICHT DAS MODELL. Zeigt der Künstler auf die Bitte des Agenten ein Bild,
 * ist das sein Ja zum Ansehen (Rezept Schritt 1). Ein Werkzeug, das das Modell aufrufen KANN,
 * würde es manchmal vergessen — und dann zählte die Aufnahme ein Bild nicht, das er gezeigt hat.
 *
 * NUR WERTE AUS DEN LISTEN. Was nicht in `KUNST_KATEGORIEN` steht, wird leer: Die Aufnahme zählt
 * gleiche Stile, und „Figurative" und „figurative art" dürfen nicht zwei Stile sein.
 */

export type WerkBefund = {
  medium: string;
  stil: string;
  motiv: string;
  /** Sichtbare Merkmale, kurz — „lots of blue", „straight strokes". */
  merkmale: string[];
  /** Die seltene Verbindung, mit Grund. Leer, wenn nichts heraussticht. */
  selten: string;
  /** Bekannte Künstler mit ähnlichem Stil — nur bei deutlicher Ähnlichkeit. */
  erinnertAn: string;
  /** Wovon das Bild träumen lässt — Pool → Urlaub, Luxus (Owner 10.09.2026). Leer, wenn nichts. */
  traum: string;
  /**
   * WAS WIRKLICH ZU SEHEN IST (Owner 10.09.2026: „du gehst sehr oberflächlich ran. Du erkennst die
   * Motive nicht im Bild"). Stichworte wie „ultramarine sky" trugen kein Motiv — die drei Sprüche
   * hiessen dreimal „Ultramarin". Ein, zwei Sätze wie ein Sammler: Dinge, Figuren, Ort, was passiert.
   */
  szene: string;
};

const ausListe = (wert: unknown, liste: readonly string[]) => {
  const w = str(wert, 60).toLowerCase();
  return liste.find(x => x.toLowerCase() === w) ?? "";
};

/** Ein Befund aus dem Browser ist fremde Eingabe: nur Listenwerte und kurze, einzeilige Texte. */
export function werkSaeubern(roh: unknown): WerkBefund | null {
  const o = (roh ?? {}) as Record<string, unknown>;
  const einzeilig = (v: unknown, max: number) => str(v, max).replace(/\s+/g, " ");
  const werk: WerkBefund = {
    medium: ausListe(o.medium, KUNST_KATEGORIEN.medium),
    stil: ausListe(o.stil, KUNST_KATEGORIEN.stil),
    motiv: ausListe(o.motiv, KUNST_KATEGORIEN.motiv),
    merkmale: strListe(o.merkmale, 7, 60).map(m => m.replace(/\s+/g, " ")),
    selten: einzeilig(o.selten, 200),
    erinnertAn: einzeilig(o.erinnertAn, 120),
    traum: einzeilig(o.traum, 160),
    szene: einzeilig(o.szene, 400),
  };
  return werk.medium || werk.stil || werk.motiv || werk.merkmale.length ? werk : null;
}

export async function bildAnsehen(o: { apiKey: string; bild: string }): Promise<
  { ok: true; werk: WerkBefund; verbrauch: Verbrauch } | { ok: false; fehler: string }
> {
  if (!o.bild.startsWith("data:image/")) return { ok: false, fehler: "kein Bild" };

  const auftrag = [
    "You are an experienced art advisor. Look at this artwork and classify it. Be precise and honest; do not flatter.",
    `medium — exactly one of: ${KUNST_KATEGORIEN.medium.join(" | ")}`,
    `stil — exactly one of: ${KUNST_KATEGORIEN.stil.join(" | ")}. Judge from what you SEE, not from any title.`,
    `motiv — exactly one of: ${KUNST_KATEGORIEN.motiv.join(" | ")}`,
    /* DIE SPRACHE DES KÜNSTLERS (Owner 10.09.2026: „die Künstler hören nicht gerne das Wort Lasur.
       Sie hören gerne spezielle Farben wie Siena …" · „wenn er Pool hat, sag doch was mit dem Pool
       … was die träumen lässt"). Aus diesen Wörtern baut der Agent später seine Sprüche. */
    "merkmale — 4 to 7 short visible features in English, 2 to 4 words each: colours named the way painters and collectors love them (e.g. Siena, ultramarine, paradise blue, Naples yellow — only colours you really see), objects, setting, mood. NO technique words (glaze, impasto, drips, brushwork, layering). Only what is visible.",
    "selten — one sentence in English: the combination of features that is rare, and why it is rare. Empty if nothing stands out.",
    "erinnertAn — well-known artists whose style this clearly resembles, comma-separated, at most two. Empty unless the resemblance is obvious.",
    "traum — a short phrase in English: what this picture lets a viewer dream of (e.g. holiday, luxury, the south, childhood summers). Empty if nothing.",
    "szene — one or two sentences in English describing what is ACTUALLY depicted, the way a collector would: the concrete objects, figures, animals, plants, buildings, the place, what is happening, the mood. Look at the whole canvas including small details. Only what is visible.",
    'Answer ONLY as JSON: {"medium":"...","stil":"...","motiv":"...","szene":"...","merkmale":["..."],"selten":"...","erinnertAn":"...","traum":"..."}',
  ].join("\n");

  const r = await frageModell(o.apiKey, KLEIN, [
    { type: "input_text", text: auftrag },
    /* VOLLE AUFLÖSUNG (Owner 10.09.2026: „Du erkennst die Motive nicht im Bild"). Mit „low" sah das
       Modell ein stark verkleinertes Bild — Figuren und Gegenstände gingen unter. */
    { type: "input_image", image_url: o.bild, detail: "high" },
  ], "low");
  if (!r.ok) return { ok: false, fehler: r.fehler };

  const werk = werkSaeubern(r.daten);
  if (!werk) return { ok: false, fehler: "nicht lesbar" };
  return { ok: true, werk, verbrauch: r.verbrauch };
}
