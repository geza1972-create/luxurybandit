import { frageModell, GROSS, str, strListe, verbrauchDazu, type Verbrauch } from "@/lib/agent-modell";
import { HOOK_REGELN } from "@/lib/versusforge-hook-rezept";

/**
 * DER ZWEITE BLICK AUF DEN HOOK (Owner 10.09.2026, vor dem fertigen Plakat von Atelier Insula:
 * „liess mal selbst das Plakat … Wie zum Henkel kam dieser Spruch aus unserem Agenten raus?"
 * · „Ein Druck ist nie was Echtes").
 *
 * ── WAS PASSIERT WAR ──────────────────────────────────────────────────────────────────────
 *
 * Der Plan schrieb für einen Maler, der Originale verkauft: „Drucke an der Wand – willst du
 * endlich etwas Echtes?". Gross auf einem Plakat liest man die ersten Wörter — und die bewarben
 * genau das, was er NICHT verkauft. Das Material für einen guten Satz lag daneben: vier bis
 * sechs Bilder im Jahr, 22 Jahre, Timișoara, jedes ein Unikat. Nichts davon kam vor.
 *
 * WARUM ES DURCHKAM: Dasselbe Modell schrieb den Satz UND seine Begründung („trifft exakt ihr
 * unausgesprochenes Ziel"). Wer sich selbst bewertet, besteht immer. Es fehlte ein Leser, der
 * den Satz nicht geschrieben hat.
 *
 * ── WAS DER PRÜFER FRAGT ──────────────────────────────────────────────────────────────────
 *
 * Er liest wie ein Fremder beim Scrollen, und er schreibt ERST auf, was er sieht, und DANN
 * sein Urteil — sonst begründet er nachträglich ein Ja:
 *   1. Was glaubt man nach den ersten vier Wörtern, worum es geht? Widerspricht das dem Angebot?
 *   2. Welcher Fakt aus SEINEN Angaben steckt im Satz? (Der Code prüft nach, dass er wirklich
 *      drinsteht — ein Modell, das einen Fakt „findet", der nicht dasteht, zählt nicht.)
 *   3. Könnte ein anderer Betrieb derselben Branche den Satz unverändert benutzen?
 *   4. Spricht er den Leser an — oder das Produkt?
 *   5. Wie klar ist er in zwei Sekunden? Daran wird unter mehreren guten Sätzen ausgewählt.
 *
 * Länge und Anrede prüft der Code selbst: Dafür braucht es kein Modell (Skill `agenten`, §2).
 *
 * ── DAS GROSSE MODELL PRÜFT, UND DER KLARSTE GEWINNT (Owner 10.09.2026: „ja") ──────────────
 *
 * Im ersten Prüflauf urteilte das kleine Modell über denselben Satz zweimal verschieden — einmal
 * „austauschbar", einmal „spricht über das Produkt". Ein Prüfer, der würfelt, ist keiner.
 *
 * Und es nahm den ERSTEN bestandenen Kandidaten: „Vier bis sechs im Jahr. Reichen Ihnen
 * Serienbilder wirklich noch?" — auf einem Plakat fragt man sich, vier bis sechs WAS. Der zweite
 * bestandene war klarer. Jetzt entscheidet die Klarheit, nicht die Reihenfolge.
 *
 * ── WAS ES KOSTET ─────────────────────────────────────────────────────────────────────────
 *
 * Ein Aufruf des grossen Modells mit wenig Nachdenken nach jedem Plan. Fällt der Hook durch: ein
 * Neuschreiben und eine zweite Prüfung — danach ist Schluss, auch wenn keiner besteht. Der Plan
 * ist das, was der Kunde behält; ein Satz, der für die Konkurrenz wirbt, ist teurer.
 */

export type HookMaterial = {
  /** Der Befund aus dem Plan — daraus weiss der Prüfer, WAS verkauft wird. */
  befund?: string;
  hebel?: Record<string, string>;
  sprache?: string;
  /** Nur true, wenn der Betrieb seine Kunden selbst duzt (siehe HOOK_REGELN). */
  duzen?: boolean;
};

