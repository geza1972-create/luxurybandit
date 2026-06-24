/**
 * Einmaliges Backfill: verknüpft bestehende Try-on-Generierungen mit einer
 * Curator-ID (curatorId), damit der Creator unter "My try-ons" seine eigenen sieht.
 *
 * Zuordnung über customerName (Anzeigename im Feed). Mapping unten anpassen.
 *
 *   node scripts/backfill-tryon-curator.mjs            # Probelauf
 *   node scripts/backfill-tryon-curator.mjs --apply    # schreibt wirklich
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const APPLY = process.argv.includes("--apply");

// customerName-Slug → curatorId
const NAME_TO_CURATOR = {
  "szidi": "curator-1782204766325-wfyi0",
  "szidonia": "curator-1782204766325-wfyi0",
  "szidonia-bandi": "curator-1782204766325-wfyi0",
};

const toSlug = (s) => String(s ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

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
const STATE_PATH = "try-this-look/state.json";
if (!SUPABASE_URL || !KEY) { console.error("❌ SUPABASE_URL oder KEY fehlt in .env.local"); process.exit(1); }

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

async function main() {
  console.log(`\n${APPLY ? "🔧 APPLY — es wird geschrieben." : "👀 DRY RUN — nur Bericht. Mit --apply ausführen."}\n`);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodePath(STATE_PATH)}`, { headers });
  if (!res.ok) { console.error(`❌ state.json laden fehlgeschlagen: ${res.status}`); process.exit(1); }
  const state = await res.json();
  const gens = state.generations ?? [];

  let changed = 0;
  for (const g of gens) {
    const slug = toSlug(g.customerName);
    const target = NAME_TO_CURATOR[slug];
    if (!target) continue;
    if (g.curatorId === target) continue;
    console.log(`  • ${g.customerName || "(no name)"} · look "${g.lookName ?? ""}" · ${g.id.slice(0, 24)} → ${target}${g.curatorId ? ` (war ${g.curatorId})` : ""}`);
    if (APPLY) g.curatorId = target;
    changed++;
  }

  console.log(`\n${changed} Generierung(en) ${APPLY ? "aktualisiert" : "würden aktualisiert"}.`);
  if (!APPLY || changed === 0) { console.log(changed === 0 ? "Nichts zu tun.\n" : "\n(Nichts geschrieben — Probelauf.)\n"); return; }

  // Backup + Upload
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
