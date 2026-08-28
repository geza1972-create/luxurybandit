import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import type { Lang } from "@/lib/lang";

/**
 * DIE TEXTE DER DAVID-LANDINGPAGE — DEUTSCHES ORIGINAL, EINE QUELLE.
 *
 * Der Wortlaut ist der des Owners (28.08.2026, diktiert: „DAVID · AI PRE-SCREENING —
 * Willst du einen besser bezahlten Job? …"). Er steht hier flach als
 * `Record<string, string>`, weil `textbausteineInSprache` genau das übersetzen kann: EIN
 * Aufruf je Sprache, danach Dauer-Cache. Sieben handgepflegte Tabellen altern bei der
 * ersten Textänderung — die Begründung steht ausführlich in lib/tr-object.ts.
 *
 * DEUTSCH IST DIE QUELLE, nicht Englisch: deshalb `textbausteineInSprache` (übersetzt
 * ALLES ausser Deutsch) und nicht `trObject` (das bei `en` unverändert durchreicht und
 * einem englischen Leser deutschen Text zeigen würde).
 *
 * ZWEI ORTE, EINE DATEI (Memory `tunnel-zeigt-landingpage-inhalt`): Die Landingpage
 * rendert diese Texte unter ihrer Video-Karte, der Pre-Screening-Tunnel später unter
 * seinem Anmeldeformular — beide über `components/DavidInhalt.tsx`.
 *
 * WAS HIER NICHT STEHT: kein Preis, keine Zahl. Das Screening ist gratis („Jetzt
 * kostenlos starten"); käme später eine Kasse dazu, kommt die Zahl aus `lib/pricing.ts`
 * und nie aus diesem Text (Memory `prices-only-from-pricing-table`).
 */
export const DAVID_TEXTE = {
  /* ── Kopf ───────────────────────────────────────────────────────────────── */
  kicker: "David · AI Pre-Screening",
  /* Die H1 zweifarbig: Anfang weiss, `h1y` im Haus-Gold (components/Landing). */
  h1a: "Willst du einen ",
  h1y: "besser bezahlten Job",
  h1b: "?",
  sub: "Finde heraus, was dein Lebenslauf einem Recruiter noch nicht erzählt.",

  /* ── Die Video-Karte ────────────────────────────────────────────────────── */
  kartenTitel: "AI Pre-Screening",
  cta: "Jetzt kostenlos starten",
  /* Die Zeile UNTER der Karte — beim Kuss steht dort der Preis, hier die Vertrauens-
     zeile des Owners: „Individuell · Vertraulich · ca. 5 Minuten". */
  trust: "Individuell · Vertraulich · ca. 5 Minuten",

  /* ── Was direkt unter der Karte steht ───────────────────────────────────── */
  hero1: "David analysiert deinen Lebenslauf zusammen mit genau der Stelle, auf die du dich bewerben möchtest.",
  hero2: "Danach führt er mit dir ein persönliches Pre-Screening. Er stellt dir aktiv die Fragen, die bei deiner Bewerbung noch offen sind – und fragt nach, wenn eine Antwort nicht ausreicht.",
  hero3: "Keine Standardanalyse. Keine Standardfragen. Deine Bewerbung. Deine Stelle. Dein Screening.",
  unterVideo1: "Deine Bewerbung wird nicht allgemein bewertet.",
  unterVideo2: "David betrachtet sie immer im Zusammenhang mit deiner konkreten Wunschstelle.",

  /* ── Die Feature-Karte (Creme, nummeriert) ──────────────────────────────
     Dauerregel `produktaufbau-video-card-feature-card`: Video-Karte oben, Feature-Karte
     darunter. Die vier Kacheln sind der Ablauf, den der Owner beschrieben hat —
     Lebenslauf, Stelle, Gespräch, Ergebnis —, nichts darüber hinaus. */
  merkmaleTitel: "So läuft dein Screening",
  m1t: "Dein Lebenslauf",
  m1d: "Du lädst ihn hoch. David liest ihn und sagt dir, was er darin sieht.",
  m2t: "Deine Stelle",
  m2d: "Anzeige einfügen — Link oder Text. David vergleicht sie mit deinem Werdegang.",
  m3t: "Das Gespräch",
  m3d: "Er fragt nur, was noch offen ist. Bleibt eine Antwort zu allgemein, hakt er nach.",
  m4t: "Dein Ergebnis",
  m4d: "Was für dich spricht, was Fragen aufwirft und was dein Lebenslauf noch nicht erzählt.",

  /* ── Abschnitt 1 ────────────────────────────────────────────────────────── */
  s1t: "Ein Lebenslauf zeigt Fakten. Aber nicht die ganze Geschichte.",
  s1p1: "Ein Recruiter sieht deine bisherigen Arbeitgeber, Projekte, Ausbildung und Fähigkeiten.",
  s1p2: "Was er daraus häufig nicht erkennen kann:",
  s1l1: "Warum du genau diese Stelle möchtest.",
  s1l2: "Welche deiner Erfahrungen wirklich auf die neue Position übertragbar sind.",
  s1l3: "Wie du fehlende Branchenerfahrung erklären kannst.",
  s1l4: "Welche Verantwortung du tatsächlich übernommen hast.",
  s1l5: "Oder warum du heute einen beruflichen Wechsel suchst.",
  s1p3: "Und genau diese Fragen können darüber entscheiden, ob deine Bewerbung interessant genug für ein erstes Gespräch wirkt.",
  s1p4: "David versucht deshalb nicht nur zu lesen, was in deinem Lebenslauf steht. Er findet heraus, was noch fehlt, um deine Bewerbung richtig zu verstehen.",

  /* ── Abschnitt 2 ────────────────────────────────────────────────────────── */
  s2t: "Kein weiterer CV-Checker.",
  s2p1: "Viele Tools vergleichen deinen Lebenslauf mit einer Stellenanzeige und geben dir anschließend einen Score.",
  score1: "73 % Match.",
  score2: "82 % Match.",
  score3: "Ein paar fehlende Keywords.",
  s2p2: "Das kann hilfreich sein. Aber es beantwortet nicht die entscheidende Frage:",
  s2frage: "Was würde ein Recruiter bei deiner Bewerbung noch wissen wollen?",
  s2p3: "Genau hier beginnt David.",
  s2p4: "David analysiert deinen Lebenslauf und die Stellenanzeige gemeinsam. Und danach spricht er mit dir.",
  s2p5: "Er stellt dir keine vorbereitete Liste mit Standardfragen, sondern entscheidet anhand deiner Bewerbung, welche Informationen noch fehlen.",

  /* ── Abschnitt 3 ────────────────────────────────────────────────────────── */
  s3t: "David liest nicht nur. Er fragt dich.",
  s3p1: "Angenommen, in der Stellenanzeige wird Erfahrung im Stakeholder Management verlangt.",
  s3p2: "Wenn diese Erfahrung bereits in deinem Lebenslauf steht, fragt David nicht:",
  s3schlecht: "„Hast du Erfahrung mit Stakeholder Management?“",
  s3schlechtLabel: "Das wäre sinnlos.",
  s3p3: "Stattdessen könnte er fragen:",
  s3gut1: "„Welche konkrete Situation zeigt am besten, wie du mit unterschiedlichen Interessen oder Widerständen eines Stakeholders umgegangen bist?“",
  s3p4: "Oder dein Lebenslauf zeigt viele Jahre Projekterfahrung, während die neue Position langfristige Produktverantwortung verlangt. Dann könnte David fragen:",
  s3gut2: "„Was reizt dich daran, künftig längerfristig Verantwortung für ein Produkt zu übernehmen?“",
  s3p5: "Und wenn deine Antwort zu allgemein bleibt, kann David nachfragen.",
  s3schluss: "Genau deshalb ist es ein Screening und kein Formular.",

  /* ── Abschnitt 4 ────────────────────────────────────────────────────────── */
  s4t: "Dein Beruf bestimmt die Fragen.",
  s4p1: "David verwendet nicht für jeden Bewerber dieselbe Analyse.",
  s4p2: "Ein Designer wird mit anderen Fragen konfrontiert als eine Führungskraft. Bei einer Vertriebsposition zählen andere Erfahrungen als in der Pflege, im Handwerk oder in der IT. Bei einem Berufseinsteiger sind andere Dinge wichtig als bei einem erfahrenen Manager.",
  s4p3: "David richtet das Screening deshalb nach drei Dingen aus: deiner bisherigen Erfahrung, deinem beruflichen Umfeld und genau der Stelle, auf die du dich bewirbst.",
  s4p4: "Das bedeutet nicht, dass David bereits alles über jeden Beruf weiß. Er lernt die Anforderungen aus deiner Stellenanzeige und verbindet sie mit den Informationen aus deinem Lebenslauf und deinen Antworten.",

  /* ── Abschluss ──────────────────────────────────────────────────────────── */
  schlussT: "Dein Screening beginnt mit deinem Lebenslauf.",
  schlussP: "Lebenslauf hochladen, Stelle einfügen, Fragen beantworten. In etwa fünf Minuten.",
};

