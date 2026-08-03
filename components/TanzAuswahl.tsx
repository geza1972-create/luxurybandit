"use client";

import { useEffect, useRef, useState } from "react";

import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import TeilenKnopf from "@/components/TeilenKnopf";
import { SCHRITTE_OEFFNEN, TEILEN_TEXT } from "@/components/BeispielGalerie";
import { POLEDANCE_REFERENZEN } from "@/lib/poledance";
import { kissText } from "@/lib/kiss-i18n";

/**
 * DIE TANZ-AUSWAHL AUF DER LANDINGPAGE — DIESELBE KARTE, MEHRMALS UNTEREINANDER.
 *
 * Owner 03.08.2026, nach der ersten Fassung: **„nein, nicht so, Mann — schau dir mal Kiss an."**
 *
 * Hier stand ein Raster aus acht kleinen Videokacheln mit einem schmalen Knopf darunter. Der
 * Kuss macht seit dem 31.07. das Gegenteil, und das ist keine Geschmacksfrage: Eine Kachel im
 * Raster ist ein VORSCHAUBILD. Dieselbe Karte in voller Breite, mit Ranken und
 * „made by luxurybandit.com", ist ein ERGEBNIS — sie sieht aus wie das, was er bekommt, weil es
 * dieselbe Datei ist. Wer scrollt, sieht achtmal dasselbe Versprechen statt einmal acht
 * Briefmarken.
 *
 * Die Regel steht ausgeschrieben in `Landingpage.md`; die Vorlage im Code ist
 * `components/BeispielGalerie.tsx`, von der hier Ereignis, Teilen-Text und Aufbau kommen.
 *
 * DER EINE UNTERSCHIED ZUM KUSS: Dort ist jedes Beispiel derselbe Startpunkt. Hier ist jede
 * Karte auch eine WAHL — der fertige Tanz wird zur Bewegungsvorlage („Model ersetzen"). Ein Tipp
 * tut deshalb beides: Er merkt sich die Vorlage und oeffnet die Schritte.
 */

/**
 * WARUM DIE VIDEOS ERST BEIM HERANSCROLLEN GELADEN WERDEN.
 *
 * GEMESSEN: acht Referenzvideos sind 19 MB. Und `SchleifenVideo` haengt fuer die weiche
 * Ueberblendung ZWEI `<video preload="auto">` an dieselbe Quelle — auf einem Handy waeren das
 * sechzehn laufende Spieler und 19 MB, bevor er die zweite Karte gesehen hat.
 *
 * Also traegt jede Karte zunaechst nur ein Standbild aus dem eigenen Video (`#t=0.1`,
 * `preload="metadata"` laedt nur den Dateikopf) und wird zum echten Spieler, sobald sie in die
 * Naehe des Bildschirms kommt. `rootMargin` gibt ihr einen Bildschirm Vorlauf, damit sie laeuft,
 * wenn er ankommt — und nicht erst anfaengt zu laden, wenn er schon hinsieht.
 */
function NahDran({ children, platzhalter }: { children: React.ReactNode; platzhalter: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [nah, setNah] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    /* Ohne IntersectionObserver (sehr alte Browser) lieber alles zeigen als nichts. */
    if (typeof IntersectionObserver === "undefined") { setNah(true); return; }
    const beob = new IntersectionObserver(eintraege => {
      if (eintraege.some(e => e.isIntersecting)) { setNah(true); beob.disconnect(); }
    }, { rootMargin: "600px 0px" });
    beob.observe(el);
    return () => beob.disconnect();
  }, []);

  return (
    <div ref={box}>
      {nah ? children : (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={`${platzhalter}#t=0.1`} muted playsInline preload="metadata"
          className="aspect-[3/4] w-full object-cover" />
      )}
    </div>
  );
}

