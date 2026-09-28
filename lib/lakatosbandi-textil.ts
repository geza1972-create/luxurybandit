import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { textPfad, textBreite, umbrechen } from "@/lib/lakatosbandi-blattbild";

/**
 * ── DER DRUCK FÜR SHIRT UND HOODIE (Owner 28.09.2026: „das Motiv muss 35 % kleiner sein und der
 * Text muss drunter sein") ───────────────────────────────────────────────────────────────────
 *
 * EIN Bauteil für beides: die Vorschau auf dem Shirt (`api/portal-textil`) und die Datei, die mit
 * der Bestellung an die Druckerei geht (`lib/lakatosbandi-bestellung.ts`). Sonst sähe der Käufer
 * etwas anderes als das, was gedruckt wird.
 *
 * Oben das Werk im gotischen Rahmen, darunter die kurze Shirt-Zeile (`WerkInfo.textilZeile`), gross
 * und weiss (Owner 28.09.2026: „ohne Titel, nur der Spruch, und der muss viel grösser sein und
 * das Motiv kleiner"). Die Buchstaben sind Umrisse (dieselbe Schrift und derselbe Weg wie `blattbild`), damit
 * der Server keine Systemschrift braucht. Hintergrund durchsichtig.
 *
 * `breite`/`hoch` ist die grösste Fläche fürs Werk in Pixeln; alle Schriftgrössen folgen der
 * Breite, so ist die kleine Vorschau und die grosse Druckdatei dasselbe Bild.
 */
/**
 * ── DER GOTISCHE WEISSE RAHMEN (Owner 28.09.2026: „mach einen weissen Rahmen bei den Bildern" ·
 * „kannst du einen gotischen weissen Rahmen machen?") ──────────────────────────────────────
 *
 * Ein Kirchenfenster: Das Werk steht GANZ (nichts wird abgeschnitten) in einem weissen Rahmen,
 * darüber ein Spitzbogen-Giebel mit Dreipass im Kreis (Masswerk). Zwei Linien wie beim Masswerk — kräftig aussen, fein innen. Alles SVG, keine Datei.
 *
 * Die Figur passt in `breite` × `hoch` (der Giebel darf die Fläche um ein Viertel nach oben
 * verlängern) — der Rahmen macht das Werk kleiner, nicht den Druck grösser.
 */
