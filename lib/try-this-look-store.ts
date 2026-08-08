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
  // 2,99 statt 3,99 (Owner 31.07.2026: „und auch wo 3,99 steht auch 2,99").
  // ACHTUNG: Das hier ist nur der VORGABEWERT. Der geltende Preis steht in Supabase
  // und wird im Admin unter „Generate a video / try-on" gesetzt — der schlaegt diesen.
  videoGenCents: 299,              // $2.99 per generated video / try-on
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
  chatPassCents: 299,              // $2.99 paid chat pass (mitgezogen, siehe videoGenCents)
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
  /**
   * DIE GESTALT DER THEMEN-KACHELN — „reihe" (Briefmarke links, Text rechts) oder „voll"
   * (Karte über die ganze Breite, mit Ranken und Video).
   *
   * Sie stand vorher NUR im localStorage, und daran ist sie gescheitert (Owner 06.08.2026:
   * „ich habe in der Biblio auf volle Breite geschaltet aber online ist es nicht auf live
   * aktiv"): Der Browser-Speicher gehört EINEM Browser auf EINER Adresse — die Wahl reiste
   * weder von localhost zur echten Seite noch vom Owner zu irgendeinem Besucher.
   *
   * Hier gilt sie für alle, und ein Wechsel braucht keine Auslieferung. Fehlt der Eintrag,
   * gilt die Vorgabe im Code (`voll`). Der Umschalter auf `/ci` bleibt daneben bestehen —
   * ohne Admin-Kennung ändert er weiterhin nur die eigene Ansicht zum Vergleichen.
   */
  themenGestalt?: "reihe" | "voll";
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
  /**
   * DAS EURO-GUTHABEN (Owner 01.08.2026, Variante B: Aufladung 9,99 als Zusatzangebot neben
   * dem Einzelkauf). In CENT und je E-MAIL — nicht in Video-Stück, damit es jeden Preistest
   * übersteht: Heute kostet ein Video 149 Cent, morgen vielleicht wieder 299; das Guthaben
   * bleibt einfach Geld. VERFÄLLT NIE (Owner-Entscheidung, die rechtlich sicherste Form),
   * keine Barauszahlung. Idempotenz läuft über videoCredits.redeemed — dieselbe Liste wie
   * bei allen Kassenvorgängen, damit es nur EINE gibt.
   */
  guthabenCents?: Record<string, number>;
  /**
   * CHAT-ZUGANG BIS WANN — je E-Mail ein ISO-Datum (Owner 03.08.2026: „er kauft ein Model, ein
   * Chat"; Preise aus CHAT_STUFEN).
   *
   * AN DER ADRESSE, NICHT AM GERAET. Vorher stand nach der Zahlung nur `lb_chat_abo` im
   * Browser — der galt ewig, war auf jedem zweiten Geraet weg und mit einer Zeile in der
   * Konsole gefaelscht. Geld haengt an einer E-Mail (siehe guthabenCents daneben).
   *
   * `redeemedZugang` ist die Idempotenz: dieselbe Stripe-Sitzung darf die Laufzeit nicht
   * zweimal verlaengern, wenn der Browser die Statusabfrage wiederholt.
   */
  chatZugang?: Record<string, string>;
  redeemedZugang?: string[];
  /**
   * WANN WIR VOR DEM ABLAUF GEWARNT HABEN — je E-Mail ein ISO-Datum.
   *
   * Der Aufraeumer laeuft TAEGLICH. Ohne diesen Vermerk bekaeme jeder, dessen Monat in sieben
   * Tagen endet, sieben Mails — und der Kunde, den man halten will, ist der erste, der sich
   * abmeldet. Der Vermerk wird beim naechsten Kauf geloescht, damit der uebernaechste Ablauf
   * wieder gemeldet werden kann.
   */
  chatZugangWarn?: Record<string, string>;
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
    /* Die Gestalt der Themen-Kacheln. MUSS an BEIDEN Merge-Stellen stehen — ein neues
       Feld, das hier fehlt, wird beim Speichern still weggeworfen (Memory
       `delete-resurrection-merge-bug`), und der Schalter schaltet dann scheinbar nichts. */
    themenGestalt: state.themenGestalt === "reihe" || state.themenGestalt === "voll" ? state.themenGestalt : undefined,
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
    // Auch HIER noetig (zweite Haelfte des 01.08.-Fundes): Das Normalisieren baut den
    // Zustand Feld fuer Feld neu — was fehlt, ist nach jedem READ weg, noch vor dem Merge.
    guthabenCents: state.guthabenCents ?? {},
    chatZugang: state.chatZugang ?? {},
    chatZugangWarn: state.chatZugangWarn ?? {},
    redeemedZugang: state.redeemedZugang ?? [],
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
      /**
       * EURO-GUTHABEN — MUSS hier stehen (gefunden am 01.08.2026 im Selbsttest, BEVOR es
       * Geld kostete): Der Save merged Feld für Feld; ein Feld, das hier fehlt, wird beim
       * nächsten Speichern verworfen. Genau so verschwand das frisch aufgeladene Guthaben
       * (aufladen 999 → Endstand 0). Unsere Version gewinnt je E-Mail (read→modify→save),
       * fremde Mails aus `latest` bleiben erhalten — dasselbe Muster wie `balances`.
       */
      guthabenCents: { ...(latest.guthabenCents ?? {}), ...(state.guthabenCents ?? {}) },
      // Gleiches Muster: je E-Mail gewinnt unsere Fassung, fremde Adressen aus `latest` bleiben.
      chatZugang: { ...(latest.chatZugang ?? {}), ...(state.chatZugang ?? {}) },
      chatZugangWarn: { ...(latest.chatZugangWarn ?? {}), ...(state.chatZugangWarn ?? {}) },
      redeemedZugang: Array.from(new Set([...(latest.redeemedZugang ?? []), ...(state.redeemedZugang ?? [])])),
      videoCredits: {
        balances: { ...(latest.videoCredits?.balances ?? {}), ...(state.videoCredits?.balances ?? {}) },
        redeemed: Array.from(new Set([...(latest.videoCredits?.redeemed ?? []), ...(state.videoCredits?.redeemed ?? [])])).slice(-5000),
        welcomed: Array.from(new Set([...(latest.videoCredits?.welcomed ?? []), ...(state.videoCredits?.welcomed ?? [])])).slice(-20000),
        subMonths: Array.from(new Set([...(latest.videoCredits?.subMonths ?? []), ...(state.videoCredits?.subMonths ?? [])])).slice(-20000),
        /**
         * DER TAGESZAEHLER FEHLTE HIER — UND DAMIT GAB ES KEINE GRENZE (Owner 03.08.2026:
         * „er hat 3 Videos generiert. Ich habe das nicht generiert").
         *
         * `bumpDailyGenLimit` schrieb brav nach `videoCredits.genLog` — aber dieser Merge
         * baute `videoCredits` neu zusammen, OHNE `genLog`, und der Schlank-Serialisierer
         * weiter unten ebenso. Der Zaehler wurde also bei JEDEM Speichervorgang
         * weggeworfen; beim naechsten Aufruf stand wieder 0 da. „1 Gratis-Video pro Tag"
         * hat nie gegriffen, und jeder Gast konnte beliebig viele Pixverse-Laeufe ausloesen.
         * Das ist kein Schoenheitsfehler, das ist die Rechnung.
         *
         * DER HOEHERE WERT GEWINNT, nicht der zuletzt geschriebene: Bei einem Ausgabenschutz
         * darf ein gleichzeitiger, aelterer Speichervorgang den Stand niemals SENKEN. Und es
         * bleibt nur der heutige Tag stehen — sonst holt der Merge die alten Tage zurueck,
         * die `bumpDailyGenLimit` gerade ausgeraeumt hat, und die Karte waechst ewig.
         */
        genLog: (() => {
          const heute = new Date().toISOString().slice(0, 10);
          const zusammen: Record<string, number> = {};
          for (const quelle of [latest.videoCredits?.genLog ?? {}, state.videoCredits?.genLog ?? {}]) {
            for (const [k, v] of Object.entries(quelle)) {
              if (!k.endsWith(`|${heute}`)) continue;
              zusammen[k] = Math.max(Number(zusammen[k] ?? 0), Number(v ?? 0));
            }
          }
          return zusammen;
        })(),
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
      subMonths: (state.videoCredits?.subMonths ?? []).slice(-20000),
      // DIE ZWEITE STELLE, an der der Tageszaehler verlorenging (Owner 03.08.2026). Dieser
      // Serialisierer entscheidet, was WIRKLICH in der Datei landet — was hier fehlt, ist
      // weg, auch wenn der Merge oben es richtig gemacht hat. Beide Stellen muessen `genLog`
      // fuehren, sonst ist die Gratis-Grenze wieder wirkungslos.
      genLog: state.videoCredits?.genLog ?? {},
    },
    /**
     * DRITTER UND ENTSCHEIDENDER ORT (01.08.2026): Dieser Schlank-Serialisierer schreibt
     * das JSON, das wirklich im Speicher landet — Feld fuer Feld. read-Normalisierung und
     * save-Merge hatten das Guthaben schon, hier fiel es trotzdem weg: aufladen meldete
     * 999, die Datei enthielt nichts. Lehre: Ein neues Zustandsfeld hat DREI Pflichtorte —
     * readTryThisLookState, der Konflikt-Merge und dieser Serialisierer. Fehlt einer,
     * verliert man Geldbetraege lautlos.
     * (`subMonths` oben war hier ebenfalls nie aufgefuehrt und verschwand bei jedem Save —
     * die Monats-Gutschrift blieb nur idempotent, weil der Webhook sie neu setzte.)
     */
    guthabenCents: state.guthabenCents ?? {},
    chatZugang: state.chatZugang ?? {},
    chatZugangWarn: state.chatZugangWarn ?? {},
    redeemedZugang: (state.redeemedZugang ?? []).slice(-5000),
    partnerStores: (state.partnerStores ?? []).slice(0, 200),
    brands: (state.brands ?? []).slice(0, 5000),
    styles: (state.styles ?? []).slice(0, 5000),
    colors: (state.colors ?? []).slice(0, 5000),
    fabrics: (state.fabrics ?? []).slice(0, 5000),
    occasions: (state.occasions ?? []).slice(0, 5000),
    tryonPaused: state.tryonPaused === true,
    chatNotifyPaused: state.chatNotifyPaused === true,
    /* Die Gestalt der Themen-Kacheln. MUSS an BEIDEN Merge-Stellen stehen — ein neues
       Feld, das hier fehlt, wird beim Speichern still weggeworfen (Memory
       `delete-resurrection-merge-bug`), und der Schalter schaltet dann scheinbar nichts. */
    themenGestalt: state.themenGestalt === "reihe" || state.themenGestalt === "voll" ? state.themenGestalt : undefined,
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
/**
 * `modelsSavedAt` = wann der Admin die Model-Auswahl zuletzt gespeichert hat.
 *
 * Owner 30.07.2026: „ich habe ein neues Model hinzugefügt und ist nicht im Karussell drin."
 * Die Auswahl ist eine feste Liste von Kennungen — ein Model, das es beim Anhaken noch gar
 * nicht gab, kann darin nicht stehen und blieb deshalb unsichtbar. Mit diesem Zeitpunkt
 * unterscheidet der Trichter zwei Fälle, die vorher gleich aussahen: NEU (nach der letzten
 * Auswahl angelegt → kommt automatisch dazu) und BEWUSST DRAUSSEN (existierte damals schon
 * und wurde nicht angehakt → bleibt draussen).
 */
