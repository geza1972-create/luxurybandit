import { readFileSync, existsSync } from "node:fs";
import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";
import { mandantLesen, mandantSpeichern, mandantAnlegen } from "@/lib/versusforge-mandanten";
import { motivPfad } from "@/lib/versusforge-moderation";

/**
 * DIE MEISTER-SEITEN (Owner 15.09.2026: „die nimmst du jetzt alles").
 *
 * EINE TABELLE, AUS DER ALLES FOLGT — dieselbe Form wie bei Van Gogh: Profilbild, Kurztext,
 * Werke mit Geschichte, danach Tricou und Hanorac mit einem Satz über den Maler.
 *
 * ALLE WERKE GEMEINFREI, alle Scans von Wikimedia Commons als „Public domain" ausgewiesen.
 * Das Museum steht JE WERK — ein pauschaler Satz wäre bei der Hälfte falsch.
 *
 * `portal: false` — sie erscheinen im eigenen Reiter „Reproduceri", nicht unter „Artiști";
 * der Reiter filtert über `reproduktion`.
 */
/* Owner 15.09.2026: „romanii nu zic tiparituri. ei zic printuri." */
const VERKAUF = "Noi vindem printuri după acest tablou, în dimensiunea pe care o alegi.";
const M = (haus) => `Originalul se află la ${haus}.`;

