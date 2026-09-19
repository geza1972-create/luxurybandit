import fs from "node:fs";
import sharp from "sharp";
import { werkFreistellen } from "./scratch-warp.mjs";

for (const z of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(z.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "shopcut-images";
const OA = process.env.OPENAI_API_KEY;
const AUS = process.argv[2];
const MANDANT = "adrianrosu";
const WERKE = ["0", "1", "2", "3", "4", "6", "7", "8"];
/* Die Leinwände sind 3:4 (Owner 18.09.2026) — das Verhaeltnis kommt von ihm, nicht aus der Erkennung. */
const VERHAELTNIS = 3 / 4;

const hol = (p, init = {}) => fetch(`${URL_}${p}`, { ...init, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, ...(init.headers ?? {}) } });

async function ecken(uri) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OA}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o",
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: [
        { type: "text", text: [
          "This photo shows a painting or a canvas standing or hanging somewhere. Report only geometry; do not describe the artwork.",
          "Give the four corners of the PAINTED SURFACE — not of the photo, not of a frame around it, not of the wall.",
          "If the canvas has visible depth (you can see its side edge), use the corners of the FRONT face only.",
          'Answer as JSON: {"a":{"x":0,"y":0},"b":{"x":1,"y":0},"c":{"x":1,"y":1},"d":{"x":0,"y":1}} with your own numbers.',
          "a = top-left, b = top-right, c = bottom-right, d = bottom-left, as seen in the photo.",
          "All values are fractions of the image width and height, between 0 and 1.",
        ].join(" ") },
        { type: "image_url", image_url: { url: uri, detail: "high" } },
      ] }],
    }),
  });
  const d = await res.json();
  if (d.error) { console.warn("  API:", d.error.message); return null; }
  try { return JSON.parse(d.choices[0].message.content); } catch { return null; }
}

for (const w of WERKE) {
  /* Ab jetzt IMMER vom gesicherten Original ausgehen, falls es eines gibt — sonst
     stellt ein zweiter Lauf ein schon freigestelltes Bild noch einmal frei. */
  const sicher = `versusforge-motiv-original/${MANDANT}/${w}.jpg`;
  const pfad = `versusforge-motiv/${MANDANT}/${w}.jpg`;
  let r = await hol(`/storage/v1/object/${BUCKET}/${sicher.split("/").map(encodeURIComponent).join("/")}`);
  if (!r.ok) r = await hol(`/storage/v1/object/${BUCKET}/${pfad.split("/").map(encodeURIComponent).join("/")}`);
  if (!r.ok) { console.log(`${w}: kein Bild (${r.status})`); continue; }
  const roh = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(`${AUS}/${w}-vorher.jpg`, roh);
  const uri = `data:image/jpeg;base64,${roh.toString("base64")}`;
  const e = await ecken(uri);
  if (!e?.a) { console.log(`${w}: keine Ecken`); continue; }
  const frei = await werkFreistellen(uri, e, VERHAELTNIS);
  if (!frei) { console.log(`${w}: Entzerrung fehlgeschlagen`); continue; }
  const puffer = Buffer.from(frei.split(",")[1], "base64");
  fs.writeFileSync(`${AUS}/${w}-nachher.jpg`, puffer);
  const v = await sharp(roh).metadata(), n = await sharp(puffer).metadata();
  console.log(`${w}: ${v.width}x${v.height} → ${n.width}x${n.height}`);
}
