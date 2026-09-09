import PptxGenJS from "pptxgenjs";
import { folienAusPlan, type Folie, type FolienOptionen, type VersusForgePlan } from "@/lib/versusforge-folien";

/**
 * DIE ECHTE POWERPOINT (Owner 09.09.2026: „Es wird die PowerPoint Präsentation sein").
 *
 * WARUM .pptx UND NICHT NUR EIN PDF: Ein PDF kann man ansehen. Eine .pptx kann man
 * MITNEHMEN — in die eigene Besprechung, mit dem eigenen Logo, mit einer Folie mehr. Genau
 * das ist der Unterschied zwischen einem Ausdruck und einer Arbeitsgrundlage, und genau
 * dafür zahlt jemand. Das PDF daneben (`versusforge-deck-pdf.ts`) ist die Fassung, die auf
 * jedem Handy sofort aufgeht.
 *
 * MASSE IN ZOLL, NICHT IN PUNKTEN. pptxgenjs rechnet in Zoll; die Bühne ist 10 x 5.625
 * (16:9). Alle Werte hier sind deshalb Zoll — wer sie mit den Punktwerten des PDF-Renderers
 * vergleicht, multipliziert mit 72.
 *
 * KEIN GEMEINSAMER RENDERER MIT DEM PDF. Der Versuch, beide über eine Zeichen-Schnittstelle
 * zu legen, endet in einem kleinsten gemeinsamen Nenner, der auf beiden Seiten schlecht
 * aussieht. Gemeinsam ist der INHALT (`folienAusPlan`) — das ist die Stelle, an der die
 * Fassungen auseinanderlaufen könnten, und nur die.
 */

const GOLD = "F8B713";
const GRUND = "070A0C";
const FLAECHE = "0F1418";
const WEISS = "F6F7F8";
const GRAU = "9DA6AD";
const LINIE = "2A3036";

const SCHRIFT = "Arial";
const BUEHNE = { b: 10, h: 5.625 };
const RAND = 0.62;
const INNEN = BUEHNE.b - RAND * 2;

type Folienblatt = ReturnType<PptxGenJS["addSlide"]>;

export async function planAlsPptx(plan: VersusForgePlan, opt: FolienOptionen = {}): Promise<Buffer> {
  const p = new PptxGenJS();
  p.defineLayout({ name: "VF16x9", width: BUEHNE.b, height: BUEHNE.h });
  p.layout = "VF16x9";
  p.author = "VersusForge";
  p.company = "LuxuryBandit";
  p.title = "Deine Strategie";

  for (const folie of folienAusPlan(plan, opt)) zeichne(p, folie);

  /* `write` mit "nodebuffer" gibt den Dateiinhalt zurück, statt ihn zu speichern — der
     Anhang geht direkt in die Mail, es landet nichts auf der Platte. */
  return (await p.write({ outputType: "nodebuffer" })) as Buffer;
}

/* ═══ EINE FOLIE ═══════════════════════════════════════════════════════ */

function zeichne(p: PptxGenJS, folie: Folie) {
  const s = p.addSlide();
  s.background = { color: GRUND };

  if (folie.art === "deckblatt") return deckblatt(s, folie);

  wortmarke(s, RAND, 0.24, 11);
  if ("kicker" in folie && folie.kicker) {
    s.addText(folie.kicker.toUpperCase(), {
      x: RAND, y: 0.62, w: INNEN, h: 0.22,
      fontFace: SCHRIFT, fontSize: 9, bold: true, color: GOLD, charSpacing: 2.4,
    });
  }
  /* Die Foliennummer unten rechts — dasselbe Bild wie im PDF. */
  s.slideNumber ={ x: BUEHNE.b - RAND - 0.6, y: BUEHNE.h - 0.42, w: 0.6, h: 0.22, fontFace: SCHRIFT, fontSize: 8, color: "5C6469", align: "right" };

  switch (folie.art) {
    case "aussage": return aussage(s, folie);
    case "punkte": return punkte(s, folie);
    case "felder": return felder(s, folie);
    case "strecke": return strecke(s, folie);
    case "bauteile": return bauteile(s, folie);
    case "protokoll": return protokoll(s, folie);
    case "angebot": return angebot(s, folie);
    case "schluss": return schluss(s, folie);
  }
}

/** Versus WEISS · Forge GOLD · Punkt GOLD — als EIN Textkasten mit drei Läufen, damit die
    Wortmarke beim Verschieben in PowerPoint zusammenbleibt. */
