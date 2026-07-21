// Jugendstil-Ornamente (Whiplash, feine schwarze Linienkunst) — DER gemeinsame Baustein
// für alle Boxen im Portal (Anmeldeformular, Chat-Box, …), damit sie eine Handschrift haben.
// Nutzung: Box braucht `relative overflow-hidden`, dann <CornerOrnaments /> reinlegen.

export const CornerOrnament = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"
    aria-hidden className={`pointer-events-none absolute h-9 w-9 text-black/30 ${className}`}>
    <path d="M5 45 C5 22 19 11 23 25 C26 37 38 33 44 19" />
    <circle cx="44" cy="19" r="2" fill="currentColor" stroke="none" />
    <path d="M10 38 C7 29 11 21 19 20" />
  </svg>
);

// Vier Eck-Ranken (gespiegelt). Box muss `relative overflow-hidden` sein.
export const CornerOrnaments = () => (
  <>
    <CornerOrnament className="left-2.5 top-2.5" />
    <CornerOrnament className="right-2.5 top-2.5 -scale-x-100" />
    <CornerOrnament className="bottom-2.5 left-2.5 -scale-y-100" />
    <CornerOrnament className="bottom-2.5 right-2.5 -scale-100" />
  </>
);

export const DividerOrnament = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 180 14" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"
    aria-hidden className={`mx-auto h-3.5 w-44 text-black/25 ${className}`}>
    <path d="M6 7 H72 C82 7 82 1 90 7 C98 13 98 7 108 7 H174" />
    <circle cx="90" cy="7" r="1.7" fill="currentColor" stroke="none" />
  </svg>
);