export type HookBefund = {
  hook: string;
  bestanden: boolean;
  /** Was ein Fremder nach den ersten vier Wörtern glaubt. */
  liestSichAls: string;
  /** Der Fakt aus seinen Angaben, der wirklich im Satz steht. Leer, wenn keiner. */
  fakt: string;
  /** 1 bis 5: wie sofort ein Fremder ihn versteht. 0, wenn nicht bewertet. */
  klarheit: number;
  /** Warum er durchfällt, je Grund ein kurzer Satz. Leer, wenn bestanden. */
  gruende: string[];
};

export type HookSicherung = {
  /** Der Hook, der in den Plan gehört — der alte, wenn er bestand oder nichts Besseres kam. */
  hook: string;
  ersetzt: boolean;
  /** false, wenn die Prüfung selbst nicht lief. Dann bleibt der alte Hook, ungeprüft. */
  geprueft: boolean;
  befunde: HookBefund[];
  verbrauch: Verbrauch;
};

const LEER: Verbrauch = { hinein: 0, heraus: 0, aufrufe: 0 };

/** Duz-Formen, die in einem gesiezten Hook nichts verloren haben. */
const DUZT = /\b(du|dich|dir|dein\w*|willst|kannst|musst|bist)\b/i;

/** Ab hier gilt ein Satz auf dem Plakat als unklar — auch wenn sonst alles stimmt. */
const KLARHEIT_MIN = 3;

const woerter = (t: string) => t.trim().split(/\s+/).filter(Boolean);
const flach = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * STEHT DER FAKT WIRKLICH IM SATZ? Mindestens ein tragendes Wort (vier Buchstaben und mehr,
 * oder eine Zahl) muss im Hook vorkommen. Grob — aber es fängt den Prüfer, der sich einen
 * Fakt dazudenkt, und das ist genau die Selbsttäuschung, gegen die er gebaut ist.
 */
function stecktDrin(fakt: string, hook: string): boolean {
  const h = flach(hook);
  return flach(fakt).split(/[^a-z0-9]+/).some(w => (w.length >= 4 || /^\d+$/.test(w)) && h.includes(w.slice(0, Math.max(4, w.length - 2))));
}

/** Was der Code ohne Modell sieht. */
function lokaleGruende(hook: string, m: HookMaterial): string[] {
  const g: string[] = [];
  if (woerter(hook).length > 12) g.push(`Zu lang: ${woerter(hook).length} Wörter, höchstens 12.`);
  if ((m.sprache ?? "de").startsWith("de") && !m.duzen && DUZT.test(hook)) g.push("Duzt den Leser, obwohl die Anzeige siezen muss.");
  return g;
}

function hebelZeilen(m: HookMaterial): string[] {
  return Object.entries(m.hebel ?? {}).map(([k, s]) => [k, str(s, 300)]).filter(([, s]) => s).map(([k, s]) => `  · ${k}: ${s}`);
}

