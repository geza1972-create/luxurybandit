import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import type { Lang } from "@/lib/lang";

/**
 * DIE TEXTE DES AGENTEN-CHATS — DEUTSCHE QUELLE, EINE STELLE.
 *
 * Dasselbe Muster wie im Trichter (`lib/versusforge-texte.ts`) und bei David: flaches
 * Objekt, zur Laufzeit übersetzt, im Client steht kein einziger Satz.
 *
 * ── WARUM DAS ÜBERHAUPT SEIN MUSS (Owner 09.09.2026: „gleich am Anfang müsste er die
 * Sprache erfragen oder den Browser fragen. Einige haben einen englischen Browser, wollen
 * aber auf Rumänisch reden") ───────────────────────────────────────────────────────────────
 *
 * Der Gruss stand fest auf Deutsch im Browser. Wer mit rumänischem Browser kam, las eine
 * Wand deutscher Sätze und ging — und das ausgerechnet an der Stelle, an der wir um
 * Vertrauen bitten (Datenschutz, Einverständnis, drei Regeln).
 *
 * DIE BROWSERSPRACHE IST EINE VERMUTUNG, KEINE ANTWORT. Sie sagt, welche Oberfläche jemand
 * eingestellt hat — nicht, in welcher Sprache er über sein Geschäft reden will. Ein
 * rumänischer Wirt mit englischem Telefon ist der Normalfall, nicht die Ausnahme. Deshalb
 * wird die Browsersprache VORGESCHLAGEN und die Wahl trotzdem gestellt.
 *
 * DIE FRAGE SELBST WIRD NICHT ÜBERSETZT — sie steht dreisprachig im Chat
 * (`components/AgentChat.tsx`). Eine Sprachfrage in einer Sprache, die der Gefragte nicht
 * liest, ist keine Frage.
 */
