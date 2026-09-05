"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * MEHRERE VIDEOS IN EINER KARTE — zum Wischen.
 *
 * Owner 04.08.2026: „nein, du machst mir die weitere Videos in der einen Karte, die da ist,
 * als nachfolgende. Wie Karussell."
 *
 * Vorher standen die weiteren Beispiele als EIGENE Karten untereinander (das Kuss-Muster vom
 * 31.07.2026). Für eine Galerie unter einem Trichter ist das richtig — wer scrollt, sieht
 * mehrmals dasselbe Versprechen. Hier oben ist es falsch: Die Karte IST die Bedienung, und
 * unter ihr steht das Formular. Eine zweite Karte dazwischen schiebt das Formular aus dem
 * Bild und lässt offen, welche der beiden gerade gemeint ist.
 *
 * Also eine Karte, mehrere Videos. Wer mehr sehen will, wischt — wer nicht, sieht das erste
 * und arbeitet weiter.
 *
 * WARUM SCHNAPP-SCROLL UND KEIN EIGENER SCHIEBER: `snap-x snap-mandatory` ist die Mechanik
 * des Browsers. Sie fühlt sich am Finger richtig an (Schwung, Abbremsen, Einrasten), ohne
 * dass wir Zeigerereignisse nachbauen — und sie funktioniert mit der Tastatur und dem
 * Bildschirmleser, was ein selbstgebauter Schieber selten tut.
 *
 * Jede Folie ist eine vollständige `EinladungAnsicht` mit ihren drei Symbolen (Skill `card`):
 * Was man sieht, kann man vergrössern, teilen und hören — auch das dritte Video.
 */
