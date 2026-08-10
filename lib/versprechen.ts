/**
 * DAS VERSPRECHEN — das Thema, das aus dem „LuxuryBandit System" wurde (Owner 10.08.2026).
 *
 * > „Das Luxury system machen wir anders. Da ändern wir das konzept brutal. Wir verkaufen
 * > keine Systeme. Wir generieren genauso wie die anderen. Sende ein Verprechen an dich und
 * > an deine Freunde. Du lädst ein Video von dir hoch und sagst ich werde es in den nächsten
 * > Jaren schaffen. … Am Ende muss ein Video raus kommen wo du mit Pirsche und Villa
 * > dargestellt bist und sagst. Ich werde es schaffen und werde hard dafür arbeiten."
 *
 * WAS SICH DAMIT ÄNDERT: Verkauft wird kein Bericht und keine Analyse mehr, sondern dasselbe
 * wie überall im Haus — ein Video mit seinem Gesicht und seiner Stimme. Der Trichter ist der
 * des Geburtstags, Zeile für Zeile: Aufnahme statt Foto-Upload (das Video liefert Standbild
 * UND Stimme), ein Look, ein Preis, ein fertiges Video zum Verschicken.
 *
 * DER UNTERSCHIED ZUM GEBURTSTAG steht in genau zwei Dingen — dem LOOK (Porsche und Villa
 * statt Torte und Kerzen) und dem SATZ, den er selbst spricht. Beides liegt in dieser Datei
 * und in `lib/versprechen-looks.ts`; alles andere erbt der Trichter.
 *
 * WARUM ES TRÄGT: Ein Versprechen an sich selbst ist der einzige Gruss, den man an sich
 * SELBST schickt und trotzdem herumzeigt. Er hat einen Anlass (Jahreswechsel, Geburtstag,
 * Kündigung, Studienbeginn), einen Empfänger (die Freunde, die es bezeugen sollen) und ein
 * Ablaufdatum — dieselben drei Dinge, die den Kuss und den Geburtstag verkaufen.
 */

/**
 * DER SATZ, DEN ER SPRICHT — er kommt aus SEINER Aufnahme, nicht von uns.
 *
 * Das hier ist nur der Vorschlag auf dem Bildschirm, während die Kamera läuft. Ein fertiges
 * Skript wäre falsch: Das Versprechen gehört ihm, und die Stimme im Video ist seine eigene
 * (dieselbe Kette wie beim Geburtstag — Standbild und Tonspur aus der Aufnahme).
 */
export const VERSPRECHEN_SATZ_DE =
  "Ich weiss noch nicht genau, wie ich dahin komme. Aber ich werde dafür arbeiten. Ich hole mir dieses Leben.";
/**
 * FASSUNG A aus KONZEPT-VERSPRECHEN.md (Owner 10.08.2026: „A. mit ergänzung").
 *
 * DER WORTLAUT DES OWNERS vom Abend des 10.08.2026 („hier ist der text fürs Video"):
 *
 *   „I don't know exactly how I'll get there yet. But I'm going to work for it.
 *    I'm going to bandit this life."
 *
 * DREI SÄTZE, DREI BEWEGUNGEN — und die Reihenfolge ist der ganze Trick: erst das
 * EINGESTÄNDNIS („ich weiss noch nicht wie"), dann der EINSATZ, dann der Griff. Ein
 * Versprechen, das mit dem Eingeständnis beginnt, kann jeder abgeben; eines, das mit dem
 * Ziel beginnt, nur der, der schon einen Plan hat. Genau deshalb darf hier jemand kaufen,
 * der noch nichts vorzuweisen hat — und das sind die meisten.
 *
 * „I'm going to bandit this life" ist der Markensatz (Owner: „You will bandit this life?").
 * „to bandit" gibt es im Englischen nicht als Verb — deshalb gehört es uns, wie „google it".
 *
 * OHNE DIE EINLADUNG: „Make this video too …" gehört ins BEISPIELVIDEO der Landingpage
 * (`scripts/versprechen-beispiel.mjs`), nicht in das Video eines Kunden. Niemand verspricht
 * seinen Freunden etwas und macht danach Werbung.
 */
export const VERSPRECHEN_SATZ_EN =
  "I don't know exactly how I'll get there yet. But I'm going to work for it. I'm going to bandit this life.";

/**
 * DIE VORLAGE — das zweite Referenzbild (wie `GEBURTSTAG_SET`).
 *
 * SEIT 10.08.2026 DAS BILD DES OWNERS (er zeigte darauf: „Mach doch ein Video aus dem Bild
 * Mann mit Porsche"): ein Mann vor der Villa, der dunkle Wagen hinter ihm, Abendlicht am
 * Meer. Es lag als `Bild1..3.png` im Ordner des gelöschten System-Themas; hierher kopiert,
 * damit es nicht mit dem alten Thema verschwindet.
 *
 * Es tut zwei Dinge auf einmal — es ist die Kachel des Looks UND die Stil-Vorlage
 * (`stilBild`): Das Bildmodell sieht die Bildwelt, statt sie aus Worten raten zu müssen.
 * Genau daran ist der Geburtstags-Look „Dream World" gewachsen (Owner 09.08.: der Grund,
 * warum sein ChatGPT-Ergebnis besser war als unseres — es sah die Handschrift).
 */
export const VERSPRECHEN_SET = "/Versprechen/look-villa.png";

/**
 * DAS BEISPIELVIDEO auf der Landingpage — dasselbe, das später in der Karte läuft
 * (Dauerregel `landingpage-video-ist-kachel-video`: EIN Video aus EINER Konstante).
 *
 * ERZEUGT AM 10.08.2026 aus genau diesem Bild — dieselbe Kette wie das Produkt (HeyGen
 * `avatar_iv`), nur ohne den Bild-Schritt: Das Foto IST schon der Look. Der Mann sagt den
 * englischen Satz („I am going to make it. And I will work hard for it."), ruhig und ohne
 * hinzuerfundenes Lächeln. Skript: `scripts/versprechen-beispiel.mjs` — einmal gelaufen,
 * die Datei liegt im Repo, es wird nie wieder erzeugt.
 */
export const VERSPRECHEN_VIDEO = "/Versprechen/promise-example.mp4";

/**
 * DAS STANDBILD ZUM BEISPIELVIDEO — dieselbe Datei für die Katalog-Kachel und für die Karte
 * auf der Landingpage (Owner 10.08.2026: „hier fehlt auch", zur Kachel ohne Bild).
 *
 * Es liegt neben dem Video und heisst wie es: Damit greift auch die Hausregel „aus .mp4 wird
 * .jpg", ohne die eine Karte ohne Poster eine dunkle Fläche zeigt.
 */
export const VERSPRECHEN_POSTER = "/Versprechen/promise-example.jpg";
