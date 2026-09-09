"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, PhoneCall, StickyNote, Trash2 } from "lucide-react";

/**
 * DIE DREI PUNKTE AN JEDER ANFRAGE (Owner 09.09.2026: „ich brauche noch 3 Punkte bei jedem,
 * wo ich es löschen kann oder markieren kann für angerufen oder eine Notiz machen kann. Aber
 * nicht jetzt. Nur die 3 Punkte").
 *
 * ES IST BEWUSST NUR DAS MENÜ. Er schaltet als Nächstes Werbung und will sehen, ob sein
 * Trichter trägt; drei halbfertige Funktionen daneben wären Ballast, den niemand geprüft hat.
 * Der Platz steht, die Wege stehen — gebaut wird, wenn die Anzeige läuft.
 *
 * DASS SIE NOCH NICHT GEHEN, STEHT DRAN. Ein Menüpunkt, der beim Antippen nichts tut, ist
 * schlimmer als keiner: Beim ersten Mal hält man es für einen Fehler, beim zweiten für eine
 * kaputte Seite. „Kommt noch" ist die ehrliche Antwort und kostet eine Zeile.
 *
 * KEIN OVERLAY-DIALOG (Hausregel [[keine-overlay-dialoge]]): Das hier ist ein kleines Menü an
 * seinem Knopf, keine Fläche über der Seite. Es schliesst bei Klick daneben und mit Escape —
 * ein Menü ohne Ausweg wäre derselbe Fehler in klein ([[immer-close-einbauen]]).
 *
 * LÖSCHEN WIRD SPÄTER ZWEI TIPPS UND ROT ([[loeschen-zwei-tipps-rot]]), nie ein
 * Browser-Fenster. Deshalb steht es hier schon rot und ganz unten, getrennt von den anderen.
 */
export default function AnfrageMenue({ wer }: { wer: string }) {
  const [offen, setOffen] = useState(false);
  const huelle = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!offen) return;
    const daneben = (e: MouseEvent) => {
      if (huelle.current && !huelle.current.contains(e.target as Node)) setOffen(false);
    };
    const flucht = (e: KeyboardEvent) => { if (e.key === "Escape") setOffen(false); };
    document.addEventListener("mousedown", daneben);
    document.addEventListener("keydown", flucht);
    return () => {
      document.removeEventListener("mousedown", daneben);
      document.removeEventListener("keydown", flucht);
    };
  }, [offen]);

  return (
    <div ref={huelle} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOffen(o => !o)}
        aria-label={`Mehr zu ${wer}`}
        aria-expanded={offen}
        className={`grid h-9 w-9 place-items-center rounded-full transition ${
          offen ? "bg-[#eaf2fc] text-[#1d6fd0]" : "text-[#8b959d] hover:bg-[#f0f3f6] hover:text-[#14181c]"}`}
      >
        <MoreVertical className="h-[18px] w-[18px]" aria-hidden />
      </button>

      {offen && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-30 w-[236px] rounded-xl border border-[#e4e9ee] bg-white p-1.5 shadow-[0_10px_34px_rgba(20,24,28,.16)]"
        >
          <Punkt icon={<PhoneCall className="h-4 w-4" />} wort="Als angerufen markieren" />
          <Punkt icon={<StickyNote className="h-4 w-4" />} wort="Notiz schreiben" />
          <div className="my-1.5 border-t border-[#eef1f4]" />
          <Punkt icon={<Trash2 className="h-4 w-4" />} wort="Anfrage löschen" rot />
          <p className="px-3 pb-1.5 pt-2 text-[13.5px] font-semibold text-[#8b959d]">
            Kommt noch — erst läuft die Anzeige.
          </p>
        </div>
      )}
    </div>
  );
}

/** Ein Menüpunkt. Noch ohne Weg — sichtbar abgeschaltet, nicht heimlich tot. */
function Punkt({ icon, wort, rot = false }: { icon: React.ReactNode; wort: string; rot?: boolean }) {
  return (
    <button
      type="button"
      disabled
      role="menuitem"
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[15px] font-bold opacity-45 ${
        rot ? "text-[#c02626]" : "text-[#14181c]"}`}
    >
      {icon}
      {wort}
    </button>
  );
}
