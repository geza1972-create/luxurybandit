import type { ReactNode } from "react";

/**
 * DIE CURATOR-PROFILE GEHÖREN NICHT MEHR IN DEN INDEX (Owner 11.08.2026: „aufräumen", nachdem
 * die Search Console 199 abgelehnte Adressen bei 6 indexierten zeigte).
 *
 * ZWEI GRÜNDE, und der zweite wiegt schwerer als der erste:
 *
 *   1. Es sind rund 47 Profile aus der Seeding-Pipeline — kurze Texte, gleiche Gestalt,
 *      erzeugte Kennungen in der Adresse. Genau das Muster, das Google als wertlos einstuft
 *      und mit dem es die ganze Domain schlechter bewertet.
 *   2. WIR NEHMEN KEINE MODELLE MEHR AUF (Owner 11.08.2026: „wir nehmen keine Modelle mehr
 *      auf"). Ein Profil, hinter dem kein laufendes Geschäft steht, soll auch keine Besucher
 *      aus der Suche mehr anziehen — die kämen auf einer Seite an, die ihnen nichts anbietet.
 *
 * `index: false, follow: true` — nicht aufnehmen, den Verweisen aber folgen.
 *
 * ERREICHBAR BLEIBEN SIE: Wer den Link hat, sieht das Profil wie bisher; auch die
 * Anmeldung und die Werkzeuge dahinter sind unberührt. Nur die Sitemap meldet sie nicht mehr
 * (app/sitemap.ts).
 *
 * EIGENES LAYOUT, weil die Seite `"use client"` ist — ein Client-Baustein kann kein
 * `metadata` ausliefern. Ohne `title` erbt sie weiter den Haustitel.
 */
export const metadata = {
  robots: { index: false, follow: true },
};

export default function CuratorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
