"use client";

/**
 * DIE GESCHENKE — eine Tabelle, kein Trichter.
 *
 * Owner 03.08.2026: „wir haben die Richtung des Portals geändert als Geschenke-Marktplatz …
 * dafür müssten wir alle Topics so anpassen und über denselben Trichter schicken."
 *
 * WARUM DIESE DATEI EXISTIERT: Der gemeinsame Trichter war nie das Problem — es gab ihn schon,
 * als Varianten-Tabelle mitten in `components/KissFunnel.tsx` (3.900 Zeilen). Was fehlte, war
 * die Trennung: Solange die Tabelle IM Trichter steht, ist „ein neues Geschenk anlegen" eine
 * Aenderung an einer riesigen Komponente statt ein Eintrag in einer Liste. Ab hier liest der
 * Trichter nur noch, und jedes weitere Geschenk kostet ein paar Zeilen hier.
 *
 * WAS HIER HINEINGEHOERT: alles, was ein Geschenk von einem anderen unterscheidet und KEINE
 * Sprache hat — Prompt, Dateiname des Downloads, Platzhalterbilder, die Schalter. Alle
 * Beschriftungen stehen weiterhin in `lib/kiss-i18n.ts`, alle Preise in `lib/pricing.ts`
 * (Owner 29.07.2026: „das machst du ab jetzt so, dass überall das geändert wird aus der
 * Preistabelle").
 *
 * `"use client"` steht oben, weil `musikFuer` und die Platzhalter im Browser gebraucht werden —
 * die Tabelle wird ausschliesslich von Client-Komponenten gelesen.
 */

import { musikFuer } from "@/lib/musik";
import { WEDDING_PROMPT } from "@/lib/wedding-prompt";


// Platzhalter im Upload-Feld: ein MÄNNERGESICHT (Peter), abgedunkelt hinterlegt. Ohne das
// laden Nutzer erfahrungsgemäß noch ein Model hoch statt sich selbst. Als statische Datei
// im Repo, damit die URL nie abläuft (signierte Storage-Links tun das).
export const PLACEHOLDER_MAN = "/kiss-placeholder.jpg";

// DER PROMPT KOMMT VOM OWNER, wörtlich (30.07.2026). Vorher stand hier meine eigene
// Fassung mit @person/@Bild2 — die hatte er nie freigegeben.
//
// BINDUNG (Route /api/generate-tryon-video, pixverseStartReference):
//   @1 → das Foto der Frau (im Trichter `person`)
//   @2 → sein hochgeladenes Foto (im Trichter `garment`)
// Beide Token treffen die Muster der Route, es wird also nichts umgeschrieben.
//
// NICHTS DARAN ÄNDERN, ohne ihn zu fragen — auch keine „Verbesserung" der Wortwahl.
export const KISS_PROMPT =
  "@1 and @2 stand close together in a warm, softly lit evening setting with gentle glowing lights behind them. They look at each other and smile, lean in slowly, and share a brief, tender kiss. Then they step back a little and smile at each other, happy. Keep @1 and @2 faces and appearance exactly the same throughout. Fixed camera, no zoom, no camera movement. Fluid natural motion, photorealistic, high-end look. No text or logos.";

export const IDOL_PROMPT =
  "@person and @Bild2 are together at an elegant evening party, warm golden lights and a festive atmosphere around them. They stand side by side, smiling and laughing, raising their glasses and enjoying the moment together. Keep @person and @Bild2 faces and appearance exactly the same throughout. Fixed camera, no zoom, no camera movement. Fluid natural motion, photorealistic, high-end look. No text or logos.";

/** Welche Geschenke es gibt. Frueher `FunnelVariant` — der Name sagte, wie es gebaut ist,
 *  nicht was es ist. */
export type GeschenkId = "kiss" | "idol" | "wedding";