export type KissConfig = { modelIds: string[]; modelsSavedAt?: string; teaserPath?: string;
  /**
   * STANDBILD ZUM TEASER-VIDEO — fürs Postfach (Owner 31.07.2026: „wir müssen einen
   * Video-Poster schicken"). Ein Postfach spielt kein Video ab; es zeigt ein Bild, und das
   * Bild verlinkt dorthin, wo sich das Video bewegt.
   * Erzeugt von `scripts/kiss-teaser-poster.mjs` — der Frame kommt aus ffmpeg, das es lokal
   * gibt, auf Vercel aber nicht. Deshalb einmal ablegen statt bei jedem Versand rechnen.
   */
  teaserPosterPath?: string;
  examplePaths?: string[]; previewRefPaths?: string[]; manRefPath?: string };

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
      modelsSavedAt: String(data?.modelsSavedAt ?? "").trim() || undefined,
      teaserPath: String(data?.teaserPath ?? "").trim() || undefined,
      teaserPosterPath: String(data?.teaserPosterPath ?? "").trim() || undefined,
      // MEHRERE Referenzfotos (Owner 29.07.2026: „ich will mehrere hochladen"). Ein früher
      // gespeichertes Einzelfoto (`previewRefPath`) wird beim Lesen in die Liste überführt,
      // damit nichts verloren geht.
      previewRefPaths: Array.isArray(data?.previewRefPaths)
        ? data.previewRefPaths.map(String).filter(Boolean)
        : (String(data?.previewRefPath ?? "").trim() ? [String(data.previewRefPath).trim()] : undefined),
      // Sein Foto — im Prüfstand die zweite Referenz, damit man das Ergebnis vorher sieht.
      manRefPath: String(data?.manRefPath ?? "").trim() || undefined,
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
      manRefPath: config.manRefPath || undefined,
      examplePaths: (config.examplePaths ?? []).slice(0, 20),
      savedAt: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Theme-Config „${theme}" konnte nicht gespeichert werden (${response.status}).`);
}

export const writeKissConfig = (config: KissConfig) => writeThemeConfig(config, "kiss");

// ── Grußkarten-Prüfstand: EIGENE Datei, nicht state.json ────────────────────────────
// Bewusst getrennt vom großen Shared-State: der Prüfstand schreibt Einwilligungen und
// Generierungen, und ein Read-Merge-Unfall im Hauptzustand (siehe Lösch-Wiederauferstehung
// bei Generationen/Leads) darf hier gar nicht erst möglich werden.
export type GrussTemplate = {
  id: string;
  videoPath: string;       // vorproduzierter Karten-Clip in unserem Storage
  label: string;           // z. B. „Paris — Geburtstag"
  script: string;          // FESTES Skript, das der Nutzer beim Aufnehmen abliest
  createdAt: string;
};
export type GrussConsent = {
  id: string;              // = generationId, damit Einwilligung ↔ Video zuordenbar bleibt
  at: string;              // ISO-Zeitstempel der aktiven Bestätigung
  text: string;            // der bestätigte Wortlaut, so wie er angezeigt wurde
  templateId: string;
  facePath: string;
  audioPath: string;
  userAgent?: string;
  ip?: string;
};
export type GrussGeneration = {
  id: string;
  at: string;
  templateId: string;
  facePath: string;
  audioPath: string;
  status: "running" | "done" | "failed";
  // fal-Request-IDs werden VOR dem Warten gespeichert: stirbt die Funktion beim Polling,
  // kann „resume" das bezahlte Ergebnis später abholen, ohne neu zu generieren.
  swapRequestId?: string;
  swapVideoUrl?: string;   // fal-URL des getauschten Zwischenvideos (läuft ab — nur für resume)
  lipsyncRequestId?: string;
  videoPath?: string;      // fertiges Video in unserem Storage
  error?: string;
  finishedAt?: string;
};
export type GrussState = {
  templates: GrussTemplate[];
  consents: GrussConsent[];
  generations: GrussGeneration[];
};
const GRUSS_STATE_PATH = "try-this-look/gruss-test.json";

export async function readGrussState(): Promise<GrussState> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(GRUSS_STATE_PATH)}`);
    if (!res.ok) return { templates: [], consents: [], generations: [] };
    const data = await res.json().catch(() => null);
    return {
      templates: Array.isArray(data?.templates) ? data.templates : [],
      consents: Array.isArray(data?.consents) ? data.consents : [],
      generations: Array.isArray(data?.generations) ? data.generations : [],
    };
  } catch {
    return { templates: [], consents: [], generations: [] };
  }
}

export async function writeGrussState(state: GrussState): Promise<void> {
  await ensureBucket();
  const response = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(GRUSS_STATE_PATH)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ ...state, savedAt: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Grußkarten-Zustand konnte nicht gespeichert werden (${response.status}).`);
}

