/**
 * DER PREIS STEHT SO DA, WIE ER IHN SCHREIBT (Owner 12.09.2026: „er soll in etwas schreiben was die
 * kosten, dann werden die so gepostet" · „wenn er sagt zwischen 600 und 900 dann werden sie so
 * gepostet").
 *
 * ── WAS HIER VORHER STAND UND WARUM ES WEG MUSSTE ─────────────────────────────────────────────
 *
 * `preisZahl` hat alles ausser Ziffern weggeschnitten (Owner 11.09.2026: „die Preise alle in Euro" —
 * auf seiner Seite stand nur „100"). Für eine nackte Zahl war das richtig. Aus „zwischen 600 und
 * 900" machte dieselbe Zeile aber **„600900"** — kein Preis mehr, sondern eine falsche Zahl, und
 * zwar unbemerkt: gespeichert, angezeigt, niemandem aufgefallen.
 *
 * ── DIE REGEL JETZT ───────────────────────────────────────────────────────────────────────────
 *
 * Der Text bleibt unangetastet. Das „€" hängt nur dann an, wenn er NUR eine Zahl geschrieben hat —
 * dann steht weiterhin „800 €" wie gehabt. Schreibt er einen Satz, eine Spanne oder eine eigene
 * Währung, steht genau das da: „zwischen 600 und 900", „800 lei", „Preis auf Anfrage".
 *
 * Der Preis ist freiwillig (Owner 12.09.2026: „preise kann er angeben wenn er will") und der Agent
 * fragt im Trichter nicht danach — er trägt ihn auf seiner Seite ein, wenn er mag.
 */

/** Was er geschrieben hat, nur aufgeräumt: Zeilenumbrüche raus, Länge begrenzt. Keine Deutung. */
export const preisText = (roh: unknown): string =>
  String(roh ?? "").replace(/\s+/g, " ").trim().slice(0, 60);

/* HIER STAND `preisAnzeige` — es hängte an eine reine Zahl ein „€". Seit der Preis ein freier Text
   ist und an jedem Bild entweder sein Werkpreis oder sein allgemeiner Satz steht (Owner 12.09.2026),
   ruft es niemand mehr auf. Ungenutzt stehenzulassen hiesse, die alte Regel als lebendig auszugeben.
   Das Label selbst: components/PreisLabel.tsx (Tailwind sieht Klassen in `lib/` nicht). */

/**
 * DER SATZ AN JEDEM BILD: seine Spanne, dann „Preis auf Anfrage" in der Sprache des Betrachters.
 * Ohne Spanne bleibt nur der zweite Teil — genau das, was die Werkseite vorher schon zeigte.
 */
export const preisSatz = (spanne: unknown, aufAnfrage: string): string => {
  const s = preisText(spanne);
  return s ? `${s}. ${aufAnfrage}` : aufAnfrage;
};
