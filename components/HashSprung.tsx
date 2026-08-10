"use client";

import { useEffect } from "react";

/**
 * DER SPRUNG ZUM ABSATZ (Owner 10.08.2026: „du machst jetzt einen ling zu ageb drauf").
 *
 * Ein Link auf `/terms#geld-zurueck-garantie` landete GEMESSEN ganz oben auf einer sehr
 * langen Rechtsseite — der Absatz stand 2835 Pixel weiter unten. Der Grund: Die Seite wird
 * vom Router frisch aufgebaut, und wenn das Ziel-Element beim ersten Zeichnen noch nicht
 * steht, springt der Browser nicht mehr nach. Für den Kunden heisst das: Er tippt auf
 * „Geld-zurück-Garantie" und muss eine Seite Juristendeutsch durchscrollen, um die zwei
 * Absätze zu finden, die ihm versprochen wurden. Das ist schlimmer als kein Link.
 *
 * Also holt dieser Baustein den Sprung nach dem Aufbau selbst nach. Der obere Abstand kommt
 * aus `scroll-mt-*` an den Überschriften — sonst verschwindet die Zeile unter der klebenden
 * Kopfleiste, und man liest ab dem zweiten Satz.
 */
export default function HashSprung() {
  useEffect(() => {
    const ziel = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!id) return;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    /* Zwei Anläufe: sofort für den fertigen Aufbau, und einmal kurz danach für den Fall,
       dass der Absatz erst mit dem nächsten Zeichnen dasteht. */
    ziel();
    const t = setTimeout(ziel, 250);
    window.addEventListener("hashchange", ziel);
    return () => { clearTimeout(t); window.removeEventListener("hashchange", ziel); };
  }, []);
  return null;
}
