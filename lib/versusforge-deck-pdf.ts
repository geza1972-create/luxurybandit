import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { folienAusPlan, type Folie, type FolienOptionen, type VersusForgePlan } from "@/lib/versusforge-folien";

/**
 * DER FOLIENSATZ ALS PDF (Owner 09.09.2026: „Es wird die PowerPoint Präsentation sein").
 *
 * WARUM ES DAS NEBEN DER .pptx ÜBERHAUPT GIBT: Die .pptx ist die Datei, die er ÄNDERN kann.
 * Dieses PDF ist die, die AUFGEHT — auf jedem Handy, in jeder Mail-Vorschau, ohne App und
 * ohne Konto. Wer den Plan unterwegs antippt, sieht sofort etwas; wer ihn bearbeiten will,
 * nimmt die andere Datei. Beide entstehen aus `folienAusPlan()`, damit sie nie auseinander-
 * laufen.
 *
 * DUNKLER GRUND, ANDERS ALS BEIM ALTEN A4-BLATT. Das Dokument war weiss, weil es gedruckt
 * und in eine Mappe gelegt wird. Ein Foliensatz wird gezeigt — auf einem Bildschirm, in
 * einer Besprechung. Dort ist Schwarz die Marke und nicht der Tonerfresser.
 *
 * WINANSI: pdf-lib setzt die Standardschriften in WinAnsi. Kästchen- und Pfeilzeichen gibt
 * es dort nicht, sie würden als Punkte erscheinen — Pfeile und Rahmen werden deshalb
 * GEZEICHNET, nie getippt. `sicher()` fängt den Rest ab, statt abzustürzen.
 */

/* 16:9 in Punkten — dieselbe Bühne wie eine PowerPoint-Folie (10 × 5.625 Zoll). */
const F = { b: 720, h: 405 };
const RAND = 46;
const INNEN = F.b - RAND * 2;

const GOLD = rgb(0.96, 0.81, 0.32);
const GRUND = rgb(0.02, 0.027, 0.031);
const FLAECHE = rgb(0.047, 0.063, 0.075);
const WEISS = rgb(0.965, 0.969, 0.973);
const GRAU = rgb(0.615, 0.651, 0.678);
const LINIE = rgb(0.16, 0.18, 0.2);

/**
 * WinAnsi kann MEHR als die ersten 256 Unicode-Zeichen (09.09.2026, nach dem ersten
 * Probelauf). Der Block 0x80–0x9F trägt Euro, Gedankenstrich, deutsche Anführungszeichen
 * und die Auslassungspunkte — sie stehen im Unicode aber weit oben und fielen deshalb durch
 * eine reine `codePointAt <= 0xff`-Prüfung.
 *
 * WAS DAS ANGERICHTET HAT: Aus „299 €" wurde „299 -". Ein verstümmelter Preis ist schlimmer
 * als gar keiner — und es widerspricht der Hausregel, dass Preise nur aus der Preistabelle
 * kommen und unverändert durchlaufen.
 */
const WINANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

/** Nur, was die Schrift wirklich nicht kennt. `→` ist der einzige echte Fall. */
/* Als Codepunkte geschrieben, nicht als Zeichen: Zwei verschiedene Leerzeichen sehen in
   der Datei gleich aus, und der Übersetzer meldet sie als doppelten Schlüssel. */
const ERSATZ: Record<string, string> = {
  "\u00A0": " ",  // geschütztes Leerzeichen
  "\u202F": " ",  // schmales geschütztes Leerzeichen
  "\u2011": "-",  // geschützter Bindestrich
  "\u2212": "-",  // Minus
  "\u00AD": "",   // weiches Trennzeichen
  "\u2192": "->", // Pfeil
  "\u21D2": "=>", // Doppelpfeil
};

function sicher(text: string): string {
  let t = String(text ?? "").replace(/[\r\t]/g, " ");
  t = t.replace(/./gu, ch => ERSATZ[ch] ?? ch);
  return t.replace(/./gu, ch => {
    const c = ch.codePointAt(0) ?? 0;
    if (ch === "\n" || WINANSI_EXTRA.includes(ch) || (c >= 32 && c <= 0xff && c !== 0x7f)) return ch;
    const nackt = ch.normalize("NFD").replace(/\p{M}+/gu, "");
    const n = nackt.codePointAt(0) ?? 0;
    return nackt && n >= 32 && n <= 0xff ? nackt : "-";
  });
}

