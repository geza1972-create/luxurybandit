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

/**
 * ZWEIFARBIG — Anfang weiss, Schluss in CI-Gold (Owner 06.08.2026 zur Themen-Kachel:
 * „zweifarbig", nachdem eine ganz goldene Überschrift nicht gefiel).
 *
 * Die Teilung steckte bis dahin IN `SectionTitle` und war damit für nichts anderes zu haben.
 * Jetzt steht sie hier als eigener Baustein: EINE Regel, wie das Haus Überschriften bricht —
 * `SectionTitle` benutzt sie, die Themen-Kachel benutzt sie, und die nächste Stelle muss sie
 * nicht abschreiben (Skill `ci-design`: fehlt ein Baustein, kommt er erst in die Bibliothek).
 *
 * Gelb wird der SCHLUSS der Zeile. Ist das letzte Wort ein Füllwort („es", „it?"), kommt das
 * Wort davor mit dazu — sonst leuchtet ausgerechnet das Nichtssagende.
 *
 * `einzelwortGold` entscheidet den Grenzfall: Eine Überschrift aus EINEM Wort kann nicht
 * zweifarbig sein. Bei Abschnitts-Überschriften ist ganz Gold dort seit jeher richtig — sie
 * stehen allein über einem Absatz. In der Themen-Kachel nicht: „Geburtstage" stünde ganz in
 * Gold direkt über dem goldenen Preis, und das ist genau der Anblick, der verworfen wurde.
 * Dort bleibt ein einzelnes Wort deshalb weiss.
 */
export function zweifarbig(text: string, { einzelwortGold = true, halb = false } = {}): ReactNode {
  const words = text.trim().split(/\s+/);
  const bare = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, "");
  let take = 1;
  if (halb) {
    /**
     * HALB UND HALB (Owner 06.08.2026: „versuch immer halb zu machen").
     *
     * Bei einer langen Zeile trägt das letzte Wort allein zu wenig: „Sende einen Kuss an die
     * Person, die du liebst" leuchtete nur auf „liebst", der Rest blieb eine graue Wand. Die
     * Teilung sucht deshalb die Fuge, an der beide Hälften ungefähr gleich viele Zeichen
     * haben — gemessen wird in ZEICHEN, nicht in Wörtern, sonst hängt „an die" gegen
     * „Hochzeitseinladung".
     */
    const gesamt = words.join(" ").length;
    let besser = Infinity;
    for (let k = 1; k < words.length; k++) {
      const schwanz = words.slice(-k).join(" ").length;
      const abstand = Math.abs(gesamt - schwanz - schwanz);
      if (abstand < besser) { besser = abstand; take = k; }
    }
  } else if (words.length > 2 && bare(words[words.length - 1]).length < 4) {
    take = 2;
  }
  if (words.length <= take) {
    /**
     * DER BINDESTRICH IST AUCH EINE FUGE (Owner 06.08.2026, mit dem Bild der
     * Hochzeits-Kachel: „? hier nicht?").
     *
     * „Hochzeitseinladungs-Video" ist EIN Wort — kein Leerzeichen, also nach der Regel oben
     * nichts zu teilen, und die Kachel blieb als einzige ganz weiss. Ein Bindestrich trennt
     * aber genauso sichtbar: „Hochzeitseinladungs-" weiss, „Video" gold.
     *
     * Beide Teile müssen etwas hermachen (vier Zeichen), sonst zerlegt die Regel Wörter wie
     * „E-Mail" in einen Buchstaben und einen Leuchtschriftzug.
     */
    const wort = words.join(" ");
    /* Bei mehreren Bindestrichen die Fuge, die der Mitte am nächsten liegt — dieselbe
       Halb-und-halb-Regel wie oben, nur innerhalb eines Wortes. */
    const fugen = [...wort.matchAll(/-/g)].map(m => m.index ?? -1).filter(i => i > 0);
    const fuge = fugen.length
      ? fugen.reduce((a, b) => Math.abs(a - wort.length / 2) <= Math.abs(b - wort.length / 2) ? a : b)
      : -1;
    if (fuge > 0) {
      const kopf = wort.slice(0, fuge);
      const schwanz = wort.slice(fuge + 1);
      if (bare(kopf).length >= 4 && bare(schwanz).length >= 4) {
        return <>{kopf}-<Y>{schwanz}</Y></>;
      }
    }
    return einzelwortGold ? <Y>{wort}</Y> : <>{wort}</>;
  }
  const tail = words.splice(-take).join(" ");
  return <>{words.join(" ")} <Y>{tail}</Y></>;
}

/** Kleine Zeile über der H1: „LUXURYBANDIT · KISS". */
export function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">{children}</p>;
}

/** Die EINE H1 einer Landing. Ein Wort darin mit <Y> gelb setzen. */
/**
 * DIE ÜBERSCHRIFT — 28 PX, NICHT 34 (Owner 10.08.2026: „ich will den CTA im Viewport shen.
 * Das hisst du machst den H1 kleiner (Bibliothek) und sparrst am abstand zwischen titel und
 * header. Bei allen topics.").
 *
 * GEMESSEN auf der Geburtstagsseite (375×812): Die Überschrift lief über drei Zeilen und war
 * mit ihrem Abstand 115 px hoch; der Kaufknopf stand danach bei 810 px — zwei Pixel im Bild,
 * also unsichtbar. Ein Kaufknopf, den man erst erwischt, wenn man wischt, wird von einem
 * Teil der Besucher nie gesehen: Sie entscheiden oben, ob sie bleiben.
 *
 * 34 px waren eine Plakat-Grösse aus der Zeit, als über der Falz nur die Schlagzeile stand.
 * Heute steht dort die Karte mit dem Beispielvideo UND der Knopf. 28 px bleiben eine
 * Schlagzeile — sie kosten nur keinen halben Bildschirm mehr.
 *
 * `mt-1` statt `mt-2`: Der Abstand zur Kopfzeile kommt aus der Polsterung der Seite
 * (`pt-3`, siehe Landingpage.md); ein zweiter Abstand hier addierte sich dazu.
 */
export function H1({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`mt-1 text-[28px] font-black leading-[1.06] ${className}`}>{children}</h1>;
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
  const content: ReactNode = typeof children === "string" ? zweifarbig(children) : children;
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
