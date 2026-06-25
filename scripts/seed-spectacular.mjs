// 6 spectacular / extravagant summer looks (bold, sexy-glam, Romanian taste —
// cut-outs, crystals, high slits, sequins). Real product via /api/discover →
// published look owned by a curator (NO pre-alternatives → on-demand Lens dupes
// fill in later) → curator try-on + Kling video (via the video router).
//   TRY_THIS_LOOK_ADMIN_PIN=… node scripts/seed-spectacular.mjs

import { readFile } from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.SEED_BASE || "http://localhost:3000").replace(/\/$/, "");
const PIN = process.env.TRY_THIS_LOOK_ADMIN_PIN || "";
const PEOPLE = path.resolve("seed/people");
const SZ = "curator-1782204766325-wfyi0";

const JOBS = [
  { brand: "Versace",          query: "Versace cut-out embellished evening gown women",        wearer: { id: "curator-1782367021299-zwazd", name: "Sofia Ardelean",  photo: "3.jpg" } },
  { brand: "Roberto Cavalli",  query: "Roberto Cavalli snake print silk maxi gown women",      wearer: { id: "curator-1782368506998-ly8qg", name: "Nadia Rossi",     photo: "9.jpg" } },
  { brand: "Zuhair Murad",     query: "Zuhair Murad embellished high slit evening gown women", wearer: { id: "curator-1782368411837-0mdpw", name: "Yasmin Haddad",   photo: "8.jpg" } },
  { brand: "David Koma",       query: "David Koma cut-out crystal mini dress women",           wearer: { id: "curator-1782368231876-exbr6", name: "Elina Petrova",   photo: "6.jpg" } },
  { brand: "Retrofete",        query: "Retrofete sequin embellished maxi dress women",         wearer: { id: "curator-1782367022806-mab7k", name: "Amara Cole",      photo: "4.jpg" } },
  { brand: "Mugler",           query: "Mugler illusion cut-out bodycon gown women",            wearer: { id: "curator-1782367019713-lujf0", name: "Bianca Russo",    photo: "2.jpg" } },
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const api = (body) => fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json().catch(() => ({})));
async function fileDataUrl(file) { const b = await readFile(path.join(PEOPLE, file)); return `data:image/jpeg;base64,${b.toString("base64")}`; }
async function urlDataUrl(url) { const r = await fetch(url); if (!r.ok) throw new Error("img " + r.status); const b = Buffer.from(await r.arrayBuffer()); return `data:${r.headers.get("content-type") || "image/jpeg"};base64,${b.toString("base64")}`; }
function blobOf(d) { const [h, b] = d.split(","); return new Blob([Buffer.from(b, "base64")], { type: h.match(/:(.*?);/)[1] }); }

async function discover(query) {
  const r = await fetch(`${BASE}/api/discover`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify({ queries: [query] }) }).then(r => r.json()).catch(() => ({}));
  return (r.items ?? []).filter(it => it.thumbnail && it.link && it.title);
}

async function makeLook(job, hero) {
  const frontImage = await urlDataUrl(hero.thumbnail);
  const name = `${job.brand} ${String(hero.title).replace(new RegExp(job.brand, "ig"), "").trim()}`.slice(0, 90).trim();
  const res = await fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify({
    action: "upload-look", name, storeName: job.brand, frontImage, image: frontImage,
    price: hero.price || undefined, buyUrl: hero.link, published: true,
    productType: "real", curatorId: job.wearer.id, hashtags: `#${job.brand.replace(/[^a-z0-9]/ig, "")} #summer #glam`,
    // NO alternatives — the on-demand Lens dupe finder fills these on first open.
  }) });
  const d = await res.json().catch(() => ({}));
  const lookId = d?.activeLookId || d?.looks?.[0]?.id;
  if (!lookId) { console.log("    ✗ look create failed:", d?.error ?? res.status); return null; }
  console.log(`    ✓ look ${lookId} — "${name}"`);
  return { lookId, name, frontImage };
}

