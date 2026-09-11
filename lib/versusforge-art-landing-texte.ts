import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import type { Lang } from "@/lib/lang";

/**
 * DIE LANDINGPAGE „MARKETING FOR ART" — deutsche Quelle, eine Stelle (Owner 10.09.2026:
 * „normalerweise haben wir eine Landingpage dazu, die für SEO gemacht ist").
 *
 * WARUM ES SIE GIBT: `/engine` führt seit dem 10.09. direkt in den Chat — richtig für die
 * Anzeige, aber Google findet in einem Chat nichts. Diese Seite ist das, was gefunden wird;
 * der Knopf führt in denselben Chat.
 *
 * NUR, WAS GEBAUT IST. Jeder Satz hier ist im Code gedeckt (lib/versusforge-kunst-rezept.ts,
 * lib/versusforge-abo.ts, lib/versusforge-moderation.ts). Das Portal lakatosbandi.com steht
 * NICHT drin — es ist noch nicht online, und ein Versprechen, das der Künstler widerlegt
 * sieht, kostet mehr als es bringt (Skill `agenten`, Regel 6).
 *
 * `{preis}` ist der Abo-Preis aus lib/pricing.ts und wird NACH der Übersetzung eingesetzt —
 * der erste Platzhalter in geschweiften Klammern, egal wie der Übersetzer ihn umbenennt
 * ([[uebersetzer-fallen]]).
 */
