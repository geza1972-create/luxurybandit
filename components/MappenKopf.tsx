import type { LucideIcon } from "lucide-react";
import { CornerOrnament, DividerOrnament } from "@/components/BoxOrnaments";

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
    /* LINKSBÜNDIG (Owner 25.08.2026: „titel Links") — dieselbe Kante wie der Betreff und
       der Brieftext darunter; ein mittiger Titel über linksbündigem Fliesstext bricht die
       Lesekante, die ein Dokument zusammenhält. Zeichen und Titel stehen in einer Zeile,
       der Ranken-Trenner sitzt links an derselben Kante. */
    <div className="relative overflow-hidden px-5 pb-4 pt-5 md:px-8">
      {/* NUR DIE RECHTEN RANKEN, seit der Titel links steht: Links ist jetzt die
          Lesekante (Zeichen, Titel, Trenner, Teaser) — eine Ranke dort liefe mitten in
          den Text. Rechts rahmen zwei Ranken das Band wie den Kopf eines Briefbogens. */}
      <CornerOrnament className="right-2 top-2 -scale-x-100" />
      <CornerOrnament className="bottom-2 right-2 -scale-100" />
      <div className="relative">
        <p className="flex items-center gap-2.5 font-serif text-[22px] font-black leading-none md:text-[26px]">
          <Icon aria-hidden className="lb-karte-gold h-5 w-5 shrink-0" />
          {titel}
        </p>
        <DividerOrnament className="ml-0 mt-2.5" />
        {teaser && (
          <p className="mt-2 max-w-[38ch] text-[14px] font-bold leading-snug opacity-75">{teaser}</p>
        )}
      </div>
    </div>
  );
}
