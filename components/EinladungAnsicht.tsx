"use client";

import { useEffect, useRef, useState } from "react";
import SchleifenVideo from "@/components/SchleifenVideo";
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
  id, videoUrl, zaehlen = true, tonText = "", tonAusText = "", musik = HOCHZEITS_MUSIK, tonAutomatisch = false,
  originalton = false, schleife = true, verhaeltnis = "aspect-[3/4]",
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
  /**
   * DIE STIMME AUS DEM VIDEO STATT UNSERER MUSIK (Owner 03.08.2026: „man muss die
   * Originalstimme hoeren").
   *
   * Sonst gilt hier das Gegenteil: Unsere Videos sind acht Sekunden lang, ihre Tonspur saesse
   * bei jeder Schleife wieder auf dem ersten Takt, und deshalb liegt Musik darunter. Spricht
   * jemand IM Video, ist das falsch — dann ist die Stimme der Inhalt und Musik darueber eine
   * zweite Stimme, die dagegen anredet.
   *
   * DER KNOPF BLEIBT NOETIG, auch wenn der Ton „an" sein soll: Browser lassen keinen Ton ohne
   * eine Geste des Besuchers zu. Das Video startet also stumm mit sichtbarem „Ton an" — ein
   * Versprechen auf Ton, das der Browser bricht, waere schlimmer als der eine Fingertipp.
   */
  originalton?: boolean;
  /** Weiterreichen an `SchleifenVideo` — ohne Schleife laeuft es genau einmal. */
  schleife?: boolean;
  /**
   * DAS SEITENVERHAELTNIS DER FLAECHE — stand fest auf 3:4.
   *
   * Das passt zu allem, was unsere Kette erzeugt (Kuss, Hochzeit: 3:4). Das Einladungsvideo des
   * Owners ist 1080x1920, also 9:16 — in einer 3:4-Flaeche mit `object-cover` verschwindet rund
   * ein Viertel der Hoehe, oben und unten. Bei einem Video, in dem jemand spricht, ist das
   * genau das Gesicht oder der Kopf.
   *
   * GEMESSEN, NICHT GESCHAETZT: Flaeche 343x457 (0,750) gegen Video 1080x1920 (0,563).
   */
  verhaeltnis?: string;
}) {
  const [ton, setTon] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);   // nur fuer den Originalton gebraucht
  /**
   * LAEUFT ES GERADE? Nur fuer den Abspielknopf beim Originalton.
   *
   * Ein stummes Video darf von allein starten, ein lautes nie — der Browser laesst Ton erst
   * nach einer Geste zu. Bei einem Video, in dem jemand SPRICHT, ist ein stummer Start aber
   * kein Start: Man sieht Lippen, die sich bewegen, und haelt es fuer kaputt. Also steht es
   * still mit einem Abspielknopf, und der eine Tipp bringt Bild UND Stimme.
   */
  const [laeuft, setLaeuft] = useState(false);
  const gezaehlt = useRef(false);

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

  const umschalten = () => {
    /* ORIGINALTON: nicht die Tonspur daneben, sondern das Video selbst stummschalten. */
    if (originalton) {
      const v = videoRef.current;
      if (!v) return;
      const an = !ton;
      setTon(an);
      v.muted = !an;
      v.volume = 1;
      if (an) void v.play().catch(() => setTon(false));
      return;
    }
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
      {/* IMMER stumm — die Tonspur des Videos wird nie gebraucht (siehe lib/musik.ts): Sie ist
          acht Sekunden lang und saesse bei jeder Schleife wieder auf dem ersten Takt.
          Die weiche Schleife macht `SchleifenVideo`; sie stand frueher hier und wohnt jetzt
          dort, weil die Themen-Kacheln sie ebenfalls brauchen. */}
      <div className={`${verhaeltnis} w-full`}>
        <SchleifenVideo src={videoUrl} schleife={schleife} stumm spielerRef={originalton ? videoRef : undefined} />
      </div>
      {/* DER ABSPIELKNOPF — nur beim Originalton, nur solange es steht. Er liegt ueber der
          ganzen Flaeche: Wer auf ein stehendes Video tippt, meint immer „ab jetzt". */}
      {originalton && !laeuft && (
        <button type="button" aria-label={tonText || "Play"}
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            v.muted = false; v.volume = 1;
            void v.play().then(() => { setLaeuft(true); setTon(true); })
              .catch(() => { /* Ton verweigert: wenigstens das Bild */ v.muted = true; void v.play(); setLaeuft(true); });
          }}
          /**
           * EIN KREIS IN DER MITTE, NICHT DIE GANZE FLAECHE (Owner 03.08.2026: „wenn ich auf
           * Play klicke, dann geht er weiter zum Upload, also es geht kein Play").
           *
           * GEMESSEN: Ueber der Beispielkarte liegt die Upload-Flaeche
           * (`absolute inset-x-0 bottom-0 top-16 z-20`) — dieselbe Ebene wie mein Knopf, und
           * sie steht spaeter im Dokument, also gewann sie jeden Klick.
           *
           * Ganzflaechig war ohnehin falsch: Der Rest der Karte SOLL zum Upload fuehren, das
           * ist der eigentliche Weg der Seite. Nur der Kreis gehoert dem Abspielen. z-30 wie
           * der Teilen-Knopf; der sitzt in der Ecke, hier ist die Mitte — sie ueberlappen nicht.
           */
          className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 grid h-16 w-16 place-items-center rounded-full transition active:scale-95">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-white/90 shadow-lg">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="ml-1 h-7 w-7 text-black">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
      {originalton
        ? laeuft && <TonKnopf an={ton} label={tonText} labelAus={tonAusText} onClick={umschalten} />
        : musik && (
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
