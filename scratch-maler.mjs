import { readFileSync, existsSync } from "node:fs";
import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";
import { mandantLesen, mandantSpeichern, mandantAnlegen } from "@/lib/versusforge-mandanten";
import { motivPfad } from "@/lib/versusforge-moderation";

/**
 * EIN PROFIL JE MALER (Owner 15.09.2026: «ich dachte du machst für jeden künstler ein profil»
 * · «die geschichte des bildes und wo sie hängt. Wann wurde das gemacht. also über das original
 * und was wir verkaufen prints, preise auf anfrage»).
 *
 * Alle sechs Originale hängen im Metropolitan Museum of Art, New York — von dort stammen auch
 * die Scans (Open Access). Das steht an jedem Werk, damit niemand denkt, wir verkauften das
 * Original.
 *
 * portal: false — sie stehen NICHT in der Künstlerübersicht neben den lebenden Künstlern.
 */
const MUSEUM = "Originalul se află la The Metropolitan Museum of Art, New York.";
const VERKAUF = "Noi vindem tipărituri după acest tablou, în dimensiunea pe care o alegi. Preț la cerere.";

const MALER = [
  {
    kennung: "vangogh", name: "Vincent van Gogh", portrait: "p-vangogh", werk: "vangogh",
    titel: "Lan de grâu cu chiparoși", jahr: "1889",
    ueberMich: "Vincent van Gogh (1853–1890) a pictat abia zece ani din viață și a vândut foarte puțin cât a trăit. A lucrat repede, uneori un tablou pe zi. Astăzi lucrările lui atârnă în cele mai mari muzee ale lumii.",
    text: "Chiparosul stă de veghe la marginea lanului, singurul care nu se apleacă. Se spune că în vara aceea cerul n-a stat locului nicio zi. Cine trece pe drumul de dedesubt nu-l vede niciodată la fel. Pictat în 1889, în anul petrecut la Saint-Rémy.",
  },
  {
    kennung: "vermeer", name: "Johannes Vermeer", portrait: "", werk: "vermeer",
    titel: "Tânără cu ulcior", jahr: "cca. 1662",
    ueberMich: "Johannes Vermeer (1632–1675) a trăit toată viața la Delft. Se cunosc în jur de treizeci și cinci de tablouri de-ale lui — atât. Timp de două secole a fost aproape uitat; abia în secolul al XIX-lea a fost redescoperit. Nu se păstrează niciun portret sigur al lui.",
    text: "A deschis fereastra înainte să toarne apa și a rămas așa, cu mâna pe ramă. Dimineața aceea nu i-a cerut nimic. Poate de aceea a ținut-o cineva minte trei sute de ani. Pictat în jurul anului 1662.",
  },
  {
    kennung: "hokusai", name: "Katsushika Hokusai", portrait: "", werk: "hokusai",
    titel: "Marele val de la Kanagawa", jahr: "cca. 1830",
    ueberMich: "Katsushika Hokusai (1760–1849) și-a schimbat numele de peste treizeci de ori de-a lungul vieții. Seria «Treizeci și șase de vederi ale muntelui Fuji» a făcut-o trecut de șaptezeci de ani. Spunea că abia de la optzeci va începe să înțeleagă ceva.",
    text: "Valul nu s-a prăbușit încă. Bărcile sunt tot acolo, oamenii sunt tot acolo, iar muntele din spate așteaptă fără grabă. Tabloul se oprește cu o clipă înainte de răspuns. Tipărit în jurul anului 1830.",
  },
  {
    kennung: "sargent", name: "John Singer Sargent", portrait: "", werk: "sargent",
    titel: "Madame X", jahr: "1883–84",
    ueberMich: "John Singer Sargent (1856–1925) a fost cel mai căutat portretist al epocii sale. După scandalul stârnit de «Madame X» la Paris, s-a mutat la Londra. Tabloul a rămas în atelierul lui mai bine de treizeci de ani.",
    text: "Când tabloul a fost arătat lumii, Parisul a vorbit o lună întreagă despre o bretea. Ea nu a privit înapoi niciodată. Rochia neagră a rămas, scandalul s-a uitat. Pictat între 1883 și 1884.",
  },
  {
    kennung: "klimt", name: "Gustav Klimt", portrait: "", werk: "klimt",
    titel: "Mäda Primavesi", jahr: "1912–13",
    ueberMich: "Gustav Klimt (1862–1918) a fost unul dintre fondatorii Secesiunii vieneze. A pictat societatea Vienei de la începutul secolului — mai ales femeile ei. Pentru fiecare portret făcea zeci de schițe pregătitoare.",
    text: "Avea nouă ani și a refuzat să stea cuminte. Pictorul a schimbat de mai multe ori poziția; ea a rămas cu picioarele depărtate și bărbia sus. Copilul care nu cedează e singurul lucru din tablou care nu s-a învechit. Pictat în 1912–13.",
  },
  {
    kennung: "rosabonheur", name: "Rosa Bonheur", portrait: "p-bonheur", werk: "bonheur",
    titel: "Târgul de cai", jahr: "1852–55",
    ueberMich: "Rosa Bonheur (1822–1899) a fost cea mai cunoscută pictoriță a secolului ei. Ca să poată lucra în târguri și abatoare, a cerut și a primit permisiunea oficială de a umbla îmbrăcată bărbătește. «Târgul de cai» i-a adus faimă în toată Europa.",
    text: "Ca să vadă caii de aproape, a cerut permisiune să umble îmbrăcată bărbătește. Târgul nu s-a oprit pentru ea. A stat acolo până a știut pe dinafară cum cade lumina pe o coamă în mișcare. Pictat între 1852 și 1855.",
  },
];

