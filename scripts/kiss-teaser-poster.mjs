/**
 * Zieht ein Standbild aus dem Kuss-Teaservideo und legt es als `teaserPosterPath` in der
 * Kiss-Konfiguration ab — damit der Rundbrief ein Bild schicken kann.
 *
 * WARUM ALS SKRIPT und nicht in der Route: Ein Frame aus einem Video zu holen braucht ffmpeg.
 * Das gibt es auf dem Entwicklungsrechner, aber NICHT auf Vercel. Also einmal hier erzeugen
 * und ablegen; die Route liest danach nur noch ein fertiges Bild.
 *
 * Nutzung:  node scripts/kiss-teaser-poster.mjs          (Probelauf)
 *           node scripts/kiss-teaser-poster.mjs --apply  (wirklich schreiben)
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const APPLY = process.argv.includes("--apply");

const env = (() => {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const o = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return o;
})();

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
const BUCKET = env.SUPABASE_STORAGE_BUCKET || "shopcut-images";
if (!URL_BASE || !KEY) { console.error("Supabase-Zugang fehlt in .env.local"); process.exit(1); }

const enc = (p) => p.split("/").map(encodeURIComponent).join("/");
const sb = (path, init = {}) => fetch(`${URL_BASE}${path}`, {
  ...init,
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, ...(init.headers ?? {}) },
});

const CFG = "try-this-look/kiss-config.json";

const signiert = async (pfad, sek = 600) => {
  const r = await sb(`/storage/v1/object/sign/${BUCKET}/${enc(pfad)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: sek }),
  });
  if (!r.ok) throw new Error(`Signieren fehlgeschlagen: ${r.status}`);
  const d = await r.json();
  return `${URL_BASE}/storage/v1${d.signedURL ?? d.signedUrl}`;
};

const cfgRes = await sb(`/storage/v1/object/${BUCKET}/${enc(CFG)}`);
if (!cfgRes.ok) { console.error("Kiss-Konfiguration nicht lesbar:", cfgRes.status); process.exit(1); }
const cfg = await cfgRes.json();
const video = cfg.teaserPath || (cfg.examplePaths ?? [])[0] || "";
if (!video) { console.error("Kein Teaser-Video eingetragen."); process.exit(1); }
console.log("Video:", video);
if (cfg.teaserPosterPath) console.log("Vorhandenes Poster:", cfg.teaserPosterPath);

const dir = mkdtempSync(join(tmpdir(), "kissposter-"));
try {
  const src = await signiert(video);
  const mp4 = join(dir, "teaser.mp4");
  writeFileSync(mp4, Buffer.from(await (await fetch(src)).arrayBuffer()));
  const jpg = join(dir, "poster.jpg");
  // Sekunde 1,2 statt 0: Das allererste Bild ist bei Pixverse oft noch halb aufgebaut.
  execFileSync("ffmpeg", ["-y", "-ss", "1.2", "-i", mp4, "-frames:v", "1", "-vf", "scale=936:-2", "-q:v", "4", jpg], { stdio: "pipe" });
  const bild = readFileSync(jpg);
  console.log("Standbild erzeugt:", bild.length, "Bytes");

  if (!APPLY) { console.log("\nProbelauf — nichts geschrieben. Mit --apply wirklich ablegen."); process.exit(0); }

  const ziel = `try-this-look/posters/kiss-teaser-${Date.now()}.jpg`;
  const put = await sb(`/storage/v1/object/${BUCKET}/${enc(ziel)}`, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: bild,
  });
  if (!put.ok) { console.error("Hochladen fehlgeschlagen:", put.status, await put.text()); process.exit(1); }

  const neu = { ...cfg, teaserPosterPath: ziel };
  const save = await sb(`/storage/v1/object/${BUCKET}/${enc(CFG)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify(neu),
  });
  if (!save.ok) { console.error("Konfiguration speichern fehlgeschlagen:", save.status); process.exit(1); }
  console.log("Fertig. teaserPosterPath =", ziel);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