export async function hooksPruefen(o: { apiKey: string; hooks: string[]; material: HookMaterial }): Promise<{ ok: true; befunde: HookBefund[]; verbrauch: Verbrauch } | { ok: false; fehler: string }> {
  const hooks = o.hooks.map(h => str(h, 200)).filter(Boolean).slice(0, 6);
  if (!hooks.length) return { ok: false, fehler: "Kein Hook." };
  const fakten = hebelZeilen(o.material);

  const auftrag = [
    "Du bist ein fremder Mensch, der beim Scrollen eine Anzeige sieht. Du hast diese Sätze nicht geschrieben, und du bist nicht höflich.",
    "",
    `WAS DER BETRIEB WIRKLICH VERKAUFT: ${str(o.material.befund, 700) || "unbekannt"}`,
    fakten.length ? `WAS ER ÜBER SEIN ANGEBOT GESAGT HAT:\n${fakten.join("\n")}` : "Über sein Angebot gibt es keine weiteren Angaben.",
    "",
    "Prüfe jeden dieser Sätze einzeln und unabhängig voneinander:",
    ...hooks.map((h, i) => `  ${i + 1}. ${h}`),
    "",
    "Je Satz, IN DIESER REIHENFOLGE (erst beobachten, dann urteilen):",
    "'liestSichAls' — Lies NUR die ersten vier Wörter, als stünden sie gross auf einem Plakat. Was glaubst du, worum es geht oder was hier angeboten wird? Ein kurzer Satz.",
    "'widerspruch' — true, wenn jemand, der nur diese ersten Wörter liest, das FALSCHE im Kopf behält: etwas, das der Betrieb gerade nicht verkauft, die Konkurrenz oder das Gegenteil seines Angebots. Ein Zustand des Lesers als Einstieg ist KEIN Widerspruch (etwa 'Sie kauen links' beim Zahnarzt). Ein Konkurrenzprodukt als nackte Überschrift schon (etwa 'Billige Kronen aus dem Ausland' bei einem Zahnarzt, der Qualität verkauft).",
    "'fakt' — der konkrete Fakt aus SEINEN Angaben oben, der WÖRTLICH oder fast wörtlich im Satz steht (Zahl, Ort, Jahre, Verfahren, Menge). Leer, wenn keiner drinsteht. Allgemeine Wörter wie 'echt', 'Qualität', 'besonders' sind KEIN Fakt.",
    "'austauschbar' — true, wenn ein anderer Betrieb derselben Branche den Satz unverändert in seine Anzeige schreiben könnte.",
    "'leser' — true, wenn der Satz den Leser oder seine Lage anspricht (ein 'Sie', 'Ihnen', 'Ihr' oder eine Lage, in der er sich erkennt, genügt); false nur, wenn er ausschliesslich über das Produkt oder die Firma spricht.",
    "'klarheit' — ganze Zahl 1 bis 5: Versteht ein Fremder in zwei Sekunden, worum es geht und warum es IHN betrifft? 5 = sofort und eindeutig. Unvollständige Angaben kosten Punkte (etwa 'Seit 1998 dreimal' — dreimal WAS?), ebenso Rätsel, Wortspiele und Sätze, die man zweimal lesen muss.",
    "'urteil' — ein Satz: was an diesem Satz das grösste Problem ist, oder leer, wenn er gut ist.",
    'Antworte NUR als JSON: {"hooks":[{"liestSichAls":"...","widerspruch":false,"fakt":"...","austauschbar":false,"leser":true,"klarheit":3,"urteil":"..."}]}',
  ].join("\n");

  const r = await frageModell(o.apiKey, GROSS, [{ type: "input_text", text: auftrag }], "low");
  if (!r.ok) return { ok: false, fehler: r.fehler };

  const roh = Array.isArray(r.daten.hooks) ? (r.daten.hooks as Record<string, unknown>[]) : [];
  const befunde = hooks.map((hook, i): HookBefund => {
    const b = roh[i] ?? {};
    const gruende = lokaleGruende(hook, o.material);
    const fakt = str(b.fakt, 200);
    const faktEcht = Boolean(fakt) && stecktDrin(fakt, hook);
    const klarheit = Math.max(0, Math.min(5, Math.round(Number(b.klarheit) || 0)));
    /* Ohne Antwort zum Satz gilt er als NICHT geprüft, also nicht bestanden. */
    if (!roh[i]) gruende.push("Die Prüfung hat zu diesem Satz nichts zurückgegeben.");
    if (b.widerspruch === true) gruende.push(`Der Anfang führt in die falsche Richtung: „${str(b.liestSichAls, 200)}".`);
    if (fakten.length && !faktEcht) gruende.push("Kein konkreter Fakt aus seinen Angaben im Satz.");
    /* EIN ECHTER FAKT SCHLIESST „AUSTAUSCHBAR" AUS (10.09.2026, erster Prüflauf): Das Modell
       nannte „Vier bis sechs Bilder im Jahr …" austauschbar — im selben Atemzug, in dem es genau
       diese Menge als seinen Fakt fand. Kein anderes Atelier kann den Satz so schreiben. */
    if (b.austauschbar === true && !faktEcht) gruende.push("Austauschbar — jeder Betrieb der Branche könnte ihn schreiben.");
    if (b.leser === false) gruende.push("Spricht über das Produkt, nicht über den Leser.");
    if (klarheit && klarheit < KLARHEIT_MIN) gruende.push(`Auf dem Plakat unklar (Klarheit ${klarheit} von 5).`);
    const urteil = str(b.urteil, 240);
    if (gruende.length && urteil) gruende.push(urteil);
    return { hook, bestanden: !gruende.length, liestSichAls: str(b.liestSichAls, 200), fakt: faktEcht ? fakt : "", klarheit, gruende };
  });
  return { ok: true, befunde, verbrauch: r.verbrauch };
}

