"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WandBildContext } from "@/components/PosterWandBild";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

/**
 * DAS BLATT UND SEINE ZIMMER — EIN SLIDER (Owner 18.09.2026: „nicht als Extrabild sondern nach
 * dem Poster die Slides").
 *
 * Folie 0 ist das WERK selbst (dieselbe Kachel wie bisher, mit allem Werkzeug: Rahmen wechseln,
 * „You as a picture", Texte ändern). Danach kommen die Zimmer. Es steht also kein zweites Bild
 * unter dem Poster — man wischt vom Blatt in die Wohnung.
 *
 * ── WARUM NICHT JE WERK EIN GERENDERTES FOTO ────────────────────────────────────────────────
 *
 * Singulart legt für jedes Werk fertige Zimmerbilder ab. Bei uns ändert sich das Blatt, während
 * jemand davorsteht: Er tauscht den Rahmen, die Grösse, und mit „You as a picture" sogar das
 * Bild. Ein vorgerendertes Foto wäre nach dem ersten Klick falsch.
 *
 * Deshalb hängt hier das ECHTE Blatt (dieselbe Komponente wie oben) in einem Zimmerfoto — per
 * CSS skaliert und an die Stelle gesetzt, an der die Wand frei ist. Es kostet nichts je Werk,
 * ist immer aktuell, und wer den Rahmen wechselt, sieht ihn sofort an der Wand.
 *
 * DIE ZIMMER sind unsere eigenen Bilder (hochkant 3:4, Kamera parallel, Wand leer). Für jedes
 * steht hier, wo das Blatt hängt — in Prozent des Bildes, damit es auf jeder Breite stimmt.
 */
/**
 * DIE STELLE AN DER WAND IST IN JEDEM ZIMMER DIESELBE (Owner 18.09.2026: „Poster immer mittig
 * platzieren" · „soll immer die gleiche Position haben im Bild").
 *
 * Alles in % des ZIMMERBILDES (nicht des Kastens) — deshalb liegt das Blatt unten in einem
 * Wrapper, der genau so breit ist wie das Bild. Die Zimmer sind mittig und auf gleicher Höhe
 * fotografiert, also trägt EINE Angabe für alle: Wer durchblättert, sieht dasselbe Blatt in
 * verschiedenen Wohnungen, nicht ein wanderndes Bild.
 */
const BLATT = {
  /** Mitte des Blattes, waagerecht. */ links: 50,
  /** Mitte des Blattes, senkrecht. */ oben: 30,
  /** Blattbreite — grosszügig (Owner: „Poster grösser"): Was an der Wand verschwindet, verkauft
      nichts.

      ── EINE BREITE FÜR JEDES WERK (Owner 18.09.2026: „rechts ist es gut bei dem Selbstporträt") ──
      Vorher bekam ein Blatt mit QUEREM Werk 25 % mehr Breite. Das Blatt selbst ist aber immer
      hochkant (1 : 1,4142) — quer ist nur das Werk DARIN. Der Zuschlag liess dieselbe Papiergrösse
      an derselben Wand verschieden breit erscheinen, je nach Motiv. */ breite: 40,
};

const RAEUME = [
  "/lakatosbandi/zimmer-1.jpg",
  "/lakatosbandi/zimmer-2.jpg",
  "/lakatosbandi/zimmer-3.jpg",
  "/lakatosbandi/zimmer-4.jpg",
];

/**
 * ── EIN KLEINES BLATT WIRD GERECHNET, NICHT GESTAUCHT (Owner 18.09.2026: „die Schrift in den
 * Postern sehen live nicht gut aus, sie sind verschoben im Grossbild und in der Miniatur") ────
 *
 * Das Blatt rechnet jede Grösse als Anteil seiner Breite. Ein Blatt von 25 px Breite bekommt
 * damit eine Schrift von zwei Pixeln — und genau dort greift der Browser ein: Handys und jede
 * eingestellte Mindestschriftgrösse heben zu kleine Schrift an, aber nur SIE, nicht das Bild und
 * nicht die Ränder. Das Raster verrutscht, Zeilen brechen um, ein Feld bekommt einen
 * Scrollbalken. (Zielgruppe über 60 — vergrösserte Schrift ist dort die Regel, nicht die
 * Ausnahme.)
 *
 * Also wird das Blatt IMMER in voller Grösse gebaut (`REF` Pixel breit) und danach als Ganzes
 * verkleinert: `transform: scale`. Schrift, Ränder, Rahmen und Bild schrumpfen zusammen, exakt
 * im selben Verhältnis — was klein aussieht, ist in Wahrheit ein grosses Blatt. Der Browser
 * findet nichts mehr zum Anheben.
 */
