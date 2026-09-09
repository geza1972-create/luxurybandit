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
  gruss1: "Hallo, ich bin VersusForge — ein KI-Agent, gebaut für eine einzige Sache: Werbung, die Anfragen bringt.",
  gruss2: "Ich baue dir eine Werbestrategie, die genau auf dein Geschäft zugeschnitten ist, nicht aus einer Vorlage: den Satz, der Leute anhält, wen er erreichen soll, und die Seite dahinter, auf der sie ihren Namen und ihre Nummer hinterlassen.",
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
  grussRegeln: "· Antworte konkret. \"Gutes Essen\" bringt uns nicht weiter, \"Lamm vom Holzkohlegrill\" schon.\n· Verstehe ich etwas falsch, sag es sofort — ich rechne damit.\n· Was du nicht weisst, lass weg. Ich erfinde nichts, und du sollst es auch nicht.",
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
  grussKostenlos: "Das hier kostet dich nichts. Wir sind ein Startup und wollen, dass du uns testest — deshalb bekommst du die ganze Strategie geschenkt. Das bleibt nicht so.",
  /**
   * DER DATENSCHUTZSATZ — er trägt ein Versprechen, das ein Mensch einlöst.
   *
   * Die 30 Tage stehen hier, weil der Owner sie am 09.09.2026 zugesagt hat („wenn es
   * ungenutzt ist seit 30 Tagen, dann löschen wir es wirklich" · „ich lösche es"), und sie
   * werden mit `scripts/versusforge-aufraeumen.mjs --ungenutzt` eingelöst.
   *
   * WER DIESEN SATZ ÄNDERT, ÄNDERT EIN VERSPRECHEN — und wer das Aufräumen einstellt, muss
   * den Halbsatz wieder herausnehmen. Ein Datenschutzsatz, den niemand einhält, ist
   * schlimmer als keiner. Das gilt jetzt in drei Sprachen.
   */
  grussDatenschutz: "Zum Datenschutz: Was du schreibst, verarbeitet ein KI-Modell von OpenAI — anders geht es nicht. Am Ende schicke ich dir die fertige Strategie per E-Mail; dafür brauche ich deine Adresse, und ab da liegt sie bei uns. In jeder Mail steht ein Link, mit dem du alles wieder löschst — sofort, ohne Nachfrage und ohne Begründung. Und was 30 Tage lang ungenutzt bleibt, löschen wir von uns aus.",
  grussFrage: "Ein paar Minuten, dann steht deine Strategie. Einverstanden?",
  chipEinverstanden: "Ja, einverstanden",

  /* ── Die Oberfläche ──────────────────────────────────────────────────────── */
  muster: "Agent · Muster",
  platzhalter: "Schreib oder sprich.",
  senden: "Senden",
  bildAlt: "Dein Anzeigenbild",
  fehler: "Das ging gerade nicht. Bitte noch einmal.",
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
export async function agentChatInSprache(lang: Lang): Promise<AgentChatTexte> {
  return await textbausteineInSprache({ ...AGENT_CHAT_TEXTE } as AgentChatTexte, lang);
}
