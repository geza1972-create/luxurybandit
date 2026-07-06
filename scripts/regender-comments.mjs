/**
 * Benennt die FAN-Namen der Kompliment-Kommentare um: ~80 % Männer / 20 % Frauen
 * (User-Vorgabe — die Zielgruppe, die Models kommentiert, ist männlich).
 * Model-Antworten bleiben unberührt; deren replyToName wird synchron umbenannt.
 *
 *   node scripts/regender-comments.mjs            # Probelauf
 *   node scripts/regender-comments.mjs --apply    # schreibt wirklich
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const APPLY = process.argv.includes("--apply");
const MALE_SHARE = 0.8;

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
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const enc = (p) => p.split("/").map(encodeURIComponent).join("/");

const MEN = [
  "Max", "Daniel", "Chris", "Tom", "Alex", "Julian", "Nico", "Ben", "Marco", "Leon",
  "David", "Lukas", "Jonas", "Tim R.", "Philipp", "Sebastian", "Kevin", "Dennis", "Patrick", "Andre",
  "Stefan", "Oliver", "Erik", "Florian", "Marcel", "Sam", "Ryan", "Jake", "Liam", "Noah",
  "Ethan", "Carlos", "Diego", "Luca", "Matteo", "Andrei", "Milan", "Victor", "Adrian", "Paul B.",
  "mr.goldwatch", "gentleman.mode", "jay_lux", "the.marc", "tony.rich", "leo.knows",
];
const WOMEN = [
  "Mia", "Sophie K.", "Elena", "Jasmin", "Nina", "Carla", "Emma", "Selin", "Zoe", "Romy",
  "luxelover", "goldenhourgirl",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  console.log(`\n${APPLY ? "🔧 APPLY" : "👀 DRY RUN"} — Ziel: ~${MALE_SHARE * 100}% Männer\n`);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${enc(STATE_PATH)}`, { headers });
  const state = await res.json();
  const comments = state.comments ?? [];

  // Model-Namen (antworten selbst — nie umbenennen)
  const modelNames = new Set((state.curators ?? []).map(c => [c.firstName, c.lastName].filter(Boolean).join(" ")));
  modelNames.add("Luxurybandit"); modelNames.add("LuxuryBandit"); modelNames.add("You");

  const topLevel = comments.filter(c => !c.parentId && !modelNames.has(c.authorName));
  const rename = new Map(); // commentId → neuer Name
  let male = 0, female = 0;
  for (const c of topLevel) {
    const wantMale = Math.random() < MALE_SHARE;
    const name = wantMale ? pick(MEN) : pick(WOMEN);
    if (wantMale) male++; else female++;
    rename.set(c.id, name);
  }
  let renamed = 0, repliesFixed = 0;
  for (const c of comments) {
    if (rename.has(c.id)) { if (APPLY) c.authorName = rename.get(c.id); renamed++; }
    if (c.parentId && rename.has(c.parentId)) { if (APPLY) c.replyToName = rename.get(c.parentId); repliesFixed++; }
  }
  console.log(`${topLevel.length} Fan-Kommentare → ${male} Männer / ${female} Frauen (${Math.round(male / (male + female) * 100)}%)`);
  console.log(`${renamed} umbenannt, ${repliesFixed} Reply-Verweise angepasst`);
  if (!APPLY) { console.log("(Probelauf — nichts geschrieben.)\n"); return; }

  writeFileSync(resolve(process.cwd(), `state-backup-${Date.now()}.json`), JSON.stringify(state));
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${enc(STATE_PATH)}`, {
    method: "POST", headers: { ...headers, "Content-Type": "application/json", "x-upsert": "true" }, body: JSON.stringify(state),
  });
  if (!up.ok) { console.error(`❌ Upload: ${up.status}`); process.exit(1); }
  console.log("✅ gespeichert.\n");
}
main().catch(e => { console.error(e); process.exit(1); });
