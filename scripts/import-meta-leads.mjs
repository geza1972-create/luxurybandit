// Meta-Lead-CSV in die Wetter-Liste eintragen.
//
// Metas Export ist UTF-16 + TAB-getrennt. Doppelte (E-Mail ODER Telefonnummer) werden
// übersprungen — dieselbe Datei zweimal einspielen schadet nicht. Land + Sprache kommen
// aus der Telefon-Vorwahl. Ohne --apply wird NUR gezeigt, wer dazukäme.
//
//   node scripts/import-meta-leads.mjs "<datei.csv>"           # Vorschau
//   node scripts/import-meta-leads.mjs "<datei.csv>" --apply   # eintragen
import fs from "node:fs";
import { dialInfo } from "../lib/dial-code.ts";

const APPLY = process.argv.includes("--apply");
const FILE = process.argv.slice(2).find(a => !a.startsWith("--"));
if (!FILE) { console.log("Datei fehlt: node scripts/import-meta-leads.mjs <datei.csv> [--apply]"); process.exit(1); }

const ENV = Object.fromEntries(
  fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")])
);
const SB = ENV.NEXT_PUBLIC_SUPABASE_URL, KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "shopcut-images";
const SUBS_PATH = "try-this-look/wetter-subscribers.json";
const sbHeaders = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// ── 1) CSV lesen ────────────────────────────────────────────────────────────────────
const bytes = fs.readFileSync(FILE);
const isUtf16 = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)
  || bytes.subarray(0, 200).filter(b => b === 0).length > 20;
const text = new TextDecoder(isUtf16 ? "utf-16" : "utf-8").decode(bytes);
const lines = text.split(/\r?\n/).filter(l => l.trim());
const sep = lines[0].includes("\t") ? "\t" : ",";
const strip = s => s.trim().replace(/^"|"$/g, "").trim();
const head = lines[0].split(sep).map(h => strip(h).toLowerCase());
const col = (...names) => head.findIndex(h => names.includes(h));
const iMail = col("email", "e-mail"), iName = col("full_name", "name"), iPhone = col("phone_number", "phone"), iCity = col("city");
if (iMail < 0 && iPhone < 0) { console.log("Weder E-Mail- noch Telefon-Spalte gefunden."); process.exit(1); }

const rows = lines.slice(1).map(l => l.split(sep).map(strip)).map(r => ({
  email: (iMail >= 0 ? r[iMail] ?? "" : "").toLowerCase(),
  name: iName >= 0 ? r[iName] ?? "" : "",
  phone: (iPhone >= 0 ? r[iPhone] ?? "" : "").replace(/^p:/i, ""),   // Meta schreibt „p:+40712…"
  city: iCity >= 0 ? r[iCity] ?? "" : "",
})).filter(x => x.email || x.phone);
console.log(`CSV: ${rows.length} Zeilen aus ${FILE.split("/").pop()}`);

// ── 2) aktuelle Liste ───────────────────────────────────────────────────────────────
const cur = await fetch(`${SB}/storage/v1/object/${BUCKET}/${SUBS_PATH}`, { headers: sbHeaders });
if (!cur.ok) { console.log("Liste konnte NICHT gelesen werden — Abbruch (nichts überschreiben)."); process.exit(1); }
const curJson = await cur.json();
const list = Array.isArray(curJson.subscribers) ? curJson.subscribers : [];
console.log(`Wetter-Liste jetzt: ${list.length} Einträge`);

const seenMail = new Set(list.map(s => String(s.email ?? "").trim().toLowerCase()).filter(Boolean));
const seenPhone = new Set(list.map(s => String(s.phone ?? "").replace(/\D/g, "")).filter(Boolean));

// Models dürfen die Werbe-Tagespost nicht bekommen (Owner-Regel).
const modelMails = new Set();
try {
  const st = await (await fetch(`${SB}/storage/v1/object/${BUCKET}/try-this-look/state.json`, { headers: sbHeaders })).json();
  for (const c of st.curators ?? []) for (const k of ["email", "contactEmail", "loginEmail"]) if (c?.[k]) modelMails.add(String(c[k]).trim().toLowerCase());
} catch { /* lieber weniger eintragen als falsch */ }

const note = `Meta-Lead · ${FILE.split("/").pop().slice(0, 60)}`;
const fresh = [];
let skipped = 0;
for (const r of rows) {
  const digits = r.phone.replace(/\D/g, "");
  if ((r.email && seenMail.has(r.email)) || (digits && seenPhone.has(digits)) || modelMails.has(r.email)) { skipped++; continue; }
  if (r.email) seenMail.add(r.email);
  if (digits) seenPhone.add(digits);
  const geo = dialInfo(r.phone);
  fresh.push({
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: r.name || r.email.split("@")[0],
    email: r.email, phone: r.phone, city: r.city,
    country: geo?.country ?? "", lang: geo?.lang ?? "en",
    note, createdAt: new Date().toISOString(),
  });
}
console.log(`\nNEU: ${fresh.length} · schon vorhanden: ${skipped}`);
for (const f of fresh) console.log(`  + ${f.name} · ${f.email} · ${f.phone} · ${f.city || "—"} · ${f.country || "?"}/${f.lang}`);

if (!APPLY) { console.log("\nVORSCHAU — nichts geschrieben. Mit --apply eintragen."); process.exit(0); }
if (!fresh.length) { console.log("Nichts zu tun."); process.exit(0); }

// ── 3) schreiben (mit Backup) ───────────────────────────────────────────────────────
await fetch(`${SB}/storage/v1/object/${BUCKET}/try-this-look/wetter-subscribers-backup.json`, {
  method: "POST", headers: { ...sbHeaders, "Content-Type": "application/json", "x-upsert": "true" },
  body: JSON.stringify(curJson),
});
const merged = [...fresh, ...list];
const w = await fetch(`${SB}/storage/v1/object/${BUCKET}/${SUBS_PATH}`, {
  method: "POST", headers: { ...sbHeaders, "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
  body: JSON.stringify({ subscribers: merged, updatedAt: new Date().toISOString() }),
});
console.log(`\ngeschrieben: ${w.status} · Liste jetzt ${merged.length} Einträge (Backup: wetter-subscribers-backup.json)`);
