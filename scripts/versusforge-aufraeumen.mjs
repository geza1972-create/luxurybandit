/**
 * DIE TRICHTER ANSEHEN — UND UNGENUTZTE WEGRÄUMEN (Owner 09.09.2026: „dann löschen wir es,
 * wenn wir sehen, dass es ungenutzt ist, oder er löscht es").
 *
 * KEINE AUTOMATIK, UND DAS IST DIE ENTSCHEIDUNG. Eine Regel wie „nach 30 Tagen weg" klingt
 * sauber, trifft aber irgendwann den Falschen: einen Trichter, der seit fünf Wochen still
 * ist, weil der Betrieb Urlaub hatte — samt der Anfragen, auf die Menschen warten. Wer
 * löscht, soll vorher hinsehen.
 *
 * DESHALB ZEIGT DAS SKRIPT ZUERST NUR. Löschen ist ein zweiter, ausdrücklicher Aufruf — mit
 * dem Namen, für genau einen, und mit dem getippten Namen als Bestätigung.
 *
 *   node scripts/versusforge-aufraeumen.mjs             → alle Einträge mit ihren Zahlen
 *   node scripts/versusforge-aufraeumen.mjs --weg NAME  → diesen einen löschen, endgültig
 *
 * KEIN SAMMELLÖSCHEN MEHR (Owner 11.09.2026): Hier standen `--ungenutzt` („alle ungenutzten auf
 * einmal") und ein Hinweis „älter als 30 Tage". Beides löste das Versprechen „was 30 Tage lang
 * ungenutzt bleibt, löschen wir von uns aus" ein — der Satz ist aus dem Chat gestrichen („raus
 * damit"). Eine Künstlerseite ist kostenlos und bekommt oft monatelang keine Anfrage; nach den
 * Merkmalen hätte jede als „ungenutzt" gegolten. Für Firmen gilt dasselbe System („für Firmen
 * wird es genau so funktionieren"). Gelöscht wird, wer darum bittet — einzeln.
 *
 * GEKAUFTE TRICHTER SIND BESONDERS GEKENNZEICHNET und werden nur nach Rückfrage gelöscht:
 * Wer bezahlt hat, verliert seine Anfragen nicht durch ein Aufräumen.
 */
import fs from "node:fs";
import readline from "node:readline/promises";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const g = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim() || "";
const URL_ = g("SUPABASE_URL") || g("NEXT_PUBLIC_SUPABASE_URL");
const KEY = g("SUPABASE_SERVICE_ROLE_KEY") || g("SUPABASE_SERVICE_KEY");
const BUCKET = g("SUPABASE_STORAGE_BUCKET") || "shopcut-images";
if (!URL_ || !KEY) { console.error("SUPABASE_URL / SERVICE_ROLE_KEY fehlen in .env.local"); process.exit(1); }

