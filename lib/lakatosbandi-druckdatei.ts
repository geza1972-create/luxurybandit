import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { werkMessen } from "@/lib/lakatosbandi-feldschnitt";
import QRCode from "qrcode";
import { POSTER, POSTER_VERHAELTNIS, POSTER_FORMATE, POSTER_HOCHKANT, posterHochkant } from "@/lib/lakatosbandi-poster";

/**
 * DIE DRUCKDATEI ENTSTEHT AUF DEM SERVER (Owner 16.09.2026: „das muss aber automatisch generiert
 * werden wenn jemand es als poster markiert oder wenn wir künstler anlegen").
 *
 * ── WARUM NICHT ALS VORRAT ──────────────────────────────────────────────────────────────────
 *
 * Vorproduzierte PDFs müsste jemand anstossen — bei jedem neuen Werk, bei jedem Häkchen, bei
 * jeder Korrektur an einem Text. Das wird vergessen, und dann verkaufen wir eine Datei, die
 * nicht mehr zum Poster passt. Hier entsteht sie im Moment des Kaufs: immer aktuell, kein
 * Speicher, und die Bestellnummer kann direkt hineingedruckt werden.
 *
 * ── DIESELBEN ZAHLEN WIE DIE KACHEL ─────────────────────────────────────────────────────────
 *
 * Alle Maße kommen aus `lib/lakatosbandi-poster.ts`; dort sind sie Anteile der Blattbreite. Auf
 * dem Schirm ist das `cqw`, hier sind es Punkte einer A-Seite. Ändert sich das Raster, ändern
 * sich Bildschirm und Druck gemeinsam — das war der Sinn der Übung.
 *
 * ── SCHRIFT ─────────────────────────────────────────────────────────────────────────────────
 *
 * Crimson Text (OFL, frei verwendbar) statt Georgia: Georgia gehört Microsoft und darf nicht in
 * eine Datei eingebettet werden, die wir verkaufen. Die eingebauten PDF-Schriften scheiden aus,
 * weil ihnen „ș" und „ț" fehlen — auf einem rumänischen Poster keine Option. Und eine VARIABLE
 * Schriftdatei scheidet auch aus: pdf-lib löst daraus keine Glyphen auf, das Blatt kam mit
 * einzelnen Buchstaben statt Wörtern heraus (16.09.2026 gesehen). Crimson Text liegt statisch
 * vor und ist eine Garamond-Verwandte — dieselbe Familie von Formen wie Georgia auf dem Schirm.
 */

export type DruckAngaben = {
  /** Das Werk als Bilddaten (JPEG oder PNG) in voller Auflösung. */
  bild: Uint8Array;
  bildTyp?: "jpg" | "png";
  /** Das Profilbild des Künstlers, rund neben dem Namen. */
  profil?: Uint8Array;
  profilTyp?: "jpg" | "png";
  /** Ohne Namen fällt die Künstlerzeile weg (Owner 17.09.2026: „Gerry Louisett raus"). */
  name?: string;
  leben?: string;
  titel?: string;
  /** Der Anriss — zwei Zeilen, wie auf der Kachel (`posterAnriss`). */
  text?: string;
  /** Die Adresse im QR-Code (`filmSeite`). */
  qrZiel?: string;
  scan?: string;
  recht?: string;
  /** Die Bestellnummer — steht klein in der Fusszeile und ordnet die Datei einem Kauf zu. */
  nummer?: string;
  format?: keyof typeof POSTER_FORMATE;
  rahmen?: "holz" | "schwarz" | null;
};

const farbe = (hex: string) => {
  const h = hex.replace("#", "");
  return rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);
};

/** Ein Anteil der Blattbreite in Punkten — dasselbe wie `cqw` auf dem Schirm. */
const teil = (breiteP: number, anteil: number) => (anteil / 100) * breiteP;

/** Zeilenumbruch nach Breite, an Wortgrenzen. */
function umbrechen(text: string, font: PDFFont, groesse: number, breite: number): string[] {
  const zeilen: string[] = [];
  let zeile = "";
  for (const wort of text.split(/\s+/).filter(Boolean)) {
    const versuch = zeile ? `${zeile} ${wort}` : wort;
    if (font.widthOfTextAtSize(versuch, groesse) <= breite || !zeile) zeile = versuch;
    else { zeilen.push(zeile); zeile = wort; }
  }
  if (zeile) zeilen.push(zeile);
  return zeilen;
}

