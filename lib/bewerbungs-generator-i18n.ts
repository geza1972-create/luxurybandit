import type { Lang } from "@/lib/lang";

/**
 * DIE TEXTE DES BEWERBUNGS-GENERATORS — FEST, NICHT ÜBERSETZT (Owner 31.08.2026, mit Bild
 * der rumänischen Fassung: „was schreibst du da?").
 *
 * WAS PASSIERT WAR: Die Seite lief über die Laufzeit-Übersetzung wie jede Topic-Seite. Aus
 * „Dein Lebenslauf auf Deutsch — so, wie deutsche Arbeitgeber ihn erwarten" wurde auf
 * Rumänisch „CV-ul tău în română — așa cum îl așteaptă angajatorii români". Das Modell hat
 * die Nationalität LOKALISIERT, statt sie stehen zu lassen — und damit das Produkt ins
 * Gegenteil verkehrt: Wer die Seite auf Rumänisch liest, bekam einen rumänischen Lebenslauf
 * versprochen.
 *
 * Derselbe Fehler traf den Kachel-Titel: „Bewerbungs-Generator" wurde zu „Generator de
 * aplicații" — Software-Anwendungen.
 *
 * DAS IST KEIN AUSREISSER, DEN MAN NACHBESSERN KANN. Auf einer Seite, deren ganzer Inhalt
 * das Wort „deutsch" ist, wird eine Übersetzung immer versuchen, es dem Leser anzupassen.
 * Deshalb stehen die Texte hier fest — wie bei /joburi und /recruiting, und aus demselben
 * Grund: Was verkauft wird, darf kein Modell umdeuten.
 *
 * DREI SPRACHEN, DEUTSCH ALS QUELLE. „Deutsch" bleibt in jeder Fassung deutsch.
 */

export type GeneratorTexte = Record<keyof typeof DE, string>;

export const DE = {
  kicker: "Bewerbungs-Generator · Deutsch",
  h1: "Dein Lebenslauf auf Deutsch — so, wie deutsche Arbeitgeber ihn erwarten.",
  unterzeile: "Lade hoch, was du hast — in jeder Sprache. Heraus kommt ein deutscher Lebenslauf als fertiges PDF.",

  vorlageTitel: "Wähle deine Vorlage",
  vorlageHinweis: "So wird dein Lebenslauf aussehen. Ändern kannst du sie später jederzeit.",
  vorlageWeiter: "Weiter",

  cvTitel: "Lebenslauf hochladen",
  cvHinweis: "PDF oder Word (.docx)",
  fotoTitel: "Foto",
  fotoHinweis: "Optional",
  starten: "Auf Deutsch umwandeln",
  gratisZeile: "Gratis mit Muster-Wasserzeichen. Keine Anmeldung, keine Adresse.",
  laufText: "Ich lese und übertrage deinen Lebenslauf …",

  chatGelesen: "Ich habe deinen Lebenslauf gelesen.",
  chatGefunden: "Gefunden: {stationen} Stationen, {ausbildung} Ausbildung, {sprachen} Sprachen.",
  chatFehlt: "Eins fehlt mir noch:",
  fragename: "Wie heißt du mit vollem Namen?",
  frageemail: "Deine E-Mail-Adresse?",
  fragetelefon: "Deine Telefonnummer?",
  frageort: "In welcher Stadt wohnst du?",
  chatWeiter: "Weiter",
  chatUeberspringen: "Habe ich nicht",

  fotoFrage: "Ein Bild hast du nicht hochgeladen — bewusst weggelassen oder vergessen?",
  fotoAbsicht: "Bewusst, ohne Foto",
  fotoNachreichen: "Vergessen — Bild wählen",

  fertigFrage: "Jetzt habe ich alles. Soll ich es erstellen?",
  fertigJa: "Ja, erstellen",

  vorschauTitel: "Deine Vorschau",
  vorschauHinweis: "Mit Muster-Wasserzeichen — du darfst sie prüfen und verschicken.",
  pdfKnopf: "PDF herunterladen (Muster)",
  pdfKnopfVoll: "PDF herunterladen",
  kaufTitel: "Ohne Wasserzeichen",
  kaufText: "Dasselbe Dokument, sauber — zum Verschicken an deutsche Arbeitgeber.",
  kaufKnopf: "Freischalten",
  fertigTitel: "Freigeschaltet",
  nochmal: "Neu anfangen",

  /* Die Box unten — Werbung für David (Owner 31.08.2026: „auf dieser Seite machen wir noch
     Werbung unten, noch eine Box für David"). Sie steht am FUSS und nicht neben dem Kauf:
     Wer gerade sein PDF holt, soll nicht zwischen zwei Angeboten wählen müssen. */
  davidTitel: "Und was sagt ein Recruiter dazu?",
  davidText: "David liest deinen Lebenslauf wie eine Personalabteilung — und sagt dir, was ihm auffällt. Kostenlos, etwa fünf Minuten.",
  davidKnopf: "Lebenslauf prüfen lassen",

  fehlerCv: "Bitte lade zuerst deinen Lebenslauf hoch.",
  fehlerNetz: "Das ging gerade nicht. Versuch es bitte gleich noch einmal.",
  fehlerGross: "Die Datei ist zu groß.",
};

