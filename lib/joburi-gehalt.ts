/**
 * DIE GEHALTSZAHLEN — EINE QUELLE FÜR TRICHTER UND AUSWERTUNG (31.08.2026).
 *
 * ZUERST WAREN ES STUFEN, JETZT IST ES EINE ZAHL (Owner 31.08.2026: „oder besser er gibt es
 * ein genau"). Der Weg dahin ging über zwei Zwischenstände, und beide stehen hier als
 * Warnung, weil ihre Gründe weiter gelten:
 *
 *   1. Erst hatte die linke Spalte rumänische Stufen und die rechte deutsche. Fachlich
 *      sauber, anschaulich falsch — zwei Spalten nebeneinander liest das Auge Zeile gegen
 *      Zeile, und „unter 500 €" neben „ab 800 €" vergleicht nichts.
 *   2. Dann teilten sich beide eine Leiter. Besser lesbar, aber jede Spanne kostet
 *      Genauigkeit: Aus „800–1.200 €" wird in der Rechnung 1.000 €, und ob jemand 820 oder
 *      1.190 verdient, ist genau der Unterschied, für den ein Recruiter zahlt.
 *
 * Jetzt tippt er zwei Zahlen. Das ist die riskantere Variante — Tippen kostet Abbrecher, und
 * 85 % Antwortquote sind das Wertvollste, was dieser Trichter hat. Es ist aber auch die
 * einzige, aus der sich ein echter Median rechnen lässt statt eines Medians aus Mittelwerten.
 *
 * DER ALTBESTAND BLEIBT LESBAR: Die ersten 60 Antworten tragen Stufen-Schlüssel („800",
 * „3000+"). `gehaltMitte` übersetzt sie weiter, sonst verlöre die Studie ihren eigenen
 * Anfang — und eine Studie, die bei jeder Änderung von vorn zählt, wird nie fertig.
 */

/** Was als Monatsnetto überhaupt sein kann. Alles darunter ist ein Vertipper, alles darüber
    eine Fantasie — beides gehört nicht in einen Median, sondern abgewiesen. */
export const GEHALT_MIN = 100;
export const GEHALT_MAX = 20000;

/** Die Stufen der ersten Tage — nur noch zum Lesen, nicht mehr zum Anbieten. */
const ALTBESTAND: Record<string, number> = {
  "800": 800, "1200": 1200, "1600": 1600, "2000": 2000, "2500": 2500, "3000+": 3200,
  g0: 600, g800: 1000, g1200: 1400, g1600: 1800, g2000: 2250, g2500: 2750, g3000: 3400,
  ro0: 400, ro500: 600, ro700: 800, ro900: 1050, ro1200: 1400, ro1600: 1800,
  de0: 1300, de1500: 1750, de2000: 2250, de2500: 2750, de3000: 3400, de3800: 4200,
};

/**
 * Ein gespeicherter Wert → Euro. Eine getippte Zahl gilt unverändert; ein alter
 * Stufen-Schlüssel wird übersetzt. Unbekanntes ergibt 0 und fällt aus jeder Rechnung —
 * niemals „verdient nichts".
 */
export function gehaltMitte(wert?: string | number): number {
  const roh = String(wert ?? "").trim();
  if (!roh) return 0;
  if (roh in ALTBESTAND) return ALTBESTAND[roh];
  const n = Number(roh);
  return Number.isFinite(n) && n >= GEHALT_MIN && n <= GEHALT_MAX ? Math.round(n) : 0;
}

/** Nimmt der Server an, was da getippt wurde? Gilt für beide Felder gleichermassen. */
export function gehaltGueltig(wert?: string | number): boolean {
  return gehaltMitte(wert) > 0;
}

/**
 * ZWEI WÄHRUNGEN (Owner-Freigabe 31.08.2026: „Währung abhängig vom Land").
 *
 * Wer in Rumänien lebt, denkt in RON. Ihn nach Euro zu fragen, heisst ihn rechnen zu lassen —
 * und wer rechnen muss, rundet, schätzt oder bricht ab. Die Diaspora denkt in Euro.
 *
 * DER KURS WIRD MITGESPEICHERT, nicht nur angewandt: Eine Zahl, die in einem Jahr mit einem
 * anderen Kurs nachgerechnet wird, ergibt sonst ein anderes Ergebnis als das, was der
 * Kandidat gesehen hat — und niemand könnte den Unterschied erklären.
 */
export type Waehrung = "RON" | "EUR";

/** Stand 31.08.2026. Bei Änderung nur diese Zahl anfassen; alte Datensätze tragen ihren
    eigenen Kurs und bleiben dadurch nachvollziehbar. */
export const RON_JE_EUR = 4.97;

/** Eine Währung für alle Länder (Owner-Anweisung: „und euro bitte", „muss für alle
    Länder passen") — die Studie ist nicht mehr auf Rumänien beschränkt, und zwei
    Währungen nebeneinander würde nur für Rumänien einen Sinn ergeben. */
export function waehrungFuerLand(_land?: string): Waehrung {
  return "EUR";
}

/**
 * Plausible Monatsnetto-Spannen je Währung. Alles darunter ist ein Vertipper, alles darüber
 * eine Fantasie — beides gehört abgewiesen statt in einen Median.
 */
export function gehaltGrenzen(w: Waehrung): { min: number; max: number } {
  return w === "RON" ? { min: 500, max: 100000 } : { min: GEHALT_MIN, max: GEHALT_MAX };
}

/** Für den währungsübergreifenden Filter im Talent Pool: alles auf Euro normiert. */
export function inEuro(betrag: number, w: Waehrung, kurs = RON_JE_EUR): number {
  return w === "RON" ? Math.round(betrag / kurs) : Math.round(betrag);
}

/**
 * WOVON DER WECHSEL ABHÄNGT (Owner 31.08.2026: „Ein Jobwechsel ist nicht automatisch an ein
 * höheres Gehalt gebunden").
 *
 * Bewusst aus der FRAGE abgeleitet und nicht aus dem Betrag: Ein Aufschlag von 0 % heisst
 * nicht „will nicht wechseln", sondern „das Geld ist nicht der Punkt". Wer das aus dem Delta
 * raten wollte, würde genau die Kandidaten falsch einsortieren, die am interessantesten sind —
 * die, für die ein besserer Arbeitsplatz mehr zählt als ein höheres Gehalt.
 */
export type Antrieb = "financial" | "mixed" | "conditions";

export function antrieb(gleichesGehalt?: string): Antrieb | null {
  switch (gleichesGehalt) {
    case "yes": return "conditions";
    case "depends": return "mixed";
    case "no": return "financial";
    default: return null;
  }
}
