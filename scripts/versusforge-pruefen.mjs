#!/usr/bin/env node
/**
 * DIE PRÜFUNG DES AGENTEN — dieselben fünf Gespräche nach jeder Änderung.
 *
 * ── WARUM ES DAS GEBEN MUSS (Owner 10.09.2026) ─────────────────────────────────────────────
 *
 * Auf die Frage, was einem guten Agenten fehlt, stand das hier weit oben: 83 Regeln können
 * sich widersprechen, und niemand merkt es. Heute sind vier dazugekommen. Ob dadurch etwas
 * anderes schlechter wurde, wusste bis zu diesem Skript niemand — auch ich nicht.
 *
 * ── ES PRÜFT NUR, WAS MESSBAR IST ──────────────────────────────────────────────────────────
 *
 * Ob ein Hook gut ist, entscheidet ein Mensch. Ob der Agent das Rezept ausplaudert, zweimal
 * dasselbe fragt, in der falschen Sprache antwortet oder einen Preis nennt, entscheidet eine
 * Zeichenkette. Genau das steht hier — und genau das sind die Fehler, die im Prüflauf immer
 * wieder aufgetaucht sind.
 *
 * ── WAS ES KOSTET ──────────────────────────────────────────────────────────────────────────
 *
 * Fünf Gespräche à drei Zügen ≈ 15 Modellaufrufe ≈ 5 Cent. Es ruft ein echtes Modell auf;
 * das ist Absicht, denn eine Regel wirkt nur dort. Mit `--eins <name>` läuft ein einzelner
 * Fall, wenn man nicht alle braucht.
 *
 * Aufruf:  node scripts/versusforge-pruefen.mjs [--eins zahnarzt] [--adresse http://localhost:3000]
 */

import sharp from "sharp";

/* Testbilder für den Maler: geometrische Flächen in wechselnden Farben — derselbe Stil, drei
   verschiedene Werke. Im Skript erzeugt, damit keine fremden Bilder im Repo liegen. */
