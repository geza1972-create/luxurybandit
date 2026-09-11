import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import { isLang, type Lang } from "@/lib/lang";

/**
 * DIE TEXTE DER VERSUSFORGE-POST — deutsche Quelle, eine Stelle.
 *
 * ── WARUM DIE MAILS ZUERST DRAN WAREN (Owner 09.09.2026: „auch alles, was er erstellt — den
 * Trichter und Hook und Dashboard — wird in der Sprache erstellt, die er spricht") ──────────
 *
 * Drei Flächen waren noch deutsch: Mails, Dashboard, Einrichten-Formular. Die Mails kamen
 * zuerst, und das ist keine Bequemlichkeit — sie sind die einzige davon, die das Haus
 * VERLÄSST. Ein rumänischer Kunde bekommt seine Strategie zugeschickt und liest als Erstes
 * „Dein Weg steht." Das Dashboard sieht nur, wer schon gekauft hat; eine Mail bekommt jeder,
 * und sie ist oft das Letzte, was er von uns sieht.
 *
 * ── PLATZHALTER STEHEN NIE IM ÜBERSETZTEN SATZ ─────────────────────────────────────────────
 *
 * Hausregel aus Erfahrung ([[uebersetzer-fallen]]): Das Modell erdichtet Platzhalter oder
 * lässt sie weg. Zahlen und Adressen werden deshalb NACH der Übersetzung eingesetzt, und wo
 * ein Wort in den Satz muss, steht `{n}` — geht es verloren, bleibt trotzdem ein
 * vollständiger Satz stehen.
 *
 * ── DIE ANREDE BLEIBT DAS DU ───────────────────────────────────────────────────────────────
 *
 * Anders als auf der Mandantenseite, wo sein Kunde gesiezt wird: Hier schreiben WIR an IHN,
 * und das Haus duzt ([[immer-duzen]]).
 */
