import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import fontkit from "@pdf-lib/fontkit";
import { POSTER, POSTER_FORMATE, POSTER_HOCHKANT, posterHochkant } from "@/lib/lakatosbandi-poster";
import type { DruckAngaben } from "@/lib/lakatosbandi-druckdatei";
import { werkMessen } from "@/lib/lakatosbandi-feldschnitt";

/**
 * DAS BLATT ALS BILD (Owner 19.09.2026: „ich denke, dass JPGs sogar besser sind" · „als Datei
 * und nicht PDFs" · „stell dir vor, ich bin als Künstler auf einer Hochzeit eingeladen, ich will
 * sofort Poster erstellen und drucken").
 *
 * ── WARUM NICHT NUR PDF ─────────────────────────────────────────────────────────────────────
 *
 * Ich hatte fürs PDF argumentiert: Die Schrift liegt darin als Vektor und ist in jeder Grösse
 * scharf. Für seinen Fall zählt das nicht. Wer auf einer Hochzeit steht und in zehn Minuten ein
 * Poster in der Hand haben will, geht zum nächsten Fotodienst — und der nimmt JPG, kein PDF.
 * Dasselbe gilt für Instagram, für WhatsApp und für die meisten Online-Druckdienste.
 *
 * Das PDF bleibt: Eine Druckerei, die A1 auf Leinwand zieht, will es. Das Bild kommt DANEBEN.
 *
 * ── DIE SCHRIFT ALS UMRISS, NICHT ALS SCHRIFTART (gemessen 19.09.2026) ──────────────────────
 *
 * Der nächstliegende Weg wäre SVG-Text mit `@font-face` und der Schriftdatei als Daten-URL.
 * GEMESSEN: `sharp` rendert das in einer serifenlosen Ersatzschrift — die eingebettete Schrift
 * wird stillschweigend ignoriert, und das Blatt sähe anders aus als das gedruckte.
 *
 * Deshalb werden die Buchstaben mit `fontkit` in UMRISSE verwandelt (`glyph.path.toSVG()`) und
 * als Pfade gezeichnet. Dann braucht der Renderer gar keine Schrift: Es sind Formen. Und es ist
 * BUCHSTÄBLICH dieselbe Datei, die das PDF einbettet — gleiche Zeichenbreiten, gleiche Form.
 *
 * ── DER ZWILLING ────────────────────────────────────────────────────────────────────────────
 *
 * Der Aufbau ist derselbe wie in `lib/lakatosbandi-druckdatei.ts`: Papier, Rahmen, Werk mittig
 * im Feld, Textblock von unten, Code neben der Adresse. Beide holen ihre Masse aus `POSTER` —
 * was dort steht, gilt für beide.
 *
 *   ⚠ ÄNDERT SICH DIE REIHENFOLGE DER ZEILEN oder ihr Abstand, muss es HIER UND DORT geändert
 *     werden. Sonst druckt die Druckerei ein anderes Blatt, als der Kunde heruntergeladen hat.
 *
 * ── ES KOSTET NICHTS ────────────────────────────────────────────────────────────────────────
 *
 * Kein Modell, kein Anbieter, keine Abrechnung — nur Rechenzeit. Dieselbe Datei kann beliebig
 * oft gebaut werden.
 */

/** Millimeter → Punkt, wie im PDF. Die ganze Rechnung läuft in Punkt und wird am Ende skaliert. */
const MM = 2.83465;

/* Anteil der Blattbreite in Prozent → Punkt. Wortgleich mit `teil` in der Druckdatei; die eine
   Zeile hier zu haben ist billiger, als sie dort zu exportieren und zwei Dateien zu koppeln. */
const teil = (breiteP: number, anteil: number) => (anteil / 100) * breiteP;

type Schrift = ReturnType<typeof fontkit.create>;

/** Ein Textlauf als SVG-Pfad: Buchstaben als Umrisse, Grundlinie bei `y`, Beginn bei `x`. */
function textPfad(font: Schrift, text: string, groesse: number, x: number, y: number, sperre = 0): string {
  const lauf = font.layout(String(text ?? ""));
  const e = groesse / font.unitsPerEm;
  let stift = x;
  const teile: string[] = [];
  lauf.glyphs.forEach((g, i) => {
    const d = g.path.toSVG();
    /* Leerzeichen und andere Glyphen ohne Umriss liefern einen leeren Pfad. */
    if (d) teile.push(`<path d="${d}" transform="translate(${stift.toFixed(2)} ${y.toFixed(2)}) scale(${e.toFixed(5)} ${(-e).toFixed(5)})"/>`);
    stift += lauf.positions[i].xAdvance * e + sperre;
  });
  return teile.join("");
}

