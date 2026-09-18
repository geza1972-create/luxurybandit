/**
 * LANGER TEXT, VIER ZEILEN SICHTBAR (Owner 16.09.2026: „die texte sind zu lang. bitte zum
 * ausklappen machen nach 4 zeilen").
 *
 * ── OHNE JAVASCRIPT ─────────────────────────────────────────────────────────────────────────
 *
 * `<details>` kann auf- und zuklappen, ohne dass die halbe Seite ein Client-Bauteil werden muss.
 * Im geschlossenen Zustand steht der ganze Text im `<summary>` und wird auf vier Zeilen
 * beschnitten; ist es offen, hebt die Regel in globals.css den Schnitt auf. Der Text ist also
 * IMMER vollständig im Quelltext — für Google und für Vorleseprogramme, auch geschlossen.
 *
 * Kurze Texte bekommen gar keinen Ausklapper: Ein „Mehr lesen" unter drei Zeilen ist ein Knopf,
 * der nichts tut. Die Grenze ist grob nach Zeichen geschätzt, weil der Server nicht weiss, wie
 * breit der Bildschirm ist — lieber einmal zu viel ausgeklappt als ein toter Knopf.
 */
export default function MehrText({ text, mehr, weniger, className = "" }: {
  text: string;
  mehr: string;
  weniger: string;
  className?: string;
}) {
  const t = text.trim();
  if (!t) return null;
  /* Rund 90 Zeichen je Zeile bei dieser Schriftgrösse und Spaltenbreite — vier Zeilen sind
     etwa 360. Darunter lohnt das Klappen nicht. */
  if (t.length < 380) return <p className={`m-0 ${className}`}>{t}</p>;

  return (
    <details className="lb-mehr">
      {/* Der Schnitt sitzt am inneren Element, das Wort darunter am `summary` — läge beides in
          derselben Box, schnitten die vier Zeilen auch das Wort weg. */}
      <summary data-mehr={mehr} data-weniger={weniger}>
        <span className={`m-0 block ${className}`}>{t}</span>
      </summary>
    </details>
  );
}