const kopf = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const liste = async (prefix, limit = 1000) => {
  const r = await fetch(`${URL_}/storage/v1/object/list/${BUCKET}`, {
    method: "POST", headers: { ...kopf, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit }),
  });
  return r.ok ? await r.json() : [];
};
const holen = async (pfad) => {
  const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${pfad}`, { headers: kopf });
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
};

const tage = (iso) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / 86400000) : null;
};

/* ── LÖSCHEN ────────────────────────────────────────────────────────────────────────────── */
const weg = process.argv.indexOf("--weg");
if (weg > -1) {
  const name = process.argv[weg + 1];
  if (!name) { console.error("Welchen? node scripts/versusforge-aufraeumen.mjs --weg NAME"); process.exit(1); }

  const m = await holen(`versusforge-mandant/${name}.json`);
  if (!m) { console.error(`Es gibt keinen Trichter „${name}".`); process.exit(1); }

  const anfragen = await liste(`versusforge-lead/${name}/`);
  const schritte = await liste(`versusforge-schritt/${name}/`);
  /* SEINE BILDER GEHÖREN DAZU (Owner 11.09.2026): Werke, Profilfoto und was noch in der Prüfung liegt.
     Vorher blieben sie nach „alles löschen" liegen. */
  const bilder = (await liste(`versusforge-motiv/${name}/`)).filter((d) => d.id);
  const inPruefung = (await liste(`versusforge-motiv-pruefung/${name}/`)).filter((d) => d.id);

  console.log(`\nTrichter:  ${m.name} (${name})`);
  console.log(`Stand:     ${m.stand === "scharf" ? "BEZAHLT" : "kostenlos"}`);
  console.log(`Angelegt:  vor ${tage(m.angelegt) ?? "?"} Tagen`);
  console.log(`Anfragen:  ${anfragen.length}`);
  console.log(`Besucher:  ${schritte.length}`);
  console.log(`Bilder:    ${bilder.length}${inPruefung.length ? ` (+ ${inPruefung.length} in Prüfung)` : ""}`);

  /* ZWEI HÜRDEN, WENN ETWAS DRANHÄNGT: Wer bezahlt hat oder Anfragen liegen hat, verliert
     sie nicht durch einen schnellen Tastendruck. */
  if (m.stand === "scharf" || anfragen.length) {
    console.log(`\nACHTUNG: ${m.stand === "scharf" ? "Dieser Trichter ist BEZAHLT. " : ""}${anfragen.length ? `Es liegen ${anfragen.length} Anfragen darin — dort warten Menschen auf einen Rückruf.` : ""}`);
  }
  const frage = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ja = await frage.question(`\nWirklich alles löschen? Tipp den Namen zur Bestätigung: `);
  frage.close();
  if (ja.trim() !== name) { console.log("Abgebrochen, nichts gelöscht."); process.exit(0); }

  const pfade = [
    `versusforge-mandant/${name}.json`,
    ...anfragen.map((d) => `versusforge-lead/${name}/${d.name}`),
    ...schritte.map((d) => `versusforge-schritt/${name}/${d.name}`),
    ...bilder.map((d) => `versusforge-motiv/${name}/${d.name}`),
    ...inPruefung.map((d) => `versusforge-motiv-pruefung/${name}/${d.name}`),
  ];
  const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}`, {
    method: "DELETE", headers: { ...kopf, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: pfade }),
  });
  console.log(r.ok ? `Gelöscht: ${pfade.length} Dateien.` : `Fehler: ${r.status} ${await r.text()}`);
  process.exit(0);
}

/* ── ANSEHEN ───────────────────────────────────────────────────────────────────────────── */
const dateien = (await liste("versusforge-mandant/")).filter((d) => String(d?.name ?? "").endsWith(".json"));
if (!dateien.length) { console.log("Noch keine Trichter."); process.exit(0); }

const zeilen = [];
for (const d of dateien) {
  const name = d.name.replace(/\.json$/, "");
  const m = await holen(`versusforge-mandant/${d.name}`);
  if (!m) continue;
  const anfragen = await liste(`versusforge-lead/${name}/`);
  const schritte = await liste(`versusforge-schritt/${name}/`);
  zeilen.push({
    name,
    titel: String(m.name ?? "").slice(0, 24),
    stand: m.stand === "scharf" ? "bezahlt" : "frei",
    alter: tage(m.angelegt),
    anfragen: anfragen.length,
    besucher: schritte.length,
    bereit: !!m.impressumUrl && !!m.datenschutzUrl,
  });
}

zeilen.sort((a, b) => (b.alter ?? 0) - (a.alter ?? 0));
console.log("");
console.log("NAME                 BETRIEB                  STAND    ALTER  BESUCHER  ANFRAGEN  LÄUFT");
for (const z of zeilen) {
  console.log(
    z.name.padEnd(20).slice(0, 20) + " " +
    z.titel.padEnd(24).slice(0, 24) + " " +
    z.stand.padEnd(8) + " " +
    String(z.alter ?? "?").padStart(4) + "d  " +
    String(z.besucher).padStart(8) + "  " +
    String(z.anfragen).padStart(8) + "  " +
    (z.bereit ? "ja" : "nein"),
  );
}
