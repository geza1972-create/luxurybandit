"use client";

import { useEffect, useRef, useState, type FormEvent, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import s from "./water.module.css";
import { TEXTE, type Sprache, type Texte } from "./texte";

/**
 * DIE DATEIEN (Owner 28.09.2026, aus dem Drive-Ordner „Kaktus_Projekt"):
 *   hero.jpg     — der Raum MIT Wasser (Hero-Kaktus.png)
 *   trocken.jpg  — derselbe Raum OHNE Wasser (Hero-Kaktus-2.png), deckungsgleich
 *   film.mp4     — das Wasser verschwindet (PixVerse, 5 s), mit ffmpeg auf Faststart gebracht
 *   film-poster.jpg — sein erstes Bild
 *
 * DAS VIDEO SPIELT NICHT VON SELBST (Owner: „das Video braucht einen Poster mit Playbutton, sonst
 * wird es wieder zu gross und erscheint nicht auf dem Handy"). Bis zum Tipp lädt das Handy nur
 * das Standbild — siehe `Film`. Die Bewegung im Hero kommt stattdessen aus den zwei Standbildern,
 * die langsam ineinander überblenden — Wasser da, Wasser weg.
 */
const P = "/lakatosbandi/cactus-project";
const DATEIEN = {
  nass: `${P}/hero.jpg`,
  nassSet: `${P}/hero-960.jpg 960w, ${P}/hero.jpg 1672w`,
  trocken: `${P}/trocken.jpg`,
  trockenSet: `${P}/trocken-960.jpg 960w, ${P}/trocken.jpg 1672w`,
  film: `${P}/film.mp4`,
  /* Die YouTube-Kennung (ungelistet, Kanal des Hauses). Leer = unsere Datei spielt. Der Upload
     scheiterte am 28.09.2026 am abgelaufenen YT_REFRESH_TOKEN — nach dem Erneuern hier eintragen. */
  youtube: "",
  poster: `${P}/film-poster.jpg`,
};

/* ── Bewegung: langsames Einblenden und ein Hauch Parallaxe. Wer weniger Bewegung will, bekommt keine. */
function useBewegung(wurzel: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = wurzel.current;
    if (!el) return;
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const teile = Array.from(el.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (ruhig || !("IntersectionObserver" in window)) {
      teile.forEach((t) => t.setAttribute("data-sichtbar", ""));
      return;
    }
    const beob = new IntersectionObserver(
      (eintraege) =>
        eintraege.forEach((e) => {
          if (e.isIntersecting) {
            e.target.setAttribute("data-sichtbar", "");
            beob.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    teile.forEach((t) => beob.observe(t));

    const schichten = Array.from(el.querySelectorAll<HTMLElement>("[data-parallax]"));
    let rahmen = 0;
    const rechnen = () => {
      rahmen = 0;
      const h = window.innerHeight;
      for (const sch of schichten) {
        const r = sch.parentElement!.getBoundingClientRect();
        if (r.bottom < 0 || r.top > h) continue;
        const staerke = Number(sch.dataset.parallax) || 0.08;
        const mitte = r.top + r.height / 2 - h / 2;
        sch.style.transform = `translate3d(0, ${(-mitte * staerke).toFixed(1)}px, 0) scale(1.08)`;
      }
    };
    const beimScrollen = () => {
      if (!rahmen) rahmen = requestAnimationFrame(rechnen);
    };
    rechnen();
    window.addEventListener("scroll", beimScrollen, { passive: true });
    window.addEventListener("resize", beimScrollen);
    return () => {
      beob.disconnect();
      window.removeEventListener("scroll", beimScrollen);
      window.removeEventListener("resize", beimScrollen);
      if (rahmen) cancelAnimationFrame(rahmen);
    };
  }, [wurzel]);
}

/* Ein Bild, das nie kaputt aussieht: fehlt die Datei, bleibt eine ruhige Erdfläche stehen. */
function Bild({ src, srcSet, alt, className, parallax, sizes, lage }: { src: string; srcSet?: string; alt: string; className?: string; parallax?: number; sizes?: string; lage?: string }) {
  const [fehlt, setFehlt] = useState(false);
  return (
    <div className={`${s.bildRahmen} ${className ?? ""}`}>
      <div className={s.bildSchicht} data-parallax={parallax ?? undefined}>
        {fehlt ? (
          <div className={s.ersatz} role="img" aria-label={alt} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            srcSet={srcSet}
            alt={alt}
            sizes={sizes ?? "100vw"}
            loading="lazy"
            decoding="async"
            style={lage ? { objectPosition: lage } : undefined}
            onError={() => setFehlt(true)}
            className={s.bild}
          />
        )}
      </div>
    </div>
  );
}

function Abschnitt({ id, label, nummer, children, className }: { id: string; label: string; nummer: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-titel`} className={`${s.abschnitt} ${className ?? ""}`}>
      <p className={s.marke} data-reveal>
        <span>{nummer}</span>
        <span>{label}</span>
      </p>
      {children}
    </section>
  );
}

function Zweizeilig({ z }: { z: readonly [string, string] | readonly string[] }) {
  return (
    <>
      {z[0]} <em>{z[1]}</em>
    </>
  );
}

function Hero({ T }: { T: Texte }) {
  return (
    <header className={s.hero}>
      {/* Wasser da → Wasser weg → Wasser da: zwei deckungsgleiche Standbilder, sehr langsam. */}
      <div className={s.heroMedien}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={DATEIEN.nass} srcSet={DATEIEN.nassSet} sizes="100vw" alt={T.heroAlt} className={s.heroBild} fetchPriority="high" decoding="async" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={DATEIEN.trocken} srcSet={DATEIEN.trockenSet} sizes="100vw" alt="" aria-hidden="true" className={`${s.heroBild} ${s.heroTrocken}`} decoding="async" />
        <div className={s.heroSchleier} />
      </div>
      <div className={s.heroText}>
        <h1 className={s.heroTitel}>
          {T.heroZeilen.map((z) => (
            <span key={z}>{z}</span>
          ))}
        </h1>
        <p className={s.heroUnter}>{T.heroUnter}</p>
      </div>
      <a href="#absence" className={s.scroll} aria-label={T.scrollAria}>
        <span className={s.scrollLinie} />
      </a>
    </header>
  );
}

/**
 * DER FILM — GENAU WIE IM PORTAL (Owner 28.09.2026: „die Videos zeigen wir doch ganz anders …
 * Playbutton stimmt nicht und fehlt die Videoleiste" · „und das muss auf YouTube").
 *
 * Dasselbe Muster wie `PosterFilm`: erst das Standbild mit der weissen 74-px-Scheibe, nichts wird
 * geladen. Der Druck startet den Film MIT Ton. Liegt eine YouTube-Kennung vor (`DATEIEN.youtube`),
 * spielt der YouTube-Spieler (nocookie) mit seiner eigenen Leiste; sonst unsere Datei mit der
 * Portal-Leiste darunter: Play/Pause · Position · Zeit · Ton · Vollbild. Unsere Datei bleibt als
 * Rückfall, falls das Video bei YouTube einmal verschwindet.
 */
function Film({ T }: { T: Texte }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const startVersucht = useRef(false);
  const [gestartet, setGestartet] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [zeit, setZeit] = useState(0);
  const [dauer, setDauer] = useState(0);
  const [stumm, setStumm] = useState(false);

  return (
    <div className={s.film}>
      {DATEIEN.youtube && gestartet ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(DATEIEN.youtube)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={T.filmAria}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          className="aspect-[1024/592] w-full rounded-[14px] border-0"
        />
      ) : !gestartet ? (
        <span className="relative block leading-[0]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DATEIEN.poster} alt={T.filmAria} loading="lazy" className="w-full rounded-[14px] object-contain" />
          <button
            type="button"
            aria-label={T.filmPlay}
            onClick={() => {
              setLaedt(true);
              setGestartet(true);
            }}
            className="absolute inset-0 grid place-items-center"
          >
            <span className="grid h-[74px] w-[74px] place-items-center rounded-full bg-white/92 shadow-[0_6px_24px_rgba(0,0,0,.45)]">
              <Play className="ml-[3px] h-7 w-7 text-[#111]" aria-hidden />
            </span>
          </button>
        </span>
      ) : (
        <>
          <span className="relative block leading-[0]">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={(el) => {
                video.current = el;
                /* Er hat gerade selbst gedrückt — ein Versuch genügt, mit Ton. */
                if (el && !startVersucht.current) {
                  startVersucht.current = true;
                  el.muted = false;
                  el.volume = 1;
                  void el.play().catch(() => {});
                }
              }}
              src={DATEIEN.film}
              poster={DATEIEN.poster}
              playsInline
              preload="auto"
              aria-label={T.filmAria}
              onTimeUpdate={(e) => setZeit(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDauer(e.currentTarget.duration)}
              onVolumeChange={(e) => setStumm(e.currentTarget.muted)}
              onCanPlay={() => setLaedt(false)}
              onPlaying={() => {
                setLaedt(false);
                setLaeuft(true);
              }}
              onPause={() => setLaeuft(false)}
              onEnded={() => setLaeuft(false)}
              className="w-full rounded-[14px]"
            />
            {laedt && (
              <span className="absolute inset-0 grid place-items-center" aria-hidden>
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </span>
            )}
          </span>
          <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-white/12 px-2.5 py-2">
            <button
              type="button"
              aria-label={laeuft ? T.filmPause : T.filmPlay}
              onClick={() => {
                const v = video.current;
                if (!v) return;
                if (v.paused) {
                  v.muted = false;
                  void v.play().catch(() => {});
                } else v.pause();
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#111]"
            >
              {laeuft ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="ml-[2px] h-4 w-4" aria-hidden />}
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(dauer, 0.1)}
              step={0.1}
              value={zeit}
              aria-label={T.filmPosition}
              onChange={(e) => {
                const v = video.current;
                if (v) {
                  v.currentTime = Number(e.target.value);
                  setZeit(Number(e.target.value));
                }
              }}
              className="h-1 w-full cursor-pointer accent-white"
            />
            <span className="shrink-0 font-serif text-[13px] tabular-nums text-white/80">
              {`${Math.floor(zeit / 60)}:${String(Math.floor(zeit % 60)).padStart(2, "0")}`}
            </span>
            <button
              type="button"
              aria-label={stumm ? T.filmTon : T.filmStumm}
              onClick={() => {
                const v = video.current;
                if (v) {
                  v.muted = !v.muted;
                  setStumm(v.muted);
                }
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/90 hover:bg-white/15"
            >
              {stumm ? <VolumeX className="h-[18px] w-[18px]" aria-hidden /> : <Volume2 className="h-[18px] w-[18px]" aria-hidden />}
            </button>
            <button
              type="button"
              aria-label={T.filmVollbild}
              onClick={() => {
                const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
                if (!v) return;
                /* Auf dem iPhone kennt nur das VIDEO Vollbild. */
                if (v.requestFullscreen) void v.requestFullscreen().catch(() => v.webkitEnterFullscreen?.());
                else v.webkitEnterFullscreen?.();
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/90 hover:bg-white/15"
            >
              <Maximize2 className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * MIT WASSER / OHNE WASSER — ein Regler über zwei deckungsgleichen Bildern. Ziehen mit Finger
 * oder Maus; `touch-action: pan-y` lässt das senkrechte Scrollen am Handy weiter zu. Für die
 * Tastatur liegt ein echter Schieberegler darüber (unsichtbar, aber fokussierbar).
 */
function Vergleich({ T }: { T: Texte }) {
  const [pos, setPos] = useState(50);
  const flaeche = useRef<HTMLDivElement>(null);
  const zieht = useRef(false);

  const setzen = (x: number) => {
    const r = flaeche.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)));
  };
  const runter = (e: RPointerEvent<HTMLDivElement>) => {
    zieht.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setzen(e.clientX);
  };

  return (
    <figure className={s.vergleich} data-reveal>
      <div
        ref={flaeche}
        className={s.vergleichFlaeche}
        onPointerDown={runter}
        onPointerMove={(e) => zieht.current && setzen(e.clientX)}
        onPointerUp={() => (zieht.current = false)}
        onPointerCancel={() => (zieht.current = false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={DATEIEN.nass} srcSet={DATEIEN.nassSet} sizes="100vw" alt={T.heroAlt} className={s.vergleichBild} loading="lazy" decoding="async" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={DATEIEN.trocken}
          srcSet={DATEIEN.trockenSet}
          sizes="100vw"
          alt={T.trockenAlt}
          className={s.vergleichBild}
          style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <span className={`${s.vergleichEtikett} ${s.links}`}>{T.mitWasser}</span>
        <span className={`${s.vergleichEtikett} ${s.rechts}`}>{T.ohneWasser}</span>
        <span className={s.vergleichLinie} style={{ left: `${pos}%` }} aria-hidden="true">
          <span className={s.vergleichGriff}>
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(pos)}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label={T.reglerAria}
          className={s.vergleichRegler}
        />
      </div>
      <figcaption className={s.vergleichHinweis}>{T.reglerHinweis}</figcaption>
    </figure>
  );
}

function PartnerFormular({ T, sprache }: { T: Texte; sprache: Sprache }) {
  const [stand, setStand] = useState<"offen" | "sendet" | "fertig">("offen");
  const [fehler, setFehler] = useState<Record<string, string>>({});
  const [art, setArt] = useState<string[]>([]);

  async function absenden(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const email = String(f.get("email") ?? "").trim();
    const institution = String(f.get("institution") ?? "").trim();
    const nachricht = String(f.get("message") ?? "").trim();
    const neu: Record<string, string> = {};
    if (name.length < 2) neu.name = T.eName;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) neu.email = T.eEmail;
    if (nachricht.length < 5) neu.message = T.eNachricht;
    setFehler(neu);
    if (Object.keys(neu).length) return;

    setStand("sendet");
    const kopf = [
      `Partner enquiry — WHAT REMAINS WHEN WATER DISAPPEARS? (Bandi Szidonia) · ${sprache.toUpperCase()}`,
      institution ? `Institution / company: ${institution}` : "",
      art.length ? `Type of support: ${art.join(", ")}` : "",
    ].filter(Boolean);
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, reason: "general", message: `${kopf.join("\n")}\n\n${nachricht}`, company: String(f.get("company") ?? "") }),
      });
      if (!r.ok) {
        setFehler({ form: T.eSenden });
        setStand("offen");
        return;
      }
      setStand("fertig");
    } catch {
      setFehler({ form: T.eNetz });
      setStand("offen");
    }
  }

  if (stand === "fertig") {
    return (
      <div className={s.danke} role="status">
        <p className={s.dankeTitel}>{T.danke}</p>
        <p>{T.dankeText}</p>
      </div>
    );
  }

  return (
    <form className={s.formular} onSubmit={absenden} noValidate>
      <div className={s.feld}>
        <label htmlFor="w-name">{T.fName}</label>
        <input id="w-name" name="name" autoComplete="name" aria-invalid={!!fehler.name} aria-describedby={fehler.name ? "w-name-f" : undefined} />
        {fehler.name && <p id="w-name-f" className={s.fehler}>{fehler.name}</p>}
      </div>
      <div className={s.feld}>
        <label htmlFor="w-email">{T.fEmail}</label>
        <input id="w-email" name="email" type="email" autoComplete="email" aria-invalid={!!fehler.email} aria-describedby={fehler.email ? "w-email-f" : undefined} />
        {fehler.email && <p id="w-email-f" className={s.fehler}>{fehler.email}</p>}
      </div>
      <div className={`${s.feld} ${s.feldBreit}`}>
        <label htmlFor="w-inst">
          {T.fInstitution} <span className={s.optional}>{T.fOptional}</span>
        </label>
        <input id="w-inst" name="institution" autoComplete="organization" />
      </div>
      <fieldset className={`${s.feld} ${s.feldBreit} ${s.arten}`}>
        <legend>
          {T.fArt} <span className={s.optional}>{T.fOptional}</span>
        </legend>
        <div>
          {T.arten.map((a) => {
            const an = art.includes(a);
            return (
              <button key={a} type="button" aria-pressed={an} className={s.art} onClick={() => setArt((alt) => (an ? alt.filter((x) => x !== a) : [...alt, a]))}>
                {a}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className={`${s.feld} ${s.feldBreit}`}>
        <label htmlFor="w-msg">{T.fNachricht}</label>
        <textarea id="w-msg" name="message" rows={4} aria-invalid={!!fehler.message} aria-describedby={fehler.message ? "w-msg-f" : undefined} />
        {fehler.message && <p id="w-msg-f" className={s.fehler}>{fehler.message}</p>}
      </div>
      {/* Honigtopf — Bots füllen ihn, /api/contact verwirft dann still. */}
      <input className={s.honig} name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className={s.feldBreit}>
        {fehler.form && <p className={s.fehler} role="alert">{fehler.form}</p>}
        <button type="submit" className={s.cta} disabled={stand === "sendet"}>
          {stand === "sendet" ? T.fSendet : T.fSenden}
          <span aria-hidden="true" className={s.ctaPfeil}>→</span>
        </button>
      </div>
    </form>
  );
}

export default function WasserSeite({ sprache }: { sprache: Sprache }) {
  const T = TEXTE[sprache];
  const wurzel = useRef<HTMLElement>(null);
  useBewegung(wurzel);

  return (
    <main ref={wurzel} className={s.seite} lang={sprache}>
      <Hero T={T} />

      {/* 2 — DIE ABWESENHEIT: der Film, in dem das Wasser verschwindet */}
      <Abschnitt id="absence" nummer="01" label={T.absenzMarke}>
        <Film T={T} />
        <div className={s.raster}>
          <h2 id="absence-titel" className={s.aussage} data-reveal>
            <Zweizeilig z={T.absenzTitel} />
          </h2>
          <div className={s.fliess} data-reveal>
            {T.absenz.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p className={s.betont}>{T.absenzBetont}</p>
          </div>
        </div>
      </Abschnitt>

      {/* 3 — EIN ZUKUNFTSBILD: mit Wasser / ohne Wasser */}
      <Abschnitt id="future" nummer="02" label={T.zukunftMarke} className={s.spiegel}>
        <h2 id="future-titel" className={s.frage} data-reveal>
          <Zweizeilig z={T.zukunftTitel} />
        </h2>
        <Vergleich T={T} />
        <div className={s.zweispaltig} data-reveal>
          {T.zukunft.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </Abschnitt>

      {/* 4 — KAKTUS ALS MENSCH */}
      <Abschnitt id="cactus" nummer="03" label={T.kaktusMarke} className={s.erde}>
        <div className={s.kaktusRaster}>
          {/* Der trockene Raum, ganz — Kakteen, Schrift und die Figur rechts. Ohne Parallaxe, die schneidet an. */}
          <Bild src={DATEIEN.trocken} srcSet={DATEIEN.trockenSet} alt={T.kaktusAlt} className={s.hochBild} sizes="(min-width: 900px) 50vw, 100vw" />
          <div className={s.kaktusText}>
            <h2 id="cactus-titel" className={s.aussage} data-reveal>
              <Zweizeilig z={T.kaktusTitel} />
            </h2>
            <div className={s.fliess} data-reveal>
              {T.kaktus.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <p className={s.betont}>{T.kaktusBetont}</p>
            </div>
            <ul className={s.begriffe} data-reveal aria-label={T.begriffeAria}>
              {T.begriffe.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <div className={s.fragen} data-reveal>
              {T.fragen.map((f) => (
                <p key={f}>{f}</p>
              ))}
            </div>
          </div>
        </div>
      </Abschnitt>

      {/* 5 — NACHHALTIGKEIT: leer, gross, still */}
      <section id="sustainability" aria-labelledby="sustainability-titel" className={s.stille}>
        <p className={s.marke} data-reveal>
          <span>04</span>
          <span>{T.stilleMarke}</span>
        </p>
        <h2 id="sustainability-titel" className={s.stilleFrage} data-reveal>
          <Zweizeilig z={T.stilleTitel} />
        </h2>
        <div className={s.paare} data-reveal>
          {T.paare.map(([a, b]) => (
            <p key={a}>
              <span>{a}</span>
              <span className={s.paarStrich} aria-hidden="true" />
              <span>{b}</span>
            </p>
          ))}
        </div>
        <p className={s.stilleText} data-reveal>
          {T.stilleText}
        </p>
      </section>

      {/* 6 — DOKTORAT */}
      <Abschnitt id="research" nummer="05" label={T.forschungMarke}>
        <div className={s.forschung}>
          <div data-reveal>
            <h2 id="research-titel" className={s.forschungTitel}>{T.forschungTitel}</h2>
            <p className={s.name}>Bandi Szidonia</p>
          </div>
          <div className={s.fliess} data-reveal>
            <p>{T.forschung1}</p>
            <p>
              <em className={s.serifKursiv}>{T.werkTitel}</em>
              {T.forschung2}
            </p>
            <p className={s.betont}>{T.forschungBetont}</p>
          </div>
        </div>
      </Abschnitt>

      {/* 7 — UNTERSTÜTZUNG */}
      <Abschnitt id="support" nummer="06" label={T.hilfeMarke} className={s.unterstuetzung}>
        <div className={s.raster}>
          <h2 id="support-titel" className={s.aussage} data-reveal>
            {T.hilfeTitel}
          </h2>
          <div className={s.fliess} data-reveal>
            {T.hilfe.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>

        <div className={s.bedarf} data-reveal>
          {T.bedarf.map((b, i) => (
            <div key={b.titel} className={s.bedarfSpalte}>
              <p className={s.bedarfKopf}>
                <span>{String(i + 1).padStart(2, "0")}</span> {b.titel}
              </p>
              <ul>
                {b.punkte.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={s.partnerZeile} data-reveal>
          <p className={s.klein}>{T.partnerKopf}</p>
          <p className={s.partnerListe}>{T.partner.join(" · ")}</p>
        </div>

        <div className={s.kontakt} id="contact" data-reveal>
          <div>
            <h3 className={s.kontaktTitel}>{T.kontaktTitel}</h3>
            <p className={s.kontaktText}>{T.kontaktText}</p>
          </div>
          <PartnerFormular T={T} sprache={sprache} />
        </div>
      </Abschnitt>

      {/* 8 — FUSS */}
      <footer className={s.fuss}>
        <div>
          <p className={s.fussName}>Bandi Szidonia</p>
          <p>{T.fussRolle}</p>
        </div>
        <div>
          <p className={s.klein}>{T.fussProjekt}</p>
          <p className={s.fussProjekt}>{T.werkTitel}</p>
        </div>
        <div>
          <p className={s.klein}>{T.fussKontakt}</p>
          <p>
            <a href="#contact">{T.fussAnfragen}</a>
          </p>
          <p>{T.fussAtelier}</p>
          <p>{T.fussInstitution}</p>
        </div>
        <p className={s.fussZeile}>
          © {new Date().getFullYear()} Bandi Szidonia · lakatosbandi.com
        </p>
      </footer>
    </main>
  );
}