/* 620 px, nicht 420: Bei 400 px Blattbreite misst der Fliesstext 10 px — genau die Grösse, die
   Handys und eingestellte Mindestgrössen anheben. Auf 620 px sind es 16 px, und niemand fasst
   sie mehr an. Grösser lohnt nicht: Dann lädt jede Miniatur ein unnötig grosses Bild. */
const REF = 620;

function Massstab({ breite, kinder, schatten }: {
  /** Die Breite, die das Blatt am Ende haben soll — in Pixeln, gemessen. */
  breite: number;
  kinder: React.ReactNode;
  schatten?: string;
}) {
  const k = breite > 0 ? breite / REF : 0;
  return (
    <span className="block" style={{
      width: `${REF}px`,
      /* ERST schieben, DANN verkleinern (`scale(k) translate(…)`): Prozente im `translate`
         beziehen sich auf die UNSKALIERTE Breite — in der anderen Reihenfolge landet das Blatt
         um zweihundert Pixel daneben. */
      transformOrigin: "top left",
      transform: `scale(${k}) translate(-50%, -50%)`,
      visibility: k ? "visible" : "hidden",
      ...(schatten ? { filter: schatten } : {}),
    }}>{kinder}</span>
  );
}

/**
 * Dasselbe für das GROSSE Blatt, das im Textfluss steht: Es wird in voller Grösse gebaut und auf
 * die verfügbare Breite heruntergerechnet. Der Kasten aussen bekommt die fertige Höhe, damit
 * nichts überlappt.
 *
 * Auch hier geht es um die Schrift (Owner 18.09.2026: „verschoben im Grossbild"): Bei 400 px
 * Blattbreite sind zwei Sätze nur zehn Pixel hoch — knapp unter dem, was Handys und
 * eingestellte Mindestgrössen noch unangetastet lassen. Gebaut wird das Blatt deshalb mit
 * `REF` Pixeln Breite, wo dieselbe Zeile sechzehn Pixel misst.
 */
