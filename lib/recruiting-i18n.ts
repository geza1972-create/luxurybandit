import type { Lang } from "@/lib/lang";

/**
 * DIE FIRMENSEITE IN DREI SPRACHEN (Owner 31.08.2026: „ich brauche die zwei sprachen hier
 * auf der seite von recruiting oder alle sogar").
 *
 * WARUM DREI UND NICHT SIEBEN: Diese Seite spricht Recruiter, HR-Abteilungen, BPOs und
 * Shared Service Center in Rumänien an. Deutsch ist die Sprache des Auftraggebers,
 * Rumänisch die der Personalabteilung in Cluj, Timișoara und Bukarest — und Englisch die,
 * in der in genau diesen Häusern tatsächlich gearbeitet wird. Spanisch, Französisch,
 * Portugiesisch und Italienisch fallen auf Englisch zurück: Vier Fassungen, die hier
 * niemand liest, wären vier Fassungen, die bei jeder Textänderung mitgeschleppt werden
 * müssten.
 *
 * FEST IM CODE, NICHT ÜBERSETZT ZUR LAUFZEIT — dieselbe Entscheidung wie beim
 * Kontaktformular und beim Joburi-Trichter: Der erste Besucher einer Sprache wartete sonst
 * 26 bis 44 Sekunden auf ein Modell. Auf einer Seite, deren Adresse man einem Recruiter
 * schickt, ist das der erste Eindruck.
 *
 * DIE ANREDE IST FÖRMLICH. Das Haus duzt überall (Hausregel „Immer duzen") — hier nicht:
 * Der Text stammt wörtlich vom Owner und siezt („Welche Position möchten Sie besetzen?").
 * Eine Akquise-Mail an eine Personalleitung, die duzt, ist in Deutschland und Rumänien
 * gleichermassen erledigt, bevor sie gelesen wird.
 */