function umbrechen(text: string, font: PDFFont, groesse: number, maxBreite: number): string[] {
  const zeilen: string[] = [];
  for (const absatz of sicher(text).split("\n")) {
    if (!absatz.trim()) { zeilen.push(""); continue; }
    let zeile = "";
    for (const wort of absatz.split(/\s+/)) {
      const probe = zeile ? `${zeile} ${wort}` : wort;
      if (font.widthOfTextAtSize(probe, groesse) <= maxBreite || !zeile) zeile = probe;
      else { zeilen.push(zeile); zeile = wort; }
    }
    if (zeile) zeilen.push(zeile);
  }
  return zeilen;
}

/**
 * Sucht den grössten Grad, mit dem der Text noch in die erlaubte Zeilenzahl passt.
 * OHNE DAS gibt es zwei schlechte Ausgänge: eine feste grosse Schrift läuft bei langen
 * Sätzen aus dem Bild, eine feste kleine verschenkt bei kurzen die ganze Wirkung.
 */
function passenderGrad(text: string, font: PDFFont, von: number, bis: number, breite: number, maxZeilen: number): number {
  for (let gr = von; gr > bis; gr -= 1) {
    if (umbrechen(text, font, gr, breite).length <= maxZeilen) return gr;
  }
  return bis;
}

type Stift = { fett: PDFFont; normal: PDFFont };

export async function planAlsDeckPdf(plan: VersusForgePlan, opt: FolienOptionen = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const st: Stift = {
    fett: await doc.embedFont(StandardFonts.HelveticaBold),
    normal: await doc.embedFont(StandardFonts.Helvetica),
  };
  const folien = folienAusPlan(plan, opt);

  folien.forEach(folie => zeichneFolie(doc.addPage([F.b, F.h]), folie, st));

  /* Foliennummern zum Schluss, wenn feststeht, wie viele es sind — das Deckblatt bleibt
     ohne Nummer, wie in jedem gedruckten Satz. */
  const seiten = doc.getPages();
  seiten.forEach((seite, i) => {
    if (i === 0) return;
    const t = `${i + 1} / ${seiten.length}`;
    seite.drawText(t, {
      x: F.b - RAND - st.normal.widthOfTextAtSize(t, 8),
      y: 20, size: 8, font: st.normal, color: rgb(0.36, 0.39, 0.42),
    });
  });

  return await doc.save();
}

/* ═══ EINE FOLIE ═══════════════════════════════════════════════════════ */

function zeichneFolie(s: PDFPage, folie: Folie, st: Stift) {
  s.drawRectangle({ x: 0, y: 0, width: F.b, height: F.h, color: GRUND });

  if (folie.art === "deckblatt") return deckblatt(s, folie, st);

  /* Die Wortmarke klein oben links — auf JEDER Folie, damit auch Folie 7 zuzuordnen ist,
     wenn jemand einen Ausschnitt weiterschickt. */
  wortmarke(s, RAND, F.h - 32, 11, st);

  const kicker = "kicker" in folie ? folie.kicker : "";
  if (kicker) gesperrt(s, kicker, RAND, F.h - 74, 8.5, st.fett, GOLD);

  switch (folie.art) {
    case "aussage": return aussage(s, folie, st);
    case "punkte": return punkte(s, folie, st);
    case "felder": return felder(s, folie, st);
    case "strecke": return strecke(s, folie, st);
    case "bauteile": return bauteile(s, folie, st);
    case "protokoll": return protokoll(s, folie, st);
    case "angebot": return angebot(s, folie, st);
    case "schluss": return schluss(s, folie, st);
  }
}

/** Versus WEISS · Forge GOLD · Punkt GOLD — nie eine andere Aufteilung, nie eine andere Schrift. */
function wortmarke(s: PDFPage, x: number, y: number, gr: number, st: Stift) {
  s.drawText("Versus", { x, y, size: gr, font: st.fett, color: WEISS });
  const nachVersus = x + st.fett.widthOfTextAtSize("Versus", gr);
  s.drawText("Forge", { x: nachVersus, y, size: gr, font: st.fett, color: GOLD });
  s.drawText(".", { x: nachVersus + st.fett.widthOfTextAtSize("Forge", gr), y, size: gr, font: st.fett, color: GOLD });
}

