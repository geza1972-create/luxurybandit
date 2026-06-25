// Swimwear — ONE-PIECE swimsuits only (Badeanzug), tasteful. Real product images
// via /api/discover → published look → curator try-on photo (no video). Skips
// bikinis / two-piece.
//   TRY_THIS_LOOK_ADMIN_PIN=… node scripts/seed-swimsuit.mjs
// Run ALONE — never concurrently with another seed script (shared state races).

import { readFile } from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.SEED_BASE || "http://localhost:3000").replace(/\/$/, "");
const PIN = process.env.TRY_THIS_LOOK_ADMIN_PIN || "";
const PEOPLE = path.resolve("seed/people");
const OWNER = "curator-1782204766325-wfyi0";

const WEARERS = [
  { id: "curator-1782368506998-ly8qg", name: "Nadia Rossi",     photo: "9.jpg" },
  { id: "curator-1782367021299-zwazd", name: "Sofia Ardelean",  photo: "3.jpg" },
  { id: "curator-1782368231876-exbr6", name: "Elina Petrova",   photo: "6.jpg" },
];

const JOBS = [
  { brand: "Eres",       query: "Eres one piece swimsuit maillot women" },
  { brand: "Calzedonia", query: "Calzedonia one piece swimsuit women" },
  { brand: "Hunkemöller",query: "Hunkemoller one piece swimsuit women" },
];
const ONEPIECE = /(one[- ]?piece|swimsuit|maillot|bathing suit|badeanzug)/i;
const SKIP = /(bikini|two[- ]?piece|tankini|thong|brief|bottom|top only)/i;

const api = (body) => fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json().catch(() => ({})));
async function fileDataUrl(file) { const b = await readFile(path.join(PEOPLE, file)); return `data:image/jpeg;base64,${b.toString("base64")}`; }
async function urlDataUrl(url) { const r = await fetch(url); if (!r.ok) throw new Error("img " + r.status); const b = Buffer.from(await r.arrayBuffer()); return `data:${r.headers.get("content-type") || "image/jpeg"};base64,${b.toString("base64")}`; }
function blobOf(d) { const [h, b] = d.split(","); return new Blob([Buffer.from(b, "base64")], { type: h.match(/:(.*?);/)[1] }); }

async function discover(query) {
  const r = await fetch(`${BASE}/api/discover`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify({ queries: [query] }) }).then(r => r.json()).catch(() => ({}));
  return (r.items ?? []).filter(it => it.thumbnail && it.link && it.title);
}

async function makeLook(brand, hero, rest) {
  const alternatives = rest.slice(0, 8).map(it => ({ title: it.title, link: it.link, source: it.source, thumbnail: it.thumbnail, price: it.price, priceValue: it.priceValue, currency: it.currency }));
  const frontImage = await urlDataUrl(hero.thumbnail);
  const name = `${brand} ${String(hero.title).replace(new RegExp(brand, "ig"), "").trim()}`.slice(0, 90).trim();
  const res = await fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify({
    action: "upload-look", name, storeName: brand, frontImage, image: frontImage,
    price: hero.price || undefined, buyUrl: hero.link, alternatives, published: true,
    productType: "real", curatorId: OWNER, hashtags: `#${brand.replace(/[^a-z0-9]/ig, "")} #swimwear`,
  }) });
  const d = await res.json().catch(() => ({}));
  const lookId = d?.activeLookId || d?.looks?.[0]?.id;
  if (!lookId) { console.log("    ✗ look create failed:", d?.error ?? res.status); return null; }
  console.log(`    ✓ look ${lookId} — "${name}"`);
  return { lookId, name, frontImage };
}

async function tryOn(look, wearer) {
  const fd = new FormData();
  fd.append("image", blobOf(look.frontImage), "g.jpg");
  fd.append("modelImage", blobOf(await fileDataUrl(wearer.photo)), "p.jpg");
  fd.append("lookId", look.lookId); fd.append("mode", "fashion-model"); fd.append("aspectRatio", "9:16");
  fd.append("prompt", `Tasteful editorial swimwear try-on for a fashion catalogue. Show the person wearing the one-piece swimsuit in a clean, elegant studio, composed and non-sexualised. Preserve the person's face, hair, skin tone and identity exactly. Full-length, refined framing. Piece: ${look.name}.`);
  let res = await fetch(`${BASE}/api/generate-openai-tryon`, { method: "POST", body: fd, headers: { "x-shopcut-account-id": `user-seed-${wearer.id}` } });
  let p = await res.json().catch(() => ({}));
  if (!res.ok || !p.image) { res = await fetch(`${BASE}/api/generate-fashn`, { method: "POST", body: fd, headers: { "x-shopcut-account-id": `user-seed-${wearer.id}` } }); p = await res.json().catch(() => ({})); }
  if (!res.ok || !p.image) { console.log(`    ✗ try-on failed: ${p.error ?? res.status}`); return; }
  const gen = await api({ action: "generation", lookId: look.lookId, lookName: look.name, storeName: look.name.split(" ")[0], customerName: wearer.name, curatorId: wearer.id, visitorId: "seed", image: p.image, feed: true });
  console.log(gen.generationId ? `    ✓ try-on by ${wearer.name}` : "    ✗ post failed");
}

async function main() {
  if (!PIN) { console.log("Set TRY_THIS_LOOK_ADMIN_PIN."); process.exit(1); }
  console.log(`Swimwear → ${BASE}`);
  await fetch(`${BASE}/api/curator`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify({ action: "set-credits", id: OWNER, credits: 600 }) });
  for (let i = 0; i < JOBS.length; i++) {
    const job = JOBS[i];
    console.log(`\n=== ${job.brand} ===`);
    try {
      const items = (await discover(job.query)).filter(it => ONEPIECE.test(it.title) && !SKIP.test(it.title));
      if (!items.length) { console.log("  ✗ no one-piece products"); continue; }
      const hero = items.find(it => it.priceValue > 0) || items[0];
      const look = await makeLook(job.brand, hero, items.filter(x => x.link !== hero.link));
      if (look) await tryOn(look, WEARERS[i % WEARERS.length]);
    } catch (e) { console.log("  ✗ error:", e.message); }
  }
  console.log("\nSwimwear done.");
}
main().catch(e => { console.error(e); process.exit(1); });
