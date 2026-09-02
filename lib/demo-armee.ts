import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * DIE AKQUISE-DEMO (Owner 02.09.2026: „ich habe einen potentielen Kunde die Detsche
 * Bundeswehr. Ich will eine Demo bauen aber das darf nicht öffentlich sein. Das ist für
 * die Akuise.").
 *
 * WAS DAS HIER IST: erfundene Zahlen für ein Verkaufsgespräch. Kein Kunde im
 * `kunden-store`, keine Leads im echten Topf, kein Schreiben nach Supabase. Drei Gründe:
 *
 *  1. KEINE VERWECHSLUNG. Lägen die 212 Beispielprofile im echten Bestand, tauchten sie in
 *     jeder Auswertung auf und die eine Zahl, an der das Produkt gemessen wird, wäre
 *     verfälscht — dauerhaft und ohne dass es jemandem auffiele.
 *  2. NICHTS, DAS IM TERMIN HÄNGT. Die Seite braucht kein Netz, keine Datenbank, keinen
 *     Schlüssel. Sie kann nicht langsam sein und nicht ausfallen.
 *  3. EINSTELLBAR AN EINER STELLE. Wer die Zahlen vor dem Gespräch anpassen will, ändert
 *     sie hier und nirgends sonst.
 *
 * DIE ZAHLEN SIND FEST, NICHT ZUFÄLLIG: Die Profile entstehen aus Listen über den Index,
 * nicht über `Math.random()`. Im Termin muss zweimal dasselbe zu sehen sein — eine Liste,
 * die sich beim Neuladen umsortiert, sieht aus wie ein Fehler.
 *
 * NICHT ÖFFENTLICH: Der Schlüssel unten ist das Adressstück. Keine Kachel im Katalog, kein
 * Link von irgendwo, `noindex` auf beiden Seiten. Wer die Adresse nicht hat, findet sie
 * nicht.
 *
 * KEIN HOHEITSZEICHEN. Bundesadler und Bundeswehr-Logo sind staatliche Hoheitszeichen; ihre
 * Verwendung ist auch in einer nicht-öffentlichen Demo heikel. Der NAME steht hier — „so
 * sähe Ihr Trichter aus" ist normales Vertriebsmaterial —, ein nachgebautes Wappen nicht.
 */

/* ══ 1 · Wer und wo ══ */

/** Das Adressstück hinter `/demo/`. Nicht ratbar — es ist der einzige Schutz. */
export const DEMO_SCHLUESSEL = "bw-7f3a2c";

/**
 * EINE ERFUNDENE ORGANISATION STATT EINER ECHTEN (Owner 02.09.2026: „wir schreiben jetzt
 * nicht bundeswehr sondern International Peace Armee" · „dann kann ich jedes Land damit
 * angehen").
 *
 * Das löst drei Dinge auf einmal, die vorher einzeln im Weg standen:
 *
 *  1. KEIN HOHEITSZEICHEN, KEINE ECHTE MARKE. Bundesadler und Bundeswehr-Logo sind
 *     staatliche Zeichen; eine Demo, die sie trägt, ist auch nicht-öffentlich heikel. Eine
 *     erfundene Organisation hat dieses Problem nicht.
 *  2. KEINE FACHFEHLER. Bei einer echten Armee verrät jedes falsche Detail — Multicam statt
 *     Flecktarn, „Panzerpilot" statt Panzerbesatzung —, dass man ihre Welt nicht kennt. Eine
 *     erfundene Truppe hat keine Uniformordnung, an der man scheitern kann.
 *  3. EINE DEMO FÜR JEDEN MARKT. Dasselbe Muster lässt sich jeder Armee zeigen, ohne dass
 *     ein Interessent das Material eines anderen Landes vor sich hat.
 */
export const DEMO_KUNDE = {
  name: "International Peace Armee",
  /**
   * WAS ÜBER DEM KOPF STEHT (Owner 02.09.2026: „was soll der titel jetzt?").
   *
   * Hier stand „Cyber- und Informationsraum". Das war richtig, solange die Demo nur
   * IT-Profile zeigte — sobald der Trichter Pilot, Panzerbesatzung und Feldsoldat zur Wahl
   * stellt, verspricht der Kopf einen Bereich und der Inhalt zeigt drei andere. Der Titel
   * steht deshalb jetzt eine Ebene höher: Es geht um die Laufbahn, nicht um eine Abteilung.
   */
  bereich: "Alle Laufbahnen",
  /** Der Kicker über dem Bewerber-Trichter — er spricht den Einzelnen an, nicht den Kunden. */
  bereichDuzen: "Deine Laufbahn",
  zeitraum: "1.–28. August 2026",
} as const;

/**
 * DER CLAIM DER KAMPAGNE (Owner 02.09.2026, wörtlich vorgegeben).
 *
 * Er steht auf BEIDEN Seiten: im Trichter als Überschrift, die den Bewerber empfängt, und
 * auf der Recruiterseite über den Anzeigen — denn das ist die Aussage, für die der Kunde
 * bezahlt. Fehlte er dort, sähe der Kunde vier Motive, aber nicht die Idee dahinter.
 *
 * Eine Quelle für beide Seiten: Ändert sich der Claim, ändert er sich überall.
 */
export const DEMO_CLAIM = {
  zeileEins: "Passt die Armee zu dir?",
  zeileZwei: "Finde es heraus.",
  zeileDrei: "Sieh dich selbst im Einsatz.",
} as const;

/* ══ 2 · Die Kampagne ══
   Die Zahlen sind für eine IT-Recruiting-Kampagne in Deutschland plausibel gewählt. Wer
   sie anfasst, sollte `KOSTEN_JE_PROFIL` unten im Blick behalten — das ist die Zahl, die
   im Termin hängen bleibt. */

export const DEMO_KAMPAGNE = {
  budgetCent: 240_000,
  impressionen: 312_000,
  klicks: 4_180,
  /** In Cent, damit nichts gerundet wird, was der Kunde nachrechnet. */
  cpcCent: 57,
} as const;

/* ══ 3 · Der Trichter ══ */

/**
 * DIE STUFEN DES TRICHTERS — der WIRKLICHE Weg, nicht der alte (Owner 02.09.2026: „ich würde
 * auch schreiben wie wieviele ein video generiert haben und wieviele ihre email angegeben
 * haben").
 *
 * Hier stand noch „Alle Fragen beantwortet" und „Kontakt freigegeben" — die Stufen des alten
 * Neun-Fragen-Trichters. Den gibt es hier nicht mehr. Der neue Weg hat vier Stationen, und
 * die beiden mittleren sind die interessanten: Wie viele lassen sich ein Video machen, und
 * wie viele geben danach ihre Adresse her. Der Abstand dazwischen ist die Zahl, an der man
 * den Trichter misst.
 *
 * Die Stufennamen stehen zweisprachig in RECRUITER_DE/EN — hier nur der Schlüssel.
 */
export const DEMO_TRICHTER = [
  { stufe: "klick", wert: 4_180 },
  { stufe: "gestartet", wert: 1_240 },
  { stufe: "video", wert: 412 },
  { stufe: "email", wert: 212 },
] as const;

/**
 * DIE ZAHL, DIE DEN TERMIN GEWINNT.
 *
 * Budget geteilt durch fertige Profile. Eine IT-Besetzung über einen Personalvermittler
 * kostet üblicherweise ein Vielfaches — deshalb steht diese eine Zahl gross und allein in
 * einer Karte, statt in einer Kennzahlen-Reihe unterzugehen.
 */
/** Was ein erzeugtes Video gekostet hat — die Stufe davor. Zusammen mit `KOSTEN_JE_PROFIL`
    zeigt es, was der Schritt vom Video zur Adresse wert ist. */
export const KOSTEN_JE_VIDEO_CENT = Math.round(
  DEMO_KAMPAGNE.budgetCent / DEMO_TRICHTER[2].wert,
);

export const KOSTEN_JE_PROFIL_CENT = Math.round(
  DEMO_KAMPAGNE.budgetCent / DEMO_TRICHTER[3].wert,
);

/* ══ 3c · Die Texte der Recruiterseite, zweisprachig ══ */

/**
 * DIE KUNDENSEITE SPRICHT BEIDE SPRACHEN (Owner 02.09.2026, zur Recruiterseite: „auf deutsch
 * und englisch").
 *
 * SIE SIEZT, DER TRICHTER DUZT — und das ist kein Versehen: Hier steht ein Arbeitgeber, dort
 * ein Bewerber. Die Hausregel „immer duzen" stammt aus dem Geschenke-Geschäft und gilt für
 * Endkunden; einer Behörde gegenüber wäre sie ein Fehler.
 *
 * Wie beim Trichter statisch im Code, ohne Laufzeit-Übersetzung: Diese Seite wird im Termin
 * geöffnet, und eine halbe Minute Wartezeit auf ein Übersetzungsmodell wäre dort das Ende
 * des Gesprächs.
 */
export type RecruiterTexte = Record<keyof typeof RECRUITER_DE, string>;

export const RECRUITER_DE = {
  bereich: "Alle Laufbahnen",
  kampagne: "Ihre Kampagne",
  /* DER KASTEN MUSS SAGEN, WOFÜR ER EIN BEISPIEL IST (Owner 02.09.2026: „Hier steht gar
     nicht dass es ein Beispiel ist für Kandidaten zu recrutieren").
     Vorher stand dort nur „Beispielansicht" und dass die Zahlen erfunden sind — wer die
     Seite zum ersten Mal öffnet, wusste damit noch immer nicht, was das Produkt IST. Jetzt
     steht das Angebot in drei Sätzen darin, bevor irgendeine Zahl kommt. */
  beispielTitel: "Beispielansicht · So gewinnen Sie Kandidaten",
  beispielText: "Wir schalten die Anzeigen und führen die Bewerber durch einen Video-Trichter — sie sehen sich selbst im Einsatz und hinterlassen danach freiwillig ihre Daten. Auf dieser Seite sehen Sie, wer sich gemeldet hat, was die Werbung gekostet hat und was dabei herauskam. Alle Zahlen und Profile hier sind erfunden; so sieht Ihre Seite aus, sobald Ihre Kampagne vier Wochen gelaufen ist.",

  anzeigenTitel: "Ihre Anzeigen",
  anzeigenLead: "Je Platzierung ein eigenes Motiv — nicht ein Bild für alles.",
  claimLabel: "Die Kampagnen-Aussage",
  trichterAnsehen: "Recruiting-Trichter ansehen",
  keineMotive: "Noch keine Motive. Legen Sie Bilder oder Videos nach",
  keineMotiveZwei: "— sie erscheinen hier von selbst. Zu jedem Video gehört ein gleichnamiges",
  standbildFehlt: "Standbild fehlt:",
  standbildFehltZwei: "— bitte vor dem Termin nachlegen.",

  kostenTitel: "Was sie gekostet hat",
  kostenLead: "Die Zahlen aus dem Werbekonto, ungekürzt.",
  ausgegeben: "Ausgegeben",
  ausgespielt: "Mal ausgespielt",
  klicks: "Klicks",
  cpc: "Kosten je Klick",

  ankamTitel: "Was davon ankam",
  ankamLead: "Von der Anzeige bis zur Adresse — jede Stufe einzeln.",
  stufeKlick: "Klick auf die Anzeige",
  stufeGestartet: "Trichter gestartet",
  stufeVideo: "Video erzeugt",
  stufeEmail: "E-Mail hinterlassen",
  jeVideo: "je erzeugtem Video — so viel kostet es, jemanden sich selbst sehen zu lassen.",
  jeProfil: "je Kontakt — mit Name, Alter, Einsatzwunsch und E-Mail.",
  quoteEins: "derer mit Video haben danach",
  quoteZwei: "ihre Adresse",
  quoteDrei: "hinterlassen — freiwillig, ohne dass wir sie vorher danach gefragt hätten.",

  bewerberTitel: "Ihre Bewerber",
  bewerberLead: "vollständige Profile. Sortieren, auswählen, anschreiben.",
  sortEingang: "Eingang", sortAlter: "Alter", sortBereich: "Einsatzbereich",
  erste40: "Die ersten 40",
  auswahlLeeren: "Auswahl leeren",
  ausgewaehlt: "ausgewählt",
  weitereZeigen: "Weitere anzeigen",
  uebrig: "übrig",
  anschreiben: "Kandidaten anschreiben",
  exportieren: "Auswahl exportieren",
  demoAus: "— in der Beispielansicht abgeschaltet, damit keine echten E-Mails rausgehen.",
  nichtZuEnde: "Video nicht zu Ende gesehen",
  jahre: "J.",

  sehenTitel: "Wofür sie sich sehen",
  sehenLead: "Jeder wählt im Trichter seinen Einsatzbereich — ohne dass ihn jemand danach fragt.",

  bekommenTitel: "Das bekommen Sie",
  bekommenLead: "Die Frage, die bei Ihnen zuerst gestellt wird.",
  bekommenKopf: "Vier Angaben und eine Absicht",
  /* Die Zusage, nach der eine Behörde zuerst fragt (Owner 02.09.2026) — sie steht
     hervorgehoben, nicht im Kleingedruckten, weil sie im Termin die Eintrittskarte ist. */
  sicher: "Ihre Daten sind sicher — DSGVO-konform.",
  bekommenTextEins: "Von jedem, der sich einträgt, bekommen Sie",
  bekommenFelder: "Vorname, Nachname, Alter und E-Mail",
  bekommenTextZwei: "— dazu den",
  bekommenBereich: "Einsatzbereich",
  bekommenTextDrei: ", den er sich selbst ausgesucht hat. Mehr fragt der Trichter nicht ab, und mehr versprechen wir Ihnen auch nicht.",
  technikKopf: "Wie es technisch läuft",
  uebergabe: "Übergabe:",
  uebergabeText: "Export der Liste als Datei, sofort. Eine Schnittstelle in Ihr Bewerbermanagement bauen wir, sobald der Pilot läuft — bis dahin brauchen Sie auf Ihrer Seite niemanden.",
  speicherort: "Betrieb und Speicherort:",
  speicherortText: "Anwendung und Datenbank laufen in Rechenzentren in Frankfurt am Main. Kein Datentransfer in Drittstaaten im laufenden Betrieb.",
  uebertragung: "Übertragung:",
  uebertragungText: "Durchgehend TLS-verschlüsselt, auch die Bilder. Gespeicherte Daten liegen verschlüsselt.",
  zugang: "Zugang:",
  zugangText: "Diese Auswertung ist passwortgeschützt und für Suchmaschinen gesperrt. Nur Sie und wir sehen sie; es gibt keine öffentliche Ansicht der Bewerber.",
  erzeugung: "Erzeugung:",
  erzeugungText: "Für das Video wird das Foto an ein Bild- und ein Videomodell übergeben und dort nur für die Dauer der Erzeugung verarbeitet. Diese Dienste sind als Unterauftragsverarbeiter im Vertrag benannt.",
  loeschung: "Löschung:",
  loeschungText: "Jeder Bewerber kann sich mit einem Klick abmelden; seine Daten werden dann vollständig entfernt. Fristen und Auskunftsrechte stehen im Auftragsverarbeitungsvertrag.",
  nachweise: "Nachweise:",
  nachweiseText: "ISO 27001 und SOC 2 Type 2 der Betreiber, Auftragsverarbeitungsvertrag mit EU-Standardvertragsklauseln, Liste der Unterauftragsverarbeiter auf Anfrage.",
  nochNichts: "In dieser Beispielansicht wird noch nichts gespeichert: Das Foto bleibt im Browser des Bewerbers, und kein Formular schreibt in eine Datenbank. Beides wird eingerichtet, sobald ein Auftrag steht.",
  entwurf: "Entwurf",
};

export const RECRUITER_EN: RecruiterTexte = {
  bereich: "All career paths",
  kampagne: "Your campaign",
  beispielTitel: "Sample view · How you win candidates",
  beispielText: "We run the ads and take applicants through a video funnel — they see themselves in action and then leave their details voluntarily. This page shows you who signed up, what the advertising cost and what came of it. All figures and profiles here are invented; this is what your page looks like once your campaign has run for four weeks.",

  anzeigenTitel: "Your ads",
  anzeigenLead: "A dedicated creative per placement — not one picture for everything.",
  claimLabel: "The campaign message",
  trichterAnsehen: "View the recruiting funnel",
  keineMotive: "No creatives yet. Drop images or videos into",
  keineMotiveZwei: "— they appear here by themselves. Every video needs a matching",
  standbildFehlt: "Still image missing:",
  standbildFehltZwei: "— please add it before the meeting.",

  kostenTitel: "What it cost",
  kostenLead: "The figures from the ad account, unabridged.",
  ausgegeben: "Spent",
  ausgespielt: "Impressions",
  klicks: "Clicks",
  cpc: "Cost per click",

  ankamTitel: "What came of it",
  ankamLead: "From the ad to the address — every stage on its own.",
  stufeKlick: "Clicked the ad",
  stufeGestartet: "Started the funnel",
  stufeVideo: "Generated a video",
  stufeEmail: "Left their email",
  jeVideo: "per generated video — that's what it costs to let someone see themselves.",
  jeProfil: "per contact — with name, age, chosen field and email.",
  quoteEins: "of those with a video then left",
  quoteZwei: "their address",
  quoteDrei: "— voluntarily, without us having asked for it first.",

  bewerberTitel: "Your applicants",
  bewerberLead: "complete profiles. Sort, select, contact.",
  sortEingang: "Received", sortAlter: "Age", sortBereich: "Field",
  erste40: "First 40",
  auswahlLeeren: "Clear selection",
  ausgewaehlt: "selected",
  weitereZeigen: "Show more",
  uebrig: "left",
  anschreiben: "Contact candidates",
  exportieren: "Export selection",
  demoAus: "— switched off in the sample view so no real emails go out.",
  nichtZuEnde: "Did not finish the video",
  jahre: "yrs",

  sehenTitel: "Where they see themselves",
  sehenLead: "Everyone picks their field in the funnel — without anyone asking them.",

  bekommenTitel: "What you get",
  bekommenLead: "The question you'll be asked first.",
  bekommenKopf: "Four details and an intention",
  sicher: "Your data is safe — GDPR compliant.",
  bekommenTextEins: "From everyone who signs up you receive",
  bekommenFelder: "first name, surname, age and email",
  bekommenTextZwei: "— plus the",
  bekommenBereich: "field",
  bekommenTextDrei: " they chose for themselves. The funnel asks for nothing more, and we promise you nothing more.",
  technikKopf: "How it works technically",
  uebergabe: "Handover:",
  uebergabeText: "Export of the list as a file, right away. An interface into your applicant system once the pilot is running — until then you need no one on your side.",
  speicherort: "Operation and location:",
  speicherortText: "Application and database run in data centres in Frankfurt am Main. No transfer to third countries during operation.",
  uebertragung: "Transmission:",
  uebertragungText: "TLS-encrypted throughout, images included. Stored data is held encrypted.",
  zugang: "Access:",
  zugangText: "This dashboard is password-protected and blocked from search engines. Only you and we can see it; there is no public view of the applicants.",
  erzeugung: "Generation:",
  erzeugungText: "For the video the photo is passed to an image and a video model and processed there only for the duration of the generation. These services are named as sub-processors in the contract.",
  loeschung: "Deletion:",
  loeschungText: "Every applicant can unsubscribe with one click; their data is then removed completely. Deadlines and rights of access are set out in the data processing agreement.",
  nachweise: "Certifications:",
  nachweiseText: "ISO 27001 and SOC 2 Type 2 of the operators, data processing agreement with EU standard contractual clauses, list of sub-processors on request.",
  nochNichts: "Nothing is stored in this sample view yet: the photo stays in the applicant's browser, and no form writes to a database. Both are set up as soon as a contract is in place.",
  entwurf: "Draft",
};

export const recruiterTexte = (lang?: string): RecruiterTexte =>
  String(lang ?? "").toLowerCase().startsWith("en") ? RECRUITER_EN : RECRUITER_DE;

/* ══ 4 · Die Anzeigen-Galerie ══ */

export type DemoMotivFertig = {
  datei: string;
  /** Adresse der Datei — der Dateiname wird kodiert, weil Exportnamen Leerzeichen und
      Kommata enthalten („ChatGPT Image 2. Sept. 2026, 11_31_49.jpeg"). */
  url: string;
  /** Standbild bei Videos — gleicher Name mit `.jpg`. Leer, wenn es (noch) fehlt. */
  poster: string;
  istVideo: boolean;
  /** Fehlt bei einem Video das Standbild? Dann muss es nachgeliefert werden, bevor die Demo
      gezeigt wird — die Galerie sagt das deutlich (Skill `card`: nie ein Video ohne Poster). */
  posterFehlt: boolean;
  /** Wo die Anzeige liefe. Steht als Titel über der Karte: Es zeigt, dass für JEDE
      Platzierung geliefert wird, statt ein Motiv überall hineinzuquetschen. */
  platzierung: string;
  /** Tailwind-Verhältnis der Fläche. */
  verhaeltnis: string;
  /** Die Zeile unter dem Motiv. Leer, solange nichts hinterlegt ist. */
  text: string;
  /** Spricht im Video ein Mensch? Dann wird oben angeschnitten, sonst fällt der Kopf weg. */
  spricht: boolean;
};

/** Der Ordner, den der Owner selbst angelegt hat (02.09.2026: „für die bilder und videos
    habe ich einen ordner in publik engelegt"). */
const ORDNER = "Armee";

/**
 * WAS ZU EINEM DATEINAMEN GEHÖRT — freiwillig, nicht Pflicht.
 *
 * Die Motive tragen ihre Schlagzeile bereits IM Bild; ein Titel darüber würde sie nur
 * wiederholen. Über der Karte steht deshalb die Platzierung, und hier lässt sich je Datei
 * eine Zeile nachtragen, die sagt, was die Anzeige leisten soll. Ohne Eintrag funktioniert
 * die Galerie genauso — sie zeigt dann nur Motiv und Format.
 *
 * Der Schlüssel ist ein Stück des Dateinamens, damit ein Umbenennen nicht sofort alles
 * zerreisst.
 */
const NOTIZEN: { enthaelt: string; text?: string; platzierung?: string; verhaeltnis?: string; spricht?: boolean }[] = [
  // Beispiel: { enthaelt: "11_31_49", text: "Zielt auf Entwickler, die Sinn suchen." },
];

/**
 * DAS STANDARDFORMAT IST 9:16 (Owner 02.09.2026: „mach mir das format auf 9:16") — das
 * Hochkant-Format von Reels und Stories, also das, was auf dem Handy den ganzen Schirm
 * füllt.
 *
 * Ein anderes Format bekommt nur, wer es in den Dateinamen schreibt (`4x5`, `3x4`,
 * `quadrat`). Das hält die Bahn ruhig: Solange alle Motive gleich hoch sind, bleibt unter
 * dem kleineren kein leerer Grund stehen.
 *
 * ACHTUNG BEIM MISCHEN: Ein breiteres Motiv (3:4 oder 4:5) in einer 9:16-Fläche wird links
 * und rechts beschnitten, weil die Karte `object-cover` benutzt. Bei Anzeigen mit Text am
 * Bildrand fällt dabei die Schlagzeile weg — solche Motive tragen ihr Format besser im
 * Dateinamen.
 */
function formatVon(datei: string): { platzierung: string; verhaeltnis: string } {
  const n = datei.toLowerCase();
  if (/quadrat|1x1|square/.test(n)) return { platzierung: "Feed · 1:1", verhaeltnis: "aspect-square" };
  if (/4x5|4-5/.test(n)) return { platzierung: "Feed · 4:5", verhaeltnis: "aspect-[4/5]" };
  if (/3x4|3-4/.test(n)) return { platzierung: "Feed · 3:4", verhaeltnis: "aspect-[3/4]" };
  return { platzierung: "Reel · 9:16", verhaeltnis: "aspect-[9/16]" };
}

/**
 * LIEST DEN ORDNER, STATT EINE LISTE ZU PFLEGEN.
 *
 * Nach dem Vorbild von `lib/versprechen-videos.ts`: Der Owner legt eine Datei hinein, und
 * die Seite zeigt sie — ohne dass jemand Code anfasst. Vorher stand hier eine feste Liste
 * mit Wunsch-Dateinamen; die hätte er treffen müssen, sonst wäre die Galerie leer geblieben.
 *
 * Standbilder von Videos werden NICHT als eigenes Motiv gezeigt — sie gehören zu ihrem
 * Video, sonst stünde jedes Video zweimal in der Bahn.
 *
 * WICHTIG FÜR DIE VERÖFFENTLICHUNG: Was in `public/` liegt, liefert auf Vercel das CDN aus;
 * in der Server-Funktion ist es nur, wenn die Bau-Spurensuche es mitnimmt. Deshalb steht
 * `/demo/[schluessel]` in `outputFileTracingIncludes` (next.config.mjs) — ohne das fände
 * `readdirSync` live nichts und die Galerie stünde leer, obwohl lokal alles da ist.
 */
export function demoMotive(): DemoMotivFertig[] {
  const wurzel = join(process.cwd(), "public", ORDNER);
  let dateien: string[] = [];
  try {
    dateien = readdirSync(wurzel)
      .filter(d => /\.(mp4|jpe?g|png|webp)$/i.test(d))
      .sort();
  } catch {
    return [];
  }

  const videos = dateien.filter(d => /\.mp4$/i.test(d));
  /* Ein Bild, das genauso heisst wie ein Video, ist dessen Poster und kein eigenes Motiv. */
  const posterNamen = new Set(videos.map(v => v.replace(/\.mp4$/i, ".jpg").toLowerCase()));

  return dateien
    .filter(d => !posterNamen.has(d.toLowerCase()))
    .map(datei => {
      const istVideo = /\.mp4$/i.test(datei);
      const posterDatei = datei.replace(/\.mp4$/i, ".jpg");
      const posterDa = istVideo && dateien.some(d => d.toLowerCase() === posterDatei.toLowerCase());
      const notiz = NOTIZEN.find(n => datei.includes(n.enthaelt));
      const fmt = formatVon(datei);
      return {
        datei,
        url: `/${ORDNER}/${encodeURIComponent(datei)}`,
        poster: posterDa ? `/${ORDNER}/${encodeURIComponent(posterDatei)}` : "",
        istVideo,
        posterFehlt: istVideo && !posterDa,
        platzierung: notiz?.platzierung ?? fmt.platzierung,
        verhaeltnis: notiz?.verhaeltnis ?? fmt.verhaeltnis,
        text: notiz?.text ?? "",
        spricht: notiz?.spricht ?? false,
      };
    });
}

/* ══ 3b · Die Texte des Trichters, zweisprachig ══ */

/**
 * DEUTSCH UND ENGLISCH, BEIDE STATISCH IM CODE (Owner 02.09.2026: „Und englisch und deutsch.
 * Damit kann ich alle länder angehen").
 *
 * KEINE LAUFZEIT-ÜBERSETZUNG — aus demselben Grund wie beim Joburi-Trichter: Der Rest des
 * Hauses übersetzt beim ersten Aufruf einer Sprache und braucht dafür 26 bis 44 Sekunden.
 * Für einen Trichter, den eine bezahlte Anzeige füttert, ist das tödlich; der erste Besucher
 * sähe eine halbe Minute nichts, und für den ist schon gezahlt.
 *
 * ENGLISCH IST DIE SPRACHE, MIT DER SICH JEDES LAND ANSPRECHEN LÄSST. Deutsch bleibt die
 * Fassung für den deutschsprachigen Markt; wer eine dritte Sprache braucht, ergänzt hier
 * einen Block und nichts sonst.
 */
export type ArmeeTexte = Record<keyof typeof ARMEE_DE, string>;

export const ARMEE_DE = {
  kicker: "Deine Laufbahn",
  claimEins: "Passt die Armee zu dir?",
  claimZwei: "Finde es heraus.",
  claimDrei: "Sieh dich selbst im Einsatz.",

  wahlLabel: "Wähl deinen Einsatz:",
  weiter: "Weiter",
  zurueck: "Zurück",
  keineSzenen: "Noch keine Einsatzbereiche.",

  videoLabel: "Dein Video",
  fotoKachel: "Dein Foto",
  fotoHinweis: "Ein klares Selfie genügt. Frontal, kein Hut.",
  zielLabel: "Dein Einsatz",
  vornameFeld: "Dein Vorname",
  vornameHinweis: "Damit wir dich im Video ansprechen können.",
  generieren: "Jetzt generieren",
  cropTitel: "Dein Foto",
  einwilligungEins: "Kostenlos · dein Foto bleibt auf deinem Gerät und wird nicht gespeichert.",
  einwilligungZwei: "Nur Bilder von dir selbst dürfen hochgeladen werden.",

  laeuftKicker: "Einen Moment",
  laeuftTitelEins: "Dein Video",
  laeuftTitelZwei: "entsteht",
  laeuftText: "Wir setzen dich in",
  laeuftDauer: "Das dauert etwa eine halbe Minute. Bleib auf der Seite.",

  fertigKicker: "Fertig",
  fertigTitelEins: "Das bist",
  fertigTitelZwei: "du",
  abspannEins: "Danke {name} für deinen Einsatz!",
  abspannZwei: "Du bist uns wichtig!",

  frageTitel: "Hast du Interesse?",
  frageZeile: "Dann trag dich hier ein — wir schicken dir die Informationen zu deinem Weg.",
  feldName: "Dein Nachname",
  feldGeburt: "Geburtsdatum",
  feldMail: "name@beispiel.de",
  haken: "Ich möchte Informationen per E-Mail bekommen.",
  absenden: "Ich will weitere Informationen",
  sendet: "Einen Moment…",
  datenschutz: "Dein Foto wird nicht gespeichert. Deine Adresse geht an niemanden weiter, und du kannst dich jederzeit abmelden.",
  fehlerName: "Bitte trag deinen Namen ein.",
  fehlerGeburt: "Bitte trag dein Geburtsdatum ein.",
  fehlerMail: "Diese Adresse sieht noch nicht vollständig aus.",
  fehlerHaken: "Ohne diese Zustimmung können wir dir nichts schicken.",

  dankeKicker: "Danke",
  dankeTitelEins: "Wir haben dir",
  dankeTitelZwei: "geschrieben",
  dankeText: "Schau in dein Postfach — dort liegen die Informationen zu deinem Weg. Wenn nichts ankommt, sieh bitte auch im Spam-Ordner nach.",
  nochmal: "Noch einen Einsatz ansehen",

  ton: "Ton an", tonAus: "Ton aus", gross: "Vergrössern", klein: "Verkleinern",
};

export const ARMEE_EN: ArmeeTexte = {
  kicker: "Your career",
  claimEins: "Is the army right for you?",
  claimZwei: "Find out.",
  claimDrei: "See yourself in action.",

  wahlLabel: "Choose your field:",
  weiter: "Continue",
  zurueck: "Back",
  keineSzenen: "No fields yet.",

  videoLabel: "Your video",
  fotoKachel: "Your photo",
  fotoHinweis: "A clear selfie is enough. Face on, no hat.",
  zielLabel: "Your field",
  vornameFeld: "Your first name",
  vornameHinweis: "So we can address you in the video.",
  generieren: "Generate now",
  cropTitel: "Your photo",
  einwilligungEins: "Free · your photo stays on your device and is not stored.",
  einwilligungZwei: "Only upload pictures of yourself.",

  laeuftKicker: "One moment",
  laeuftTitelEins: "Your video is",
  laeuftTitelZwei: "being made",
  laeuftText: "Placing you in",
  laeuftDauer: "This takes about half a minute. Stay on the page.",

  fertigKicker: "Done",
  fertigTitelEins: "That's",
  fertigTitelZwei: "you",
  abspannEins: "Thank you {name} for your service!",
  abspannZwei: "You matter to us!",

  frageTitel: "Interested?",
  frageZeile: "Then leave your details — we'll send you the information for your path.",
  feldName: "Your surname",
  feldGeburt: "Date of birth",
  feldMail: "name@example.com",
  haken: "I'd like to receive information by email.",
  absenden: "I want more information",
  sendet: "One moment…",
  datenschutz: "Your photo is not stored. Your address is passed to no one, and you can unsubscribe at any time.",
  fehlerName: "Please enter your name.",
  fehlerGeburt: "Please enter your date of birth.",
  fehlerMail: "This address doesn't look complete yet.",
  fehlerHaken: "Without this consent we can't send you anything.",

  dankeKicker: "Thank you",
  dankeTitelEins: "We've written",
  dankeTitelZwei: "to you",
  dankeText: "Check your inbox — the information for your path is waiting there. If nothing arrives, please look in your spam folder too.",
  nochmal: "See another field",

  ton: "Sound on", tonAus: "Sound off", gross: "Enlarge", klein: "Shrink",
};

export const ARMEE_SPRACHEN = ["de", "en"] as const;
export const armeeTexte = (lang?: string): ArmeeTexte =>
  String(lang ?? "").toLowerCase().startsWith("en") ? ARMEE_EN : ARMEE_DE;

/** Die Beschriftung der Szenen je Sprache — der Dateiname bleibt der Schlüssel. */
const SZENEN_NAMEN: Record<string, { de: string; en: string }> = {
  cybersicherheit: { de: "Cybersicherheit", en: "Cyber Security" },
  feldsoldat: { de: "Feldsoldat", en: "Infantry" },
  panzerbesatzung: { de: "Panzerbesatzung", en: "Armoured Crew" },
  pilot: { de: "Pilot", en: "Pilot" },
};

/* ══ 4b · Die Szenen des Trichters ══ */

export type DemoSzene = {
  id: string;
  /** Was unter der Kachel steht — der Beruf, nicht der Dateiname. */
  name: string;
  /** Standbild für die Auswahl. */
  bild: string;
  /** Das Video, das nach der „Erzeugung" gezeigt wird. */
  video: string;
};

/**
 * DIE BERUFE, AUS DENEN DER BEWERBER WÄHLT (Owner 02.09.2026: „ich könnte zum Beispiel
 * 3 coole Berufe nehmen").
 *
 * Sie liegen in einem EIGENEN Ordner, `public/Armee/szenen/`. Das ist kein Ordnungssinn,
 * sondern eine Lehre vom selben Tag: Die Galerie liest `public/Armee/` aus, und sobald
 * dort ein Porträt oder ein Testvideo lag, stand es als Anzeigenmotiv auf der Kundenseite.
 * Drei Ordner, drei Bedeutungen:
 *
 *   public/Armee/          die Anzeigenmotive (Galerie der Recruiterseite)
 *   public/Armee/szenen/   die wählbaren Berufe (dieser Trichter)
 *   public/Armee/zutaten/  Rohmaterial: Porträts, Testläufe — wird nirgends gezeigt
 *
 * DER NAME KOMMT AUS DEM DATEINAMEN: `pilot.mp4` wird zu „Pilot", `panzerbesatzung.mp4` zu
 * „Panzerbesatzung". Unterstriche werden zu Leerzeichen. So braucht ein neuer Beruf keinen
 * Code — nur eine Datei mit sprechendem Namen und ihr Standbild daneben.
 */
export function demoSzenen(lang = "de"): DemoSzene[] {
  const wurzel = join(process.cwd(), "public", ORDNER, "szenen");
  let dateien: string[] = [];
  try { dateien = readdirSync(wurzel).filter(d => /\.mp4$/i.test(d)).sort(); } catch { return []; }
  return dateien.map(datei => {
    const roh = datei.replace(/\.mp4$/i, "");
    const poster = `${roh}.jpg`;
    const posterDa = (() => { try { return readdirSync(wurzel).some(d => d.toLowerCase() === poster.toLowerCase()); } catch { return false; } })();
    return {
      id: roh.toLowerCase(),
      /* Der Dateiname bleibt der Schlüssel; die Beschriftung kommt aus `SZENEN_NAMEN`.
         Fehlt dort ein Eintrag, wird der Dateiname lesbar gemacht — ein neuer Beruf
         erscheint also auch ohne Übersetzung, nur eben in beiden Sprachen gleich. */
      name: SZENEN_NAMEN[roh.toLowerCase()]?.[lang.startsWith("en") ? "en" : "de"]
        ?? roh.replace(/[_-]+/g, " ").replace(/^./, c => c.toUpperCase()),
      bild: posterDa ? `/${ORDNER}/szenen/${encodeURIComponent(poster)}` : "",
      video: `/${ORDNER}/szenen/${encodeURIComponent(datei)}`,
    };
  });
}

/* ══ 5 · Die Bewerber ══ */

/**
 * WAS EIN BEWERBER HINTERLÄSST — UND NICHTS DARÜBER HINAUS (Owner 02.09.2026: „wir haben nur
 * Vorname Name Alter und Email").
 *
 * Hier standen vorher Beruf, Sprachen, Ausbildung, Erfahrung, Gehaltswunsch und eine
 * Passungs-Punktzahl aus alldem. Das war der Datensatz des ALTEN Trichters mit seinen neun
 * Fragen — der neue fragt nichts davon. Eine Kundenseite, die Felder zeigt, die nie erhoben
 * werden, verspricht dem Kunden etwas, das nie ankommt; das fällt spätestens beim ersten
 * echten Lead auf.
 *
 * Was wirklich entsteht, sind fünf Angaben: die vier aus dem Formular und die Szene, die er
 * gewählt hat. Die fünfte ist dabei die interessanteste — sie sagt, wofür er sich sieht,
 * ohne dass ihn jemand danach gefragt hätte.
 */
export type DemoProfil = {
  id: string;
  vorname: string;
  nachname: string;
  /** Aus dem Geburtsdatum gerechnet — abgefragt wird das Datum, gezeigt wird das Alter. */
  alter: number;
  email: string;
  /** Der Einsatzbereich, den er im Trichter gewählt hat. */
  bereich: string;
  /** Wann er sich eingetragen hat — „vor 2 Tagen" o. ä. */
  wann: string;
  /** Hat er den Trichter bis zum Video durchlaufen? */
  videoGesehen: boolean;
};

const VORNAMEN = [
  "Michael", "Sandra", "Tobias", "Nadine", "Christian", "Julia", "Stefan", "Katrin",
  "Andreas", "Melanie", "Daniel", "Anja", "Marcus", "Nicole", "Sebastian", "Franziska",
  "Thomas", "Kerstin", "Patrick", "Svenja",
];
const NACHNAMEN = [
  "Berger", "Hoffmann", "Krüger", "Lehmann", "Naumann", "Otto", "Pfeiffer", "Reuter",
  "Schneider", "Thiel", "Vogel", "Winkler", "Zimmer", "Baumann", "Erhardt", "Gerlach",
  "Hartwig", "Kessler",
];
/**
 * DIE BEREICHE SIND UNGLEICH VERTEILT — UND ZWAR ABSICHTLICH (Owner 02.09.2026: „immer die
 * gleiche zahl ist blöd").
 *
 * Vorher lief die Wahl über `(i * 3) % 4`, und weil 212 durch 4 glatt aufgeht, stand bei
 * allen vier Bereichen exakt 53. Eine Verteilung, die perfekt aufgeht, sieht nicht nach
 * Messung aus, sondern nach Rechnung — und genau das ist das Erste, was einem Kunden an
 * erfundenen Zahlen auffällt.
 *
 * Die Gewichtung folgt dem, was plausibel wäre: Cyber und Pilot ziehen am stärksten (das
 * eine, weil die Zielgruppe dort ohnehin sitzt, das andere, weil es das Bild im Kopf ist),
 * Panzer und Infanterie deutlich weniger. Dreizehn Einträge sind teilerfremd zu 212, die
 * Liste wiederholt sich also nicht im Gleichtakt.
 */
const BEREICHE = [
  "Cybersicherheit", "Pilot", "Cybersicherheit", "Feldsoldat", "Pilot",
  "Cybersicherheit", "Panzerbesatzung", "Pilot", "Cybersicherheit", "Feldsoldat",
  "Pilot", "Cybersicherheit", "Panzerbesatzung",
];
const WANN = ["heute", "gestern", "vor 2 Tagen", "vor 3 Tagen", "vor 5 Tagen", "vor 1 Woche"];

/** Wie viele Profile die Demo zeigt — dieselbe Zahl wie „Alle Fragen beantwortet". */
export const DEMO_ANZAHL = DEMO_TRICHTER[3].wert;

/**
 * ERZEUGT DIE PROFILE — ÜBER DEN INDEX, NICHT ÜBER DEN ZUFALL.
 *
 * `Math.random()` wäre kürzer und im Termin ein Eigentor: Die Liste sähe bei jedem Neuladen
 * anders aus, und der erste Gedanke des Kunden wäre nicht „interessant", sondern „da stimmt
 * etwas nicht".
 *
 * DIE SCHRITTWEITE MUSS ZUR LISTENLÄNGE TEILERFREMD SEIN, sonst wiederholt sich die Liste,
 * statt sie zu durchlaufen — daran ist die erste Fassung zweimal gescheitert (`(i*17)%17`
 * ist immer 0, `(i*5)%15` trifft nur ein Fünftel der Einträge).
 */
export function demoProfile(): DemoProfil[] {
  const liste: DemoProfil[] = [];
  for (let i = 0; i < DEMO_ANZAHL; i++) {
    const vorname = VORNAMEN[(i * 11) % VORNAMEN.length];   // 11 ⊥ 20
    const nachname = NACHNAMEN[(i * 5) % NACHNAMEN.length]; // 5 ⊥ 18
    const bereich = BEREICHE[i % BEREICHE.length];          // 13 ⊥ 212
    liste.push({
      id: `p${String(i + 1).padStart(3, "0")}`,
      vorname, nachname, bereich,
      alter: 18 + ((i * 7) % 22),                            // 7 ⊥ 22 → 18 bis 39
      email: `${vorname.toLowerCase()}.${nachname.toLowerCase()}@example.com`,
      wann: WANN[(i * 5) % WANN.length],                     // 5 ⊥ 6
      /* Nicht jeder, der sich einträgt, hat den Trichter auch zu Ende gesehen. */
      videoGesehen: i % 7 !== 6,
    });
  }
  return liste;
}
