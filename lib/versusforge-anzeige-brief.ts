import { frageModell, KLEIN, str, strListe, type Verbrauch } from "@/lib/agent-modell";
import { AUFRUF_STANDARD, type AnzeigeBrief } from "@/lib/versusforge-anzeige-prompt";

/**
 * DER ART DIRECTOR — DER SCHRITT ZWISCHEN SPRUCH UND BILD (Owner 10.09.2026: „bei uns ist das
 * Bild schlecht aber der Spruch gut").
 *
 * ── WAS ER DARF UND WAS NICHT ─────────────────────────────────────────────────────────────
 *
 * ER ENTSCHEIDET, WIE ES AUSSIEHT: Layout, Szene, Detailbild, Stil, Farben, Symbole.
 *
 * ER SCHREIBT KEINE WERBUNG. Hook, Überschrift und Knopf kommen UNVERÄNDERT aus dem Plan —
 * das ist der Teil, der bei uns schon gut ist, und ein zweites Modell, das ihn „noch etwas
 * schärfer" macht, macht ihn schlechter. Deshalb setzt der CODE diese Felder, nicht das Modell.
 *
 * DIE EINZIGE TEXTARBEIT: Aus seinen Hebeln drei Vorteile von höchstens vier Wörtern machen.
 * Kürzen, nicht erfinden — ein leerer Hebel ergibt keinen Vorteil (dieselbe Regel wie im Plan:
 * „leer bleibt leer").
 *
 * DAS KLEINE MODELL REICHT: Es übersetzt Material, das schon dasteht, in eine Bildbeschreibung.
 * Das grosse Nachdenken hat der Plan schon bezahlt.
 */

/** Was der Plan an die Anzeige abgibt. Bewusst locker getippt: gespeicherte Pläne sind älter als diese Datei. */
export type PlanFuerAnzeige = {
  hook?: string;
  befund?: string;
  zielgruppe?: string[];
  hebel?: Record<string, string>;
  motive?: { idee?: string; text?: string }[];
  anzeige?: { ueberschrift?: string; knopf?: string };
};

export type BriefFund =
  | { ok: true; brief: AnzeigeBrief; verbrauch: Verbrauch }
  | { ok: false; fehler: string };

const HEX = /^#[0-9a-f]{6}$/i;
const WOERTER_MAX = 4;

