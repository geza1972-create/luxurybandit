"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { POLEDANCE_REFERENZEN } from "@/lib/poledance";

/**
 * DIE TANZ-AUSWAHL AUF DER LANDINGPAGE (Owner 03.08.2026: „unter /themes/surprise sollst du sie
 * zeigen mit Button drauf" · „hier nicht — die Auswahl findet auf der Landingpage statt").
 *
 * JEDE KARTE EIN FERTIGER TANZ, JEDE KARTE EIN KNOPF. Bewegung, Outfit, Stange und Neon sind
 * darin schon richtig; „Replace model" sagt genau, was passiert: Nimm diesen, setz mich hinein.
 *
 * WARUM HIER UND NICHT IM TRICHTER: Sie lag kurz dort, weil das Foto dort liegt. Der Owner will
 * sie davor — wer die Seite oeffnet, soll erst SEHEN, was es gibt, und dann hochladen. Ein
 * Angebot, das erst nach dem Upload erscheint, ist fuer den, der noch zoegert, gar keines.
 *
 * WIE DIE WAHL ANKOMMT: ueber ein Fenster-Ereignis. Auswahl und Trichter haben kein gemeinsames
 * Elternteil (die Seite ist ein Server-Baustein), und dafuer eine Zustandsverwaltung
 * einzufuehren waere mehr Maschine als Sache. Zusaetzlich in `localStorage`, damit ein
 * Neuladen die Wahl nicht wegwirft.
 */
export default function TanzAuswahl({ titel, knopf, gewaehlt }: {
  titel: string; knopf: string; gewaehlt: string;
}) {
  const [wahl, setWahl] = useState("");
  useEffect(() => { try { setWahl(localStorage.getItem("lb_tanz_ref") || POLEDANCE_REFERENZEN[0].video); } catch { /**/ } }, []);

  const waehlen = (video: string) => {
    setWahl(video);
    try { localStorage.setItem("lb_tanz_ref", video); } catch { /**/ }
    window.dispatchEvent(new CustomEvent("lb-tanz-ref", { detail: video }));
    /* Zum Trichter scrollen: Die Wahl ist getroffen, der naechste Schritt ist das Foto —
       ihn suchen zu lassen waere die haeufigste Art, jemanden hier zu verlieren. */
    document.querySelector("[data-trichter]")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mt-10">
      <p className="text-center text-[11px] font-black uppercase tracking-[0.24em] text-[#f6cf51]/80">{titel}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {POLEDANCE_REFERENZEN.map(r => {
          const an = wahl === r.video;
          return (
            <div key={r.id} className={`overflow-hidden rounded-2xl border-2 transition ${an ? "border-[#f6cf51]" : "border-white/15"}`}>
              {/* Standbild aus dem Video selbst (`#t=0.1`): kein zweites Bild je Karte, und
                  `preload="metadata"` laedt nur den Dateikopf statt des ganzen Films. */}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={`${r.video}#t=0.1`} muted playsInline preload="metadata"
                className="aspect-[3/4] w-full object-cover" />
              <button type="button" onClick={() => waehlen(r.video)}
                className={`flex h-10 w-full items-center justify-center gap-1.5 text-[12px] font-black transition active:scale-95 ${an ? "bg-[#f6cf51] text-black" : "bg-white/10 text-white/85"}`}>
                {an ? <><Check className="h-4 w-4" /> {gewaehlt}</> : knopf}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
