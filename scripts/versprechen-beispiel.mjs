/**
 * DAS BEISPIELVIDEO DES VERSPRECHENS — aus dem Bild „Mann mit Porsche" (Owner 10.08.2026:
 * „Mach doch ein Video aus dem Bild Mann mit Porsche. und füge es ein" · „es muss auf
 * englisch sein").
 *
 * Einmal laufen lassen, dann liegt die Datei im Repo und wird nie wieder erzeugt — genau wie
 * die Geburtstags-Beispiele. Der Weg ist DERSELBE wie im Produkt (`/api/geburtstag-video`),
 * nur ohne den Bild-Schritt: Das Foto IST schon der Look, also wird kein neuer gemalt. Das
 * spart den teuersten Teil der Kette (Memory `heygen-kosten-look`: der Bild-Schritt frass
 * 79 % der Kosten).
 *
 *   node scripts/versprechen-beispiel.mjs
 */
import fs from "node:fs";
import path from "node:path";

/* .env.local von Hand lesen — dieses Skript läuft ausserhalb von Next. */
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);

const KEY = (env.HEYGEN_API_KEY || "").trim();
if (!KEY) { console.error("HEYGEN_API_KEY fehlt in .env.local"); process.exit(1); }
const H = { "X-Api-Key": KEY };

/**
 * DER TEXT DES BEISPIELVIDEOS — der Wortlaut des Owners vom Abend des 10.08.2026 („hier ist
 * der text fürs Video", danach „ja, starten").
 *
 * ZWEI TEILE, ZWEI ADRESSATEN — und deshalb steht dieser Text NUR hier:
 *
 *   1. Das Versprechen — die drei Sätze in Anführungszeichen aus seinem Text. Sie beginnen
 *      mit dem EINGESTÄNDNIS („I don't know exactly how I'll get there yet"), und genau das
 *      spricht auch der Kunde in SEINEM Video (`VERSPRECHEN_SATZ_EN` in lib/versprechen.ts).
 *   2. Die Einladung: „Upload your video now. We'll do the rest." Sie geht an den ZUSCHAUER
 *      der Landingpage und steht deshalb NUR hier — in einem Kundenvideo hätte sie nichts zu
 *      suchen. In seinem Text ist sie die Schlusszeile; im Werbemittel gehört genau die ans
 *      Ende, sonst endet die Anzeige ohne Aufforderung.
 *
 * Englisch (Owner: „es muss auf englisch sein"). Rund 18 Sekunden, ~0,90 $ je Lauf — einmal.
 */
const SATZ =
  "I don't know exactly how I'll get there yet. But I'm going to work for it. " +
  "I'm going to bandit this life. " +
  "Upload your video now. We'll do the rest.";

/* „Daniel" — dieselbe Männerstimme, die auch der Trichter nimmt, wenn keine eigene Aufnahme
   vorliegt (VOICE_MANN in app/api/geburtstag-video). */
const VOICE_MANN = "0c23804af39a4946ac6fda42bfff2738";

/**
 * DER AVATAR EXISTIERT SCHON — er wird NICHT bei jedem Lauf neu gebaut (Owner 10.08.2026:
 * „du hast doch das Bild hochgeladen, er muss doch nichts mehr an avatr ändern").
 *
 * Er hatte recht, und es war ein teurer Fehler von mir: Jeder Lauf legte einen neuen
 * Foto-Avatar an — und der kostet laut HeyGens eigener Preisliste **1,00 je Aufruf**,
 * unabhängig davon, dass es dasselbe Gesicht ist. Bei einem 17-Sekunden-Video (0,85 für die
 * Sekunden) war die Pauschale also TEURER als das Video selbst. Zweimal bezahlt für nichts.
 *
 * Der Avatar unten ist aus `public/Versprechen/look-villa.png` entstanden und bleibt gültig.
 * Wer das Bild austauscht, setzt hier "" ein — dann baut das Skript einmal einen neuen und
 * schreibt die Kennung in die Ausgabe; die trägt man hier ein und zahlt nie wieder dafür.
 */
const AVATAR_ID = "978730b978474f4d85383c21b4f88fba";

const QUELLE = "public/Luxurybanditplan/Bild3.png";
const ZIEL = "public/Versprechen/promise-example.mp4";