// ── Kiss-Log: jede fertige Kiss-Generierung (fürs Admin-Tool: wer/wann/Model/bezahlt) ──
// ── GRATIS-VORSCHAUBILD: Tagesdeckel ────────────────────────────────────────────────
// Ein verschenktes Bild kostet echtes Geld. Ohne Bremse dreht ein einziger Besucher — oder
// ein Skript — die Rechnung hoch. Deshalb wird SERVERSEITIG gezählt; ein Zähler im Browser
// wäre in zehn Sekunden umgangen. Zwei Deckel: pro Gerät und als Notbremse für alle zusammen.
const FREE_PREVIEW_PATH = "try-this-look/free-preview-counter.json";
// EIN Versuch, nicht zwei (Owner 30.07.2026: „gratis bekommt er surprise aber 1x kann er
// generieren"). Wer zweimal darf, probiert herum; wer einmal darf, entscheidet danach.
// DREI Versuche statt einem (Owner 30.07.2026: „wir müssen 3 Versuche lassen … ich will es
// testen erst mal, es kostet nicht viel. Wir können das immer noch stoppen wenn zu viele").
// Verstellbar ohne Codeänderung über FREE_PREVIEW_PER_DEVICE; der Tagesdeckel bleibt daneben
// stehen und schützt die Rechnung.
export const FREE_PREVIEW_PER_DEVICE = Number(process.env.FREE_PREVIEW_PER_DEVICE ?? 3);
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
  // WER war das (Owner 29.07.2026: „ich muss auch die emails sehen").
  //
  // Der Kiss-Trichter fragt bewusst NICHTS ab — man lädt ein Foto hoch und legt los. Eine
  // E-Mail gibt es deshalb nur, wenn der Besucher angemeldet ist (`email`) oder bezahlt hat
  // (dann liefert Stripe sie, `paidEmail`). Für alle anderen bleibt die Gerätekennung: sie
  // sagt zwar keinen Namen, verbindet aber mehrere Versuche derselben Person und passt zu
  // den Zahlen im Trichter.
  imagePath?: string;     // das erzeugte Bild
  personPath?: string;    // sein hochgeladenes Foto (Owner-Entscheidung 30.07.2026)
  modelPath?: string;     // die von IHM hochgeladene Frau ("Your model")
  email?: string;         // angemeldeter Nutzer beim Erzeugen
  paidEmail?: string;     // von Stripe beim Kauf
  device?: string;        // anonyme Gerätekennung (lb_visitor)
  /**
   * DAS URTEIL DER ALTERS- UND NACKTHEITSPRÜFUNG (Owner 31.07.2026: „du machst mir aber in
   * der Galerie ein Warnzeichen drauf").
   *
   * Steht nur da, wenn etwas AUFFIEL. Im Beobachten-Modus geht der Eintrag trotzdem durch —
   * genau dafür ist das Feld: Ohne es liesse man alles durch und wüsste hinterher nicht,
   * was die Prüfung erkannt hat. Werte: minderjaehrig · nacktheit · kind-nackt · unklar.
   */
  altersWarnung?: string;
  altersGeschaetzt?: number;   // geschätztes Alter der jüngsten Person, 0 = unbekannt
  /**
   * ÖFFENTLICH GETEILT (Owner 01.08.2026: „in dem Moment wo er shart muss er wissen dass es
   * public wird"). Erst wenn der Besitzer das im Teilen-Dialog bestätigt hat, zeigt die
   * Werk-Seite /w/[id] sein ERGEBNIS — nie die hochgeladenen Vorlagen. Ohne diesen Stempel
   * ist die Seite für jeden Eintrag privat, auch wenn jemand die Kennung rät.
   */
  sharedAt?: string;
  /**
   * AUS WELCHEM THEMA (Owner 31.07.2026: „was suchen die von kiss bei idol?").
   *
   * Ein Log für alle Themen war richtig, solange nur der Kuss-Trichter schrieb. Inzwischen
   * bedient dieselbe Maschine Kiss, Idol und Hochzeit — ohne dieses Feld zeigt jede
   * Themenseite die Besucher aller anderen mit. Alte Einträge ohne Angabe gelten als „kiss":
   * dort kamen sie her.
   */
  theme?: string;
  /**
   * AN WEN GEHT DER GRUSS (Owner 03.08.2026: „schreib auch den Namen an wem du es senden
   * willst … dann erscheint in den Texten Anna, I love you").
   *
   * Er reist mit dem Eintrag, weil die Karte erst beim EMPFAENGER ihre Wirkung hat: Ohne ihn
   * stuende auf der geteilten Seite wieder „I love you" statt „Anna, I love you" — die
   * Personalisierung waere genau dort weg, wo sie gemeint ist.
   */
  empfaenger?: string;
  /** Stimmwahl des Geburtstags — „frau" (Joy) oder „mann" (Daniel), siehe /api/geburtstag-video. */
  stimme?: "frau" | "mann";
  /** Der gewaehlte Geburtstags-Look (`lib/geburtstag-looks.ts`). Fehlt er, nimmt die
   *  Route den abgenommenen — ein Auftrag von vor der Wahl bleibt damit gueltig. */
  look?: string;
  /**
   * WANN DIE ABLAUF-MAIL RAUS IST (Owner 03.08.2026: „90 Tage").
   *
   * Ein bezahltes Geschenk bleibt 90 Tage online, dann laeuft der Link ab. Sieben Tage vorher
   * geht eine Mail raus — und `/api/aufraeumen` loescht NUR, was diesen Stempel traegt. Ohne
   * ihn bekaeme der Kunde die Warnung siebenmal (der Cron laeuft taeglich, das Fenster ist
   * sieben Tage breit), und schlimmer: Der erste scharfe Lauf haette alles genommen, was
   * aelter als 90 Tage ist, bevor je eine Mail draussen war.
   */
  geschenkWarnAt?: string;
  /**
   * Dieser Eintrag wurde aus einer ZAHLUNG wiederhergestellt, nicht aus einem Upload — sein
   * Auftrag war verlorengegangen, das Geld nicht. Er traegt deshalb keine Fotos; geliefert
   * wird er vom Browser des Kunden, der sie noch hat. Das Merkmal steht hier, damit man solche
   * Faelle spaeter zaehlen kann statt sie zu suchen.
   */
  wiederhergestellt?: boolean;

  /**
   * DER BEZAHLTE AUFTRAG — damit ihn der SERVER zu Ende bringen kann (Owner 30.07.2026:
   * „nach dem ich bezahlt habe ist nichts passiert, der Kunde wurde ausgeraubt").
   *
   * Bis hierher lief das Rendern allein im Browser des Kunden: Fenster zu, Handy gesperrt,
   * Netz weg — und das bezahlte Video war für immer verloren, ohne dass irgendwo stand, dass
   * jemand darauf wartet. Diese Felder sind genau dieser Vermerk. `/api/kiss-deliver` liest
   * sie, startet oder pollt den Auftrag und schickt das Video per Mail.
   */
  videoDueAt?: string;    // ab wann der Server selbst übernimmt (Schonfrist für den Browser)
  videoId?: string;       // laufender Auftrag beim Anbieter ("pv:123")
  videoTries?: number;    // wie oft der Server es schon versucht hat (Deckel gegen Dauerlauf)
  videoError?: string;    // letzter Fehler, damit der Admin es sieht
  videoMailedAt?: string; // wann das fertige Video verschickt wurde (nie zweimal)
  videoAlertAt?: string;  // wann wir aufgegeben und den Käufer benachrichtigt haben
  /**
   * WELCHER AUFTRAG SCHON GELIEFERT IST. Wichtig fürs Abo (Owner 30.07.2026: „funktioniert das
   * ganze mit abo genauso?"): Ein Abonnent macht mehrere Videos hintereinander, im selben
   * Eintrag. Ohne diese Marke wäre „hat schon ein Video" gleichbedeutend mit „fertig" — das
   * zweite Video hinge dann wieder allein an seinem Browser. Offen ist ein Auftrag genau
   * dann, wenn `videoId` nicht `videoDoneId` ist.
   */
  videoDoneId?: string;
  /** Wann der LETZTE Video-Start angestossen wurde — vom SERVER gestempelt (08.08.2026).
   *  Daraus liest die Galerie ihr „Video entsteht"; ohne Stempel weiss beim Neu-Rendern
   *  niemand, dass gerade gearbeitet wird (das alte Video steht ja noch im Auftrag). */
  videoStartAt?: string;
  /**
   * WIE VIELE VIDEOS DIESER BEZAHLTE AUFTRAG SCHON GEZOGEN HAT (Owner 30.07.2026).
   *
   * Nur als Deckel, nicht als Abrechnung: Die Video-Route lässt einen bezahlten Kunden am
   * Tagesdeckel für Gäste vorbei — ohne eine Grenze wäre das ein offener Hahn. Gezählt wird
   * je Kalendermonat, gedeckelt auf die Zahl, die auf der Seite versprochen ist.
   */
  videoCount?: number;
  videoMonth?: string;    // YYYY-MM, zu dem der Zähler gehört
  /**
   * WAS er gekauft hat — und damit, was ihm zusteht (Owner 30.07.2026).
   *   "once" = ein einzelnes Video für 9,99 € → genau EIN geliefertes Video
   *   "abo"  = das Monatsabo → die enthaltenen Videos, gezählt an seiner E-Mail
   * Ohne Angabe (Altfälle) gilt der schonendere Weg: wie Abo.
   */
  paidKind?: "once" | "abo";
};

/**
 * DIE HOCHZEITSEINLADUNG (Owner 31.07.2026: „ich will dass die Leute das auch als Einladung
 * für die Hochzeit schicken das Video an die Freunde").
 *
 * Eine eigene Liste, nicht ein Feld am Kiss-Log: Eine Einladung hat einen anderen Lebenslauf
 * als eine Generierung — sie wird geteilt, geöffnet, gezählt und irgendwann widerrufen. Und
 * sie ist das Einzige im Portal, das ÖFFENTLICH abrufbar ist; das gehört sauber getrennt von
 * den Daten, die nur der Admin sehen darf.
 *
 * Die Kennung ist der ganze Schutz: lang und zufällig, nirgends verzeichnet, `noindex`.
 */
