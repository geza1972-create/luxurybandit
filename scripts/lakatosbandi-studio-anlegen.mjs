/**
 * DEN KÜNSTLER „LAKATOS & BANDI STUDIO" ANLEGEN (Owner 25.09.2026: „mach mir einen neuen
 * Künstler Lakatos & Bandi Studio auch unter geza1972@gmail.com" · „die Bilder werden auch
 * sofort freigegeben").
 *
 * Dieselbe Mail wie bei gerrylouisett und szidoniabandi-6 — das ist ausdrücklich gewollt,
 * nicht ein Versehen: Es ist SEIN eigenes Studio, keine Anmeldung eines fremden Künstlers.
 * `mandantAnlegen()` prüft Mail-Eindeutigkeit ohnehin nur im Kunden-Trichter
 * (`api/portal-anlegen`), nicht in der Ablage selbst.
 *
 * NOCH KEIN WERK: `werkKacheln()` (lib/lakatosbandi.ts) baut die Standard-Kachel aus `hook`
 * ALLEIN, unabhängig von `werkNummern` und ohne zu prüfen, ob dahinter ein Bild liegt — ein
 * gesetzter `hook` ohne hochgeladenes Motiv erzeugt also eine Kachel mit 404-Bild (genau das
 * ist beim ersten Lauf passiert: sie stand als Aufmacher auf der Startseite, das Bild fehlte).
 * DESHALB BLEIBT `hook` HIER LEER, bis er sein erstes Werk über „Seite bearbeiten" hochlädt.
 *
 * IDEMPOTENT: Existiert die Datei schon, wird NICHTS überschrieben — das Skript zeigt nur
 * den Stand und den Dashboard-Link.
 *
 * PREMIUM WIE GERRY LOUISETT UND SZIDONIA BANDI (Owner 25.09.2026: „die haben premium", zum
 * Dashboard, wo Living Poster und die Stimmaufnahme hinter „Upgrade" standen): Dasselbe
 * geschenkte Jahr, ab heute — `posterViu: true` allein reicht nicht, `aboAktiv()`
 * (lib/versusforge-abo.ts) sperrt beide Bausteine im Dashboard ohne aktives Abo.
 *
 *   node scripts/lakatosbandi-studio-anlegen.mjs          → Probelauf, nichts geschrieben
 *   node scripts/lakatosbandi-studio-anlegen.mjs --echt   → wirklich anlegen
 */
import fs from "node:fs";
import crypto from "node:crypto";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const g = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "") || "";
const URL_ = g("SUPABASE_URL") || g("NEXT_PUBLIC_SUPABASE_URL");
const KEY = g("SUPABASE_SERVICE_ROLE_KEY") || g("SUPABASE_SERVICE_KEY");
const BUCKET = g("SUPABASE_STORAGE_BUCKET") || "shopcut-images";
if (!URL_ || !KEY) { console.error("SUPABASE_URL / SERVICE_ROLE_KEY fehlen in .env.local"); process.exit(1); }

const KENNUNG = "lakatos-bandi-studio";
const kopf = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const objekt = (p) => `${URL_}/storage/v1/object/${BUCKET}/${p}`;
const pfad = objekt(`versusforge-mandant/${KENNUNG}.json`);

const ECHT = process.argv.includes("--echt");

const schon = await fetch(pfad, { headers: kopf });
if (schon.ok) {
  const m = await schon.json();
  console.log(`Gibt es schon: lakatosbandi.com/${KENNUNG} · Schlüssel: ${m.schluessel}`);
  console.log(`Dashboard: lakatosbandi.com/${KENNUNG}?k=${m.schluessel}`);
  process.exit(0);
}

const jetztDatum = new Date();
const jetzt = jetztDatum.toISOString();
const inEinemJahr = new Date(jetztDatum); inEinemJahr.setFullYear(jetztDatum.getFullYear() + 1);
const schluessel = crypto.randomUUID().replace(/-/g, "");
const loeschSchluessel = crypto.randomUUID().replace(/-/g, "");

const angaben = {
  name: "Lakatos & Bandi Studio",
  ort: "", adresse: "", telefon: "", webUrl: "",
  sprache: "de",
  /* Leer, absichtlich (siehe Kopf dieser Datei) — sonst entsteht eine Kachel ohne Bild. */
  hook: "",
  unterzeile: "", karten: [], knopf: "", fein: "",
  ergebnisTitel: "", ergebnisText: "",
  aboutUrl: "", impressumUrl: "", datenschutzUrl: "", farbe: "", logoUrl: "",
  plan: { hook: "", zielgruppe: [], karten: [] },
  mail: "geza1972@gmail.com",
  schluessel,
  loeschSchluessel,
  stand: "vorschau",
  angelegt: jetzt,
  /* Sofort frei und in der Übersicht — es ist sein eigenes Studio, keine fremde Anmeldung,
     die erst geprüft werden müsste. */
  freigabe: "frei",
  freigabeAm: jetzt,
  portal: true,
  hooks: [],
  werkInfo: {},
  /* Noch leer — das erste Werk trägt er über „Seite bearbeiten" nach. */
  werkNummern: [],
  /* Living Poster ist für dieses Studio an — genau der Verkaufsweg, den der Owner für seine
     eigenen Werke aufbauen will. */
  posterViu: true,
  /* Geschenktes Premium-Jahr — siehe Kopf dieser Datei. `aktiv` bleibt false: geschenkt ist
     nicht bezahlt, sonst liefe das Geschenk nie ab. */
  abo: { aktiv: false, seit: jetzt, geschenktBis: inEinemJahr.toISOString() },
  instagram: "", facebook: "",
};

console.log(`Lege an: lakatosbandi.com/${KENNUNG} · Mail: ${angaben.mail} · Sprache: de · posterViu: true`);
if (!ECHT) { console.log("\nProbelauf — nichts geschrieben. Zum Anlegen --echt anhängen."); process.exit(0); }

const w = await fetch(pfad, {
  method: "POST",
  headers: { ...kopf, "Content-Type": "application/json", "x-upsert": "false" },
  body: JSON.stringify(angaben),
});
if (!w.ok) { console.error("Nicht angelegt:", w.status, await w.text()); process.exit(1); }

console.log(`\nAngelegt: lakatosbandi.com/${KENNUNG}`);
console.log(`Dashboard (Seite bearbeiten): lakatosbandi.com/${KENNUNG}?k=${schluessel}`);