export const GESCHENKE: Record<GeschenkId, {
  prompt: string; done: string; upFirst: boolean; upPlaceholder?: string;
  /** Kein Gratis-Bild — erst bezahlen (Hochzeit, Owner 01.08.2026; Kuss, Owner 02.08.2026). */
  keinGratis?: boolean;
  /**
   * NUR NOCH GUTHABEN, KEIN EINZEL-STRIPE (Kuss, Owner 02.08.2026: „nicht so wie bei
   * Hochzeit. Die werden die kaufen Credits für 9,99 gleich").
   *
   * Bei der Hochzeit bleibt `unlock("once")` der Weg — ohne Guthaben oeffnet er die
   * 1,49-€-Kasse fuer EIN Video. Beim Kuss ist das nicht mehr gewollt: Ohne Guthaben geht es
   * direkt zur 9,99-€-Aufladung, nie zur Einzel-Kasse. `unlock("once")` bleibt der Weg, WENN
   * das Guthaben reicht (dann bucht der Server lautlos ab, ohne Kassenfenster).
   */
  nurGuthaben?: boolean;
  // MUSIK ZUM BILD (Owner 30.07.2026: „ich habe dir den Song angelegt Bridal-chorus.mp3").
  // Ein Bild ist still — die Stimmung muss von der Seite kommen. Nur dort gesetzt, wo es
  // wirklich passt; beim Kuss und beim Idol bliebe Musik Deko.
  musik?: string;
  /**
   * BEIDE FOTOS AUF EINEM BILDSCHIRM, KEIN KARUSSELL (Owner 31.07.2026: „hier stehen mehrere
   * Models. Die Leute werden nur sich brauchen" und „ich haette gerne die zwei bilder zum
   * hochladen nebeneinander").
   *
   * Beim Kuss ist die Auswahl der Frau das Produkt — da gehoert das Karussell hin. Bei der
   * Hochzeit gibt es nichts auszusuchen: Es sind IHRE zwei Gesichter. Ein Karussell fremder
   * Frauen ist dort nicht Auswahl, sondern Irritation, und es kostet einen ganzen Schritt.
   */
  paarUpload?: boolean;
  /**
   * Fragt dieses Thema nach dem NAMEN des Empfaengers? Nur beim Kuss: Er ist seit dem
   * 03.08.2026 eine Grusskarte an EINEN bestimmten Menschen, und der Name macht aus den
   * aufsteigenden Zeilen seine Botschaft („Anna, ich liebe dich") statt irgendeiner.
   * Die Hochzeit fragt ihre Namen laengst selbst ab (Brautpaar) — dort waere es ein drittes.
   */
  empfaengerName?: boolean;
  /**
   * NUR DAS EIGENE FOTO, KEIN KATALOG (Owner 31.07.2026: „du machst nur upload your photo,
   * nicht unsere Models").
   *
   * Das kehrt seine eigene Ueberlegung von zwei Minuten vorher um — und zwar richtig: „jeder
   * hat ein Model auf dem Handy". Wer ohnehin ein Foto der Frau hat, um die es ihm geht, dem
   * ist eine Reihe fremder Frauen kein Angebot, sondern ein Schritt im Weg. Und wer keines
   * hat, ist nicht der Kunde dieses Trichters.
   *
   * Das Karussell bleibt im Code: Andere Themen leben davon, und die Frauen sind gepflegt.
   * Hier faellt nur die Auswahl weg — uebrig bleibt die eine Karte, die zaehlt.
   */
  nurEigenes?: boolean;
  /**
   * ABO — pro Thema entschieden.
   *
   * Bei der Hochzeit war es zwischendurch AUS: Der Kuss-Trichter hatte „Die heisseste
   * KI-Erfahrung freischalten — 24,50 €/Monat" mitgebracht, und dieser Satz beschaedigt den
   * Anlass. Owner 31.07.2026, spaeter am Tag, mit einem anderen Argument: „bei Wedding
   * machen wir auch ein Abo, bis sie heiraten von mir aus. Auch 24,50, weil wir die Liste
   * hosten muessen."
   *
   * Das dreht die Sache um, und zwar zu Recht: Verkauft wird nicht mehr ein Video, sondern
   * eine Seite, die MONATE laeuft — Einladung erreichbar halten, Oeffnungen zaehlen,
   * Gaesteliste fuehren, bis die Hochzeit vorbei ist. Laufende Leistung, laufender Preis; sie
   * kuendigt nach der Hochzeit. Falsch war nie das Abo, falsch war der Kuss-Werbespruch.
   */
  abo: boolean;
  /**
   * EINZELKAUF — bei der Hochzeit ABSICHTLICH NICHT (Owner 31.07.2026: „es gibt kein Video
   * hier fuer 9,99. Es gibt nur die ganze Einladung.").
   *
   * Ein Video fuer 9,99 neben einer Einladung fuer 24,50 im Monat ist kein zweites Angebot,
   * sondern eine Ausrede: Der billigere Knopf gewinnt, und die Kundin geht mit einer Datei
   * nach Hause statt mit der Seite, die ihre Hochzeit traegt. Verkauft wird hier das Ganze
   * oder gar nichts.
   */
  einzelkauf: boolean;
}> = {
  kiss: {
    nurEigenes: true,
    // Ton auch beim BILD (OFFEN.md 0: „die eigene Tonspur aus lib/musik.ts einhaengen, wie
    // bei der Hochzeit"). Ohne Musik ist das fertige Bild eine Postkarte statt eines Moments.
    musik: musikFuer("kiss"),
    /**
     * KEIN ABO BEIM KUSS (Owner 03.08.2026: „wir haben so was gar nicht mehr, 2,99 im
     * Abokauf. Wir haben nur Credits. Schaffe Abo für Kissing ab").
     *
     * Der Kuss verkauft EIN Erlebnis, kein Monatsverhaeltnis: Wer sein Video hat, ist
     * fertig — das Abo daneben war eine zweite, teurere Tuer, die von der einfachen
     * Aufladung ablenkt. Damit fallen auch die Abo-Folgen weg: kein „X von 20 Videos",
     * kein {extra}-Nachkauf, keine Verlaengerungs-Zusage. Hochzeit und Idol behalten es.
     */
    prompt: KISS_PROMPT, done: "kiss-video.mp4", abo: false, einzelkauf: true,
    keinGratis: true, nurGuthaben: true,
    empfaengerName: true,
    // „Your model" steht seit 29.07.2026 VORN und ist vorgewählt (Owner). Derselbe Gedanke
    // wie bei „Your Idol": Wer hierher kommt, hat meist schon jemanden im Kopf — unsere
    // Models sind die Alternative daneben, nicht der Anfang. Auf diese Seite laufen die
    // Anzeigen, also entscheidet die erste Karte über den ganzen Trichter.
    upFirst: true,
    // PLATZHALTER: eine FRAU (Owner 30.07.2026: „du musst als Platzhalter bei Image upload
    // eine Frau machen"). Die Karte stand leer und man sah nicht, was dort hingehört —
    // beim Foto von IHM gab es den Hinweis längst.
    upPlaceholder: "/kiss-woman-placeholder.jpg",
  },
  wedding: {
    /**
     * BEZAHLT VON ANFANG AN (Owner 01.08.2026: „Es kostet von Anfang an 1,49 pro Video …
     * Sie werden nichts testen dürfen kostenlos"). `einzelkauf` schaltet den 1,49-Kauf und
     * damit auch den Aufladen-Knopf frei; `keinGratis` unten macht daraus die Regel.
     *
     * Warum bei der Hochzeit anders als beim Kuss: Der Kuss verkauft eine Neugier — ohne
     * Gratis-Bild glaubt niemand, dass es mit seinem Gesicht klappt. Die Braut kommt mit
     * einer Absicht und einem Datum; sie braucht keinen Beweis, sondern ein Ergebnis. Was
     * sie bekommt, zeigt die Beispiel-Einladung, die man teilen kann.
     */
    prompt: WEDDING_PROMPT, done: "hochzeitseinladung.mp4", abo: true, einzelkauf: true,
    keinGratis: true,
    // Aus lib/musik.ts, nicht mehr von Hand: Dort steht je Thema EIN Stueck, und der Owner
    // hat den Hochzeitsmarsch ausdruecklich abgewaehlt („nimm was anderes als Lied") — hier
    // stand er noch. Zwei Stellen fuer dieselbe Entscheidung laufen auseinander; jetzt eine.
    musik: musikFuer("wedding"),
    paarUpload: true,
    // SIE bedient diesen Trichter: Schritt 1 ist SIE selbst (die Braut), Schritt 2 ER. Die
    // Upload-Karte steht deshalb vorn und ist vorgewählt — unsere Bräute sind die Ausweiche
    // für die, die kein Foto zur Hand hat.
    upFirst: true,
    upPlaceholder: "/kiss-woman-placeholder.jpg",
  },
  idol: {
    prompt: IDOL_PROMPT, done: "your-idol-video.mp4", abo: true, einzelkauf: true,
    // Bei „Your Idol" ist das EIGENE Idol der Sinn der Sache — deshalb steht die Upload-Karte
    // vorn und ist von Anfang an gewählt; unsere Models sind nur die Alternative daneben.
    upFirst: true,
    // Platzhalter-Gesicht auf der Upload-Karte (Aria, abgedunkelt): zeigt auf einen Blick,
    // dass hier ein FOTO hineingehört — genau wie Peter beim eigenen Foto.
    upPlaceholder: "/idol-placeholder.jpg",
  },
};
