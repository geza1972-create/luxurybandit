"use client";

import { useState } from "react";
import { AgentenKreise, Knopf } from "@/components/CI";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";
import AgentenChat from "@/components/AgentenChat";
import type { AgentenTexte } from "@/lib/agenten-texte";

/**
 * „WIR GENERIEREN LEADS FÜR JEDE BRANCHE" — DIE FIRMEN-KARTE AUF DER STARTSEITE.
 *
 * Owner 29.08.2026: „das sieht richtig unspektakulär aus … das müsste in einer weissen Card
 * sein und richtig toll gestaltet." Vier Absätze auf Schwarz sind kein Angebot, sondern eine
 * Notiz. Das Haus hat dafür ein Muster — die Creme-Karte mit Eckranken, Innenrahmen,
 * goldenem Kicker und nummerierten Kacheln (Dauerregel
 * [[produktaufbau-video-card-feature-card]]).
 *
 * WARUM KARTE UND GESPRÄCH IN EINEM BAUSTEIN: Der goldene Knopf gehört auf die Karte, das
 * Gespräch aber NICHT hinein — in `.lb-karte` färbt das Stylesheet jede Schrift auf
 * Dunkelbraun um (Memory [[lb-karte-important-frisst-inline-farben]]), die dunklen
 * Sprechblasen wären darin unlesbar. Also hält dieser Baustein den Zustand, zeigt den Knopf
 * oben auf dem Papier und das Gespräch darunter auf dem dunklen Grund.
 *
 * KEIN WEISSER RAHMEN (Owner: „schon wieder weisser Rahmen") — die Karte setzt sich durch
 * ihre eigene Fläche ab, dafür braucht es keinen Strich und keine Trennlinie darüber.
 */
/*
 * KEIN LINK AUF DAVID (Owner 29.08.2026: „sieh dir … das auch nicht. In unserm Topic sieht
 * er."). Davids Kachel steht auf DERSELBEN Seite, ein paar Zeilen weiter oben — ein Knopf,
 * der dorthin führt, wo der Besucher gerade herkommt, ist eine Sackgasse mit Umweg. Und in
 * der Kreis-Reihe steht er ohnehin.
 */
export default function AgentenKarte({ T, lang, agenten }: {
  T: AgentenTexte;
  lang: string;
  /** Die Reihe der Gesichter — Namen und Bilder kommen aus der Models-Galerie. */
  agenten: { name: string; branche: string; bild?: string }[];
}) {
  const [offen, setOffen] = useState(false);

  return (
    <section className="mt-14">
      <div className="lb-karte relative overflow-hidden rounded-[20px] px-4 pb-5 pt-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <CornerOrnaments />
        <div className="lb-karte-rahmen pointer-events-none absolute inset-[8px] rounded-[14px]" />
        <div className="relative">
          <p className="lb-karte-gold text-center text-[10px] font-black uppercase tracking-[0.24em]">{T.kicker}</p>
          <DividerOrnament className="mt-2" />

          {/* Der Titel in der Serife — die Karte ist Papier, nicht Bedienfläche. */}
          <h2 className="mt-3 text-center font-serif text-[24px] font-black leading-[1.15]">{T.titel}</h2>
          <p className="mx-auto mt-2 max-w-[34ch] text-center text-[13px] font-medium leading-snug opacity-75">{T.p1}</p>

          {/* ── DIE GESICHTER: der eigentliche Beweis für „jede Branche" ──
              Fünf Namen mit Fach darunter sagen in einer Sekunde, was drei Absätze
              behaupten müssten. David steht mittendrin, nicht vorne (Owner: „David nicht
              so hervorheben"). */}
          <div className="mt-4">
            <AgentenKreise agenten={agenten} />
            <p className="mt-2 text-center text-[11px] font-bold leading-snug opacity-60">{T.agentenZeile}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {[[T.k1t, T.k1p], [T.k2t, T.k2p], [T.k3t, T.k3p], [T.k4t, T.k4p]].map(([t, x], i) => (
              <div key={i} className="lb-karte-news rounded-[12px] px-2.5 py-2">
                <span className="lb-karte-gold text-[10.5px] font-black">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-0.5 text-[12.5px] font-black leading-snug">{t}</p>
                <p className="mt-0.5 text-[11px] font-medium leading-snug opacity-70">{x}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-center text-[11.5px] font-black leading-snug opacity-75">{T.kartenSchluss}</p>

          {/* DER EINE GOLDKNOPF DIESER KARTE (CI-Regel) — er fragt nicht zum Spass, er
              startet die Anfrage. In der Karte heisst Gold `lb-karte-cta`; das setzt der
              `karte`-Schalter der Bibliothek selbst. */}
          {!offen && (
            <div className="mt-4">
              <Knopf art="gold" karte onClick={() => setOffen(true)}>{T.anfrageKnopf}</Knopf>
            </div>
          )}

        </div>
      </div>

      {/* Das Gespräch steht UNTER der Karte auf dem dunklen Grund, wo seine Farben stimmen. */}
      <AgentenChat T={T} lang={lang} offen={offen} />
    </section>
  );
}
