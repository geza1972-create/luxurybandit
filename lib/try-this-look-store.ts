import { compressImage } from "@/lib/image-compress";
import type { LookCategory } from "@/lib/look-category";
import type { WardrobeVocab } from "@/lib/wardrobe-taxonomy";

export type TryThisLookLook = {
  id: string;
  name: string;
  campaignName?: string;
  // Explicit brand override. When set it wins over name-based brand detection.
  brand?: string;
  // Lingerie/swimwear flag — set at creation (auto-detected or manual). Routes the
  // try-on straight to FASHN and drives the paid pricing tier. When undefined the
  // server falls back to name-based detection.
  lingerie?: boolean;
  storeName?: string;
  storeSlug?: string;
  storeAddress?: string;
  whatsappNumber?: string;
  availableSizes?: string[];
  price?: string;
  salePrice?: string;
  discountLabel?: string;
  dealEndsAt?: string;
  inStock?: boolean;
  published?: boolean;
  availabilityNote?: string;
  deliveryTime?: string;
  productNote?: string;
  buyUrl?: string;
  // Which admin Collection this garment belongs to (replaces the old editorial `category`
  // as the primary grouping). Empty/undefined = unassigned. See TryThisLookCollection.
  collectionId?: string;
  // Editorial wardrobe attributes (admin-managed vocab in state.wardrobeVocab). The
  // customer never sees these raw — they compose into an editorial title. See
  // lib/wardrobe-taxonomy.ts. `collection` is stored via collectionId above.
  location?: string;   // Monaco, Capri, Paris… (the top-level "trip/program" dimension)
  garmentCategory?: string;    // Kleider, Lingerie, Bademode… (garment TYPE — 2nd browsing level)
  garmentSubcategory?: string; // Sommerkleid, Abendkleid, Bikini… (sub-type under the category)
  theme?: string;      // Floral, Citrus, Emerald… (supplies the title emoji)
  occasion?: string;   // Yacht, Gala, Pool…
  style?: string;      // Luxury, Elegant, Sexy…
  aiClassified?: boolean;      // true = attributes set by the AI classifier (not by hand)
  classifyConfidence?: number; // 0..1 confidence from the last classification
  imageHash?: string;          // perceptual dHash of the garment image (near-duplicate detection)
  // Price-ladder alternatives (dupes) found via visual search, sorted desc by price.
  alternatives?: {
    title: string;
    link: string;
    source?: string;
    thumbnail: string;
    price?: string;
    priceValue?: number;
    currency?: string;
    lingerie?: boolean; // injected lingerie upsell card (try-on routes to FASHN, paid)
  }[];
  createdAt: string;
  imagePath?: string;
  imageUrl?: string;
  frontImagePath?: string;
  frontImageUrl?: string;
  backImagePath?: string;
  backImageUrl?: string;
  garmentFrontImagePath?: string;
  garmentFrontImageUrl?: string;
  garmentBackImagePath?: string;
  garmentBackImageUrl?: string;
  galleryImagePaths?: string[];
  galleryImageUrls?: string[];
};

export type TryThisLookStore = {
  id: string;
  name: string;
  slug: string;
  address?: string;
  description?: string;
  instagram?: string;
  whatsappNumber?: string;
  // Seller auth
  ownerUserId?: string;       // Supabase auth user ID
  ownerEmail?: string;
  // AI access
  aiEnabled?: boolean;
  aiCreditsLimit?: number;    // max generations per month (set by admin)
  aiCreditsUsed?: number;     // used this month
  aiCreditsResetAt?: string;  // ISO date of last monthly reset
  pendingAiRequest?: boolean; // seller requested AI access
  createdAt: string;
};

export type TryThisLookEvent = {
  id: string;
  name: string;
  lookId: string;
  createdAt: string;
  userAgent?: string;
  campaignId?: string;
  storeName?: string;
  lookName?: string;
  selectedSize?: string;
  utmSource?: string;
  utmCampaign?: string;
  // Funnel analytics: traffic source (instagram/direct/…), visitor geo, and the
  // specific product/escape a product_click landed on.
  source?: string;
  country?: string;
  city?: string;
  productLabel?: string;
  productLink?: string;
  productThumb?: string;
  // Carousel swipe depth (carousel_swipe events): the slide reached (1-based) and the
  // total number of slides — lets Insights show how far people swipe (e.g. 4/6).
  slide?: number;
  slides?: number;
  visitor?: string; // logged-in name/email if known, else undefined (shown as "Guest")
  // GERÄTE-KENNUNG (29.07.2026): die `lb_visitor`-Kennung aus dem Browser — dieselbe, die
  // Chat und „My Gallery" benutzen. Damit lässt sich zählen, wie viele MENSCHEN da waren,
  // nicht nur wie viele Klicks es gab, und ein Besucher lässt sich über Chat und Try-on
  // hinweg verfolgen. Vorher hatten 385 von 386 Ereignissen keinerlei Zuordnung.
  device?: string;
  internal?: boolean; // fired by an admin/test or localhost session → excluded from the counts
};

export type TryThisLookLead = {
  id: string;
  lookId: string;
  visitorId?: string;
  name?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  selectedSize?: string;
  buyingPreference?: "pickup" | "delivery";
  leadSource?: string;
  marketingConsent?: boolean;
  uploadedPhotoPath?: string;
  uploadedPhotoUrl?: string;
  status?: "new" | "contacted" | "closed";
  createdAt: string;
};

export type TryThisLookGeneration = {
  id: string;
  lookId: string;
  visitorId?: string;
  storeName?: string;
  lookName?: string;
  imagePath: string;
  imageUrl?: string;
  // Try-on video (a long-lived signed URL) + consent to show this try-on in the feed.
  videoUrl?: string;
  feed?: boolean;
  customerName?: string;
  userId?: string;
  curatorId?: string;
  // Which motion produced this video (turn | dance). Part of the reuse cache key
  // (model × garment × motion) so an identical try-on is served from storage, not
  // regenerated. Missing = legacy "turn".
  motion?: "turn" | "dance";
  createdAt: string;
  // Set when the original creator/store was deleted but the user's try-on is kept.
  creatorDeleted?: boolean;
};

export type TryThisLookComment = {
  id: string;
  lookId: string;
  authorName: string;
  text: string;
  createdAt: string;
};

export type Message = {
  id: string;
  toUserId: string;
  toUsername: string;
  fromUserId: string;
  fromUsername: string;
  fromName: string;
  fromEmail?: string;
  text: string;
  createdAt: string;
  readAt?: string;
};

export type Follow = {
  id: string;
  followerId: string;         // auth user id
  followeeSlug: string;       // username or storeSlug
  followeeType: "user" | "store";
  createdAt: string;
};

// A fashion curator: applies via /curators/apply, then works in AI Studio
// (generates looks + tryons). Earns later via affiliate on approved looks.
// Central price list (all in CENTS). Admin-editable on the admin Pricing page.
export type PricingConfig = {
  subscriptionMonthlyCents?: number; // membership fee / month
  videoGenCents?: number;            // cost to generate a video / look try-on (owner pays)
  ownPhotoUploadCents?: number;      // cost to upload your own photo (free)
  freshBaseCents?: number;           // starting value of a fresh AI model
  realModelBaseCents?: number;       // starting value floor of a REAL model
  flagshipBaseCents?: number;        // legacy single flagship base (fallback = tier 1)
  flagshipBase1Cents?: number;       // Flagship tier 1 — starting value
  flagshipBase2Cents?: number;       // Flagship tier 2 — starting value
  flagshipBase3Cents?: number;       // Flagship tier 3 — starting value
  videoValueCents?: number;          // value GIFT added per generated video
  videoMilestoneBonusCents?: number; // EXTRA value gift for every full 10 videos generated
  followerValueCents?: number;       // value gift per super-follower (registered fan)
  lookValueCents?: number;           // value gift per look (0 = none)
  dayValueCents?: number;            // value gift per day owned
  chatPassCents?: number;            // paid chat pass price with someone else's model
  chatPassMinutes?: number;          // how many MINUTES a paid chat pass lasts (a count, not $)
  chatFreeMessages?: number;         // how many FREE messages a fan gets first (a count, not $)
  chatDailyMessages?: number;        // Bella-Abo: chat messages PER DAY per subscriber (a count; caps AI cost)
  wetterAboMonthlyCents?: number;    // „Wetter am Morgen" TOPIC subscription / month (per Thema, nicht per Model)
  wetterAboTrialDays?: number;       // Wetter-Abo free days before the paywall (a count, not $)
  superFollowCents?: number;         // what a fan pays to Super Follow her (one-time)
  // Per-field Stripe Price ID (admin fills these in Stripe → paste here). Keyed by the same
  // field names as the cents amounts above, e.g. stripeIds.subscriptionMonthlyCents = "price_…".
  stripeIds?: Record<string, string>;
};

// Defaults = the numbers agreed for the own-a-model concept. The admin can override each.
export const DEFAULT_PRICING: Required<PricingConfig> = {
  subscriptionMonthlyCents: 499,   // $4.99 / month membership
  videoGenCents: 399,              // $3.99 per generated video / try-on
  ownPhotoUploadCents: 0,          // free
  freshBaseCents: 999,             // $9.99 fresh AI model
  realModelBaseCents: 10000,       // $100 real model floor
  flagshipBaseCents: 50000,        // legacy single flagship base
  flagshipBase1Cents: 50000,       // $500 — Flagship tier 1
  flagshipBase2Cents: 150000,      // $1,500 — Flagship tier 2
  flagshipBase3Cents: 500000,      // $5,000 — Flagship tier 3
  videoValueCents: 100,            // +$1 value per generated video
  videoMilestoneBonusCents: 1000,  // +$10 extra for every full 10 videos
  followerValueCents: 100,         // +$1 value per super-follower
  lookValueCents: 0,               // looks add no value on their own
  dayValueCents: 100,              // +$1 value per day owned
  chatPassCents: 399,              // $3.99 paid chat pass
  chatPassMinutes: 30,             // 30-minute chat pass
  chatFreeMessages: 10,            // 10 free messages first
  chatDailyMessages: 40,           // Bella-Abo: 40 chat messages / day per subscriber (caps Haiku cost)
  wetterAboMonthlyCents: 999,      // €9.99 / month — „Wetter am Morgen" Thema
  wetterAboTrialDays: 7,           // 7 free days before the paywall
  superFollowCents: 499,           // $4.99 / month to Super Follow her (unlocks her private videos)
  stripeIds: { subscriptionMonthlyCents: "price_1TtEoM1jPNCWoiztvswekWJD", wetterAboMonthlyCents: "price_1TvXn31jPNCWoiztjlTTbaKF" }, // rest filled by admin
};

// Read the live price list (admin-editable) merged over the defaults. ONE source of truth for
// every price shown across the app — landing, apply, checkouts. Change it once in the admin.
export async function getPricingConfig(): Promise<Required<PricingConfig>> {
  const state = await readTryThisLookState();
  return {
    ...DEFAULT_PRICING,
    ...(state.pricing ?? {}),
    stripeIds: { ...DEFAULT_PRICING.stripeIds, ...(state.pricing?.stripeIds ?? {}) },
  };
}
// "$9.99" / "$500" — re-exported so UI can format cents without importing the pricing lib.
export function fmtCents(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100;
  return `$${n % 1 ? n.toFixed(2) : n.toLocaleString("en-US")}`;
}

