/**
 * DIE AUFTRAGSLISTE FÜR DIE DRUCKDATEIEN (Owner 16.09.2026: „mach fertig").
 *
 * Node kennt die Künstler und ihre Texte, Python kann Bilder. Also schreibt Node hier auf, WAS
 * auf jedes Blatt gehört — und `scratch-druckdatei.py` macht daraus die PDFs. Eine Liste statt
 * zweier Wahrheiten.
 *
 * Die hochaufgelöste Quelle kommt aus /tmp/repro/hd/ (Museumsscans); fehlt sie, steht das im
 * Auftrag und die Datei wird NICHT erzeugt — lieber kein PDF als ein unscharfes.
 */
import { existsSync, writeFileSync } from "node:fs";
import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";
import { motivPfad } from "@/lib/versusforge-moderation";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { werkKacheln } from "@/lib/lakatosbandi";
import { filmSeite } from "@/lib/lakatosbandi-film";
import { POSTER_TITEL } from "@/lib/lakatosbandi-poster";
import { portalTexte } from "@/lib/lakatosbandi-texte";
import { posterAnriss } from "@/lib/lakatosbandi";
import { MEISTER } from "./scratch-meister.mjs";

/* Welche Bilddatei zu welchem Werk gehört — dieselbe Reihenfolge wie beim Anlegen. */
const VANGOGH = ["w-lan", "w-noapte", "w-portret", "w-cafe", "w-rhone", "w-mandel", "w-floarea", "w-irisi", "w-bocanci"];

const auftraege = [];
const fehlt = [];

/* Das Profilbild einmal je Künstler herunterladen — im PDF steht es als Kreis neben dem Namen,
   genau wie auf der Seite (Owner 16.09.2026: „profilbild fehlt"). */
const profilHolen = async (kennung) => {
  const datei = `/tmp/repro/hd/profil-${kennung}.jpg`;
  if (existsSync(datei)) return datei;
  const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(motivPfad(kennung, "profil"))}`);
  if (!r.ok) return "";
  writeFileSync(datei, Buffer.from(await r.arrayBuffer()));
  return datei;
};

const bauen = async (kennung, nr, hdName, m, kachel) => {
  const info = m.werkInfo?.[nr] ?? {};
  const quelle = `/tmp/repro/hd/${hdName}.jpg`;
  if (!existsSync(quelle)) { fehlt.push(`${kennung}/${nr} → ${hdName}`); return; }
  auftraege.push({
    mandant: kennung, nr, quelle,
    profil: m.profilBild ? await profilHolen(kennung) : "",
    kopf: POSTER_TITEL,
    name: (m.name ?? "").toUpperCase(),
    leben: m.leben ?? "",
    titel: [info.titel, info.jahr].filter(Boolean).join(", "),
    text: posterAnriss(kachel.hook ?? ""),
    qr: filmSeite(kennung, nr === "standard" ? -1 : Number(nr)),
    scan: portalTexte("ro").qrScannen,
    recht: m.reproduktion
      ? "Text și design © 2026 lakatosbandi.com · Imagine: domeniu public"
      : `Text și design © 2026 lakatosbandi.com · ${m.name}`,
  });
};

/* Van Gogh: neun Werke, feste Reihenfolge (standard = das erste). */
const vg = await mandantLesen("vangogh");
if (vg) {
  const kacheln = werkKacheln(vg);
  for (const k of kacheln) {
    const nr = k.i < 0 ? "standard" : String(k.i);
    if (vg.werkInfo?.[nr]?.produkt) continue;           // Shirt und Hoodie sind keine Poster
    const hd = VANGOGH[k.i < 0 ? 0 : k.i + 1];
    if (hd) await bauen("vangogh", nr, hd, vg, k);
  }
}

/* Die anderen Meister: ihre Dateinamen stehen in der Tabelle, aus der sie angelegt wurden. */
for (const K of MEISTER) {
  const m = await mandantLesen(K.kennung);
  if (!m) continue;
  const kacheln = werkKacheln(m);
  for (const k of kacheln) {
    const nr = k.i < 0 ? "standard" : String(k.i);
    if (m.werkInfo?.[nr]?.produkt) continue;
    const w = K.werke[k.i < 0 ? 0 : k.i + 1];
    if (w?.datei) await bauen(K.kennung, nr, w.datei.replace(/^m-/, ""), m, k);
  }
}

writeFileSync("/tmp/repro/druck-auftraege.json", JSON.stringify(auftraege, null, 1));
console.log("Aufträge:", auftraege.length);
if (fehlt.length) console.log("ohne hochaufgelöste Quelle:", fehlt.length, "→", fehlt.slice(0, 12).join(", "));
