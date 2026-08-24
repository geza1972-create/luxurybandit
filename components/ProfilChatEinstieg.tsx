"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ShieldCheck } from "lucide-react";
import { Kasten } from "@/components/CI";

/**
 * DER EINSTIEG IN DEN PROFIL-CHAT (Owner 22.08.2026, Auftrag „Executive": „Include a subtle
 * entry point: Ask about Anna's experience … The AI must never invent information. Do not make
 * the chat dominate the profile. It is a supporting feature.").
 *
 * WAS ER TUT UND WAS NICHT: Er zeigt, WOMIT der Chat antworten würde — drei echte Fragen aus
 * dem Profil und den einen Satz, der die Regel nennt (nur geprüfter Lebenslauf, nichts
 * dazuerfunden). Er startet KEINE Unterhaltung: Die Antwort-Kette gehört nicht in diese
 * Aufgabe („Do not create … application chat"), und ein Feld, das nach dem Tippen nichts tut,
 * wäre schlimmer als keins (Hausregel: „Ein Knopf, der nichts tut, ist schlimmer als keiner").
 *
 * DESHALB IST DER TIPP TROTZDEM EINE ECHTE HANDLUNG: Er klappt auf und beantwortet die einzige
 * Frage, die ein Personaler an dieser Stelle wirklich hat — „was kann das Ding, und woher
 * nimmt es seine Antworten?". Wer die Kette später anschliesst, ersetzt genau die aufgeklappte
 * Fläche; Kopfzeile, Platz und Gestalt bleiben, wie sie sind.
 */
export default function ProfilChatEinstieg({ fragen, einstieg, hinweis, beispieleLabel, zuLabel, karte = false, className = "" }: {
  fragen: string[];
  einstieg: string;
  hinweis: string;
  beispieleLabel: string;
  zuLabel: string;
  /** IM KARTENPAPIER (Owner 24.08.2026: „es muss alles in der Karte sein") — schaltet den
      Kasten auf `lb-karte-rahmen` und die Trenner auf Tinte; die Schriftfarben übernimmt
      die Karte selbst per !important (Memory `lb-karte-important-frisst-inline-farben`). */
  karte?: boolean;
  className?: string;
}) {
  const [offen, setOffen] = useState(false);
  const linie = karte ? "border-[#1a160f]/15" : "border-white/12";

  return (
    <div className={`mt-6 ${className}`}>
      {/* Der stille Kasten aus der Bibliothek — kein goldener Teaser: Der eine Gold-Knopf der
          Seite gehört der Gesprächsanfrage darüber, und zwei goldene Flächen nebeneinander
          machen beide gleich unwichtig (Skill `ci-design`). */}
      <Kasten karte={karte} polster="p-0">
        <button type="button" onClick={() => setOffen(o => !o)} aria-expanded={offen}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
          <Sparkles className="h-4 w-4 shrink-0 text-[#f6cf51]" />
          <span className="min-w-0 flex-1 text-[13px] font-black leading-snug text-white/85">{einstieg}</span>
          <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${offen ? "rotate-180" : ""}`} />
        </button>

        {offen && (
          <div className={`border-t px-4 pb-4 pt-3 ${linie}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{beispieleLabel}</p>
            <div className="mt-2 flex flex-col gap-2">
              {fragen.map(f => (
                /* Fragen sehen aus wie Fragen — eingerückt und kursiv, ohne Anführungszeichen:
                   Die Seite spricht sieben Sprachen, und jede setzt sie anders („…" · " …" ·
                   « … »). Ein fest getipptes deutsches Paar stünde in sechs davon falsch. Die
                   Linie links und die Kursive sagen dasselbe, in jeder Sprache.
                   Als Chips gesetzt wären sie eine Auswahl, und eine Auswahl, die nichts
                   auslöst, ist ein kaputter Knopf. */
                <p key={f} className="border-l border-white/20 pl-3 text-[12.5px] font-semibold italic leading-snug text-white/70">
                  {f}
                </p>
              ))}
            </div>
            <p className="mt-4 flex items-start gap-2 text-[11.5px] font-bold leading-snug text-white/55">
              <ShieldCheck className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#f6cf51]/70" />
              {hinweis}
            </p>
            <button type="button" onClick={() => setOffen(false)}
              className="mt-3 text-[11px] font-black uppercase tracking-[0.14em] text-white/45 transition hover:text-white/80">
              {zuLabel}
            </button>
          </div>
        )}
      </Kasten>
    </div>
  );
}
