import type { Lang } from "@/lib/lang";

/**
 * DIE TEXTE DES LUXURYBANDIT PLANS — Englisch und Deutsch.
 *
 * Owner 04.08.2026: „du machst es gleich auf englisch auch, damit schon was drin steht."
 *
 * ZWEI ROLLEN, NICHT ZU VERWECHSELN:
 *
 *   DEUTSCH ist der URTEXT — hier wird formuliert (Owner 04.08.2026: „wir bearbeiten jetzt
 *   zuerst die deutsche Seite, dann übersetzen wir, weil ich besser deutsch kann"). Der Block
 *   steht deshalb ZUERST in dieser Datei.
 *
 *   ENGLISCH ist die VORGABE beim Anzeigen — der Sprachschalter steht bei den meisten
 *   Besuchern auf „English", und die Zielmärkte sind Rumänien und die Latino-Länder. Alles
 *   ohne eigene Fassung fällt auf `en` zurück, nicht auf `de`.
 *
 * Geschrieben wird also auf Deutsch, gelesen auf Englisch. Wer eine Zeile ändert, ändert sie
 * oben im deutschen Block und trägt sie danach in `en` nach — nie umgekehrt.
 *
 * DIE ÜBRIGEN FÜNF (ro, es, fr, pt, it) fehlen noch mit Absicht: Sie gehören übersetzt, nicht
 * geraten. Wer sie ergänzt, kopiert den `en`-Block und füllt ihn — die Form steht.
 */

export type PlanStufe = {
  /** „Du heute" — steht als Titel oben auf der Karte. */
  titel: string;
  /** „Jetzt" / „+24 Monate" — die kleine Marke rechts daneben. */
  badge: string;
  /** „Heute" — die Pille im Bild und die Beschriftung der Zeitleiste. */
  kurz: string;
  /** Der Satz unter dem Bild. */
  text: string;
};

export type PlanText = {
  kicker: string;
  /** Die H1 in drei Teilen: weiss · GELB · weiss · GELB · weiss. */
  h1a: string; h1y1: string; h1b: string; h1y2: string; h1c: string;
  lead: string;

  stufen: [PlanStufe, PlanStufe, PlanStufe];
  kartePausieren: string;
  karteWeiter: string;
  karteGross: string;
  karteKlein: string;
  karteTon: string;
  karteTonAus: string;
  karteTeilen: string;
  karteKopiert: string;
  /** Was beim Teilen neben dem Link steht. */
  karteTeilenText: string;

  liefernTitel: string;
  liefern: [string, string][];

  ctaKnopf: string;
  ctaZeile: string;

  clouTitel: string;
  clouLead: string;
  jurys: { wer: string; frage: string; was: string }[];

  schritteTitel: string;
  schritte: { titel: string; text: string }[];
  schritteFein: string;

  genauTitel: string;
  genauLead: string;
  genauLabel: string;
  genau: [string, string][];

  /* ── Der Trichter (components/PlanFunnel) ────────────────────────────────────── */
  mailLabel: string;
  /** Rot am Feld, wenn er ohne Adresse hochladen will. */
  mailFehlt: string;
  fotoWaehlen: string;
  fotoLoeschen: string;
  zuschnittTitel: string;
  ideeFrage: string;
  ideeJa: string;
  ideeNein: string;
  ideePlatzhalter: string;
  /** Was passiert, wenn er keine Idee hat — beruhigend, nicht abweisend. */
  ideeKeine: string;
  gratisKnopf: string;
  gratisZeile: string;
  laeuft: string;
  /** Steht über dem Kaufteil, wenn sein Bild fertig ist. */
  nachBildTitel: string;
  /** Enthält den Platzhalter {plan}. */
  kaufenKnopf: string;
  kaufenZeile: string;
  fehlerBild: string;
  fehlerNetz: string;
  fehlerKasse: string;

  preisTitel: string;
  /** „für eine vollständige Analyse" — steht unter dem Betrag. */
  preisWofuer: string;
  /** Was alles drin ist. Owner 04.08.2026: „alles drum und dran. Bilder generieren und system." */
  preisDrin: string[];
  /** Der eine Satz, der Nachschlag ausschliesst. Enthält den Platzhalter {plan}. */
  preisZeile: string;

  nichtTitel: string;
  nicht: { titel: string; text: string }[];

  fuerWen: string;
  fuerWenLead1: string;
  fuerWenBevor: string;
  fuerWenLead2: string;
  fuss: string;
};

