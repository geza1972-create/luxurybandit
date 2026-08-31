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

  /* ── Die drei Fragen ── */
  frage1: "Ce nivel de germană ai?",
  frage1Hinweis: "Alege nivelul care ți se potrivește cel mai bine.",
  /**
   * DIE VIERTE FRAGE IST DER KENNWERT FÜR DIE FIRMENSEITE (Owner 31.08.2026: „Das ist später
   * ein zentraler KPI, weil wir gegenüber Recruitern zeigen wollen, dass wir auch Kandidaten
   * erreichen, die nicht aktiv auf Jobportalen suchen.").
   *
   * Für den Bewerber ist sie harmlos — ein Klick, keine Angabe über ihn. Für die Akquise ist
   * sie das Einzige, was ein Jobportal NICHT vorzeigen kann: Wer dort steht, sucht per
   * Definition aktiv. Die zweite und dritte Antwort sind deshalb die wertvollen.
   */
  frage4: "Cauți activ un job în acest moment?",

  niveauA2: "A2 — începător",
  niveauB1: "B1",
  niveauB2: "B2",
  niveauC1: "C1",
  niveauC2: "C2 / fluent",



  sucheAktiv: "Da, caut activ",
  sucheOffen: "Mă uit doar la oportunități",
  suchePassiv: "Nu, dar aș schimba pentru oferta potrivită",


  /* ── TALENT MARKET PULSE (Owner 31.08.2026) ──
     Nicht mehr „hier sind Stellen", sondern „sag uns, was dich bewegen würde". Der Trichter
     verspricht damit nichts, was der Bestand halten müsste — und fragt genau das, was kein
     Jobportal weiss. */
  studieKicker: "STUDIU · LIMBA GERMANĂ PE PIAȚA MUNCII",
  studieTitel: "Vorbești germană?",
  studieTitelZwei: "Pentru ce salariu ai schimba jobul?",
  studieUnter: "Spune-ne ce ofertă te-ar face să iei în calcul o schimbare. Vrem să aflăm cât valorează în realitate limba germană pe piața muncii din România.",
  studieDauer: "7 întrebări · fără nume, fără CV",

  fLand: "În ce țară lucrezi acum?",
  landRo: "România", landDe: "Germania", landAt: "Austria", landAlta: "Altă țară",

  fGehalt: "De la ce salariu net ai lua în calcul o schimbare?",
  fGehaltHinweis: "Net, pe lună. Alege pragul de la care merită să discuți.",
  gehalt800: "de la 800 €", gehalt1200: "de la 1.200 €", gehalt1600: "de la 1.600 €",
  gehalt2000: "de la 2.000 €", gehalt2500: "de la 2.500 €", gehalt3000: "peste 3.000 €",

  fFaktoren: "Ce contează cel mai mult pentru tine?",
  fFaktorenHinweis: "Poți alege mai multe.",
  faktorSalariu: "Salariul", faktorRemote: "Remote", faktorFlex: "Program flexibil",
  faktorCariera: "Carieră", faktorStabil: "Stabilitate", faktorEchipa: "Echipă și cultură",
  weiter: "Continuă",

  fRueckkehr: "Te-ai întoarce în România pentru jobul potrivit?",
  rueckDa: "Da", rueckPoate: "Poate", rueckNu: "Nu",

  fBerufsfeld: "În ce domeniu lucrezi?",
  feldSuport: "Suport / servicii clienți", feldIt: "IT", feldFinante: "Finanțe / contabilitate",
  feldLogistica: "Logistică", feldInginerie: "Inginerie / producție", feldVanzari: "Vânzări",
  feldSanatate: "Sănătate / îngrijire", feldAltul: "Alt domeniu",

  /* ── Die Zusammenfassung: NUR seine eigenen Antworten, kein erfundener Marktwert ── */
  summeTitel: "Asta ne-ai spus",
  summeLand: "Țara", summeDeutsch: "Germană", summeStatus: "Status",
  summeGehalt: "Schimbi de la", summeFaktoren: "Contează", summeRueckkehr: "Întoarcere",
  summeFeld: "Domeniu",
  summeHinweis: "Nu îți arătăm cifre de piață — studiul abia se strânge. Primul lucru pe care îl vei vedea sunt rezultatele lui.",

  mailStudieTitel: "Vrei să primești rezultatele studiului și oportunități care respectă așteptările tale?",
  mailStudieText: "O singură adresă de e-mail. Fără nume, fără telefon, fără CV.",
  /* EIGENER KNOPF, NICHT DER ALTE: `mailKnopf` hiess „Arată-mi joburile" — er versprach
     Stellen, die dieser Trichter nicht mehr liefert. Ein Knopf, der etwas anderes zusagt als
     das, was danach kommt, ist der teuerste Fehler auf der ganzen Strecke. */
  studieKnopf: "Vreau rezultatele studiului",
  dankeTitelStudie: "Mulțumim — răspunsul tău e în studiu.",
  dankeTextStudie: "Îți scriem când rezultatele sunt gata, și doar cu oportunități care respectă pragul tău.",

  zurueck: "Înapoi",

  /* ── Der Teaser: echte Stellen, bevor die Adresse fällt ── */
  /**
   * NUR NOCH FÜR DEN LEEREN BESTAND (Owner 31.08.2026: „Kein harter 0-Treffer-Zustand. Der
   * Satz soll nicht der normale Funnelzustand sein.").
   *
   * Seit das Sprachniveau nichts mehr ausschliesst, kann dieser Zustand nur eintreten, wenn
   * gar keine aktive Stelle im Bestand liegt. Der alte Satz („keine passt genau") behauptete
   * das Gegenteil — es klang, als gäbe es Stellen, aber keine für ihn. Jetzt sagt er, was
   * wirklich los ist, und macht trotzdem ein Angebot.
   */

  /**
   * DER HAFTUNGSHINWEIS AN JEDER STELLE (Owner 31.08.2026: „Wir sind bei diesen Stellen noch
   * nicht Recruiter oder Partner des Unternehmens. Die Stelle darf nicht so dargestellt
   * werden, als würde LuxuryBandit im Auftrag der Firma rekrutieren.").
   *
   * Er steht an JEDER Karte, nicht einmal im Fuss: Wer eine Stelle ansieht, muss in dieser
   * Sekunde wissen, mit wem er es zu tun hat — und dass die Bewerbung direkt bei der Firma
   * landet, nicht bei uns.
   */

  /* Die Güte des Treffers — der Bewerber sieht die Stufe, nicht die Punktzahl. */

  /* ── Die Adresse ── */
  mailLabel: "E-mail",
  mailPlatzhalter: "nume@exemplu.ro",
  mailKeinSpam: "Fără spam. Te poți dezabona oricând.",
  mailFehlt: "Adresa aceasta nu pare completă.",
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

  /* ── Nach der Adresse: die volle Liste ── */

  /* ── Das Upgrade: erst jetzt der Lebenslauf ── */

  /* ── Die Weitergabe, pro Stelle ── */

  technischerFehler: "Ceva n-a mers la noi — nu la tine. Mai încearcă o dată.",
};