export type DavidTexte = typeof DAVID_TEXTE;

/**
 * DIE KACHEL IM THEMEN-KATALOG — DEUTSCHE QUELLE, WIE DIE GANZE SEITE (Owner 28.08.2026,
 * mit Bildschirmfoto der Startseite: „bevor du anfängst, weil ich hier sehe, dass du auf
 * englisch gemacht hast").
 *
 * WARUM SIE NICHT IM KACHEL-BLOCK VON app/themes/page.tsx STEHT: Alle anderen Kacheln sind
 * englisch geschrieben und laufen durch `trObject` (englische Quelle → Zielsprache). Für
 * David ist das die falsche Richtung — sein Text ist deutsch verfasst, das Video spricht
 * deutsch, die Anzeigen laufen deutsch. Über den englischen Umweg stand auf einer deutschen
 * Startseite eine englische Zeile, sobald die Übersetzung nicht durchlief (und sie läuft
 * nicht durch, solange kein OpenAI-Guthaben da ist).
 *
 * SO HERUM IST DER SCHLIMMSTE FALL RICHTIG: Ohne Übersetzung steht Deutsch da — die Sprache
 * der Zielgruppe — statt Englisch.
 */
export const DAVID_KACHEL = {
  zeile: "Finde heraus, was dein Lebenslauf einem Recruiter noch nicht erzählt. David liest ihn zusammen mit deiner Wunschstelle — und fragt dann nach.",
  /* Ohne das Herz — das setzt die Kachel selbst davor. */
  chips: "Kostenlos · Individuell · ca. 5 Minuten",
};

/** Die Kacheltexte in der Sprache des Besuchers — Deutsch ist die Quelle. */
export async function davidKachelInSprache(lang: Lang): Promise<typeof DAVID_KACHEL> {
  return textbausteineInSprache(DAVID_KACHEL, lang);
}

/** Die Landingpage-Texte in der Sprache des Besuchers — Deutsch ist die Quelle. */
export async function davidTexteInSprache(lang: Lang): Promise<DavidTexte> {
  return textbausteineInSprache(DAVID_TEXTE, lang);
}
