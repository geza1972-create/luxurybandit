/* Prüft jede Kandidatendatei gegen die DATEN in Supabase: Mandanten-Datensätze, der grosse
   Zustand und die Kunden-Zettel. Was dort vorkommt, ist nicht tot — auch wenn es im Code
   nirgends steht. */
import fs from "node:fs";
for (const z of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(z.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const B = process.env.SUPABASE_STORAGE_BUCKET ?? "shopcut-images";
const kopf = { apikey: K, Authorization: "Bearer " + K };
const weg = p => p.split("/").map(encodeURIComponent).join("/");

const liste = async prefix => {
  const r = await fetch(`${U}/storage/v1/object/list/${B}`, {
    method: "POST", headers: { ...kopf, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 1000 }),
  });
  return r.ok ? await r.json() : [];
};

/* Alles zusammentragen, was Pfade enthalten KÖNNTE. */
let heuhaufen = "";
for (const ordner of ["versusforge-mandant", "try-this-look"]) {
  for (const d of await liste(ordner)) {
    if (!d.id || !/\.json$/.test(d.name)) continue;
    const r = await fetch(`${U}/storage/v1/object/${B}/${weg(`${ordner}/${d.name}`)}`, { headers: kopf });
    if (r.ok) heuhaufen += await r.text();
  }
}
console.error(`Daten gelesen: ${(heuhaufen.length / 1048576).toFixed(1)} MB Text`);

const zeilen = fs.readFileSync(process.argv[2], "utf8").trim().split("\n").filter(Boolean);
let tot = 0, lebt = 0;
for (const z of zeilen) {
  const [gr, pfad] = z.split("\t");
  const rel = pfad.replace(/^public/, "");
  const name = pfad.split("/").pop();
  if (heuhaufen.includes(rel) || heuhaufen.includes(name)) {
    console.log(`LEBT\t${gr}\t${pfad}`);
    lebt++;
  } else {
    console.log(`TOT\t${gr}\t${pfad}`);
    tot++;
  }
}
console.error(`${tot} ohne jeden Fund, ${lebt} kommen in den Daten vor.`);
