"use client";

import { createContext, useContext } from "react";

/**
 * WAS AUF DEM BLATT AN DER WAND STEHT (Owner 18.09.2026: „auch das Bild muss dann an die Wand
 * gesehen werden").
 *
 * Im Slider hängt dasselbe Blatt viermal: einmal als Folie 0 mit allem Werkzeug, dann in jedem
 * Zimmer und noch einmal klein in jeder Miniatur. Lädt der Kunde sein Foto hoch („You as a
 * picture") oder lässt Kunst daraus machen, ändert sich nur die Folie 0 — an der Wand hing
 * weiter das Werk des Künstlers, und genau da will er sich sehen.
 *
 * Deshalb dieser eine Merker: `PosterDeinBild` trägt ein, was gerade im Blatt steht, und jedes
 * `PosterWandFoto` zeigt es. Ohne Provider (ein Poster ausserhalb des Sliders) bleibt es bei
 * `null`, also beim Werk — die Komponente funktioniert überall.
 */
export const WandBildContext = createContext<{
  bild: string | null;
  setBild: (b: string | null) => void;
}>({ bild: null, setBild: () => {} });

export function PosterWandFoto({ standard, className }: {
  /** Das Werk des Künstlers — solange der Kunde nichts eingesetzt hat. */
  standard: string;
  className?: string;
}) {
  const { bild } = useContext(WandBildContext);
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={bild || standard} alt="" loading="lazy" className={className} />;
}
