"use client";

import { useEffect, useRef, useState } from "react";
import TonKnopf from "@/components/TonKnopf";

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
export default function EinladungAnsicht({ id, videoUrl, zaehlen = true, tonText = "", tonAusText = "" }: {
  id: string; videoUrl: string;
  /** In der Vorschau im Trichter wird NICHT gezaehlt — sonst zaehlt sich die Kundin selbst
   *  als Gast, und die eine Zahl, an der die Idee gemessen wird, waere geschoent. */
  zaehlen?: boolean;
  /** „Ton an" in der Sprache des Gastes. Owner 31.07.2026: „die musik fehlt noch" — der
   *  Hochzeitsmarsch liegt IM Video, aber jeder Browser startet stumm. Ein blosses Symbol
   *  wird uebersehen; mit dem Wort daneben tippt man drauf. */
  tonText?: string;
  /** Dasselbe für „Ton aus" — nur für Bildschirmleser, aber in derselben Sprache. */
  tonAusText?: string;
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
      <TonKnopf an={ton} label={tonText} labelAus={tonAusText} onClick={umschalten} />
    </div>
  );
}
