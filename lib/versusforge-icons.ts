/**
 * ICONS ALS PFADE (Owner 08.09.2026: „Icons fehlen, fette grosse Icons").
 *
 * pdf-lib kann SVG-Pfade zeichnen — also kommen die Symbole aus derselben Quelle wie im
 * Netz (lucide, 24×24-Raster, runde Enden). Kein Emoji: Ein Emoji ist eine Schrift, sieht
 * auf jedem Gerät anders aus und wird im Druck oft zum leeren Kasten. Hausregel: Icons als
 * `lucide-react`, nie Emoji.
 *
 * NUR DER PFAD, KEINE FÜLLUNG: Strichstärke und Farbe setzt die Seite. So trägt dasselbe
 * Symbol auf Weiss eine schwarze und auf einer schwarzen Fläche eine goldene Linie.
 *
 * ACHTUNG BEIM ZEICHNEN: In einem PDF wächst y nach OBEN, in SVG nach unten. Wer diese
 * Pfade benutzt, muss die y-Achse spiegeln — `symbol()` in versusforge-pdf.ts erledigt das
 * einmal für alle.
 */
export const ICON: Record<string, string> = {
  /* Zielscheibe — der Hook */
  ziel: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  /* Personen — die Zielgruppe */
  leute: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  /* Bild — die Motive */
  bild: "M3 3h18v18H3z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3 M21 15l-5-5L5 21",
  /* Sprechblase — die Anzeigentexte */
  text: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  /* Werkzeug — die Bauanleitung */
  werkzeug: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  /* Trichter — die Strecke */
  trichter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  /* Münze — das Budget */
  geld: "M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  /* Warndreieck — was dagegen spricht */
  warnung: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  /* Liste — das Protokoll */
  liste: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  /* Telefon — der Kontakt */
  telefon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
  /* Uhr — der Aufwand */
  uhr: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  /* Haken — erledigt */
  haken: "M20 6 9 17l-5-5",
};
