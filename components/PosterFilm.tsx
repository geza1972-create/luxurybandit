"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX, X } from "lucide-react";

/**
 * DAS WERK IN DER POSTER-KACHEL — UND DER FILM DARÜBER (Owner 15.09.2026: „video startet nicht
 * gleich" · „klick auf play zeigt das video voll mit musik und schliess button rechts oben").
 *
 * ── IN DER KACHEL LIEGT NUR DAS STANDBILD ───────────────────────────────────────────────────
 *
 * Nichts läuft von selbst. Auf einer Seite mit zehn Postern liefen sonst zehn Filme gleichzeitig
 * — Daten und Strom für etwas, worum niemand gebeten hat. Und Musik lässt kein Browser von
 * selbst zu; sie wäre nie zu hören gewesen.
 *
 * ── DER KLICK ÖFFNET IHN GROSS, MIT TON ─────────────────────────────────────────────────────
 *
 * Erst der Klick lädt den Film (`preload` gibt es hier gar nicht — das Element entsteht erst
 * beim Öffnen) und startet ihn MIT Musik. Das ist erlaubt, weil der Besucher selbst gedrückt
 * hat. Schlägt es doch fehl, läuft er stumm weiter statt gar nicht.
 *
 * Geschlossen wird oben rechts, mit Escape, oder durch einen Klick neben den Film.
 */
