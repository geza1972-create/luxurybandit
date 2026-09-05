import { sendEmail } from "@/lib/email-send";
import { ACADEMY_DOMAIN } from "@/lib/armee-musik";

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
  /**
   * DER NAME IN DREI SCHRITTEN (Owner 02.09.2026): erst „International Peace Armee", dann
   * „Peace Army ist doch richtig oder?" (Englisch/Deutsch gemischt), schliesslich „United
   * Peace Academy ist noch besser".
   *
   * „Academy" nimmt dem Namen das Martialische und stellt die Ausbildung nach vorn — für
   * Recruiting die freundlichere Tür. Weil eine Akademie aber keine Truppe ist, zieht der
   * Claim mit: Er fragt nicht mehr nach „der Armee", sondern nach dem WEG. Sonst stünde
   * oben eine Schule und unten rollte ein Panzer.
   *
   * Der Name bleibt in beiden Sprachfassungen gleich — Eigennamen werden nicht übersetzt.
   */
  name: "United Peace Academy",
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

  galerieTitel: "Schon erzeugt",
  galerieLead: "{n} haben sich schon ihr Video erzeugt — eine Auswahl.",
  galerieHinweis: "Sie sehen die echten, von Bewerbern selbst erzeugten Videos — mit ihrem eigenen Gesicht im gewählten Einsatz.",

  anzeigenTitel: "Ihre Anzeigen",
  anzeigenLead: "Je Platzierung ein eigenes Motiv — nicht ein Bild für alles.",
  claimLabel: "Die Kampagnen-Aussage",
  viralTitel: "Was Bewerber bekommen — und warum das von selbst läuft",
  viralText: "Jeder Bewerber bekommt sein eigenes Video im gewählten Einsatz — kostenlos, in unter einer Minute. Das teilt er selbst, an seine eigenen Kontakte weiter. Jedes erzeugte Video ist eine zusätzliche Anzeige, ohne zusätzliches Budget.",
  viralKnopf: "Generiere dein Video",
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

  /* NICHT „BEWERBER" — SIE HABEN SICH NICHT BEWORBEN (Owner 04.09.2026, am Bildschirmfoto
     dieser Liste: „hier nicht ihre Bewerber sondern Interessenten Liste. Sie wollen Infos
     eigentlich"). Wer diese Liste füllt, hat nur das Formular nach dem Video ausgefüllt
     („Hast du Interesse?", Schritt 4 in `ArmeeFunnel.tsx`) — keine Bewerbung, kein
     Lebenslauf, kein Vorstellungsgespräch. Das Wort „vollständige Profile" behauptete
     ausserdem mehr, als eine E-Mail-Adresse und ein Name hergeben. */
  bewerberTitel: "Ihre Interessenten",
  bewerberLead: "wollen mehr erfahren. Sortieren, auswählen, anschreiben.",
  sortEingang: "Eingang", sortAlter: "Alter", sortBereich: "Einsatzbereich",
  erste40: "Die ersten 40",
  auswahlLeeren: "Auswahl leeren",
  ausgewaehlt: "ausgewählt",
  /* KEIN KNOPF, EINE ZEILE (Owner 02.09.2026: „das nicht klickbar" · „nur 4 und more, aber
     nicht zum ausklappen"). Die Liste ist eine Arbeitsprobe: Sie soll zeigen, wie ein Profil
     aussieht und dass es viele gibt — nicht zum Durchblättern einladen. Ein Knopf, der 208
     erfundene Namen ausrollt, macht aus dem Argument eine Datenbank. */
  weitereStumm: "und {n} weitere Profile",
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

  galerieTitel: "Already generated",
  galerieLead: "{n} people have already generated their video — a selection.",
  galerieHinweis: "You're looking at the real videos applicants generated themselves — their own face, in the role they chose.",

  anzeigenTitel: "Your ads",
  anzeigenLead: "A dedicated creative per placement — not one picture for everything.",
  claimLabel: "The campaign message",
  viralTitel: "What applicants get — and why it spreads on its own",
  viralText: "Every applicant gets their own video in the role they chose — free, in under a minute. They share it themselves, with their own contacts. Every generated video is an extra ad, without extra budget.",
  viralKnopf: "Generate your video",
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

  bewerberTitel: "Your leads",
  bewerberLead: "want more information. Sort, select, reach out.",
  sortEingang: "Received", sortAlter: "Age", sortBereich: "Field",
  erste40: "First 40",
  auswahlLeeren: "Clear selection",
  ausgewaehlt: "selected",
  weitereStumm: "and {n} more profiles",
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

export const RECRUITER_RO: RecruiterTexte = {
  bereich: "Toate carierele",
  kampagne: "Campania dumneavoastră",
  beispielTitel: "Exemplu de vizualizare · Cum câștigați candidați",
  beispielText: "Difuzăm anunțurile și ghidăm candidații printr-un funnel video — se văd pe ei înșiși în acțiune și apoi își lasă datele de bunăvoie. Pe această pagină vedeți cine s-a înscris, cât a costat publicitatea și ce a rezultat din asta. Toate cifrele și profilurile de aici sunt inventate; așa arată pagina dumneavoastră după ce campania a rulat patru săptămâni.",

  galerieTitel: "Deja generate",
  galerieLead: "{n} persoane și-au generat deja videoclipul — o selecție.",
  galerieHinweis: "Vedeți videoclipurile reale, generate chiar de candidați — cu propriul chip, în misiunea aleasă.",

  anzeigenTitel: "Anunțurile dumneavoastră",
  anzeigenLead: "Un material propriu pentru fiecare plasare — nu o singură imagine pentru tot.",
  claimLabel: "Mesajul campaniei",
  viralTitel: "Ce primesc candidații — și de ce se răspândește de la sine",
  viralText: "Fiecare candidat primește propriul videoclip în misiunea aleasă — gratuit, în mai puțin de un minut. Îl distribuie chiar el, propriilor contacte. Fiecare videoclip generat este o reclamă în plus, fără buget suplimentar.",
  viralKnopf: "Generează-ți videoclipul",
  keineMotive: "Încă nu există materiale. Adăugați imagini sau videoclipuri în",
  keineMotiveZwei: "— apar aici automat. Fiecare videoclip are nevoie de o",
  standbildFehlt: "Lipsește imaginea statică:",
  standbildFehltZwei: "— vă rugăm să o adăugați înainte de întâlnire.",

  kostenTitel: "Cât a costat",
  kostenLead: "Cifrele din contul de publicitate, complete.",
  ausgegeben: "Cheltuit",
  ausgespielt: "Afișări",
  klicks: "Clicuri",
  cpc: "Cost pe clic",

  ankamTitel: "Ce a rezultat",
  ankamLead: "De la anunț până la adresă — fiecare etapă în parte.",
  stufeKlick: "Clic pe anunț",
  stufeGestartet: "Funnel început",
  stufeVideo: "Videoclip generat",
  stufeEmail: "E-mail lăsat",
  jeVideo: "per videoclip generat — atât costă să lași pe cineva să se vadă pe sine.",
  jeProfil: "per contact — cu nume, vârstă, domeniul dorit și e-mail.",
  quoteEins: "dintre cei cu videoclip și-au lăsat apoi",
  quoteZwei: "adresa",
  quoteDrei: "de bunăvoie, fără să îi fi întrebat noi înainte.",

  bewerberTitel: "Persoanele interesate",
  bewerberLead: "vor mai multe informații. Sortați, selectați, contactați.",
  sortEingang: "Sosire", sortAlter: "Vârstă", sortBereich: "Domeniu",
  erste40: "Primele 40",
  auswahlLeeren: "Golește selecția",
  ausgewaehlt: "selectate",
  weitereStumm: "și încă {n} profiluri",
  anschreiben: "Contactează candidații",
  exportieren: "Exportă selecția",
  demoAus: "— dezactivat în exemplul de vizualizare, ca să nu plece e-mailuri reale.",
  nichtZuEnde: "Nu a văzut videoclipul până la final",
  jahre: "ani",

  sehenTitel: "Ce își doresc să vadă",
  sehenLead: "Fiecare își alege domeniul în funnel — fără ca cineva să îl întrebe.",

  bekommenTitel: "Asta primiți",
  bekommenLead: "Întrebarea care vi se va pune prima.",
  bekommenKopf: "Patru date și o intenție",
  sicher: "Datele dumneavoastră sunt în siguranță — conform GDPR.",
  bekommenTextEins: "De la fiecare care se înscrie primiți",
  bekommenFelder: "prenume, nume, vârstă și e-mail",
  bekommenTextZwei: "— plus",
  bekommenBereich: "domeniul",
  bekommenTextDrei: " pe care și l-a ales singur. Funnel-ul nu cere mai mult, și nici noi nu vă promitem mai mult.",
  technikKopf: "Cum funcționează tehnic",
  uebergabe: "Predare:",
  uebergabeText: "Exportul listei ca fișier, imediat. Construim o interfață către sistemul dumneavoastră de gestionare a candidaților de îndată ce pilotul rulează — până atunci nu aveți nevoie de nimeni pe partea dumneavoastră.",
  speicherort: "Funcționare și locație:",
  speicherortText: "Aplicația și baza de date rulează în centre de date din Frankfurt am Main. Niciun transfer de date către țări terțe în timpul funcționării.",
  uebertragung: "Transmisie:",
  uebertragungText: "Criptată TLS pe tot parcursul, inclusiv imaginile. Datele stocate sunt păstrate criptat.",
  zugang: "Acces:",
  zugangText: "Această analiză este protejată prin parolă și blocată pentru motoarele de căutare. Doar dumneavoastră și noi o vedem; nu există o vizualizare publică a candidaților.",
  erzeugung: "Generare:",
  erzeugungText: "Pentru videoclip, fotografia este transmisă unui model de imagine și unuia video și procesată acolo doar pe durata generării. Aceste servicii sunt menționate ca subîmputerniciți în contract.",
  loeschung: "Ștergere:",
  loeschungText: "Fiecare candidat se poate dezabona cu un singur clic; datele sale sunt apoi eliminate complet. Termenele și drepturile de acces sunt prevăzute în acordul de prelucrare a datelor.",
  nachweise: "Certificări:",
  nachweiseText: "ISO 27001 și SOC 2 Type 2 ale operatorilor, acord de prelucrare a datelor cu clauze contractuale standard UE, lista subîmputerniciților la cerere.",
  nochNichts: "În acest exemplu de vizualizare nu se stochează încă nimic: fotografia rămâne în browserul candidatului, și niciun formular nu scrie într-o bază de date. Ambele se activează de îndată ce există un contract.",
  entwurf: "Ciornă",
};

