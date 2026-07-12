/**
 * Lädt ALLE in Supabase gespeicherten Videos lokal nach ./video-backup/ herunter — ein
 * kompletter Offline-Backup deiner Try-on-Clips (Originale UND bereits komprimierte …-c.mp4).
 *
 *  - Listet direkt den Storage-Bucket (nicht nur den State) → erfasst auch Originale, deren
 *    State-Referenz schon auf die komprimierte Version zeigt.
 *  - Resumebar: bereits heruntergeladene Dateien werden übersprungen (einfach neu starten).
 *  - Ändert NICHTS in Supabase (reiner Download).
 *
 * Nutzung (im Projektordner):
 *   cd ~/dev/luxurybandit
 *   node scripts/download-videos.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { resolve, join, dirname } from "node:path";

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
const OUT_DIR = "video-backup";
const FOLDERS = ["try-this-look/videos", "try-this-look/generations"];
const VIDEO_RE = /\.(mp4|webm|mov|m4v)$/i;

if (!SUPABASE_URL || !KEY) { console.error("❌ NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local"); process.exit(1); }
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

// Einen Storage-Ordner (nicht rekursiv) auflisten, paginiert.
async function listFolder(prefix) {
  const files = [];
  for (let offset = 0; ; offset += 100) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: prefix + "/", limit: 100, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!res.ok) throw new Error(`list ${prefix} → ${res.status}`);
    const batch = await res.json();
    for (const o of batch) if (o.name && o.id !== null) files.push(`${prefix}/${o.name}`);
    if (batch.length < 100) break;
  }
  return files;
}

async function download(path, dest) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(path)}`, { headers });
  if (!res.ok) throw new Error(`download ${res.status}`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  console.log(`\n⬇️  Lade alle Videos nach ./${OUT_DIR}/ …\n`);
  let all = [];
  for (const f of FOLDERS) { try { all.push(...await listFolder(f)); } catch (e) { console.warn(`  ⚠️  ${f}: ${e.message}`); } }
  const vids = [...new Set(all)].filter((p) => VIDEO_RE.test(p));
  console.log(`📦 Videos im Storage: ${vids.length}\n`);

  let got = 0, skipped = 0, failed = 0, bytes = 0;
  for (const path of vids) {
    const dest = join(OUT_DIR, path);
    if (existsSync(dest) && statSync(dest).size > 0) { skipped++; continue; }
    try {
      await download(path, dest);
      bytes += statSync(dest).size;
      got++;
      if (got % 10 === 0) console.log(`  … ${got} geladen`);
    } catch (e) { console.warn(`  ⚠️  ${path}: ${e.message}`); failed++; }
  }

  console.log(`\n── Fertig ──`);
  console.log(`geladen: ${got}, übersprungen (schon da): ${skipped}, fehlgeschlagen: ${failed}`);
  console.log(`Gesamt neu: ${(bytes / 1073741824).toFixed(2)} GB  →  Ordner: ${resolve(OUT_DIR)}`);
}

main().catch((e) => { console.error("❌ Fehler:", e); process.exit(1); });
