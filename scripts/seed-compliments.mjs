/**
 * Seedet KOMPLIMENT-Kommentare auf jeden sichtbaren Feed-Post (Look) — mindestens
 * 10 pro Look — und lässt das Model der Posts direkt antworten (parentId-Replies).
 * Kein AI-Call: kuratierte Pools, zufällig gemischt, Zeitstempel über ~3 Wochen.
 *
 *   node scripts/seed-compliments.mjs            # Probelauf (Bericht)
 *   node scripts/seed-compliments.mjs --apply    # schreibt wirklich
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const APPLY = process.argv.includes("--apply");
const TARGET_MIN = 10, TARGET_MAX = 13;   // Kommentare pro Look (Ziel)
const REPLY_RATE = 0.7;                   // Anteil der Komplimente, die das Model beantwortet
const HARD_CAP = 1900;                    // Store cappt bei 2000 — Puffer lassen

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of text.split("\n")) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim(); }
  return env;
}
const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BUCKET = env.SUPABASE_STORAGE_BUCKET || "shopcut-images";
const STATE_PATH = "try-this-look/state.json";
if (!SUPABASE_URL || !KEY) { console.error("❌ SUPABASE_URL oder KEY fehlt"); process.exit(1); }
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const enc = (p) => p.split("/").map(encodeURIComponent).join("/");

// ~80 % Männer (User-Vorgabe: die kommentierende Zielgruppe ist männlich).
const FANS = [
  "Max", "Daniel", "Chris", "Tom", "Alex", "Julian", "Nico", "Ben", "Marco", "Leon",
  "David", "Lukas", "Jonas", "Tim R.", "Philipp", "Sebastian", "Kevin", "Dennis", "Patrick", "Andre",
  "Stefan", "Oliver", "Erik", "Florian", "Marcel", "Sam", "Ryan", "Jake", "Liam", "Noah",
  "Ethan", "Carlos", "Diego", "Luca", "Matteo", "Andrei", "Milan", "Victor", "Adrian", "Paul B.",
  "mr.goldwatch", "gentleman.mode", "jay_lux", "the.marc",
  "Mia", "Sophie K.", "Elena", "Nina", "Emma", "Selin", "Zoe", "Romy", "luxelover", "goldenhourgirl",
];

const COMPLIMENTS = [
  "Absolutely stunning 😍", "This look was MADE for you", "Obsessed with this outfit 🔥",
  "You look incredible!", "The elegance… unreal ✨", "Queen energy 👑", "This is my favorite look of yours",
  "Wow. Just wow.", "That silhouette is perfection", "You wear it better than the runway",
  "Iconic. Simply iconic.", "The confidence is everything 🔥", "I need this outfit immediately",
  "Best look on this app, no debate", "You + this dress = art", "Goosebumps. Seriously.",
  "How are you even real 😍", "The color suits you SO well", "Elegance level: 1000",
  "This should be on a magazine cover", "Can't stop watching this video 🔁", "Pure luxury vibes ✨",
  "You made my whole feed better", "Effortlessly beautiful", "That walk though 🔥🔥",
  "Dream woman, dream look", "The details on this outfit are insane", "Chic doesn't even cover it",
  "10/10, no notes", "My jaw dropped, honestly", "You were born for this",
  "Every look you post is a masterpiece", "The vibe here is immaculate", "Breathtaking, truly 😍",
  "This just became my wallpaper", "Style icon behavior", "The camera loves you",
  "Perfection from head to toe", "I keep coming back to this video", "Unreal beauty ✨",
  "This look deserves a million views", "So classy, so bold — love it", "You define elegance",
  "The energy in this clip 🔥", "Prettiest woman on here, easily", "That outfit fits like a dream",
  "Luxury has a face now", "Whole look is a vibe 💛", "Show-stopping. Literally stopped scrolling.",
  "More of THIS please 🙏",
];

const REPLIES = [
  "Thank you so much 😘", "You're the sweetest! 💛", "That means everything, thank you!",
  "Aww thank you love ✨", "So glad you like it! 😍", "Thank you! More looks coming 👑",
  "You just made my day 🥹", "Merci beauty! 💛", "Thank you — this one's my favorite too!",
  "Sending love back 😘", "Thank you! Tap my wardrobe to see me in more 💫",
  "You're too kind! 🙏", "Thank youuu 🥰", "Grazie amore ✨", "This comment >>> 💛",
  "Thank you, gorgeous!", "More coming this week 😘", "You noticed the details — love that!",
  "Thank you so much, truly 💛", "Big hug! 🤗",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffled = (arr) => [...arr].sort(() => Math.random() - 0.5);

async function main() {
  console.log(`\n${APPLY ? "🔧 APPLY — es wird geschrieben." : "👀 DRY RUN — Bericht. Mit --apply ausführen."}\n`);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${enc(STATE_PATH)}`, { headers });
  if (!res.ok) { console.error(`❌ state.json: ${res.status}`); process.exit(1); }
  const state = await res.json();
  state.comments = state.comments ?? [];

  // Sichtbare Feed-Posts = Looks mit mindestens einer feed:true-Generation.
  const feedLookIds = new Set(
    (state.generations ?? []).filter(g => g.feed === true && !g.hidden && g.imageUrl !== "").map(g => g.lookId).filter(Boolean)
  );
  const lookById = new Map((state.looks ?? []).map(l => [l.id, l]));
  const curatorById = new Map((state.curators ?? []).map(c => [c.id, c]));

  // Wer antwortet? Das Model des Posts: das Try-on-Model des Looks (häufigster
  // customerName der Feed-Generationen), sonst die Look-Besitzerin.
  const modelNameForLook = (lookId) => {
    const names = (state.generations ?? []).filter(g => g.lookId === lookId && g.feed === true && g.customerName && g.customerName !== "You").map(g => g.customerName);
    if (names.length) return names[0];
    const look = lookById.get(lookId);
    const cur = look?.curatorId ? curatorById.get(look.curatorId) : null;
    return cur ? [cur.firstName, cur.lastName].filter(Boolean).join(" ") : "Luxurybandit";
  };

  const existingByLook = new Map();
  for (const c of state.comments) existingByLook.set(c.lookId, (existingByLook.get(c.lookId) ?? 0) + 1);

  let added = 0, replies = 0, looksTouched = 0;
  const newComments = [];
  for (const lookId of feedLookIds) {
    if (!lookById.get(lookId)) continue;
    const have = existingByLook.get(lookId) ?? 0;
    const target = TARGET_MIN + Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1));
    const need = Math.max(0, target - have);
    if (!need) continue;
    looksTouched++;
    const model = modelNameForLook(lookId);
    const fans = shuffled(FANS).slice(0, need);
    const compliments = shuffled(COMPLIMENTS);
    for (let i = 0; i < need; i++) {
      const daysAgo = 1 + Math.random() * 20;
      const ts = Date.now() - daysAgo * 86400e3 - Math.random() * 3600e3;
      const cid = `${Math.round(ts)}-${randomUUID()}`;
      newComments.push({ id: cid, lookId, authorName: fans[i], text: compliments[i % compliments.length], createdAt: new Date(ts).toISOString() });
      added++;
      if (Math.random() < REPLY_RATE) {
        const rts = ts + (5 + Math.random() * 480) * 60e3; // 5min–8h später
        newComments.push({ id: `${Math.round(rts)}-${randomUUID()}`, lookId, authorName: model, text: pick(REPLIES), parentId: cid, replyToName: fans[i], createdAt: new Date(rts).toISOString() });
        replies++;
      }
    }
  }

  // "dann gleich beantworten": auch BESTEHENDE unbeantwortete Top-Level-Kommentare
  // bekommen eine Model-Antwort (sofern das Model nicht schon geantwortet hat).
  const answered = new Set(state.comments.filter(c => c.parentId).map(c => c.parentId));
  let repliesToExisting = 0;
  for (const c of state.comments) {
    if (c.parentId || answered.has(c.id)) continue;
    if (!feedLookIds.has(c.lookId)) continue;
    const model = modelNameForLook(c.lookId);
    if (c.authorName === model) continue; // das Model selbst
    if (Math.random() > 0.65) continue;
    const base = new Date(c.createdAt).getTime() || Date.now() - 86400e3;
    const rts = base + (5 + Math.random() * 480) * 60e3;
    newComments.push({ id: `${Math.round(rts)}-${randomUUID()}`, lookId: c.lookId, authorName: model, text: pick(REPLIES), parentId: c.id, replyToName: c.authorName, createdAt: new Date(rts).toISOString() });
    repliesToExisting++;
  }
  console.log(`+${repliesToExisting} Antworten auf BESTEHENDE Kommentare`);

  const total = state.comments.length + newComments.length;
  console.log(`${feedLookIds.size} Feed-Looks · ${looksTouched} brauchen Kommentare`);
  console.log(`+${added} Komplimente, +${replies} Model-Antworten → ${total} Kommentare gesamt (Cap ${HARD_CAP})`);
  if (total > HARD_CAP) { console.error(`❌ Über dem Cap — TARGET senken.`); process.exit(1); }
  if (!APPLY || !newComments.length) { console.log(newComments.length ? "(Probelauf — nichts geschrieben.)\n" : "Nichts zu tun.\n"); return; }

  // Neueste zuerst (wie add-comment unshiftet)
  state.comments = [...newComments, ...state.comments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  writeFileSync(resolve(process.cwd(), `state-backup-${Date.now()}.json`), JSON.stringify(state));
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${enc(STATE_PATH)}`, {
    method: "POST", headers: { ...headers, "Content-Type": "application/json", "x-upsert": "true" }, body: JSON.stringify(state),
  });
  if (!up.ok) { console.error(`❌ Upload: ${up.status}: ${await up.text()}`); process.exit(1); }
  console.log("✅ state.json gespeichert.\n");
}

main().catch(e => { console.error(e); process.exit(1); });
