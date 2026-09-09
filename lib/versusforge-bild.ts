import sharp from "sharp";

/**
 * DAS BILD ZUM POSTEN (Owner 09.09.2026: „er bekommt am Ende ein Bild für Instagram oder FB,
 * das er runterladen kann. Er wird es posten können.").
 *
 * WARUM EIN BILD DER RICHTIGE SCHLUSS IST: Bis hierher hat er einen Plan — etwas zum Lesen.
 * Ein Bild ist etwas zum BENUTZEN. Es ist der erste Gegenstand, den er in die Hand bekommt
 * und ohne uns weiterverwenden kann: posten, in eine Anzeige laden, seinem Partner zeigen.
 *
 * NUR SCHRIFT, KEIN ERZEUGTES MOTIV. Ein Motiv zu erzeugen kostet Geld bei einem Anbieter und
 * bräuchte jedes Mal die Zustimmung des Owners (Hausregel `keine-erzeugung-ohne-zustimmung`).
 * Schrift auf Fläche kostet nichts, geht in einer Sekunde und funktioniert für genau die
 * Sorte Anzeige, die hier gemeint ist: eine Aussage, die jemanden im Scrollen anhält. Ein
 * Bild mit Motiv kann er später darüberlegen — der Satz ist der Teil, den er nicht hat.
 *
 * 1080 x 1350 (4:5). Das ist das hochkant-Format, das Instagram im Feed am grössten zeigt und
 * das Facebook unverändert übernimmt. Quadrat verschenkt Höhe, 9:16 wird im Feed beschnitten.
 *
 * HELL, NICHT SCHWARZ (Owner 09.09.2026: „bitte keinen schwarzen, Hook weiss").
 *
 * Meine erste Fassung war schwarz mit Gold — die Handschrift von VersusForge. Falsch: Dieses
 * Bild veröffentlicht SEIN Betrieb, nicht wir. Ein Zahnarzt, der eine schwarz-goldene Kachel
 * postet, wirbt in unserer Marke statt in seiner. Weiss mit dunkler Schrift trägt keine
 * fremde Handschrift und passt zu allem, was er sonst postet — dieselbe Entscheidung wie bei
 * der Mandantenseite („schwarz passt für uns, aber light passt für alle").
 *
 * KEINE ADRESSE AUF DEM BILD (Owner 09.09.2026: „das raus"). Sie stand klein unter dem
 * Aufruf — und war dort falsch: Niemand tippt eine Adresse von einem Instagram-Bild ab, und
 * in einer Anzeige steht das Ziel ohnehin im Link darunter. Auf dem Bild kostete sie nur
 * Aufmerksamkeit, die dem Satz gehört.
 *
 * WICHTIG BEIM UMBRECHEN: SVG bricht Text NICHT von selbst um. Die Zeilen werden hier
 * gerechnet — grob über die mittlere Zeichenbreite, weil die echte Breite erst beim Setzen
 * feststeht. Lieber eine Zeile zu früh umgebrochen als eine, die aus dem Bild läuft.
 */

const B = 1080;
const H = 1350;
const RAND = 88;
const GRUND = "#ffffff";
const TEXT = "#14181c";
const AKZENT = "#1d6fd0";

/** Was XML nicht roh verträgt. Ohne das zerlegt ein „&" in seinem Satz die ganze Datei. */
const xml = (t: string) =>
  String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Zeilen bauen, die in `maxBreite` passen.
 * `proZeichen` ist die geschätzte mittlere Breite eines Zeichens bei Grad 1 — für eine fette
 * Groteske liegt sie um 0,52; der Wert ist bewusst grosszügig, damit nichts überläuft.
 */
function umbrechen(text: string, grad: number, maxBreite: number, proZeichen = 0.52): string[] {
  const maxZeichen = Math.max(8, Math.floor(maxBreite / (grad * proZeichen)));
  const zeilen: string[] = [];
  let zeile = "";
  for (const wort of String(text ?? "").trim().split(/\s+/)) {
    const probe = zeile ? `${zeile} ${wort}` : wort;
    if (probe.length <= maxZeichen || !zeile) zeile = probe;
    else { zeilen.push(zeile); zeile = wort; }
  }
  if (zeile) zeilen.push(zeile);
  return zeilen;
}

/** Sucht den grössten Grad, mit dem der Satz in `maxZeilen` passt. */
function passenderGrad(text: string, von: number, bis: number, maxBreite: number, maxZeilen: number): number {
  for (let g = von; g > bis; g -= 2) {
    if (umbrechen(text, g, maxBreite).length <= maxZeilen) return g;
  }
  return bis;
}

