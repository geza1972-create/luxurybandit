import type { VersusForgeTexte } from "@/lib/versusforge-texte";
import { mitMarke } from "@/components/VersusForgeMarke";
import { T_TITEL, T_TEXT, T_KLEIN, T_LABEL, T_ZAHL_GROSS } from "@/lib/versusforge-typo";

/**
 * DER DASHBOARD-BEWEIS — NACHGEBAUT, NICHT FOTOGRAFIERT (Owner 08.09.2026, wichtigster Punkt
 * der Überarbeitung).
 *
 * WARUM KEIN SCHIRMFOTO: Am 08.09.2026 nachgeprüft — es gibt kein Kunden-Dashboard, und die
 * Leadliste (`app/api/meta-leads/route.ts`) hat keinen Zugang, weil `META_PAGE_ACCESS_TOKEN`
 * leer ist. Es kommt kein einziger echter Lead an. Es gibt also nichts zu fotografieren.
 *
 * DESHALB STEHT „BEISPIEL" DRAUF, und zwar gut sichtbar, nicht im Kleingedruckten. Ein
 * nachgebautes Dashboard mit echt aussehenden Namen und Zahlen ohne diesen Hinweis wäre eine
 * Behauptung über etwas, das nicht läuft — dieselbe Grenze wie bei Annas Karte im
 * David-Trichter („Anna ist ein erfundenes Beispiel").
 *
 * WOZU ER TROTZDEM DA IST: Die Zielgruppe hat schon eine Website, die nichts bringt, und
 * zahlt für Portale. Sie hat genug Versprechen gehört. Was sie noch nie gesehen hat, ist die
 * Liste — Name, Zeit, Satz. Das ist das Ergebnis, nicht die Idee.
 *
 * KEIN FLIESSTEXT DANEBEN (Owner): Überschrift, Zahlen, Liste. Wer das sieht, versteht es.
 */
export default function VersusForgeDashboard({ S, hell = false }: { S: VersusForgeTexte; hell?: boolean }) {
  const rand = hell ? "border-black/[0.08]" : "border-white/12";
  const flaeche = hell ? "bg-white" : "bg-white/[0.03]";
  const gedaempft = hell ? "text-[#64748b]" : "text-white/45";
  const stark = hell ? "text-[#0f172a]" : "text-white";

  const zahlen = [
    /* NACH UNTEN KORRIGIERT (Owner 08.09.2026: „muss glaubwürdig sein, nicht
       beeindruckend"). 47 Anfragen für 312 € wären 6,64 € je Anfrage — in Rumänien möglich,
       in Deutschland für Pflegekräfte zu optimistisch, und es gibt keine eigenen Daten dazu.
       300 € auf 30 Tage sind genau 10 € am Tag, also die untere Kante der Budget-Zeile. */
    { wert: "300 €", label: S.dashAusgaben },
    { wert: "22", label: S.dashAnfragen },
    { wert: "13,60 €", label: S.dashProAnfrage },
  ];
  const leads = [
    { n: S.dashL1Name, z: S.dashL1Zeit, t: S.dashL1Text },
    { n: S.dashL2Name, z: S.dashL2Zeit, t: S.dashL2Text },
    { n: S.dashL3Name, z: S.dashL3Zeit, t: S.dashL3Text },
  ];

  return (
    <section className="mt-14 md:mt-20">
      <div className="flex items-center gap-3">
        <h2 className={`${T_TITEL} ${stark}`}>{mitMarke(S.dashTitel)}</h2>
        {/* Der Hinweis steht NEBEN der Überschrift, nicht unter der Liste: Wer nur das Bild
            überfliegt, muss ihn trotzdem gesehen haben. */}
        <span className={`rounded-full border border-[#f6cf51]/50 px-2.5 py-1 ${T_LABEL} text-[#f6cf51]`}>
          {S.dashHinweis}
        </span>
        {/* Der Zeitraum gehört an die Überschrift, nicht unter die Zahlen: Sonst liest man
            300 € als Tagesbetrag und stolpert über die Budget-Zeile weiter oben. */}
        <span className={`${T_KLEIN} ${gedaempft}`}>{S.dashZeitraum}</span>
      </div>

      <div className={`mt-5 overflow-hidden rounded-3xl border ${rand} ${flaeche}`}>
        <div className={`grid grid-cols-3 divide-x ${hell ? "divide-black/[0.08]" : "divide-white/10"}`}>
          {zahlen.map(z => (
            <div key={z.label} className="px-4 py-5 md:px-6 md:py-6">
              <p className={`${T_ZAHL_GROSS} ${stark}`}>{z.wert}</p>
              <p className={`mt-2 ${T_LABEL} ${gedaempft}`}>{z.label}</p>
            </div>
          ))}
        </div>

        <div className={`border-t ${hell ? "border-black/[0.08]" : "border-white/10"} px-4 py-4 md:px-6`}>
          <p className={`${T_LABEL} ${gedaempft}`}>{S.dashListe}</p>
          <ul className={`mt-3 divide-y ${hell ? "divide-black/[0.06]" : "divide-white/[0.07]"}`}>
            {leads.map(l => (
              <li key={l.n} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`${T_TEXT} font-black ${stark}`}>{l.n}</span>
                  <span className={`shrink-0 ${T_KLEIN} ${gedaempft}`}>{l.z}</span>
                </div>
                <p className={`mt-1 ${T_TEXT} ${hell ? "text-[#334155]" : "text-white/70"}`}>{l.t}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* WAS PASSIERT DANACH — drei Zeilen, kein Fliesstext (Owner 08.09.2026). Er steht
          direkt unter den Zahlen, weil genau dort die Frage entsteht: „und wenn da nur
          drei stehen?" */}
      <div className={`mt-6 rounded-3xl border ${rand} px-5 py-5 md:px-6`}>
        <p className={`${T_TITEL} ${stark}`}>{S.danachTitel}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {[S.danachEins, S.danachZwei, S.danachDrei].map(z => (
            <li key={z} className={`flex gap-2.5 ${T_TEXT} ${hell ? "text-[#334155]" : "text-white/75"}`}>
              <span className="text-[#f6cf51]">·</span><span className="min-w-0 flex-1">{z}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
