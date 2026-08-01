// Generate 40 new curator profiles (images 11-50), each with a real AI try-on
// (their own face) on a glam look, and a video for ~half of them. New profiles
// populate the catalogue with many distinct curators.
//   TRY_THIS_LOOK_ADMIN_PIN=… node scripts/seed-curators-40.mjs
// Run ALONE — never concurrently with another seed script.

import { readFile } from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.SEED_BASE || "http://localhost:3000").replace(/\/$/, "");
const PIN = process.env.TRY_THIS_LOOK_ADMIN_PIN || "";
const PEOPLE = path.resolve("seed/people");
const SZ = "curator-1782204766325-wfyi0"; // bears the try-on credit cost (topped up)

// existing curators + Szidonia — topped up so video billing (charged to the look
// owner) never runs dry during the batch
const TOPUP = [SZ, "curator-1782367017253-qr92f","curator-1782367019713-lujf0","curator-1782367021299-zwazd","curator-1782367022806-mab7k","curator-1782367024379-kppfl","curator-1782368231876-exbr6","curator-1782368317618-2jtbu","curator-1782368411837-0mdpw","curator-1782368506998-ly8qg","curator-1782368617777-dmbrx"];

const FIRST = ["Aria","Camille","Priya","Mei","Isabella","Freya","Léa","Olivia","Sienna","Anaïs","Zara","Marisol","Ingrid","Chiara","Naomi","Daniela","Lucia","Maya","Elise","Valentina","Noor","Hana","Adriana","Selin","Paloma","Greta","Juliette","Esme","Farah","Giulia","Helena","Iris","Liv","Margot","Nina","Ottilie","Romy","Suki","Talia","Vera"];
const LAST = ["Calloway","Devereux","Sharma","Tanaka","Ricci","Holm","Bernard","Sinclair","Marchetti","Dubois","Khan","Reyes","Sundström","Conti","Okafor","Castro","Romano","Bauer","Laurent","Falk","Moreau","Vance","Costa","Adeyemi","Beaumont","Cruz","Halonen","Esposito","Novak","Fontaine","Bellini","Aziz","Lindholm","Mercier","Galli","Park","Schneider","Volkov","Ferran","Lindqvist"];

const ARCH = [
  { style:"Old-money minimalism, clean tailoring", brands:"The Row, Toteme, Khaite, Max Mara", colors:"cream, camel, black", occasions:"work, dinner", priceTiers:"Luxury", motto:"Quiet luxury, loud presence", bio:"Clean lines, real fabrics, zero noise." },
  { style:"Red-carpet glam, statement gowns", brands:"Versace, Elie Saab, Zuhair Murad", colors:"emerald, wine, gold", occasions:"gala, event", priceTiers:"Luxury", motto:"If it doesn't make an entrance, skip it", bio:"Drama, tastefully done." },
  { style:"Italian polish, prints & tailoring", brands:"Dolce & Gabbana, Versace, Etro", colors:"red, black, floral", occasions:"date, dinner", priceTiers:"Mid-range, Luxury", motto:"Italian, obviously", bio:"Milano meets the sea in everything I pick." },
  { style:"Parisian effortless chic", brands:"Saint Laurent, Celine, Lemaire", colors:"black, ivory, navy", occasions:"everyday, evening", priceTiers:"Luxury", motto:"Effortless, on purpose", bio:"One sharp piece beats ten safe ones." },
  { style:"Romantic prints, cinched waists", brands:"Zimmermann, Dolce & Gabbana, Ulla Johnson", colors:"blush, rose, ivory", occasions:"wedding guest, brunch", priceTiers:"Mid-range, Luxury", motto:"Florals, but fierce", bio:"If it has flowers and a silhouette, it's saved." },
  { style:"Bold tailoring, sculptural cuts", brands:"Mugler, Balmain, Saint Laurent", colors:"black, silver, red", occasions:"party, evening", priceTiers:"Luxury", motto:"Architecture you can wear", bio:"Sharp shoulders, sharper exits." },
  { style:"Scandi minimal with an edge", brands:"Acne Studios, Toteme, Khaite", colors:"white, grey, camel", occasions:"work, everyday", priceTiers:"Mid-range, Luxury", motto:"Cool, clean, done", bio:"Less, but the very best." },
  { style:"Modern glam, satin & sparkle", brands:"Gucci, Valentino, Prada", colors:"gold, black, jewel tones", occasions:"night out, event", priceTiers:"Luxury", motto:"Make it shine", bio:"Satin, sparkle, and a great heel." },
];

const api = (body) => fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json().catch(() => ({})));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function fileDataUrl(file) { const b = await readFile(path.join(PEOPLE, file)); return `data:image/jpeg;base64,${b.toString("base64")}`; }
async function urlDataUrl(url) { const r = await fetch(url); if (!r.ok) throw new Error("img"); const b = Buffer.from(await r.arrayBuffer()); return `data:${r.headers.get("content-type") || "image/jpeg"};base64,${b.toString("base64")}`; }
function blobOf(d) { const [h, b] = d.split(","); return new Blob([Buffer.from(b, "base64")], { type: h.match(/:(.*?);/)[1] }); }

