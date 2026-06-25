// Curate the catalogue to luxury/glam: remove the mid-market / non-luxe looks.
// Deletes their try-on generations and unpublishes the looks (reversible — the
// look rows stay, just published:false).
//   TRY_THIS_LOOK_ADMIN_PIN=… node scripts/seed-cleanup-nonluxe.mjs

const BASE = (process.env.SEED_BASE || "http://localhost:3000").replace(/\/$/, "");
const PIN = process.env.TRY_THIS_LOOK_ADMIN_PIN || "";

// lookId → reason (for the log)
const CUT = {
  "look-1782379851051": "Hunkemöller swimsuit (mid-market)",
  "look-1782379793041": "Calzedonia swimsuit (mid-market)",
  "look-1782379532949": "Skims bodysuit (basics)",
  "look-1782378422633": "Triumph Poesie (mid-market)",
  "look-1782378381157": "Triumph True Shape (mid-market)",
  "look-1782378344386": "Hunkemöller sheer kimono (mid-market)",
  "look-1782378317184": "Hunkemöller satin kimono (mid-market)",
  "look-1782378246065": "Intimissimi silk slip (mid-market)",
  "look-1782378205064": "Intimissimi lace slip (mid-market)",
  "look-1782230201209": "AI Look (no brand)",
  "look-1782370273727": "Reformation dress (borderline)",
  "look-1782211930588": "Jimmy Choo jelly sandals (not glam)",
  "look-1782232287462": "Golden Satin Power Allure (no brand)",
  "look-1782231291165": "Golden Hour Satin Glamour (no brand)",
};

const adminLook = (body) => fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify(body) }).then(r => ({ ok: r.ok, status: r.status }));

async function main() {
  if (!PIN) { console.log("Set TRY_THIS_LOOK_ADMIN_PIN."); process.exit(1); }
  console.log(`Cleanup non-luxe → ${BASE}`);
  const cutIds = new Set(Object.keys(CUT));

  // 1) delete the try-on generations attached to those looks
  const d = await fetch(`${BASE}/api/try-this-look?community=1`).then(r => r.json());
  const gens = (d.community || []).filter(c => cutIds.has(c.lookId));
  console.log(`\nDeleting ${gens.length} try-on(s):`);
  for (const g of gens) {
    const r = await adminLook({ action: "delete-generation", id: g.id });
    console.log(`  ${r.ok ? "✓" : "✗"} ${g.customerName} — ${g.lookName?.slice(0, 28)}`);
  }

  // 2) unpublish the looks (reversible)
  console.log(`\nUnpublishing ${cutIds.size} look(s):`);
  for (const [id, reason] of Object.entries(CUT)) {
    const r = await adminLook({ action: "update-look", id, published: false });
    console.log(`  ${r.ok ? "✓" : "✗"} ${reason}`);
  }
  console.log("\nCleanup done.");
}
main().catch(e => { console.error(e); process.exit(1); });
