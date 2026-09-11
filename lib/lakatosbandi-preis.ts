/**
 * PREISE IMMER IN EURO (Owner 11.09.2026: „die Preise alle in Euro" — auf seiner Seite stand nur „100").
 *
 * Gespeichert wird nur die Zahl (`preisZahl`), gezeigt wird „100 €" (`preisAnzeige`). Auch ältere Einträge mit Text
 * („800 lei", „ca. 1.200") werden so gezeigt — die Zahl bleibt, die Währung ist Euro.
 */
export const preisZahl = (roh: unknown): string =>
  String(roh ?? "").replace(/[^\d.,\s]/g, "").replace(/\s+/g, "").replace(/^[.,]+|[.,]+$/g, "").slice(0, 12);

/* Das Label selbst: components/PreisLabel.tsx (Tailwind sieht Klassen in `lib/` nicht). */
export const preisAnzeige = (roh: unknown): string => {
  const zahl = preisZahl(roh);
  return zahl ? `${zahl} €` : "";
};
