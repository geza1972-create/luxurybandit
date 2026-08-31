import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import type { Lang } from "@/lib/lang";

/**
 * LB BAUT AGENTEN — DIE TEXTE DER FIRMEN-RUBRIK AUF DER STARTSEITE.
 *
 * Owner 29.08.2026, in dieser Reihenfolge erarbeitet:
 *   „David AI ist ein Agent von LuxuryBandit, der Leads generiert für Unternehmen."
 *   → „dieser David ist ein Recruiter."
 *   → „dann ist nicht David, der den Kunden fragt, was sie für Leads haben wollen, sondern LB."
 *   → „LB baut die Funnels und das beinhaltet Person(David)-Funnel."
 *   → „mach das auf die Startseite, aber nicht als David."
 *
 * WARUM NICHT DAVID: Er hat ein Gesicht, eine Sprache und einen Ruf — Recruiter. Derselbe
 * Mann kann keinem Kosmetikstudio Werbung verkaufen; ein Gesicht mit zwei Berufen ist in
 * beiden unglaubwürdig. LuxuryBandit ist die Firma, die Agenten sind ihr Personal — und
 * David ist der fertige Beweis, den man anfassen kann.
 *
 * WAS VERKAUFT WIRD: keine Software, sondern eine Verkaufsstrecke mit einer Person darin.
 * Das ganze Konzept steht in KONZEPT-AGENTEN-FUER-FIRMEN.md.
 *
 * EIGENE DATEI, NICHT IN `david-texte`: Diese Rubrik gehört dem Haus, nicht dem Produkt
 * David. Läge sie dort, wanderte sie beim nächsten Umbau mit ihm mit.
 */
