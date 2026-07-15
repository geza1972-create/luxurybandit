// Grow-pricing. An influencer is an appreciating ASSET ("We'll help her grow"). Her price is
// shown daily on her profile + in the gallery and rises over time:
//
//   price = admin base (quality/beauty, set per model)   <- prettier = pricier
//         + $1 per generated video                        <- a value GIFT for each video the owner makes
//         + $1 per day since her PURCHASE date            <- "age" = days owned; appreciates daily
//
// NOTE: the value gift per video is $1 — NOT the $3.99 generation cost. Generating a video (or a
// look/try-on) costs the owner $3.99 (that's revenue that covers our generation cost); ON TOP of
// that we GIFT +$1 to her asset value per generated video. Value only grows when he actively
// generates. Uploading his own photo is free (no value change).
//
// The purchase date (Kauftag) is her age reference — appreciation runs from when she was bought.
// An owner can resell: mark her "For sale" and he gets her current price; the buyer's purchase
// date resets and her daily appreciation restarts for the new owner.

export const FRESH_BASE_CENTS = 999;      // $9.99 — default base for a fresh, un-priced AI model
export const FLAGSHIP_BASE_CENTS = 50000; // $500 — established flagships (Gina/Bella) when no base set
export const REAL_MODEL_BASE_CENTS = 10000; // $100 — a REAL model (an actual person) starts here
export const VIDEO_VALUE_CENTS = 100;     // +$1 value GIFT per generated video (NOT the $3.99 gen cost)

// Flagship names ship already "grown" (premium default base) when the admin hasn't set a base.
const FLAGSHIP_NAME = /\b(gina|bella|isabella)\b/i;

// A model has ONE of two tiers, set by an admin checkbox: Flagship ($500) or AI ($9.99).
// No free per-model prices. `flagship` (bool) is the source of truth; when it's not set yet,
// flagship NAMES (Gina/Bella/Isabella) default to Flagship so they're premium out of the box.
// REAL models (actual people) floor at $100 on top — a non-flagship real model is still ≥ $100.
export function baseCentsFor(name?: string, flagship?: boolean, realModel?: boolean): number {
  const isFlag = typeof flagship === "boolean" ? flagship : !!(name && FLAGSHIP_NAME.test(name));
  let base = isFlag ? FLAGSHIP_BASE_CENTS : FRESH_BASE_CENTS;
  if (realModel) base = Math.max(base, REAL_MODEL_BASE_CENTS); // real people start at $100
  return base;
}

// Current ASSET price shown on her profile + in the gallery.
export const DAY_VALUE_CENTS = 100;  // +$1 per day owned (from the purchase date)
export const LOOK_VALUE_CENTS = 0;   // looks no longer add value on their own — value = video + day
// Milestone bonus: every full block of 10 generated videos gifts an EXTRA $10 on top of the
// per-video $1 — rewards owners who keep building her out (10 videos → +$10, 20 → +$20, …).
export const VIDEO_MILESTONE_EVERY = 10;
export const VIDEO_MILESTONE_BONUS_CENTS = 1000;
export const FOLLOWER_VALUE_CENTS = 100;  // +$1 per SUPER-FOLLOWER (a signed-up fan who follows her)

export function influencerPriceCents(opts: {
  name?: string;
  flagship?: boolean;        // admin checkbox: Flagship ($500) vs AI ($9.99)
  realModel?: boolean;       // a REAL person → base floors at $100
  videoCount?: number;       // each generated video gifts +$1 to her value
  lookCount?: number;        // (no value on its own now — kept for display)
  followerCount?: number;    // each SUPER-FOLLOWER (registered fan) gifts +$1
  purchasedAt?: string;      // Kauftag — her age reference; +$1/day since then
  createdAt?: string;        // fallback age reference before she's ever been sold
}): number {
  const base = baseCentsFor(opts.name, opts.flagship, opts.realModel);
  const videos = Math.max(0, Math.floor(opts.videoCount ?? 0));
  const looks = Math.max(0, Math.floor(opts.lookCount ?? 0));
  const followers = Math.max(0, Math.floor(opts.followerCount ?? 0));
  const ageRef = opts.purchasedAt || opts.createdAt; // purchase date wins (age = days owned)
  const ageDays = ageRef ? Math.max(0, (Date.now() - Date.parse(ageRef)) / 86_400_000) : 0;
  const milestoneBonus = Math.floor(videos / VIDEO_MILESTONE_EVERY) * VIDEO_MILESTONE_BONUS_CENTS;
  const growth = videos * VIDEO_VALUE_CENTS + looks * LOOK_VALUE_CENTS + followers * FOLLOWER_VALUE_CENTS + Math.floor(ageDays) * DAY_VALUE_CENTS + milestoneBonus;
  return base + growth;
}

// "$9.99" / "$500" / "$1,240" — 2 decimals only when there are cents.
export function fmtPriceCents(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100;
  return `$${(n % 1 ? n.toFixed(2) : n.toLocaleString("en-US"))}`;
}