export const RO: GeneratorTexte = {
  kicker: "Bewerbungs-Generator · Germană",
  h1: "CV-ul tău în germană — exact cum îl așteaptă angajatorii germani.",
  unterzeile: "Încarcă ce ai — în orice limbă. Rezultatul este un CV german, ca PDF finalizat.",

  vorlageTitel: "Alege-ți șablonul",
  vorlageHinweis: "Așa va arăta CV-ul tău. Îl poți schimba oricând.",
  vorlageWeiter: "Continuă",

  cvTitel: "Încarcă CV-ul",
  cvHinweis: "PDF sau Word (.docx)",
  fotoTitel: "Poză",
  fotoHinweis: "Opțional",
  starten: "Transformă în germană",
  gratisZeile: "Gratuit, cu filigran. Fără cont, fără adresă.",
  laufText: "Îți citesc și transpun CV-ul …",

  chatGelesen: "Ți-am citit CV-ul.",
  chatGefunden: "Am găsit: {stationen} poziții, {ausbildung} studii, {sprachen} limbi.",
  chatFehlt: "Îmi mai lipsește ceva:",
  fragename: "Care este numele tău complet?",
  frageemail: "Adresa ta de e-mail?",
  fragetelefon: "Numărul tău de telefon?",
  frageort: "În ce oraș locuiești?",
  chatWeiter: "Continuă",
  chatUeberspringen: "Nu am",

  fotoFrage: "Nu ai încărcat o poză — intenționat sau ai uitat?",
  fotoAbsicht: "Intenționat, fără poză",
  fotoNachreichen: "Am uitat — aleg o poză",

  fertigFrage: "Acum am tot ce îmi trebuie. Să îl creez?",
  fertigJa: "Da, creează-l",

  vorschauTitel: "Previzualizarea ta",
  vorschauHinweis: "Cu filigran — îl poți verifica și trimite.",
  pdfKnopf: "Descarcă PDF (cu filigran)",
  pdfKnopfVoll: "Descarcă PDF",
  kaufTitel: "Fără filigran",
  kaufText: "Același document, curat — pentru angajatorii germani.",
  kaufKnopf: "Deblochează",
  fertigTitel: "Deblocat",
  nochmal: "Începe din nou",

  davidTitel: "Și ce spune un recrutor despre el?",
  davidText: "David îți citește CV-ul ca un departament de resurse umane — și îți spune ce îi sare în ochi. Gratuit, în circa cinci minute.",
  davidKnopf: "Verifică-mi CV-ul",

  fehlerCv: "Încarcă mai întâi CV-ul tău.",
  fehlerNetz: "Nu a mers acum. Mai încearcă o dată.",
  fehlerGross: "Fișierul este prea mare.",
};

export const EN: GeneratorTexte = {
  kicker: "Bewerbungs-Generator · German",
  h1: "Your CV in German — the way German employers expect it.",
  unterzeile: "Upload what you have — in any language. Out comes a German CV as a finished PDF.",

  vorlageTitel: "Choose your template",
  vorlageHinweis: "This is how your CV will look. You can change it any time.",
  vorlageWeiter: "Continue",

  cvTitel: "Upload your CV",
  cvHinweis: "PDF or Word (.docx)",
  fotoTitel: "Photo",
  fotoHinweis: "Optional",
  starten: "Convert to German",
  gratisZeile: "Free with a sample watermark. No account, no address.",
  laufText: "Reading and converting your CV …",

  chatGelesen: "I've read your CV.",
  chatGefunden: "Found: {stationen} positions, {ausbildung} education, {sprachen} languages.",
  chatFehlt: "One thing is still missing:",
  fragename: "What is your full name?",
  frageemail: "Your email address?",
  fragetelefon: "Your phone number?",
  frageort: "Which city do you live in?",
  chatWeiter: "Continue",
  chatUeberspringen: "I don't have one",

  fotoFrage: "You didn't upload a photo — on purpose, or forgotten?",
  fotoAbsicht: "On purpose, no photo",
  fotoNachreichen: "Forgotten — pick a photo",

  fertigFrage: "Now I have everything. Shall I create it?",
  fertigJa: "Yes, create it",

  vorschauTitel: "Your preview",
  vorschauHinweis: "With a sample watermark — you may check it and send it.",
  pdfKnopf: "Download PDF (sample)",
  pdfKnopfVoll: "Download PDF",
  kaufTitel: "Without the watermark",
  kaufText: "The same document, clean — to send to German employers.",
  kaufKnopf: "Unlock",
  fertigTitel: "Unlocked",
  nochmal: "Start again",

  davidTitel: "And what does a recruiter say about it?",
  davidText: "David reads your CV the way an HR department does — and tells you what stands out. Free, about five minutes.",
  davidKnopf: "Have my CV checked",

  fehlerCv: "Please upload your CV first.",
  fehlerNetz: "That didn't work just now. Please try again.",
  fehlerGross: "The file is too large.",
};

export const GENERATOR_SPRACHEN: Lang[] = ["de", "ro", "en"];

export const generatorTexte = (lang?: string): GeneratorTexte => {
  const l = String(lang ?? "").toLowerCase();
  if (l.startsWith("ro")) return RO;
  if (l.startsWith("en")) return EN;
  return DE;
};