export const MEISTER = [
  {
    kennung: "klimt", name: "Gustav Klimt", portret: "m-klimt-portret",
    ueber: "Gustav Klimt (1862–1918) a fost unul dintre fondatorii Secesiunii vieneze. A pictat societatea Vienei de la începutul secolului — mai ales femeile ei — și a folosit foi de aur adevărat în tablourile din perioada lui cea mai cunoscută.",
    spruch: "A pus aur pe pânză. Nu ca să strălucească — ca să rămână.",
    werke: [
      { datei: "m-klimt-kuss", titel: "Sărutul", jahr: "1908", haus: "Galeria Belvedere, Viena",
        text: "Doi oameni pe marginea unei stânci, într-un câmp de aur. El o ține, ea închide ochii; nimeni nu știe dacă e un început sau o despărțire." },
      { datei: "m-klimt-adele", titel: "Adele Bloch-Bauer I", jahr: "1907", haus: "Neue Galerie, New York",
        text: "I-a trebuit patru ani și peste o sută de schițe. Tabloul a fost furat, ascuns, redenumit și abia după șaizeci de ani i s-a spus din nou pe nume." },
      { datei: "m-klimt-lebensbaum", titel: "Pomul vieții", jahr: "1909", haus: "Muzeul de Arte Aplicate (MAK), Viena",
        text: "Ramurile se răsucesc în spirale care nu duc nicăieri și se întorc de unde au plecat. A desenat-o pentru un perete, nu pentru o ramă." },
    ],
  },
  {
    kennung: "monet", name: "Claude Monet", portret: "m-monet-portret",
    ueber: "Claude Monet (1840–1926) a dat numele impresionismului, fără să vrea: un critic a luat titlul unui tablou de-al lui drept insultă. A pictat aceeași scenă de zeci de ori, ca să prindă lumina care se schimbă.",
    spruch: "A pictat aceeași apă de zeci de ori. Niciodată la fel.",
    werke: [
      { datei: "m-monet-impresie", titel: "Impresie, răsărit de soare", jahr: "1872", haus: "Musée Marmottan Monet, Paris",
        text: "Un port în ceață și un soare portocaliu, pictat în câteva ore. De la titlul acestui tablou i se trage numele unei mișcări întregi — a fost gândit ca o batjocură." },
      { datei: "m-monet-nuferi", titel: "Nuferi", jahr: "1916", haus: "Musée d'Orsay, Paris",
        text: "Și-a săpat singur iazul și l-a plantat cu nuferi, ca să aibă ce picta. Aproape nu se mai vede malul; rămâne doar apa și ce cade în ea." },
      { datei: "m-monet-maci", titel: "Câmp de maci", jahr: "1873", haus: "Musée d'Orsay, Paris",
        text: "O femeie și un copil coboară printr-un câmp roșu, iar în spate, aproape ascunși, mai sunt doi. Aceeași plimbare, de două ori, la câteva minute distanță." },
    ],
  },
  {
    kennung: "hokusai", name: "Katsushika Hokusai", portret: "m-hokusai-portret",
    ueber: "Katsushika Hokusai (1760–1849) și-a schimbat numele de peste treizeci de ori. Seria celor treizeci și șase de vederi ale muntelui Fuji a făcut-o trecut de șaptezeci de ani; spunea că abia de la optzeci va începe să înțeleagă ceva.",
    spruch: "La șaptezeci de ani a început opera vieții lui.",
    werke: [
      { datei: "m-hokusai-val", titel: "Marele val de la Kanagawa", jahr: "cca. 1830", haus: "The Metropolitan Museum of Art, New York",
        text: "Valul nu s-a prăbușit încă. Bărcile sunt tot acolo, oamenii sunt tot acolo, iar muntele din spate așteaptă fără grabă." },
      { datei: "m-hokusai-fuji", titel: "Fuji roșu, dimineață senină", jahr: "cca. 1830", haus: "The Metropolitan Museum of Art, New York",
        text: "Muntele se face roșu doar câteva dimineți pe an, la sfârșit de vară. A stat destul ca să prindă una." },
    ],
  },
  {
    kennung: "munch", name: "Edvard Munch", portret: "m-munch-portret",
    ueber: "Edvard Munch (1863–1944) a pictat frica, gelozia și singurătatea pe vremea când se picta încă mai ales ce e frumos. A lucrat toată viața la aceleași teme, în variante care se întorc mereu.",
    spruch: "A pictat ce simțea, nu ce se vedea.",
    werke: [
      { datei: "m-munch-tipat", titel: "Țipătul", jahr: "1893", haus: "Galeria Națională, Oslo",
        text: "Se plimba cu doi prieteni când cerul s-a făcut roșu. Ei au mers mai departe; el a rămas pe loc. A scris despre asta înainte să-l picteze." },
      { datei: "m-munch-madona", titel: "Madona", jahr: "1894–95", haus: "Galeria Națională, Oslo",
        text: "O figură cu ochii închiși, între extaz și sfârșit. A făcut-o în mai multe variante, niciuna blândă." },
      { datei: "m-munch-pod", titel: "Fetele de pe pod", jahr: "1901", haus: "Galeria Națională, Oslo",
        text: "Trei fete privesc în apă, cu spatele la noi. Nu vedem ce văd ele, și tocmai asta ține tabloul." },
    ],
  },
  {
    kennung: "friedrich", name: "Caspar David Friedrich", portret: "m-cdf-portret",
    ueber: "Caspar David Friedrich (1774–1840) a pictat oameni mici în peisaje uriașe, aproape întotdeauna din spate. Cine se uită la tablourile lui se uită peste umărul cuiva.",
    spruch: "Oamenii lui stau cu spatele. Ca să vezi ce văd ei.",
    werke: [
      { datei: "m-cdf-calator", titel: "Călător deasupra mării de ceață", jahr: "cca. 1818", haus: "Hamburger Kunsthalle, Hamburg",
        text: "Un om pe o stâncă, cu spatele la noi, în fața unei mări de ceață. Nu-i vedem fața — și de aceea putem fi noi." },
      { datei: "m-cdf-creta", titel: "Stâncile de cretă din Rügen", jahr: "cca. 1818", haus: "Museum Oskar Reinhart, Winterthur",
        text: "Trei oameni la marginea prăpastiei, fiecare uitându-se în altă parte. Alb orbitor sus, albastru fără fund jos." },
      { datei: "m-cdf-gheata", titel: "Marea de gheață", jahr: "1823–24", haus: "Hamburger Kunsthalle, Hamburg",
        text: "Plăci de gheață ridicate una peste alta, iar sub ele, abia vizibilă, o corabie strivită. Nu s-a vândut cât a trăit." },
    ],
  },
];

