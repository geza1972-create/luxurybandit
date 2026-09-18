"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

/**
 * DAS MENÜ IM KOPF (Owner 18.09.2026: „mach doch ein Icon im Menü oben").
 *
 * ── WARUM EIN ICON UND NICHT MEHR WÖRTER ────────────────────────────────────────────────────
 *
 * Im Kopf standen Preise, Journal, drei Sprachen und Login nebeneinander — auf dem Handy passte
 * das nicht, also waren zwei davon versteckt (`hidden sm:inline`), und genau dort hat der Owner
 * die Preise gesucht. Ein Strich-Symbol kostet 40 Pixel und trägt alles: Laden, Künstler,
 * Preise, Journal, Über uns, Kontakt.
 *
 * Die Sprachen und der Login bleiben AUSSEN — das eine wechselt man im Vorbeigehen, das andere
 * ist der Weg des Künstlers in sein Haus. Beides gehört nicht unter eine Klappe.
 */
export default function PortalMenue({ eintraege, label = "Menü" }: {
  eintraege: { href: string; wort: string }[];
  label?: string;
}) {
  const [auf, setAuf] = useState(false);
  const huelle = useRef<HTMLDivElement>(null);

  /* Klick daneben und Escape schliessen — ein Menü ohne Ausgang gibt es hier nicht
     (Memory `immer-close-einbauen`). */
  useEffect(() => {
    if (!auf) return;
    const daneben = (e: MouseEvent) => { if (!huelle.current?.contains(e.target as Node)) setAuf(false); };
    const taste = (e: KeyboardEvent) => { if (e.key === "Escape") setAuf(false); };
    document.addEventListener("mousedown", daneben);
    document.addEventListener("keydown", taste);
    return () => { document.removeEventListener("mousedown", daneben); document.removeEventListener("keydown", taste); };
  }, [auf]);

  return (
    <div ref={huelle} className="relative">
      <button type="button" onClick={() => setAuf(v => !v)} aria-label={label} aria-expanded={auf}
        className="grid h-10 w-10 place-items-center rounded-full text-[#111] transition hover:bg-[#f2f2f2]">
        {auf ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
      </button>

      {auf && (
        <nav className="absolute right-0 top-12 z-[60] min-w-[210px] rounded-2xl border border-[#e5e5e5] bg-white p-2 shadow-[0_18px_50px_rgba(0,0,0,.16)]">
          {eintraege.map(e => (
            <a key={e.href} href={e.href} onClick={() => setAuf(false)}
              className="block rounded-xl px-4 py-2.5 text-[15px] font-semibold text-[#111] no-underline hover:bg-[#f6f5f2]">
              {e.wort}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
