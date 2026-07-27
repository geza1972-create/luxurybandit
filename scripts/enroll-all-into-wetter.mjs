// Bestandskunden in die Wetter-Liste nachtragen (einmalig).
//
// Quellen: (1) Stripe-Abonnenten aller Themen, (2) registrierte Konten in Supabase Auth.
// Ohne --apply wird NUR gezeigt, wer dazukäme — nichts geschrieben. Abgemeldete bleiben
// abgemeldet, bereits Vorhandene werden übersprungen.
//
//   node scripts/enroll-all-into-wetter.mjs            # Vorschau
//   node scripts/enroll-all-into-wetter.mjs --apply    # eintragen
import fs from "node:fs";

const APPLY = process.argv.includes("--apply");
const ENV = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")])
);
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL, KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "shopcut-images";
const SUBS_PATH = "try-this-look/wetter-subscribers.json";
const sbHeaders = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// ── 1) aktuelle Wetter-Liste ────────────────────────────────────────────────────────
const cur = await fetch(`${SB}/storage/v1/object/${BUCKET}/${SUBS_PATH}`, { headers: sbHeaders });
// ACHTUNG: die Datei heißt den Schlüssel „subscribers", nicht „entries". Mit dem falschen
// Namen liest man 0 Einträge und überschreibt beim Schreiben die ganze Liste.
const curJson = cur.ok ? await cur.json() : { subscribers: [] };
const list = Array.isArray(curJson.subscribers) ? curJson.subscribers : [];
if (!cur.ok) { console.log("Liste konnte NICHT gelesen werden — Abbruch (nichts überschreiben)."); process.exit(1); }
const known = new Set(list.map(s => String(s.email ?? "").trim().toLowerCase()).filter(Boolean));
console.log(`Wetter-Liste jetzt: ${list.length} Einträge (${known.size} mit E-Mail)`);

// ── 2) Stripe: alle Kunden mit laufendem Abo ────────────────────────────────────────
const stripe = async (path) => {
  const r = await fetch(`https://api.stripe.com/v1${path}`, { headers: { Authorization: `Bearer ${ENV.STRIPE_SECRET_KEY}` } });
  return r.ok ? r.json() : null;
};
const stripeMails = new Map();
const subs = await stripe("/subscriptions?status=all&limit=100&expand[]=data.customer");
for (const s of subs?.data ?? []) {
  if (!["active", "trialing", "past_due"].includes(String(s.status))) continue;
  const e = String(s.customer?.email ?? "").trim().toLowerCase();
  if (e) stripeMails.set(e, { name: String(s.customer?.name ?? "").trim(), note: String(s.metadata?.kind ?? "topic-abo") });
}
// Einzelkäufer (Videos) — die letzten 100 bezahlten Sessions
const sessions = await stripe("/checkout/sessions?limit=100");
for (const s of sessions?.data ?? []) {
  if (s.payment_status !== "paid") continue;
  const e = String(s.customer_details?.email ?? s.customer_email ?? "").trim().toLowerCase();
  if (e && !stripeMails.has(e)) stripeMails.set(e, { name: String(s.customer_details?.name ?? "").trim(), note: String(s.metadata?.kind ?? "one-off") });
}
console.log(`Stripe: ${stripeMails.size} zahlende Adressen`);

// ── 3) Supabase Auth: registrierte Konten ──────────────────────────────────────────
const authMails = new Map();
for (let page = 1; page <= 10; page++) {
  const r = await fetch(`${SB}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: sbHeaders });
  if (!r.ok) break;
  const d = await r.json();
  const users = Array.isArray(d?.users) ? d.users : [];
  for (const u of users) {
    const e = String(u.email ?? "").trim().toLowerCase();
    if (e) authMails.set(e, { name: String(u.user_metadata?.full_name ?? u.user_metadata?.username ?? "").trim(), note: "account" });
  }
  if (users.length < 200) break;
}
console.log(`Supabase-Konten: ${authMails.size} Adressen`);

// ── 3b) MODELS ausschließen ────────────────────────────────────────────────────────
// Models/Kuratorinnen sind keine Kundinnen — sie dürfen die Werbe-Tagespost nicht bekommen
// (Owner). Adressen kommen aus den Kurator-Datensätzen in state.json.
const modelMails = new Set();
try {
  const st = await (await fetch(`${SB}/storage/v1/object/${BUCKET}/try-this-look/state.json`, { headers: sbHeaders })).json();
  for (const c of st.curators ?? []) {
    for (const k of ["email", "contactEmail", "loginEmail"]) {
      if (c?.[k]) modelMails.add(String(c[k]).trim().toLowerCase());
    }
  }
} catch { /* dann eben ohne — lieber weniger eintragen als falsch */ }
console.log(`Models/Kuratorinnen (nicht eintragen): ${modelMails.size}`);

// ── 4) Differenz ───────────────────────────────────────────────────────────────────
const all = new Map([...authMails, ...stripeMails]); // Stripe gewinnt (bessere Herkunft)
// Test- und Systemadressen bekommen KEINE Tagespost (mailinator, unser eigenes Support-
// Postfach, offensichtliche Platzhalter) — sonst schickt sich die Seite selbst Werbung.
const SKIP = /(^support@luxurybandit\.com$)|(mailinator\.com$)|(^bella@gina\.com$)|(\+test)|(^test@)/i;
const fresh = [...all.entries()].filter(([e]) => !known.has(e) && !SKIP.test(e) && !modelMails.has(e));
console.log(`\nNEU einzutragen: ${fresh.length}`);
for (const [e, m] of fresh.slice(0, 40)) console.log(`  + ${e}${m.name ? ` (${m.name})` : ""} · ${m.note}`);
if (fresh.length > 40) console.log(`  … und ${fresh.length - 40} weitere`);

if (!APPLY) { console.log("\nVORSCHAU — nichts geschrieben. Mit --apply eintragen."); process.exit(0); }

// ── 5) schreiben (mit Backup) ──────────────────────────────────────────────────────
await fetch(`${SB}/storage/v1/object/${BUCKET}/try-this-look/wetter-subscribers-backup.json`, {
  method: "POST", headers: { ...sbHeaders, "Content-Type": "application/json", "x-upsert": "true" },
  body: JSON.stringify(curJson),
});
const merged = [
  ...fresh.map(([email, m]) => ({
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: m.name || email.split("@")[0],
    email, lang: "en", note: `auto: ${m.note}`,
    createdAt: new Date().toISOString(),
  })),
  ...list,
];
const w = await fetch(`${SB}/storage/v1/object/${BUCKET}/${SUBS_PATH}`, {
  method: "POST", headers: { ...sbHeaders, "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
  body: JSON.stringify({ subscribers: merged, updatedAt: new Date().toISOString() }),
});
console.log(`\ngeschrieben: ${w.status} · Liste jetzt ${merged.length} Einträge (Backup: wetter-subscribers-backup.json)`);
