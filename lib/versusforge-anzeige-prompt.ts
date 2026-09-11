/**
 * DER BILDAUFTRAG FÜR DIE FERTIGE ANZEIGE — TEXT UND BILD AUS EINEM GUSS (Owner 10.09.2026:
 * „Er generiert eine Werbung-Hook aber textlich. Leonardo generiert ein schönes Bild aber ohne
 * Inhalt … bei uns ist das Bild schlecht aber der Spruch gut").
 *
 * ── WAS LEONARDO BESSER MACHT, UND ES IST NICHT DAS MODELL ────────────────────────────────
 *
 * Dasselbe Bildmodell liefert dort eine Zahnarzt-Anzeige mit Überschrift, drei Vorteilen mit
 * Symbolen, Produktdetail, Logo und Fussleiste. Der Unterschied ist der AUFTRAG: Dort steht
 * jedes Element mit Wortlaut und Platz drin. Bei uns bekam das Motiv zwei Zeilen („Photograph
 * for … no text"), und der Satz wurde danach auf Weiss gesetzt. Wir hatten den Inhalt, Leonardo
 * hatte das Layout — keiner hatte beides.
 *
 * ── WARUM DIESE DATEI ETWAS ANDERES TUT ALS `versusforge-motiv.ts` ────────────────────────
 *
 * Das Motiv ist ABSICHTLICH schriftlos, weil darunter `hookBild` den Satz setzt. Das bleibt
 * richtig für die Schriftkachel. Hier dagegen schreibt das Modell den Text SELBST ins Bild —
 * das ist der einzige Weg zu einer Anzeige, in der Schrift und Motiv zusammen gestaltet sind.
 * Der Preis dafür: Das Modell kann sich verschreiben. Deshalb prüft `versusforge-anzeige.ts`
 * jedes Bild nach, bevor es jemand sieht.
 *
 * KEIN SERVERKRAM HIER DRIN: nur Typen und Zeichenketten. So lässt sich der Auftrag ohne
 * Schlüssel und ohne Geld prüfen, und ein Browser-Baustein darf ihn als Vorschau importieren.
 */

/** Was die Anzeige an Text trägt. Jedes Feld steht wörtlich im Bild — nichts wird umformuliert. */
export type AnzeigeTexte = {
  /** Der Hook aus dem Plan, unverändert. Er ist das, was wir besser können als Leonardo. */
  headline: string;
  /** Die Meta-Überschrift aus dem Plan (höchstens 40 Zeichen). Leer erlaubt. */
  subline: string;
  /** Höchstens drei kurze Vorteile — NUR aus seinen Hebeln, nie erfunden. Leer erlaubt. */
  vorteile: string[];
  /** Der Knopftext unten, in seiner Sprache. */
  aufruf: string;
  /** Sein Betriebsname. Leer erlaubt. */
  marke: string;
};

/** Wie die Anzeige aussieht. Englisch, weil Bildmodelle darauf am zuverlässigsten sind. */
export type AnzeigeGestaltung = {
  /** Wo was sitzt, in einem Satz — etwa „text block left, main visual right". */
  layout: string;
  /** Das Hauptmotiv als Szene. */
  hauptmotiv: string;
  /** Ein zweites, kleines Bild — Produkt, Detail, Handgriff. Leer erlaubt. */
  detail: string;
  /** Bildstil in wenigen Wörtern. */
  stil: string;
  /** Zwei bis vier Hex-Farben, die erste trägt die Schrift. */
  farben: string[];
  /** Je Vorteil ein Symbol, gleiche Reihenfolge wie `vorteile`. */
  icons: string[];
};

export type AnzeigeBrief = {
  sprache: string;
  texte: AnzeigeTexte;
  gestaltung: AnzeigeGestaltung;
  /**
   * DÜRFEN MENSCHEN INS BILD? Vorgabe NEIN — dieselbe Hausregel wie beim Motiv: Ein fremdes,
   * erkennbares Gesicht in SEINER Anzeige wäre sein Problem. Leonardos lächelnde Frau ist
   * allerdings ein grosser Teil der Wirkung; ob wir das erlauben, entscheidet der Owner.
   */
  gesichter: boolean;
};