export const DE: JoburiTexte = {

  frage1: "Wie gut ist dein Deutsch?",
  frage1Hinweis: "Wähle das Niveau, das am ehesten passt.",
  frage4: "Suchst du gerade aktiv einen Job?",

  niveauA2: "A2 — Anfänger",
  niveauB1: "B1",
  niveauB2: "B2",
  niveauC1: "C1",
  niveauC2: "C2 / fließend",



  sucheAktiv: "Ja, ich suche aktiv",
  sucheOffen: "Ich schaue mich nur um",
  suchePassiv: "Nein, aber für das richtige Angebot würde ich wechseln",


  studieKicker: "STUDIE · DEUTSCH AUF DEM ARBEITSMARKT",
  studieTitel: "Du sprichst Deutsch?",
  studieTitelZwei: "Für welches Gehalt würdest du wechseln?",
  studieUnter: "Sag uns, welches Angebot dich über einen Wechsel nachdenken lässt. Wir wollen herausfinden, was Deutsch auf dem rumänischen Arbeitsmarkt wirklich wert ist.",
  studieDauer: "7 Fragen · ohne Namen, ohne Lebenslauf",

  fLand: "In welchem Land arbeitest du gerade?",
  landRo: "Rumänien", landDe: "Deutschland", landAt: "Österreich", landAlta: "Anderes Land",

  fGehalt: "Ab welchem Nettogehalt würdest du einen Wechsel überlegen?",
  fGehaltHinweis: "Netto, im Monat. Wähle die Schwelle, ab der sich ein Gespräch lohnt.",
  gehalt800: "ab 800 €", gehalt1200: "ab 1.200 €", gehalt1600: "ab 1.600 €",
  gehalt2000: "ab 2.000 €", gehalt2500: "ab 2.500 €", gehalt3000: "über 3.000 €",

  fFaktoren: "Was zählt für dich am meisten?",
  fFaktorenHinweis: "Mehrfach wählbar.",
  faktorSalariu: "Das Gehalt", faktorRemote: "Remote", faktorFlex: "Flexible Zeiten",
  faktorCariera: "Karriere", faktorStabil: "Sicherheit", faktorEchipa: "Team und Kultur",
  weiter: "Weiter",

  fRueckkehr: "Würdest du für die richtige Stelle nach Rumänien zurückgehen?",
  rueckDa: "Ja", rueckPoate: "Vielleicht", rueckNu: "Nein",

  fBerufsfeld: "In welchem Bereich arbeitest du?",
  feldSuport: "Support / Kundenservice", feldIt: "IT", feldFinante: "Finanzen / Buchhaltung",
  feldLogistica: "Logistik", feldInginerie: "Technik / Produktion", feldVanzari: "Vertrieb",
  feldSanatate: "Gesundheit / Pflege", feldAltul: "Anderer Bereich",

  summeTitel: "Das hast du uns gesagt",
  summeLand: "Land", summeDeutsch: "Deutsch", summeStatus: "Status",
  summeGehalt: "Wechsel ab", summeFaktoren: "Wichtig", summeRueckkehr: "Rückkehr",
  summeFeld: "Bereich",
  summeHinweis: "Wir zeigen dir keine Marktzahlen — die Studie wird gerade erst gesammelt. Das Erste, was du siehst, sind ihre Ergebnisse.",

  mailStudieTitel: "Willst du die Ergebnisse der Studie bekommen und Angebote, die deine Erwartung treffen?",
  mailStudieText: "Nur eine E-Mail-Adresse. Kein Name, kein Telefon, kein Lebenslauf.",
  studieKnopf: "Ich will die Ergebnisse der Studie",
  dankeTitelStudie: "Danke — deine Antwort ist in der Studie.",
  dankeTextStudie: "Wir schreiben dir, wenn die Ergebnisse da sind, und nur mit Angeboten, die deine Schwelle einhalten.",

  zurueck: "Zurück",


  mailLabel: "E-Mail",
  mailPlatzhalter: "name@beispiel.de",
  mailKeinSpam: "Kein Spam. Du kannst dich jederzeit abmelden.",
  mailFehlt: "Diese Adresse sieht noch nicht vollständig aus.",
  mailLaeuft: "Einen Moment…",

  haken: "Ich möchte passende Stellen per E-Mail bekommen.",
  hakenFehlt: "Ohne diese Zustimmung kann ich dir die Stellen nicht schicken.",
  datenschutzZusage: "Deine Daten gehen nie automatisch an Arbeitgeber. Du entscheidest bei jeder Stelle selbst.",




  technischerFehler: "Bei uns ist etwas schiefgegangen — nicht bei dir. Versuch es bitte noch einmal.",
};


