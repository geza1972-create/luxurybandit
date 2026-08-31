/**
 * DIE TEXTE DES JOBURI-TRICHTERS — RUMÄNISCH IST DIE QUELLE, NICHT DIE ÜBERSETZUNG
 * (Owner 31.08.2026: „Rumänisch direkt im Code. Keine Runtime-Übersetzung. Einverstanden.").
 *
 * WARUM NICHT WIE ÜBERALL SONST: Der Rest des Hauses übersetzt zur Laufzeit mit Dauer-Cache.
 * Der ERSTE Aufruf je Sprache dauert damit 26 bis 44 Sekunden — für einen Trichter, der von
 * einer Meta-Anzeige gefüttert wird, ist das tödlich: Der erste rumänische Besucher sähe eine
 * halbe Minute nichts, und für den hat die Anzeige schon bezahlt.
 *
 * Deutsch steht hier als zweite STATISCHE Fassung, falls derselbe Trichter später in
 * Deutschland läuft. Keine KI-Übersetzung während der Sitzung, in keiner Richtung.
 */

/* Ohne `as const` bei den Werten: Sonst wäre jeder rumänische Satz sein EIGENER Typ, und
   die deutsche Fassung passte in keinen davon (TS2322). Der Typ soll die SCHLÜSSEL festlegen,
   nicht die Sätze. */
export type JoburiTexte = Record<keyof typeof RO, string>;

