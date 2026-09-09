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
 * dem Namen für einen einzelnen, oder mit `--ungenutzt` für die, auf die alle vier Merkmale
 * zutreffen. Auch der Sammelweg zeigt erst die Liste und verlangt ein getipptes Wort.
 *
 *   node scripts/versusforge-aufraeumen.mjs             → alle Trichter mit ihren Zahlen
 *   node scripts/versusforge-aufraeumen.mjs --weg NAME  → diesen einen löschen, endgültig
 *   node scripts/versusforge-aufraeumen.mjs --ungenutzt → alle ungenutzten auf einmal
 *
 * DAS VERSPRECHEN, DAS DARAN HÄNGT (Owner 09.09.2026: „wenn es ungenutzt ist seit 30 Tagen,
 * dann löschen wir es wirklich" · „ich lösche es"): Im Gespräch steht seit heute der Satz
 * „was 30 Tage lang ungenutzt bleibt, löschen wir von uns aus". Dieses Skript ist der Ort,
 * an dem das eingelöst wird. Wird es nicht mehr benutzt, muss der Satz aus dem Gespräch
 * heraus — ein Datenschutzsatz, den niemand einhält, ist schlimmer als keiner.
 *
 * WAS „UNGENUTZT" HEISST, entscheidet der Mensch vor dem Bildschirm. Die Liste liefert die
 * drei Zahlen, auf die es ankommt: wie alt, wie viele Besucher, wie viele Anfragen. Ein
 * Trichter mit Anfragen ist nie ungenutzt, auch wenn er alt ist — dort wartet jemand.
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

  console.log(`\nTrichter:  ${m.name} (${name})`);
  console.log(`Stand:     ${m.stand === "scharf" ? "BEZAHLT" : "kostenlos"}`);
  console.log(`Angelegt:  vor ${tage(m.angelegt) ?? "?"} Tagen`);
  console.log(`Anfragen:  ${anfragen.length}`);
  console.log(`Besucher:  ${schritte.length}`);

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
  ];
  const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}`, {
    method: "DELETE", headers: { ...kopf, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: pfade }),
  });
  console.log(r.ok ? `Gelöscht: ${pfade.length} Dateien.` : `Fehler: ${r.status} ${await r.text()}`);
  process.exit(0);
}

/**
 * ── ALLE UNGENUTZTEN AUF EINMAL ──────────────────────────────────────────────────────────
 *
 * WARUM ES DIESEN WEG GIBT, obwohl Löschen sonst Handarbeit ist: Das Versprechen im Gespräch
 * lautet „nach 30 Tagen löschen wir es". Ein Versprechen, dessen Einlösung darin besteht,
 * acht Befehle von Hand abzutippen, wird irgendwann nicht mehr eingelöst — und dann steht im
 * Chat ein Satz, der nicht mehr stimmt. Bequemlichkeit ist hier eine Frage der Ehrlichkeit.
 *
 * DIE BEDINGUNGEN BLEIBEN ENG: nicht bezahlt, keine Anfrage, kein Besucher, älter als 30
 * Tage. Wer nur eine dieser Hürden nimmt, bleibt stehen.
 */
if (process.argv.includes("--ungenutzt")) {
  const dateien = (await liste("versusforge-mandant/")).filter((d) => String(d?.name ?? "").endsWith(".json"));
  const treffer = [];
  for (const d of dateien) {
    const name = d.name.replace(/\.json$/, "");
    const m = await holen(`versusforge-mandant/${d.name}`);
    if (!m || m.stand === "scharf") continue;
    if ((tage(m.angelegt) ?? 0) <= 30) continue;
    const anfragen = await liste(`versusforge-lead/${name}/`);
    if (anfragen.length) continue;
    const schritte = await liste(`versusforge-schritt/${name}/`);
    if (schritte.length) continue;
    treffer.push({ name, titel: m.name, alter: tage(m.angelegt) });
  }
  if (!treffer.length) { console.log("Nichts Ungenutztes. Nichts zu tun."); process.exit(0); }

  console.log(`\n${treffer.length} ungenutzte Trichter — nicht bezahlt, kein Besucher, keine Anfrage:`);
  for (const t of treffer) console.log(`  ${t.name.padEnd(22)} ${String(t.titel).slice(0, 30).padEnd(32)} ${t.alter} Tage`);

  const frage = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ja = await frage.question(`\nAlle ${treffer.length} endgültig löschen? Tipp LOESCHEN: `);
  frage.close();
  if (ja.trim() !== "LOESCHEN") { console.log("Abgebrochen, nichts gelöscht."); process.exit(0); }

  let weg2 = 0;
  for (const t of treffer) {
    const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}`, {
      method: "DELETE", headers: { ...kopf, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [`versusforge-mandant/${t.name}.json`] }),
    });
    if (r.ok) weg2 += 1; else console.error(`  ${t.name}: ${r.status}`);
  }
  console.log(`Gelöscht: ${weg2} von ${treffer.length}.`);
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

/* DER VORSCHLAG IST EIN HINWEIS, KEIN BEFEHL: älter als 30 Tage, niemand war da, nichts
   angefragt, nicht bezahlt. Was davon wirklich weg soll, entscheidet der Mensch. */
const kandidaten = zeilen.filter(z => z.stand !== "bezahlt" && !z.anfragen && !z.besucher && (z.alter ?? 0) > 30);
if (kandidaten.length) {
  console.log(`\nUngenutzt (älter als 30 Tage, kein Besucher, keine Anfrage, nicht bezahlt):`);
  for (const z of kandidaten) console.log(`  node scripts/versusforge-aufraeumen.mjs --weg ${z.name}`);
} else {
  console.log(`\nNichts offensichtlich Ungenutztes.`);
}