export type CuratorProfile = {
  id: string;
  firstName: string;
  lastName: string;
  modelName?: string;         // public stage / influencer name (distinct from real name)
  title?: string;             // her brand title / role on the card, e.g. "Monaco Influencer"
  intro?: string;             // her self-introduction — the card's ABOUT slide text
  sponsor?: string;           // her brand sponsor, e.g. "Gianna Bellucci" (shown on the intro slide)
  email: string;
  phone?: string;
  address?: string;
  country?: string;           // ISO-2 country code she's from (e.g. "RO") → flag + name on the card
  brands?: string;            // free-text brands they love
  style?: string;             // free-text style description
  genderFocus?: string;       // "women" | "men" | "unisex"
  styleModelId?: string;      // CONCEPT 2.0: the role model whose STYLE this influencer emulates
  imageSource?: "own" | "ours"; // her face = her own verified photos, or platform images (anti-deepfake)
  avatarFaceId?: string;      // if imageSource "ours": the claimed AI face from the library (booked once, $3.99)
  colors?: string;            // comma-joined colour tags
  fabrics?: string;           // comma-joined fabric tags
  occasions?: string;         // comma-joined occasion tags
  priceTiers?: string;        // comma-joined: Budget / Mid-range / Luxury
  fitFocus?: string;          // comma-joined: Standard / Petite / Curve / Tall
  ageFocus?: string;          // target audience age range
  motto?: string;             // short tagline (AI-suggested, editable)
  bio?: string;               // short profile description (AI-suggested, editable)
  photoPath?: string;         // storage path of the curator's photo (square avatar crop)
  photoUrl?: string;          // hydrated signed URL (read side only)
  photoFullPath?: string;     // storage path of the ORIGINAL (uncropped, e.g. portrait) photo
  photoFullUrl?: string;      // hydrated signed URL (read side only)
  photoBodyPaths?: string[];  // full-body dressed photos (3:4 crops, up to 2) — try-on references
  photoBodyUrls?: string[];   // hydrated signed URLs (read side only)
  profilePhotoPaths?: string[]; // candidate profile photos the applicant uploaded (up to 4) — admin picks one as photoPath
  profilePhotoUrls?: string[];  // hydrated signed URLs (read side only)
  verificationSelfiePath?: string; // liveness selfie (holding the code) — admin reviews to verify
  verificationSelfieUrl?: string;  // hydrated signed URL (read side only)
  consentAt?: string;          // ISO time the applicant accepted the model rules & terms (audit trail)
  consentText?: string;        // exactly what they agreed to (18+, real photos, rules & terms)
  instagram?: string;         // handle for promotion
  followerBoost?: number;     // baseline followers added to the real follow count (admin-set)
  likeBoost?: number;         // vanity likes baseline on her profile stats (admin-set)
  viewBoost?: number;         // vanity views baseline on her profile stats (admin-set)
  realBadge?: boolean;        // gold "is a real LuxuryBandit Model" banner — admin-set per model, off by default
  chatPersona?: string;       // admin-written AI-chat instructions/personality for THIS model
  chatEnabled?: boolean;      // admin toggle: is "chat with the model" on? (undefined = on)
  pinned?: boolean;           // admin-pinned → shown first in the Models gallery
  featured?: boolean;         // featured → free showcase on the Models tab; non-featured are locked (paid)
  priceCents?: number;        // (legacy) old free base value — superseded by the flagship flag
  flagship?: boolean;         // admin checkbox: Flagship ($500 base) vs AI model ($9.99 base)
  flagshipTier?: number;      // 1 | 2 | 3 — which flagship tier (base value from the price list)
  forSale?: boolean;          // listed for sale (admin/owner toggle); default = unowned
  ownerHideName?: boolean;    // owner chose to hide their name on the card (show only the ID)
  // Ownership (own-a-model concept). A model with NO ownerEmail is "for sale". When bought,
  // ownerEmail = the buyer + purchasedAt = now (her age/appreciation restarts from the purchase).
  ownerEmail?: string;
  purchasedAt?: string;
  status: "active" | "pending" | "deactivated";
  createdAt: string;
  // Creator credits (communicated to creators as "credits", never money).
  // Missing credits → STARTER_CREDITS. See lib/curator-budget.ts.
  credits?: number;             // spendable balance
  creditsSpent?: number;        // lifetime spent
  creditsEarned?: number;       // lifetime earned via engagement
  awardedMilestones?: string[]; // earn-milestone keys already granted
  creditLog?: { at: string; credits: number; label: string }[];
  // My Studio self-upload credits — separate pool from the AI-generation `credits` above.
  // Each of HER OWN photo/video uploads spends one; admin-gifted content doesn't touch this.
  studioUploadCredits?: number; // missing → STUDIO_UPLOAD_STARTER_CREDITS
};

// An affiliate partner store the admin maintains. Curators source looks from
// these (search by style); published shop-links get wrapped via affiliateTemplate
// with the curator's SubID for internal attribution.
export type PartnerStore = {
  id: string;
  name: string;
  network?: string;            // e.g. "CJ Affiliate", "FlexOffers"
  homeUrl: string;             // store homepage
  searchUrlTemplate?: string;  // {q} placeholder, e.g. ".../search?q={q}"
  affiliateTemplate?: string;  // {url} + {sid} placeholders (empty until account live)
  enabled: boolean;
  createdAt: string;
};

export const DEFAULT_PARTNER_STORES: PartnerStore[] = [
  { id: "store-revolve", name: "Revolve", network: "CJ Affiliate", homeUrl: "https://www.revolve.com/", searchUrlTemplate: "https://www.revolve.com/r/Search.jsp?search={q}", affiliateTemplate: "", enabled: true, createdAt: "2026-06-23T00:00:00.000Z" },
  { id: "store-ally", name: "Ally Fashion", network: "FlexOffers / Skimlinks", homeUrl: "https://allyfashion.com/", searchUrlTemplate: "https://allyfashion.com/search?q={q}", affiliateTemplate: "", enabled: true, createdAt: "2026-06-23T00:00:00.000Z" },
];

// Fashion-brand autocomplete database. Seeded from a large curated list, then
// grown from what curators enter on the apply form.
export { FASHION_BRANDS as DEFAULT_BRANDS } from "./fashion-brands";
import { FASHION_BRANDS as DEFAULT_BRANDS } from "./fashion-brands";

// Style-descriptor autocomplete database. Seeded, then grown from curator input.
export const DEFAULT_STYLES: string[] = [
  "Boho", "Minimal", "Old money", "Quiet luxury", "Streetwear", "Coastal grandmother", "Clean girl",
  "Romantic", "Edgy", "Classic", "Preppy", "Y2K", "Cottagecore", "Grunge", "Athleisure",
  "Business casual", "Festival", "Resort", "Glam", "Vintage", "Monochrome", "Parisian chic",
  "Scandi", "Western", "Gothic", "Sporty", "Feminine", "Androgynous", "Maximalist", "Mob wife",
  "Boudoir", "Provocative",
];

export const DEFAULT_COLORS: string[] = [
  "Black", "White", "Cream", "Beige", "Camel", "Brown", "Chocolate", "Tan", "Navy", "Grey", "Charcoal",
  "Red", "Burgundy", "Wine", "Pink", "Blush", "Hot pink", "Lavender", "Purple", "Lilac", "Blue",
  "Sky blue", "Cobalt", "Teal", "Green", "Olive", "Sage", "Emerald", "Forest green", "Yellow", "Mustard",
  "Orange", "Rust", "Terracotta", "Gold", "Silver", "Neutrals", "Earth tones", "Pastels", "Jewel tones",
  "Monochrome", "Metallics", "Animal print", "Floral",
];

export const DEFAULT_FABRICS: string[] = [
  "Linen", "Cotton", "Silk", "Satin", "Denim", "Leather", "Faux leather", "Suede", "Wool", "Cashmere",
  "Knit", "Crochet", "Lace", "Tweed", "Velvet", "Chiffon", "Organza", "Tulle", "Jersey", "Ribbed",
  "Sequin", "Mesh", "Corduroy", "Faux fur", "Sheer", "Viscose", "Cupro", "Modal",
];

export const DEFAULT_OCCASIONS: string[] = [
  "Everyday", "Workwear", "Office", "Evening", "Cocktail", "Wedding guest", "Bridal", "Resort", "Vacation",
  "Festival", "Date night", "Going out", "Brunch", "Loungewear", "Black tie", "Maternity",
];

// Union two tag lists (defaults + stored), case-insensitive dedupe, defaults first.
function unionTags(defaults: string[], stored: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of [...defaults, ...stored]) {
    const k = v.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(v.trim());
  }
  return out;
}

export type TryThisLookState = {
  activeLookId: string;
  activeLookIds?: string[];
  stores?: TryThisLookStore[];
  looks: TryThisLookLook[];
  events: TryThisLookEvent[];
  leads: TryThisLookLead[];
  generations: TryThisLookGeneration[];
  comments?: TryThisLookComment[];
  messages?: Message[];
  follows?: Follow[];
  curators?: CuratorProfile[];
  partnerStores?: PartnerStore[];
  // One reusable lingerie upsell product per colour (shared across looks, fetched
  // once via SerpApi) — injected as the 2nd "Bandit the look" card so shoppers can
  // try the model in lingerie. Keyed by colour name.
  lingerieByColor?: Record<string, NonNullable<TryThisLookLook["alternatives"]>[number]>;
  brands?: string[];
  styles?: string[];
  colors?: string[];
  fabrics?: string[];
  occasions?: string[];
  // Central, admin-editable PRICE LIST (all amounts in CENTS). One source of truth the admin
  // page shows + edits. Defaults live in DEFAULT_PRICING; the grow-price helper reads these
  // (or falls back to its own constants) so numbers can be tuned without a redeploy.
  pricing?: PricingConfig;
  // Global kill-switch: when true, end-user try-on generation is paused ("coming soon").
  // Admin/staff bypass it. Toggled instantly from the admin panel (no redeploy).
  tryonPaused?: boolean;
  // When true, a NEW model chat no longer fires the admin WhatsApp/email alert (chats still log).
  chatNotifyPaused?: boolean;
  // Admin-managed wardrobe: outfit images shown in the Try-On funnel gallery, so a user
  // can pick an outfit to see the video's model (or their own avatar) wearing it.
  outfits?: TryThisLookOutfit[];
  // Admin-managed COLLECTIONS — renameable groupings of wardrobe garments. Replaces the
  // old fixed editorial categories. Each look points at one via look.collectionId.
  collections?: TryThisLookCollection[];
  // Admin-editable vocab for the other wardrobe attributes (Location/Theme/Occasion/Style).
  // Collections live in `collections[]` above. See lib/wardrobe-taxonomy.ts.
  wardrobeVocab?: WardrobeVocab;
  // Monthly TRAVEL PROGRAMS (per destination) owners subscribe to for their influencer.
  programs?: WardrobeProgram[];
  // AI-generated feed posts per program (image+caption), pending admin approval.
  programFeeds?: ProgramFeedPost[];
  // CONCEPT 2.0 — AI-face library for the creation tool. Each face is UNIQUE: once a creator
  // claims it (pays $3.99) it's "booked" and can't be picked again. Admin adds new ones.
  avatarFaces?: { id: string; imagePath?: string; imageUrl?: string; videoPath?: string; videoUrl?: string; claimedBy?: string; claimedAt?: string; createdAt?: string; sold?: boolean }[];
  // Admin-editable prompt template for the Try-On funnel video generation. Uses the
  // tokens @Bild1 (the model/avatar) and @Bild2 (the chosen outfit).
  funnelVideoPrompt?: string;
  // Per-day feed-view tallies { "YYYY-MM-DD": count } so Insights can show Views for
  // Today / 7d / 30d. Lifetime total still lives in each look's viewCount.
  viewsByDay?: Record<string, number>;
  // Per-day SITE visits (a landing on the home/feed, once per session) — reconciles with
  // ad traffic (a visitor who lands but never opens a reel isn't a "view").
  visitsByDay?: Record<string, number>;
  // "Chat with the model" AI config + logs. globalNote = admin rules applied to EVERY
  // model's chat persona (per-model instructions live on the curator as chatPersona).
  chatConfig?: { globalNote?: string };
  // Logged AI-chat conversations, newest first, so the admin can read what users ask.
  modelChats?: ModelChatLog[];
  // Admin-sent "from a model" messages to a user's email (check-ins). Shown in the user's
  // Messages tab + emailed. Newest first.
  directMessages?: { id: string; curatorId: string; curatorName?: string; toEmail: string; text: string; createdAt: string; readAt?: string }[];
  // Video-generation credits. balances = email → credits left (1 video = 1 credit;
  // $8 pack = +4). redeemed = Stripe session ids already granted (idempotency).
  // welcomed = emails that already got their free welcome credits (granted once).
  // subMonths = "email|YYYY-MM" keys already granted the monthly subscriber allowance (idempotency).
  videoCredits?: { balances: Record<string, number>; redeemed: string[]; welcomed?: string[]; subMonths?: string[]; genLog?: Record<string, number> };
  // Admin-managed carousel slides for the /urlaub-mit-bella landing card — an intro image
  // (e.g. "Das ist Peter" + description) and example videos, injected into Bella's ModelCard
  // carousel. Persist PATHS only; buildBellaCard signs them on read.
  bellaSlides?: BellaSlide[];
  // Booked journeys (customer name/email) so the Card Studio can build per-customer cards.
  tripBookings?: TripBooking[];
  // Log of emails sent to customers from the Card Studio (subject/topic + when).
  emailLog?: { id: string; email: string; subject: string; sentAt: string }[];
  // Saved generation prompts (Card Studio prompt library): image + video prompts, and "voice"
  // = saved spoken lines for the lip-sync feature.
  promptLibrary?: { id: string; kind: "image" | "video" | "voice"; text: string; createdAt: string }[];
};

