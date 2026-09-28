import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { textPfad, textBreite } from "@/lib/lakatosbandi-blattbild";

/**
 * ── DER DRUCK FÜR SHIRT UND HOODIE (Owner 28.09.2026: „das Motiv muss 35 % kleiner sein und der
 * Text muss drunter sein") ───────────────────────────────────────────────────────────────────
 *
 * EIN Bauteil für beides: die Vorschau auf dem Shirt (`api/portal-textil`) und die Datei, die mit
 * der Bestellung an die Druckerei geht (`lib/lakatosbandi-bestellung.ts`). Sonst sähe der Käufer
 * etwas anderes als das, was gedruckt wird.
 *
 * Oben das Werk im eigenen Seitenverhältnis (nie beschnitten), darunter wie auf dem Poster der
 * Titel kursiv und der Name gesperrt in Versalien — weiss bzw. hellgrau, weil das Shirt schwarz
 * ist. Die Buchstaben sind Umrisse (dieselbe Schrift und derselbe Weg wie `blattbild`), damit
 * der Server keine Systemschrift braucht. Hintergrund durchsichtig.
 *
 * `breite`/`hoch` ist die grösste Fläche fürs Werk in Pixeln; alle Schriftgrössen folgen der
 * Breite, so ist die kleine Vorschau und die grosse Druckdatei dasselbe Bild.
 */
export async function textilDruckBauen(o: {
  motiv: Buffer;
  titel: string;
  name: string;
  breite: number;
  hoch: number;
}): Promise<{ bild: Buffer; breite: number; hoehe: number }> {
  const sharp = (await import("sharp")).default;
  const m = await sharp(o.motiv, { failOn: "none" })
    .rotate()
    .resize({ width: Math.round(o.breite), height: Math.round(o.hoch), fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });

  const ort = path.join(process.cwd(), "public", "fonts");
  const [roh, rohKursiv] = await Promise.all([
    readFile(path.join(ort, "CrimsonText.ttf")),
    readFile(path.join(ort, "CrimsonText-Italic.ttf")),
  ]);
  const serif = fontkit.create(roh);
  const kursiv = fontkit.create(rohKursiv);

  const titel = String(o.titel ?? "").trim();
  const name = String(o.name ?? "").trim().toUpperCase();
  const gTitel = o.breite * 0.075;
  const gName = o.breite * 0.034;
  const sperre = gName * 0.2;
  const luft = o.breite * 0.05;
  const bTitel = titel ? textBreite(kursiv, titel, gTitel) : 0;
  const bName = name ? textBreite(serif, name, gName, sperre) : 0;

  const breite = Math.ceil(Math.max(m.info.width, bTitel, bName));
  const teile: string[] = [];
  let y = m.info.height;
  if (titel) {
    y += luft + gTitel * 0.8;
    teile.push(`<g fill="#ffffff">${textPfad(kursiv, titel, gTitel, (breite - bTitel) / 2, y)}</g>`);
    y += gTitel * 0.3;
  }
  if (name) {
    y += (titel ? luft * 0.45 : luft) + gName * 0.8;
    teile.push(`<g fill="#cfcac0">${textPfad(serif, name, gName, (breite - bName) / 2, y, sperre)}</g>`);
    y += gName * 0.3;
  }
  const hoehe = Math.ceil(y + gName * 0.2);
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