const EINLADUNGEN_PATH = "try-this-look/einladungen.json";
export type Einladung = {
  id: string;             // steht in der Adresse
  createdAt: string;
  genId?: string;         // zu welcher Generierung sie gehört
  videoUrl?: string;      // das fertige Video (langlebig signiert)
  /**
   * PROBEWOCHE (Owner 31.07.2026: „lass doch die Seite bauen für gratis für die Leute, mit dem
   * Bild nur und Chat und alles … aber das läuft dann ab, wenn sie es nicht bezahlen, nach
   * einer Woche").
   *
   * Warum das mehr ist als Grosszuegigkeit: Eine Einladung geht an fuenfzig bis
   * hundertfuenfzig Menschen. In der Probewoche verschickt sie sie — und jeder Gast sieht,
   * was das Ding kann, bevor irgendjemand bezahlt hat. Das ist der einzige Kanal im Portal,
   * der sich selbst weitertraegt; ihn hinter die Kasse zu stellen, hiesse ihn abzuschalten.
   *
   * `bildUrl` = die Gratis-Fassung mit dem Standbild. `probeBis` = wann Schluss ist.
   * `bezahlt` = das Abo laeuft, dann gilt keine Frist mehr.
   */
  bildUrl?: string;
  probeBis?: string;
  bezahlt?: boolean;
  sie?: string;           // ihr Vorname
  er?: string;            // sein Vorname
  datum?: string;         // YYYY-MM-DD
  ort?: string;           // Saal oder Restaurant
  adresse?: string;       // Strasse, Hausnummer, PLZ, Stadt — der Gast muss HIN finden
  telefon?: string;       // WhatsApp-Nummer des Paares: darueber sagen die Gaeste zu
  lang?: string;          // in welcher Sprache die Seite erscheint
  /**
   * DER ANLASS (Owner 04.08.2026: „du machst eine Invitation für Urlaub an jemandem").
   *
   * Fehlt das Feld, ist es eine Hochzeit — so waren alle Einladungen vor diesem Tag gemeint,
   * und sie müssen unverändert weiterlaufen. `"holiday"` schaltet auf die Urlaubs-Fassung:
   * andere Überschrift, und der Eingeladene kann nur zusagen oder absagen (kein Menü, keine
   * Gästezahl, kein Gruppenchat — das sind Hochzeitssachen für viele Gäste).
   */
  /**
   * WELCHES THEMA DIESE KARTE IST. Fehlt es, ist es eine HOCHZEIT — der Urzustand.
   *
   * „gutschein" kam am 05.08.2026 dazu (Owner: „ich habe bezahlt und jetzt?"). Bis dahin
   * nahm `/api/einladung` nur „holiday" an und warf alles andere weg; ein bezahlter Gutschein
   * landete dadurch als Hochzeitseinladung mit Menuewahl, Gaesteliste und Gruppenchat.
   */
  thema?: "holiday" | "gutschein";
  /**
   * DER LINK ZU SEINEM GUTSCHEIN — und ausdrücklich NUR ein Link (Owner 05.08.2026: „es ist
   * ein Risiko für die Häcker"; Konzept §3b). Nie eine Datei, nie der Code: Gespeicherte
   * Codes wären ein Stapel fremdes Geld bei uns; ein Verweis ist nur eine Adresse, die
   * ohnehin im Postfach des Käufers liegt. Der Empfänger bekommt ihn hinter dem Knopf
   * „Gutschein öffnen" — nie im Video, nie in der Vorschau (WhatsApp liefert die sonst mit).
   */
  /**
   * DER TOPIC-GUTSCHEIN IN DER KARTE (Owner 06.08.2026: „jeder Topic als Gutschein
   * einfügen"; fremde Händler-Links sind am selben Tag abgeschafft — „wir machen keine
   * fremde gutscheine mehr"). Der Käufer legt ein LuxuryBandit-Geschenk bei: Guthaben in
   * Höhe des Themenpreises auf dem Konto des Beschenkten. Alle drei Felder liest die
   * Einladungs-Route nach der Zahlung aus dem STRIPE-Kassenvermerk — nie aus dem Browser,
   * der könnte sich sonst ein 60-€-Etikett auf eine unbezahlte Karte schreiben.
   * `lbGutscheinEmpfaenger` erscheint öffentlich NUR maskiert (a•••@gmail.com).
   */
  lbGutscheinCents?: number;
  lbGutscheinTopic?: string;
  lbGutscheinEmpfaenger?: string;
  /**
   * DER LETZTE TAG und DIE BOTSCHAFT unter dem Bild — beide nur beim Urlaub
   * (Owner 04.08.2026: „das Datum von wann bis wann" · „vielleicht will derjenige mehr
   * schreiben"). Fehlen sie, zeigt die Karte einen einzelnen Tag und keine Botschaft —
   * genau so, wie jede Einladung von vor diesem Tag aussah.
   */
  bisDatum?: string;
  botschaft?: string;
  email?: string;         // wem sie gehört — für Widerruf und Zuordnung
  device?: string;
  /**
   * Zusagen: Vorname UND E-Mail des Gastes (Owner 31.07.2026: „auch die Gäste müssen ihre
   * E-Mail angeben, weil sie noch News zur Hochzeit bekommen können").
   *
   * Das kehrt §8 des ersten Konzepts um („keine echten Personendaten der Gäste bei uns") und
   * ist eine bewusste Entscheidung: Ohne Adresse kann das Paar seine Gäste nicht erreichen,
   * wenn sich Uhrzeit oder Ort ändern — und genau dafür zahlt es. Dafür MUSS an der Eingabe
   * stehen, wofür die Adresse ist; sie gehört dem Paar, nicht uns.
   */
  /**
   * `menu` — welches Essen ein zusagender Gast will (Owner 02.08.2026: „die Leute müssen bei
   * der Bestätigung angeben ob sie vegetarisch, vegan oder normal essen wollen"). Nur bei einer
   * Zusage gesetzt; wer absagt, isst nicht mit.
   */
  /**
   * `personen` — wie viele Gäste hinter EINER Zusage stehen (Owner 02.08.2026: „die
   * Gästezahl muss noch klar stehen"). „Maria & Radu" ist eine Zusage, aber zwei Gäste —
   * die Kopfzahl für Saal und Küche zählt Personen, nicht Zusagen.
   */
  zusagen?: { name: string; ja: boolean; at: string; email?: string; menu?: "normal" | "vegetarisch" | "vegan"; personen?: number }[];
  /**
   * Wie oft das Video schon getauscht wurde (Owner: „sie können das Video 5 mal ändern.
   * Die Gäste sehen immer den neuesten Stand"). Begrenzt, weil jeder Tausch ein bezahlter
   * Render ist — und weil eine Einladung, die dreimal die Woche ihr Gesicht wechselt, für
   * die Gäste keine Einladung mehr ist.
   */
  videoChanges?: number;
  /**
   * DER GRUPPENCHAT (Owner 31.07.2026: „und mach noch einen Gruppenchat. Das koennen sie auch
   * bekommen.").
   *
   * Bewusst hier IN der Einladung und nicht als eigenes Ding: Es ist der Chat DIESER Hochzeit,
   * er lebt und stirbt mit ihr, und die Loeschfrist gilt automatisch mit. Vorname und Text,
   * mehr nicht — wer laenger reden will, hat WhatsApp.
   */
  chat?: { name: string; text: string; at: string }[];
  /**
   * NEUIGKEITEN DES PAARES (Owner 31.07.2026: „die Gaeste werden immer wieder ueber den Link
   * rein muessen, um die neuesten News zu bekommen, den sie per E-Mail erhalten").
   *
   * Das ist der Kreislauf, fuer den das Abo bezahlt wird: Das Paar schreibt etwas, alle Gaeste
   * bekommen eine Mail MIT DEM LINK, und auf der Einladung steht der neueste Stand. Deshalb
   * gehoert die Adresse des Gastes zur Zusage — ohne sie gibt es diesen Kreis nicht.
   *
   * Bewusst getrennt vom Chat: Was das Paar schreibt, gilt. Was die Gaeste schreiben, ist
   * Gespraech.
   */
  news?: { text: string; at: string }[];
  opens?: number;         // wie oft geöffnet — die Zahl, die über den Kanal entscheidet
  lastOpenAt?: string;
  revoked?: boolean;      // sie hat sie zurückgezogen
};

export async function readEinladungen(): Promise<Einladung[]> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(EINLADUNGEN_PATH)}`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.entries) ? (data.entries as Einladung[]) : [];
  } catch { return []; }
}

export async function writeEinladungen(entries: Einladung[]): Promise<void> {
  await ensureBucket();
  const response = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(EINLADUNGEN_PATH)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ entries: entries.slice(0, 2000), savedAt: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Einladungen konnten nicht gespeichert werden (${response.status}).`);
}

/**
 * DAS EINLADUNGS-ABO BESTÄTIGT (Ä11, Owner 02.08.2026: „Wenn er die auch nutzen will, dann
 * muss er gleich Abo abschliessen"). Wird von `/api/checkout-status` aufgerufen, sobald
 * Stripe eine `kind: "einladung-plan"`-Zahlung bestätigt hat — NIE vom Client direkt, sonst
 * könnte sich jeder selbst als bezahlt eintragen.
 *
 * Reines Umlegen eines Schalters, kein Zähler — zweimal aufrufen ist harmlos (Stripe schickt
 * den Kunden nur einmal bezahlt zurück, aber ein erneuter Aufruf würde nichts kaputt machen).
 * Deshalb genügt hier ein einfaches Lesen-Ändern-Schreiben wie bei `setVideo`/`revoke` in
 * `app/api/einladung/route.ts` — anders als beim Gruppenchat, wo mehrere Gäste gleichzeitig
 * schreiben, gibt es hier nur genau EINEN Schreiber (Stripe, einmal).
 */
