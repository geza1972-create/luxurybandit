"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * EIN BILD PER KLICK GANZ GROSS (Owner 25.09.2026: „das Profilbild soll sich per Klick voll
 * vergrössern").
 *
 * DASSELBE MUSTER WIE `PosterGross` / `app/cv/geza-lakatos/Lightbox.tsx`: eine dunkle Lage über
 * der ganzen Seite, das Bild ganz drin, ohne Zuschnitt — hier aber ohne Druckknopf und ohne
 * Rahmenwahl, denn ein Profilfoto ist kein Poster.
 */
export default function BildVollbild({ src, alt, className }: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [auf, setAuf] = useState(false);

  /* Solange das Bild gross liegt, scrollt die Seite darunter nicht mit, und Esc schliesst
     (dieselben zwei Zeilen wie in PosterGross). */
  useEffect(() => {
    if (!auf) return;
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const taste = (e: KeyboardEvent) => { if (e.key === "Escape") setAuf(false); };
    document.addEventListener("keydown", taste);
    return () => { document.removeEventListener("keydown", taste); document.body.style.overflow = vorher; };
  }, [auf]);

  return (
    <>
      <button type="button" onClick={() => setAuf(true)} aria-label={alt}
        className="cursor-zoom-in border-0 bg-transparent p-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
      </button>
      {auf && (
        <div role="dialog" aria-modal="true" aria-label={alt} onClick={() => setAuf(false)}
          className="fixed inset-0 z-[90] flex cursor-zoom-out items-center justify-center bg-black/95 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-full max-w-full rounded-lg object-contain" />
          <button type="button" onClick={() => setAuf(false)} aria-label="Schliessen"
            className="absolute right-4 top-4 grid h-14 w-14 place-items-center rounded-full bg-white text-[#111] shadow-[0_4px_18px_rgba(0,0,0,.45)]">
            <X className="h-6 w-6" aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}
