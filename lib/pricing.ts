/**
 * PREISE AN EINER STELLE (Owner-Entscheidung 27.07.2026).
 *
 * Themen-Abo: **8 € im ersten Monat, danach 49 €/Monat** — statt sofort 24 €. Grund des
 * Owners: Ein verschenkter oder billiger Dauerpreis bringt Kunden, die nie zahlen. Der
 * niedrige Einstieg qualifiziert (er zieht die Karte), der laufende Preis trägt das Produkt.
 *
 * Umsetzung in Stripe (macht der Owner, Claude hat keinen Zugang):
 *   1. Preis 49 €/Monat anlegen  → Env `STRIPE_TOPIC_ABO_PRICE_ID`
 *   2. Gutschein „41 € Rabatt, einmalig" anlegen → Env `STRIPE_FIRST_MONTH_COUPON`
 *      (49 − 41 = 8 € im ersten Monat, danach voll)
 * Fehlt der Gutschein, zahlt der Kunde ab dem ersten Monat 49 € — der Kauf bricht NICHT ab.
 */

export const TOPIC_MONTHLY_CENTS = 4900;      // 49 € laufend
export const TOPIC_FIRST_MONTH_CENTS = 800;   // 8 € Einstieg
export const EXTRA_VIDEO_CENTS = 399;         // jedes Video über das Abo hinaus

/** Anzeige-Text, überall gleich: „8 € first month, then 49 €/month". */
export const PRICE_LINE_EN = "8 € first month, then 49 €/month";
export const PRICE_LINE_DE = "8 € im ersten Monat, danach 49 €/Monat";

/** Die Preis-ID des laufenden Themen-Abos (49 €). */
export function topicPriceId(): string {
  return (
    process.env.STRIPE_TOPIC_ABO_PRICE_ID?.trim() ||
    process.env.STRIPE_WETTER_ABO_PRICE_ID?.trim() ||
    "price_1TxPxR1jPNCWoiztgmJMNNdF"
  );
}

/** Gutschein für den ersten Monat (8 € statt 49 €). Leer = kein Rabatt, voller Preis. */
export function firstMonthCoupon(): string | undefined {
  return process.env.STRIPE_FIRST_MONTH_COUPON?.trim() || undefined;
}
