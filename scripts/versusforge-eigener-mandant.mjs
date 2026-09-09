/**
 * VERSUSFORGE ALS MANDANT NUMMER EINS ANLEGEN (Owner 09.09.2026: „wo ist mein Dashboard?" ·
 * „der müsste doch genauso aussehen").
 *
 * WARUM ES DIESE DATEI BRAUCHT: Das Dashboard liest einen Mandanten. Ohne Datei kein
 * Mandant, ohne Mandant kein Schlüssel, ohne Schlüssel keine Seite. Bisher gab `mandantLesen`
 * für „versusforge" absichtlich `null` zurück („wir sind die Wurzel, nicht ein Eintrag") —
 * genau der Satz, der ihm sein eigenes Dashboard verwehrt hat.
 *
 * EIN ZWEITES, EIGENES DASHBOARD DANEBENZUBAUEN WÄRE DER FEHLER, den die Hausregel
 * [[mein-trichter-ist-ihr-trichter]] verbietet: „nie zweimal bauen". Also wird er ein
 * Mandant wie jeder andere — mit derselben Seite, denselben Zahlen, derselben Leiter. Nur
 * die Stationen heissen anders, weil seine Strecke anders läuft (STUFEN_ENGINE).
 *
 * DER SCHLÜSSEL WIRD NUR EINMAL ERZEUGT. Ein zweiter Lauf behält den bestehenden — sonst
 * wäre sein Lesezeichen nach jedem Aufruf tot.
 *
 *   node scripts/versusforge-eigener-mandant.mjs         → anlegen oder Schlüssel zeigen
 *   node scripts/versusforge-eigener-mandant.mjs --neu   → Schlüssel erneuern
 */
import fs from "node:fs";
import crypto from "node:crypto";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const g = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim() || "";
const URL_ = g("SUPABASE_URL") || g("NEXT_PUBLIC_SUPABASE_URL");
const KEY = g("SUPABASE_SERVICE_ROLE_KEY") || g("SUPABASE_SERVICE_KEY");
const BUCKET = g("SUPABASE_STORAGE_BUCKET") || "shopcut-images";
if (!URL_ || !KEY) { console.error("SUPABASE_URL / SERVICE_ROLE_KEY fehlen in .env.local"); process.exit(1); }

const NAME = "versusforge";
const kopf = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const pfad = `${URL_}/storage/v1/object/${BUCKET}/versusforge-mandant/${NAME}.json`;

let alt = null;
const da = await fetch(pfad, { headers: kopf });
if (da.ok) { try { alt = await da.json(); } catch { /* kaputt = neu anlegen */ } }

const neuerSchluessel = process.argv.includes("--neu") || !alt?.schluessel;
const schluessel = neuerSchluessel ? crypto.randomUUID().replace(/-/g, "") : alt.schluessel;
const loeschSchluessel = alt?.loeschSchluessel || crypto.randomUUID().replace(/-/g, "");

const m = {
  ...(alt ?? {}),
  name: "VersusForge",
  ort: "",
  /* Adresse und Telefon bleiben, was er im Einrichten selbst einträgt. */
  adresse: alt?.adresse ?? "",
  telefon: alt?.telefon ?? "",
  webUrl: alt?.webUrl ?? "https://versusforge.com",
  /* Der Trichter dieses Mandanten ist /engine, nicht /versusforge/versusforge — diese
     Felder trägt das Dashboard nicht, sie stehen nur der Vollständigkeit halber da. */
  hook: alt?.hook ?? "Deine Website steht und bringt keine Anfragen.",
  unterzeile: alt?.unterzeile ?? "In zwei Minuten hast du die Lösung.",
  karten: alt?.karten ?? [],
  knopf: alt?.knopf ?? "Jetzt starten",
  fein: alt?.fein ?? "Kostenlos",
  ergebnisTitel: alt?.ergebnisTitel ?? "",
  ergebnisText: alt?.ergebnisText ?? "",
  aboutUrl: "https://versusforge.com/about",
  /* SEINE PFLICHTANGABEN STEHEN SCHON — die Seiten gibt es seit Monaten. Damit ist sein
     Trichter „läuft", und das ist auch die Wahrheit: /engine sammelt seit heute. */
  impressumUrl: "https://versusforge.com/imprint",
  datenschutzUrl: "https://versusforge.com/privacy",
  farbe: "#1d6fd0",
  logoUrl: "",
  plan: alt?.plan ?? null,
  mail: alt?.mail ?? "service@versusforge.com",
  schluessel,
  loeschSchluessel,
  /* „scharf" heisst bezahlt. Der eigene Mandant zahlt sich nichts selbst. */
  stand: "scharf",
  angelegt: alt?.angelegt ?? new Date().toISOString(),
};

const res = await fetch(pfad, {
  method: "POST",
  headers: { ...kopf, "Content-Type": "application/json", "x-upsert": "true" },
  body: JSON.stringify(m),
});
if (!res.ok) { console.error("Fehler:", res.status, await res.text()); process.exit(1); }

console.log(alt ? "Mandant aktualisiert." : "Mandant angelegt.");
if (neuerSchluessel && alt) console.log("ACHTUNG: neuer Schlüssel — alte Lesezeichen sind tot.");
console.log(`\nDein Dashboard:\nhttps://versusforge.com/${NAME}/dashboard?k=${schluessel}`);
console.log(`\nLokal:\nhttp://localhost:3000/versusforge/${NAME}/dashboard?k=${schluessel}`);