export default function TanzAuswahl({ lang = "en", titel, knopf, gewaehlt }: {
  lang?: string;
  /** Die Zeile ueber dem Stapel — „Noch eins, anderer Look". */
  titel: string;
  /** Beschriftung des Knopfes auf jeder Karte — „Model ersetzen". */
  knopf: string;
  /** Dasselbe, wenn diese Karte die gewaehlte ist — „Gewaehlt". */
  gewaehlt: string;
}) {
  const K = KARTE_TEXTE[lang] ?? KARTE_TEXTE.en;
  const T = kissText(lang, "poledance");
  /* Dieselbe Ueberschrift wie auf der Karte im Trichter: der Schrittname ohne die fuehrende
     Nummer. So heisst das Beispiel oben genauso wie sein eigenes Ergebnis spaeter. */
  const karteTitel = String(T.step3 ?? "").replace(/^\s*\d+\s*[·.\-]\s*/, "");

  /**
   * NICHTS IST VORGEWAEHLT, BIS ER WAEHLT.
   *
   * Hier stand `|| POLEDANCE_REFERENZEN[0].video`: Wer die Seite oeffnete, sah auf der ersten
   * Karte „Gewaehlt" — fuer eine Wahl, die er nie getroffen hat. Das ist dieselbe Sorte
   * Unwahrheit wie eine Kachel, die verschwindet, bevor der Server zugestimmt hat.
   *
   * Der Trichter braucht die Vorauswahl auch nicht: Er faellt von sich aus auf `beispielVideo`
   * zurueck, wenn nichts gewaehlt wurde (`refVideo || beispielVideo`).
   */
  const [wahl, setWahl] = useState("");
  useEffect(() => {
    try { setWahl(localStorage.getItem("lb_tanz_ref") || ""); } catch { /**/ }
  }, []);

  const waehlen = (video: string) => {
    setWahl(video);
    /* Beides: Das Ereignis erreicht den Trichter sofort, `localStorage` ueberlebt ein Neuladen
       — und faengt den Fall ab, dass der Trichter beim Tipp noch nicht steht. */
    try { localStorage.setItem("lb_tanz_ref", video); } catch { /**/ }
    try { window.dispatchEvent(new CustomEvent("lb-tanz-ref", { detail: video })); } catch { /**/ }
    /* ERST NACH OBEN, DANN OEFFNEN (Kuss-Regel): Sonst geht der Dialog auf, waehrend er unten
       steht, und er sieht nicht, dass etwas passiert ist. */
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /**/ }
    try { window.dispatchEvent(new CustomEvent(SCHRITTE_OEFFNEN)); } catch { /**/ }
  };

  return (
    <div className="mt-10">
      <p className="text-center text-[11px] font-black uppercase tracking-[0.24em] text-[#f6cf51]/80">{titel}</p>
      <div className="mt-4 space-y-5">
        {POLEDANCE_REFERENZEN.map(r => {
          const an = wahl === r.video;
          return (
            /* DER GOLDRAHMEN IST DIE EIGENTLICHE MARKIERUNG. Der Knopf sagt WAS passiert, der
               Rahmen sagt WELCHE es ist — beim Scrollen durch acht gleich aufgebaute Karten
               sieht man einen Rahmen von weitem, ein Wort im Knopf erst beim Lesen.
               `EinladungKarte` nimmt kein `className`, also traegt ihn eine Huelle. */
            <div key={r.id}
              className={an ? "rounded-[24px] ring-2 ring-[#f6cf51] ring-offset-4 ring-offset-black" : ""}>
            <EinladungKarte
              sprache={lang} sie="" er="" demo titel={karteTitel}
              video={
                <div className="relative">
                  <NahDran platzhalter={r.video}>
                    <EinladungAnsicht id="" videoUrl={r.video} zaehlen={false}
                      tonText={K.ton} tonAusText={K.tonAus} />
                  </NahDran>
                  {/* Links oben, gegenueber dem Ton-Knopf — ueber der Tippflaeche (z-30),
                      sonst schluckt sie den Knopf. Ziel ist die Themenseite: Wer den Link
                      bekommt, soll hierher, nicht auf ein einzelnes Video. */}
                  <TeilenKnopf rund url="/themes/surprise?utm_source=share"
                    text={TEILEN_TEXT[lang] ?? TEILEN_TEXT.en}
                    label={K.teilen} kopiertLabel={K.zusDanke}
                    className="absolute left-2 top-2 z-30" />
                  {/* DAS GANZE VIDEO IST DER KNOPF (Kuss-Regel: „beim Klick auf Video kommt
                      direkt Upload"). Ab `top-16`, nicht `inset-0` — sonst liegt die Flaeche
                      ueber dem Ton-Knopf und die Musik ist nicht mehr einzuschalten. Ein
                      <div> und kein <button>: Ein Knopf im Knopf ist kaputtes HTML. */}
                  <div role="button" tabIndex={0} onClick={() => waehlen(r.video)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); waehlen(r.video); } }}
                    aria-label={an ? gewaehlt : knopf}
                    className="absolute inset-x-0 bottom-0 top-16 z-20 flex cursor-pointer items-end justify-center p-4">
                    {/* Ein echtes CTA: dasselbe Gold wie jeder andere Knopf, volle Breite.
                        Eine dunkle, halbdurchsichtige Pille sah aus wie eine Bildunterschrift
                        und nicht wie etwas, das man drueckt.

                        DAS GOLD BLEIBT AUCH BEI DER GEWAEHLTEN KARTE. Hier stand fuer sie
                        `bg-white/90` — und damit sah ausgerechnet die gewaehlte Karte blass
                        und abgeschaltet aus, waehrend die sieben anderen leuchteten. Genau
                        verkehrt herum: Was er genommen hat, ist der staerkste Zustand, nicht
                        der schwaechste. Unterschieden wird jetzt nur noch durch den Haken und
                        das Wort — und durch den Goldrahmen um die Karte. */}
                    <span className="lb-gold flex h-12 w-full items-center justify-center gap-1.5 rounded-full text-[14px] font-black shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
                      {/* EIN SCHRIFTZEICHEN, KEIN SYMBOL-BAUSTEIN: `.lb-karte svg` faerbt jedes
                          Icon in der Karte auf Gold — ein goldener Haken auf goldenem Knopf ist
                          nicht zu sehen. Das Zeichen erbt dagegen die dunkle Kartenschrift und
                          steht klar darauf. (Derselbe !important-Griff wie beim Teilen-Knopf.) */}
                      {an ? <>✓ {gewaehlt}</> : knopf}
                    </span>
                  </div>
                </div>
              }
            />
            </div>
          );
        })}
      </div>
    </div>
  );
}
