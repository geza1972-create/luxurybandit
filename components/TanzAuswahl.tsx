"use client";

import { useEffect, useRef, useState } from "react";

import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import KartenKarussell from "@/components/KartenKarussell";
import TeilenKnopf from "@/components/TeilenKnopf";
import { SCHRITTE_OEFFNEN, TEILEN_TEXT } from "@/components/BeispielGalerie";
import { POLEDANCE_REFERENZEN } from "@/lib/poledance";
import { kissText } from "@/lib/kiss-i18n";

/**
 * DIE TANZ-AUSWAHL — EINE KARTE, ALLE BEISPIELE ALS KARUSSELL DARIN.
 *
 * Owner 07.08.2026: „Bei Pool dance hast du mehrere karten auf der landingpage statt nur
 * eins mit slider." — Vorher stand hier dieselbe Karte ACHTMAL untereinander (das war die
 * Regel vom 03.08.); seit dem 05.08. macht der Kuss es anders, und das ist die neue Regel:
 * EINE Karte, alle Videos wechseln darin (`KartenKarussell`), Punkte darunter. Acht Karten
 * untereinander sind acht Blätter Papier — und jedes Video darunter lädt für jemanden, der
 * nie hinscrollt. Vorlage im Code ist `components/BeispielGalerie.tsx` (die Kuss-Galerie).
 *
 * DER EINE UNTERSCHIED ZUM KUSS bleibt: Jedes Beispiel ist auch eine WAHL — der fertige
 * Tanz wird zur Bewegungsvorlage („Model ersetzen"). Der Knopf sitzt deshalb auf JEDER
 * Folie und zeigt ihren eigenen Zustand („Gewählt" mit Haken). Der Goldrahmen um die
 * gewählte Karte ist mit dem Stapel gestorben: Er unterschied acht gleiche Karten beim
 * Scrollen — in EINER Karte sagt es der Haken auf der Folie.
 */

/**
 * WARUM DIE VIDEOS ERST BEIM HERANWISCHEN GELADEN WERDEN.
 *
 * GEMESSEN: acht Referenzvideos sind 19 MB, und `SchleifenVideo` hängt für die weiche
 * Überblendung ZWEI Spieler an dieselbe Quelle. Im Karussell hilft der
 * IntersectionObserver sogar doppelt: Seitlich hinausgeschobene Folien schneiden den
 * Bildschirm nicht und bleiben Standbilder (`#t=0.1`, `preload="metadata"` lädt nur den
 * Dateikopf) — geladen wird eine Folie erst, wenn sie ins Bild wischt oder das Karussell
 * sie von selbst nach vorn holt.
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
  /** Die Zeile über der Karte — „Noch eins, anderer Look". */
  titel: string;
  /** Beschriftung des Knopfes auf jeder Folie — „Model ersetzen". */
  knopf: string;
  /** Dasselbe, wenn diese Folie die gewählte ist — „Gewählt". */
  gewaehlt: string;
}) {
  const K = KARTE_TEXTE[lang] ?? KARTE_TEXTE.en;
  const T = kissText(lang, "poledance");
  /* Dieselbe Überschrift wie auf der Karte im Trichter: der Schrittname ohne die führende
     Nummer. So heisst das Beispiel oben genauso wie sein eigenes Ergebnis später. */
  const karteTitel = String(T.step3 ?? "").replace(/^\s*\d+\s*[·.\-]\s*/, "");

  /**
   * NICHTS IST VORGEWÄHLT, BIS ER WÄHLT (unverändert seit dem Stapel): Der Trichter fällt
   * von sich aus auf `beispielVideo` zurück, wenn nichts gewählt wurde.
   */
  const [wahl, setWahl] = useState("");
  useEffect(() => {
    try { setWahl(localStorage.getItem("lb_tanz_ref") || ""); } catch { /**/ }
  }, []);

  const waehlen = (video: string) => {
    setWahl(video);
    /* Beides: Das Ereignis erreicht den Trichter sofort, `localStorage` überlebt ein
       Neuladen — und fängt den Fall ab, dass der Trichter beim Tipp noch nicht steht. */
    try { localStorage.setItem("lb_tanz_ref", video); } catch { /**/ }
    try { window.dispatchEvent(new CustomEvent("lb-tanz-ref", { detail: video })); } catch { /**/ }
    /* ERST NACH OBEN, DANN ÖFFNEN (Kuss-Regel): Sonst geht der Dialog auf, während er
       unten steht, und er sieht nicht, dass etwas passiert ist. */
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /**/ }
    try { window.dispatchEvent(new CustomEvent(SCHRITTE_OEFFNEN)); } catch { /**/ }
  };

  return (
    <div className="mt-10">
      <p className="text-center text-[11px] font-black uppercase tracking-[0.24em] text-[#f6cf51]/80">{titel}</p>
      <div className="mt-4">
        <EinladungKarte
          sprache={lang} sie="" er="" demo titel={karteTitel}
          video={
            <KartenKarussell folien={POLEDANCE_REFERENZEN.map(r => {
              const an = wahl === r.video;
              return (
                <div key={r.id} className="relative">
                  <NahDran platzhalter={r.video}>
                    {/* Die drei Scheiben setzt die Karte (Skill `card`) — der Teilen-Knopf
                        wird hereingereicht statt von Hand platziert. */}
                    <EinladungAnsicht id="" videoUrl={r.video} zaehlen={false}
                      tonText={K.ton} tonAusText={K.tonAus}
                      teilen={
                        <TeilenKnopf rund url="/themes/surprise?utm_source=share"
                          text={TEILEN_TEXT[lang] ?? TEILEN_TEXT.en}
                          label={K.teilen} kopiertLabel={K.zusDanke} />
                      } />
                  </NahDran>
                  {/* DAS GANZE VIDEO IST DER KNOPF (Kuss-Regel). Ab `top-16`, damit die
                      Scheiben rechts oben frei bleiben. Ein <div> und kein <button>: Ein
                      Knopf im Knopf ist kaputtes HTML. */}
                  <div role="button" tabIndex={0} onClick={() => waehlen(r.video)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); waehlen(r.video); } }}
                    aria-label={an ? gewaehlt : knopf}
                    className="absolute inset-x-0 bottom-0 top-16 z-20 flex cursor-pointer items-end justify-center p-4">
                    <span className="lb-gold flex h-12 w-full items-center justify-center gap-1.5 rounded-full text-[14px] font-black shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
                      {/* Schriftzeichen statt Symbol-Baustein: `.lb-karte svg` färbt Icons in
                          der Karte um, ein Zeichen erbt die dunkle Knopfschrift. */}
                      {an ? <>✓ {gewaehlt}</> : knopf}
                    </span>
                  </div>
                </div>
              );
            })} />
          }
        />
      </div>
    </div>
  );
}