export const recruiterTexte = (lang?: string): RecruiterTexte => {
  const s = armeeSprache(lang);
  return s === "de" ? RECRUITER_DE : s === "ro" ? RECRUITER_RO : RECRUITER_EN;
};

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
 * DIE ANZEIGEN SIND DIE FÜNF EINSATZ-SZENEN — NICHT DER LANDINGPAGE-SPOT (Owner 04.09.2026,
 * am Bildschirmfoto der Galerie: „hier hast du mir 4 mal das video gemacht … ich brauche die
 * template videos").
 *
 * Hier stand vorher ein `readdirSync` über den WURZELordner `public/Armee/`. Das traf zwei
 * Fehler zugleich: Erstens landen dort inzwischen auch die drei Spot-Videos
 * (`spot-de/ro/en.mp4`, siehe `ARMEE_SPOTS`) und ein Roh-Testvideo — die Galerie zeigte damit
 * dieselbe Aufnahme viermal statt fünf verschiedener Anzeigen. Zweitens ist genau dieser
 * `readdirSync` schon einmal am Deploy gescheitert (siehe die Begründung bei
 * `SZENEN_DATEIEN` unten): `public/Armee/**` in die Server-Funktion zu ziehen, brachte eine
 * ANDERE Funktion über Vercels 250-MB-Grenze, die Zeile musste aus `next.config.mjs` wieder
 * raus — seither fand `readdirSync` auf Vercel dort nichts, und die Galerie stand LIVE leer,
 * obwohl sie lokal voll aussah.
 *
 * EIGENE DATEIEN, NICHT DIESELBEN WIE IM TRICHTER (Owner 04.09.2026: „die videos haben nicht
 * unser sounds und im Video muss stehen Danke Julia für dein Einsatz. Du bist uns wichtig!").
 *
 * Zuerst wurden dafür die Dateien in `public/Armee/szenen/` selbst geändert — Musik unter das
 * Originalton gemischt, ein Dankestext eingebrannt. Das traf aber die FALSCHEN Stellen mit:
 * `szenen/` ist zugleich die Auswahlkachel im Trichter („Wähl deinen Einsatz", vor jeder
 * Erzeugung) und das Rückfallbild, solange die ECHTE Erzeugung eines Bewerbers noch läuft
 * (`components/ArmeeFunnel.tsx`, `szene.bild`/`szene.video`) — dort stand dann „Danke Julia"
 * unter dem Namen jedes x-beliebigen Bewerbers, bevor er überhaupt etwas gewählt hatte.
 *
 * `public/Armee/anzeigen/` ist ein VIERTER Ordner mit eigener Bedeutung (die ersten drei
 * stehen bei `SZENEN_DATEIEN`): fertige Anzeigen-Kreationen für die Kundenseite — Musik und
 * Dankestext bereits in Bild und Ton gebrannt, unabhängig vom Trichter, der weiterhin die
 * unbeschrifteten Originale aus `szenen/` zeigt. Je Szene ein Beispielname (Owner: „oder
 * Johanes …" — als Beispiel gemeint, nicht als Vorgabe für eine bestimmte Szene).
 *
 * FORMAT 3:4 (Owner 04.09.2026: „und format. 3:4"), oben angeschnitten (`spricht: true`):
 * Die Szenen sind Porträts mit klar sichtbarem Gesicht — bei einem Zuschnitt muss der Kopf
 * oben bleiben, sonst fällt er aus dem Bild.
 */
/**
 * DER DANKESTEXT SPRICHT DIE SPRACHE DES KUNDEN (Owner 04.09.2026: „bitte übersetzen Ro,
 * EN" — die Recruiterseite stand auf Rumänisch, das eingebrannte „Danke Johannes" blieb
 * Deutsch). Je Szene liegen jetzt drei fertige Fassungen nebeneinander
 * (`<id>-de/ro/en.mp4`) statt einer einzigen — der Name bleibt gleich, nur Anrede und Claim
 * wechseln.
 */
export function demoMotive(lang?: string): DemoMotivFertig[] {
  const s = armeeSprache(lang);
  const spot = armeeSpot(lang);
  /* DAS WERBEVIDEO ZUERST (Owner 04.09.2026: „hier brauche ich als erstes das Werbevideo").
     Die fünf Danke-Kacheln sind Testimonials — überzeugend, aber erst NACHDEM der Betrachter
     den eigentlichen Werbespot gesehen hat. Derselbe Spot wie auf der Landingpage
     (`armeeSpot`).
     ECHTES 3:4 (Owner 04.09.2026: „das video wurde auf das falsche format produziert" → „wir
     müssen das video neu produzieren" → „so ich habe dir den spot angelegt und heisst
     spot-001-neutral" → „3:4 format"). Der alte Spot war als 720×1280 gedreht; ein
     3:4-Zuschnitt kostete Untertitel und den QR-Code am Schluss (siehe Git-Historie dieser
     Datei). `spot-001-neutral.mp4` (public/Armee/) ist NATIV 768×1024 — kein Zuschnitt mehr
     nötig, Untertitel und QR-Endkarte sind für genau dieses Format neu gebaut. */
  const werbevideo: DemoMotivFertig = {
    datei: `spot-${s}.mp4`,
    url: spot.video,
    poster: spot.poster,
    istVideo: true,
    posterFehlt: false,
    /* „WERBESPOT" STATT „REEL" (Owner 04.09.2026: „und du schreibst dahin Werbespot") — die
       fünf anderen Kacheln tragen einen Namen, diese hier keinen; das Wort an seiner Stelle
       sagt stattdessen, was es ist. Übersetzt wie alles andere hier — keine Sprache bekommt
       das deutsche Wort stehen gelassen. */
    platzierung: `${{ de: "Werbespot", ro: "Spot publicitar", en: "Ad spot" }[s]} · 3:4`,
    verhaeltnis: "aspect-[3/4]",
    text: "",
    spricht: true,
  };
  const szenen: DemoMotivFertig[] = SZENEN_DATEIEN.map(id => ({
    datei: `${id}-${s}.mp4`,
    url: `/${ORDNER}/anzeigen/${id}-${s}.mp4`,
    poster: `/${ORDNER}/anzeigen/${id}-${s}.jpg`,
    istVideo: true,
    posterFehlt: false,
    /* NUR BERUF UND FORMAT, KEIN NAME MEHR (Owner 04.09.2026: „ich glaube wir müssen die
       namen entfernen und anonym halten. das finde ich heikel für die suchmaschinen" —
       am Bildschirmfoto der Karte „Christian · Soldat de infanterie · 3:4"). Diese Zeile
       steht als lesbarer Seitentext im HTML und wird als solche indexiert; der eingebrannte
       Name IM Video ist davon unberührt (Suchmaschinen lesen keinen Text aus Videobildern).
       Der Beruf bleibt dieselbe Übersetzung wie im Trichter selbst (`SZENEN_NAMEN`, auch in
       `demoSzenen()` benutzt) — ein Bewerber, der „Feldsoldat" wählt, sieht hier wieder
       genau dieses Wort. */
    platzierung: `${SZENEN_NAMEN[id]?.[s] ?? id} · 3:4`,
    verhaeltnis: "aspect-[3/4]",
    text: "",
    spricht: true,
  }));
  return [werbevideo, ...szenen];
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
  claimEins: "Ist das dein Weg?",
  claimZwei: "Finde es heraus.",
  claimDrei: "Sieh dich selbst im Einsatz.",
  /* SCHRITT 1 TRÄGT KEINEN CLAIM MEHR (Owner 02.09.2026, am Trichterkopf: „das raus und
     back button rein"). Der Claim steht auf der Landingpage und hat dort seine Arbeit
     getan; im Trichter steht ab der ersten Zeile, was zu tun ist. */
  schrittEinsEins: "Wähl", schrittEinsZwei: "deinen Einsatz.",
  schrittZweiEins: "Jetzt", schrittZweiZwei: "dein Gesicht.",
  /* Schritt 3 ist die E-MAIL, vor der Erzeugung (Owner 02.09.2026:
     „Landingpage-Templateauswahl-Bild hochladen-Email"). Danach gefragt hätte niemand mehr
     einen Grund, sie zu geben — und sie ist das Einzige, was ein Kunde am Ende kauft. */
  schrittDreiEins: "Wohin schicken wir", schrittDreiZwei: "es?",
  schrittVierEins: "Wir bauen", schrittVierZwei: "deinen Einsatz.",
  mailTitel: "Deine E-Mail-Adresse",
  mailZeile: "Dorthin schicken wir dein Video — und die Informationen zu deinem Weg.",
  mailStart: "Mein Video generieren",
  genFehlerTitel: "Das hat nicht geklappt",
  genNochmal: "Noch einmal versuchen",
  genPhaseEins: "Wir setzen dich in",
  genPhaseZwei: "Jetzt kommt Bewegung hinein",
  genDauerEcht: "Das dauert zwei bis drei Minuten. Bleib auf der Seite — dein Video entsteht gerade wirklich.",
  /* DER TITEL SCHLEPPT SICH NICHT MIT (Owner 02.09.2026: „wir schleppen Titel nicht mit.
     Wir schreiben das, was gerade passiert"). Der Claim wirbt — er gehört auf den ersten
     Schritt. Ab Schritt 2 steht oben, was der Nutzer JETZT tut. */

  wahlLabel: "Wähl deinen Einsatz:",
  weiter: "Weiter",
  zurueck: "Zurück",
  keineSzenen: "Noch keine Einsatzbereiche.",

  fotoKachel: "Selfie aufnehmen",
  fotoHinweis: "Frontal, gutes Licht, kein Hut.",
  fotoWaehlen: "oder ein vorhandenes Foto wählen",
  ausloesen: "Auslösen",
  kameraNochmal: "Noch einmal",
  uebernehmen: "Übernehmen",
  naeher: "Näher heranholen",
  abbrechen: "Abbrechen",
  kameraFehler: "Wir konnten die Kamera nicht öffnen. Nimm ein vorhandenes Foto:",
  linksLabel: "Dein Bild",
  einsatzAendern: "Anderen Einsatz wählen",
  zielLabel: "Dein Einsatz",
  generieren: "Jetzt generieren",
  cropTitel: "Dein Foto",
  /**
   * DIESE ZEILE MUSS STIMMEN — sie ist eine Datenschutz-Zusage, kein Werbetext.
   *
   * Hier stand „dein Foto bleibt auf deinem Gerät und wird nicht gespeichert". Das war
   * richtig, solange die Erzeugung gestellt war: Es ging wirklich nichts hinaus. Seit die
   * echte Kette läuft (02.09.2026), geht das Foto an unseren Speicher, an das Bildmodell
   * und an Pixverse — die alte Zeile wäre ab dieser Minute eine Falschaussage gewesen, und
   * zwar die eine Sorte, die einem Behördenkunden im Termin um die Ohren fliegt.
   */
  einwilligungEins: "Dein Foto wird für die Erstellung deines Videos verarbeitet und danach nur für dein Video aufbewahrt.",
  einwilligungZwei: "Nur Bilder von dir selbst dürfen hochgeladen werden.",
  /* Owner 04.09.2026: „das muss doch hier stehen" — Rechte und Löschung gehören zur selben
     Zusage wie die zwei Zeilen darüber, nicht in den separaten „Unabhängige Konzeptdemo"-
     Hinweis (der spricht von der Organisation, nicht vom Foto/Video). Technisch gedeckt
     durch den Aufräumer (`/api/aufraeumen`, eigene Frist für `theme==="armee"`) und die
     Teilen-Scheibe, die jede Karte ohnehin trägt (Skill `card`). */
  einwilligungDrei: "Das Recht an Foto und Video bleibt bei dir — du kannst es teilen oder löschen. Ohne dein Zutun löschen wir es automatisch nach 30 Tagen.",

  laeuftKicker: "Einen Moment",
  laeuftTitelEins: "Dein Video",
  laeuftTitelZwei: "entsteht",
  laeuftText: "Wir setzen dich in",
  laeuftDauer: "Das dauert etwa eine halbe Minute. Bleib auf der Seite.",

  fertigKicker: "Fertig",
  fertigTitelEins: "Das bist",
  fertigTitelZwei: "du",
  abspannEins: "Danke für deinen Einsatz!",
  abspannZwei: "Du bist uns wichtig!",

  frageTitel: "Hast du Interesse?",
  frageZeile: "Dann trag dich hier ein — wir schicken dir die Informationen zu deinem Weg.",
  feldName: "Dein Nachname",
  feldGeburt: "Geburtsdatum",
  feldMail: "name@beispiel.de",
  /* Der Haken trägt beides: die Einwilligung in den Kontakt UND den Bezug auf die AGB
     (Owner 02.09.2026). Der Link steht als eigener Textbaustein, damit er im JSX zum
     echten Verweis auf /terms wird — nie eine Adresse im Klartext (Hausregel). */
  haken: "Ich möchte Informationen per E-Mail bekommen und akzeptiere die",
  hakenAgb: "AGB",
  hakenEnde: ".",
  absenden: "Ich will weitere Informationen",
  sendet: "Einen Moment…",
  datenschutz: "Dein Foto und dein Video liegen auf unserem Server in Deutschland. Deine Adresse geht an niemanden weiter, und du kannst dich jederzeit abmelden.",
  fehlerName: "Bitte trag deinen Namen ein.",
  fehlerGeburt: "Bitte trag dein Geburtsdatum ein.",
  fehlerMail: "Diese Adresse sieht noch nicht vollständig aus.",
  fehlerHaken: "Ohne diese Zustimmung können wir dir nichts schicken.",

  dankeKicker: "Danke",
  dankeTitelEins: "Wir haben dir",
  dankeTitelZwei: "geschrieben",
  dankeText: "Schau in dein Postfach — dort liegen die Informationen zu deinem Weg. Wenn nichts ankommt, sieh bitte auch im Spam-Ordner nach.",
  nochmal: "Noch einen Einsatz ansehen",

  /* ── Die Landingpage (Owner 02.09.2026: „und fehlt die Landingpage davor. Dafür ist der
     Titel" · „hier fängt der Tunnel an"). Der Trichter stand auf `/academy` — wer aus einer
     Anzeige kam, sollte wählen, bevor er wusste, was er bekommt. ── */
  lpKartenTitel: "Ihre Anzeige",
  /**
   * DER CTA — vom Owner diktiert (02.09.2026: „Nix gratis — ich gebe dir den Text" ·
   * „MEIN VIDEO GENERIEREN").
   *
   * Er benennt das Ergebnis, nicht den Vorgang: nicht „starten" (womit? wozu?), sondern das
   * Ding, das der Besucher danach hat. Und er sagt „mein" — die Sache gehört ihm, bevor sie
   * existiert. Kein „gratis": Das Wort zieht die falschen Leute an und macht aus einer
   * Laufbahn-Frage ein Gewinnspiel.
   *
   * DERSELBE WORTLAUT STEHT AUF DEM KNOPF, DER WIRKLICH ERZEUGT (`mailStart`) — Hausregel
   * „der Button muss immer gleich bei allen heissen". Wer auf der Landingpage „Mein Video
   * generieren" gedrückt hat, findet am Ende des Trichters denselben Satz wieder und weiss,
   * dass er am richtigen Ort ist.
   */
  lpCta: "Mein Video generieren",
  lpTrust: "Dauert eine Minute · kein Konto nötig",
  /**
   * DIE SEITE SPRICHT DEN KUNDEN AN, NICHT DEN BEWERBER (Owner 02.09.2026: „Das passt hier
   * nicht. Du sagst, das ist Ihre Anzeige fürs Internet und Aussenwerbung").
   *
   * Hier stand „Ein Foto von dir, ein Einsatz deiner Wahl …" — die Sprache des Trichters.
   * Der steht aber hinter dem Knopf; DIESE Seite ist das Akquise-Werkzeug: Was der Besucher
   * oben sieht, ist die Anzeige, die er selbst schalten würde. Der Knopf lässt ihn dieselbe
   * Strecke gehen wie sein Bewerber später — deshalb duzt der Trichter weiter.
   */
  lpSub: "Das ist Ihre Anzeige — fürs Internet und für Aussenwerbung. Probieren Sie sie aus: Der Knopf führt genau dorthin, wo Ihr Bewerber landen würde.",
  lpWieTitel: "So läuft es für Ihre Bewerber",
  lpWieEins: "Wähl deinen Einsatz",
  lpWieEinsText: "Sanität, Cockpit, Cyber, Panzer oder Feld — fünf Laufbahnen, fünf Szenen. Welche es sind, bestimmen Sie.",
  lpWieZwei: "Mach ein Selfie",
  lpWieZweiText: "Frontal, gutes Licht. Die Kamera öffnet sich auf der Seite — nichts zu installieren, kein Konto.",
  lpWieDrei: "Sieh dich im Einsatz",
  lpWieDreiText: "Wir setzen sein Gesicht in die Szene und machen ein Video daraus — mit seinem Namen am Ende.",
  lpWarumTitel: "Warum das wirkt",
  lpWarumText: "Ob eine Laufbahn zu jemandem passt, entscheidet kein Prospekt. Es entscheidet der Moment, in dem er sich selbst darin sieht — und merkt, ob es sich richtig anfühlt. Wer diesen Moment hatte, hinterlässt seine Adresse freiwillig.",
  /* ── Wo die Anwendung läuft (Owner 02.09.2026: „Wir können diese Applikation im Web, auf
     dem Handy, Projektionen und auf einem Display laufen lassen. Die User können den
     QR-Code benutzen und sofort Videos generieren. Also Werbung am POS — bitte
     umformulieren. Dann machen wir dafür 3 Rubriken.")

     „Point of Sale" ist Fachsprache aus dem Handel und passt weder zu einer Laufbahn noch
     zu einem Bewerber, der die Seite liest. Was gemeint ist, sagt sich einfacher: Werbung
     genau dort, wo die Menschen ohnehin schon stehen. ── */
  lpOrteTitel: "Überall, wo Menschen stehen",
  lpOrteText: "Dieselbe Anwendung, drei Orte. Wer einen Bildschirm sieht, scannt den Code und hat sein Video eine Minute später auf dem eigenen Handy — kein Stand, kein Formular, kein Gespräch nötig.",
  lpOrtEinsTitel: "Im Netz",
  lpOrtEinsText: "Als Link in einer Anzeige, in einer Nachricht oder auf der eigenen Seite. Läuft auf jedem Handy und jedem Rechner, ohne Installation.",
  lpOrtZweiTitel: "Auf einem Bildschirm vor Ort",
  lpOrtZweiText: "Karrieretag, Messe, Empfang, Schaufenster: Der Bildschirm zeigt den Spot in Schleife, der Code daneben führt weiter. Gearbeitet wird auf dem eigenen Handy.",
  lpOrtDreiTitel: "Als grosse Projektion",
  lpOrtDreiText: "Bei Veranstaltungen auf eine Wand geworfen — dieselbe Anwendung, nur gross. Wer stehen bleibt, hat den Code schon vor sich.",
  lpQrTitel: "Ein Code, ein Weg",
  lpQrText: "Jeder Ort bekommt seinen eigenen Code. So ist hinterher sichtbar, welcher Bildschirm, welche Messe und welche Anzeige wie viele Menschen gebracht haben.",
  /* ── „Das bekommen Sie" + Weg zur Recruiterseite (Owner 02.09.2026: „und dann machen wir
     auf der Template-Seite und ‚das bekommen Sie‘ und wir verlinken die Recruiterseite").
     Der Besucher hat oben die Anzeige gesehen und ist durch den Trichter gegangen — hier
     steht, was auf SEINER Seite ankommt, und ein Weg dorthin. ── */
  lpKundeTitel: "Das bekommen Sie",
  lpKundeText: "Ihre Bewerber sehen die Anzeige und gehen genau die Strecke, die Sie eben gegangen sind. Was bei Ihnen ankommt, ist keine Klickzahl, sondern eine Liste von Menschen, die sich diesen Weg angesehen haben — mit dem, was sie freigegeben haben, und dem, was sie gekostet haben.",
  lpKundeEins: "Eine Kandidatenliste statt Klickzahlen",
  lpKundeZwei: "Kosten je Profil, nicht je Klick",
  lpKundeDrei: "Ihre Daten auf einem Server in Deutschland",
  /* „RECRUITERSEITE" SAGT NICHT, WAS DAHINTER WARTET (Owner 04.09.2026, am Knopf: „der Knopf
     heisst nicht richtig … Das führt zu Infos für was?"). Der Knopf führt auf die eigene
     Auswertung des Kunden — Anzeigen, Kosten, Bewerberliste. „Auswertung" ist im ganzen Haus
     schon das Wort dafür (siehe `zugangText`, `lpWlText` unten); der Knopf übernimmt es. */
  lpKundeKnopf: "Beispiel-Auswertung ansehen",
  /* ── Der Name der Sache, am Ende der Seite (Owner 02.09.2026: „schreib noch auf dieser
     Seite unten, das ist ein Video-Recruiting"). Wer bis hierher gelesen hat, hat verstanden,
     WIE es funktioniert — jetzt bekommt es einen Namen, den er weitersagen kann. ── */
  lpNameTitel: "Das ist Video-Recruiting",
  lpNameText: "Keine Stellenanzeige, kein Formular, kein Bewerbungsgespräch am Anfang. Ihr Bewerber sieht sich selbst in der Rolle, bevor er sich überhaupt bewirbt — und Sie erfahren von ihm, weil er es will, nicht weil ein Formular ihn dazu gezwungen hat. Dasselbe lässt sich für jede Laufbahn, jede Branche und jedes Land bauen.",
  /* ── White Label als Rubrik (Owner 02.09.2026: „man kann sogar eine Rubrik schreiben, dass
     man das als White-Label bekommen kann"). Der Beweis steht bereits auf der Seite: kein
     Logo im Kopf, kein Fuss, kein fremder Name — der Text sagt nur, was der Leser ohnehin
     schon sieht. ── */
  lpWlTitel: "Und Ihr Name steht darauf, nicht unserer",
  lpWlText: "Sehen Sie sich diese Seite an: kein fremdes Logo, kein fremder Absender, nichts als Ihre Marke. Genau so bekommen Sie das Ganze — Anzeige, Trichter und Auswertung unter Ihrem Namen, auf Wunsch unter Ihrer eigenen Adresse. Wer sich bewirbt, sieht Sie und nur Sie. Dass wir es gebaut haben, steht in Ihrem Vertrag und sonst nirgends.",
  /* ── „Aktuelle Generierungen" (Owner 02.09.2026: „Der User muss sein Video dort sehen. Es
     soll nicht springen. Dann machst du hier eine neue Funktion ‚Meine Videos'" — und gleich
     darauf: „oder besser Aktuelle Generierungen"). Der zweite Name ist der bessere: „Meine
     Videos" klingt nach einer Sammlung, die man pflegt; hier liegt das, was gerade entstanden
     ist, und genau danach sucht jemand, der sich verklickt hat. ── */
  genChip: "Generierungen",
  genSeiteTitelEins: "Deine", genSeiteTitelZwei: "Generierungen",
  genSeiteLead: "Was auf diesem Gerät entstanden ist. Tippe ein Video an, um es anzusehen oder zu verschicken.",
  genLeerTitel: "Noch nichts da",
  genLeerText: "Sobald du ein Video erstellt hast, findest du es hier wieder — auch wenn du zwischendurch weggeklickt hast.",
  genZurueck: "Zurück zum Anfang",
  genLaedt: "Einen Moment…",
  genLaeuftText: "Dein Video entsteht gerade — es erscheint hier von selbst.",
  lpUnten: "Selbst ausprobieren?",
  ton: "Ton an", tonAus: "Ton aus", gross: "Vergrössern", klein: "Verkleinern",
  /* Verschicken statt herunterladen (Owner 02.09.2026: „das sollen sich die Leute doch
     schicken. Sie können das eh nicht runterladen"). */
  teilen: "Video verschicken", teilenKopiert: "Link kopiert", teilenText: "Sieh dir das an:",
  /**
   * DER LÖSCHWEG — ZWEI TIPPS, KEIN DIALOG (Owner 04.09.2026: „es muss auch ein lösch button
   * her" · „mit dialog wirklich für immer löschen?" · „es verschwindet für immer aus dem
   * netz" · „wenn du das jetzt nicht löschst, wir löschen das sowieso in 30 tagen").
   *
   * Die Frage steht im Knopf, nicht in einer Überlagerung: Overlay-Dialoge gehen in diesem
   * Haus regelmässig schief, und für Löschen gilt seit dem 30.07.2026 ohnehin „zwei Tipps,
   * rot" statt `window.confirm`. Der zweite Satz nimmt der Entscheidung die Schärfe — wer
   * zögert, muss nichts tun; die Frist läuft für ihn.
   */
  loeschen: "Video löschen",
  loeschenSicher: "Wirklich für immer löschen? Wenn du nichts tust, löschen wir es ohnehin nach 30 Tagen.",
  loeschenLaeuft: "Wird gelöscht …",
  geloescht: "Gelöscht. Dein Video und dein Foto sind aus dem Netz.",
  loeschenFehler: "Das Löschen hat nicht geklappt. Versuch es noch einmal.",
  perMail: "Per E-Mail senden",
  /* EIGENER KNOPFTEXT FÜR DAS GETEILTE VIDEO (02.09.2026: „Button fehlt Dein Video
     generieren"). `lpCta` sagt „MEIN Video generieren" — richtig auf der Landingpage, wo der
     Kunde SEINE eigene Anzeige ausprobiert, aber falsch hier: Wer einen geteilten Link öffnet,
     hat gerade das Video eines ANDEREN gesehen; ihn spricht „Dein" an, nicht „Mein". */
  geteiltCta: "Dein Video generieren",

  /* DIE LIEFERMAIL (02.09.2026) — der Knopf `perMail` sprang bis heute nur zum Formular
     hinunter; verschickt wurde nichts. `dankeText` verspricht aber „schau in dein
     Postfach" — das hier ist die Mail, die dieses Versprechen einlöst. */
  mailBetreff: "Dein Video ist da",
  mailUeberschrift: "Danke {name}, dein Video ist fertig",
  mailText: "Es steht bereit — der Knopf führt dich direkt hin.",
  mailKnopf: "Video ansehen",
};

export const ARMEE_EN: ArmeeTexte = {
  kicker: "Your career",
  claimEins: "Is this your path?",
  claimZwei: "Find out.",
  claimDrei: "See yourself in action.",
  schrittEinsEins: "Choose", schrittEinsZwei: "your field.",
  schrittZweiEins: "Now", schrittZweiZwei: "your face.",
  schrittDreiEins: "Where do we send", schrittDreiZwei: "it?",
  schrittVierEins: "We are building", schrittVierZwei: "your mission.",
  mailTitel: "Your e-mail address",
  mailZeile: "That is where we send your video — and the information about your path.",
  mailStart: "Create my video",
  genFehlerTitel: "That did not work",
  genNochmal: "Try again",
  genPhaseEins: "Placing you in",
  genPhaseZwei: "Now it starts moving",
  genDauerEcht: "This takes two to three minutes. Stay on the page — your video is being made right now.",

  wahlLabel: "Choose your field:",
  weiter: "Continue",
  zurueck: "Back",
  keineSzenen: "No fields yet.",

  fotoKachel: "Take a selfie",
  fotoHinweis: "Face on, good light, no hat.",
  fotoWaehlen: "or pick an existing photo",
  ausloesen: "Take photo",
  kameraNochmal: "Again",
  uebernehmen: "Use this",
  naeher: "Zoom in",
  abbrechen: "Cancel",
  kameraFehler: "We could not open the camera. Use an existing photo instead:",
  linksLabel: "Your photo",
  einsatzAendern: "Choose another field",
  zielLabel: "Your field",
  generieren: "Generate now",
  cropTitel: "Your photo",
  einwilligungEins: "Your photo is processed to create your video and kept only for that video.",
  einwilligungZwei: "Only upload pictures of yourself.",
  einwilligungDrei: "The rights to your photo and video stay with you — you can share or delete it yourself. If you do nothing, we delete it automatically after 30 days.",

  laeuftKicker: "One moment",
  laeuftTitelEins: "Your video is",
  laeuftTitelZwei: "being made",
  laeuftText: "Placing you in",
  laeuftDauer: "This takes about half a minute. Stay on the page.",

  fertigKicker: "Done",
  fertigTitelEins: "That's",
  fertigTitelZwei: "you",
  abspannEins: "Thank you for your service!",
  abspannZwei: "You matter to us!",

  frageTitel: "Interested?",
  frageZeile: "Then leave your details — we'll send you the information for your path.",
  feldName: "Your surname",
  feldGeburt: "Date of birth",
  feldMail: "name@example.com",
  haken: "I'd like to receive information by email and accept the",
  hakenAgb: "terms",
  hakenEnde: ".",
  absenden: "I want more information",
  sendet: "One moment…",
  datenschutz: "Your photo and video are held on our server in Germany. Your address is passed to no one, and you can unsubscribe at any time.",
  fehlerName: "Please enter your name.",
  fehlerGeburt: "Please enter your date of birth.",
  fehlerMail: "This address doesn't look complete yet.",
  fehlerHaken: "Without this consent we can't send you anything.",

  dankeKicker: "Thank you",
  dankeTitelEins: "We've written",
  dankeTitelZwei: "to you",
  dankeText: "Check your inbox — the information for your path is waiting there. If nothing arrives, please look in your spam folder too.",
  nochmal: "See another field",

  lpKartenTitel: "Your advert",
  lpCta: "Create my video",
  lpTrust: "Takes a minute · no account needed",
  lpSub: "This is your advert — for the web and for out-of-home. Try it: the button takes you exactly where your applicant would land.",
  lpWieTitel: "How it runs for your applicants",
  lpWieEins: "Choose your field",
  lpWieEinsText: "Medic, cockpit, cyber, armour or infantry — five careers, five scenes. Which ones is your call.",
  lpWieZwei: "Take a selfie",
  lpWieZweiText: "Face on, good light. The camera opens on the page — nothing to install, no account.",
  lpWieDrei: "See yourself in action",
  lpWieDreiText: "We put their face into the scene and turn it into a video — with their name at the end.",
  lpWarumTitel: "Why it works",
  lpWarumText: "No brochure decides whether a career fits someone. The moment they see themselves in it does — and they know straight away whether it feels right. Anyone who has had that moment leaves their address willingly.",
  lpOrteTitel: "Wherever people are standing",
  lpOrteText: "One application, three places. Anyone who sees a screen scans the code and has their video on their own phone a minute later — no stand, no form, no conversation needed.",
  lpOrtEinsTitel: "Online",
  lpOrtEinsText: "As a link in an advert, in a message or on your own site. Runs on any phone and any computer, with nothing to install.",
  lpOrtZweiTitel: "On a screen on site",
  lpOrtZweiText: "Career day, trade fair, reception, shop window: the screen loops the spot, the code beside it takes over. The work happens on the visitor's own phone.",
  lpOrtDreiTitel: "As a large projection",
  lpOrtDreiText: "Thrown onto a wall at events — the same application, just bigger. Anyone who stops already has the code in front of them.",
  lpQrTitel: "One code, one path",
  lpQrText: "Every location gets its own code. That makes it visible afterwards which screen, which fair and which advert brought how many people.",
  lpKundeTitel: "What you get",
  lpKundeText: "Your applicants see the advert and walk exactly the path you just walked. What reaches you is not a click count but a list of people who have looked at this path — with what they released, and what they cost.",
  lpKundeEins: "A candidate list instead of click counts",
  lpKundeZwei: "Cost per profile, not per click",
  lpKundeDrei: "Your data on a server in Germany",
  lpKundeKnopf: "See a sample dashboard",
  lpNameTitel: "This is video recruiting",
  lpNameText: "No job ad, no form, no interview at the start. Your applicant sees themselves in the role before they even apply — and you hear from them because they want you to, not because a form made them. The same can be built for any career, any industry and any country.",
  lpWlTitel: "And it carries your name, not ours",
  lpWlText: "Look at this page: no foreign logo, no foreign sender, nothing but your brand. That is exactly how you get it — advert, funnel and analytics under your name, on your own domain if you wish. Anyone who applies sees you and only you. That we built it is in your contract and nowhere else.",
  genChip: "Generations",
  genSeiteTitelEins: "Your", genSeiteTitelZwei: "generations",
  genSeiteLead: "What has been created on this device. Tap a video to watch or send it.",
  genLeerTitel: "Nothing here yet",
  genLeerText: "As soon as you have made a video, you will find it here again — even if you clicked away in between.",
  genZurueck: "Back to the start",
  genLaedt: "One moment…",
  genLaeuftText: "Your video is being created — it will appear here by itself.",
  lpUnten: "Try it yourself?",
  ton: "Sound on", tonAus: "Sound off", gross: "Enlarge", klein: "Shrink",
  teilen: "Send this video", teilenKopiert: "Link copied", teilenText: "Look at this:",
  loeschen: "Delete video",
  loeschenSicher: "Delete it for good? If you do nothing, we delete it after 30 days anyway.",
  loeschenLaeuft: "Deleting …",
  geloescht: "Deleted. Your video and your photo are gone from the internet.",
  loeschenFehler: "Deleting did not work. Please try again.",
  perMail: "Send by e-mail",
  geteiltCta: "Create your video",

  mailBetreff: "Your video is ready",
  mailUeberschrift: "Thank you {name}, your video is ready",
  mailText: "It's ready — the button takes you straight there.",
  mailKnopf: "Watch your video",
};

export const ARMEE_RO: ArmeeTexte = {
  kicker: "Cariera ta",
  claimEins: "Este drumul tău?",
  claimZwei: "Află acum.",
  claimDrei: "Vezi-te pe tine în misiune.",

  schrittEinsEins: "Alege", schrittEinsZwei: "misiunea ta.",
  schrittZweiEins: "Acum", schrittZweiZwei: "chipul tău.",
  schrittDreiEins: "Unde îți trimitem", schrittDreiZwei: "asta?",
  schrittVierEins: "Construim", schrittVierZwei: "misiunea ta.",
  mailTitel: "Adresa ta de e-mail",
  mailZeile: "Acolo îți trimitem videoclipul — și informațiile despre parcursul tău.",
  mailStart: "Generează-mi videoclipul",
  genFehlerTitel: "Nu a mers",
  genNochmal: "Încearcă din nou",
  genPhaseEins: "Te punem în",
  genPhaseZwei: "Acum prinde viață",
  genDauerEcht: "Durează două până la trei minute. Rămâi pe pagină — videoclipul tău chiar se creează acum.",

  wahlLabel: "Alege misiunea ta:",
  weiter: "Continuă",
  zurueck: "Înapoi",
  keineSzenen: "Încă nu există domenii de misiune.",

  fotoKachel: "Fă un selfie",
  fotoHinweis: "Din față, lumină bună, fără pălărie.",
  fotoWaehlen: "sau alege o poză existentă",
  ausloesen: "Fotografiază",
  kameraNochmal: "Încă o dată",
  uebernehmen: "Folosește",
  naeher: "Apropie imaginea",
  abbrechen: "Anulează",
  kameraFehler: "Nu am putut deschide camera. Alege o poză existentă:",
  linksLabel: "Poza ta",
  einsatzAendern: "Alege altă misiune",
  zielLabel: "Misiunea ta",
  generieren: "Generează acum",
  cropTitel: "Poza ta",
  einwilligungEins: "Poza ta este folosită pentru crearea videoclipului tău și păstrată doar pentru acest videoclip.",
  einwilligungZwei: "Poți încărca doar poze cu tine însuți.",
  einwilligungDrei: "Drepturile asupra fotografiei și videoclipului rămân ale tale — poți să îl distribui sau să îl ștergi. Dacă nu faci nimic, îl ștergem automat după 30 de zile.",

  laeuftKicker: "Un moment",
  laeuftTitelEins: "Videoclipul tău",
  laeuftTitelZwei: "se creează",
  laeuftText: "Te punem în",
  laeuftDauer: "Durează circa jumătate de minut. Rămâi pe pagină.",

  fertigKicker: "Gata",
  fertigTitelEins: "Acesta ești",
  fertigTitelZwei: "tu",
  abspannEins: "Mulțumim pentru implicarea ta!",
  abspannZwei: "Contezi pentru noi!",

  frageTitel: "Ești interesat?",
  frageZeile: "Atunci înscrie-te aici — îți trimitem informațiile despre parcursul tău.",
  feldName: "Numele tău de familie",
  feldGeburt: "Data nașterii",
  feldMail: "nume@exemplu.ro",
  haken: "Doresc să primesc informații prin e-mail și accept",
  hakenAgb: "Termenii și condițiile",
  hakenEnde: ".",
  absenden: "Vreau mai multe informații",
  sendet: "Un moment…",
  datenschutz: "Poza și videoclipul tău sunt păstrate pe serverul nostru din Germania. Adresa ta nu este transmisă nimănui, și te poți dezabona oricând.",
  fehlerName: "Te rugăm să introduci numele tău.",
  fehlerGeburt: "Te rugăm să introduci data nașterii.",
  fehlerMail: "Această adresă nu pare completă încă.",
  fehlerHaken: "Fără acest acord nu îți putem trimite nimic.",

  dankeKicker: "Mulțumim",
  dankeTitelEins: "Ți-am",
  dankeTitelZwei: "scris",
  dankeText: "Verifică-ți căsuța de e-mail — acolo găsești informațiile despre parcursul tău. Dacă nu vezi nimic, te rugăm să verifici și folderul de spam.",
  nochmal: "Vezi încă o misiune",

  lpKartenTitel: "Anunțul dumneavoastră",
  lpCta: "Generează-mi videoclipul",
  lpTrust: "Durează un minut · fără cont necesar",
  lpSub: "Acesta este anunțul dumneavoastră — pentru internet și pentru publicitate outdoor. Încercați-l: butonul duce exact acolo unde ar ajunge candidatul dumneavoastră.",
  lpWieTitel: "Așa funcționează pentru candidații dumneavoastră",
  lpWieEins: "Alege-ți misiunea",
  lpWieEinsText: "Sanitar, cockpit, cyber, tanc sau infanterie — cinci cariere, cinci scenarii. Dumneavoastră decideți care sunt.",
  lpWieZwei: "Fă un selfie",
  lpWieZweiText: "Din față, lumină bună. Camera se deschide direct pe pagină — nimic de instalat, fără cont.",
  lpWieDrei: "Vezi-te în misiune",
  lpWieDreiText: "Îi punem chipul în scenă și creăm un videoclip din asta — cu numele lui la final.",
  lpWarumTitel: "De ce funcționează",
  lpWarumText: "Dacă o carieră i se potrivește cuiva, nu decide o broșură. Decide momentul în care se vede pe sine în ea — și simte dacă i se potrivește cu adevărat. Cine a trăit acest moment își lasă adresa de bunăvoie.",
  lpOrteTitel: "Oriunde se află oamenii",
  lpOrteText: "Aceeași aplicație, trei locuri. Cine vede un ecran scanează codul și are videoclipul pe telefonul propriu un minut mai târziu — fără stand, fără formular, fără discuție necesară.",
  lpOrtEinsTitel: "Pe internet",
  lpOrtEinsText: "Ca link într-un anunț, într-un mesaj sau pe propriul site. Funcționează pe orice telefon și pe orice calculator, fără instalare.",
  lpOrtZweiTitel: "Pe un ecran la fața locului",
  lpOrtZweiText: "Ziua carierei, târg, recepție, vitrină: ecranul rulează spotul în buclă, iar codul de alături duce mai departe. Se lucrează pe telefonul propriu.",
  lpOrtDreiTitel: "Ca proiecție mare",
  lpOrtDreiText: "Proiectat pe un perete la evenimente — aceeași aplicație, doar mai mare. Cine se oprește are deja codul în față.",
  lpQrTitel: "Un cod, un drum",
  lpQrText: "Fiecare loc primește propriul cod. Așa se vede ulterior câți oameni a adus fiecare ecran, fiecare târg și fiecare anunț.",
  lpKundeTitel: "Asta primiți dumneavoastră",
  lpKundeText: "Candidații dumneavoastră văd anunțul și parcurg exact drumul pe care tocmai l-ați parcurs. Ce ajunge la dumneavoastră nu este un număr de clicuri, ci o listă de oameni care au parcurs acest drum — cu ce au acceptat să dezvăluie și cu ce au costat.",
  lpKundeEins: "O listă de candidați în loc de clicuri",
  lpKundeZwei: "Costuri pe profil, nu pe clic",
  lpKundeDrei: "Datele dumneavoastră pe un server din Germania",
  lpKundeKnopf: "Vedeți un exemplu de analiză",
  lpNameTitel: "Aceasta este recrutare prin video",
  lpNameText: "Fără anunț de angajare, fără formular, fără interviu la început. Candidatul dumneavoastră se vede pe sine în acel rol înainte să aplice — și aflați despre el pentru că el vrea asta, nu pentru că l-a obligat un formular. Același lucru se poate construi pentru orice carieră, orice domeniu și orice țară.",
  lpWlTitel: "Și numele dumneavoastră apare pe el, nu al nostru",
  lpWlText: "Priviți această pagină: niciun logo străin, niciun expeditor străin, nimic altceva decât marca dumneavoastră. Exact așa primiți totul — anunț, funnel și raportare sub numele dumneavoastră, la cerere pe propriul domeniu. Cine aplică vă vede doar pe dumneavoastră. Faptul că noi am construit-o apare doar în contract, nicăieri altundeva.",

  genChip: "Generări",
  genSeiteTitelEins: "Generările", genSeiteTitelZwei: "tale",
  genSeiteLead: "Ce a fost creat pe acest dispozitiv. Atinge un videoclip pentru a-l vedea sau a-l trimite.",
  genLeerTitel: "Încă nimic aici",
  genLeerText: "De îndată ce creezi un videoclip, îl găsești din nou aici — chiar dacă între timp ai părăsit pagina.",
  genZurueck: "Înapoi la început",
  genLaedt: "Un moment…",
  genLaeuftText: "Videoclipul tău se creează chiar acum — va apărea aici automat.",
  lpUnten: "Încerci și tu?",
  ton: "Sunet activat", tonAus: "Sunet oprit", gross: "Mărește", klein: "Micșorează",
  teilen: "Trimite videoclipul", teilenKopiert: "Link copiat", teilenText: "Uită-te la asta:",
  loeschen: "Șterge videoclipul",
  loeschenSicher: "Chiar vrei să îl ștergi definitiv? Dacă nu faci nimic, îl ștergem oricum după 30 de zile.",
  loeschenLaeuft: "Se șterge …",
  geloescht: "Șters. Videoclipul și poza ta nu mai sunt online.",
  loeschenFehler: "Ștergerea nu a reușit. Mai încearcă o dată.",
  perMail: "Trimite prin e-mail",
  geteiltCta: "Generează-ți videoclipul",

  mailBetreff: "Videoclipul tău a sosit",
  mailUeberschrift: "Mulțumim {name}, videoclipul tău este gata",
  mailText: "Este gata — butonul te duce direct la el.",
  mailKnopf: "Vezi videoclipul",
};

/**
 * DER HINWEIS, DASS ES DIE UPA NICHT GIBT (Owner 04.09.2026, am Bildschirmfoto der
 * Landingpage: „Das ist eine Beispiel Kampagne und die UPA existiert nicht").
 *
 * Er steht knapp unter der Überschrift, VOR der Anzeigen-Karte — bevor der Besucher auf ein
 * Bild trifft, das wie eine echte Anzeige aussieht. Kein Feld in `ArmeeTexte`, weil er zu
 * keinem der ~130 Trichter-Wörter gehört: Er gilt nur dieser einen Demo, nicht jeder
 * künftigen Kampagne, die denselben Wortschatz benutzt (siehe `lib/kampagnen.ts`).
 */
/**
 * AUSFÜHRLICHER GEWORDEN (Owner 04.09.2026: „ich schreibe jetzt die Armee an und die prüfen
 * so einiges"). Solange die Demo nur intern zirkulierte, reichte ein Satz. Sobald echte
 * Ansprechpartner bei Streitkräften den Link öffnen, muss auf den ersten Blick klar sein: kein
 * Auftrag, keine Zusammenarbeit, keine echte Kampagne — nur `titel` + `text`, zwei Zeilen statt
 * einer, damit die Aussage nicht in der Fussnote untergeht.
 */
export const ARMEE_DEMO_HINWEIS: Record<"de" | "ro" | "en", { titel: string; text: string }> = {
  de: {
    titel: "Unabhängige Konzeptdemo",
    text: "Dieses Projekt ist eine unabhängige Demonstration von LuxuryBandit. Es wurde nicht im Auftrag einer staatlichen Stelle oder einer militärischen Organisation erstellt und ist weder offiziell genehmigt noch mit einer solchen Organisation verbunden. Es handelt sich nicht um eine offizielle Recruiting-Kampagne. Alle dargestellten Personen, Daten und Ergebnisse sind fiktiv und dienen ausschließlich der Demonstration des Konzepts.",
  },
  ro: {
    titel: "Demonstrație de concept independentă",
    text: "Acest proiect este o demonstrație independentă realizată de LuxuryBandit. Nu a fost creat în numele vreunei instituții de stat sau organizații militare și nu este nici aprobat oficial, nici afiliat unei astfel de organizații. Nu este o campanie oficială de recrutare. Toate persoanele, datele și rezultatele prezentate sunt fictive și au ca unic scop demonstrarea conceptului.",
  },
  en: {
    titel: "Independent concept demo",
    text: "This project is an independent demonstration by LuxuryBandit. It was not created on behalf of any government body or military organization, and is neither officially endorsed by nor affiliated with any such organization. It is not an official recruiting campaign. All people, data, and results shown are fictional and serve solely to demonstrate the concept.",
  },
};

export const ARMEE_SPRACHEN = ["de", "ro", "en"] as const;

/**
 * WELCHE SPRACHE DIESE SEITEN WIRKLICH SPRECHEN (Owner 02.09.2026: „wir haben hier
 * rumänische Texte" — auf der englischen Fassung der Academy-Seite).
 *
 * `armeeTexte` kennt zwei Sprachen und fällt bei allem anderen auf Englisch zurück. Der
 * Orte-Block (`lib/orte-texte`) kennt DREI, weil er aus dem Media Kit stammt — und bei einem
 * Besucher mit rumänischem Cookie stand die halbe Seite auf Englisch und der eine Abschnitt
 * darunter auf Rumänisch. Kein Übersetzungsfehler, sondern zwei Bausteine mit verschieden
 * grossem Wortschatz auf derselben Seite.
 *
 * Wer einen mehrsprachigen Baustein auf diesen Seiten einsetzt, reicht die Sprache HIER
 * durch — dann sagt eine Stelle, was die Seite kann, statt dass jeder Baustein für sich
 * entscheidet.
 */
export function armeeSprache(lang?: string): "de" | "ro" | "en" {
  const l = String(lang ?? "").toLowerCase();
  if (l.startsWith("de")) return "de";
  if (l.startsWith("ro")) return "ro";
  return "en";
}
export const armeeTexte = (lang?: string): ArmeeTexte => {
  const s = armeeSprache(lang);
  return s === "de" ? ARMEE_DE : s === "ro" ? ARMEE_RO : ARMEE_EN;
};

/**
 * DAS FERTIGE VIDEO AN DEN BEWERBER (02.09.2026, „das Video per E-Mail an den Bewerber
 * schicken" — `perMail`-Knopf und `dankeText` versprachen das seit heute schon, ohne dass
 * eine Zeile Post verschickt wurde).
 *
 * OHNE LUXURYBANDIT-MARKE: Der Trichter läuft White Label unter der Marke des Kunden
 * (`DEMO_KUNDE.name`, siehe [[academy-trichter-whitelabel]]) — die generische Liefermail des
 * Hauses (`verschicken` in /api/kiss-deliver) trägt „LUXURYBANDIT" im Kopf und verlinkt die
 * eigene Galerie; beides wäre hier ein zweiter, falscher Absender. Diese Mail bekommt daher
 * ihre eigene, schlichte Gestalt und führt auf die geteilte Videoseite (`/academy/v/[id]`),
 * die schon ohne Kopfzeile auskommt.
 *
 * Gibt `true` zurück, wenn die Post raus ist — nur dann darf der Aufrufer `videoMailedAt`
 * setzen (dieselbe Regel wie bei der grossen Liefermail, nie zweimal verschicken).
 */
export async function academyVideoMailSenden(genId: string, to: string, vorname: string, lang?: string): Promise<boolean> {
  const id = String(genId ?? "").trim();
  const adresse = String(to ?? "").trim();
  if (!id || !adresse) return false;
  const T = armeeTexte(lang);
  const name = String(vorname ?? "").trim();
  const link = `${ACADEMY_DOMAIN}/academy/v/${id}`;
  const html =
    `<div style="background:#0d0b0a;padding:22px 0;font-family:Arial,Helvetica,sans-serif">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">`
    + `<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:94%;background:#16120f;border-radius:18px;overflow:hidden">`
    + `<tr><td style="padding:22px 22px 6px;color:#f6cf51;font-size:13px;font-weight:bold;letter-spacing:2px">${DEMO_KUNDE.name.toUpperCase()}</td></tr>`
    + `<tr><td style="padding:0 22px 12px;color:#fff;font-size:19px;font-weight:bold">${(name ? T.mailUeberschrift.replace("{name}", name) : T.mailUeberschrift.replace(" {name}", "")).trim()}</td></tr>`
    + `<tr><td style="padding:0 22px 18px;color:#e8e2d6;font-size:14px;line-height:1.55">${T.mailText}</td></tr>`
    + `<tr><td style="padding:0 22px 24px"><a href="${link}" style="display:inline-block;background:#f6cf51;color:#111;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:bold;text-decoration:none">${T.mailKnopf} →</a></td></tr>`
    + `</table></td></tr></table></div>`;
  const r = await sendEmail({ to: adresse, subject: T.mailBetreff, html }).catch(() => ({ ok: false }));
  return !!(r as { ok?: boolean }).ok;
}

/** Die Beschriftung der Szenen je Sprache — der Dateiname bleibt der Schlüssel. */
const SZENEN_NAMEN: Record<string, { de: string; ro: string; en: string }> = {
  cybersicherheit: { de: "Cybersicherheit", ro: "Securitate cibernetică", en: "Cyber Security" },
  feldsoldat: { de: "Feldsoldat", ro: "Soldat de infanterie", en: "Infantry" },
  panzerbesatzung: { de: "Panzerbesatzung", ro: "Echipaj de tanc", en: "Armoured Crew" },
  pilot: { de: "Pilot", ro: "Pilot", en: "Pilot" },
  sanitaeterin: { de: "Sanitäterin", ro: "Medic", en: "Medic" },
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
  /** Dieselbe Szene, mit eingebranntem Dankestext („Danke Julia, für deinen Einsatz …") —
      dieselbe Datei wie in der Anzeigen-Galerie der Recruiterseite (Owner 04.09.2026: „Das
      ist doch ein und das selbe Modul"). Für die Auswahl-Kachel des Trichters und deren
      Vollbild — NICHT für `bild` selbst, das bleibt die schlichte Fassung für Stellen, die
      keinen bestimmten Namen zeigen sollen (z. B. die Vorschau während der echten Erzeugung,
      wo noch niemand feststeht). */
  anzeigenBild: string;
  /** Derselbe eingebrannte Dankestext, als Video mit Musik — spielt im Vollbild der
      Auswahl-Kachel (Owner 04.09.2026: „im template voll modus soll starten"). */
  anzeigenVideo: string;
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
/**
 * DIE SZENEN STEHEN FEST — SIE WERDEN NICHT AUS DEM ORDNER GELESEN.
 *
 * Zwei Gründe, beide am 02.09.2026 aufgelaufen:
 *
 *  1. DER DEPLOY. `readdirSync` zwingt dazu, den Ordner über `outputFileTracingIncludes` in
 *     die Server-Funktion zu kopieren — zehn Megabyte Video, die dort niemand braucht. Das
 *     brachte eine andere Funktion des Projekts über Vercels 250-MB-Grenze.
 *  2. DIE REIHENFOLGE. `readdirSync().sort()` sortiert alphabetisch. Welche Kachel zuerst
 *     steht, ist aber eine inhaltliche Entscheidung („sie als erste" · „pilot als zweiter")
 *     und darf nicht davon abhängen, wie eine Datei heisst.
 *
 * Die Funktion braucht die Dateien gar nicht, nur ihre Namen — und deren REIHENFOLGE.
 * Ausgeliefert werden die Videos weiterhin vom CDN.
 *
 * WER EINEN BERUF ERGÄNZT: Video plus gleichnamiges `.jpg` nach `public/Armee/szenen/`,
 * den Namen hier an die gewünschte Stelle setzen, die Beschriftung in `SZENEN_NAMEN`.
 */
const SZENEN_DATEIEN = ["sanitaeterin", "pilot", "cybersicherheit", "panzerbesatzung", "feldsoldat"];

/**
 * DIE SZENEN ALS LOOK-KENNUNGEN — für `LOOK_IDS` in /api/kiss-log.
 *
 * Diese Liste ist kein Beiwerk: Der Wertevorrat dort verwirft jede Kennung, die er nicht
 * kennt, STILLSCHWEIGEND. Genau daran sind schon dreimal Aufträge mit der falschen Vorlage
 * gerendert worden (Versprechen 11.08., Tanz 15.08., Kuss 16.08. — die Begründungen stehen
 * über `LOOK_IDS`). Wer hier eine Szene ergänzt und die Liste vergisst, baut denselben
 * Fehler ein Viertes Mal.
 */
export const ARMEE_LOOKS: { id: string }[] = SZENEN_DATEIEN.map(id => ({ id }));

/**
 * DER SPOT — das EINE Video der Landingpage (Owner 02.09.2026: „auf der Landingpage kommt
 * nur der Spotvideo").
 *
 * Dort stand ein Karussell mit allen fünf Einsätzen. Das war als Argument gedacht („fünf
 * Wege"), ist aber die Arbeit des TRICHTERS: Er zeigt dieselben fünf in Schritt 1, dort
 * gehört die Wahl hin. Auf der Landingpage konkurrieren fünf Videos miteinander, statt dass
 * eines die Sache erklärt — und wer blättert, drückt nicht.
 *
 * EINE KONSTANTE, KEIN PFAD IN DER SEITE (Memory `landingpage-video-ist-kachel-video`):
 * dasselbe Video für die Landingpage-Karte und jede spätere Kachel. Faststart ist am
 * 02.09.2026 nachgezogen worden — ohne ihn hängt der Spieler beim ersten Tipp.
 */
/**
 * DER SPOT — jetzt DREI, nicht einer (Owner 04.09.2026: „ok baue es ein in allen 3
 * Sprachen").
 *
 * Das Bild bleibt dasselbe neutrale Material in allen drei Fassungen — kein
 * Hoheitszeichen, keine Flagge, für jeden Markt gültig (Owner: „das für alle Länder
 * passt" · „das kann man später für jede Academie nehmen"). Was wechselt, ist NUR die
 * Tonspur: eigene Sprecherstimme und eigene Untertitel je Sprache, dazu ein eigenes
 * Schlussbild mit dem Code zur jeweiligen `/academy/<lang>/start`.
 *
 * `ARMEE_SPOT`/`ARMEE_SPOT_POSTER` bleiben als Rückfall stehen (Englisch) — für Stellen,
 * die keine Sprache kennen, etwa die Themen-Kachel im Katalog.
 */
const ARMEE_SPOTS: Record<"de" | "ro" | "en", { video: string; poster: string }> = {
  de: { video: `/${ORDNER}/spot-de.mp4`, poster: `/${ORDNER}/spot-de.jpg` },
  ro: { video: `/${ORDNER}/spot-ro.mp4`, poster: `/${ORDNER}/spot-ro.jpg` },
  en: { video: `/${ORDNER}/spot-en.mp4`, poster: `/${ORDNER}/spot-en.jpg` },
};

export function armeeSpot(lang?: string): { video: string; poster: string } {
  return ARMEE_SPOTS[armeeSprache(lang)];
}

export const ARMEE_SPOT = ARMEE_SPOTS.en.video;
export const ARMEE_SPOT_POSTER = ARMEE_SPOTS.en.poster;


export function demoSzenen(lang = "de"): DemoSzene[] {
  const s = armeeSprache(lang);
  return SZENEN_DATEIEN.map(roh => ({
    id: roh,
    name: SZENEN_NAMEN[roh]?.[s]
      ?? roh.replace(/[_-]+/g, " ").replace(/^./, c => c.toUpperCase()),
    bild: `/${ORDNER}/szenen/${roh}.jpg`,
    video: `/${ORDNER}/szenen/${roh}.mp4`,
    anzeigenBild: `/${ORDNER}/anzeigen/${roh}-${s}.jpg`,
    anzeigenVideo: `/${ORDNER}/anzeigen/${roh}-${s}.mp4`,
  }));
}

/* ══ 4c · Die Erzeugung: was für jede Szene gerechnet wird ══ */

/**
 * DIE PROMPTS DER KETTE — hier, nicht in einem Skript daneben.
 *
 * Die fünf Szenen sind mit genau diesen Texten entstanden. Sie tragen drei Lehren, die alle
 * am 02.09.2026 Geld gekostet haben, bevor sie hier standen:
 *
 *  1. DIE GEGENWART MUSS DASTEHEN. Ohne „present day / year 2026 / current-generation"
 *     landet das Bildmodell bei Militärmotiven zuverlässig in den Vierzigern — Overall,
 *     Lederhaube, Stahlhelm. Zweimal passiert, zweimal am selben fehlenden Wort.
 *  2. KEIN HOHEITSZEICHEN. Kein Wappen, keine Flagge, kein Abzeichen — die Organisation ist
 *     erfunden, und ein nachgebautes Staatszeichen wäre auch in einer Demo heikel.
 *  3. KEIN ROTES KREUZ. Bei „medic" erfindet das Modell es von selbst; das Zeichen ist durch
 *     die Genfer Konventionen geschützt. Der Sanitätsprompt verlangt ausdrücklich ein grünes.
 *
 * DER GEMEINSAME KOPF steht in `IDENT`: Er bindet das Gesicht der hochgeladenen Person. Ohne
 * ihn nimmt Pixverse das Gesicht aus der Szene — genau daran ist der erste Versuch mit einem
 * direkten Fusion-Lauf gescheitert.
 */
const IDENT = `Keep the exact face, hair and identity of the person in the reference photo — same person, unmistakably recognisable. Their entire face is clearly visible and well lit. No insignia, no badges, no national flags, no unit patches, no text anywhere. Photorealistic, cinematic, vertical portrait.
PRESENT DAY, MODERN MILITARY, year 2026. Contemporary equipment only — absolutely nothing historical, nothing from the 20th century.
Leave clear headroom above the head or helmet — the top of the head/helmet must sit well below the top edge of the frame, never touching or cropped by it.`;

export const SZENEN_PROMPTS: Record<string, { bild: string; video: string }> = {
  sanitaeterin: {
    bild: `${IDENT}
They are a military medic riding in the passenger seat of a modern medical vehicle that is driving; the landscape outside the window is blurred by the motion.
They wear a plain RED BERET without any emblem, a modern digital-camouflage uniform and a plain white armband. Their equipment bag carries a plain GREEN CROSS on a white square.
ABSOLUTELY NO RED CROSS anywhere: never a red cross, no red crescent. Every medical marking is GREEN, never red. This is essential.
Bright daylight through the windscreen, warm and calm.`,
    video: "The vehicle drives on, the landscape rushes past the window behind them, daylight shifts across their face, they look ahead, then turn briefly toward the camera with a calm confident expression. Warm cinematic orchestral score. Photorealistic, present day.",
  },
  pilot: {
    bild: `${IDENT}
They are a fighter pilot IN FLIGHT, seated in the cockpit of a jet high above the clouds. Bright sky, sunlit clouds and the curved horizon fill the background.
They wear a plain grey flight helmet with the VISOR RAISED so their entire face is clearly visible and lit — no oxygen mask over the face.
Hands on the controls, focused confident expression, looking ahead. Sunlight sweeping across their face, cinematic aerial photography.`,
    video: "The jet banks hard through the clouds, the horizon tilts behind them, clouds rush past, sunlight sweeps across their face, subtle vibration of high-speed flight, they keep their eyes ahead and then glance briefly toward the camera. Driving cinematic orchestral score. Cinematic aerial shot, photorealistic.",
  },
  cybersicherheit: {
    bild: `${IDENT}
They are a cyber operations specialist inside a dark command centre, seated at a curved console. Large screens around them show network maps, data streams and status panels in blue and amber. The light of the screens falls across their face.
They wear a plain dark uniform shirt, focused expression, hands resting on a keyboard.`,
    video: "The screens around them flicker and update, reflections drift across their face, a slow camera push-in, they lean forward slightly and then look up into the camera. Tense electronic cinematic score. Photorealistic.",
  },
  panzerbesatzung: {
    bild: `${IDENT}
They are the commander of a CURRENT-GENERATION modern armoured fighting vehicle, standing in the open top hatch, upper body out, hands resting on the rim.
They wear a MODERN crew helmet with integrated headset and a slim boom microphone, and a modern digital-camouflage combat uniform with a low-profile plate carrier.
Dust drifting in low golden sunlight over open terrain. No weapons in view.`,
    video: "The modern armoured vehicle rolls forward, dust drifts past them, low sun flares across the lens, they scan the horizon and then glance toward the camera, subtle engine vibration. Driving cinematic orchestral score. Photorealistic, present day.",
  },
  feldsoldat: {
    bild: `${IDENT}
They are an infantry soldier standing at the edge of a misty forest at dawn, seen from the chest up.
They wear a MODERN composite combat helmet with side rails and a night-vision mount on the front, chin strap fastened, plus a modern digital-camouflage combat uniform and a low-profile plate carrier. No steel helmet.
Cold morning light through the trees, mist over the ground. No weapons in view.`,
    video: "They take a few steady steps toward the camera through the morning mist, first light breaking through the trees behind them, they lift their head and look into the camera. Driving cinematic orchestral score. Photorealistic, present day.",
  },
};

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
/**
 * DIE VERTEILUNG ÜBER GEWICHTE, NICHT ÜBER EINE ABZÄHLLISTE (Owner 02.09.2026, zweimal:
 * „immer die gleiche zahl ist blöd").
 *
 * Beide Versuche mit einer Reihum-Liste liefen auf dasselbe Problem hinaus: Zwei Kategorien
 * kamen gleich oft vor und standen am Ende auf derselben Zahl — was sofort nach Rechnung
 * aussieht statt nach Messung. Mit Prozentschwellen lässt sich jede Kategorie einzeln
 * einstellen, und krumme Werte ergeben sich von selbst.
 *
 * Die Anteile sind plausibel gewählt: Cyber zieht am stärksten (dort sitzt die Zielgruppe
 * ohnehin), Sanitätsdienst und Pilot folgen, die kämpfenden Truppengattungen liegen hinten.
 */
const BEREICH_GEWICHTE: { bis: number; name: string }[] = [
  { bis: 31, name: "Cybersicherheit" },   // 32 %
  { bis: 55, name: "Sanitäterin" },       // 24 %
  { bis: 74, name: "Pilot" },             // 19 %
  { bis: 89, name: "Feldsoldat" },        // 15 %
  { bis: 99, name: "Panzerbesatzung" },   // 10 %
];

/** 37 ist teilerfremd zu 100 — die Folge durchläuft alle Werte, statt sich zu wiederholen. */
const bereichVon = (i: number) => {
  const w = (i * 37) % 100;
  return (BEREICH_GEWICHTE.find(g => w <= g.bis) ?? BEREICH_GEWICHTE[0]).name;
};
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
    const bereich = bereichVon(i);
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