export async function einladungAboVermerken(id: string): Promise<void> {
  const alle = await readEinladungen();
  const e = alle.find(x => x.id === id);
  if (!e) return;
  e.bezahlt = true;
  await writeEinladungen(alle);
}

export async function readKissLog(): Promise<KissLogEntry[]> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(KISS_LOG_PATH)}`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.entries) ? (data.entries as KissLogEntry[]) : [];
  } catch { return []; }
}

/**
 * WER HAT DAS VIDEO ERZEUGT (Owner 03.08.2026: „wer hat das hier generiert?" — zu drei
 * Pixverse-Läufen, die er nicht selbst gestartet hat).
 *
 * DIE FRAGE WAR NICHT ZU BEANTWORTEN, und das ist der Grund für diese Datei: `/api/
 * generate-tryon-video` hat bis heute NICHTS mitgeschrieben. Nur der Kuss-Trichter meldete
 * seine Aufträge über `/api/kiss-log` nach. Alles, was über den Holiday-Trichter, den
 * Prüfstand oder einen direkten API-Aufruf lief, hinterliess keine Spur — kein Name, kein
 * Gerät, keine Uhrzeit. Am 02.08.2026 standen 37 Besucher im Kuss-Protokoll, kein einziger
 * mit Video, und trotzdem lief die Pixverse-Rechnung. Ein Dienst, der Geld ausgibt und nicht
 * aufschreibt wofür, ist nicht prüfbar.
 *
 * BEWUSST OHNE BILDER: Hier steht nur, WER WANN WAS ausgelöst hat — keine Fotos, keine
 * Datenurls. Das Protokoll soll die Rechnung erklären, nicht die Galerie verdoppeln (die
 * Bilder liegen im Kuss-Protokoll, siehe KissLogEntry).
 */
export type VideoLogEntry = {
  at: string;             // ISO-Zeit des Auftrags
  quelle: string;         // welcher Trichter/welche Oberfläche (kiss · holiday · studio · …)
  staff: boolean;         // Admin/Prüfstand → umgeht jede Grenze, deshalb eigens vermerkt
  bezahlt: boolean;       // bezahlter Auftrag (genId mit paid) oder Gratis-Kontingent
  email?: string;
  device?: string;
  ip?: string;            // die Kennung, auf der die Tagesgrenze zählt
  genId?: string;         // Eintrag im Kuss-Protokoll, falls es einen gibt
  videoId?: string;       // Pixverse-Auftragsnummer — die Brücke zur Pixverse-Abrechnung
  anbieter?: string;      // pixverse · fal · …
  fehler?: string;        // abgewiesen/fehlgeschlagen: warum
};

const VIDEO_LOG_PATH = "try-this-look/video-log.json";

export async function readVideoLog(): Promise<VideoLogEntry[]> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(VIDEO_LOG_PATH)}`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.entries) ? (data.entries as VideoLogEntry[]) : [];
  } catch { return []; }
}

/**
 * Schreibt EINEN Eintrag dazu. Absichtlich „lesen, vorne anhängen, schreiben" wie beim
 * Kuss-Protokoll — bei diesen Mengen (ein Video dauert Minuten) ist das unkritisch, und es
 * kommt ohne zusätzliche Technik aus.
 *
 * WIRFT NIE. Ein Protokoll darf eine laufende, bezahlte Erzeugung nicht kippen — lieber eine
 * Lücke in der Liste als ein Kunde ohne Video.
 */
export async function addVideoLog(eintrag: VideoLogEntry): Promise<void> {
  try {
    const alle = await readVideoLog();
    await ensureBucket();
    await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(VIDEO_LOG_PATH)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
      body: JSON.stringify({ entries: [eintrag, ...alle].slice(0, 1000), savedAt: new Date().toISOString() }),
    });
  } catch (e) {
    console.warn("[video-log] konnte nicht geschrieben werden:", e instanceof Error ? e.message : e);
  }
}

/**
 * SCHREIBEN HEISST VEREINIGEN, NICHT UEBERSCHREIBEN (03.08.2026).
 *
 * WAS PASSIERT IST: Ein Kunde zahlte 1,49 € aus dem Guthaben — die Abbuchung steht bis heute
 * in `videoCredits.redeemed` (`wallet-91e53d90-…`), das Geld ist weg (999 → 850 Cent). Sein
 * AUFTRAG dagegen war eine Minute spaeter spurlos verschwunden: kein Eintrag mit dieser
 * Kennung, kein `paid`, nichts zu liefern. Auf dem Schirm stand danach „Videos are paid —
 * please top up your balance", obwohl er gerade bezahlt hatte.
 *
 * WARUM: Jeder Aufrufer las das GANZE Protokoll, aenderte eine Zeile und schrieb das GANZE
 * Protokoll zurueck. Am Kuss haengen aber mehrere Schreiber gleichzeitig — zwei Foto-Uploads
 * ein paar Sekunden auseinander, `kiss-claim` mit der Adresse, `checkout-status` mit dem
 * Bezahlt-Stempel, die Video-Route mit der Auftragsnummer. Wer als Letzter schrieb, hatte
 * seinen Stand vielleicht VOR der Aenderung des anderen gelesen — und loeschte sie damit
 * wieder weg. Bei zwei Uploads sieht man es als zwei halbe Auftraege (einer mit ihrem, einer
 * mit seinem Foto); beim Bezahlt-Stempel sieht man es als ausgeraubten Kunden.
 *
 * DIE LOESUNG IST DIESELBE WIE BEIM state.json: Beim Schreiben wird der JETZIGE Stand noch
 * einmal gelesen und dazugemischt. Was der Aufrufer nicht kennt, hat ein anderer inzwischen
 * angelegt — das bleibt. Was der Aufrufer ausdruecklich loeschen will, nennt er in
 * `geloescht`; ohne diese Liste kaeme jede Loeschung beim naechsten Schreiben zurueck (genau
 * dieser Fehler kostete das Projekt schon einmal die Loeschfunktion).
 *
 * Felder gewinnt IMMER der Aufrufer: Er hat gerade etwas geaendert, der gelesene Stand ist
 * aelter. Nur ganze Eintraege, die er gar nicht kennt, kommen aus dem Speicher dazu.
 */
/**
 * SCHREIBVORGAENGE NACHEINANDER, NICHT DURCHEINANDER.
 *
 * Das Mischen allein reicht NICHT, und das ist gemessen: Zwei gleichzeitige Anfragen lesen
 * beide den alten Stand, mischen beide dagegen und schreiben beide — der Zweite gewinnt und
 * nimmt den Ersten mit. Lesen-Mischen-Schreiben muss also am Stueck laufen.
 *
 * Dieselbe Kette wie bei `creditGrantChain` weiter unten, aus demselben Anlass: Dort wurden
 * zweimal 40 Credits gutgeschrieben, weil mehrere Aufrufe gleichzeitig an derselben Zahl
 * zogen. Sie deckt Rennen INNERHALB einer Instanz ab — der haeufige Fall, denn die zwei
 * Foto-Uploads eines Besuchers landen fast immer auf derselben. Ueber Instanzen hinweg bleibt
 * das Mischen die zweite Verteidigungslinie.
 */
let kissLogKette: Promise<unknown> = Promise.resolve();

export async function writeKissLog(entries: KissLogEntry[], geloescht?: string[]): Promise<void> {
  const lauf = kissLogKette.then(() => writeKissLogInner(entries, geloescht));
  kissLogKette = lauf.catch(() => {});   // ein Fehler darf die Kette nie reissen lassen
  return lauf;
}

async function writeKissLogInner(entries: KissLogEntry[], geloescht?: string[]): Promise<void> {
  await ensureBucket();
  let zuSchreiben = entries;
  try {
    const jetzt = await readKissLog();
    const kenntEr = new Set(entries.map(e => e.id));
    const weg = new Set(geloescht ?? []);
    const fremd = jetzt.filter(e => !kenntEr.has(e.id) && !weg.has(e.id));
    if (fremd.length) {
      // Neueste zuerst — dieselbe Ordnung, die die Route beim Anlegen herstellt (`[neu, ...alt]`).
      zuSchreiben = [...entries, ...fremd].sort((a, b) =>
        String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    }
  } catch { /* Konnte den aktuellen Stand nicht lesen → lieber schreiben als gar nichts */ }
  const response = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(KISS_LOG_PATH)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ entries: zuSchreiben.slice(0, 500), savedAt: new Date().toISOString() }),
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

