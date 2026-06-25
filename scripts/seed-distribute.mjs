// Distribute the seeded brand looks onto each wearer's curator profile (reassign
// the look's curatorId), and set every seed curator's contact email to the
// central support inbox.
//   TRY_THIS_LOOK_ADMIN_PIN=… node scripts/seed-distribute.mjs

const BASE = (process.env.SEED_BASE || "http://localhost:3000").replace(/\/$/, "");
const PIN = process.env.TRY_THIS_LOOK_ADMIN_PIN || "";
const SUPPORT_EMAIL = "support@luxurybandit.com";

const C = {
  lena:   { id: "curator-1782367017253-qr92f", name: "Lena Marsh" },
  sofia:  { id: "curator-1782367021299-zwazd", name: "Sofia Ardelean" },
  amara:  { id: "curator-1782367022806-mab7k", name: "Amara Cole" },
  mira:   { id: "curator-1782367024379-kppfl", name: "Mira Voss" },
  bianca: { id: "curator-1782367019713-lujf0", name: "Bianca Russo" },
  elina:  { id: "curator-1782368231876-exbr6", name: "Elina Petrova" },
  carla:  { id: "curator-1782368317618-2jtbu", name: "Carla Moreno" },
  yasmin: { id: "curator-1782368411837-0mdpw", name: "Yasmin Haddad" },
  nadia:  { id: "curator-1782368506998-ly8qg", name: "Nadia Rossi" },
  tessa:  { id: "curator-1782368617777-dmbrx", name: "Tessa Lindqvist" },
};

// brand → the curator who wears it (must match seed-brand-looks JOBS)
const BRAND_OWNER = {
  "Versace": C.nadia, "Saint Laurent": C.elina, "Valentino": C.yasmin, "Gucci": C.sofia,
  "Prada": C.tessa, "Elie Saab": C.amara, "Zimmermann": C.lena, "Khaite": C.carla,
  "Balmain": C.mira, "Givenchy": C.bianca, "Self-Portrait": C.nadia, "Reformation": C.elina,
};

const adminLook = (body) => fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify(body) }).then(r => ({ ok: r.ok, status: r.status }));
const adminCurator = (body) => fetch(`${BASE}/api/curator`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify(body) }).then(async r => ({ ok: r.ok, status: r.status, d: await r.json().catch(() => ({})) }));

async function main() {
  if (!PIN) { console.log("Set TRY_THIS_LOOK_ADMIN_PIN."); process.exit(1); }
  console.log(`Distribute → ${BASE}`);

  // 1) Reassign each brand look to its wearer
  const looks = await fetch(`${BASE}/api/try-this-look`).then(r => r.json()).then(d => d.looks ?? []);
  for (const [brand, owner] of Object.entries(BRAND_OWNER)) {
    const look = looks.find(l => (l.brand || "").toLowerCase() === brand.toLowerCase());
    if (!look) { console.log(`  ✗ no look for ${brand}`); continue; }
    const r = await adminLook({ action: "update-look", id: look.id, curatorId: owner.id });
    console.log(`  ${r.ok ? "✓" : "✗"} ${brand} → ${owner.name}${r.ok ? "" : " (" + r.status + ")"}`);
  }

  // 2) Central contact email for every seed persona
  console.log(`\n  set contact email → ${SUPPORT_EMAIL}`);
  for (const c of Object.values(C)) {
    const r = await adminCurator({ action: "update", id: c.id, email: SUPPORT_EMAIL });
    console.log(`  ${r.ok ? "✓" : "✗"} ${c.name}${r.ok ? "" : " (" + r.status + " " + (r.d.error ?? "") + ")"}`);
  }
  console.log("\nDistribute done.");
}
main().catch(e => { console.error(e); process.exit(1); });