export async function gotischGerahmt(
  sharp: typeof import("sharp"),
  motiv: Buffer,
  breite: number,
  hoch: number,
  /** Weiss auf dem schwarzen Shirt, Tinte auf dem Papier des Posters. */
  farbe = "#ffffff",
): Promise<{ data: Buffer; info: { width: number; height: number } }> {
  const rand = breite * 0.07;
  /* Kein Kreuz auf der Spitze (Owner 28.09.2026: ohne Kreuz). */
  const kreuzH = 0;
  /* Der Bogen etwa ein Drittel flacher (Owner 28.09.2026: der Bogen nimmt zu viel Platz in der Hoehe). */
  const giebelAnteil = 0.34;
  const verfuegbarH = hoch * 1.25 - 2 * rand - kreuzH;
  const probe = await sharp(motiv, { failOn: "none" }).rotate().metadata();
  const verh = (probe.width ?? 3) / Math.max(1, probe.height ?? 4);
  /* w + Giebel: h + giebelAnteil·w ≤ verfuegbarH, w ≤ breite − 2·rand */
  let w = breite - 2 * rand;
  let h = w / verh;
  if (h + giebelAnteil * w > verfuegbarH) {
    h = verfuegbarH / (1 + giebelAnteil * verh);
    w = h * verh;
  }
  w = Math.round(w); h = Math.round(h);
  const bild = await sharp(motiv, { failOn: "none" }).rotate().resize({ width: w, height: h, fit: "fill" }).png().toBuffer();

  const giebel = giebelAnteil * w;
  /* Die äussere Linie etwas dünner (Owner 28.09.2026). */
  const dick = breite * 0.017;
  const fein = breite * 0.008;
  const aA = rand * 0.55;
  const aI = rand * 0.18;
  /* Oben Platz für den äusseren Bogen (er wächst mit dem Abstand zweimal) und das Kreuz. */
  const oben = 2 * aA + kreuzH * 1.15 + dick;
  const B = Math.round(w + 2 * rand);
  const H = Math.round(oben + giebel + h + rand);
  const x = rand;
  const yBild = oben + giebel;

  /* Umriss: unten gerade, oben ein Spitzbogen, dessen Kämpfer auf Höhe der Bild-Oberkante liegt. */
  const umriss = (a: number) => {
    const l = x - a, r = x + w + a, u = yBild + h + a, k = yBild - a;
    const spitze = k - (giebel + a);
    /* Radius grösser als die halbe Sehne → zwei Bögen, die sich in einer SPITZE treffen. */
    const rad = Math.hypot((r - l) / 2, k - spitze) * 0.95;
    return { d: `M ${l} ${u} L ${l} ${k} A ${rad} ${rad} 0 0 1 ${(l + r) / 2} ${spitze} A ${rad} ${rad} 0 0 1 ${r} ${k} L ${r} ${u} Z`, spitze, k, l, r };
  };
  const aussen = umriss(aA);
  const innen = umriss(aI);
  const cx = B / 2;
  /* Rose mit Dreipass im Giebel. */
  const rose = Math.min(giebel * 0.3, w * 0.12);
  const rcy = yBild - giebel * 0.4;
  const pass = rose * 0.47;
  const kreise = [0, 1, 2].map(n => {
    const winkel = -Math.PI / 2 + n * (2 * Math.PI / 3);
    return `<circle cx="${cx + Math.cos(winkel) * pass * 0.95}" cy="${rcy + Math.sin(winkel) * pass * 0.95}" r="${pass}"/>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${B}" height="${H}">
  <g fill="none" stroke="${farbe}" stroke-linejoin="miter">
    <path d="${aussen.d}" stroke-width="${dick}"/>
    <path d="${innen.d}" stroke-width="${fein}"/>
    <line x1="${innen.l}" y1="${yBild - aI}" x2="${innen.r}" y2="${yBild - aI}" stroke-width="${fein}"/>
    <circle cx="${cx}" cy="${rcy}" r="${rose}" stroke-width="${fein}"/>
    <g stroke-width="${fein}">${kreise}</g>
  </g>
</svg>`;
  /* Das Werk NICHT ins SVG einbetten: In Druckgrösse wären das über 10 MB Text, daran scheitert
     der SVG-Leser. Also Bild und Linien getrennt auf eine durchsichtige Fläche legen. */
  const data = await sharp({ create: { width: B, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: bild, left: Math.round(x), top: Math.round(yBild) },
      { input: Buffer.from(svg), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
  return { data, info: { width: B, height: H } };
}

export async function textilDruckBauen(o: {
  motiv: Buffer;
  spruch: string;
  breite: number;
  hoch: number;
  /** Bezugsbreite für die Schrift — fehlt sie, folgt die Schrift `breite`. So kann das Bild wachsen, ohne dass der Spruch mitwächst. */
  schrift?: number;
}): Promise<{ bild: Buffer; breite: number; hoehe: number }> {
  const sharp = (await import("sharp")).default;
  const sb = o.schrift ?? o.breite;
  const m = await gotischGerahmt(sharp, o.motiv, o.breite, o.hoch);

  const roh = await readFile(path.join(process.cwd(), "public", "fonts", "CrimsonText.ttf"));
  const serif = fontkit.create(roh);

  /* Der Spruch darf breiter laufen als das Werk — sonst wären es sechs kurze Zeilen. */
  const groesse = sb * 0.11;
  const zeilenBreite = sb * 1.55;
  const zeilen = umbrechen(String(o.spruch ?? "").trim(), serif, groesse, zeilenBreite);
  const breiten = zeilen.map(z => textBreite(serif, z, groesse));
  const breite = Math.ceil(Math.max(m.info.width, ...breiten, 1));

  const teile: string[] = [];
  let y = m.info.height + (zeilen.length ? sb * 0.08 : 0);
  zeilen.forEach((z, i) => {
    y += groesse * (i === 0 ? 0.85 : 1.3);
    teile.push(`<g fill="#ffffff">${textPfad(serif, z, groesse, (breite - breiten[i]) / 2, y)}</g>`);
  });
  const hoehe = Math.ceil(y + groesse * 0.35);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${breite}" height="${hoehe}">${teile.join("")}</svg>`;

  const bild = await sharp({ create: { width: breite, height: hoehe, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: m.data, left: Math.round((breite - m.info.width) / 2), top: 0 },
      { input: Buffer.from(svg), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
  return { bild, breite, hoehe };
}
