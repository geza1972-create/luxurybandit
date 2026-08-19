"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Loader2 } from "lucide-react";

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
 * WANN DER KREISEL AUFGIBT (Millisekunden).
 *
 * Owner 18.08.2026: „das lädt seit 2 minuten und hängt mit dem blöden schwarzen balken."
 *
 * Ein Kreisel, der nur durch ein Ereignis ausgeht, das ausbleiben KANN, ist eine Falle: Kommt
 * `playing` nie (weil der Browser das Abspielen verweigert oder etwas ausserhalb pausiert
 * hat), dreht er bis in die Ewigkeit ueber einem eingefrorenen Bild. Hausregel „immer close
 * einbauen": Nach dieser Zeit geht er weg und gibt das Bild frei — lieber ein Standbild ohne
 * Auskunft als ein Drehrad, das luegt.
 */
const LADE_NOTBREMSE = 12000;

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

  /**
   * WER VORNE STEHT, GEHOERT IN EINEN GRIFF — NICHT IN DIE ABHAENGIGKEITEN.
   *
   * Owner 18.08.2026: „Die Videos hängen grundsätzlich. Egal ob lokal oder online."
   *
   * Hier lag die zweite Hälfte des Fehlers (die erste steckte in den Dateien selbst, siehe
   * unten). `vorne` stand in der Liste des Takt-Effekts. Jede Überblendung ändert `vorne`,
   * also baute der Effekt sich alle acht Sekunden neu auf — und lief dabei wieder bis zur
   * letzten Zeile, `va.play()`.
   *
   * Das ist nicht bloss Verschwendung, es kehrt die Bauweise um: Spieler A hat zu diesem
   * Zeitpunkt sein Ende erreicht. Ein `play()` auf einem BEENDETEN Video springt laut Norm
   * zurück auf null und läuft von vorn los. A spielte also unsichtbar eine ganze zweite
   * Runde, während B sichtbar lief. Ergebnis: dauerhaft ZWEI dekodierende Videos pro Kachel,
   * für immer, statt einem plus 0,7 s Überlappung.
   *
   * In der schmalen Reihe (`ThemenKachel art="reihe"`, autostart) sind das bei sechs Themen
   * zwölf gleichzeitig laufende Dekoder. Handys haben dafür eine harte Obergrenze — darüber
   * bekommt keiner mehr genug, und alle stocken gleichzeitig. Genau das sah der Owner.
   *
   * Mit dem Griff bleibt der Takt EIN Mal stehen: A läuft aus und bleibt beendet liegen, bis
   * die Überblendung es wieder auf null setzt.
   */
  const vorneRef = useRef<"a" | "b">("a");
  useEffect(() => { vorneRef.current = vorne; }, [vorne]);


  /**
   * DER KREISEL WÄHREND ES STOCKT (Owner 18.08.2026: „die videos bleiben alle hängen während
   * man sie ablaufen lässt" — und, zur ersten Lösung mit verzögertem Start: „sofort play ja
   * aber loading muss erscheinen. Vor allem unser loading").
   *
   * Der Start bleibt sofort (`autoPlay`/`play()` wie bisher) — verzögert lief die erste
   * Fassung dieser Zeile noch, das wollte der Owner ausdrücklich nicht. Stattdessen zeigt das
   * Video selbst an, wenn ihm mitten in der Wiedergabe die Daten ausgehen: der Browser feuert
   * `waiting`, sobald er pausieren muss, und `playing`, sobald es weitergeht. Dazwischen liegt
   * der Kreisel — dieselbe Optik wie `Laden` aus CI.tsx, hier von Hand gezeichnet (SchleifenVideo
   * kann CI.tsx nicht importieren, siehe Play-Scheibe unten: CI.tsx importiert bereits diesen
   * Baustein zurück).
   */
  const [laedt, setLaedt] = useState(false);

  /**
   * Nach aussen durchreichen, damit ein Ton-Knopf daneben `muted` umschalten kann.
   *
   * `gestartet` GEHOERT IN DIE LISTE (07.08.2026, Owner: „dann war das standbild des videos
   * da, ohne playbutton"): Ohne Autostart gibt es beim ersten Aufbau noch gar kein `<video>`
   * — `a.current` ist null, und genau dieses Nichts wurde nach aussen gereicht. Da die Liste
   * sich nie wieder aenderte, blieb der Griff LEER, auch nachdem der Spieler laengst stand.
   * Jeder Aufrufer, der ihn benutzt (Ton-Knopf, Ende-Erkennung), griff ins Nichts und brach
   * wortlos ab. Jetzt wird er in dem Moment nachgereicht, in dem der Spieler entsteht.
   */
  useEffect(() => { if (spielerRef) spielerRef.current = a.current; }, [spielerRef, gestartet]);

  useEffect(() => {
    const va = a.current, vb = b.current;
    if (!va) return;
    let laeuft = true;
    /* Beide Spieler melden Puffer-Pausen — waehrend der Ueberblendung koennte theoretisch
       jeder von beiden gerade der sichtbare sein. */
    let notbremse: ReturnType<typeof setTimeout> | undefined;
    const wartet = () => {
      if (!laeuft) return;
      setLaedt(true);
      /* Der Ausweg, falls `playing` nie kommt (siehe LADE_NOTBREMSE). */
      clearTimeout(notbremse);
      notbremse = setTimeout(() => setLaedt(false), LADE_NOTBREMSE);
    };
    const laeuftWieder = () => {
      clearTimeout(notbremse); notbremse = undefined;
      if (laeuft) setLaedt(false);
    };
    const spieler = vb ? [va, vb] : [va];
    spieler.forEach(v => { v.addEventListener("waiting", wartet); v.addEventListener("playing", laeuftWieder); });
    /**
     * OHNE SCHLEIFE: einmal anspielen, danach nichts weiter — kein Takt, kein zweiter Spieler.
     *
     * DIESE PRUEFUNG STAND ZUERST HINTER `if (!va || !vb) return`, und damit lief gar nichts:
     * Den zweiten Spieler gibt es ohne Schleife nicht, `vb` war also null und die Funktion
     * stieg aus, bevor sie zum Abspielen kam. Ein Video, das stumm und still dasteht, sieht
     * aus wie ein kaputtes Standbild.
     */
    const abbauen = () => {
      laeuft = false;
      clearTimeout(notbremse);
      spieler.forEach(v => { v.removeEventListener("waiting", wartet); v.removeEventListener("playing", laeuftWieder); });
    };
    /**
     * ANFAHREN — UND WENN DER BROWSER NEIN SAGT, STUMM NOCHMAL.
     *
     * Owner 18.08.2026: „hier bitte meistens das erste video hängt" · „erster und zweiter".
     *
     * DAS WAR DER GRUND, und er stand nicht in der Datei, sondern in einer Browser-Regel: Ein
     * Video mit TON darf nicht von selbst starten. Im vergrösserten Dialog ist der Ton aber
     * standardmässig an (`VorlagenUeberlagerung`, CI.tsx: `useState(true)` → `stumm={false}`).
     * Also lehnte der Browser `play()` ab, das Bild fror bei Sekunde 0 ein, `waiting` war
     * gefeuert — und der Kreisel drehte endlos über einem Video, das alle Daten längst hatte
     * (gemessen: `readyState: 4`, `paused: true`, `t: 0`).
     *
     * STUMM darf JEDER Browser starten. Lieber läuft es ohne Ton und der Lautsprecher-Knopf
     * daneben holt ihn dazu, als dass es eingefroren dasteht. Genau so macht es
     * `EinladungAnsicht` seit dem 03.08. schon (dort Zeile 405) — dieser Baustein hatte es nur
     * nie bekommen.
     *
     * Erst wenn auch der stumme Versuch scheitert, wartet `nachhelfen` auf die erste Geste —
     * und der Kreisel geht weg, damit er nicht über einem Standbild lügt.
     */
    const anfahren = (v: HTMLVideoElement) => {
      void v.play().catch(() => {
        v.muted = true;
        void v.play().catch(() => { laeuftWieder(); nachhelfen(v); });
      });
    };
    if (!schleife) { anfahren(va); return abbauen; }
    if (!vb) return abbauen;
    const takt = setInterval(() => {
      if (!laeuft) return;
      const aktiv = vorneRef.current === "a" ? va : vb;
      const andere = vorneRef.current === "a" ? vb : va;
      const rest = (aktiv.duration || 0) - aktiv.currentTime;
      /**
       * ERSTE FALLE: Erst umschalten, wenn die Dauer WIRKLICH bekannt ist. Solange die
       * Metadaten fehlen, ist `duration` NaN — dann wäre `rest` ebenfalls NaN, der Vergleich
       * bliebe falsch, aber `aktiv.duration > 0` fängt zusätzlich den Fall ab, dass ein Browser
       * kurzzeitig 0 meldet. Ohne diese Prüfung feuert die Überblendung sofort und endlos.
       */
      if (Number.isFinite(rest) && aktiv.duration > 0 && rest <= UEBERBLENDUNG) {
        /* `try/catch` fängt NUR das synchrone `currentTime` — `play()` gibt ein Versprechen
           zurück, und dessen Ablehnung lief hier ungefangen in die Konsole („Uncaught (in
           promise) AbortError … paused to save power", gesehen 18.08.2026). Das passiert im
           Alltag dauernd: Der Browser hält Videos an, sobald der Tab in den Hintergrund
           geht, und bricht ein laufendes `play()` dabei ab. Kein Fehler, nur Lärm — aber
           Lärm, der echte Fehler im Log begräbt. */
        try { andere.currentTime = 0; } catch { /**/ }
        /* Auch der zweite Spieler faehrt ueber `anfahren` an: Er hat dasselbe `muted` wie der
           erste, also trifft ihn dieselbe Browser-Regel — sonst blendet der Takt auf ein
           Video, das gar nicht laeuft, und das Bild steht ab der ersten Schleife. */
        anfahren(andere);
        setVorne(v => (v === "a" ? "b" : "a"));
      }
    }, 120);
    anfahren(va);
    return () => { abbauen(); clearInterval(takt); };
    /* `vorne` steht hier ABSICHTLICH NICHT (siehe `vorneRef` oben) — mit ihm baute sich der
       Takt bei jeder Überblendung neu auf und startete den beendeten Spieler wieder. */
  }, [src, schleife, gestartet]);

  /**
   * HIER STAND EIN BEOBACHTER, DER PAUSIERT HAT, WAS NICHT IM BILD IST — UND ER IST RAUS.
   *
   * Owner 18.08.2026: „es hängt schon wieder und sogar ohne ladebalken" · „das lädt seit 2
   * Minuten und hängt mit dem blöden schwarzen balken" · „das ist ein dialog und ich glaube
   * im hintergrund lädst du die videos in der karte".
   *
   * Die Idee war richtig (weniger gleichzeitige Dekoder), die Wirkung war ein Totalausfall.
   * GEMESSEN am hängenden Video: `paused: true`, `t: 0`, `readyState: 4` — alle Daten da, und
   * es lief trotzdem nicht.
   *
   * DIE KETTE: Im DIALOG (der vergrösserten Karte) liegt das Video in einem eigenen
   * Scroll-Container. Der Beobachter hielt es für „nicht im Bild" und pausierte es. Vorher war
   * `waiting` gefeuert, der Kreisel also an — und ein pausiertes Video feuert nie wieder
   * `playing`. Damit ging der Kreisel NIE aus: schwarze Fläche mit Drehrad über einem
   * eingefrorenen Bild, minutenlang, ohne dass irgendetwas lud.
   *
   * LEHRE: Etwas von aussen anzuhalten, dessen Weiterlaufen an einem Ereignis hängt, das nur
   * das Laufen selbst auslöst, ist eine Falle. Wer das je wieder einbauen will, braucht
   * beides: einen Ausweg für den Kreisel (Notbremse) UND einen Beobachter, der den richtigen
   * `root` kennt — die Vorgabe ist das Fenster, und im Dialog ist das die falsche Bezugsgrösse.
   *
   * Die doppelten Dekoder sind trotzdem weg: Das erledigt `vorneRef` oben, und das ohne
   * Nebenwirkung.
   */

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
          /* `loading="lazy"` (GEMESSEN 13.08.2026, Owner: „die hängen immer noch"): das
             Karussell hängt ALLE Folien ein — 14 Poster auf einmal sättigten die Mobil-
             Leitung, bevor irgendein Video überhaupt angetippt war. Lazy lädt nur, was
             im Bild steht. */
          <img src={poster} alt="" loading="lazy" className={natuerlich ? `block h-auto w-full ${className}` : gemeinsam} />
        ) : (
          /**
           * OHNE POSTERDATEI: DAS ERSTE BILD DES VIDEOS (Owner 10.08.2026, mit Bild der
           * Hochzeitskarte: „Video poster fehlen").
           *
           * Hier stand eine dunkle Fläche — und die stand überall dort, wo das Standbild
           * nicht als Datei danebenliegt. Das trifft ALLE Beispiele aus der Ablage: Ihre
           * Adressen sind signiert (`…mp4?token=…`), und die Regel „aus .mp4 wird .jpg"
           * kann daraus keine gültige Bildadresse machen. Ergebnis: schwarzer Kasten mit
           * Playknopf — genau das, was die Hausregel verbietet („nie ein schwarzer
           * Bildschirm", [[video-playback-behavior]]).
           *
           * `preload="metadata"` lädt nur den Kopf der Datei (wenige Zehnerkilobyte), nicht
           * das Video — der Grundsatz „keine Megabyte vor dem Tipp" bleibt gewahrt. Der
           * Sprung auf 0,1 s ist die Wache für Safari: Ohne ihn zeigt iOS gelegentlich
           * weiter Schwarz, obwohl der Kopf da ist.
           *
           * Eine echte Posterdatei bleibt das Bessere (sie lädt in einem Wimpernschlag und
           * kostet null Bytes Video); dieser Zweig ist der Rückfall, damit nie wieder ein
           * schwarzes Feld erscheint, weil jemand vergessen hat, eines abzulegen.
           */
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={src} muted playsInline preload="metadata"
            onLoadedMetadata={e => { try { e.currentTarget.currentTime = 0.1; } catch { /**/ } }}
            className={natuerlich ? `block h-auto w-full ${className}` : gemeinsam} />
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
        /* `preload="metadata"`, NICHT `auto` (18.08.2026, zum Hänger): Der zweite Spieler
           wird erst 0,7 s vor Schluss gebraucht — mit `auto` zog er dieselbe Datei ein
           zweites Mal parallel zum ersten und halbierte damit die Leitung für das Bild, das
           man gerade ansieht. Den Kopf braucht er (`duration` für den Takt), die Megabyte
           holt er sich beim `play()`, und da liegt die Datei längst im Zwischenspeicher. */
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video ref={b} src={src} muted={stumm} playsInline preload="metadata"
          style={{ opacity: vorne === "b" ? 1 : 0, transition: `opacity ${UEBERBLENDUNG}s linear` }}
          className={`absolute inset-0 ${gemeinsam}`} />
      )}
      {/**
        * DER KREISEL — GOLD, UND KEINE SCHWARZE FLAECHE DAHINTER.
        *
        * Owner 18.08.2026: „habe dir gesagt du sollst die balken nicht schwarz machen sondern
        * weiss oder gelb." Hier lag ein `bg-black/25` ueber dem ganzen Bild — eine dunkle
        * Scheibe mitten im Video, dazu ein duenner weisser Ring, der auf unseren warmen,
        * goldenen Aufnahmen praktisch unsichtbar war (er sah ihn erst gar nicht, dann als
        * „bloeden schwarzen balken").
        *
        * Jetzt: kein Vorhang mehr, sondern das Hausgold auf dem laufenden Bild. Der weiche
        * Schatten darunter haelt ihn auch auf einer hellen Stelle lesbar, ohne dass eine
        * Flaeche das Video zudeckt.
        *
        * Er liegt UEBER beiden Spielern, damit er unabhaengig davon sichtbar ist, welcher
        * gerade vorne ist.
        */}
      {laedt && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center" role="status" aria-label="Lädt">
          {/* `lb-kreisel-gold` GEHOERT DAZU (globals.css): Ohne die Klasse siegt die
              `.lb-karte svg`-Regel mit `!important` ueber diese Inline-Farbe, sobald der
              Kreisel innerhalb einer Karte liegt — gemessen als schwarzer statt goldener
              Kreisel (Owner 18.08.2026). Die Inline-Farbe bleibt trotzdem stehen: Sie greift
              ausserhalb jeder `.lb-karte` (Themen-Kacheln, Startseite), wo es die Regel gar
              nicht gibt. */}
          <Loader2 aria-hidden className="lb-kreisel-gold h-10 w-10 animate-spin"
            style={{ color: "#f6cf51", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.55))" }} />
        </div>
      )}
    </div>
  );
}
