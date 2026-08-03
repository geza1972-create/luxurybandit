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

/** Wie lange die beiden Spieler ineinander blenden. Kurz genug, dass niemand zwei Bilder
 *  gleichzeitig liest; lang genug, dass es kein Schnitt mehr ist. */
const UEBERBLENDUNG = 0.7;

export default function EinladungAnsicht({
  id, videoUrl, zaehlen = true, tonText = "", tonAusText = "", musik = HOCHZEITS_MUSIK, tonAutomatisch = false,
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
  /**
   * TON VON SELBST AN (Owner 03.08.2026: „ich will unsere Musik und die soll dann automatisch
   * an sein. Wenn ich die Seite verlasse, dann stopp").
   *
   * Nur fuer das FERTIGE Video gedacht, nicht fuer Beispiele auf einer Seite, die gerade erst
   * geladen hat: Musik, die einen Besucher beim Ankommen anspringt, schalten Browser zu Recht
   * ab — und wer sie doch hoert, schliesst die Seite. Beim eigenen Ergebnis ist es umgekehrt:
   * Er hat gerade dafuer bezahlt und auf einen Knopf getippt, also darf es klingen.
   */
  tonAutomatisch?: boolean;
}) {
  const [ton, setTon] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const gezaehlt = useRef(false);
  /** Welcher der beiden Spieler gerade vorne liegt. */
  const [vorne, setVorne] = useState<"a" | "b">("a");

  useEffect(() => {
    if (!zaehlen || gezaehlt.current) return;
    gezaehlt.current = true;
    void fetch("/api/einladung", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ open: id }),
    }).catch(() => {});
  }, [id, zaehlen]);

  /**
   * ANSCHALTEN, SOBALD ES ETWAS ZU HOEREN GIBT — und wieder aus, sobald die Seite weg ist.
   *
   * Der Browser erlaubt Ton nur nach einer Geste des Benutzers. Beim fertigen Video ist die da
   * (er hat „Video erzeugen" getippt), also klappt es fast immer; wenn nicht, bleibt der Knopf
   * stehen und `ton` faellt still auf aus zurueck — kein Fehler, nur ein Tipp mehr.
   *
   * Das Aufraeumen ist der wichtigere Teil: Ohne es laeuft die Musik weiter, wenn er
   * weiterklickt oder den Tab wechselt. `pagehide` deckt ab, was `unmount` nicht sieht — auf
   * iOS wird eine Seite beim Wegwischen eingefroren statt abgebaut.
   */
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !musik || !tonAutomatisch) return;
    a.volume = 0.75;
    void a.play().then(() => setTon(true)).catch(() => setTon(false));
    const anhalten = () => { try { a.pause(); } catch { /**/ } };
    const beiWechsel = () => { if (document.visibilityState === "hidden") anhalten(); };
    window.addEventListener("pagehide", anhalten);
    document.addEventListener("visibilitychange", beiWechsel);
    return () => {
      anhalten();
      window.removeEventListener("pagehide", anhalten);
      document.removeEventListener("visibilitychange", beiWechsel);
    };
  }, [musik, tonAutomatisch, videoUrl]);

  /**
   * WEICHE SCHLEIFE STATT HARTEM SCHNITT (Owner 03.08.2026: „es laeuft in Schleife, aber es
   * faengt ohne Ueberblendung wieder an. Kann man das schoen optimieren, dass es kein Bruch
   * gibt? Merk dir das bei allen Videos").
   *
   * Unsere Videos sind acht Sekunden lang. Am Ende steht ein anderes Bild als am Anfang —
   * `loop` schneidet also hart von einer Einstellung in eine andere, und zwar alle acht
   * Sekunden. Das faellt mehr auf als das Video selbst.
   *
   * DIE LOESUNG SIND ZWEI SPIELER, nicht `loop`: Kurz vor Schluss startet der zweite bei null,
   * und die beiden blenden ineinander. Der Zuschauer sieht eine Bewegung, die nie stehenbleibt.
   * Beide sind stumm — der Ton kommt aus der Tonspur daneben (siehe lib/musik.ts), sonst waere
   * er waehrend der Ueberblendung doppelt zu hoeren.
   *
   * WARUM NICHT EINFACH EINE ABBLENDE: Ein Video, das alle acht Sekunden kurz dunkel wird,
   * sieht nach einem Fehler aus. Eine Ueberblendung sieht nach Absicht aus.
   */
  useEffect(() => {
    const a = videoRef.current, b = videoRefB.current;
    if (!a || !b) return;
    let laeuft = true;
    const pruefen = () => {
      if (!laeuft) return;
      const aktiv = vorne === "a" ? a : b;
      const andere = vorne === "a" ? b : a;
      const rest = (aktiv.duration || 0) - aktiv.currentTime;
      // Erst umschalten, wenn die Dauer wirklich bekannt ist — sonst ist `rest` NaN und die
      // Ueberblendung feuert sofort und endlos.
      if (Number.isFinite(rest) && aktiv.duration > 0 && rest <= UEBERBLENDUNG) {
        try { andere.currentTime = 0; void andere.play(); } catch { /**/ }
        setVorne(v => (v === "a" ? "b" : "a"));
      }
    };
    const t = setInterval(pruefen, 120);
    void a.play().catch(() => { /* Autoplay verweigert — der Nutzer tippt, dann laeuft es */ });
    return () => { laeuft = false; clearInterval(t); };
  }, [vorne, videoUrl]);

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
          Musik vorher bei jeder Schleife von vorn ansetzte.
          KEIN `loop` mehr: Die Schleife entsteht aus den zwei Spielern, die ineinander
          blenden (siehe oben). Der zweite liegt genau uebereinander und ist unsichtbar,
          solange er nicht an der Reihe ist. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} src={videoUrl} muted playsInline autoPlay preload="auto"
        style={{ opacity: vorne === "a" ? 1 : 0, transition: `opacity ${UEBERBLENDUNG}s linear` }}
        className="aspect-[3/4] w-full object-cover" />
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRefB} src={videoUrl} muted playsInline preload="auto"
        style={{ opacity: vorne === "b" ? 1 : 0, transition: `opacity ${UEBERBLENDUNG}s linear` }}
        className="absolute inset-0 aspect-[3/4] h-full w-full object-cover" />
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