// One admin-uploaded slide for the Bella landing-card carousel: an image OR a video, plus
// optional title/caption text shown over it.
export type BellaSlide = {
  id: string;
  kind: "image" | "video";
  path: string;          // storage path of the image or video (signed on read)
  posterPath?: string;   // optional poster for a video slide
  title?: string;        // e.g. "Das ist Peter"
  caption?: string;      // short description / caption
  day?: string;          // Tag, für den der Beitrag ist (YYYY-MM-DD) — der Abonnent sieht den heutigen (bzw. neuesten ≤ heute)
  time?: string;         // Uhrzeit (HH:MM) — für mehrere Beiträge am selben Tag; leer = ganztägig
  topic?: string;        // z. B. "wetter" — Abo-only Thema, NICHT im öffentlichen Feed/Reel
  ad?: boolean;          // „Werbung": dieser Beitrag ist die Besucher-Vorschau (nicht eingeloggt), nicht der Abo-Alltag
  context?: string;      // „Bellas Tag": Szenario/Rolle für den Chat-System-Prompt (wo sie ist, was sie macht, was sie trägt)
  firstMessage?: string; // optionale erste Chat-Nachricht (Opener); leer = Standard-Gruß
  hidden?: boolean;      // kept in the library but NOT shown on any card
  private?: boolean;     // shown on the card but LOCKED — only members / super-followers can open it
  garmentCat?: string;   // manuelle Kategorie fürs Owner-Overview: "lingerie" | "normal"
  pages?: string[];      // surface keys it appears on ("landing" | "profile"); empty = everywhere
  customer?: string;     // customer email this slide is FOR; empty = the general (public) card
  order?: number;        // manual sort order within its scope (ascending); undefined = by createdAt
  createdAt?: string;
  source?: "admin" | "model"; // who added it — "admin" = a gift from LuxuryBandit, "model" = she uploaded it herself
  pendingApproval?: boolean;  // her own PUBLIC upload, awaiting admin review — not shown publicly yet
};

// Zeigt /bella diesen Beitrag? DIE EINE Regel — Seite und Werkzeug fragen beide hier.
// Vorher stand sie zweimal im Code; laufen die Kopien auseinander, zeigt die Seite
// etwas an, das im Werkzeug nicht auftaucht und dort auch nicht gelöscht werden kann.
export const isPublicBellaPost = (s: BellaSlide): boolean =>
  !s.customer && s.hidden !== true && s.private !== true && !s.pendingApproval
  && (!s.pages || s.pages.length === 0 || s.pages.includes("profile"))
  && !!s.path;

// Reihenfolge auf der Seite: neueste zuerst. Ebenfalls nur EINMAL definiert.
export const sortBellaPosts = (a: BellaSlide, b: BellaSlide): number =>
  (a.order ?? 1e9) - (b.order ?? 1e9) || String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));

// A booked journey (from the /urlaub-mit-bella landing) — so the Card Studio can pick a customer
// and build a personalised card for them.
export type TripBooking = {
  id: string;
  name?: string;
  email: string;
  program?: string;
  createdAt: string;
};

export type ModelChatLog = {
  id: string;            // `${curatorId}:${visitorId}`
  curatorId: string;
  curatorName?: string;
  visitorId: string;
  userName?: string;
  createdAt: string;
  updatedAt: string;
  messages: { role: "user" | "assistant"; content: string; at: string }[];
};

export type TryThisLookOutfit = {
  id: string;
  name: string;
  imagePath?: string;   // storage path (signed on read)
  imageUrl?: string;    // signed URL (hydrated) or legacy stored URL
  lookId?: string;      // undefined/empty = global (all looks); else only that look
  createdAt: string;
};

// Admin-managed COLLECTION — a renameable grouping of wardrobe garments (looks).
// Replaces the old fixed editorial categories (After Dark / Riviera / …). A collection
// can be made PUBLIC (its garments show as a filter chip on the public feed) and/or
// RELEASED to models (its garments appear in a model's video-creation garment picker).
export type TryThisLookCollection = {
  id: string;
  name: string;
  order?: number;            // display order (ascending)
  public?: boolean;          // shows as a chip on the public feed
  releaseToAllModels?: boolean; // every model may use these garments in her videos
  modelIds?: string[];       // specific curators/models this collection is released to
  legacyCategory?: LookCategory; // set when seeded from an old editorial category
  createdAt: string;
};

// A monthly TRAVEL PROGRAM an owner subscribes to for their AI influencer. The influencer
// "travels" to `location` for `days` and posts one look/day from that destination's
// wardrobe (a video + a place report + shop link). Definition only here — the daily
// auto-content engine + subscription come later.
// One stop on a program's route (a city for N days). A single-city program is a 1-stop route.
export type ProgramStop = { location: string; days: number };

export type WardrobeProgram = {
  id: string;
  name: string;              // e.g. "Mittelmeer-Cruise"
  // FIXED route the admin curates (a package). The owner picks the package, not the cities.
  stops?: ProgramStop[];     // ordered stops; total days = sum of stop days
  location?: string;         // legacy/first destination (kept for cover + back-compat)
  description?: string;      // marketing copy: what's included, shown to the owner
  days?: number;             // legacy single-stop length; superseded by stops
  price?: string;            // subscription price / month
  published?: boolean;       // available for owners to subscribe
  surprise?: boolean;        // mystery trip — stops hidden from the owner, revealed day by day
  lookIds?: string[];        // optional explicit ordered daily sequence; empty = auto by the stops' locations
  coverImagePath?: string;
  coverImageUrl?: string;
  createdAt: string;
};

// A single AI-generated feed post for a program (image + caption), awaiting admin approval
// before it's released to the owner. Generated up-front so the admin previews the month.
export type ProgramFeedPost = {
  id: string;
  programId: string;
  day: number;               // which day of the trip
  location: string;          // the stop this post belongs to
  caption: string;
  lingerie?: boolean;        // used our lingerie pool for this post
  imagePath?: string;
  imageUrl?: string;
  videoPath?: string;        // PixVerse image→video result (persisted)
  videoUrl?: string;         // signed on read
  videoPrompt?: string;      // the motion prompt used
  approved?: boolean;        // admin pre-approved for the owner
  createdAt: string;
};

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "shopcut-images";
const STATE_PATH = "try-this-look/state.json";
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_LOOK: TryThisLookLook = {
  id: "test-look-001",
  name: "Futuristic Black Gold Look",
  campaignName: "Instagram test",
  createdAt: "2026-06-06T00:00:00.000Z",
  imageUrl: "/test-look-001.svg"
};

function getSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "");
  const url = rawUrl
    ? (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`)
        .replace(/\/rest\/v1\/?$/i, "")
        .replace(/\/storage\/v1\/?$/i, "")
        .replace(/\/$/, "")
    : "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.");
  }

  return { url, serviceRoleKey };
}

function encodeStoragePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  return fetch(`${url}${path}`, {
    ...init,
    // CRITICAL: never let Next.js cache state reads — a cached read froze the whole
    // app (writes succeeded but reads kept returning a stale snapshot → "lost" try-ons).
    cache: "no-store",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(init.headers ?? {})
    }
  });
}

async function ensureBucket() {
  const existingBucket = await supabaseFetch(`/storage/v1/bucket/${BUCKET}`);
  if (existingBucket.ok) return;

  const response = await supabaseFetch("/storage/v1/bucket", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: false
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = String(payload?.message ?? payload?.error ?? "");
    if (response.status === 409 || message.toLowerCase().includes("already exists")) return;
    throw new Error(message || "Supabase storage bucket could not be created.");
  }
}

function defaultState(): TryThisLookState {
  return {
    activeLookId: DEFAULT_LOOK.id,
    activeLookIds: [DEFAULT_LOOK.id],
    stores: [],
    looks: [DEFAULT_LOOK],
    events: [],
    leads: [],
    generations: [],
    partnerStores: DEFAULT_PARTNER_STORES,
    brands: DEFAULT_BRANDS,
    styles: DEFAULT_STYLES,
    colors: DEFAULT_COLORS,
    fabrics: DEFAULT_FABRICS,
    occasions: DEFAULT_OCCASIONS
  };
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

function storesFromLooks(looks: TryThisLookLook[]): TryThisLookStore[] {
  const stores = new Map<string, TryThisLookStore>();
  for (const look of looks) {
    const slug = normalizeSlug(look.storeSlug ?? "");
    const name = look.storeName?.trim();
    if (!slug || !name || stores.has(slug)) continue;
    stores.set(slug, {
      id: `store-${slug}`,
      name,
      slug,
      address: look.storeAddress,
      whatsappNumber: look.whatsappNumber,
      createdAt: look.createdAt
    });
  }
  return Array.from(stores.values());
}

/**
 * Recover a storage path from a Supabase signed or public URL.
 * Used for legacy looks that stored a signed URL but no imagePath field.
 */
function extractPathFromUrl(urlStr: string | undefined): string | undefined {
  if (!urlStr) return undefined;
  try {
    const parsed = new URL(urlStr);
    // Signed URL: /storage/v1/object/sign/<bucket>/<path>?token=...
    const signedMatch = parsed.pathname.match(/\/storage\/v1\/object\/sign\/[^/]+\/(.+)/);
    if (signedMatch) return decodeURIComponent(signedMatch[1]);
    // Public URL: /storage/v1/object/public/<bucket>/<path>
    const publicMatch = parsed.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
    if (publicMatch) return decodeURIComponent(publicMatch[1]);
  } catch { /**/ }
  return undefined;
}

// Single path signing (used for uploads/admin only — not in hot path).
// expiresIn defaults to 24h; pass a longer value for assets stored as a URL (videos).
export async function getSignedUrl(path: string, expiresIn = 60 * 60 * 24) {
  const { url } = getSupabaseConfig();
  const response = await supabaseFetch(`/storage/v1/object/sign/${BUCKET}/${encodeStoragePath(path)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn })
  });
  if (!response.ok) return "";
  const payload = await response.json().catch(() => null);
  const signedUrl = payload?.signedURL || payload?.signedUrl || "";
  if (!signedUrl) return "";
  return signedUrl.startsWith("http") ? signedUrl : `${url}/storage/v1${signedUrl}`;
}

