"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

/**
 * BEISPIELVIDEOS — gross, mit Ton, und EINS NACH DEM ANDEREN.
 *
 * 1. **Die Groesse** (Owner 30.07.2026: „bitte mit vergroessern und song"). Die Beispiele
 *    standen in zwei Spalten. Ein Hochzeitskuss auf halber Bildschirmbreite ist eine
 *    Briefmarke — dabei ist genau dieses Bild das Verkaufsargument. Jetzt volle Breite.
 *
 * 2. **Der Ton.** Jeder Browser blockiert Ton, der ohne Zutun losgeht — deshalb startet das
 *    Video stumm und laeuft von selbst. Ein Tipp auf den Lautsprecher schaltet den Ton an.
 *
 * 3. **Nacheinander** (Owner 31.07.2026: „das video kommt nacheinander"). Vorher liefen alle
 *    Beispiele gleichzeitig in Dauerschleife: drei zappelnde Bilder, von denen keines die
 *    Aufmerksamkeit bekommt, und mit Ton waeren es drei Tonspuren uebereinander. Jetzt laeuft
 *    genau eines; ist es zu Ende, startet das naechste, und nach dem letzten faengt es wieder
 *    vorn an. So sieht man jede Szene einmal ganz — und der Ton kann durchlaufen.
 */
export default function ExampleVideos({ urls }: { urls: string[] }) {
  const [tonAn, setTonAn] = useState(false);
  const [aktiv, setAktiv] = useState(0);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

  /**
   * EIN Video spielt, alle anderen stehen still am Anfang. Bewusst als Wirkung und nicht in
   * den Klick-Handlern: Der Wechsel kommt auch vom Ende eines Videos, nicht nur vom Tippen.
   */
  useEffect(() => {
    refs.current.forEach((v, j) => {
      if (!v) return;
      if (j === aktiv) {
        v.muted = !tonAn;
        void v.play().catch(() => {});
      } else {
        v.pause();
        v.muted = true;
        // Zurueckspulen: Wer spaeter drankommt, soll von vorn beginnen und nicht mitten drin.
        try { if (v.currentTime > 0.05) v.currentTime = 0; } catch { /* egal */ }
      }
    });
  }, [aktiv, tonAn]);

  const weiter = () => setAktiv(i => (urls.length ? (i + 1) % urls.length : 0));

  return (
    <div className="mt-3 space-y-3">
      {urls.map((url, i) => (
        <div key={i} className="relative overflow-hidden rounded-2xl border border-white/10">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={el => { refs.current[i] = el; }} src={url}
            muted playsInline autoPlay={i === 0} preload="metadata"
            onEnded={weiter}
            className="aspect-[3/4] w-full object-cover" />

          {/* Das wartende Video zeigt, dass es laufen KANN — sonst sieht ein stehendes Bild
              wie ein Fehler aus. Ein Tipp zieht es sofort vor. */}
          {i !== aktiv && (
            <button type="button" onClick={() => setAktiv(i)} aria-label="Dieses Video abspielen"
              className="absolute inset-0 grid place-items-center bg-black/35 transition active:scale-[0.99]">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-black/55 backdrop-blur">
                <Play className="ml-0.5 h-6 w-6 fill-white text-white" />
              </span>
            </button>
          )}

          <button type="button"
            onClick={() => { if (i !== aktiv) { setAktiv(i); setTonAn(true); } else setTonAn(t => !t); }}
            aria-label={tonAn && i === aktiv ? "Ton aus" : "Ton an"}
            className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full bg-black/55 text-[18px] backdrop-blur transition active:scale-95">
            {tonAn && i === aktiv ? "🔊" : "🔇"}
          </button>
        </div>
      ))}
    </div>
  );
}
