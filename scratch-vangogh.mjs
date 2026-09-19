import { readFileSync } from "node:fs";
import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { motivPfad } from "@/lib/versusforge-moderation";

/**
 * DIE VAN-GOGH-SEITE, EINMAL GANZ (15.09.2026).
 *
 * EINE LISTE, AUS DER ALLES FOLGT: Bilder, Reihenfolge, Titel, Texte. Vorher habe ich bei jeder
 * Ergänzung die Kacheln verschoben und dabei Bilder von Hand umkopiert — bei der dritten
 * Änderung ist das der Weg, auf dem ein Shirt unter einem Gemälde landet.
 *
 * REIHENFOLGE: erst die Gemälde, zuletzt die Kleidung. Wer die Seite öffnet, soll Kunst sehen.
 *
 * DAS MUSEUM STEHT JE WERK, nicht pauschal: Vier hängen im Met, die Noapte înstelată im MoMA
 * (Owner 15.09.2026: „was ist mit sterne nacht?"). Ein pauschaler Satz wäre bei einem davon
 * schlicht falsch.
 *
 * Das Selbstporträt ist jetzt AUCH ein Werk, nicht nur das Profilbild (Owner: „dann sein
 * porträt finden sie cool").
 */
const K = "vangogh";
const MET = "Originalul se află la The Metropolitan Museum of Art, New York.";
const MOMA = "Originalul se află la Museum of Modern Art (MoMA), New York.";
const KM = "Originalul se află la Muzeul Kröller-Müller, Otterlo.";
const ORSAY = "Originalul se află la Musée d'Orsay, Paris.";
const VGM = "Originalul se află la Muzeul Van Gogh, Amsterdam.";
const NG = "Originalul se află la National Gallery, Londra.";
const VERKAUF = "Noi vindem tipărituri după acest tablou, în dimensiunea pe care o alegi.";
const SPRUCH = "Nu a vândut aproape nimic. Nu s-a oprit niciodată.";

const WERKE = [
  {
    nr: "standard", datei: "/tmp/repro/web-vangogh.jpg",
    titel: "Lan de grâu cu chiparoși", jahr: "1889",
    text: `Chiparosul stă de veghe la marginea lanului, singurul care nu se apleacă. Se spune că în vara aceea cerul n-a stat locului nicio zi. Cine trece pe drumul de dedesubt nu-l vede niciodată la fel. Pictat în 1889, în anul petrecut la Saint-Rémy. ${MET} ${VERKAUF}`,
  },
  {
    nr: "0", datei: "/tmp/repro/w-noapte-web.jpg",
    titel: "Noapte înstelată", jahr: "1889",
    text: `Un chiparos leagă pământul de cer, iar satul de dedesubt doarme fără să știe ce se întâmplă deasupra lui. A pictat-o din memorie, dintr-o cameră cu gratii la fereastră. Pictat în 1889. ${MOMA} ${VERKAUF}`,
  },
  {
    nr: "1", datei: "/tmp/repro/w-portret.jpg",
    titel: "Autoportret cu pălărie de paie", jahr: "1887",
    text: `S-a pictat pe sine de zeci de ori, pentru că nu avea bani de model. Se uită drept la tine și nu cere nimic. Pictat în 1887. ${MET} ${VERKAUF}`,
  },
  /* Die vier meistverkauften Motive deutscher Posterhändler (Posterlounge, 15.09.2026) —
     Owner: „ja, die nimmst du". */
  {
    nr: "2", datei: "/tmp/repro/w-cafe.jpg",
    titel: "Terasa cafenelei noaptea", jahr: "1888",
    text: `Nicio stea nu e la fel ca vecina ei, iar sub ele oamenii stau la masă ca într-o seară oarecare. E primul lui tablou cu cer înstelat; tot restul a venit după. Pictat în 1888. ${KM} ${VERKAUF}`,
  },
  {
    nr: "3", datei: "/tmp/repro/w-rhone.jpg",
    titel: "Noapte înstelată peste Ron", jahr: "1888",
    text: `Lumini de oraș pe apă și doi oameni la mal, atât de mici încât aproape îi pierzi. A pictat noaptea, afară, cu lumânări prinse de pălărie. Pictat în 1888. ${ORSAY} ${VERKAUF}`,
  },
  {
    nr: "4", datei: "/tmp/repro/w-mandel.jpg",
    titel: "Floare de migdal", jahr: "1890",
    text: `L-a pictat când i s-a născut nepotul, care a primit numele lui. Ramuri în floare pe cer albastru — singurul tablou pe care l-a făcut pentru cineva anume. Pictat în 1890. ${VGM} ${VERKAUF}`,
  },
  {
    nr: "5", datei: "/tmp/repro/w-floarea.jpg",
    titel: "Floarea-soarelui", jahr: "1888",
    text: `Le-a pictat ca să împodobească odaia unui prieten care urma să vină. Unele sunt deja trecute; le-a lăsat așa. Pictat în 1888. ${NG} ${VERKAUF}`,
  },
  {
    nr: "6", datei: "/tmp/repro/w-irisi.jpg",
    titel: "Irisi", jahr: "1890",
    text: `Le-a pictat în ultima lui primăvară, în grădina azilului, la câțiva pași de fereastră. Fiecare floare stă altfel; niciuna nu se repetă. Pictat în 1890. ${MET} ${VERKAUF}`,
  },
  {
    nr: "7", datei: "/tmp/repro/w-bocanci.jpg",
    titel: "Bocancii", jahr: "1888",
    text: `O pereche de bocanci purtați, atât. Nimeni nu picta așa ceva pe atunci — se picta ce merita privit. El a pus pe pânză ce mersese cel mai mult. Pictat în 1888. ${MET} ${VERKAUF}`,
  },
  {
    nr: "8", datei: "/tmp/repro/produkt-shirt.jpg", produkt: "tricou",
    titel: "Tricou negru · VAN GOGH", jahr: "",
    text: `Tricou negru, tipărit pe spate: «${SPRUCH}» Nimeni nu întreabă despre cine e vorba fără să se uite a doua oară.`,
  },
  {
    nr: "9", datei: "/tmp/repro/produkt-hoodie.jpg", produkt: "hanorac",
    titel: "Hanorac negru · VAN GOGH", jahr: "",
    text: `Hanorac negru, același text pe spate: «${SPRUCH}» Se poartă iarna, se citește tot anul.`,
  },
];

const legen = async (nr, datei) => {
  const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(motivPfad(K, nr))}`, {
    method: "POST", headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: new Uint8Array(readFileSync(datei)),
  });
  console.log(" ", r.ok ? "hoch" : "FEHLER", nr, r.status);
};

const m = await mandantLesen(K);
if (!m) { console.log("kein Mandant"); process.exit(1); }

for (const w of WERKE) await legen(w.nr, w.datei);

const werkInfo = {};
for (const w of WERKE) {
  werkInfo[w.nr] = { titel: w.titel, technik: "", groesse: "", jahr: w.jahr, ...(w.produkt ? { produkt: w.produkt } : {}) };
}

const ok = await mandantSpeichern(K, {
  ...m,
  hook: WERKE[0].text,
  hooks: WERKE.slice(1).map(w => w.text),
  werkInfo,
});
console.log("gespeichert:", ok, "→ https://lakatosbandi.com/vangogh");