// Create a one-time signed UPLOAD url so the browser can PUT a large file straight
// to Supabase Storage — bypassing Vercel's ~4.5 MB serverless request-body limit
// (which silently killed 14 MB video uploads that went through our API function).
// The returned `uploadUrl` is PUT directly from the client with the raw file bytes.
export async function createSignedUploadUrl(folder: "videos" | "uploads", extension: string) {
  await ensureBucket();
  const { url } = getSupabaseConfig();
  const ext = (extension || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const path = `try-this-look/${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const response = await supabaseFetch(`/storage/v1/object/upload/sign/${BUCKET}/${encodeStoragePath(path)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const p = await response.json().catch(() => null);
    throw new Error(p?.message ?? "Could not create upload URL.");
  }
  const payload = await response.json().catch(() => null);
  const signed = payload?.url || payload?.signedURL || payload?.signedUrl || "";
  if (!signed) throw new Error("Could not create upload URL.");
  const uploadUrl = signed.startsWith("http") ? signed : `${url}/storage/v1${signed}`;
  return { path, uploadUrl };
}

// Batch signing — one request for all paths (replaces N individual calls)
async function batchGetSignedUrls(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const { url } = getSupabaseConfig();
  const response = await supabaseFetch(`/storage/v1/object/sign/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths: unique, expiresIn: 60 * 60 * 24 })
  });
  if (!response.ok) {
    // Fallback: individual signing in parallel
    const entries = await Promise.all(unique.map(async p => [p, await getSignedUrl(p)] as const));
    return new Map(entries.filter(([, v]) => v));
  }
  const items = await response.json().catch(() => []) as { path?: string; signedURL?: string; error?: string | null }[];
  const map = new Map<string, string>();
  for (const item of items) {
    if (!item.path || !item.signedURL || item.error) continue;
    const signed = item.signedURL.startsWith("http") ? item.signedURL : `${url}/storage/v1${item.signedURL}`;
    map.set(item.path, signed);
  }
  return map;
}

async function hydrateState(state: TryThisLookState): Promise<TryThisLookState> {
  // Collect every path that needs a signed URL in one pass
  const allPaths: string[] = [];
  for (const look of state.looks) {
    const imgPath = look.imagePath ?? extractPathFromUrl(look.imageUrl);
    if (imgPath) allPaths.push(imgPath);
    const fImgPath = look.frontImagePath ?? extractPathFromUrl(look.frontImageUrl);
    if (fImgPath) allPaths.push(fImgPath);
    const bImgPath = (look as any).backImagePath ?? extractPathFromUrl((look as any).backImageUrl);
    if (bImgPath) allPaths.push(bImgPath);
    // garmentFrontImagePath may be missing on legacy looks — extract from stored URL as fallback
    const gfPath = (look as any).garmentFrontImagePath ?? extractPathFromUrl((look as any).garmentFrontImageUrl);
    if (gfPath) allPaths.push(gfPath);
    const gbPath = (look as any).garmentBackImagePath ?? extractPathFromUrl((look as any).garmentBackImageUrl);
    if (gbPath) allPaths.push(gbPath);
    // Reel source images (clothes + location) — admin-only, used for the dupe searches.
    const clPath = (look as any).clothesImagePath ?? extractPathFromUrl((look as any).clothesImageUrl);
    if (clPath) allPaths.push(clPath);
    const locPath = (look as any).locationImagePath ?? extractPathFromUrl((look as any).locationImageUrl);
    if (locPath) allPaths.push(locPath);
    for (const p of look.galleryImagePaths ?? []) if (p) allPaths.push(p);
    // Videos + posters are stored as signed URLs; re-sign them each read (like images)
    // so they never expire (was: stored 24h URL that died after a day → black feed).
    const vidPath = (look as any).videoPath ?? extractPathFromUrl((look as any).videoUrl);
    if (vidPath) allPaths.push(vidPath);
    const posterPath = (look as any).videoPosterPath ?? extractPathFromUrl((look as any).videoPosterUrl);
    if (posterPath) allPaths.push(posterPath);
  }
  for (const gen of state.generations) {
    if (gen.imagePath) allPaths.push(gen.imagePath);
    // The uploaded "before" photo — accept a legacy stored URL too (extract its path),
    // so try-ons without a userPhotoPath don't lose their upload on hydration.
    const upPath = (gen as any).userPhotoPath ?? extractPathFromUrl((gen as any).userPhotoUrl);
    if (upPath) allPaths.push(upPath);
    const gVidPath = (gen as any).videoPath ?? extractPathFromUrl((gen as any).videoUrl);
    if (gVidPath) allPaths.push(gVidPath);
    const gPosterPath = (gen as any).videoPosterPath ?? extractPathFromUrl((gen as any).videoPosterUrl);
    if (gPosterPath) allPaths.push(gPosterPath);
  }
  for (const lead of state.leads ?? []) {
    if (lead.uploadedPhotoPath) allPaths.push(lead.uploadedPhotoPath);
  }
  for (const cur of state.curators ?? []) {
    if (cur.photoPath) allPaths.push(cur.photoPath);
    if (cur.photoFullPath) allPaths.push(cur.photoFullPath);
    if (cur.verificationSelfiePath) allPaths.push(cur.verificationSelfiePath);
    for (const p of cur.photoBodyPaths ?? []) allPaths.push(p);
    for (const p of cur.profilePhotoPaths ?? []) allPaths.push(p);
  }
  for (const outfit of state.outfits ?? []) {
    const p = outfit.imagePath ?? extractPathFromUrl(outfit.imageUrl);
    if (p) allPaths.push(p);
  }
  for (const post of state.programFeeds ?? []) {
    const p = post.imagePath ?? extractPathFromUrl(post.imageUrl);
    if (p) allPaths.push(p);
    const vp = post.videoPath ?? extractPathFromUrl(post.videoUrl);
    if (vp) allPaths.push(vp);
  }

  // Single batch request instead of N×2 individual requests
  const signed = await batchGetSignedUrls(allPaths);

  const s = (path: string | undefined, fallback?: string) =>
    path ? (signed.get(path) ?? fallback ?? "") : (fallback ?? "");

  const looks = state.looks.map(look => ({
    ...look,
    imageUrl: s(look.imagePath ?? extractPathFromUrl(look.imageUrl), look.imageUrl),
    frontImageUrl: s(look.frontImagePath ?? extractPathFromUrl(look.frontImageUrl), look.frontImageUrl),
    backImageUrl: s((look as any).backImagePath ?? extractPathFromUrl((look as any).backImageUrl), (look as any).backImageUrl),
    garmentFrontImageUrl: s(
      (look as any).garmentFrontImagePath ?? extractPathFromUrl((look as any).garmentFrontImageUrl),
      (look as any).garmentFrontImageUrl
    ),
    garmentBackImageUrl: s(
      (look as any).garmentBackImagePath ?? extractPathFromUrl((look as any).garmentBackImageUrl),
      (look as any).garmentBackImageUrl
    ),
    clothesImageUrl: s((look as any).clothesImagePath ?? extractPathFromUrl((look as any).clothesImageUrl), (look as any).clothesImageUrl),
    locationImageUrl: s((look as any).locationImagePath ?? extractPathFromUrl((look as any).locationImageUrl), (look as any).locationImageUrl),
    videoUrl: (look as any).videoUrl
      ? s((look as any).videoPath ?? extractPathFromUrl((look as any).videoUrl), (look as any).videoUrl)
      : (look as any).videoUrl,
    videoPosterUrl: (look as any).videoPosterUrl
      ? s((look as any).videoPosterPath ?? extractPathFromUrl((look as any).videoPosterUrl), (look as any).videoPosterUrl)
      : (look as any).videoPosterUrl,
    galleryImageUrls: look.galleryImagePaths?.length
      ? look.galleryImagePaths.map(p => signed.get(p) ?? "").filter(Boolean)
      : (look.galleryImageUrls ?? []).map(u => {
          const p = extractPathFromUrl(u);
          return (p && signed.get(p)) ? signed.get(p)! : u;
        }),
  }));

  const generations = state.generations.map(gen => ({
    ...gen,
    imageUrl: s(gen.imagePath, (gen as any).imageUrl),
    userPhotoUrl: s((gen as any).userPhotoPath ?? extractPathFromUrl((gen as any).userPhotoUrl), (gen as any).userPhotoUrl) || undefined,
    videoUrl: (gen as any).videoUrl
      ? s((gen as any).videoPath ?? extractPathFromUrl((gen as any).videoUrl), (gen as any).videoUrl)
      : (gen as any).videoUrl,
    videoPosterUrl: (gen as any).videoPosterUrl
      ? s((gen as any).videoPosterPath ?? extractPathFromUrl((gen as any).videoPosterUrl), (gen as any).videoPosterUrl)
      : (gen as any).videoPosterUrl,
  }));

  const leads = (state.leads ?? []).map(lead => ({
    ...lead,
    uploadedPhotoUrl: lead.uploadedPhotoPath ? (signed.get(lead.uploadedPhotoPath) ?? lead.uploadedPhotoUrl) : lead.uploadedPhotoUrl,
  }));

  const curators = (state.curators ?? []).map(cur => ({
    ...cur,
    photoUrl: cur.photoPath ? (signed.get(cur.photoPath) ?? cur.photoUrl) : cur.photoUrl,
    photoFullUrl: cur.photoFullPath ? (signed.get(cur.photoFullPath) ?? cur.photoFullUrl) : cur.photoFullUrl,
    photoBodyUrls: (cur.photoBodyPaths ?? []).map(p => signed.get(p)).filter((u): u is string => !!u),
    profilePhotoUrls: (cur.profilePhotoPaths ?? []).map(p => signed.get(p)).filter((u): u is string => !!u),
    verificationSelfieUrl: cur.verificationSelfiePath ? (signed.get(cur.verificationSelfiePath) ?? cur.verificationSelfieUrl) : cur.verificationSelfieUrl,
  }));

  const outfits = (state.outfits ?? []).map(outfit => ({
    ...outfit,
    imageUrl: s(outfit.imagePath ?? extractPathFromUrl(outfit.imageUrl), outfit.imageUrl),
  }));
  const programFeeds = (state.programFeeds ?? []).map(post => ({
    ...post,
    imageUrl: s(post.imagePath ?? extractPathFromUrl(post.imageUrl), post.imageUrl),
    videoUrl: (post.videoPath || post.videoUrl) ? s(post.videoPath ?? extractPathFromUrl(post.videoUrl), post.videoUrl) : undefined,
  }));

  return { ...state, looks, leads, generations, curators, outfits, programFeeds };
}

export async function readTryThisLookState(): Promise<TryThisLookState> {
  await ensureBucket();
  const response = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(STATE_PATH)}`);
  if (response.status === 404) return hydrateState(defaultState());
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = String(payload?.message ?? payload?.error ?? "");
    if (message.toLowerCase().includes("object not found")) return hydrateState(defaultState());
    throw new Error(message || "Try This Look state could not be loaded.");
  }

  const text = await response.text();
  if (!text.trim()) return hydrateState(defaultState());

  let state: TryThisLookState;
  try {
    state = JSON.parse(text) as TryThisLookState;
  } catch {
    return hydrateState(defaultState());
  }

  if (!state.looks?.length) return hydrateState(defaultState());
  const stores = state.stores?.length ? state.stores : storesFromLooks(state.looks);
  const validLookIds = new Set(state.looks.map((look) => look.id));
  const activeLookIds = (state.activeLookIds?.length ? state.activeLookIds : [state.activeLookId || state.looks[0].id])
    .filter((id, index, ids) => validLookIds.has(id) && ids.indexOf(id) === index);
  const normalizedActiveLookIds = activeLookIds.length ? activeLookIds : [state.looks[0].id];
  return hydrateState({
    activeLookId: normalizedActiveLookIds[0],
    activeLookIds: normalizedActiveLookIds,
    stores,
    looks: state.looks,
    events: state.events ?? [],
    leads: state.leads ?? [],
    generations: state.generations ?? [],
    comments: state.comments ?? [],
    follows: state.follows ?? [],
    messages: state.messages ?? [],
    curators: state.curators ?? [],
    partnerStores: state.partnerStores?.length ? state.partnerStores : DEFAULT_PARTNER_STORES,
    brands: unionTags(DEFAULT_BRANDS, state.brands ?? []),
    styles: unionTags(DEFAULT_STYLES, state.styles ?? []),
    colors: unionTags(DEFAULT_COLORS, state.colors ?? []),
    fabrics: unionTags(DEFAULT_FABRICS, state.fabrics ?? []),
    occasions: unionTags(DEFAULT_OCCASIONS, state.occasions ?? []),
    pricing: { ...DEFAULT_PRICING, ...(state.pricing ?? {}), stripeIds: { ...DEFAULT_PRICING.stripeIds, ...(state.pricing?.stripeIds ?? {}) } },
    tryonPaused: state.tryonPaused === true,
    chatNotifyPaused: state.chatNotifyPaused === true,
    outfits: state.outfits ?? [],
    collections: state.collections ?? [],
    wardrobeVocab: state.wardrobeVocab,
    programs: state.programs ?? [],
    programFeeds: state.programFeeds ?? [],
    avatarFaces: state.avatarFaces ?? [],
    funnelVideoPrompt: state.funnelVideoPrompt,
    viewsByDay: state.viewsByDay ?? {},
    visitsByDay: state.visitsByDay ?? {},
    chatConfig: state.chatConfig ?? {},
    modelChats: state.modelChats ?? [],
    directMessages: state.directMessages ?? [],
    videoCredits: state.videoCredits ?? { balances: {}, redeemed: [] },
    bellaSlides: state.bellaSlides ?? [],
    tripBookings: state.tripBookings ?? [],
    emailLog: state.emailLog ?? [],
    promptLibrary: state.promptLibrary ?? [],
  });
}

// The whole state is one JSON blob written with last-write-wins. A slow/stale
// request would otherwise revert append-mostly collections (e.g. drop try-ons
// posted by other requests in the meantime). Re-read the latest blob and UNION
// these collections by id so a save can never LOSE records it didn't know about.
async function fetchRawState(): Promise<Partial<TryThisLookState> | null> {
  // Retry a few times: a transient read failure here skips the protective read-merge,
  // which can let a save overwrite (drop) collections it didn't load. Retrying keeps
  // the merge reliable so outfits/looks are never lost to a momentary hiccup.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(STATE_PATH)}`);
      if (res.ok) {
        const text = await res.text();
        if (text.trim()) return JSON.parse(text) as Partial<TryThisLookState>;
      }
    } catch { /* retry */ }
    if (attempt < 2) await new Promise(r => setTimeout(r, 150));
  }
  return null;
}
// Append-only union by id (for collections that don't get individually deleted).
function unionById<T extends { id: string }>(ours: T[] = [], latest: T[] = []): T[] {
  const seen = new Set(ours.map(r => r.id));
  return [...ours, ...latest.filter(r => !seen.has(r.id))];
}
// For generations (which CAN be deleted): only re-add storage records that are
// NEWER than our newest — i.e. concurrent posts we hadn't seen. Older records we
// don't have were deleted on purpose, so we must NOT resurrect them.
function mergeNewerById<T extends { id: string; createdAt?: string }>(ours: T[] = [], latest: T[] = [], deletedIds?: Set<string>): T[] {
  const seen = new Set(ours.map(r => r.id));
  const ourNewest = ours.reduce((m, r) => (String(r.createdAt ?? "") > m ? String(r.createdAt ?? "") : m), "");
  // Re-add concurrent additions (newer than our newest) that a slow save would drop —
  // but NEVER resurrect something we explicitly deleted. Deleting our newest item drops
  // ourNewest below the deleted item's timestamp, which would otherwise reclassify the
  // just-deleted row as "concurrent" and bring it back. deletedIds blocks that.
  const missedNewer = latest.filter(r =>
    !seen.has(r.id) &&
    !(deletedIds?.has(r.id)) &&
    String(r.createdAt ?? "") > ourNewest
  );
  return [...missedNewer, ...ours];
}

