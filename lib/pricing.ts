/**
 * PREISE AN EINER STELLE (Owner-Entscheidung 27.07.2026).
 *
 * Themen-Abo: **49 €/Monat**. Wer aus einer Anzeige mit AKTIONSCODE kommt, zahlt im ersten
 * Monat nur **19 €**, danach ebenfalls 49 €. Grund des Owners: ein verschenkter oder
 * dauerhaft niedriger Preis bringt Leute, die nie zahlen — der Code qualifiziert (die Karte
 * wird gezogen), der laufende Preis trägt das Produkt.
 *
 * Umsetzung in Stripe (macht der Owner, Claude hat keinen Zugang):
 *   1. Preis 49 €/Monat anlegen → Env `STRIPE_TOPIC_ABO_PRICE_ID`
 *   2. Gutschein „30 € einmalig" anlegen (49 − 30 = 19 € im ersten Monat) und die
 *      Coupon-ID unter dem Anzeigen-Code eintragen:
 *      `STRIPE_PROMO_CODES={"DEINCODE":"<coupon-id>"}`
 * Ohne Code gilt der volle Preis; ein unbekannter Code bricht den Kauf NICHT ab.
 */

export const TOPIC_MONTHLY_CENTS = 4900;       // 49 € laufend
export const TOPIC_FIRST_MONTH_CENTS = 1900;   // 19 € Einstieg MIT Aktionscode
export const EXTRA_VIDEO_CENTS = 399;         // jedes Video über das Abo hinaus

/** Anzeige-Texte: ohne Code der volle Preis, mit Code der Einstieg. */
export const PRICE_LINE_EN = "49 €/month";
export const PRICE_LINE_DE = "49 €/Monat";
/** Nur für Besucher MIT Aktionscode. */
export const PRICE_LINE_CODE_EN = "19 € first month, then 49 €/month";
export const PRICE_LINE_CODE_DE = "19 € im ersten Monat, danach 49 €/Monat";

/** Die Preis-ID des laufenden Themen-Abos (49 €). */
export function topicPriceId(): string {
  // KEIN Rueckfall auf die alte 24-EUR-Preis-ID — die ist abgeschafft. Fehlt die Env,
  // gilt der neue 49-EUR-Preis, damit nie wieder heimlich der alte Preis kassiert wird.
  return process.env.STRIPE_TOPIC_ABO_PRICE_ID?.trim() || "price_1TxuJo1jPNCWoiztbO6FAeUT";
}

/**
 * Standard-Einstiegsgutschein — bewusst LEER, solange der Owner keinen setzt: der Rabatt
 * soll am Aktionscode hängen, nicht jedem geschenkt werden. Nur wenn hier doch ein
 * Gutschein steht, bekommt ihn auch, wer ohne Code kommt.
 */
export function firstMonthCoupon(): string | undefined {
  return process.env.STRIPE_FIRST_MONTH_COUPON?.trim() || undefined;
}
