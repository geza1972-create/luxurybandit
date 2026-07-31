"use client";

import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";

/**
 * DIE BEISPIELE — dieselbe Karte, mehrmals untereinander.
 *
 * Owner 31.07.2026, in drei Schritten bis hierher: „mach lieber die Galerie nicht in zwei
 * Reihen sondern in einer Reihe, und du machst den Button Replace People auf jedem" — dann,
 * nach dem ersten Versuch: „du machst diese Karte mehrmals untereinander und nimmst unsere
 * Kiss-Videos."
 *
 * Der zweite Vorschlag ist der bessere, und der Grund ist derselbe wie oben auf der Seite:
 * Eine Kachel in einem Raster ist ein Vorschaubild. Dieselbe Karte mit Ornamenten, in voller
 * Breite, ist ein ERGEBNIS — sie sieht aus wie das, was er bekommt, weil es dieselbe Datei
 * ist. Und wer scrollt, sieht viermal dasselbe Versprechen statt einmal acht Briefmarken.
 *
 * Auf jeder Karte derselbe Knopf: „Personen ersetzen". Damit ist jedes Beispiel ein
 * Startpunkt und nicht Deko — „genau das, aber mit uns beiden".
 *
 * WARUM EIN FENSTER-EREIGNIS UND KEIN PROP: Die Karten stehen auf der SEITE (Server), der
 * Trichter ist ein eigener Baustein darüber. Ein Prop hieße, den halben Trichter-Zustand
 * durch die Seite zu reichen. So ist es eine Zeile hier, eine dort.
 */

/** Der Name des Ereignisses — auch der Trichter hört genau darauf. */
export const SCHRITTE_OEFFNEN = "lb-schritte-oeffnen";

export default function BeispielGalerie({ videos, lang = "en", titel = "" }: {
  videos: string[];
  lang?: string;
  /** Überschrift auf jeder Karte — beim Kuss „Der Kuss". Leer nimmt die Vorgabe der Karte. */
  titel?: string;
}) {
  const T = KARTE_TEXTE[lang] ?? KARTE_TEXTE.en;
  if (!videos.length) return null;

  const starten = () => {
    // Erst nach oben — sonst öffnet sich der Dialog, während er unten steht, und er sieht
    // nicht, was passiert ist.
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /**/ }
    try { window.dispatchEvent(new CustomEvent(SCHRITTE_OEFFNEN)); } catch { /**/ }
  };

  return (
    <div className="space-y-5">
      {videos.map((url, i) => (
        <EinladungKarte
          key={i} sprache={lang} sie="" er="" demo titel={titel || undefined}
          video={
            <div className="relative">
              <EinladungAnsicht id="" videoUrl={url} zaehlen={false}
                tonText={T.ton} tonAusText={T.tonAus} />
              {/* DAS GANZE VIDEO IST DER KNOPF (Owner 31.07.2026: „beim Klick auf Video kommt
                  direkt Upload"). Wer ein Beispiel ansieht und es antippt, meint genau das —
                  ihn dann eine kleine Schaltfläche suchen zu lassen, ist eine Hürde ohne
                  Grund.
                  Die Fläche beginnt erst unter dem Ton-Knopf (`top-16`), sonst läge sie
                  darüber und die Musik wäre nicht mehr einzuschalten. Ein <div> und kein
                  <button>, weil ein Knopf im Knopf kaputtes HTML ist. */}
              <div role="button" tabIndex={0} onClick={starten}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); starten(); } }}
                aria-label={T.menschenErsetzen}
                className="absolute inset-x-0 bottom-0 top-16 flex cursor-pointer items-end justify-center p-4">
                {/* EIN RICHTIGES CTA (Owner 31.07.2026: „richtiges CTA"). Vorher eine dunkle,
                    halbdurchsichtige Pille — die sah aus wie eine Bildunterschrift und nicht
                    wie etwas, das man drückt. Jetzt dasselbe Gold wie jeder andere Knopf in
                    der Karte, volle Breite. */}
                {/* Derselbe CI-Knopf wie oben: gelb auf dunkel, blau in der Hell-Fassung. */}
                <span className="lb-gold flex h-12 w-full items-center justify-center rounded-full text-[14px] font-black shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
                  {T.menschenErsetzen}
                </span>
              </div>
            </div>
          }
        />
      ))}
    </div>
  );
}