/** Neue Kandidaten, gebaut aus den Gründen, an denen der alte gescheitert ist. */
async function hooksNeu(o: { apiKey: string; alt: HookBefund; material: HookMaterial }): Promise<{ hooks: string[]; verbrauch?: Verbrauch }> {
  const fakten = hebelZeilen(o.material);
  const auftrag = [
    "Du schreibst den Hook für eine Anzeige neu. Der bisherige ist bei einer Prüfung durchgefallen.",
    `DER BISHERIGE: ${o.alt.hook}`,
    `WARUM ER DURCHFIEL:\n${o.alt.gruende.map(g => `  · ${g}`).join("\n")}`,
    "",
    `WAS DER BETRIEB VERKAUFT: ${str(o.material.befund, 700)}`,
    fakten.length ? `SEINE ANGABEN:\n${fakten.join("\n")}` : "",
    "",
    `REGELN: ${HOOK_REGELN}`,
    "ZUSÄTZLICH: Die ersten vier Wörter allein, gross auf einem Plakat, müssen schon zu seinem Angebot passen — nie das nennen, was er NICHT verkauft. Jeder Satz trägt mindestens einen konkreten Fakt aus seinen Angaben (Zahl, Ort, Jahre, Menge), wörtlich und vollständig — eine Zahl steht nie ohne das, was gezählt wird. Nichts erfinden.",
    "Schreib 3 Kandidaten mit drei VERSCHIEDENEN Satzformen.",
    (o.material.sprache ?? "de").startsWith("de") && !o.material.duzen ? "Sieze den Leser." : "",
    `Sprache: ${o.material.sprache ?? "de"}.`,
    'Antworte NUR als JSON: {"hooks":["...","...","..."]}',
  ].filter(Boolean).join("\n");

  const r = await frageModell(o.apiKey, GROSS, [{ type: "input_text", text: auftrag }], "low");
  if (!r.ok) return { hooks: [] };
  return { hooks: strListe(r.daten.hooks, 3, 200), verbrauch: r.verbrauch };
}

/**
 * Prüft den Hook aus dem Plan und ersetzt ihn, wenn er durchfällt und ein besserer besteht.
 *
 * UNTER DEN BESTANDENEN GEWINNT DER KLARSTE; bei Gleichstand der, den das Modell zuerst
 * geschrieben hat. FÄLLT ALLES DURCH, BLEIBT DER ALTE — mit seinen Befunden. Ein Kandidat, der
 * ebenfalls durchfiel, ist keine Verbesserung, sondern ein anderer Fehler.
 */
export async function hookSichern(o: { apiKey: string; hook: string; material: HookMaterial }): Promise<HookSicherung> {
  const hook = str(o.hook, 200);
  const erst = await hooksPruefen({ apiKey: o.apiKey, hooks: [hook], material: o.material });
  if (!erst.ok) return { hook, ersetzt: false, geprueft: false, befunde: [], verbrauch: LEER };

  let verbrauch = erst.verbrauch;
  const alt = erst.befunde[0];
  if (alt.bestanden) return { hook, ersetzt: false, geprueft: true, befunde: [alt], verbrauch };

  const neu = await hooksNeu({ apiKey: o.apiKey, alt, material: o.material });
  if (neu.verbrauch) verbrauch = verbrauchDazu(verbrauch, neu.verbrauch);
  if (!neu.hooks.length) return { hook, ersetzt: false, geprueft: true, befunde: [alt], verbrauch };

  const zweit = await hooksPruefen({ apiKey: o.apiKey, hooks: neu.hooks, material: o.material });
  if (!zweit.ok) return { hook, ersetzt: false, geprueft: true, befunde: [alt], verbrauch };
  verbrauch = verbrauchDazu(verbrauch, zweit.verbrauch);

  const gut = zweit.befunde.filter(b => b.bestanden).sort((a, b) => b.klarheit - a.klarheit)[0];
  return gut
    ? { hook: gut.hook, ersetzt: true, geprueft: true, befunde: [alt, ...zweit.befunde], verbrauch }
    : { hook, ersetzt: false, geprueft: true, befunde: [alt, ...zweit.befunde], verbrauch };
}
