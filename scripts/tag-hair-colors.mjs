/**
 * Einmaliges KI-Tagging: klassifiziert die Haarfarbe jedes Models (Curator-Foto)
 * mit OpenAI Vision (gpt-5-mini) und schreibt `hairColor` in state.json.
 * Werte: blond | brunette | black | red | other — treibt den Haarfarben-Filter
 * im "Models"-Tab der Startseite.
 *
 *   node scripts/tag-hair-colors.mjs            # Probelauf (klassifiziert, schreibt nicht)
 *   node scripts/tag-hair-colors.mjs --apply    # schreibt wirklich
 *   node scripts/tag-hair-colors.mjs --force    # auch bereits getaggte neu klassifizieren
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BUCKET = env.SUPABASE_STORAGE_BUCKET || "shopcut-images";
const OPENAI = env.OPENAI_API_KEY;
const STATE_PATH = "try-this-look/state.json";
if (!SUPABASE_URL || !KEY) { console.error("❌ SUPABASE_URL oder KEY fehlt in .env.local"); process.exit(1); }
if (!OPENAI) { console.error("❌ OPENAI_API_KEY fehlt in .env.local"); process.exit(1); }

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");
const VALID = new Set(["blond", "brunette", "black", "red", "other"]);

async function imageDataUrl(path) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(path)}`, { headers });
  if (!res.ok) return null;
  const type = res.headers.get("content-type") || "image/jpeg";
  const b = Buffer.from(await res.arrayBuffer());
  if (b.length > 15 * 1024 * 1024) return null;
  return `data:${type};base64,${b.toString("base64")}`;
}

async function classify(dataUrl) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.OPENAI_VISION_MODEL || "gpt-5-mini",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: "Classify the hair color of the woman in this photo. Answer with EXACTLY one word from: blond, brunette, black, red, other. Nothing else." },
          { type: "input_image", image_url: dataUrl },
        ],
      }],
    }),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) { console.error("  ⚠️ OpenAI:", payload?.error?.message ?? res.status); return null; }
  const text = String(
    payload?.output_text ??
    payload?.output?.flatMap((i) => i?.content ?? [])?.map((c) => c?.text ?? "")?.join(" ") ?? ""
  ).trim().toLowerCase();
  const word = (text.match(/\b(blond|brunette|black|red|other)\b/) || [])[1];
  return VALID.has(word) ? word : null;
}

async function main() {
  console.log(`\n${APPLY ? "🔧 APPLY — es wird geschrieben." : "👀 DRY RUN — nur Bericht. Mit --apply ausführen."}\n`);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(STATE_PATH)}`, { headers });
  if (!res.ok) { console.error(`❌ state.json laden fehlgeschlagen: ${res.status}`); process.exit(1); }
  const state = await res.json();
  const curators = (state.curators ?? []).filter((c) =>
    (c.photoPath || c.photoUrl) && String(c.status ?? "active") !== "removed" && (FORCE || !c.hairColor)
  );
  console.log(`${curators.length} Model(s) zu klassifizieren.\n`);

  let changed = 0, calls = 0;
  for (const c of curators) {
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.id;
    const path = c.photoPath || null;
    let dataUrl = path ? await imageDataUrl(path) : null;
    if (!dataUrl && c.photoUrl) {
      // Fallback: stored signed URL (may be expired — path is the reliable route).
      try {
        const r = await fetch(c.photoUrl);
        if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); dataUrl = `data:${r.headers.get("content-type") || "image/jpeg"};base64,${b.toString("base64")}`; }
      } catch { /* skip */ }
    }
    if (!dataUrl) { console.log(`  – ${name}: Foto nicht ladbar, übersprungen`); continue; }
    const color = await classify(dataUrl);
    calls++;
    if (!color) { console.log(`  – ${name}: keine Antwort`); continue; }
    console.log(`  • ${name}: ${color}`);
    if (APPLY) c.hairColor = color;
    changed++;
  }

  console.log(`\n${changed} Model(s) ${APPLY ? "getaggt" : "würden getaggt"} (${calls} Vision-Calls).`);
  if (!APPLY || changed === 0) { console.log("(Nichts geschrieben.)\n"); return; }

  writeFileSync(resolve(process.cwd(), `state-backup-${Date.now()}.json`), JSON.stringify(state));
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(STATE_PATH)}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(state),
  });
  if (!up.ok) { console.error(`❌ Upload fehlgeschlagen: ${up.status}: ${await up.text()}`); process.exit(1); }
  console.log("✅ state.json gespeichert.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