/** Knopftext, falls der Plan keinen liefert — in seiner Sprache, nie ein deutscher Rest. */
export const AUFRUF_STANDARD: Record<string, string> = {
  de: "Jetzt anfragen", en: "Get in touch", ro: "Cere ofertă",
};

/** Was ein Anführungszeichen im Text anrichtet: Es beendet den Wortlaut im Auftrag zu früh. */
const zitat = (t: string) => `"${String(t ?? "").replace(/"/g, "'").trim()}"`;

/**
 * Baut den Bildauftrag. Fester Aufbau, damit jede Anzeige dieselbe Sorgfalt bekommt — die
 * Freiheit steckt in den Feldern, nicht in der Form.
 *
 * DIE REIHENFOLGE IST ABSICHT: erst Format und Ränder, dann der Wortlaut, dann das Bild. Was
 * früh im Auftrag steht, hält das Modell zuverlässiger ein — und falsch geschriebene Wörter
 * sind der teuerste Fehler, ein etwas anderes Licht der billigste.
 */
export function anzeigePrompt(b: AnzeigeBrief): string {
  const t = b.texte;
  const g = b.gestaltung;
  const farben = g.farben.length ? g.farben.join(", ") : "#14181c, #ffffff, #1d6fd0";

  const vorteile = t.vorteile.map((v, i) =>
    `  ${i + 1}. ${zitat(v)}${g.icons[i] ? ` — with a simple thin line icon: ${g.icons[i]}` : ""}`,
  );

  return [
    "A professional, high-end social media advertisement, portrait format.",
    "Leave generous margins: no text, button or logo may touch or be cut off by any edge of the image.",
    `Layout: ${g.layout}.`,
    "",
    `TEXT — render EXACTLY these words, letter for letter, in ${b.sprache === "de" ? "German" : b.sprache === "ro" ? "Romanian" : "English"}, including all accents and umlauts. Do NOT add, translate, shorten or change any word. No other text anywhere in the image:`,
    `- Headline, large, bold sans-serif, color ${g.farben[0] ?? "#14181c"}: ${zitat(t.headline)}`,
    t.subline ? `- Subline, below the headline, lighter weight: ${zitat(t.subline)}` : null,
    /* KEINE VERSALIEN: Aus „ß" würde „SS", und der Korrektor zählte das zu Recht als Fehler. */
    vorteile.length ? `- Benefit rows, small medium-weight labels, each with its icon:\n${vorteile.join("\n")}` : null,
    t.marke ? `- Brand name, small and elegant, near the bottom: ${zitat(t.marke)}` : null,
    t.aufruf ? `- Call-to-action button with the text: ${zitat(t.aufruf)}` : null,
    "",
    `Main visual: ${g.hauptmotiv}.`,
    g.detail ? `Small inset image with rounded corners: ${g.detail}.` : null,
    `Style: ${g.stil}. Color palette: ${farben}.`,
    b.gesichter
      ? "People may appear, natural and authentic, not stock-photo posing."
      /* KEINE SCHWEBENDEN ARME (10.09.2026, zweiter Lauf): „Keine Gesichter" allein führte zu
         zwei Armen, die ohne Körper aus der Wand kamen. Wer ins Bild ragt, wird vom Rand
         angeschnitten — so, wie ein Fotograf es tun würde. */
      : "No recognisable faces, no people looking at the camera. If a person appears, frame them naturally so the body is cut off by the image edge — never disembodied arms or hands floating in the scene.",
    "Crisp, perfectly legible typography with generous spacing. Clean hierarchy: headline first, then visual, then details. No watermarks, no fake logos, no seals or certificates.",
  ].filter(z => z !== null).join("\n").replace(/\n{3,}/g, "\n\n");
}

/** Alle Texte, die im fertigen Bild wörtlich stehen müssen — für die Nachprüfung. */
export function sollTexte(t: AnzeigeTexte): string[] {
  return [t.headline, t.subline, ...t.vorteile, t.marke, t.aufruf].map(s => s.trim()).filter(Boolean);
}