/* == DEUTSCH - DER URTEXT ========================================================
   Owner 04.08.2026: [wir bearbeiten jetzt zuerst die deutsche Seite, dann uebersetzen
   wir, weil ich besser deutsch kann.]

   HIER WIRD GESCHRIEBEN. Wer eine Zeile aendert, aendert sie zuerst hier - und traegt
   sie danach in `en` nach. Umgekehrt entstehen zwei Fassungen, die auseinanderlaufen,
   und niemand weiss mehr, welche die gemeinte ist. ANGEZEIGT wird trotzdem `en` als
   Vorgabe: geschrieben wird auf Deutsch, gelesen wird auf Englisch. */
const de: PlanText = {
  kicker: "Das LuxuryBandit System",
  /* Dasselbe auf Deutsch: „das" war zu leer, jetzt steht da, worum es geht. */
  h1a: "Willst du dieses ", h1y1: "Leben", h1b: "? Dann brauchst du ein ", h1y2: "System", h1c: ".",
  lead: "Ein Foto von dir, ein Satz zu deiner Idee.",

  stufen: [
    { titel: "Du heute", badge: "Jetzt", kurz: "Heute",
      text: "Derselbe Pulli, dasselbe Zimmer, derselbe Dienstagabend. Nichts daran ist falsch — es ist nur der Anfang." },
    { titel: "Du in 2 Jahren", badge: "+24 Monate", kurz: "2 Jahre",
      text: "Zwei Jahre sind nicht die Villa. Zwei Jahre sind der erste eigene Wagen, den du bar bezahlt hast." },
    { titel: "Du in 5 Jahren", badge: "+60 Monate", kurz: "5 Jahre",
      text: "Fünf Jahre sind kein anderes Leben. Es ist dasselbe Leben, in dem du entscheidest, wer Dienstag um sieben arbeitet." },
  ],
  kartePausieren: "Anhalten",
  karteWeiter: "Weiterlaufen",
  karteGross: "Bild vergrössern",
  karteKlein: "Bild verkleinern",
  karteTon: "Ton an",
  karteTonAus: "Ton aus",
  karteTeilen: "Teilen",
  karteKopiert: "Link kopiert",
  karteTeilenText: "Sieh dir an, wo ich in fünf Jahren stehe 👑",

  liefernTitel: "Das bekommst du:",
  liefern: [
    ["Dein Bild in 5 Jahren", "gratis, sofort, mit unserem Muster darüber — behalten und verschicken darfst du es"],
    ["Das Urteil", "wie viele von 20 kaufen würden — und woran ihr Ja hängt"],
    ["Der Streit", "wo deine Kunden und die Fachleute aneinandergeraten"],
    ["Die Einwände", "was dich aufhält, nach Häufigkeit sortiert"],
    ["Die drei nächsten Schritte", "nicht der Fünfjahresplan — was diese Woche dran ist"],
    ["Dein System zum Mitnehmen", "eine Seite zum Teilen und ein PDF, das dir gehört"],
  ],

  ctaKnopf: "Lade dein Bild hoch",
  ctaZeile: "Bild → deine Idee → das System startet. Kein Konto, keine Karte, kein Formular.",

  clouTitel: "Andere fragen die KI. Wir lassen sie streiten",
  clouLead:
    "Ein Chatbot sagt dir, deine Idee sei interessant. Zwanzig Menschen, die sich uneinig sind, sagen dir, woran sie scheitert. Das ist der Unterschied — und das ist alles, wofür du zahlst.",
  jurys: [
    { wer: "Kunden", frage: "Kaufen sie?",
      was: "Zwanzig erzeugte Käufer aus genau deinem Umfeld — mit Namen, Alter und dem einen Satz, der ihre Entscheidung erklärt." },
    { wer: "Fachleute", frage: "Geht das überhaupt?",
      was: "Menschen, die in deinem Geschäft stehen. Samt deinem direkten Wettbewerber, der dir sagt, warum er billiger ist." },
    { wer: "Nachbarn", frage: "Hältst du das aus?",
      was: "„Angeber.“ „Der hat schon drei Sachen angefangen.“ Warum es kommt — und wie du darüber wegkommst." },
  ],

  schritteTitel: "Vier Schritte, keine Anmeldung",
  schritte: [
    { titel: "Foto und Name", text: "Ein Bild von dir, mehr nicht. Kein Konto, kein Formular, keine Karte." },
    { titel: "Hast du eine Idee?", text: "Ja: erzähl sie in einem Satz. Nein: auch gut — wir bauen dir eine aus dem, was du uns über dich sagst." },
    { titel: "Du siehst dich — gratis", text: "Dein Bild, wenn du es durchziehst. Kostet nichts, trägt unser Muster — und du darfst es behalten und verschicken." },
    { titel: "Die Maschine läuft, du schaust zu", text: "Deine Jurys entstehen, reden, streiten, urteilen. Am Ende steht dein System — zum Teilen und zum Mitnehmen." },
  ],
  schritteFein:
    "Der Trichter dahinter wird gerade gebaut. Trag dich noch nicht ein — die Seite zeigt heute, was kommt, nicht was schon läuft.",

  genauTitel: "Je mehr du sagst, desto genauer",
  genauLead:
    "Nichts davon ist Pflicht. Aber jede Angabe schärft deine zwanzig Kunden — und ein unscharfer Kunde sagt dir unscharfe Dinge. Was du weglässt, kostet nur dich.",
  genauLabel: "Genauigkeit deines Systems",
  genau: [
    ["+20 %", "Deine Stadt statt nur dein Land"],
    ["+15 %", "Was der Kunde heute stattdessen macht"],
    ["+15 %", "Dein Preis — auch wenn du dir unsicher bist"],
    ["+12 %", "Wie viel Zeit du wirklich hast"],
    ["+10 %", "Was du schon versucht hast und woran es scheiterte"],
  ],

  mailLabel: "Deine E-Mail",
  mailFehlt: "Bitte trag zuerst deine E-Mail ein — dorthin schicken wir dir dein Bild.",
  fotoWaehlen: "Foto von dir auswählen",
  fotoLoeschen: "Foto löschen",
  zuschnittTitel: "Ausschnitt wählen",
  ideeFrage: "Hast du schon eine Idee?",
  ideeJa: "Ja",
  ideeNein: "Noch nicht",
  ideePlatzhalter: "In einem Satz: was willst du machen?",
  ideeKeine: "Auch gut. Dann bauen wir dir eine aus dem, was du uns über dich sagst — und prüfen sie im selben Lauf.",
  gratisKnopf: "Zeig mir mein Bild — gratis",
  /* DAS MUSTER GEHÖRT IN DEN SATZ (04.08.2026, Punkt 1 des Pakets). Hier stand „Ein Bild,
     kostenlos, gehört dir" — seit `lib/wasserzeichen.ts` trägt jedes Gratis-Bild „©
     luxurybandit.com" über die ganze Fläche. Ein Satz, der mehr verspricht als das Bild
     hergibt, ist genau die Überraschung nach getaner Arbeit, gegen die Punkt 2 gebaut ist. */
  gratisZeile: "Ein Bild, kostenlos, mit unserem Muster darüber — behalten und verschicken darfst du es. Kein Konto, keine Karte.",
  laeuft: "Dein Bild entsteht …",
  nachBildTitel: "Das ist das Ziel. Jetzt der Weg dorthin:",
  kaufenKnopf: "System starten — {plan}",
  kaufenZeile: "Einmalig. Kein Abo, keine Zusatzkosten.",
  fehlerBild: "Das Bild ist nicht durchgelaufen. Versuch es bitte noch einmal.",
  fehlerNetz: "Keine Verbindung. Versuch es bitte noch einmal.",
  fehlerKasse: "Die Kasse ließ sich nicht öffnen. Versuch es bitte noch einmal.",

  preisTitel: "Was es kostet",
  preisWofuer: "für eine vollständige Analyse — alles drin",
  preisDrin: [
    "Deine Bilder, erzeugt — heute, in zwei Jahren, in fünf",
    "Alle drei Jurys: Kunden, Fachleute, Nachbarn",
    "Der ganze Lauf, live im Chat",
    "Dein System als Seite zum Teilen und als PDF",
  ],
  preisZeile: "Einmal {plan}. Keine Zusatzkosten, kein Upgrade, kein Abo. Eine neue Idee morgen ist eine neue Analyse.",

  nichtTitel: "Was das hier nicht ist",
  nicht: [
    { titel: "Kein Versprechen auf Geld", text: "Wir sagen dir nicht, was du verdienen wirst. Das weiß niemand, und wer es dir sagt, verkauft dir etwas." },
    { titel: "Kein Kurs, kein Coaching", text: "Keine Module, keine Webinare, keine Sprachnachricht um 23 Uhr. Ein System, einmal, fertig." },
    { titel: "Keine echte Marktforschung", text: "Die Stimmen sind erzeugt. Sie zeigen dir Einwände, keine Umsätze — und sie ersetzen nicht den ersten echten Anruf." },
    { titel: "Kein Abo", text: "Du zahlst je Analyse. Willst du morgen die nächste Idee prüfen, zahlst du morgen wieder. Nichts läuft im Hintergrund weiter." },
  ],

  fuerWen: "Für die, die es wirklich machen wollen. Nicht für die, die eine schöne Ausrede suchen.",
  fuerWenLead1:
    "Wenn du hoffst, dass zwanzig Fremde deine Idee schön finden, spar dir das Geld — die Hälfte wird sie zerreißen. Wenn du wissen willst, woran sie scheitert, ",
  fuerWenBevor: "bevor",
  fuerWenLead2: " es dich etwas kostet, dann ist es genau dafür gebaut.",
  fuss: "Wir versprechen dir kein Geld. Wir sagen dir, was schiefgeht, bevor du es bezahlst.",
};