export const ART_LANDING_TEXTE = {
  kicker: "VersusForge · Marketing for Art",
  h1a: "Finde die Käufer, die",
  h1y: "deine Kunst",
  h1b: "schätzen.",
  sub: "Für Malerinnen, Maler und bildende Künstler: dein Marketingplan, Anzeigentexte zu jedem Werk und deine eigene Galerie mit einem KI-Agenten, der mit deinen Interessenten spricht.",
  cta: "Kostenlos starten",
  trust: "Kostenlos starten · Kein Formular · Du sprichst mit einem Agenten",

  merkmaleTitel: "Was du bekommst",
  m1t: "Deine Kategorie",
  m1d: "Wo dein Stil wirklich hingehört — damit dich die richtigen Leute finden.",
  m2t: "Dein Preis, ehrlich",
  m2d: "Eingeordnet nach dem, was vergleichbare Künstler verlangen.",
  m3t: "Texte zu jedem Werk",
  m3d: "Sätze, die Menschen beim Scrollen anhalten — für Instagram und Facebook.",
  m4t: "Galerie mit Agent",
  m4d: "Er spricht mit Interessenten und gibt dir Name und Telefonnummer weiter.",

  s1t: "Gute Kunst verkauft sich nicht von allein",
  s1p1: "Die meisten Künstler posten ihre Werke und warten. Das Problem ist selten die Kunst — es ist, dass sie in der falschen Kategorie steht, beim falschen Publikum, mit einem Text, der nichts erzählt.",
  s1p2: "Die wichtigste Regel im Kunstmarketing: Finde den Käufer, der schätzt, was du machst. Nicht irgendeinen.",

  s2t: "So funktioniert es",
  schritt1t: "Zeig uns deine Werke",
  schritt1d: "Lade mindestens drei Bilder im selben Stil hoch. Der Agent sieht sie sich an: Medium, Stil, Motiv, was selten ist.",
  schritt2t: "Kategorie und Preis",
  schritt2d: "Er ordnet deinen Stil ein und bespricht mit dir deinen Preis — ehrlich, auch wenn es unbequem ist.",
  schritt3t: "Texte und Galerie",
  schritt3d: "Du bekommst Anzeigentexte zu deinen Werken und deine eigene Galerie. Nach einer Prüfung durch uns — innerhalb von drei Tagen — geht sie online.",
  schritt4t: "Der Agent arbeitet für dich",
  schritt4d: "Interessenten sprechen mit deinem Agenten. Er sammelt Name und Telefonnummer, und du rufst an. Verkauft wird zwischen dir und dem Käufer — nicht bei uns.",

  /* DAS PORTAL (Owner 10.09.2026: „wo werden die Künstler promotet, auf welchem Portal: das ist
     lakatosbandi.com — das kommt auf die Landingpage"). Es ist noch nicht online, deshalb steht
     es ehrlich dabei (Owner: „ja" zu „wird gerade aufgebaut"). Der Domainname steht fest in
     der Seite, nicht hier — ein Übersetzer soll ihn nicht anfassen. */
  portalT: "Wo wir dich bekannt machen",
  portalP1: "Deine Werke erscheinen auf unserer Marketing-Plattform für Künstler:",
  portalP2: "Dort werben wir für alle Künstler gemeinsam, und jedes Werk führt Interessenten direkt zu deinem Agenten. Die Plattform wird gerade aufgebaut.",

  s3t: "Warum wir Künstler auch ablehnen",
  s3p1: "Eine Galerie ist nur so gut wie die Werke darin. Deshalb nehmen wir nur auf, wer mindestens drei Arbeiten im selben Stil zeigt — ein einzelnes Bild sagt noch nichts über einen Künstler.",
  s3p2: "Gemalte und gezeichnete Akte sind willkommen. Aktfotografie nehmen wir zurzeit nicht an.",

  s4t: "Was es kostet",
  s4p1: "Der Start kostet nichts: Marketingplan, Texte, Galerie und Agent.",
  s4p2: "Wenn sich drei Interessenten bei dir gemeldet haben, fragen wir dich, ob du deinen Agenten für {preis} im Monat behalten willst. Monatlich kündbar.",
  s4p3: "Sagst du nein, arbeitet der Agent weiter — neue Anfragen siehst du nach 14 Tagen aber erst wieder mit dem Abo.",

  faqTitel: "Häufige Fragen",
  f1q: "Für wen ist VersusForge Marketing for Art?",
  f1a: "Für Malerinnen, Maler und bildende Künstler, die ihre Werke verkaufen wollen und nicht wissen, wie sie die richtigen Käufer erreichen — egal ob unbekannt oder schon bekannt.",
  f2q: "Muss ich etwas über Marketing wissen?",
  f2a: "Nein. Der Agent stellt dir Fragen, sieht sich deine Bilder an und baut daraus deinen Plan und deine Texte.",
  f3q: "Verkauft ihr meine Bilder?",
  f3a: "Nein. Wir bringen dir Interessenten mit Namen und Telefonnummer. Den Preis und den Verkauf klärst du selbst mit dem Käufer.",
  f4q: "Wie viele Bilder brauche ich?",
  f4a: "Mindestens drei im selben Stil. Mehr Werke kannst du später in deinem Dashboard hinzufügen.",
  f5q: "In welchen Sprachen?",
  f5a: "Englisch, Rumänisch und Deutsch. Der Agent spricht mit dir in deiner Sprache.",
  f7q: "Wo werden meine Werke gezeigt?",
  f7a: "In deiner eigenen Galerie und auf lakatosbandi.com, unserer Plattform für Künstler, die gerade aufgebaut wird.",
  f6q: "Was passiert mit meinen Bildern?",
  f6a: "Sie werden für deine Analyse, deine Texte und deine Galerie verwendet. Du kannst alles jederzeit löschen.",

  schlussT: "Bereit, deine Kunst zu zeigen?",
  schlussP: "Das Gespräch dauert ein paar Minuten. Halte drei Bilder im selben Stil bereit.",
} as const;

/** Die drei Sprachen der Seite, in dieser Reihenfolge (Owner: Englisch, Rumänisch, Deutsch) —
    je Sprache eine eigene Adresse `/themes/versusforge/<sprache>`. */
export const ART_SPRACHEN: Lang[] = ["en", "ro", "de"];

export type ArtLandingTexte ={ -readonly [K in keyof typeof ART_LANDING_TEXTE]: string };

export async function artLandingInSprache(lang: Lang): Promise<ArtLandingTexte> {
  return textbausteineInSprache({ ...ART_LANDING_TEXTE } as ArtLandingTexte, lang);
}
