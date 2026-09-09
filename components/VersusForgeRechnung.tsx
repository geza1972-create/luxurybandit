import type { VersusForgeTexte } from "@/lib/versusforge-texte";
import { mitMarke } from "@/components/VersusForgeMarke";
import { T_TITEL, T_TEXT, T_KLEIN, T_LABEL, T_ZAHL_GROSS } from "@/lib/versusforge-typo";

/**
 * DIE RECHNUNG AN EINEM BEISPIEL — dasselbe Muster wie Annas Karte im David-Trichter
 * (Owner 08.09.2026: „wir hatten doch die Anna als Beispiel und das will ich hier genauso
 * haben").
 *
 * WAS VON ANNA MITKOMMT, Stück für Stück:
 *
 *  · DER VERLUST ZUERST, ALS SATZ, DIE ZAHL IN GOLD. Bei Anna war die Reihenfolge einmal
 *    falsch — man las „Anna" und „34.000 €", also die zwei grössten Elemente mit der
 *    kleinsten Bedeutung. Hier steht deshalb zuerst, WOFÜR das Geld weg ist.
 *  · DIE SUMME IST AUFGESCHLÜSSELT. Eine nackte Zahl ist eine Behauptung; drei Posten, die
 *    sich addieren, sind eine Rechnung, die der Leser an seiner eigenen prüft.
 *  · „BEISPIEL" STEHT OBEN UND KLEIN, nicht unter der Karte — wer nur überfliegt, muss es
 *    trotzdem gesehen haben. Die Praxis ist erfunden, die Posten sind marktübliche
 *    Grössenordnungen.
 *
 * DER UNTERSCHIED ZU ANNA: Dort war der Verlust entgangenes Einkommen, hier ist er
 * ausgegebenes Geld. Deshalb tut diese Zahl unmittelbarer weh — sie ist schon bezahlt.
 */
export default function VersusForgeRechnung({ S, hell = false }: { S: VersusForgeTexte; hell?: boolean }) {
  /**
   * DIE RECHNUNG STEHT IN GOLD (Owner 08.09.2026: „gelbe Box").
   *
   * Sie ist die Stelle, an der es wehtut — und ein schwarzer Kasten auf schwarzem Grund hat
   * sie unsichtbar gemacht. Der Goldhauch hebt sie heraus, ohne sie zu schreien: Die Zahl
   * darin trägt ohnehin die volle Farbe.
   */
  const rand = "border-[#f6cf51]/40";
  const flaeche = "lb-goldhauch";
  const stark = hell ? "text-[#0f172a]" : "text-white";
  const leise = hell ? "text-[#64748b]" : "text-white/50";
  const text = hell ? "text-[#334155]" : "text-white/80";

  const posten = [
    { was: S.bwP1, wert: S.bwP1Wert },
    { was: S.bwP2, wert: S.bwP2Wert },
    { was: S.bwP3, wert: S.bwP3Wert },
  ];

  return (
    <section className="mt-14 md:mt-20">
      <p className={`${T_LABEL} ${leise}`}>{S.bwHinweis}</p>
      <h2 className={`mt-2 ${T_TITEL} ${stark}`}>{mitMarke(S.bwTitel)}</h2>

      <div className={`mt-5 rounded-3xl border ${rand} ${flaeche} px-5 py-5 md:px-6 md:py-6`}>
        <p className={`${T_KLEIN} ${leise}`}>{S.bwVerlustSatz}</p>

        <ul className={`mt-3 divide-y ${hell ? "divide-black/[0.06]" : "divide-white/[0.07]"}`}>
          {posten.map(p => (
            <li key={p.was} className="flex items-baseline justify-between gap-4 py-2.5">
              <span className={`${T_TEXT} ${text}`}>{p.was}</span>
              <span className={`shrink-0 ${T_TITEL} ${stark}`}>{p.wert}</span>
            </li>
          ))}
        </ul>

        {/* Die Summe trägt das Gold — sie ist die eine Zahl, die hängenbleiben soll. */}
        <div className={`mt-3 flex items-baseline justify-between gap-4 border-t pt-3 ${hell ? "border-black/[0.08]" : "border-white/10"}`}>
          <span className={`${T_LABEL} ${leise}`}>{S.bwSummeLabel}</span>
          <span className={`${T_ZAHL_GROSS} text-[#f6cf51]`}>{S.bwSumme}</span>
        </div>
      </div>

      {/* Erst der Schmerz, dann der Weg — nie ein unangenehmer Satz ohne nächsten Schritt. */}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className={`rounded-3xl border ${rand} px-5 py-4`}>
          <p className={`${T_LABEL} ${leise}`}>{S.bwDannTitel}</p>
          <p className={`mt-2 ${T_TEXT} ${text}`}>{S.bwDann}</p>
        </div>
        <div className="rounded-3xl border border-[#f6cf51]/40 lb-goldhauch px-5 py-4">
          <p className={`${T_LABEL} text-[#f6cf51]`}>{S.bwHierTitel}</p>
          <p className={`mt-2 ${T_TEXT} ${stark}`}>{mitMarke(S.bwHier)}</p>
          {/* Die einzige belegte Zahl auf der Seite — sie beantwortet die Frage, die bei
              2.000 € sonst kommt: „was kann das für den Preis schon sein?" */}
          <p className={`mt-2.5 ${T_KLEIN} ${leise}`}>{mitMarke(S.bwZusatz)}</p>
          {/* Das Werbebudget stand vorher am Startknopf und beantwortete dort einen Einwand,
              den niemand hatte. Hier ist Geld ohnehin das Thema. */}
          <p className={`mt-2 ${T_KLEIN} ${leise}`}>{S.bwBudgetSatz}</p>
        </div>
      </div>

      {/* DER EINWAND — nicht bestritten, sondern benannt. Wer es wirklich versucht hat und
          hier „doch, Werbung funktioniert" liest, ist weg. */}
      <div className={`mt-6 rounded-3xl border ${rand} px-5 py-5 md:px-6`}>
        <p className={`${T_TITEL} ${stark}`}>{mitMarke(S.objTitel)}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {[S.objEins, S.objZwei, S.objDrei].map(z => (
            <li key={z} className={`flex gap-2.5 ${T_TEXT} ${text}`}>
              <span className="text-[#f6cf51]">·</span><span className="min-w-0 flex-1">{z}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
