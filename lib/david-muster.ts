import type { ExecutiveProfil } from "@/lib/lebenslauf-vorlage";

/**
 * DAS MUSTER-DOSSIER IM DAVID-FLOW — CORA VOGEL, CUSTOMER SUCCESS.
 *
 * Owner 28.08.2026, in drei Schritten: erst „es wird eine Frau sein, die Oana heisst"
 * (Standbild aus dem Video), dann „die Frau sieht irgendwie doch nicht so gut aus. Sieht
 * nicht nach luxurybandit aus" (das Standbild war ein Handy-Frame vor einem Bücherregal),
 * dann ein echtes Studio-Porträt und ein Entwurfstext mit dem Satz „Hallo, ich bin Cora".
 *
 * WARUM EIN ZWEITES MUSTER UND NICHT DAS BESTEHENDE: Das Haus-Muster
 * (`EXECUTIVE_BEISPIEL`, Andrei Popescu) ist bewusst ein rumänischer Pfleger, der sich in
 * Deutschland bewirbt — dafür wurde es geschrieben, und die Bewerbungszentrale lebt davon.
 * David spricht eine andere Zielgruppe an: deutschsprachige Bewerber im Büro-Umfeld. Ein
 * Pflege-Dossier als „so sieht deine Bewerbung aus" wäre dort das falsche Versprechen.
 *
 * SIE IST NICHT DIE FRAU AUS DEM VERWANDLUNGS-VIDEO — und das ist geprüft, nicht übersehen.
 * Kein Text im Angebot behauptet, dass Lebenslauf-Beispiel und Video-Beispiel dieselbe
 * Person zeigen (`videoTitel`: „So kann deine persönliche Video-Bewerbung aussehen"). Es
 * sind zwei Produkte mit zwei Beispielen. Sollte je ein Text beides verknüpfen, muss
 * entweder der Text weg oder das Video neu — dann bitte hier nachlesen, warum das damals
 * bewusst so entschieden wurde.
 *
 * DER PROFILTEXT BEWEIST DAS SCREENING (Owner 28.08.2026: „Sie muss etwas sagen, was man aus
 * der Analyse ableiten kann"). Der zweite Satz — was ihr an der Arbeit liegt — steht so in
 * KEINEM Lebenslauf; er kann nur aus einem Gespräch kommen. Genau dafür bezahlt der Kunde
 * das Screening, und genau das muss das Muster zeigen, sonst verkauft es die falsche Sache.
 * Der dritte Satz liefert den Beleg dazu: eine Station mit einem Ergebnis. Haltung ohne
 * Beleg wäre wieder nur „kommunikationsstark".
 *
 * ALLES ERFUNDEN und heisst auch so (Musterfirmen).
 */
export const CORA_MUSTER: ExecutiveProfil = {
  id: "david-muster-cora",
  name: "Cora Vogel",
  rolle: "Customer Success Managerin",
  ort: "München · Hybrid",
  sprachenKurz: "Deutsch Muttersprache · Englisch B2 · Spanisch B1",
  schwerpunkte: ["Customer Success", "Kundenbindung", "Vertrieb und Produkt"],
  portraitUrl: "/Lebenslauf/cora-portrait.jpg",
  videoLabel: "Kurzvorstellung",
  profil:
    "Ich bin Cora Vogel und arbeite seit sechs Jahren im Customer Success. Was mir an der " +
    "Arbeit liegt, ist der Moment, in dem es kompliziert wird: zuhören, verstehen, was " +
    "wirklich fehlt, und daraus eine Lösung bauen, die hält. Bei Musterwerk betreue ich 60 " +
    "Bestandskunden und habe die Übergabe zwischen Vertrieb und Support neu aufgesetzt — " +
    "seitdem läuft kein Anliegen mehr zweimal durch dieselbe Schleife. Für meine nächste " +
    "Aufgabe suche ich ein Unternehmen, in dem ich mehr Verantwortung trage und enger mit " +
    "Kunden, Produkt und Vertrieb zusammenarbeite.",
  expertise: ["Kundenbetreuung", "Eskalationen", "Onboarding", "Vertragsfragen", "CRM-Pflege", "Einarbeitung neuer Kolleginnen"],
  erfahrung: [
    { rolle: "Customer Success Managerin", firma: "Musterwerk GmbH, München", zeitraum: "2021–heute", ergebnis: "60 Bestandskunden in fester Betreuung; Übergabe zwischen Vertrieb und Support neu aufgesetzt." },
    { rolle: "Kundenberaterin", firma: "Muster Handel KG, Augsburg", zeitraum: "2019–2021", ergebnis: "Erste Ansprechpartnerin für Reklamationen und Vertragsfragen, vom Erstkontakt bis zur Lösung." },
    { rolle: "Mitarbeiterin Kundenservice", firma: "Musterverwaltung, München", zeitraum: "2017–2019", ergebnis: "Telefon- und E-Mail-Betreuung, Pflege der Kundendaten, Einarbeitung neuer Kolleginnen." },
  ],
  impact: [
    { zahl: "6", text: "Jahre im Customer Success" },
    { zahl: "60", text: "Bestandskunden in fester Betreuung" },
    { zahl: "1", text: "Übergabe Vertrieb–Support neu aufgesetzt" },
  ],
  ausbildung: [
    { titel: "Weiterbildung Customer Success Management", ort: "München", zeitraum: "2022" },
    { titel: "Kauffrau für Büromanagement", ort: "Augsburg", zeitraum: "2014–2017" },
  ],
  sprachen: [
    { sprache: "Deutsch", niveau: "Muttersprache" },
    { sprache: "Englisch", niveau: "B2" },
    { sprache: "Spanisch", niveau: "B1" },
  ],
  chatFragen: [
    "Wie viele Kunden betreut Cora gleichzeitig?",
    "Welche Erfahrung hat sie mit Eskalationen?",
    "Ab wann könnte sie anfangen?",
  ],
  /* Wie beim Haus-Muster: So sieht die Seite aus, die an eine Firma geht. */
  kontaktSichtbar: false,
};
