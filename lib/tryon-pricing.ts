// Single source of truth for what each try-on tier costs. Amounts are in MINOR units
// (cents), matching Stripe's `unit_amount`. The client uses these for display; the
// server uses them to charge — never trust a client-sent price.
//
// Price ladder (from CONCEPT / the try-on UI): normal photo is free; lingerie photo
// $2.90; video $4.90 (lingerie) / $2.90 (normal); 360° turnaround $7.90.

export type PaidTier = "photo" | "video" | "video360";

// Currency shown as "$" in the UI. Override server-side via env if needed.
export const TRYON_CURRENCY = "usd";

export function tryonPriceCents(tier: PaidTier, lingerie: boolean): number {
  if (tier === "video360") return 790;
  if (tier === "video") return lingerie ? 490 : 290;
  // photo: free unless it's a lingerie try-on
  return lingerie ? 290 : 0;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function tierLabel(tier: PaidTier): string {
  if (tier === "video360") return "360° try-on video";
  if (tier === "video") return "Try-on video";
  return "Try-on photo";
}