const FARBEN = [["#1f3a93", "#f2c14e", "#e9e4d8"], ["#b83b2e", "#1f3a93", "#efe9dd"], ["#2f6f5e", "#e07a2f", "#f1ece2"], ["#402a5c", "#d9a441", "#ece6da"]];
async function testBild(nr) {
  const [a, b, grund] = FARBEN[nr % FARBEN.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="${grund}"/>
    <rect x="${60 + nr * 20}" y="80" width="260" height="360" fill="${a}"/><circle cx="${400 - nr * 15}" cy="${520 + nr * 10}" r="150" fill="${b}"/>
    <rect x="300" y="${150 + nr * 30}" width="220" height="40" fill="#161616"/><rect x="90" y="600" width="180" height="120" fill="none" stroke="#161616" stroke-width="14"/></svg>`;
  const png = await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
  return `data:image/jpeg;base64,${png.toString("base64")}`;
}

const args = process.argv.slice(2);
const wert = (n, s) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : s; };
const BASIS = wert("--adresse", "http://localhost:3000");
const NUR = wert("--eins", "");

/* ── DIE FÄLLE ──────────────────────────────────────────────────────────────────────────────
   Sie decken ab, woran es im echten Betrieb geschiefgegangen ist: ein Dienstleister, ein
   Restaurant auf Rumänisch, ein Künstler mit Einzelstücken, ein Handwerker — und einer, der
   nichts hergibt. Der letzte ist der wichtigste: Er prüft, dass NICHTS geliefert wird. */
const FAELLE = [
  {
    name: "zahnarzt", sprache: "de",
    zuege: [
      "Ich habe eine Zahnarztpraxis in Timisoara und mache Implantate.",
      "Die Leute können danach wieder in einen Apfel beissen, ohne Angst.",
      "Wir machen das seit 18 Jahren, mein Vater hat die Praxis 1998 aufgemacht.",
    ],
  },
  {
    name: "restaurant-ro", sprache: "ro",
    zuege: [
      "Am un restaurant cu terasă lângă piscină în Timișoara.",
      "Facem miel la grătar pe cărbune, reteta bunicii.",
      "Avem doar 40 de locuri, seara se ocupă repede.",
    ],
  },
  {
    name: "kuenstler", sprache: "de",
    zuege: [
      "Ich verkaufe Bilder, Acryl auf Leinwand, aus meinem Atelier in Timisoara.",
      "Das nächste ist ein Blau, das ich aus Pigment selbst anrühre. Jedes Bild gibt es einmal.",
      "Meine Käufer hängen es ins Wohnzimmer, wo Besuch als Erstes hinschaut.",
    ],
  },
  {
    name: "klima", sprache: "de",
    zuege: [
      "Ich montiere Klimaanlagen in Timisoara.",
      "Nach der Montage schlafen die Leute wieder durch, auch bei 38 Grad.",
      "Wir sind zu zweit und schaffen drei Montagen am Tag, im Juli sind wir voll.",
    ],
  },
  {
    /* DER WICHTIGSTE FALL: Hier ist BESTEHEN, dass nichts geliefert wird. */
    name: "leer", sprache: "de", leer: true,
    zuege: [
      "Ich habe eine Autowerkstatt.",
      "Nichts besonderes, wie überall.",
      "Kann ich nicht sagen, keine Ahnung.",
    ],
  },
  {
    /* DER MALER MIT BILDERN (10.09.2026, Kunst-Rezept). Geprüft wird die Aufnahme: Mit einem
       Bild darf nichts gebaut werden, erst ab drei im selben Stil. Die Bilder entstehen hier im
       Skript (geometrische Flächen, drei im selben Stil) — keine fremden Werke im Repo. */
    name: "maler", sprache: "en", kunst: true,
    zuege: [
      { text: "I paint and want to sell my work.", bilder: 1 },
      { text: "Yes, this is my style. Here are two more.", bilder: 2 },
      "Mostly people who furnish their living room.",
      "I ask 1,200 euro per painting. I have not sold one yet.",
      "I looked at what other painters ask online.",
    ],
  },
];

/* ── DIE REGELN, DIE EINE MASCHINE PRÜFEN KANN ───────────────────────────────────────────── */

/**
 * DAS REZEPT BLEIBT DRINNEN — aber die Prüfung muss zwischen zwei Dingen unterscheiden.
 *
 * ── WARUM DIE ERSTE FASSUNG ZU GROB WAR (10.09.2026, im ersten Durchlauf) ───────────────────
 *
 * Sie schlug bei jedem Vorkommen an, und damit auch bei „Welche BELEGE hast du, dass das bei
 * Patienten klappt?" — einer vollkommen richtigen Frage. „Beleg", „Herkunft" und „Wirkung"
 * sind ganz normale deutsche Wörter; sie zu verbieten hiesse, dem Agenten die Sprache zu
 * nehmen, in der er über sein Handwerk reden soll.
 *
 * ── WIE DER ECHTE FEHLER AUSSAH ────────────────────────────────────────────────────────────
 *
 * „das macht Herkunft, Verfahren und Knappheit zur Basis" — MEHRERE Hebelnamen in einer
 * Aufzählung, oder einer davon neben einem Wort, das die Arbeitsweise benennt. Das ist das
 * Muster, und nur das wird gemeldet:
 *
 *   · zwei oder mehr Hebelnamen in EINER Antwort, oder
 *   · ein Hebelname im Umkreis eines Bauwortes (Basis, Formel, Rezept, Schritt, Stufe …), oder
 *   · ein Wort, das ausserhalb dieses Rezepts kaum vorkommt („Hebel", „Knappheit").
 *
 * Ein einzelnes „Beleg" in einer Frage an ihn ist damit erlaubt — so, wie es sein soll.
 */
const HEBELWOERTER = [
  "zweck", "herkunft", "wirkung", "beleg", "knappheit", "identität",
  "scop", "proveniență", "efect", "dovadă", "limită",
  "purpose", "origin", "proof", "scarcity",
];
/* Diese verraten die Arbeitsweise für sich allein — sie kommen in einem Gespräch über eine
   Bäckerei nicht zufällig vor. */
const VERRAETER = /\b(hebel|p[âa]rghi\w*|lever)\b/i;
/* Ein Hebelname neben einem dieser Wörter beschreibt UNSER Vorgehen, nicht seinen Betrieb. */
const BAUWORT = /\b(basis|formel|rezept|schritt|stufe|baustein|punkte?|kriteri\w+|re[țt]et\w+|pa[șs]\w*|formul\w+)\b/i;

/* Begeisterungswörter — sie stehen als Verbot im Auftrag. */
const FLOSKELN = ["super", "großartig", "grossartig", "spannend", "tolles projekt", "danke fürs teilen", "wunderbar", "fantastisch"];

/* Unbelegbare Behauptung über sich selbst (Hausregel aus David). */
const SCHULUNG = /\b(trainiert|geschult|ausgebildet|antrenat|instruit|trained)\b/i;

/* Preise nennt er von sich aus nie. */
const PREIS = /\b(299|9[.,]99|5000|5\.000)\b|\beuro\b|€/i;

/* Deutsche Funktionswörter — in einem rumänischen Lauf ist jedes davon ein Fehler. */
const DEUTSCH = /(^|\W)(und|oder|nicht|dein|deine|was|wie|ist|sind|für|mit|kannst|hast)(\W|$)/i;

const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();

/* Der Fragesatz und seine tragenden Wörter — dieselbe Rechnung wie im Agenten (route.ts). */
const FUELLWOERTER = new Set(
  "was wer wie wo der die das den dem des ein eine einen einer eines er sie es du ich wir ihr oder und so danach vorher mir dir sag noch schon auch what who how the and you your for que care cum sau din pentru".split(" "),
);
const frageSatz = (t) => {
  const text = t.split("\n").filter(z => !z.trimStart().startsWith(">>")).join(" ");
  return text.includes("?") ? (text.split("?")[0].split(/[.!:;]\s/).pop() ?? "").trim() : "";
};
const frageWoerter = (t) => new Set(
  frageSatz(t).toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(w => w.length > 2 && !FUELLWOERTER.has(w)),
);
const naehe = (a, b) => Math.min(a.size, b.size) < 2 ? 0 : [...a].filter(w => b.has(w)).length / Math.min(a.size, b.size);

function pruefeZug({ antwort, sprache, fragenBisher, vorschlaege }) {
  const m = [];
  const klein = antwort.toLowerCase();

  /**
   * ── DIE ANGEBOTENEN SÄTZE ZÄHLEN NICHT ALS FRAGEN (10.09.2026, zweiter Fehlalarm) ─────────
   *
   * Der Prüfer meldete „4 Fragen in einer Antwort". Angesehen war es das hier: drei Hooks zur
   * Auswahl, jeder davon eine Frage — „Sie meiden Äpfel — schieben Sie es weiter auf?" — plus
   * die eine echte Frage „Welchen Satz willst du?". Also genau das Verhalten, das der Auftrag
   * verlangt.
   *
   * ES IST DERSELBE FEHLER WIE BEI DEN REZEPTWÖRTERN: Ein Prüfer, der die Form zählt, ohne
   * den Zweck zu kennen, meldet richtiges Verhalten als Mangel — und ein Prüfer, dem man
   * nicht glaubt, wird abgeschaltet.
   *
   * SIE LASSEN SICH SAUBER HERAUSRECHNEN, ohne zu raten: Die angebotenen Sätze kommen als
   * Chips zurück. Was als Chip dasteht, ist ein Angebot und keine Frage an ihn.
   */
  const ohneAngebote = (vorschlaege ?? [])
    .reduce((t, v) => t.split(v).join(" "), antwort);

  /**
   * ── DREI SÄTZE ZUR AUSWAHL, RICHTIG ANGEBOTEN? (10.09.2026, dritter Befund) ──────────────
   *
   * Beim Künstler standen drei Hooks untereinander, aber die Chips waren Etiketten
   * („Unikat: schon weg?") statt der Sätze — und keine Zeile sagte ihm, dass er wählen soll.
   * Der Prüfer hatte das als „3 Fragen" gemeldet: richtig angeschlagen, falsch benannt.
   *
   * ERKANNT WIRD DAS ANGEBOT AN SEINER FORM: mindestens zwei eigene Zeilen, die mit einem
   * Fragezeichen enden. Dann gilt:
   *   · jede dieser Zeilen muss wörtlich als Chip dastehen, sonst tippt er ein Bruchstück;
   *   · daneben muss es Text geben, der an IHN gerichtet ist, sonst weiss er nicht, was tun.
   */
  const angebotsZeilen = antwort.split("\n").map(z => z.trim()).filter(z => z.length > 12 && z.endsWith("?"));
  if (angebotsZeilen.length >= 2) {
    const fehlend = angebotsZeilen.filter(z => !(vorschlaege ?? []).some(v => v.trim() === z));
    if (fehlend.length) m.push(`Sätze zur Auswahl, aber ${fehlend.length} davon nicht wörtlich als Chip`);
    const rest = angebotsZeilen.reduce((t, z) => t.split(z).join(" "), antwort).replace(/\s+/g, " ").trim();
    if (rest.length < 10) m.push("Sätze zur Auswahl, aber keine Zeile an ihn, was er jetzt tun soll");
  }

  if (VERRAETER.test(antwort)) m.push("nennt die Arbeitsweise beim Namen");
  /**
   * WORTGENAU, NICHT ALS BUCHSTABENFOLGE (10.09.2026, dritter Fehlalarm des Prüfers).
   *
   * „origin" steckt in „Originalkunst", „efect" in „efectiv", „scop" in „Horoskop". Ein
   * Treffer zählt nur, wenn das Wort als Wort dasteht — mit den üblichen deutschen Endungen
   * (Beleg, Belege, Belegen), aber nicht als Anfang eines anderen Wortes.
   */
  const alsWort = (w) => new RegExp(`(^|[^\\p{L}])${w}(e|en|es|s|n)?($|[^\\p{L}])`, "iu");
  const gefunden = HEBELWOERTER.filter(w => alsWort(w).test(antwort));
  if (gefunden.length >= 2) m.push(`zählt das Rezept auf: ${gefunden.join(", ")}`);
  else if (gefunden.length === 1) {
    /* Ein einzelner Treffer zählt nur, wenn er neben einem Bauwort steht — dann beschreibt
       der Satz unser Vorgehen und nicht seinen Betrieb. */
    const i = klein.indexOf(gefunden[0]);
    const umkreis = klein.slice(Math.max(0, i - 40), i + 40);
    if (BAUWORT.test(umkreis)) m.push(`erklärt die Arbeitsweise: „…${umkreis.trim()}…"`);
  }
  for (const w of FLOSKELN) if (klein.includes(w)) m.push(`Floskel: ${w}`);
  if (SCHULUNG.test(antwort)) m.push("behauptet, geschult/trainiert zu sein");
  if (PREIS.test(antwort)) m.push("nennt Geld von sich aus");

  /* Höchstens EINE Frage je Antwort — steht so im Auftrag. */
  /* Die angebotenen Sätze sind keine Fragen an ihn — sie werden oben gesondert geprüft. */
  const nurAnIhn = angebotsZeilen.length >= 2
    ? angebotsZeilen.reduce((t, z) => t.split(z).join(" "), ohneAngebote)
    : ohneAngebote;
  const fragen = (nurAnIhn.match(/\?/g) ?? []).length;

  /**
   * DU UND SIE GEMISCHT (10.09.2026, beim Zahnarzt gesehen: „dass Ihre Implantate…").
   *
   * Geprüft wird nur der Text an IHN — die Hooks zur Auswahl und die Chips siezen zu Recht,
   * sie sind für seine Kunden. Und nur MITTEN im Satz: „Sie kommen wieder" am Satzanfang
   * kann „sie" (die Patienten) heissen; „dass Ihre Implantate" mitten im Satz ist die
   * Höflichkeitsform und damit der Fehler.
   */
  if (sprache === "de") {
    const anIhn = (vorschlaege ?? []).reduce((t, v) => t.split(v).join(" "), nurAnIhn);
    const siezt = anIhn.match(/(?<=[a-zäöüß,;:—–-]\s)(Sie|Ihre|Ihrem|Ihren|Ihrer|Ihnen)\b/);
    if (siezt) m.push(`siezt ihn: „…${anIhn.slice(Math.max(0, siezt.index - 25), siezt.index + 20).trim()}…"`);
  }
  if (fragen > 1) m.push(`${fragen} Fragen in einer Antwort`);

  /* Kurz: zwei bis vier Sätze. Deutlich mehr heisst, er hält einen Vortrag. */
  const saetze = antwort.split(/[.!?]+\s/).filter(s => s.trim().length > 3).length;
  if (saetze > 6) m.push(`${saetze} Sätze — zu lang`);

  if (sprache === "ro" && DEUTSCH.test(antwort)) m.push("deutsche Wörter in einer rumänischen Antwort");

  /* Dieselbe Frage zweimal — der Fehler, der im Prüflauf am häufigsten kam.
     GEMEINSAME WÖRTER STATT WORTLAUT (10.09.2026): Der Wortlaut-Vergleich zeigte ✓, während
     der Agent „können oder fühlen" zu „fühlen oder können" umstellte. Dieselbe Rechnung wie
     in `app/api/versusforge-agent/route.ts` — sonst prüft das Skript etwas anderes als der Agent. */
  const woerter = frageWoerter(nurAnIhn);
  const gleich = fragenBisher.find(f => naehe(woerter, frageWoerter(f)) >= 0.6);
  if (gleich) m.push(`stellt dieselbe Frage zum zweiten Mal: „${frageSatz(nurAnIhn)}?" ≈ „${frageSatz(gleich)}?"`);
  if (woerter.size >= 2) fragenBisher.push(nurAnIhn);

  return m;
}