/** Gesperrte Versalien — die Handschrift der Kicker, im Netz wie auf Papier. */
function gesperrt(s: PDFPage, text: string, x: number, y: number, gr: number, font: PDFFont, farbe: ReturnType<typeof rgb>) {
  let cx = x;
  for (const ch of sicher(text.toUpperCase())) {
    s.drawText(ch, { x: cx, y, size: gr, font, color: farbe });
    cx += font.widthOfTextAtSize(ch, gr) + 1.8;
  }
}

function titelzeile(s: PDFPage, text: string, st: Stift): number {
  const gr = passenderGrad(text, st.fett, 26, 16, INNEN, 2);
  let y = F.h - 104;
  for (const z of umbrechen(text, st.fett, gr, INNEN)) {
    s.drawText(z, { x: RAND, y, size: gr, font: st.fett, color: WEISS });
    y -= gr * 1.22;
  }
  return y - 14;
}

function fussnote(s: PDFPage, text: string, st: Stift) {
  const zeilen = umbrechen(text, st.normal, 9, INNEN).slice(0, 2);
  let y = 30 + (zeilen.length - 1) * 12;
  for (const z of zeilen) {
    s.drawText(z, { x: RAND, y, size: 9, font: st.normal, color: GRAU });
    y -= 12;
  }
}

/* ── DECKBLATT ─────────────────────────────────────────────────────────
   Sein Satz, gross, in Anführungszeichen. Nicht unsere Überschrift: Wer den Satz
   aufschlägt, soll SEINE Worte lesen — das ist der Beleg, dass zugehört wurde. */
function deckblatt(s: PDFPage, f: Extract<Folie, { art: "deckblatt" }>, st: Stift) {
  s.drawRectangle({ x: 0, y: F.h - 3, width: F.b, height: 3, color: GOLD });
  wortmarke(s, RAND, F.h - 60, 21, st);
  gesperrt(s, "STRATEGY WINS MORE THAN ADS.", RAND, F.h - 78, 7, st.fett, rgb(0.45, 0.48, 0.5));

  const zitat = `"${f.ziel.replace(/^["'„"]|["'""]$/g, "")}"`;
  const gr = passenderGrad(zitat, st.fett, 34, 17, INNEN, 4);
  const zeilen = umbrechen(zitat, st.fett, gr, INNEN);
  let y = 176 + ((zeilen.length - 1) * gr * 1.18) / 2;
  for (const z of zeilen) {
    s.drawText(z, { x: RAND, y, size: gr, font: st.fett, color: WEISS });
    y -= gr * 1.18;
  }

  s.drawLine({ start: { x: RAND, y: 74 }, end: { x: RAND + 54, y: 74 }, thickness: 2, color: GOLD });
  s.drawText("Deine Strategie", { x: RAND, y: 52, size: 12, font: st.fett, color: WEISS });
  s.drawText(sicher(f.datum), { x: RAND, y: 34, size: 9.5, font: st.normal, color: GRAU });
}

/* ── AUSSAGE: eine Sache, gross ───────────────────────────────────────── */
function aussage(s: PDFPage, f: Extract<Folie, { art: "aussage" }>, st: Stift) {
  const gold = f.ton === "gold";
  const farbe = gold ? GOLD : WEISS;
  const oben = F.h - 110;
  const unten = f.fussnote ? 74 : 46;

  const gr = passenderGrad(f.text, st.fett, gold ? 30 : 22, 13, INNEN - 24, gold ? 5 : 7);
  const zeilen = umbrechen(f.text, st.fett, gr, INNEN - 24);

  /* Ein goldener Balken links statt eines Rahmens: Ein Rahmen um viel Text sieht aus wie
     ein Formularfeld, der Balken wie ein Zitat. */
  const hoehe = zeilen.length * gr * 1.2;
  const start = Math.min(oben, unten + hoehe + 20);
  if (gold) s.drawRectangle({ x: RAND, y: start - hoehe + gr * 0.9, width: 3, height: hoehe, color: GOLD });

  let y = start;
  for (const z of zeilen) {
    s.drawText(z, { x: RAND + (gold ? 20 : 0), y, size: gr, font: st.fett, color: farbe });
    y -= gr * 1.2;
  }
  if (f.fussnote) fussnote(s, f.fussnote, st);
}