export type RecruitingText = {
  /* Kopf */
  kicker: string;
  h1Weiss: string;
  h1Akzent: string;
  lead: string;
  positionierung: string;
  /** Kurz genug für die Kopfzeile — die Positionierungszeile wird dort abgeschnitten. */
  kopfMotto: string;
  /**
   * EIN EINZIGER CTA-TEXT AUF DER GANZEN SEITE (Owner 31.08.2026: „Auf der gesamten Seite
   * bitte überall denselben CTA verwenden").
   *
   * Vorher hiess derselbe Schritt an drei Stellen dreimal anders — „anfragen", „starten",
   * „besprechen". Für den Leser sind das drei Angebote, von denen er keines ganz versteht;
   * für die Messung sind es drei Knöpfe, die dasselbe tun. Ein Satz, überall.
   */
  ctaHaupt: string;
  ctaZweit: string;

  /**
   * BEISPIELPROFIL — DIESELBEN FELDER WIE DIE ECHTE ZUSAMMENFASSUNG (Owner 01.09.2026, am
   * Talent-Network-Funnel selbst durchgegangen: „die Karte muss du noch anpassen").
   * Vorher zeigte die Karte erfundene Felder (Arbeitsmodell, Interesse), die der Funnel gar
   * nicht mehr abfragt — seit der Generalisierung (freie Sprachen/Land, Euro) heisst die
   * echte Zusammenfassung Beruf, Sprachen, Ort, Situation, Wichtig, Finanziell.
   */
  beispielTitel: string;
  beispielFelder: { beruf: string; sprachen: string; ort: string; situation: string; wichtig: string; finanziell: string };
  beispielWerte: { beruf: string; sprachen: string; ort: string; situation: string; wichtig: string };
  beispielHinweis: string;

  /* Problem */
  problemTitel: string;
  problemText: string;
  problemHervor: string;

  /* Was Sie erhalten */
  erhaltenTitel: string;
  erhalten: string[];
  erhaltenText: string;

  /* Der Unterschied */
  unterschiedTitel: string;
  unterschiedText: string;
  segmente: { titel: string; text: string }[];

  /* DIE STUDIE (Owner 31.08.2026: „wir haben die Rekruterseite, wo ich diese statistik
     präsentieren will"). Sie steht direkt hinter den drei Segmenten: Dort behaupten wir,
     auch Passive zu erreichen — hier steht die Zahl, die es belegt. Aus einer Behauptung
     wird ein Beweis, und zwar aus unseren eigenen Daten statt aus einer Quelle, die der
     Kunde selbst googeln könnte. */
  studieTitel: string;
  studieText: string;
  studieJetzt: string;
  studieWechsel: string;
  studieSprung: string;
  studieDeutsch: string;
  studieSuche: string;
  studieBerufe: string;
  studieAbschluss: string;
  studieFallzahl: string;
  studieQuelle: string;
  /* Die Zahl, die kein Jobportal hat: wie viele auch ohne Gehaltserhöhung wechseln würden. */
  studieOhneGeld: string;
  studieOhneGeldText: string;
  /* Beschriftungen der Antworten — dieselben Schlüssel wie im Trichter. */
  studieNiveaus: Record<string, string>;
  studieSuchen: Record<string, string>;
  studieFelder: Record<string, string>;
  studieAbschluesse: Record<string, string>;

  /**
   * DER NAME (Owner 31.08.2026: „Der ungewöhnliche Name soll erklärt werden, ohne überhaupt
   * den Gedanken ‚unseriös' anzusprechen.").
   *
   * Deshalb steht hier kein Wort über Zweifel, keine Rechtfertigung und kein „auch wenn der
   * Name anders klingt". Der Abschnitt erklärt den Namen, indem er ihn zur HALTUNG erklärt —
   * wer ihn liest, hat die Frage beantwortet bekommen, ohne dass sie gestellt wurde. Er steht
   * aus demselben Grund nicht im Kopf der Seite: Oben verkauft man das Angebot, nicht sich
   * selbst.
   */
  warumTitel: string;
  warumLead: string;
  warumText: string;
  /** Bleibt in JEDER Sprache englisch — es ist eine Marke, kein Satz. */
  warumClaim: string;

  /* So funktioniert es */
  ablaufTitel: string;
  ablauf: { titel: string; text: string }[];

  /* Pilot */
  pilotTitel: string;
  pilotText: string;
  pilotHinweis: string;

  /* Anfrageformular */
  fName: string; fNamePh: string;
  fFirma: string; fFirmaPh: string;
  fMail: string; fMailPh: string;
  fPosition: string; fPositionPh: string;
  fLink: string; fLinkPh: string;
  fKnopf: string; fLaeuft: string;
  fDanke: string;
  /** Steht klein unter dem Absende-Knopf — nimmt die Sorge, mit dem Klick etwas einzugehen. */
  fUnverbindlich: string;
  fehlerName: string; fehlerFirma: string; fehlerMail: string; fehlerPosition: string; fehlerTechnik: string;
};

