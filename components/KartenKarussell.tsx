"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

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
export default function KartenKarussell({ folien, onAktiv }: {
  /** Eine `EinladungAnsicht` je Video. Eine einzelne Folie kommt ohne Punkte aus. */
  folien: ReactNode[];
  /**
   * Welche Folie steht vorn — für alles, was AUSSERHALB der Bahn zur vorderen Folie gehört.
   * Gebraucht, seit die Punkte direkt unter dem Video stehen sollen (Owner 06.08.2026: „jetzt
   * die sliderpunkte unter dem video"): Dafür endet die Folie am Video, und der Text der
   * vorderen Folie steht unter den Punkten — er muss also wissen, welche gerade vorn ist.
   */
  onAktiv?: (i: number) => void;
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
    Array.from(el.children).forEach((kind, i) => {
      if (i === aktiv) return;
      kind.querySelectorAll("video").forEach(v => { if (!v.paused) v.pause(); });
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
        /* `overflow-y-hidden` (Owner 06.08.2026: „achtung video kann ich vertical scrollen,
           das soll natürlich nicht"): Steht eine Achse auf `auto`, macht der Browser die
           andere gleich mit — dann liess sich das Video im Rahmen hoch- und runterschieben
           wie ein eigenes Fenster. */
        className="lb-wisch flex snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden">
        {folien.map((f, i) => (
          <div key={i} className="w-full shrink-0 snap-center">{f}</div>
        ))}
      </div>

      {/* DIE PUNKTE STEHEN UNTER DEM VIDEO, NICHT DARAUF (Owner 05.08.2026, mit Bild: „mach
          die Punkte drunter, nicht auf dem Button").
          Sie lagen unten mittig IM Bild — genau dort, wo auf der Themenseite der Kaufknopf
          endet. Dann berühren sich beide, und beim Wechseln trifft man den Kauf. Auf dem Bild
          war kein Platz zu gewinnen: Jede Überlagerung, die dort hinzukommt, trifft sie
          wieder. Ausserhalb der Bildfläche kann das nicht mehr passieren — es kostet vierzehn
          Pixel und dafür gibt es keine Kollision mehr, in keiner Karte.
          Die Farbe kommt jetzt aus der Umgebung (`currentColor`) statt fest weiss: Unter dem
          Video liegt Karten-Papier, kein Bild — weisse Punkte wären dort unsichtbar. */}
      <div className="flex justify-center gap-1.5 pt-2">
        {folien.map((_, i) => (
          <button key={i} type="button" onClick={() => hin(i)}
            aria-label={`${i + 1}/${folien.length}`}
            style={{ background: "currentColor", opacity: i === aktiv ? 0.9 : 0.3 }}
            className={`h-2 rounded-full transition-all ${i === aktiv ? "w-5" : "w-2"}`} />
        ))}
      </div>
    </div>
  );
}