type SaveOptions = { deletedGenerationIds?: string[]; deletedLeadIds?: string[]; deletedOutfitIds?: string[]; deletedChatIds?: string[]; deletedFaceIds?: string[]; deletedCollectionIds?: string[]; deletedProgramIds?: string[]; deletedFeedPostIds?: string[]; deletedBellaSlideIds?: string[]; deletedBookingIds?: string[]; deletedPromptIds?: string[] };

async function writeTryThisLookState(state: TryThisLookState, opts: SaveOptions = {}) {
  await ensureBucket();
  // The whole state is one blob (last-write-wins). Re-read the latest and merge so
  // a slow/stale save can never DROP try-ons/comments posted in the meantime.
  const latest = await fetchRawState();
  if (latest) {
    const delGen = opts.deletedGenerationIds?.length ? new Set(opts.deletedGenerationIds) : undefined;
    const delLead = opts.deletedLeadIds?.length ? new Set(opts.deletedLeadIds) : undefined;
    const delOutfit = opts.deletedOutfitIds?.length ? new Set(opts.deletedOutfitIds) : undefined;
    const delChat = opts.deletedChatIds?.length ? new Set(opts.deletedChatIds) : undefined;
    const delFace = opts.deletedFaceIds?.length ? new Set(opts.deletedFaceIds) : undefined;
    state = {
      ...state,
      // AI-face library: union by id; a CLAIMED face always wins so a concurrent booking
      // is never clobbered (a face can only be claimed once).
      avatarFaces: (() => {
        const byId = new Map(((latest.avatarFaces ?? []) as any[]).map(f => [f.id, f]));
        for (const f of ((state.avatarFaces ?? []) as any[])) { const prev = byId.get(f.id); byId.set(f.id, f.claimedBy ? f : (prev?.claimedBy ? prev : f)); }
        if (delFace) for (const id of delFace) byId.delete(id);
        return [...byId.values()] as any;
      })(),
      generations: mergeNewerById(state.generations as any, latest.generations as any, delGen) as any,
      // Admin-uploaded outfits CAN be deleted → mergeNewerById (like generations) so a
      // concurrent/stale save can never DROP them, while a real delete isn't resurrected.
      outfits: mergeNewerById((state.outfits ?? []) as any, (latest.outfits ?? []) as any, delOutfit) as any,
      // Collections: our version wins (admin just read→edited→saved); union in any the
      // concurrent save knows about so a stale analytics write can't drop a new collection.
      collections: (() => {
        const byId = new Map(((latest.collections ?? []) as any[]).map(c => [c.id, c]));
        for (const c of ((state.collections ?? []) as any[])) byId.set(c.id, c);
        if (opts.deletedCollectionIds?.length) for (const id of opts.deletedCollectionIds) byId.delete(id);
        return [...byId.values()] as any;
      })(),
      // Wardrobe vocab: our version wins (admin just edited it); if we somehow don't have
      // it, keep whatever latest holds so a concurrent save can't wipe it.
      wardrobeVocab: state.wardrobeVocab ?? latest.wardrobeVocab,
      // Travel programs: union by id (admin edited); a concurrent save can't drop a program.
      programs: (() => {
        const byId = new Map(((latest.programs ?? []) as any[]).map(p => [p.id, p]));
        for (const p of ((state.programs ?? []) as any[])) byId.set(p.id, p);
        if (opts.deletedProgramIds?.length) for (const id of opts.deletedProgramIds) byId.delete(id);
        return [...byId.values()] as any;
      })(),
      // Program feed posts: union by id (admin generates/approves); deletable.
      programFeeds: (() => {
        const byId = new Map(((latest.programFeeds ?? []) as any[]).map(f => [f.id, f]));
        for (const f of ((state.programFeeds ?? []) as any[])) byId.set(f.id, f);
        if (opts.deletedFeedPostIds?.length) for (const id of opts.deletedFeedPostIds) byId.delete(id);
        return [...byId.values()] as any;
      })(),
      // Card Studio slides (Bella landing card): union by id (admin uploads/replaces); deletable.
      // Without this a concurrent/stale analytics save silently reverts newly-added slides.
      bellaSlides: (() => {
        const byId = new Map(((latest.bellaSlides ?? []) as any[]).map(s => [s.id, s]));
        for (const s of ((state.bellaSlides ?? []) as any[])) byId.set(s.id, s);
        if (opts.deletedBellaSlideIds?.length) for (const id of opts.deletedBellaSlideIds) byId.delete(id);
        return [...byId.values()] as any;
      })(),
      // Trip bookings: union by id (public landing appends) so a concurrent save can't drop a
      // just-made booking; admin can prune via deletedBookingIds (not resurrected).
      tripBookings: (() => {
        const byId = new Map(((latest.tripBookings ?? []) as any[]).map(b => [b.id, b]));
        for (const b of ((state.tripBookings ?? []) as any[])) byId.set(b.id, b);
        if (opts.deletedBookingIds?.length) for (const id of opts.deletedBookingIds) byId.delete(id);
        return [...byId.values()] as any;
      })(),
      // Sent-email log: append-only union by id so a concurrent save can't drop a just-logged mail.
      emailLog: unionById((state.emailLog ?? []) as any, (latest.emailLog ?? []) as any) as any,
      // Prompt library: union by id (admin adds/edits); deletable via deletedPromptIds.
      promptLibrary: (() => {
        const byId = new Map(((latest.promptLibrary ?? []) as any[]).map(p => [p.id, p]));
        for (const p of ((state.promptLibrary ?? []) as any[])) byId.set(p.id, p);
        if (opts.deletedPromptIds?.length) for (const id of opts.deletedPromptIds) byId.delete(id);
        return [...byId.values()] as any;
      })(),
      comments: unionById((state.comments ?? []) as any, (latest.comments ?? []) as any) as any,
      // Leads CAN be deleted in the admin → use mergeNewerById (like generations) so a
      // deletion isn't resurrected by the read-merge, while concurrent new leads survive.
      leads: mergeNewerById((state.leads ?? []) as any, (latest.leads ?? []) as any, delLead) as any,
      messages: unionById((state.messages ?? []) as any, (latest.messages ?? []) as any) as any,
      // AI-chat logs: our version wins per conversation (the route read→appended→saved),
      // and concurrent NEW conversations from other visitors are re-added by createdAt.
      modelChats: mergeNewerById((state.modelChats ?? []) as any, (latest.modelChats ?? []) as any, delChat) as any,
      directMessages: unionById((state.directMessages ?? []) as any, (latest.directMessages ?? []) as any) as any,
      // Video credits: our version wins per email (we just read→modified→saved), plus
      // any emails only latest knows about; redeemed session-ids are unioned (idempotency).
      videoCredits: {
        balances: { ...(latest.videoCredits?.balances ?? {}), ...(state.videoCredits?.balances ?? {}) },
        redeemed: Array.from(new Set([...(latest.videoCredits?.redeemed ?? []), ...(state.videoCredits?.redeemed ?? [])])).slice(-5000),
        welcomed: Array.from(new Set([...(latest.videoCredits?.welcomed ?? []), ...(state.videoCredits?.welcomed ?? [])])).slice(-20000),
        subMonths: Array.from(new Set([...(latest.videoCredits?.subMonths ?? []), ...(state.videoCredits?.subMonths ?? [])])).slice(-20000),
      },
      // Events are an append-only analytics log fired constantly (views, tryon/bandit/
      // product clicks). Without a union-merge a concurrent `view` save clobbers a
      // just-fired `tryon_click` (last-write-wins). Union keeps both; sort newest-first.
      events: unionById((state.events ?? []) as any, (latest.events ?? []) as any)
        .sort((a: any, b: any) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))) as any,
      // Per-day view tallies: take the MAX per date so a stale/concurrent save can't
      // roll the count backwards (approximate, like viewCount — analytics, not billing).
      viewsByDay: (() => {
        const out: Record<string, number> = { ...(latest.viewsByDay ?? {}) };
        for (const [day, n] of Object.entries(state.viewsByDay ?? {})) {
          out[day] = Math.max(out[day] ?? 0, Number(n) || 0);
        }
        return out;
      })(),
      visitsByDay: (() => {
        const out: Record<string, number> = { ...(latest.visitsByDay ?? {}) };
        for (const [day, n] of Object.entries(state.visitsByDay ?? {})) {
          out[day] = Math.max(out[day] ?? 0, Number(n) || 0);
        }
        return out;
      })(),
      // Price list: field-level merge (latest as base, our edits on top) so a concurrent
      // analytics save carrying a stale copy can't wipe a just-saved price.
      pricing: { ...(latest.pricing ?? {}), ...(state.pricing ?? {}), stripeIds: { ...(latest.pricing?.stripeIds ?? {}), ...(state.pricing?.stripeIds ?? {}) } },
    };
  }
  const strippedState: TryThisLookState = {
    activeLookId: state.activeLookId,
    activeLookIds: state.activeLookIds?.length ? state.activeLookIds : [state.activeLookId],
    stores: state.stores ?? [],
    looks: state.looks.map(({ imageUrl, frontImageUrl, backImageUrl, garmentFrontImageUrl, garmentBackImageUrl, galleryImageUrls, ...look }) => look),
    // 500 reichten für NEUN TAGE — alles davor war unwiederbringlich weg, als der Owner am
    // 29.07.2026 nach seiner Besucherzahl fragte. 5.000 decken bei heutigem Verkehr rund ein
    // Vierteljahr ab. Die gekürzte Kennung (userAgent auf 160 Zeichen) hält den Zuwachs klein.
    events: state.events.slice(0, 5000),
    leads: state.leads.map(({ uploadedPhotoUrl, ...lead }) => lead).slice(0, 500),
    generations: state.generations.map(({ imageUrl, ...generation }) => generation).slice(0, 200),
    comments: (state.comments ?? []).slice(0, 2000),
    follows: (state.follows ?? []).slice(0, 5000),
    messages: (state.messages ?? []).slice(0, 2000),
    curators: (state.curators ?? []).map(({ photoUrl, photoFullUrl, photoBodyUrls, profilePhotoUrls, verificationSelfieUrl, ...curator }) => curator).slice(0, 2000),
    outfits: (state.outfits ?? []).map(({ imageUrl, ...outfit }) => outfit).slice(0, 500),
    collections: (state.collections ?? []).slice(0, 500),
    wardrobeVocab: state.wardrobeVocab,
    programs: (state.programs ?? []).map(({ coverImageUrl, ...p }) => p).slice(0, 200),
    programFeeds: (state.programFeeds ?? []).map(({ imageUrl, videoUrl, ...f }) => f).slice(0, 2000),
    bellaSlides: (state.bellaSlides ?? []).slice(0, 500),
    tripBookings: (state.tripBookings ?? []).slice(0, 2000),
    emailLog: (state.emailLog ?? []).slice(-5000),
    promptLibrary: (state.promptLibrary ?? []).slice(0, 500),
    avatarFaces: (state.avatarFaces ?? []).map(({ imageUrl, videoUrl, ...f }) => f).slice(0, 2000),
    funnelVideoPrompt: state.funnelVideoPrompt,
    viewsByDay: state.viewsByDay ?? {},
    visitsByDay: state.visitsByDay ?? {},
    chatConfig: state.chatConfig ?? {},
    // Newest conversations first, capped so the state blob can't grow unbounded.
    modelChats: [...(state.modelChats ?? [])]
      .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))
      .slice(0, 800),
    directMessages: [...(state.directMessages ?? [])].slice(0, 3000),
    videoCredits: {
      balances: state.videoCredits?.balances ?? {},
      redeemed: (state.videoCredits?.redeemed ?? []).slice(-5000),
      welcomed: (state.videoCredits?.welcomed ?? []).slice(-20000),
    },
    partnerStores: (state.partnerStores ?? []).slice(0, 200),
    brands: (state.brands ?? []).slice(0, 5000),
    styles: (state.styles ?? []).slice(0, 5000),
    colors: (state.colors ?? []).slice(0, 5000),
    fabrics: (state.fabrics ?? []).slice(0, 5000),
    occasions: (state.occasions ?? []).slice(0, 5000),
    tryonPaused: state.tryonPaused === true,
    chatNotifyPaused: state.chatNotifyPaused === true,
    pricing: state.pricing ?? DEFAULT_PRICING,
  };

  const response = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(STATE_PATH)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-upsert": "true",
      // Store the blob with no CDN cache so reads always get the freshest state.
      "cache-control": "no-cache, max-age=0"
    },
    body: JSON.stringify(strippedState)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? "Try This Look state could not be saved.");
  }
}