export const AGENTEN_TEXTE = {
  kicker: "Für Unternehmen",
  /* DER TITEL NENNT BEIDES: was wir bauen UND wozu (Owner 29.08.2026, in drei Anläufen:
     „Wir bauen deinem Unternehmen einen Agenten" → zu werkzeuglastig, eine Firma will keinen
     Agenten. „Wir generieren Leads für jede Branche" → nennt nur das Ergebnis, verschweigt
     aber, dass etwas Eigenes entsteht. Der dritte Anlauf hat beides: „Wir bauen AI Agenten,
     die Leads generieren."

     „AI" statt „KI" — dieselbe Schreibweise wie bei „David AI" (Owner 29.08.2026). */
  titel: "Wir bauen AI Agenten, die Leads generieren",
  /* DIE VIER KACHELN — was die Firma bekommt, in Substantiven statt in Versprechen. Das
     01–04-Muster der Feature-Karte (Dauerregel [[produktaufbau-video-card-feature-card]]):
     Eine Firma überfliegt vier kurze Kacheln, einen Fliesstext überspringt sie. */
  k1t: "Eine eigene Seite",
  k1p: "Deine Verkaufsstrecke. Kein Shop, kein Baukasten.",
  k2t: "Ein eigenes Gesicht",
  k2p: "Eine Person, die zu deiner Branche passt — mit Namen.",
  k3t: "Ein echtes Gespräch",
  k3p: "Er fragt nach, wo eine Antwort dünn bleibt.",
  k4t: "Leads bei dir",
  k4p: "Qualifizierte Anfragen statt roher Adressen.",
  kartenSchluss: "Sieben Sprachen. Jeder spricht in seiner eigenen.",
  /* Der erste Satz muss die Kategorie nennen, nicht die Wirkung umschreiben — eine Firma
     überfliegt die Seite und liest genau diese Zeile. */
  p1: "Mit einer Verkaufsstrecke, die ein Gesicht hat: eine eigene Seite, eine eigene Person, ein echtes Gespräch. Kein Formular, das niemand ausfüllt.",
  p2: "Deine Interessenten reden mit jemandem, statt Felder auszufüllen. Er fragt nach, wo eine Antwort dünn bleibt — und du bekommst eine qualifizierte Anfrage statt einer rohen Adresse.",
  /* DAVID ALS BEWEIS, NICHT ALS VERKÄUFER: Der stärkste Satz der Rubrik, weil er auf etwas
     zeigt, das läuft und das man selbst durchspielen kann. */
  /* GAR NICHTS ÜBER DEN BESITZ (Owner 29.08.2026: „David kann das, was wir hier zeigen, und
     die anderen zeigen wir nicht — oder vielleicht haben wir Kunden gebaut. Das muss man
     nicht sagen.").

     Zwei Sätze standen hier nacheinander und waren beide falsch: „er läuft schon" behauptete
     einen Kunden, den niemand prüfen kann, und „unser eigener Agent" erklärte ungefragt,
     dass es keinen gibt. Richtig ist der dritte Weg: Der Satz spricht über die LEISTUNG und
     schweigt über den Besitz. David ist offen, die anderen nicht — was man daraus schliesst,
     bleibt dem Leser überlassen. */
  p3: "Was so ein Agent leisten kann, siehst du an David: Er führt ein komplettes Vorgespräch mit Bewerbern — von der ersten Frage bis zum fertigen Ergebnis. Deiner kann etwas ganz anderes können.",
  p4: "Und das in drei Sprachen — Deutsch, Englisch, Rumänisch. Jeder spricht mit ihm in seiner eigenen.",
  /* NICHT „TESTE MICH" (Owner 29.08.2026: „statt Teste mich so nüchtern lieber Mach eine
     Anfrage und das in Gelb"). „Teste mich" lädt zum Ausprobieren ein — und Ausprobierer
     hinterlassen keine Adresse. „Mach eine Anfrage" sagt, was am Ende dabei herauskommt. */
  anfrageKnopf: "Mach eine Anfrage",
  agentenZeile: "Ein Gesicht je Branche — und deins bauen wir dazu.",

  /* ── DAS GESPRÄCH („Teste mich") ──
     FESTER ABLAUF, KEIN MODELL: Der Weg ist immer derselbe (Wofür? Wer bist du? Welche
     Branche? Deine Adresse). Ein Modell könnte davon nur abweichen — und es würde jeden
     Neugierigen Geld kosten, lange bevor daraus ein Auftrag wird.

     GEKLICKT STATT GETIPPT, wo es geht (Memory [[chat-no-personal-questions-buttons-only]]).

     ER IST ZUGLEICH DIE VORFÜHRUNG: Wer ihn durchspielt, hat erlebt, was er kaufen würde. */
  tmFrage1: "Wofür brauchst du Leads?",
  tmKunden: "Ich brauche Kunden",
  tmMitarbeiter: "Ich suche Mitarbeiter",
  tmNeugier: "Weiss ich noch nicht",
  tmEchoKunden: "Gut. Dann bauen wir dir jemanden, der dir Kunden bringt.",
  tmEchoMitarbeiter: "Gut. Dafür arbeitet bei uns David — er führt das Vorgespräch mit deinen Bewerbern.",
  tmEchoNeugier: "Kein Problem. Ich zeig dir, was wir bauen.",
  tmNameFrage: "Wie heisst du?",
  tmNamePlatz: "Dein Name",
  tmBrancheFrage: "Und in welcher Branche bist du unterwegs?",
  tmBranchePlatz: "z. B. Kosmetik, Handwerk, Gastronomie …",
  tmWeiter: "Weiter",
  tmPitch1: "Dann zeig ich dir, was wir für dich tun können.",
  tmPitch2: "Wir bauen dir eine Verkaufsstrecke. Du brauchst keinen Shop — eine Seite, die dir Anfragen bringt.",
  tmPitch3: "Mit einer eigenen Person darin, die zu deiner Branche passt. Und Werbung, die genau darauf zugeschnitten ist.",
  tmPitch4: "Bist du interessiert?",
  tmJa: "Ja, ich bin interessiert",
  tmSchluss: "Dann lass mir deine E-Mail-Adresse da und schreib kurz, was du brauchst. Wir melden uns innerhalb von 48 Stunden bei dir.",
  tmMailLabel: "Deine E-Mail-Adresse",
  tmAnliegenLabel: "Was brauchst du?",
  tmAnliegenPlatz: "Erzähl kurz, worum es geht.",
  tmSenden: "Abschicken",
  tmSendet: "Wird abgeschickt …",
  tmDanke: "Danke, {name}. Wir haben alles. Du hörst innerhalb von 48 Stunden von uns.",
  tmFehlerMail: "Diese Adresse sieht nicht vollständig aus.",
  tmFehler: "Das ging gerade nicht. Versuch es bitte gleich noch einmal.",
};

export type AgentenTexte = typeof AGENTEN_TEXTE;

/** Deutsche Quelle, sieben Sprachen — wie überall im Haus. */
export async function agentenTexteInSprache(lang: Lang): Promise<AgentenTexte> {
  return textbausteineInSprache(AGENTEN_TEXTE, lang);
}
