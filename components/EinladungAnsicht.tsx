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

/**
 * DIE MUSIK LIEGT NEBEN DEM VIDEO, NICHT DARIN (Owner 31.07.2026: „die Musik muss weiter
 * laufen, auch wenn das Video in Schleife läuft").
 *
 * Der Ton war im Video eingebacken, und das Video ist ACHT SEKUNDEN lang. Bei jeder Schleife
 * sprang die Musik zurueck auf den ersten Takt — alle acht Sekunden derselbe Anfang. Das
 * klingt nicht nach Hochzeit, das klingt nach einem Fehler.
 *
 * Jetzt bleibt das Video fuer immer stumm und eine eigene Tonspur traegt die Musik. Sie
 * laeuft zweieinhalb Minuten durch, waehrend das Bild darunter neunzehn Mal von vorn
 * beginnt. Das Video darf sich wiederholen — das faellt bei einem Kuss vor dem Altar nicht
 * auf. Musik, die sich alle acht Sekunden wiederholt, faellt sofort auf.
 *
 * ANDERES LIED (Owner 31.07.2026, direkt danach: „und nimm was anderes als Lied"). Vorher der
 * Hochzeitsmarsch — das Naheliegende, aber auch das Abgegriffene, und in acht Sekunden hoert
 * man von ihm ohnehin nur die ersten Toene. Jetzt ein ruhiges Stueck, das traegt statt
 * anzukuendigen.
 *
 * Zum Tauschen reicht diese eine Zeile. Es liegt bereits in `public/`:
 *   /grand_project-wonders-of-the-earth-550792.mp3        149 s · gross, filmisch
 *   /ikoliks_aj-acoustic-spring-mothers-day-music-320427.mp3  143 s · warm, akustisch
 *   /sigmamusicart-no-copyright-music-537751.mp3          123 s
 *   /Bridal-chorus.mp3                                    136 s · der Hochzeitsmarsch
 */
const HOCHZEITS_MUSIK = "/mickeyscat-moment-of-peace-mickeyscat-554494.mp3";

export default function EinladungAnsicht({
  id, videoUrl, zaehlen = true, tonText = "", tonAusText = "", musik = HOCHZEITS_MUSIK,
}: {
  id: string; videoUrl: string;
  /** In der Vorschau im Trichter wird NICHT gezaehlt — sonst zaehlt sich die Kundin selbst
   *  als Gast, und die eine Zahl, an der die Idee gemessen wird, waere geschoent. */
  zaehlen?: boolean;
  /** „Ton an" in der Sprache des Gastes. Owner 31.07.2026: „die musik fehlt noch" — ein
   *  blosses Symbol wird uebersehen; mit dem Wort daneben tippt man drauf. */
  tonText?: string;
  /** Dasselbe für „Ton aus" — nur für Bildschirmleser, aber in derselben Sprache. */
  tonAusText?: string;
  /** Die Tonspur. Leer heisst: kein Ton-Knopf, stilles Video. */
  musik?: string;
}) {
  const [ton, setTon] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
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
    const a = audioRef.current;
    if (!a) return;
    const an = !ton;
    setTon(an);
    if (an) {
      a.volume = 0.75;   // Hintergrund, nicht Konzert
      void a.play().catch(() => setTon(false));
    } else {
      a.pause();
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* IMMER stumm. Die Tonspur des Videos wird nie gebraucht — sie ist der Grund, warum die
          Musik vorher bei jeder Schleife von vorn ansetzte. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} src={videoUrl} muted loop playsInline autoPlay preload="metadata"
        className="aspect-[3/4] w-full object-cover" />
      {musik && (
        <>
          {/* `preload="none"`: Ein Stueck von zweieinhalb Minuten sind ein paar Megabyte. Wer
              nie auf den Lautsprecher tippt — und das sind die meisten — soll sie nicht
              herunterladen. Geladen wird beim ersten Tipp. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio ref={audioRef} src={musik} loop preload="none" />
          <TonKnopf an={ton} label={tonText} labelAus={tonAusText} onClick={umschalten} />
        </>
      )}
    </div>
  );
}
