/**
 * Findet (und löscht optional) VERWAISTE Videos in Supabase Storage: Dateien, die im Bucket
 * liegen, aber NIRGENDS mehr in der state.json referenziert werden — z.B. Clips, die du im
 * System gelöscht hast, deren Datei aber blieb.
 *
 * SICHERHEIT:
 *  - Standardmäßig DRY RUN (nur Liste + Größen, löscht NICHTS). Erst mit `--apply` wird gelöscht.
 *  - Eine Datei gilt nur als Waise, wenn ihr GANZER Pfad im kompletten state.json-Text fehlt.
 *  - Kompressions-Originale werden GESCHÜTZT: liegt zu `X.mp4` ein `X-c.mp4` im Bucket, gilt
 *    X.mp4 als Backup der komprimierten Version und wird NICHT gelöscht (--include-compressed-src hebt das auf).
 *  - Du hast bereits ein lokales Voll-Backup (./video-backup/), also ist Löschen zur Not umkehrbar.
 *
 * Nutzung (im Projektordner):
 *   cd ~/dev/luxurybandit
 *   node scripts/cleanup-orphan-videos.mjs           # Probelauf: zeigt nur, was Waisen sind
 *   node scripts/cleanup-orphan-videos.mjs --apply    # löscht die Waisen wirklich
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APPLY = process.argv.includes("--apply");
const INCLUDE_COMPRESSED_SRC = process.argv.includes("--include-compressed-src");

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
const FOLDERS = ["try-this-look/videos", "try-this-look/generations"];
const VIDEO_RE = /\.(mp4|webm|mov|m4v)$/i;

if (!SUPABASE_URL || !KEY) { console.error("❌ NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local"); process.exit(1); }
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

async function listFolder(prefix) {
  const files = [];
  for (let offset = 0; ; offset += 100) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: prefix + "/", limit: 100, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!res.ok) throw new Error(`list ${prefix} → ${res.status}`);
    const batch = await res.json();
    for (const o of batch) if (o.name && o.id !== null) files.push({ path: `${prefix}/${o.name}`, size: o.metadata?.size ?? 0 });
    if (batch.length < 100) break;
  }
  return files;
}

async function removeObjects(paths) {
  // Batch-Delete: POST /storage/v1/object/{bucket}  body { prefixes: [...] }
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
    method: "DELETE", headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!res.ok) throw new Error(`delete → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log(`\n${APPLY ? "🗑️  APPLY — verwaiste Videos werden GELÖSCHT." : "👀 DRY RUN — nur Bericht. Mit --apply löschen."}\n`);

  const stateRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(STATE_PATH)}`, { headers });
  if (!stateRes.ok) { console.error(`❌ state.json laden fehlgeschlagen: ${stateRes.status}`); process.exit(1); }
  const stateText = await stateRes.text();

  let all = [];
  for (const f of FOLDERS) { try { all.push(...await listFolder(f)); } catch (e) { console.warn(`  ⚠️  ${f}: ${e.message}`); } }
  const vids = all.filter((f) => VIDEO_RE.test(f.path));
  const bucketPaths = new Set(vids.map((f) => f.path));

  const referenced = [], orphans = [], protectedSrc = [];
  for (const f of vids) {
    if (stateText.includes(f.path)) { referenced.push(f); continue; }
    // Nicht referenziert → potenzielle Waise. Kompressions-Original schützen?
    const compressedTwin = f.path.replace(/\.(mp4|webm|mov|m4v)$/i, "-c.mp4");
    if (!INCLUDE_COMPRESSED_SRC && bucketPaths.has(compressedTwin)) { protectedSrc.push(f); continue; }
    orphans.push(f);
  }

  const mb = (n) => (n / 1048576).toFixed(1);
  const sum = (arr) => arr.reduce((a, f) => a + Number(f.size || 0), 0);
  console.log(`📦 Videos im Storage: ${vids.length}`);
  console.log(`   ✓ referenziert (behalten): ${referenced.length}  (${mb(sum(referenced))} MB)`);
  console.log(`   🛡  komprimierte Originale (behalten): ${protectedSrc.length}  (${mb(sum(protectedSrc))} MB)`);
  console.log(`   🗑  VERWAIST (löschbar): ${orphans.length}  (${mb(sum(orphans))} MB)\n`);

  if (orphans.length) {
    console.log("Verwaiste Dateien:");
    for (const f of orphans.slice(0, 200)) console.log(`   ${f.path}  (${mb(f.size)} MB)`);
    if (orphans.length > 200) console.log(`   … und ${orphans.length - 200} weitere`);
  }

  if (APPLY && orphans.length) {
    // In Blöcken von 50 löschen.
    for (let i = 0; i < orphans.length; i += 50) {
      await removeObjects(orphans.slice(i, i + 50).map((f) => f.path));
      console.log(`   gelöscht ${Math.min(i + 50, orphans.length)}/${orphans.length}`);
    }
    console.log(`\n✅ ${orphans.length} verwaiste Videos gelöscht (${mb(sum(orphans))} MB frei).`);
  } else if (!APPLY) {
    console.log(`\nNichts gelöscht (Probelauf). Wenn die Liste stimmt:  node scripts/cleanup-orphan-videos.mjs --apply`);
    console.log(`(Lokales Backup liegt in ./video-backup/ — Löschen ist zur Not umkehrbar.)`);
  }
}

main().catch((e) => { console.error("❌ Fehler:", e); process.exit(1); });
