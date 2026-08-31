import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, degrees, rgb } from "pdf-lib";
import type { LebenslaufProfil } from "@/lib/lebenslauf-store";

/**
 * DIE BEWERBUNG ALS PDF (Owner 26.08.2026, das neue Tool „LB - Resume Generator":
 * „Man gibt die Anzeige ein, die Bewerbung die schon existiert, das bild und wird
 * angepasst zum runterladen. Mit wasserzeichen. Will er ohne, muss er zahlen 9,99").
 *
 * LAYOUT V2 (Owner, zur Rohfassung: „das Layout sieht nach nix aus"): Seite 1 ist das
 * Anschreiben im Brief-Look (Kopfzeile, Datum, Betreff). Ab Seite 2 der Lebenslauf
 * ZWEISPALTIG — links die schmale Fakten-Spalte (Foto, Kontakt, Sprachen, Kompetenzen)
 * auf getöntem Grund, rechts Profil, Erfahrung, Ausbildung. Fortsetzungsseiten laufen
 * in voller Breite weiter. Eine dezente Akzentfarbe, sonst Tinte auf Weiß.
 *
 * WASSERZEICHEN = DIE GRATIS-LINIE (Hausregel `gratis-nur-mit-muster`): Die
 * Muster-Fassung DARF heruntergeladen und verschickt werden — das Wasserzeichen ist
 * das Preisschild, keine Sperre. `wasserzeichen: false` gibt es nur nach Zahlung
 * (der Aufrufer prüft `bezahlt`, nie dieser Baustein).
 *
 * WARUM pdf-lib: reine JS-Bibliothek ohne native Teile (läuft auf Vercel serverless);
 * ein PDF von Hand zu schreiben wäre — anders als beim ZIP-Leser in lib/docx-text.ts —
 * kein 60-Zeilen-Bordmittel mehr (Fonts, Streams, Bild-Einbettung).
 *
 * SCHRIFT-GRENZE, EHRLICH: Standard-Helvetica kann nur WinAnsi (Latin-1 + Windows-
 * Sonderzeichen). Deutsch passt vollständig; rumänische/osteuropäische Buchstaben
 * (ș ț ă …) werden auf ihre Grundform gesetzt statt das PDF zu sprengen. Wenn das
 * Produkt später ganze Lebensläufe in solchen Sprachen trägt, gehört eine eingebettete
 * TTF hierher — nicht mehr Transliteration.
 */

const A4 = { b: 595.28, h: 841.89 };
const RAND = 54;
const TINTE = rgb(0.11, 0.12, 0.14);
const GRAU = rgb(0.44, 0.45, 0.5);
const HELL = rgb(0.62, 0.63, 0.67);
const LINIE = rgb(0.86, 0.87, 0.89);

import { vorlageFinden } from "@/lib/pdf-vorlagen";

/* Aus „#1877F2" wird ein pdf-lib-Farbwert. Die Vorlagen stehen als TEXT in
   lib/pdf-vorlagen.ts, damit die Galerie im Browser sie lesen kann, ohne pdf-lib mit in das
   Bündel zu ziehen — hier ist die einzige Stelle, die daraus Farbe macht. */
const hexRgb = (hex: string) => {
  const h = hex.replace("#", "");
  return rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);
};

/* WinAnsi-tauglich machen: gezielte Grundform-Ersetzungen, dann diakritische Zeichen
   abstreifen, was übrig bleibt und nicht kodierbar ist wird zu "·". */
const ERSATZ: Record<string, string> = {
  "ș": "s", "ş": "s", "Ș": "S", "Ş": "S", "ț": "t", "ţ": "t", "Ț": "T", "Ţ": "T",
  "ă": "a", "Ă": "A", "ĕ": "e", "ő": "ö", "Ő": "Ö", "ű": "ü", "Ű": "Ü",
  "ł": "l", "Ł": "L", "đ": "d", "Đ": "D", "ř": "r", "Ř": "R", "č": "c", "Č": "C",
  "ć": "c", "Ć": "C", "ž": "z", "Ž": "Z", "š": "s", "Š": "S", "→": "-", "•": "·",
  /* Die KI setzt in zusammengesetzten Wörtern gern einen GESCHÜTZTEN Bindestrich
     (U+2011/U+2010/U+2012), damit „UI-Gestaltung" nicht mitten im Wort umbricht.
     WinAnsi kennt diese Zeichen nicht — ohne diese Zeile würden sie zu „·" und aus
     „UI-Gestaltung" ein falsch lesbares „UI·Gestaltung". */
  "‐": "-", "‑": "-", "‒": "-",
};
const WINANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”·–—˜™š›œžŸ";
function winAnsi(text: string): string {
  let t = text.replace(/[\r\t]/g, " ");
  t = t.replace(/./gu, ch => ERSATZ[ch] ?? ch);
  return t.replace(/./gu, ch => {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === "\n" || (code >= 32 && code <= 0xFF && code !== 0x7F) || WINANSI_EXTRA.includes(ch)) return ch;
    const nackt = ch.normalize("NFD").replace(/\p{M}+/gu, "");
    const nCode = nackt.codePointAt(0) ?? 0;
    return nackt && nCode >= 32 && nCode <= 0xFF ? nackt : "·";
  });
}

/**
 * GESPERRTE SCHRIFT — „E X P E R I E N C E" statt „EXPERIENCE".
 *
 * Die zweite Referenz (Owner 28.08.2026: „und sowas") lebt von weit auseinandergezogenen
 * Versalien; ohne sie sieht der Aufbau aus wie der erste in anderer Farbe. pdf-lib kennt
 * keine Laufweite, also wird jedes Zeichen einzeln gesetzt. Das ist bei Überschriften
 * bezahlbar — für Fliesstext wäre es das nicht, und dort will man es auch nicht.
 */
function sperrBreite(t: string, font: PDFFont, groesse: number, sperrung: number): number {
  return [...t].reduce((b, ch) => b + font.widthOfTextAtSize(ch, groesse), 0) + Math.max(0, [...t].length - 1) * sperrung;
}
/** Gesperrte Schrift umbrechen — `umbrechen` kann es nicht, es kennt die Laufweite nicht. */
function sperrUmbruch(text: string, font: PDFFont, groesse: number, sperrung: number, maxBreite: number): string[] {
  const zeilen: string[] = [];
  for (const wort of text.split(/\s+/).filter(Boolean)) {
    const probe = zeilen.length ? `${zeilen[zeilen.length - 1]} ${wort}` : wort;
    if (zeilen.length && sperrBreite(probe, font, groesse, sperrung) <= maxBreite) zeilen[zeilen.length - 1] = probe;
    else zeilen.push(wort);
  }
  return zeilen;
}

function sperrSetzen(seite: PDFPage, t: string, o: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb>; sperrung: number }) {
  let x = o.x;
  for (const ch of t) {
    seite.drawText(ch, { x, y: o.y, size: o.size, font: o.font, color: o.color });
    x += o.font.widthOfTextAtSize(ch, o.size) + o.sperrung;
  }
}

