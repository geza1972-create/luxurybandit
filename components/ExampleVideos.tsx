"use client";

import { useRef, useState } from "react";

/**
 * BEISPIELVIDEOS — gross und mit Ton (Owner 30.07.2026: „bitte mit vergroessern und song").
 *
 * Zwei Dinge, die vorher fehlten:
 *
 * 1. **Die Groesse.** Die Beispiele standen in zwei Spalten. Ein Hochzeitskuss auf halber
 *    Bildschirmbreite ist eine Briefmarke — dabei ist genau dieses Bild das Verkaufsargument.
 *    Jetzt eine Reihe, volle Breite.
 *
 * 2. **Der Ton.** Jeder Browser blockiert Ton, der ohne Zutun losgeht — deshalb startet das
 *    Video stumm und laeuft von selbst. Ein Tipp auf den Lautsprecher schaltet den Ton an;
 *    die Wahl gilt fuer alle Beispiele auf der Seite, damit nicht zwei Tonspuren
 *    uebereinanderliegen.
 */
export default function ExampleVideos({ urls }: { urls: string[] }) {
  const [tonAn, setTonAn] = useState(false);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

  const umschalten = (i: number) => {
    const an = !tonAn;
    setTonAn(an);
    refs.current.forEach((v, j) => {
      if (!v) return;
      // Ton nur im angetippten Video — sonst spielen mehrere gleichzeitig.
      v.muted = !an || j !== i;
      if (an && j === i) void v.play().catch(() => {});
    });
  };

  return (
    <div className="mt-3 space-y-3">
      {urls.map((url, i) => (
        <div key={i} className="relative overflow-hidden rounded-2xl border border-white/10">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={el => { refs.current[i] = el; }} src={url}
            muted loop playsInline autoPlay preload="metadata"
            className="aspect-[3/4] w-full object-cover" />
          <button type="button" onClick={() => umschalten(i)}
            aria-label={tonAn ? "Ton aus" : "Ton an"}
            className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full bg-black/55 text-[18px] backdrop-blur active:scale-95 transition">
            {tonAn ? "🔊" : "🔇"}
          </button>
        </div>
      ))}
    </div>
  );
}
