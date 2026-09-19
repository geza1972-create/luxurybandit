import fs from "node:fs";
for (const z of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(z.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const B = process.env.SUPABASE_STORAGE_BUCKET ?? "shopcut-images";
const kopf = { apikey: K, Authorization: "Bearer " + K };
const weg = p => p.split("/").map(encodeURIComponent).join("/");
const NUR_ZAEHLEN = process.argv[2] !== "los";

const liste = async prefix => {
  const r = await fetch(`${U}/storage/v1/object/list/${B}`, {
    method: "POST", headers: { ...kopf, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: "name", order: "asc" } }),
  });
  return r.ok ? await r.json() : [];
};

const ordner = (await liste("versusforge-motiv")).filter(d => !d.id).map(d => d.name);
let gesamt = 0, kopiert = 0;
for (const m of ordner) {
  for (const d of await liste(`versusforge-motiv/${m}`)) {
    if (!d.id || !d.name.endsWith(".jpg")) continue;
    gesamt++;
    if (NUR_ZAEHLEN) continue;
    const nr = d.name.replace(/\.jpg$/, "");
    const quelle = `versusforge-motiv/${m}/${d.name}`;
    const ziel = `versusforge-motiv-pruefung/${m}/${d.name}`;
    /* Schon in der Prüfung? Dann liegt dort etwas Neueres — nicht überschreiben. */
    if ((await fetch(`${U}/storage/v1/object/${B}/${weg(ziel)}`, { method: "HEAD", headers: kopf })).ok) continue;
    const bild = await fetch(`${U}/storage/v1/object/${B}/${weg(quelle)}`, { headers: kopf });
    if (!bild.ok) continue;
    const daten = Buffer.from(await bild.arrayBuffer());
    const put = await fetch(`${U}/storage/v1/object/${B}/${weg(ziel)}`, {
      method: "POST", headers: { ...kopf, "Content-Type": "image/jpeg", "x-upsert": "true" }, body: daten,
    });
    if (!put.ok) { console.log(`${m}/${nr}: FEHLER ${put.status}`); continue; }
    /* Der Merker: „dieses Bild steht schon auf der Seite" — Ablehnen nimmt es dann auch dort weg. */
    await fetch(`${U}/storage/v1/object/${B}/${weg(`versusforge-motiv-pruefung/${m}/${nr}.bestand`)}`, {
      method: "POST", headers: { ...kopf, "Content-Type": "text/plain", "x-upsert": "true" }, body: "bestand",
    });
    kopiert++;
  }
}
console.log(NUR_ZAEHLEN ? `${gesamt} Bilder in ${ordner.length} Künstlerordnern — noch NICHTS getan.` : `${kopiert} von ${gesamt} kopiert.`);