const warte = ms => new Promise(r => setTimeout(r, ms));

console.log(`Satz: „${SATZ}"`);

let avatarId = AVATAR_ID;
if (avatarId) {
  console.log(`Avatar wiederverwendet: ${avatarId} — kostet 0,00 (kein neuer Aufruf).`);
} else {
  /* NUR beim allerersten Mal (oder nach einem Bildwechsel): hochladen und EINEN Avatar bauen. */
  const foto = fs.readFileSync(QUELLE);
  console.log(`Bild: ${QUELLE} (${(foto.length / 1024 / 1024).toFixed(1)} MB)`);
  const mime = foto[0] === 0xff ? "image/jpeg" : "image/png";
  /**
   * DIE GRATIS-TÜR (Owner 10.08.2026: „Du sendest ihm doch das jpg" — und er hatte recht).
   *
   * Hier stand `POST /v3/avatars {type:"photo"}`. Das ist die BEZAHLTE Tür: HeyGen legt einen
   * Avatar an und verlangt 1,00 je Aufruf. `upload/v1/talking_photo` nimmt dasselbe fertige
   * Bild entgegen und kostet nichts — genau diesen Weg geht das Produkt seit dem 08.08.
   * (`app/api/geburtstag-video`, nachdem OpenAI das Malen übernommen hat). Mein Skript ist
   * dem alten Weg gefolgt und hat je Lauf 1,00 verbrannt, für ein Bild, das schon fertig war.
   */
  const av = await fetch("https://upload.heygen.com/v1/talking_photo", {
    method: "POST", headers: { ...H, "Content-Type": mime }, body: new Uint8Array(foto),
  }).then(r => r.json());
  avatarId = av?.data?.talking_photo_id;
  if (!avatarId) { console.error("Foto-Avatar fehlgeschlagen:", JSON.stringify(av).slice(0, 300)); process.exit(1); }
  console.log(`NEUER Avatar (über die Gratis-Tür): ${avatarId} — trag ihn oben als AVATAR_ID ein.`);
  /* Ein frischer Foto-Avatar braucht ein paar Sekunden, ehe er als Referenz gilt. */
  await warte(20000);
}

/* 3) Das Video. `motion_prompt` ist die Bewegung des Versprechen-Looks — ruhig, ernst,
   kein hinzuerfundenes Lächeln. */
const gen = await fetch("https://api.heygen.com/v3/videos", {
  method: "POST", headers: { ...H, "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "avatar",
    avatar_id: avatarId,
    script: SATZ,
    voice_id: VOICE_MANN,
    voice_settings: { speed: 1.0 },
    aspect_ratio: "auto",
    resolution: "720p",
    motion_prompt:
      "He keeps the calm, determined expression from the photo — no smile added, no grin, " +
      "no invented teeth — and looks straight into the camera while speaking. Subtle natural " +
      "movement of head, hair and shoulders; the evening light shifts gently.",
    expressiveness: "medium",
    engine: { type: "avatar_iv" },
  }),
}).then(r => r.json());
const videoId = gen?.data?.video_id;
if (!videoId) { console.error("Start fehlgeschlagen:", JSON.stringify(gen).slice(0, 400)); process.exit(1); }
console.log("Video läuft:", videoId);

/* 4) Warten und holen — bis zu 10 Minuten, alle 10 s nachfragen. */
let url = "";
for (let i = 0; i < 60 && !url; i++) {
  await warte(10000);
  const st = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, { headers: H })
    .then(r => r.json()).catch(() => null);
  const s = st?.data?.status;
  if (i % 3 === 0) console.log(`  … ${s ?? "?"} (${(i + 1) * 10}s)`);
  if (s === "completed") url = st?.data?.video_url ?? "";
  if (s === "failed") { console.error("HeyGen meldet failed:", JSON.stringify(st?.data?.error ?? {}).slice(0, 300)); process.exit(1); }
}
if (!url) { console.error("Zeitüberschreitung."); process.exit(1); }

fs.mkdirSync(path.dirname(ZIEL), { recursive: true });
const mp4 = Buffer.from(await (await fetch(url)).arrayBuffer());
fs.writeFileSync(ZIEL, mp4);
console.log(`fertig: ${ZIEL} (${(mp4.length / 1024 / 1024).toFixed(1)} MB)`);
