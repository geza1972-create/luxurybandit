import { themenPreisZeile, type ThemenSchluessel } from "@/lib/pricing";

/**
 * DER PREIS AUF DER LANDINGPAGE — dieselbe Zeile wie auf der Kachel im Katalog.
 *
 * Owner 04.08.2026: „auf jeder Landingpage muss auch der Preis stehen wie auf der Topicseite.
 * Ich weiss es selber nicht was es kostet."
 *
 * WARUM EIN EIGENER BAUSTEIN und nicht je Seite eine Zeile: Genau daran ist es vorher
 * auseinandergelaufen. Jede Seite hatte ihre eigene Formulierung, ihre eigene Zahl und ihre
 * eigene Sprache — und auf der Hochzeits-Kachel stand am Ende ein Preis (24 €), den KEINE
 * Kasse verlangte (1,49 €). Ein Baustein, eine Quelle (`lib/pricing`), und der Preis kann nur
 * noch an EINER Stelle falsch sein statt an acht.
 *
 * NUR DIE ZAHL, KEIN ERKLÄRTEXT (Owner 04.08.2026: „das schreibst du nicht: aus deinem
 * Guthaben · Aufladung 4,99 € oder 9,99 €"). Hier stand eine zweite Zeile, die den Zahlweg
 * erklärte — an einer Stelle, an der der Besucher noch gar nicht weiss, was er kauft. Wie
 * bezahlt wird, gehört an die Kasse, nicht unter die Überschrift.
 */
export default function ThemenPreis({ thema, lang, className = "" }: {
  thema: ThemenSchluessel;
  lang?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full border border-[#f6cf51]/40 bg-[#f6cf51]/10 px-2.5 py-1 text-[12px] font-black text-[#f6cf51] ${className}`}>
      {themenPreisZeile(thema, lang)}
    </span>
  );
}
