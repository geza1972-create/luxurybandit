// DAS ORDNER-MANIFEST — BEIM BAUEN ERZEUGT (GEMESSEN 13.08.2026: auf Vercel fand
// `ordnerVideos` zur LAUFZEIT nichts — die Bau-Spurensuche nimmt den dynamischen
// readdir-Pfad nicht mit, und die Try-on-Karte fiel live auf die Galerie-Videos zurück,
// Owner: „aber du hast andere"). Beim BAUEN liegt der Ordner sicher vor; dieses Skript
// (package.json „prebuild") schreibt die Liste fest in lib/ordner-manifest.json, und
// `ordnerVideos` liest zur Laufzeit das Manifest, wenn das Dateisystem leer ist.
import fs from "node:fs";
import path from "node:path";

const ORDNER = ["Tryon", "Chat", "Versprechen"];
const wurzel = process.cwd();
const manifest = {};
for (const name of ORDNER) {
  const ordner = path.join(wurzel, "public", name);
  try {
    manifest[name] = fs.readdirSync(ordner)
      .filter(f => /\.mp4$/i.test(f))
      .sort()
      .map(f => ({
        video: encodeURI(`/${name}/${f}`),
        poster: fs.existsSync(path.join(ordner, f.replace(/\.mp4$/i, ".jpg")))
          ? encodeURI(`/${name}/${f.replace(/\.mp4$/i, ".jpg")}`)
          : "",
      }));
  } catch { manifest[name] = []; }
}
fs.writeFileSync(path.join(wurzel, "lib", "ordner-manifest.json"), JSON.stringify(manifest, null, 2));
console.log("ordner-manifest:", Object.entries(manifest).map(([k, v]) => `${k}=${v.length}`).join(" "));
