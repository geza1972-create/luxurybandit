import { Fragment, type ReactNode } from "react";

/**
 * FLIESSTEXT MIT AUSZEICHNUNG — für die Rechts- und Info-Seiten (AGB, Datenschutz …).
 *
 * WARUM ES DAS GIBT (10.08.2026, Owner: „terms müsen wir auch in allen sprachen machen"):
 * Die AGB werden zur Laufzeit übersetzt (`trObject`, englische Quelle im Code, Dauer-Cache).
 * Durch diese Maschine geht aber nur TEXT — ein Absatz aus einem Dutzend JSX-Schnipseln mit
 * `<strong>` dazwischen lässt sich nicht übersetzen, ohne ihn zu zerlegen. Und ein Rechtstext
 * OHNE Auszeichnung ist eine graue Wand: Gerade hier trägt das Fette die Aussage („nicht
 * erstattungsfähig", „Geld zurück", „18 Jahre").
 *
 * Also eine Auszeichnung, die eine Übersetzung überlebt, weil sie Zeichensetzung ist:
 *
 *   **fett**              → <strong>fett</strong>
 *   [Wort](/adresse)      → <a href="/adresse"><strong>Wort</strong></a>
 *
 * Beides bleibt beim Übersetzen stehen (die Maschine tauscht die Wörter, nicht die
 * Sternchen), und die Adresse in der Klammer wandert unverändert mit — deshalb steht dort
 * NIE ein übersetzbares Wort, sondern immer ein Pfad.
 */

const TEIL = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

export function InfoText({ children }: { children: string }) {
  const teile = String(children ?? "").split(TEIL);
  return (
    <>
      {teile.map((t, i) => {
        if (t.startsWith("**") && t.endsWith("**")) {
          return <strong key={i}>{t.slice(2, -2)}</strong>;
        }
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(t);
        if (link) {
          return <a key={i} href={link[2]}><strong>{link[1]}</strong></a>;
        }
        return <Fragment key={i}>{t}</Fragment>;
      })}
    </>
  );
}

/** Ein Absatz — spart das `<p><InfoText>…</InfoText></p>` an drei Dutzend Stellen. */
export function InfoAbsatz({ children }: { children: string }): ReactNode {
  return <p><InfoText>{children}</InfoText></p>;
}