export const RO = {
  /* ── Der Kopf ── */
  kicker: "JOBURI CU GERMANĂ",
  titel: "Vorbești germană?",
  titelZwei: "Poate valorează mai mult decât crezi.",
  untertitel: "Răspunde la 3 întrebări și îți arătăm joburi reale care ți s-ar putea potrivi.",

  /* ── Die drei Fragen ── */
  frage1: "Ce nivel de germană ai?",
  frage1Hinweis: "Alege nivelul care ți se potrivește cel mai bine.",
  frage2: "Cum ai prefera să lucrezi?",
  frage3: "Ce cauți în primul rând?",

  niveauA2: "A2 — începător",
  niveauB1: "B1",
  niveauB2: "B2",
  niveauC1: "C1",
  niveauC2: "C2 / fluent",

  formRemote: "Remote",
  formHybrid: "Hibrid",
  formBirou: "La birou",
  formEgal: "Nu contează",

  zielSalariu: "Salariu mai bun",
  zielRemote: "Mai multă flexibilitate",
  zielJobNou: "Oportunități de carieră",
  zielIntoarcere: "Întoarcere în România",

  zurueck: "Înapoi",

  /* ── Der Teaser: echte Stellen, bevor die Adresse fällt ── */
  suchen: "Caut joburi potrivite…",
  gefundenEins: "Am găsit 1 oportunitate care corespunde preferințelor tale.",
  gefundenViele: "Am găsit {n} oportunități care corespund preferințelor tale.",
  /**
   * NUR NOCH FÜR DEN LEEREN BESTAND (Owner 31.08.2026: „Kein harter 0-Treffer-Zustand. Der
   * Satz soll nicht der normale Funnelzustand sein.").
   *
   * Seit das Sprachniveau nichts mehr ausschliesst, kann dieser Zustand nur eintreten, wenn
   * gar keine aktive Stelle im Bestand liegt. Der alte Satz („keine passt genau") behauptete
   * das Gegenteil — es klang, als gäbe es Stellen, aber keine für ihn. Jetzt sagt er, was
   * wirklich los ist, und macht trotzdem ein Angebot.
   */
  keineTreffer: "Chiar acum nu avem joburi active în listă. Lasă-ne adresa ta și îți trimitem primele care apar.",
  weitereVerdeckt: "+{n} alte joburi",
  gehaltGeschaetzt: "estimare piață",

  /**
   * DER HAFTUNGSHINWEIS AN JEDER STELLE (Owner 31.08.2026: „Wir sind bei diesen Stellen noch
   * nicht Recruiter oder Partner des Unternehmens. Die Stelle darf nicht so dargestellt
   * werden, als würde LuxuryBandit im Auftrag der Firma rekrutieren.").
   *
   * Er steht an JEDER Karte, nicht einmal im Fuss: Wer eine Stelle ansieht, muss in dieser
   * Sekunde wissen, mit wem er es zu tun hat — und dass die Bewerbung direkt bei der Firma
   * landet, nicht bei uns.
   */
  quellenhinweis: "Anunț public. LuxuryBandit nu reprezintă angajatorul. Aplicarea se face direct la companie.",

  /* Die Güte des Treffers — der Bewerber sieht die Stufe, nicht die Punktzahl. */
  gueteSehrGut: "Potrivire foarte bună",
  gueteGut: "Potrivire bună",
  gueteInteressant: "Ar putea fi interesant",
  deutschUnbekannt: "nespecificat",

  /* ── Die Adresse ── */
  mailTitel: "Unde îți trimitem lista completă?",
  mailText: "Primești lista completă și joburile noi care se potrivesc profilului tău.",
  mailLabel: "E-mail",
  mailPlatzhalter: "nume@exemplu.ro",
  mailKeinSpam: "Fără spam. Te poți dezabona oricând.",
  mailFehlt: "Adresa aceasta nu pare completă.",
  vornameLabel: "Prenume (opțional)",
  vornamePlatzhalter: "Prenumele tău",
  telefonLabel: "Telefon / WhatsApp (opțional)",
  telefonPlatzhalter: "+40 …",
  mailKnopf: "Arată-mi joburile",
  mailLaeuft: "Un moment…",

  /**
   * DIE EINWILLIGUNG — OHNE PAUSCHALE WEITERGABE (Owner 31.08.2026: „Keine pauschale
   * Weitergabe an Arbeitgeber. Zustimmung pro konkreter Stelle.").
   *
   * Was hier zugestimmt wird, ist AUSSCHLIESSLICH: wir dürfen ihn kontaktieren und ihm
   * Stellen zeigen. Der Satz darunter sagt ausdrücklich, was NICHT passiert — genau die
   * Sorge, mit der jemand seine Adresse zurückhält.
   */
  haken: "Sunt de acord să primesc joburi potrivite pe e-mail.",
  hakenFehlt: "Fără acest acord nu îți pot trimite joburile.",
  datenschutzZusage: "Datele tale nu sunt trimise automat angajatorilor. Tu decizi pentru fiecare oportunitate.",
  datenschutzLink: "Politica de confidențialitate",

  /* ── Nach der Adresse: die volle Liste ── */
  listeTitel: "Joburile tale",
  profilTitel: "Profilul tău",
  profilDeutsch: "Germană",
  profilForm: "Preferință",
  profilZiel: "Prioritate",
  zurAnzeige: "Vezi jobul",

  /* ── Das Upgrade: erst jetzt der Lebenslauf ── */
  cvTitel: "Vrei o potrivire mai exactă?",
  cvText: "Încarcă CV-ul și David îl compară cu cerințele acestor joburi.",
  cvKnopf: "Încarcă CV — opțional",
  cvHinweis: "PDF sau Word · rămâne la noi",

  /* ── Die Weitergabe, pro Stelle ── */
  weitergabeFrage: "Vrei să trimitem profilul tău companiei pentru acest job?",
  weitergabeJa: "Da, sunt interesat",
  weitergabeNein: "Nu acum",
  weitergabeDanke: "Am notat. Te contactăm dacă firma răspunde.",

  technischerFehler: "Ceva n-a mers la noi — nu la tine. Mai încearcă o dată.",
};

