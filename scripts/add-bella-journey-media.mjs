/**
 * Uploads the sample Tenerife-journey media (public/Alba*.png + public/Peter/*)
 * as Card Studio slides for Bella (curator-1783683672619-td4cy).
 *
 *   node scripts/add-bella-journey-media.mjs            # Probelauf
 *   node scripts/add-bella-journey-media.mjs --apply     # schreibt wirklich
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, extname, basename } from "node:path";
import { randomUUID } from "node:crypto";

const APPLY = process.argv.includes("--apply");
const BELLA_ID = "curator-1783683672619-td4cy";

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
if (!SUPABASE_URL || !KEY) { console.error("❌ SUPABASE_URL oder KEY fehlt in .env.local"); process.exit(1); }
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp4": "video/mp4", ".webp": "image/webp" };

async function uploadFile(localPath, folder) {
  const ext = extname(localPath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  const path = `try-this-look/${folder}/${Date.now()}-${randomUUID()}${ext}`;
  const bytes = readFileSync(localPath);
  if (APPLY) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(path)}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": mime, "x-upsert": "false" },
      body: bytes,
    });
    if (!res.ok) throw new Error(`Upload failed for ${localPath}: ${res.status} ${await res.text()}`);
  }
  return path;
}

async function main() {
  console.log(`\n${APPLY ? "🔧 APPLY — es wird geschrieben." : "👀 DRY RUN — nur Bericht. Mit --apply ausführen."}\n`);

  const publicDir = resolve(process.cwd(), "public");
  const albaFiles = readdirSync(publicDir).filter(f => /^alba\s?\d*\.(png|jpe?g)$/i.test(f)).map(f => resolve(publicDir, f));
  const peterDir = resolve(publicDir, "Peter");
  const peterFiles = readdirSync(peterDir).map(f => resolve(peterDir, f));

  const newSlides = [];

  for (const f of albaFiles) {
    console.log(`  • image ${basename(f)}`);
    const path = await uploadFile(f, "uploads");
    newSlides.push({
      id: randomUUID(), kind: "image", path,
      caption: "", private: false, source: "admin", pendingApproval: false,
      createdAt: new Date().toISOString(),
    });
  }

  for (const f of peterFiles) {
    const ext = extname(f).toLowerCase();
    const isVideo = ext === ".mp4";
    console.log(`  • ${isVideo ? "video" : "image"} ${basename(f)}`);
    const path = await uploadFile(f, isVideo ? "videos" : "uploads");
    newSlides.push({
      id: randomUUID(), kind: isVideo ? "video" : "image", path,
      caption: "", private: false, source: "admin", pendingApproval: false,
      createdAt: new Date().toISOString(),
    });
  }

  console.log(`\n${newSlides.length} new slide(s) prepared.`);

  if (!APPLY) { console.log("Dry run — nothing written. Re-run with --apply."); return; }

  // Fetch existing slides, back them up, append, write.
  const mainPath = "try-this-look/card-studio.json";
  const backupPath = "try-this-look/card-studio-backup.json";
  const cur = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(mainPath)}`, { headers });
  let existing = [];
  if (cur.ok) {
    const buf = Buffer.from(await cur.arrayBuffer());
    if (buf.length > 2) {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(backupPath)}`, {
        method: "POST", headers: { ...headers, "Content-Type": "application/json", "x-upsert": "true" }, body: buf,
      });
      const data = JSON.parse(buf.toString("utf8"));
      existing = Array.isArray(data.slides) ? data.slides : [];
    }
  }
  const slides = [...newSlides, ...existing].slice(0, 500);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(mainPath)}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ slides, savedAt: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Write card-studio.json failed: ${res.status} ${await res.text()}`);
  console.log(`✅ Wrote ${slides.length} total slides to ${mainPath} (curator ${BELLA_ID}).`);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
