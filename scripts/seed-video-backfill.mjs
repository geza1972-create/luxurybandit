// Backfill videos on photo-only try-ons. Routing: lingerie/swim → Pixverse (the
// only one that allows them), everything else → Kling Standard via fal.ai (cheap).
//   TRY_THIS_LOOK_ADMIN_PIN=… [ONLY=normal|lingerie|all] [LIMIT=N] node scripts/seed-video-backfill.mjs
// Run ALONE.

const BASE = (process.env.SEED_BASE || "http://localhost:3000").replace(/\/$/, "");
const PIN = process.env.TRY_THIS_LOOK_ADMIN_PIN || "";
const ONLY = (process.env.ONLY || "all").toLowerCase();   // normal | lingerie | all
const LIMIT = Number(process.env.LIMIT || "0");           // 0 = no limit

const INTIMATE = /(slip|robe|kimono|swimsuit|maillot|one[- ]?piece|bodysuit|nightdress|chemise|lingerie|hunza|oséree|oseree|eres|la perla|fleur du mal|carine|intimissimi|triumph|calzedonia)/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const api = (body) => fetch(`${BASE}/api/try-this-look`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json().catch(() => ({})));
const adminCurator = (body) => fetch(`${BASE}/api/curator`, { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": PIN }, body: JSON.stringify(body) });

// Single router endpoint — it picks fal/Kling (normal) or Pixverse (intimate)
// server-side and encodes the provider in the videoId prefix. Returns { videoUrl, provider }.
async function viaRouter(lookId, image) {
  const s = await fetch(`${BASE}/api/generate-tryon-video`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lookId, image }) }).then((x) => x.json()).catch(() => ({}));
  if (!s?.videoId) return { error: s?.error ?? "start failed" };
  const provider = String(s.videoId).startsWith("fal:") ? "Kling" : "Pixverse";
  for (let i = 0; i < 75; i++) {
    await sleep(4000);
    const q = await fetch(`${BASE}/api/generate-tryon-video?videoId=${encodeURIComponent(s.videoId)}&curatorId=${s.curatorId ?? ""}`).then((x) => x.json()).catch(() => null);
    if (q?.status === "done" && q.videoUrl) return { videoUrl: q.videoUrl, provider };
    if (q?.status === "failed") return { error: q.error ?? "failed", provider };
  }
  return { error: "timed out", provider };
}

async function main() {
  if (!PIN) { console.log("Set TRY_THIS_LOOK_ADMIN_PIN."); process.exit(1); }
  console.log(`Video backfill → ${BASE}  (ONLY=${ONLY}, LIMIT=${LIMIT || "∞"})`);

  // top up every look owner so the internal video charge never fails
  const looks = await fetch(`${BASE}/api/try-this-look`).then((r) => r.json()).then((d) => d.looks || []);
  const owners = [...new Set(looks.map((l) => l.curatorId).filter(Boolean))];
  for (const id of owners) await adminCurator({ action: "set-credits", id, credits: 800 });
  console.log(`  ✓ topped up ${owners.length} owners`);

  const c = await fetch(`${BASE}/api/try-this-look?community=1`).then((r) => r.json());
  let todo = (c.community || []).filter((g) => !g.videoUrl && g.lookId && g.imageUrl);
  todo = todo.map((g) => ({ ...g, intimate: INTIMATE.test(g.lookName || "") }));
  if (ONLY === "normal") todo = todo.filter((g) => !g.intimate);
  if (ONLY === "lingerie") todo = todo.filter((g) => g.intimate);
  if (LIMIT > 0) todo = todo.slice(0, LIMIT);
  console.log(`  ${todo.length} try-on(s) to backfill\n`);

  let ok = 0, fail = 0;
  for (const g of todo) {
    process.stdout.write(`→ ${g.customerName} · ${(g.lookName || "").slice(0, 26)} … `);
    const r = await viaRouter(g.lookId, g.imageUrl);
    if (!r.videoUrl) { console.log(`✗ [${r.provider ?? "?"}] ${r.error ?? ""}`); fail++; continue; }
    await api({ action: "attach-generation-video", generationId: g.id, videoUrl: r.videoUrl });
    console.log(`✓ [${r.provider}]`); ok++;
  }
  console.log(`\nBackfill done. ${ok} ✓ / ${fail} ✗`);
}
main().catch((e) => { console.error(e); process.exit(1); });