/**
 * ── OBEN FOTO, UNTEN SCHRIFT (Owner 09.09.2026: „Hälfte Bild, unten Schrift wäre besser") ──
 *
 * SEIN EINWAND VOM SELBEN TAG WAR: „Der Text füllt nicht das Format." Stimmt — ein Satz aus
 * acht Wörtern auf 1080 x 1350 lässt zwei Drittel Weiss stehen, und das sieht nicht ruhig
 * aus, sondern unfertig.
 *
 * DIE OBERE HÄLFTE IST DAS FOTO, die untere trägt den Satz. Damit ist die Fläche gefüllt,
 * ohne dass die Schrift aufgeblasen werden muss — und es ist der Aufbau, den jede Anzeige in
 * diesen Formaten hat: Bild fängt den Blick, Zeile hält ihn.
 *
 * SEIN FOTO, KEIN ERZEUGTES (Owner: „aber das wird dann echt Geld kosten"). Es kommt von
 * seiner eigenen Website (`lib/seite-lesen.ts`, `fotoAus`) und kostet einen Abruf statt
 * fünfzehn Cent. Erzeugte Motive bleiben draussen, solange das Gespräch gratis ist.
 *
 * OHNE FOTO BLEIBT ALLES WIE VORHER: Wer keine Website genannt hat oder wessen Seite kein
 * brauchbares Bild hergibt, bekommt die reine Schriftkachel. Ein halbes Bild mit grauem Loch
 * wäre schlechter als gar keins.
 */
/**
 * ── DREI FORMATE, WEIL BILDER DREI FORMATE HABEN (Owner 09.09.2026: „da musst du dir jetzt
 * ein Layout einfallen lassen — für Hochformatbilder und Querformat") ──────────────────────
 *
 * EIN FESTER STREIFEN OBEN funktioniert nur für Querformate. Ein hochformatiges Gemälde
 * daraus zuzuschneiden heisst, Himmel und Boden abzuschneiden und die Mitte zu zeigen — bei
 * einem Foto egal, bei einem Werk eine Zerstörung.
 *
 * DESHALB ENTSCHEIDET DAS BILD, nicht die Vorlage:
 *
 *  · QUER (breiter als hoch): schmales Band oben, formatfüllend beschnitten. Der Zuschnitt
 *    tut nicht weh, weil links und rechts ohnehin Luft ist — und der Satz bekommt viel Raum.
 *  · QUADRATISCH: höheres Band, ebenfalls beschnitten. Wenig Verlust, mehr Bildwirkung.
 *  · HOCH (höher als breit): das Bild wird GANZ gezeigt, eingepasst statt beschnitten, auf
 *    hellem Grund. Lieber ein Rand links und rechts als ein halbiertes Werk.
 *
 * DER SATZ SCHRUMPFT MIT. Bleibt weniger Platz, wird der Grad kleiner und die Zeilenzahl
 * geringer — nie umgekehrt, sonst läuft der Text ins Bild.
 */
type Zuschnitt = { hoehe: number; einpassen: boolean; zeilen: number; maxGrad: number };

function zuschnittFuer(breite: number, hoehe: number): Zuschnitt {
  const verhaeltnis = breite / Math.max(1, hoehe);
  /* Quer: 1,2 und breiter — darunter beginnt für das Auge schon das Quadrat. */
  if (verhaeltnis >= 1.2) return { hoehe: Math.round(H * 0.52), einpassen: false, zeilen: 4, maxGrad: 72 };
  if (verhaeltnis >= 0.85) return { hoehe: Math.round(H * 0.60), einpassen: false, zeilen: 3, maxGrad: 64 };
  return { hoehe: Math.round(H * 0.66), einpassen: true, zeilen: 3, maxGrad: 58 };
}

/**
 * ── EIN HOCHFORMAT SITZT IN DER ECKE, NICHT IN DER MITTE (Owner 09.09.2026: „nur nicht
 * mittig setzen — rechts und oben am Rand") ────────────────────────────────────────────────
 *
 * MITTIG EINGEPASST ergibt links und rechts denselben Rand: Das Bild schwimmt, und die Kachel
 * sieht aus wie ein Dokument mit einer Abbildung. BÜNDIG OBEN RECHTS liegt es an zwei Kanten
 * an — damit ist es Teil der Fläche, nicht ein Gast darin, und unten links entsteht eine
 * zusammenhängende Ecke für den Satz statt zweier schmaler Streifen.
 *
 * Es ist derselbe Griff, den Plakate seit hundert Jahren benutzen: Was anliegt, wirkt
 * gewollt; was schwebt, wirkt übriggeblieben.
 */
async function hochformatLegen(daten: Buffer, z: Zuschnitt): Promise<{ bild: Buffer; breite: number; hoehe: number } | null> {
  try {
    const gefasst = await sharp(daten)
      .resize(Math.round(B * 0.68), z.hoehe, { fit: "inside", withoutEnlargement: false })
      .toBuffer();
    const masse = await sharp(gefasst).metadata();
    return { bild: gefasst, breite: masse.width ?? 0, hoehe: masse.height ?? 0 };
  } catch { return null; }
}

