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
const AKZENT = rgb(0.12, 0.29, 0.55);          // gedecktes Marineblau — seriös, druckbar
const SPALTE_GRUND = rgb(0.955, 0.958, 0.968); // die getönte linke Spalte
const LINIE = rgb(0.86, 0.87, 0.89);

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

export type PdfFoto = { bytes: Uint8Array; typ: "jpg" | "png" } | null;

export async function bewerbungAlsPdf(
  profil: LebenslaufProfil,
  opt: { wasserzeichen: boolean; foto?: PdfFoto },
): Promise<Uint8Array> {
  const dok = await PDFDocument.create();
  const normal = await dok.embedFont(StandardFonts.Helvetica);
  const fett = await dok.embedFont(StandardFonts.HelveticaBold);

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
  const RECHTS_X = () => (vollbreiteFortsetzung ? RAND : 232);
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
  /** Abschnitts-Titel: Versalien + kurze Akzentlinie darunter. */
  const abschnitt = (titel: string) => {
    y -= 10; platz(34);
    const x = RECHTS_X();
    seite.drawText(winAnsi(titel.toUpperCase()), { x, y: y - 9, size: 9.5, font: fett, color: AKZENT });
    seite.drawLine({ start: { x, y: y - 14 }, end: { x: x + 26, y: y - 14 }, thickness: 1.6, color: AKZENT });
    y -= 24;
  };

  const kontaktZeilen = [profil.ort, profil.telefon, profil.email].filter(Boolean) as string[];

  /* ════ SEITE 1 — DAS ANSCHREIBEN (Brief-Look, volle Breite) ════ */
  vollbreiteFortsetzung = true;
  /* Kopf: Name links, Kontakt rechtsbündig in Kleinschrift — wie ein Briefkopf. */
  seite.drawText(winAnsi(profil.name || "Bewerbung"), { x: RAND, y: y - 19, size: 19, font: fett, color: TINTE });
  if (profil.positionierung) {
    seite.drawText(winAnsi(profil.positionierung), { x: RAND, y: y - 36, size: 10.5, font: normal, color: AKZENT });
  }
  kontaktZeilen.forEach((z, i) => {
    const w = normal.widthOfTextAtSize(winAnsi(z), 8.5);
    seite.drawText(winAnsi(z), { x: A4.b - RAND - w, y: y - 12 - i * 12, size: 8.5, font: normal, color: GRAU });
  });
  y -= 52;
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

  /* ════ AB SEITE 2 — DER LEBENSLAUF (zweispaltig) ════ */
  vollbreiteFortsetzung = false;
  neueSeite();

  /* Die linke Spalte: getönter Grund über die ganze Höhe, eigener Cursor. */
  const SPALTE_B = 178;
  seite.drawRectangle({ x: 0, y: 0, width: SPALTE_B + RAND - 18, height: A4.h, color: SPALTE_GRUND });
  const LX = RAND - 14;
  const LBREITE = SPALTE_B - 8;
  let ly = A4.h - RAND;

  const linksText = (t: string, o: { groesse?: number; font?: PDFFont; farbe?: ReturnType<typeof rgb>; abstand?: number } = {}) => {
    const groesse = o.groesse ?? 9;
    const font = o.font ?? normal;
    const zh = groesse * 1.5;
    for (const zeile of umbrechen(winAnsi(t), font, groesse, LBREITE)) {
      if (ly - zh < RAND) return;   // die schmale Spalte läuft nie um — lieber still enden
      seite.drawText(zeile, { x: LX, y: ly - groesse, size: groesse, font, color: o.farbe ?? TINTE });
      ly -= zh;
    }
    ly -= o.abstand ?? 0;
  };
  const linksTitel = (t: string) => {
    ly -= 14;
    seite.drawText(winAnsi(t.toUpperCase()), { x: LX, y: ly - 9, size: 8.5, font: fett, color: AKZENT });
    seite.drawLine({ start: { x: LX, y: ly - 14 }, end: { x: LX + 22, y: ly - 14 }, thickness: 1.4, color: AKZENT });
    ly -= 24;
  };

  /* Foto oben in der Spalte — leicht größer als die Spaltenschrift, mit Luft.
     SEITENVERHÄLTNIS BLEIBT ERHALTEN (Owner-Fund 26.08.2026: „Das Bild ist zerquetscht.
     Ich habe ein 3:4 Format hochgeladen.") — vorher stand hier eine feste Breite mit einer
     bei 150pt GEKAPPTEN Höhe, ohne die Breite mitzuskalieren: Ein Hochformat-Foto wurde
     dadurch in die Breite gequetscht. Jetzt ein echtes „contain": die kleinere der beiden
     Skalierungen (nach Breite ODER Höhe) gewinnt, beide Seiten skalieren gemeinsam. */
  if (bild) {
    const fotoMaxB = LBREITE;
    const fotoMaxH = 220;
    const faktor = Math.min(fotoMaxB / bild.width, fotoMaxH / bild.height);
    const fb = bild.width * faktor;
    const fh = bild.height * faktor;
    seite.drawImage(bild, { x: LX, y: ly - fh, width: fb, height: fh });
    ly -= fh + 6;
  }

  if (kontaktZeilen.length) {
    linksTitel("Kontakt");
    for (const z of kontaktZeilen) linksText(z, { farbe: GRAU, abstand: 2 });
  }
  if (profil.sprachen?.length) {
    linksTitel("Sprachen");
    for (const s of profil.sprachen) {
      linksText(s.sprache, { font: fett, groesse: 9 });
      if (s.niveau) linksText(s.niveau, { farbe: GRAU, groesse: 8.5, abstand: 3 });
      else ly -= 3;
    }
  }
  if (profil.kompetenzen?.length) {
    linksTitel("Kompetenzen");
    for (const k of profil.kompetenzen) linksText(`·  ${k}`, { abstand: 1.5 });
  }
  if (profil.schwerpunkte?.length) {
    linksTitel("Schwerpunkte");
    for (const s of profil.schwerpunkte) linksText(`·  ${s}`, { abstand: 1.5 });
  }

  /* Die rechte Spalte: Name als Kopf, dann Profil / Erfahrung / Ausbildung. */
  text(profil.name || "Lebenslauf", { groesse: 21, font: fett, abstand: 1 });
  if (profil.positionierung) text(profil.positionierung, { groesse: 11, farbe: AKZENT, abstand: 8 });
  else y -= 8;

  if (profil.sprechtext) { abschnitt("Profil"); text(profil.sprechtext, { farbe: GRAU, zeilenfaktor: 1.5, abstand: 2 }); }

  if (profil.erfahrung?.length) {
    abschnitt("Berufserfahrung");
    for (const e of profil.erfahrung) {
      platz(34);
      const zeitraum = winAnsi(e.zeitraum ?? "");
      const zw = normal.widthOfTextAtSize(zeitraum, 8.5);
      const yVor = y;
      text(e.rolle, { groesse: 10.5, font: fett, maxBreite: RECHTS_BREITE() - zw - 10, abstand: 0 });
      if (zeitraum && y < yVor) {   // Zeitraum auf Höhe der ersten Rollen-Zeile
        seite.drawText(zeitraum, { x: A4.b - RAND - zw, y: yVor - 10.5, size: 8.5, font: normal, color: HELL });
      }
      if (e.firma) text(e.firma, { groesse: 9, farbe: AKZENT, abstand: 1 });
      if (e.ergebnis) text(e.ergebnis, { groesse: 9.5, farbe: GRAU, zeilenfaktor: 1.42, abstand: 7 });
      else y -= 7;
    }
  }
  if (profil.ausbildung?.length) {
    abschnitt("Ausbildung");
    for (const a of profil.ausbildung) {
      platz(26);
      text(a.titel, { groesse: 10.5, font: fett, abstand: 0 });
      const zeile = [a.ort, a.zeitraum].filter(Boolean).join("  ·  ");
      if (zeile) text(zeile, { groesse: 9, farbe: GRAU, abstand: 6 });
      else y -= 6;
    }
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
