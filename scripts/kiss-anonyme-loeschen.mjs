/**
 * ANONYME KUSS-AUFTRAEGE LOESCHEN (Owner 03.08.2026: „wir müssen bei den Leuten die keine
 * E-Mail angegeben haben die Daten löschen im Kiss erst mal").
 *
 * WARUM DAS NICHT NUR AUFRAEUMEN IST: Gemessen am 03.08.2026 lagen 210 Auftraege im Log, davon
 * 2 bezahlt — und 195 unbezahlte trugen hochgeladene Fotos echter Gesichter. Ohne Adresse gibt
 * es niemanden, dem diese Bilder gehoeren, keinen Vertrag und keinen Zweck mehr, sie zu
 * behalten. Das ist kein Speicherproblem, das ist Artikel 5 DSGVO (Zweckbindung,
 * Speicherbegrenzung). Der Loeschknopf ist hier die Pflicht, nicht die Kuer.
 *
 * SICHERHEIT ZUERST — das Skript loescht NICHTS ohne `--echt`:
 *   node scripts/kiss-anonyme-loeschen.mjs            → nur zaehlen und zeigen (Probelauf)
 *   node scripts/kiss-anonyme-loeschen.mjs --echt     → wirklich loeschen
 *
 * WEN ES NIE ANFASST:
 *   - alles mit `email` ODER `paidEmail` (wir kennen den Menschen)
 *   - alles mit `paid` (bezahlt — auch wenn die Adresse fehlt, waere das ein Kunde)
 *   - alles mit `videoUrl` (ein ausgeliefertes Video ist ein Ergebnis, kein Rest)
 *   - alles mit `sharedAt` (oeffentlich geteilt — dahinter haengt ein Link bei einem Empfaenger)
 * Diese vier Ausnahmen sind absichtlich grosszuegig: Ein zu Unrecht geloeschtes Ergebnis ist
 * unwiederbringlich, ein zu Unrecht behaltener Rest kostet ein paar Cent bis zum naechsten Lauf.
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

const LOG = "try-this-look/kiss-log.json";

const res = await holen(`/storage/v1/object/${BUCKET}/${encodeURIComponent(LOG).replace(/%2F/g, "/")}`);
if (!res.ok) { console.error("Kiss-Log nicht lesbar:", res.status); process.exit(1); }
const roh = await res.json();
const alle = Array.isArray(roh) ? roh : (roh.entries ?? []);

const anonym = alle.filter(e =>
  !String(e.email ?? "").trim() &&
  !String(e.paidEmail ?? "").trim() &&
  !e.paid &&
  !String(e.videoUrl ?? "").trim() &&
  !e.sharedAt);

// Alle Dateipfade dieser Auftraege — die hochgeladenen Vorlagen UND das erzeugte Bild.
const pfade = [];
for (const e of anonym) {
  for (const p of [e.personPath, e.modelPath, e.imagePath]) {
    const s = String(p ?? "").trim();
    if (s.startsWith("try-this-look/")) pfade.push(s);
  }
}

console.log(`Kiss-Log: ${alle.length} Auftraege gesamt`);
console.log(`  ohne Adresse, unbezahlt, ohne Video, nicht geteilt: ${anonym.length}`);
console.log(`  daran haengende Dateien: ${pfade.length}`);
console.log(`  bleiben stehen: ${alle.length - anonym.length}`);
const zeit = anonym.map(e => String(e.createdAt ?? "").slice(0, 10)).filter(Boolean).sort();
if (zeit.length) console.log(`  Zeitraum der Betroffenen: ${zeit[0]} bis ${zeit[zeit.length - 1]}`);
console.log("\nBeispiele (erste 5):");
for (const e of anonym.slice(0, 5)) {
  console.log(`  ${String(e.id).slice(0, 22)}  ${String(e.createdAt ?? "").slice(0, 16)}  Dateien: ${[e.personPath, e.modelPath, e.imagePath].filter(Boolean).length}`);
}

if (!ECHT) {
  console.log("\n── PROBELAUF. Es wurde nichts geloescht. Mit --echt ausfuehren. ──");
  process.exit(0);
}

// 1) Dateien loeschen — in Haeppchen, damit ein langer Aufruf nicht in ein Zeitlimit laeuft.
let weg = 0;
for (let i = 0; i < pfade.length; i += 100) {
  const teil = pfade.slice(i, i + 100);
  const r = await holen(`/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: teil }),
  });
  if (r.ok) { weg += teil.length; process.stdout.write(`\r  Dateien geloescht: ${weg}/${pfade.length}`); }
  else console.error(`\n  Haeppchen ab ${i} fehlgeschlagen: ${r.status} ${await r.text()}`);
}
console.log("");

// 2) Log neu schreiben — OHNE die anonymen Eintraege.
const ids = new Set(anonym.map(e => e.id));
const bleibt = alle.filter(e => !ids.has(e.id));
const w = await holen(`/storage/v1/object/${BUCKET}/${encodeURIComponent(LOG).replace(/%2F/g, "/")}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
  body: JSON.stringify({ entries: bleibt.slice(0, 500), savedAt: new Date().toISOString() }),
});
console.log(w.ok ? `Log neu geschrieben: ${bleibt.length} Auftraege bleiben.` : `Log-Schreiben fehlgeschlagen: ${w.status}`);
