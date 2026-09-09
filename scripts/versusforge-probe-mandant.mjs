/**
 * EIN PROBE-MANDANT ZUM ANSEHEN — und derselbe Befehl räumt ihn wieder weg.
 *
 * WOZU: Das Dashboard (`/versusforge/<name>/dashboard?k=…`) und das Einrichten lassen sich
 * sonst nur prüfen, indem jemand den echten Trichter durchläuft — das kostet Modellaufrufe
 * und verschickt echte E-Mails. Dieses Skript legt EINE Datei an und drei Anfragen dazu.
 * Kein Modell, kein Versand, kein Cent.
 *
 * DER NAME IST ABSICHTLICH HÄSSLICH (`probe-zahnarzt`): Wer ihn in einer Liste sieht, weiss
 * sofort, dass er nicht echt ist.
 *
 *   node scripts/versusforge-probe-mandant.mjs          → anlegen, Links ausgeben
 *   node scripts/versusforge-probe-mandant.mjs --weg    → restlos löschen
 *
 * WEDER `stand: "scharf"` NOCH PFLICHTANGABEN sind gesetzt — genau so kommt ein Mandant aus
 * dem Trichter. Damit zeigt die Probe den ECHTEN Anfangszustand: Einrichten oben, Anfragen
 * unter Verschluss.
 */
import fs from "node:fs";
import crypto from "node:crypto";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const g = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim() || "";
const URL_ = g("SUPABASE_URL") || g("NEXT_PUBLIC_SUPABASE_URL");
const KEY = g("SUPABASE_SERVICE_ROLE_KEY") || g("SUPABASE_SERVICE_KEY");
const BUCKET = g("SUPABASE_STORAGE_BUCKET") || "shopcut-images";
if (!URL_ || !KEY) { console.error("SUPABASE_URL / SERVICE_ROLE_KEY fehlen in .env.local"); process.exit(1); }

const NAME = "probe-zahnarzt";
const kopf = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const schreiben = async (pfad, daten) => {
  const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${pfad}`, {
    method: "POST",
    headers: { ...kopf, "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(daten),
  });
  if (!r.ok) throw new Error(`${pfad}: ${r.status} ${await r.text()}`);
};

const wegraeumen = async () => {
  const liste = await fetch(`${URL_}/storage/v1/object/list/${BUCKET}`, {
    method: "POST", headers: { ...kopf, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: `versusforge-lead/${NAME}/`, limit: 500 }),
  });
  const dateien = liste.ok ? await liste.json() : [];
  const pfade = [
    `versusforge-mandant/${NAME}.json`,
    ...dateien.map((d) => `versusforge-lead/${NAME}/${d.name}`),
  ];
  const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}`, {
    method: "DELETE", headers: { ...kopf, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: pfade }),
  });
  console.log(r.ok ? `weg: ${pfade.length} Dateien` : `Fehler: ${r.status} ${await r.text()}`);
};

if (process.argv.includes("--weg")) { await wegraeumen(); process.exit(0); }

const schluessel = crypto.randomUUID();
const loeschSchluessel = crypto.randomUUID();

await schreiben(`versusforge-mandant/${NAME}.json`, {
  name: "Zahnarztpraxis Probe",
  ort: "München",
  adresse: "",
  telefon: "",
  webUrl: "",
  hook: "Ein fester Zahn in einem Termin — geht das bei dir?",
  unterzeile: "Vier Fragen, eine Minute. Danach wissen wir, ob es passt.",
  karten: ["Zahn fehlt seit Jahren", "Prothese sitzt nicht", "Angst vor dem Eingriff"],
  knopf: "Anfrage starten",
  fein: "Kostenlos und unverbindlich.",
  ergebnisTitel: "Was du bekommst",
  ergebnisText: "Einen Rückruf mit einer ehrlichen Einschätzung — kein Angebot per Formular.",
  aboutUrl: "",
  impressumUrl: "",
  datenschutzUrl: "",
  farbe: "#1d6fd0",
  logoUrl: "",
  plan: null,
  mail: "",
  schluessel,
  loeschSchluessel,
  stand: "vorschau",
  angelegt: new Date().toISOString(),
});

const anfragen = [
  { name: "Petra Sommer", tel: "+49 170 1234567", text: "Zahn fehlt seit Jahren",
    runden: [["Worum geht es?", "Mir fehlt seit vier Jahren ein Backenzahn links."],
             ["Seit wann?", "Vier Jahre. Ich schiebe es vor mir her."],
             ["Was hält dich ab?", "Ich weiss nicht, was es kostet."]], vor: 40 },
  { name: "Ahmet Yilmaz", tel: "+49 176 9988776", text: "Prothese sitzt nicht",
    runden: [["Worum geht es?", "Die Prothese rutscht beim Essen."],
             ["Seit wann?", "Seit dem Sommer."]], vor: 320 },
  { name: "Marion Klee", tel: "+49 151 4443322", text: "Angst vor dem Eingriff",
    runden: [["Worum geht es?", "Ich hätte gern ein Implantat, habe aber Angst."]], vor: 2600 },
];

for (const a of anfragen) {
  const zeit = new Date(Date.now() - a.vor * 60000).toISOString();
  await schreiben(
    `versusforge-lead/${NAME}/${zeit.replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}.json`,
    { mail: "", ziel: "anfrage", text: a.text, url: "", sprache: "de", plan: null,
      runden: [...a.runden.map(([frage, antwort]) => ({ frage, antwort })),
               { frage: "Name", antwort: a.name }, { frage: "Telefon", antwort: a.tel }],
      zeit },
  );
}

console.log(`Trichter:   http://localhost:3000/versusforge/${NAME}`);
console.log(`Dashboard:  http://localhost:3000/versusforge/${NAME}/dashboard?k=${schluessel}`);
console.log(`Wieder weg: node scripts/versusforge-probe-mandant.mjs --weg`);
