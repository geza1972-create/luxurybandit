/**
 * DAS EINE HOCHZEITSVIDEO — Landingpage, Katalog-Kachel UND Muster-Einladung lesen es hier.
 *
 * Dauerregel seit 07.08.2026 (Memory `landingpage-video-ist-kachel-video`): EIN Video aus
 * EINER Konstante. Der Pfad stand am 11.08. an drei Stellen als Zeichenkette im Code — auf
 * der Themenseite, in der Katalog-Kachel und (dritter Weg, schlimmster Fall) GAR NICHT in der
 * Muster-Einladung: die holte sich das erste Beispiel aus der Ablage in Supabase und zeigte
 * deshalb noch das alte, fotorealistische Video, während die Landingpage längst das Gemälde
 * der Traumwelt-Kette zeigte. Zwei Videos für dasselbe Produkt auf zwei Seiten, die
 * aufeinander verlinken — genau das, was die Regel verhindern soll.
 *
 * Wer das Video austauscht, legt die neue Datei in `public/Wedding/` und ändert HIER eine
 * Zeile. Sonst nichts.
 */

/** Das abgenommene Beispielvideo. Liegt im Repo, reist mit dem Code. */
export const HOCHZEIT_VIDEO = "/Wedding/hochzeit-beispiel.mp4";

/**
 * Sein Standbild — das erste Bild des Videos, nicht die Katalog-Kachel.
 *
 * Ohne Poster zeigt der Spieler eine schwarze Fläche, bis die ersten Bytes da sind
 * (Memory `video-playback-behavior`: „nie ein schwarzer Bildschirm").
 */
export const HOCHZEIT_VIDEO_POSTER = "/Wedding/hochzeit-beispiel.jpg";
