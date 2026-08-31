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

  /* Beispielprofil */
  beispielTitel: string;
  beispielFelder: { deutsch: string; standort: string; modell: string; status: string; gehalt: string; interesse: string };
  beispielWerte: { modell: string; status: string; interesse: string };
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
  kicker: "LB · RECRUITING",
  h1Weiss: "Jobportale warten auf Bewerber.",
  h1Akzent: "Wir finden Menschen, die für die richtige Stelle wechseln würden.",
  lead: "LB Recruiting erschließt deutschsprachige Kandidaten in Rumänien und der Diaspora und qualifiziert Interesse, Sprachlevel und Wechselbereitschaft vor dem ersten Recruiter-Gespräch.",
  positionierung: "Deutschsprachige Kandidaten · Rumänien + Diaspora · Vorqualifiziert",
  kopfMotto: "Deutschsprachige Kandidaten",
  ctaHaupt: "Pilot für eine Stelle anfragen",
  ctaZweit: "So funktioniert es",

  beispielTitel: "Beispiel eines vorqualifizierten Kandidaten",
  beispielFelder: { deutsch: "Deutsch", standort: "Standort", modell: "Arbeitsmodell", status: "Status", gehalt: "Gehaltswunsch", interesse: "Interesse" },
  beispielWerte: { modell: "Hybrid / Remote offen", status: "Offen für passende Angebote", interesse: "deutschsprachige Support-/Service-Rollen" },
  beispielHinweis: "Beispielprofil – keine reale Person. Echte Kandidatenprofile werden nur mit Zustimmung weitergegeben.",

  problemTitel: "Deutschsprachige Kandidaten sind knapp.",
  problemText: "Viele qualifizierte Kandidaten sind bereits beschäftigt, leben im Ausland oder würden nur für ein deutlich besseres Angebot wechseln. Sie suchen nicht täglich auf klassischen Jobportalen – und genau deshalb werden sie oft nicht erreicht.",
  problemHervor: "Wir ersetzen Ihre bestehenden Recruiting-Kanäle nicht. Wir erschließen einen zusätzlichen Kandidatenpool.",

  erhaltenTitel: "Nicht nur Kontakte. Vorqualifizierte Kandidaten.",
  erhalten: ["Deutschlevel", "Berufserfahrung", "Standort", "Remote / Hybrid / On-site", "Gehaltsvorstellung", "Wechselbereitschaft", "Interesse an der konkreten Position", "optional: CV- und Job-Matching"],
  erhaltenText: "Sie erhalten nicht einfach Klicks oder anonyme Lebensläufe, sondern Kandidaten mit Kontext und erkennbarem Interesse an Ihrer Position.",

  unterschiedTitel: "Nicht nur aktive Jobsucher.",
  unterschiedText: "Wir sprechen auch Menschen an, die aktuell nicht aktiv suchen, aber für die richtige Position wechseln würden.",
  segmente: [
    { titel: "Aktiv suchend", text: "Bewerber, die gerade eine neue Stelle suchen." },
    { titel: "Offen für Angebote", text: "Menschen, die sich umsehen, aber nicht aktiv bewerben." },
    { titel: "Passive Kandidaten", text: "Beschäftigte, die nur für die richtige Gelegenheit wechseln würden." },
  ],
  warumTitel: "Warum LuxuryBandit?",
  warumLead: "Weil wir Chancen nicht einfach verwalten, sondern aktiv aufspüren.",
  warumText: "LuxuryBandit steht für Menschen und Möglichkeiten, die klassische Recruiting-Wege oft übersehen. Wir finden Kandidaten dort, wo Jobportale aufhören – und bringen sie mit Positionen zusammen, für die sich ein Wechsel wirklich lohnt.",
  warumClaim: "Find what others overlook.",

  ablaufTitel: "So funktioniert es",
  ablauf: [
    { titel: "Sie geben uns eine offene Stelle", text: "Wir definieren gemeinsam, welches Kandidatenprofil wirklich relevant ist." },
    { titel: "Wir erschließen zusätzliche Kandidaten", text: "Wir sprechen passende Zielgruppen außerhalb der klassischen Bewerbungssuche an." },
    { titel: "Interessenten werden vorqualifiziert", text: "Sprache, Erfahrung, Präferenzen und Wechselbereitschaft werden geprüft." },
    { titel: "Sie sprechen mit interessierten Kandidaten", text: "Sie erhalten Kandidaten, die zur Position passen könnten und konkretes Interesse signalisiert haben." },
  ],

  pilotTitel: "Starten wir mit einer einzigen Position.",
  pilotText: "Für den Einstieg brauchen Sie keinen langfristigen Vertrag. Wir wählen eine schwer zu besetzende deutschsprachige Position und testen gemeinsam, welche Kandidaten wir dafür erreichen können.",
  pilotHinweis: "Ergebnisse werden transparent gemessen: Interesse, qualifizierte Leads, Kandidaten und Kosten pro Ergebnis.",

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
  kicker: "LB · RECRUITING",
  h1Weiss: "Portalurile de joburi așteaptă candidați.",
  h1Akzent: "Noi găsim oameni care ar schimba jobul pentru poziția potrivită.",
  lead: "LB Recruiting ajunge la candidați vorbitori de germană din România și din diaspora și verifică interesul, nivelul de limbă și disponibilitatea de a schimba jobul înainte de prima discuție cu recrutorul.",
  positionierung: "Candidați vorbitori de germană · România + diaspora · Precalificați",
  kopfMotto: "Candidați vorbitori de germană",
  ctaHaupt: "Solicitați un pilot pentru o poziție",
  ctaZweit: "Cum funcționează",

  beispielTitel: "Exemplu de candidat precalificat",
  beispielFelder: { deutsch: "Germană", standort: "Localitate", modell: "Mod de lucru", status: "Status", gehalt: "Salariu dorit", interesse: "Interes" },
  beispielWerte: { modell: "Hibrid / deschis la remote", status: "Deschis la oferte potrivite", interesse: "roluri de suport/servicii în germană" },
  beispielHinweis: "Profil exemplu – nu este o persoană reală. Profilurile reale ale candidaților sunt transmise doar cu acordul lor.",

  problemTitel: "Candidații vorbitori de germană sunt puțini.",
  problemText: "Mulți candidați calificați sunt deja angajați, locuiesc în străinătate sau ar schimba jobul doar pentru o ofertă clar mai bună. Ei nu caută zilnic pe portalurile clasice de joburi – și tocmai de aceea rămân deseori neatinși.",
  problemHervor: "Nu vă înlocuim canalele de recrutare existente. Vă deschidem un bazin suplimentar de candidați.",

  erhaltenTitel: "Nu doar contacte. Candidați precalificați.",
  erhalten: ["Nivel de germană", "Experiență profesională", "Localitate", "Remote / hibrid / la birou", "Salariu dorit", "Disponibilitate de schimbare", "Interes pentru poziția concretă", "opțional: potrivire CV–job"],
  erhaltenText: "Nu primiți click-uri sau CV-uri anonime, ci candidați cu context și cu interes vizibil pentru poziția dumneavoastră.",

  unterschiedTitel: "Nu doar cei care caută activ.",
  unterschiedText: "Vorbim și cu oameni care nu caută activ în acest moment, dar care ar schimba jobul pentru poziția potrivită.",
  segmente: [
    { titel: "Caută activ", text: "Candidați care caută chiar acum un job nou." },
    { titel: "Deschiși la oferte", text: "Oameni care se uită în jur, dar nu aplică activ." },
    { titel: "Candidați pasivi", text: "Angajați care ar schimba doar pentru oportunitatea potrivită." },
  ],
  warumTitel: "De ce LuxuryBandit?",
  warumLead: "Pentru că nu administrăm oportunități, ci le căutăm activ.",
  warumText: "LuxuryBandit înseamnă oameni și oportunități pe care căile clasice de recrutare le trec deseori cu vederea. Găsim candidați acolo unde portalurile de joburi se opresc – și îi punem în legătură cu poziții pentru care o schimbare chiar merită.",
  warumClaim: "Find what others overlook.",

  ablaufTitel: "Cum funcționează",
  ablauf: [
    { titel: "Ne dați o poziție deschisă", text: "Stabilim împreună ce profil de candidat este cu adevărat relevant." },
    { titel: "Deschidem un bazin suplimentar", text: "Ne adresăm grupurilor potrivite din afara căutării clasice de job." },
    { titel: "Interesații sunt precalificați", text: "Verificăm limba, experiența, preferințele și disponibilitatea de a schimba." },
    { titel: "Discutați cu candidați interesați", text: "Primiți candidați care s-ar putea potrivi poziției și care au semnalat interes concret." },
  ],

  pilotTitel: "Să începem cu o singură poziție.",
  pilotText: "Pentru început nu aveți nevoie de un contract pe termen lung. Alegem o poziție în germană greu de ocupat și testăm împreună ce candidați putem atinge pentru ea.",
  pilotHinweis: "Rezultatele se măsoară transparent: interes, lead-uri calificate, candidați și cost pe rezultat.",

  fName: "Nume", fNamePh: "Numele dumneavoastră",
  fFirma: "Companie", fFirmaPh: "Compania",
  fMail: "E-mail de business", fMailPh: "nume@companie.com",
  fPosition: "Ce poziție doriți să ocupați?", fPositionPh: "ex. Customer Support cu germană, Cluj",
  fLink: "Link către anunț (opțional)", fLinkPh: "https://…",
  fKnopf: "Solicitați un pilot pentru o poziție", fLaeuft: "Se trimite…",
  fDanke: "Vă mulțumim. Vă contactez personal ca să discutăm pe scurt poziția și un posibil pilot.",
  fUnverbindlich: "Fără obligații. Discutăm mai întâi doar o poziție concretă.",
  fehlerName: "Vă rugăm numele dumneavoastră.", fehlerFirma: "Vă rugăm numele companiei.",
  fehlerMail: "Adresa aceasta nu pare completă.", fehlerPosition: "Ce poziție doriți să ocupați?",
  fehlerTechnik: "Nu a mers acum. Vă rugăm încercați din nou imediat.",
};

