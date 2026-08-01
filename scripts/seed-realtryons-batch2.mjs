// Batch 2: the remaining person images → female curators + real AI try-ons + videos.
//   TRY_THIS_LOOK_ADMIN_PIN=… node scripts/seed-realtryons-batch2.mjs
// Run AFTER batch 1 has finished (never concurrently — the shared state would race).

import { readFile } from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.SEED_BASE || "http://localhost:3000").replace(/\/$/, "");
const PIN = process.env.TRY_THIS_LOOK_ADMIN_PIN || "";
const PEOPLE = path.resolve("seed/people");
const OWNER = "curator-1782204766325-wfyi0"; // Szidonia owns the looks → bears credit cost
const NOAH_ID = "curator-1782367019713-lujf0"; // mis-gendered profile to fix (image 2)

// New female personas for images 6-10 (image 2 reuses the renamed "Noah" slot)
const NEW_CURATORS = [
  { photo: "6.jpg",  firstName: "Elina",  lastName: "Petrova",  email: "elina.petrova@seed.invalid",  motto: "Black is a colour", instagram: "elina.petrova", style: "City glam, sleek tailoring", brands: "Saint Laurent, Mugler, The Attico", colors: "black, gold", occasions: "party, evening", priceTiers: "Mid-range, Luxury", bio: "Rooftops, black dresses, late nights. That's the whole brand." },
  { photo: "7.jpg",  firstName: "Carla",  lastName: "Moreno",   email: "carla.moreno@seed.invalid",   motto: "Effortless, on purpose", instagram: "carla.moreno", style: "Mediterranean chic, soft tailoring", brands: "Mango, Massimo Dutti, Reformation", colors: "ivory, tan, terracotta", occasions: "brunch, weekend", priceTiers: "Budget, Mid-range", bio: "Easy pieces that look like you tried — without trying." },
  { photo: "8.jpg",  firstName: "Yasmin", lastName: "Haddad",   email: "yasmin.haddad@seed.invalid",  motto: "Drama, tastefully", instagram: "yasmin.haddad", style: "Statement gowns, bold cuts", brands: "Elie Saab, Zuhair Murad, Roberto Cavalli", colors: "emerald, wine, gold", occasions: "gala, event", priceTiers: "Luxury", bio: "If it doesn't make an entrance, I'm not interested." },
  { photo: "9.jpg",  firstName: "Nadia",  lastName: "Rossi",    email: "nadia.rossi@seed.invalid",    motto: "Italian, obviously", instagram: "nadia.rossi", style: "Milano polish, prints & tailoring", brands: "Dolce & Gabbana, Versace, Etro", colors: "red, black, floral", occasions: "date, dinner", priceTiers: "Mid-range, Luxury", bio: "Grew up between Milano and the sea. It shows in everything I pick." },
  { photo: "10.jpg", firstName: "Tessa",  lastName: "Lindqvist", email: "tessa.lindqvist@seed.invalid", motto: "Cool, clean, done", instagram: "tessa.lindqvist", style: "Scandi minimal with an edge", brands: "Toteme, Acne Studios, Khaite", colors: "white, grey, camel", occasions: "work, everyday", priceTiers: "Mid-range, Luxury", bio: "One sharp piece beats a closet of maybes." },
];

// image 2 (the mis-gendered "Noah" slot, renamed) → its look
const FIX_NOAH = { id: NOAH_ID, photo: "2.jpg", firstName: "Bianca", lastName: "Russo", lookId: "look-1782231941091" };

// look per new curator (distinct womenswear; Jimmy Choo sandals skipped)
const LOOKS = ["look-1782231291165", "look-1782230201209", "look-1782213135433", "look-1782213107759", "look-1782226016446"];

const api = (body) => fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json().catch(() => ({})));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function fileDataUrl(file) { const b = await readFile(path.join(PEOPLE, file)); return `data:image/jpeg;base64,${b.toString("base64")}`; }
async function urlDataUrl(url) { const r = await fetch(url); const b = Buffer.from(await r.arrayBuffer()); return `data:${r.headers.get("content-type") || "image/jpeg"};base64,${b.toString("base64")}`; }
function blobOf(d) { const [h, b] = d.split(","); return new Blob([Buffer.from(b, "base64")], { type: h.match(/:(.*?);/)[1] }); }

async function createCurator(c) {
  const res = await fetch(`${BASE}/api/curator`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "apply", ...c, photo: await fileDataUrl(c.photo) }) });
  const d = await res.json().catch(() => ({}));
  return d.id;
}