/** Gesperrte Schrift — Zeichen für Zeichen, um Punkte herum eng (wie auf dem Blatt). */
function sperrBreite(text: string, font: PDFFont, groesse: number, sperre: number): number {
  let b = 0;
  for (let i = 0; i < text.length; i++) {
    b += font.widthOfTextAtSize(text[i], groesse);
    if (i < text.length - 1) {
      const eng = text[i] === "." || text[i + 1] === "." || text[i] === "·" || text[i + 1] === "·";
      b += sperre * (eng ? 0.15 : 1);
    }
  }
  return b;
}

function sperrZeichnen(seite: PDFPage, text: string, font: PDFFont, groesse: number, x: number, y: number, sperre: number, fill: ReturnType<typeof rgb>) {
  let cx = x;
  for (let i = 0; i < text.length; i++) {
    seite.drawText(text[i], { x: cx, y, size: groesse, font, color: fill });
    cx += font.widthOfTextAtSize(text[i], groesse);
    const eng = text[i] === "." || text[i + 1] === "." || text[i] === "·" || text[i + 1] === "·";
    cx += sperre * (eng ? 0.15 : 1);
  }
}

/**
 * Baut das Poster als PDF. Gibt die fertigen Bytes zurück — der Aufrufer hängt sie an eine Mail
 * oder legt sie ab.
 */
