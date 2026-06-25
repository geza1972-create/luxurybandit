// Brand variety: for 12 different luxury brands, pull a REAL product via SerpApi
// (/api/discover), create a published look (brand in the name → detectBrand picks
// it up as a chip), attach cheaper finds as alternatives, then generate a real
// curator try-on + Pixverse video on it.
//   TRY_THIS_LOOK_ADMIN_PIN=… node scripts/seed-brand-looks.mjs
// Run alone — never concurrently with other seed scripts (shared state races).

import { readFile } from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.SEED_BASE || "http://localhost:3000").replace(/\/$/, "");
const PIN = process.env.TRY_THIS_LOOK_ADMIN_PIN || "";
const PEOPLE = path.resolve("seed/people");
const OWNER = "curator-1782204766325-wfyi0"; // Szidonia — owns the new looks, bears all credits

// brand → search query, the curator who wears it (id + photo file)
const C = {
  lena:   { id: "curator-1782367017253-qr92f", photo: "1.jpg",  name: "Lena Marsh" },
  sofia:  { id: "curator-1782367021299-zwazd", photo: "3.jpg",  name: "Sofia Ardelean" },
  amara:  { id: "curator-1782367022806-mab7k", photo: "4.jpg",  name: "Amara Cole" },
  mira:   { id: "curator-1782367024379-kppfl", photo: "5.jpg",  name: "Mira Voss" },
  bianca: { id: "curator-1782367019713-lujf0", photo: "2.jpg",  name: "Bianca Russo" },
  elina:  { id: "curator-1782368231876-exbr6", photo: "6.jpg",  name: "Elina Petrova" },
  carla:  { id: "curator-1782368317618-2jtbu", photo: "7.jpg",  name: "Carla Moreno" },
  yasmin: { id: "curator-1782368411837-0mdpw", photo: "8.jpg",  name: "Yasmin Haddad" },
  nadia:  { id: "curator-1782368506998-ly8qg", photo: "9.jpg",  name: "Nadia Rossi" },
  tessa:  { id: "curator-1782368617777-dmbrx", photo: "10.jpg", name: "Tessa Lindqvist" },
};

const JOBS = [
  { brand: "Versace",       query: "Versace women evening gown dress",   wearer: C.nadia },
  { brand: "Saint Laurent", query: "Saint Laurent women dress",          wearer: C.elina },
  { brand: "Valentino",     query: "Valentino women gown dress",         wearer: C.yasmin },
  { brand: "Gucci",         query: "Gucci women dress",                  wearer: C.sofia },
  { brand: "Prada",         query: "Prada women dress",                  wearer: C.tessa },
  { brand: "Elie Saab",     query: "Elie Saab evening gown dress",       wearer: C.amara },
  { brand: "Zimmermann",    query: "Zimmermann floral midi dress women", wearer: C.lena },
  { brand: "Khaite",        query: "Khaite women dress",                 wearer: C.carla },
  { brand: "Balmain",       query: "Balmain women dress",                wearer: C.mira },
  { brand: "Givenchy",      query: "Givenchy women dress",               wearer: C.bianca },
  { brand: "Self-Portrait", query: "Self-Portrait women dress",          wearer: C.nadia },
  { brand: "Reformation",   query: "Reformation women midi dress",       wearer: C.elina },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const api = (body, headers = {}) => fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) }).then(r => r.json().catch(() => ({})));
async function fileDataUrl(file) { const b = await readFile(path.join(PEOPLE, file)); return `data:image/jpeg;base64,${b.toString("base64")}`; }
async function urlDataUrl(url) { const r = await fetch(url); if (!r.ok) throw new Error("img " + r.status); const b = Buffer.from(await r.arrayBuffer()); return `data:${r.headers.get("content-type") || "image/jpeg"};base64,${b.toString("base64")}`; }
function blobOf(d) { const [h, b] = d.split(","); return new Blob([Buffer.from(b, "base64")], { type: h.match(/:(.*?);/)[1] }); }

async function discover(query) {
  const r = await fetch(`${BASE}/api/discover`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify({ queries: [query] }) }).then(r => r.json()).catch(() => ({}));
  return (r.items ?? []).filter(it => it.thumbnail && it.link && it.title);
}

async function existingBrandLook(brand) {
  const looks = await fetch(`${BASE}/api/try-this-look`).then(r => r.json()).then(d => d.looks ?? []).catch(() => []);
  const l = looks.find(x => (x.brand || "").toLowerCase() === brand.toLowerCase());
  if (!l) return null;
  const url = l.garmentFrontImageUrl || l.frontImageUrl || l.imageUrl;
  if (!url) return null;
  try { return { lookId: l.id, name: l.name, frontImage: await urlDataUrl(url), reused: true }; }
  catch { return null; }
}

