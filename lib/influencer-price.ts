// Grow-pricing. An influencer is an appreciating ASSET ("We'll help her grow"). Her price is
// shown daily on her profile + in the gallery and rises over time:
//
//   price = admin base (quality/beauty, set per model)   <- prettier = pricier
//         + $3.99 per video she owns                       <- each video we make raises her value
//         + $3 per look                                    <- her wardrobe grows her value
//         + $1 per day since her PURCHASE date             <- "age" = days owned; appreciates daily
//
// The purchase date (Kauftag) is her age reference — appreciation runs from when she was bought.
// An owner can resell: mark her "For sale" and he gets her current price; the buyer's purchase
// date resets and her daily appreciation restarts for the new owner.
//
// This is her OWNERSHIP value only. It costs the platform nothing ongoing. Actually GENERATING
// new content is funded separately by the owner's subscription video allowance + bought credits
// (1 credit / video), so daily generation for many models is always covered by revenue.

export const FRESH_BASE_CENTS = 999;      // $9.99 — default base for a fresh, un-priced model
export const FLAGSHIP_BASE_CENTS = 50000; // $500 — established flagships (Gina/Bella) when no base set
export const VIDEO_VALUE_CENTS = 399;     // +$3.99 to her value per video she owns

// Flagship names ship already "grown" (premium default base) when the admin hasn't set a base.
const FLAGSHIP_NAME = /\b(gina|bella|isabella)\b/i;

// The admin-set base wins (quality-based). Otherwise flagship names default to $500, rest to $9.99.
export function baseCentsFor(name?: string, adminBaseCents?: number): number {
  if (typeof adminBaseCents === "number" && adminBaseCents > 0) return Math.round(adminBaseCents);
  return name && FLAGSHIP_NAME.test(name) ? FLAGSHIP_BASE_CENTS : FRESH_BASE_CENTS;
}

// Current ASSET price shown on her profile + in the gallery.
export const DAY_VALUE_CENTS = 100;  // +$1 per day owned (from the purchase date)
export const LOOK_VALUE_CENTS = 300; // +$3 per look

export function influencerPriceCents(opts: {
  name?: string;
  adminBaseCents?: number;   // per-model base the admin sets (quality/beauty)
  videoCount?: number;       // each video adds $3.99 to her value
  lookCount?: number;        // +$3 per look
  purchasedAt?: string;      // Kauftag — her age reference; +$1/day since then
  createdAt?: string;        // fallback age reference before she's ever been sold
}): number {
  const base = baseCentsFor(opts.name, opts.adminBaseCents);
  const videos = Math.max(0, Math.floor(opts.videoCount ?? 0));
  const looks = Math.max(0, Math.floor(opts.lookCount ?? 0));
  const ageRef = opts.purchasedAt || opts.createdAt; // purchase date wins (age = days owned)
  const ageDays = ageRef ? Math.max(0, (Date.now() - Date.parse(ageRef)) / 86_400_000) : 0;
  const growth = videos * VIDEO_VALUE_CENTS + looks * LOOK_VALUE_CENTS + Math.floor(ageDays) * DAY_VALUE_CENTS;
  return base + growth;
}

// "$9.99" / "$500" / "$1,240" — 2 decimals only when there are cents.
export function fmtPriceCents(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100;
  return `$${(n % 1 ? n.toFixed(2) : n.toLocaleString("en-US"))}`;
}
