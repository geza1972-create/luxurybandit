export type TryThisLookLook = {
  id: string;
  name: string;
  campaignName?: string;
  storeName?: string;
  storeSlug?: string;
  storeAddress?: string;
  whatsappNumber?: string;
  availableSizes?: string[];
  price?: string;
  salePrice?: string;
  discountLabel?: string;
  productNote?: string;
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
  whatsappNumber?: string;
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
  createdAt: string;
};

export type TryThisLookState = {
  activeLookId: string;
  activeLookIds?: string[];
  stores?: TryThisLookStore[];
  looks: TryThisLookLook[];
  events: TryThisLookEvent[];
  leads: TryThisLookLead[];
  generations: TryThisLookGeneration[];
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
    generations: []
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

async function getSignedUrl(path: string) {
  const { url } = getSupabaseConfig();
  const response = await supabaseFetch(`/storage/v1/object/sign/${BUCKET}/${encodeStoragePath(path)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ expiresIn: 60 * 60 * 24 })
  });

  if (!response.ok) return "";
  const payload = await response.json().catch(() => null);
  const signedUrl = payload?.signedURL || payload?.signedUrl || "";
  if (!signedUrl) return "";
  return signedUrl.startsWith("http") ? signedUrl : `${url}/storage/v1${signedUrl}`;
}

async function hydrateState(state: TryThisLookState): Promise<TryThisLookState> {
  const looks = await Promise.all(
    state.looks.map(async (look) => ({
      ...look,
      imageUrl: look.imagePath ? await getSignedUrl(look.imagePath) : look.imageUrl,
      frontImageUrl: look.frontImagePath ? await getSignedUrl(look.frontImagePath) : look.frontImageUrl,
      backImageUrl: look.backImagePath ? await getSignedUrl(look.backImagePath) : look.backImageUrl,
      garmentFrontImageUrl: look.garmentFrontImagePath ? await getSignedUrl(look.garmentFrontImagePath) : look.garmentFrontImageUrl,
      garmentBackImageUrl: look.garmentBackImagePath ? await getSignedUrl(look.garmentBackImagePath) : look.garmentBackImageUrl,
      galleryImageUrls: look.galleryImagePaths?.length
        ? await Promise.all(look.galleryImagePaths.map((path) => getSignedUrl(path)))
        : look.galleryImageUrls
    }))
  );

  const generations = await Promise.all(
    state.generations.map(async (generation) => ({
      ...generation,
      imageUrl: await getSignedUrl(generation.imagePath)
    }))
  );

  return {
    ...state,
    looks,
    generations
  };
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
    generations: state.generations ?? []
  });
}

async function writeTryThisLookState(state: TryThisLookState) {
  await ensureBucket();
  const strippedState: TryThisLookState = {
    activeLookId: state.activeLookId,
    activeLookIds: state.activeLookIds?.length ? state.activeLookIds : [state.activeLookId],
    stores: state.stores ?? [],
    looks: state.looks.map(({ imageUrl, frontImageUrl, backImageUrl, garmentFrontImageUrl, garmentBackImageUrl, galleryImageUrls, ...look }) => look),
    events: state.events.slice(0, 500),
    leads: state.leads.slice(0, 500),
    generations: state.generations.map(({ imageUrl, ...generation }) => generation).slice(0, 200)
  };

  const response = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(STATE_PATH)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-upsert": "true"
    },
    body: JSON.stringify(strippedState)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? "Try This Look state could not be saved.");
  }
}

function dataUrlToBytes(dataUrl: string) {
  const [header, base64] = dataUrl.split(",");
  const mimeType = header.match(/data:(.*);base64/)?.[1] ?? "image/png";
  if (!SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
    throw new Error("Unsupported image format. Please upload JPG, PNG, or WebP.");
  }
  const extension = mimeType.includes("jpeg") ? "jpg" : mimeType.includes("webp") ? "webp" : "png";
  return {
    bytes: Buffer.from(base64, "base64"),
    extension,
    mimeType
  };
}

export async function uploadTryThisLookImage(folder: "looks" | "generations", dataUrl: string) {
  await ensureBucket();
  const { bytes, extension, mimeType } = dataUrlToBytes(dataUrl);
  const path = `try-this-look/${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const response = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(path)}`, {
    method: "POST",
    headers: {
      "Content-Type": mimeType,
      "x-upsert": "false"
    },
    body: bytes
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? "Image could not be saved.");
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
