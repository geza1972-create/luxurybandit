"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  teilen, grossText = "", kleinText = "",
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
  /**
   * DER TEILEN-KNOPF GEHÖRT AUF DIE KARTE, NICHT DANEBEN (Owner 04.08.2026: „bei allen Cards
   * auf allen Templates … wirklich bei allen").
   *
   * Er stand an SECHS Stellen im Code, jedes Mal von Hand mit `absolute left-2 top-2` —
   * `BeispielGalerie`, viermal `KissFunnel`, `HolidayFunnel`. Deshalb sass er mal links, mal
   * rechts, mal gar nicht. Jetzt reicht ein Aufrufer das durch, was geteilt werden soll, und
   * die Karte setzt den Knopf selbst an seinen festen Platz. Siehe Skill `card`.
   *
   * `undefined` heisst: nichts zu teilen (z. B. eine reine Vorschau) — dann fehlt der Knopf,
   * und nur er.
   */
  teilen?: ReactNode;
  /** Vorlesetext des Vergrössern-Knopfs, in der Sprache des Betrachters. */
  grossText?: string;
  /** Und derselbe Knopf im Vollbild — dort verkleinert er. */
  kleinText?: string;
}) {
  const [ton, setTon] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);   // nur fuer den Originalton gebraucht
  /** Die Fläche, die ins Vollbild geht — Video samt Knöpfen. */
  const rahmenRef = useRef<HTMLDivElement>(null);
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

  /**
   * VERGRÖSSERN — EIGENE ÜBERLAGERUNG STATT BROWSER-VOLLBILD (04.08.2026, gemessen).
   *
   * Hier stand `requestFullscreen()` mit `webkitEnterFullscreen` als Rückfall. Beim echten
   * Klicktest passierte NICHTS: kein Vollbild, keine Fehlermeldung, obwohl
   * `document.fullscreenEnabled` true meldete. Der Aufruf wird in eingebetteten Ansichten
   * (und auf etlichen Handys) stillschweigend abgelehnt, und mein Rückfall kannte nur die
   * iOS-Variante — also griff auch der nicht.
   *
   * Ein Knopf, der nichts tut, ist schlimmer als keiner. Die eigene Überlagerung braucht
   * keine Browser-Erlaubnis: Dieselbe Fläche wird per `position: fixed` über die Seite
   * gelegt. DASSELBE DOM-Element bleibt stehen — das Video wird nicht neu eingehängt, läuft
   * also weiter, statt beim Vergrössern von vorn zu beginnen.
   */
  const [gross, setGross] = useState(false);
  useEffect(() => {
    if (!gross) return;
    // Escape schliesst — und solange es offen ist, scrollt die Seite dahinter nicht mit.
    const zu = (e: KeyboardEvent) => { if (e.key === "Escape") setGross(false); };
    window.addEventListener("keydown", zu);
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", zu); document.body.style.overflow = vorher; };
  }, [gross]);

  return (
    <div ref={rahmenRef}
      /* RUND AN ALLEN VIER ECKEN (Owner 05.08.2026: „und das Video soll unten auch abgerundete
         Ecken haben"). Bis eben lag unten der Kaufknopf auf dem Video und deckte die zwei
         unteren Ecken zu; seit er darunter auf dem Papier steht, sieht man sie — und sie waren
         eckig, waehrend alles ringsum rund ist. Dieselben 14 px wie der Rahmen in
         `EinladungKarte`, damit Video und Karte dieselbe Rundung haben.
         IM VOLLBILD NICHT: Dort fuellt das Video den ganzen Bildschirm, und runde Ecken auf
         schwarzem Grund saehen nach einem Fehler aus. */
      className={gross
        ? "fixed inset-0 z-[90] grid place-items-center overflow-hidden bg-black"
        : "relative overflow-hidden rounded-[14px]"}>
      {/* IMMER stumm — die Tonspur des Videos wird nie gebraucht (siehe lib/musik.ts): Sie ist
          acht Sekunden lang und saesse bei jeder Schleife wieder auf dem ersten Takt.
          Die weiche Schleife macht `SchleifenVideo`; sie stand frueher hier und wohnt jetzt
          dort, weil die Themen-Kacheln sie ebenfalls brauchen. */}
      {/**
        * TIPPEN VERGRÖSSERT (Owner 05.08.2026: „Klick auf Video öffnet das Video gross. Also
        * Icon Vergrössern können wir dann entfernen").
        *
        * Der Tipp war auf der Themenseite bis eben an den Trichter vergeben — eine unsichtbare
        * Fläche über dem ganzen Video führte zum Upload. Seit der Kaufknopf UNTER dem Video
        * auf dem Karten-Papier steht (derselbe Tag), ist die Fläche frei, und der Tipp gehört
        * dorthin, wo ihn jeder erwartet: aufs Bild.
        *
        * IM VOLLBILD SCHLIESST DERSELBE TIPP WIEDER. Sonst käme man nur über die
        * Escape-Taste heraus — auf dem Handy also gar nicht.
        *
        * Kein `<button>`: In dieser Fläche liegen weitere Knöpfe (Ton, Teilen), und ein Knopf
        * im Knopf ist kaputtes HTML. Ein `div` mit `role="button"` kann dasselbe und lässt
        * die anderen in Ruhe.
        *
        * DIE FLAECHE BLEIBT AUF `cover` (Owner 05.08.2026, mit Bild: „ein Video ist zu
        * klein"). Ich hatte auf `contain` gestellt, um „das Video ganz zu zeigen" — das
        * stimmt nur, wenn Video und Rahmen dasselbe Verhaeltnis haben. Sonst stehen oben und
        * unten leere Baender, und das Video schrumpft mitten in der Karte. Was er gemeint
        * hat, war der Knopf, der darauf lag; der ist weg, und damit ist es wieder ganz zu
        * sehen. Wer ein Video mit anderem Verhaeltnis hat, gibt der Karte `verhaeltnis` mit.
        */}
      <div role="button" tabIndex={0}
        aria-label={(gross ? kleinText : grossText) || (gross ? "Exit fullscreen" : "Fullscreen")}
        onClick={() => setGross(g => !g)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setGross(g => !g); } }}
        className={`cursor-pointer ${gross ? "h-full max-h-full w-auto" : `${verhaeltnis} w-full`}`}>
        {/**
          * ZWEI TIPPS, ZWEI DINGE (Owner 07.08.2026: „klick auf video play startet das video.
          * Klick wieder auf video, öffnet das video groß").
          *
          * Der ERSTE Tipp trifft die Abspiel-Scheibe, die vor dem Start über dem Poster liegt
          * — danach ist sie weg, und jeder weitere Tipp trifft die Fläche darunter, die
          * vergrössert. Das ergibt sich von selbst, sobald `autostart` aus ist: Solange das
          * Video von allein lief, gab es die Scheibe nie, und der erste Tipp vergrösserte
          * sofort ein Video, das der Besucher noch gar nicht gesehen hatte.
          *
          * Nebenbei ist es das, was der Owner am selben Tag zum Laden gesagt hat („videos
          * sollen nicht automatisch starten. Weil auf dem handy ewig dauert"): Vor dem Tipp
          * steht nur das Poster, es wird kein einziges Video-Byte geladen.
          */}
        {/* Beim Originalton steuert UNSERE Scheibe das Tor (`start`), und der Spieler
            startet gleich ungestummt — die Geste ist ja gerade passiert. Ohne Originalton
            behält das Tor seine eigene Scheibe (Musik kommt ohnehin von nebenan). */}
        <SchleifenVideo src={videoUrl} poster={poster} autostart={false}
          start={originalton ? laeuft : undefined}
          schleife={schleife} stumm={originalton ? !laeuft : true}
          spielerRef={originalton ? videoRef : undefined} />
      </div>
      {/* DER ABSPIELKNOPF — nur beim Originalton, nur solange es steht. Er liegt ueber der
          ganzen Flaeche: Wer auf ein stehendes Video tippt, meint immer „ab jetzt". */}
      {originalton && !laeuft && (
        <button type="button" aria-label={tonText || "Play"}
          onClick={() => {
            /* EIN TIPP, BEIDE TORE (07.08.2026, Owner: „warum der playbutton nict
               funktioniert?"): Vor dem Tipp ist unten GAR KEIN Spieler eingehängt
               (`autostart={false}` lädt keine Bytes) — der alte Griff zum `videoRef` fand
               nichts und brach mit `if (!v) return` wortlos ab. Jetzt öffnet `start`
               das Tor; steht der Spieler schon, wird er direkt laut. */
            setLaeuft(true); setTon(true);
            const v = videoRef.current;
            if (v) { v.muted = false; v.volume = 1; void v.play().catch(() => { v.muted = true; void v.play(); }); }
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
          /**
           * KLEINER UND HALBTRANSPARENT (Owner 05.08.2026: „nur der play button ist billig muss
           * kleiner sein und halbtransparent").
           *
           * Hier lag eine 64-px-Scheibe in vollem Weiss mit einem SCHWARZEN Dreieck darin —
           * die Optik eines Video-Players, mitten auf einem Foto, das nach Hochglanz aussehen
           * soll. Zwei Dinge machten sie billig: die Grösse (sie war der grösste Gegenstand im
           * Bild) und das harte Schwarz-auf-Weiss, das mit nichts auf der Karte etwas zu tun
           * hat.
           *
           * JETZT WIE DIE DREI ANDEREN SYMBOLE (Skill `card`): 40 px statt 64, durchscheinend
           * statt deckend. Die milchige Scheibe mit dünnem weissem Rand liegt AUF dem Bild,
           * statt darauf zu kleben — und das Motiv bleibt sichtbar, was bei einem Standbild,
           * das den Kauf auslösen soll, der ganze Punkt ist.
           *
           * `data-aufmedien` ist der Grund, warum das Dreieck weiss bleibt: In der Karte färbt
           * `.lb-karte svg` jedes Zeichen auf Gold um (globals.css). Für Bedienung, die auf dem
           * Video liegt, gibt es dort die Ausnahme — Gold auf einem beliebigen Foto ist mal
           * unsichtbar und mal schmutzig, Weiss trägt immer. Die Fläche zum Tippen bleibt mit
           * 48 px grösser als die Scheibe, sonst trifft man sie am Handy nicht.
           */
          className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center transition active:scale-95">
          <span data-aufmedien="1" className="grid h-10 w-10 place-items-center rounded-full"
            style={{
              background: "rgba(255,255,255,0.22)",
              border: "1px solid rgba(255,255,255,0.65)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.28)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
              opacity: 0.85,
            }}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="ml-[2px] h-[18px] w-[18px]"
              style={{ color: "#fff", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
      {/* DAS VERGRÖSSERN-SYMBOL IST WEG (Owner 05.08.2026: „Icon Vergrössern können wir dann
          entfernen") — das Video selbst ist der Knopf, siehe oben. Übrig bleiben zwei in der
          Spalte: Teilen, dann Ton (Reihenfolge und Plätze wie im Skill `card`).
          IM VOLLBILD BLEIBT EIN SICHTBARER WEG ZURÜCK: ein Kreuz oben rechts. Ohne das müsste
          man raten, dass ein Tipp aufs Bild wieder schliesst — und wer nicht rät, sitzt fest. */}
      {gross && (
        <button type="button" onClick={() => setGross(false)}
          aria-label={kleinText || "Exit fullscreen"}
          style={{ background: "#fff", color: "#1a160f", boxShadow: "0 2px 10px rgba(0,0,0,0.35)", opacity: 0.85 }}
          className="absolute right-3 top-3 z-30 grid h-10 w-10 place-items-center rounded-full transition active:scale-90">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" aria-hidden className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      )}

      {/* TEILEN — jetzt der ERSTE in der Spalte (das Vergrössern-Symbol ist weg, siehe oben);
          der Ton rueckt auf `top-[60px]` nach. `top-[60px]` ist `top-3` plus die Knopfhöhe plus
          ein Fingerbreit Abstand; zwei Knöpfe, die sich berühren, trifft man am Handy nicht
          auseinander. */}
      {/* Die 30 % sitzen an der Hülle, nicht am Knopf darin: So gilt dieselbe Durchsicht für
          jeden Teilen-Knopf, den ein Aufrufer hereinreicht — den runden `TeilenKnopf` genauso
          wie den eigenen Send-Knopf des Kuss-Trichters. */}
      {teilen && <div className={`absolute right-3 z-30 opacity-70 ${gross ? "top-[60px]" : "top-3"}`}>{teilen}</div>}

      {/* DIE TON-SCHEIBE STEHT IMMER (Owner 07.08.2026, zur Muster-Karte: „hier fehlt auch
          sound icon") — vorher erschien sie beim Originalton erst, wenn das Video lief, und
          eine pausierte Karte zeigte zwei statt drei Scheiben (Skill `card`: immer alle,
          immer am selben Platz). Der Schalter wirkt, sobald das Video läuft. */}
      {originalton
        ? <TonKnopf an={ton} label={tonText} labelAus={tonAusText} onClick={umschalten}
            platz={`absolute right-3 z-30 ${gross ? "top-[108px]" : "top-[60px]"}`} />
        : musik && (
          <>
            {/* `preload="none"`: Ein Stueck von zweieinhalb Minuten sind ein paar Megabyte. Wer
                nie auf den Lautsprecher tippt — und das sind die meisten — soll sie nicht
                herunterladen. Geladen wird beim ersten Tipp. */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio ref={audioRef} src={musik} loop preload="none" />
            <TonKnopf an={ton} label={tonText} labelAus={tonAusText} onClick={umschalten}
            platz={`absolute right-3 z-30 ${gross ? "top-[108px]" : "top-[60px]"}`} />
          </>
        )}
    </div>
  );
}
