import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { textPfad, textBreite, umbrechen } from "@/lib/lakatosbandi-blattbild";
import { posterAnriss } from "@/lib/lakatosbandi";

/**
 * ── DER DRUCK FÜR SHIRT UND HOODIE (Owner 28.09.2026: „das Motiv muss 35 % kleiner sein und der
 * Text muss drunter sein") ───────────────────────────────────────────────────────────────────
 *
 * EIN Bauteil für beides: die Vorschau auf dem Shirt (`api/portal-textil`) und die Datei, die mit
 * der Bestellung an die Druckerei geht (`lib/lakatosbandi-bestellung.ts`). Sonst sähe der Käufer
 * etwas anderes als das, was gedruckt wird.
 *
 * Oben das Werk im eigenen Seitenverhältnis (nie beschnitten), darunter NUR der Spruch, gross
 * und weiss (Owner 28.09.2026: „ohne Titel, nur der Spruch, und der muss viel grösser sein und
 * das Motiv kleiner"). Die Buchstaben sind Umrisse (dieselbe Schrift und derselbe Weg wie `blattbild`), damit
 * der Server keine Systemschrift braucht. Hintergrund durchsichtig.
 *
 * `breite`/`hoch` ist die grösste Fläche fürs Werk in Pixeln; alle Schriftgrössen folgen der
 * Breite, so ist die kleine Vorschau und die grosse Druckdatei dasselbe Bild.
 */
/** Der Spruch fürs Shirt: der erste ganze Satz — ohne Auslassungspunkte, wenn er nicht zu lang ist. */
export function textilSpruch(hook: string): string {
  const t = String(hook ?? "").trim();
  const erster = (t.match(/[^.!?…]+[.!?…]+/)?.[0] ?? t).trim();
  return erster.length <= 150 ? erster : posterAnriss(t, 150);
}

export async function textilDruckBauen(o: {
  motiv: Buffer;
  spruch: string;
  breite: number;
  hoch: number;
}): Promise<{ bild: Buffer; breite: number; hoehe: number }> {
  const sharp = (await import("sharp")).default;
  /* WEISSER RAHMEN UMS WERK (Owner 28.09.2026: „mach einen weissen Rahmen bei den Bildern") —
     innerhalb der Fläche, damit das Ganze nicht grösser wird. Die Stärke folgt der Breite. */
  const rand = Math.max(2, Math.round(o.breite * 0.035));
  const m = await sharp(o.motiv, { failOn: "none" })
    .rotate()
    .resize({ width: Math.round(o.breite) - 2 * rand, height: Math.round(o.hoch) - 2 * rand, fit: "inside" })
    .extend({ top: rand, bottom: rand, left: rand, right: rand, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer({ resolveWithObject: true });

  const roh = await readFile(path.join(process.cwd(), "public", "fonts", "CrimsonText.ttf"));
  const serif = fontkit.create(roh);

  /* Der Spruch darf breiter laufen als das Werk — sonst wären es sechs kurze Zeilen. */
  const groesse = o.breite * 0.11;
  const zeilenBreite = o.breite * 1.55;
  const zeilen = umbrechen(String(o.spruch ?? "").trim(), serif, groesse, zeilenBreite);
  const breiten = zeilen.map(z => textBreite(serif, z, groesse));
  const breite = Math.ceil(Math.max(m.info.width, ...breiten, 1));

  const teile: string[] = [];
  let y = m.info.height + (zeilen.length ? o.breite * 0.08 : 0);
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
