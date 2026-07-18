/**
 * Removes the 3 "Alba" redhead sample images from Bella's card-studio — wrong identity,
 * user asked to take them out.
 *   node scripts/remove-alba-slides.mjs           # dry run
 *   node scripts/remove-alba-slides.mjs --apply
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APPLY = process.argv.includes("--apply");
const REMOVE_IDS = [
  "0a5c5078-9e86-490b-8952-94c383e6516d",
  "6d56cdfb-a1dc-46f1-afa0-217821f409c5",
  "51eecc18-6bd0-4d94-af79-d060e9029ff5",
];

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
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");
const mainPath = "try-this-look/card-studio.json";
const backupPath = "try-this-look/card-studio-backup.json";

async function main() {
  console.log(`\n${APPLY ? "🔧 APPLY" : "👀 DRY RUN"}\n`);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(mainPath)}`, { headers });
  if (!res.ok) { console.error("❌ load failed", res.status); process.exit(1); }
  const buf = Buffer.from(await res.arrayBuffer());
  const data = JSON.parse(buf.toString("utf8"));
  const before = data.slides.length;
  const removed = data.slides.filter(s => REMOVE_IDS.includes(s.id));
  const kept = data.slides.filter(s => !REMOVE_IDS.includes(s.id));
  console.log(`Removing ${removed.length} of ${before} slides:`, removed.map(s => s.path));
  if (!APPLY) { console.log("\nDry run — nothing written. Re-run with --apply."); return; }
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(backupPath)}`, {
    method: "POST", headers: { ...headers, "Content-Type": "application/json", "x-upsert": "true" }, body: buf,
  });
  const write = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(mainPath)}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ slides: kept, savedAt: new Date().toISOString() }),
  });
  if (!write.ok) throw new Error(`Write failed: ${write.status} ${await write.text()}`);
  console.log(`✅ Wrote ${kept.length} remaining slides.`);
}
main().catch(e => { console.error("❌", e.message); process.exit(1); });
