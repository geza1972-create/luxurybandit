"use client";

import { useEffect, useState } from "react";

/**
 * BILD ANTIPPEN = GROSS SEHEN (Owner 27.08.2026: „geht das, wenn man auf die Bilder klickt,
 * dass sie sich vergrössern?") — die Fallstudien-Screenshots stehen im Slider bewusst klein;
 * wer etwas erkennen will, tippt darauf.
 *
 * BEWUSST ÜBER EINEN DELEGIERTEN LISTENER statt über einen Wrapper um jedes Bild: die Seite
 * selbst bleibt eine Server-Komponente aus schlichtem Markup, hier hängt nur das Verhalten
 * dran. Betroffen ist jedes Bild in einem Bilder-Streifen (`.gl-case-shots`, `.gl-mini-shots`,
 * `.gl-lb-shots`) — das Porträt oben ist ausgenommen, da gibt es nichts zu vergrössern.
 */
export default function Lightbox() {
  const [gross, setGross] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    const klick = (e: MouseEvent) => {
      const ziel = e.target as HTMLElement | null;
      if (!ziel || ziel.tagName !== "IMG") return;
      if (!ziel.closest(".gl-case-shots, .gl-mini-shots, .gl-lb-shots")) return;
      const bild = ziel as HTMLImageElement;
      setGross({ src: bild.currentSrc || bild.src, alt: bild.alt });
    };
    document.addEventListener("click", klick);
    return () => document.removeEventListener("click", klick);
  }, []);

  /* Escape schliesst — und solange offen, scrollt die Seite darunter nicht weg. */
  useEffect(() => {
    if (!gross) return;
    const taste = (e: KeyboardEvent) => { if (e.key === "Escape") setGross(null); };
    document.addEventListener("keydown", taste);
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", taste);
      document.body.style.overflow = vorher;
    };
  }, [gross]);

  if (!gross) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={gross.alt}
      onClick={() => setGross(null)}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(12,11,9,0.92)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, cursor: "zoom-out",
      }}
    >
      <img
        src={gross.src}
        alt={gross.alt}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 4 }}
      />
      <button
        type="button"
        aria-label="Schliessen"
        onClick={() => setGross(null)}
        style={{
          position: "fixed", top: 16, right: 20,
          background: "none", border: "none", color: "#F3EEE2",
          fontSize: 34, lineHeight: 1, cursor: "pointer", fontFamily: "inherit",
        }}
      >
        ×
      </button>
    </div>
  );
}
