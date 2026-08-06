"use client";

import { Tag } from "lucide-react";
import { handelZeile, type HandelThema } from "@/lib/handel";

/**
 * DIE ZEILE AM EINGANG — was er bekommt und was es kostet, BEVOR er sein Foto hergibt.
 *
 * Owner 04.08.2026 (KONZEPT-GESCHENKE-UND-IDEEN.md, §6 und Punkt 2 des Pakets): „Der Handel
 * steht VOR der Arbeit, nie danach."
 *
 * WO SIE HINGEHÖRT: in den ersten Schritt jedes Trichters, über die Upload-Felder — nicht auf
 * die Landingpage (dort steht nur die Zahl, siehe `components/ThemenPreis.tsx`) und nicht auf
 * den Kaufknopf drei Schritte später. Wer ein Foto sucht, zuschneidet und hochlädt, hat
 * gearbeitet; danach einen Preis zu zeigen ist die Überraschung, die wir Canva vorwerfen.
 *
 * DER TEXT STEHT NICHT HIER, sondern in `lib/handel.ts` — eine Quelle für sieben Sprachen und
 * alle Trichter, mit Platzhaltern statt Zahlen (Memory `prices-only-from-pricing-table`).
 *
 * ZWEI ANSICHTEN, WEIL ES ZWEI UNTERGRÜNDE GIBT:
 *   Vorgabe   — dunkler Trichter: CI-Gold auf getöntem Grund (Kuss, Geburtstag, Tanz, System).
 *   `karte`   — INNERHALB der Einladungskarte (`lb-karte`). Dort gewinnt die Braun-Regel per
 *               !important gegen jede Inline- und Tailwind-Farbe; deshalb nur die
 *               Karten-Klassen benutzen (Memory `lb-karte-important-frisst-inline-farben`).
 */
export default function HandelZeile({ thema, lang, karte = false, className = "" }: {
  thema: HandelThema;
  lang?: string;
  karte?: boolean;
  className?: string;
}) {
  const text = handelZeile(thema, lang);
  // Kein Eintrag in der Leiter → gar keine Zeile. Lieber nichts als ein geratener Preis.
  if (!text) return null;

  if (karte) {
    return (
      <p className={`lb-karte-news flex items-start gap-2 rounded-xl px-3 py-2.5 font-serif text-[12px] font-bold leading-snug ${className}`}>
        <Tag className="mt-[2px] h-3.5 w-3.5 shrink-0" />
        <span>{text}</span>
      </p>
    );
  }

  /**
   * GETÖNT, NICHT GEFÜLLT — und zwar wegen der hellen Fassung.
   *
   * Mit `bg-[#f6cf51]/10` sah es auf dunkel richtig aus, in `.lb-fb` aber macht die Hausregel
   * daraus einen VOLLFLÄCHIG BLAUEN Kasten mit weisser Schrift (globals.css: jedes
   * `bg-[#f6cf51]` wird dort #1877F2). Über die ganze Breite ist das nicht mehr von einem
   * Kaufknopf zu unterscheiden — auf einer Seite, deren Knöpfe genau so aussehen. Eine
   * Preisauskunft, die man antippt, weil sie wie ein Knopf aussieht, ist schlechter als keine.
   *
   * `bg-white/[0.06]` bleibt in beiden Fassungen ein leiser Kasten (hell wird es über
   * `.lb-theme` zu einem zarten dunklen Ton); der goldene Rand und das goldene Schild tragen
   * die Aufmerksamkeit, ohne ein Angebot vorzutäuschen.
   */
  return (
    <p className={`flex items-start gap-2 rounded-2xl border border-[#f6cf51]/40 bg-white/[0.06] px-3 py-2.5 text-[12.5px] font-bold leading-snug text-white/85 ${className}`}>
      <Tag className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[#f6cf51]" />
      <span>{text}</span>
    </p>
  );
}
