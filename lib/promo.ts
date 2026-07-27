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

// Fest hinterlegt, damit ein Code auch dann gilt, wenn die Env in der Produktion fehlt —
// genau daran ist der 19-EUR-Preis am 27.07.2026 live gescheitert. Env ergaenzt/ueberschreibt.
const BUILTIN: Record<string, string> = { BELLA: "Mr0NlGBT" };

export function couponFor(code: string): string | undefined {
  const key = (code ?? "").trim().toUpperCase();
  if (!key) return undefined;
  try {
    const raw = process.env.STRIPE_PROMO_CODES?.trim();
    const map = { ...BUILTIN, ...(raw ? (JSON.parse(raw) as Record<string, string>) : {}) };
    const hit = Object.entries(map).find(([k]) => k.trim().toUpperCase() === key);
    return hit?.[1]?.trim() || undefined;
  } catch {
    // kaputtes JSON in der Env darf den Kauf nicht verhindern — dann gelten die festen Codes
    const hit = Object.entries(BUILTIN).find(([k]) => k === key);
    return hit?.[1];
  }
}

/** Gibt es überhaupt Codes? (Für Hinweise in der Oberfläche.) */
export function promoConfigured(): boolean {
  return true;   // die festen Codes gelten immer
}
