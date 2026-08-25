"use client";

import { useRef } from "react";
import { Download, Lock } from "lucide-react";
import { karteAlsPdf } from "@/lib/druck";

/**
 * „ALS PDF" AN EINER KARTE (Owner 25.08.2026: „Dann muss noch ein Download bei jeder
 * Karte: bei Resume und bei Anschreiben. Als PDF").
 *
 * Er sucht sich die Karte selbst: das nächste Elternteil mit `data-blatt`. So muss keine
 * Seite eine Kennung durchreichen, und der Knopf kann in jedem Kopfband sitzen.
 *
 * TINTE, KEIN GOLD: Das eine Gold der Seite gehört dem Kaufknopf (Skill `ci-design`).
 * Ein Download ist eine Selbstverständlichkeit, kein Angebot.
 */
export default function PdfKnopf({ dateiname, label = "Als PDF", gesperrt = false, onGesperrt }: {
  /** Vorschlag im Speichern-Dialog, z. B. „Andrei Popescu — Lebenslauf". */
  dateiname: string;
  label?: string;
  /**
   * DIE GRATIS-LINIE (Owner 25.08.2026: „er kann PDF nicht herunterladen") — der Knopf
   * bleibt sichtbar und antippbar; verschlossen führt der Tipp nicht zum Drucker, sondern
   * zur Erklärung. Ein ausgegrauter Knopf sagt „geht nicht", dieser sagt, was es kostet.
   */
  gesperrt?: boolean;
  onGesperrt?: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button ref={ref} type="button" aria-label={label} title={label}
      onClick={() => {
        if (gesperrt) { onGesperrt?.(); return; }
        karteAlsPdf(ref.current?.closest("[data-blatt]") as HTMLElement | null, dateiname);
      }}
      className="flex h-9 items-center gap-1.5 rounded-full border border-[#1a160f]/35 px-3 text-[13px] font-black transition active:scale-95">
      {gesperrt ? <Lock className="h-4 w-4" /> : <Download className="h-4 w-4" />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
