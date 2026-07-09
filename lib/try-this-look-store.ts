import { compressImage } from "@/lib/image-compress";

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
  internal?: boolean; // fired by an admin/test session → excluded from the funnel counts
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
export type CuratorProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  brands?: string;            // free-text brands they love
  style?: string;             // free-text style description
  genderFocus?: string;       // "women" | "men" | "unisex"
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
  instagram?: string;         // handle for promotion
  followerBoost?: number;     // baseline followers added to the real follow count (admin-set)
  likeBoost?: number;         // vanity likes baseline on her profile stats (admin-set)
  viewBoost?: number;         // vanity views baseline on her profile stats (admin-set)
  realBadge?: boolean;        // gold "is a real LuxuryBandit Model" banner — admin-set per model, off by default
  chatPersona?: string;       // admin-written AI-chat instructions/personality for THIS model
  chatEnabled?: boolean;      // admin toggle: is "chat with the model" on? (undefined = on)
  pinned?: boolean;           // admin-pinned → shown first in the Models gallery
  featured?: boolean;         // featured → free showcase on the Models tab; non-featured are locked (paid)
  status: "active" | "pending" | "deactivated";
  createdAt: string;
  // Creator credits (communicated to creators as "credits", never money).
  // Missing credits → STARTER_CREDITS. See lib/curator-budget.ts.
  credits?: number;             // spendable balance
  creditsSpent?: number;        // lifetime spent
  creditsEarned?: number;       // lifetime earned via engagement
  awardedMilestones?: string[]; // earn-milestone keys already granted
  creditLog?: { at: string; credits: number; label: string }[];
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
  // Global kill-switch: when true, end-user try-on generation is paused ("coming soon").
  // Admin/staff bypass it. Toggled instantly from the admin panel (no redeploy).
  tryonPaused?: boolean;
  // Admin-managed wardrobe: outfit images shown in the Try-On funnel gallery, so a user
  // can pick an outfit to see the video's model (or their own avatar) wearing it.
  outfits?: TryThisLookOutfit[];
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
  videoCredits?: { balances: Record<string, number>; redeemed: string[]; welcomed?: string[]; subMonths?: string[] };
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
    for (const p of cur.photoBodyPaths ?? []) allPaths.push(p);
  }
  for (const outfit of state.outfits ?? []) {
    const p = outfit.imagePath ?? extractPathFromUrl(outfit.imageUrl);
    if (p) allPaths.push(p);
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
  }));

  const outfits = (state.outfits ?? []).map(outfit => ({
    ...outfit,
    imageUrl: s(outfit.imagePath ?? extractPathFromUrl(outfit.imageUrl), outfit.imageUrl),
  }));

  return { ...state, looks, leads, generations, curators, outfits };
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
    tryonPaused: state.tryonPaused === true,
    outfits: state.outfits ?? [],
    funnelVideoPrompt: state.funnelVideoPrompt,
    viewsByDay: state.viewsByDay ?? {},
    visitsByDay: state.visitsByDay ?? {},
    chatConfig: state.chatConfig ?? {},
    modelChats: state.modelChats ?? [],
    directMessages: state.directMessages ?? [],
    videoCredits: state.videoCredits ?? { balances: {}, redeemed: [] },
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

type SaveOptions = { deletedGenerationIds?: string[]; deletedLeadIds?: string[]; deletedOutfitIds?: string[]; deletedChatIds?: string[] };

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
    state = {
      ...state,
      generations: mergeNewerById(state.generations as any, latest.generations as any, delGen) as any,
      // Admin-uploaded outfits CAN be deleted → mergeNewerById (like generations) so a
      // concurrent/stale save can never DROP them, while a real delete isn't resurrected.
      outfits: mergeNewerById((state.outfits ?? []) as any, (latest.outfits ?? []) as any, delOutfit) as any,
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
    };
  }
  const strippedState: TryThisLookState = {
    activeLookId: state.activeLookId,
    activeLookIds: state.activeLookIds?.length ? state.activeLookIds : [state.activeLookId],
    stores: state.stores ?? [],
    looks: state.looks.map(({ imageUrl, frontImageUrl, backImageUrl, garmentFrontImageUrl, garmentBackImageUrl, galleryImageUrls, ...look }) => look),
    events: state.events.slice(0, 500),
    leads: state.leads.map(({ uploadedPhotoUrl, ...lead }) => lead).slice(0, 500),
    generations: state.generations.map(({ imageUrl, ...generation }) => generation).slice(0, 200),
    comments: (state.comments ?? []).slice(0, 2000),
    follows: (state.follows ?? []).slice(0, 5000),
    messages: (state.messages ?? []).slice(0, 2000),
    curators: (state.curators ?? []).map(({ photoUrl, photoFullUrl, photoBodyUrls, ...curator }) => curator).slice(0, 2000),
    outfits: (state.outfits ?? []).map(({ imageUrl, ...outfit }) => outfit).slice(0, 500),
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
export const WELCOME_VIDEO_CREDITS = Number(process.env.WELCOME_VIDEO_CREDITS ?? 4);

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

// How many video credits an active $49/mo subscriber gets each calendar month.
export const SUBSCRIPTION_MONTHLY_CREDITS = Number(process.env.SUBSCRIPTION_MONTHLY_CREDITS ?? 50);

// Grant the monthly subscriber allowance ONCE per calendar month (idempotent via subMonths,
// keyed "email|YYYY-MM"). Call it whenever we confirm an active subscription. Returns balance.
export async function grantMonthlySubscriptionCredits(email: string, n = SUBSCRIPTION_MONTHLY_CREDITS): Promise<number> {
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