export const VERSUSFORGE_MAIL_TEXTE = {
  /* ── Die Analyse geht raus ───────────────────────────────────────────────── */
  planTitel: "Dein Weg steht.",
  planText: "Alles, was daraus entstanden ist, liegt unter diesen zwei Adressen — dein Bild, deine Anzeigentexte und der Trichter, auf dem deine Kunden landen.",
  planAnzeige: "Deine Anzeige",
  planAnzeigeFein: "Dort liegen dein Bild, deine Anzeigentexte und die Adresse für die Anzeige.",
  planTrichter: "Dein Trichter",
  planTrichterFein: "Der Trichter selbst — mach ihn auf und geh ihn durch.",
  planHilfe: "Wenn du es nicht selbst bauen willst, meld dich — es antwortet ein Mensch.",
  planBetreff: "Dein Weg steht",

  /* ── Eine Anfrage ist da ─────────────────────────────────────────────────── */
  /* `{n}` ist die Anzahl und wird nach der Übersetzung eingesetzt. */
  anfrageTitelViele: "{n} Anfragen warten auf dich.",
  anfrageTitelEine: "Du hast eine Anfrage.",
  anfrageTextViele: "Jemand ist gerade durch deinen Trichter gegangen und hat Namen und Telefonnummer hinterlassen. Die Anfragen liegen in deinem Dashboard.",
  anfrageTextEine: "Jemand ist gerade durch deinen Trichter gegangen und hat Namen und Telefonnummer hinterlassen. Sie liegt in deinem Dashboard.",
  anfrageKastenTitel: "Schalte dein Dashboard frei.",
  /* Der Preis steht NICHT im übersetzten Satz — er wird angehängt
     ([[prices-only-from-pricing-table]], und ein Übersetzer rechnet Beträge gern um). */
  anfrageKastenText: "Danach siehst du zu jeder Anfrage den Namen, die Telefonnummer und das, was der Mensch gesagt hat — auch zu denen, die schon vorher gekommen sind.",
  anfrageKnopf: "Zum Dashboard",
  anfrageUhr: "Wer innerhalb eines Tages zurückruft, erreicht die Leute noch. Danach haben sie meist woanders angefragt.",
  anfrageBetreffViele: "{n} Anfragen warten",
  anfrageBetreffEine: "Du hast eine Anfrage",
  /* ── DAS ART-MARKETING-ABO (Owner 10.09.2026) — Regeln in lib/versusforge-abo.ts ─────────
     OFFEN: Er sieht die Anfrage. FRAGE: die dritte — „Willst du deinen Agenten behalten?".
     GESPERRT: nach 14 Tagen ohne Abo — „bekommt eine E-Mail, kann sie nicht sehen, wird
     aufgefordert zu zahlen". Der Preis wird angehängt, nie übersetzt. */
  aboOffenText: "Ein Interessent hat deinem Agenten geschrieben. Name, Telefonnummer und seine Antwort stehen in deinem Dashboard.",
  aboFrageTitel: "Drei Interessenten haben sich bei dir gemeldet.",
  aboFrageText: "Dein Agent arbeitet für dich. Noch 14 Tage siehst du jede Anfrage in deinem Dashboard — danach nur mit dem Abo.",
  aboKastenTitel: "Willst du deinen Agenten behalten?",
  aboKastenText: "Mit dem Abo siehst du jede Anfrage mit Namen, Telefonnummer und Antwort — auch die, die schon da sind. Es kostet im Monat",
  aboGesperrtTitel: "Jemand hat dir geantwortet.",
  aboGesperrtText: "Ein Interessent hat deinem Agenten geschrieben. Seine Antwort und seinen Kontakt siehst du, sobald du das Abo abschliesst.",
  aboFrageBetreff: "Drei Interessenten — willst du deinen Agenten behalten?",
  aboGesperrtBetreff: "Jemand hat dir geantwortet",

  /* ── Adressen und Löschlink ──────────────────────────────────────────────── */
  linksLoeschTitel: "Dein Löschlink.",
  linksLoeschText: "Darüber löschst du deinen Trichter und alle Anfragen darin. Das lässt sich nicht rückgängig machen.",
  linksLoeschWort: "Löschen",
  linksLoeschFein: "Ein Klick, dann noch eine Bestätigung — danach ist alles weg.",
  linksTitel: "Deine Adressen und die Anleitung.",
  linksAnzeige: "Deine Anzeige",
  linksAnzeigeFein: "Texte zum Kopieren, das Bild und das Ziel für die Anzeige.",
  linksTrichter: "Dein Trichter",
  linksTrichterFein: "Die Seite, auf der deine Kunden landen. Mach sie auf und geh sie durch.",
  linksDashboard: "Dein Dashboard",
  linksDashboardFein: "Hier trägst du Impressum, Datenschutz, Adresse und Telefonnummer ein — ohne die nimmt deine Seite keine Anfragen an.",
  linksVorWerbung: "Bevor du Geld in Werbung steckst",
  linksHilfe: "Kriegst du es trotzdem nicht eingerichtet? Schreib uns, wir machen es mit dir zusammen.",
  linksAllesLoeschen: "Alles löschen",
  linksAllesLoeschenFein: "Trichter und Anfragen, endgültig — falls du es wieder loswerden willst.",
  /* Der Kasten vor der Anleitung — die drei Zeilen stehen einzeln, weil die Fettschrift in
     Code gesetzt wird und nicht durch den Übersetzer laufen darf. */
  linksAnsehenWort: "Ansehen und durchgehen:",
  linksAnsehenText: "ja, jederzeit.",
  linksNachbauenWort: "Selbst nachbauen:",
  linksNachbauenText: "ja — es ist deine Strategie.",
  linksBenutzenWort: "Benutzen:",
  linksBenutzenText: "noch nicht. Die Anfragen laufen in dein Fach, aber lesen kannst du sie nur im Dashboard.",
  linksWarnung: "Schaltest du jetzt eine Anzeige, zahlst du für Klicks und siehst am Ende keine einzige Telefonnummer.",
  linksPreisFein: "einmalig, mit Einrichtung der ersten Anzeige zusammen mit uns.",
  linksAnleitungTitel: "So richtest du die Anzeige ein",
  linksMetaFein: "Meta benennt seine Menüs gelegentlich um. Findest du einen Punkt nicht unter diesem Namen, ist er meist eine Ebene höher oder tiefer.",
  linksBetreffLoeschen: "Dein Löschlink",
  linksBetreff: "Deine Anzeige und dein Trichter",

  /* ── DIE MAIL AN KÜNSTLER (Owner 10.09.2026) ─────────────────────────────────────────────
     Vorher bekam der Künstler die Firmen-Mail: „deine Anzeige", „dein Trichter", 299 €, eine
     Meta-Anleitung. Er bekommt aber keine Werbung von uns, sondern seine Seite auf lakatosbandi.com. */
  kuenstlerBetreff: "Deine Seite auf lakatosbandi.com",
  kuenstlerTitel: "Willkommen bei lakatosbandi.com.",
  /* Sofort online (Owner 11.09.2026) — vorher „innerhalb von 3 Tagen frei". */
  kuenstlerText: "Deine Seite ist ab jetzt online. Es kostet dich jetzt nichts: Du zahlst erst, wenn dein Agent für dich arbeitet und du ihn behalten willst.",
  kuenstlerSeite: "Deine Seite",
  kuenstlerSeiteFein: "Hier stehen deine Bilder mit ihren Sprüchen, und dein KI-Agent spricht jeden Besucher an.",
  /* Owner 11.09.2026: „Dann wird er den Link bekommen, dass er öffnen und es ergänzen kann … WYSIWYG". */
  /* Owner 11.09.2026: „das muss man ihm auch per E-Mail schicken, die Info und den Link zu seinem Profil". */
  kuenstlerBearbeiten: "Mach deinen Agenten besser — optional",
  kuenstlerBearbeitenFein: "Erzähl ihm etwas über dich und die Geschichte hinter jedem Werk, lade ein Foto von dir hoch. Je mehr er weiß, desto besser spricht er mit Käufern. Wer diesen Link hat, kann deine Seite bearbeiten: Gib ihn nicht weiter.",
  /* ── FREIGEGEBEN ODER ABGELEHNT (Owner 11.09.2026: „Bekommt der Künstler eine E-Mail, wenn freigegeben?" — vorher
     nicht). Die Ablehnung ohne Begründung: kurz, freundlich, kein Urteil über seine Kunst. */
  freigabeBetreff: "Deine Seite auf lakatosbandi.com ist online",
  freigabeTitel: "Deine Seite ist online.",
  freigabeText: "Wir haben uns deine Bilder angesehen. Ab jetzt sehen Käufer deine Seite, und dein Agent spricht jeden an, der sich für deine Kunst interessiert.",
  freigabeSeiteFein: "So sehen Käufer deine Seite.",
  ablehnungBetreff: "Deine Anmeldung bei lakatosbandi.com",
  ablehnungTitel: "Danke für deine Bilder.",
  ablehnungText: "Wir können deine Seite gerade nicht auf lakatosbandi.com aufnehmen. Das ist kein Urteil über deine Kunst — unsere Auswahl ist im Moment sehr eng.",
  ablehnungLoeschenFein: "Deine Bilder und Angaben löschen wir, sobald du hier klickst.",
  /* ── JEMAND INTERESSIERT SICH (Owner 11.09.2026: „bei jedem Besuch eine E-Mail ist zu viel … erst, wenn jemand drückt:
     Da, mă interesează lucrarea"). Hier stand die Mail „Du hast Besuch" bei jedem neuen Besucher. `{werk}` setzt der Code. */
  interesseBetreff: "Jemand interessiert sich für dein Werk",
  interesseTitel: "Jemand interessiert sich für dein Werk.",
  interesseText: "{werk} — dein Agent spricht gerade mit dieser Person. Hinterlässt sie Namen und Telefonnummer, bekommst du sofort noch eine Mail.",
  interesseDashboardFein: "Hier siehst du alle Besucher und Anfragen.",
  kuenstlerDashboardFein: "Hier siehst du deine Anfragen und änderst deine Sprüche. Wer diesen Link hat, kommt hinein — gib ihn nicht weiter. Anmelden geht auch über lakatosbandi.com/login.",
} as const;

export type MailTexte = { -readonly [K in keyof typeof VERSUSFORGE_MAIL_TEXTE]: string };

/** Die Posttexte in seiner Sprache. Deutsch ist die Quelle und kostet keinen Aufruf. */
export async function mailTexteInSprache(sprache?: string): Promise<MailTexte> {
  const kurz = String(sprache ?? "de").slice(0, 2).toLowerCase();
  const lang: Lang = isLang(kurz) ? kurz : "de";
  return await textbausteineInSprache({ ...VERSUSFORGE_MAIL_TEXTE } as MailTexte, lang);
}
