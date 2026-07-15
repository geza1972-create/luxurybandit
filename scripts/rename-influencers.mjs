/**
 * One-time: give every influencer a single, elegant avatar name via `modelName` (the public
 * stage name). firstName/lastName stay untouched so her videos/looks (matched by name) don't
 * break — only the DISPLAY changes. Bella and Gina keep their names.
 *
 *   node scripts/rename-influencers.mjs           # dry run (report the mapping)
 *   node scripts/rename-influencers.mjs --apply   # write
 */
import { readFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n").filter(l => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = env.SUPABASE_STORAGE_BUCKET || "shopcut-images";
const PATH = "try-this-look/state.json";
if (!URL || !KEY) { console.error("Missing Supabase env in .env.local"); process.exit(1); }
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// Elegant single names (aspirational), all unique — more than the roster needs.
const POOL = [
  "Aria", "Luna", "Sienna", "Nova", "Mila", "Alina", "Elena", "Sofia", "Valentina", "Camila",
  "Chloe", "Zoe", "Leyla", "Anya", "Vera", "Ines", "Noa", "Lea", "Mara", "Iris",
  "Dahlia", "Selin", "Naya", "Kira", "Lia", "Ruby", "Skye", "Ava", "Ella", "Isla",
  "Maya", "Nina", "Talia", "Amina", "Rania", "Livia", "Cara", "Alba", "Sabina", "Delia",
  "Roxana", "Carla", "Diana", "Larisa", "Antonia", "Daria", "Miruna", "Ilinca", "Otilia", "Raluca",
  "Emma", "Sara", "Freya", "Zara", "Elodie", "Amara", "Nadia", "Bianca", "Yara", "Celine",
];

const keep = (c) => /\b(bella|gina)\b/i.test(`${c.firstName ?? ""} ${c.lastName ?? ""} ${c.modelName ?? ""}`);

const res = await fetch(`${URL}/storage/v1/object/${BUCKET}/${PATH}`, { headers: h });
if (!res.ok) { console.error("GET failed", res.status); process.exit(1); }
const state = JSON.parse(await res.text());
const curators = state.curators ?? [];

let pi = 0, changed = 0;
for (const c of curators) {
  if (keep(c)) continue;
  const nm = pi < POOL.length ? POOL[pi++] : `Muse${pi++}`;
  console.log(`${(`${c.firstName ?? ""} ${c.lastName ?? ""}`).trim() || c.id}  →  ${nm}`);
  c.modelName = nm;
  changed++;
}
console.log(`\ncurators: ${curators.length} · kept (Bella/Gina): ${curators.filter(keep).length} · renamed (modelName): ${changed}`);

if (!APPLY) { console.log("dry run — re-run with --apply to write."); process.exit(0); }
const up = await fetch(`${URL}/storage/v1/object/${BUCKET}/${PATH}`, {
  method: "POST", headers: { ...h, "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache" },
  body: JSON.stringify(state),
});
console.log("write:", up.status, up.ok ? "OK" : await up.text());