/* ── PUNKTE ───────────────────────────────────────────────────────────── */
function punkte(s: PDFPage, f: Extract<Folie, { art: "punkte" }>, st: Stift) {
  let y = titelzeile(s, f.titel, st);
  const gr = f.punkte.length > 4 ? 12 : 14;
  for (const p of f.punkte) {
    const zeilen = umbrechen(p, st.normal, gr, INNEN - 22);
    s.drawCircle({ x: RAND + 4, y: y + gr * 0.32, size: 2.4, color: GOLD });
    for (const z of zeilen) {
      s.drawText(z, { x: RAND + 22, y, size: gr, font: st.normal, color: WEISS });
      y -= gr * 1.32;
    }
    y -= 7;
  }
  if (f.fussnote) fussnote(s, f.fussnote, st);
}

/* ── FELDER: beschriftete Kästen ──────────────────────────────────────── */
function felder(s: PDFPage, f: Extract<Folie, { art: "felder" }>, st: Stift) {
  let y = titelzeile(s, f.titel, st);
  const platz = y - (f.fussnote ? 60 : 34);
  const luecke = 8;
  const frei = platz - luecke * (f.felder.length - 1);

  /**
   * DIE HÖHE FOLGT DEM INHALT, NICHT DER ANZAHL (09.09.2026, nach dem ersten Probelauf:
   * der Primärtext war abgeschnitten — ausgerechnet das Feld, das man bei Meta einträgt).
   *
   * Vorher bekam jedes Feld denselben Anteil, und was nicht hineinpasste, wurde
   * ABGESCHNITTEN. Ein halber Anzeigentext ist aber schlimmer als gar keiner: Er sieht
   * vollständig aus, und wer ihn abtippt, schaltet eine kaputte Anzeige.
   *
   * Jetzt teilen sich die Felder den Platz nach ihrem Textgewicht, und der Grad sinkt so
   * weit, bis wirklich alles steht. Abschneiden gibt es nicht mehr.
   */
  const gewicht = f.felder.map(feld => Math.max(1, umbrechen(feld.wert, st.normal, 12, INNEN - 32).length));
  const summe = gewicht.reduce((a, b) => a + b, 0);

  f.felder.forEach((feld, i) => {
    const hoehe = 24 + ((frei - 24 * f.felder.length) * gewicht[i]) / summe;
    /* Grad so wählen, dass der ganze Wert in den Kasten passt — nie kürzen. */
    const maxZeilen = Math.max(1, Math.floor((hoehe - 24) / (12 * 1.28)));
    const gr = passenderGrad(feld.wert, st.normal, 13, 8, INNEN - 32, Math.max(1, maxZeilen));
    const zeilen = umbrechen(feld.wert, st.normal, gr, INNEN - 32);

    s.drawRectangle({
      x: RAND, y: y - hoehe + 12, width: INNEN, height: hoehe,
      color: FLAECHE, borderColor: LINIE, borderWidth: 0.8,
    });
    gesperrt(s, feld.name, RAND + 14, y, 7.5, st.fett, GOLD);
    let yy = y - 14;
    for (const z of zeilen) {
      s.drawText(z, { x: RAND + 14, y: yy, size: gr, font: st.normal, color: WEISS });
      yy -= gr * 1.28;
    }
    y -= hoehe + luecke;
  });
  if (f.fussnote) fussnote(s, f.fussnote, st);
}

/* ── STRECKE: die Stationen nebeneinander ─────────────────────────────
   NEBENEINANDER, nicht untereinander. Auf einer Folie ist die Waagerechte die Zeitachse —
   man sieht auf einen Blick, wie viele Schritte zwischen Klick und Anfrage liegen. Die
   Kästen werden nach rechts schmaler: die Verengung IST die Aussage. */
