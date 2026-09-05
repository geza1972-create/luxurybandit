"use client";

import { useEffect } from "react";

/**
 * DIESE SEITE BEGINNT IMMER OBEN (Owner 02.09.2026: „wieso, wenn ich die Seite öffne, fängt
 * nicht oben an — yourvideogenerator.com/academy").
 *
 * DER BROWSER IST ES, NICHT DIE SEITE. Jeder moderne Browser merkt sich, wie weit man auf
 * einer Adresse gescrollt hatte, und stellt das beim nächsten Aufruf wieder her — gedacht
 * für den, der weiterlesen will. Für eine Anzeigen-Landingpage ist es das Gegenteil des
 * Gewünschten: Wer den Link zum zweiten Mal antippt, aus einer Nachricht oder von einem
 * QR-Code, landet mitten im Text statt am Anfang. Und im Termin, wo dieselbe Seite mehrfach
 * geöffnet wird, springt sie jedes Mal woandershin.
 *
 * `history.scrollRestoration = "manual"` nimmt dem Browser die Entscheidung ab; das
 * `scrollTo` danach fängt den Fall, dass er sie schon getroffen hatte, bevor dieser Code
 * lief. Beides zusammen, weil keines allein zuverlässig ist.
 *
 * NUR AUF SEITEN, DIE EIN EINGANG SIND. Auf einer Galerie oder einem langen Text wäre es
 * ärgerlich — dort will man genau dort weitermachen, wo man aufgehört hat.
 */
export default function ImmerOben() {
  useEffect(() => {
    try {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    } catch { /* alte Browser: dann bleibt es beim `scrollTo` darunter */ }
    /* Ohne `behavior: "instant"` sähe man den Sprung — und bei einer Seite, die gerade erst
       erscheint, wirkt eine Bewegung wie ein Fehler. */
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, []);
  return null;
}
