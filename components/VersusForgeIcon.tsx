import { ICON } from "@/lib/versusforge-icons";

/**
 * DAS SYMBOL AUF DER SEITE (Owner 08.09.2026: „Icons fehlen, fette grosse Icons").
 *
 * DIESELBEN PFADE WIE IM PDF (`lib/versusforge-icons.ts`) — ein Symbol, das auf der Seite
 * anders aussieht als im Dokument, das der Kunde danach bekommt, ist ein Bruch an der
 * Stelle, an der man Wiedererkennung am nötigsten braucht.
 *
 * FETT UND GROSS, wie verlangt: Strichstärke 2 auf 24er Raster wirkt bei 40 px dünn —
 * deshalb `strokeWidth={2.2}` und mindestens 28 px. Wer sie kleiner setzt, nimmt ihnen genau
 * das, wofür sie da sind.
 */
export default function VFIcon({
  name,
  className = "h-8 w-8",
  strich = 2.2,
}: {
  name: keyof typeof ICON | string;
  className?: string;
  strich?: number;
}) {
  const d = ICON[name as string];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strich}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {d.split(" M").map((teil, i) => (
        <path key={i} d={i === 0 ? teil : `M${teil}`} />
      ))}
    </svg>
  );
}
