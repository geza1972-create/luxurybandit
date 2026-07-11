// One-time (re-runnable) build of a cached DESIGNER catalogue — mostly dresses — via SerpApi
// Google Shopping. Writes data/designer-catalogue.json which the funnel then serves from
// STORAGE (no live API per request). Re-run to refresh. Cost = one SerpApi call per query.
import fs from "node:fs";
import path from "node:path";

const env = fs.readFileSync(".env.local", "utf8");
const KEY = (env.match(/^SERPAPI_KEY=(.*)$/m) || [])[1]?.trim();
if (!KEY) { console.error("no SERPAPI_KEY"); process.exit(1); }

// Designer-leaning queries. Dresses first (the priority), a little variety after.
const QUERIES = [
  ["dress", "elegant designer evening gown dress"],
  ["dress", "black satin column gown designer"],
  ["dress", "designer cocktail dress lace elegant"],
  ["dress", "silk slip midi dress designer"],
  ["dress", "red carpet designer gown woman"],
  ["bag", "designer leather handbag elegant"],
  ["shoe", "designer heels stiletto elegant"],
];

// Same type detector idea as the funnel (kept in sync loosely).
const TYPE_GROUPS = [
  ["dress", "rochie", "gown", "cocktail"],
  ["bag", "handbag", "geanta", "purse", "clutch", "tote"],
  ["shoe", "heel", "sneaker", "boot", "pantofi", "sandal"],
  ["lingerie", "bra", "bodysuit", "corset", "lenjerie", "lingerie"],
];
const typeOf = (t) => { const s = t.toLowerCase(); return (TYPE_GROUPS.find((g) => g.some((w) => s.includes(w))) || [""])[0]; };

async function shop(q) {
  const u = new URL("https://serpapi.com/search.json");
  u.searchParams.set("engine", "google_shopping");
  u.searchParams.set("q", q);
  u.searchParams.set("hl", "ro");
  u.searchParams.set("gl", "ro");
  u.searchParams.set("api_key", KEY);
  const r = await fetch(u.toString());
  const d = await r.json().catch(() => null);
  return Array.isArray(d?.shopping_results) ? d.shopping_results : [];
}

const seen = new Set();
const out = [];
for (const [type, q] of QUERIES) {
  const raw = await shop(q);
  let kept = 0;
  for (const r of raw) {
    const link = String(r?.product_link || r?.link || "").trim();
    const thumbnail = String(r?.thumbnail || "").trim();
    const title = String(r?.title || "").slice(0, 120).trim();
    if (!link || !thumbnail || !title) continue;
    const key = title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, link, thumbnail, price: typeof r?.price === "string" ? r.price : undefined, source: String(r?.source || "").slice(0, 40) || undefined, type: typeOf(`${title} ${q}`) || type });
    kept++;
    if (kept >= 14) break;
  }
  console.log(`"${q}" -> +${kept} (total ${out.length})`);
}

const file = path.join("data", "designer-catalogue.json");
fs.mkdirSync("data", { recursive: true });
fs.writeFileSync(file, JSON.stringify(out, null, 2));
console.log(`\nWrote ${out.length} items to ${file}`);
const byType = out.reduce((a, p) => ((a[p.type] = (a[p.type] || 0) + 1), a), {});
console.log("by type:", JSON.stringify(byType));
