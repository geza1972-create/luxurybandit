// Generate REAL AI try-ons (person dressed in a look's garment via OpenAI) + a
// Pixverse video for the seeded curators, then post + attach them.
//   node scripts/seed-realtryons.mjs
// Reads the admin pin from TRY_THIS_LOOK_ADMIN_PIN (pass via env when running).

import { readFile } from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.SEED_BASE || "http://localhost:3000").replace(/\/$/, "");
const PIN = process.env.TRY_THIS_LOOK_ADMIN_PIN || "";
const PEOPLE = path.resolve("seed/people");
const OWNER = "curator-1782204766325-wfyi0"; // Szidonia owns the looks → bears the credit cost

// curator id + their photo file + the look they try on (womenswear only)
const JOBS = [
  { name: "Lena Marsh",     id: "curator-1782367017253-qr92f", photo: "1.jpg", lookId: "look-1782233751990" }, // Tom Ford black
  { name: "Sofia Ardelean", id: "curator-1782367021299-zwazd", photo: "3.jpg", lookId: "look-1782232287462" }, // Golden Satin
  { name: "Amara Cole",     id: "curator-1782367022806-mab7k", photo: "4.jpg", lookId: "look-1782213155020" }, // Floral D&G
  { name: "Mira Voss",      id: "curator-1782367024379-kppfl", photo: "5.jpg", lookId: "look-1782226016446" }, // D&G Silk Satin
];

const api = (body) => fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json().catch(() => ({})));
const adminApi = (body) => fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify(body) });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fileDataUrl(file) { const b = await readFile(path.join(PEOPLE, file)); return `data:image/jpeg;base64,${b.toString("base64")}`; }
async function urlDataUrl(url) { const r = await fetch(url); const b = Buffer.from(await r.arrayBuffer()); return `data:${r.headers.get("content-type") || "image/jpeg"};base64,${b.toString("base64")}`; }
function blobOf(dataUrl) { const [h, b] = dataUrl.split(","); const mime = h.match(/:(.*?);/)[1]; return new Blob([Buffer.from(b, "base64")], { type: mime }); }

async function deleteRawSeedPosts() {
  const seedNames = new Set(JOBS.map(j => j.name).concat(["Noah Bennet"]));
  const d = await fetch(`${BASE}/api/try-this-look?community=1`).then(r => r.json());
  const ids = (d.community ?? []).filter(x => seedNames.has(x.customerName)).map(x => x.id);
  for (const id of ids) {
    const r = await adminApi({ action: "delete-generation", id });
    console.log(`  ${r.ok ? "✓" : "✗"} deleted raw post ${id.slice(0, 12)}`);
  }
}

async function realTryOn(job) {
  console.log(`\n→ ${job.name} on ${job.lookId}`);
  const look = await fetch(`${BASE}/api/try-this-look`).then(r => r.json()).then(d => (d.looks ?? []).find(l => l.id === job.lookId));
  if (!look) { console.log("  ✗ look not found"); return; }
  const garmentUrl = look.garmentFrontImageUrl || look.frontImageUrl || look.imageUrl;
  const garment = await urlDataUrl(garmentUrl);
  const person = await fileDataUrl(job.photo);

  // 1) OpenAI try-on (person dressed in the garment). Bills the look owner (Szidonia).
  const fd = new FormData();
  fd.append("image", blobOf(garment), "garment.jpg");
  fd.append("modelImage", blobOf(person), "person.jpg");
  fd.append("lookId", job.lookId);
  fd.append("mode", "fashion-model");
  fd.append("aspectRatio", "9:16");
  fd.append("prompt", `Full-body virtual fashion try-on. Show the entire person head to toe wearing the complete selected outfit, replacing their current clothing. Preserve the person's face, hair, skin tone and identity exactly. Full-length framing, clean studio. Coverage: keep the person fully and modestly dressed. Look: ${look.name}.`);
  let res = await fetch(`${BASE}/api/generate-openai-tryon`, { method: "POST", body: fd, headers: { "x-shopcut-account-id": `user-seed-${job.id}` } });
  let payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.image) {
    // fall back to FASHN if OpenAI refused
    res = await fetch(`${BASE}/api/generate-fashn`, { method: "POST", body: fd, headers: { "x-shopcut-account-id": `user-seed-${job.id}` } });
    payload = await res.json().catch(() => ({}));
  }
  if (!res.ok || !payload.image) { console.log(`  ✗ try-on failed: ${payload.error ?? res.status}`); return; }
  console.log("  ✓ try-on image generated");

  // 2) Post the generation (attributed to the curator)
  const gen = await api({ action: "generation", lookId: job.lookId, lookName: look.name, storeName: look.storeName, customerName: job.name, curatorId: job.id, visitorId: "seed", image: payload.image, feed: true });
  if (!gen.generationId) { console.log("  ✗ post failed"); return; }
  console.log(`  ✓ posted (${gen.generationId.slice(0, 12)})`);

  // 3) Generate the Pixverse video, poll, attach
  const vstart = await fetch(`${BASE}/api/generate-tryon-video`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lookId: job.lookId, image: payload.image }) }).then(r => r.json());
  if (!vstart.videoId) { console.log(`  ✗ video start failed: ${vstart.error ?? ""}`); return; }
  console.log("  … video generating");
  for (let i = 0; i < 50; i++) {
    await sleep(4000);
    const p = await fetch(`${BASE}/api/generate-tryon-video?videoId=${vstart.videoId}&curatorId=${vstart.curatorId ?? ""}`).then(r => r.json()).catch(() => null);
    if (p?.status === "done" && p.videoUrl) {
      await api({ action: "attach-generation-video", generationId: gen.generationId, videoUrl: p.videoUrl });
      console.log("  ✓ video attached");
      return;
    }
    if (p?.status === "failed") { console.log(`  ✗ video failed: ${p.error ?? ""}`); return; }
  }
  console.log("  ✗ video timed out");
}

async function main() {
  if (!PIN) { console.log("Set TRY_THIS_LOOK_ADMIN_PIN env to run."); process.exit(1); }
  console.log(`Real try-ons → ${BASE}`);
  await deleteRawSeedPosts();
  for (const job of JOBS) { try { await realTryOn(job); } catch (e) { console.log("  ✗ error:", e.message); } }
  console.log("\nDone.");
}
main().catch(e => { console.error(e); process.exit(1); });