export default function PosterFilm({ quelle, sprecher, sprecherBild, youtube, ton, bild, alt, gross = false, quer = false, sofort = false, fenster = true, klickOeffnet = true, zurueck, profil, kaufPoster, kaufOriginal, kuenstler, leben, titel, geschichte, ueber }: {
  /** Die Adresse des Films. Fehlt sie, steht hier nur das stille Bild. */
  quelle?: string;
  /**
   * ── DER KÜNSTLER SPRICHT ÜBER SEIN WERK (Owner 17.09.2026: „so müsste jedes Poster
   * präsentiert werden. Wo der Künstler spricht. Das hat kein Shop auf dieser Welt") ─────────
   *
   * Gibt es diesen Film, ist ER die Hauptsache im Fenster — und das Werk steht still darüber.
   * ZWEI laufende Filme mit Ton nebeneinander gäbe zwei Tonspuren übereinander und auf dem
   * Handy zwei Dekoder: Der Zoom wird deshalb weggelassen, wo ein Mensch spricht. Das Werk
   * verliert dabei nichts — es steht ohnehin im Bild hinter ihm.
   */
  sprecher?: string;
  /** Das Standbild SEINES Films — dieselbe Form, derselbe Inhalt (siehe `sprecherBildPfad`). */
  sprecherBild?: string;
  /**
   * ── SEIN FILM LIEGT AUF YOUTUBE (Owner 17.09.2026: „und dort die Videos speichern" → „b") ──
   *
   * Nur die Kennung, nicht die Datei. Steht sie da, spielt das Fenster von dort — ungelistet,
   * ohne Vorschlagsliste am Ende (`rel=0`), über die Adresse ohne Werbekekse
   * (`youtube-nocookie`). Fehlt sie, spielt weiter unsere eigene Datei: Ein Code auf gedrucktem
   * Papier darf nicht sterben, weil ein fremder Dienst ein Video entfernt.
   */
  youtube?: string;
  /**
   * ── SEINE STIMME, OHNE VIDEO (Owner 17.09.2026: „können wir auf HeyGen verzichten … ich lade
   * das Bild hoch und meine Stimme") ────────────────────────────────────────────────────────
   *
   * Der einfachste Living Poster: sein Werk steht still, und er erzählt dazu. Kein Dreh, kein
   * Schnitt, kein gerendertes Video — eine Sprachnachricht, die er im Dashboard aufnimmt. Gibt
   * es einen Sprecher-FILM, hat der Vorrang; sonst läuft dieser Ton unter dem Bild.
   */
  ton?: string;
  bild: string;
  alt: string;
  /**
   * Auf der Seite hinter dem QR-Code (Owner 15.09.2026: „das ist das video wo das qr code
   * hinführt") füllt das Standbild den Schirm — dort gibt es keine Kachel, in die es passen
   * müsste. Sonst dasselbe Bauteil, damit beide Wege gleich aussehen und gleich reagieren.
   */
  gross?: boolean;
  /** Ob das Werk im Querformat ist — dann richtet es sich nach der Breite statt nach der Höhe. */
  quer?: boolean;
  /**
   * ── HINTER DEM QR-CODE LÄUFT ER VON SELBST (Owner 16.09.2026: „button raus. Sound startet
   * automatisch und nur schliess button") ──────────────────────────────────────────────────
   *
   * Wer den Code scannt, hat schon entschieden. Der Film öffnet sich also sofort gross. Ton
   * ohne Berührung erlaubt kein Browser — schlägt er fehl, läuft der Film stumm weiter und
   * schaltet sich bei der ERSTEN Berührung der Seite selbst laut. Kein Knopf dafür.
   */
  sofort?: boolean;
  /* Ungenutzt seit 16.09.2026 — siehe `schliessen`. */
  zurueck?: string;
  /**
   * ── DAS SCHILD NEBEN DEM BILD (Owner 15.09.2026: „wenn ich jetzt auf play klicke müsste doch
   * das video kommen, musik und die story statt nur das full video") ─────────────────────────
   *
   * Im Museum hängt das Werk und daneben steht, was es ist. Ein Vollbild ohne Text wäre ein
   * Bildschirmschoner. Deshalb steht unter dem Film, wer es gemalt hat, wie das Werk heisst und
   * seine Geschichte — und, wenn vorhanden, wer der Maler war.
   */
  /** Ob der Klick ein Fenster öffnet. Beim Original nicht — dort führt die Kachel zum Agenten. */
  fenster?: boolean;
  /**
   * Ob ein Klick auf das Werk das Fenster öffnet (Owner 17.09.2026: „klick aufs bild vergrössert
   * das poster full und klick auf code führt zum QR fenster"). Im Posterlayout nicht — dort
   * gehört der Klick dem Blatt und das Fenster dem Code.
   */
  klickOeffnet?: boolean;
  /** Das Profilbild des Künstlers — im Fenster als Kreis neben seinem Namen. */
  profil?: string;
  /**
   * ── DIE WEGE AUS DEM FENSTER (Owner 16.09.2026: „hier müssen eins, zwei buttons je nachdem ob
   * lebender künstler oder nicht. Original kaufen · Poster kaufen") ─────────────────────────
   *
   * Wer den Code scannt, steht vor einem fremden Poster an einer fremden Wand. Wenn ihn das
   * Werk trifft, muss der nächste Schritt sofort daneben stehen — sonst schliesst er das
   * Fenster und ist weg. Beim Meister gibt es nur das Poster; das Original hängt im Museum.
   */
  kaufPoster?: string;
  kaufOriginal?: { text: string; href: string };
  kuenstler?: string;
  leben?: string;
  titel?: string;
  geschichte?: string;
  ueber?: string;
}) {
  const [offen, setOffen] = useState(sofort);
  /**
   * ── SCHWARZ IST KEIN ZUSTAND, DEN MAN ZEIGT (Owner 17.09.2026: „auf dem Handy konnte ich das
   * Video nicht sehen, weil es wahrscheinlich geladen hat. Und es war schwarz. Es hätte ein
   * Poster erscheinen müssen mit Ladebalken") ──────────────────────────────────────────────
   *
   * Über Mobilfunk dauert ein Film ein paar Sekunden. In dieser Zeit stand ein schwarzes
   * Rechteck — wer den Code gerade gescannt hat, denkt, es ist kaputt, und geht weg. Jetzt
   * steht dort SEIN WERK (`poster`), darüber ein Balken, bis das erste Bild da ist.
   */
  const [laedt, setLaedt] = useState(true);
  /**
   * ── DAS FENSTER GEHÖRT AN DEN SEITENRAND, NICHT IN DIE KACHEL (17.09.2026 gemessen) ───────
   *
   * Die Kachel steckt in einem `<a>`. Stand das Fenster darin, entstand ein `<a>` in einem
   * `<a>` — der Browser baut das um, React erwartet die eigene Fassung, und die Seite kippt in
   * einen Hydrations-Fehler. Auf dem Handy sah das so aus: schwarzes Rechteck, kein Film
   * (Owner 17.09.2026: „ich konnte das Video nicht sehen … und es war schwarz").
   *
   * `createPortal` hängt das Fenster an `document.body`. Damit ist es aus jedem Link heraus,
   * und die Schaltflächen darin sind wieder gültige Links. `montiert` verhindert, dass der
   * Server etwas zeichnet, das es dort noch nicht gibt.
   */
  /**
   * ── OHNE KNOPF SIEHT MAN AUF DEM HANDY NICHTS (Owner 17.09.2026: „bitte das Poster von dem
   * Video laden mit Playbutton. Sonst sieht man nichts auf dem Handy") ──────────────────────
   *
   * Ton ohne Berührung verbieten die Handy-Browser. Der Film blieb dann stehen — und weil er
   * stand, war die Fläche leer. Jetzt steht dort das Werk (`poster`) und darüber ein Kreis zum
   * Antippen. Wo der Ton von selbst startet (Rechner), erscheint der Knopf gar nicht erst:
   * `laeuft` wird gesetzt, sobald wirklich etwas läuft.
   */
  const [laeuft, setLaeuft] = useState(false);
  /** Ob schon jemand auf den Kreis gedrückt hat — vorher wird kein Film geladen (siehe unten). */
  const [gestartet, setGestartet] = useState(false);
  const startVersucht = useRef(false);
  /**
   * ── DIE LEISTE IST UNSERE, WEIL DIE DES BROWSERS VERSCHWINDET ────────────────────────────
   *
   * Erst hatten wir eine eigene (Owner: „man soll das Video-Panel immer sehen"), dann die
   * eingebaute (Owner: „Sound-Icon fehlt, mach wieder das originale rein") — und die blendet
   * sich nach drei Sekunden ohne Mausbewegung aus. Also die eigene, aber mit allem, was ihm
   * gefehlt hat: Ton und Vollbild. Sie steht unter dem Film und geht nie weg.
   */
  const [zeit, setZeit] = useState(0);
  const [dauer, setDauer] = useState(0);
  const [stumm, setStumm] = useState(false);
  const huelleRef = useRef<HTMLSpanElement>(null);
  /**
   * ── VOLLBILD WIRD GESETZT, NICHT ERHOFFT (Owner 17.09.2026: „es klebt immer noch links") ──
   *
   * Die CSS-Regel `:fullscreen` griff in Chrome nicht zuverlässig — der Film blieb oben links
   * in einer schwarzen Fläche stehen. Also merken wir uns den Zustand selbst und stellen Hülle
   * und Film direkt: Spalte, mittig, Film so hoch wie der Platz abzüglich Leiste.
   */
  const [vollbild, setVollbild] = useState(false);
  const bildHuelle = useRef<HTMLSpanElement>(null);
  /** Vollbild an oder aus — für den Film und für das stille Werk dieselbe Schaltung. */
  const vollbildUmschalten = (el: HTMLElement | null) => {
    if (document.fullscreenElement) { void document.exitFullscreen().catch(() => {}); return; }
    void el?.requestFullscreen?.().catch(() => {});
  };

  const [montiert, setMontiert] = useState(false);
  useEffect(() => setMontiert(true), []);
  useEffect(() => {
    const wechsel = () => setVollbild(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", wechsel);
    return () => document.removeEventListener("fullscreenchange", wechsel);
  }, []);
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const musik = useRef<HTMLAudioElement>(null);

  /**
   * ── TON OHNE KNOPF (Owner 16.09.2026: „button raus. Sound startet automatisch") ───────────
   *
   * SOFORT BEIM EINHÄNGEN, NICHT ERST BEI `canplay`: Der Browser erlaubt Ton nur kurz nach
   * einem Klick („transient activation"). `canplay` kommt erst, wenn genug geladen ist — bei
   * einem Megabyte über Mobilfunk längst danach. Dann schaltete er stumm, und man hörte nichts.
   *
   * Schlägt es trotzdem fehl, läuft der Film stumm weiter und wird bei der ERSTEN Berührung
   * der Seite laut. Steht hier als Funktion, weil zwei Filme sie brauchen: der Zoom und der,
   * in dem der Künstler spricht.
   */
  const tonStarten = (el: HTMLVideoElement | null) => {
    if (!el) return;
    el.muted = false;
    el.volume = 1;
    void el.play().catch(() => {
      el.muted = true;
      void el.play().catch(() => { /* dann bleibt es stehen */ });
      const laut = () => {
        el.muted = false;
        void el.play().catch(() => {});
        document.removeEventListener("pointerdown", laut);
        document.removeEventListener("keydown", laut);
      };
      document.addEventListener("pointerdown", laut);
      document.addEventListener("keydown", laut);
    });
  };

  /* Escape schliesst, und solange der Film offen ist, scrollt die Seite darunter nicht weg. */
  /**
   * ── SCHLIESSEN SCHLIESST (Owner 16.09.2026: „schliesst nicht") ─────────────────────────
   *
   * Kurz war das Kreuz ein Link in die Poster-Kategorie — und tat damit etwas anderes, als es
   * verspricht: Auf einer Adresse, die es nicht gab, passierte gar nichts. Ein Kreuz macht das
   * Fenster zu, sonst nichts. Dahinter liegt die Seite des Künstlers mit seinen Postern — genau
   * der Ort, an dem man nach dem Scannen sein will.
   */
  const schliessen = () => {
    setOffen(false);
    setGestartet(false);
    startVersucht.current = false;
    /* ── UND DEN SCHALTER AUS DER ADRESSE NEHMEN (Owner 16.09.2026: „ich kann fenster nicht
       schliessen, öffnet sich immer wieder") ──────────────────────────────────────────────
       `?film=<nr>` hat das Fenster geöffnet. Bleibt es stehen, öffnet es sich beim nächsten
       Klick auf dieselbe Kachel — und beim Zurückgehen im Browser — sofort wieder. Also weg
       damit, ohne die Seite neu zu laden. */
    if (!sofort || typeof window === "undefined") return;
    try {
      const u = new URL(window.location.href);
      if (!u.searchParams.has("film")) return;
      u.searchParams.delete("film");
      /* ── UND ZURÜCK IN DIE POSTERGALERIE (Owner 17.09.2026: „wenn ich das Fenster schliesse,
         soll zurück zu der Postergalerie") ────────────────────────────────────────────────
         Der gescannte Code brachte ihn hierher — hinter dem Fenster stehen die Poster, die er
         kaufen kann. Ohne diesen Vermerk zeigte die Adresse nach dem Schliessen wieder die
         Originale, und beim nächsten Laden wäre er woanders als eben noch. */
      u.searchParams.set("ansicht", "poster");
      window.history.replaceState(null, "", `${u.pathname}${u.search}${u.hash}`);
    } catch { /* dann bleibt die Adresse stehen — das Fenster ist trotzdem zu */ }
  };

  useEffect(() => {
    if (!offen) return;
    const taste = (e: KeyboardEvent) => { if (e.key === "Escape") schliessen(); };
    document.addEventListener("keydown", taste);
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", taste); document.body.style.overflow = vorher; };
  }, [offen]);

  /* KEIN EIGENER RAHMEN UM DAS WERK (Owner 15.09.2026: „das hat auch einen rahmen. sieht blöd
     aus") — das Poster hat einen, und viele Museumsscans tragen schon eine dunkle Kante. Zwei
     Rahmen übereinander sehen nach Versehen aus. Der Schatten reicht, um es vom Papier zu heben. */
  /* ── DAS WERK IST DIE HAUPTSACHE (Owner 16.09.2026: „die werke sind kleiner als die texte.
     die leute wollen die werke sehen") ──────────────────────────────────────────────────────
     Vorher war das Bild auf 340 px gedeckelt, während Titel, Geschichte und Fusszeile darunter
     weiterwuchsen — bei einem Querformat blieb ein Streifen übrig, unter dem mehr Text stand als
     Bild. Jetzt nimmt das Werk die volle Breite der Karte, und das Poster wird so hoch oder so
     breit wie das Werk es verlangt: ein Querformat ergibt ein Querposter. */
  /* Im Poster bestimmt das Blatt die Höhe, nicht das Bild: Das Werk nimmt, was zwischen
     Überschrift und Text frei ist, und bleibt vollständig sichtbar (`object-contain`). */
  /**
   * ── DIE HÖHE IST FEST, DIE BREITE RICHTET SICH DANACH (Owner 16.09.2026: „du machst was
   * falsch. die breite des bildes ist nicht fix nur die höhe") ─────────────────────────────
   *
   * In der Posterkachel steht das Werk in einer Box mit fester Höhe. Solange das Bild seine
   * Höhe selbst bestimmte (`h-auto`) und nur die BREITE begrenzt war, wuchs ein hochformatiges
   * Porträt über die Box hinaus und legte sich über Name, Titel und Code. Jetzt füllt es genau
   * die Boxhöhe, und die Breite folgt dem Seitenverhältnis: quer wird breit, hoch wird schmal.
   */
  const rahmen = gross
    ? "block h-auto w-auto max-h-[78svh] max-w-full object-contain"
    /* ── QUER NIMMT DIE BREITE, HOCH NIMMT DIE HÖHE (Owner 16.09.2026: „hier musst du die breite
       ausnutzen") ──────────────────────────────────────────────────────────────────────────
       Ein liegendes Werk an der Höhe auszurichten lässt links und rechts Papier leer, obwohl
       genau dort der Platz ist; ein stehendes an der Breite auszurichten sprengt die Box. Also
       jedes an seiner langen Seite — begrenzt von der jeweils anderen. */
    /**
     * ── GANZ AUFS BLATT, SO GROSS WIE MÖGLICH (Owner 19.09.2026: „die Bilder müssen ganz drauf,
     * nicht abgeschnitten, und so gross wie möglich, aber mit etwas Rand zum Rahmen" · „aber
     * Künstler wollen ihre Bilder nicht abgeschnitten sehen") ─────────────────────────────────
     *
     * DREI FASSUNGEN HATTE DIESE ZEILE, jede als Antwort auf die vorige:
     *  1. An der langen Seite ausgerichtet — ein liegendes Werk liess links und rechts Papier.
     *  2. `w-full` (17.09.): Jedes Werk nahm die Breite. Ein stehendes wurde dafür zu hoch, und
     *     das Feld schnitt ab — erst mittig (Köpfe weg), dann unten.
     *  3. JETZT: Es passt GANZ hinein und wird so gross, wie beide Kanten es zulassen.
     *
     * Der Grund ist nicht Geschmack: Ein Künstler, dessen Werk beschnitten auf dem Blatt steht,
     * zeigt nicht sein Bild her, sondern einen Ausschnitt davon.
     *
     * DASS ES DANN NICHT BEI ALLEN GLEICH AUSSIEHT, ist gewollt (Owner: „das ist mir schon
     * klar"): Ein hochformatiges Werk stösst oben und unten an und lässt seitlich Papier, ein
     * liegendes umgekehrt. Das ist der Preis dafür, dass nichts mehr wegfällt.
     */
    : "block h-auto max-h-full w-auto max-w-full object-contain";
  /* Die Hülle nimmt die Breite mit, damit das Werk bis an beide Ränder läuft. */
  /* ── KEIN SCHATTEN AM WERK (Owner 17.09.2026: „schatten raus bei bild") ───────────────────
     Auf dem Blatt liegt das Werk flach auf dem Papier — ein Wurf darunter liess es schweben, und
     seit der Rahmen einen eigenen Zug nach innen hat, standen zwei Schatten übereinander. */
  const huelle = `relative inline-block max-w-full overflow-hidden leading-[0] ${gross ? "max-h-full" : "w-full"}`;

  /* ── DAS FENSTER GIBT ES AUCH OHNE FILM (Owner 16.09.2026: „bei Szidonia fehlt die QR-Seite
     … bei Van Gogh haben wir es") ───────────────────────────────────────────────────────────
     Ohne Film gab es hier kein Fenster — damit führte der Code auf dem Poster einer Künstlerin
     ins Nichts. Das Fenster zeigt jetzt IMMER das Werk gross und seine Geschichte; ein Film
     läuft darin, wenn es einen gibt.

     AUSSER BEI EINEM ORIGINAL (Owner 16.09.2026: „klick auf original öffnet jetzt qr layer, was
     zum poster gehört. es soll den agenten öffnen"): Das Fenster gehört zum Poster. Wer ein
     Original ansieht, soll dorthin kommen, wo man danach fragt. */
  if (!fenster) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={bild} alt={alt} loading="lazy" className={`${rahmen} object-contain ${huelle}`} />;
  }


  return (
    <>
      <span className={huelle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bild} alt={alt} loading="lazy" className={`${rahmen} object-contain`} />
        {/* ── KEIN PLAY-SYMBOL AUF DEM WERK (Owner 15.09.2026: „mich stört der play button. Raus")
            ────────────────────────────────────────────────────────────────────────────────────
            Ein Dreieck mitten auf einem Gemälde sieht aus wie ein Wasserzeichen. Das ganze Bild
            ist jetzt die Schaltfläche — ein Klick öffnet den Film. Was passiert, sagt die Zeile
            unter dem QR-Code, nicht ein Symbol im Motiv. */}
        {/* ── IM POSTER GEHÖRT DER KLICK DEM BLATT (Owner 17.09.2026: „klick aufs bild
            vergrössert das poster full und klick auf code führt zum QR fenster") ───────────────
            Auf einer gewöhnlichen Kachel ist das ganze Werk die Schaltfläche zum Fenster. Im
            Posterlayout nicht: dort macht ein Klick das Blatt gross, und ins Fenster führt der
            Code — wie auf dem gedruckten Poster. Dann fehlt diese Fläche ganz, statt den Klick
            abzufangen. */}
        {klickOeffnet ? (
          <button type="button" aria-label={alt}
            onClick={e => { e.preventDefault(); e.stopPropagation(); setLaedt(false); setLaeuft(false); setGestartet(false); startVersucht.current = false; setOffen(true); }}
            className="absolute inset-0" />
        ) : null}
      </span>

      {offen && montiert && createPortal(
        /**
         * ── GESCHLOSSEN WIRD NUR, WER AUF DEN HINTERGRUND DRÜCKT (Owner 17.09.2026: „ich kann
         * den Pause-Button nicht anklicken") ─────────────────────────────────────────────────
         *
         * Vorher hing das Schliessen am `click` des Hintergrunds. Ein `click` entsteht aber aus
         * Drücken UND Loslassen — und wenn sich das Element dazwischen ändert, meldet der
         * Browser den Klick am gemeinsamen Elternteil, also am Hintergrund. Genau das passierte
         * beim Pause-Knopf: Beim Drücken tauschte das Symbol von Pause auf Play, der alte Knopf
         * war weg, das Loslassen landete im Nichts — und das Fenster ging zu, statt anzuhalten.
         *
         * `pointerdown` mit `target === currentTarget` kennt dieses Problem nicht: Es zählt nur,
         * WORAUF gedrückt wurde. Auf den Hintergrund gedrückt heisst zu; auf etwas darin
         * gedrückt heisst nichts.
         */
        <div role="dialog" aria-modal="true" aria-label={alt}
          onPointerDown={e => { if (e.target === e.currentTarget) { e.preventDefault(); schliessen(); } }}
          className="fixed inset-0 z-[80] overflow-y-auto bg-black/95 p-4">
          <div onPointerDown={e => { if (e.target === e.currentTarget) { e.preventDefault(); schliessen(); } }}
            className="mx-auto flex min-h-full max-w-[720px] flex-col items-center justify-center py-8">
            {youtube ? (
              /* Gestartet wird auch hier erst auf seinen Druck — der Rahmen steht sofort, der
                 Player lädt erst danach (sonst zählt YouTube jeden Scan als Abruf). */
              <span className="relative inline-block w-full max-w-[560px] leading-[0]"
                onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                {gestartet ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtube)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                    title={alt} allow="autoplay; encrypted-media; fullscreen" allowFullScreen
                    className="aspect-[720/1018] w-full rounded-[14px] border-0" />
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sprecherBild ?? bild} alt={alt}
                      className="max-h-[62svh] w-full rounded-[14px] object-contain" />
                    <button type="button" aria-label="Play"
                      onClick={e => { e.stopPropagation(); setGestartet(true); }}
                      className="absolute inset-0 grid place-items-center">
                      <span className="grid h-[74px] w-[74px] place-items-center rounded-full bg-white/92 shadow-[0_6px_24px_rgba(0,0,0,.45)]">
                        <Play className="ml-[3px] h-7 w-7 text-[#111]" aria-hidden />
                      </span>
                    </button>
                  </>
                )}
              </span>
            ) : sprecher ? (
              /**
               * ── ERST EIN BILD, DANN AUF DRUCK DER FILM (Owner 17.09.2026: „zuerst ein
               * Standbild von ihr, das sofort da ist, mit Playbutton. Dann drücke ich auf Play
               * und es zeigt den Ladebalken. Sonst sieht man nichts auf dem Handy") ──────────
               *
               * Das Video wird gar nicht erst geladen, solange niemand gedrückt hat: Ein Bild
               * von 60 KB steht sofort, vier Megabyte Film brauchen über Mobilfunk Sekunden —
               * und in diesen Sekunden sah man nichts. Der Druck auf den Kreis hängt den Film
               * ein; bis sein erstes Bild da ist, läuft der Balken.
               *
               * Und er MUSS gedrückt werden: Ton ohne Berührung erlaubt kein Handy-Browser.
               * Diese eine Berührung ist zugleich die Erlaubnis für den Ton.
               */
              /* JEDER KLICK IM FILM BLEIBT IM FILM (Owner 17.09.2026: „ich kann das Video
                 nicht anklicken, der Panel reagiert nicht") — das Fenster schliesst sich beim
                 Klick auf den Hintergrund, und ohne diese Sperre zählte die Bedienleiste als
                 Hintergrund: Wer auf Pause tippte, schloss das Fenster. */
              <span ref={huelleRef}
                className={vollbild
                  ? "lb-film-huelle relative flex h-full w-full flex-col items-center justify-center gap-2 bg-black p-3 leading-[0]"
                  : "lb-film-huelle relative inline-block max-w-full leading-[0]"}
                onClick={e => e.stopPropagation()}>
                {!gestartet ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sprecherBild ?? bild} alt={alt}
                      className="max-h-[62svh] max-w-full rounded-[14px] object-contain" />
                    <button type="button" aria-label="Play"
                      onClick={e => { e.stopPropagation(); setLaedt(true); setGestartet(true); }}
                      className="absolute inset-0 grid place-items-center">
                      <span className="grid h-[74px] w-[74px] place-items-center rounded-full bg-white/92 shadow-[0_6px_24px_rgba(0,0,0,.45)]">
                        <Play className="ml-[3px] h-7 w-7 text-[#111]" aria-hidden />
                      </span>
                    </button>
                  </>
                ) : (
                  /* eslint-disable-next-line jsx-a11y/media-has-caption */
                  <video
                    ref={el => {
                      video.current = el;
                      /* Er hat gerade selbst gedrückt — ein Versuch genügt, mit Ton. */
                      if (el && !startVersucht.current) {
                        startVersucht.current = true;
                        el.muted = false;
                        el.volume = 1;
                        void el.play().catch(() => { /* dann steht er, und der Knopf hilft */ });
                      }
                    }}
                    src={sprecher} playsInline preload="auto" poster={sprecherBild ?? bild}
                    onTimeUpdate={e => setZeit(e.currentTarget.currentTime)}
                    onLoadedMetadata={e => setDauer(e.currentTarget.duration)}
                    onVolumeChange={e => setStumm(e.currentTarget.muted)}
                    onCanPlay={() => setLaedt(false)}
                    onPlaying={() => { setLaedt(false); setLaeuft(true); }}
                    onPause={() => setLaeuft(false)}
                    onEnded={() => setLaeuft(false)}
                    className={vollbild
                      ? "max-h-[calc(100%-64px)] max-w-full rounded-[10px]"
                      : "max-h-[62svh] max-w-full rounded-[14px]"} />
                )}
                {gestartet ? (
                  <div className={`flex items-center gap-2.5 rounded-xl bg-white/12 px-2.5 py-2 ${vollbild ? "w-[min(560px,92%)]" : "mt-2"}`}>
                    <button type="button" aria-label={laeuft ? "Pauză" : "Play"}
                      onClick={e => {
                        e.stopPropagation();
                        const v = video.current;
                        if (!v) return;
                        if (v.paused) { v.muted = false; void v.play().catch(() => {}); } else v.pause();
                      }}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#111]">
                      {laeuft ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="ml-[2px] h-4 w-4" aria-hidden />}
                    </button>
                    <input type="range" min={0} max={Math.max(dauer, 0.1)} step={0.1} value={zeit}
                      aria-label="Poziție"
                      onChange={e => { const v = video.current; if (v) { v.currentTime = Number(e.target.value); setZeit(Number(e.target.value)); } }}
                      className="h-1 w-full cursor-pointer accent-white" />
                    <span className="shrink-0 font-serif text-[13px] tabular-nums text-white/80">
                      {`${Math.floor(zeit / 60)}:${String(Math.floor(zeit % 60)).padStart(2, "0")}`}
                    </span>
                    <button type="button" aria-label={stumm ? "Sunet" : "Fără sunet"}
                      onClick={e => { e.stopPropagation(); const v = video.current; if (v) { v.muted = !v.muted; setStumm(v.muted); } }}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/90 hover:bg-white/15">
                      {stumm ? <VolumeX className="h-[18px] w-[18px]" aria-hidden /> : <Volume2 className="h-[18px] w-[18px]" aria-hidden />}
                    </button>
                    <button type="button" aria-label="Ecran complet"
                      onClick={e => {
                        e.stopPropagation();
                        const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
                        /* Auf dem iPhone kennt nur das VIDEO Vollbild, nicht ein beliebiges
                           Element — deshalb beide Wege, in dieser Reihenfolge. */
                        if (huelleRef.current?.requestFullscreen) vollbildUmschalten(huelleRef.current);
                        else if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
                        else v?.webkitEnterFullscreen?.();
                      }}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/90 hover:bg-white/15">
                      {/* IM VOLLBILD ZEIGT ER HINAUS (Owner 17.09.2026: „das Icon im Full ist
                          falsch. Muss Verkleinern-Icon sein") — ein Pfeil nach aussen im
                          Vollbild verspricht etwas, das es nicht mehr gibt. */}
                      {vollbild
                        ? <Minimize2 className="h-[17px] w-[17px]" aria-hidden />
                        : <Maximize2 className="h-[17px] w-[17px]" aria-hidden />}
                    </button>
                  </div>
                ) : null}
                {/* ── EIN KREUZ AUCH IM VOLLBILD (Owner 17.09.2026: „und Schliessen-Button, sonst
                    komme ich nicht zurück zum Fenster") ──────────────────────────────────────
                    Das Kreuz des Fensters liegt ausserhalb der Hülle — im Vollbild sieht man nur
                    noch die Hülle, also war kein Weg zurück sichtbar. Dieses hier schliesst das
                    Vollbild und lässt das Fenster stehen. */}
                {vollbild ? (
                  <button type="button" aria-label="Închide"
                    onClick={e => { e.stopPropagation(); void document.exitFullscreen().catch(() => {}); }}
                    className="absolute right-4 top-4 grid h-16 w-16 place-items-center rounded-full bg-white text-[#111] shadow-[0_4px_18px_rgba(0,0,0,.45)]">
                    <X className="h-7 w-7" aria-hidden />
                  </button>
                ) : null}
              </span>
            ) : ton ? (
              /**
               * ── DAS WERK GROSS, SEINE STIMME DAZU (Owner 17.09.2026: „ich weiss gar nicht was
               * besser ist" → das Werk, mit seiner Stimme) ──────────────────────────────────────
               *
               * Wer hier ankommt, steht vor dem Poster an einer Wand. Ihm ein Video zu zeigen, in
               * dem der Maler vor demselben Bild steht, nähme ihm genau das weg, was er gerade
               * ansieht. Also bleibt das Werk gross stehen, und der Maler erzählt dazu — wie im
               * Museum mit Audioguide. Sein Gesicht steht klein darunter, im Kreis neben dem Namen.
               *
               * ── UND MUSIK LEISE DARUNTER (Owner 17.09.2026: „meine Stimme mit Musik?" → „ja")
               *
               * Ohne Musik klingt eine Aufnahme nach Sprachnachricht; mit Musik nach etwas, das
               * gemacht wurde. Ein Fünftel der Lautstärke, in Schleife, gesteuert von seiner
               * Stimme: Wer die Stimme anhält, hält beides an. Als eigene Datei, damit sie
               * getauscht werden kann, ohne dass jemand neu aufnehmen muss.
               */
              <span className="inline-block max-w-full leading-[0]"
                onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bild} alt={alt} className="max-h-[58svh] max-w-full object-contain" />
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio ref={el => { audio.current = el; }} src={ton} controls preload="metadata"
                  onPlay={() => { const m = musik.current; if (m) { m.volume = 0.2; void m.play().catch(() => {}); } }}
                  onPause={() => musik.current?.pause()}
                  onEnded={() => { const m = musik.current; if (m) { m.pause(); m.currentTime = 0; } }}
                  className="mt-3 w-full" />
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio ref={el => { musik.current = el; }} src="/lakatosbandi/stimme-musik.mp3" loop preload="none" />
              </span>
            ) : !quelle ? (
              /**
               * ── OHNE FILM IST DAS WERK SELBST DER FILM (Owner 17.09.2026: „Klick aufs Bild
               * öffnet es full, wenn kein Video da ist, und Klick wieder aufs Bild schliesst
               * es") ──────────────────────────────────────────────────────────────────────────
               *
               * Bei einem Werk ohne Sprecher und ohne Zoom stand das Bild bisher still in der
               * Mitte und konnte nichts. Wer ein Poster kaufen will, will es aber GROSS sehen —
               * die Pinselstriche, die Signatur. Ein Klick macht es bildschirmfüllend, der
               * nächste bringt ihn zurück ins Fenster.
               */
              <span ref={bildHuelle}
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); vollbildUmschalten(bildHuelle.current); }}
                className={vollbild
                  ? "grid h-full w-full cursor-zoom-out place-items-center bg-black p-3"
                  : "inline-block cursor-zoom-in leading-[0]"}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bild} alt={alt}
                  className={vollbild ? "max-h-full max-w-full object-contain" : "max-h-[44svh] max-w-full object-contain"} />
              </span>
            ) : (
            /* eslint-disable-next-line jsx-a11y/media-has-caption */
            <video
              ref={el => { video.current = el; tonStarten(el); }}
              src={quelle} loop playsInline preload="auto" poster={bild}
              onCanPlay={() => setLaedt(false)}
              className="max-h-[44svh] max-w-full" />
            )}
            {/* Ein dünner, laufender Balken — kein Kreisel: Er sagt „es kommt gleich", ohne das
                Werk zu überdecken. Er verschwindet mit dem ersten Bild des Films. */}
            {laedt && (quelle || (sprecher && gestartet)) ? (
              <div className="mt-3 h-[3px] w-[160px] max-w-[60%] overflow-hidden rounded-full bg-white/25">
                <div className="h-full w-1/3 animate-[lbLauf_1.1s_ease-in-out_infinite] rounded-full bg-white/85" />
              </div>
            ) : null}
            {(kuenstler || titel || geschichte) && (
              <div className="mt-7 w-full text-center">
                {kuenstler ? (
                  /* Das Gesicht neben dem Namen — dasselbe wie auf dem Poster (Owner 16.09.2026:
                     „künstlerbild fehlt"). Wer den Code scannt, soll sehen, WER das gemalt hat. */
                  <p className="m-0 flex items-center justify-center gap-2.5">
                    {profil ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={profil} alt="" className="h-[34px] w-[34px] shrink-0 rounded-full object-cover" />
                    ) : null}
                    <span className="font-serif text-[15px] uppercase tracking-[0.22em] text-white">{kuenstler}</span>
                  </p>
                ) : null}
                {leben ? <p className="m-0 mt-1.5 font-serif text-[13px] text-[#8f8a80]">{leben}</p> : null}
                {titel ? <p className="m-0 mt-3 font-serif text-[16px] italic text-[#e7e4dd]">{titel}</p> : null}
                {geschichte ? <p className="m-0 mt-4 font-serif text-[16.5px] leading-[1.6] text-[#e7e4dd]">{geschichte}</p> : null}
                {(kaufPoster || kaufOriginal) && (
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {kaufOriginal ? (
                      <a href={kaufOriginal.href} onClick={e => e.stopPropagation()}
                        className="rounded-xl border border-white/35 px-5 py-3 text-[14.5px] font-semibold text-white no-underline transition hover:bg-white/10">
                        {kaufOriginal.text}
                      </a>
                    ) : null}
                    {kaufPoster ? (
                      /* Der Kaufknopf steht unter der Kachel — das Fenster geht zu, und er ist da. */
                      <button type="button"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); schliessen(); }}
                        className="rounded-xl bg-white px-5 py-3 text-[14.5px] font-semibold text-[#111] transition hover:bg-[#e7e4dd]">
                        {kaufPoster}
                      </button>
                    ) : null}
                  </div>
                )}
                {ueber ? <p className="m-0 mt-6 border-t border-white/15 pt-5 font-serif text-[15px] leading-[1.6] text-[#b9b4aa]">{ueber}</p> : null}
              </div>
            )}
          </div>
          {/* Ein sichtbarer Kreis oben rechts — der einzige Knopf im Fenster (Owner 16.09.2026:
              „schliessen button oben rechts als kreis"). Vorher war er fast durchsichtig und auf
              einem hellen Gemälde kaum zu finden. */}
          <button type="button" aria-label="Închide"
            onClick={e => { e.preventDefault(); e.stopPropagation(); schliessen(); }}
            className="absolute right-4 top-4 grid h-16 w-16 place-items-center rounded-full bg-white text-[#111] shadow-[0_4px_18px_rgba(0,0,0,.45)] transition hover:bg-[#e7e4dd]">
            <X className="h-7 w-7" aria-hidden />
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