function wortmarke(s: Folienblatt, x: number, y: number, groesse: number) {
  s.addText(
    [
      { text: "Versus", options: { color: WEISS, bold: true } },
      { text: "Forge", options: { color: GOLD, bold: true } },
      { text: ".", options: { color: GOLD, bold: true } },
    ],
    { x, y, w: 3, h: groesse / 40 + 0.16, fontFace: SCHRIFT, fontSize: groesse },
  );
}

function titelzeile(s: Folienblatt, text: string): number {
  const gr = text.length > 46 ? 20 : 25;
  const zeilen = Math.ceil(text.length / (gr > 22 ? 42 : 52));
  const h = Math.max(0.44, zeilen * (gr / 58));
  s.addText(text, {
    x: RAND, y: 0.92, w: INNEN, h,
    fontFace: SCHRIFT, fontSize: gr, bold: true, color: WEISS, valign: "top",
  });
  return 0.92 + h + 0.18;
}

function fussnote(s: Folienblatt, text: string) {
  s.addText(text, {
    x: RAND, y: BUEHNE.h - 0.62, w: INNEN, h: 0.36,
    fontFace: SCHRIFT, fontSize: 9, color: GRAU, valign: "bottom",
  });
}

/* ── DECKBLATT ────────────────────────────────────────────────────────── */
function deckblatt(s: Folienblatt, f: Extract<Folie, { art: "deckblatt" }>) {
  s.addShape("rect", { x: 0, y: 0, w: BUEHNE.b, h: 0.045, fill: { color: GOLD } });
  wortmarke(s, RAND, 0.42, 22);
  s.addText("STRATEGY WINS MORE THAN ADS.", {
    x: RAND, y: 0.95, w: INNEN, h: 0.2,
    fontFace: SCHRIFT, fontSize: 7.5, bold: true, color: "72787C", charSpacing: 3.4,
  });

  const zitat = `„${f.ziel.replace(/^["'„"]|["'""]$/g, "")}"`;
  s.addText(zitat, {
    x: RAND, y: 1.7, w: INNEN, h: 1.9,
    fontFace: SCHRIFT, fontSize: zitat.length > 70 ? 24 : 34, bold: true, color: WEISS, valign: "middle",
  });

  s.addShape("rect", { x: RAND, y: 4.34, w: 0.75, h: 0.032, fill: { color: GOLD } });
  s.addText("Deine Strategie", { x: RAND, y: 4.5, w: INNEN, h: 0.28, fontFace: SCHRIFT, fontSize: 13, bold: true, color: WEISS });
  s.addText(f.datum, { x: RAND, y: 4.78, w: INNEN, h: 0.26, fontFace: SCHRIFT, fontSize: 10, color: GRAU });
}

/* ── AUSSAGE ──────────────────────────────────────────────────────────── */
function aussage(s: Folienblatt, f: Extract<Folie, { art: "aussage" }>) {
  const gold = f.ton === "gold";
  const hoehe = f.fussnote ? 2.5 : 3.1;
  if (gold) s.addShape("rect", { x: RAND, y: 1.1, w: 0.042, h: hoehe, fill: { color: GOLD } });
  s.addText(f.text, {
    x: RAND + (gold ? 0.28 : 0), y: 1.1, w: INNEN - (gold ? 0.28 : 0), h: hoehe,
    fontFace: SCHRIFT, fontSize: gold ? (f.text.length > 90 ? 24 : 30) : (f.text.length > 260 ? 15 : 19),
    bold: true, color: gold ? GOLD : WEISS, valign: "top",
  });
  if (f.fussnote) fussnote(s, f.fussnote);
}

/* ── PUNKTE ───────────────────────────────────────────────────────────── */
function punkte(s: Folienblatt, f: Extract<Folie, { art: "punkte" }>) {
  const y = titelzeile(s, f.titel);
  s.addText(
    f.punkte.map(t => ({ text: t, options: { breakLine: true, bullet: { code: "25CF" } } })),
    {
      x: RAND, y, w: INNEN, h: BUEHNE.h - y - (f.fussnote ? 0.75 : 0.45),
      fontFace: SCHRIFT, fontSize: f.punkte.length > 4 ? 13 : 15, color: WEISS,
      lineSpacingMultiple: 1.35, paraSpaceAfter: 7,
    },
  );
  if (f.fussnote) fussnote(s, f.fussnote);
}

