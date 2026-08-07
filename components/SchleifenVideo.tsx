"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

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

/**
 * WENN DER BROWSER DAS ABSPIELEN VERWEIGERT (Owner 06.08.2026: „Der Play button darf doch
 * nicht so grob sein").
 *
 * Der grobe Knopf auf den Themen-Kacheln war nie unserer — er ist der EINGEBAUTE des
 * Browsers. Safari und iOS zeichnen ihn ueber jedes Video, das nicht laeuft: eine fette
 * graue Scheibe mit weissem Dreieck, mitten auf dem Bild, in keiner Hausfarbe. Auf einem
 * Geraet im Stromsparmodus oder mit strengen Autoplay-Regeln sah damit jede Kachel so aus.
 *
 * Wir malen KEINEN eigenen Knopf an seine Stelle: Die Kachel ist als Ganzes ein Link in
 * ihren Trichter, ein Knopf darin haette zwei Ziele auf derselben Flaeche. Stattdessen
 * versucht das Video es beim ersten Fingertipp irgendwo auf der Seite noch einmal — dann
 * erlaubt der Browser es, weil eine Geste vorausging. Bis dahin steht das Standbild, und
 * das ist ein sauberes Bild statt eines fremden Knopfes. Der native Knopf selbst ist in
 * globals.css abgeschaltet (`.lb-schleife video`).
 */
function nachhelfen(v: HTMLVideoElement) {
  const nochmal = () => {
    void v.play().catch(() => { /* immer noch nicht — dann bleibt das Standbild */ });
    window.removeEventListener("pointerdown", nochmal);
    window.removeEventListener("touchstart", nochmal);
  };
  window.addEventListener("pointerdown", nochmal, { once: true, passive: true });
  window.addEventListener("touchstart", nochmal, { once: true, passive: true });
}

export default function SchleifenVideo({
  src, poster, className = "", stumm = true, schleife = true, spielerRef, passform = "cover", natuerlich = false, autostart = true, start,
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
  /**
   * DAS VIDEO GIBT SEINE EIGENE HOEHE (Owner 06.08.2026: „boa der volle ist aber grausam.
   * Abgeschnitenen Videos braucht keine Mensch").
   *
   * Sonst bestimmt die Huelle das Format, und das Video muss sich fuegen: entweder es wird
   * beschnitten (`cover`) oder es bekommt Balken (`contain`). Beides ist falsch, wenn die
   * Flaeche sowieso die ganze Breite hat — dann soll das Video einfach so hoch sein, wie es
   * ist. Das ist hier keine Kleinigkeit: Unsere Themen-Videos sind teils 3:4, teils 9:16.
   * EIN festes Verhaeltnis fuer alle heisst zwangslaeufig, dass die Haelfte beschnitten wird.
   */
  natuerlich?: boolean;
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
  /**
   * OHNE AUTOSTART WARTET DAS VIDEO AUF DEN TIPP (Owner 07.08.2026: „poster müssen geladen
   * werden, und videos sollen nicht automatisch starten. Weil auf dem handy ewig dauert").
   *
   * Das ist der Trick, mit dem es überall „sofort da" wirkt: Erst steht NUR das Poster
   * (ein Bild, lädt in einem Wimpernschlag) mit der Play-Scheibe darauf — kein einziges
   * Video-Byte wird geladen, denn der Spieler wird erst beim Tipp eingehängt. Der Tipp
   * ist zugleich die Nutzer-Geste, mit der jeder Browser auch ein Video MIT Ton anfahren
   * lässt.
   */
  autostart?: boolean;
  /**
   * DER GRIFF VON AUSSEN (07.08.2026, Owner: „warum der playbutton nict funktioniert?"):
   * Eine Karte mit EIGENER Play-Scheibe (Originalton in `EinladungAnsicht`) öffnet das
   * Tor über diesen Schalter statt über die eingebaute Scheibe. Ist `start` überhaupt
   * gesetzt (auch als false), zeichnet das Tor KEINE eigene Scheibe — sonst lägen zwei
   * Scheiben übereinander, und der Tipp erreichte immer nur eine.
   */
  start?: boolean;
}) {
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);
  const [vorne, setVorne] = useState<"a" | "b">("a");
  const [gestartet, setGestartet] = useState(autostart);
  useEffect(() => { if (start) setGestartet(true); }, [start]);

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
    if (!schleife) { void va.play().catch(() => nachhelfen(va)); return; }
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
    void va.play().catch(() => nachhelfen(va));
    return () => { laeuft = false; clearInterval(takt); };
  }, [vorne, src, schleife, gestartet]);

  /**
   * ZWEITE FALLE: BEIDE Spieler bleiben stumm. Waeren sie es nicht, hoerte man den Ton
   * waehrend der Ueberblendung doppelt und leicht versetzt — das klingt kaputter als ein
   * harter Schnitt aussieht.
   */
  const gemeinsam = `h-full w-full ${passform === "contain" ? "object-contain" : "object-cover"} ${className}`;
  /* Natuerlich: Der VORDERE Spieler bekommt keine Hoehe vorgeschrieben und spannt damit die
     Huelle auf; der hintere legt sich absolut darueber. Beide zeigen dieselbe Quelle, also
     passt er auf den Pixel. */
  const ersterKl = natuerlich ? `block h-auto w-full ${className}` : gemeinsam;
  /* Vor dem Start: nur Poster + Play-Scheibe, kein <video> im Baum — null geladene Bytes.
     Die Scheibe ist die weisse Haus-Scheibe (Skill `card`); sie steht hier von Hand, weil
     `Scheibe` in CI.tsx wohnt und CI.tsx diesen Baustein importiert — der Import zurück
     wäre ein Kreis. */
  if (!gestartet) {
    return (
      <div className={`lb-schleife relative overflow-hidden ${natuerlich ? "w-full" : "h-full w-full"}`}>
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className={natuerlich ? `block h-auto w-full ${className}` : gemeinsam} />
        ) : (
          <div className="absolute inset-0 lb-media-bg" />
        )}
        {start === undefined && (
          <button type="button" aria-label="Play" onClick={() => setGestartet(true)}
            className="absolute inset-0 z-10 grid place-items-center">
            <span className="grid h-12 w-12 place-items-center rounded-full opacity-70 shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
              style={{ background: "#fff" }}>
              <Play className="h-5 w-5" style={{ color: "#1a160f" }} fill="#1a160f" />
            </span>
          </button>
        )}
      </div>
    );
  }
  return (
    <div className={`lb-schleife relative overflow-hidden ${natuerlich ? "w-full" : "h-full w-full"}`}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={a} src={src} poster={poster || undefined} muted={stumm} playsInline autoPlay preload="auto"
        style={{ opacity: !schleife || vorne === "a" ? 1 : 0, transition: `opacity ${UEBERBLENDUNG}s linear` }}
        className={ersterKl} />
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
