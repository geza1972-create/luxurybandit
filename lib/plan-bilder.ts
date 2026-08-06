/**
 * DIE DREI BEISPIELBILDER DES LUXURYBANDIT SYSTEMS — an einer Stelle, für beide Seiten.
 *
 * Owner 04.08.2026: „hier liegen die bilder Luxurybanditplan" — `public/Luxurybanditplan/`:
 * derselbe Mann im Kapuzenpulli vor dem Spiegel, dann im schwarzen Hemd am Wagen, dann im
 * Leinenhemd vor der Villa.
 *
 * WARUM DIESE DATEI ÜBERHAUPT EXISTIERT — die Falle, an der es einmal gescheitert ist:
 *
 * Die Pfade standen zuerst in `components/PlanSlide.tsx`. Das ist ein `"use client"`-Modul,
 * und der Themen-Katalog (`app/themes/page.tsx`) ist eine SERVER-Komponente. Importiert der
 * Server etwas aus einem Client-Modul, bekommt er nicht den Wert, sondern eine
 * Client-Referenz: `PLAN_BILDER.fuenf` war damit `undefined`, `cover` blieb leer — und die
 * Kachel zeigte statt des Bildes das graue Icon-Wasserzeichen. Ohne Fehlermeldung, ohne
 * Warnung, einfach kein Bild.
 *
 * Eine gewöhnliche `lib`-Datei hat keine Seite: Server wie Browser bekommen dieselben
 * Zeichenketten. Wer neue Bilder ergänzt, tut es hier — nicht im Baustein.
 */

export type StufenId = "heute" | "zwei" | "fuenf";

export const PLAN_BILDER: Record<StufenId, string> = {
  heute: "/Luxurybanditplan/Bild1.png",
  zwei: "/Luxurybanditplan/Bild2.png",
  fuenf: "/Luxurybanditplan/Bild3.png",
};

/** Die Reihenfolge der Strecke — heute, in zwei Jahren, in fünf. */
export const PLAN_STUFEN: StufenId[] = ["heute", "zwei", "fuenf"];
