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
 * ── DER RAHMEN UMS WERK: EINE HAARLINIE (Owner 28.09.2026: erst „einen gotischen weissen Rahmen",
 * dann „zu kirchlich, nicht mehr modern, die Linien zu fett" — gewählt: Variante D) ─────────────
 *
 * Kein Bogen, keine Rosette: eine feine Linie mit etwas Abstand ums Werk, wie ein Passepartout.
 * Den kirchlichen Teil trägt das Bild selbst. Das Werk steht ganz, nichts wird beschnitten.
 * Weiss auf dem schwarzen Shirt/Blatt, Tinte auf dem hellen Papier.
 *
 * Die Figur passt in `breite` × `hoch` — der Rahmen macht das Werk kleiner, nicht den Druck grösser.
 * (Der Name `gotischGerahmt` bleibt, weil Schirm, Shirt und Druckdatei ihn schon rufen.)
 */
/** Die Rahmenlinie auf Schwarz — hellgrau, nicht weiss (Owner 28.09.2026). */
export const RAHMEN_HELLGRAU = "#9c978e";

export async function gotischGerahmt(
  sharp: typeof import("sharp"),
  motiv: Buffer,
  breite: number,
  hoch: number,
  /** Hellgrau auf dem schwarzen Shirt/Blatt (Owner 28.09.2026: „die Linie ist zu hell, es muss hellgrau sein"), Tinte auf hellem Papier. */
  farbe = RAHMEN_HELLGRAU,
): Promise<{ data: Buffer; info: { width: number; height: number } }> {
  const abstand = breite * 0.05;
  const linie = Math.max(1, breite * 0.0035);
  const rand = abstand + linie;
  const bild = await sharp(motiv, { failOn: "none" })
    .rotate()
    .resize({ width: Math.round(breite - 2 * rand), height: Math.round(hoch - 2 * rand), fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const w = bild.info.width;
  const h = bild.info.height;
  const B = Math.round(w + 2 * rand);
  const H = Math.round(h + 2 * rand);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}">
  <rect x="${linie / 2}" y="${linie / 2}" width="${B - linie}" height="${H - linie}" fill="none" stroke="${farbe}" stroke-width="${linie}"/>
</svg>`;
  const data = await sharp({ create: { width: B, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: bild.data, left: Math.round(rand), top: Math.round(rand) },
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