/** Das Bild in seiner eigenen Fläche — beschnitten oder eingepasst, je nach Format. */
async function fotoLegen(daten: Buffer, z: Zuschnitt): Promise<Buffer | null> {
  try {
    return await sharp(daten)
      .resize(B, z.hoehe, z.einpassen
        /* EINGEPASST MIT HELLEM RAND: Der Rand ist derselbe Ton wie die Fläche darunter, das
           Bild sitzt also in der Kachel und nicht in einem Kasten. */
        ? { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } }
        : { fit: "cover", position: "attention" })
      .toBuffer();
  } catch { return null; }
}

/** Holt das Foto von einer Adresse. Scheitert es, gibt es kein Foto. */
async function fotoHolen(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; VersusForge/1.0)" },
    });
    if (!res.ok) return null;
    const roh = Buffer.from(await res.arrayBuffer());
    /* Über 8 MB ist kein Anzeigenmotiv, sondern ein unbearbeitetes Kamerabild — und es würde
       den Aufruf ausbremsen. */
    if (!roh.length || roh.length > 8 * 1024 * 1024) return null;
    const bild = sharp(roh);
    const masse = await bild.metadata();
    /* Unter 600 Pixel Breite ist es ein Logo, ein Symbol oder ein Zählpixel — hochgerechnet
       auf 1080 sähe es matschig aus, und das fiele auf ihn zurück, nicht auf uns. */
    if (!masse.width || masse.width < 600) return null;
    return roh;
  } catch {
    return null;
  }
}