/** Wie breit ein Lauf wird — dieselbe Rechnung wie beim Zeichnen, damit Mitte auch Mitte ist. */
function textBreite(font: Schrift, text: string, groesse: number, sperre = 0): number {
  const lauf = font.layout(String(text ?? ""));
  const e = groesse / font.unitsPerEm;
  const b = lauf.positions.reduce((s, p) => s + p.xAdvance * e, 0);
  return b + sperre * Math.max(0, lauf.glyphs.length - 1);
}

/** Umbruch an echten Zeichenbreiten — das Gegenstück zu `umbrechen` in der Druckdatei. */
function umbrechen(text: string, font: Schrift, groesse: number, breite: number): string[] {
  const woerter = String(text ?? "").split(/\s+/).filter(Boolean);
  const zeilen: string[] = [];
  let jetzt = "";
  for (const w of woerter) {
    const versuch = jetzt ? `${jetzt} ${w}` : w;
    if (textBreite(font, versuch, groesse) <= breite || !jetzt) jetzt = versuch;
    else { zeilen.push(jetzt); jetzt = w; }
  }
  if (jetzt) zeilen.push(jetzt);
  return zeilen;
}

/**
 * Das fertige Blatt als JPEG.
 *
 * `dpi` bestimmt die Kantenlänge. 150 dpi ist der Druckpunkt für Fotodienste und Drogeriemärkte;
 * mehr bringt nichts, solange die Bildquelle 1024 px breit ist (siehe die Rechnung im Gespräch
 * vom 19.09.2026: A3 bei 1024 px sind rund 100 dpi).
 */
