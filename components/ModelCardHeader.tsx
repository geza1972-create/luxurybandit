"use client";

import { Crown, Send } from "lucide-react";

// Der Kopf der Model Card: ihr Name auf dem goldenen LB-Muster, ihre Rolle, der
// Status und die Markenzeile. Bewusst EIN Baustein, den die Karte selbst und
// Bellas Seite benutzen — sonst sehen die beiden irgendwann verschieden aus.

// Kleines gekacheltes „LB"-Monogramm (Buchstaben + Vier-Punkt-Blüten im Rautenmuster) —
// das Luxus-Wasserzeichen hinter dem Kopf und hinter dem LB-Wert-Abzeichen.
const FLORET = "M0 -6 C1.4 -3.4 1.4 -3.4 6 0 C1.4 3.4 1.4 3.4 0 6 C-1.4 3.4 -1.4 3.4 -6 0 C-1.4 -3.4 -1.4 -3.4 0 -6 Z";
const MONO_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='58' height='58' viewBox='0 0 58 58'><g fill='#d0a848'><text x='29' y='37' font-family='Georgia,"Times New Roman",serif' font-size='22' font-weight='700' text-anchor='middle'>LB</text><path d='${FLORET}'/><path transform='translate(58,0)' d='${FLORET}'/><path transform='translate(0,58)' d='${FLORET}'/><path transform='translate(58,58)' d='${FLORET}'/></g></svg>`;
export const MONO_URL = `url("data:image/svg+xml,${encodeURIComponent(MONO_SVG)}")`;

export default function ModelCardHeader({
  name, title = "", isOwned = false, ownedName = "", hideOwner = false, onShare, copied = false, tagline = "", statusLabel = "Available",
}: {
  name: string;
  title?: string;
  isOwned?: boolean;
  ownedName?: string;
  hideOwner?: boolean;
  onShare?: () => void;      // ohne Handler kein Teilen-Knopf
  copied?: boolean;
  tagline?: string;          // untere Zeile pro Thema überschreiben (Standard: „Sponsor an AI Influencer")
  statusLabel?: string;      // Status-Abzeichen pro Thema (Standard „Available", z. B. „online")
}) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-2 overflow-hidden border-b border-amber-400/20 bg-gradient-to-r from-amber-400/[0.1] via-amber-300/[0.16] to-amber-400/[0.1] px-6 py-4 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: MONO_URL, backgroundSize: "30px 30px", opacity: 0.4 }} />
      <p className="relative max-w-full truncate px-6 text-[26px] font-black leading-none tracking-tight text-white">{name}</p>
      {/* Rolle / Markenzeile — sie ist eine Marke, z. B. „Tenerife Influencer". */}
      {title && <p className="relative -mt-0.5 max-w-full truncate text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">{title}</p>}
      {/* Status direkt unter dem Namen — darauf fällt der Blick zuerst. */}
      {!hideOwner && (
        <span className={`relative inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-black leading-none shadow backdrop-blur ${isOwned ? "bg-amber-400 text-black ring-1 ring-amber-300" : "bg-black/50 text-amber-200 ring-1 ring-amber-300/45"}`}>
          {isOwned ? <><Crown className="h-3.5 w-3.5 shrink-0" fill="currentColor" /> <span className="min-w-0 truncate">Sponsored by {ownedName}</span></> : <><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" /> {statusLabel}</>}
        </span>
      )}
      <span className="relative inline-flex items-center whitespace-nowrap rounded-full bg-black/40 px-3.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-amber-300/85 ring-1 ring-amber-300/20 backdrop-blur">
        LuxuryBandit.com <span className="mx-1.5 text-amber-300/40">·</span> <span className="lb-onmedia text-white/85">{tagline || (hideOwner ? "Creator preview" : "Sponsor an AI Influencer")}</span>
      </span>
      {onShare && (
        <button type="button" onClick={onShare} aria-label="Share this card"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/85 transition active:scale-90 hover:text-white">
          <Send className="h-3.5 w-3.5" />
        </button>
      )}
      {copied && (
        <span className="absolute right-2 top-12 z-30 rounded-full bg-black/85 px-2.5 py-1 text-[10px] font-black text-white shadow ring-1 ring-white/25">✓ Link copied!</span>
      )}
    </div>
  );
}
