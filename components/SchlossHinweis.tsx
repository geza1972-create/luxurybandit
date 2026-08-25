"use client";

import { Lock, X } from "lucide-react";
import { Knopf } from "@/components/CI";

/**
 * DIE ERKLÄRUNG AM SCHLOSS (Owner 25.08.2026: „Er kann alles anlegen gratis, nur er kann
 * das nicht sharen und PDF nicht herunterladen").
 *
 * DIE ENTSCHEIDENDE ENTWURFS-REGEL: Der verschlossene Knopf bleibt SICHTBAR und ANTIPPBAR,
 * er tut nur etwas anderes — er erklärt. Ein ausgegrauter Knopf sagt „geht nicht"; ein
 * Knopf, der beim Tippen sagt, was es kostet und was man dafür bekommt, IST die Kasse.
 * Und er steht an der Stelle mit der höchsten Zahlungsbereitschaft des ganzen Weges: Der
 * Kunde hat seine fertige Bewerbung vor sich und will sie abschicken.
 *
 * Kein Overlay-Dialog (Memory `keine-overlay-dialoge`) — die Erklärung klappt an Ort und
 * Stelle auf und hat einen sichtbaren Weg zurück (Memory `immer-close-einbauen`).
 */
export default function SchlossHinweis({ titel, zeile, cta, ziel, onZu, karte = false }: {
  titel: string;
  zeile: string;
  cta: string;
  /** Wohin der Kauf führt — der bestehende Trichter, keine zweite Kasse. */
  ziel: string;
  onZu: () => void;
  /** Sitzt der Hinweis auf dem Papier (Karte) oder auf dem Dunklen? */
  karte?: boolean;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${karte ? "border-[#1a160f]/25" : "border-white/25 bg-white/[0.04]"}`}>
      <div className="flex items-start gap-2">
        <Lock className={`mt-[2px] h-4 w-4 shrink-0 ${karte ? "" : "text-[#f6cf51]"}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-[16px] font-black leading-snug ${karte ? "" : "text-white/90"}`}>{titel}</p>
          <p className={`mt-1 text-[14px] font-bold leading-snug ${karte ? "opacity-70" : "text-white/70"}`}>{zeile}</p>
        </div>
        <button type="button" onClick={onZu} aria-label="×"
          className={`shrink-0 p-1 ${karte ? "opacity-50" : "text-white/50"}`}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3">
        <Knopf art="gold" href={ziel}>{cta}</Knopf>
      </div>
    </div>
  );
}
