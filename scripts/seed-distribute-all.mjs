// Move every Szidonia-owned look onto the curator who actually modelled its
// try-on (the face in the image), so looks stop piling up under one profile and
// each look + its try-on live on the same, consistent profile.
//   TRY_THIS_LOOK_ADMIN_PIN=… node scripts/seed-distribute-all.mjs

const BASE = (process.env.SEED_BASE || "http://localhost:3000").replace(/\/$/, "");
const PIN = process.env.TRY_THIS_LOOK_ADMIN_PIN || "";
const SZ = "curator-1782204766325-wfyi0";

const adminLook = (body) => fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify(body) }).then(r => ({ ok: r.ok, status: r.status }));

async function main() {
  if (!PIN) { console.log("Set TRY_THIS_LOOK_ADMIN_PIN."); process.exit(1); }
  console.log(`Distribute all → ${BASE}`);
  const looks = await fetch(`${BASE}/api/try-this-look`).then(r => r.json()).then(d => (d.looks || []).filter(l => l.curatorId === SZ && l.published !== false));
  const comm = await fetch(`${BASE}/api/try-this-look?community=1`).then(r => r.json()).then(d => d.community || []);
  // first try-on (with a real curator id) per look = its model
  const ownerByLook = {};
  for (const g of comm) { if (g.curatorId && g.curatorId !== SZ && !ownerByLook[g.lookId]) ownerByLook[g.lookId] = { id: g.curatorId, name: g.customerName }; }

  let moved = 0, skipped = 0;
  for (const l of looks) {
    const owner = ownerByLook[l.id];
    if (!owner) { console.log(`  – ${(l.name||'').slice(0,30)} — no try-on, left as is`); skipped++; continue; }
    const r = await adminLook({ action: "update-look", id: l.id, curatorId: owner.id });
    console.log(`  ${r.ok ? "✓" : "✗"} ${(l.brand||'-')} — ${(l.name||'').slice(0,24)} → ${owner.name}`);
    if (r.ok) moved++;
  }
  console.log(`\nMoved ${moved}, left ${skipped} (no try-on). Done.`);
}
main().catch(e => { console.error(e); process.exit(1); });