// ── Abmeldungen vom Rundbrief ───────────────────────────────────────────────
/**
 * DIE SPERRLISTE FÜRS PORTAL, geführt nach E-MAIL — nicht nach Abonnenten-Kennung.
 *
 * Owner 31.07.2026, zum Rundbrief an alle. Die Wetter-Abmeldung hängt an EINEM Datensatz;
 * dieselbe Person steht aber oft in mehreren Quellen (Wetter, Kiss-Log, Generationen). Wer
 * sich abmeldet, meint sich selbst — nicht einen seiner Einträge. Deshalb eine Liste, die
 * über allen anderen steht: Wer hier drinsteht, bekommt nie wieder einen Rundbrief.
 *
 * Eigene Datei, damit ein Abmelden niemals die Abonnentenliste überschreiben kann.
 */
const MAIL_ABMELDE_PFAD = "try-this-look/mail-abmeldungen.json";

export async function readMailAbmeldungen(): Promise<string[]> {
  try {
    // `no-cache` ist hier PFLICHT, nicht Vorsicht: Wer eine Liste liest, um sie gleich
    // ergänzt zurückzuschreiben, darf keinen alten Stand bekommen — sonst löscht der
    // Rückschreiber die Einträge, die zwischen Lesen und Schreiben dazugekommen sind.
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(MAIL_ABMELDE_PFAD)}`, {
      headers: { "cache-control": "no-cache, max-age=0" },
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.emails)
      ? (data.emails as unknown[]).map(v => String(v ?? "").trim().toLowerCase()).filter(Boolean)
      : [];
  } catch { return []; }
}

/**
 * TRÄGT MEHRERE ADRESSEN IN EINEM ZUG EIN — und genau das ist der Punkt.
 *
 * DER FEHLER, DER DAS ERZWANG (gemessen 04.08.2026): Der Rückläufer-Leser fand zwei tote
 * Adressen und meldete beide als gesperrt. In der Liste stand hinterher nur EINE. Ursache ist
 * das Muster „lesen, ergänzen, ganz zurückschreiben": Der zweite Aufruf las noch den Stand von
 * vor dem ersten Schreibvorgang und überschrieb ihn mit seiner eigenen Fassung. Der erste
 * Eintrag war weg — lautlos, denn beide Aufrufe meldeten Erfolg.
 *
 * Das ist keine Kleinigkeit: Eine verlorene Sperre heisst, dass eine tote Adresse beim nächsten
 * Rundbrief wieder angeschrieben wird — und Rückläufer sind genau das, was die Zustellbarkeit
 * der Domain kostet. Bei einer verlorenen ABMELDUNG wäre es schlimmer: Dann schreiben wir
 * jemandem, der ausdrücklich Nein gesagt hat.
 *
 * Deshalb: EIN Lesen, EIN Schreiben für den ganzen Schwung — und danach nachsehen, ob wirklich
 * alles angekommen ist. Fehlt etwas, wird einmal nachgelegt.
 */
export async function mailAbmeldenViele(emails: string[]): Promise<string[]> {
  const wollen = [...new Set(
    (emails ?? []).map(v => String(v ?? "").trim().toLowerCase())
      .filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)),
  )];
  if (!wollen.length) return [];

  const schreiben = async (): Promise<string[]> => {
    const liste = await readMailAbmeldungen();
    const da = new Set(liste);
    const neu = wollen.filter(e => !da.has(e));
    if (!neu.length) return [];
    await ensureBucket();
    const body = JSON.stringify({ emails: [...liste, ...neu].slice(-50_000), updatedAt: new Date().toISOString() });
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(MAIL_ABMELDE_PFAD)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
      body,
    });
    if (!res.ok) throw new Error("Abmeldung konnte nicht gespeichert werden.");
    return neu;
  };

  const neu = await schreiben();
  // Nachsehen statt vertrauen. Hat ein gleichzeitiger Schreiber dazwischengefunkt, fehlt hier
  // etwas — dann einmal nachlegen. Ein zweiter Fehlschlag wird gemeldet, nicht verschluckt.
  const jetzt = new Set(await readMailAbmeldungen());
  if (wollen.some(e => !jetzt.has(e))) await schreiben();
  return neu;
}

/** Trägt eine Adresse ein. Mehrfaches Abmelden ist harmlos (idempotent). */
export async function mailAbmelden(email: string): Promise<void> {
  await mailAbmeldenViele([email]);
}

/**
 * Nimmt eine Adresse wieder aus der Sperrliste (nur Admin, siehe /api/mail-abmelden).
 * Ein Löschknopf ohne Rücknahme wäre eine Falle — ein Fehlklick auf den falschen Namen
 * dürfte niemanden dauerhaft aussperren.
 */
export async function mailFreigeben(email: string): Promise<void> {
  const e = String(email ?? "").trim().toLowerCase();
  if (!e) return;
  const liste = await readMailAbmeldungen();
  if (!liste.includes(e)) return;
  await ensureBucket();
  const body = JSON.stringify({ emails: liste.filter(x => x !== e), updatedAt: new Date().toISOString() });
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(MAIL_ABMELDE_PFAD)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body,
  });
  if (!res.ok) throw new Error("Sperre konnte nicht aufgehoben werden.");
}

// ── Rückläufer: das Protokoll ───────────────────────────────────────────────
/**
 * WER WURDE WANN UND WARUM GESPERRT (Owner 04.08.2026, zum Rückläufer-Leser).
 *
 * Die Sperrliste selbst ist nur eine Aufzählung von Adressen — sie sagt nicht, wie eine
 * hineingekommen ist. Solange ein Mensch sie von Hand füllte, wusste er es. Sobald ein Cron
 * nachts sperrt, weiss es niemand mehr: Beschwert sich jemand, er bekomme keine Post, gäbe es
 * ohne dieses Protokoll keine Antwort ausser Achselzucken.
 *
 * Deshalb steht hier der Klartext des Mailservers dabei („550 5.1.1 … does not exist"). Das ist
 * der Beleg, mit dem sich eine Sperre entweder verteidigen oder zurücknehmen lässt.
 */
const RUECKLAEUFER_PFAD = "try-this-look/ruecklaeufer-log.json";

export type RuecklaeuferEintrag = {
  email: string;
  status: string;
  grund: string;
  betreff: string;
  am: string;
};

export async function readRuecklaeuferLog(): Promise<RuecklaeuferEintrag[]> {
  try {
    // Gelesen wird, um gleich anzuhängen — also nie aus dem Cache, siehe `readMailAbmeldungen`.
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(RUECKLAEUFER_PFAD)}`, {
      headers: { "cache-control": "no-cache, max-age=0" },
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    return Array.isArray(data?.eintraege) ? (data.eintraege as RuecklaeuferEintrag[]) : [];
  } catch { return []; }
}

/** Hängt an. Die letzten 5000 reichen — älter als das schaut niemand nach. */
export async function vermerkRuecklaeufer(neu: RuecklaeuferEintrag[]): Promise<void> {
  if (!neu.length) return;
  const alt = await readRuecklaeuferLog();
  await ensureBucket();
  const body = JSON.stringify({ eintraege: [...alt, ...neu].slice(-5000), updatedAt: new Date().toISOString() });
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(RUECKLAEUFER_PFAD)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body,
  });
  if (!res.ok) throw new Error("Rückläufer-Protokoll konnte nicht geschrieben werden.");
}

// ── Rundbrief: wer ist schon dran gewesen ───────────────────────────────────
/**
 * WEM WURDE DIESE AUSSENDUNG SCHON GESCHICKT (Owner 04.08.2026, „weiter mit mails rückgang").
 *
 * DAS PROBLEM, DAS OHNE DIESE DATEI UNLÖSBAR IST: Rückläufer werden nur dann billig, wenn man
 * in kleinen Schüben sendet — 50 raus, am nächsten Tag die toten Adressen sperren, die
 * nächsten 50. Nur liess sich das gar nicht durchführen: Der Rundbrief kannte bloss „alle auf
 * einmal" und merkte sich nichts. Brach er nach der Hälfte ab (die Route hat 300 Sekunden, bei
 * 350 ms Abstand je Mail ist das nicht viel Luft), wusste niemand, wo er stehengeblieben war —
 * und ein zweiter Lauf schrieb die erste Hälfte ein zweites Mal an.
 *
 * ZWEIMAL DASSELBE ZU SCHICKEN IST NICHT NUR PEINLICH: Genau das drückt der Empfänger als
 * „Spam" weg, und diese Meldung wiegt bei Gmail schwerer als jeder Rückläufer.
 *
 * Geführt wird nach KAMPAGNE, nicht global — die nächste Aussendung soll dieselben Leute ja
 * wieder erreichen dürfen.
 */
const RUNDBRIEF_GESENDET_PFAD = "try-this-look/rundbrief-gesendet.json";

type GesendetDatei = Record<string, Record<string, string>>;

