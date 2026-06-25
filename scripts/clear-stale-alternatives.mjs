// Clear the stale brand-catalogue "alternatives" off every published look (except
// the already-good Versace test) so the on-demand Lens dupe finder regenerates
// real look-alikes on first open. Free — just a DB update, no searches.
//   TRY_THIS_LOOK_ADMIN_PIN=… node scripts/clear-stale-alternatives.mjs

const BASE = (process.env.SEED_BASE || "http://localhost:3000").replace(/\/$/, "");
const PIN = process.env.TRY_THIS_LOOK_ADMIN_PIN || "";
const KEEP = new Set(["look-1782369117625"]); // Versace — already has good Lens dupes

async function main() {
  if (!PIN) { console.log("Set TRY_THIS_LOOK_ADMIN_PIN."); process.exit(1); }
  const looks = await fetch(`${BASE}/api/try-this-look`).then(r => r.json()).then(d => d.looks || []);
  let cleared = 0, skipped = 0;
  for (const l of looks) {
    if (KEEP.has(l.id)) { skipped++; continue; }
    if (!(l.alternatives && l.alternatives.length)) { skipped++; continue; }
    const r = await fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify({ action: "update-look", id: l.id, alternatives: [] }) });
    console.log(`  ${r.ok ? "✓" : "✗"} cleared ${(l.brand || "-")} — ${(l.name || "").slice(0, 30)}`);
    if (r.ok) cleared++;
  }
  console.log(`\nCleared ${cleared}, kept ${skipped}. On-demand Lens will repopulate them on first open.`);
}
main().catch(e => { console.error(e); process.exit(1); });
