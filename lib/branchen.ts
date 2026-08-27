/**
 * DIE BRANCHEN — EINE QUELLE (Owner 26.08.2026: „wir brauchen echte Anzeigen gar nicht.
 * Wir brauchen Branchen, wo er interessiert ist zu arbeiten" · „statt Bewerbungschancen-
 * Liste trägst du eine Liste der Branchen ein").
 *
 * WARUM DIESE DATEI: Dieselben acht Begriffe standen schon als `S.bHandel …` im Chat
 * (app/themes/lebenslauf/start/page.tsx) und wurden dort nur für EINE Frage gebraucht.
 * Jetzt brauchen sie ausserdem die Interesse-Liste und der Admin — drei Kopien derselben
 * Liste wären die übliche Falle (eine wird ergänzt, zwei altern). Deutsche Quelle, wie
 * überall im Bewerber-Bereich; Seiten mit Übersetzer schicken sie durch
 * `textbausteineInSprache`.
 *
 * DER SCHLÜSSEL IST DER SPEICHERWERT, nicht die Beschriftung: Wird eine Beschriftung
 * später umformuliert, bleiben die schon gespeicherten Antworten der Kandidaten gültig.
 */

export const BRANCHEN_QUELLE = {
  handel: "Handel / Verkauf",
  gastro: "Gastro / Hotel",
  buero: "Büro / Verwaltung",
  it: "IT / Technik",
  pflege: "Pflege / Soziales",
  handwerk: "Handwerk / Bau",
  fahren: "Fahren / Logistik",
  produktion: "Produktion / Lager",
  reinigung: "Reinigung / Facility",
  anderes: "Etwas anderes",
} as const;

export type BranchenSchluessel = keyof typeof BRANCHEN_QUELLE;

export const BRANCHEN_SCHLUESSEL = Object.keys(BRANCHEN_QUELLE) as BranchenSchluessel[];

/** Beschriftung zu einem gespeicherten Schlüssel — unbekannte Schlüssel (aus einer
    früheren Liste) geben den Schlüssel selbst zurück, nie ein leeres Feld. */
export function branchenName(schluessel: string): string {
  return (BRANCHEN_QUELLE as Record<string, string>)[schluessel] ?? schluessel;
}

/** Nur bekannte Schlüssel, entdoppelt — die Prüfstelle für alles, was von aussen kommt. */
export function branchenPruefen(werte: unknown): BranchenSchluessel[] {
  const roh = Array.isArray(werte) ? werte : [];
  const raus = roh.map(v => String(v ?? "").trim()).filter((v): v is BranchenSchluessel =>
    (BRANCHEN_SCHLUESSEL as string[]).includes(v));
  return Array.from(new Set(raus));
}