async function readGesendetDatei(): Promise<GesendetDatei> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(RUNDBRIEF_GESENDET_PFAD)}`, {
      headers: { "cache-control": "no-cache, max-age=0" },
    });
    if (!res.ok) return {};
    const data = await res.json().catch(() => null);
    return (data?.kampagnen && typeof data.kampagnen === "object" ? data.kampagnen : {}) as GesendetDatei;
  } catch { return {}; }
}

/** Die Adressen, die diese Kampagne schon bekommen haben. */
export async function readRundbriefGesendet(kampagne: string): Promise<Set<string>> {
  const alle = await readGesendetDatei();
  return new Set(Object.keys(alle[String(kampagne)] ?? {}));
}

/**
 * Vermerkt einen ganzen Schub in EINEM Schreibvorgang — nie einen nach dem anderen, sonst
 * überschreiben sich die Vermerke gegenseitig (siehe `mailAbmeldenViele`).
 */
export async function vermerkRundbriefGesendet(kampagne: string, emails: string[]): Promise<void> {
  const k = String(kampagne);
  const neu = [...new Set((emails ?? []).map(v => String(v ?? "").trim().toLowerCase()).filter(Boolean))];
  if (!neu.length) return;
  const alle = await readGesendetDatei();
  const jetzt = new Date().toISOString();
  alle[k] = { ...(alle[k] ?? {}) };
  for (const e of neu) alle[k][e] = jetzt;
  await ensureBucket();
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(RUNDBRIEF_GESENDET_PFAD)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ kampagnen: alle, updatedAt: jetzt }),
  });
  if (!res.ok) throw new Error("Versand-Vermerk konnte nicht gespeichert werden.");
}

// ── Rundbrief: Öffnungen ────────────────────────────────────────────────────
/**
 * WER HAT DEN RUNDBRIEF GEÖFFNET (Owner 01.08.2026: „wieviele haben drauf geklickt?" — „ja"
 * zum Zählpixel).
 *
 * Beim ersten Versand konnten wir nur KLICKS zählen (utm auf der Zielseite). Damit sind zwei
 * völlig verschiedene Probleme ununterscheidbar: Mail nie angekommen (Zustellproblem) oder
 * gelesen, aber nicht geklickt (Inhaltsproblem). Das Pixel trennt die beiden — dieselbe
 * Technik wie bei den Wetter-Mails, eigene Datei je Kampagne.
 *
 * Nach E-MAIL geführt, nicht nach Abonnenten-Kennung: Der Rundbrief geht an Empfänger aus
 * fünf Quellen, von denen die meisten gar keine Kennung haben.
 */
export type RundbriefOeffnung = { count: number; firstAt: string; lastAt: string };

const rundbriefOffenPfad = (kampagne: string) =>
  `try-this-look/rundbrief-offen-${kampagne.replace(/[^a-z0-9-]/gi, "")}.json`;

export async function readRundbriefOeffnungen(kampagne: string): Promise<Record<string, RundbriefOeffnung>> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(rundbriefOffenPfad(kampagne))}`);
    if (!res.ok) return {};
    const data = await res.json().catch(() => null);
    return data?.oeffnungen && typeof data.oeffnungen === "object" ? data.oeffnungen as Record<string, RundbriefOeffnung> : {};
  } catch { return {}; }
}

export async function vermerkRundbriefOeffnung(kampagne: string, email: string): Promise<void> {
  const e = String(email ?? "").trim().toLowerCase();
  if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return;
  const alle = await readRundbriefOeffnungen(kampagne);
  const jetzt = new Date().toISOString();
  const da = alle[e];
  alle[e] = da ? { ...da, count: da.count + 1, lastAt: jetzt } : { count: 1, firstAt: jetzt, lastAt: jetzt };
  await ensureBucket();
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(rundbriefOffenPfad(kampagne))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ oeffnungen: alle, updatedAt: jetzt }),
  });
}

// ── Wetter-Klick-Tracking ───────────────────────────────────────────────────
// EIGENER Blob (nicht die Abonnentenliste anfassen → nie clobbern). Map je Abonnent:
// { count, lastAt, src }. „geöffnet" = er hat den Link (E-Mail/WhatsApp) angeklickt.
export type WetterClick = {
  count: number; lastAt: string; src?: string;
  // WAS DIE PERSON DANACH GETAN HAT (Owner 29.07.2026: „Muss sehen wer das bis morgen
  // öffnet und was testet oder chatet").
  //
  // Öffnen allein sagt wenig — die Frage ist, ob danach etwas passiert. Chat und Test lagen
  // bisher nur als GESAMTZAHL vor („17 Chats"), also liess sich nicht sagen, WER. Beides
  // hängt jetzt an derselben Person wie der Klick.
  open?: number; openAt?: string;     // E-Mail GEÖFFNET (Zählpixel) — nicht dasselbe wie Klick
  chat?: number; chatAt?: string;
  test?: number; testAt?: string; testWhat?: string;   // testWhat: welche Karte er geöffnet hat
};
function wetterClicksPath(modelId?: string) {
  const id = (modelId ?? "").trim();
  return (!id || id === BELLA_STUDIO_ID)
    ? "try-this-look/wetter-clicks.json"
    : `try-this-look/wetter-clicks-${id.replace(/[^a-zA-Z0-9-]/g, "")}.json`;
}
// JE EREIGNIS EINE DATEI — nur so geht bei einer Aussendung nichts verloren.
//
// Erster Versuch war „je Person eine Datei". Das löste die Kollision ZWISCHEN Personen, aber
// nicht die innerhalb einer: Öffnen und Anklicken im selben Moment lasen beide denselben
// Stand und der zweite Schreibvorgang gewann. Am 29.07.2026 nachgestellt und beobachtet.
//
// Jetzt wird NICHTS mehr gelesen und geändert. Jedes Ereignis legt eine eigene Datei an,
// deren NAME schon alles sagt: wer, was, wofür, wann. Zwei gleichzeitige Ereignisse können
// sich nicht überschreiben, weil sie nie denselben Namen haben.
//
// Gelesen wird mit EINEM Auflisten — die Namen genügen, kein einziger Dateiinhalt muss
// geholt werden. Deshalb bleibt es auch bei tausenden Ereignissen schnell.
function wetterActivityDir(modelId?: string) {
  const id = (modelId ?? "").trim().replace(/[^a-zA-Z0-9-]/g, "") || "default";
  return `try-this-look/wetter-activity/${id === BELLA_STUDIO_ID.replace(/[^a-zA-Z0-9-]/g, "") ? "default" : id}`;
}
const kuerzel = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);

async function readWetterClicksLegacy(modelId?: string): Promise<Record<string, WetterClick>> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(wetterClicksPath(modelId))}`);
    if (!res.ok) return {};
    const data = await res.json().catch(() => null);
    return (data && typeof data === "object" && data.clicks && typeof data.clicks === "object") ? data.clicks as Record<string, WetterClick> : {};
  } catch { return {}; }
}

export async function readWetterClicks(modelId?: string): Promise<Record<string, WetterClick>> {
  const out = await readWetterClicksLegacy(modelId);   // Verlauf von vor der Umstellung
  try {
    const dir = wetterActivityDir(modelId);
    const namen: string[] = [];
    for (let seite = 0; seite < 6; seite++) {          // bis 6000 Ereignisse
      const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: dir, limit: 1000, offset: seite * 1000 }),
      });
      if (!res.ok) break;
      const files = (await res.json().catch(() => [])) as { name?: string }[];
      const teil = (Array.isArray(files) ? files : []).map(f => String(f?.name ?? "")).filter(n => n.endsWith(".json"));
      namen.push(...teil);
      if (teil.length < 1000) break;
    }
    for (const n of namen) {
      // <subId>__<art>__<kuerzel>__<zeit>.json
      const [subId, art, label, zeit] = n.replace(/\.json$/, "").split("__");
      if (!subId || !art || !zeit) continue;
      const when = new Date(Number(zeit) || 0).toISOString();
      const a = (out[subId] ??= { count: 0, lastAt: when });
      if (art === "open") { a.open = (a.open ?? 0) + 1; if (!a.openAt || a.openAt < when) a.openAt = when; }
      else if (art === "chat") { a.chat = (a.chat ?? 0) + 1; if (!a.chatAt || a.chatAt < when) a.chatAt = when; }
      else if (art === "test") { a.test = (a.test ?? 0) + 1; if (!a.testAt || a.testAt < when) { a.testAt = when; a.testWhat = label || a.testWhat; } }
      else { a.count = (a.count ?? 0) + 1; if (!a.lastAt || a.lastAt < when) a.lastAt = when; if (label) a.src = label; }
    }
    return out;
  } catch { return out; }
}

export async function recordWetterClick(
  subId: string, src: string, modelId?: string,
  kind: "click" | "chat" | "test" | "open" = "click", what = "",
): Promise<void> {
  const id = String(subId || "").trim().replace(/[^a-zA-Z0-9_-]/g, "");
  if (!id) return;
  await ensureBucket();
  // Der Dateiname IST der Datensatz. Kein Lesen, kein Ändern — nur Anlegen.
  const label = kuerzel(kind === "test" ? what : src);
  const pfad = `${wetterActivityDir(modelId)}/${id}__${kind}__${label}__${Date.now()}.json`;
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ subId: id, kind, what: what.slice(0, 40), src: String(src).slice(0, 40), at: new Date().toISOString() }),
  }).catch(() => {});
}

// ── Versand-Protokoll der E-Mail-Aussendung ────────────────────────────────
// Wie viele Mails gingen raus, wie viele wurden abgelehnt — und wann. Ohne das stand das
// Ergebnis nur kurz in der Oberfläche; am Tag danach liess sich „niemand öffnet" nicht von
// „es kam nie an" trennen (Owner 30.07.2026).
export type WetterBlast = {
  at: string; modelId?: string; total: number; sent: number;
  failed: { email: string; error: string }[];
};
const BLAST_LOG_PATH = "try-this-look/wetter-blast-log.json";

export async function readWetterBlastLog(): Promise<WetterBlast[]> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(BLAST_LOG_PATH)}`);
    if (!res.ok) return [];
    const d = await res.json().catch(() => null);
    return Array.isArray(d?.blasts) ? (d.blasts as WetterBlast[]) : [];
  } catch { return []; }
}