function strecke(s: PDFPage, f: Extract<Folie, { art: "strecke" }>, st: Stift) {
  titelzeile(s, f.titel, st);

  const n = f.schritte.length;
  const luecke = 22;
  const gesamt = INNEN - luecke * (n - 1);
  /* Jeder Kasten etwas schmaler als der davor, in der Summe aber genau die volle Breite. */
  const gewicht = f.schritte.map((_, i) => 1 - i * (0.5 / Math.max(1, n)));
  const summe = gewicht.reduce((a, b) => a + b, 0);
  const breiten = gewicht.map(g => (g / summe) * gesamt);

  const mitte = 172;
  const hoehe = 118;
  let x = RAND;

  f.schritte.forEach((text, i) => {
    const b = breiten[i];
    s.drawRectangle({
      x, y: mitte - hoehe / 2, width: b, height: hoehe,
      color: FLAECHE, borderColor: i === n - 1 ? GOLD : LINIE, borderWidth: i === n - 1 ? 1.2 : 0.8,
    });
    s.drawText(`${i + 1}`, { x: x + 12, y: mitte + hoehe / 2 - 20, size: 10, font: st.fett, color: GOLD });

    const gr = passenderGrad(text, st.normal, 12, 8, b - 24, 5);
    const zeilen = umbrechen(text, st.normal, gr, b - 24);
    let yy = mitte + 6 + ((zeilen.length - 1) * gr * 1.3) / 2 - 8;
    for (const z of zeilen) {
      s.drawText(z, { x: x + 12, y: yy, size: gr, font: st.normal, color: WEISS });
      yy -= gr * 1.3;
    }

    /* Der Pfeil dazwischen — gezeichnet, weil WinAnsi kein Pfeilzeichen kennt. */
    if (i < n - 1) {
      const px = x + b + luecke / 2;
      s.drawLine({ start: { x: px - 6, y: mitte }, end: { x: px + 5, y: mitte }, thickness: 1.1, color: GOLD });
      s.drawLine({ start: { x: px + 1, y: mitte + 4 }, end: { x: px + 6, y: mitte }, thickness: 1.1, color: GOLD });
      s.drawLine({ start: { x: px + 1, y: mitte - 4 }, end: { x: px + 6, y: mitte }, thickness: 1.1, color: GOLD });
    }
    x += b + luecke;
  });

  if (f.fussnote) fussnote(s, f.fussnote, st);
}

/* ── BAUTEILE ─────────────────────────────────────────────────────────── */
function bauteile(s: PDFPage, f: Extract<Folie, { art: "bauteile" }>, st: Stift) {
  let y = titelzeile(s, f.titel, st);

  for (const t of f.teile) {
    s.drawText(`${t.nr}`, { x: RAND, y, size: 13, font: st.fett, color: GOLD });
    const kopf = umbrechen(t.was, st.fett, 13, INNEN - 130);
    let yy = y;
    for (const z of kopf) {
      s.drawText(z, { x: RAND + 22, y: yy, size: 13, font: st.fett, color: WEISS });
      yy -= 16;
    }
    /* Der ehrliche Aufwand rechts an der Kante — er ist das Argument für das Angebot
       und darf deshalb nicht im Fliesstext verschwinden. */
    if (t.aufwand) {
      const a = sicher(t.aufwand);
      s.drawText(a, { x: RAND + INNEN - st.normal.widthOfTextAtSize(a, 9.5), y: y + 1, size: 9.5, font: st.normal, color: GOLD });
    }
    y = yy - 2;
    for (const text of [t.wozu, t.selbst].filter(Boolean) as string[]) {
      const grau = text === t.wozu;
      for (const z of umbrechen(text, st.normal, 10, INNEN - 22).slice(0, 3)) {
        s.drawText(z, { x: RAND + 22, y, size: 10, font: st.normal, color: grau ? GRAU : WEISS });
        y -= 13;
      }
    }
    y -= 14;
  }
}

