"use client";

import { useEffect, useRef, useState } from "react";

/**
 * EIN VIDEO, DAS OHNE SCHNITT VON VORN BEGINNT.
 *
 * Owner 03.08.2026: „es läuft in Schleife, aber es fängt ohne Überblendung wieder an. Kann man
 * das schön optimieren, dass es kein Bruch gibt? **Merk dir das bei allen Videos**." — und
 * kurz darauf: „auch bei den Topics-Video die gleiche Überblendung."
 *
 * DAS PROBLEM: Unsere Videos sind acht Sekunden lang, und am Ende steht ein anderes Bild als am
 * Anfang. `loop` schneidet damit alle acht Sekunden hart von einer Einstellung in eine andere.
 * Auf einer Kachelwand mit sechs Themen springen sechs Videos unabhängig voneinander — das
 * fällt mehr auf als die Videos selbst.
 *
 * DIE LÖSUNG: zwei gestapelte Spieler mit derselben Quelle. Kurz vor Schluss startet der zweite
 * bei null, beide blenden per `opacity` ineinander, dann tauschen die Rollen. Der Zuschauer
 * sieht eine Bewegung, die nie stehenbleibt.
 *
 * WARUM NICHT EINFACH EINE ABBLENDE: Ein Video, das alle acht Sekunden kurz dunkel wird, sieht
 * nach einem Fehler aus. Eine Überblendung sieht nach Absicht aus.
 *
 * WARUM EIN EIGENER BAUSTEIN: Die Überblendung stand zuerst nur in `EinladungAnsicht`. Sie ein
 * zweites Mal für die Themen-Kacheln zu schreiben hiesse, sie ab der ersten Änderung zweimal zu
 * pflegen — und die zwei Fallen unten würde beim Kopieren mit Sicherheit eine verlorengehen.
 */

/** Wie lange die beiden Spieler ineinander blenden. Kurz genug, dass niemand zwei Bilder
 *  gleichzeitig liest; lang genug, dass es kein Schnitt mehr ist. */
export const UEBERBLENDUNG = 0.7;

export default function SchleifenVideo({
  src, poster, className = "", stumm = true, schleife = true, spielerRef, passform = "cover",
}: {
  src: string;
  poster?: string;
  className?: string;
  /**
   * WIE DAS VIDEO IN DIE FLAECHE PASST (Owner 05.08.2026: „mach das Video ganz zu sehen").
   *
   * `cover` fuellt die Flaeche und SCHNEIDET ab, was nicht hineinpasst — bei einem 9:16-Video
   * in einer 3:4-Karte ist das rund ein Viertel der Hoehe, oben und unten. `contain` zeigt das
   * ganze Bild und laesst stattdessen Rand stehen. Vorgabe bleibt `cover`, weil die Kacheln
   * und der Feed davon leben; die KARTE bittet um `contain`.
   */
  passform?: "cover" | "contain";
  /** Fast immer stumm: Den Ton tragen unsere eigenen Tonspuren (lib/musik.ts). */
  stumm?: boolean;
  /**
   * OHNE SCHLEIFE LAEUFT ES GENAU EINMAL (Owner 03.08.2026: „hier bitte kein Loop").
   *
   * Die weiche Schleife ist fuer Videos ohne Anfang und Ende — eine Kachel, die sich bewegt.
   * Ein Video, in dem jemand SPRICHT, hat beides: Wer den Satz zu Ende gehoert hat, will ihn
   * nicht sofort wieder von vorn. Dann ist ein Standbild am Schluss die richtige Antwort und
   * ein zweiter Spieler ueberfluessig.
   */
  schleife?: boolean;
  /** Zugriff auf den laufenden Spieler — fuer einen Ton-Knopf ausserhalb. */
  spielerRef?: React.RefObject<HTMLVideoElement | null>;
}) {
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);
  const [vorne, setVorne] = useState<"a" | "b">("a");

  /* Nach aussen durchreichen, damit ein Ton-Knopf daneben `muted` umschalten kann. */
  useEffect(() => { if (spielerRef) spielerRef.current = a.current; }, [spielerRef]);

  useEffect(() => {
    const va = a.current, vb = b.current;
    if (!va) return;
    /**
     * OHNE SCHLEIFE: einmal anspielen, danach nichts weiter — kein Takt, kein zweiter Spieler.
     *
     * DIESE PRUEFUNG STAND ZUERST HINTER `if (!va || !vb) return`, und damit lief gar nichts:
     * Den zweiten Spieler gibt es ohne Schleife nicht, `vb` war also null und die Funktion
     * stieg aus, bevor sie zum Abspielen kam. Ein Video, das stumm und still dasteht, sieht
     * aus wie ein kaputtes Standbild.
     */
    if (!schleife) { void va.play().catch(() => { /* Autoplay verweigert */ }); return; }
    if (!vb) return;
    let laeuft = true;
    const takt = setInterval(() => {
      if (!laeuft) return;
      const aktiv = vorne === "a" ? va : vb;
      const andere = vorne === "a" ? vb : va;
      const rest = (aktiv.duration || 0) - aktiv.currentTime;
      /**
       * ERSTE FALLE: Erst umschalten, wenn die Dauer WIRKLICH bekannt ist. Solange die
       * Metadaten fehlen, ist `duration` NaN — dann wäre `rest` ebenfalls NaN, der Vergleich
       * bliebe falsch, aber `aktiv.duration > 0` fängt zusätzlich den Fall ab, dass ein Browser
       * kurzzeitig 0 meldet. Ohne diese Prüfung feuert die Überblendung sofort und endlos.
       */
      if (Number.isFinite(rest) && aktiv.duration > 0 && rest <= UEBERBLENDUNG) {
        try { andere.currentTime = 0; void andere.play(); } catch { /**/ }
        setVorne(v => (v === "a" ? "b" : "a"));
      }
    }, 120);
    void va.play().catch(() => { /* Autoplay verweigert — dann bleibt das Standbild stehen */ });
    return () => { laeuft = false; clearInterval(takt); };
  }, [vorne, src, schleife]);

  /**
   * ZWEITE FALLE: BEIDE Spieler bleiben stumm. Waeren sie es nicht, hoerte man den Ton
   * waehrend der Ueberblendung doppelt und leicht versetzt — das klingt kaputter als ein
   * harter Schnitt aussieht.
   */
  const gemeinsam = `h-full w-full ${passform === "contain" ? "object-contain" : "object-cover"} ${className}`;
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={a} src={src} poster={poster || undefined} muted={stumm} playsInline autoPlay preload="auto"
        style={{ opacity: !schleife || vorne === "a" ? 1 : 0, transition: `opacity ${UEBERBLENDUNG}s linear` }}
        className={gemeinsam} />
      {/* Der zweite Spieler existiert NUR fuer die Ueberblendung. Ohne Schleife waere er ein
          zweites Mal dieselben Megabyte, die niemand sieht. */}
      {schleife && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video ref={b} src={src} muted={stumm} playsInline preload="auto"
          style={{ opacity: vorne === "b" ? 1 : 0, transition: `opacity ${UEBERBLENDUNG}s linear` }}
          className={`absolute inset-0 ${gemeinsam}`} />
      )}
    </div>
  );
}
