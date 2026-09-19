/* Das Raster als JSON — damit die Druckdatei aus denselben Zahlen entsteht wie die Kachel
   (lib/lakatosbandi-poster.ts). Ohne diesen Export gäbe es zwei Layouts, die auseinanderlaufen. */
import { writeFileSync } from "node:fs";
import { POSTER, POSTER_VERHAELTNIS, POSTER_FORMATE } from "@/lib/lakatosbandi-poster";
const ziel = "/tmp/repro/poster-raster.json";
writeFileSync(ziel, JSON.stringify({ POSTER, POSTER_VERHAELTNIS, POSTER_FORMATE }, null, 1));
console.log("geschrieben:", ziel);
