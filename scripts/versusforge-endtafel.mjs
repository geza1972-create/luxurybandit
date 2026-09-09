import sharp from "sharp";
import fs from "fs";

/**
 * DIE SCHLUSSTAFEL DES WERBESPOTS (Owner 08.09.2026).
 *
 * ALS SKRIPT UND NICHT VON HAND, weil sie sich ändern wird: Hook, Preis und Beschreiber
 * wurden an einem Abend viermal gedreht. Wer sie neu braucht, ruft das hier auf statt eine
 * Bildbearbeitung zu öffnen.
 *
 * DER KOPF STEHT ÜBER DEM NAMEN (Owner: „als Bild meine ich echt, als kleines Bild drüber" ·
 * „die Leute wissen nicht, wer er ist"). Genau wie bei David: Ein Gesicht und ein Name
 * zusammen sind eine Person; ein Roboter allein ist eine Illustration, die niemand einordnet.
 *
 *   node scripts/versusforge-endtafel.mjs
 */

const B = 832, H = 1024, GOLD = "#f6cf51";

const sechseck = (cx, cy, r) =>
  `<polygon points="${[...Array(6)].map((_, i) => {
    const a = (Math.PI / 180) * (60 * i - 90);
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ")}" fill="none" stroke="${GOLD}" stroke-width="2.5"/>`;

const MARKEN = [
  { x: 150, s: "M13 2 3 14h7l-1 8 10-12h-7l1-8z", a: "VIER", b: "FRAGEN" },
  { x: 416, s: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2", a: "ZEHN", b: "MINUTEN" },
  { x: 682, s: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 15l2 2 4-4", a: "PLAN ALS", b: "PDF" },
];
const CY = 862, R = 42;
const marken = MARKEN.map(x =>
  sechseck(x.x, CY, R)
  + `<g transform="translate(${x.x - 15},${CY - 15}) scale(1.25)"><path d="${x.s}" fill="none" stroke="${GOLD}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>`
  + `<text x="${x.x}" y="${CY + R + 34}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="22" font-weight="800" fill="#fff" letter-spacing="1.5">${x.a}</text>`
  + `<text x="${x.x}" y="${CY + R + 60}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="22" font-weight="800" fill="#fff" letter-spacing="1.5">${x.b}</text>`
).join("");

/* Der Kopf als runde Marke — mit goldenem Ring, damit er als Zeichen gelesen wird und nicht
   als angeschnittenes Foto. */
const kopf = await sharp("public/VersusForge/kaempfer-kopf.webp").resize(150, 150).png().toBuffer();
const rund = await sharp(kopf).composite([{
  input: Buffer.from(`<svg width="150" height="150"><circle cx="75" cy="75" r="75" fill="#fff"/></svg>`),
  blend: "dest-in",
}]).png().toBuffer();

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}">
 <defs>
  <linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(0,0,0,0.9)"/><stop offset="30%" stop-color="rgba(0,0,0,0.8)"/><stop offset="62%" stop-color="rgba(0,0,0,0.92)"/><stop offset="100%" stop-color="rgba(0,0,0,0.97)"/></linearGradient>
  <linearGradient id="l" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="rgba(0,0,0,0.96)"/><stop offset="60%" stop-color="rgba(0,0,0,0.42)"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/></linearGradient>
  <linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000"/><stop offset="70%" stop-color="#000"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/></linearGradient>
 </defs>
 <rect width="${B}" height="${H}" fill="url(#v)"/>
 <rect width="${B}" height="620" fill="url(#l)"/>
 <rect width="${B}" height="250" fill="url(#k)"/>
 <circle cx="127" cy="152" r="82" fill="none" stroke="${GOLD}" stroke-width="3"/>
 <text x="52" y="386" font-family="Helvetica,Arial,sans-serif" font-size="92" font-weight="900" letter-spacing="-3"><tspan fill="#fff">Versus</tspan><tspan fill="${GOLD}">Forge.</tspan></text>
 <text x="56" y="438" font-family="Helvetica,Arial,sans-serif" font-size="27" font-weight="900" fill="${GOLD}" letter-spacing="6">THE STRATEGY MACHINE</text>
 <line x1="56" y1="490" x2="240" y2="490" stroke="${GOLD}" stroke-width="4"/>
 <text x="52" y="574" font-family="Helvetica,Arial,sans-serif" font-size="62" font-weight="900" fill="#fff" letter-spacing="-1.5">Findet dir</text>
 <text x="52" y="642" font-family="Helvetica,Arial,sans-serif" font-size="62" font-weight="900" fill="#fff" letter-spacing="-1.5">die Kunden.</text>
 <text x="52" y="700" font-family="Helvetica,Arial,sans-serif" font-size="28" font-weight="800" fill="#fff" fill-opacity="0.6">Strategy wins more than ads.</text>
 <text x="52" y="742" font-family="Helvetica,Arial,sans-serif" font-size="28" font-weight="800" fill="${GOLD}">Die erste Analyse kostet nichts.</text>
 ${marken}
</svg>`;

const i = await sharp("public/VersusForge/kaempfer-spot.webp")
  .resize(B, H, { fit: "cover" })
  .composite([
    { input: Buffer.from(svg), top: 0, left: 0 },
    { input: rund, top: 77, left: 52 },
  ])
  .png().toFile("/tmp/endtafel.png");
console.log("  Schlusstafel:", i.width + "x" + i.height, Math.round(i.size / 1024) + " KB");
