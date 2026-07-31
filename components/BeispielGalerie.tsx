"use client";

import { UserRoundCog } from "lucide-react";
import { KARTE_TEXTE } from "@/components/EinladungKarte";

/**
 * DIE BEISPIELE — eine Reihe, und jedes ist ein Startpunkt.
 *
 * Owner 31.07.2026: „mach lieber die Galerie nicht in zwei Reihen sondern in einer Reihe, und
 * du machst den Button Replace People auf jedem."
 *
 * Beides zusammen ändert, wozu diese Galerie da ist. Vorher war sie Deko: zwei Reihen kleiner
 * Kacheln, die man ansieht und dann nach unten wegscrollt. Jetzt ist jedes Beispiel ein
 * Angebot — „genau das, aber mit uns beiden". Der Knopf spricht aus, was der Besucher ohnehin
 * denkt, wenn ihm eines gefällt.
 *
 * EINE REIHE, seitlich zu wischen: In zwei Reihen war jede Kachel halb so breit, und ein
 * Gesicht auf halber Breite verkauft nichts. Nebeneinander ist jede Kachel groß, und Wischen
 * kennt jeder vom Handy. `snap` lässt sie sauber einrasten statt zwischen zwei Videos stehen
 * zu bleiben.
 *
 * WARUM EIN EREIGNIS UND KEIN PROP: Die Galerie steht auf der SEITE (Server), der Trichter ist
 * ein eigener Baustein darüber. Sie können sich nicht gegenseitig aufrufen, ohne dass man den
 * halben Zustand durch die Seite reicht. Ein Fenster-Ereignis ist hier das kleinere Übel: eine
 * Zeile hier, eine Zeile dort, und keine Datei weiß mehr über die andere, als sie muss.
 */

/** Der Name des Ereignisses — auch der Trichter hört genau darauf. */
export const SCHRITTE_OEFFNEN = "lb-schritte-oeffnen";

export default function BeispielGalerie({ videos, lang = "en" }: { videos: string[]; lang?: string }) {
  const T = KARTE_TEXTE[lang] ?? KARTE_TEXTE.en;
  if (!videos.length) return null;

  const starten = () => {
    // Erst nach oben — sonst öffnet sich der Dialog, während er unten in der Galerie steht,
    // und er sieht nicht, was passiert ist.
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /**/ }
    try { window.dispatchEvent(new CustomEvent(SCHRITTE_OEFFNEN)); } catch { /**/ }
  };

  return (
    <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
      {videos.map((url, i) => (
        <div key={i} className="relative w-[78%] shrink-0 snap-center overflow-hidden rounded-2xl border border-white/10">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={url} muted loop playsInline autoPlay preload="metadata"
            className="aspect-[3/4] w-full object-cover" />
          {/* Der Knopf liegt AUF dem Video, unten mittig — dort, wo der Daumen ohnehin ist.
              `lb-onmedia` zwingt ihn auf Weiss: Ohne das faerbt die helle Fassung die Schrift
              dunkel, und dunkel auf einer dunklen Scheibe ueber einem Foto liest niemand. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3">
            <button type="button" onClick={starten}
              className="lb-onmedia pointer-events-auto flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[13px] font-black backdrop-blur transition active:scale-95"
              style={{ background: "rgba(20,15,8,0.66)" }}>
              <UserRoundCog className="h-4 w-4 shrink-0" />
              {T.menschenErsetzen}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
