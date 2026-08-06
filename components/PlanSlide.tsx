"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { MadeBy } from "@/components/CI";
import TonKnopf from "@/components/TonKnopf";
import TeilenKnopf from "@/components/TeilenKnopf";
import Reaktionen from "@/components/Reaktionen";
import { planText } from "@/lib/plan-i18n";
import { PLAN_BILDER, PLAN_STUFEN, type StufenId } from "@/lib/plan-bilder";
import type { Lang } from "@/lib/lang";

/**
 * DAS SLIDE GANZ OBEN AUF DER PLAN-SEITE — „du heute, du in 2, du in 5".
 *
 * Owner 04.08.2026, in mehreren Schritten bis hierher:
 *   1. „oben steht slide und drüber, willst du das erreichen … lade … drunter steht der rest"
 *   2. „ich hätte gerne die Bilder in EINER Karte als Animation"
 *   3. „mit Musik und alle Icons die wir haben, als richtige Card"
 *   4. „ich kann es gar nicht stoppen um zu lesen"
 *   5. „du machst es gleich auf englisch auch"
 *
 * EINE KARTE, NICHT DREI. Drei Karten untereinander sind ein Katalog; eine Karte, in der sich
 * derselbe Mensch verwandelt, ist das Versprechen selbst — und es ist die Hausregel, nie zwei
 * Karten übereinander für dieselbe Sache (Memory `karten-fuer-videos`).
 *
 * ÜBERBLENDEN, NICHT SCHNEIDEN — dieselbe Regel wie bei den Videos
 * (`videos-nahtlos-schleifen`): Alle drei Bilder liegen übereinander, nur die Deckkraft
 * wandert. Ein harter Schnitt sieht aus wie ein Fehler; eine Blende sieht aus wie Zeit.
 *
 * TIPPEN HÄLT AN, es springt nicht weiter (Memory `video-playback-behavior`). Gesprungen wird
 * an den Punkten unter der Karte.
 *
 * DIE DREI SYMBOLE NACH SKILL `card`: rechts in EINER Spalte — Vergrössern oben (`top-3`),
 * Teilen darunter (`top-[60px]`), Ton als drittes (`top-[108px]`). Weisse Scheibe, goldenes
 * Zeichen, 30 % durchscheinend. Sie stehen hier von Hand statt über `EinladungAnsicht`, weil
 * die Karte dort ein **Video** rendert und diese hier eine Bildstrecke ist; benutzt werden
 * aber dieselben Bausteine (`TonKnopf`, `TeilenKnopf`), damit Aussehen und Plätze gleich sind.
 *
 * VERGRÖSSERN IST EINE EIGENE ÜBERLAGERUNG, kein `requestFullscreen()` — der wird in
 * eingebetteten Ansichten stillschweigend abgelehnt. Im Vollbild zeigen die Pfeile nach INNEN.
 *
 * DIE MUSIK LIEGT NEBEN DEN BILDERN: eigene Tonspur, die durchläuft, während die Bilder
 * wechseln — wie in `EinladungAnsicht`. Sie startet nie von selbst laut.
 *
 * DIE BILDER LIEGEN IM PROJEKT (Owner: „hier liegen die bilder Luxurybanditplan"). Über
 * `next/image`, weil die drei PNG zusammen 5,7 MB wiegen: als WebP in Bildschirmgrösse.
 */

/* Die Bilder liegen in `lib/plan-bilder` — NICHT hier. Diese Datei ist `"use client"`, und
   der Themen-Katalog ist eine Server-Komponente: Ein Import von hier gäbe ihm eine
   Client-Referenz statt der Pfade, und die Kachel bliebe leer. Siehe lib/plan-bilder.ts. */
const IDS = PLAN_STUFEN;

/**
 * Wie lange jede Stufe steht. Die letzte länger — dort soll er hängenbleiben.
 *
 * ES WAR ZU SCHNELL (Owner 04.08.2026: „ich kann es gar nicht stoppen um zu lesen"). Unter
 * jedem Bild steht ein Zweizeiler; 2,6 Sekunden reichen zum Anschauen, nicht zum Lesen.
 */
const DAUER = [5000, 5000, 6500];

/** Gross und filmisch — dieselbe Datei, die `EinladungAnsicht` als „gross, filmisch" führt. */
const MUSIK = "/grand_project-wonders-of-the-earth-550792.mp3";