export async function hookBild(o: {
  hook: string;
  /** Der Aufruf unten — „Jetzt anfragen", kurz. Leer lassen ist erlaubt. */
  aufruf?: string;
  /**
   * SEIN NAME AUF DEM BILD (Owner 09.09.2026: „der Name von dem Besitzer muss auch da rein").
   *
   * ── WARUM ER DAZUGEHÖRT ──────────────────────────────────────────────────────────────────
   *
   * Das Bild wandert weiter: Es wird geteilt, gespeichert, weitergeschickt — und irgendwann
   * steht es ohne die Anzeige daneben, ohne Seitenname, ohne Link. Ohne seinen Namen ist es
   * dann ein Satz von niemandem. Mit ihm weiss jeder, wer das sagt, auch drei Weiterleitungen
   * später.
   *
   * KLEIN UND ÜBER DEM AUFRUF, nicht als Überschrift: Der Satz hält an, der Name beantwortet
   * die Frage danach. Umgekehrt liest niemand den Satz zu Ende.
   */
  marke?: string;
  /** Adresse eines Fotos von SEINER Seite. Fehlt es, bleibt es bei der Schriftkachel. */
  foto?: string;
  /**
   * SEIN HOCHGELADENES BILD, fertig als Daten (Owner 09.09.2026: „stell dir vor, ein
   * Künstler will seine Art verkaufen. Das müsste auch funktionieren. Bild und Spruch").
   *
   * BEIM KÜNSTLER IST DAS BILD DAS PRODUKT. Eine weisse Schriftkachel bewirbt ein Gemälde
   * nicht — sie beschreibt es. Deshalb kann sein eigenes Bild direkt hier ankommen, ohne
   * Umweg über eine Adresse: Es liegt schon bei uns, weil er es hochgeladen hat.
   */
  fotoDaten?: Buffer;
}): Promise<Buffer> {
  const hook = String(o.hook ?? "").trim();
  if (!hook) throw new Error("Ohne Hook kein Bild.");

  /* Eigene Daten schlagen jede Adresse: Was er selbst hochgeladen hat, hat er ausgesucht. */
  const roh = o.fotoDaten ?? (o.foto ? await fotoHolen(o.foto) : null);
  const masse = roh ? await sharp(roh).metadata().catch(() => null) : null;
  const z = zuschnittFuer(masse?.width ?? 3, masse?.height ?? 2);
  /* Hochformat liegt bündig in der Ecke, alles andere füllt ein Band über die ganze Breite. */
  const ecke = roh && z.einpassen ? await hochformatLegen(roh, z) : null;
  const foto = roh && !z.einpassen ? await fotoLegen(roh, z) : null;
  /* Wo der Text anfangen darf: unter dem Band, oder unter der Ecke. */
  const untenAb = ecke ? ecke.hoehe : foto ? z.hoehe : 0;

  const innen = B - RAND * 2;
  /* Mit Foto bleibt die halbe Fläche für die Schrift — also kleinere Grade und weniger
     Zeilen. Ohne Foto darf der Satz gross werden, er ist dann das ganze Bild. */
  /* Mit Bild richtet sich der Grad nach dem Platz, der übrig bleibt — je höher das Bild,
     desto kleiner der Satz. Ohne Bild darf er gross werden, er ist dann das ganze Bild. */
  const grad = (foto || ecke)
    ? passenderGrad(hook, z.maxGrad, 34, innen, z.zeilen)
    : passenderGrad(hook, 92, 44, innen, 6);
  const zeilen = umbrechen(hook, grad, innen);
  const zeilenhoehe = Math.round(grad * 1.14);
  const blockHoehe = zeilen.length * zeilenhoehe;

  const fuss = H - RAND;
  /* Der Name wird gekappt, nicht umgebrochen: Eine zweite Zeile unter dem Satz wäre eine
     zweite Aussage, und es soll nur eine geben. */
  const marke = String(o.marke ?? "").trim().slice(0, 34);
  /* MIT FOTO steht der Satz im weissen Feld darunter, optisch mittig zwischen Fotokante und
     Aufruf. OHNE FOTO sitzt er in der Mitte des Bildes, leicht nach oben gerückt. */
  const start = untenAb
    ? Math.round(untenAb + (H - untenAb - blockHoehe - (marke ? 150 : 110)) / 2) + grad
    : Math.round((H - blockHoehe) / 2 - 70) + grad;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}">
  ${/**
     * ── OHNE MOTIV EINE FLÄCHE, MIT MOTIV KEINE (09.09.2026, im Bild gesehen) ─────────────
     *
     * DER FEHLER, DEN DAS BEHEBT: Hier stand die weisse Fläche IMMER — und die Schrift-Ebene
     * liegt ÜBER dem Bild. Damit deckte sie jedes Motiv vollständig zu. Das Bild war nie zu
     * sehen: nicht das hochgeladene, nicht das erzeugte, nicht das von seiner Website. Alle
     * drei Wege haben funktioniert, und alle drei endeten unter einem weissen Deckel.
     *
     * WARUM ES NIEMANDEM AUFFIEL: Die weisse Kachel ist ein gültiges Format und sah richtig
     * aus. Ein Fehler, der wie eine Absicht aussieht, überlebt jede Sichtprüfung — gefunden
     * hat ihn erst der Owner, der wusste, dass da ein Gemälde sein müsste.
     *
     * DIE UNTERLAGE IST SCHON DER RICHTIGE GRUND: Wo kein Motiv liegt, ist die Fläche
     * ohnehin GRUND — die Zeile hier war von Anfang an überflüssig und ab dem ersten Bild
     * schädlich.
     */""}
  ${(foto || ecke) ? "" : `<rect width="${B}" height="${H}" fill="${GRUND}"/>`}
  ${(foto || ecke) ? "" : `<rect x="0" y="0" width="${B}" height="10" fill="${AKZENT}"/>`}
  <g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="bold">
    ${zeilen.map((z, i) =>
      `<text x="${RAND}" y="${start + i * zeilenhoehe}" font-size="${grad}" fill="${TEXT}" letter-spacing="-2">${xml(z)}</text>`,
    ).join("\n    ")}
  </g>
  ${marke ? `<text x="${RAND}" y="${fuss - 104}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="bold" font-size="30" letter-spacing="2" fill="${TEXT}" opacity="0.55">${xml(marke.toUpperCase())}</text>` : ""}
  <rect x="${RAND}" y="${fuss - 78}" width="96" height="8" fill="${AKZENT}"/>
  ${o.aufruf ? `<text x="${RAND}" y="${fuss - 20}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="bold" font-size="40" fill="${AKZENT}">${xml(o.aufruf)}</text>` : ""}
</svg>`;

  /* JPEG, nicht PNG: Instagram rechnet ohnehin um, und eine 200-KB-Datei lädt am Handy
     sofort — ein 2-MB-PNG mit denselben Pixeln nicht. */
  const flaeche = sharp(Buffer.from(svg));
  /* Das Bild liegt UNTER der Schrift-Ebene: Die Fläche darunter bleibt frei, und der Satz
     steht nie auf dem Motiv. Bündig oben rechts, wenn es hoch ist; sonst als Band oben. */
  const unterlage = ecke
    ? { input: ecke.bild, top: 0, left: Math.max(0, B - ecke.breite) }
    : foto ? { input: foto, top: 0, left: 0 } : null;
  const fertig = unterlage
    ? sharp({ create: { width: B, height: H, channels: 3, background: GRUND } })
        .composite([unterlage, { input: await flaeche.png().toBuffer(), top: 0, left: 0 }])
    : flaeche;

  return await fertig.jpeg({ quality: 92 }).toBuffer();
}
