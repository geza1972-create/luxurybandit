// Seed demo content (curators + comments + optional try-ons) for Phase-0 filling.
// Reusable: run again to add more. Targets a base URL (default: local dev).
//
//   node scripts/seed-content.mjs                 # local (http://localhost:3000)
//   SEED_BASE=https://luxurybandit.com node scripts/seed-content.mjs
//
// Try-ons: drop person images in seed/people/<curatorKey>.jpg and the script will
// post them as try-ons attributed to that curator + a look. Without images it only
// seeds curators + comments (no AI cost).

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const BASE = (process.env.SEED_BASE || "http://localhost:3000").replace(/\/$/, "");
const PEOPLE_DIR = path.resolve("seed/people");

// ── Curator personas — realistic, varied. Photos are placeholder avatars you can
// replace with your own images (drop them in seed/people/<key>.jpg). ──
const CURATORS = [
  { key: "lena", firstName: "Lena", lastName: "Marsh", email: "lena.marsh@seed.lb", genderFocus: "women",
    motto: "Quiet luxury, loud confidence", instagram: "lena.marsh",
    style: "Old-money minimalism, tailored silhouettes", brands: "The Row, Toteme, Khaite, Max Mara",
    colors: "cream, camel, black, navy", occasions: "work, dinner, weekend", priceTiers: "Mid-range, Luxury",
    bio: "I curate the pieces that look expensive without trying. Clean lines, real fabrics, zero noise.", avatar: 5 },
  { key: "noah", firstName: "Noah", lastName: "Bennet", email: "noah.bennet@seed.lb", genderFocus: "men",
    motto: "Sharp, never stiff", instagram: "noah.bennet",
    style: "Modern tailoring, elevated streetwear", brands: "Lemaire, A.P.C., Our Legacy, Zegna",
    colors: "charcoal, olive, ecru", occasions: "work, evening", priceTiers: "Mid-range, Luxury",
    bio: "Menswear that works Monday to Saturday night. Fit first, hype never.", avatar: 12 },
  { key: "sofia", firstName: "Sofia", lastName: "Ardelean", email: "sofia.ardelean@seed.lb", genderFocus: "women",
    motto: "Bucharest to the boulevard", instagram: "sofia.ardelean",
    style: "Romanian glam, statement dresses", brands: "Musette, Zimmermann, Self-Portrait",
    colors: "emerald, gold, ruby", occasions: "event, party, date", priceTiers: "Budget, Mid-range, Luxury",
    bio: "Local finds that turn heads. I shop eMAG and Musette so you don't have to.", avatar: 9 },
  { key: "amara", firstName: "Amara", lastName: "Cole", email: "amara.cole@seed.lb", genderFocus: "women",
    motto: "Florals, but make them fierce", instagram: "amara.cole",
    style: "Romantic prints, cinched waists", brands: "Dolce & Gabbana, Zimmermann, Ulla Johnson",
    colors: "blush, rose, ivory", occasions: "wedding guest, brunch, date", priceTiers: "Mid-range, Luxury",
    bio: "If it has flowers and a great silhouette, I've already saved it.", avatar: 16 },
  { key: "mira", firstName: "Mira", lastName: "Voss", email: "mira.voss@seed.lb", genderFocus: "unisex",
    motto: "Less, but the best", instagram: "mira.voss",
    style: "Scandi minimal, monochrome", brands: "Acne Studios, COS, Jil Sander",
    colors: "white, grey, black", occasions: "everyday, work", priceTiers: "Budget, Mid-range",
    bio: "One perfect piece beats ten okay ones. I find the one.", avatar: 20 },
];

// ── Comment pool — short, real-sounding. Distributed across looks. ──
const COMMENTS = [
  "obsessed 😍", "this is THE dress", "need this for the wedding i'm in 🙌", "the drape on this is insane",
  "okay adding to cart immediately", "how does it look on a curvier figure?", "the price range is actually wild",
  "tried it on, fits like a glove", "this color though 🔥", "saving for date night", "elegant without trying",
  "the dupe option is so good", "this would be perfect for the gala", "where has this been all my life",
  "literally screenshotting this", "the gold belt makes it", "10/10 would bandit 💅", "ordered the mid-range one!",
  "stunning on you", "this is my roman empire now", "the movement in the video 😮", "clean and timeless",
];

