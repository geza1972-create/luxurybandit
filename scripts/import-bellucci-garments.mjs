// One-time import: pull the Gianna Bellucci (CJ affiliate) products that the /haine
// gallery already shows and add each as a WARDROBE garment (brand-tagged) so they
// appear in the try-on "Generate AI Video" picker — with the affiliate link as buyUrl
// ("Wearing Gianna Bellucci · Shop now" on her look slides).
//
// Usage: node scripts/import-bellucci-garments.mjs   (dev server must run on :3001)

import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3001";

// Admin PIN from .env.local (if configured) — local dev without a PIN is open.
let pin = "";
try {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  pin = env.match(/^TRY_THIS_LOOK_ADMIN_PIN=(.+)$/m)?.[1]?.trim() ?? "";
} catch { /* no .env.local */ }
const headers = { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) };

// 1) The Bellucci products the clothes gallery serves (cached CJ — not billable).
const gal = await fetch(`${BASE}/api/mai-ieftin-chat`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ demoProducts: "haine" }),
}).then(r => r.json());
const products = Array.isArray(gal.products) ? gal.products : [];
console.log(`Bellucci products in the gallery: ${products.length}`);
if (!products.length) process.exit(0);

// 2) Already-imported garments (by name) so re-runs don't duplicate.
const existing = await fetch(`${BASE}/api/try-this-look`, { headers }).then(r => r.json());
const have = new Set((existing.looks ?? []).filter(l => /bellucci/i.test(l.brand ?? "")).map(l => l.name.toLowerCase()));

for (const p of products) {
  // Strip a trailing size token ("Body Hera black S" → "Body Hera black").
  const name = String(p.title ?? "").replace(/\s+(XS|S|M|L|XL|XXL)$/i, "").trim();
  if (!name || have.has(name.toLowerCase())) { console.log(`skip (have): ${name}`); continue; }
  const img = p.thumbnail || p.image;
  if (!img) { console.log(`skip (no image): ${name}`); continue; }

  // Download the product image → data URL (add-garment wants a data URL).
  const res = await fetch(img);
  if (!res.ok) { console.log(`skip (image ${res.status}): ${name}`); continue; }
  const mime = res.headers.get("content-type") || "image/jpeg";
  const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");

  const add = await fetch(`${BASE}/api/add-garment`, {
    method: "POST", headers,
    body: JSON.stringify({
      image: `data:${mime};base64,${b64}`,
      url: p.link,                    // CJ affiliate link → "Shop now"
      name,
      brand: "Gianna Bellucci",
      category: "boudoir",            // bodysuits/lingerie → boudoir (lingerie routing)
      extract: false,                  // flat product shots — no AI extraction needed
    }),
  }).then(r => r.json());
  console.log(add.ok ? `added ✓ ${name} (${add.id})` : `FAILED ${name}: ${add.error}`);
}
console.log("done");