export default function PlanSlide({ lang, bilder }: { lang: Lang; bilder?: Partial<Record<StufenId, string>> }) {
  const T = planText(lang);
  const [i, setI] = useState(0);
  const [laeuft, setLaeuft] = useState(true);
  const [ton, setTon] = useState(false);
  const [gross, setGross] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  /* Wer „weniger Bewegung" eingestellt hat, bekommt keine Diashow — dann steht das erste
     Bild, und die Punkte darunter sind der Weg. */
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setLaeuft(false);
  }, []);

  /**
   * DER ZEITGEBER GEHÖRT IN DEN EFFEKT, NICHT IN EINE `ref` (Owner: „die Animation fängt mit
   * Bild 3 an"). Vorher lag er in `uhr.current`. React ruft im Entwicklungsmodus jeden Effekt
   * zweimal auf: Der zweite Lauf überschreibt die `ref`, das Aufräumen löscht nur den ZWEITEN
   * Zeitgeber — der erste lief weiter. Zwei Uhren heissen doppeltes Tempo, und wer nach einer
   * Sekunde hinschaut, sieht schon Bild 3.
   */
  useEffect(() => {
    if (!laeuft) return;
    const t = setTimeout(() => setI(n => (n + 1) % IDS.length), DAUER[i]);
    return () => clearTimeout(t);
  }, [i, laeuft]);

  /* Ton an heisst: Musik läuft weiter, egal welches Bild gerade steht. Aus heisst still. */
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    if (ton) { a.volume = 0.55; void a.play().catch(() => setTon(false)); }
    else a.pause();
  }, [ton]);

  /* Vollbild: Escape schliesst, und dahinter scrollt die Seite nicht mit. */
  useEffect(() => {
    if (!gross) return;
    const zu = (e: KeyboardEvent) => { if (e.key === "Escape") setGross(false); };
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", zu);
    return () => { document.body.style.overflow = vorher; window.removeEventListener("keydown", zu); };
  }, [gross]);

  const umschalten = useCallback(() => setLaeuft(l => !l), []);

  const st = T.stufen[i];
  const scheibe = "grid h-10 w-10 place-items-center rounded-full transition active:scale-90";
  const scheibeStil = { background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.35)", opacity: 0.7 } as const;

  /**
   * Die Bildstrecke — einmal für die Karte, einmal fürs Vollbild.
   *
   * DECKKRAFT UND EBENE STEHEN ALS `style`, NICHT ALS KLASSE: Mit `opacity-0`/`opacity-100`
   * hing es davon ab, welche Regel im fertigen Stylesheet später steht — und weil alle drei
   * Bilder übereinander liegen, konnte das letzte im Quelltext gewinnen. Ein fester Wert am
   * Element kann von keiner Regel überholt werden.
   */
  const strecke = (
    <>
      {IDS.map((id, n) => (
        <Image
          key={id}
          src={bilder?.[id] || PLAN_BILDER[id]}
          alt={T.stufen[n].titel}
          fill
          sizes="(max-width: 440px) 100vw, 440px"
          priority={n === 0}
          className="object-cover"
          style={{ opacity: n === i ? 1 : 0, zIndex: n === i ? 2 : 1, transition: "opacity 900ms ease-in-out", pointerEvents: "none" }}
        />
      ))}
    </>
  );

  return (
    <div className="mt-5">
      {/* Die Tonspur — eine, für die ganze Strecke. */}
      <audio ref={audio} src={MUSIK} loop preload="none" />

      <article className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04]">
        {/* Titel oben — Karten-Regel. Er wandert mit dem Bild. */}
        <div className="flex items-baseline justify-between gap-3 px-4 pb-3 pt-3.5">
          <b className="text-[15px] font-black text-white">{st.titel}</b>
          <i className="shrink-0 not-italic text-[10.5px] font-black uppercase tracking-[0.12em] text-[#f6cf51]">{st.badge}</i>
        </div>

        <div className="relative aspect-[4/5] w-full overflow-hidden bg-black/40">
          {/* Die ganze Fläche ist der Knopf — Hausregel von den Beispielkarten. */}
          <button type="button" onClick={umschalten} aria-label={laeuft ? T.kartePausieren : T.karteWeiter}
            className="absolute inset-0 z-10" />
          {strecke}

          {/* AUFSTEIGENDE ZURUFE statt Herzchen (Owner 04.08.2026: „hier brauche ich auch die
              Animationen, mit Herzchen aber ‚do it‘, also motivierende Wörter"). Derselbe
              Baustein wie beim Kuss, nur die Variante ist eine andere — er liegt über dem Bild
              und fängt nichts ab (`pointer-events-none`), der Tipp zum Anhalten geht durch. */}
          <Reaktionen variant="plan" lang={lang} />

          {/* Angehalten: ein ruhiges Zeichen, damit klar ist, dass es steht und nicht klemmt. */}
          {!laeuft && (
            <span className="pointer-events-none absolute left-1/2 top-1/2 z-20 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}>
              <svg width="22" height="24" viewBox="0 0 22 24" fill="#fff" aria-hidden="true">
                <path d="M2 1.8c0-1.1 1.2-1.8 2.2-1.2l15 10.2c.9.6.9 1.9 0 2.5l-15 10.1c-1 .7-2.2 0-2.2-1.1V1.8z" />
              </svg>
            </span>
          )}

          {/* DIE DREI SYMBOLE — rechts, eine Spalte, feste Plätze (Skill `card`). */}
          <button type="button" onClick={() => setGross(true)} aria-label={T.karteGross}
            className={`absolute right-3 top-3 z-30 ${scheibe}`} style={scheibeStil}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a160f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 4 4 4 4 9" /><line x1="4" y1="4" x2="10" y2="10" />
              <polyline points="15 4 20 4 20 9" /><line x1="20" y1="4" x2="14" y2="10" />
              <polyline points="4 15 4 20 9 20" /><line x1="4" y1="20" x2="10" y2="14" />
              <polyline points="20 15 20 20 15 20" /><line x1="20" y1="20" x2="14" y2="14" />
            </svg>
          </button>

          <span className="absolute right-3 top-[60px] z-30" style={{ opacity: 0.7 }}>
            <TeilenKnopf rund url="/themes/luxurybandit-plan?utm_source=share"
              text={T.karteTeilenText} label={T.karteTeilen} kopiertLabel={T.karteKopiert} />
          </span>

          <TonKnopf an={ton} onClick={() => setTon(t => !t)} label={T.karteTon} labelAus={T.karteTonAus}
            platz="absolute right-3 top-[108px] z-30" />

          {/* Die Jahreszahl im Bild — gross genug, dass man den Sprung sieht. */}
          <span className="pointer-events-none absolute bottom-6 left-3 z-20 rounded-full border border-white/25 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em]"
            style={{ background: "rgba(0,0,0,0.62)", color: "#fff", WebkitTextFillColor: "#fff" }}>
            {st.kurz}
          </span>

          {/* Laufbalken der Stufen — unten am Bild, ruhig. */}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex gap-1 p-2">
            {IDS.map((id, n) => (
              <span key={id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                <span className={`block h-full rounded-full bg-[#f6cf51] transition-[width] duration-500 ${n <= i ? "w-full" : "w-0"}`} />
              </span>
            ))}
          </span>
        </div>

        <div className="px-4 py-3">
          <p className="text-[13.5px] font-bold leading-snug text-white/85">{st.text}</p>
        </div>
        {/* Herkunft unten — Karten-Regel, als LINK (Owner 06.08.2026: „und auch link drauf") */}
        <MadeBy />
      </article>

      {/* Zeitleiste unter der Karte — anklickbar, damit er selbst springen kann. */}
      <div className="mt-4 flex items-center">
        {IDS.map((id, n) => (
          <div key={id} className="contents">
            {n > 0 && <span className={`mx-1.5 mb-[18px] h-0.5 flex-1 transition-colors duration-500 ${n <= i ? "bg-[#f6cf51]/70" : "bg-white/20"}`} />}
            <button type="button" onClick={() => { setLaeuft(false); setI(n); }}
              className="grid shrink-0 place-items-center gap-1.5" aria-label={T.stufen[n].titel}>
              <span className={`h-3 w-3 rounded-full transition-all duration-300 ${n === i ? "bg-[#f6cf51] ring-[5px] ring-[#f6cf51]/15" : n < i ? "bg-[#f6cf51]/70" : "bg-white/25"}`} />
              <span className={`text-[10.5px] font-black uppercase tracking-wide transition-colors ${n === i ? "text-[#f6cf51]" : "text-white/60"}`}>{T.stufen[n].kurz}</span>
            </button>
          </div>
        ))}
      </div>

      {/* VOLLBILD — eigene Fläche, kein Browser-Vollbild. Pfeile zeigen nach INNEN. */}
      {gross && (
        <div className="fixed inset-0 z-[90] bg-black" role="dialog" aria-modal="true" aria-label={st.titel}>
          <div className="relative h-full w-full">
            {strecke}
            <button type="button" onClick={() => setGross(false)} aria-label={T.karteKlein}
              className={`absolute right-3 top-3 z-30 ${scheibe}`} style={scheibeStil}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a160f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 9 9 9 9 4" /><line x1="10" y1="10" x2="4" y2="4" />
                <polyline points="20 9 15 9 15 4" /><line x1="14" y1="10" x2="20" y2="4" />
                <polyline points="9 20 9 15 4 15" /><line x1="10" y1="14" x2="4" y2="20" />
                <polyline points="15 20 15 15 20 15" /><line x1="14" y1="14" x2="20" y2="20" />
              </svg>
            </button>
            <TonKnopf an={ton} onClick={() => setTon(t => !t)} label={T.karteTon} labelAus={T.karteTonAus}
              platz="absolute right-3 top-[60px] z-30" />
            <button type="button" onClick={umschalten} aria-label={laeuft ? T.kartePausieren : T.karteWeiter}
              className="absolute inset-0" />
            <span className="pointer-events-none absolute bottom-6 left-4 z-20 rounded-full border border-white/25 px-3 py-1.5 text-[12px] font-black uppercase tracking-[0.14em]"
              style={{ background: "rgba(0,0,0,0.62)", color: "#fff", WebkitTextFillColor: "#fff" }}>
              {st.kurz}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
