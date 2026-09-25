import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import type { Lang } from "@/lib/lang";

/**
 * DIE LANDINGPAGE „VERSUSFORGE · MARKETING FOR ART" — deutsche Quelle, eine Stelle.
 *
 * NEU GESCHRIEBEN (Owner 25.09.2026: „VersusForge macht ein neues Portal für Künstler. Hier
 * werden alle Module, die VersusForge entwickelt hat … die aktuelle Landingpage beschreibt nur
 * einen Tunnel. Aber lakatosbandi.com hat alles, es ist eine E-Commerce-Plattform für Kunst …
 * Der Künstler konzentriert sich nur auf die Kreativität und das Portal skaliert seine Arbeit,
 * bietet sie als Poster an, benutzt Verkaufsagenten").
 *
 * Bis heute beschrieb die Seite nur den Weg in den Chat (Plan, Texte, Galerie). Seit das Portal
 * online ist, erzählt sie das Portal: lakatosbandi.com, gebaut aus den VersusForge-Modulen.
 *
 * NUR, WAS GEBAUT IST — die Regel bleibt (Skill `agenten`, Regel 6). Gedeckt im Code:
 *   · Agent / Anfragen       — app/api/kuenstler-agent, agent-anfrage, lib/kuenstler-lead.ts
 *   · Living Poster / Shop   — app/api/druck-kasse, poster-kunst, lib/lakatosbandi-preise-texte.ts
 *   · Film und Stimme        — app/api/portal-film, portal-werk-film, portal-stimme
 *   · Texte (Algorithmus)    — app/api/portal-spruch, kunst-text, lib/versusforge-hook-rezept.ts
 *   · Anzeigen               — lib/versusforge-anzeige*.ts, app/api/kampagne
 *   · Journal / Follower     — lib/lakatosbandi-journal.ts, app/api/portal-folgen, rundbrief
 *   · Rekrutierung           — lib/lakatosbandi-bald-texte.ts (rekrut), app/api/meta-leads
 * Preise wie auf lakatosbandi.com/preise: Seite kostenlos, Premium `{preis}` im Monat.
 *
 * `{preis}` ist der Abo-Preis aus lib/pricing.ts und wird NACH der Übersetzung eingesetzt —
 * der erste Platzhalter in geschweiften Klammern, egal wie der Übersetzer ihn umbenennt
 * ([[uebersetzer-fallen]]). Der Domainname steht fest in der Seite, nicht hier.
 */