export const AGENT_CHAT_TEXTE = {
  /* ── Der Gruss ───────────────────────────────────────────────────────────── */
  /**
   * ── DER GRUSS FÜR KÜNSTLER (Owner 10.09.2026: „Vrei să-ți vinzi arta și nu știi cum? Vrei să
   * știi ce se cere pe piață? Avem soluția. Începe acum: câteva întrebări, iar noi îți facem un
   * plan de marketing.") ──────────────────────────────────────────────────────────────────────
   *
   * Hier stand der Gruss für jedes Geschäft — „Werbung, die Anfragen bringt", „Lamm vom
   * Holzkohlegrill". Im Browser-Test las ein Maler als Erstes von Lammfleisch. Die Engine ist
   * jetzt für Kunst; der Gruss spricht deshalb den Künstler an, mit den zwei Fragen des Owners.
   * „Ein paar Fragen" und keine Zahl: Wie viele es werden, entscheidet das Gespräch.
   */
  gruss1: "Hallo, ich bin VersusForge — ein KI-Agent für Künstler. Du willst deine Kunst verkaufen und weisst nicht, wie? Du willst wissen, was auf dem Markt gefragt ist?",
  gruss2: "Dann bist du hier richtig. Ein paar Fragen, und ich mache dir einen Marketingplan für deine Kunst — nicht aus einer Vorlage: in welche Kategorie deine Werke gehören, was an ihnen besonders ist, wer sie kauft, und die Sätze, mit denen du sie zeigst.",
  grussRegelnTitel: "Damit es schnell geht, drei Sachen:",
  /**
   * DREI ZEILEN IN EINEM SCHLÜSSEL, mit Absätzen dazwischen.
   *
   * ÜBERSETZER-FALLE, BEWUSST UMGANGEN ([[uebersetzer-fallen]]): Bei langen Listen verliert
   * das Modell still ganze Blöcke. Drei Zeilen mit Zeilenumbruch sind für den Übersetzer ein
   * Text und kommen vollständig zurück; drei einzelne Schlüssel wären drei Aufrufe für
   * denselben Gedanken.
   *
   * Das Beispiel ist absichtlich konkret und übersetzbar: „Gutes Essen" gegen „Lamm vom
   * Holzkohlegrill" funktioniert in jeder Sprache, weil der Unterschied im Bild liegt, nicht
   * im Wort.
   */
  /* FÜR KÜNSTLER (10.09.2026): Die erste Regel ist die erste Frage des Kunst-Rezepts — zeigen
     statt beschreiben. Das Lamm-Beispiel gehörte zum Gruss für jedes Geschäft. */
  grussRegeln: "· Zeig mir deine Bilder, statt sie zu beschreiben — ich schaue sie mir an.\n· Verstehe ich etwas falsch, sag es sofort — ich rechne damit.\n· Was du nicht weisst, lass weg. Ich erfinde nichts, und du sollst es auch nicht.",
  /**
   * „STARTUP" STATT „WIR STEHEN AM ANFANG" (Owner 09.09.2026: „wir sind am Anfang stimmt
   * nicht, wir sind ein Startup ist besser").
   *
   * ER HAT ZWEIMAL RECHT. Sachlich: Das Haus läuft seit einem Jahr mit zwölf Anwendungen —
   * „am Anfang" wäre schlicht falsch. Und im Ton: „Wir stehen am Anfang" klingt nach
   * unfertig, und das liest jemand, der gerade überlegt, ob er einer Maschine sein Geschäft
   * erklärt. „Startup" sagt dasselbe über den PREIS — noch nichts verdient, deshalb gratis —
   * ohne etwas über die Qualität zu behaupten.
   */
  /**
   * ── WAS ER KOSTENLOS BEKOMMT, STEHT AM ANFANG (Owner 09.09.2026: „am Anfang sagen wir, was
   * er kostenlos bekommt, bitte anpassen") ──────────────────────────────────────────────────
   *
   * VORHER STAND HIER NUR „die ganze Strategie". Das ist ein Wort aus der Beratersprache und
   * beschreibt nichts, was man anfassen kann — und seit heute stimmt es auch nicht mehr: Er
   * bekommt mehr als eine Strategie. Er bekommt eine laufende Seite und die erste echte
   * Anfrage mit Namen und Telefonnummer.
   *
   * ALS LISTE, NICHT ALS SATZ (Hausregel vom 09.09.2026: „wir brauchen alles, was er bekommt,
   * als Liste und nicht als Text"). Vier Zeilen, die man zählen kann, schlagen einen Absatz,
   * den man überfliegt.
   *
   * UND DIE GRENZE STEHT GLEICH DABEI. Wer erst beim Schloss erfährt, dass es eine Grenze
   * gibt, fühlt sich überrumpelt — auch wenn alles davor geschenkt war. Vorher gesagt, ist
   * dieselbe Grenze ein fairer Handel.
   */
  /* FÜR KÜNSTLER (10.09.2026): Galerie mit Agent statt „eigene Seite", und der Satz des Owners
     zum Bezahlen („Du zahlst, wenn unser Agent für dich arbeitet und du ihn behalten willst").
     `{preis}` ist der Abo-Preis aus lib/pricing.ts; die „drei" ist `ABO_FRAGE_AB` in
     lib/versusforge-abo.ts — der Satz sagt, was der Code tut. */
  /* OHNE GELD-DETAILS (Owner 11.09.2026, mit Bild des rumänischen Grusses: „das mit dem Geld erwähnst
     du hier nicht. Es ist kostenlos und basta … Du sagst nur: der Agent wird irgendwann
     kostenpflichtig sein"). Hier standen „nach drei Interessenten", „{preis} im Monat" und „Startup". */
  grussKostenlos: "Das hier ist kostenlos. Du bekommst:\n· einen Spruch zu deinem Bild, der Käufer anhält\n· deine eigene Seite auf lakatosbandi.com, unserer Plattform für Künstler, mit einem KI-Agenten, der mit deinen Interessenten spricht\n· jede Anfrage mit Namen und Telefonnummer, zum Anrufen\nNur der Agent wird irgendwann kostenpflichtig — und nur, wenn du ihn behalten willst.",
  /**
   * DER DATENSCHUTZSATZ — er trägt ein Versprechen, das ein Mensch einlöst.
   *
   * Die 30 Tage („was 30 Tage lang ungenutzt bleibt, löschen wir von uns aus") standen hier seit dem
   * 09.09.2026 und sind am 11.09.2026 herausgenommen (Owner, rumänischer Chat: „raus damit") — eine
   * Künstlerseite soll nicht verschwinden, nur weil er sie einen Monat nicht anfasst.
   *
   * WER DIESEN SATZ ÄNDERT, ÄNDERT EIN VERSPRECHEN — und wer das Aufräumen einstellt, muss
   * den Halbsatz wieder herausnehmen. Ein Datenschutzsatz, den niemand einhält, ist
   * schlimmer als keiner. Das gilt jetzt in drei Sprachen.
   */
  grussDatenschutz: "Zum Datenschutz: Was du schreibst und die Bilder, die du zeigst, verarbeitet ein KI-Modell von OpenAI — anders geht es nicht. Am Ende schicken wir dir die weiteren Infos per E-Mail; dafür brauche ich deine Adresse, und ab da liegt sie bei uns. In jeder Mail steht ein Link, mit dem du alles wieder löschst — sofort, ohne Nachfrage und ohne Begründung.",
  /* Owner 10.09.2026: kein Plan und keine Werbung mehr — am Ende steht sein Bild mit Spruch. */
  grussFrage: "Ein paar Minuten, dann steht dein Bild mit Spruch. Einverstanden?",

  /* ── DER ANFANG AUF LAKATOSBANDI.COM/START (Owner 11.09.2026: „der Text ist fast eine AGB" · „wenn das Beispiel mit
     Van Gogh dasteht und darunter: Willst du auch so ein Marketing? Wir machen das jetzt für deine Bilder und promoten
     dich gleich") — statt sieben Absätzen eine Karte: Bild, vorher, nachher, die Frage. Datenschutz eingeklappt. ── */
  startVorherLabel: "So posten es die meisten",
  startVorher: "„Neues Bild verfügbar. Öl auf Leinwand, 74 × 92 cm.“",
  startNachherLabel: "Der Satz, bei dem man stehen bleibt",
  startNachher: "„Der Blick aus dem Fenster der Heilanstalt, vor Sonnenaufgang — mit einem Dorf, das es nie gab.“",
  startFrage: "Willst du auch so ein Marketing?",
  startText: "Wir machen es jetzt für deine Bilder und bewerben dich gleich auf lakatosbandi.com.",
  startFein: "Kostenlos · deine Seite ist sofort online",
  startDatenschutzTitel: "Datenschutz",
  startJa: "Ja, will ich",
  startQuelle: "Vincent van Gogh, Die Sternennacht, 1889 (Ausschnitt) — gemeinfrei.",
  chipEinverstanden: "Ja, einverstanden",
  /**
   * ── DIE ERSTE FRAGE IST GESCHRIEBEN, NICHT ERZEUGT ────────────────────────────────────────
   *
   * Owner 10.09.2026, mit Bild der Antwort nach dem Chip: „hier hast du 30 Sekunden für diese
   * Antwort gebraucht" · „du kannst doch nicht alle Regeln immer prüfen, wenn nicht nötig,
   * oder? Wenn er auf einen Chip klickt zum Beispiel" · „du musst kosteneffizient arbeiten
   * und schnell."
   *
   * ER HAT RECHT, UND ES IST DER KLARSTE FALL IM GANZEN GESPRÄCH: Nach „Ja, einverstanden"
   * gibt es nichts zu entscheiden. Die nächste Frage ist immer dieselbe. Sie trotzdem von
   * einem denkenden Modell mit 3800 Token Regeln schreiben zu lassen, kostet acht Sekunden
   * und Geld für einen Satz, der feststeht ([[agenten-schnell-und-billig]]).
   *
   * DAS BEISPIEL IN KLAMMERN IST DIE EIGENTLICHE ARBEIT DIESES SATZES. „Konkret" versteht
   * jeder anders; „Lamm vom Holzkohlegrill" statt „gutes Essen" versteht jeder gleich.
   */
  /* DIE ERSTE FRAGE DES KUNST-REZEPTS (Owner 10.09.2026: „Kannst du mir zeigen, was du malst?").
     Zuerst sehen, nicht beschreiben lassen — was ein Künstler über seine Kunst sagt, stimmt oft
     nicht. Hier stand noch „Und wenn du eine Website hast, schreib die Adresse gleich dazu." —
     raus (Owner 11.09.2026: „die Webseite interessiert uns nicht"). */
  ersteFrage: "Dann leg los: Kannst du mir zeigen, was du malst? Häng ein, zwei Bilder an.",
  /* Wer nur Bilder schickt und nichts dazu schreibt, hat trotzdem geantwortet — der Satz steht
     an Stelle des leeren Textes, damit das Gespräch lesbar bleibt. */
  nurBilder: "Hier sind meine Bilder.",
  /* Der grosse Knopf unter der Bitte um Bilder — das kleine Symbol im Feld findet keiner. */
  bilderKnopf: "Bilder hochladen",
  /* Owner 10.09.2026: „einschränken beim ersten Hochladen auf 4" — sichtbar, nicht still. */
  bilderHoechstens: "Höchstens 4 Bilder.",
  bilderErste4: "Ich nehme die ersten 4 Bilder.",
  /* Die Frage nach dem Nein zum Promoten („Willst du alles löschen?") — feste Knöpfe, kein Modell. */
  loeschenJa: "Ja, alles löschen",
  loeschenNein: "Nein",
  vorschauAlt: "Dein Bild mit Spruch",
  werkzeugSpruch: "Bild mit Spruch gezeigt",
  werkzeugAbschluss: "Profil angelegt",
  /* Die Karte nach „Passt das? — Ja" (Owner 10.09.2026: „Titel, Technik, Größe, … Datum"). */
  passtJa: "Ja, passt",
  /* Owner 10.09.2026: „also zurückgehen kann" — unter seiner letzten Antwort. */
  zurueck: "Zurück",
  /* Die zwei Felder am Ende (Owner 11.09.2026: „zwei Eingabefelder"). */
  feldKuenstlername: "Künstlername",
  feldEmail: "E-Mail",
  kontaktSenden: "Senden",
  /* Feedback jederzeit (Owner 10.09.2026: „damit wir lernen"). */
  feedbackLink: "Feedback geben",
  feedbackPlatzhalter: "Was hat dich gestört, was fehlt, was war gut?",
  feedbackSenden: "Senden",
  feedbackDanke: "Danke! Dein Feedback ist bei uns angekommen.",
  feedbackFehler: "Das hat nicht geklappt. Versuch es bitte noch einmal.",
  feedbackSchliessen: "Schließen",
  /* Das ✎ neben jedem Spruch-Chip (Owner 11.09.2026). */
  spruchAendern: "Diesen Satz ändern",
  /* Unter dem Bild nach „✎": seine eigene Fassung statt der verbesserten (Owner 11.09.2026). */
  textMeiner: "Meinen Text nehmen",
  /* Knopf unter der Schlussnachricht (Owner 11.09.2026). */
  profilErgaenzen: "Profil ergänzen",
  passtNein: "Nein",
  werkKarteTitel: "Magst du noch etwas zum Bild schreiben? Alles freiwillig.",
  feldTitel: "Titel",
  feldTechnik: "Technik",
  feldGroesse: "Größe",
  feldJahr: "Jahr",
  feldPreis: "Preis",
  /* Vor jedem Beispiel in der Werk-Karte (Owner 11.09.2026: die Beispiele sahen aus wie ausgefüllte Werte). */
  beispielVor: "z. B.",
  beispielTitel: "Italienischer Sommer",
  beispielTechnik: "Öl auf Leinwand",
  beispielGroesse: "80 × 60 cm",
  beispielJahr: "2024",
  beispielPreis: "800 €",
  werkWeiter: "Weiter",
  /* Owner 10.09.2026: „willst du noch bis zu 3 Bilder hochladen … ja nein" — einmal im Gespräch. */
  mehrBilderFrage: "Willst du noch bis zu {n} Bilder hochladen?",
  mehrBilderEins: "Willst du noch ein Bild hochladen?",
  mehrBilderJa: "Ja",
  mehrBilderNein: "Nein",

  /**
   * ── DIE AUFFORDERUNG UNTER DEN CHIPS (Owner 10.09.2026) ─────────────────────────────────
   *
   * „Da fehlt ein Zwischenschritt, eine Aufforderung. Was soll er machen?" — und später, als
   * sie nur im Userflow stand und nie im Chat: „wir haben uns 30 Minuten drüber unterhalten."
   *
   * WAS FEHLTE: Unter einer Frage standen zwei, drei Knöpfe, und nichts sagte, dass sie ein
   * Angebot sind. Wer nur die Knöpfe sieht, glaubt, er müsse einen davon nehmen — und wer
   * keinen passenden findet, hört auf.
   *
   * ZWEI HANDLUNGEN, IN DIESER REIHENFOLGE: erst das Bequeme (antippen), dann die Freiheit
   * (selbst schreiben). Kurz genug, dass man es beim Hinsehen liest, ohne es zu lesen.
   */
  /* Vorher „Tipp eins an …" — die Übersetzung las „Tipp" als „Vorschlag" („Sugestia unu", Owner 11.09.2026). */
  chipsHinweis: "Wähl einen aus — oder schreib ihn mit deinen Worten.",

  /* ── Die Oberfläche ──────────────────────────────────────────────────────── */
  muster: "Agent · Muster",
  platzhalter: "Schreib oder sprich.",
  senden: "Senden",
  bildAlt: "Dein Anzeigenbild",
  fotoWaehlen: "Foto anhängen",
  fotoWeg: "Foto entfernen",
  fehler: "Das ging gerade nicht. Bitte noch einmal.",
  /* Der Tagesdeckel — als einziger Fehler hat er eine eigene Auskunft, weil „noch einmal
     versuchen" hier falsch wäre: Es geht heute nicht mehr, und das darf man sagen. */
  fehlerDeckel: "Für heute ist auf diesem Gerät genug gelaufen. Morgen geht es weiter.",
  /**
   * ── „ALLES LÖSCHEN" STATT „NEU ANFANGEN" (Owner 09.09.2026: „statt Începe din nou — er
   * könnte alles löschen, dann ist es save") ────────────────────────────────────────────────
   *
   * DERSELBE KNOPF, DIE WAHRERE AUFSCHRIFT. „Neu anfangen" beschreibt, was DANACH kommt;
   * „Alles löschen" beschreibt, was PASSIERT — und das ist es, was jemand wissen will, der
   * einer Maschine gerade Umsatzzahlen und schlechte Bewertungen erzählt hat.
   *
   * ES IST DAMIT KEIN BEDIENKNOPF MEHR, SONDERN EINE ZUSAGE. Deshalb steht er auch, wenn der
   * Chat später Pflichtseiten bekommt: Ein sichtbarer Weg, alles wegzuwerfen, wiegt mehr als
   * ein Absatz darüber.
   *
   * UND ER STIMMT WÖRTLICH: Das Gespräch lebt allein im Browser, der Server legt für dieses
   * Muster nichts ab (`app/api/versusforge-agent/route.ts` speichert nichts). Ein Knopf, der
   * „alles löschen" verspricht und nur die Anzeige leert, wäre eine Lüge — hier ist die
   * Anzeige alles, was es gibt. Sobald der Agent eine Adresse ablegt, muss dieser Knopf auch
   * dort löschen oder anders heissen.
   *
   * ZWEI TIPPS, WIE JEDES LÖSCHEN IM HAUS ([[loeschen-zwei-tipps-rot]]): Der erste färbt rot
   * und fragt, der zweite räumt ab. Kein Bestätigungsfenster ([[keine-overlay-dialoge]]).
   */
  loeschen: "Alles löschen",
  /* „TIPPEN" IST ZWEIDEUTIG UND WURDE PROMPT FALSCH ÜBERSETZT (09.09.2026, im Prüflauf):
     Auf Rumänisch stand „Scrie din nou" — schreib noch einmal, also ins Feld. Gemeint ist
     der Knopf. „Drücken" ist in jeder Sprache eindeutig. */
  loeschenBestaetigen: "Wirklich alles löschen? Noch einmal drücken.",

  /* ── Was er benutzt hat ──────────────────────────────────────────────────── */
  werkzeugWebsite: "Website gelesen",
  werkzeugHook: "Hook geprüft",
  werkzeugBild: "Bild gebaut",
  werkzeugBeispiel: "Beispiel gezeigt",
} as const;