const en: RecruitingText = {
  kicker: "LB · RECRUITING",
  h1Weiss: "Job boards wait for applicants.",
  h1Akzent: "We find people who would move for the right role.",
  lead: "LB Recruiting reaches German-speaking candidates in Romania and the diaspora, and qualifies interest, language level and willingness to move before the first recruiter call.",
  positionierung: "German-speaking candidates · Romania + diaspora · Pre-qualified",
  kopfMotto: "German-speaking candidates",
  ctaHaupt: "Request a pilot for one role",
  ctaZweit: "How it works",

  beispielTitel: "Example of a pre-qualified candidate",
  beispielFelder: { deutsch: "German", standort: "Location", modell: "Work model", status: "Status", gehalt: "Salary expectation", interesse: "Interest" },
  beispielWerte: { modell: "Hybrid / open to remote", status: "Open to the right offer", interesse: "German-speaking support/service roles" },
  beispielHinweis: "Example profile – not a real person. Real candidate profiles are only shared with their consent.",

  problemTitel: "German-speaking candidates are scarce.",
  problemText: "Many qualified candidates are already employed, live abroad, or would only move for a clearly better offer. They don't browse job boards every day – which is exactly why they are often never reached.",
  problemHervor: "We don't replace your existing recruiting channels. We open up an additional candidate pool.",

  erhaltenTitel: "Not just contacts. Pre-qualified candidates.",
  erhalten: ["German level", "Work experience", "Location", "Remote / hybrid / on-site", "Salary expectation", "Willingness to move", "Interest in the specific role", "optional: CV and job matching"],
  erhaltenText: "You don't get clicks or anonymous CVs, but candidates with context and visible interest in your role.",

  unterschiedTitel: "Not only active job seekers.",
  unterschiedText: "We also reach people who aren't actively looking right now, but would move for the right role.",
  segmente: [
    { titel: "Actively looking", text: "Candidates who are searching for a new role right now." },
    { titel: "Open to offers", text: "People who are looking around, but not actively applying." },
    { titel: "Passive candidates", text: "Employees who would only move for the right opportunity." },
  ],
  warumTitel: "Why LuxuryBandit?",
  warumLead: "Because we don't just manage opportunities — we go out and find them.",
  warumText: "LuxuryBandit stands for people and opportunities that classic recruiting routes often overlook. We find candidates where job boards stop – and match them with roles that make a move genuinely worthwhile.",
  warumClaim: "Find what others overlook.",

  ablaufTitel: "How it works",
  ablauf: [
    { titel: "You give us one open role", text: "Together we define which candidate profile is genuinely relevant." },
    { titel: "We open an additional pool", text: "We reach suitable audiences outside the classic job search." },
    { titel: "Interested people are pre-qualified", text: "Language, experience, preferences and willingness to move are checked." },
    { titel: "You talk to interested candidates", text: "You receive candidates who could fit the role and have signalled concrete interest." },
  ],

  pilotTitel: "Let's start with a single role.",
  pilotText: "To get started you don't need a long-term contract. We pick one hard-to-fill German-speaking role and test together which candidates we can reach for it.",
  pilotHinweis: "Results are measured transparently: interest, qualified leads, candidates and cost per result.",

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
