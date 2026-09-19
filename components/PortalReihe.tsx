"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * ── EINE REIHE ZUM WISCHEN STATT EINER WAND (Owner 18.09.2026: „die Poster machst du als
 * Slider, alle in einer Reihe, von allen Künstlern, und die Originale auch als Slider
 * drunter") ──────────────────────────────────────────────────────────────────────────────────
 *
 * ── WARUM EINE REIHE UND KEIN RASTER ────────────────────────────────────────────────────────
 *
 * Ein Raster zeigt sechs Blätter und schiebt alles Weitere unter den Bildschirmrand — die
 * Startseite wurde dadurch immer länger, je mehr Künstler dazukommen, und wer den zweiten
 * Abschnitt sehen will, muss an einer Wand vorbeiscrollen. Eine Reihe zeigt EINE Zeile: Die
 * Poster liegen nebeneinander, die Originale darunter, und beide Abschnitte sind gleichzeitig
 * im Bild.
 *
 * ── DER SCROLLBALKEN IST UNSICHTBAR, DIE PFEILE SIND ES NICHT ───────────────────────────────
 *
 * `lb-wisch` nimmt den Balken weg (Hausklasse, Skill `ci-design`). Am Telefon wischt man, am
 * Rechner gibt es dafür keine Geste — deshalb Vor und Zurück, und die stehen auch dort in der
 * Hausregel: „Ein Karussell braucht Vor und Zurück." Sie erscheinen nur, wenn es in diese
 * Richtung überhaupt weitergeht; ein Pfeil, der nichts tut, ist schlimmer als keiner.
 *
 * ── EINRASTEN AM LINKEN RAND ────────────────────────────────────────────────────────────────
 *
 * `snap-start`: Nach jedem Wisch steht ein Blatt ganz links, nicht halb angeschnitten. Ein halb
 * sichtbares Blatt liest sich als Fehler, ein ganzes als Angebot.
 */
/**
 * ── GENAU SO VIELE, WIE VORHER IM RASTER STANDEN (Owner 18.09.2026: „aber 3 sollen wie jetzt
 * auf dem Bildschirm passen") ────────────────────────────────────────────────────────────────
 *
 * Eine feste Pixelbreite („440 px") wäre bei einem 1280er Schirm zu breit und bei einem 1920er
 * zu schmal — mal passen zweieinhalb, mal dreieinhalb. Die Breite wird deshalb AUS DER SPUR
 * gerechnet: zwei Kacheln plus eine Lücke am Telefon, drei plus zwei Lücken ab Tablet.
 *
 * Die Zahlen müssen zu `gap-x-4` (1rem) und `sm:gap-x-6` (1.5rem) unten passen — ändert sich
 * der Abstand, ändert sich diese Rechnung mit.
 */