const de: RecruitingText = {
  kicker: "LB RECRUITING · TALENT MARKET PULSE",
  h1Weiss: "Wir finden nicht nur Kandidaten.",
  h1Akzent: "Wir finden heraus, welches Angebot sie zum Wechsel bewegt.",
  lead: "Wir messen Gehaltserwartung, Deutschniveau, Arbeitspräferenzen und die echte Wechselbereitschaft — und identifizieren dann die Kandidaten, die Ihre Position in Betracht ziehen würden.",
  positionierung: "Deutschsprachige Kandidaten weltweit · Market Insight + Sourcing",
  kopfMotto: "Talent Market Pulse",
  ctaHaupt: "Pilot für eine Stelle anfragen",
  ctaZweit: "Beispiel ansehen",

  beispielTitel: "Beispielprofil",
  beispielFelder: { beruf: "Beruf", sprachen: "Sprachen", ort: "Ort", situation: "Situation", wichtig: "Wichtig", finanziell: "Finanziell" },
  beispielWerte: {
    beruf: "Frontend-Entwickler", sprachen: "Deutsch (C1) · Englisch (B2)", ort: "Berlin, Deutschland",
    situation: "Hat einen Job, wäre aber offen für Besseres", wichtig: "Mehr Gehalt · Remote",
  },
  beispielHinweis: "Beispielprofil – keine reale Person. Echte Kandidatenprofile werden nur mit Zustimmung weitergegeben.",

  problemTitel: "Das Problem ist nicht nur der Mangel an Kandidaten. Manchmal bewegt sie das Angebot nicht.",
  problemText: "Viele Deutschsprachige sind bereits angestellt und suchen nicht aktiv. Ein Angebot muss bei Gehalt, Flexibilität und Bedingungen relevant genug sein, damit sie einen Wechsel überhaupt in Betracht ziehen.",
  problemHervor: "Bevor Sie in Recruiting investieren, helfen wir Ihnen zu verstehen, welche Bedingungen den Markt in Bewegung bringen.",

  erhaltenTitel: "Nicht nur Kandidaten. Daten, die den Markt erklären.",
  erhalten: ["Deutschniveau", "Berufsfeld", "Standort", "Remote / Hybrid / Büro", "Wechselgehalt", "Wechselbereitschaft", "Aktiv / offen / passiv", "Rückkehr nach Rumänien"],
  erhaltenText: "Sie erfahren nicht nur, wer passen könnte, sondern auch, was die Position bieten muss, um für Kandidaten überhaupt relevant zu werden.",

  unterschiedTitel: "Nicht nur aktive Jobsucher.",
  unterschiedText: "Wir sprechen auch Menschen an, die aktuell nicht aktiv suchen, aber für die richtige Position wechseln würden.",
  segmente: [
    { titel: "Aktiv suchend", text: "Kandidaten, die jetzt eine neue Stelle wollen." },
    { titel: "Offen für Angebote", text: "Bewerben sich nicht aktiv, prüfen aber bessere Gelegenheiten." },
    { titel: "Passive Kandidaten", text: "Wechseln nur, wenn sich das Angebot wirklich lohnt." },
  ],
  studieTitel: "Was unsere Kandidaten verlangen.",
  studieText: "Laufend erhoben, direkt bei deutschsprachigen Fachkräften in Rumänien und der Diaspora — nicht aus Stellenanzeigen abgeleitet, sondern von den Menschen selbst beantwortet.",
  studieJetzt: "Verdienen heute",
  studieWechsel: "Wechseln ab",
  studieSprung: "Nötiger Aufschlag",
  studieDeutsch: "Deutschniveau",
  studieSuche: "Suchverhalten",
  studieBerufe: "Bereiche",
  studieAbschluss: "Abschluss",
  studieFallzahl: "Antworten",
  studieQuelle: "Netto pro Monat · laufende Erhebung",
  studieOhneGeld: "würden auch ohne Gehaltserhöhung wechseln",
  studieOhneGeldText: "wenn andere Bedingungen — Führung, Arbeitszeiten, Remote — deutlich besser wären.",
  studieNiveaus: { A2: "A2", B1: "B1", B2: "B2", C1: "C1", C2: "C2" },
  studieSuchen: { aktiv: "Sucht aktiv", offen: "Offen für Angebote", passiv: "Wechselt nur für das Richtige" },
  studieFelder: { suport: "Support / Kundenservice", it: "IT", finante: "Finanzen", logistica: "Logistik", inginerie: "Technik / Produktion", vanzari: "Vertrieb", sanatate: "Gesundheit / Pflege", altul: "Weitere" },
  studieAbschluesse: { gimnaziu: "Mittelschule", liceu: "Abitur", profesionala: "Berufsausbildung", licenta: "Studium", master: "Master / Promotion" },
  warumTitel: "Warum LuxuryBandit?",
  warumLead: "Weil wir Chancen nicht nur verwalten, sondern aktiv suchen, was den Markt in Bewegung bringt.",
  warumText: "LuxuryBandit sucht die Menschen und die Signale, die klassische Kanäle übersehen: wer wechseln würde, zu welchen Bedingungen und für welche Art von Gelegenheit.",
  warumClaim: "Find what others overlook.",

  ablaufTitel: "So funktioniert es",
  ablauf: [
    { titel: "Sie geben uns eine Position", text: "Wir legen Profil und Bedingungen des Angebots fest, das Sie testen wollen." },
    { titel: "Wir testen die Reaktion des Marktes", text: "Wir messen, welches Gehalt, welches Arbeitsmodell und welche Bedingungen Kandidaten einen Wechsel erwägen lassen." },
    { titel: "Wir identifizieren die relevanten Kandidaten", text: "Wir trennen die aktiven, offenen und passiven Menschen, die zum Profil passen." },
    { titel: "Sie sprechen mit denen, die echtes Interesse haben", text: "Sie erhalten vorqualifizierte Kandidaten, die signalisiert haben, dass sie die Position in Betracht ziehen würden." },
  ],

  pilotTitel: "Wir testen den Markt für eine einzige Position.",
  pilotText: "Sie geben uns eine schwer zu besetzende Position. Wir testen, welche Bedingungen die Aufmerksamkeit deutschsprachiger Kandidaten wecken und ob wir Menschen finden, die das Angebot in Betracht ziehen würden.",
  pilotHinweis: "Wir messen Interesse, Gehaltsschwelle, Wechselbereitschaft und die relevanten Kandidaten.",

  fName: "Name", fNamePh: "Ihr Name",
  fFirma: "Firma", fFirmaPh: "Unternehmen",
  fMail: "Business-E-Mail", fMailPh: "name@firma.com",
  fPosition: "Welche Position möchten Sie besetzen?", fPositionPh: "z. B. Customer Support mit Deutsch, Cluj",
  fLink: "Stellenlink (optional)", fLinkPh: "https://…",
  fKnopf: "Pilot für eine Stelle anfragen", fLaeuft: "Wird gesendet…",
  fDanke: "Vielen Dank. Ich melde mich persönlich, um die Position und den möglichen Pilot kurz zu besprechen.",
  fUnverbindlich: "Unverbindlich. Wir besprechen zunächst nur eine konkrete Position.",
  fehlerName: "Bitte Ihren Namen.", fehlerFirma: "Bitte den Firmennamen.",
  fehlerMail: "Diese Adresse sieht noch nicht vollständig aus.", fehlerPosition: "Welche Position möchten Sie besetzen?",
  fehlerTechnik: "Das ging gerade nicht. Versuchen Sie es bitte gleich noch einmal.",
};

