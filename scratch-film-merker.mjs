import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";
import { filmPfad } from "@/lib/lakatosbandi-film";
/* Setzt `film: true` an jeder Kachel, zu der wirklich eine Datei liegt — einmal nachgesehen,
   damit die Übersicht es später nicht bei jedem Aufruf tun muss. */
for (const k of ["vangogh", "klimt", "monet", "hokusai", "munch", "friedrich"]) {
  const m = await mandantLesen(k);
  if (!m?.werkInfo) { console.log(k, "—"); continue; }
  const werkInfo = { ...m.werkInfo };
  let n = 0;
  for (const nr of Object.keys(werkInfo)) {
    const da = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(filmPfad(k, nr))}`, { method: "HEAD" })
      .then(r => r.ok).catch(() => false);
    werkInfo[nr] = { ...werkInfo[nr], ...(da ? { film: true } : {}) };
    if (da) n++;
  }
  console.log(k, "Filme:", n, await mandantSpeichern(k, { ...m, werkInfo }));
}