// ── Card Studio store ───────────────────────────────────────────────────────
// The Card Studio slides live in their OWN blob PER MODEL (NOT in the shared state.json)
// so that concurrent writes to state.json (analytics, try-ons, …) can never wipe them.
// Every commit also writes a backup blob, so a bad commit is always recoverable.
// Bella (the original) keeps the legacy path; every other model gets its own blob.
const BELLA_STUDIO_ID = "curator-1783683672619-td4cy";
// `scope` = eine Landing (z. B. "urlaub", "wetter"). Jede Landing bekommt so ihren EIGENEN
// Card-Blob (card-studio-<model>-<scope>.json), getrennt von der Model-Standardkarte.
function studioPath(modelId?: string, scope?: string) {
  const id = (modelId ?? "").trim();
  const base = (!id || id === BELLA_STUDIO_ID) ? "card-studio" : `card-studio-${id.replace(/[^a-zA-Z0-9-]/g, "")}`;
  const s = (scope ?? "").trim().replace(/[^a-zA-Z0-9-]/g, "");
  return `try-this-look/${base}${s ? `-${s}` : ""}.json`;
}
const studioBackupPath = (modelId?: string, scope?: string) => studioPath(modelId, scope).replace(/\.json$/, "-backup.json");

export async function readCardStudioSlides(modelId?: string, scope?: string): Promise<BellaSlide[]> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(studioPath(modelId, scope))}`);
    if (!res.ok) {
      // Lazy-Fork-Migration: eine Landing, die noch nie bearbeitet wurde, erbt die
      // Standardkarte des Models — so wirkt nichts „leer", bis der Admin sie einmal
      // in ihren eigenen Blob speichert.
      if (scope) return readCardStudioSlides(modelId);
      return [];
    }
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.slides) ? (data.slides as BellaSlide[]) : [];
  } catch { return []; }
}

export async function readCardStudioBackup(modelId?: string, scope?: string): Promise<{ slides: BellaSlide[]; savedAt: string }> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(studioBackupPath(modelId, scope))}`);
    if (!res.ok) return { slides: [], savedAt: "" };
    const data = await res.json().catch(() => null);
    return { slides: Array.isArray(data?.slides) ? (data.slides as BellaSlide[]) : [], savedAt: String(data?.savedAt ?? "") };
  } catch { return { slides: [], savedAt: "" }; }
}

// ── Kiss-Theme-Config (eigener kleiner Blob, KEIN state.json-Feld → keine Whitelist-Falle) ──
// modelIds = welche Models im Kiss-Funnel stehen (leer = alle); teaserPath = das Theme-
// Teaser-Bild (Cover im Themes-Katalog); examplePaths = Beispiel-Videos der Landing.
const KISS_CONFIG_PATH = "try-this-look/kiss-config.json";
// `previewRefPath` (29.07.2026): das ANGEZOGENE Referenzfoto der Frau für die Gratis-Vorschau.
// Owner: „du kannst Bella nicht nehmen in Lingerie als Referenz." Ihr Katalogfoto ist ein
// Lingerie-Bild — als Eingabe an die Bildmoderation gegeben, kommt nichts zurück. Deshalb ein
// eigener Platz, den der Admin mit einem angezogenen Ganzkörperfoto füllt.
export type KissConfig = { modelIds: string[]; teaserPath?: string; examplePaths?: string[]; previewRefPaths?: string[] };

// Dieselbe Struktur für JEDES Thema (29.07.2026): `kiss-config.json`, `bella-config.json`, …
// Der Vorgabewert "kiss" hält alle bestehenden Aufrufe unverändert.
const themeConfigPath = (theme: string) =>
  theme === "kiss" ? KISS_CONFIG_PATH : `try-this-look/${theme.replace(/[^a-z0-9-]/gi, "")}-config.json`;

export async function readThemeConfig(theme = "kiss"): Promise<KissConfig> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(themeConfigPath(theme))}`);
    if (!res.ok) return { modelIds: [] };
    const data = await res.json().catch(() => null);
    return {
      modelIds: Array.isArray(data?.modelIds) ? data.modelIds.map(String) : [],
      teaserPath: String(data?.teaserPath ?? "").trim() || undefined,
      // MEHRERE Referenzfotos (Owner 29.07.2026: „ich will mehrere hochladen"). Ein früher
      // gespeichertes Einzelfoto (`previewRefPath`) wird beim Lesen in die Liste überführt,
      // damit nichts verloren geht.
      previewRefPaths: Array.isArray(data?.previewRefPaths)
        ? data.previewRefPaths.map(String).filter(Boolean)
        : (String(data?.previewRefPath ?? "").trim() ? [String(data.previewRefPath).trim()] : undefined),
      // WICHTIG: fehlender Schlüssel bleibt `undefined` (= nie eingerichtet, Vorgaben zeigen),
      // eine leere Liste bleibt leer (= der Admin hat bewusst alle gelöscht).
      examplePaths: Array.isArray(data?.examplePaths) ? data.examplePaths.map(String).filter(Boolean) : undefined,
    };
  } catch { return { modelIds: [] }; }
}

export async function readKissConfig(): Promise<KissConfig> {
  const c = await readThemeConfig("kiss");
  return { ...c, examplePaths: c.examplePaths ?? [] };   // Kiss erwartet seit jeher eine Liste
}

export async function writeThemeConfig(config: KissConfig, theme = "kiss"): Promise<void> {
  await ensureBucket();
  const response = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(themeConfigPath(theme))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({
      modelIds: config.modelIds.slice(0, 100),
      teaserPath: config.teaserPath || undefined,
      previewRefPaths: (config.previewRefPaths ?? []).slice(0, 20),
      examplePaths: (config.examplePaths ?? []).slice(0, 20),
      savedAt: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Theme-Config „${theme}" konnte nicht gespeichert werden (${response.status}).`);
}

export const writeKissConfig = (config: KissConfig) => writeThemeConfig(config, "kiss");

// ── Kiss-Log: jede fertige Kiss-Generierung (fürs Admin-Tool: wer/wann/Model/bezahlt) ──
// ── GRATIS-VORSCHAUBILD: Tagesdeckel ────────────────────────────────────────────────
// Ein verschenktes Bild kostet echtes Geld. Ohne Bremse dreht ein einziger Besucher — oder
// ein Skript — die Rechnung hoch. Deshalb wird SERVERSEITIG gezählt; ein Zähler im Browser
// wäre in zehn Sekunden umgangen. Zwei Deckel: pro Gerät und als Notbremse für alle zusammen.
const FREE_PREVIEW_PATH = "try-this-look/free-preview-counter.json";
export const FREE_PREVIEW_PER_DEVICE = 2;
export const FREE_PREVIEW_PER_DAY = 300;

/**
 * Bucht einen Gratis-Versuch. Gibt `false` zurück, wenn ein Deckel erreicht ist.
 *
 * Gebucht wird VOR der Generierung: bricht der Bildaufruf ab, ist der Versuch verbraucht.
 * Das ist Absicht — andersherum könnte ein Skript durch erzwungene Abbrüche endlos
 * weiterlaufen und Kosten erzeugen.
 */
export async function claimFreePreview(device: string): Promise<{ ok: boolean; reason?: "day" | "device" }> {
  const today = new Date().toISOString().slice(0, 10);
  let c: { day: string; total: number; devices: Record<string, number> } = { day: today, total: 0, devices: {} };
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(FREE_PREVIEW_PATH)}`);
    if (res.ok) {
      const d = await res.json().catch(() => null);
      if (d && d.day === today) {
        c = { day: today, total: Number(d.total) || 0, devices: (d.devices ?? {}) as Record<string, number> };
      }
    }
  } catch { /* nicht lesbar → wir fangen bei null an, statt den Trichter zu blockieren */ }

  if (c.total >= FREE_PREVIEW_PER_DAY) return { ok: false, reason: "day" };
  if ((c.devices[device] ?? 0) >= FREE_PREVIEW_PER_DEVICE) return { ok: false, reason: "device" };

  c.total += 1;
  c.devices[device] = (c.devices[device] ?? 0) + 1;
  try {
    await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(FREE_PREVIEW_PATH)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
      body: JSON.stringify(c),
    });
  } catch { /* Zähler nicht schreibbar: lieber ein Bild zu viel als ein kaputter Trichter */ }
  return { ok: true };
}

const KISS_LOG_PATH = "try-this-look/kiss-log.json";
export type KissLogEntry = {
  id: string;
  createdAt: string;
  modelId?: string;
  modelName?: string;
  videoUrl?: string;      // persistierte (langlebige) Video-URL
  paid?: boolean;         // per Stripe freigeschaltet
};

export async function readKissLog(): Promise<KissLogEntry[]> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(KISS_LOG_PATH)}`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.entries) ? (data.entries as KissLogEntry[]) : [];
  } catch { return []; }
}

export async function writeKissLog(entries: KissLogEntry[]): Promise<void> {
  await ensureBucket();
  const response = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(KISS_LOG_PATH)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ entries: entries.slice(0, 500), savedAt: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Kiss-Log konnte nicht gespeichert werden (${response.status}).`);
}

// Persist the full slide array in ONE write. Before overwriting, the current committed
// version is copied to the backup blob (last-known-good), so nothing is ever lost silently.
export async function writeCardStudioSlides(slides: BellaSlide[], modelId?: string, scope?: string): Promise<void> {
  await ensureBucket();
  const mainPath = studioPath(modelId, scope), backupPath = studioBackupPath(modelId, scope);
  // 1) Back up the CURRENT committed version first (best-effort — never block the save).
  try {
    const cur = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(mainPath)}`);
    if (cur.ok) {
      const buf = new Uint8Array(await cur.arrayBuffer());
      if (buf.length > 2) {
        await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(backupPath)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
          body: buf,
        });
      }
    }
  } catch { /* backup is best-effort */ }
  // 2) Write the new committed version.
  const body = JSON.stringify({ slides: slides.slice(0, 500), savedAt: new Date().toISOString() });
  const response = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(mainPath)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? "Card Studio could not be saved.");
  }
}

// ── Newsletter opt-out ──────────────────────────────────────────────────────
// Emails that unsubscribed from the "New Look" newsletter. Own blob (clobber-proof).
const NEWSLETTER_OPTOUT_PATH = "try-this-look/newsletter-optout.json";

export async function readNewsletterOptOut(): Promise<string[]> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(NEWSLETTER_OPTOUT_PATH)}`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.emails) ? (data.emails as string[]).map(e => String(e).toLowerCase()) : [];
  } catch { return []; }
}

export async function addNewsletterOptOut(email: string): Promise<void> {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return;
  await ensureBucket();
  const current = await readNewsletterOptOut();
  if (current.includes(e)) return;
  const body = JSON.stringify({ emails: [...current, e], updatedAt: new Date().toISOString() });
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(NEWSLETTER_OPTOUT_PATH)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body,
  });
}

// ── „Bella meldet sich" — Warteliste (Smoke-Test) ───────────────────────────
// Anmeldungen für Bellas tägliche Reise-Nachrichten. Eigenes Blob (clobber-sicher),
// damit parallele state.json-Schreibvorgänge nichts überschreiben.
const DAILY_SIGNUP_PATH = "try-this-look/daily-signups.json";

export type DailySignup = {
  id: string;
  email: string;
  firstName?: string;
  city?: string;          // für „bei dir wird es heute …"
  country?: string;       // ISO-2, z. B. "RO"
  whatsapp?: string;      // Lieferkanal für die tägliche Nachricht (mit Vorwahl)
  lang?: string;          // "de" | "en" | "ro"
  source?: string;        // utm_source / referrer
  createdAt: string;
};

export async function readDailySignups(): Promise<DailySignup[]> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(DAILY_SIGNUP_PATH)}`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.signups) ? (data.signups as DailySignup[]) : [];
  } catch { return []; }
}