export const DE: JoburiTexte = {
  kicker: "JOBS MIT DEUTSCH",
  titel: "Du sprichst Deutsch?",
  titelZwei: "Vielleicht ist das mehr wert, als du denkst.",
  untertitel: "Beantworte 3 Fragen — wir zeigen dir echte Stellen, die zu dir passen könnten.",

  frage1: "Wie gut ist dein Deutsch?",
  frage1Hinweis: "Wähle das Niveau, das am ehesten passt.",
  frage2: "Wie möchtest du arbeiten?",
  frage3: "Was suchst du in erster Linie?",

  niveauA2: "A2 — Anfänger",
  niveauB1: "B1",
  niveauB2: "B2",
  niveauC1: "C1",
  niveauC2: "C2 / fließend",

  formRemote: "Remote",
  formHybrid: "Hybrid",
  formBirou: "Vor Ort",
  formEgal: "Egal",

  zielSalariu: "Besseres Gehalt",
  zielRemote: "Mehr Flexibilität",
  zielJobNou: "Karrierechancen",
  zielIntoarcere: "Zurück nach Rumänien",

  zurueck: "Zurück",

  suchen: "Ich suche passende Stellen…",
  gefundenEins: "Ich habe 1 Stelle gefunden, die zu deinen Angaben passt.",
  gefundenViele: "Ich habe {n} Stellen gefunden, die zu deinen Angaben passen.",
  keineTreffer: "Gerade liegt keine aktive Stelle in der Liste. Lass uns deine Adresse da — wir schicken dir die ersten, die kommen.",
  weitereVerdeckt: "+{n} weitere Stellen",
  gehaltGeschaetzt: "Marktschätzung",
  quellenhinweis: "Öffentliche Anzeige. LuxuryBandit vertritt den Arbeitgeber nicht. Die Bewerbung läuft direkt bei der Firma.",
  gueteSehrGut: "Sehr gute Übereinstimmung",
  gueteGut: "Gute Übereinstimmung",
  gueteInteressant: "Könnte interessant sein",
  deutschUnbekannt: "keine Angabe",

  mailTitel: "Wohin schicken wir dir die vollständige Liste?",
  mailText: "Du bekommst die ganze Liste und neue Stellen, die zu deinem Profil passen.",
  mailLabel: "E-Mail",
  mailPlatzhalter: "name@beispiel.de",
  mailKeinSpam: "Kein Spam. Du kannst dich jederzeit abmelden.",
  mailFehlt: "Diese Adresse sieht noch nicht vollständig aus.",
  vornameLabel: "Vorname (optional)",
  vornamePlatzhalter: "Dein Vorname",
  telefonLabel: "Telefon / WhatsApp (optional)",
  telefonPlatzhalter: "+49 …",
  mailKnopf: "Zeig mir die Stellen",
  mailLaeuft: "Einen Moment…",

  haken: "Ich möchte passende Stellen per E-Mail bekommen.",
  hakenFehlt: "Ohne diese Zustimmung kann ich dir die Stellen nicht schicken.",
  datenschutzZusage: "Deine Daten gehen nie automatisch an Arbeitgeber. Du entscheidest bei jeder Stelle selbst.",
  datenschutzLink: "Datenschutzerklärung",

  listeTitel: "Deine Stellen",
  profilTitel: "Dein Profil",
  profilDeutsch: "Deutsch",
  profilForm: "Wunsch",
  profilZiel: "Priorität",
  zurAnzeige: "Stelle ansehen",

  cvTitel: "Willst du es genauer wissen?",
  cvText: "Lade deinen Lebenslauf hoch — David vergleicht ihn mit den Anforderungen dieser Stellen.",
  cvKnopf: "Lebenslauf hochladen — optional",
  cvHinweis: "PDF oder Word · bleibt bei uns",

  weitergabeFrage: "Sollen wir dein Profil für diese Stelle an die Firma schicken?",
  weitergabeJa: "Ja, ich habe Interesse",
  weitergabeNein: "Jetzt nicht",
  weitergabeDanke: "Notiert. Wir melden uns, wenn die Firma antwortet.",

  technischerFehler: "Bei uns ist etwas schiefgegangen — nicht bei dir. Versuch es bitte noch einmal.",
};

export const joburiTexte = (lang?: string): JoburiTexte => (String(lang ?? "").toLowerCase().startsWith("de") ? DE : RO);