/* == ENGLISCH - DIE UEBERSETZUNG ==================================================
   Was der Besucher standardmaessig sieht - aber NICHT der Ort, an dem formuliert wird.
   Diese Fassung folgt dem deutschen Urtext oben. Steht hier ein Satz, den es dort nicht
   gibt, ist einer von beiden vergessen worden. */
const en: PlanText = {
  kicker: "The LuxuryBandit System",
  /* „that" allein sagt ihm nichts (Owner 04.08.2026: „Want that life heisst es im Titel,
     sonst weiss er nicht was"). Das Bild darunter zeigt es zwar — aber die Überschrift wird
     zuerst gelesen, und sie muss allein stehen können. */
  h1a: "Want that ", h1y1: "life", h1b: "? Then you need a ", h1y2: "system", h1c: ".",
  lead: "One photo of you, one sentence about your idea.",

  stufen: [
    { titel: "You today", badge: "Now", kurz: "Today",
      text: "Same hoodie, same room, same Tuesday night. Nothing wrong with it — it is just the start." },
    { titel: "You in 2 years", badge: "+24 months", kurz: "2 years",
      text: "Two years is not the villa. Two years is the first car you paid for in cash." },
    { titel: "You in 5 years", badge: "+60 months", kurz: "5 years",
      text: "Five years is not another life. It is the same life, where you decide who works Tuesday at seven." },
  ],
  kartePausieren: "Pause",
  karteWeiter: "Play",
  karteGross: "Enlarge picture",
  karteKlein: "Shrink picture",
  karteTon: "Sound on",
  karteTonAus: "Sound off",
  karteTeilen: "Share",
  karteKopiert: "Link copied",
  karteTeilenText: "Look where I'll be in five years 👑",

  liefernTitel: "Here is what you get:",
  liefern: [
    ["Your picture in 5 years", "free, right away, with our pattern across it — yours to keep and to send"],
    ["The verdict", "how many out of 20 would buy — and what their yes depends on"],
    ["The argument", "where your customers and the professionals go at each other"],
    ["The objections", "what holds you back, sorted by how often it came up"],
    ["The next three steps", "not the five-year plan — what is due this week"],
    ["Your system to take away", "a page to share and a PDF that is yours"],
  ],

  ctaKnopf: "Upload your picture",
  ctaZeile: "Picture → your idea → the machine runs. No account, no card, no forms.",

  clouTitel: "Others ask the AI. We let them argue",
  clouLead:
    "A chatbot tells you your idea is interesting. Twenty people who disagree tell you where it breaks. That is the difference — and that is all you pay for.",
  jurys: [
    { wer: "Customers", frage: "Would they buy?",
      was: "Twenty generated buyers from exactly your world — with a name, an age and the one sentence that explains their decision." },
    { wer: "Professionals", frage: "Does it even work?",
      was: "People who do your job for a living. Including your direct competitor, who tells you why he is cheaper." },
    { wer: "Neighbours", frage: "Can you take it?",
      was: "„Show-off.“ „He has started three things already.“ Why it comes — and how you get past it." },
  ],

  schritteTitel: "Four steps, no sign-up",
  schritte: [
    { titel: "Photo and name", text: "One picture of you, nothing else. No account, no form, no card." },
    { titel: "Do you have an idea?", text: "Yes: tell it in one sentence. No: that is fine too — we build you one from what you tell us about yourself." },
    { titel: "You see yourself — free", text: "Your picture if you go through with it. Costs nothing, carries our pattern — and it is yours to keep and to send." },
    { titel: "The machine runs, you watch", text: "Your juries appear, talk, argue, decide. At the end your system stands — to share and to take away." },
  ],
  schritteFein:
    "The funnel behind this is being built right now. Don't sign up yet — this page shows what is coming, not what is already running.",

  genauTitel: "The more you say, the sharper it gets",
  genauLead:
    "None of it is required. But every detail sharpens your twenty customers — and a blurry customer tells you blurry things. What you leave out only costs you.",
  genauLabel: "Accuracy of your system",
  genau: [
    ["+20 %", "Your city instead of just your country"],
    ["+15 %", "What the customer does instead today"],
    ["+15 %", "Your price — even if you are unsure"],
    ["+12 %", "How much time you really have"],
    ["+10 %", "What you already tried and why it failed"],
  ],

  mailLabel: "Your email",
  mailFehlt: "Add your email first — that is where we send your picture.",
  fotoWaehlen: "Pick a photo of yourself",
  fotoLoeschen: "Delete photo",
  zuschnittTitel: "Choose the crop",
  ideeFrage: "Do you already have an idea?",
  ideeJa: "Yes",
  ideeNein: "Not yet",
  ideePlatzhalter: "In one sentence: what do you want to do?",
  ideeKeine: "That is fine. We build you one from what you tell us about yourself — and test it in the same run.",
  gratisKnopf: "Show me my picture — free",
  gratisZeile: "One picture, free, with our pattern across it — yours to keep and to send. No account, no card.",
  laeuft: "Your picture is being made …",
  nachBildTitel: "That is the goal. Now the way there:",
  kaufenKnopf: "Start the system — {plan}",
  kaufenZeile: "One payment. No subscription, no extras.",
  fehlerBild: "The picture did not come through. Please try again.",
  fehlerNetz: "No connection. Please try again.",
  fehlerKasse: "The checkout would not open. Please try again.",

  preisTitel: "What it costs",
  preisWofuer: "for one full analysis — everything included",
  preisDrin: [
    "Your pictures, generated — today, in two years, in five",
    "All three juries: customers, professionals, neighbours",
    "The whole run, live in the chat",
    "Your system as a page to share and as a PDF",
  ],
  preisZeile: "{plan} once. No extras, no upgrade, no subscription. A new idea tomorrow is a new analysis.",

  nichtTitel: "What this is not",
  nicht: [
    { titel: "No promise of money", text: "We do not tell you what you will earn. Nobody knows that, and whoever tells you is selling you something." },
    { titel: "No course, no coaching", text: "No modules, no webinars, no voice note at 11pm. One system, once, done." },
    { titel: "Not real market research", text: "The voices are generated. They show you objections, not revenue — and they do not replace the first real phone call." },
    { titel: "No subscription", text: "You pay per analysis. Want to check tomorrow's idea? You pay again tomorrow. Nothing keeps running in the background." },
  ],

  fuerWen: "For the ones who really want to do it. Not for the ones looking for a nice excuse.",
  fuerWenLead1:
    "If you are hoping twenty strangers will love your idea, save your money — half of them will tear it apart. If you want to know where it breaks, ",
  fuerWenBevor: "before",
  fuerWenLead2: " it costs you anything, that is exactly what this was built for.",
  fuss: "We promise you no money. We tell you what goes wrong, before you pay for it.",
};


/** Englisch ist die Vorgabe; alles ohne eigene Fassung fällt darauf zurück. */
export function planText(lang: Lang): PlanText {
  return lang === "de" ? de : en;
}
