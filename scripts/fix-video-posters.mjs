/**
 * Erzeugt echte POSTER-Bilder für Videos, die keins (oder nur ein blankes) haben — z.B. manuell
 * hochgeladene Clips, deren Poster ein leeres ~0,5-KB-WebP ist (→ grauer "VID"-Kasten im Admin),
 * oder Look-Videos ohne videoPosterUrl (→ posterlos, spielen ungewollt im Grid).
 *
 * Zieht mit ffmpeg einen Frame (~0,5 s) aus dem Video, lädt ihn als WebP hoch und trägt ihn im
 * State ein (generation.imagePath bzw. look.videoPosterPath).
 *
 * SICHERHEIT:
 *  - Standardmäßig DRY RUN (nur Bericht). Erst mit `--apply` wird geschrieben.
 *  - Fügt nur Poster HINZU — löscht/überschreibt keine Videos. State wird vorher gesichert.
 *  - Idempotent: Videos, die schon einen echten Poster (> MIN_BYTES) haben, werden übersprungen.
 *  - Braucht ffmpeg im PATH.
 *
 * Nutzung:  cd ~/dev/luxurybandit
 *   node scripts/fix-video-posters.mjs            # Probelauf
 *   node scripts/fix-video-posters.mjs --apply     # wirklich erzeugen
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const APPLY = process.argv.includes("--apply");
const MIN_BYTES = 2000; // Poster kleiner als das gilt als "blank/kaputt".

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of text.split("\n")) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim(); }
  return env;
}
const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = env.SUPABASE_STORAGE_BUCKET || "shopcut-images";
const STATE_PATH = "try-this-look/state.json";
if (!SUPABASE_URL || !KEY) { console.error("❌ SUPABASE URL/KEY fehlt in .env.local"); process.exit(1); }
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

const pathFromUrl = (u) => { const m = String(u || "").match(new RegExp(`/object/(?:sign|public|authenticated)/${BUCKET}/([^?]+)`)); return m ? decodeURIComponent(m[1]) : ""; };

async function head(path) { try { const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(path)}`, { method: "HEAD", headers }); return r.ok ? Number(r.headers.get("content-length") || 0) : -1; } catch { return -1; } }
async function download(path) { const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(path)}`, { headers }); if (!r.ok) throw new Error(`download ${r.status}`); return Buffer.from(await r.arrayBuffer()); }
async function upload(path, bytes, ct) { const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(path)}`, { method: "POST", headers: { ...headers, "Content-Type": ct, "x-upsert": "true" }, body: bytes }); if (!r.ok) throw new Error(`upload ${r.status}: ${await r.text()}`); }

function posterFrame(videoBuf) {
  // JPEG output — this ffmpeg build has no webp encoder; a jpg still works everywhere as a poster.
  const dir = mkdtempSync(join(tmpdir(), "lbposter-"));
  const inP = join(dir, "in.mp4"), outP = join(dir, "poster.jpg");
  try {
    writeFileSync(inP, videoBuf);
    execFileSync("ffmpeg", ["-y", "-ss", "0.5", "-i", inP, "-frames:v", "1", "-update", "1", "-vf", "scale='min(720,iw)':-2", "-q:v", "3", outP], { stdio: ["ignore", "ignore", "ignore"] });
    return readFileSync(outP);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

async function main() {
  console.log(`\n${APPLY ? "🔧 APPLY — Poster werden erzeugt & eingetragen." : "👀 DRY RUN — nur Bericht. Mit --apply ausführen."}\n`);
  const sres = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(STATE_PATH)}`, { headers });
  if (!sres.ok) { console.error(`❌ state.json ${sres.status}`); process.exit(1); }
  const state = JSON.parse(await sres.text());
  if (APPLY) { const b = `state-backup-${Date.now()}.json`; writeFileSync(b, JSON.stringify(state)); console.log(`💾 Backup: ${b}`); }

  // Targets sammeln: generations (imagePath) + looks (videoPosterPath).
  const targets = [];
  for (const g of state.generations ?? []) {
    if (!g.videoUrl && !g.videoPath) continue;
    const posterPath = g.imagePath || pathFromUrl(g.imageUrl);
    const sz = posterPath ? await head(posterPath) : -1;
    if (sz < MIN_BYTES) targets.push({ kind: "gen", obj: g, videoPath: g.videoPath || pathFromUrl(g.videoUrl), posterBytes: sz });
  }
  for (const l of state.looks ?? []) {
    if (!l.videoUrl && !l.videoPath) continue;
    const posterPath = l.videoPosterPath || pathFromUrl(l.videoPosterUrl);
    const sz = posterPath ? await head(posterPath) : -1;
    if (sz < MIN_BYTES) targets.push({ kind: "look", obj: l, videoPath: l.videoPath || pathFromUrl(l.videoUrl), posterBytes: sz });
  }
  console.log(`📦 Videos ohne echten Poster: ${targets.length}\n`);

  let ok = 0, failed = 0;
  for (const t of targets) {
    if (!t.videoPath) { console.warn(`  ⚠️  ${t.kind} ${t.obj.id}: kein Video-Pfad`); failed++; continue; }
    try {
      const video = await download(t.videoPath);
      const poster = posterFrame(video);
      const newPath = t.videoPath.replace(/\.(mp4|webm|mov|m4v)$/i, "-poster.jpg");
      console.log(`  ${t.kind} ${t.obj.id}  poster ${t.posterBytes < 0 ? "(fehlt)" : t.posterBytes + "B"} → ${(poster.length / 1024).toFixed(1)}KB`);
      if (APPLY) {
        await upload(newPath, poster, "image/jpeg");
        if (t.kind === "gen") { t.obj.imagePath = newPath; delete t.obj.imageUrl; }
        else { t.obj.videoPosterPath = newPath; delete t.obj.videoPosterUrl; }
      }
      ok++;
    } catch (e) { console.warn(`  ⚠️  ${t.kind} ${t.obj.id}: ${e.message}`); failed++; }
  }

  if (APPLY && ok > 0) { await upload(STATE_PATH, Buffer.from(JSON.stringify(state)), "application/json"); console.log(`\n✅ state.json aktualisiert (${ok} Poster eingetragen).`); }
  console.log(`\n── Fertig ── erzeugt: ${ok}, fehlgeschlagen: ${failed}`);
  if (!APPLY) console.log(`\nNichts geschrieben (Probelauf). Wenn ok:  node scripts/fix-video-posters.mjs --apply`);
}
main().catch((e) => { console.error("❌ Fehler:", e); process.exit(1); });
