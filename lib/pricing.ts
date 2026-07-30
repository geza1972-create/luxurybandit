/**
 * PREISE AN EINER STELLE (Owner-Entscheidung 27.07.2026, Preis halbiert am 29.07.2026).
 *
 * Themen-Abo: Listenpreis **49 €/Monat** — aber JEDER Kunde bekommt automatisch den
 * Gutschein FOREVER50 (50 %, `duration: forever`). Er zahlt damit **dauerhaft {price}/Monat**,
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
export const INCLUDED_VIDEOS_PER_MONTH = 5;         // im Abo enthaltene Videos, über ALLE Themen
// EINMALZAHLUNG (Owner 30.07.2026: „wir müssen einmalige zahlungen machen nicht nur abos …
// 9,99 euro … beim Küssen"). Nicht jeder will ein Abo; wer einmal etwas kauft, kommt oft
// später von selbst zum Abo. Der frühere Einzelkauf lag bei 3,99 € und wurde im Juli vom Abo
// abgelöst — jetzt kommt er zurück, teurer und als eigenständiges Produkt.
export const ONCE_CENTS = 999;                      // 9,99 € — ein Kauf, kein Abo

/**
 * ZAHLEN NUR NOCH VON HIER — nie wieder in Sprachtabellen tippen.
 *
 * Owner 29.07.2026: „das machst du ab jetzt so, dass überall das geändert wird aus der
 * Preistabelle." Anlass: Der Preis war auf 24,50 € und die Videozahl auf 5 gesetzt, aber auf
 * Italienisch stand weiter „25 video" und auf der Bella-Seite „25 videos a month". Wer eine
 * Zahl in acht Sprachtabellen abschreibt, vergisst eine — das ist keine Frage der Sorgfalt.
 *
 * Deshalb stehen in den Texten nur noch Platzhalter, die hier gefüllt werden:
 *   {price}  → 24,50 €   (der Preis, den er wirklich zahlt)
 *   {list}   → 49 €      (Listenpreis, durchgestrichen)
 *   {extra}  → 3,99 €    (jedes weitere Video)
 *   {videos} → 5         (im Abo enthalten)
 *   {once}   → 9,99 €    (Einmalkauf, ohne Abo)
 *
 * Ändert sich etwas, wird OBEN eine Zahl geändert — und alle Sprachen stimmen sofort.
 */
export function eur(cents: number, lang?: string): string {
  const l = String(lang ?? "en").slice(0, 2);
  const v = cents / 100;
  const txt = v.toFixed(2).replace(/\.00$/, v % 1 === 0 ? "" : ".00");
  return l === "en" ? `€${txt}` : `${txt.replace(".", ",")} €`;
}

export function fillPrices(text: string, lang?: string): string {
  return String(text ?? "")
    .replace(/\{price\}/g, eur(TOPIC_EFFECTIVE_MONTHLY_CENTS, lang))
    .replace(/\{list\}/g, eur(TOPIC_MONTHLY_CENTS, lang))
    .replace(/\{extra\}/g, eur(EXTRA_VIDEO_CENTS, lang))
    .replace(/\{once\}/g, eur(ONCE_CENTS, lang))
    .replace(/\{videos\}/g, String(INCLUDED_VIDEOS_PER_MONTH));
}

/** Anzeige-Texte: immer der halbierte Preis, denn der Gutschein gilt für alle. */
export const PRICE_LINE_EN = "{price}/month (50% off, forever)";
export const PRICE_LINE_DE = "{price}/Monat (50 % Rabatt, dauerhaft)";

/**
 * Der Satz UNTER jedem Kaufknopf: was er zahlt, dass es dauerhaft gilt und dass er
 * monatlich kündigen kann. Muss überall stehen, wo ein Preis auf dem Knopf steht,
 * sonst ist der Preis versteckt.
 */
const RENEW_NOTE: Record<string, string> = {
  en: "{price}/month instead of {list} — 50% off for as long as you stay. Cancel any time.",
  de: "{price}/Monat statt {list} — die 50 % bleiben dauerhaft. Monatlich kündbar.",
  ro: "{price}/lună în loc de {list} — cei 50 % rămân pentru totdeauna. Poți renunța oricând.",
  es: "{price}/mes en vez de {list} — el 50 % se mantiene siempre. Cancela cuando quieras.",
  fr: "{price}/mois au lieu de {list} — les 50 % restent pour toujours. Résiliable à tout moment.",
  pt: "{price}/mês em vez de {list} — os 50 % ficam para sempre. Cancela quando quiseres.",
  pl: "{price}/miesiąc zamiast {list} — 50 % zostaje na zawsze. Możesz zrezygnować w każdej chwili.",
  it: "{price}/mese invece di {list} — il 50 % resta per sempre. Disdici quando vuoi.",
};
export function renewNote(lang?: string): string {
  const l = String(lang ?? "en").slice(0, 2);
  return fillPrices(RENEW_NOTE[l] ?? RENEW_NOTE.en, l);
}

/** Der Preis, der auf dem Kaufknopf steht („… — 24,50 €"). */
export function priceTag(lang?: string): string {
  return eur(TOPIC_EFFECTIVE_MONTHLY_CENTS, lang);
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
  return "sRHDMAQE";   // FOREVER50 — 50 % dauerhaft → 24,50 € statt {list}
}
