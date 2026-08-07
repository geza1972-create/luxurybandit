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
 * ZUM SPEICHERWEG: Der Live-Server liest und schreibt denselben Blob
 * (try-this-look/state.json). Dieses Skript ersetzt NUR den einen Schluessel in
 * `guthabenCents` und laedt den Blob im Ganzen wieder hoch — im selben Moment laufende
 * Server-Schreibvorgaenge koennen dabei verlieren (Memory delete-resurrection-merge-bug).
 * Deshalb: nur benutzen, wenn gerade niemand kauft, und danach den Stand am Chip pruefen.
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

const kopf = { Authorization: `Bearer ${KEY}`, apikey: KEY };
const PFAD = `/storage/v1/object/${BUCKET}/try-this-look/state.json`;

const runter = await fetch(`${URL_}${PFAD}`, { headers: kopf });
if (!runter.ok) { console.error("state.json nicht lesbar:", runter.status); process.exit(1); }
const state = await runter.json();

const g = (state.guthabenCents = state.guthabenCents ?? {});
const vorher = Math.max(0, Math.round(Number(g[adresse] ?? 0)));
console.log(`${adresse}: ${(vorher / 100).toFixed(2)} €  →  ${(cents / 100).toFixed(2)} €`);

if (!ECHT) { console.log("Probelauf — nichts geschrieben. Mit --echt wirklich setzen."); process.exit(0); }

g[adresse] = cents;
const hoch = await fetch(`${URL_}${PFAD}`, {
  method: "PUT",
  headers: { ...kopf, "Content-Type": "application/json", "x-upsert": "true" },
  body: JSON.stringify(state),
});
if (!hoch.ok) { console.error("Schreiben fehlgeschlagen:", hoch.status, await hoch.text()); process.exit(1); }

// Nicht dem eigenen Schreiben glauben — zurücklesen und den echten Stand zeigen.
const kontrolle = await fetch(`${URL_}${PFAD}`, { headers: kopf }).then(r => r.json());
console.log(`Gesetzt. Kontrolle (zurückgelesen): ${((kontrolle.guthabenCents?.[adresse] ?? 0) / 100).toFixed(2)} €`);
