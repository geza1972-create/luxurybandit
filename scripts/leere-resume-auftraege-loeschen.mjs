/**
 * LEERE AUFTRÄGE DES BEWERBUNGS-GENERATORS WEGRÄUMEN (31.08.2026).
 *
 * WARUM ES SIE GIBT: Die Generator-Seite legte den Auftrag an, sobald sie geladen war —
 * jeder Blick auf die Seite hinterliess damit einen leeren Eintrag im Kiss-Log. Gemessen:
 * 23 Aufträge, genau EINER mit Inhalt. Das ist nicht nur Müll, es macht jede spätere
 * Zählung wertlos, weil „Aufträge" dann Seitenaufrufe heisst. Die Ursache ist behoben (die
 * Kennung entsteht jetzt erst beim Einlesen und beim Kauf); dieses Skript räumt die Reste.
 *
 * WAS ES LÖSCHT — und nur das:
 *   theme === "resume"  UND  nicht bezahlt  UND  ohne Lebenslauf-Datei, ohne Foto,
 *   ohne Video, ohne Aufnahme, ohne E-Mail  UND  ohne Profil unter lebenslauf/<id>.json.
 * Alles andere bleibt unangetastet — auch jeder Auftrag jedes anderen Produkts.
 *
 * VOR DEM SCHREIBEN wird das komplette Log als Sicherung weggeschrieben; der Pfad steht in
 * der Ausgabe. Ohne das Wort `loeschen` als Argument ist es ein PROBELAUF, der nur zählt.
 *
 *   node scripts/leere-resume-auftraege-loeschen.mjs             ← Probelauf
 *   node scripts/leere-resume-auftraege-loeschen.mjs loeschen    ← räumt wirklich auf
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split("\n")
    .filter(z => z.includes("=") && !z.startsWith("#"))
    .map(z => [z.slice(0, z.indexOf("=")).trim(), z.slice(z.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);

const URL_BASIS = env.NEXT_PUBLIC_SUPABASE_URL;
const SCHLUESSEL = env.SUPABASE_SERVICE_ROLE_KEY;
const EIMER = env.SUPABASE_STORAGE_BUCKET || "shopcut-images";
const KOPF = { apikey: SCHLUESSEL, Authorization: `Bearer ${SCHLUESSEL}` };
const LOG = "try-this-look/kiss-log.json";

if (!URL_BASIS || !SCHLUESSEL) {
  console.error("Es fehlen NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

/* Zeitstempel an der Adresse: der Speicher liefert eine frisch geschriebene Datei sonst
   noch aus seinem Zwischenspeicher (dieselbe Vorsicht wie in `readKissLog`). */
const roh = await (await fetch(`${URL_BASIS}/storage/v1/object/${EIMER}/${LOG}?frisch=${Date.now()}`, { headers: KOPF })).text();
const datei = JSON.parse(roh);
const eintraege = Array.isArray(datei?.entries) ? datei.entries : null;
if (!eintraege) {
  console.error("Das Log hat nicht die erwartete Form { entries: [...] } — es wird nichts angefasst.");
  process.exit(1);
}

const sicherung = path.join(os.tmpdir(), `kiss-log-sicherung-${eintraege.length}.json`);
fs.writeFileSync(sicherung, roh);

const leer = [];
for (const e of eintraege) {
  if (e.theme !== "resume") continue;
  if (e.paid || e.cvPath || e.videoUrl || e.audioPath || e.videoId || e.email || e.personPath) continue;
  /* Ein Profil bedeutet: hier hat jemand wirklich einen Lebenslauf eingelesen. Bleibt. */
  const antwort = await fetch(`${URL_BASIS}/storage/v1/object/${EIMER}/lebenslauf/${e.id}.json`, { headers: KOPF });
  if (antwort.ok) continue;
  leer.push(e.id);
}

console.log(`Sicherung: ${sicherung}`);
console.log(`Einträge gesamt: ${eintraege.length} · leer und löschbar: ${leer.length}`);

if (process.argv[2] !== "loeschen") {
  console.log("Probelauf — es wurde nichts geschrieben. Mit dem Argument `loeschen` räumt es wirklich auf.");
  process.exit(0);
}

const neu = eintraege.filter(e => !leer.includes(e.id));
const geschrieben = await fetch(`${URL_BASIS}/storage/v1/object/${EIMER}/${LOG}`, {
  method: "POST",
  headers: { ...KOPF, "content-type": "application/json", "x-upsert": "true" },
  body: JSON.stringify({ ...datei, entries: neu, savedAt: new Date().toISOString() }),
});
console.log(`Geschrieben: HTTP ${geschrieben.status} · Einträge jetzt: ${neu.length}`);
