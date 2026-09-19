import { readFileSync } from "node:fs";
import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { motivPfad } from "@/lib/versusforge-moderation";

/**
 * DIE GANZE VAN-GOGH-SEITE IN EINEM ZUG (Owner 15.09.2026: „jetzt noch zwei bilder von van gogh").
 *
 * REIHENFOLGE IST ABSICHT: erst die Gemälde, dann die Kleidungsstücke. Wer die Seite öffnet,
 * soll Kunst sehen und nicht zuerst einen Shop.
 *
 * Alle drei Originale hängen im Metropolitan Museum of Art; die Scans kommen von dort
 * (Open Access). `produkt` markiert die beiden Textilien — dort bietet der Agent nur dieses
 * eine Material an.
 */
const K = "vangogh";
const MUSEUM = "Originalul se află la The Metropolitan Museum of Art, New York.";
const VERKAUF = "Noi vindem tipărituri după acest tablou, în dimensiunea pe care o alegi.";
const SPRUCH = "Nu a vândut aproape nimic. Nu s-a oprit niciodată.";

/** Kachel „standard" bleibt, wie sie ist — hier stehen nur die weiteren. */
const WEITERE = [
  {
    nr: "0", datei: "/tmp/repro/w-irisi.jpg",
    titel: "Irisi", jahr: "1890",
    text: `Le-a pictat în ultima lui primăvară, în grădina azilului, la câțiva pași de fereastră. Fiecare floare stă altfel; niciuna nu se repetă. Pictat în 1890. ${MUSEUM} ${VERKAUF}`,
  },
  {
    nr: "1", datei: "/tmp/repro/w-bocanci.jpg",
    titel: "Bocancii", jahr: "1888",
    text: `O pereche de bocanci purtați, atât. Nimeni nu picta așa ceva pe atunci — se picta ce merita privit. El a pus pe pânză ce mersese cel mai mult. Pictat în 1888. ${MUSEUM} ${VERKAUF}`,
  },
  {
    nr: "2", datei: "/tmp/repro/produkt-shirt.jpg", produkt: "tricou",
    titel: "Tricou negru · VAN GOGH", jahr: "",
    text: `Tricou negru, tipărit pe spate: «${SPRUCH}» Nimeni nu întreabă despre cine e vorba fără să se uite a doua oară.`,
  },
  {
    nr: "3", datei: "/tmp/repro/produkt-hoodie.jpg", produkt: "hanorac",
    titel: "Hanorac negru · VAN GOGH", jahr: "",
    text: `Hanorac negru, același text pe spate: «${SPRUCH}» Se poartă iarna, se citește tot anul.`,
  },
];

const hoch = async (nr, datei) => {
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(motivPfad(K, nr))}`, {
    method: "POST", headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: new Uint8Array(readFileSync(datei)),
  });
  console.log(" ", res.ok ? "hoch" : "FEHLER", nr, res.status);
};

const m = await mandantLesen(K);
if (!m) { console.log("kein Mandant"); process.exit(1); }

for (const w of WEITERE) await hoch(w.nr, w.datei);

const werkInfo = { standard: m.werkInfo?.standard ?? {} };
for (const w of WEITERE) {
  werkInfo[w.nr] = { titel: w.titel, technik: "", groesse: "", jahr: w.jahr, ...(w.produkt ? { produkt: w.produkt } : {}) };
}

const ok = await mandantSpeichern(K, { ...m, hooks: WEITERE.map(w => w.text), werkInfo });
console.log("gespeichert:", ok, "→ https://lakatosbandi.com/vangogh");
