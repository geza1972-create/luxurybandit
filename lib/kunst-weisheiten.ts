/**
 * ALTE WEISHEITEN ALS ANALOGIE FÜR SPRÜCHE (Owner 11.09.2026: „es gibt so viele klevere Weisheiten auf dieser Erde, warum
 * nutzen wir sie nicht? Machen Analogien?" · „ja wohl").
 *
 * WARUM ES WIRKT: Ihr Lieblingssatz „Dieses Blau entsteht kein zweites Mal" ist im Kern Heraklit („Man steigt nicht zweimal
 * in denselben Fluss"). Der Leser erkennt eine alte Wahrheit wieder, auf genau dieses Bild gebogen — klug, ohne zu erklären.
 *
 * WARUM ES SKALIERT: Weisheiten gibt es zu jedem Motiv. Der Agent bekommt nur die, die zu den Themen SEINER Bilder passen
 * (aus der Bildanalyse), und davon eine wechselnde Auswahl — so bekommt nicht jeder Künstler denselben Heraklit.
 *
 * WAS HIER STEHEN DARF: nur Sprichwörter und Sätze aus alter, freier Überlieferung (Antike, alte Schriften, Volksmund).
 * Keine modernen Zitate, keine Übersetzungen, die jemandem gehören, keine Sätze mit zweifelhafter Zuschreibung.
 * Der Agent nennt die Quelle nie und zitiert nie wörtlich — er biegt den Gedanken auf das Bild.
 */

type Weisheit = { ro: string; de: string; en: string };

type Thema = {
  /** Woran das Thema in der Bildanalyse erkannt wird — Wortanfänge auf Englisch, Deutsch und Rumänisch. */
  woerter: RegExp;
  weisheiten: Weisheit[];
};

const THEMEN: Record<string, Thema> = {
  wasser: {
    woerter: /(water|sea|ocean|river|lake|pool|wave|shore|beach|wasser|meer|fluss|see\b|welle|strand|ufer|apă|apa\b|mare\b|râu|lac\b|piscin|val\b|plaj|țărm)/i,
    weisheiten: [
      /* Heraklit */
      { ro: "Nu poți intra de două ori în același râu.", de: "Man steigt nicht zweimal in denselben Fluss.", en: "No one steps into the same river twice." },
      /* Rumänisches Sprichwort */
      { ro: "Apa trece, pietrele rămân.", de: "Das Wasser fließt vorbei, die Steine bleiben.", en: "The water passes, the stones remain." },
      /* Laozi, Tao te king 78 */
      { ro: "Nimic nu e mai moale decât apa, și totuși nimic nu învinge mai bine ce e tare.", de: "Nichts ist weicher als Wasser, und doch bezwingt nichts besser das Harte.", en: "Nothing is softer than water, yet nothing is better at overcoming the hard." },
      /* Volksmund */
      { ro: "Apele liniștite sunt adânci.", de: "Stille Wasser sind tief.", en: "Still waters run deep." },
    ],
  },
  zeit: {
    woerter: /(summer|winter|autumn|spring|season|evening|night|morning|clock|old|ruin|sommer|winter|herbst|frühling|abend|nacht|morgen|uhr|alt\b|vară|iarnă|toamn|primăvar|seară|noapte|dimineaț|ceas|vechi)/i,
    weisheiten: [
      /* Kohelet 3,1 */
      { ro: "Toate își au vremea lor.", de: "Alles hat seine Zeit.", en: "To everything there is a season." },
      /* Heraklit */
      { ro: "Totul curge.", de: "Alles fließt.", en: "Everything flows." },
      /* Aristoteles */
      { ro: "O rândunică nu aduce primăvara.", de: "Eine Schwalbe macht noch keinen Sommer.", en: "One swallow does not make a summer." },
    ],
  },
  licht: {
    woerter: /(light|sun|sunset|sunrise|shadow|glow|bright|dark|licht|sonne|schatten|leucht|hell|dunkel|lumin|soare|apus|răsărit|umbr|întuneric)/i,
    weisheiten: [
      /* Goethe, Götz von Berlichingen (1773) */
      { ro: "Unde e multă lumină, umbra e mai adâncă.", de: "Wo viel Licht ist, ist starker Schatten.", en: "Where there is much light, the shadow is deepest." },
      /* Volksmund */
      { ro: "După ploaie vine și soare.", de: "Auf Regen folgt Sonnenschein.", en: "After rain comes sunshine." },
    ],
  },
  stille: {
    woerter: /(silence|quiet|calm|still|empty|alone|lonely|stille|ruhe|ruhig|leer|allein|einsam|liniște|liniștit|calm|gol\b|singur)/i,
    weisheiten: [
      /* Volksmund */
      { ro: "Vorba e de argint, tăcerea e de aur.", de: "Reden ist Silber, Schweigen ist Gold.", en: "Speech is silver, silence is golden." },
      /* Laozi, Tao te king 56 */
      { ro: "Cine știe nu vorbește; cine vorbește nu știe.", de: "Wer weiß, redet nicht; wer redet, weiß nicht.", en: "Those who know do not speak; those who speak do not know." },
    ],
  },
  weg: {
    woerter: /(path|road|stair|ladder|step|bridge|door|gate|journey|boat|weg\b|straße|treppe|leiter|stufe|brücke|tür|tor\b|reise|boot|drum|scar|treapt|pod\b|ușă|poart|călător|barc)/i,
    weisheiten: [
      /* Laozi, Tao te king 64 */
      { ro: "O călătorie de o mie de mile începe cu un singur pas.", de: "Eine Reise von tausend Meilen beginnt mit dem ersten Schritt.", en: "A journey of a thousand miles begins with a single step." },
      /* Volksmund */
      { ro: "Orice început e greu.", de: "Aller Anfang ist schwer.", en: "All beginnings are hard." },
    ],
  },
  zuhause: {
    woerter: /(house|home|room|interior|window|table|chair|kitchen|haus|heim|zimmer|fenster|tisch|stuhl|küche|casă|casa\b|cameră|interior|fereastr|masă|scaun|bucătăr)/i,
    weisheiten: [
      /* Volksmund */
      { ro: "Casa nu-i făcută din ziduri, ci din oamenii dinăuntru.", de: "Ein Haus sind nicht die Wände, sondern die Menschen darin.", en: "A house is not its walls but the people inside." },
      { ro: "Nicăieri nu e ca acasă.", de: "Nirgends ist es wie daheim.", en: "There is no place like home." },
    ],
  },
  mensch: {
    woerter: /(portrait|face|figure|woman|man\b|girl|boy|eyes|person|people|nude|porträt|gesicht|figur|frau|mann|mädchen|junge|augen|mensch|akt\b|portret|chip\b|figur|femeie|bărbat|fată|băiat|ochi|oameni|nud)/i,
    weisheiten: [
      /* Volksmund */
      { ro: "Ochii sunt oglinda sufletului.", de: "Die Augen sind der Spiegel der Seele.", en: "The eyes are the mirror of the soul." },
      /* Delphi */
      { ro: "Cunoaște-te pe tine însuți.", de: "Erkenne dich selbst.", en: "Know thyself." },
      /* 1. Korinther 13,8 */
      { ro: "Dragostea nu piere niciodată.", de: "Die Liebe hört niemals auf.", en: "Love never ends." },
    ],
  },
  natur: {
    woerter: /(flower|tree|garden|leaf|plant|bird|forest|field|mountain|cactus|blume|blüte|baum|garten|blatt|pflanze|vogel|wald|feld|berg|kaktus|floare|flori|copac|grădin|frunz|plant|pasăre|pădure|câmp|munte|cactus)/i,
    weisheiten: [
      /* Laozi, Tao te king 64 */
      { ro: "Copacul pe care nu-l poți cuprinde crește dintr-un lăstar mic.", de: "Der Baum, den man nicht umfassen kann, wächst aus einem winzigen Keim.", en: "The tree too wide to embrace grows from a tiny shoot." },
      /* Volksmund */
      { ro: "Ce semeni, aceea culegi.", de: "Was man sät, das erntet man.", en: "You reap what you sow." },
    ],
  },
  stadt: {
    woerter: /(city|street|building|town|roof|tower|stadt|straße|gebäude|dach|turm|oraș|stradă|clădire|acoperiș|turn\b)/i,
    weisheiten: [
      /* Volksmund */
      { ro: "Roma nu s-a construit într-o zi.", de: "Rom wurde nicht an einem Tag erbaut.", en: "Rome wasn't built in a day." },
    ],
  },
};