/* ── FELDER ───────────────────────────────────────────────────────────── */
function felder(s: Folienblatt, f: Extract<Folie, { art: "felder" }>) {
  const y = titelzeile(s, f.titel);
  const platz = BUEHNE.h - y - (f.fussnote ? 0.75 : 0.4);
  const hoehe = (platz - 0.12 * (f.felder.length - 1)) / f.felder.length;

  f.felder.forEach((feld, i) => {
    const oben = y + i * (hoehe + 0.12);
    s.addShape("roundRect", {
      x: RAND, y: oben, w: INNEN, h: hoehe,
      fill: { color: FLAECHE }, line: { color: LINIE, width: 0.75 }, rectRadius: 0.06,
    });
    s.addText(feld.name.toUpperCase(), {
      x: RAND + 0.2, y: oben + 0.09, w: INNEN - 0.4, h: 0.2,
      fontFace: SCHRIFT, fontSize: 8, bold: true, color: GOLD, charSpacing: 2,
    });
    s.addText(feld.wert, {
      x: RAND + 0.2, y: oben + 0.3, w: INNEN - 0.4, h: hoehe - 0.38,
      fontFace: SCHRIFT, fontSize: hoehe > 1 ? 13 : 11, color: WEISS, valign: "top",
    });
  });
  if (f.fussnote) fussnote(s, f.fussnote);
}

/* ── STRECKE ──────────────────────────────────────────────────────────
   Nebeneinander, nach rechts schmaler werdend: die Verengung IST die Aussage. */
function strecke(s: Folienblatt, f: Extract<Folie, { art: "strecke" }>) {
  titelzeile(s, f.titel);

  const n = f.schritte.length;
  const luecke = 0.3;
  const gesamt = INNEN - luecke * (n - 1);
  const gewicht = f.schritte.map((_, i) => 1 - i * (0.5 / Math.max(1, n)));
  const summe = gewicht.reduce((a, b) => a + b, 0);

  const oben = 1.85;
  const hoehe = 1.65;
  let x = RAND;

  f.schritte.forEach((text, i) => {
    const b = (gewicht[i] / summe) * gesamt;
    s.addShape("roundRect", {
      x, y: oben, w: b, h: hoehe,
      fill: { color: FLAECHE },
      line: { color: i === n - 1 ? GOLD : LINIE, width: i === n - 1 ? 1.4 : 0.75 },
      rectRadius: 0.07,
    });
    s.addText(String(i + 1), { x: x + 0.16, y: oben + 0.1, w: 0.4, h: 0.22, fontFace: SCHRIFT, fontSize: 10, bold: true, color: GOLD });
    s.addText(text, {
      x: x + 0.16, y: oben + 0.36, w: b - 0.32, h: hoehe - 0.5,
      fontFace: SCHRIFT, fontSize: text.length > 40 ? 10 : 12, color: WEISS, valign: "top",
    });

    if (i < n - 1) {
      s.addText("→", {
        x: x + b, y: oben + hoehe / 2 - 0.16, w: luecke, h: 0.32,
        fontFace: SCHRIFT, fontSize: 15, bold: true, color: GOLD, align: "center",
      });
    }
    x += b + luecke;
  });

  if (f.fussnote) fussnote(s, f.fussnote);
}

/* ── BAUTEILE ─────────────────────────────────────────────────────────── */
function bauteile(s: Folienblatt, f: Extract<Folie, { art: "bauteile" }>) {
  const y = titelzeile(s, f.titel);
  const platz = BUEHNE.h - y - 0.4;
  const hoehe = platz / f.teile.length;

  f.teile.forEach((t, i) => {
    const oben = y + i * hoehe;
    s.addText(String(t.nr), { x: RAND, y: oben, w: 0.3, h: 0.26, fontFace: SCHRIFT, fontSize: 14, bold: true, color: GOLD });
    s.addText(t.was, { x: RAND + 0.3, y: oben, w: INNEN - 2, h: 0.26, fontFace: SCHRIFT, fontSize: 14, bold: true, color: WEISS });
    /* Der ehrliche Aufwand rechts — er ist das Argument für das Angebot und darf nicht
       im Fliesstext untergehen. */
    if (t.aufwand) {
      s.addText(t.aufwand, {
        x: RAND + INNEN - 1.7, y: oben, w: 1.7, h: 0.26,
        fontFace: SCHRIFT, fontSize: 10, color: GOLD, align: "right",
      });
    }
    const laeufe = [
      t.wozu ? { text: t.wozu, options: { color: GRAU, breakLine: true } } : null,
      t.selbst ? { text: t.selbst, options: { color: WEISS } } : null,
    ].filter(Boolean) as { text: string; options: object }[];
    if (laeufe.length) {
      s.addText(laeufe, {
        x: RAND + 0.3, y: oben + 0.28, w: INNEN - 0.3, h: hoehe - 0.34,
        fontFace: SCHRIFT, fontSize: 10.5, valign: "top", lineSpacingMultiple: 1.2,
      });
    }
  });
}