/* ── LAUFEN ─────────────────────────────────────────────────────────────────────────────── */

const faelle = NUR ? FAELLE.filter(f => f.name === NUR) : FAELLE;
if (!faelle.length) { console.error(`Kein Fall namens "${NUR}".`); process.exit(2); }

let maengelGesamt = 0;
let euroGesamt = 0;
const zeilen = [];

for (const fall of faelle) {
  const verlauf = [];
  const fragenBisher = [];
  const maengel = [];
  let euro = 0, sekunden = 0, hookGebaut = false, rueckruf = false;

  let werke = [];
  let bildNr = 0;
  for (const zug of fall.zuege) {
    const text = typeof zug === "string" ? zug : zug.text;
    const fotos = [];
    for (let i = 0; i < (typeof zug === "string" ? 0 : zug.bilder ?? 0); i++) fotos.push(await testBild(bildNr++));
    verlauf.push({ rolle: "mensch", text });
    const t0 = Date.now();
    let d = {};
    const werkeVorher = werke.length;
    try {
      const res = await fetch(`${BASIS}/api/versusforge-agent`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verlauf, sprache: fall.sprache,
          device: `pruefung-${fall.name}`, gespraech: `pruefung-${fall.name}-${Date.now()}`,
          ...(fotos.length ? { fotos } : {}), werke,
        }),
      });
      d = await res.json();
    } catch (e) {
      maengel.push(`Aufruf fehlgeschlagen: ${e.message}`);
      break;
    }
    sekunden += (Date.now() - t0) / 1000;
    if (d.verbrauch) euro += (d.verbrauch.hinein / 1e6) * 0.23 + (d.verbrauch.heraus / 1e6) * 1.84;

    const antwort = String(d.antwort ?? "").trim();
    if (!antwort) { maengel.push(`keine Antwort (${d.grund ?? "unbekannt"})`); break; }

    maengel.push(...pruefeZug({ antwort, sprache: fall.sprache, fragenBisher, vorschlaege: d.vorschlaege ?? [] }));
    if ((d.benutzt ?? []).includes("bild_bauen")) hookGebaut = true;
    if ((d.benutzt ?? []).includes("rueckruf_erbitten")) rueckruf = true;
    /* DER MALER: Wurden die Bilder angesehen, und wird erst nach der Aufnahme gebaut? */
    if (fall.kunst) {
      if (Array.isArray(d.werke)) werke = d.werke;
      if (fotos.length && werke.length <= werkeVorher) maengel.push("hat die gezeigten Bilder nicht angesehen");
      const stile = {};
      for (const w of werke) if (w?.stil) stile[w.stil] = (stile[w.stil] ?? 0) + 1;
      const imStil = Math.max(0, ...Object.values(stile));
      const gebaut = (d.benutzt ?? []).filter(x => ["hook_pruefen", "bild_bauen", "motiv_erzeugen", "abschluss_schicken"].includes(x));
      if (gebaut.length && imStil < 3) maengel.push(`baut vor der Aufnahme (${imStil} Bilder im selben Stil): ${gebaut.join(", ")}`);
      /* Erst Käufer und Preis, dann Hooks — derselbe Riegel wie im Agenten. */
      const preisIdx = verlauf.findIndex(m => m.rolle === "mensch" && /(\d[\d.,\s]*\s?(€|eur|euro|lei|ron|\$|usd))|((€|eur|euro|lei|ron|\$)\s?\d)/i.test(m.text));
      const preis = preisIdx >= 0;
      /* Besprochen ist der Preis erst, wenn der Agent schon einmal darauf geantwortet hat — der
         Preis-Zug selbst gehört der Rückgabe, nicht den Hooks. Dieselbe Regel wie im Agenten. */
      const preisBesprochen = preis && verlauf.slice(preisIdx + 1).some(m => m.rolle === "agent");
      if (gebaut.length && imStil >= 3 && !preisBesprochen) maengel.push(`baut vor der Preis-Rückgabe: ${gebaut.join(", ")}`);
      /* Hooks als TEXT vor der Freigabe zählen genauso — drei Fragezeichen sind drei Sätze zur Auswahl. */
      const fragezeichen = (antwort.match(/\?/g) ?? []).length;
      if ((imStil < 3 || !preisBesprochen) && fragezeichen >= 3) maengel.push(`schreibt Hooks als Text vor der Freigabe (${fragezeichen} Fragezeichen)`);
      /* Im ersten Zug nach der Preis-Rückgabe muss die Überleitung stehen (fester Text im Agenten). */
      const ersterFreierZug = imStil >= 3 && preisBesprochen
        && !verlauf.slice(preisIdx + 2).some(m => m.rolle === "agent");
      if (fall.sprache === "en" && ersterFreierZug && !antwort.includes("That's what we're here for")) maengel.push("Überleitung fehlt im ersten Zug nach dem Preis");
      /* Im Preis-Zug: die drei Stufen in Zahlen, und kein Grenzsatz („ob sie zufrieden sind …"). */
      const preisZug = preis && preisIdx === verlauf.length - 1;
      if (preisZug && !(/200/.test(antwort) && /2[.,]?000/.test(antwort))) maengel.push("Preis-Zug ohne die Preisstufen in Zahlen");
      if (preisZug && /satisf|return depends|zufrieden|wiederkommen|mulțumi/i.test(antwort)) maengel.push("Grenzsatz im Preis-Zug");
      /* Die Preisstufen und seinen eigenen Preis zu nennen, verlangt das Kunst-Rezept — nach seinem Preis ist Geld kein Fehler. */
      if (preis) { const i = maengel.lastIndexOf("nennt Geld von sich aus"); if (i >= 0) maengel.splice(i, 1); }
    }
    verlauf.push({ rolle: "agent", text: antwort });
  }

  /* DER FALL OHNE SUBSTANZ HAT SEINE EIGENE PRÜFUNG: Hier ist ein gebautes Bild der Fehler.
     Owner 10.09.2026: „Bevor wir einen Scheiss liefern, sagen wir es ihm." */
  if (fall.leer && hookGebaut) maengel.push("baut ein Bild, obwohl nichts Konkretes kam");

  euroGesamt += euro;
  maengelGesamt += maengel.length;
  zeilen.push({ name: fall.name, maengel, euro, sekunden, rueckruf });
}

/* ── BERICHT ────────────────────────────────────────────────────────────────────────────── */

console.log("");
for (const z of zeilen) {
  const kopf = z.maengel.length ? "✗" : "✓";
  console.log(`${kopf} ${z.name.padEnd(15)} ${z.sekunden.toFixed(1).padStart(5)}s  ${z.euro.toFixed(4)} €${z.rueckruf ? "  (Rückruf angeboten)" : ""}`);
  for (const m of z.maengel) console.log(`    · ${m}`);
}
console.log(`\n${maengelGesamt} Mängel · ${euroGesamt.toFixed(3)} € für diesen Durchlauf\n`);
process.exit(maengelGesamt ? 1 : 0);
