/* Probelauf der Server-Druckdatei: dasselbe Werk wie die Python-Fassung, zum Vergleich. */
import { writeFileSync } from "node:fs";
import { druckdateiBauen } from "@/lib/lakatosbandi-druckdatei";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { werkKacheln, posterAnriss } from "@/lib/lakatosbandi";
import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";
import { motivPfad } from "@/lib/versusforge-moderation";
import { filmSeite } from "@/lib/lakatosbandi-film";
import { portalTexte } from "@/lib/lakatosbandi-texte";

const kennung = process.env.M ?? "vangogh";
const nr = process.env.NR ?? "standard";
const m = await mandantLesen(kennung);
const k = werkKacheln(m).find(x => (x.i < 0 ? "standard" : String(x.i)) === nr);
const info = m.werkInfo?.[nr] ?? {};

const holen = async (pfad) => {
  const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`);
  return r.ok ? new Uint8Array(await r.arrayBuffer()) : undefined;
};

const bytes = await druckdateiBauen({
  bild: await holen(motivPfad(kennung, nr)),
  profil: m.profilBild ? await holen(motivPfad(kennung, "profil")) : undefined,
  name: (m.name ?? "").toUpperCase(),
  leben: m.leben,
  titel: [info.titel, info.jahr].filter(Boolean).join(", "),
  text: posterAnriss(k?.hook ?? ""),
  qrZiel: filmSeite(kennung, k?.i ?? -1),
  scan: portalTexte("ro").qrScannen,
  recht: m.reproduktion
    ? "Text și design © 2026 lakatosbandi.com · Imagine: domeniu public"
    : `Text și design © 2026 lakatosbandi.com · ${m.name}`,
  nummer: "LB-TEST01",
  format: "A3",
  rahmen: process.env.RAHMEN === "none" ? null : (process.env.RAHMEN ?? "schwarz"),
});
const ziel = `/tmp/repro/server-${kennung}-${nr}.pdf`;
writeFileSync(ziel, bytes);
console.log(ziel, Math.round(bytes.length / 1024), "KB");