/** Passt zu JEDEM Bild — über Kunst, Schauen und Schönheit. */
const IMMER: Weisheit[] = [
  /* Hippokrates / Seneca */
  { ro: "Arta e lungă, viața e scurtă.", de: "Die Kunst ist lang, das Leben kurz.", en: "Art is long, life is short." },
  /* Volksmund */
  { ro: "Frumusețea e în ochii celui care privește.", de: "Die Schönheit liegt im Auge des Betrachters.", en: "Beauty is in the eye of the beholder." },
  { ro: "O imagine valorează cât o mie de cuvinte.", de: "Ein Bild sagt mehr als tausend Worte.", en: "A picture is worth a thousand words." },
];

/**
 * Die Weisheiten für seine Bilder, in der Sprache des Gesprächs: alle Themen, die die Bildanalyse trifft, dazu die
 * allgemeinen — daraus höchstens `anzahl`, zufällig gemischt, damit nicht jeder Künstler dieselben bekommt.
 */
export function weisheitenFuer(bildTexte: string[], sprache: string, anzahl = 5): string[] {
  const text = bildTexte.join(" ");
  const kurz = String(sprache ?? "en").slice(0, 2).toLowerCase();
  const feld = (w: Weisheit) => (kurz === "ro" ? w.ro : kurz === "de" ? w.de : w.en);
  const passend = Object.values(THEMEN).filter(t => t.woerter.test(text)).flatMap(t => t.weisheiten);
  const gemischt = (liste: Weisheit[]) => [...liste].sort(() => Math.random() - 0.5);
  /* Die passenden zuerst, die allgemeinen füllen auf. */
  const auswahl = [...gemischt(passend), ...gemischt(IMMER)].slice(0, anzahl);
  return [...new Set(auswahl.map(feld))];
}