export const ART_LANDING_TEXTE = {
  kicker: "VersusForge · Das neue Portal für Künstler",
  h1a: "Du malst.",
  h1y: "Das Portal",
  h1b: "verkauft.",
  sub: "VersusForge hat ein Portal für Künstler gebaut: eine E-Commerce-Plattform für Kunst, in der alle unsere Werkzeuge zusammenarbeiten — Texte, Bilder, Filme, Anzeigen, Verkaufsagenten und ein Shop für Poster. Du konzentrierst dich auf deine Kunst, das Portal skaliert deine Arbeit.",
  /* „Kostenlos starten" stand im Übersetzungsspeicher falsch („Start for free · No form · You talk
     to an agent", gesehen 25.09.2026) — ein neuer Wortlaut umgeht den vergifteten Eintrag. */
  cta: "Als Künstler kostenlos starten",
  portalKnopf: "Zum Portal",
  posterZeile: "Ein Living Poster an der Wand — gedruckt auf lakatosbandi.com",
  posterAlt: "Ein Living Poster im Holzrahmen an einer Wohnzimmerwand",
  trust: "Deine Seite ist kostenlos · Originale 100 % für dich · Keine Provision",

  merkmaleTitel: "Alles in einem Portal",
  m1t: "Deine Seite",
  m1d: "Deine eigene Galerie auf dem Portal, in drei Sprachen, unter deinem Namen.",
  m2t: "Verkaufsagent",
  m2d: "Spricht rund um die Uhr mit Interessenten und meldet dir jeden Käufer mit Name und Telefonnummer.",
  m3t: "Living Poster",
  m3d: "Deine Werke als Poster, auf Bestellung gedruckt — mit QR-Code, der deine Geschichte erzählt.",
  m4t: "Texte mit Methode",
  m4d: "Titel, Sätze und Profiltext aus unserem Marketing-Algorithmus, nicht aus einer Vorlage.",
  m5t: "Film und Stimme",
  m5d: "Erzähl in einer Minute die Geschichte deines Werks — der Film läuft auf deiner Seite und hinter jedem Poster.",
  m6t: "Anzeigen und Reichweite",
  m6d: "Wir bewerben das Portal selbst — dazu Journal-Artikel, Follower und Anzeigen aus deinen Werken.",

  s1t: "Ein Künstler sollte kein Marketingbüro sein",
  s1p1: "Fotografieren, Texte schreiben, posten, Anzeigen schalten, Anfragen beantworten, Versand organisieren — das alles frisst die Zeit, die ins nächste Bild gehören sollte. Und am Ende steht das Werk trotzdem beim falschen Publikum.",
  s1p2: "Deshalb haben wir alles, was VersusForge für das Marketing entwickelt hat, in ein Portal gelegt. Du bringst die Kunst mit. Den Rest macht das Portal.",

  s2t: "So funktioniert es",
  schritt1t: "Zeig uns deine Werke",
  schritt1d: "Sprich mit unserem Agenten und lade mindestens drei Werke im selben Stil hoch. Er sieht sich Medium, Stil, Motiv und das Seltene daran an.",
  schritt2t: "Deine Seite geht online",
  schritt2d: "Wir ordnen deinen Stil ein, besprechen ehrlich deinen Preis und prüfen jeden Künstler selbst — innerhalb von drei Tagen. Dann steht deine Seite auf dem Portal.",
  schritt3t: "Das Portal skaliert deine Arbeit",
  schritt3d: "Texte zu jedem Werk, Filme und deine Stimme, Living Poster im Shop, Anzeigen aus deinen Bildern — aus einem Original werden viele Wege zum Käufer.",
  schritt4t: "Die Agenten verkaufen",
  schritt4d: "Wer ein Original will, spricht mit deinem Agenten; du bekommst die Anfrage mit Name und Telefonnummer. Poster bestellen Käufer direkt im Shop — du bekommst für jedes eine Lizenz.",

  portalT: "Das Portal",
  portalP1: "Alle Module von VersusForge arbeiten jetzt an einem Ort, für Künstler:",
  portalP2: "Eine E-Commerce-Plattform für Kunst mit Originalen und Living Postern, dem Artist Fair Shop, Journal-Artikeln für Google, Followern, die neue Werke per Mail bekommen, und eigenen Anzeigen, mit denen wir Käufer und neue Künstler finden. Hinter allem arbeitet dieselbe Engine: VersusForge.",

  s3t: "Warum wir auswählen",
  s3p1: "Ein Portal ist nur so gut wie die Werke darauf. Deshalb nehmen wir nur auf, wer mindestens drei Arbeiten im selben Stil zeigt — ein einzelnes Bild sagt noch nichts über einen Künstler. Ein Mensch sieht sich jeden Künstler an.",
  s3p2: "Gemalte und gezeichnete Akte sind willkommen. Aktfotografie nehmen wir zurzeit nicht an.",

  s4t: "Was es kostet",
  s4p1: "Deine Seite kostet nichts: bis zu 10 Werke, dein Agent, Anfragen von Käufern. Originale verkaufst du selbst — ohne Provision, 100 % für dich.",
  s4p2: "Premium kostet {preis} im Monat: Texte mit unserem Marketing-Algorithmus, mehr Werke und der Artist Fair Shop, in dem deine Werke als Poster verkauft werden. Monatlich kündbar.",
  s4p3: "Nach einer Kündigung bleibt deine Seite online, mit allen Werken und Texten.",

  faqTitel: "Häufige Fragen",
  f1q: "Was ist das neue Portal von VersusForge?",
  f1a: "lakatosbandi.com — eine E-Commerce-Plattform für Kunst. Sie vereint alle Werkzeuge, die VersusForge für Marketing gebaut hat: Texte, Bilder, Filme, Anzeigen, Verkaufsagenten und einen Shop für Poster.",
  f2q: "Muss ich etwas über Marketing wissen?",
  f2a: "Nein. Der Agent stellt dir Fragen, sieht sich deine Bilder an und baut daraus deine Seite und deine Texte. Du konzentrierst dich auf deine Kunst.",
  f3q: "Verkauft ihr meine Originale?",
  f3a: "Nein. Dein Agent führt das Gespräch und meldet dir den Interessenten. Preis, Übergabe und Versand klärst du direkt mit dem Käufer — wir nehmen davon nichts.",
  f4q: "Was ist ein Living Poster?",
  f4a: "Ein gedrucktes Poster deines Werks, auf Bestellung gefertigt, mit oder ohne Holzrahmen. Wer den QR-Code scannt, hört Musik, deine Stimme und liest die Geschichte des Werks. Für jedes verkaufte Poster bekommst du eine Lizenz.",
  f7q: "Wie finden Käufer mich?",
  f7a: "Wir schalten die Werbung für das Portal selbst, schreiben Journal-Artikel, die bei Google gefunden werden, und Follower bekommen deine neuen Werke per Mail. Die Anzeigen aus deinen Werken kannst du auch selbst schalten.",
  f5q: "In welchen Sprachen?",
  f5a: "Englisch, Rumänisch und Deutsch. Deine Seite erscheint in allen drei.",
  f6q: "Was passiert mit meinen Bildern?",
  f6a: "Sie werden für deine Seite, deine Texte, deine Poster und deine Anzeigen verwendet. Deine Originale bleiben deine. Du kannst alles jederzeit löschen.",

  schlussT: "Bereit, nur noch zu malen?",
  schlussP: "Das Gespräch mit dem Agenten dauert ein paar Minuten. Halte drei Bilder im selben Stil bereit.",
} as const;

/** Die drei Sprachen der Seite, in dieser Reihenfolge (Owner: Englisch, Rumänisch, Deutsch) —
    je Sprache eine eigene Adresse `/themes/versusforge/<sprache>`. */
export const ART_SPRACHEN: Lang[] = ["en", "ro", "de"];

export type ArtLandingTexte ={ -readonly [K in keyof typeof ART_LANDING_TEXTE]: string };

export async function artLandingInSprache(lang: Lang): Promise<ArtLandingTexte> {
  return textbausteineInSprache({ ...ART_LANDING_TEXTE } as ArtLandingTexte, lang);
}