export async function druckdateiBauen(a: DruckAngaben): Promise<Uint8Array> {
  const P = POSTER;
  const f = P.farben;
  const fmt = POSTER_FORMATE[a.format ?? "A3"];
  /* 1 mm = 2.8346 pt. Das PDF trägt echte Millimeter, egal mit wie viel dpi gedruckt wird. */
  const MM = 2.83465;
  const B = fmt.breite * MM;
  const H = fmt.hoehe * MM;
  const cqw = (v: number) => teil(B, v);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const schriftOrt = path.join(process.cwd(), "public", "fonts");
  const [roh, rohKursiv] = await Promise.all([
    readFile(path.join(schriftOrt, "CrimsonText.ttf")),
    readFile(path.join(schriftOrt, "CrimsonText-Italic.ttf")),
  ]);
  const serif = await pdf.embedFont(roh, { subset: true });
  const kursiv = await pdf.embedFont(rohKursiv, { subset: true });

  const seite = pdf.addPage([B, H]);
  seite.drawRectangle({ x: 0, y: 0, width: B, height: H, color: farbe(f.papier) });

  /* ── Der gedruckte Rahmen ─────────────────────────────────────────────────────────────── */
  const leiste = a.rahmen ? cqw(P.rahmen.breit) : 0;
  const leisteUnten = a.rahmen ? cqw(P.rahmen.breitUnten) : 0;
  if (a.rahmen) {
    /* ── VIER LEISTEN, UNTEN BREITER (Owner 19.09.2026) ───────────────────────────────────
       Ein einziges Rechteck mit `borderWidth` kann nur EINE Breite. Der Schirm zeichnet unten
       eine dickere Leiste (`border-width: … 1.47cqw …`), weil das Blatt im Rahmen etwas tiefer
       sitzt. Vier gefüllte Rechtecke geben dasselbe Bild — und nur so stimmt die Vorschau. */
    const ton = farbe(a.rahmen === "holz" ? P.rahmen.holz : P.rahmen.schwarz);
    seite.drawRectangle({ x: 0, y: H - leiste, width: B, height: leiste, color: ton });
    seite.drawRectangle({ x: 0, y: 0, width: B, height: leisteUnten, color: ton });
    seite.drawRectangle({ x: 0, y: 0, width: leiste, height: H, color: ton });
    seite.drawRectangle({ x: B - leiste, y: 0, width: leiste, height: H, color: ton });
  }

  const randX = leiste + cqw(P.rand);
  const innen = B - 2 * randX;
  const mitte = B / 2;
  /* In PDF zählt y von UNTEN. Wir rechnen von oben und ziehen ab. */
  let obenY = H - leiste - cqw(P.randOben);
  let untenY = leisteUnten + cqw(P.randUnten);

  /* ── KEIN KOPF ÜBER DEM WERK (Owner 17.09.2026: „raus") ────────────────────────────────
     Bis heute stand `POSTER_TITEL` hier oben auf dem Blatt. Auf dem Schirm ist die Zeile weg;
     die Adresse steht unten unter dem Satz (`a.recht`). Stünde sie hier weiter, bekäme der
     Käufer etwas anderes gedruckt, als er bestellt hat. */

  /* ── Der Textblock wird zuerst gemessen, damit er unten kleben kann ───────────────────── */
  type Zeile = { art: "text" | "sperr" | "qr"; inhalt: string; font?: PDFFont; groesse: number; fill?: ReturnType<typeof rgb>; sperre: number; danach: number; satz?: boolean; rolle?: "titel" | "stil" | "recht" };
  const zeilen: Zeile[] = [];
  const qrSeite = a.qrZiel ? cqw(P.qr.breit) : 0;
  const nameGroesse = cqw(P.name.breit);
  const nameText = a.leben ? `${a.name ?? ""}   ${a.leben}` : (a.name ?? "");
  /* Der Künstlername steht nur noch in der Rechtezeile (Owner 17.09.2026: „Gerry Louisett
     raus") — wird er nicht übergeben, fällt die Zeile hier genauso weg wie auf dem Schirm. */
  if (a.name) zeilen.push({ art: "sperr", inhalt: nameText, font: serif, groesse: nameGroesse, fill: farbe(f.tinte), sperre: nameGroesse * P.name.sperre, danach: cqw(P.luft), rolle: "stil" });
  if (a.titel) zeilen.push({ art: "text", inhalt: a.titel, font: kursiv, groesse: cqw(P.titel.breit), fill: farbe(f.tinte), sperre: 0, danach: cqw(P.titel.luftUnten), rolle: "titel" });
  /* Seit der Code unten neben der Adresse steht (Owner 17.09.2026: „dieser qr code stört, muss
     klein sein neben lakatosbandi.com"), hält der Satz keinen Platz mehr für ihn frei — er hat
     die ganze Breite, genau wie auf dem Schirm. */
  const textFeld = innen;
  if (a.text) {
    /**
     * ── ZWEI ZEILEN, DIE SCHRIFT RICHTET SICH DANACH (Owner 17.09.2026: „text block ist
     * begrenzt. egal was der user schreibt dann wird der text kleiner") ────────────────────
     *
     * Der Schirm SCHÄTZT die Grösse aus der Zeichenzahl — er kann die Schrift nicht messen,
     * bevor sie gesetzt ist. Hier liegt die Schrift vor: `umbrechen` bricht mit echten
     * Zeichenbreiten um, also wird so lange verkleinert, bis zwei Zeilen reichen. Ergebnis ist
     * dieselbe Regel, nur genauer — nie mehr als zwei Zeilen, nie kleiner als lesbar.
     */
    const gross = cqw(P.text.breit);
    const klein = cqw(1.45);
    let g = gross;
    let teile = umbrechen(a.text, serif, g, textFeld);
    while (teile.length > 2 && g > klein) {
      g = Math.max(klein, g - gross * 0.04);
      teile = umbrechen(a.text, serif, g, textFeld);
    }
    teile.forEach((z, i) => zeilen.push({ art: "text", inhalt: z, font: serif, groesse: g, fill: farbe(f.tinte), sperre: 0, satz: true, danach: i === teile.length - 1 ? cqw(P.qr.luft) : g * (P.text.zeile - 1) }));
  }
  /* Die Zeile „scannen" steht nur auf einem Blatt, dessen Code mittig unter dem Satz sitzt.
     Hier steht er neben dem Satz — wie auf dem Schirm (`qrEcke`) bleibt sie deshalb weg. */
  /* Der Code gehört zu dieser Zeile: `qr` markiert sie, gezeichnet wird er beim Setzen links
     neben der Schrift (Owner 17.09.2026). */
  if (a.recht) zeilen.push({ art: a.qrZiel ? "qr" : "text", inhalt: a.recht, font: serif, groesse: cqw(P.recht.breit), fill: farbe(f.leise), sperre: 0, danach: cqw(P.luft) * 0.4, rolle: "recht" });
  if (a.nummer) zeilen.push({ art: "text", inhalt: `Licență ${a.nummer} · uz personal`, font: serif, groesse: cqw(P.recht.breit), fill: farbe(f.leise), sperre: 0, danach: 0, rolle: "recht" });


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
  const bildEinbetten = a.bildTyp === "png" ? pdf.embedPng.bind(pdf) : pdf.embedJpg.bind(pdf);
  /* Derselbe Rand unten wie oben (Owner 18.09.2026, siehe components/Poster.tsx) — sonst sitzt
     das Werk im Druck anders als auf dem Schirm, und genau das darf nicht passieren. */
  const feldHoehe = Math.min(cqw((hochkant ? POSTER_HOCHKANT.bildHoch : P.bild.hoch) * POSTER_VERHAELTNIS) - cqw(P.randOben), Math.max(1, obenY - (untenY + blockHoehe + cqw(P.bild.luftSchrift))));
  const feldBreite = innen - 2 * cqw(P.bild.randSeite);
  /* Wie auf dem Schirm: Das Werk passt GANZ ins Feld, nichts fällt weg
     (`lib/lakatosbandi-feldschnitt.ts` erzählt, warum hier einmal geschnitten wurde). */
  const werk = await bildEinbetten(a.bild);
  const skala = Math.min(feldBreite / werk.width, feldHoehe / werk.height);
  const bw = werk.width * skala;
  const bh = werk.height * skala;
  /* Mittig im Feld, wie auf dem Schirm (`items-center`, Owner 18.09.2026: „die Querbilder müssen
     zentriert sein zwischen Schrift und Rahmen") — ein stehendes Werk füllt die Höhe ohnehin. */
  seite.drawImage(werk, { x: mitte - bw / 2, y: obenY - (feldHoehe - bh) / 2 - bh, width: bw, height: bh });

  /* ── Der Textblock, von unten nach oben gesetzt ───────────────────────────────────────── */
  const qrBild = a.qrZiel
    ? await pdf.embedPng(await QRCode.toBuffer(a.qrZiel, {
        type: "png", margin: 1, scale: 12, color: { dark: f.tinte, light: f.papier },
      }))
    : null;
  let y = untenY + blockHoehe;
  /* Ober- und Unterkante des Satzes merken — daran hängt der Code (s.u.). */
  let satzOben: number | null = null;
  let satzUnten: number | null = null;
  for (const z of zeilen) {
    y -= z.groesse;
    if (z.satz) {
      if (satzOben === null) satzOben = y + z.groesse;
      satzUnten = y;
    }
    if (z.art === "qr" && z.font && qrBild) {
      /* Adresse und Code zusammen mittig: erst beide messen, dann setzen. */
      const seiteQr = z.groesse * 2.2;
      const luft = z.groesse * 0.6;
      const bText = z.font.widthOfTextAtSize(z.inhalt, z.groesse);
      const gesamt = seiteQr + luft + bText;
      const x0 = mitte - gesamt / 2;
      /**
       * ── DER CODE SITZT AUF DER ZEILE, NICHT ÜBER IHR (Owner 19.09.2026: „QR-Code etwas weiter
       * runter, damit es auf einer Linie steht, mit der Zeile zentriert") ──────────────────────
       *
       * Mittig gesetzt wurde bisher zur SCHRIFTKASTEN-Mitte: Grundlinie plus halbe Schriftgrösse.
       * Ein Buchstabe füllt diesen Kasten aber nicht — er reicht nach oben etwa 0,7 Schriftgrössen
       * (Versalhöhe) und nach unten 0,2 (Unterlänge). Seine sichtbare Mitte liegt also rund ein
       * Viertel TIEFER als die Kastenmitte, und der Code stand entsprechend zu hoch.
       */
      seite.drawImage(qrBild, { x: x0, y: y - (seiteQr - z.groesse) / 2 - z.groesse * 0.25, width: seiteQr, height: seiteQr });
      seite.drawText(z.inhalt, { x: x0 + seiteQr + luft, y, size: z.groesse, font: z.font, color: z.fill ?? farbe(f.tinte) });
    } else if (z.art === "sperr" && z.font) {
      const b = sperrBreite(z.inhalt, z.font, z.groesse, z.sperre);
      sperrZeichnen(seite, z.inhalt, z.font, z.groesse, mitte - b / 2, y, z.sperre, z.fill ?? farbe(f.tinte));
    } else if (z.font) {
      const b = z.font.widthOfTextAtSize(z.inhalt, z.groesse);
      seite.drawText(z.inhalt, { x: mitte - b / 2, y, size: z.groesse, font: z.font, color: z.fill ?? farbe(f.tinte) });
    }
    y -= z.danach;
  }

  /* ── DER CODE LIEGT LINKS NEBEN DEM SATZ (Owner 17.09.2026: „qr code links unten" · „muss mit
     der ersten zeile zentriert sein") ─────────────────────────────────────────────────────────
     Vorher klebte er in der Blattecke, unabhängig davon, wo der Satz steht. Jetzt hängt er an
     der Schrift: in der Lücke, die der Satz links ohnehin freihält, auf halber Höhe des Satzes —
     wie auf dem Schirm. Ohne Satz bleibt es bei der Ecke. */
  /* Ohne Rechtezeile hätte der Code keinen Platz — dann steht er wie früher unten links. */
  if (qrBild && !a.recht) {
    seite.drawImage(qrBild, { x: randX, y: leisteUnten + cqw(P.randUnten), width: qrSeite, height: qrSeite });
  }

  /* Das Gesicht des Künstlers neben dem Namen: pdf-lib kann nicht runden, also kommt es als
     Kreis auf das Papier — ein Quadrat wäre ein anderes Zeichen als auf dem Schirm. Ohne
     Profilbild bleibt es beim blossen Namen. */
  if (a.profil) {
    const kreis = cqw(P.name.kreis);
    const bild = a.profilTyp === "png" ? await pdf.embedPng(a.profil) : await pdf.embedJpg(a.profil);
    const nameBreite = sperrBreite(nameText, serif, nameGroesse, nameGroesse * P.name.sperre);
    const ganz = kreis + cqw(P.name.luft) + nameBreite;
    const x0 = mitte - ganz / 2;
    const nameY = untenY + blockHoehe - nameGroesse;
    /* Erst den Namen an seinen Platz rücken … */
    seite.drawRectangle({ x: x0, y: nameY - kreis * 0.2, width: ganz, height: kreis * 1.2, color: farbe(f.papier) });
    sperrZeichnen(seite, nameText, serif, nameGroesse, x0 + kreis + cqw(P.name.luft), nameY, nameGroesse * P.name.sperre, farbe(f.tinte));
    /* … dann das Bild davor, kreisförmig beschnitten. */
    const kx = x0;
    const ky = nameY - (kreis - nameGroesse) / 2;
    seite.drawImage(bild, { x: kx, y: ky, width: kreis, height: kreis });
    seite.drawCircle({ x: kx + kreis / 2, y: ky + kreis / 2, size: kreis / 2 + cqw(0.35), borderColor: farbe(f.papier), borderWidth: cqw(0.7) });
  }

  /**
   * ── DAS SIEGEL GEHÖRT AUFS GEDRUCKTE BLATT (Owner 19.09.2026, beim Vergleich Datei/Schirm) ──
   *
   * Auf dem Schirm sitzt „ARTIST FAIR · Respect the Artist" unten links auf dem Papier; in der
   * Datei fehlte es ganz. Es ist kein Schmuck: Es ist die Aussage, dass der Künstler bezahlt
   * wurde ([[artist-fair-siegel]]) — und die gehört genau auf das Blatt, das jemand an die Wand
   * hängt, nicht nur auf die Vorschau.
   *
   * DIESELBEN ZAHLEN WIE IM BLATT (`components/Poster.tsx`): halber unterer Rand nach links,
   * derselbe nach unten minus 0,4, Kantenlänge `qr.breit * 1.35`.
   */
  try {
    const stempel = await readFile(path.join(process.cwd(), "public", "lakatosbandi", "artist-fair-stempel.png"));
    const bildS = await pdf.embedPng(stempel);
    const seite2 = cqw(P.qr.breit * 1.35);
    seite.drawImage(bildS, {
      x: leiste + cqw(P.randUnten / 2),
      y: leisteUnten + cqw(P.randUnten / 2 - 0.4),
      width: seite2, height: seite2,
    });
  } catch (e) {
    /* Ohne Siegel ist das Blatt unvollständig, aber brauchbar — ein bezahlter Druck darf nicht
       an einer fehlenden Datei scheitern. */
    console.warn("[druckdatei] Siegel nicht gesetzt:", e);
  }

  return pdf.save();
}