function MassstabFluss({ breite, children }: { breite: number; children: React.ReactNode }) {
  const [innen, setInnen] = useState<HTMLDivElement | null>(null);
  const [hoch, setHoch] = useState(0);
  useEffect(() => {
    if (!innen || typeof ResizeObserver === "undefined") return;
    /* `offsetHeight`, nicht `getBoundingClientRect`: Letzteres gäbe die bereits verkleinerte
       Höhe zurück — und daraus die neue Höhe zu rechnen, schaukelt sich nach unten weg. */
    const mess = () => setHoch(innen.offsetHeight);
    mess();
    const ro = new ResizeObserver(mess);
    ro.observe(innen);
    return () => ro.disconnect();
  }, [innen]);
  const k = breite > 0 ? breite / REF : 0;
  return (
    <div style={{ height: k && hoch ? `${hoch * k}px` : undefined, overflow: "hidden" }}>
      <div ref={setInnen} style={{ width: `${REF}px`, transformOrigin: "top left", transform: k ? `scale(${k})` : undefined }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Die Breite eines Elements, laufend gemessen — daraus entsteht der Massstab oben.
 *
 * ── EINE MESSUNG, DIE NIE KOMMT, MACHT DAS BLATT UNSICHTBAR (Owner 19.09.2026: „kein Poster an
 * der Wand zu sehen", auf dem iPhone) ────────────────────────────────────────────────────────
 *
 * `Massstab` blendet aus, solange die Breite 0 ist — sonst läge das Blatt für einen Lidschlag
 * in voller Grösse quer über dem Zimmer. Bleibt die Messung aber aus, bleibt es FÜR IMMER
 * unsichtbar: leere Wand, und niemand sieht, dass etwas fehlt.
 *
 * WANN SIE AUSBLEIBT: Die Wandbreite hängt am Zimmerbild. Ist es beim Anhängen des Verweises
 * noch nicht da, misst der erste Griff 0. Der `ResizeObserver` meldet sich danach nur, wenn sich
 * die Box WIRKLICH ändert — steht die Breite in CSS fest, ändert sie sich nie, und es bleibt
 * bei der Null. Am Schreibtisch fällt das nicht auf: Dort ist das Bild vor dem ersten Bild da.
 * Am Telefon im Funknetz nicht.
 *
 * DESHALB WIRD NACHGEFASST: zweimal im nächsten Bildaufbau, beim `load` des Fensters und immer,
 * wenn ein Bild darin fertig wird. Gemessen wird nur, was grösser als null ist — eine Null
 * überschreibt nie einen gültigen Wert.
 */
function useBreite<T extends HTMLElement>() {
  const [breite, setBreite] = useState(0);
  const el = useRef<T | null>(null);
  const messen = useCallback(() => {
    const n = el.current;
    if (!n) return;
    const b = n.getBoundingClientRect().width;
    if (b > 0) setBreite(alt => (alt === b ? alt : b));
  }, []);
  const setzen = useCallback((n: T | null) => { el.current = n; if (n) messen(); }, [messen]);
  useEffect(() => {
    const n = el.current;
    if (!n) return;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(messen) : null;
    ro?.observe(n);
    /* Zwei Bildaufbauten später steht das Raster; danach nur noch, wenn wirklich etwas nachlädt. */
    const r1 = requestAnimationFrame(() => { messen(); requestAnimationFrame(messen); });
    const spaet = window.setTimeout(messen, 600);
    window.addEventListener("load", messen);
    const bilder = Array.from(n.querySelectorAll("img"));
    bilder.forEach(b => b.addEventListener("load", messen));
    return () => {
      ro?.disconnect();
      cancelAnimationFrame(r1);
      window.clearTimeout(spaet);
      window.removeEventListener("load", messen);
      bilder.forEach(b => b.removeEventListener("load", messen));
    };
  }, [messen]);
  return [setzen, breite] as const;
}

/**
 * ── DIE FILM-FOLIE (Owner 20.09.2026: „du machst das Video als extra Slide" · „Poster,
 * Ladebalken, Timeline") ─────────────────────────────────────────────────────────────────────
 *
 * Eine eigene kleine Komponente, weil sie ihre eigene Uhr braucht (`zeit`, `dauer`, `laedt`) —
 * anders als die Zimmer, die nur ein `<img>` sind. Sie wird nur gebaut, solange ihre Folie
 * aktiv ist (`PosterRaeume` hängt sie sonst gar nicht erst ein): Wischt man weiter, hält der
 * Film an, statt im Hintergrund weiterzulaufen und Daten zu verbrauchen.
 *
 * TON AUS, ABER ANFASSBAR: Anders als auf Folie 0 (dort lief kein Ton) ist diese Folie eine
 * bewusste Entscheidung — wischen bis hierher heisst, den Film sehen zu wollen. Stumm startet
 * er trotzdem (das lässt jeder Browser zu), der Lautsprecher-Knopf macht ihn auf Wunsch laut.
 */
function FilmFolie({ quelle, poster, bild, alt }: { quelle: string; poster: string; bild: string; alt: string }) {
  const video = useRef<HTMLVideoElement>(null);
  /**
   * ── MUSIK IM HINTERGRUND (Owner 20.09.2026) ──────────────────────────────────────────────
   *
   * Das Versprechen des Living Poster ist genau das: „Atunci pornește muzica" — scannen, und
   * die Musik geht an. Dieselbe Datei und derselbe Pegel wie beim Sprecher-Ton im QR-Fenster
   * (`components/PosterFilm.tsx`, `musik`), leise unter dem Film, nicht darüber.
   */
  const musik = useRef<HTMLAudioElement>(null);
  const [laedt, setLaedt] = useState(true);
  const [laeuft, setLaeuft] = useState(false);
  /**
   * ── MIT TON, NICHT STUMM (Owner 20.09.2026: „Video soll mit Sound starten nicht mute") ────
   *
   * Solange der Film von selbst anlief (`autoPlay`), musste er stumm bleiben — kein Browser
   * erlaubt Ton ohne Berührung. Jetzt startet er erst durch den Druck auf den Play-Knopf, und
   * das IST die Berührung: Ton ist von Anfang an erlaubt, also auch von Anfang an an.
   */
  const [stumm, setStumm] = useState(false);
  const [zeit, setZeit] = useState(0);
  const [dauer, setDauer] = useState(0);
  /**
   * ── ERST DER KNOPF, DANN DER FILM (Owner 20.09.2026: „Video startet nicht automatisch,
   * sondern mit Playbutton") ────────────────────────────────────────────────────────────────
   *
   * Bis heute lief der Film von selbst an, sobald die Folie aktiv wurde (`autoPlay`, stumm).
   * Jetzt steht erst das Standbild, mit einem Kreis zum Antippen — wie beim Sprecher-Film im
   * QR-Fenster ([[luxurybandit-video-qr-fenster]]). Erst der Druck lädt und startet den Film;
   * bis dahin liegt nichts im Hintergrund, das Daten verbraucht.
   */
  const [gestartet, setGestartet] = useState(false);
  /* Einmal starten, mit Ton — der Druck auf den Play-Knopf war die Berührung, die das erlaubt. */
  useEffect(() => {
    if (!gestartet) return;
    const v = video.current;
    if (!v) return;
    v.muted = false;
    void v.play().catch(() => {});
  }, [gestartet]);
  /**
   * ── DAS STANDBILD KOMMT AUS DEM FILM (Owner 20.09.2026: „Poster für Video muss aus dem Video
   * kommen") ─────────────────────────────────────────────────────────────────────────────────
   *
   * `poster` ist ein Bild AUS DEM FILM (`api/portal-film?art=filmposter`) — bisher von Hand
   * herausgeschnitten, für Werke ohne eigenes noch nicht vorhanden. Fehlt die Datei (404),
   * fällt die Folie auf das Werkbild zurück, statt gar kein Standbild zu zeigen.
   */
  const [standbild, setStandbild] = useState(poster);
  useEffect(() => setStandbild(poster), [poster]);
  return (
    <div className="absolute inset-0 overflow-hidden rounded-xl bg-black"
      onClick={e => e.stopPropagation()}>
      {/* Nur zum Prüfen, ob es das Standbild aus dem Film gibt — unsichtbar, lädt aus dem
          Zwischenspeicher, sobald das Standbild gleich danach als `<img>` oder `poster=`
          dieselbe Adresse anfragt. */}
      {standbild === poster ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={poster} alt="" hidden aria-hidden onError={() => setStandbild(bild)} />
      ) : null}
      {!gestartet ? (
        <button type="button" aria-label="Play"
          /* ── MUSIK STARTET MIT DEM DRUCK, NICHT ERST MIT DEM FILM (Owner 20.09.2026: „Musik
             soll starten mit Playbutton auch") ────────────────────────────────────────────────
             Bisher hing die Musik am `onPlaying` des Videos — bis der Film wirklich lief (laden,
             Puffer), blieb es stumm. Der Knopf selbst ist eine Berührung: Genau hier darf auch
             die Musik los, ohne auf das Video zu warten. */
          onClick={() => {
            setGestartet(true);
            const m = musik.current;
            if (m) { m.volume = 0.2; void m.play().catch(() => {}); }
          }}
          className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={standbild} alt="" className="absolute inset-0 h-full w-full object-cover" />
          {/* ── DAS INTRO (Owner 20.09.2026: „ich brauche einen Intro. 'The story behind the
              picture' … am besten übers Video. Das bei allen Videos" · „nein nicht so, über das
              ganze Bild ganz fett") ───────────────────────────────────────────────────────────
              Erst stand hier eine kleine, kursive Zeile oben — zu leise für ein Intro. Jetzt
              liegt der Satz GROSS und FETT über der Mitte des ganzen Bildes, wie ein Titel, den
              man vom Poster kennt (Owner 15.09.2026, drop-shadow statt Verlaufsstreifen: das
              Standbild soll unter der Schrift sichtbar bleiben, nicht dahinter verschwinden).
              Steht auf JEDER Film-Folie, nicht nur hier. Verschwindet mit dem Standbild selbst,
              sobald der Film läuft: dann erzählt er es selbst. Englisch, absichtlich nicht
              übersetzt — wie „LIVING POSTER" ein Markenwort, keine Beschreibung (`POSTER_TITEL`
              in lib/lakatosbandi-poster.ts). */}
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/20 px-6 text-center">
            {/* Owner 20.09.2026: 32px → „500%" (160px) → „jetzt 200% kleiner" (72px) — die Grösse
                ist bewusst in Schritten gesucht, nicht berechnet: jeder Wert ist die Antwort auf
                den vorigen. */}
            <span className="font-sans text-[72px] font-black uppercase leading-[0.98] tracking-tight text-white [text-shadow:0_3px_20px_rgba(0,0,0,.7)]">
              The story behind the picture
            </span>
            {/* Owner 20.09.2026: „Playbutton fehlt" — er war da, aber halb durchsichtig auf
                heller Wand kaum zu sehen. Jetzt ganz weiss, mit einem Ring, der ihn von JEDEM
                Untergrund abhebt, nicht nur von einem dunklen Bild. */}
            <span className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-white shadow-[0_6px_24px_rgba(0,0,0,.5)] ring-2 ring-black/10">
              <Play className="ml-[3px] h-7 w-7 text-[#111]" aria-hidden />
            </span>
          </span>
        </button>
      ) : (
        /* eslint-disable-next-line jsx-a11y/media-has-caption */
        /* `ref={video}`, KEINE Funktion (20.09.2026, „ich kann das Video nicht stoppen"): Eine
           Funktion an `ref` ist bei jedem Neuzeichnen eine NEUE — React ruft sie dann wieder auf.
           Stand darin `play()`, lief der Film nach jedem Pause-Druck sofort weiter: Pause →
           `onPause` setzt den Zustand → neu zeichnen → `play()`. Gestartet wird jetzt EINMAL,
           im Effekt unten, wenn der Knopf gedrückt wurde. */
        <video ref={video}
          src={quelle} poster={standbild} loop playsInline preload="auto"
          aria-label={alt}
          onTimeUpdate={e => setZeit(e.currentTarget.currentTime)}
          onLoadedMetadata={e => setDauer(e.currentTarget.duration)}
          onCanPlay={() => setLaedt(false)}
          onPlaying={() => {
            setLaedt(false); setLaeuft(true);
            const m = musik.current;
            if (m) { m.volume = 0.2; void m.play().catch(() => {}); }
          }}
          onPause={() => { setLaeuft(false); musik.current?.pause(); }}
          onEnded={() => { const m = musik.current; if (m) { m.pause(); m.currentTime = 0; } }}
          className="absolute inset-0 h-full w-full object-cover" />
      )}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={musik} src="/lakatosbandi/stimme-musik.mp3" loop preload="none" />
      {/* ── LADEBALKEN (Owner 20.09.2026) ────────────────────────────────────────────────────
          Bis das erste Bild da ist, steht das Standbild (`poster=`); der Balken sagt „es
          kommt", statt dass die Folie einfach schwarz und tot aussieht. */}
      {gestartet && laedt ? (
        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-3">
          <div className="h-[3px] w-[100px] overflow-hidden rounded-full bg-white/25">
            <div className="h-full w-1/3 animate-[lbLauf_1.1s_ease-in-out_infinite] rounded-full bg-white/85" />
          </div>
        </div>
      ) : null}
      {/* ── DIE TIMELINE (Owner 20.09.2026) ──────────────────────────────────────────────────
          Play/Pause, Regler, Lautsprecher — dieselben drei wie im QR-Fenster
          ([[luxurybandit-video-qr-fenster]]), nur schmaler, weil die Folie es ist. */}
      {gestartet && !laedt ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-2.5"
          onPointerDown={e => e.stopPropagation()}>
          <button type="button" aria-label={laeuft ? "Pauză" : "Play"}
            onClick={() => { const v = video.current; if (!v) return; if (v.paused) void v.play().catch(() => {}); else v.pause(); }}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/90 text-[#111]">
            {laeuft ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="ml-[1px] h-3.5 w-3.5" aria-hidden />}
          </button>
          <input type="range" min={0} max={Math.max(dauer, 0.1)} step={0.1} value={zeit}
            aria-label="Poziție"
            onChange={e => { const v = video.current; const t = Number(e.target.value); if (v) v.currentTime = t; setZeit(t); }}
            className="h-1 w-full cursor-pointer accent-white" />
          <button type="button" aria-label={stumm ? "Sunet" : "Fără sunet"}
            onClick={() => { const v = video.current; if (v) { v.muted = !v.muted; setStumm(v.muted); } }}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/90">
            {stumm ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function PosterRaeume({ children, blatt, hoch = true, aus = false, film, adresse }: {
  /** Folie 0: das Werk mit allem Werkzeug. */
  children: React.ReactNode;
  /** Dasselbe Blatt ohne Werkzeug — das hängt an der Wand. */
  blatt: React.ReactNode;
  /** Hochkant hängt schmaler an der Wand als quer. */
  hoch?: boolean;
  /** Ohne Postershop (Originale, Kleidung) gibt es nichts zu hängen: nur das Werk. */
  aus?: boolean;
  /**
   * ── DER FILM IST EINE EIGENE FOLIE, KEIN ERSATZ FÜR DAS BLATT (Owner 20.09.2026: „du machst
   * das Video als extra Slide" — nach dem ersten Versuch, ihn IN Folie 0 laufen zu lassen) ────
   *
   * Folie 0 bleibt, was sie war: das Werk, still, mit allem Werkzeug. Hat das Werk einen Film,
   * hängt er DAHINTER als eigenes Blatt im selben Slider — wischen statt klicken, dieselbe
   * Geste wie zu den Zimmern. Ohne `film` fehlt die Folie ganz, wie bisher.
   */
  film?: { quelle: string; poster: string; bild: string; alt: string };
  /**
   * ── JEDE FOLIE HAT IHRE ADRESSE (Owner 20.09.2026: „jeder Slider soll eine eigene URL haben")
   *
   * Nur auf der Seite EINES Werks (`app/portal/[kuenstler]/[werk]`): Dort gibt es genau einen
   * Slider, also kann `?slide=` eindeutig sagen, welche Folie offen ist. In der Übersicht hängen
   * mehrere Slider untereinander — ein Anhänger für alle wäre dort gelogen.
   *
   * `?slide=2` … `5` sind die Zimmer (dieselben Nummern wie auf den Miniaturen), `?slide=video`
   * der Film; das Blatt selbst ist die Adresse ohne Anhänger. `start` kommt vom Server, damit
   * die richtige Folie schon im ersten HTML steht — wer den Link öffnet, sieht kein Umspringen.
   */
  adresse?: { start?: string;
    /** `false`: nur mit dieser Folie STARTEN, die Adresse aber nicht anfassen — für den Slider
        im Journal-Artikel, dessen Adresse dem Artikel gehört (Owner 20.09.2026). */
    schreiben?: boolean };
}) {
  const startFolie = (() => {
    const w = String(adresse?.start ?? "").trim().toLowerCase();
    if (w === "video") return film ? RAEUME.length + 1 : 0;
    const n = Number(w);
    return Number.isInteger(n) && n >= 2 && n <= RAEUME.length + 1 ? n - 1 : 0;
  })();
  const [i, setIRoh] = useState(startFolie);
  /* Die Adresse folgt der Folie — `replaceState`, nicht `pushState`: Wer fünf Zimmer durchblättert,
     soll mit EINEM „Zurück" die Seite verlassen, nicht fünfmal rückwärts blättern müssen. */
  const setI = (n: number) => {
    setIRoh(n);
    if (!adresse || adresse.schreiben === false || typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const wert = n === 0 ? "" : film && n === RAEUME.length + 1 ? "video" : String(n + 1);
    if (wert) u.searchParams.set("slide", wert); else u.searchParams.delete("slide");
    window.history.replaceState(window.history.state, "", u.toString());
  };
  /** Die Folie mit dem Film — an letzter Stelle, nach allen Zimmern (Owner 20.09.2026: „als
      letzte Position"). Die Zimmer behalten ihre Nummern, nichts rückt für sie zusammen. */
  const filmSlide = film ? RAEUME.length + 1 : -1;
  /* ── SEIN BILD HÄNGT MIT AN DER WAND (Owner 18.09.2026: „auch das Bild muss dann an die Wand
     gesehen werden" · „das hochgeladene und das generierte") ─────────────────────────────────
     `PosterDeinBild` trägt hier ein, was gerade im Blatt steht; die Zimmer und die Miniaturen
     lesen es (siehe components/PosterWandBild.tsx). */
  const [wandBild, setWandBild] = useState<string | null>(null);
  /* Und seine Zeilen — sie hängen an derselben Wand wie sein Bild (Owner 19.09.2026). */
  const [wandZeilen, setWandZeilen] = useState({ titel: "", satz: "" });
  /* Gemessen wird je EIN Vertreter: alle Zimmer sind gleich breit, alle Miniaturen auch. */
  const [zimmerRef, zimmerBreite] = useBreite<HTMLDivElement>();
  const [miniRef, miniBreite] = useBreite<HTMLSpanElement>();
  const [mini0Ref, mini0Breite] = useBreite<HTMLSpanElement>();
  const [folieRef, folieBreite] = useBreite<HTMLDivElement>();
  const wand = useMemo(() => ({ bild: wandBild, setBild: setWandBild, zeilen: wandZeilen, setZeilen: setWandZeilen }), [wandBild, wandZeilen]);
  if (aus) return <WandBildContext.Provider value={wand}>{children}</WandBildContext.Provider>;

  return (
    <WandBildContext.Provider value={wand}>
    <div>
      {/* ── DER KASTEN SPRINGT NICHT (Owner 18.09.2026: „wieso sind die Slider unterschiedlich
          gross, also höher als das Poster, es springt") ────────────────────────────────────────
          Die Höhe gibt IMMER das Poster vor: Folie 0 bleibt im Layout stehen (nur unsichtbar),
          die Zimmer legen sich darüber. So bleibt der Kasten beim Blättern gleich hoch — und der
          Kaufknopf darunter bleibt, wo der Finger ihn erwartet.

          Folie 0 bleibt ausserdem IM DOM, sonst verliert das Werkzeug (gewählter Rahmen,
          erzeugtes Bild, geänderter Text) seinen Zustand. */}
      <div ref={folieRef} className="relative">
        <div className={i === 0 ? "" : "invisible"}>
          <MassstabFluss breite={folieBreite}>{children}</MassstabFluss>
        </div>

        {/* Die Film-Folie — nur eingehängt, solange sie aktiv ist (Owner 20.09.2026). */}
        {film && i === filmSlide ? (
          <FilmFolie quelle={film.quelle} poster={film.poster} bild={film.bild} alt={film.alt} />
        ) : null}

        {RAEUME.map((datei, k) => (
          i !== k + 1 ? null : (
            <div key={datei} className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl bg-[#f2f1ed]">
              {/* Das Bild so hoch wie der Kasten, der Wrapper genau so breit wie das Bild —
                  darauf beziehen sich die Prozente oben. */}
              <div ref={zimmerRef} className="relative h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={datei} alt="" loading="lazy" className="block h-full w-auto" />
                <span className="absolute block"
                  style={{
                    left: `${BLATT.links}%`, top: `${BLATT.oben}%`,
                    /* ── EIN KLEINER, HARTER SCHATTEN (Owner 18.09.2026: „ich brauch doch einen
                       Schatten an die Wand, aber ganz klein und nicht weich") ──────────────────
                       Erst war er zu gross, dann ganz weg — und dann klebte das Blatt flach auf
                       dem Foto wie aufgedruckt. Ein Rahmen steht zwei Zentimeter von der Wand ab:
                       kurzer Versatz nach rechts unten, kaum Weichzeichner, das reicht. Nur in der
                       grossen Folie — auf einer 64px-Miniatur wäre er nur Schmutz. */
                  }}>
                  <Massstab breite={zimmerBreite * BLATT.breite / 100}
                    schatten="drop-shadow(3px 4px 2px rgba(0,0,0,.42))" kinder={blatt} />
                </span>
              </div>
            </div>
          )
        ))}
      </div>

      {/* ── MINIATUREN STATT PUNKTE (Owner 18.09.2026: „brauche die Miniaturen, nicht Punkte
          unter dem Bild für den Slider") ───────────────────────────────────────────────────
          Ein Punkt sagt nur, DASS es weitergeht. Eine Miniatur zeigt, WOHIN.

          UND AUF DER MINIATUR HÄNGT DAS BLATT (Owner 18.09.2026: „was soll die leere Wand im
          Kachel, die Bilder müssen drauf") — ein leeres Zimmer sieht aus wie ein Möbelkatalog.
          Deshalb steht in jeder Kachel dasselbe Bauwerk wie in der Folie, nur klein: Das Blatt
          rechnet in Container-Einheiten und schrumpft samt Rahmen von allein mit. */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {/* Kachel 0: das Blatt allein — das ist Folie 0. */}
        <button type="button" onClick={() => setI(0)} aria-label="1"
          className={`flex h-[86px] w-[64px] items-center justify-center overflow-hidden rounded-md border bg-white p-[3px] transition ${
            i === 0 ? "border-[#111]" : "border-[#ddd4c0] hover:border-[#999]"}`}>
          <span ref={mini0Ref} className="relative block h-full w-full">
            <span className="absolute block" style={{ left: "50%", top: "50%" }}>
              <Massstab breite={mini0Breite * 0.96} kinder={blatt} />
            </span>
          </span>
        </button>

        {RAEUME.map((datei, k) => (
          <button key={datei} type="button" onClick={() => setI(k + 1)} aria-label={`${k + 2}`}
            className={`flex h-[86px] w-[64px] items-center justify-center overflow-hidden rounded-md border bg-[#f2f1ed] p-0 transition ${
              i === k + 1 ? "border-[#111]" : "border-[#ddd4c0] hover:border-[#999]"}`}>
            <span ref={k === 0 ? miniRef : undefined} className="relative block h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* ── DIE MINIATUR LÄDT EIN KLEINES ZIMMER (Owner 20.09.2026: „ich hoffe die Poster an
                  der Wand sind klein und werden auf dem Handy sofort geladen, sonst ist die ganze
                  Arbeit umsonst") ─────────────────────────────────────────────────────────────
                  GEMESSEN: Hier stand dasselbe Foto wie in der grossen Folie — 1100 px breit,
                  zusammen 570 KB, um vier Kacheln von 64 px zu füllen. `-klein` ist 240 px breit
                  (scharf auch auf einem Dreifach-Display) und wiegt zusammen rund 40 KB. Das
                  grosse Foto lädt erst, wenn jemand das Zimmer wirklich öffnet. */}
              <img src={datei.replace(/\.jpg$/, "-klein.jpg")} alt="" loading="lazy" className="block h-full w-auto max-w-none" />
              <span className="absolute block"
                style={{ left: `${BLATT.links}%`, top: `${BLATT.oben}%` }}>
                {/**
                  * ── IN DER MINIATUR GILT DERSELBE MASSSTAB WIE IM RAUM (Owner 18.09.2026:
                  * „und die Poster auch zu gross in den Miniaturen" · „nein, das habe ich nie so
                  * gemeint. Ich bin nicht blöd") ──────────────────────────────────────────────
                  *
                  * HIER STAND EIN AUFSCHLAG VON 45 %, begründet mit seinem Satz „was soll die
                  * leere Wand im Kachel". Der Satz sagt, dass eine Kachel nicht leer wirken soll —
                  * er sagt NICHT, dass das Blatt grösser sein soll, als es an der Wand hängt. Die
                  * Begründung hat ihm etwas in den Mund gelegt, und das Ergebnis sah aus wie eine
                  * Tapete statt wie ein Bild.
                  *
                  * OHNE AUFSCHLAG ist die Miniatur eine verkleinerte Fassung des Raumbildes
                  * daneben — dieselbe Wand, dasselbe Verhältnis.
                  */}
                <Massstab breite={miniBreite * BLATT.breite / 100}
                  kinder={blatt} />
              </span>
            </span>
          </button>
        ))}

        {/* ── DIE FILM-MINIATUR STEHT AM ENDE (Owner 20.09.2026: „als letzte Position") ────────
            Nach allen Zimmern, nicht direkt hinter Folie 0 — sie ist ein Extra, kein Ersatz für
            eines der Zimmer. Mit einem Play-Zeichen, sonst sähe sie aus wie ein zweites
            Werkbild. */}
        {film ? (
          <button type="button" onClick={() => setI(filmSlide)} aria-label="Video"
            className={`relative flex h-[86px] w-[64px] items-center justify-center overflow-hidden rounded-md border bg-black p-0 transition ${
              i === filmSlide ? "border-[#111]" : "border-[#ddd4c0] hover:border-[#999]"}`}>
            {/* Dasselbe Standbild wie in der Folie — fehlt es, das Werkbild (Owner 20.09.2026:
                „Poster für Video muss aus dem Video kommen"). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={film.poster} alt="" loading="lazy" className="h-full w-full object-cover opacity-80"
              onError={e => { e.currentTarget.src = film.bild; }} />
            <span className="absolute grid h-6 w-6 place-items-center rounded-full bg-white/90 text-[#111]">
              <Play className="ml-[1px] h-3 w-3" aria-hidden />
            </span>
          </button>
        ) : null}
      </div>
    </div>
    </WandBildContext.Provider>
  );
}