/* ── PROTOKOLL ────────────────────────────────────────────────────────── */
function protokoll(s: PDFPage, f: Extract<Folie, { art: "protokoll" }>, st: Stift) {
  let y = titelzeile(s, f.titel, st);
  /* Der Beleg-Satz nur auf der ERSTEN Protokollfolie -- auf der Fortsetzung waere er eine
     Wiederholung, die nichts mehr erklaert (09.09.2026, erster Probelauf). */
  if (f.erste) {
    s.drawText("Der Plan ist daraus entstanden - nicht aus einer Vorlage.", { x: RAND, y, size: 9.5, font: st.normal, color: GRAU });
    y -= 22;
  }

  if (f.eingabe) {
    gesperrt(s, "DEINE EINGABE", RAND, y, 7.5, st.fett, GOLD);
    y -= 15;
    for (const z of umbrechen(f.eingabe, st.normal, 12, INNEN).slice(0, 2)) {
      s.drawText(z, { x: RAND, y, size: 12, font: st.normal, color: WEISS });
      y -= 16;
    }
    y -= 12;
  }

  for (const r of f.runden) {
    for (const z of umbrechen(r.frage, st.fett, 10, INNEN).slice(0, 2)) {
      s.drawText(z, { x: RAND, y, size: 10, font: st.fett, color: GRAU });
      y -= 13;
    }
    for (const z of umbrechen(r.antwort, st.normal, 11.5, INNEN - 18).slice(0, 3)) {
      s.drawText(z, { x: RAND + 18, y, size: 11.5, font: st.normal, color: WEISS });
      y -= 15;
    }
    y -= 12;
  }
}

/* ── ANGEBOT ──────────────────────────────────────────────────────────
   DIE EINZIGE FOLIE, DIE ETWAS VERKAUFT — und die einzige mit goldenem Rahmen, damit
   niemand sie für einen Teil der Anleitung hält. */
function angebot(s: PDFPage, f: Extract<Folie, { art: "angebot" }>, st: Stift) {
  let y = titelzeile(s, f.titel, st);
  const zeilen = umbrechen(f.text, st.normal, 12, INNEN - 36);
  const hoehe = 30 + zeilen.length * 17;

  s.drawRectangle({ x: RAND, y: y - hoehe + 14, width: INNEN, height: hoehe, color: FLAECHE, borderColor: GOLD, borderWidth: 1.2 });
  let yy = y - 6;
  for (const z of zeilen) {
    s.drawText(z, { x: RAND + 18, y: yy, size: 12, font: st.normal, color: WEISS });
    yy -= 17;
  }
  y = y - hoehe - 12;

  /* AB HIER IST ES KEINE KI MEHR: eine Nummer, unter der jemand abhebt.
     Die Hausregel `keine-email-adresse-auf-der-seite` schützt vor Sammlern auf
     ÖFFENTLICHEN Seiten. Diesen Satz bekommt nur, wer selbst eine Adresse hinterlassen
     hat — kein Roboter liest ihn. */
  if (f.telefon || f.mail) {
    s.drawText("Ruf an oder schreib. Es meldet sich ein Mensch, kein Agent.", { x: RAND, y, size: 10, font: st.normal, color: GRAU });
    y -= 24;
    let x = RAND;
    if (f.telefon) {
      s.drawText(sicher(f.telefon), { x, y, size: 17, font: st.fett, color: GOLD });
      x += st.fett.widthOfTextAtSize(sicher(f.telefon), 17) + 30;
    }
    if (f.mail) s.drawText(sicher(f.mail), { x, y: y + 2, size: 13, font: st.fett, color: WEISS });
  }
}

/* ── SCHLUSS ──────────────────────────────────────────────────────────── */
function schluss(s: PDFPage, f: Extract<Folie, { art: "schluss" }>, st: Stift) {
  let y = 250;
  for (const z of umbrechen(f.text, st.normal, 13, INNEN - 60)) {
    s.drawText(z, { x: RAND, y, size: 13, font: st.normal, color: WEISS });
    y -= 19;
  }
  y -= 18;
  s.drawLine({ start: { x: RAND, y }, end: { x: RAND + 54, y }, thickness: 2, color: GOLD });
  y -= 22;
  s.drawText("VersusForge ist die Engine von LuxuryBandit - zwoelf eigene KI-Produkte, im Betrieb.",
    { x: RAND, y, size: 9.5, font: st.normal, color: GRAU });
}
