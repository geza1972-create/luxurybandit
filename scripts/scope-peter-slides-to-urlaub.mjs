/**
 * The Peter+Bella "journey" slides had no explicit `pages` targeting (= shown everywhere,
 * including the generic aggregate feed/other applicants' demo cards). That's why Peter's
 * couple photos were leaking into a random new applicant's "example card" preview on
 * /curators/apply. Scope them to LP-Urlaub only.
 *   node scripts/scope-peter-slides-to-urlaub.mjs           # dry run
 *   node scripts/scope-peter-slides-to-urlaub.mjs --apply
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APPLY = process.argv.includes("--apply");
const PETER_IDS = [
  "473c1aaf-e603-4f02-8c8e-5523e6f031f6",
  "e8342bd7-31e9-41fa-8f5c-0164feb9d5a8",
  "3c8b8fd7-8e2a-4e78-bf45-52ed9111a624",
  "6ef6ba40-a80c-49ce-859a-83b850727f4d",
  "1a2dead5-5e94-49ea-aeb1-fab7994e24ef",
  "d579fd9e-c436-496b-a7d3-1f18f2c42ec3",
  "c72d4adf-8826-47ed-9b37-186dbe4e1a45",
  "334d814e-317f-4dba-99f6-66cbe0e1e953",
  "ae20edd0-7d34-4a7f-b78a-6a824f762770",
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
  let changed = 0;
  const slides = data.slides.map(s => {
    if (PETER_IDS.includes(s.id)) {
      changed++;
      console.log(`  • ${s.id} → pages: ["lp-journey"]`);
      return { ...s, pages: ["lp-journey"] };
    }
    return s;
  });
  console.log(`\n${changed} slide(s) will be scoped to LP-Urlaub only.`);
  if (!APPLY) { console.log("Dry run — nothing written. Re-run with --apply."); return; }
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(backupPath)}`, {
    method: "POST", headers: { ...headers, "Content-Type": "application/json", "x-upsert": "true" }, body: buf,
  });
  const write = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(mainPath)}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ slides, savedAt: new Date().toISOString() }),
  });
  if (!write.ok) throw new Error(`Write failed: ${write.status} ${await write.text()}`);
  console.log("✅ Scoped.");
}
main().catch(e => { console.error("❌", e.message); process.exit(1); });
