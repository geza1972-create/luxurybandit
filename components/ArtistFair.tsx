/**
 * DAS SIEGEL (Owner 18.09.2026: „Respect the Artist … als Siegel" · „ich will es aber als Marke
 * machen" · „alles was in unserem Shop gekauft wurde ist Artist Fair").
 *
 * ── WARUM GEZEICHNET UND NICHT ERZEUGT ──────────────────────────────────────────────────────
 *
 * Ein Siegel muss auf einem Knopf von 60 px genauso stehen wie auf einem A1-Druck und in einer
 * PDF. Ein erzeugtes Bild wäre in beiden Fällen falsch: oben matschig, unten zu klein. Als SVG
 * ist es an jeder Stelle scharf, wiegt nichts und lässt sich in einer Zeile ändern.
 *
 * Aufbau wie ein Prüfstempel: aussen im Ring die Haltung und die Adresse, in der Mitte der Name
 * der Marke. Kein Gold, keine Farbe — das Portal ist schwarz auf Creme, „die einzige Farbe sind
 * die Werke".
 */
export default function ArtistFair({ groesse = 96, klasse = "" }: {
  groesse?: number;
  klasse?: string;
}) {
  return (
    /* `groesse={0}`: dann bestimmt der Rahmen darum die Grösse (im Poster in `cqw`). */
    <svg viewBox="0 0 100 100" {...(groesse ? { width: groesse, height: groesse } : {})} className={klasse}
      role="img" aria-label="Artist Fair — Respect the Artist">
      <defs>
        {/* ── ZWEI BÖGEN, NICHT EIN KREIS (18.09.2026) ──────────────────────────────────────
            Auf einem durchgehenden Kreis steht die untere Hälfte der Schrift auf dem Kopf — ein
            Stempel, den man drehen muss, sieht kaputt aus. Oben läuft der Bogen im Uhrzeigersinn,
            unten GEGEN den Uhrzeigersinn: dann steht auch die untere Zeile richtig herum. */}
        <path id="af-oben" fill="none" d="M12,50 A38,38 0 0 1 88,50" />
        <path id="af-unten" fill="none" d="M14,50 A36,36 0 0 0 86,50" />
      </defs>
      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <text fill="currentColor" fontSize="7.2" fontWeight="700" letterSpacing="1.4"
        style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <textPath href="#af-oben" startOffset="50%" textAnchor="middle">RESPECT THE ARTIST</textPath>
      </text>
      <text fill="currentColor" fontSize="6.4" fontWeight="700" letterSpacing="1.2"
        style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
        <textPath href="#af-unten" startOffset="50%" textAnchor="middle">LAKATOSBANDI.COM</textPath>
      </text>
      <text x="50" y="47" textAnchor="middle" fill="currentColor" fontSize="12.5" fontWeight="700"
        style={{ fontFamily: "ui-serif, Georgia, serif" }}>ARTIST</text>
      <text x="50" y="61" textAnchor="middle" fill="currentColor" fontSize="12.5" fontWeight="700"
        style={{ fontFamily: "ui-serif, Georgia, serif" }}>FAIR</text>
    </svg>
  );
}