/* ── PROTOKOLL ────────────────────────────────────────────────────────── */
function protokoll(s: Folienblatt, f: Extract<Folie, { art: "protokoll" }>) {
  let y = titelzeile(s, f.titel);
  if (f.erste) {
    s.addText("Der Plan ist daraus entstanden — nicht aus einer Vorlage.", {
      x: RAND, y, w: INNEN, h: 0.24, fontFace: SCHRIFT, fontSize: 10, color: GRAU,
    });
    y += 0.34;
  }

  if (f.eingabe) {
    s.addText("DEINE EINGABE", { x: RAND, y, w: INNEN, h: 0.2, fontFace: SCHRIFT, fontSize: 8, bold: true, color: GOLD, charSpacing: 2 });
    s.addText(f.eingabe, { x: RAND, y: y + 0.21, w: INNEN, h: 0.42, fontFace: SCHRIFT, fontSize: 13, color: WEISS, valign: "top" });
    y += 0.74;
  }

  if (f.runden.length) {
    const laeufe = f.runden.flatMap(r => [
      { text: r.frage, options: { color: GRAU, bold: true, fontSize: 10.5, breakLine: true } },
      { text: r.antwort, options: { color: WEISS, fontSize: 12, breakLine: true, paraSpaceAfter: 10 } },
    ]);
    s.addText(laeufe, {
      x: RAND, y, w: INNEN, h: BUEHNE.h - y - 0.4,
      fontFace: SCHRIFT, valign: "top", lineSpacingMultiple: 1.25,
    });
  }
}

/* ── ANGEBOT ──────────────────────────────────────────────────────────── */
function angebot(s: Folienblatt, f: Extract<Folie, { art: "angebot" }>) {
  const y = titelzeile(s, f.titel);
  const kastenHoehe = 1.25;
  s.addShape("roundRect", {
    x: RAND, y, w: INNEN, h: kastenHoehe,
    fill: { color: FLAECHE }, line: { color: GOLD, width: 1.4 }, rectRadius: 0.08,
  });
  s.addText(f.text, {
    x: RAND + 0.24, y: y + 0.14, w: INNEN - 0.48, h: kastenHoehe - 0.28,
    fontFace: SCHRIFT, fontSize: 12.5, color: WEISS, valign: "top",
  });

  if (f.telefon || f.mail) {
    const unten = y + kastenHoehe + 0.28;
    s.addText("Ruf an oder schreib. Es meldet sich ein Mensch, kein Agent.", {
      x: RAND, y: unten, w: INNEN, h: 0.24, fontFace: SCHRIFT, fontSize: 10.5, color: GRAU,
    });
    const laeufe = [
      f.telefon ? { text: f.telefon, options: { fontSize: 18, bold: true, color: GOLD } } : null,
      f.telefon && f.mail ? { text: "    ", options: {} } : null,
      f.mail ? { text: f.mail, options: { fontSize: 14, bold: true, color: WEISS } } : null,
    ].filter(Boolean) as { text: string; options: object }[];
    s.addText(laeufe, { x: RAND, y: unten + 0.28, w: INNEN, h: 0.4, fontFace: SCHRIFT, valign: "middle" });
  }
}

/* ── SCHLUSS ──────────────────────────────────────────────────────────── */
function schluss(s: Folienblatt, f: Extract<Folie, { art: "schluss" }>) {
  s.addText(f.text, {
    x: RAND, y: 1.7, w: INNEN - 0.8, h: 1.4,
    fontFace: SCHRIFT, fontSize: 14, color: WEISS, valign: "top", lineSpacingMultiple: 1.3,
  });
  s.addShape("rect", { x: RAND, y: 3.35, w: 0.75, h: 0.032, fill: { color: GOLD } });
  s.addText("VersusForge ist die Engine von LuxuryBandit — zwölf eigene KI-Produkte, im Betrieb.", {
    x: RAND, y: 3.55, w: INNEN, h: 0.3, fontFace: SCHRIFT, fontSize: 10, color: GRAU,
  });
}
