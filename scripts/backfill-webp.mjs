/**
 * Einmaliges Backfill: konvertiert alle bereits in Supabase gespeicherten
 * PNG/JPG-Bilder zu WebP und aktualisiert die Pfade in der state.json.
 *
 * Sicherheit:
 *  - Standardmäßig DRY RUN (nur Bericht, keine Änderung). Erst mit `--apply` wird geschrieben.
 *  - Vor dem Überschreiben wird die state.json lokal gesichert (state-backup-<zeit>.json).
 *  - Original-PNGs werden NICHT gelöscht (kein Datenverlust). Aufräumen geht später.
 *  - Idempotent: bereits konvertierte (.webp) Pfade werden übersprungen, mehrfaches Ausführen ist ok.
 *
 * Nutzung (im Projektordner):
 *   node scripts/backfill-webp.mjs            # Probelauf: zeigt nur, was passieren würde
 *   node scripts/backfill-webp.mjs --apply    # führt die Konvertierung wirklich aus
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const APPLY = process.argv.includes("--apply");

// ── .env.local einlesen ───────────────────────────────────────────────
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
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BUCKET = env.SUPABASE_STORAGE_BUCKET || "shopcut-images";
const STATE_PATH = "try-this-look/state.json";

if (!SUPABASE_URL || !KEY) {
  console.error("❌ SUPABASE_URL oder KEY fehlt in .env.local");
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

async function downloadObject(path) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(path)}`, { headers });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadObject(path, bytes, contentType) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(path)}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": contentType, "x-upsert": "true" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`upload ${res.status}: ${await res.text()}`);
}

// Alle Bild-Pfad-Strings rekursiv aus dem State sammeln (Felder heißen *Path).
function collectImagePaths(node, out) {
  if (typeof node === "string") {
    if (/^try-this-look\/.*\.(png|jpe?g)$/i.test(node)) out.add(node);
  } else if (Array.isArray(node)) {
    for (const v of node) collectImagePaths(v, out);
  } else if (node && typeof node === "object") {
    for (const v of Object.values(node)) collectImagePaths(v, out);
  }
}

// Alle Vorkommen alter Pfade im State durch neue ersetzen.
function rewritePaths(node, map) {
  if (typeof node === "string") return map.get(node) ?? node;
  if (Array.isArray(node)) return node.map((v) => rewritePaths(v, map));
  if (node && typeof node === "object") {
    const o = {};
    for (const [k, v] of Object.entries(node)) o[k] = rewritePaths(v, map);
    return o;
  }
  return node;
}

async function main() {
  console.log(`\n${APPLY ? "🔧 APPLY-Modus — es wird geschrieben." : "👀 DRY RUN — nur Bericht. Mit --apply ausführen."}\n`);

  // State laden
  const stateRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(STATE_PATH)}`, { headers });
  if (!stateRes.ok) { console.error(`❌ state.json laden fehlgeschlagen: ${stateRes.status}`); process.exit(1); }
  const stateText = await stateRes.text();
  const state = JSON.parse(stateText);

  // Backup
  const backupFile = `state-backup-${Date.now()}.json`;
  writeFileSync(backupFile, stateText);
  console.log(`💾 Backup der state.json: ${backupFile}`);

  // Pfade sammeln
  const paths = new Set();
  collectImagePaths(state, paths);
  const toConvert = [...paths].filter((p) => /\.(png|jpe?g)$/i.test(p));
  console.log(`📦 Bild-Pfade gesamt: ${paths.size}, davon PNG/JPG zu konvertieren: ${toConvert.length}\n`);

  const map = new Map();
  let ok = 0, skipped = 0, failed = 0, savedBytes = 0;

  for (const oldPath of toConvert) {
    const newPath = oldPath.replace(/\.(png|jpe?g)$/i, ".webp");
    try {
      const input = await downloadObject(oldPath);
      const output = await sharp(input)
        .rotate() // EXIF-Orientierung beachten
        .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      const saved = input.length - output.length;
      savedBytes += saved > 0 ? saved : 0;
      console.log(`  ${oldPath}  ${(input.length / 1024 | 0)}KB → ${(output.length / 1024 | 0)}KB`);
      if (APPLY) {
        await uploadObject(newPath, output, "image/webp");
        map.set(oldPath, newPath);
      } else {
        map.set(oldPath, newPath);
      }
      ok++;
    } catch (e) {
      console.warn(`  ⚠️  übersprungen: ${oldPath} (${e.message})`);
      failed++;
    }
  }

  // State neu schreiben
  if (APPLY && map.size > 0) {
    const newState = rewritePaths(state, map);
    await uploadObject(STATE_PATH, Buffer.from(JSON.stringify(newState)), "application/json");
    console.log(`\n✅ state.json aktualisiert (${map.size} Pfade umgestellt).`);
  }

  console.log(`\n── Zusammenfassung ──`);
  console.log(`konvertiert: ${ok}, fehlgeschlagen: ${failed}, ~gespart: ${(savedBytes / 1024 / 1024).toFixed(1)} MB`);
  if (!APPLY) console.log(`\nNichts geschrieben (Probelauf). Wenn das gut aussieht:  node scripts/backfill-webp.mjs --apply`);
  console.log(`Original-Dateien bleiben erhalten (kein Löschen).`);
}

main().catch((e) => { console.error("❌ Fehler:", e); process.exit(1); });
