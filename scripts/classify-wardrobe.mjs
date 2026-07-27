// Garderobe sortieren: welche Katalogbilder sind SAUBERE Kleidungsfotos (Teil frei auf
// hellem Grund) und welche zeigen eine fremde Frau bzw. sind fertige Werbe-Posts?
//
// Warum das zählt: Im Anzieh-Slider soll der Kunde Kleidung wählen. Steckt eine andere Frau
// im Bild, schleppt die Anzieh-Pipeline Körper und Pose mit — und für den Kunden bricht die
// Illusion, weil er gerade „seine" Frau ausgesucht hat.
//
// Messung (bewusst simpel und nachvollziehbar): Rand des Bildes anschauen. Produktfotos
// haben einen hellen, farblosen, gleichmäßigen Rand. Szenenfotos haben dort Farbe, Struktur
// und dunkle Stellen.
//
//   node scripts/classify-wardrobe.mjs            # nur zeigen
//   node scripts/classify-wardrobe.mjs --apply    # Liste der erlaubten IDs speichern
import fs from "node:fs";
import sharp from "sharp";

const APPLY = process.argv.includes("--apply");
const ENV = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")])
);
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL, KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "shopcut-images";
const OUT_PATH = "try-this-look/wardrobe-garments.json";

const state = await (await fetch("http://localhost:3007/api/try-this-look")).json();
const looks = (state.looks ?? []).filter(l => l.imageUrl);
console.log(`Looks mit Bild: ${looks.length}\n`);

/** Hautanteil im GANZEN Bild — der einzige verlässliche Hinweis, ob eine Person drin ist.
 *  Hintergrund allein genügt nicht: viele Model-Fotos stehen ebenfalls auf weißem Studiogrund. */
async function skinShare(buf) {
  const { data, info } = await sharp(buf).removeAlpha().resize(160, 208, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  let skin = 0, n = 0;
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // klassische Hautfarben-Regel (RGB), deckt helle bis dunkle Töne ab
    const isSkin = r > 95 && g > 40 && b > 20 &&
      r > g && r > b && (r - Math.min(g, b)) > 15 &&
      Math.abs(r - g) > 10 && r < 250 && g < 230;
    if (isSkin) skin++;
    n++;
  }
  return skin / n;
}

/** Randstreifen messen: Helligkeit, Farbigkeit, Unruhe. */
async function edgeStats(buf) {
  const img = sharp(buf).removeAlpha().resize(200, 260, { fit: "fill" });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const band = Math.round(width * 0.06);            // 6 % Rand
  let n = 0, sum = 0, sumSat = 0, dark = 0;
  const vals = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const edge = x < band || x >= width - band || y < band || y >= height - band;
      if (!edge) continue;
      const i = (y * width + x) * channels;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const lum = (r + g + b) / 3;
      sum += lum; sumSat += mx - mn; if (lum < 110) dark++;
      vals.push(lum); n++;
    }
  }
  const mean = sum / n;
  const variance = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
  return { bright: mean, sat: sumSat / n, darkShare: dark / n, sd: Math.sqrt(variance) };
}

const keep = [], drop = [];
for (const l of looks) {
  try {
    const buf = Buffer.from(await (await fetch(l.imageUrl)).arrayBuffer());
    const s = await edgeStats(buf);
    s.skin = await skinShare(buf);
    // Kleidungsfoto = kaum Haut im Bild UND ruhiger, heller Rand.
    // Der Hautanteil ist das entscheidende Kriterium: steckt eine Frau drin, liegt er hoch.
    // Schwelle aus den echten Zahlen: Fotos MIT Frau liegen bei 15–52 % Haut, reine
    // Kleidungsfotos in Hautfarbe (Nude-Bikini, beiges Satin) bei 7–11 %. 13 % trennt sauber.
    const isGarment = s.skin < 0.13 && s.bright > 150 && s.darkShare < 0.25;
    (isGarment ? keep : drop).push({ id: l.id, name: (l.name || "").slice(0, 42), s });
  } catch {
    drop.push({ id: l.id, name: (l.name || "").slice(0, 42), s: null });
  }
}

const fmt = (x) => x.s ? `Haut ${(x.s.skin * 100).toFixed(1)}% · hell ${x.s.bright.toFixed(0)} · dunkel ${(x.s.darkShare * 100).toFixed(0)}%` : "nicht lesbar";
console.log(`BLEIBEN (Kleidungsfotos): ${keep.length}`);
for (const k of keep.slice(0, 12)) console.log(`  ✓ ${k.name}  [${fmt(k)}]`);
if (keep.length > 12) console.log(`  … und ${keep.length - 12} weitere`);
console.log(`\nRAUS (Szenen-/Werbefotos): ${drop.length}`);
for (const d of drop.slice(0, 25)) console.log(`  ✗ ${d.name}  [${fmt(d)}]`);
if (drop.length > 25) console.log(`  … und ${drop.length - 25} weitere`);

if (!APPLY) { console.log("\nVORSCHAU — nichts gespeichert. Mit --apply schreiben."); process.exit(0); }

const res = await fetch(`${SB}/storage/v1/object/${BUCKET}/${OUT_PATH}`, {
  method: "POST",
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
  body: JSON.stringify({ ids: keep.map(k => k.id), savedAt: new Date().toISOString(), dropped: drop.length }),
});
console.log(`\ngespeichert: ${res.status} · ${keep.length} Kleidungsstücke freigegeben`);
