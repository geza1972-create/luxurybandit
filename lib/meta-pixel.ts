// Fire a Meta (Facebook) Pixel event from the client. Safe no-op if the pixel script
// hasn't loaded yet or we're on the server. Use standard event names where possible
// (Lead, CompleteRegistration, ViewContent, InitiateCheckout, Purchase) so Meta can
// optimize ad delivery against them.
type PixelParams = Record<string, unknown>;

/**
 * `eventId` (15.08.2026): dieselbe Kennung, die der Server ueber die Conversions API als
 * `event_id` schickt — die Stripe-Sitzungskennung. Meta legt zwei Meldungen mit gleicher
 * Kennung zu EINEM Kauf zusammen. Fehlt sie, zaehlt Meta Browser- und Servermeldung getrennt
 * und der Kauf steht doppelt in den Zahlen (siehe lib/meta-capi.ts).
 */
export function trackMetaPixel(event: string, params?: PixelParams, eventId?: string): void {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
  if (!fbq) return;
  try {
    if (eventId) fbq("track", event, params ?? {}, { eventID: eventId });
    else fbq("track", event, params ?? {});
  } catch { /* ignore */ }
}
