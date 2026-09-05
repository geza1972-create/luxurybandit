/**
 * WO DIE ANWENDUNGEN LAUFEN — die EINE Quelle für diesen Abschnitt.
 *
 * Owner 02.09.2026: „Wir können diese Applikation im Web, auf dem Handy, Projektionen und
 * auf einem Display laufen lassen. Die User können den QR-Code benutzen und sofort Videos
 * generieren. Also Werbung am POS (bitte umformulieren). Dann machen wir dafür 3 Rubriken."
 * — dann: „Da kommt auf die Media-Kit-Seite auf erster Stelle" und „auf die Startseite hier
 * auch".
 *
 * ZWEI SEITEN, EIN TEXT. Der Abschnitt stand zuerst nur im Media Kit. „Auch auf der
 * Startseite" heisst nicht „noch einmal tippen": Zwei Kopien desselben Absatzes laufen
 * auseinander, sobald jemand einen davon verbessert — und dann steht auf zwei Seiten des
 * Hauses etwas Verschiedenes über dieselbe Sache. Text und Darstellung liegen deshalb hier
 * und in `components/OrteBlock`; die Seiten holen sie sich.
 *
 * „POINT OF SALE" BLEIBT DRAUSSEN (Owner: „bitte umformulieren"). Es ist Handelssprache und
 * sagt weniger als das, was gemeint ist: Werbung dort, wo die Leute ohnehin schon stehen.
 *
 * DREI SPRACHEN, wie im Media Kit — Deutsch, Englisch, Rumänisch. Die übrigen Haus-Sprachen
 * fallen auf Englisch zurück, statt eine Übersetzung zu erfinden, die niemand beauftragt hat.
 */

export type OrteTexte = {
  titel: string;
  text: string;
  eins: { titel: string; text: string };
  zwei: { titel: string; text: string };
  drei: { titel: string; text: string };
  qrTitel: string;
  qrText: string;
};

const ORTE: Record<string, OrteTexte> = {
  de: {
    titel: "Wo das läuft",
    text: "Dieselbe Anwendung, drei Orte. Wer einen Bildschirm sieht, scannt den Code und hat sein Video eine Minute später auf dem eigenen Handy — kein Stand, kein Formular, kein Gespräch nötig. Das macht aus Werbefläche einen Trichter, der sofort etwas zurückgibt.",
    eins: { titel: "Im Netz", text: "Als Link in einer Anzeige, in einer Nachricht oder auf der eigenen Seite. Läuft auf jedem Handy und jedem Rechner, ohne Installation." },
    zwei: { titel: "Auf einem Bildschirm vor Ort", text: "Messe, Filiale, Empfang, Schaufenster: Der Bildschirm zeigt den Spot in Schleife, der Code daneben führt weiter. Gearbeitet wird auf dem Handy des Besuchers — der Bildschirm bleibt frei für den Nächsten." },
    drei: { titel: "Als grosse Projektion", text: "Bei Veranstaltungen auf eine Wand geworfen — dieselbe Anwendung, nur gross. Wer stehen bleibt, hat den Code schon vor sich." },
    qrTitel: "Ein Code je Ort — und damit zählbar",
    qrText: "Jeder Bildschirm, jede Messe, jede Anzeige bekommt ihren eigenen Code. Hinterher ist sichtbar, welcher Ort wie viele Menschen gebracht hat — das kann ein Plakat nicht.",
  },
  en: {
    titel: "Where this runs",
    text: "One application, three places. Anyone who sees a screen scans the code and has their video on their own phone a minute later — no stand, no form, no conversation needed. It turns advertising space into a funnel that gives something back on the spot.",
    eins: { titel: "Online", text: "As a link in an advert, in a message or on your own site. Runs on any phone and any computer, with nothing to install." },
    zwei: { titel: "On a screen on site", text: "Trade fair, store, reception, shop window: the screen loops the spot, the code beside it takes over. The work happens on the visitor's phone — the screen stays free for the next person." },
    drei: { titel: "As a large projection", text: "Thrown onto a wall at events — the same application, just bigger. Anyone who stops already has the code in front of them." },
    qrTitel: "One code per location — and therefore countable",
    qrText: "Every screen, every fair, every advert gets its own code. Afterwards it is visible which location brought how many people — something a poster cannot do.",
  },
  ro: {
    titel: "Unde rulează",
    text: "Aceeași aplicație, trei locuri. Cine vede un ecran scanează codul și are videoclipul pe propriul telefon un minut mai târziu — fără stand, fără formular, fără discuție. Spațiul publicitar devine o pâlnie care dă ceva înapoi pe loc.",
    eins: { titel: "Online", text: "Ca link într-o reclamă, într-un mesaj sau pe propriul site. Rulează pe orice telefon și pe orice calculator, fără instalare." },
    zwei: { titel: "Pe un ecran la fața locului", text: "Târg, magazin, recepție, vitrină: ecranul rulează spotul în buclă, codul de alături preia mai departe. Lucrul se întâmplă pe telefonul vizitatorului — ecranul rămâne liber pentru următorul." },
    drei: { titel: "Ca proiecție mare", text: "Proiectat pe un perete la evenimente — aceeași aplicație, doar mai mare. Cine se oprește are deja codul în față." },
    qrTitel: "Un cod pentru fiecare loc — și deci măsurabil",
    qrText: "Fiecare ecran, fiecare târg, fiecare reclamă primește codul său. După aceea se vede care loc a adus câți oameni — un afiș nu poate face asta.",
  },
};

export function orteTexte(lang = "en"): OrteTexte {
  const l = String(lang).slice(0, 2).toLowerCase();
  return ORTE[l] ?? ORTE.en;
}
