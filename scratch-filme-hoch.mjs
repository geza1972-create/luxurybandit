import { readFileSync, readdirSync } from "node:fs";
import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";
import { filmPfad } from "@/lib/lakatosbandi-film";
/* Legt jeden fertigen Clip an seinen Platz. Der Dateiname trägt Mandant und Kachelnummer:
   „vangogh-0.mp4" → versusforge-film/vangogh/0.mp4 */
for (const f of readdirSync("/tmp/repro/video").filter(n => n.endsWith(".mp4"))) {
  const [mandant, ...rest] = f.replace(/\.mp4$/, "").split("-");
  const nr = rest.join("-");
  const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(filmPfad(mandant, nr))}`, {
    method: "POST", headers: { "Content-Type": "video/mp4", "x-upsert": "true" },
    body: new Uint8Array(readFileSync(`/tmp/repro/video/${f}`)),
  });
  console.log(r.ok ? "hoch" : "FEHLER", filmPfad(mandant, nr), r.status);
}