const legen = async (kennung, nr, datei) => {
  const p = `/tmp/repro/${datei}.jpg`;
  if (!existsSync(p)) { console.log("   fehlt:", datei); return false; }
  const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(motivPfad(kennung, nr))}`, {
    method: "POST", headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: new Uint8Array(readFileSync(p)),
  });
  return r.ok;
};

const nur = process.env.NUR ? process.env.NUR.split(",") : null;
/**
 * ── DIESE DATEI DARF BEIM IMPORTIEREN NICHTS TUN (16.09.2026, zum zweiten Mal passiert) ─────
 *
 * Wer nur die Tabelle `MEISTER` braucht (etwa die Auftragsliste für die Druckdateien), holte
 * sie mit `import` — und legte damit alle Meister neu an: `portal: false`, Film-Merker weg,
 * Bilder neu hochgeladen. Zweimal heute. Ab jetzt läuft der Teil nur noch, wenn die Datei
 * ABSICHTLICH gestartet wird (`MEISTER_ANLEGEN=1 npx tsx ./scratch-meister.mjs`).
 */
if (process.env.MEISTER_ANLEGEN === "1") {

for (const K of MEISTER) {
  if (nur && !nur.includes(K.kennung)) continue;
  console.log("== " + K.kennung);

  let m = await mandantLesen(K.kennung);
  if (!m) {
    await mandantAnlegen(K.kennung, {
      firma: K.name, sprache: "ro", hook: K.werke[0].text,
      unterzeile: "", karten: [], knopf: "", fein: "", mail: "geza1972@gmail.com",
    });
    m = await mandantLesen(K.kennung);
  }
  if (!m) { console.log("   konnte nicht anlegen"); continue; }

  const kacheln = [
    ...K.werke.map((w, i) => ({ nr: i === 0 ? "standard" : String(i - 1), ...w })),
    /* Nach „standard" laufen die Kacheln bei 0 los: drei Werke belegen standard,0,1 — das Shirt ist dann 2. */
    { nr: String(K.werke.length - 1), datei: `produkt-shirt-${K.kennung}`, produkt: "tricou",
      titel: `Tricou negru · ${K.name.toUpperCase()}`, jahr: "",
      text: `Tricou negru, tipărit pe spate: «${K.spruch}»` },
    { nr: String(K.werke.length), datei: `produkt-hoodie-${K.kennung}`, produkt: "hanorac",
      titel: `Hanorac negru · ${K.name.toUpperCase()}`, jahr: "",
      text: `Hanorac negru, același text pe spate: «${K.spruch}»` },
  ];

  for (const k of kacheln) await legen(K.kennung, k.nr, k.datei);
  await legen(K.kennung, "profil", K.portret);

  const werkInfo = {};
  for (const k of kacheln) {
    werkInfo[k.nr] = { titel: k.titel, technik: "", groesse: "", jahr: k.jahr, ...(k.produkt ? { produkt: k.produkt } : {}) };
  }

  const text = (k) => k.haus ? `${k.text} ${M(k.haus)} ${VERKAUF}` : k.text;
  const ok = await mandantSpeichern(K.kennung, {
    ...m,
    name: K.name, firma: K.name, sprache: "ro",
    hook: text(kacheln[0]),
    hooks: kacheln.slice(1).map(text),
    werkInfo,
    ueberMich: `${K.ueber} Noi vindem printuri după opere intrate în domeniul public; originalele rămân în muzee. Printăm la comandă.`,
    preisSpanne: "",
    reproduktion: true,
    profilBild: true,
    freigabe: "frei", freigabeAm: new Date().toISOString(), portal: false,
  });
  console.log("   gespeichert:", ok, "→ https://lakatosbandi.com/" + K.kennung);
}
}