async function makeLook(job) {
  console.log(`\n=== ${job.brand} → ${job.wearer.name} ===`);
  const reuse = await existingBrandLook(job.brand);
  if (reuse) { console.log(`  ↺ reusing existing look ${reuse.lookId} — "${reuse.name}"`); return reuse; }
  const items = await discover(job.query);
  if (!items.length) { console.log("  ✗ no products found"); return null; }
  // pick the hero (prefer one with a price), the rest become cheaper alternatives
  const hero = items.find(it => it.priceValue > 0) || items[0];
  const others = items.filter(it => it.link !== hero.link).slice(0, 8);
  const alternatives = others.map(it => ({ title: it.title, link: it.link, source: it.source, thumbnail: it.thumbnail, price: it.price, priceValue: it.priceValue, currency: it.currency }));
  let frontImage;
  try { frontImage = await urlDataUrl(hero.thumbnail); } catch (e) { console.log("  ✗ hero image fetch failed:", e.message); return null; }
  const name = `${job.brand} ${String(hero.title).replace(new RegExp(job.brand, "ig"), "").trim()}`.slice(0, 90).trim();
  const res = await fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify({
    action: "upload-look", name, storeName: job.brand, frontImage, image: frontImage,
    price: hero.price || undefined, buyUrl: hero.link, alternatives, published: true,
    productType: "real", curatorId: OWNER, hashtags: `#${job.brand.replace(/[^a-z0-9]/ig, "")} #luxury`,
  }) });
  const d = await res.json().catch(() => ({}));
  const lookId = d?.activeLookId || d?.looks?.[0]?.id || d?.look?.id || d?.id;
  if (!lookId) { console.log("  ✗ look create failed:", d?.error ?? res.status); return null; }
  console.log(`  ✓ look ${lookId} — "${name}" (+${alternatives.length} alternatives)`);
  return { lookId, name, frontImage };
}

async function tryOn(job, look) {
  const fd = new FormData();
  fd.append("image", blobOf(look.frontImage), "g.jpg");
  fd.append("modelImage", blobOf(await fileDataUrl(job.wearer.photo)), "p.jpg");
  fd.append("lookId", look.lookId); fd.append("mode", "fashion-model"); fd.append("aspectRatio", "9:16");
  fd.append("prompt", `Full-body virtual fashion try-on. Show the entire person head to toe wearing the complete selected outfit, replacing their current clothing. Preserve the person's face, hair, skin tone and identity exactly. Full-length framing, clean studio. Keep the person fully and modestly dressed. Look: ${look.name}.`);
  let res = await fetch(`${BASE}/api/generate-openai-tryon`, { method: "POST", body: fd, headers: { "x-shopcut-account-id": `user-seed-${job.wearer.id}` } });
  let p = await res.json().catch(() => ({}));
  if (!res.ok || !p.image) { res = await fetch(`${BASE}/api/generate-fashn`, { method: "POST", body: fd, headers: { "x-shopcut-account-id": `user-seed-${job.wearer.id}` } }); p = await res.json().catch(() => ({})); }
  if (!res.ok || !p.image) { console.log(`  ✗ try-on failed: ${p.error ?? res.status}`); return; }
  console.log("  ✓ try-on image generated");
  const gen = await api({ action: "generation", lookId: look.lookId, lookName: look.name, storeName: job.brand, customerName: job.wearer.name, curatorId: job.wearer.id, visitorId: "seed", image: p.image, feed: true });
  if (!gen.generationId) { console.log("  ✗ post failed"); return; }
  const vs = await fetch(`${BASE}/api/generate-tryon-video`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lookId: look.lookId, image: p.image }) }).then(r => r.json());
  if (!vs.videoId) { console.log(`  ✗ video start failed: ${vs.error ?? ""}`); return; }
  console.log("  … video generating");
  for (let i = 0; i < 60; i++) {
    await sleep(4000);
    const q = await fetch(`${BASE}/api/generate-tryon-video?videoId=${vs.videoId}&curatorId=${vs.curatorId ?? ""}`).then(r => r.json()).catch(() => null);
    if (q?.status === "done" && q.videoUrl) { await api({ action: "attach-generation-video", generationId: gen.generationId, videoUrl: q.videoUrl }); console.log("  ✓ video attached"); return; }
    if (q?.status === "failed") { console.log(`  ✗ video failed: ${q.error ?? ""}`); return; }
  }
  console.log("  ✗ video timed out");
}

async function main() {
  if (!PIN) { console.log("Set TRY_THIS_LOOK_ADMIN_PIN."); process.exit(1); }
  console.log(`Brand looks → ${BASE}`);
  await fetch(`${BASE}/api/curator`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify({ action: "set-credits", id: OWNER, credits: 600 }) });
  console.log("  ✓ owner credits topped to 600");
  for (const job of JOBS) {
    try {
      const look = await makeLook(job);
      if (look) await tryOn(job, look);
    } catch (e) { console.log("  ✗ error:", e.message); }
  }
  console.log("\nBrand looks done.");
}
main().catch(e => { console.error(e); process.exit(1); });