// Legt eine Anmeldung an. Gibt `false` zurück, wenn die E-Mail schon eingetragen war
// (doppelte Anmeldungen sollen die Zahlen des Tests nicht verfälschen).
export async function addDailySignup(entry: Omit<DailySignup, "id" | "createdAt">): Promise<boolean> {
  const email = String(entry.email || "").trim().toLowerCase();
  if (!email) return false;
  await ensureBucket();
  const current = await readDailySignups();
  if (current.some(s => s.email === email)) return false;
  const next: DailySignup = {
    ...entry,
    email,
    id: `signup-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const body = JSON.stringify({ signups: [next, ...current].slice(0, 20000), updatedAt: new Date().toISOString() });
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(DAILY_SIGNUP_PATH)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body,
  });
  if (!res.ok) throw new Error("Anmeldung konnte nicht gespeichert werden.");
  return true;
}

// ── Wetter-am-Morgen: Statistik PRO MODEL (Aufrufe + Chats) ─────────────────
// Eigenes Blob (clobber-sicher, NICHT im 500er-Event-Cap). Tages-Zähler + Summen.
export type WetterStats = {
  viewsByDay: Record<string, number>;   // Seitenaufrufe (Besucher, ohne Admin), pro Tag
  chatsByDay: Record<string, number>;   // Chat-Sitzungen, pro Tag
  viewsTotal: number;
  chatsTotal: number;
  updatedAt?: string;
};

function wetterStatsPath(modelId?: string) {
  const id = (modelId ?? "").trim();
  return (!id || id === BELLA_STUDIO_ID)
    ? "try-this-look/wetter-stats.json"
    : `try-this-look/wetter-stats-${id.replace(/[^a-zA-Z0-9-]/g, "")}.json`;
}

const EMPTY_STATS: WetterStats = { viewsByDay: {}, chatsByDay: {}, viewsTotal: 0, chatsTotal: 0 };

export async function readWetterStats(modelId?: string): Promise<WetterStats> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(wetterStatsPath(modelId))}`);
    if (!res.ok) return { ...EMPTY_STATS };
    const d = await res.json().catch(() => null);
    return {
      viewsByDay: (d?.viewsByDay ?? {}) as Record<string, number>,
      chatsByDay: (d?.chatsByDay ?? {}) as Record<string, number>,
      viewsTotal: Number(d?.viewsTotal ?? 0),
      chatsTotal: Number(d?.chatsTotal ?? 0),
    };
  } catch { return { ...EMPTY_STATS }; }
}

// Zählt einen Aufruf ODER eine Chat-Sitzung hoch (read-modify-write, best-effort).
export async function bumpWetterStat(kind: "view" | "chat", modelId?: string): Promise<void> {
  await ensureBucket();
  const s = await readWetterStats(modelId);
  const dayKey = new Date().toISOString().slice(0, 10);
  if (kind === "chat") { s.chatsByDay[dayKey] = (s.chatsByDay[dayKey] ?? 0) + 1; s.chatsTotal += 1; }
  else { s.viewsByDay[dayKey] = (s.viewsByDay[dayKey] ?? 0) + 1; s.viewsTotal += 1; }
  const body = JSON.stringify({ ...s, updatedAt: new Date().toISOString() });
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(wetterStatsPath(modelId))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body,
  }).catch(() => {});
}

// ── Wetter-am-Morgen: Abonnenten PRO MODEL ──────────────────────────────────
// Die Liste, an wen die tägliche Nachricht rausgeht. Vom Admin gepflegt (jetzt manuell,
// später automatisch aus den Anmeldungen). Eigenes Blob PRO MODEL (clobber-sicher),
// gespiegelt an card-studio: Bella = Legacy-Pfad, jedes andere Model = eigenes Blob.
export type WetterSubscriber = {
  id: string;
  name: string;
  email?: string;         // echtes Account: Identität + erreichbar per Mail
  birthdate?: string;     // YYYY-MM-DD — fürs Alter (18+ / Zielgruppe)
  gender?: string;        // "m" | "f" | "x" — Geschlecht
  phone?: string;         // Telefonnummer mit Vorwahl (Lieferkanal WhatsApp) — z. B. +40…
  city?: string;          // für das Wetter „bei dir"
  country?: string;       // Land (frei oder ISO), z. B. „România"
  postal?: string;        // Postleitzahl
  lang?: string;          // "ro" | "de" | "en"
  note?: string;          // frei (z. B. „Freund, Test")
  acceptedTerms?: boolean; // AGB + Datenschutz beim Anmelden akzeptiert
  confirmed?: boolean;    // Double-Opt-in: E-Mail bestätigt? (gegen Spam/Fake)
  confirmToken?: string;  // Einmal-Token im Bestätigungslink
  interests?: string[];   // was er STATT der Tagespost hören will: "clothes" | "topics" | "deals"
  unsubscribed?: boolean; // hat sich selbst abgemeldet → NICHT mehr senden
  unsubscribedAt?: string;
  createdAt: string;
};

function wetterSubsPath(modelId?: string) {
  const id = (modelId ?? "").trim();
  return (!id || id === BELLA_STUDIO_ID)
    ? "try-this-look/wetter-subscribers.json"
    : `try-this-look/wetter-subscribers-${id.replace(/[^a-zA-Z0-9-]/g, "")}.json`;
}

export async function readWetterSubscribers(modelId?: string): Promise<WetterSubscriber[]> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(wetterSubsPath(modelId))}`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.subscribers) ? (data.subscribers as WetterSubscriber[]) : [];
  } catch { return []; }
}

export async function writeWetterSubscribers(subscribers: WetterSubscriber[], modelId?: string): Promise<void> {
  await ensureBucket();
  const body = JSON.stringify({ subscribers: subscribers.slice(0, 20000), updatedAt: new Date().toISOString() });
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(wetterSubsPath(modelId))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body,
  });
  if (!res.ok) throw new Error("Abonnenten konnten nicht gespeichert werden.");
}

// ── Wetter-Klick-Tracking ───────────────────────────────────────────────────
// EIGENER Blob (nicht die Abonnentenliste anfassen → nie clobbern). Map je Abonnent:
// { count, lastAt, src }. „geöffnet" = er hat den Link (E-Mail/WhatsApp) angeklickt.
export type WetterClick = { count: number; lastAt: string; src?: string };
function wetterClicksPath(modelId?: string) {
  const id = (modelId ?? "").trim();
  return (!id || id === BELLA_STUDIO_ID)
    ? "try-this-look/wetter-clicks.json"
    : `try-this-look/wetter-clicks-${id.replace(/[^a-zA-Z0-9-]/g, "")}.json`;
}
export async function readWetterClicks(modelId?: string): Promise<Record<string, WetterClick>> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(wetterClicksPath(modelId))}`);
    if (!res.ok) return {};
    const data = await res.json().catch(() => null);
    return (data && typeof data === "object" && data.clicks && typeof data.clicks === "object") ? data.clicks as Record<string, WetterClick> : {};
  } catch { return {}; }
}
export async function recordWetterClick(subId: string, src: string, modelId?: string): Promise<void> {
  const id = String(subId || "").trim();
  if (!id) return;
  await ensureBucket();
  const clicks = await readWetterClicks(modelId);
  const prev = clicks[id];
  clicks[id] = { count: (prev?.count ?? 0) + 1, lastAt: new Date().toISOString(), src: String(src || prev?.src || "") };
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(wetterClicksPath(modelId))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ clicks, updatedAt: new Date().toISOString() }),
  }).catch(() => {});
}

// ── Wetter-Abo „bezahlt"-Status ─────────────────────────────────────────────
// EIGENER Blob (Abonnentenliste nie anfassen). Map je Abonnent: { since }.
// Wird vom Stripe-Webhook gesetzt, sobald das 24-€-Abo bezahlt ist → schaltet
// Chat + Video wieder frei (nach den 7 Gratis-Öffnungen).
export type WetterPaid = { since: string };
function wetterPaidPath(modelId?: string) {
  const id = (modelId ?? "").trim();
  return (!id || id === BELLA_STUDIO_ID)
    ? "try-this-look/wetter-paid.json"
    : `try-this-look/wetter-paid-${id.replace(/[^a-zA-Z0-9-]/g, "")}.json`;
}
export async function readWetterPaid(modelId?: string): Promise<Record<string, WetterPaid>> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(wetterPaidPath(modelId))}`);
    if (!res.ok) return {};
    const data = await res.json().catch(() => null);
    return (data && typeof data === "object" && data.paid && typeof data.paid === "object") ? data.paid as Record<string, WetterPaid> : {};
  } catch { return {}; }
}
export async function setWetterPaid(subId: string, modelId?: string): Promise<void> {
  const id = String(subId || "").trim();
  if (!id) return;
  await ensureBucket();
  const paid = await readWetterPaid(modelId);
  if (paid[id]) return;   // schon freigeschaltet
  paid[id] = { since: new Date().toISOString() };
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(wetterPaidPath(modelId))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ paid, updatedAt: new Date().toISOString() }),
  }).catch(() => {});
}

// ── Übersetzungs-Cache ──────────────────────────────────────────────────────
// Beitrags-Texte werden EINMAL pro Sprache übersetzt und hier gespeichert, damit
// nicht jeder Seitenaufruf eine (kostenpflichtige) Übersetzung auslöst. Key = "<lang>::<text>".
const TRANSLATE_CACHE_PATH = "try-this-look/translations.json";

export async function readTranslationCache(): Promise<Record<string, string>> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(TRANSLATE_CACHE_PATH)}`);
    if (!res.ok) return {};
    const data = await res.json().catch(() => null);
    return data && typeof data === "object" ? (data as Record<string, string>) : {};
  } catch { return {}; }
}

export async function writeTranslationCache(map: Record<string, string>): Promise<void> {
  try {
    await ensureBucket();
    // Cap: nur die letzten ~5000 Einträge behalten (Blob klein halten).
    const entries = Object.entries(map).slice(-5000);
    const body = JSON.stringify(Object.fromEntries(entries));
    await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(TRANSLATE_CACHE_PATH)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
      body,
    });
  } catch { /* Cache ist best-effort */ }
}

// ── Werbetexte & Bella-Sätze ────────────────────────────────────────────────
// Die Sammlung der Anzeigentexte, der Sätze die Bella im Werbevideo spricht, und der
// Beispiel-Nachrichten. Eigenes Blob (clobber-sicher) — diese Texte sind Arbeitsergebnis
// und dürfen nicht durch parallele state.json-Schreibvorgänge verloren gehen.
const AD_SCRIPT_PATH = "try-this-look/ad-scripts.json";

export type AdScript = {
  id: string;
  kind: "ad" | "spoken" | "message"; // Anzeigentext | Bella spricht | Beispiel-Nachricht
  title: string;
  text: string;
  createdAt: string;
};

// Gibt `null` zurück, wenn noch nie etwas gespeichert wurde (dann sät die API die Vorlagen).
export async function readAdScripts(): Promise<AdScript[] | null> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(AD_SCRIPT_PATH)}`);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.scripts) ? (data.scripts as AdScript[]) : null;
  } catch { return null; }
}

export async function writeAdScripts(scripts: AdScript[]): Promise<void> {
  await ensureBucket();
  const body = JSON.stringify({ scripts: scripts.slice(0, 500), updatedAt: new Date().toISOString() });
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(AD_SCRIPT_PATH)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body,
  });
  if (!res.ok) throw new Error("Werbetexte konnten nicht gespeichert werden.");
}

// ── Bella-Szenen ────────────────────────────────────────────────────────────
// „Was Bella fuer dich macht" — eine Szene = ein Instagram-Beitrag: Bild/Video +
// fertiger Text. Eigenes Blob (clobber-sicher), unabhaengig vom Card Studio.
const BELLA_SCENE_PATH = "try-this-look/bella-scenes.json";

export type BellaScene = {
  id: string;
  order: number;
  title: string;          // interne Bezeichnung der Szene ("Bella weckt dich auf")
  caption: string;        // der fertige Text fuer Instagram
  kind: "image" | "video";
  path: string;           // Speicherpfad des hochgeladenen Mediums ("" = noch keins)
  createdAt: string;
};

// `null` = noch nie gespeichert (dann legt die API die 10 Vorlagen an).
export async function readBellaScenes(): Promise<BellaScene[] | null> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(BELLA_SCENE_PATH)}`);
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.scenes) ? (data.scenes as BellaScene[]) : null;
  } catch { return null; }
}

export async function writeBellaScenes(scenes: BellaScene[]): Promise<void> {
  await ensureBucket();
  const body = JSON.stringify({ scenes: scenes.slice(0, 200), updatedAt: new Date().toISOString() });
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(BELLA_SCENE_PATH)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body,
  });
  if (!res.ok) throw new Error("Szenen konnten nicht gespeichert werden.");
}

