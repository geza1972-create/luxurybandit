import { compressImage } from "@/lib/image-compress";

export type TryThisLookLook = {
  id: string;
  name: string;
  campaignName?: string;
  // Explicit brand override. When set it wins over name-based brand detection.
  brand?: string;
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
  photoPath?: string;         // storage path of the curator's photo
  photoUrl?: string;          // hydrated signed URL (read side only)
  instagram?: string;         // handle for promotion
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
  brands?: string[];
  styles?: string[];
  colors?: string[];
  fabrics?: string[];
  occasions?: string[];
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
    for (const p of look.galleryImagePaths ?? []) if (p) allPaths.push(p);
  }
  for (const gen of state.generations) {
    if (gen.imagePath) allPaths.push(gen.imagePath);
    if ((gen as any).userPhotoPath) allPaths.push((gen as any).userPhotoPath);
  }
  for (const lead of state.leads ?? []) {
    if (lead.uploadedPhotoPath) allPaths.push(lead.uploadedPhotoPath);
  }
  for (const cur of state.curators ?? []) {
    if (cur.photoPath) allPaths.push(cur.photoPath);
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
    userPhotoUrl: (gen as any).userPhotoPath
      ? signed.get((gen as any).userPhotoPath)
      : undefined,
  }));

  const leads = (state.leads ?? []).map(lead => ({
    ...lead,
    uploadedPhotoUrl: lead.uploadedPhotoPath ? (signed.get(lead.uploadedPhotoPath) ?? lead.uploadedPhotoUrl) : lead.uploadedPhotoUrl,
  }));

  const curators = (state.curators ?? []).map(cur => ({
    ...cur,
    photoUrl: cur.photoPath ? (signed.get(cur.photoPath) ?? cur.photoUrl) : cur.photoUrl,
  }));

  return { ...state, looks, leads, generations, curators };
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
  });
}

// The whole state is one JSON blob written with last-write-wins. A slow/stale
// request would otherwise revert append-mostly collections (e.g. drop try-ons
// posted by other requests in the meantime). Re-read the latest blob and UNION
// these collections by id so a save can never LOSE records it didn't know about.
async function fetchRawState(): Promise<Partial<TryThisLookState> | null> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(STATE_PATH)}`);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as Partial<TryThisLookState>;
  } catch { return null; }
}
// Append-only union by id (for collections that don't get individually deleted).
function unionById<T extends { id: string }>(ours: T[] = [], latest: T[] = []): T[] {
  const seen = new Set(ours.map(r => r.id));
  return [...ours, ...latest.filter(r => !seen.has(r.id))];
}
// For generations (which CAN be deleted): only re-add storage records that are
// NEWER than our newest — i.e. concurrent posts we hadn't seen. Older records we
// don't have were deleted on purpose, so we must NOT resurrect them.
function mergeNewerById<T extends { id: string; createdAt?: string }>(ours: T[] = [], latest: T[] = []): T[] {
  const seen = new Set(ours.map(r => r.id));
  const ourNewest = ours.reduce((m, r) => (String(r.createdAt ?? "") > m ? String(r.createdAt ?? "") : m), "");
  const missedNewer = latest.filter(r => !seen.has(r.id) && String(r.createdAt ?? "") > ourNewest);
  return [...missedNewer, ...ours];
}

async function writeTryThisLookState(state: TryThisLookState) {
  await ensureBucket();
  // The whole state is one blob (last-write-wins). Re-read the latest and merge so
  // a slow/stale save can never DROP try-ons/comments posted in the meantime.
  const latest = await fetchRawState();
  if (latest) {
    state = {
      ...state,
      generations: mergeNewerById(state.generations as any, latest.generations as any) as any,
      comments: unionById((state.comments ?? []) as any, (latest.comments ?? []) as any) as any,
      leads: unionById((state.leads ?? []) as any, (latest.leads ?? []) as any) as any,
      messages: unionById((state.messages ?? []) as any, (latest.messages ?? []) as any) as any,
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
    curators: (state.curators ?? []).map(({ photoUrl, ...curator }) => curator).slice(0, 2000),
    partnerStores: (state.partnerStores ?? []).slice(0, 200),
    brands: (state.brands ?? []).slice(0, 5000),
    styles: (state.styles ?? []).slice(0, 5000),
    colors: (state.colors ?? []).slice(0, 5000),
    fabrics: (state.fabrics ?? []).slice(0, 5000),
    occasions: (state.occasions ?? []).slice(0, 5000),
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

export async function saveTryThisLookState(state: TryThisLookState) {
  await writeTryThisLookState(state);
  return readTryThisLookState();
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