const ro: RecruitingText = {
  kicker: "LB RECRUITING · TALENT MARKET PULSE",
  h1Weiss: "Nu doar găsim candidați.",
  h1Akzent: "Aflăm ce ofertă îi face să schimbe jobul.",
  lead: "Măsurăm așteptările salariale, nivelul de germană, preferințele de lucru și disponibilitatea reală de schimbare — apoi identificăm candidații care ar lua în calcul poziția dumneavoastră.",
  positionierung: "Vorbitori de germană la nivel global · Market insight + sourcing",
  kopfMotto: "Talent Market Pulse",
  ctaHaupt: "Solicită un pilot pentru o poziție",
  ctaZweit: "Vezi un exemplu",

  beispielTitel: "Exemplu de profil",
  beispielFelder: { beruf: "Meserie", sprachen: "Limbi", ort: "Locație", situation: "Situație", wichtig: "Important", finanziell: "Financiar" },
  beispielWerte: {
    beruf: "Dezvoltator frontend", sprachen: "Germană (C1) · Engleză (B2)", ort: "Berlin, Germania",
    situation: "Are un job, dar ar fi deschis la ceva mai bun", wichtig: "Salariu mai bun · Remote",
  },
  beispielHinweis: "Profil exemplu – nu este o persoană reală. Profilurile reale sunt transmise doar cu acordul lor.",

  problemTitel: "Problema nu este doar lipsa candidaților. Uneori oferta nu îi mișcă.",
  problemText: "Mulți vorbitori de germană sunt deja angajați și nu caută activ. O ofertă trebuie să fie suficient de relevantă ca salariu, flexibilitate și condiții pentru ca ei să ia în calcul o schimbare.",
  problemHervor: "Înainte să investiți în recrutare, vă ajutăm să înțelegeți ce condiții pot pune piața în mișcare.",

  erhaltenTitel: "Nu doar candidați. Date care explică piața.",
  erhalten: ["Nivel de germană", "Domeniu profesional", "Localitate", "Remote / hibrid / birou", "Salariul de schimbare", "Disponibilitate de schimbare", "Activ / deschis / pasiv", "Întoarcere în România"],
  erhaltenText: "Aflați nu doar cine ar putea fi potrivit, ci și ce trebuie să ofere poziția pentru a deveni relevantă pentru candidați.",

  unterschiedTitel: "Nu doar cei care caută activ.",
  unterschiedText: "Vorbim și cu oameni care nu caută activ în acest moment, dar care ar schimba jobul pentru poziția potrivită.",
  segmente: [
    { titel: "Caută activ", text: "Candidați care vor un job nou acum." },
    { titel: "Deschiși la oferte", text: "Nu aplică activ, dar analizează oportunități mai bune." },
    { titel: "Candidați pasivi", text: "Ar schimba doar dacă oferta merită cu adevărat." },
  ],
  studieTitel: "Ce cer candidații noștri.",
  studieText: "Colectat continuu, direct de la specialiști vorbitori de germană din România și diasporă — nu dedus din anunțuri, ci răspuns de oamenii înșiși.",
  studieJetzt: "Câștigă acum",
  studieWechsel: "Ar schimba de la",
  studieSprung: "Diferența necesară",
  studieDeutsch: "Nivel de germană",
  studieSuche: "Cum caută",
  studieBerufe: "Domenii",
  studieAbschluss: "Studii",
  studieFallzahl: "Răspunsuri",
  studieQuelle: "Net pe lună · colectare continuă",
  studieOhneGeld: "ar schimba și fără mărire de salariu",
  studieOhneGeldText: "dacă alte condiții — conducere, program, remote — ar fi vizibil mai bune.",
  studieNiveaus: { A2: "A2", B1: "B1", B2: "B2", C1: "C1", C2: "C2" },
  studieSuchen: { aktiv: "Caută activ", offen: "Deschis la oferte", passiv: "Schimbă doar pentru oferta potrivită" },
  studieFelder: { suport: "Suport / clienți", it: "IT", finante: "Finanțe", logistica: "Logistică", inginerie: "Inginerie / producție", vanzari: "Vânzări", sanatate: "Sănătate / îngrijire", altul: "Alte domenii" },
  studieAbschluesse: { gimnaziu: "Școală generală", liceu: "Liceu", profesionala: "Școală profesională", licenta: "Studii superioare", master: "Master / doctorat" },
  warumTitel: "De ce LuxuryBandit?",
  warumLead: "Pentru că nu administrăm doar oportunități, ci căutăm activ ce pune piața în mișcare.",
  warumText: "LuxuryBandit caută oamenii și semnalele pe care canalele clasice le ratează: cine ar schimba, în ce condiții și pentru ce tip de oportunitate.",
  warumClaim: "Find what others overlook.",

  ablaufTitel: "Cum funcționează",
  ablauf: [
    { titel: "Ne dați o poziție", text: "Stabilim profilul și condițiile ofertei pe care vreți să o testați." },
    { titel: "Testăm reacția pieței", text: "Măsurăm ce salariu, mod de lucru și condiții îi fac pe candidați să ia în calcul schimbarea." },
    { titel: "Identificăm candidații relevanți", text: "Separăm oamenii activi, deschiși și pasivi care corespund profilului." },
    { titel: "Vorbiți cu cei care au interes real", text: "Primiți candidați pre-calificați care au semnalat că ar lua în calcul poziția." },
  ],

  pilotTitel: "Testăm piața pentru o singură poziție.",
  pilotText: "Ne dați o poziție greu de ocupat. Testăm ce condiții atrag atenția candidaților vorbitori de germană și dacă putem identifica oameni care ar lua în calcul oferta.",
  pilotHinweis: "Măsurăm interesul, pragul salarial, disponibilitatea de schimbare și candidații relevanți.",

  fName: "Nume", fNamePh: "Numele dumneavoastră",
  fFirma: "Companie", fFirmaPh: "Compania",
  fMail: "E-mail de business", fMailPh: "nume@companie.com",
  fPosition: "Ce poziție doriți să ocupați?", fPositionPh: "ex. Customer Support cu germană, Cluj",
  fLink: "Link către anunț (opțional)", fLinkPh: "https://…",
  fKnopf: "Solicită un pilot pentru o poziție", fLaeuft: "Se trimite…",
  fDanke: "Vă mulțumim. Vă contactez personal ca să discutăm pe scurt poziția și un posibil pilot.",
  fUnverbindlich: "Fără obligații. Discutăm mai întâi doar o poziție concretă.",
  fehlerName: "Vă rugăm numele dumneavoastră.", fehlerFirma: "Vă rugăm numele companiei.",
  fehlerMail: "Adresa aceasta nu pare completă.", fehlerPosition: "Ce poziție doriți să ocupați?",
  fehlerTechnik: "Nu a mers acum. Vă rugăm încercați din nou imediat.",
};