async function createCurator(c) {
  const res = await fetch(`${BASE}/api/curator`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "apply", ...c }) });
  const d = await res.json().catch(() => ({}));
  return d.id;
}

async function tryOn(curId, name, photo, look, withVideo) {
  const garment = await urlDataUrl(look.garmentFrontImageUrl || look.frontImageUrl || look.imageUrl);
  const fd = new FormData();
  fd.append("image", blobOf(garment), "g.jpg");
  fd.append("modelImage", blobOf(await fileDataUrl(photo)), "p.jpg");
  fd.append("lookId", look.id); fd.append("mode", "fashion-model"); fd.append("aspectRatio", "9:16");
  fd.append("curatorId", SZ); // bill the still try-on to the topped-up house account
  fd.append("prompt", `Full-body virtual fashion try-on. Show the entire person head to toe wearing the complete selected outfit, replacing their current clothing. Preserve the person's face, hair, skin tone and identity exactly. Full-length framing, clean studio. Keep the person fully and modestly dressed. Look: ${look.name}.`);
  let res = await fetch(`${BASE}/api/generate-openai-tryon`, { method: "POST", body: fd, headers: { "x-shopcut-account-id": `user-seed-${curId}` } });
  let p = await res.json().catch(() => ({}));
  if (!res.ok || !p.image) { res = await fetch(`${BASE}/api/generate-fashn`, { method: "POST", body: fd, headers: { "x-shopcut-account-id": `user-seed-${curId}` } }); p = await res.json().catch(() => ({})); }
  if (!res.ok || !p.image) { console.log(`    ✗ try-on failed: ${p.error ?? res.status}`); return; }
  const gen = await api({ action: "generation", lookId: look.id, lookName: look.name, storeName: look.storeName, customerName: name, curatorId: curId, visitorId: "seed", image: p.image, feed: true });
  if (!gen.generationId) { console.log("    ✗ post failed"); return; }
  if (!withVideo) { console.log(`    ✓ try-on (photo) by ${name}`); return; }
  const vs = await fetch(`${BASE}/api/generate-tryon-video`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lookId: look.id, image: p.image }) }).then(r => r.json());
  if (!vs.videoId) { console.log(`    ✓ try-on (photo) by ${name} — video skip: ${vs.error ?? ""}`); return; }
  for (let i = 0; i < 50; i++) {
    await sleep(4000);
    const q = await fetch(`${BASE}/api/generate-tryon-video?videoId=${vs.videoId}&curatorId=${vs.curatorId ?? ""}`).then(r => r.json()).catch(() => null);
    if (q?.status === "done" && q.videoUrl) { await api({ action: "attach-generation-video", generationId: gen.generationId, videoUrl: q.videoUrl }); console.log(`    ✓ try-on + video by ${name}`); return; }
    if (q?.status === "failed") { console.log(`    ✓ try-on (photo) by ${name} — video failed`); return; }
  }
  console.log(`    ✓ try-on (photo) by ${name} — video timed out`);
}

async function main() {
  if (!PIN) { console.log("Set TRY_THIS_LOOK_ADMIN_PIN."); process.exit(1); }
  console.log(`40 curators → ${BASE}`);
  for (const id of TOPUP) await fetch(`${BASE}/api/curator`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify({ action: "set-credits", id, credits: 800 }) });
  console.log("  ✓ owners topped up");

  // glam looks only — skip lingerie / swim / bodysuit for these try-ons
  const SKIP = /(slip|robe|kimono|swimsuit|maillot|one[- ]?piece|bodysuit|nightdress|chemise|lingerie)/i;
  const looks = await fetch(`${BASE}/api/try-this-look`).then(r => r.json()).then(d => (d.looks || []).filter(l => l.published !== false && !SKIP.test(l.name || "")));
  console.log(`  ${looks.length} glam looks available\n`);

  for (let n = 0; n < 40; n++) {
    const idx = 11 + n;                 // image 11..50
    const a = ARCH[n % ARCH.length];
    const first = FIRST[n], last = LAST[n];
    const name = `${first} ${last}`;
    const persona = { firstName: first, lastName: last, email: `${first}.${last}@seed.invalid`.toLowerCase(), genderFocus: "women", instagram: `${first}.${last}`.toLowerCase(), ...a };
    console.log(`=== ${idx}. ${name} ===`);
    let id;
    try { id = await createCurator({ ...persona, photo: await fileDataUrl(`${idx}.jpg`) }); } catch (e) { console.log("    ✗ create error:", e.message); continue; }
    if (!id) { console.log("    ✗ create failed"); continue; }
    const look = looks[n % looks.length];
    try { await tryOn(id, name, `${idx}.jpg`, look, true); } catch (e) { console.log("    ✗ try-on error:", e.message); }
  }
  console.log("\n40 curators done.");
}
main().catch(e => { console.error(e); process.exit(1); });
