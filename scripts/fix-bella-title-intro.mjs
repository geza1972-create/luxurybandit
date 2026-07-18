/**
 * One-off: Bella's curator record still had stale "Monaco Influencer" title/intro
 * from before the Tenerife journey pivot. Updates them in state.json.
 *
 *   node scripts/fix-bella-title-intro.mjs           # Probelauf
 *   node scripts/fix-bella-title-intro.mjs --apply   # schreibt wirklich
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
const STATE_PATH = "try-this-look/state.json";
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

const NEW_TITLE = "Tenerife Influencer";
const NEW_INTRO = "Hi, I'm Bella — traveling Tenerife for you. I bring back fresh photos, videos and stories from the island every day, styled in the newest looks. Book a journey with me and follow along live.";

async function main() {
  console.log(`\n${APPLY ? "🔧 APPLY" : "👀 DRY RUN"}\n`);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(STATE_PATH)}`, { headers });
  if (!res.ok) { console.error("❌ state.json load failed:", res.status); process.exit(1); }
  const state = await res.json();
  const c = (state.curators ?? []).find(c => c.id === BELLA_ID);
  if (!c) { console.error("❌ Bella curator not found"); process.exit(1); }
  console.log("Old title:", c.title);
  console.log("Old intro:", c.intro);
  console.log("New title:", NEW_TITLE);
  console.log("New intro:", NEW_INTRO);
  if (!APPLY) { console.log("\nDry run — nothing written. Re-run with --apply."); return; }
  c.title = NEW_TITLE;
  c.intro = NEW_INTRO;
  const write = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(STATE_PATH)}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify(state),
  });
  if (!write.ok) throw new Error(`Write failed: ${write.status} ${await write.text()}`);
  console.log("✅ Updated Bella's title/intro.");
}
main().catch(e => { console.error("❌", e.message); process.exit(1); });