const en: RecruitingText = {
  kicker: "LB RECRUITING · TALENT MARKET PULSE",
  h1Weiss: "We don\u2019t just find candidates.",
  h1Akzent: "We find out which offer makes them move.",
  lead: "We measure salary expectations, German level, work preferences and real willingness to move — and then identify the candidates who would consider your role.",
  positionierung: "German-speaking candidates worldwide · Market insight + sourcing",
  kopfMotto: "Talent Market Pulse",
  ctaHaupt: "Request a pilot for one role",
  ctaZweit: "See an example",

  beispielTitel: "Example profile",
  beispielFelder: { beruf: "Role", sprachen: "Languages", ort: "Location", situation: "Situation", wichtig: "Matters most", finanziell: "Financial" },
  beispielWerte: {
    beruf: "Frontend developer", sprachen: "German (C1) · English (B2)", ort: "Berlin, Germany",
    situation: "Employed, but open to something better", wichtig: "Higher salary · Remote",
  },
  beispielHinweis: "Example profile – not a real person. Real candidate profiles are only shared with their consent.",

  problemTitel: "The problem is not only a shortage of candidates. Sometimes the offer doesn\u2019t move them.",
  problemText: "Many German speakers are already employed and not looking. An offer has to be relevant enough in salary, flexibility and conditions for them to consider a move at all.",
  problemHervor: "Before you invest in recruiting, we help you understand which conditions actually move the market.",

  erhaltenTitel: "Not just candidates. Data that explains the market.",
  erhalten: ["German level", "Professional field", "Location", "Remote / hybrid / office", "Salary that would move them", "Willingness to move", "Active / open / passive", "Return to Romania"],
  erhaltenText: "You learn not only who might fit, but what the role has to offer to become relevant to candidates at all.",

  unterschiedTitel: "Not only active job seekers.",
  unterschiedText: "We also reach people who aren't actively looking right now, but would move for the right role.",
  segmente: [
    { titel: "Actively looking", text: "Candidates who want a new role right now." },
    { titel: "Open to offers", text: "Not applying actively, but weighing better opportunities." },
    { titel: "Passive candidates", text: "Would move only if the offer is genuinely worth it." },
  ],
  studieTitel: "What our candidates ask for.",
  studieText: "Collected continuously, straight from German-speaking professionals in Romania and the diaspora — not inferred from job ads, but answered by the people themselves.",
  studieJetzt: "Earn today",
  studieWechsel: "Would move from",
  studieSprung: "Required raise",
  studieDeutsch: "German level",
  studieSuche: "Search behaviour",
  studieBerufe: "Fields",
  studieAbschluss: "Education",
  studieFallzahl: "Responses",
  studieQuelle: "Net per month · ongoing survey",
  studieOhneGeld: "would move without a pay rise",
  studieOhneGeldText: "if other conditions — management, hours, remote — were clearly better.",
  studieNiveaus: { A2: "A2", B1: "B1", B2: "B2", C1: "C1", C2: "C2" },
  studieSuchen: { aktiv: "Actively looking", offen: "Open to offers", passiv: "Moves only for the right role" },
  studieFelder: { suport: "Support / customer service", it: "IT", finante: "Finance", logistica: "Logistics", inginerie: "Engineering / production", vanzari: "Sales", sanatate: "Healthcare", altul: "Other fields" },
  studieAbschluesse: { gimnaziu: "Secondary school", liceu: "High school", profesionala: "Vocational training", licenta: "University degree", master: "Master's / doctorate" },
  warumTitel: "Why LuxuryBandit?",
  warumLead: "Because we don\u2019t just manage opportunities — we go out and find what moves the market.",
  warumText: "LuxuryBandit looks for the people and the signals classic channels miss: who would move, on what conditions, and for what kind of opportunity.",
  warumClaim: "Find what others overlook.",

  ablaufTitel: "How it works",
  ablauf: [
    { titel: "You give us a role", text: "We define the profile and the conditions of the offer you want to test." },
    { titel: "We test the market\u2019s reaction", text: "We measure which salary, work model and conditions make candidates consider a move." },
    { titel: "We identify the relevant candidates", text: "We separate the active, open and passive people who match the profile." },
    { titel: "You talk to those with real interest", text: "You receive pre-qualified candidates who signalled they would consider the role." },
  ],

  pilotTitel: "We test the market for a single role.",
  pilotText: "You give us one hard-to-fill role. We test which conditions catch the attention of German-speaking candidates, and whether we can identify people who would consider the offer.",
  pilotHinweis: "We measure interest, the salary threshold, willingness to move and the relevant candidates.",

  fName: "Name", fNamePh: "Your name",
  fFirma: "Company", fFirmaPh: "Company name",
  fMail: "Business email", fMailPh: "name@company.com",
  fPosition: "Which role do you want to fill?", fPositionPh: "e.g. Customer Support with German, Cluj",
  fLink: "Job link (optional)", fLinkPh: "https://…",
  fKnopf: "Request a pilot for one role", fLaeuft: "Sending…",
  fDanke: "Thank you. I'll get in touch personally to briefly discuss the role and a possible pilot.",
  fUnverbindlich: "No obligation. We start by discussing one specific role.",
  fehlerName: "Please enter your name.", fehlerFirma: "Please enter the company name.",
  fehlerMail: "This address doesn't look complete yet.", fehlerPosition: "Which role do you want to fill?",
  fehlerTechnik: "That didn't work just now. Please try again in a moment.",
};

/**
 * DIE ÜBRIGEN VIER SPRACHEN LANDEN AUF ENGLISCH — bewusst, nicht aus Versehen: Wer diese
 * Seite auf Spanisch oder Italienisch aufruft, ist mit grosser Wahrscheinlichkeit nicht die
 * Personalabteilung eines rumänischen Unternehmens. Englisch ist für ihn die bessere Antwort
 * als eine Fassung, die niemand gegengelesen hat.
 */
export const recruitingTexte = (lang?: string): RecruitingText => {
  const l = String(lang ?? "").toLowerCase();
  if (l.startsWith("de")) return de;
  if (l.startsWith("ro")) return ro;
  return en;
};

export const RECRUITING_SPRACHEN: Lang[] = ["de", "ro", "en"];