const NAMES = ["Ava", "Elena", "Maya", "Clara", "Ines", "Dora", "Bianca", "Ruxandra", "Tara", "Nadia", "Jana", "Petra"];
const rand = (a) => a[Math.floor(Math.random() * a.length)];
const sample = (a, n) => [...a].sort(() => 0.5 - Math.random()).slice(0, n);

async function api(body) {
  const res = await fetch(`${BASE}/api/try-this-look`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

async function fetchDataUrl(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const mime = r.headers.get("content-type") || "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch { return null; }
}

function mimeFor(ext) {
  const e = ext.toLowerCase();
  return e === "png" ? "image/png" : e === "webp" ? "image/webp" : "image/jpeg";
}

async function fileToDataUrl(file) {
  const buf = await readFile(file);
  return `data:${mimeFor(path.extname(file).slice(1))};base64,${buf.toString("base64")}`;
}

// All person images in seed/people/, sorted by name. First 5 → curator photos,
// the rest → try-on posts.
async function loadPeopleImages() {
  if (!existsSync(PEOPLE_DIR)) return [];
  const files = (await readdir(PEOPLE_DIR))
    .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return files.map(f => path.join(PEOPLE_DIR, f));
}

async function createCurator(c, imgFile) {
  const photo = imgFile ? await fileToDataUrl(imgFile) : await fetchDataUrl(`https://i.pravatar.cc/600?img=${c.avatar}`);
  const res = await fetch(`${BASE}/api/curator`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "apply", firstName: c.firstName, lastName: c.lastName, email: c.email,
      genderFocus: c.genderFocus, motto: c.motto, bio: c.bio, style: c.style, brands: c.brands,
      colors: c.colors, occasions: c.occasions, priceTiers: c.priceTiers, instagram: c.instagram,
      photo: photo || undefined }),
  });
  const data = await res.json().catch(() => ({}));
  return { ...c, id: data.id };
}

async function main() {
  console.log(`Seeding → ${BASE}`);
  const images = await loadPeopleImages();
  console.log(`  ${images.length} person image(s) in seed/people/`);
  const curatorImgs = images.slice(0, CURATORS.length);
  const tryonImgs = images.slice(CURATORS.length);

  // 1) Curators (first images become their photos; pravatar fallback otherwise)
  const created = [];
  for (let i = 0; i < CURATORS.length; i++) {
    const c = CURATORS[i];
    const r = await createCurator(c, curatorImgs[i]);
    console.log(r.id ? `  ✓ curator ${c.firstName} ${c.lastName} (${r.id})` : `  ✗ curator ${c.firstName} failed`);
    if (r.id) created.push(r);
  }
  const authors = [...created.map(c => `${c.firstName} ${c.lastName}`), ...NAMES];

  // 2) Comments on the existing published looks
  const looks = await fetch(`${BASE}/api/try-this-look`).then(r => r.json()).then(d => d.looks ?? []);
  console.log(`  found ${looks.length} looks — adding comments`);
  let added = 0;
  for (const look of looks) {
    if (look.commentsOff) continue;
    for (const text of sample(COMMENTS, 2 + Math.floor(Math.random() * 3))) {
      const r = await api({ action: "add-comment", lookId: look.id, text, authorName: rand(authors) });
      if (r.ok) added++;
    }
  }
  console.log(`  ✓ ${added} comments added`);

  // 3) Try-on posts from the remaining images (a person "wearing" a look, in the feed)
  let tryons = 0;
  for (let i = 0; i < tryonImgs.length; i++) {
    const look = looks[i % looks.length];
    const cur = created[i % Math.max(1, created.length)];
    if (!look) break;
    const image = await fileToDataUrl(tryonImgs[i]);
    const r = await api({
      action: "generation", lookId: look.id, lookName: look.name, storeName: look.storeName,
      customerName: cur ? `${cur.firstName} ${cur.lastName}` : rand(NAMES),
      curatorId: cur?.id, visitorId: "seed", image, feed: true,
    });
    if (r.ok && r.data?.generationId) { tryons++; console.log(`  ✓ try-on by ${cur?.firstName} on ${look.name.slice(0,28)}`); }
    else console.log(`  ✗ try-on ${i + 1} failed (${r.status})`);
  }
  console.log(`  ✓ ${tryons} try-on posts added`);
  console.log("Done.");
}

main().catch(e => { console.error(e); process.exit(1); });
