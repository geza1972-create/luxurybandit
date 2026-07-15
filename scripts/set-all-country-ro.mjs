/**
 * One-time: set country = "RO" (Romania) on EVERY existing curator/model.
 * Reads the raw state.json from Supabase storage (paths intact, no hydration),
 * patches only `country`, and writes it back.
 *
 *   node scripts/set-all-country-ro.mjs           # dry run (report only)
 *   node scripts/set-all-country-ro.mjs --apply   # write
 */
import { readFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter(l => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = env.SUPABASE_STORAGE_BUCKET || "shopcut-images";
const PATH = "try-this-look/state.json";
if (!URL || !KEY) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local"); process.exit(1); }
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const res = await fetch(`${URL}/storage/v1/object/${BUCKET}/${PATH}`, { headers: h });
if (!res.ok) { console.error("GET state failed:", res.status, await res.text()); process.exit(1); }
const state = JSON.parse(await res.text());
const curators = state.curators ?? [];
let n = 0;
for (const c of curators) { if (c.country !== "RO") { c.country = "RO"; n++; } }
console.log(`curators: ${curators.length} · set to RO: ${n}`);

if (!APPLY) { console.log("dry run — re-run with --apply to write."); process.exit(0); }
const up = await fetch(`${URL}/storage/v1/object/${BUCKET}/${PATH}`, {
  method: "POST",
  headers: { ...h, "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache" },
  body: JSON.stringify(state),
});
console.log("write:", up.status, up.ok ? "OK" : await up.text());
