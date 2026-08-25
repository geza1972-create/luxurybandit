import type { LucideIcon } from "lucide-react";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";

/**
 * DAS KOPFBAND DER MAPPE (Owner 25.08.2026, mit Bild: „Die zwei Karten müssen einen
 * fetten Titel bekommen: Anschreiben und Lebenslauf. Die zwei Karten müssen layoutmässig
 * bombe sein. Mit Teaser und Icons. Wir hatten doch die Ornamente bei den Karten. Wo sind
 * die?").
 *
 * DIE ORNAMENTE GAB ES IMMER — nur nicht hier: `components/BoxOrnaments.tsx` (Jugendstil-
 * Eckranken + Trennlinie) trägt seit Juli jede Einladungs- und Chat-Karte des Hauses; die
 * Bewerbungs-Mappe war als einzige nackt. Dieses Band holt sie zurück und macht aus einer
 * Fläche mit Text ein Dokument mit Kopf: Zeichen · fetter Titel in der Karten-Serife ·
 * Ranken-Trenner · eine Zeile Teaser, die sagt, was dieses Blatt ist.
 *
 * NUR DAS BAND TRÄGT DIE ECKRANKEN, nicht die ganze Karte: Das Dossier ist mehrere
 * Bildschirme lang — ein Rahmen um alles wäre ein Kasten, kein Briefkopf. Vier Ranken um
 * ein ~120 px hohes Band lesen sich wie der Kopf einer Urkunde.
 *
 * Die Farben kommen aus den `lb-karte-*`-Klassen, nie aus getippten Werten (Memory
 * `lb-karte-important-frisst-inline-farben`) — hell wie dunkel stimmt es damit von selbst.
 */
export default function MappenKopf({ icon: Icon, titel, teaser }: {
  icon: LucideIcon;
  /** „Anschreiben" · „Lebenslauf" — das eine Wort, gross. */
  titel: string;
  /** Eine Zeile: was dieses Blatt ist. Leer heisst: keine Zeile. */
  teaser?: string;
}) {
  return (
    <div className="relative overflow-hidden px-5 pb-4 pt-5 text-center md:px-8">
      <CornerOrnaments />
      <div className="relative">
        <Icon aria-hidden className="lb-karte-gold mx-auto h-5 w-5" />
        <p className="mt-2 font-serif text-[24px] font-black leading-none md:text-[27px]">{titel}</p>
        <DividerOrnament className="mt-2.5" />
        {teaser && (
          <p className="mx-auto mt-2 max-w-[34ch] text-[11.5px] font-bold leading-snug opacity-55">{teaser}</p>
        )}
      </div>
    </div>
  );
}
