"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/**
 * VON KÜNSTLER ZU KÜNSTLER, OHNE UMWEG (Owner 17.09.2026: „ich komme von einem künstler nicht
 * zu dem anderen, ich muss mich tot navigieren").
 *
 * Vorher führte der einzige Weg zum nächsten Künstler über die Startseite: zurück, Reiter,
 * Liste, Kreis. Jetzt steht die ganze Reihe direkt unter dem Kopf — dieselben runden Porträts
 * wie in der Künstlerliste, wischbar, der aktuelle schwarz umrandet. Ein Tipp, nächster
 * Künstler.
 *
 * ── DIE REIHE KENNT NUR IHRE GRUPPE ─────────────────────────────────────────────────────────
 * Lebende Künstler stehen neben lebenden, Meister neben Meistern (die Seite baut die Liste,
 * hier wird nur gezeigt). Wer bei Roșu ist, will zu Louisett — nicht zu Van Gogh.
 *
 * ── AUSWAHL VERSCHIEBT NIE (Skill ci-design) ────────────────────────────────────────────────
 * Beide Zustände tragen denselben Ring, nur die Farbe wechselt: schwarz für den aktuellen,
 * durchsichtig für die anderen. Sonst spränge die Reihe beim Wechsel um vier Pixel.
 *
 * Echte Links, serverseitig gerendert (dasselbe Argument wie in `PortalReiter`): Google findet
 * jede Künstlerseite von jeder anderen aus, der Zurück-Knopf führt zurück.
 */
export default function PortalKuenstlerReihe({ reihe }: {
  reihe: { kennung: string; name: string; bild: string; href: string; aktiv: boolean }[];
}) {
  const band = useRef<HTMLDivElement>(null);
  /* DER AKTUELLE HOLT SICH INS BILD — waagerecht, ohne die Seite senkrecht zu bewegen
     (`scrollIntoView` täte beides). Nur wenn er ausserhalb liegt, sonst ruckelt nichts. */
  useEffect(() => {
    const b = band.current;
    const el = b?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!b || !el) return;
    const links = el.offsetLeft - b.offsetLeft, rechts = links + el.offsetWidth;
    if (links < b.scrollLeft || rechts > b.scrollLeft + b.clientWidth) {
      b.scrollLeft = links - (b.clientWidth - el.offsetWidth) / 2;
    }
  }, []);

  if (reihe.length < 2) return null;
  return (
    <nav aria-label="Artists" className="border-b border-[#e5e5e5]">
      <div ref={band} className="lb-wisch mx-auto flex w-full max-w-[1120px] gap-4 overflow-x-auto px-5 py-3 sm:gap-5">
        {reihe.map(k => (
          <Link key={k.kennung} href={k.href} aria-current={k.aktiv ? "page" : undefined}
            className="flex w-[72px] shrink-0 flex-col items-center text-inherit no-underline sm:w-[84px]">
            <span className={`block h-[56px] w-[56px] overflow-hidden rounded-full bg-[#f5f5f5] ring-2 ring-offset-2 ring-offset-white sm:h-[64px] sm:w-[64px] ${
              k.aktiv ? "ring-[#111]" : "ring-transparent"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {k.bild ? <img src={k.bild} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
            </span>
            <span className={`mt-2 line-clamp-2 w-full break-words text-center text-[13.5px] leading-[1.2] ${k.aktiv ? "font-bold text-[#111]" : "font-semibold text-[#777]"}`}>
              {k.name}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