export type AgentChatTexte = { -readonly [K in keyof typeof AGENT_CHAT_TEXTE]: string };

/** Die Chat-Texte in seiner Sprache. Deutsch ist die Quelle und kostet keinen Aufruf. */
/* MUTTERSPRACHLICH GESETZT, NICHT ÜBERSETZT (Owner 11.09.2026: „auf Rumänisch denken") — wo die Übersetzung
   daneben lag („Sugestia unu"), steht der Satz hier fest und überschreibt sie. */
const FEST: Partial<Record<Lang, Partial<AgentChatTexte>>> = {
  ro: {
    chipsHinweis: "Alege una — sau scrie-o cu cuvintele tale.", textMeiner: "Textul meu", beispielVor: "ex.:",
    profilErgaenzen: "Completează profilul",
    /* Owner 11.09.2026: „Numai agentul va deveni plătit la un moment dat, dar nu este un Pflicht!" */
    grussKostenlos: "Aici totul e gratuit. Primești:\n· o frază pentru imaginea ta, care îi face pe cumpărători să se oprească\n· propria ta pagină pe lakatosbandi.com, platforma noastră pentru artiști, cu un agent AI care vorbește cu cei interesați\n· fiecare cerere cu nume și număr de telefon, ca să poți suna\nDoar agentul va deveni la un moment dat cu plată — și doar dacă vrei să-l păstrezi.",
    startVorherLabel: "Cum postează cei mai mulți artiști",
    startVorher: "„Tablou nou disponibil. Ulei pe pânză, 74 × 92 cm.”",
    startNachherLabel: "Fraza care îi face pe oameni să se oprească",
    startNachher: "„Priveliștea de la fereastra azilului, înainte de răsărit — cu un sat care n-a existat niciodată.”",
    startFrage: "Vrei și tu un astfel de marketing?",
    startText: "Îl facem acum pentru imaginile tale și te promovăm imediat pe lakatosbandi.com.",
    startFein: "Gratuit · pagina ta e online imediat",
    startDatenschutzTitel: "Protecția datelor",
    startJa: "Da, vreau",
    startQuelle: "Vincent van Gogh, Noapte înstelată, 1889 (detaliu) — domeniu public.",
  },
  en: {
    beispielVor: "e.g.",
    startVorherLabel: "How most artists post",
    startVorher: "“New painting available. Oil on canvas, 74 × 92 cm.”",
    startNachherLabel: "The sentence that makes people stop",
    startNachher: "“The view from his asylum window before sunrise — with a village that was never there.”",
    startFrage: "Want marketing like this too?",
    startText: "We'll do it now for your paintings and promote you right away on lakatosbandi.com.",
    startFein: "Free · your page is online right away",
    startDatenschutzTitel: "Privacy",
    startJa: "Yes, I want it",
    startQuelle: "Vincent van Gogh, The Starry Night, 1889 (detail) — public domain.",
  },
};

export async function agentChatInSprache(lang: Lang): Promise<AgentChatTexte> {
  return { ...(await textbausteineInSprache({ ...AGENT_CHAT_TEXTE } as AgentChatTexte, lang)), ...FEST[lang] };
}
