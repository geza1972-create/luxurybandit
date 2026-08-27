/**
 * DIE ZIELGRUPPEN-LANDINGPAGES `/topics/<slug>` (Owner-Auftrag 26.08.2026,
 * KONZEPT-JOB-MATCH-TRICHTER.md Baustelle H) — EINE Konfiguration statt einer
 * handgebauten Seite je Zielgruppe. Alle CTAs routen in DENSELBEN Trichter
 * (`/themes/lebenslauf/start?jobs=1&topic=<slug>`, Tür 2) — kein zweiter Trichter, keine
 * Kopie der Funnel-Logik.
 *
 * NAMENS-HINWEIS: „Topics" heisst im Haus schon etwas anderes (`/api/my-topics` = die
 * Themen-ABOS eines Nutzers). Diese Datei heisst deshalb bewusst „Zielgruppen" — nur die
 * ÖFFENTLICHE Route bleibt `/topics/…`, wie vom Owner vorgegeben.
 *
 * DEUTSCHE QUELLE, zur Laufzeit übersetzt — dasselbe Muster wie `TRICHTER_QUELLE` in
 * `app/themes/lebenslauf/start/page.tsx` (`textbausteineInSprache`, Dauer-Cache).
 */
export type Zielgruppe = {
  slug: string;
  kicker: string;
  titel: string;
  unterzeile: string;
  /**
   * DIE ZEILE UNTER DER UNTERZEILE — früher „Ohne Lebenslauf, in 2 Minuten".
   *
   * DAS VERSPRECHEN IST RAUS (Owner 26.08.2026: „mach keine Werbung ohne CV"): Der
   * Trichter bewertet den Lebenslauf inzwischen als das, was er ist — ohne ihn gibt es
   * mehrere Minuspunkte, weil eine Firma nichts nachprüfen kann. Damit zu werben, es
   * brauche keinen, hätte genau die Lücke zwischen Anzeige und Produkt aufgerissen, die
   * wir heute überall geschlossen haben. Der Name des Feldes bleibt, damit nicht jede
   * Seite umgeschrieben werden muss.
   */
  ohneCvZeile: string;
  heroCta: string;
  habeAnzeigeLink: string;
  /** „Video-Bewerbung. Zuletzt zählt der Mensch." — der Claim (Owner-Wortlaut). */
  claim: string;
  beispielRollen: string[];
  szenarioTitel: string;
  szenarioText: string;
  faq: { frage: string; antwort: string }[];
  metaTitel: string;
  metaBeschreibung: string;
};

/**
 * TEXTE = DIE EINFACHE FASSUNG (Owner-Gespräch 26.08.2026 abends,
 * KONZEPT-JOB-MATCH-TRICHTER.md „DIE EINFACHE FASSUNG" + Nachträge): H1 ist die Frage,
 * die sich die Zielgruppe selbst stellt; der Einstieg braucht KEINEN Lebenslauf mehr
 * („Ich will. Ich kann. Ich heisse." — drei Klick-Schritte); die Gratis-Linie ist die
 * neue Staffel (Analyse gratis · Bewerbungs-Stücke bezahlt · Vermittlung zahlt Firma).
 */
export const ZIELGRUPPEN: Record<string, Zielgruppe> = {
  "german-speakers": {
    slug: "german-speakers",
    kicker: "Jobs mit Deutsch",
    titel: "Welcher Job passt zu mir?",
    /* KEINE ALTERSANGABE (Owner 26.08.2026: „ich will 50+ nicht erwähnen, ich will
       lieber jedes Alter erwähnen") — „in jedem Alter" schliesst alle ein, statt eine
       Gruppe zu etikettieren. */
    unterzeile: "Du sprichst Deutsch? Dann gibt es mehr Jobs für dich, als du glaubst — auch als Quereinsteiger, in jedem Alter.",
    ohneCvZeile: "Ein paar Klicks, 5 Minuten — mit gratis Deutschtest. Du siehst ehrlich, was für dich spricht und was dir noch fehlt. Mit deinem Lebenslauf wird die Einschätzung genau.",
    heroCta: "Finde heraus, was zu dir passt",
    habeAnzeigeLink: "Ich habe schon eine Anzeige",
    claim: "Video-Bewerbung. Zuletzt zählt der Mensch.",
    beispielRollen: ["Customer Support", "Customer Service", "Backoffice", "Order Management", "Sales Support", "Service Desk", "Technical Support", "Operations"],
    szenarioTitel: "Nie im Support gearbeitet?",
    szenarioText: "Acht Jahre Einzelhandel heisst: jeden Tag Kundenkontakt, Reklamationen, schwierige Gespräche — und Deutsch C1. Genau das sucht eine Support-Stelle; es stand nur nie so in deinem Jobtitel. Wir zeigen dir ehrlich, was aus deiner Erfahrung überträgt, was du erklären solltest und was wirklich fehlt.",
    faq: [
      { frage: "Brauche ich einen Lebenslauf?", antwort: "Zum Starten nicht — du beantwortest ein paar Fragen per Klick. Für eine ernsthafte Bewerbung schon: Ohne Lebenslauf kann eine Firma deine Erfahrung nicht nachprüfen, und genau das sagen wir dir in der Analyse auch. Wenn du keinen hast, bauen wir ihn mit dir zusammen." },
      { frage: "Was ist der Deutschtest?", antwort: "Fünf kurze Fragen, von leicht bis schwer, mit 20 Sekunden Zeit pro Frage. Danach weisst du, auf welchem Niveau du wirklich stehst — und wir rechnen mit diesem Wert, nicht mit einer Selbsteinschätzung. Der Test kostet nichts." },
      { frage: "Ich habe nie in dieser Branche gearbeitet — hat das Sinn?", antwort: "Genau dafür ist die Analyse da: Sie unterscheidet, was überträgt, was erklärbar ist und was wirklich fehlt. Wenn es nicht reicht, sagen wir dir das ehrlich." },
      { frage: "Bewerbt ihr mich automatisch?", antwort: "Nein. Nichts wird ohne dich verschickt — mit deiner Freigabe stellen wir dein Profil passenden Arbeitgebern vor, die Entscheidung bleibt bei dir." },
      { frage: "Was kostet das?", antwort: "Die Analyse und deine Jobchancen kosten nichts. Bezahlt wird erst, wenn wir für dich arbeiten: deine Bewerbung anpassen, dein Motivationsschreiben, dein Profi-Video. Deine eigene Aufnahme mit unserem Skript bleibt kostenlos." },
    ],
    metaTitel: "Welcher Job passt zu mir? Jobs mit Deutsch | LB - Jobs",
    metaBeschreibung: "Du sprichst Deutsch? Gratis Deutschtest und ehrliche Einschätzung in 5 Minuten: was für dich spricht, was dir fehlt und welche Jobs wirklich zu dir passen — auch als Quereinsteiger, in jedem Alter.",
  },
};

export function zielgruppe(slug: string): Zielgruppe | null {
  return ZIELGRUPPEN[slug] ?? null;
}

export function alleZielgruppenSlugs(): string[] {
  return Object.keys(ZIELGRUPPEN);
}