/**
 * DREI FASSUNGEN, RUMÄNISCH ALS RÜCKFALL (Owner 31.08.2026: „3 sprachig bitte die
 * Jobs/germana seite").
 *
 * Rumänisch bleibt die Quelle und der Rückfall: Die Leute, die dieser Trichter sucht, SIND
 * Rumänen — auch die in Deutschland und Österreich. Deutsch ist für die, die im Alltag
 * deutsch denken, Englisch für alle übrigen Länder.
 */
export const JOBURI_SPRACHEN = ["ro", "de", "en"] as const;

/** Für alle übrigen Länder — Rumänisch bleibt der Rückfall (siehe unten). */
export const EN: JoburiTexte = {
  frage1: "How good is your German?",
  frage1Hinweis: "Pick the level that fits best.",
  frage4: "Are you actively looking for a job right now?",
  niveauA2: "A2 — beginner",
  niveauB1: "B1",
  niveauB2: "B2",
  niveauC1: "C1",
  niveauC2: "C2 / fluent",
  sucheAktiv: "Yes, actively looking",
  sucheOffen: "Just watching for opportunities",
  suchePassiv: "No, but I'd move for the right offer",
  studieKicker: "STUDY · GERMAN ON THE JOB MARKET",
  studieTitel: "You speak German?",
  studieTitelZwei: "For which salary would you change jobs?",
  studieUnter: "Tell us which offer would make you consider a move. We want to find out what German is really worth on the Romanian job market.",
  studieDauer: "7 questions · no name, no CV",
  fLand: "Which country do you work in right now?",
  landRo: "Romania",
  landDe: "Germany",
  landAt: "Austria",
  landAlta: "Another country",
  fGehalt: "From which net salary would you consider a move?",
  fGehaltHinweis: "Net, per month. Pick the threshold where a conversation becomes worth it.",
  gehalt800: "from 800 €",
  gehalt1200: "from 1,200 €",
  gehalt1600: "from 1,600 €",
  gehalt2000: "from 2,000 €",
  gehalt2500: "from 2,500 €",
  gehalt3000: "over 3,000 €",
  fFaktoren: "What matters most to you?",
  fFaktorenHinweis: "You can pick several.",
  faktorSalariu: "The salary",
  faktorRemote: "Remote",
  faktorFlex: "Flexible hours",
  faktorCariera: "Career",
  faktorStabil: "Security",
  faktorEchipa: "Team and culture",
  weiter: "Continue",
  fRueckkehr: "Would you move back to Romania for the right role?",
  rueckDa: "Yes",
  rueckPoate: "Maybe",
  rueckNu: "No",
  fBerufsfeld: "Which field do you work in?",
  feldSuport: "Support / customer service",
  feldIt: "IT",
  feldFinante: "Finance / accounting",
  feldLogistica: "Logistics",
  feldInginerie: "Engineering / production",
  feldVanzari: "Sales",
  feldSanatate: "Health / care",
  feldAltul: "Another field",
  summeTitel: "This is what you told us",
  summeLand: "Country",
  summeDeutsch: "German",
  summeStatus: "Status",
  summeGehalt: "Would move from",
  summeFaktoren: "Matters",
  summeRueckkehr: "Return",
  summeFeld: "Field",
  summeHinweis: "We don't show you market figures — the study is only just being collected. Its results are the first thing you'll see.",
  mailStudieTitel: "Do you want the results of the study and offers that meet your expectations?",
  mailStudieText: "One email address. No name, no phone, no CV.",
  studieKnopf: "I want the study results",
  dankeTitelStudie: "Thank you — your answer is in the study.",
  dankeTextStudie: "We'll write when the results are ready, and only with offers that respect your threshold.",
  zurueck: "Back",
  mailLabel: "Email",
  mailPlatzhalter: "name@example.com",
  mailKeinSpam: "No spam. You can unsubscribe any time.",
  mailFehlt: "This address doesn't look complete.",
  mailLaeuft: "One moment…",
  haken: "I'd like to receive matching offers by email.",
  hakenFehlt: "Without this consent I can't send you anything.",
  datenschutzZusage: "Your data is never sent to employers automatically. You decide for every single opportunity.",
  technischerFehler: "Something went wrong on our side — not yours. Please try again.",
};

export const joburiTexte = (lang?: string): JoburiTexte => {
  const l = String(lang ?? "").toLowerCase();
  if (l.startsWith("de")) return DE;
  if (l.startsWith("en")) return EN;
  return RO;
};
