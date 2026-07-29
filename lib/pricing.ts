/**
 * PREISE AN EINER STELLE (Owner-Entscheidung 27.07.2026, Preis halbiert am 29.07.2026).
 *
 * Themen-Abo: Listenpreis **49 €/Monat** — aber JEDER Kunde bekommt automatisch den
 * Gutschein FOREVER50 (50 %, `duration: forever`). Er zahlt damit **dauerhaft 24,50 €/Monat**,
 * nicht nur im ersten Monat. Owner 29.07.2026: „überall den Gutschein im Preis rein machen
 * für 50 %. Der Kunde zahlt dauerhaft 50 % weniger."
 *
 * Damit ist der frühere Einstieg „19 € im ersten Monat, danach 49 €" abgelöst: Stripe
 * erlaubt nur EINEN Gutschein pro Abo, und der dauerhafte 50-%-Rabatt schlägt den einmaligen.
 *
 * Umsetzung in Stripe (macht der Owner, Claude hat keinen Zugang):
 *   1. Preis 49 €/Monat, Steuer INKLUSIVE (Owner 27.07.2026: Verbraucher sehen den
 *      Endpreis) → `price_1TxvSi1jPNCWoiztEHBpgDhj`, überschreibbar per
 *      `STRIPE_TOPIC_ABO_PRICE_ID`
 *   2. Gutschein FOREVER50 = `sRHDMAQE` (percent_off 50, duration forever) — wird bei
 *      JEDEM Kassenvorgang automatisch gesetzt, ohne dass der Kunde etwas eintippen muss.
 * Ein Aktionscode aus einer Anzeige (z. B. ADMIN100) sticht den Standardgutschein weiterhin;
 * ein unbekannter Code bricht den Kauf NICHT ab.
 */

export const TOPIC_MONTHLY_CENTS = 4900;            // 49 € Listenpreis (durchgestrichen)
export const TOPIC_EFFECTIVE_MONTHLY_CENTS = 2450;  // 24,50 € — was er wirklich zahlt, dauerhaft
export const EXTRA_VIDEO_CENTS = 399;               // jedes Video über das Abo hinaus

/** Anzeige-Texte: immer der halbierte Preis, denn der Gutschein gilt für alle. */
export const PRICE_LINE_EN = "€24.50/month (50% off, forever)";
export const PRICE_LINE_DE = "24,50 €/Monat (50 % Rabatt, dauerhaft)";

/**
 * Der Satz UNTER jedem Kaufknopf: was er zahlt, dass es dauerhaft gilt und dass er
 * monatlich kündigen kann. Muss überall stehen, wo ein Preis auf dem Knopf steht,
 * sonst ist der Preis versteckt.
 */
const RENEW_NOTE: Record<string, string> = {
  en: "€24.50/month instead of €49 — 50% off for as long as you stay. Cancel any time.",
  de: "24,50 €/Monat statt 49 € — die 50 % bleiben dauerhaft. Monatlich kündbar.",
  ro: "24,50 €/lună în loc de 49 € — cei 50 % rămân pentru totdeauna. Poți renunța oricând.",
  es: "24,50 €/mes en vez de 49 € — el 50 % se mantiene siempre. Cancela cuando quieras.",
  fr: "24,50 €/mois au lieu de 49 € — les 50 % restent pour toujours. Résiliable à tout moment.",
  pt: "24,50 €/mês em vez de 49 € — os 50 % ficam para sempre. Cancela quando quiseres.",
  pl: "24,50 €/miesiąc zamiast 49 € — 50 % zostaje na zawsze. Możesz zrezygnować w każdej chwili.",
  it: "24,50 €/mese invece di 49 € — il 50 % resta per sempre. Disdici quando vuoi.",
};
export function renewNote(lang?: string): string {
  return RENEW_NOTE[String(lang ?? "en").slice(0, 2)] ?? RENEW_NOTE.en;
}

/** Der Preis, der auf dem Kaufknopf steht („… — 24,50 €"). */
const PRICE_TAG: Record<string, string> = {
  en: "€24.50", de: "24,50 €", ro: "24,50 €", es: "24,50 €",
  fr: "24,50 €", pt: "24,50 €", pl: "24,50 €", it: "24,50 €",
};
export function priceTag(lang?: string): string {
  return PRICE_TAG[String(lang ?? "en").slice(0, 2)] ?? PRICE_TAG.en;
}

/** Die Preis-ID des laufenden Themen-Abos (49 €). */
export function topicPriceId(): string {
  // KEIN Rueckfall auf die alte 24-EUR-Preis-ID — die ist abgeschafft. Fehlt die Env,
  // gilt der neue 49-EUR-Preis, damit nie wieder heimlich der alte Preis kassiert wird.
  return process.env.STRIPE_TOPIC_ABO_PRICE_ID?.trim() || "price_1TxvSi1jPNCWoiztEHBpgDhj";
}

/**
 * Standard-Gutschein — gilt FÜR ALLE, ohne dass jemand einen Code eintippt (Owner
 * 28.07.2026: „du sollst den Rabatt immer einbauen, auch für nicht members";
 * 29.07.2026: „der Kunde zahlt dauerhaft 50 % weniger").
 *
 * Seit 29.07.2026 ist das FOREVER50 (`sRHDMAQE`, percent_off 50, duration forever) statt
 * des alten Einmal-Gutscheins über 30 € — der galt nur für den ersten Monat, danach sprang
 * der Preis auf 49 € zurück. Abschaltbar über `STRIPE_FIRST_MONTH_COUPON=""`.
 */
export function standardCoupon(): string | undefined {
  const env = process.env.STRIPE_FIRST_MONTH_COUPON;
  if (typeof env === "string") return env.trim() || undefined;   // leer = Aktion beendet
  return "sRHDMAQE";   // FOREVER50 — 50 % dauerhaft → 24,50 € statt 49 €
}
