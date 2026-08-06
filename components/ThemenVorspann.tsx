import { Lock } from "lucide-react";

/**
 * DER VORSPANN JEDER THEMENSEITE — Anlass, Grund, drei Schritte, Privatzeile.
 *
 * Owner 05.08.2026: „was mir gefällt und alle Topic-Seiten sollen so aufgebaut werden, ist die
 * Kiss-Seite." Und am selben Abend, weil es wieder fehlte: „was ich vermisse jetzt bei topics …
 * die Schritte, die Begründung, der Anlass."
 *
 * Der Block stand nur auf der Kuss-Seite, fest im Aufbau verdrahtet. Vier andere Themenseiten
 * hätten ihn abschreiben müssen — und die fünfte Kopie ist die, die beim nächsten Umbau
 * vergessen wird. Deshalb genau EIN Baustein, den jede Seite zwischen Preis-Chip und Karte
 * setzt.
 *
 * DIE REIHENFOLGE IST DER GANZE PUNKT und nicht verhandelbar:
 *
 *   1. ANLASS — wofür, wann. Die Zeile, in der er sich wiedererkennt, und zugleich das,
 *      wonach wirklich gesucht wird: nach dem Anlass, nicht nach dem Produkt.
 *   2. GRUND — warum, fett, ein Satz. Dieser Satz trägt die Entscheidung.
 *   3. DIE DREI SCHRITTE — erst jetzt. Wer noch nicht weiß, ob es für ihn ist, liest keine
 *      Anleitung.
 *   4. DIE PRIVATZEILE — sie beantwortet die Frage, die jeden vom Hochladen abhält: wer sieht
 *      das? Die Antwort ist gut, also gehört sie nach oben und nicht ins Kleingedruckte.
 *
 * SCHRIFTGRÖSSEN (Owner 05.08.2026: „diese Schrift ist zu klein"): Der Anlass steht auf 14 px
 * bei 75 % Deckkraft — lesbar bei Tageslicht auf dem Handy, Kontrastuntergrenze siehe Skill
 * `ci-design`. Der Grund bleibt mit 16 px die stärkere Stimme. Vorher waren es 12,5 px bei
 * 60 %, also Kleingedrucktes — und diese Zeile ist das genaue Gegenteil davon.
 *
 * Die Texte kommen aus `kissText(lang, variante)` (lib/kiss-i18n) und sind dort je Thema
 * hinterlegt; hier steht kein einziges Wort.
 */
export default function ThemenVorspann({ anlass, grund, wieGeht, wieGehtPrivat, className = "" }: {
  /** Wofür und wann — eine Zeile, mit „ · " getrennt. */
  anlass: string;
  /** Warum — ein Satz, fett. */
  grund: string;
  /** Genau drei Schritte. Mehr liest niemand vor dem ersten Tipp. */
  wieGeht: string[];
  /** Wer es sieht — mit Schloss, in Gold. */
  wieGehtPrivat: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mt-3 text-[14px] font-bold leading-snug text-white/75">{anlass}</p>
      <p className="mt-2 text-[16px] font-black leading-snug text-white/90">{grund}</p>

      <ol className="mt-3 space-y-1.5">
        {wieGeht.map((zeile, i) => (
          <li key={i} className="flex gap-2.5 text-[13.5px] font-semibold leading-snug text-white/75">
            <span className="mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#f6cf51]/15 text-[11px] font-black text-[#f6cf51]">
              {i + 1}
            </span>
            {zeile}
          </li>
        ))}
      </ol>

      <p className="mt-2.5 flex items-start gap-1.5 text-[12.5px] font-bold leading-snug text-[#f6cf51]">
        <Lock className="mt-[2px] h-3.5 w-3.5 shrink-0" />
        {wieGehtPrivat}
      </p>
    </div>
  );
}
