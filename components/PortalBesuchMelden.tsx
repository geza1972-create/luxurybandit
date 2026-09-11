"use client";

import { useEffect } from "react";
import { schrittMessen } from "@/lib/versusforge-messen";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";

/**
 * „SEITE GESEHEN" AUF DER STARTSEITE LAKATOSBANDI.COM (Owner 11.09.2026: „ich sehe die Leute klicken
 * schon von der Anzeige, die sehe ich nicht").
 *
 * DIE STARTSEITE ZÄHLTE BISHER GAR NICHTS. Nur die einzelnen Künstlerseiten hatten eine Zählung
 * (über `KuenstlerAgent`), die Startseite — genau dort, wo die Anzeigen „Karussell Stein" und
 * „Înscrieri deschise" hinführen — nie. Derselbe Fehler, den der Owner am 09.09.2026 schon einmal
 * gefunden hat ([[MandantTrichter]], „der sieht nicht, wo die User abbrechen"), nur an der neuen
 * Stelle wiederholt.
 *
 * `EIGENER_MANDANT` ("versusforge"), STUFE „seite": dieselbe Ablage wie der Anmelde-Chat, der auch
 * unter diesem Mandanten zählt — so landen Startseite und Chat in EINEM Trichter, nicht in zwei.
 *
 * EIN EIGENER, WINZIGER CLIENT-BAUSTEIN, statt die Zählung selbst irgendwo in die Server-Seite zu
 * mischen: `app/portal/page.tsx` bleibt eine Server-Komponente, und diese eine Zeile Zustand
 * (`useEffect`) bekommt ihr eigenes „use client" — genau wie `MandantTrichter`.
 */
export default function PortalBesuchMelden() {
  useEffect(() => { schrittMessen(EIGENER_MANDANT, "seite"); }, []);
  return null;
}