export default function PortalReihe({ children, laufen = false }: {
  /** Die `<li>`-Elemente selbst — jedes mit `KACHEL` in seiner Klasse. */
  children: React.ReactNode;
  /**
   * ── DIE REIHE LÄUFT VON SELBST (Owner 18.09.2026: „oder soll laufen, also animiert") ───────
   *
   * Ein angeschnittenes Blatt am Rand sagt „da geht es weiter". Eine Reihe, die sich langsam
   * bewegt, sagt es lauter — und zeigt nebenbei Werke, die sonst nie jemand sieht, weil kaum
   * jemand von selbst wischt.
   *
   * DREI REGELN, DAMIT ES NICHT NERVT:
   *   · Sie hält an, sobald jemand sie anfasst — mit dem Finger, der Maus oder einem Pfeil —
   *     und läuft dann NICHT wieder los. Wer selbst sucht, will nicht geschoben werden.
   *   · Sie läuft nur, wenn die Reihe im Bild ist. Eine Reihe, die unsichtbar weiterrollt,
   *     kostet Rechenzeit und steht beim Hinscrollen schon mitten im Nichts.
   *   · `prefers-reduced-motion` schaltet sie ganz ab. Für manche Menschen ist dauernde
   *     Bewegung kein Schmuck, sondern ein Problem.
   */
  laufen?: boolean;
}) {
  const spur = useRef<HTMLUListElement>(null);
  const [links, setLinks] = useState(false);
  const [rechts, setRechts] = useState(false);

  /* Welche Pfeile gezeigt werden, hängt an der Stelle, an der die Spur gerade steht — nicht an
     einem Merker, den wir selbst hochzählen. Wer mit dem Finger wischt, zählt nichts hoch. */
  useEffect(() => {
    const el = spur.current;
    if (!el) return;
    const pruefen = () => {
      setLinks(el.scrollLeft > 8);
      setRechts(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };
    pruefen();
    el.addEventListener("scroll", pruefen, { passive: true });
    const beobachter = new ResizeObserver(pruefen);
    beobachter.observe(el);
    return () => { el.removeEventListener("scroll", pruefen); beobachter.disconnect(); };
  }, [children]);

  /**
   * Das Laufwerk. 20 Pixel je Sekunde, gerechnet aus der wirklich vergangenen Zeit statt je
   * Bild — sonst läuft es auf einem 120-Hz-Schirm doppelt so schnell wie auf einem 60-Hz-Schirm.
   *
   * Am Ende geht es zurück an den Anfang, nicht rückwärts: Eine Reihe, die umkehrt, sieht aus,
   * als hätte sich der Browser verklickt.
   */
  const [angefasst, setAngefasst] = useState(false);
  useEffect(() => {
    const el = spur.current;
    if (!el || !laufen || angefasst) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /**
     * ── EINRASTEN UND LAUFEN GEHT NICHT GLEICHZEITIG (18.09.2026 gemessen: 0 px/s) ────────────
     *
     * `scroll-snap-type: mandatory` zieht die Spur in jedem Bild an die nächste Kachel zurück.
     * Gegen eine Bewegung von zwanzig Pixeln je Sekunde gewinnt das Einrasten immer — die Reihe
     * stand still, obwohl das Laufwerk lief.
     *
     * Solange sie läuft, ist das Einrasten also aus. Fasst jemand sie an, läuft dieser Effekt
     * ab, das Aufräumen stellt es zurück — und ab dann wischt es sich wieder sauber von Blatt
     * zu Blatt.
     */
    const snapVorher = el.style.scrollSnapType;
    el.style.scrollSnapType = "none";

    let sichtbar = true;
    const auge = new IntersectionObserver(([e]) => { sichtbar = e.isIntersecting; }, { threshold: 0.1 });
    auge.observe(el);

    /**
     * ── DIE STELLE WIRD SELBST GEZÄHLT, NICHT AUS DEM BROWSER GELESEN (18.09.2026 gemessen) ──
     *
     * `scrollLeft` kommt auf ganze Pixel gerundet zurück. Zwanzig Pixel je Sekunde sind bei
     * 60 Bildern 0,33 Pixel je Bild — liest man die Stelle jedes Mal neu aus und addiert 0,33,
     * rundet der Browser das wieder weg, und die Reihe steht still. Genau das ist passiert:
     * Einrasten war aus, das Laufwerk lief, und es bewegte sich nichts.
     *
     * Deshalb liegt die Stelle hier als Kommazahl und wird nur GESCHRIEBEN.
     */
    let bild = 0;
    let stelle = el.scrollLeft;
    let zuletzt = performance.now();
    const schritt = (jetzt: number) => {
      const dt = Math.min(jetzt - zuletzt, 100);
      zuletzt = jetzt;
      if (sichtbar && document.visibilityState === "visible") {
        stelle += (dt / 1000) * 20;
        if (stelle >= el.scrollWidth - el.clientWidth - 1) stelle = 0;
        el.scrollLeft = stelle;
      }
      bild = requestAnimationFrame(schritt);
    };
    bild = requestAnimationFrame(schritt);

    const stopp = () => setAngefasst(true);
    el.addEventListener("pointerdown", stopp, { passive: true });
    el.addEventListener("wheel", stopp, { passive: true });
    return () => {
      cancelAnimationFrame(bild); auge.disconnect();
      el.removeEventListener("pointerdown", stopp); el.removeEventListener("wheel", stopp);
      el.style.scrollSnapType = snapVorher;
    };
    /* ── `children` GEHÖRT NICHT IN DIESE LISTE (18.09.2026 gemessen: 236 px/s statt 20) ──────
       Kinder sind bei jedem Rendern ein neues Objekt. Standen sie hier, startete jedes Rendern
       ein zusätzliches Laufwerk, und die liefen alle gleichzeitig — die Reihe raste. Das
       Laufwerk hängt an der Spur, nicht an dem, was darin liegt. */
  }, [laufen, angefasst]);

  /* Eine Bildschirmbreite weiter, nicht eine Kachel: Am Rechner liegen drei nebeneinander, und
     ein Klick, der nur um eine Kachel rückt, fühlt sich kaputt an. */
  const schieben = (richtung: 1 | -1) => {
    setAngefasst(true);
    const el = spur.current;
    if (el) el.scrollBy({ left: richtung * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const pfeil = "absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-[#e5e5e5] bg-white text-[#111] shadow-[0_2px_12px_rgba(0,0,0,.14)] hover:bg-[#f5f5f5] lg:grid";

  return (
    <div className="relative">
      <ul ref={spur}
        className="lb-wisch mt-6 flex snap-x snap-mandatory list-none gap-x-4 overflow-x-auto p-0 pb-2 sm:gap-x-6">
        {/* Die Kacheln kommen fertig herein — mit ihren eigenen Schlüsseln und Klassen. Sie
            hier noch einmal einzupacken hiesse, React die Schlüssel wegzunehmen. */}
        {children}
      </ul>

      {links ? (
        <button type="button" aria-label="Zurück" onClick={() => schieben(-1)} className={`${pfeil} -left-5`}>
          <ChevronLeft className="h-6 w-6" aria-hidden />
        </button>
      ) : null}
      {rechts ? (
        <button type="button" aria-label="Weiter" onClick={() => schieben(1)} className={`${pfeil} -right-5`}>
          <ChevronRight className="h-6 w-6" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
