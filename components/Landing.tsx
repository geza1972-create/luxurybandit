import type { ReactNode } from "react";

/**
 * LANDINGPAGE-CI — die EINE Quelle für Typo auf allen Landings/Funnels.
 * Regeln stehen in docs/ci-farben-typo-buttons.md §6; wer hier nicht durchgeht,
 * baut wieder eigene Größen und die Seiten sehen unterschiedlich aus.
 *
 * Farben: Headline WEISS, Akzent CI-Gelb #f6cf51 (Balken, hervorgehobenes Wort,
 * Begriffe, Links). Fließtext weiß gedämpft. Kein anderes Gelb, kein Gold.
 */

export const CI_YELLOW = "#f6cf51";

/** Hervorgehobenes Wort in einer Headline (gelb). */
export function Y({ children }: { children: ReactNode }) {
  return <span className="text-[#f6cf51]">{children}</span>;
}

/** Kleine Zeile über der H1: „LUXURYBANDIT · KISS". */
export function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">{children}</p>;
}

/** Die EINE H1 einer Landing. Ein Wort darin mit <Y> gelb setzen. */
export function H1({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`mt-2 text-[34px] font-black leading-[1.05] ${className}`}>{children}</h1>;
}

/**
 * Abschnittsüberschrift: gelber Balken + große Headline in GELB-WEISS — der Anfang
 * weiß, das letzte Wort im CI-Gelb (Owner-Vorgabe: „Headline gelb weiss").
 * Steht ein fertiges JSX drin, wird es unverändert gerendert (dann selbst <Y> setzen).
 */
export function SectionTitle({ children, as = "h2", className = "" }: {
  children: ReactNode; as?: "h2" | "h3"; className?: string;
}) {
  const Tag = as;
  let content: ReactNode = children;
  if (typeof children === "string") {
    const words = children.trim().split(/\s+/);
    // Gelb wird der SCHLUSS der Zeile. Ist das letzte Wort ein Füllwort („it?", „es"),
    // kommt das Wort davor mit dazu — sonst leuchtet ausgerechnet das Nichtssagende.
    let take = 1;
    const bare = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, "");
    if (words.length > 2 && bare(words[words.length - 1]).length < 4) take = 2;
    const tail = words.splice(-take).join(" ");
    content = words.length ? <>{words.join(" ")} <Y>{tail}</Y></> : <Y>{tail}</Y>;
  }
  return (
    <div className={className}>
      <span className="block h-1 w-10 rounded-full bg-[#f6cf51]" />
      <Tag className="mt-4 text-[30px] font-black leading-[1.06]">{content}</Tag>
    </div>
  );
}

/** Fließtext / Lead unter einer Headline. */
export function Lead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`mt-3 text-[16px] font-medium leading-relaxed text-white/85 ${className}`}>{children}</p>;
}

/** Kleingedrucktes: Hinweise, Datenschutz, „nicht für Social Media". */
export function Fine({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`mt-2 text-[13px] font-bold leading-snug text-white/75 ${className}`}>{children}</p>;
}

/** Label über einem Schritt im Funnel: „2 · YOUR PHOTO". */
export function StepLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[12px] font-black uppercase tracking-wide text-[#f6cf51] ${className}`}>{children}</p>;
}

/** Gelber Textlink im Fließtext. */
export function YLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} className="font-black text-[#f6cf51] underline underline-offset-2">{children}</a>;
}