const hoch = async (kennung, nr, datei) => {
  const p = `/tmp/repro/${datei}.jpg`;
  if (!existsSync(p)) return console.log("fehlt:", p);
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(motivPfad(kennung, nr))}`, {
    method: "POST", headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: new Uint8Array(readFileSync(p)),
  });
  console.log(" ", res.ok ? "hoch" : "FEHLER", nr, res.status);
};

/* ERST EINER (Owner 15.09.2026: „zeig mir zuerst einen künstler") — die anderen fünf
   entstehen erst, wenn er diesen gutheisst. */
for (const M of MALER.filter(x => x.kennung === (process.env.NUR ?? "vangogh"))) {
  let m = await mandantLesen(M.kennung);
  if (!m) {
    await mandantAnlegen(M.kennung, {
      firma: M.name, sprache: "ro", hook: M.text,
      unterzeile: "", karten: [], knopf: "", fein: "", mail: "geza1972@gmail.com",
    });
    m = await mandantLesen(M.kennung);
  }
  if (!m) { console.log("konnte nicht anlegen:", M.kennung); continue; }
  console.log(M.kennung);
  await hoch(M.kennung, "standard", `web-${M.werk}`);
  if (M.portrait) await hoch(M.kennung, "profil", M.portrait);
  const ok = await mandantSpeichern(M.kennung, {
    ...m,
    name: M.name, firma: M.name, sprache: "ro",
    hook: `${M.text} ${MUSEUM} ${VERKAUF}`,
    hooks: [],
    werkInfo: { standard: { titel: M.titel, technik: "", groesse: "", jahr: M.jahr } },
    ueberMich: `${M.ueberMich} Noi vindem tipărituri după opere intrate în domeniul public; originalele rămân în muzee. Tipărim la comandă. Preț la cerere.`,
    preisSpanne: "",
    reproduktion: true,
    /* Ohne diesen Merker nimmt die Seite das Werk als Profilbild (app/portal/[kuenstler]/page.tsx). */
    ...(M.portrait ? { profilBild: true } : {}),
    freigabe: "frei", freigabeAm: new Date().toISOString(), portal: false,
  });
  console.log("  gespeichert:", ok, "→ https://lakatosbandi.com/" + M.kennung);
}
