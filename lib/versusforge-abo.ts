/**
 * DAS ART-MARKETING-ABO — DIE REGELN AN EINER STELLE (Owner 10.09.2026).
 *
 * ── DAS MODELL ────────────────────────────────────────────────────────────────────────────
 *
 *  · Die Galerie und der Agent kosten nichts. Jede Anfrage kommt mit Name und Kontakt an.
 *  · Nach DREI Interessenten wird er gefragt: „Willst du deinen Agenten für 10 € im Monat
 *    behalten?" — bis der Käufer-Agent existiert, zählen drei Anfragen (Owner: „2 ja").
 *  · Zahlt er nicht, ist nach 14 TAGEN Schluss mit dem Sehen: „Er bekommt weiter Anfragen, aber
 *    er sieht sie nicht." · „Wenn jemand … schreibt, bekommt er eine E-Mail. Aber er kann sie
 *    nicht sehen. Er wird aufgefordert zu zahlen, um die Antwort zu sehen."
 *  · Der Agent arbeitet dabei ganz normal weiter (Owner: „doch, der Agent arbeitet weiter").
 *  · Was er vor der Sperre gesehen hat, behält er. Mit dem Abo sieht er alles.
 *
 * WARUM EINE EIGENE DATEI: Kasse, Dashboard, Anfragen-Route und Mail müssen dieselbe Frage
 * gleich beantworten — „ist diese Anfrage für ihn sichtbar?". Stünde die Rechnung an vier
 * Stellen, liefe eine davon auseinander, und ein Künstler sähe im Dashboard, was die Mail ihm
 * als gesperrt verkauft.
 *
 * KEIN SERVERKRAM HIER DRIN — reine Rechnung, damit auch ein Browser-Baustein sie benutzen darf.
 */

/**
 * DER SCHALTER (Owner 11.09.2026: „wir müssen jetzt erst mal die Sperre raus machen … Ich will, dass Verkehr da ist").
 * Aus: Jeder Künstler sieht jede Anfrage, keine Frist, keine Abo-Frage nach drei Anfragen. Alles unten bleibt gebaut —
 * zum Anschalten hier auf `true`.
 */
export const ABO_SPERRE_AKTIV = false;

/** Ab so vielen fremden Anfragen wird nach dem Abo gefragt. */
export const ABO_FRAGE_AB = 3;
/** So viele Tage nach der Frage bleibt alles sichtbar. */
export const ABO_FRIST_TAGE = 14;

export type AboStand = {
  aktiv: boolean;
  /** Seit wann bezahlt wird. */
  seit?: string;
  /** Die Stripe-Subscription — über sie meldet der Webhook die Kündigung. */
  subscription?: string;
  /** Wann es geendet hat (Kündigung, gescheiterte Zahlung). */
  bis?: string;
};

type MitAbo = { abo?: AboStand; aboFrageAm?: string };
type Anfrage = { zeit: string; eigen?: boolean };

export const aboAktiv = (m: MitAbo) => m.abo?.aktiv === true;

/** Ab wann Anfragen verborgen sind — `null`, solange keine Frist läuft oder abgelaufen ist. */
export function sperreAb(m: MitAbo): number | null {
  if (!ABO_SPERRE_AKTIV) return null;
  const frage = m.aboFrageAm ? Date.parse(m.aboFrageAm) : NaN;
  return Number.isFinite(frage) ? frage + ABO_FRIST_TAGE * 24 * 3600 * 1000 : null;
}

/** Ist die Frist abgelaufen und kein Abo da? */
export const gesperrt = (m: MitAbo, jetzt = Date.now()) => {
  const ab = sperreAb(m);
  return !aboAktiv(m) && ab !== null && jetzt >= ab;
};

/**
 * Sieht er DIESE Anfrage? Eigene Testläufe immer. Mit Abo alles. Ohne Abo alles, was vor dem
 * Ende der Frist ankam — was danach kommt, bleibt verborgen, bis er zahlt.
 */
export function anfrageSichtbar(m: MitAbo, a: Anfrage): boolean {
  if (a.eigen || aboAktiv(m)) return true;
  const ab = sperreAb(m);
  if (ab === null) return true;
  const zeit = Date.parse(a.zeit);
  return !Number.isFinite(zeit) || zeit < ab;
}
