import fs from "node:fs";

for (const z of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(z.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "shopcut-images";
const S = process.argv[2];
const MANDANT = "adrianrosu";
/* 5 und "standard" bleiben: Dort war das Foto schon randlos, und das Freistellen
   hat Bildfläche gekostet statt Umgebung. */
const WERKE = ["0", "1", "2", "3", "4", "6", "7", "8"];

const weg = p => p.split("/").map(encodeURIComponent).join("/");
const hol = (p, init = {}) => fetch(`${URL_}${p}`, { ...init, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, ...(init.headers ?? {}) } });

for (const w of WERKE) {
  const ziel = `versusforge-motiv/${MANDANT}/${w}.jpg`;
  const sicher = `versusforge-motiv-original/${MANDANT}/${w}.jpg`;

  /* 1 — das Original sichern, aber NIE eine vorhandene Sicherung überschreiben:
     ein zweiter Lauf würde sonst die freigestellte Fassung als „Original" ablegen. */
  const da = await hol(`/storage/v1/object/${BUCKET}/${weg(sicher)}`, { method: "HEAD" });
  if (!da.ok) {
    const vorher = fs.readFileSync(`${S}/${w}-vorher.jpg`);
    const r = await hol(`/storage/v1/object/${BUCKET}/${weg(sicher)}`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg", "x-upsert": "false" },
      body: vorher,
    });
    console.log(`${w}: Original gesichert ${r.ok ? "ok" : "FEHLER " + r.status}`);
  } else {
    console.log(`${w}: Sicherung lag schon da — nicht angefasst`);
  }

  /* 2 — die freigestellte Fassung an die Stelle des Werks. */
  const nachher = fs.readFileSync(`${S}/${w}-nachher.jpg`);
  const r2 = await hol(`/storage/v1/object/${BUCKET}/${weg(ziel)}`, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: nachher,
  });
  console.log(`${w}: ersetzt ${r2.ok ? "ok" : "FEHLER " + r2.status + " " + await r2.text()}`);
}