async function dataUrlToBytes(dataUrl: string) {
  const [header, base64] = dataUrl.split(",");
  const rawMime = header.match(/data:(.*);base64/)?.[1] ?? "image/png";
  if (!SUPPORTED_IMAGE_TYPES.includes(rawMime)) {
    throw new Error("Unsupported image format. Please upload JPG, PNG, or WebP.");
  }
  const { buffer: bytes, mimeType, extension } = await compressImage(base64, rawMime);
  return { bytes, extension, mimeType };
}

export async function uploadTryThisLookImage(folder: "looks" | "generations" | "uploads", dataUrl: string) {
  await ensureBucket();
  const { bytes, extension, mimeType } = await dataUrlToBytes(dataUrl);
  const path = `try-this-look/${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const response = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(path)}`, {
    method: "POST",
    headers: {
      "Content-Type": mimeType,
      "x-upsert": "false"
    },
    body: new Uint8Array(bytes) as unknown as BodyInit
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? "Image could not be saved.");
  }

  return path;
}

// Upload raw bytes (e.g. a video file) and return the storage path.
export async function uploadTryThisLookBytes(folder: "looks" | "videos" | "uploads", bytes: ArrayBuffer, mimeType: string, extension: string) {
  await ensureBucket();
  const path = `try-this-look/${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const response = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(path)}`, {
    method: "POST",
    headers: { "Content-Type": mimeType || "application/octet-stream", "x-upsert": "false" },
    body: new Uint8Array(bytes) as unknown as BodyInit,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? "File could not be saved.");
  }
  return path;
}

export async function deleteTryThisLookImage(path: string) {
  if (!path.startsWith("try-this-look/")) return;
  await ensureBucket();

  const response = await supabaseFetch(`/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prefixes: [path]
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? "Image could not be deleted.");
  }
}

export async function saveTryThisLookState(state: TryThisLookState, opts: SaveOptions = {}) {
  await writeTryThisLookState(state, opts);
  return readTryThisLookState();
}

// ── Outfits: stored in their OWN blob so no other action (views, try-ons, etc.) can
// ever overwrite/drop them. Only the outfit admin actions touch this file. ──────────
const OUTFITS_PATH = "try-this-look/outfits.json";
export type OutfitsBlob = { outfits: TryThisLookOutfit[]; funnelVideoPrompt?: string };

export async function readOutfits(): Promise<OutfitsBlob> {
  await ensureBucket();
  let blob: OutfitsBlob = { outfits: [] };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(OUTFITS_PATH)}`);
      if (res.status === 404) break;               // no file yet → empty
      if (res.ok) { const text = await res.text(); if (text.trim()) { blob = JSON.parse(text) as OutfitsBlob; } break; }
    } catch { /* retry */ }
    if (attempt < 2) await new Promise(r => setTimeout(r, 150));
  }
  const outfits = blob.outfits ?? [];
  const paths = outfits.map(o => o.imagePath ?? extractPathFromUrl(o.imageUrl)).filter(Boolean) as string[];
  const signed = await batchGetSignedUrls(paths);
  return {
    outfits: outfits.map(o => ({ ...o, imageUrl: (o.imagePath && signed.get(o.imagePath)) || o.imageUrl || "" })),
    funnelVideoPrompt: blob.funnelVideoPrompt,
  };
}

export async function writeOutfits(outfits: TryThisLookOutfit[], funnelVideoPrompt?: string): Promise<OutfitsBlob> {
  await ensureBucket();
  const stripped = outfits.map(({ imageUrl, ...o }) => o); // store paths, not signed URLs
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(OUTFITS_PATH)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ outfits: stripped, funnelVideoPrompt }),
  });
  if (!res.ok) {
    const p = await res.json().catch(() => null);
    throw new Error(p?.message ?? "Outfits could not be saved.");
  }
  return readOutfits();
}

export function getActiveTryThisLook(state: TryThisLookState) {
  const activeLookId = state.activeLookIds?.[0] ?? state.activeLookId;
  return state.looks.find((look) => look.id === activeLookId) ?? state.looks[0] ?? DEFAULT_LOOK;
}

export function getActiveTryThisLooks(state: TryThisLookState) {
  const activeLookIds = state.activeLookIds?.length ? state.activeLookIds : [state.activeLookId];
  const activeIds = new Set(activeLookIds);
  const activeLooks = state.looks.filter((look) => activeIds.has(look.id));
  return activeLooks.length ? activeLooks : [getActiveTryThisLook(state)];
}

// ── Paid video-generation credits (the $8 → 4-videos pack) ────────────────────
// Keyed by the buyer's email; stored in the Supabase state blob (reliable on Vercel,
// unlike the local credits-store.json).

export async function getVideoCredits(email: string): Promise<number> {
  const e = email.trim().toLowerCase();
  if (!e) return 0;
  const state = await readTryThisLookState();
  return Math.max(0, Number(state.videoCredits?.balances?.[e] ?? 0));
}

// How many free video credits a brand-new user gets. Override via env.
export const WELCOME_VIDEO_CREDITS = Number(process.env.WELCOME_VIDEO_CREDITS ?? 1);

// Grant the free welcome credits the FIRST time we see an email; returns the balance.
// Idempotent via the `welcomed` list so it's given exactly once per user.
export async function ensureWelcomeCredits(email: string): Promise<number> {
  const e = email.trim().toLowerCase();
  if (!e) return 0;
  const state = await readTryThisLookState();
  const vc = state.videoCredits ?? { balances: {}, redeemed: [], welcomed: [] };
  vc.balances = vc.balances ?? {}; vc.redeemed = vc.redeemed ?? []; vc.welcomed = vc.welcomed ?? [];
  if (vc.welcomed.includes(e)) return Math.max(0, Number(vc.balances[e] ?? 0));
  vc.balances[e] = Math.max(0, Number(vc.balances[e] ?? 0)) + WELCOME_VIDEO_CREDITS;
  vc.welcomed.push(e);
  state.videoCredits = vc;
  await saveTryThisLookState(state);
  return vc.balances[e];
}

// Idempotent grant: adds `n` credits for a paid Stripe session, once per sessionId.
export async function grantVideoCredits(email: string, sessionId: string, n: number): Promise<{ credits: number; granted: boolean }> {
  const e = email.trim().toLowerCase();
  const state = await readTryThisLookState();
  const vc = state.videoCredits ?? { balances: {}, redeemed: [] };
  vc.balances = vc.balances ?? {};
  vc.redeemed = vc.redeemed ?? [];
  if (sessionId && vc.redeemed.includes(sessionId)) {
    return { credits: Math.max(0, Number(vc.balances[e] ?? 0)), granted: false };
  }
  vc.balances[e] = Math.max(0, Number(vc.balances[e] ?? 0)) + n;
  if (sessionId) vc.redeemed.push(sessionId);
  state.videoCredits = vc;
  await saveTryThisLookState(state);
  return { credits: vc.balances[e], granted: true };
}

// Admin: set a user's video-credit balance to an absolute value (0 = reset). Unlike
// grantVideoCredits (which only adds), this overwrites — used for admin cleanup.
export async function setVideoCreditsBalance(email: string, n: number): Promise<number> {
  const e = email.trim().toLowerCase();
  if (!e) return 0;
  const state = await readTryThisLookState();
  const vc = state.videoCredits ?? { balances: {}, redeemed: [] };
  vc.balances = vc.balances ?? {};
  vc.balances[e] = Math.max(0, Math.floor(n));
  state.videoCredits = vc;
  await saveTryThisLookState(state);
  return vc.balances[e];
}

// Wie viele Videos ein Abonnent pro Kalendermonat generieren darf — 25, ueber ALLE Themen
// zusammen (Owner 27.07.2026). Das Abo verkauft Videos; der Chat ist gratis.
// 5 statt 25 (Owner 29.07.2026, in zwei Schritten). Grund steht bewusst NUR hier, nicht auf
// der Seite: ein Trichter-Video kostet rund 1 €. Bei 24,50 € Umsatz waren 25 Videos ein
// Verlustgeschäft (30 € Kosten gegen 24,50 €). 10 waren nur 2,4x Aufschlag — der Owner
// wollte mehr: 5 Videos sind 4,8x, bei 1 € Kosten je Video.
// Per Env übersteuerbar — steht `SUBSCRIPTION_MONTHLY_CREDITS` auf Vercel, gewinnt die Env.
export const SUBSCRIPTION_MONTHLY_CREDITS = Number(process.env.SUBSCRIPTION_MONTHLY_CREDITS ?? 5);

// Serialize monthly-credit grants within this process. The subMonths key makes the grant
// idempotent, but the read-modify-write on the shared JSON blob is NOT atomic — a return to
// the app fires several /api/premium calls at once (PremiumSync + feed), which raced past the
// idempotency check and granted +40 twice (e.g. balance 83 instead of 43). Chaining the grants
// makes the second call see the just-saved subMonths key and skip. (Cross-instance races are
// still possible but rare; this covers the common same-instance burst.)
let creditGrantChain: Promise<unknown> = Promise.resolve();

// Grant the monthly subscriber allowance ONCE per calendar month (idempotent via subMonths,
// keyed "email|YYYY-MM"). Call it whenever we confirm an active subscription. Returns balance.
export async function grantMonthlySubscriptionCredits(email: string, n = SUBSCRIPTION_MONTHLY_CREDITS): Promise<number> {
  const run = creditGrantChain.then(() => grantMonthlySubscriptionCreditsInner(email, n));
  creditGrantChain = run.catch(() => {}); // keep the chain alive even if one grant throws
  return run;
}

async function grantMonthlySubscriptionCreditsInner(email: string, n: number): Promise<number> {
  const e = email.trim().toLowerCase();
  if (!e) return 0;
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const key = `${e}|${month}`;
  const state = await readTryThisLookState();
  const vc = state.videoCredits ?? { balances: {}, redeemed: [] };
  vc.balances = vc.balances ?? {}; vc.subMonths = vc.subMonths ?? [];
  if (vc.subMonths.includes(key)) return Math.max(0, Number(vc.balances[e] ?? 0)); // already granted this month
  vc.balances[e] = Math.max(0, Number(vc.balances[e] ?? 0)) + n;
  vc.subMonths.push(key);
  state.videoCredits = vc;
  await saveTryThisLookState(state);
  return vc.balances[e];
}

// Anti-abuse cap: how many FREE (uncharged, non-staff) video generations a single
// device/IP may trigger per calendar day. Guests normally never generate (GO plays a
// pre-generated video), so this only ever bites direct-API abuse. Override via env.
export const FREE_VIDEO_GEN_PER_DAY = Number(process.env.FREE_VIDEO_GEN_PER_DAY ?? 1);

// Increment today's generation counter for `key` (an IP or device id) and report whether
// it stayed within `limit`. Piggybacks on the persisted videoCredits blob (no new top-level
// state field → dodges the whitelist gotcha). Old days are pruned so the map stays tiny.
// Read-modify-write on the shared JSON isn't atomic, so a burst may undercount by a few —
// acceptable for an anti-abuse guard.
export async function bumpDailyGenLimit(
  key: string,
  limit = FREE_VIDEO_GEN_PER_DAY,
): Promise<{ ok: boolean; count: number; limit: number }> {
  const k = (key || "anon").slice(0, 120);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const state = await readTryThisLookState();
  const vc = state.videoCredits ?? { balances: {}, redeemed: [] };
  vc.genLog = vc.genLog ?? {};
  for (const kk of Object.keys(vc.genLog)) { if (!kk.endsWith(`|${today}`)) delete vc.genLog[kk]; } // prune stale days
  const mapKey = `${k}|${today}`;
  const count = Math.max(0, Number(vc.genLog[mapKey] ?? 0));
  if (count >= limit) return { ok: false, count, limit };
  vc.genLog[mapKey] = count + 1;
  state.videoCredits = vc;
  await saveTryThisLookState(state);
  return { ok: true, count: count + 1, limit };
}

// Spend one credit for a generation. Returns the new balance, or null if none left.
export async function spendVideoCredit(email: string): Promise<number | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  const state = await readTryThisLookState();
  const vc = state.videoCredits ?? { balances: {}, redeemed: [] };
  const cur = Math.max(0, Number(vc.balances?.[e] ?? 0));
  if (cur <= 0) return null;
  vc.balances = vc.balances ?? {};
  vc.redeemed = vc.redeemed ?? [];
  vc.balances[e] = cur - 1;
  state.videoCredits = vc;
  await saveTryThisLookState(state);
  return vc.balances[e];
}
