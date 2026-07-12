/**
 * Einmaliges Backfill: komprimiert alle in Supabase gespeicherten Try-on-VIDEOS (H.264, 720p,
 * CRF 28) und stellt die state.json auf die kleineren Dateien um. Videos sind im Schnitt ~12 MB
 * → nach Kompression ~3–5 MB. Bei ~85k Ansichten/Monat spart das grob zwei Drittel der Egress.
 *
 * Sicherheit:
 *  - Standardmäßig DRY RUN (nur Bericht, keine Änderung). Erst mit `--apply` wird geschrieben.
 *  - Vor dem Überschreiben wird die state.json lokal gesichert (state-backup-<zeit>.json).
 *  - Original-Videos werden NICHT gelöscht — die komprimierte Version landet unter …-c.mp4.
 *  - Idempotent: bereits komprimierte (…-c.mp4) Videos werden übersprungen.
 *  - Braucht ffmpeg im PATH (auf diesem Mac vorhanden: /opt/homebrew/bin/ffmpeg).
 *
 * Nutzung (im Projektordner):
 *   node scripts/compress-videos.mjs            # Probelauf: zeigt Größen & geschätzte Ersparnis
 *   node scripts/compress-videos.mjs --apply    # komprimiert wirklich & stellt den State um
 *   node scripts/compress-videos.mjs --apply --limit 10   # nur die ersten 10 (Testlauf)
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const APPLY = process.argv.includes("--apply");
// --samples : im Probelauf die komprimierten Clips lokal nach ./video-samples/ schreiben,
// damit du die Qualität in QuickTime prüfen kannst, BEVOR du --apply ausführst.
const SAMPLES = process.argv.includes("--samples");
const LIMIT = (() => { const i = process.argv.indexOf("--limit"); return i >= 0 ? Number(process.argv[i + 1]) : Infinity; })();
// --only <text> : nur Videos, deren Pfad diesen Text enthält (z.B. --only gina zum Einzel-Test).
const ONLY = (() => { const i = process.argv.indexOf("--only"); return i >= 0 ? String(process.argv[i + 1] || "").toLowerCase() : ""; })();

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = env.SUPABASE_STORAGE_BUCKET || "shopcut-images";
const STATE_PATH = "try-this-look/state.json";

if (!SUPABASE_URL || !KEY) { console.error("❌ NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local"); process.exit(1); }

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

async function downloadObject(path) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(path)}`, { headers });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
async function uploadObject(path, bytes, contentType) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(path)}`, {
    method: "POST", headers: { ...headers, "Content-Type": contentType, "x-upsert": "true" }, body: bytes,
  });
  if (!res.ok) throw new Error(`upload ${res.status}: ${await res.text()}`);
}

// Alle Video-Storage-Pfade aus dem State ziehen (Videos sind als signierte URLs gespeichert,
// der Pfad steckt im /object/sign|public/<bucket>/… Segment).
function collectVideoPaths(text) {
  const re = new RegExp(`/object/(?:sign|public|authenticated)/${BUCKET}/(try-this-look/[^"?\\s]+?\\.(?:mp4|webm|mov))`, "gi");
  const paths = new Set();
  let m;
  while ((m = re.exec(text))) { paths.add(decodeURIComponent(m[1])); }
  return [...paths];
}

function compress(inputBuf) {
  const dir = mkdtempSync(join(tmpdir(), "lbvid-"));
  const inPath = join(dir, "in.mp4"), outPath = join(dir, "out.mp4");
  try {
    writeFileSync(inPath, inputBuf);
    execFileSync("ffmpeg", [
      "-y", "-i", inPath,
      "-vf", "scale='min(720,iw)':-2",   // cap width at 720 (portrait 720 tall stays sharp on phones)
      "-c:v", "libx264", "-crf", "28", "-preset", "veryfast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "96k",
      "-movflags", "+faststart",
      outPath,
    ], { stdio: ["ignore", "ignore", "ignore"] });
    return readFileSync(outPath);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

async function main() {
  console.log(`\n${APPLY ? "🔧 APPLY — es wird komprimiert & geschrieben." : "👀 DRY RUN — nur Bericht. Mit --apply ausführen."}\n`);

  const stateRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(STATE_PATH)}`, { headers });
  if (!stateRes.ok) { console.error(`❌ state.json laden fehlgeschlagen: ${stateRes.status}`); process.exit(1); }
  let stateText = await stateRes.text();

  if (APPLY) {
    const backupFile = `state-backup-${Date.now()}.json`;
    writeFileSync(backupFile, stateText);
    console.log(`💾 Backup der state.json: ${backupFile}`);
  }

  const allPaths = collectVideoPaths(stateText);
  const todo = allPaths
    .filter((p) => !/-c\.(mp4|webm|mov)$/i.test(p))
    .filter((p) => !ONLY || p.toLowerCase().includes(ONLY))
    .slice(0, LIMIT);
  console.log(`📦 Videos im State: ${allPaths.length}, davon noch nicht komprimiert: ${todo.length}${LIMIT !== Infinity ? ` (auf ${LIMIT} begrenzt)` : ""}\n`);

  let ok = 0, failed = 0, before = 0, after = 0;
  const map = new Map(); // oldPath → newPath

  for (const oldPath of todo) {
    const newPath = oldPath.replace(/\.(mp4|webm|mov)$/i, "-c.mp4");
    try {
      const input = await downloadObject(oldPath);
      const output = compress(input);
      before += input.length; after += output.length;
      const mb = (n) => (n / 1048576).toFixed(1);
      console.log(`  ${oldPath.split("/").pop()}  ${mb(input.length)}MB → ${mb(output.length)}MB  (-${Math.round((1 - output.length / input.length) * 100)}%)`);
      if (SAMPLES) { mkdirSync("video-samples", { recursive: true }); writeFileSync(join("video-samples", oldPath.split("/").pop().replace(/\.\w+$/, "-c.mp4")), output); }
      if (APPLY) { await uploadObject(newPath, output, "video/mp4"); map.set(oldPath, newPath); }
      ok++;
    } catch (e) { console.warn(`  ⚠️  übersprungen: ${oldPath} (${e.message})`); failed++; }
  }

  if (APPLY && map.size > 0) {
    for (const [oldP, newP] of map) stateText = stateText.split(oldP).join(newP); // Pfad-Substring in allen URLs ersetzen
    await uploadObject(STATE_PATH, Buffer.from(stateText), "application/json");
    console.log(`\n✅ state.json aktualisiert (${map.size} Videos umgestellt). hydrateState re-signiert die neuen Pfade beim Lesen.`);
  }

  const gb = (n) => (n / 1073741824).toFixed(2);
  console.log(`\n── Zusammenfassung ──`);
  console.log(`komprimiert: ${ok}, fehlgeschlagen: ${failed}`);
  console.log(`Größe: ${gb(before)} GB → ${gb(after)} GB  (${before ? Math.round((1 - after / before) * 100) : 0}% kleiner)`);
  console.log(`→ pro Video-Ansicht künftig ~${before ? Math.round((1 - after / before) * 100) : 0}% weniger Egress.`);
  if (!APPLY) console.log(`\nNichts geschrieben (Probelauf). Wenn die Größen passen:  node scripts/compress-videos.mjs --apply`);
  console.log(`Original-Videos bleiben erhalten (kein Löschen).`);
}

main().catch((e) => { console.error("❌ Fehler:", e); process.exit(1); });
