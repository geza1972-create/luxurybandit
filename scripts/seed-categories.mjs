// Broaden the catalogue beyond dresses: trousers, skirts, jackets, fashion
// bodysuits. Real product images via /api/discover → published look (brand in the
// name → detectBrand chip) → curator try-on PHOTO (no video, cost-frugal).
//   TRY_THIS_LOOK_ADMIN_PIN=… node scripts/seed-categories.mjs

import { readFile } from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.SEED_BASE || "http://localhost:3000").replace(/\/$/, "");
const PIN = process.env.TRY_THIS_LOOK_ADMIN_PIN || "";
const PEOPLE = path.resolve("seed/people");
const OWNER = "curator-1782204766325-wfyi0"; // Szidonia — owns looks, bears credits

const WEARERS = [
  { id: "curator-1782367017253-qr92f", name: "Lena Marsh",      photo: "1.jpg" },
  { id: "curator-1782367019713-lujf0", name: "Bianca Russo",    photo: "2.jpg" },
  { id: "curator-1782367021299-zwazd", name: "Sofia Ardelean",  photo: "3.jpg" },
  { id: "curator-1782367022806-mab7k", name: "Amara Cole",      photo: "4.jpg" },
  { id: "curator-1782367024379-kppfl", name: "Mira Voss",       photo: "5.jpg" },
  { id: "curator-1782368231876-exbr6", name: "Elina Petrova",   photo: "6.jpg" },
  { id: "curator-1782368317618-2jtbu", name: "Carla Moreno",    photo: "7.jpg" },
  { id: "curator-1782368411837-0mdpw", name: "Yasmin Haddad",   photo: "8.jpg" },
  { id: "curator-1782368506998-ly8qg", name: "Nadia Rossi",     photo: "9.jpg" },
  { id: "curator-1782368617777-dmbrx", name: "Tessa Lindqvist", photo: "10.jpg" },
];

// category → brand + search query (all brands confirmed in FASHION_BRANDS)
const JOBS = [
  { cat: "Trousers", brand: "Saint Laurent", query: "Saint Laurent tailored wool trousers women" },
  { cat: "Trousers", brand: "Max Mara",      query: "Max Mara wide leg trousers women" },
  { cat: "Trousers", brand: "The Row",       query: "The Row tailored trousers women" },
  { cat: "Skirts",   brand: "Prada",         query: "Prada midi skirt women" },
  { cat: "Skirts",   brand: "Khaite",        query: "Khaite leather midi skirt women" },
  { cat: "Skirts",   brand: "Miu Miu",       query: "Miu Miu pleated mini skirt women" },
  { cat: "Jackets",  brand: "Saint Laurent", query: "Saint Laurent blazer jacket women" },
  { cat: "Jackets",  brand: "Acne Studios",  query: "Acne Studios leather jacket women" },
  { cat: "Jackets",  brand: "Balmain",       query: "Balmain double breasted blazer women" },
  { cat: "Bodysuits",brand: "Wolford",       query: "Wolford long sleeve bodysuit top women" },
  { cat: "Bodysuits",brand: "Mugler",        query: "Mugler bodysuit top women" },
  { cat: "Bodysuits",brand: "Skims",         query: "Skims long sleeve bodysuit women" },
];

const api = (body) => fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json().catch(() => ({})));
async function fileDataUrl(file) { const b = await readFile(path.join(PEOPLE, file)); return `data:image/jpeg;base64,${b.toString("base64")}`; }
async function urlDataUrl(url) { const r = await fetch(url); if (!r.ok) throw new Error("img " + r.status); const b = Buffer.from(await r.arrayBuffer()); return `data:${r.headers.get("content-type") || "image/jpeg"};base64,${b.toString("base64")}`; }
function blobOf(d) { const [h, b] = d.split(","); return new Blob([Buffer.from(b, "base64")], { type: h.match(/:(.*?);/)[1] }); }

async function discover(query) {
  const r = await fetch(`${BASE}/api/discover`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify({ queries: [query] }) }).then(r => r.json()).catch(() => ({}));
  return (r.items ?? []).filter(it => it.thumbnail && it.link && it.title);
}

async function makeLook(job, hero, rest) {
  const alternatives = rest.slice(0, 8).map(it => ({ title: it.title, link: it.link, source: it.source, thumbnail: it.thumbnail, price: it.price, priceValue: it.priceValue, currency: it.currency }));
  const frontImage = await urlDataUrl(hero.thumbnail);
  const name = `${job.brand} ${String(hero.title).replace(new RegExp(job.brand, "ig"), "").trim()}`.slice(0, 90).trim();
  const res = await fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify({
    action: "upload-look", name, storeName: job.brand, frontImage, image: frontImage,
    price: hero.price || undefined, buyUrl: hero.link, alternatives, published: true,
    productType: "real", curatorId: OWNER, hashtags: `#${job.brand.replace(/[^a-z0-9]/ig, "")} #${job.cat.toLowerCase()}`,
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
  fd.append("prompt", `Full-body virtual fashion try-on. Show the entire person head to toe wearing the complete selected outfit, replacing their current clothing. Preserve the person's face, hair, skin tone and identity exactly. Full-length framing, clean studio. Keep the person fully and modestly dressed. Look: ${look.name}.`);
  let res = await fetch(`${BASE}/api/generate-openai-tryon`, { method: "POST", body: fd, headers: { "x-shopcut-account-id": `user-seed-${wearer.id}` } });
  let p = await res.json().catch(() => ({}));
  if (!res.ok || !p.image) { res = await fetch(`${BASE}/api/generate-fashn`, { method: "POST", body: fd, headers: { "x-shopcut-account-id": `user-seed-${wearer.id}` } }); p = await res.json().catch(() => ({})); }
  if (!res.ok || !p.image) { console.log(`    ✗ try-on failed: ${p.error ?? res.status}`); return; }
  const gen = await api({ action: "generation", lookId: look.lookId, lookName: look.name, storeName: job_brand(look), customerName: wearer.name, curatorId: wearer.id, visitorId: "seed", image: p.image, feed: true });
  console.log(gen.generationId ? `    ✓ try-on by ${wearer.name}` : "    ✗ post failed");
}
function job_brand(look) { return (look.name || "").split(" ")[0]; }

async function main() {
  if (!PIN) { console.log("Set TRY_THIS_LOOK_ADMIN_PIN."); process.exit(1); }
  console.log(`Categories → ${BASE}`);
  await fetch(`${BASE}/api/curator`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify({ action: "set-credits", id: OWNER, credits: 600 }) });
  for (let i = 0; i < JOBS.length; i++) {
    const job = JOBS[i];
    console.log(`\n=== ${job.cat}: ${job.brand} ===`);
    try {
      const items = await discover(job.query);
      if (!items.length) { console.log("  ✗ no products"); continue; }
      const hero = items.find(it => it.priceValue > 0) || items[0];
      const look = await makeLook(job, hero, items.filter(x => x.link !== hero.link));
      if (look) await tryOn(look, WEARERS[i % WEARERS.length]);
    } catch (e) { console.log("  ✗ error:", e.message); }
  }
  console.log("\nCategories done.");
}
main().catch(e => { console.error(e); process.exit(1); });
