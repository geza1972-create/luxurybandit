// Fire a Meta (Facebook) Pixel event from the client. Safe no-op if the pixel script
// hasn't loaded yet or we're on the server. Use standard event names where possible
// (Lead, CompleteRegistration, ViewContent, InitiateCheckout, Purchase) so Meta can
// optimize ad delivery against them.
type PixelParams = Record<string, unknown>;

export function trackMetaPixel(event: string, params?: PixelParams): void {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
  if (!fbq) return;
  try { fbq("track", event, params ?? {}); } catch { /* ignore */ }
}