async function tryOnVideo(look, wearer) {
  const fd = new FormData();
  fd.append("image", blobOf(look.frontImage), "g.jpg");
  fd.append("modelImage", blobOf(await fileDataUrl(wearer.photo)), "p.jpg");
  fd.append("lookId", look.lookId); fd.append("mode", "fashion-model"); fd.append("aspectRatio", "9:16");
  fd.append("prompt", `Full-body high-fashion virtual try-on. Show the entire person head to toe wearing the complete glamorous outfit, replacing their current clothing. Preserve the person's face, hair, skin tone and identity exactly. Full-length framing, editorial studio. Keep the person tastefully and fully covered. Look: ${look.name}.`);
  let res = await fetch(`${BASE}/api/generate-openai-tryon`, { method: "POST", body: fd, headers: { "x-shopcut-account-id": `user-seed-${wearer.id}` } });
  let p = await res.json().catch(() => ({}));
  if (!res.ok || !p.image) { res = await fetch(`${BASE}/api/generate-fashn`, { method: "POST", body: fd, headers: { "x-shopcut-account-id": `user-seed-${wearer.id}` } }); p = await res.json().catch(() => ({})); }
  if (!res.ok || !p.image) { console.log(`    ✗ try-on failed: ${p.error ?? res.status}`); return; }
  console.log("    ✓ try-on image");
  const gen = await api({ action: "generation", lookId: look.lookId, lookName: look.name, storeName: look.name.split(" ")[0], customerName: wearer.name, curatorId: wearer.id, visitorId: "seed", image: p.image, feed: true });
  if (!gen.generationId) { console.log("    ✗ post failed"); return; }
  // Video via the router (normal clothes → Kling)
  const s = await fetch(`${BASE}/api/generate-tryon-video`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lookId: look.lookId, image: p.image }) }).then(r => r.json());
  if (!s?.videoId) { console.log(`    ✓ photo only — video start failed: ${s?.error ?? ""}`); return; }
  const provider = String(s.videoId).startsWith("fal:") ? "Kling" : "Pixverse";
  for (let i = 0; i < 75; i++) {
    await sleep(4000);
    const q = await fetch(`${BASE}/api/generate-tryon-video?videoId=${encodeURIComponent(s.videoId)}&curatorId=${s.curatorId ?? ""}`).then(r => r.json()).catch(() => null);
    if (q?.status === "done" && q.videoUrl) { await api({ action: "attach-generation-video", generationId: gen.generationId, videoUrl: q.videoUrl }); console.log(`    ✓ video [${provider}]`); return; }
    if (q?.status === "failed") { console.log(`    ✓ photo only — video failed [${provider}]`); return; }
  }
  console.log("    ✓ photo only — video timed out");
}

async function main() {
  if (!PIN) { console.log("Set TRY_THIS_LOOK_ADMIN_PIN."); process.exit(1); }
  console.log(`Spectacular summer → ${BASE}`);
  const owners = [SZ, ...new Set(JOBS.map(j => j.wearer.id))];
  for (const id of owners) await fetch(`${BASE}/api/curator`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify({ action: "set-credits", id, credits: 400 }) });
  console.log(`  ✓ topped up ${owners.length} owners`);
  for (const job of JOBS) {
    console.log(`\n=== ${job.brand} → ${job.wearer.name} ===`);
    try {
      const items = await discover(job.query);
      if (!items.length) { console.log("  ✗ no products"); continue; }
      const hero = items.find(it => it.priceValue > 0) || items[0];
      const look = await makeLook(job, hero);
      if (look) await tryOnVideo(look, job.wearer);
    } catch (e) { console.log("  ✗ error:", e.message); }
  }
  console.log("\nSpectacular done.");
}
main().catch(e => { console.error(e); process.exit(1); });
