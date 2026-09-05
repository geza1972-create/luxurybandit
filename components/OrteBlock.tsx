import { Monitor, Presentation, QrCode, Smartphone } from "lucide-react";
import { Kasten } from "@/components/CI";
import { Lead, SectionTitle } from "@/components/Landing";
import { orteTexte } from "@/lib/orte-texte";

/**
 * „WO DAS LÄUFT" — der Abschnitt mit den drei Orten, als EIN Baustein.
 *
 * Owner 02.09.2026, erst fürs Media Kit („da kommt auf die Media-Kit-Seite auf erster
 * Stelle"), dann für die Startseite („auf die Startseite hier auch"). Genau deshalb ein
 * Baustein und keine zweite Kopie: Zwei Fassungen desselben Absatzes laufen auseinander,
 * sobald jemand eine davon verbessert — und dann steht auf zwei Seiten des Hauses etwas
 * Verschiedenes über dieselbe Sache. Die Texte liegen in `lib/orte-texte`.
 *
 * Alles aus der Bibliothek (Skill `ci-design`): `SectionTitle` und `Lead` für die Typo,
 * `Kasten` für die Flächen. Der Code-Kasten trägt `art="gold"` — er ist der Schluss des
 * Gedankens und das Argument, das ein Plakat nicht hat: Er ist zählbar.
 */
export default function OrteBlock({ lang = "en", className = "" }: {
  lang?: string;
  /** Abstand nach oben — die Seiten setzen ihn, nicht der Baustein. */
  className?: string;
}) {
  const t = orteTexte(lang);
  const orte = [
    { I: Smartphone, o: t.eins },
    { I: Monitor, o: t.zwei },
    { I: Presentation, o: t.drei },
  ];

  return (
    <section className={className}>
      <SectionTitle>{t.titel}</SectionTitle>
      <Lead>{t.text}</Lead>

      {/**
       * UNTEREINANDER, AUCH AUF DEM BREITEN SCHIRM (Owner 02.09.2026: „untereinander bitte").
       *
       * Hier stand `sm:grid-cols-3`. Drei Spalten klingen ordentlich, aber die Texte sind
       * zwei bis vier Zeilen lang — in einer Spalte von einem Drittel Breite bricht dann
       * fast jede Zeile nach zwei Wörtern um („Messe, Filiale, / Empfang, / Schaufenster:").
       * Das liest sich wie eine Liste von Fragmenten. Drei Kästen untereinander sind länger
       * und trotzdem in der Hälfte der Zeit gelesen.
       *
       * Die drei Orte sind gleichrangig — eine Nummerierung wie bei einer Anleitung wäre
       * hier falsch, sie sind kein Ablauf.
       */}
      <div className="mt-4 grid gap-3">
        {orte.map(({ I, o }) => (
          <Kasten key={o.titel} polster="p-4">
            <I className="h-5 w-5 text-[#f6cf51]" />
            <p className="mt-2 text-[15px] font-black text-white">{o.titel}</p>
            <p className="mt-1 text-[15px] font-medium leading-snug text-white/80">{o.text}</p>
          </Kasten>
        ))}
      </div>

      <div className="mt-3">
        <Kasten art="gold" polster="p-4">
          <div className="flex gap-3">
            <QrCode className="mt-[3px] h-5 w-5 shrink-0 text-[#f6cf51]" />
            <div>
              <p className="text-[15px] font-black text-white">{t.qrTitel}</p>
              <p className="mt-1 text-[15px] font-medium leading-snug text-white/80">{t.qrText}</p>
            </div>
          </div>
        </Kasten>
      </div>
    </section>
  );
}