function umbrechen(text: string, font: PDFFont, groesse: number, maxBreite: number): string[] {
  const zeilen: string[] = [];
  for (const absatz of text.split("\n")) {
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
 * EIN PORTRÄT WIRD NICHT AUS DER MITTE BESCHNITTEN (28.08.2026, gemessen an Coras Foto).
 *
 * Alle vier Aufbauten legen das Bild mit „cover" in ihr Feld: Die grössere der beiden
 * Skalierungen gewinnt, der Rest ragt hinaus und wird zugedeckt. Zentriert man dabei, wird
 * bei einem Hochformat oben UND unten gleich viel weggeschnitten — und weil ein Gesicht nie
 * in der Bildmitte sitzt, sondern im oberen Drittel, landet in der runden Scheibe der Hals
 * und im Kopfband das Kinn.
 *
 * `OBEN_BIAS` verschiebt den Ausschnitt nach oben: 0 = zentriert (wie vorher), 1 = bündig an
 * der Oberkante. 0,62 lässt oben ein wenig Luft über dem Kopf stehen — ohne die klebt der
 * Scheitel an der Kante und das Bild wirkt gedrückt.
 *
 * Es ist derselbe Griff wie `object-position: top` im Web, nur muss man ihn hier ausrechnen:
 * pdf-lib kennt keinen Bildausschnitt, nur eine Position.
 */
const OBEN_BIAS = 0.62;
/** Die y-Position (Unterkante) eines „cover"-Bildes, nach oben gerückt. */
const fotoY = (mitteY: number, feldH: number, bildH: number) =>
  mitteY - bildH / 2 - OBEN_BIAS * (bildH - feldH) / 2;

export type PdfFoto = { bytes: Uint8Array; typ: "jpg" | "png" } | null;

export async function bewerbungAlsPdf(
  profil: LebenslaufProfil,
  opt: { wasserzeichen: boolean; foto?: PdfFoto; vorlage?: string },
): Promise<Uint8Array> {
  /* Die gewählte Vorlage — ohne Angabe die erste (Klassik). Ab hier gibt es kein festes
     AKZENT/SPALTE_GRUND mehr; alles Farbige kommt aus `V`. */
  const V = vorlageFinden(opt.vorlage);
  const AKZENT = hexRgb(V.akzent);
  const SPALTE_GRUND = hexRgb(V.spalte);
  /* Schrift in der Spalte: auf einer Vollfläche hell, auf hellem Grund dunkel. */
  const SP_TINTE = V.hell ? TINTE : rgb(1, 1, 1);
  const SP_GRAU = V.hell ? GRAU : rgb(0.84, 0.86, 0.90);
  const SP_TITEL = hexRgb(V.spalteAkzent);
  const dok = await PDFDocument.create();
  const normal = await dok.embedFont(StandardFonts.Helvetica);
  const fett = await dok.embedFont(StandardFonts.HelveticaBold);
  /* DIE KURSIVE SERIFE (vierte Referenz) — nur der Editorial-Aufbau benutzt sie: für den
     Namen gross und für den Firmennamen klein. Zwei Schriften in einem Dokument sind das
     Maximum; die Serife ersetzt hier keine Grotesk, sie akzentuiert. */
  const serifKursiv = await dok.embedFont(StandardFonts.TimesRomanItalic);

  let bild: PDFImage | null = null;
  if (opt.foto) {
    try { bild = opt.foto.typ === "png" ? await dok.embedPng(opt.foto.bytes) : await dok.embedJpg(opt.foto.bytes); }
    catch { bild = null; /* unlesbares Bild: Lebenslauf ohne Foto, nie ein Abbruch */ }
  }

  /* ── Zeichen-Werkzeuge auf einer wandernden Schreibmarke ── */
  let seite: PDFPage = dok.addPage([A4.b, A4.h]);
  let y = A4.h - RAND;
  let vollbreiteFortsetzung = false;   // Fortsetzungsseiten des CVs laufen voll breit
  const neueSeite = () => { seite = dok.addPage([A4.b, A4.h]); y = A4.h - RAND; };

  type TextOpt = { groesse?: number; font?: PDFFont; farbe?: ReturnType<typeof rgb>; abstand?: number; x?: number; maxBreite?: number; zeilenfaktor?: number };
  const RECHTS_X = () => (vollbreiteFortsetzung ? RAND : V.layout === "editorial" ? 234 : V.layout === "banner" ? 268 : 228);
  const RECHTS_BREITE = () => A4.b - RAND - RECHTS_X();

  const platz = (hoehe: number) => {
    if (y - hoehe < RAND + 20) { vollbreiteFortsetzung = true; neueSeite(); }
  };
  const text = (t: string, o: TextOpt = {}) => {
    const groesse = o.groesse ?? 10;
    const font = o.font ?? normal;
    const zh = groesse * (o.zeilenfaktor ?? 1.45);
    for (const zeile of umbrechen(winAnsi(t), font, groesse, o.maxBreite ?? RECHTS_BREITE())) {
      platz(zh);
      seite.drawText(zeile, { x: o.x ?? RECHTS_X(), y: y - groesse, size: groesse, font, color: o.farbe ?? TINTE });
      y -= zh;
    }
    y -= o.abstand ?? 0;
  };
  /**
   * ABSCHNITTS-TITEL: senkrechter Akzentbalken + Überschrift in Gross-/Kleinschreibung.
   *
   * Der Balken ist dieselbe Geste wie `SectionTitle` im Web (gelber Balken vor der
   * Überschrift) — die Bewerbung soll aussehen, als käme sie aus demselben Haus wie die
   * Seite, auf der sie bestellt wurde. Er ersetzt die Icons der Referenz: Helvetica hat
   * keine, und eine Icon-Schrift einzubetten wäre ein halbes Megabyte für ein Piktogramm.
   */
  const abschnitt = (titel: string) => {
    /* KEINE ÜBERSCHRIFT ALLEIN AM BLATTENDE (gemessen am Kopfband-Muster, 28.08.2026:
       „Ausbildung" stand als letzte Zeile auf Blatt 2, die Einträge dazu auf Blatt 3).
       `platz` verlangt deshalb nicht nur den Platz für die Überschrift, sondern auch für die
       ersten Zeilen darunter — sonst rutscht die Überschrift von selbst mit hinüber. */
    y -= 12; platz(96);
    const x = RECHTS_X();
    if (V.layout === "editorial") {
      sperrSetzen(seite, winAnsi(titel.toUpperCase()), { x, y: y - 12, size: 12, font: fett, color: TINTE, sperrung: 2.8 });
      seite.drawLine({ start: { x, y: y - 21 }, end: { x: A4.b - RAND, y: y - 21 }, thickness: 0.8, color: LINIE });
      y -= 32;
    } else if (V.layout === "linie") {
      sperrSetzen(seite, winAnsi(titel.toUpperCase()), { x, y: y - 13, size: 13, font: normal, color: TINTE, sperrung: 3.2 });
      y -= 26;
    } else if (V.layout === "banner") {
      seite.drawText(winAnsi(titel), { x, y: y - 15, size: 15, font: fett, color: TINTE });
      seite.drawLine({ start: { x, y: y - 22 }, end: { x: A4.b - RAND, y: y - 22 }, thickness: 0.8, color: LINIE });
      y -= 32;
    } else {
      seite.drawRectangle({ x, y: y - 14, width: 3.5, height: 15, color: AKZENT });
      seite.drawText(winAnsi(titel), { x: x + 11, y: y - 13, size: 13.5, font: fett, color: TINTE });
      seite.drawLine({ start: { x, y: y - 20 }, end: { x: A4.b - RAND, y: y - 20 }, thickness: 0.8, color: AKZENT, opacity: 0.35 });
      y -= 30;
    }
  };

  const kontaktZeilen = [profil.ort, profil.telefon, profil.email].filter(Boolean) as string[];

  /* ════ SEITE 1 — DAS ANSCHREIBEN (Brief-Look, volle Breite) ════ */
  vollbreiteFortsetzung = true;
  /* Kopf: Name links, Kontakt rechtsbündig in Kleinschrift — wie ein Briefkopf. */
  seite.drawText(winAnsi(profil.name || "Bewerbung"), { x: RAND, y: y - 19, size: 19, font: fett, color: TINTE });
  /**
   * DER BRIEFKOPF IST ZWEISPALTIG — UND DIE LINKE SPALTE MUSS DAS WISSEN (Owner 28.08.2026,
   * mit Bild seines eigenen Anschreibens: „selber Fehler im Layout, siehe Text").
   *
   * Rechts stehen Ort, Telefon und Adresse, rechtsbündig gesetzt. Links Name und
   * Positionierung — letztere ohne jede Breitengrenze. Eine lange Rolle („Founding Product
   * Designer — 0-to-1 Konversationelle AI & schnelles, AI-gestütztes Prototyping") lief
   * deshalb quer durch die Telefonnummer.
   *
   * Es ist derselbe Fehler wie im Editorial-Kopf, nur eine Seite früher: Ich hatte dort die
   * gesperrte Schrift umbrechen lassen und diese Stelle nicht mitgeprüft. Beide teilen die
   * Ursache — Text ohne Grenze neben Text mit fester Position.
   *
   * ZUERST UMBRECHEN, DANN VERKLEINERN: Zwei Zeilen sind in einem Briefkopf normal; drei
   * schieben das Datum nach unten. Passt es in zweien nicht, wird die Schrift enger, bis es
   * passt — eine abgeschnittene Rolle wäre schlimmer als eine kleine.
   */
  let kopfHoehe = 52;
  if (profil.positionierung) {
    const kontaktBreite = kontaktZeilen.reduce((b, z) => Math.max(b, normal.widthOfTextAtSize(winAnsi(z), 8.5)), 0);
    const platzLinks = A4.b - RAND * 2 - kontaktBreite - 24;   // 24 pt Luft zwischen den Spalten
    let pg = 10.5;
    let zeilen = umbrechen(winAnsi(profil.positionierung), normal, pg, platzLinks);
    while (zeilen.length > 2 && pg > 7.5) {
      pg -= 0.5;
      zeilen = umbrechen(winAnsi(profil.positionierung), normal, pg, platzLinks);
    }
    zeilen.slice(0, 2).forEach((z, i) => {
      seite.drawText(z, { x: RAND, y: y - 36 - i * (pg + 3), size: pg, font: normal, color: AKZENT });
    });
    /* Eine zweite Zeile braucht Platz, sonst rückt ihr das Datum auf die Schrift. */
    if (zeilen.length > 1) kopfHoehe += pg + 3;
  }
  kontaktZeilen.forEach((z, i) => {
    const w = normal.widthOfTextAtSize(winAnsi(z), 8.5);
    seite.drawText(winAnsi(z), { x: A4.b - RAND - w, y: y - 12 - i * 12, size: 8.5, font: normal, color: GRAU });
  });
  y -= kopfHoehe;
  seite.drawLine({ start: { x: RAND, y }, end: { x: A4.b - RAND, y }, thickness: 0.8, color: AKZENT });
  y -= 30;

  const datum = new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
  const datumW = normal.widthOfTextAtSize(datum, 9.5);
  seite.drawText(datum, { x: A4.b - RAND - datumW, y: y - 9.5, size: 9.5, font: normal, color: GRAU });
  y -= 34;

  const betreff = profil.anzeigeTitel
    ? `Bewerbung als ${profil.anzeigeTitel}${profil.anzeigeFirma ? ` — ${profil.anzeigeFirma}` : ""}`
    : "Bewerbung";
  text(betreff, { groesse: 12, font: fett, x: RAND, maxBreite: A4.b - RAND * 2, abstand: 12 });
  text(profil.anschreiben || profil.sprechtext || "", { groesse: 10.5, x: RAND, maxBreite: A4.b - RAND * 2, zeilenfaktor: 1.52 });

  /* ════ AB SEITE 2 — DER LEBENSLAUF ════
   *
   * LAYOUT V3 (Owner 28.08.2026, mit einer Referenz-Vorlage: „sowas" · „mit unterschiedliche
   * farben"). Vorher war die linke Spalte ein blasser grauer Streifen mit einem eckigen Foto
   * obendrauf — korrekt, aber nach nichts aussehend. Die Referenz zeigt, was fehlte:
   *
   *   1. die farbige VOLLFLÄCHE als linke Spalte, nicht ein Hauch Grau
   *   2. ein DIAGONALER Anschnitt oben, der die Fläche in Bewegung bringt
   *   3. das Foto RUND, in einem hellen Ring
   *   4. Überschriften in normaler Gross-/Kleinschreibung statt Versalien-Kleinschrift
   *   5. der Zeitraum in einer EIGENEN Spalte links am Werdegang, mit senkrechter Linie
   *
   * WAS BEWUSST ANDERS BLEIBT ALS IN DER REFERENZ: Dort stehen Ausbildung und Kompetenzen
   * links. Die schmale Spalte kann NICHT umbrechen — was nicht hineinpasst, verschwindet
   * (`linksText` hört still auf). Kontakt, Sprachen und Kompetenzen sind kurze Listen und
   * dürfen dort stehen; ein Werdegang oder eine Ausbildung mit sechs Stationen nicht. Die
   * bleiben rechts, wo die Seite umbrechen darf. Lieber eine Zeile anders als die Referenz
   * als ein Lebenslauf, dem still die Hälfte der Ausbildung fehlt.
   */
  vollbreiteFortsetzung = false;
  neueSeite();
  /* Die Seite, auf der der LEBENSLAUF beginnt — nicht Seite 1. Bei einer Bewerbung mit
     Anschreiben ist Seite 1 der Brief; das Siegel gehört aber auf den Lebenslauf. */
  const lebenslaufSeite = seite;

  /* Die Spalte ist beim Zeitstrahl-Aufbau breiter — dort trägt sie das randlose Foto über
     die volle Breite, und ein 170 pt schmales Foto sähe aus wie ein Passbild. */
  const SPALTE_B = V.layout === "linie" ? 214 : V.layout === "editorial" ? 196 : V.layout === "banner" ? 236 : 200;
  /* Der Editorial-Aufbau hat KEINE Farbfläche — er ist Schwarzweiss (vierte Referenz). Ein
     weisses Rechteck auf weissem Papier wäre nur ein überflüssiger Zeichenbefehl. */
  if (V.layout !== "editorial") {
    seite.drawRectangle({ x: 0, y: 0, width: SPALTE_B, height: A4.h, color: SPALTE_GRUND });
  }
  /* DAS KOPFBAND (sechste Referenz): Die Farbe läuft oben über die GANZE Breite weiter — die
     Spalte darunter ist nur ihr unterer Teil. Der Satzspiegel rechts bekommt einen Hauch
     Grau, damit das Weiss nicht als Loch neben der Fläche steht. */
  const BAND_H = V.layout === "banner" ? 236 : 0;
  if (V.layout === "banner") {
    seite.drawRectangle({ x: SPALTE_B, y: 0, width: A4.b - SPALTE_B, height: A4.h - BAND_H, color: rgb(0.965, 0.967, 0.972) });
    seite.drawRectangle({ x: 0, y: A4.h - BAND_H, width: A4.b, height: BAND_H, color: SPALTE_GRUND });
  }

  const mischen = (f: ReturnType<typeof rgb>, ziel: number, anteil: number) =>
    rgb(f.red + (ziel - f.red) * anteil, f.green + (ziel - f.green) * anteil, f.blue + (ziel - f.blue) * anteil);

  const LX = V.layout === "editorial" ? RAND : V.layout === "banner" ? 34 : V.layout === "linie" ? 26 : 28;
  const LBREITE = V.layout === "editorial" ? SPALTE_B - RAND - 34 : SPALTE_B - LX - 26;
  let ly = A4.h - 84;

  if (V.layout === "kreis") {
    /* DER DIAGONALE ANSCHNITT OBEN — ein zweiter Ton derselben Farbe, kein zweiter Farbton:
       auf der Vollfläche etwas heller, auf der hellen Klassik-Spalte etwas dunkler. Er endet
       ÜBER dem Foto (96 pt von oben, Foto ab 104 pt); der Kreis darunter steht damit auf
       einer einfarbigen Fläche — die Rundung wird gleich durch eine Deckfläche in genau
       dieser Farbe erzeugt, und die funktioniert nur auf einem Grund. */
    const WEDGE = SPALTE_GRUND.red > 0.7 ? mischen(SPALTE_GRUND, 0, 0.06) : mischen(SPALTE_GRUND, 1, 0.13);
    seite.drawSvgPath(`M 0 0 L ${SPALTE_B} 0 L ${SPALTE_B} 34 L 0 96 Z`, { x: 0, y: A4.h, color: WEDGE, borderWidth: 0 });

    /* ── DAS RUNDE FOTO ──
       pdf-lib kann ein Bild nicht auf einen Kreis beschneiden. Also: Bild als Quadrat setzen
       und die vier Ecken mit einer Deckfläche in der Spaltenfarbe wieder zudecken. Die
       Deckfläche ist EIN Pfad aus zwei Teilen — aussen das Rechteck im Uhrzeigersinn, innen
       der Kreis GEGEN den Uhrzeigersinn. Bei gegenläufiger Richtung lässt die Füllregel den
       Kreis als Loch stehen; genau das ist der Beschnitt. */
    const FOTO_R = 54;
    const FOTO_CX = SPALTE_B / 2;
    const FOTO_OBEN = 104;                       // von der Blattoberkante
    const FOTO_CY = A4.h - FOTO_OBEN - FOTO_R;   // in PDF-Koordinaten
    if (bild) {
      /* „cover" statt „contain": Der Kreis soll gefüllt sein, nicht ein Hochformat mit Luft
         daneben. Die grössere der beiden Skalierungen gewinnt, das Bild wird mittig gesetzt
         und ragt über den Kreis hinaus — der Rest wird ohnehin zugedeckt. */
      const faktor = Math.max((FOTO_R * 2) / bild.width, (FOTO_R * 2) / bild.height);
      const fb = bild.width * faktor;
      const fh = bild.height * faktor;
      const fy = fotoY(FOTO_CY, FOTO_R * 2, fh);
      seite.drawImage(bild, { x: FOTO_CX - fb / 2, y: fy, width: fb, height: fh });

      const k = FOTO_R * 0.5523;                  // Bezier-Näherung des Kreises
      /* DIE DECKFLÄCHE MUSS DAS GANZE BILD FASSEN, NICHT NUR DEN KREIS: Beim „cover"-Zuschnitt
         ist das Bild in einer Richtung GRÖSSER als der Kreisdurchmesser — ein 3:4-Porträt ragt
         oben und unten heraus. Eine Deckfläche in Kreisgrösse liess davon zwei graue Balken
         stehen (gemessen an Oanas Muster, 28.08.2026). */
      /* Die Deckfläche folgt dem VERSCHOBENEN Bild, nicht der Kreismitte — sonst bliebe oben
         ein Streifen stehen, den sie nicht mehr erreicht. */
      const oben = fy + fh, unten = fy;
      const halbB = fb / 2 + 2;
      const x0 = FOTO_CX - halbB, x1 = FOTO_CX + halbB;
      const y0 = FOTO_CY - oben - 2, y1 = FOTO_CY - unten + 2;   // relativ zur Kreismitte, y nach unten
      const kreisGegen =
        `M ${FOTO_CX} ${-FOTO_R} ` +
        `C ${FOTO_CX - k} ${-FOTO_R} ${FOTO_CX - FOTO_R} ${-k} ${FOTO_CX - FOTO_R} 0 ` +
        `C ${FOTO_CX - FOTO_R} ${k} ${FOTO_CX - k} ${FOTO_R} ${FOTO_CX} ${FOTO_R} ` +
        `C ${FOTO_CX + k} ${FOTO_R} ${FOTO_CX + FOTO_R} ${k} ${FOTO_CX + FOTO_R} 0 ` +
        `C ${FOTO_CX + FOTO_R} ${-k} ${FOTO_CX + k} ${-FOTO_R} ${FOTO_CX} ${-FOTO_R} Z`;
      seite.drawSvgPath(
        `M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${y1} L ${x0} ${y1} Z ${kreisGegen}`,
        { x: 0, y: FOTO_CY, color: SPALTE_GRUND, borderWidth: 0 },
      );
      /* Der Ring — auf der Vollfläche hell, auf der hellen Klassik-Spalte in der Akzentfarbe;
         ein weisser Ring auf fast weissem Grund wäre keiner. */
      seite.drawCircle({
        x: FOTO_CX, y: FOTO_CY, size: FOTO_R + 2,
        /* Der Ring muss sich vom Grund abheben: auf der hellen Spalte in Tinte/Akzent, auf
           einer kräftigen Fläche weiss. Nicht `V.hell` fragen — bei den Titelblatt-Vorlagen
           ist die Spalte hier längst hell, obwohl die Vorlage als dunkel angelegt ist. */
        borderColor: SPALTE_GRUND.red > 0.7 ? AKZENT : rgb(1, 1, 1), borderWidth: 4,
      });
      ly = A4.h - (FOTO_OBEN + FOTO_R * 2 + 34);
    }
  } else if (V.layout === "banner") {
    /* ── DAS FOTO IM BAND, LINKS (sechste Referenz) ──
       Es füllt die linke Hälfte des Bandes randlos aus; rechts daneben steht der Name gross
       auf der Farbe. Kein Rahmen, kein Kreis — die Kante des Bandes IST der Rahmen. */
    if (bild) {
      const faktor = Math.max(SPALTE_B / bild.width, BAND_H / bild.height);
      const fb = bild.width * faktor, fh = bild.height * faktor;
      seite.drawImage(bild, { x: SPALTE_B / 2 - fb / 2, y: fotoY(A4.h - BAND_H / 2, BAND_H, fh), width: fb, height: fh });
      /* Überstand zudecken — pdf-lib beschneidet nicht. */
      seite.drawRectangle({ x: SPALTE_B, y: A4.h - BAND_H, width: A4.b, height: BAND_H, color: SPALTE_GRUND });
      seite.drawRectangle({ x: -A4.b, y: A4.h - BAND_H, width: A4.b, height: BAND_H, color: SPALTE_GRUND });
      seite.drawRectangle({ x: 0, y: A4.h, width: A4.b, height: 300, color: rgb(1, 1, 1) });
      seite.drawRectangle({ x: 0, y: A4.h - BAND_H - 300, width: SPALTE_B, height: 300, color: SPALTE_GRUND });
    }
    const NX = SPALTE_B + 34;
    const NB = A4.b - RAND - NX;
    let ny = A4.h - 88;
    /* Der Name in zwei Zeilen, wie in der Referenz — Vorname über Nachname, so gross wie er
       nebeneinander Platz hat. */
    for (const wort of winAnsi(profil.name || "Lebenslauf").split(/\s+/).slice(0, 3)) {
      let g = 32;
      while (g > 17 && fett.widthOfTextAtSize(wort, g) > NB) g -= 1;
      seite.drawText(wort, { x: NX, y: ny - g, size: g, font: fett, color: rgb(1, 1, 1) });
      ny -= g + 5;
    }
    if (profil.positionierung) {
      ny -= 12;
      /**
       * VERKLEINERN ALLEIN REICHT NICHT — SIE MUSS AUCH UMBRECHEN (Owner 28.08.2026, beim
       * Durchtesten aller Vorlagen mit seinen eigenen Daten: Im Kopfband stand
       * „FOUNDING PRODUCT DESIGNER — 0-TO-1 KONVERSATIONELLE AI & SCHM" und endete am
       * Blattrand).
       *
       * Die erste Fassung verengte die Schrift, bis sie in EINE Zeile passte, und gab bei
       * 6,5 pt auf — was darüber hinausging, lief einfach weiter. Bei einer Rolle von neunzig
       * Zeichen reicht kein Verkleinern mehr; ab da braucht es eine zweite Zeile.
       *
       * ZWEI ZEILEN SIND DIE GRENZE: Das Band ist 236 pt hoch und trägt darüber schon den
       * Namen. Eine dritte Zeile schöbe die Rolle aus dem Band heraus.
       */
      const rolle = winAnsi(profil.positionierung.toUpperCase());
      let rg = 10, rsp = 2.4;
      let zeilen = sperrUmbruch(rolle, normal, rg, rsp, NB);
      while (zeilen.length > 2 && rg > 6.5) {
        rg -= 0.5; rsp = Math.max(0.6, rsp - 0.12);
        zeilen = sperrUmbruch(rolle, normal, rg, rsp, NB);
      }
      zeilen.slice(0, 2).forEach((z, i) => {
        sperrSetzen(seite, z, { x: NX, y: ny - rg - i * (rg + 5), size: rg, font: normal, color: SP_TITEL, sperrung: Math.max(0.6, rsp) });
      });
    }
    ly = A4.h - BAND_H - 34;
    y = A4.h - BAND_H - 34;
  } else if (V.layout === "editorial") {
    /* ── DER EDITORIAL-KOPF (vierte Referenz) ──
       Kleines Foto links, daneben eine kräftige Linie, darunter die Rolle in gesperrten
       Versalien, eine Haarlinie, und der Name als grosse Kursiv-Serife. Ganz unten ein
       hellgrauer Balken über die volle Breite, der Kopf und Inhalt trennt.
       ES GIBT HIER KEINE FARBE — die Wirkung kommt allein aus Linienstärken und Weissraum.
       Genau deshalb sind die Masse hier fest und nicht „ungefähr": Bei einem Blatt ohne
       Farbe ist die einzige Ordnung die Geometrie. */
    const FOTO_B = 128, FOTO_H = 160, FOTO_Y = A4.h - RAND - FOTO_H;
    if (bild) {
      const faktor = Math.max(FOTO_B / bild.width, FOTO_H / bild.height);
      const fb = bild.width * faktor, fh = bild.height * faktor;
      seite.drawImage(bild, { x: RAND + FOTO_B / 2 - fb / 2, y: fotoY(FOTO_Y + FOTO_H / 2, FOTO_H, fh), width: fb, height: fh });
      /* Überstand zudecken — pdf-lib beschneidet nicht. */
      seite.drawRectangle({ x: RAND - 300, y: FOTO_Y, width: 300, height: FOTO_H, color: rgb(1, 1, 1) });
      seite.drawRectangle({ x: RAND + FOTO_B, y: FOTO_Y, width: 300, height: FOTO_H, color: rgb(1, 1, 1) });
      seite.drawRectangle({ x: RAND - 300, y: FOTO_Y + FOTO_H, width: A4.b, height: 200, color: rgb(1, 1, 1) });
      seite.drawRectangle({ x: RAND - 300, y: FOTO_Y - 200, width: A4.b, height: 200, color: rgb(1, 1, 1) });
    }
    /* ── DER KOPFBLOCK LIEGT AUF DENSELBEN KANTEN WIE DAS FOTO ──
       Owner 28.08.2026, mit Bild der vergrösserten Editorial-Vorlage: „die sind nicht auf
       einer Linie."

       Er hatte recht, und es waren zwei Fehler auf einmal:
        · OBEN: Die kräftige Linie sass 6 pt unter der Foto-Oberkante — nah genug, um wie ein
          Versehen auszusehen, weit genug, um es zu sein.
        · UNTEN: Der Name stand fest 14 pt unter der Haarlinie und endete damit irgendwo,
          während das Foto 160 pt tief lief. Zwischen Namen und Trennbalken klaffte Leere.

       Jetzt sind beide Kanten gesetzt statt gerechnet: Die kräftige Linie liegt GENAU auf der
       Foto-Oberkante, die Grundlinie des Namens GENAU auf der Foto-Unterkante. Was
       dazwischen passiert, verteilt sich — und bei einem Blatt ohne Farbe ist genau diese
       Geometrie die einzige Ordnung, die es gibt. */
    const KX = RAND + (bild ? FOTO_B + 30 : 0);
    const KB = A4.b - RAND - KX;
    const OBEN = A4.h - RAND;          // Oberkante des Fotos
    seite.drawLine({ start: { x: KX, y: OBEN }, end: { x: A4.b - RAND, y: OBEN }, thickness: 2.4, color: TINTE });
    let ky = OBEN - 22;
    if (profil.positionierung) {
      /* GESPERRTE SCHRIFT BRICHT NICHT UM — hier soll sie es auch nicht: Die Rolle ist die
         Zeile über dem Namen und gehört in EINE Zeile. Also wird sie so weit verengt, bis
         sie passt (gemessen: „Projektkoordinatorin · Verwaltung und Organisation" lief bei
         10 pt und 2,2 pt Sperrung über den Blattrand hinaus). */
      const rolle = winAnsi(profil.positionierung.toUpperCase());
      let rg = 10, rsp = 2.2;
      while (rg > 6.5 && sperrBreite(rolle, fett, rg, rsp) > KB) { rg -= 0.25; rsp -= 0.06; }
      sperrSetzen(seite, rolle, { x: KX, y: ky - rg, size: rg, font: fett, color: TINTE, sperrung: Math.max(0.6, rsp) });
      ky -= rg + 12;
    }
    /* Der Name so gross, wie die Spalte ihn trägt — nie über den Rand. Seine Grundlinie
       liegt auf der Foto-Unterkante; damit schliessen beide Blöcke auf derselben Höhe ab. */
    const name = winAnsi(profil.name || "Lebenslauf");
    let ng = 34;
    while (ng > 18 && serifKursiv.widthOfTextAtSize(name, ng) > KB) ng -= 1;
    /* DIE HAARLINIE GEHÖRT ÜBER DEN NAMEN, NICHT UNTER DIE ROLLE. Direkt unter der Rolle
       gesetzt liess sie zwischen sich und dem Namen ein Loch von neunzig Punkt stehen — der
       Name hängt ja an der Foto-Unterkante, nicht an ihr. Über den Namen gerückt trennt sie
       das, was zusammengehört, und der Weissraum liegt dort, wo er hingehört: zwischen den
       zwei Blöcken. */
    seite.drawLine({ start: { x: KX, y: FOTO_Y + ng + 14 }, end: { x: A4.b - RAND, y: FOTO_Y + ng + 14 }, thickness: 0.8, color: LINIE });
    seite.drawText(name, { x: KX, y: FOTO_Y, size: ng, font: serifKursiv, color: TINTE });

    /* Der graue Trennbalken, volle Breite. */
    const BALKEN_Y = FOTO_Y - 24;
    seite.drawRectangle({ x: RAND, y: BALKEN_Y, width: A4.b - RAND * 2, height: 13, color: rgb(0.88, 0.89, 0.91) });
    ly = BALKEN_Y - 26;
    y = BALKEN_Y - 26;
  } else if (bild) {
    /* DAS RANDLOSE FOTO (zweite Referenz): über die ganze Spaltenbreite, bündig an
       Oberkante und Seitenrand, kein Rahmen. Es IST der Kopf des Blattes — deshalb steht
       darüber auch nichts. Beschnitt per „cover", weil eine Lücke am Blattrand den ganzen
       Effekt zerstören würde. */
    const FOTO_H = 268;
    const faktor = Math.max(SPALTE_B / bild.width, FOTO_H / bild.height);
    const fb = bild.width * faktor;
    const fh = bild.height * faktor;
    /* Der Überstand wird abgedeckt statt weggerechnet — pdf-lib beschneidet nicht. Oben und
       unten deckt die Spaltenfarbe wieder zu, was über das Fotofeld hinausragt. */
    seite.drawImage(bild, { x: SPALTE_B / 2 - fb / 2, y: fotoY(A4.h - FOTO_H / 2, FOTO_H, fh), width: fb, height: fh });
    seite.drawRectangle({ x: 0, y: A4.h - FOTO_H - 400, width: SPALTE_B, height: 400, color: SPALTE_GRUND });
    if (fb > SPALTE_B) {
      seite.drawRectangle({ x: -400, y: A4.h - FOTO_H, width: 400, height: FOTO_H, color: rgb(1, 1, 1) });
      seite.drawRectangle({ x: SPALTE_B, y: A4.h - FOTO_H, width: 400, height: FOTO_H, color: rgb(1, 1, 1) });
    }
    ly = A4.h - FOTO_H - 30;
  }

  /* DIE HAARFEINE KANTE ZUM WEISS (Owner 28.08.2026: „und unser Blau finde ich gar nicht gut
     eher grau hell und eine dünne blaue linien am rand zu weiss").
     
     SIE WIRD ZULETZT GEZOGEN, NICHT ZUERST (Owner, mit Bild der vergrösserten Klassik-
     Vorlage: „die dünne blaue linie bis nach oben"). Vorher stand sie direkt nach der
     Spaltenfüllung — und der diagonale Anschnitt, der danach kommt, malte ihre oberen 96 pt
     wieder zu. Die Linie brach also genau dort ab, wo das Auge anfängt zu lesen.
     Hier unten, nach Fläche, Diagonale und Foto, läuft sie ohne Unterbrechung von der
     Ober- bis zur Unterkante. */
  if (V.randlinie) {
    seite.drawRectangle({ x: SPALTE_B - 1.6, y: 0, width: 1.6, height: A4.h, color: hexRgb(V.randlinie) });
  }

  const linksText = (t: string, o: { groesse?: number; font?: PDFFont; farbe?: ReturnType<typeof rgb>; abstand?: number; einzug?: number } = {}) => {
    const groesse = o.groesse ?? 9;
    const font = o.font ?? normal;
    const zh = groesse * 1.5;
    /* Der Einzug verschmälert die Zeile — sonst liefe „Rumänisch (Muttersprache)" um die
       Fahnenbreite über den Spaltenrand hinaus. */
    for (const zeile of umbrechen(winAnsi(t), font, groesse, LBREITE - (o.einzug ?? 0))) {
      /* Bei der deutschen Form endet die Spalte höher: Unten steht das Siegel, und Text,
         der hineinliefe, sähe aus wie ein Satzfehler. */
      if (ly - zh < (V.deutschForm ? RAND + 62 : RAND)) return;   // die schmale Spalte läuft nie um — lieber still enden
      seite.drawText(zeile, { x: LX + (o.einzug ?? 0), y: ly - groesse, size: groesse, font, color: o.farbe ?? SP_TINTE });
      ly -= zh;
    }
    ly -= o.abstand ?? 0;
  };
  /* GROSS-/KLEINSCHREIBUNG STATT VERSALIEN-KLEINSCHRIFT (erste Referenz): „Kontakt", nicht
     „K O N T A K T" in 8 pt. Die alte Fassung las sich wie eine Fussnote; die Überschrift
     ist aber der Anker, an dem das Auge die Spalte abläuft.
     Der Zeitstrahl-Aufbau macht das Gegenteil und sperrt die Versalien weit — das ist dort
     die tragende Geste, nicht Zierat. */
  const linksTitel = (t: string) => {
    ly -= 16;
    if (V.layout === "editorial") {
      sperrSetzen(seite, winAnsi(t.toUpperCase()), { x: LX, y: ly - 10.5, size: 10.5, font: fett, color: TINTE, sperrung: 2.4 });
      seite.drawLine({ start: { x: LX, y: ly - 19 }, end: { x: LX + LBREITE, y: ly - 19 }, thickness: 0.8, color: LINIE });
      ly -= 30;
    } else if (V.layout === "linie") {
      sperrSetzen(seite, winAnsi(t.toUpperCase()), { x: LX, y: ly - 11, size: 11, font: normal, color: SP_TITEL, sperrung: 2.6 });
      ly -= 22;
    } else if (V.layout === "banner") {
      seite.drawText(winAnsi(t), { x: LX, y: ly - 14, size: 14, font: fett, color: SP_TITEL });
      seite.drawLine({ start: { x: LX, y: ly - 21 }, end: { x: LX + LBREITE, y: ly - 21 }, thickness: 0.8, color: SP_TITEL, opacity: 0.4 });
      ly -= 30;
    } else {
      seite.drawText(winAnsi(t), { x: LX, y: ly - 13, size: 13, font: fett, color: SP_TITEL });
      /* DIE LINIE UNTER DER ÜBERSCHRIFT (Owner-Referenz 28.08.2026, „sowas") — sie trennt
         die Abschnitte in der Spalte sichtbar, ohne einen Zwischenraum zu kosten. Halb
         durchsichtig, damit sie auf heller wie auf dunkler Fläche funktioniert. */
      seite.drawLine({ start: { x: LX, y: ly - 19 }, end: { x: LX + LBREITE, y: ly - 19 }, thickness: 0.8, color: SP_TITEL, opacity: 0.45 });
      ly -= 28;
    }
  };
  /** Listenpunkte in der Spalte — beim Zeitstrahl-Aufbau mit Punkt, wie in der Referenz. */
  const linksPunkt = (t: string) =>
    linksText(V.layout === "kreis" ? t : `·  ${t}`, { farbe: SP_GRAU, abstand: 1.5 });

  if (kontaktZeilen.length) {
    linksTitel("Kontakt");
    for (const z of kontaktZeilen) linksText(z, { farbe: SP_GRAU, abstand: 2 });
  }
  if (profil.kompetenzen?.length) {
    linksTitel("Kompetenzen");
    for (const k of profil.kompetenzen) linksPunkt(k);
  }
  if (profil.schwerpunkte?.length) {
    linksTitel("Schwerpunkte");
    for (const sp of profil.schwerpunkte) linksPunkt(sp);
  }
  if (profil.sprachen?.length) {
    /* KEINE FÄHNCHEN MEHR (Owner 31.08.2026: „mach die Flaggen raus bei den Sprachen") —
       das Zeichen des Dokuments ist das Siegel, nicht eine Reihe kleiner Fahnen. */
    linksTitel("Sprachen");
    for (const sp of profil.sprachen) {
      linksText(sp.sprache, { font: fett, groesse: 9.5 });
      if (sp.niveau) linksText(sp.niveau, { farbe: SP_GRAU, groesse: 8.5, abstand: 3 });
      else ly -= 3;
    }
  }

  /* ── Die rechte Spalte ── */
  /* BEIM EDITORIAL- UND BEIM KOPFBAND-AUFBAU STEHT DER NAME SCHON OBEN, über beiden Spalten.
     `y` wurde dort gesetzt und darf hier nicht auf den Blattanfang zurückgeworfen werden —
     sonst schreibt der Profiltext quer über den Namen (gemessen an Oanas Muster,
     28.08.2026: Band, Name und „Profil" lagen übereinander). */
  if (V.layout !== "editorial" && V.layout !== "banner") y = A4.h - 68;
  if (V.layout === "editorial" || V.layout === "banner") {
    /* nichts — Name und Rolle stehen im Kopf */
  } else if (V.layout === "linie") {
    /* DER NAME GESPERRT UND LEICHT (zweite Referenz): grosse, weit gestellte Versalien in
       der normalen statt der fetten Schrift. Er bricht am Leerzeichen um, damit Vor- und
       Nachname wie in der Vorlage untereinander stehen, wenn sie nicht nebeneinander
       passen. */
    /* GESPERRTE SCHRIFT BRICHT NICHT VON ALLEIN UM: `umbrechen` misst mit
       `font.widthOfTextAtSize`, kennt die Laufweite also nicht — der Untertitel lief damit
       über den Blattrand hinaus (gemessen an Oanas Muster, 28.08.2026). Deshalb hier ein
       eigener Umbruch, der `sperrBreite` benutzt. */
    const sperrZeilen = (t: string, groesse: number, sperrung: number) => {
      const zeilen: string[] = [];
      for (const w of winAnsi(t.toUpperCase()).split(/\s+/).filter(Boolean)) {
        const probe = zeilen.length ? `${zeilen[zeilen.length - 1]} ${w}` : w;
        if (zeilen.length && sperrBreite(probe, normal, groesse, sperrung) <= RECHTS_BREITE()) zeilen[zeilen.length - 1] = probe;
        else zeilen.push(w);
      }
      return zeilen;
    };
    for (const z of sperrZeilen(profil.name || "Lebenslauf", 26, 4.2)) {
      sperrSetzen(seite, z, { x: RECHTS_X(), y: y - 26, size: 26, font: normal, color: TINTE, sperrung: 4.2 });
      y -= 33;
    }
    if (profil.positionierung) {
      for (const z of sperrZeilen(profil.positionierung, 10, 1.8)) {
        sperrSetzen(seite, z, { x: RECHTS_X(), y: y - 10, size: 10, font: normal, color: GRAU, sperrung: 1.8 });
        y -= 16;
      }
      y -= 8;
    } else y -= 6;
  } else {
    text((profil.name || "Lebenslauf").toUpperCase(), { groesse: 23, font: fett, abstand: 1 });
    if (profil.positionierung) text(profil.positionierung, { groesse: 12, farbe: GRAU, abstand: 6 });
    else y -= 6;
  }

  if (profil.sprechtext) { abschnitt("Profil"); text(profil.sprechtext, { farbe: GRAU, zeilenfaktor: 1.55, abstand: 4 }); }

  if (profil.erfahrung?.length) {
    abschnitt("Berufserfahrung");
    if (V.deutschForm) {
      /**
       * DIE ZEITSPALTE — DIE DEUTSCHE FORM (Owner 31.08.2026: „und deutsches Design und
       * Formatierung?" · „ich weiss was die Deutschen wollen, ich habe 30 Jahre in DE als
       * Designer gearbeitet").
       *
       * Der tabellarische Lebenslauf hat links den Zeitraum und rechts die Station — beide
       * auf DERSELBEN Grundlinie, damit das Auge die Jahre in einer Flucht abwärts liest.
       * Genau das ist der Unterschied zur Zeitachse mit Punkten, die hier vorher stand: Die
       * sieht modern aus, aber man kann die Jahre nicht überfliegen.
       *
       * ZUERST DER ZEITRAUM, DANN DER INHALT — und der Zeitraum wird auf der Höhe gemerkt,
       * die VOR dem Inhalt galt: Rutscht ein Eintrag auf die nächste Seite, stünde die
       * Jahreszahl sonst allein am Fuss der vorigen.
       */
      const ZEIT_B = 82;
      const IX = RECHTS_X() + ZEIT_B + 10;
      const IB = A4.b - RAND - IX;
      for (const e of profil.erfahrung) {
        platz(46);
        const yOben = y;
        text(e.rolle, { groesse: 10.5, font: fett, x: IX, maxBreite: IB, abstand: 2 });
        if (e.firma) text(e.firma, { groesse: 9.5, farbe: GRAU, x: IX, maxBreite: IB, abstand: 3 });
        if (e.ergebnis) text(e.ergebnis, { groesse: 9.5, farbe: GRAU, x: IX, maxBreite: IB, zeilenfaktor: 1.45, abstand: 12 });
        else y -= 12;
        if (y < yOben && e.zeitraum) {
          /* Der Zeitraum bricht bei Bedarf um („09/2019 –" / „08/2021"), damit er die
             Spalte nie sprengt. */
          umbrechen(winAnsi(e.zeitraum), normal, 9, ZEIT_B).slice(0, 2).forEach((z, i) => {
            seite.drawText(z, { x: RECHTS_X(), y: yOben - 10 - i * 12, size: 9, font: normal, color: GRAU });
          });
        }
      }
    } else if (V.layout === "banner") {
      /* Jahr links, Firma fett daneben, darunter die Rolle und der Satz (sechste Referenz).
         Das Jahr steht dabei in EINER Zeile — die Spalte ist hier breit genug dafür. */
      const JAHR_B = 66;
      const IX = RECHTS_X() + JAHR_B;
      const IB = A4.b - RAND - IX;
      for (const e of profil.erfahrung) {
        platz(44);
        const yOben = y;
        if (e.firma) text(e.firma, { groesse: 10, font: fett, x: IX, maxBreite: IB, abstand: 1 });
        text(e.rolle, { groesse: 10, font: fett, farbe: GRAU, x: IX, maxBreite: IB, abstand: 3 });
        if (e.ergebnis) text(e.ergebnis, { groesse: 9.5, farbe: GRAU, x: IX, maxBreite: IB, zeilenfaktor: 1.45, abstand: 12 });
        else y -= 12;
        if (y < yOben && e.zeitraum) {
          seite.drawText(winAnsi(e.zeitraum), { x: RECHTS_X(), y: yOben - 10, size: 9, font: normal, color: GRAU });
        }
      }
    } else if (V.layout === "editorial") {
      /* DER WERDEGANG NÜCHTERN (vierte Referenz): Firma als kleine Kursiv-Serife, darunter
         die Rolle in gesperrten Versalien, darunter der Satz. Keine Linie, kein Punkt, kein
         Balken — die Ordnung macht allein der Wechsel der Schriften. */
      const BREITE = A4.b - RAND - RECHTS_X();
      for (const e of profil.erfahrung) {
        platz(46);
        const zeile = [e.firma, e.zeitraum].filter(Boolean).join("  ·  ");
        if (zeile) text(zeile, { groesse: 10, font: serifKursiv, farbe: GRAU, maxBreite: BREITE, abstand: 2 });
        sperrSetzen(seite, winAnsi(e.rolle.toUpperCase()), { x: RECHTS_X(), y: y - 10, size: 10, font: fett, color: TINTE, sperrung: 1.6 });
        y -= 20;
        if (e.ergebnis) text(e.ergebnis, { groesse: 9.5, farbe: GRAU, maxBreite: BREITE, zeilenfaktor: 1.5, abstand: 14 });
        else y -= 14;
      }
    } else if (V.layout === "linie") {
      /* DER ZEITSTRAHL (zweite Referenz): eine durchgehende senkrechte Linie, an der jede
         Station einen offenen Punkt bekommt. Sie wird ERST AM ENDE gezogen — ihre Länge
         steht erst fest, wenn der letzte Eintrag gesetzt ist.
         DIE PUNKTE WERDEN GESAMMELT, NICHT SOFORT GEZEICHNET: Ein Eintrag kann auf die
         nächste Seite rutschen; dann gehört auch sein Punkt dorthin, und die Linie der
         ersten Seite darf nicht bis zum Blattende weiterlaufen. */
      const STRAHL_X = RECHTS_X() + 5;
      const INHALT_X = STRAHL_X + 20;
      const INHALT_B = A4.b - RAND - INHALT_X;
      let strahlSeite = seite;
      let strahlVon = y - 2;
      const punkte: { s: PDFPage; y: number }[] = [];
      const strahlZiehen = (bis: number) => {
        if (strahlVon - bis > 4) {
          strahlSeite.drawLine({ start: { x: STRAHL_X, y: strahlVon }, end: { x: STRAHL_X, y: bis }, thickness: 1, color: AKZENT });
        }
      };
      for (const e of profil.erfahrung) {
        const vorher = seite;
        platz(48);
        if (seite !== vorher) {           // Seitenwechsel: die Linie der alten Seite endet hier
          strahlZiehen(RAND + 20);
          strahlSeite = seite; strahlVon = y - 2;
        }
        punkte.push({ s: seite, y: y - 8 });
        text(e.rolle.toUpperCase(), { groesse: 10.5, font: fett, x: INHALT_X, maxBreite: INHALT_B, abstand: 1 });
        const unterzeile = [e.firma, e.zeitraum].filter(Boolean).join("\n");
        if (unterzeile) text(unterzeile, { groesse: 9.5, farbe: GRAU, x: INHALT_X, maxBreite: INHALT_B, zeilenfaktor: 1.35, abstand: 5 });
        if (e.ergebnis) text(`·  ${e.ergebnis}`, { groesse: 9.5, farbe: GRAU, x: INHALT_X, maxBreite: INHALT_B, zeilenfaktor: 1.45, abstand: 12 });
        else y -= 12;
      }
      strahlZiehen(y + 8);
      /* Die Punkte zuletzt — sie liegen AUF der Linie und müssen sie überdecken. */
      for (const pkt of punkte) {
        pkt.s.drawCircle({ x: STRAHL_X, y: pkt.y, size: 3.4, color: rgb(1, 1, 1), borderColor: AKZENT, borderWidth: 1.4 });
      }
    } else {
      /* DER ZEITRAUM IN EIGENER SPALTE, MIT SENKRECHTER LINIE (erste Referenz). Vorher stand
         er rechtsbündig am Blattrand — dort liest ihn niemand mit, weil das Auge am Anfang
         der Zeile klebt. Links davor ist er Teil der Zeile, die man ohnehin liest.
         Er wird am Bindestrich UMGEBROCHEN („2021" über „heute"), weil die Spalte für
         „2021–heute" in einer Zeile zu schmal ist — die Referenz macht es genauso. */
      const JAHR_B = 38;
      const LINIE_X = RECHTS_X() + JAHR_B + 8;
      const INHALT_X = LINIE_X + 12;
      const INHALT_B = A4.b - RAND - INHALT_X;
      for (const e of profil.erfahrung) {
        platz(46);
        const yOben = y;
        /* Erst der Inhalt — er bestimmt, wie lang die Linie wird. */
        text(e.rolle, { groesse: 11, font: fett, x: INHALT_X, maxBreite: INHALT_B, abstand: 0 });
        if (e.firma) text(e.firma, { groesse: 9.5, farbe: AKZENT, x: INHALT_X, maxBreite: INHALT_B, abstand: 3 });
        if (e.ergebnis) text(`·  ${e.ergebnis}`, { groesse: 9.5, farbe: GRAU, x: INHALT_X, maxBreite: INHALT_B, zeilenfaktor: 1.45, abstand: 10 });
        else y -= 10;
        /* Jahre und Linie nur, wenn der Eintrag NICHT auf die nächste Seite gerutscht ist —
           sonst zöge die Linie über eine Stelle, an der gar kein Eintrag mehr steht. */
        if (y < yOben) {
          const teile = winAnsi(e.zeitraum ?? "").split(/\s*[–—-]\s*/).filter(Boolean).slice(0, 2);
          teile.forEach((t, i) => {
            const w = fett.widthOfTextAtSize(t, 8.5);
            seite.drawText(t, { x: RECHTS_X() + JAHR_B - w, y: yOben - 11 - i * 12, size: 8.5, font: fett, color: HELL });
          });
          seite.drawLine({ start: { x: LINIE_X, y: yOben - 2 }, end: { x: LINIE_X, y: y + 6 }, thickness: 1, color: LINIE });
        }
      }
    }
  }
  if (profil.ausbildung?.length) {
    abschnitt("Ausbildung");
    for (const a of profil.ausbildung) {
      platz(28);
      if (V.deutschForm) {
        /* Dieselbe Spalte wie beim Werdegang — sonst stünden Ausbildung und Erfahrung in
           zwei verschiedenen Rastern auf einem Blatt. */
        const ZEIT_B = 82;
        const IX = RECHTS_X() + ZEIT_B + 10;
        const IB = A4.b - RAND - IX;
        const yOben = y;
        text(a.titel, { groesse: 10, font: fett, x: IX, maxBreite: IB, abstand: 2 });
        if (a.ort) text(a.ort, { groesse: 9.5, farbe: GRAU, x: IX, maxBreite: IB, abstand: 10 });
        else y -= 10;
        if (y < yOben && a.zeitraum) {
          seite.drawText(winAnsi(a.zeitraum), { x: RECHTS_X(), y: yOben - 10, size: 9, font: normal, color: GRAU });
        }
      } else if (V.layout === "editorial") {
        sperrSetzen(seite, winAnsi(a.titel.toUpperCase()), { x: RECHTS_X(), y: y - 10, size: 10, font: fett, color: TINTE, sperrung: 1.6 });
        y -= 18;
        const z = [a.ort, a.zeitraum].filter(Boolean).join("  ·  ");
        if (z) text(z, { groesse: 10, font: serifKursiv, farbe: GRAU, abstand: 10 });
        else y -= 10;
      } else {
        text(V.layout === "linie" ? a.titel.toUpperCase() : a.titel, { groesse: 11, font: fett, abstand: 0 });
        const zeile = [a.ort, a.zeitraum].filter(Boolean).join("  ·  ");
        if (zeile) text(zeile, { groesse: 9.5, farbe: GRAU, abstand: 8 });
        else y -= 8;
      }
    }
  }

  /**
   * ════ DAS SIEGEL ════
   *
   * Owner 31.08.2026: „deswegen würde ich eine Flagge einbauen wie ein Siegeszeichen.
   * Deutsches Design." — Er hat 30 Jahre als Designer in Deutschland gearbeitet; die
   * Entscheidung ist seine. Ich hatte davon abgeraten, weil eine Fahne auf einem Lebenslauf
   * als Herkunftsbehauptung gelesen werden kann. Als BAND am Fuss der Spalte, ohne Wort und
   * ohne Wappen, ist es eine Marke des Dokuments — keine Aussage über den Menschen.
   *
   * Gezeichnet aus vier Formen: drei Streifen und eine Kerbe, die aus der Fahne einen Wimpel
   * macht. Kein eingebettetes Bild, keine Schriftart, keine Lizenzfrage.
   *
   * NUR AUF DER ERSTEN SEITE: Auf jeder Folgeseite wäre es Dekoration.
   */
  if (V.deutschForm) {
    const erste = lebenslaufSeite;
    /**
     * DAS SIEGEL DES OWNERS (31.08.2026: „deswegen würde ich eine Flagge einbauen wie ein
     * Siegeszeichen. Deutsches Design." — die Gestaltung ist seine, aus `public/Lebenslauf`).
     *
     * ES WIRD EINGEBETTET, NICHT GEZEICHNET: Der gezeichnete Wimpel davor war ein Notbehelf,
     * solange die Datei fehlte. Transparente Ecken (geprüft: Alpha 0) — es sitzt damit auf
     * der grauen Spalte wie auf weissem Papier.
     *
     * SCHEITERT DAS LADEN, GIBT ES KEIN PDF WENIGER: Ein fehlendes Siegel ist ein
     * Schönheitsfehler, ein Abbruch wäre ein verlorener Kunde.
     */
    /* VON DER PLATTE, NICHT ÜBER DAS NETZ: Die Datei liegt im eigenen `public`-Ordner. Ein
       HTTP-Aufruf an die eigene Adresse bräuchte den Ursprung, wäre langsamer und fiele beim
       ersten Netzhusten aus. */
    try {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const bytes = await readFile(join(process.cwd(), "public", "Lebenslauf", "siegel-deutsch.png"));
      const sg = await dok.embedPng(new Uint8Array(bytes));
      const B = 62;
      erste.drawImage(sg, { x: 20, y: RAND + 8, width: B, height: B });
    } catch { /* ohne Siegel, aber mit Lebenslauf */ }
  }

  /**
   * ════ ORT UND DATUM — DIE DEUTSCHE SCHLUSSZEILE ════
   *
   * Owner 31.08.2026: „und deutsches Design und Formatierung?" — beim tabellarischen
   * Lebenslauf steht am Fuss der letzten Seite Ort und Datum, darüber Platz für die
   * Unterschrift.
   *
   * DIE UNTERSCHRIFT SETZEN WIR NICHT. Sie zu erfinden wäre eine Fälschung; der Platz
   * darüber bleibt deshalb frei, damit sie von Hand oder digital daraufkann.
   *
   * NUR BEI `deutschForm` — die anderen fünf Vorlagen sind internationale Layouts, dort wäre
   * die Zeile ein Fremdkörper.
   */
  if (V.deutschForm) {
    const heute = new Date();
    const datum = `${String(heute.getDate()).padStart(2, "0")}.${String(heute.getMonth() + 1).padStart(2, "0")}.${heute.getFullYear()}`;
    const zeile = winAnsi([profil.ort, datum].filter(Boolean).join(", "));
    /* Sie gehört auf die LETZTE Seite und unter den Inhalt. Ist dort kein Platz mehr, bekommt
       sie eine eigene — eine Schlusszeile, die neben dem letzten Absatz klebt, sieht aus wie
       ein Versehen. */
    if (y - 74 < RAND + 40) neueSeite();
    const zy = Math.max(RAND + 52, y - 58);
    seite.drawText(zeile, { x: RECHTS_X(), y: zy, size: 9.5, font: normal, color: GRAU });
    /* Die Linie für die Unterschrift, darüber Luft. */
    seite.drawLine({
      start: { x: RECHTS_X(), y: zy - 30 }, end: { x: RECHTS_X() + 190, y: zy - 30 },
      thickness: 0.6, color: LINIE,
    });
  }

  /* ════ WASSERZEICHEN + FUSSZEILE — auf jeder Seite, erst am Ende ════ */
  const alleSeiten = dok.getPages();
  alleSeiten.forEach((s, i) => {
    if (opt.wasserzeichen) {
      const wz = "MUSTER · luxurybandit.com";
      const wzGroesse = 40;
      const wzBreite = fett.widthOfTextAtSize(wz, wzGroesse);
      s.drawText(wz, {
        x: A4.b / 2 - wzBreite / 2 + 66, y: A4.h / 2 - 150,
        size: wzGroesse, font: fett, color: rgb(0.6, 0.61, 0.65), opacity: 0.14, rotate: degrees(45),
      });
      s.drawText(winAnsi("Muster-Fassung — die Vollversion ohne Wasserzeichen gibt es auf luxurybandit.com"), {
        x: RAND, y: 28, size: 7.5, font: normal, color: HELL,
      });
    }
    const nummer = `${i + 1} / ${alleSeiten.length}`;
    s.drawText(nummer, { x: A4.b - RAND - normal.widthOfTextAtSize(nummer, 8), y: 28, size: 8, font: normal, color: HELL });
  });

  return dok.save();
}