async function realTryOn({ id, name, photo, lookId }) {
  console.log(`\n→ ${name} on ${lookId}`);
  const look = await fetch(`${BASE}/api/try-this-look`).then(r => r.json()).then(d => (d.looks ?? []).find(l => l.id === lookId));
  if (!look) { console.log("  ✗ look not found"); return; }
  const garment = await urlDataUrl(look.garmentFrontImageUrl || look.frontImageUrl || look.imageUrl);
  const fd = new FormData();
  fd.append("image", blobOf(garment), "g.jpg");
  fd.append("modelImage", blobOf(await fileDataUrl(photo)), "p.jpg");
  fd.append("lookId", lookId); fd.append("mode", "fashion-model"); fd.append("aspectRatio", "9:16");
  fd.append("prompt", `Full-body virtual fashion try-on. Show the entire person head to toe wearing the complete selected outfit, replacing their current clothing. Preserve the person's face, hair, skin tone and identity exactly. Full-length framing, clean studio. Keep the person fully and modestly dressed. Look: ${look.name}.`);
  let res = await fetch(`${BASE}/api/generate-openai-tryon`, { method: "POST", body: fd, headers: { "x-shopcut-account-id": `user-seed-${id}` } });
  let p = await res.json().catch(() => ({}));
  if (!res.ok || !p.image) { res = await fetch(`${BASE}/api/generate-fashn`, { method: "POST", body: fd, headers: { "x-shopcut-account-id": `user-seed-${id}` } }); p = await res.json().catch(() => ({})); }
  if (!res.ok || !p.image) { console.log(`  ✗ try-on failed: ${p.error ?? res.status}`); return; }
  console.log("  ✓ try-on image generated");
  const gen = await api({ action: "generation", lookId, lookName: look.name, storeName: look.storeName, customerName: name, curatorId: id, visitorId: "seed", image: p.image, feed: true });
  if (!gen.generationId) { console.log("  ✗ post failed"); return; }
  const vs = await fetch(`${BASE}/api/generate-tryon-video`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lookId, image: p.image }) }).then(r => r.json());
  if (!vs.videoId) { console.log(`  ✗ video start failed: ${vs.error ?? ""}`); return; }
  console.log("  … video generating");
  for (let i = 0; i < 50; i++) {
    await sleep(4000);
    const q = await fetch(`${BASE}/api/generate-tryon-video?videoId=${vs.videoId}&curatorId=`).then(r => r.json()).catch(() => null);
    if (q?.status === "done" && q.videoUrl) { await api({ action: "attach-generation-video", generationId: gen.generationId, videoUrl: q.videoUrl }); console.log("  ✓ video attached"); return; }
    if (q?.status === "failed") { console.log(`  ✗ video failed: ${q.error ?? ""}`); return; }
  }
  console.log("  ✗ video timed out");
}

async function main() {
  if (!PIN) { console.log("Set TRY_THIS_LOOK_ADMIN_PIN."); process.exit(1); }
  console.log(`Batch 2 → ${BASE}`);
  // top up the look owner so 6 more try-ons don't run out of credits
  await fetch(`${BASE}/api/curator`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify({ action: "set-credits", id: OWNER, credits: 400 }) });
  console.log("  ✓ credits topped up");

  // Fix the mis-gendered "Noah" → female name (best effort), then her try-on
  await fetch(`${BASE}/api/curator`, { method: "POST", headers: { "Content-Type": "application/json", "x-curator-id": NOAH_ID }, body: JSON.stringify({ action: "update", firstName: FIX_NOAH.firstName, lastName: FIX_NOAH.lastName, genderFocus: "women", motto: "Less, but bolder" }) });
  await realTryOn({ id: FIX_NOAH.id, name: `${FIX_NOAH.firstName} ${FIX_NOAH.lastName}`, photo: FIX_NOAH.photo, lookId: FIX_NOAH.lookId });

  // New curators (6-10) + their try-ons
  for (let i = 0; i < NEW_CURATORS.length; i++) {
    const c = NEW_CURATORS[i];
    const id = await createCurator(c);
    console.log(id ? `\n  ✓ curator ${c.firstName} ${c.lastName} (${id})` : `\n  ✗ curator ${c.firstName} failed`);
    if (id) await realTryOn({ id, name: `${c.firstName} ${c.lastName}`, photo: c.photo, lookId: LOOKS[i % LOOKS.length] });
  }
  console.log("\nBatch 2 done.");
}
main().catch(e => { console.error(e); process.exit(1); });
