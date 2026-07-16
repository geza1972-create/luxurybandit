// Import the FULL Gianna Bellucci catalog from CJ as wardrobe garments (brand-tagged).
// Dedupes locale/size/colour variants to ONE piece per style ("Sutien Ottavia 75A/80B/…"
// → "Ottavia Bra"), keeps the CJ affiliate link as buyUrl, real product image.
// Lingerie → boudoir, swimwear → riviera. Re-runnable: existing styles are skipped.
//
// Usage: node scripts/import-bellucci-catalog.mjs   (dev server on :3001)

import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const g = (k) => env.match(new RegExp("^" + k + "=(.+)$", "m"))?.[1]?.trim();
const token = g("CJ_PERSONAL_ACCESS_TOKEN"), cid = g("CJ_COMPANY_ID"), pid = g("CJ_WEBSITE_ID") || "";
const pin = g("TRY_THIS_LOOK_ADMIN_PIN") || "";
if (!token || !cid) { console.log("CJ creds missing"); process.exit(1); }
const headers = { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) };

// ── Her FULL CJ feed (partnerIds = GiannaBellucci Europe), paginated ──────────
const PARTNER_ID = "7217606"; // GiannaBellucci Europe
const records = [];
for (let offset = 0; ; offset += 100) {
  const gql = `{ products(companyId: "${cid}", partnerIds: ["${PARTNER_ID}"], limit: 100, offset: ${offset}) { totalCount resultList { title link imageLink advertiserName price { amount currency }${pid ? ` linkCode(pid: "${pid}") { clickUrl }` : ""} } } }`;
  const r = await fetch("https://ads.api.cj.com/query", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ query: gql }) });
  const d = await r.json().catch(() => null);
  const page = d?.data?.products?.resultList ?? [];
  records.push(...page);
  const total = d?.data?.products?.totalCount ?? 0;
  if (offset === 0) console.log(`Full feed totalCount: ${total}`);
  if (!page.length || offset + 100 >= total) break;
}
console.log(`CJ records (all variants): ${records.length}`);

// ── Parse each record into { type, style } — RO/EN titles only (RON/EUR market) ─
const COLORS = /\b(black|white|gold|red|blue|green|beige|nude|orange|chocolate|rosa|pink|nero|juoda|alyvuogės|mocha[_ ]?mouse|negru|alb|rosu|roșu|bej|verde|albastru|auriu|maro|smėlio|ruda|balta)\b/gi;
const SIZES = /\b(xs|s|m|l|xl|xxl|\d{2,3}\s?[a-h]{1,2})\b/gi;
const typeOf = (t) => {
  const s = t.toLowerCase();
  if (/partea superioar|bikini top|viršutinė/.test(s)) return "Bikini Top";
  if (/partea de jos|bikini bottom|apatinė/.test(s)) return "Bikini Bottom";
  if (/dintr-o singur|one.?piece|vientisas/.test(s)) return "One-Piece Swimsuit";
  if (/două piese|two.?piece|swimsuit set/.test(s)) return "Bikini Set";
  if (/costum de baie|swimwear|maudymosi/.test(s)) return "Swimwear";
  if (/sutien|reggiseno|\bbra\b|podprsenka|liemenėlė/.test(s)) return "Bra";
  if (/\bbody\b|bodysuit/.test(s)) return "Body";
  if (/corset|korsetas/.test(s)) return "Corset";
  if (/babydoll/.test(s)) return "Babydoll";
  if (/portjartier|garter|keliaraiščiai/.test(s)) return "Garter Belt";
  if (/halat|robe|kimono|chalatas/.test(s)) return "Robe";
  if (/neglige|nightdress|cămașă de noapte|camasa de noapte|naktiniai/.test(s)) return "Nightdress";
  if (/ciorapi|stockings|dresuri|kojinės/.test(s)) return "Stockings";
  if (/tanga|thong|string|perizoma/.test(s)) return "Thong";
  if (/chilot|brief|panty|panties|kelnaitės/.test(s)) return "Briefs";
  if (/set/.test(s)) return "Lingerie Set";
  return null;
};
const styleOf = (t) => {
  // The distinctive style word = a Capitalised name that survives after stripping nouns/colours/sizes.
  const cleaned = t
    .replace(/set di lingerie con abito a corsetto/gi, " ")
    .replace(/costum(e)? de baie (din două piese|dintr-o singură piesă)?/gi, " ")
    .replace(/partea (superioară|de jos)/gi, " ")
    .replace(/\b(sutien|body|bodysuit|corset|babydoll|portjartier|garter belt|garter|lingerie|set|bra|swimsuit|swimwear|top|bottom|halat|robe|kimono|neglige|ciorapi|stockings|dresuri|tanga|thong|string|chilot|chiloti|chiloți|briefs?|panty|panties|cămașă de noapte|camasa de noapte|nightdress)\b/gi, " ")
    .replace(COLORS, " ").replace(SIZES, " ");
  const m = cleaned.match(/\b[A-ZĂÂÎȘȚ][a-zăâîșțé]{3,}\b/g);
  return m ? m[m.length - 1] : null; // last capitalised word = the style name
};

// ── Dedupe to one record per (type, style); prefer black/first, must have image ─
const styles = new Map();
for (const rec of records) {
  const title = String(rec.title || "").replace(/\s+/g, " ").trim();
  const type = typeOf(title), style = styleOf(title);
  if (!type || !style || !rec.imageLink) continue;
  const key = `${type}|${style.toLowerCase()}`;
  const isBlack = /black|negru|juoda|nero/i.test(title);
  if (!styles.has(key) || (isBlack && !styles.get(key).isBlack)) {
    styles.set(key, { type, style, isBlack, image: rec.imageLink, link: rec.linkCode?.clickUrl || rec.link });
  }
}
console.log(`Distinct styles: ${styles.size}`);

// ── Skip styles already in the wardrobe ───────────────────────────────────────
const existing = await fetch(`${BASE}/api/try-this-look`, { headers }).then((r) => r.json());
const haveStyles = new Set();
for (const l of existing.looks ?? []) {
  if (!/bellucci/i.test(l.brand ?? "")) continue;
  for (const w of l.name.match(/\b[A-Z][a-z]{3,}\b/g) ?? []) haveStyles.add(w.toLowerCase());
}
console.log(`Already imported styles: ${[...haveStyles].join(", ") || "none"}`);

// ── Import each style as a garment ────────────────────────────────────────────
let added = 0, skipped = 0, failed = 0;
for (const { type, style, image, link } of styles.values()) {
  if (haveStyles.has(style.toLowerCase())) { skipped++; continue; }
  const name = `${style} ${type}`; // e.g. "Ottavia Bra", "Sorrentina Bikini Top"
  const category = /Bikini|Swim/i.test(type) ? "riviera" : "boudoir";
  try {
    const res = await fetch(image);
    if (!res.ok) { console.log(`image ${res.status}: ${name}`); failed++; continue; }
    const mime = res.headers.get("content-type") || "image/jpeg";
    const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    const add = await fetch(`${BASE}/api/add-garment`, {
      method: "POST", headers,
      body: JSON.stringify({ image: `data:${mime};base64,${b64}`, url: link, name, brand: "Gianna Bellucci", category, extract: false }),
    }).then((r) => r.json());
    if (add.ok) { added++; console.log(`added ✓ ${name} (${category})`); }
    else { failed++; console.log(`FAILED ${name}: ${add.error}`); }
  } catch (e) { failed++; console.log(`ERROR ${name}: ${e.message}`); }
}
console.log(`\ndone — added: ${added} · skipped (already there): ${skipped} · failed: ${failed}`);
