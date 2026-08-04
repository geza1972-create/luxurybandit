/**
 * RÜCKLÄUFER SPERREN (Owner 04.08.2026: „ich habe eine Menge emails die zurückkammen …
 * die muss man alle löschen aus dem System").
 *
 * WARUM DAS EIN EIGENES WERKZEUG BRAUCHT: Unzustellbar-Berichte kommen als Haufen — mit
 * spitzen Klammern, Doppelpunkten, Doppelnennungen, so wie das Postfach sie ausspuckt. Von
 * Hand abzutippen heisst: eine übersehen. Und eine übersehene falsche Adresse ist nicht
 * folgenlos: Gmail und Hostinger messen an der Rücklaufquote, ob ein Absender seine
 * Empfänger kennt. Wer zweimal an dieselbe tote Adresse schreibt, bezahlt es mit der
 * Zustellbarkeit der Domain — und danach landet auch die Liefermail eines zahlenden Kunden
 * im Spam. Deshalb: paste rein, Skript raus.
 *
 * GESPERRT WIRD, NICHT GELÖSCHT — und das ist die stärkere Massnahme, nicht die schwächere:
 * Die Sperrliste steht ÜBER allen Quellen (siehe lib/portal-empfaenger.ts, letzte Zeile).
 * Wer hier drinsteht, bekommt nie wieder Post, egal in wie vielen Listen er noch auftaucht.
 * Würde man die Adresse stattdessen aus den Quellen herauslöschen, wäre sie beim nächsten
 * Import wieder da — und niemand wüsste mehr, dass sie tot ist. Ein Kundendatensatz mit
 * bezahltem Video bleibt ausserdem ein Kundendatensatz, auch wenn seine Adresse nicht geht.
 *
 *   node scripts/ruecklaeufer-sperren.mjs "<a@b.com><c@d.com>"   → nur zeigen (Probelauf)
 *   node scripts/ruecklaeufer-sperren.mjs --echt "<a@b.com>"     → wirklich sperren
 *   pbpaste | node scripts/ruecklaeufer-sperren.mjs --echt       → aus der Zwischenablage
 *
 * Der Probelauf zeigt zu jeder Adresse, WO sie im Portal steht. Das ist kein Beiwerk: Taucht
 * ein BEZAHLTER Auftrag auf, ist die Sperre zwar trotzdem richtig (die Mail kommt ja nicht
 * an), aber dann steckt dahinter ein Kunde, der sein Video nie bekommen hat — und das ist
 * ein Fall für einen Menschen, nicht für ein Skript.
 */

import { readFileSync } from "node:fs";

// .env.local von Hand lesen — das Skript laeuft ausserhalb von Next.
const env = {};
for (const zeile of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = zeile.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = env.SUPABASE_STORAGE_BUCKET || "shopcut-images";
if (!URL_ || !KEY) { console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen."); process.exit(1); }

const ECHT = process.argv.includes("--echt");
const kopf = { Authorization: `Bearer ${KEY}`, apikey: KEY };
const holen = (pfad, init) => fetch(`${URL_}${pfad}`, { ...init, headers: { ...kopf, ...(init?.headers ?? {}) } });
const datei = (p) => `/storage/v1/object/${BUCKET}/${encodeURIComponent(p).replace(/%2F/g, "/")}`;

async function lesen(pfad, fallback) {
  const res = await holen(datei(pfad));
  if (!res.ok) return fallback;
  return (await res.json().catch(() => fallback)) ?? fallback;
}

/** Adressen aus dem Rohtext klauben — egal wie das Postfach sie formatiert hat. */
const roh = process.argv.slice(2).filter(a => a !== "--echt").join(" ")
  || readFileSync(0, "utf8");
const gefunden = (roh.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [])
  .map(e => e.trim().toLowerCase());
const adressen = [...new Set(gefunden)];
if (!adressen.length) { console.error("Keine Adresse im Text gefunden."); process.exit(1); }

console.log(`Im Text: ${gefunden.length} Nennungen, davon ${adressen.length} verschiedene Adressen.\n`);

// ── Wo steht die Adresse? Alle Quellen einmal lesen, dann nachschlagen. ──────
const suchen = new Set(adressen);
const fundorte = new Map(adressen.map(e => [e, []]));
const merken = (email, was) => {
  const e = String(email ?? "").trim().toLowerCase();
  if (suchen.has(e) && !fundorte.get(e).includes(was)) fundorte.get(e).push(was);
};

// Alle Wetter-Abonnentenlisten (es gibt eine je Model/Topic).
const liste = await holen(`/storage/v1/object/list/${BUCKET}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prefix: "try-this-look/", limit: 1000 }),
});
const dateien = liste.ok ? (await liste.json().catch(() => [])) : [];
for (const f of dateien) {
  if (!/^wetter-subscribers.*\.json$/.test(f.name ?? "")) continue;
  const d = await lesen(`try-this-look/${f.name}`, {});
  for (const s of d.subscribers ?? []) merken(s.email, s.unsubscribed ? "wetter (abgemeldet)" : "wetter");
}

const kiss = await lesen("try-this-look/kiss-log.json", []);
for (const e of Array.isArray(kiss) ? kiss : (kiss.entries ?? [])) {
  merken(e.email, "kiss");
  merken(e.paidEmail, "KISS BEZAHLT");
}

const st = await lesen("try-this-look/state.json", {});
for (const c of st.curators ?? []) merken(c.email, c.status === "removed" ? "model (entfernt)" : "model");
for (const l of st.leads ?? []) merken(l.email, "lead");
for (const g of st.generations ?? []) merken(g.ownerEmail, "GENERATION BEZAHLT");

// ── Sperrliste lesen, ergänzen, einmal schreiben ────────────────────────────
const alt = await lesen("try-this-look/mail-abmeldungen.json", {});
const gesperrt = (alt.emails ?? []).map(v => String(v ?? "").trim().toLowerCase()).filter(Boolean);
const schonDa = new Set(gesperrt);
const neu = adressen.filter(e => !schonDa.has(e));

for (const e of adressen) {
  const wo = fundorte.get(e);
  const mark = schonDa.has(e) ? "schon gesperrt" : "NEU sperren";
  console.log(`  ${e.padEnd(34)} ${mark.padEnd(14)} ${wo.length ? wo.join(", ") : "nirgends im Portal"}`);
}

const bezahlt = adressen.filter(e => fundorte.get(e).some(w => w.includes("BEZAHLT")));
if (bezahlt.length) {
  console.log(`\n  ⚠ BEZAHLT und unzustellbar — da wartet jemand auf sein Video:`);
  for (const e of bezahlt) console.log(`     ${e}`);
}

console.log(`\nSperrliste: ${gesperrt.length} → ${gesperrt.length + neu.length} (${neu.length} neu)`);

if (!ECHT) { console.log("\nProbelauf. Zum wirklichen Sperren: --echt anhängen."); process.exit(0); }
if (!neu.length) { console.log("\nNichts zu tun — alle stehen schon drin."); process.exit(0); }

const res = await holen(datei("try-this-look/mail-abmeldungen.json"), {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
  body: JSON.stringify({ emails: [...gesperrt, ...neu].slice(-50_000), updatedAt: new Date().toISOString() }),
});
if (!res.ok) { console.error("Sperrliste konnte nicht geschrieben werden:", res.status, await res.text()); process.exit(1); }
console.log(`\n✓ ${neu.length} Adressen gesperrt. Sie bekommen keinen Rundbrief mehr — aus keiner Quelle.`);
