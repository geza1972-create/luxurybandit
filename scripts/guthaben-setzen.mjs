/**
 * GUTHABEN EINER ADRESSE AUF EINEN BETRAG SETZEN — Owner-Werkzeug fuer Kauf-Tests.
 *
 * Entstanden am 07.08.2026: Nach dem Nachladen der Code-Zahlungen standen 80,02 € auf dem
 * Testkonto — „wenn da 80 Euro jetzt stehen, kann ich die Bezahlung nicht mehr testen.
 * setze es auf 0." Einen Server-Endpunkt dafuer gibt es bewusst nicht (jede Route, die
 * Guthaben SETZT, waere eine Angriffsflaeche); das Werkzeug des Owners ist dieses Skript.
 *
 * SICHERHEIT ZUERST — ohne `--echt` wird nur gelesen und gezeigt:
 *   node scripts/guthaben-setzen.mjs tigl10722@gmail.com 0            → Probelauf
 *   node scripts/guthaben-setzen.mjs tigl10722@gmail.com 0 --echt     → wirklich setzen
 * Der Betrag ist in EURO (Dezimalpunkt oder -komma), gespeichert wird in Cent.
 *
 * SEIT 08.08.2026 ABENDS SCHREIBT ES DIE GELDBOERSEN-DATEI (wallet/<base64url>.json),
 * nicht mehr state.json: Das Guthaben ist dorthin umgezogen, nachdem der Merge-Dieb an
 * EINEM Tag dreimal echtes Geld gefressen hatte. Die Datei fassen nur die Geld-Funktionen
 * an — dieses Skript ist damit auch waehrend laufender Kaeufe gefahrlos; hoechstens eine
 * exakt zeitgleiche Buchung gewinnt, und die traegt sich per Selbstbestaetigung neu ein.
 * Gibt es noch keine Geldboerse, zeigt der Probelauf den alten Stand aus state.json (der
 * beim ersten ECHTEN Setzen mit umzieht).
 */

import { readFileSync } from "node:fs";

const env = {};
for (const zeile of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = zeile.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = env.SUPABASE_STORAGE_BUCKET || "shopcut-images";
if (!URL_ || !KEY) { console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen."); process.exit(1); }

const [adresseRoh, betragRoh] = process.argv.slice(2).filter(a => a !== "--echt");
const ECHT = process.argv.includes("--echt");
const adresse = String(adresseRoh ?? "").trim().toLowerCase();
const cents = Math.round(Number(String(betragRoh ?? "").replace(",", ".")) * 100);
if (!adresse.includes("@") || !Number.isFinite(cents) || cents < 0) {
  console.error("Aufruf: node scripts/guthaben-setzen.mjs <adresse> <euro> [--echt]");
  process.exit(1);
}

const KOPF = { Authorization: `Bearer ${KEY}`, apikey: KEY };
const pfad = `try-this-look/wallet/${Buffer.from(adresse).toString("base64url")}.json`;
const objekt = (p) => `${URL_}/storage/v1/object/${BUCKET}/${p.split("/").map(encodeURIComponent).join("/")}`;

/* Geldboerse lesen; gibt es keine, den ALTEN Stand aus state.json zeigen (Migrationsquelle). */
async function lesen() {
  const r = await fetch(objekt(pfad), { headers: KOPF });
  if (r.ok) {
    const w = await r.json();
    return { cents: Math.max(0, Math.round(Number(w.cents ?? 0))), ops: Array.isArray(w.ops) ? w.ops : [], quelle: "wallet" };
  }
  const st = await fetch(objekt("try-this-look/state.json"), { headers: KOPF });
  const state = st.ok ? await st.json() : {};
  return { cents: Math.max(0, Math.round(Number(state?.guthabenCents?.[adresse] ?? 0))), ops: [], quelle: "state (alt, noch nicht umgezogen)" };
}

const vorher = await lesen();
console.log(`${adresse}: ${(vorher.cents / 100).toFixed(2)} €  →  ${(cents / 100).toFixed(2)} €   [Quelle: ${vorher.quelle}]`);
if (!ECHT) { console.log("Probelauf — nichts geschrieben. Zum Setzen --echt anhaengen."); process.exit(0); }

const blob = {
  email: adresse,
  cents,
  ops: [...vorher.ops, { id: `admin-${new Date().toISOString()}`, delta: cents - vorher.cents, at: new Date().toISOString() }].slice(-300),
};
const w = await fetch(objekt(pfad), {
  method: "POST",
  headers: { ...KOPF, "Content-Type": "application/json", "x-upsert": "true" },
  body: JSON.stringify(blob),
});
if (!w.ok) { console.error("Schreiben fehlgeschlagen:", w.status, await w.text()); process.exit(1); }

const kontrolle = await lesen();
console.log(`Gesetzt. Kontrolle (zurückgelesen): ${(kontrolle.cents / 100).toFixed(2)} €  [${kontrolle.quelle}]`);