export async function writeWetterBlastLog(entry: WetterBlast): Promise<void> {
  await ensureBucket();
  const blasts = [entry, ...(await readWetterBlastLog())].slice(0, 100);
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(BLAST_LOG_PATH)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ blasts, updatedAt: new Date().toISOString() }),
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

/** Euro-Guthaben eines Kunden in Cent (0, wenn keins). */
export async function readGuthabenCents(email: string): Promise<number> {
  const e = String(email ?? "").trim().toLowerCase();
  if (!e) return 0;
  const state = await readTryThisLookState();
  return Math.max(0, Math.round(Number(state.guthabenCents?.[e] ?? 0)));
}

/** Aufladung gutschreiben — idempotent je Kassensitzung (dieselbe redeemed-Liste wie überall). */
export async function guthabenAufladen(email: string, sessionId: string, cents: number): Promise<{ cents: number; granted: boolean }> {
  const e = String(email ?? "").trim().toLowerCase();
  const state = await readTryThisLookState();
  const vc = state.videoCredits ?? { balances: {}, redeemed: [] };
  vc.redeemed = vc.redeemed ?? [];
  const g = (state.guthabenCents = state.guthabenCents ?? {});
  if (!e || cents <= 0) return { cents: Math.max(0, Number(g[e] ?? 0)), granted: false };
  if (sessionId && vc.redeemed.includes(sessionId)) return { cents: Math.max(0, Number(g[e] ?? 0)), granted: false };
  g[e] = Math.max(0, Math.round(Number(g[e] ?? 0))) + Math.round(cents);
  if (sessionId) vc.redeemed.push(sessionId);
  state.videoCredits = vc;
  await saveTryThisLookState(state);
  return { cents: g[e], granted: true };
}

/**
 * Ein Video vom Guthaben bezahlen — idempotent je Schlüssel (z. B. `wallet-<genId>`), damit
 * ein doppelter Klick oder eine Wiederholung nach Netzfehler nie zweimal abbucht.
 */
/**
 * CHAT-ZUGANG VERLAENGERN — nach bezahltem Kauf (Owner 03.08.2026: „er kauft ein Model, ein Chat").
 *
 * VERLAENGERT AB DEM SPAETEREN VON HEUTE UND DEM BISHERIGEN ENDE. Wer im Juli drei Monate kauft
 * und im August noch einmal, bekommt zwei Monate DAZU — nicht ab heute gerechnet, sonst
 * verschenkt der treue Kunde den Rest, den er schon bezahlt hat. Genau dieser Fehler ist der
 * Grund, warum Verlaengerungen ueberall unbeliebt sind.
 *
 * IDEMPOTENT ueber `redeemedZugang`: Der Browser fragt den Zahlungsstatus in einer Schleife ab;
 * ohne diese Liste verlaengerte jede Antwort erneut.
 */
export async function chatZugangGewaehren(email: string, sessionId: string, monate: number): Promise<{ bis: string; granted: boolean }> {
  const e = String(email ?? "").trim().toLowerCase();
  const m = Math.max(1, Math.round(Number(monate) || 1));
  if (!e || !sessionId) return { bis: "", granted: false };
  const state = await readTryThisLookState();
  const gemacht = (state.redeemedZugang = state.redeemedZugang ?? []);
  const tabelle = (state.chatZugang = state.chatZugang ?? {});
  if (gemacht.includes(sessionId)) return { bis: String(tabelle[e] ?? ""), granted: false };

  const jetzt = Date.now();
  const bisher = Date.parse(String(tabelle[e] ?? "")) || 0;
  const start = new Date(Math.max(jetzt, bisher));
  start.setMonth(start.getMonth() + m);
  const bis = start.toISOString();

  tabelle[e] = bis;
  gemacht.push(sessionId);
  /* Der Warnvermerk gehoert zum ALTEN Ablauf. Bleibt er stehen, gilt der naechste als schon
     gemeldet und der Kunde erfaehrt nie, dass sein zweiter Monat endet. */
  if (state.chatZugangWarn) delete state.chatZugangWarn[e];
  await writeTryThisLookState(state);
  return { bis, granted: true };
}

/**
 * WER IN DEN NAECHSTEN `tage` TAGEN ABLAEUFT und noch keine Mail bekommen hat.
 *
 * Bereits ABGELAUFENE kommen NICHT mit: Eine Mail „dein Zugang endet morgen", die drei Tage
 * nach dem Ende ankommt, ist keine Warnung mehr, sondern eine Verhoehnung.
 */
export async function chatZugangAblaufend(tage: number): Promise<{ email: string; bis: string; restTage: number }[]> {
  const state = await readTryThisLookState();
  const tabelle = state.chatZugang ?? {};
  const gewarnt = state.chatZugangWarn ?? {};
  const jetzt = Date.now();
  const grenze = jetzt + Math.max(1, tage) * 86400_000;
  return Object.entries(tabelle)
    .filter(([email, bis]) => {
      if (gewarnt[email]) return false;
      const t = Date.parse(String(bis));
      return Number.isFinite(t) && t > jetzt && t <= grenze;
    })
    .map(([email, bis]) => ({ email, bis: String(bis), restTage: Math.max(1, Math.ceil((Date.parse(String(bis)) - jetzt) / 86400_000)) }));
}

/** Vermerken, dass die Mail raus ist — erst NACH erfolgreichem Versand aufrufen. */
export async function chatZugangGewarnt(email: string): Promise<void> {
  const e = String(email ?? "").trim().toLowerCase();
  if (!e) return;
  const state = await readTryThisLookState();
  (state.chatZugangWarn = state.chatZugangWarn ?? {})[e] = new Date().toISOString();
  await writeTryThisLookState(state);
}

/** Bis wann er schreiben darf — leer heisst: gar nicht (oder abgelaufen). */
export async function chatZugangBis(email: string): Promise<string> {
  const e = String(email ?? "").trim().toLowerCase();
  if (!e) return "";
  const state = await readTryThisLookState();
  const bis = String(state.chatZugang?.[e] ?? "");
  /* Abgelaufenes wird NICHT geloescht, nur nicht mehr gemeldet: Der Eintrag ist der Beleg
     dafuer, dass er einmal gekauft hat — und die Grundlage fuer die Verlaengerung oben. */
  return bis && Date.parse(bis) > Date.now() ? bis : "";
}

export async function guthabenAbbuchen(email: string, schluessel: string, cents: number): Promise<{ ok: boolean; rest: number }> {
  const e = String(email ?? "").trim().toLowerCase();
  const state = await readTryThisLookState();
  const vc = state.videoCredits ?? { balances: {}, redeemed: [] };
  vc.redeemed = vc.redeemed ?? [];
  const g = (state.guthabenCents = state.guthabenCents ?? {});
  const stand = Math.max(0, Math.round(Number(g[e] ?? 0)));
  if (!e || cents <= 0) return { ok: false, rest: stand };
  if (schluessel && vc.redeemed.includes(schluessel)) return { ok: true, rest: stand };   // schon bezahlt
  if (stand < cents) return { ok: false, rest: stand };
  g[e] = stand - Math.round(cents);
  if (schluessel) vc.redeemed.push(schluessel);
  state.videoCredits = vc;
  await saveTryThisLookState(state);
  return { ok: true, rest: g[e] };
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
// 20 (Owner 01.08.2026: „im Abo sind es dann 20 Videos"). Vorher stand hier 5, während die
// Seite 12 bewarb — der Abonnent bekam weniger als die Hälfte des Versprochenen gutgeschrieben.
// Werbung (INCLUDED_VIDEOS_PER_MONTH in lib/pricing) und Gutschrift müssen dieselbe Zahl sein.
export const SUBSCRIPTION_MONTHLY_CREDITS = Number(process.env.SUBSCRIPTION_MONTHLY_CREDITS ?? 20);

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
/** Wie viele Videos diese Adresse noch offen hat — nur lesen, nichts abziehen. */
export async function videoCreditBalance(email: string): Promise<number> {
  const e = email.trim().toLowerCase();
  if (!e) return 0;
  const state = await readTryThisLookState();
  return Math.max(0, Number(state.videoCredits?.balances?.[e] ?? 0));
}

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
