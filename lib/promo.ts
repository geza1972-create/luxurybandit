/**
 * AKTIONSCODES aus der Meta-Lead-Anzeige („Aktionscode einlösen").
 *
 * Der Sinn: Wer sich nur ein Formular abholt, kostet Geld und zahlt nie. Ein Code, der auf
 * der Seite eingelöst werden MUSS, trennt Neugierige von Kaufwilligen — er landet direkt
 * im Kassenvorgang statt in einer Liste, die niemand nachfasst.
 *
 * Regel: Codes werden NIE vom Client bestimmt. Der Browser schickt nur den getippten Code;
 * welcher Stripe-Gutschein dahintersteht, entscheidet der Server aus dieser Zuordnung.
 * Sonst könnte jeder eine beliebige Coupon-ID mitschicken.
 *
 * Pflege: Env `STRIPE_PROMO_CODES` als JSON, z. B.
 *   STRIPE_PROMO_CODES={"BELLA24":"promo_1Ab…","START50":"promo_2Cd…"}
 * Schlüssel = der Code aus der Meta-Anzeige (Groß/klein egal), Wert = die COUPON-ID aus
 * Stripe (Produkte → Gutscheine). Fehlt die Zuordnung, läuft der Kauf ohne Rabatt weiter —
 * niemand steht vor einer kaputten Kasse.
 */

export function couponFor(code: string): string | undefined {
  const key = (code ?? "").trim().toUpperCase();
  if (!key) return undefined;
  try {
    const raw = process.env.STRIPE_PROMO_CODES?.trim();
    if (!raw) return undefined;
    const map = JSON.parse(raw) as Record<string, string>;
    const hit = Object.entries(map).find(([k]) => k.trim().toUpperCase() === key);
    return hit?.[1]?.trim() || undefined;
  } catch {
    return undefined;   // kaputtes JSON darf keinen Checkout verhindern
  }
}

/** Gibt es überhaupt Codes? (Für Hinweise in der Oberfläche.) */
export function promoConfigured(): boolean {
  return !!process.env.STRIPE_PROMO_CODES?.trim();
}
