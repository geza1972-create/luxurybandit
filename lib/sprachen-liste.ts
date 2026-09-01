/**
 * SPRACHEN FÜRS AUTOVERVOLLSTÄNDIGEN (Owner 01.09.2026: „Sprachen schreibst du ebenso mit
 * Autovervollständigung und mit Hinzufügen und Dropdown A1, A2...").
 *
 * Statisch aus demselben Grund wie `laender-liste.ts`: Sprachen ändern sich nicht, eine
 * API dafür wäre unnötige Kosten für etwas Feststehendes.
 */
export const SPRACHEN_DE: string[] = [
  "Arabisch", "Bulgarisch", "Chinesisch", "Dänisch", "Deutsch", "Englisch", "Estnisch",
  "Finnisch", "Französisch", "Griechisch", "Hebräisch", "Hindi", "Italienisch",
  "Japanisch", "Koreanisch", "Kroatisch", "Lettisch", "Litauisch", "Niederländisch",
  "Norwegisch", "Polnisch", "Portugiesisch", "Rumänisch", "Russisch", "Schwedisch",
  "Serbisch", "Slowakisch", "Slowenisch", "Spanisch", "Tschechisch", "Türkisch",
  "Ukrainisch", "Ungarisch", "Vietnamesisch",
];

export const SPRACH_NIVEAUS = [
  { wert: "a1", text: "A1" }, { wert: "a2", text: "A2" }, { wert: "b1", text: "B1" },
  { wert: "b2", text: "B2" }, { wert: "c1", text: "C1" }, { wert: "c2", text: "C2" },
  { wert: "native", text: "Muttersprache" },
];
