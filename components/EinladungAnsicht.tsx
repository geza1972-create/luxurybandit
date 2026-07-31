"use client";

import { useEffect, useRef, useState } from "react";

/**
 * DAS VIDEO IN DER EINLADUNG — und die eine Zahl, an der alles hängt.
 *
 * Owner 31.07.2026. Zwei Aufgaben:
 *
 * 1. **Zeigen.** Gross, von selbst laufend, aber STUMM — jeder Browser blockiert Ton ohne
 *    Zutun und wuerde das Video sonst gar nicht erst starten. Ein Tipp auf den Lautsprecher
 *    schaltet ihn an; bei einer Hochzeitseinladung tippt fast jeder.
 *
 * 2. **Zaehlen.** Genau EINMAL je Besuch meldet die Seite eine Oeffnung. Bewusst hier im
 *    Browser und nicht beim Ausliefern: Ein Vorschaubild in WhatsApp, ein Suchroboter oder ein
 *    Vorablader wuerde sonst als Gast gezaehlt — und die Zahl, an der wir messen, ob aus der
 *    Einladung ein Kanal wird, waere wertlos.
 */
export default function EinladungAnsicht({ id, videoUrl, zaehlen = true, tonText = "" }: {
  id: string; videoUrl: string;
  /** In der Vorschau im Trichter wird NICHT gezaehlt — sonst zaehlt sich die Kundin selbst
   *  als Gast, und die eine Zahl, an der die Idee gemessen wird, waere geschoent. */
  zaehlen?: boolean;
  /** „Ton an" in der Sprache des Gastes. Owner 31.07.2026: „die musik fehlt noch" — der
   *  Hochzeitsmarsch liegt IM Video, aber jeder Browser startet stumm. Ein blosses Symbol
   *  wird uebersehen; mit dem Wort daneben tippt man drauf. */
  tonText?: string;
}) {
  const [ton, setTon] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const gezaehlt = useRef(false);

  useEffect(() => {
    if (!zaehlen || gezaehlt.current) return;
    gezaehlt.current = true;
    void fetch("/api/einladung", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ open: id }),
    }).catch(() => {});
  }, [id, zaehlen]);

  const umschalten = () => {
    const v = videoRef.current;
    if (!v) return;
    const an = !ton;
    setTon(an);
    v.muted = !an;
    if (an) void v.play().catch(() => {});
  };

  return (
    <div className="relative overflow-hidden">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} src={videoUrl} muted loop playsInline autoPlay preload="metadata"
        className="aspect-[3/4] w-full object-cover" />
      <button type="button" onClick={umschalten} aria-label={ton ? "Ton aus" : (tonText || "Ton an")}
        data-tonknopf="1"
        className={`absolute right-3 top-3 flex h-11 items-center gap-1.5 rounded-full bg-black/55 text-[20px] backdrop-blur transition active:scale-95 ${
          ton || !tonText ? "w-11 justify-center" : "px-3.5"
        }`}>
        {ton ? "🔊" : "🔇"}
        {/* Solange der Ton aus ist, steht das Wort daneben — danach reicht das Symbol. */}
        {!ton && tonText && (
          <span className="lb-onmedia text-[12px] font-black" style={{ color: "#fff" }}>{tonText}</span>
        )}
      </button>
    </div>
  );
}
