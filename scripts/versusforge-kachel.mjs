import sharp from "sharp";

/**
 * DIE TOPIC-KACHEL AUF LUXURYBANDIT (Owner 09.09.2026: „das fehlt auch, das Topicbild mit dem
 * Roboter").
 *
 * WAS VORHER DA WAR: eine gezeichnete ASCII-Strecke mit dem alten Beschreiber „THE STRATEGY
 * MACHINE". Sie stammte vom 8. September, aus der Zeit vor dem Kämpfer — und sie zeigte ein
 * Schaubild statt eines Gesichts. Auf einer Kachelwand gewinnt das Gesicht.
 *
 * DER SAUBERE AUSSCHNITT, NICHT DAS PLAKAT. `kaempfer.webp` trägt eingebrannten Text (alte
 * Wortmarke, alte Zeile); `kaempfer-held.webp` ist der freigestellte Kämpfer ohne Schrift.
 * Wer das Plakat nimmt, hat zwei Wortmarken auf einem Bild.
 *
 * GOLD, NICHT BLAU: Diese Kachel steht auf der LuxuryBandit-Themenwand, in der dunklen,
 * goldenen Welt. Blau wäre hier die Ausnahme; die blaue Fassung beginnt erst hinter dem Klick.
 */
const B = 1086, H = 1448;
const GOLD = "#f6cf51";

const kaempfer = await sharp("public/VersusForge/kaempfer-held.webp")
  .resize({ height: H, fit: "cover" })
  .toBuffer();
const { width: kb = 0 } = await sharp(kaempfer).metadata();

const schrift = "Helvetica Neue, Helvetica, Arial, sans-serif";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}">
  <defs>
    <linearGradient id="links" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#050708" stop-opacity="1"/>
      <stop offset="0.52" stop-color="#050708" stop-opacity="0.92"/>
      <stop offset="1" stop-color="#050708" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="unten" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#050708" stop-opacity="0"/>
      <stop offset="1" stop-color="#050708" stop-opacity="0.96"/>
    </linearGradient>
  </defs>
  <rect width="${B}" height="${H}" fill="url(#links)"/>
  <rect y="${H - 560}" width="${B}" height="560" fill="url(#unten)"/>
  <g font-family="${schrift}" font-weight="bold">
    <text x="70" y="150" font-size="76" fill="#ffffff" letter-spacing="-3">Versus<tspan fill="${GOLD}">Forge.</tspan></text>
    <text x="74" y="196" font-size="21" fill="#8b8b8b" letter-spacing="7">MARKETING ENGINE</text>
    <text x="70" y="${H - 236}" font-size="52" fill="#ffffff" letter-spacing="-1.5">Sag, was du</text>
    <text x="70" y="${H - 176}" font-size="52" fill="#ffffff" letter-spacing="-1.5">erreichen willst.</text>
    <text x="70" y="${H - 116}" font-size="52" fill="${GOLD}" letter-spacing="-1.5">Wir bauen den Weg.</text>
    <text x="70" y="${H - 56}" font-size="26" fill="#9a9a9a">Vier Fragen. Die Strategie kostet nichts.</text>
  </g>
</svg>`;

const bild = await sharp({ create: { width: B, height: H, channels: 3, background: "#050708" } })
  /* Der Kämpfer rechts, leicht über den Rand hinaus — angeschnitten wirkt er grösser als er
     ist, und links bleibt Platz für die Schrift. */
  .composite([
    { input: kaempfer, top: 0, left: Math.round(B - kb * 0.86) },
    { input: Buffer.from(svg), top: 0, left: 0 },
  ])
  .jpeg({ quality: 90 })
  .toBuffer();

await sharp(bild).toFile("public/VersusForge/versusforge-kachel.jpg");
console.log("Kachel neu:", bild.length, "Bytes");