export default function KartenKarussell({ folien, onAktiv, pfeile = false }: {
  /** Eine `EinladungAnsicht` je Video. Eine einzelne Folie kommt ohne Punkte aus. */
  folien: ReactNode[];
  /**
   * Welche Folie steht vorn — für alles, was AUSSERHALB der Bahn zur vorderen Folie gehört.
   * Gebraucht, seit die Punkte direkt unter dem Video stehen sollen (Owner 06.08.2026: „jetzt
   * die sliderpunkte unter dem video"): Dafür endet die Folie am Video, und der Text der
   * vorderen Folie steht unter den Punkten — er muss also wissen, welche gerade vorn ist.
   */
  onAktiv?: (i: number) => void;
  /**
   * VOR UND ZURÜCK ALS KNÖPFE (Owner 02.09.2026: „mit vor und zurück").
   *
   * Die Punkte sagen, DASS es weitergeht — sie sind aber kein Bedienelement für den
   * Rechner: Wischen gibt es dort nicht, und einen 8-Pixel-Punkt trifft man mit der Maus
   * nur mit Absicht. Auf einer Landingpage, deren ganzer Zweck ist, dass jemand alle
   * Vorlagen SIEHT, ist das der Unterschied zwischen fünf gezeigten und einer.
   *
   * Vorgabe aus, damit kein bestehendes Karussell (Feed, Themenseiten) ungefragt zwei
   * Scheiben dazubekommt; `LandingKarte` schaltet sie ein, sobald es mehr als eine Folie
   * gibt — dort ist es immer richtig.
   */
  pfeile?: boolean;
}) {
  const bahn = useRef<HTMLDivElement>(null);
  const [aktiv, setAktiv] = useState(0);
  /**
   * ES LAEUFT VON SELBST WEITER (Owner 05.08.2026: „und wieso läuft das Karussell nicht
   * automatisch weiter?").
   *
   * Weil es als Wisch-Karussell gebaut war — Punkte zeigen, dass es weitergeht, aber jemand
   * musste wischen. Auf einer Themenseite ist das zu wenig: Die meisten sehen das erste Video
   * und scrollen vorbei, ohne je zu erfahren, dass fuenf weitere darunter liegen.
   *
   * SIEBEN SEKUNDEN je Folie — knapp unter der Laenge unserer Videos (acht Sekunden). So sieht
   * man von jedem fast alles, bevor das naechste kommt, und keines wird zweimal angefangen.
   *
   * UND ES HOERT AUF, SOBALD ER SELBST WISCHT. Das ist die wichtigere Haelfte: Wer die Hand am
   * Bild hat, will nicht, dass es ihm unter dem Finger weiterspringt. Ein Karussell, das
   * gegen den Benutzer arbeitet, ist schlimmer als eines, das steht.
   */
  const [selbstLaeuft, setSelbstLaeuft] = useState(true);
  /** Bis wann ein Scrollen von UNS kommt — danach war es der Finger. */
  const eigenesBis = useRef(0);
  /** Vorwaerts (1) oder rueckwaerts (−1) — dreht an den beiden Enden. */
  const richtung = useRef(1);

  /**
   * DIE BAHN BEKOMMT KEINE GERECHNETE HOEHE — und das ist eine bewusste Entscheidung, kein
   * Vergessen (Owner 06.08.2026: „die punkte sind genau unter dem video und die lnge ist
   * dynamisch" · „jetzt schau dir mach das loch an" · dann aber „die Videso müssen alle
   * gleich gross sein" · „nimm die grösse von hochzeit").
   *
   * Das Loch ueber dem Titel kam daher, dass die Folien verschieden hoch waren: 3:4 neben
   * 9:16. Eine Wischbahn ist so hoch wie ihre HOECHSTE Folie, und der Rest wurde erst unten,
   * dann (mit `items-center`) oben und unten verteilt — ein Loch blieb es so oder so.
   *
   * Kurz stand hier eine Messung, die der Bahn die Hoehe der vorderen Folie gab. Sie war
   * eine Fehlerquelle: Sie lief, bevor das Video seine Hoehe kannte, und klemmte die Bahn
   * auf 434 statt 530 Pixel ab — das Video war unten abgeschnitten und liess sich im Rahmen
   * verschieben. Ueberfluessig wurde sie ohnehin, als der Owner die Formatfrage anders
   * entschied: Jede Folie traegt jetzt dieselbe feste 3:4-Flaeche. Gleiche Folien brauchen
   * keinen Ausgleich — keine Hoehe ist hier die richtige Hoehe.
   */

  useEffect(() => {
    if (!selbstLaeuft || folien.length < 2) return;
    const t = setInterval(() => {
      /* Im Hintergrund nicht weiterschalten: Der Browser drosselt dort ohnehin, und wer
         zurueckkommt, saehe sonst eine Folie, die er nie gesehen hat. */
      if (typeof document !== "undefined" && document.hidden) return;
      const el = bahn.current;
      if (!el) return;
      /**
       * WER ZUSIEHT, DEM NIMMT MAN DIE FOLIE NICHT WEG (Owner 04.09.2026: „der werbespot
       * steht schon wieder still" · „in der full version").
       *
       * GEMESSEN, nicht vermutet: Der Spot lief im Vollbild, und mitten im Satz stand er
       * pausiert bei 3,2 s. Der Grund lag hier: Der Takt schaltet alle 7 Sekunden eine Folie
       * weiter, und der Effekt darunter pausiert dabei die Spieler ALLER anderen Folien —
       * auch den, der gerade bildschirmfüllend läuft. Der Zuschauer sah ein eingefrorenes
       * Bild, während unter dem Vollbild unbemerkt weitergeblättert wurde.
       *
       * Es traf auch die kleine Karte: Der Spot dauert 12,5 s, der Takt 7 s — er war nie zu
       * Ende zu sehen, ohne dass jemand von Hand zurückwischte.
       *
       * Zwei Riegel, beide „solange jemand zusieht":
       *   · ein Vollbild ist offen (`data-vollbild`, gesetzt in `EinladungAnsicht`)
       *   · irgendein Spieler dieser Bahn läuft gerade wirklich
       * `selbstLaeuft` bleibt daneben bestehen — das ist der Riegel fürs HÄNDISCHE Wischen.
       */
      if (typeof document !== "undefined" && document.querySelector('[data-vollbild="1"]')) return;
      const siehtJemandZu = Array.from(el.querySelectorAll("video"))
        .some(v => !v.paused && !v.ended && v.currentTime > 0);
      if (siehtJemandZu) return;
      /**
       * ES PENDELT, ES SPULT NICHT ZURUECK (Owner 05.08.2026: „der Slider rollt zurück brutal
       * am Ende. Soll weiter laufen").
       *
       * Vorher sprang es von der letzten Folie auf die erste — und weil das ein weiches
       * Scrollen ueber die ganze Bahn ist, rauschen bei sechs Folien fuenf Videos im
       * Schnelldurchlauf vorbei. Das ist der Ruettler, den er meint.
       *
       * Jetzt laeuft es vor bis zur letzten und dann RUECKWAERTS zurueck. Der Schritt ist
       * immer genau eine Folie, in beide Richtungen — es gibt keinen Sprung mehr, und es
       * hoert nie auf. Wer haendisch wischt, stellt es ohnehin ab (`selbstLaeuft`).
       */
      const jetzt = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      if (jetzt >= folien.length - 1) richtung.current = -1;
      if (jetzt <= 0) richtung.current = 1;
      const naechste = Math.min(folien.length - 1, Math.max(0, jetzt + richtung.current));
      eigenesBis.current = Date.now() + 1200;   // das gleich folgende onScroll ist unseres
      el.scrollTo({ left: naechste * el.clientWidth, behavior: "smooth" });
    }, 7000);
    return () => clearInterval(t);
  }, [selbstLaeuft, folien.length]);

  /**
   * DER TON ENDET MIT DER FOLIE (Owner 11.08.2026: „Wenn er zum nächsten slide geht dann
   * muss der ton aufhören vom letzten slide").
   *
   * Jede Folie bringt ihren eigenen Spieler mit — wer bei laufendem Ton weiterwischte, hörte
   * die alte Folie unsichtbar weiter. Das Karussell ist die EINE Stelle, die weiss, welche
   * Folie vorn steht, also pausiert es beim Wechsel jeden Spieler der anderen Folien.
   * PAUSIEREN, nicht stummschalten und nicht zurückspulen: Wer zurückwischt, setzt mit einem
   * Tipp an derselben Stelle fort (Hausregel „Weiterlauf statt Neustart", Memory
   * video-playback-behavior) — und `pause()` feuert `onPause`, womit auch der Playknopf der
   * Karte wieder auftaucht (Memory playknopf-folgt-dem-spieler).
   */
  useEffect(() => {
    const el = bahn.current;
    if (!el) return;
    /* AUSSER DEM, DER GERADE GROSS LÄUFT (Owner 04.09.2026: „der werbespot steht schon wieder
       still" · „in der full version"). Die vergrösserte Folie liegt als `fixed`-Ebene über
       der Seite, steht in der Bahn aber weiterhin an ihrem Platz — ein Folienwechsel im
       Hintergrund hielt deshalb genau den Spieler an, den der Zuschauer bildschirmfüllend
       ansah. Alle ÜBRIGEN werden weiter pausiert; sonst hörte man sie doppelt. */
    const vollbild = typeof document !== "undefined" ? document.querySelector('[data-vollbild="1"]') : null;
    Array.from(el.children).forEach((kind, i) => {
      if (i === aktiv) return;
      kind.querySelectorAll("video").forEach(v => {
        if (vollbild?.contains(v)) return;
        if (!v.paused) v.pause();
      });
    });
  }, [aktiv]);

  if (folien.length === 0) return null;
  if (folien.length === 1) return <>{folien[0]}</>;

  /**
   * WELCHE FOLIE STEHT VORN? Aus der Scroll-Position gerechnet, nicht aus Klicks gezählt:
   * Wer mit dem Finger wischt, löst keinen Klick aus — ein Zähler liefe sofort auseinander.
   */
  const gescrollt = () => {
    const el = bahn.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    const n = Math.max(0, Math.min(folien.length - 1, i));
    setAktiv(n);
    onAktiv?.(n);
    /* Kam dieses Scrollen nicht von uns, hat er selbst gewischt — dann uebernimmt er. */
    if (Date.now() > eigenesBis.current) setSelbstLaeuft(false);
  };

  const hin = (i: number) => {
    const el = bahn.current;
    if (!el) return;
    setSelbstLaeuft(false);   // ein Tipp auf einen Punkt ist dieselbe Ansage wie ein Wisch
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* OBEN ANGESCHLAGEN UND MITWACHSEND — die Höhe kommt aus der vorderen Folie (siehe
          `hoehe` oben). `items-start`, damit jede Folie am Titel beginnt; die Höhe der Bahn
          folgt ihr, also entsteht darunter auch kein Rest. Der Übergang macht den Wechsel
          weich, sonst ruckt die halbe Seite, wenn eine höhere Folie hereinwischt. */}
      <div ref={bahn} onScroll={gescrollt}
        /* EIN TIPP IST AUCH „ER HAT ÜBERNOMMEN" (Owner 20.08.2026, seit ein Video wieder
           INLINE in der Folie spielt statt auf einer eigenen Seite): Vorher zählte nur ein
           WISCH als Übernahme — ein Tipp auf den Play-Knopf einer Folie lief weiter unter der
           7-Sekunden-Uhr mit und wurde beim naechsten Weiterschalten stumm pausiert (siehe
           `useEffect` oben, Zeile ~122). Jeder Tipp irgendwo in der Bahn stoppt die
           automatische Weiterschaltung jetzt genauso wie ein Wisch. */
        onPointerDown={() => setSelbstLaeuft(false)}
        /* `overflow-y-hidden` (Owner 06.08.2026: „achtung video kann ich vertical scrollen,
           das soll natürlich nicht"): Steht eine Achse auf `auto`, macht der Browser die
           andere gleich mit — dann liess sich das Video im Rahmen hoch- und runterschieben
           wie ein eigenes Fenster. */
        className="lb-wisch flex snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden">
        {folien.map((f, i) => (
          <div key={i} className="w-full shrink-0 snap-center">{f}</div>
        ))}
      </div>

      {/* VOR UND ZURÜCK — Haus-`Scheibe`, senkrecht mittig AM VIDEO, nicht an der Karte:
          `top-0 h-full` würde die Punktreihe mitzählen und die Pfeile nach unten ziehen.
          Die Bahn ist so hoch wie die vordere Folie, also nimmt der Rahmen genau sie.
          An den Enden verschwindet der jeweilige Pfeil, statt wirkungslos dazustehen. */}
      {/* DIE PUNKTE STEHEN UNTER DEM VIDEO, NICHT DARAUF (Owner 05.08.2026, mit Bild: „mach
          die Punkte drunter, nicht auf dem Button").
          Sie lagen unten mittig IM Bild — genau dort, wo auf der Themenseite der Kaufknopf
          endet. Dann berühren sich beide, und beim Wechseln trifft man den Kauf. Auf dem Bild
          war kein Platz zu gewinnen: Jede Überlagerung, die dort hinzukommt, trifft sie
          wieder. Ausserhalb der Bildfläche kann das nicht mehr passieren — es kostet vierzehn
          Pixel und dafür gibt es keine Kollision mehr, in keiner Karte.
          Die Farbe kommt jetzt aus der Umgebung (`currentColor`) statt fest weiss: Unter dem
          Video liegt Karten-Papier, kein Bild — weisse Punkte wären dort unsichtbar. */}
      {/* VOR UND ZURÜCK GEHÖREN ZU DEN PUNKTEN, NICHT AUFS BILD (Owner 02.09.2026: „mit vor
          und zurück" — und gleich darauf, als sie als weisse Scheiben am Video standen: „was
          ist das schon wieder für ein neues Element").
          Auf dem Medium ist die weisse Scheibe VERGEBEN: Vergrössern, Teilen, Ton, in einer
          Spalte rechts (Skill `card`). Ein vierter weisser Kreis daneben ist kein vierter
          Knopf derselben Familie, sondern ein fremdes Element — und er verdeckt genau das,
          was man ansehen soll. Neben den Punkten ist die Navigation ohnehin zu Hause: Sie
          sagen, WO man ist; die Pfeile sagen, wie man weiterkommt. Kein neues Aussehen, kein
          Pixel auf dem Bild.
          SIE LAUFEN UM (Owner: „und Rücklauf der Videos"): von der ersten zurück zur letzten
          und von der letzten weiter zur ersten — sonst steht man an den Enden vor einem
          Knopf, der nichts tut. */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <button type="button" aria-label={`${aktiv === 0 ? folien.length : aktiv}/${folien.length}`}
          onClick={() => hin(aktiv === 0 ? folien.length - 1 : aktiv - 1)}
          style={{ color: "currentColor" }}
          className="grid h-7 w-7 place-items-center rounded-full opacity-40 transition active:scale-90 hover:opacity-80">
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex justify-center gap-1.5">
          {folien.map((_, i) => (
            <button key={i} type="button" onClick={() => hin(i)}
              aria-label={`${i + 1}/${folien.length}`}
              style={{ background: "currentColor", opacity: i === aktiv ? 0.9 : 0.3 }}
              className={`h-2 rounded-full transition-all ${i === aktiv ? "w-5" : "w-2"}`} />
          ))}
        </div>

        <button type="button" aria-label={`${aktiv === folien.length - 1 ? 1 : aktiv + 2}/${folien.length}`}
          onClick={() => hin(aktiv === folien.length - 1 ? 0 : aktiv + 1)}
          style={{ color: "currentColor" }}
          className="grid h-7 w-7 place-items-center rounded-full opacity-40 transition active:scale-90 hover:opacity-80">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