export async function briefBauen(o: {
  apiKey: string;
  plan: PlanFuerAnzeige;
  /** Was er anbietet, in SEINEN Worten. */
  fach: string;
  marke?: string;
  sprache?: string;
  /** Vorgabe false — siehe `AnzeigeBrief.gesichter`. */
  gesichter?: boolean;
}): Promise<BriefFund> {
  const hook = str(o.plan.hook, 200);
  if (!hook) return { ok: false, fehler: "Ohne Hook keine Anzeige." };
  const sprache = str(o.sprache || "de", 2).toLowerCase();
  const hebel = Object.entries(o.plan.hebel ?? {}).filter(([, s]) => str(s));

  const auftrag = [
    "Du bist Art Director einer Werbeagentur. Du gestaltest EINE Social-Media-Anzeige (Hochformat) für diesen Betrieb.",
    "Der Werbetext steht schon fest und ist gut. Du schreibst ihn NICHT um. Deine Aufgabe ist, wie die Anzeige AUSSIEHT.",
    "",
    `Betrieb: ${str(o.fach, 300)}`,
    o.marke ? `Name: ${str(o.marke, 60)}` : "",
    `Hook (steht gross im Bild): ${hook}`,
    o.plan.anzeige?.ueberschrift ? `Unterzeile: ${str(o.plan.anzeige.ueberschrift, 40)}` : "",
    o.plan.befund ? `Lage: ${str(o.plan.befund, 600)}` : "",
    o.plan.zielgruppe?.length ? `Zielgruppe: ${strListe(o.plan.zielgruppe, 5, 200).join(" · ")}` : "",
    (o.plan.motive ?? []).length ? `Bildideen aus dem Plan: ${(o.plan.motive ?? []).map(m => str(m.idee, 300)).filter(Boolean).join(" · ")}` : "",
    hebel.length
      ? `Was er über sein Angebot gesagt hat:\n${hebel.map(([k, s]) => `  · ${k}: ${str(s, 300)}`).join("\n")}`
      : "Über sein Angebot hat er nichts Belastbares gesagt.",
    "",
    "Gib zurück:",
    `'vorteile' — bis zu 3 Vorteile für die Anzeige, je HÖCHSTENS ${WOERTER_MAX} Wörter, in der Sprache '${sprache}'. NUR aus dem, was er oben gesagt hat — gekürzt, nicht erfunden. Keine Zahl, die er nicht genannt hat. Keine Werbefloskeln wie modern, hochwertig, professionell. Gibt das Material keine drei her, gib weniger; gibt es nichts her, eine leere Liste.`,
    "'icons' — je Vorteil ein einfaches Symbol, auf Englisch, 1 bis 3 Wörter (z.B. 'tooth', 'shield', 'calendar'). Gleiche Reihenfolge.",
    "'layout' — auf Englisch, ein Satz: wo Textblock, Hauptmotiv, Detailbild und Knopf sitzen. Der Text braucht eine ruhige Fläche, er darf nicht auf unruhigem Bild liegen.",
    "'hauptmotiv' — auf Englisch, 1 bis 2 Sätze: die Szene, die SEIN Angebot zeigt und zum Hook passt. Konkret: Ort, Licht, Gegenstand. Kein generisches Stockfoto.",
    "'detail' — auf Englisch, ein Satz: ein kleines zweites Bild (Produkt, Werkstück, Handgriff), das beweist, was er macht. Leer, wenn nichts passt.",
    "'stil' — auf Englisch, 3 bis 6 Wörter.",
    "'farben' — 2 bis 4 Hex-Farben, die zu seiner Branche passen. Die erste ist die Schriftfarbe und muss auf dem Hintergrund gut lesbar sein. Kein Schwarz-Gold — das ist UNSERE Handschrift, nicht seine.",
    o.gesichter ? "" : "Das Hauptmotiv zeigt KEINE erkennbaren Gesichter: Hände, Rücken, Gegenstände, Räume.",
    'Antworte NUR als JSON: {"vorteile":["..."],"icons":["..."],"layout":"...","hauptmotiv":"...","detail":"...","stil":"...","farben":["#..."]}',
  ].filter(Boolean).join("\n");

  const r = await frageModell(o.apiKey, KLEIN, [{ type: "input_text", text: auftrag }], "low");
  if (!r.ok) return { ok: false, fehler: r.fehler };

  /* HART BESCHNITTEN, NICHT NUR ERBETEN: Ein Vorteil mit sieben Wörtern wird im Bild zu
     Kleingedrucktem — und Kleingedrucktes ist genau das, woran sich Bildmodelle verschreiben. */
  const vorteile = strListe(r.daten.vorteile, 3, 60)
    .filter(v => v.split(/\s+/).length <= WOERTER_MAX + 1)
    .slice(0, hebel.length ? 3 : 0);

  const brief: AnzeigeBrief = {
    sprache,
    gesichter: Boolean(o.gesichter),
    texte: {
      headline: hook,
      subline: str(o.plan.anzeige?.ueberschrift, 40),
      vorteile,
      aufruf: str(o.plan.anzeige?.knopf, 30) || AUFRUF_STANDARD[sprache] || AUFRUF_STANDARD.de,
      marke: str(o.marke, 34),
    },
    gestaltung: {
      layout: str(r.daten.layout, 300) || "text block top left on a calm light area, main visual right, call-to-action button bottom left",
      hauptmotiv: str(r.daten.hauptmotiv, 400) || `a real, well-lit scene showing ${str(o.fach, 200)}`,
      detail: str(r.daten.detail, 300),
      stil: str(r.daten.stil, 80) || "clean, bright, premium, editorial photography",
      farben: strListe(r.daten.farben, 4, 7).filter(f => HEX.test(f)),
      icons: strListe(r.daten.icons, vorteile.length, 40),
    },
  };
  return { ok: true, brief, verbrauch: r.verbrauch };
}
