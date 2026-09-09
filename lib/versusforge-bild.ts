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
const FOTO_H = Math.round(H * 0.52);

/** Holt das Foto und schneidet es auf die obere Hälfte zu. Scheitert es, gibt es kein Foto. */
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
    return await bild.resize(B, FOTO_H, { fit: "cover", position: "attention" }).toBuffer();
  } catch {
    return null;
  }
}

export async function hookBild(o: {
  hook: string;
  /** Der Aufruf unten — „Jetzt anfragen", kurz. Leer lassen ist erlaubt. */
  aufruf?: string;
  /** Adresse eines Fotos von SEINER Seite. Fehlt es, bleibt es bei der Schriftkachel. */
  foto?: string;
}): Promise<Buffer> {
  const hook = String(o.hook ?? "").trim();
  if (!hook) throw new Error("Ohne Hook kein Bild.");

  const foto = o.foto ? await fotoHolen(o.foto) : null;

  const innen = B - RAND * 2;
  /* Mit Foto bleibt die halbe Fläche für die Schrift — also kleinere Grade und weniger
     Zeilen. Ohne Foto darf der Satz gross werden, er ist dann das ganze Bild. */
  const grad = foto
    ? passenderGrad(hook, 72, 38, innen, 4)
    : passenderGrad(hook, 92, 44, innen, 6);
  const zeilen = umbrechen(hook, grad, innen);
  const zeilenhoehe = Math.round(grad * 1.14);
  const blockHoehe = zeilen.length * zeilenhoehe;

  const fuss = H - RAND;
  /* MIT FOTO steht der Satz im weissen Feld darunter, optisch mittig zwischen Fotokante und
     Aufruf. OHNE FOTO sitzt er in der Mitte des Bildes, leicht nach oben gerückt. */
  const start = foto
    ? Math.round(FOTO_H + (H - FOTO_H - blockHoehe - 110) / 2) + grad
    : Math.round((H - blockHoehe) / 2 - 70) + grad;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}">
  <rect width="${B}" height="${H}" fill="${GRUND}"/>
  ${foto ? "" : `<rect x="0" y="0" width="${B}" height="10" fill="${AKZENT}"/>`}
  <g font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="bold">
    ${zeilen.map((z, i) =>
      `<text x="${RAND}" y="${start + i * zeilenhoehe}" font-size="${grad}" fill="${TEXT}" letter-spacing="-2">${xml(z)}</text>`,
    ).join("\n    ")}
  </g>
  <rect x="${RAND}" y="${fuss - 78}" width="96" height="8" fill="${AKZENT}"/>
  ${o.aufruf ? `<text x="${RAND}" y="${fuss - 20}" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="bold" font-size="40" fill="${AKZENT}">${xml(o.aufruf)}</text>` : ""}
</svg>`;

  /* JPEG, nicht PNG: Instagram rechnet ohnehin um, und eine 200-KB-Datei lädt am Handy
     sofort — ein 2-MB-PNG mit denselben Pixeln nicht. */
  const flaeche = sharp(Buffer.from(svg));
  const fertig = foto
    /* Das Foto liegt UNTER der Schrift-Ebene, nicht darüber: Die weisse Fläche darunter
       bleibt weiss, und der Satz steht nie auf dem Bild. */
    ? sharp({ create: { width: B, height: H, channels: 3, background: GRUND } })
        .composite([{ input: foto, top: 0, left: 0 }, { input: await flaeche.png().toBuffer(), top: 0, left: 0 }])
    : flaeche;

  return await fertig.jpeg({ quality: 92 }).toBuffer();
}