export async function blattBildBauen(a: DruckAngaben & { dpi?: number }): Promise<Uint8Array> {
  const sharp = (await import("sharp")).default;
  const P = POSTER;
  const f = P.farben;
  const fmt = POSTER_FORMATE[a.format ?? "A3"];
  const B = fmt.breite * MM;
  const H = fmt.hoehe * MM;
  const cqw = (v: number) => teil(B, v);

  const dpi = Math.max(72, Math.min(300, Math.round(a.dpi ?? 150)));
  /* Punkt → Bildpunkt. Ein Punkt ist 1/72 Zoll. */
  const S = dpi / 72;
  const pxB = Math.round(B * S);
  const pxH = Math.round(H * S);

  const schriftOrt = path.join(process.cwd(), "public", "fonts");
  const [roh, rohKursiv] = await Promise.all([
    readFile(path.join(schriftOrt, "CrimsonText.ttf")),
    readFile(path.join(schriftOrt, "CrimsonText-Italic.ttf")),
  ]);
  const serif = fontkit.create(roh);
  const kursiv = fontkit.create(rohKursiv);

  /* ── Rahmen und Ränder — dieselben Zahlen wie im PDF ──────────────────────────────────── */
  const leiste = a.rahmen ? cqw(P.rahmen.breit) : 0;
  const leisteUnten = a.rahmen ? cqw(P.rahmen.breitUnten) : 0;
  const randX = leiste + cqw(P.rand);
  const innen = B - 2 * randX;
  const mitte = B / 2;
  const obenY = H - leiste - cqw(P.randOben);
  let untenY = leisteUnten + cqw(P.randUnten);

  /* ── Der Textblock wird zuerst gemessen, damit er unten kleben kann ───────────────────── */
  type Zeile = { art: "text" | "sperr" | "qr"; inhalt: string; font: Schrift; groesse: number; farbe: string; sperre: number; danach: number; satz?: boolean; rolle?: "titel" | "stil" | "recht" };
  const zeilen: Zeile[] = [];
  const nameGroesse = cqw(P.name.breit);
  const nameText = a.leben ? `${a.name ?? ""}   ${a.leben}` : (a.name ?? "");
  if (a.name) zeilen.push({ art: "sperr", inhalt: nameText, font: serif, groesse: nameGroesse, farbe: f.tinte, sperre: nameGroesse * P.name.sperre, danach: cqw(P.luft), rolle: "stil" });
  if (a.titel) zeilen.push({ art: "text", inhalt: a.titel, font: kursiv, groesse: cqw(P.titel.breit), farbe: f.tinte, sperre: 0, danach: cqw(P.titel.luftUnten), rolle: "titel" });
  if (a.text) {
    const gross = cqw(P.text.breit);
    const klein = cqw(1.45);
    let g = gross;
    let teile = umbrechen(a.text, serif, g, innen);
    while (teile.length > 2 && g > klein) {
      g = Math.max(klein, g - gross * 0.04);
      teile = umbrechen(a.text, serif, g, innen);
    }
    teile.forEach((z, i) => zeilen.push({ art: "text", inhalt: z, font: serif, groesse: g, farbe: f.tinte, sperre: 0, satz: true, danach: i === teile.length - 1 ? cqw(P.qr.luft) : g * (P.text.zeile - 1) }));
  }
  if (a.recht) zeilen.push({ art: a.qrZiel ? "qr" : "text", inhalt: a.recht, font: serif, groesse: cqw(P.recht.breit), farbe: f.leise, sperre: 0, danach: cqw(P.luft) * 0.4, rolle: "recht" });
  if (a.nummer) zeilen.push({ art: "text", inhalt: `Licență ${a.nummer} · uz personal`, font: serif, groesse: cqw(P.recht.breit), farbe: f.leise, sperre: 0, danach: 0, rolle: "recht" });


  /**
   * ── DER CODE IST HÖHER ALS SEINE ZEILE (Owner 19.09.2026, beim Vergleich Datei/Schirm) ──────
   *
   * Die Adresszeile ist klein (`recht.breit`), der Code daneben misst das 2,2-Fache und sitzt
   * mittig darauf. Er ragt also oben über die Zeile hinaus — gemessen blieben zwischen Satz und
   * Code nur 0,40 % der Blattbreite, während zwischen Titel und Satz 2,00 % standen. Der Abstand
   * war gerechnet richtig und gesehen falsch: Gemessen wurde bis zur SCHRIFT, gesehen wird bis
   * zum CODE.
   *
   * Deshalb bekommt die Zeile VOR dem Code den Überhang zusätzlich. Dann stimmt der Abstand, den
   * man sieht, mit `P.qr.luft` überein — und zwar unabhängig davon, wie gross der Code gerade ist.
   */
  {
    const i = zeilen.findIndex(z => z.art === "qr");
    if (i > 0) zeilen[i - 1].danach += ((2.2 - 1) / 2) * zeilen[i].groesse;
  }

  /**
   * ── EIN STEHENDES WERK: SCHRIFT KLEINER, FELD HÖHER (Owner 20.09.2026: „das Bild muss 18
   * Prozent grösser werden … und die Schrift dann kleiner bei den Hochkant-Bildern") ──────────
   *
   * Dieselbe Regel wie auf dem Schirm (`POSTER_HOCHKANT`, `components/Poster.tsx`): Jede Zeile
   * schrumpft mit der Zahl ihrer Rolle — der Titel am meisten, die kleinen Zeilen weniger (Owner
   * 20.09.2026: „die kleine Schrift ist zu klein"). Ohne Rolle ist es der Satz. Umgebrochen wurde
   * oben in voller Grösse und voller Breite; auf dem Schirm schrumpft die Breite des Blocks mit
   * dem Satz, er bricht also an derselben Stelle um.
   */
  const masse = await werkMessen(a.bild);
  const hochkant = posterHochkant(masse.breit, masse.hoch);
  if (hochkant) for (const z of zeilen) {
    const k = POSTER_HOCHKANT[z.rolle ?? "satz"];
    z.groesse *= k; z.sperre *= k; z.danach *= k;
  }
  /* Und der Block rückt näher an die Unterkante — dieselbe Zahl wie auf dem Schirm. */
  if (hochkant) untenY -= cqw(POSTER_HOCHKANT.untenWeg);

  const blockHoehe = zeilen.reduce((s, z) => s + z.groesse + z.danach, 0);

  /* ── Das Werk: was zwischen Kopf und Textblock frei bleibt, höchstens das Rasterfeld ──── */
  const feldHoehe = Math.min(cqw((hochkant ? POSTER_HOCHKANT.bildHoch : P.bild.hoch) * 1.4142) - cqw(P.randOben), Math.max(1, obenY - (untenY + blockHoehe + cqw(P.bild.luftSchrift))));
  const feldBreite = innen - 2 * cqw(P.bild.randSeite);
  /* Wie auf dem Schirm: Das Werk passt GANZ ins Feld, nichts fällt weg. */
  const wB = masse.breit;
  const wH = masse.hoch;
  const skala = Math.min(feldBreite / wB, feldHoehe / wH);
  const bw = wB * skala;
  const bh = wH * skala;
  /* Im Bild zählt y von OBEN. Mittig im Feld, wie auf dem Schirm und in der Druckdatei. */
  const werkX = mitte - bw / 2;
  const werkYvonOben = H - obenY + (feldHoehe - bh) / 2;

  /* ── Der Code ────────────────────────────────────────────────────────────────────────── */
  const qrPng = a.qrZiel
    ? await QRCode.toBuffer(a.qrZiel, { type: "png", margin: 1, scale: 12, color: { dark: f.tinte, light: f.papier } })
    : null;

  /* ── Die Schrift, von unten nach oben gesetzt ─────────────────────────────────────────── */
  const stuecke: string[] = [];
  const bilder: { input: Buffer; left: number; top: number }[] = [];
  let y = untenY + blockHoehe;
  for (const z of zeilen) {
    y -= z.groesse;
    const grundlinie = H - y;              // Grundlinie, von oben gezählt
    if (z.art === "qr" && qrPng) {
      const seiteQr = z.groesse * 2.2;
      const luft = z.groesse * 0.6;
      const bText = textBreite(z.font, z.inhalt, z.groesse);
      const gesamt = seiteQr + luft + bText;
      const x0 = mitte - gesamt / 2;
      const qrPx = Math.max(1, Math.round(seiteQr * S));
      bilder.push({
        input: await sharp(qrPng).resize(qrPx, qrPx).png().toBuffer(),
        left: Math.round(x0 * S),
        /* Ein Viertel der Schriftgrösse tiefer — die sichtbare Mitte der Zeile, nicht die
           Kastenmitte (Owner 19.09.2026; dieselbe Rechnung wie in der Druckdatei). */
        top: Math.round((H - (y - (seiteQr - z.groesse) / 2 - z.groesse * 0.25) - seiteQr) * S),
      });
      stuecke.push(`<g fill="${z.farbe}">${textPfad(z.font, z.inhalt, z.groesse, x0 + seiteQr + luft, grundlinie)}</g>`);
    } else {
      const b = textBreite(z.font, z.inhalt, z.groesse, z.sperre);
      stuecke.push(`<g fill="${z.farbe}">${textPfad(z.font, z.inhalt, z.groesse, mitte - b / 2, grundlinie, z.sperre)}</g>`);
    }
    y -= z.danach;
  }
  /* Ohne Rechtezeile hat der Code keinen Platz neben der Schrift — dann steht er unten links. */
  if (qrPng && !a.recht) {
    const s = cqw(P.qr.breit);
    const px = Math.max(1, Math.round(s * S));
    bilder.push({
      input: await sharp(qrPng).resize(px, px).png().toBuffer(),
      left: Math.round(randX * S),
      top: Math.round((H - (leisteUnten + cqw(P.randUnten)) - s) * S),
    });
  }

  /* Das Siegel unten links — dieselben Zahlen wie auf dem Blatt und in der Druckdatei. */
  try {
    const stempel = await readFile(path.join(process.cwd(), "public", "lakatosbandi", "artist-fair-stempel.png"));
    const kante = cqw(P.qr.breit * 1.35);
    const px = Math.max(1, Math.round(kante * S));
    bilder.push({
      input: await sharp(stempel).resize(px, px, { fit: "inside" }).png().toBuffer(),
      left: Math.round((leiste + cqw(P.randUnten / 2)) * S),
      top: Math.round((H - (leisteUnten + cqw(P.randUnten / 2 - 0.4)) - kante) * S),
    });
  } catch (e) {
    console.warn("[blattbild] Siegel nicht gesetzt:", e);
  }

  /* ── Alles übereinander: Papier, Rahmen, Werk, Schrift ────────────────────────────────── */
  /* Vier Leisten, unten breiter — dasselbe Bild wie im Stylesheet und in der Druckdatei. */
  const ton = a.rahmen === "holz" ? P.rahmen.holz : P.rahmen.schwarz;
  const r = (x: number, y: number, b: number, h: number) =>
    `<rect x="${(x * S).toFixed(2)}" y="${(y * S).toFixed(2)}" width="${(b * S).toFixed(2)}" height="${(h * S).toFixed(2)}" fill="${ton}"/>`;
  const rahmenStueck = a.rahmen
    ? r(0, 0, B, leiste) + r(0, H - leisteUnten, B, leisteUnten) + r(0, 0, leiste, H) + r(B - leiste, 0, leiste, H)
    : "";
  const schriftSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pxB}" height="${pxH}">`
    + `${rahmenStueck}<g transform="scale(${S.toFixed(5)})">${stuecke.join("")}</g></svg>`;

  const werk = await sharp(Buffer.from(a.bild))
    .resize(Math.max(1, Math.round(bw * S)), Math.max(1, Math.round(bh * S)), { fit: "fill" })
    .toBuffer();

  return new Uint8Array(await sharp({ create: { width: pxB, height: pxH, channels: 3, background: f.papier } })
    .composite([
      { input: werk, left: Math.round(werkX * S), top: Math.round(werkYvonOben * S) },
      ...bilder,
      { input: Buffer.from(schriftSvg), left: 0, top: 0 },
    ])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer());
}
