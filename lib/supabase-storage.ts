import { compressImage } from "@/lib/image-compress";

export type GalleryImageType = "upload" | "cutout" | "shop-image" | "model-image";

export type GalleryImageItem = {
  id: string;
  type: GalleryImageType;
  path: string;
  url: string;
  createdAt: string;
  name: string;
};

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "shopcut-images";

function getSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "");
  const url = rawUrl ? (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`).replace(/\/$/, "") : "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.");
  }

  if (url.includes("dein-projekt.supabase.co") || url.includes("your-project.supabase.co")) {
    throw new Error("Supabase URL is still a placeholder. Replace NEXT_PUBLIC_SUPABASE_URL in .env.local with your real Supabase Project URL.");
  }

  return { url, serviceRoleKey };
}

function encodeStoragePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  try {
    return await fetch(`${url}${path}`, {
      ...init,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        ...(init.headers ?? {})
      }
    });
  } catch {
    throw new Error("Supabase could not be reached. Check NEXT_PUBLIC_SUPABASE_URL in .env.local and restart the server.");
  }
}

export async function ensureGalleryBucket() {
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

export async function uploadGalleryImage(accountId: string, type: GalleryImageType, dataUrl: string) {
  await ensureGalleryBucket();

  const [header, base64] = dataUrl.split(",");
  const rawMime = header.match(/data:(.*);base64/)?.[1] ?? "image/png";
  const { buffer: bytes, mimeType, extension } = await compressImage(base64, rawMime);
  const folder = type === "upload" ? "uploads" : type === "cutout" ? "cutouts" : type === "model-image" ? "model-images" : "shop-images";
  const path = `${accountId}/${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

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
    throw new Error(payload?.message ?? "Image could not be saved to Supabase.");
  }

  return path;
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

async function listFolder(accountId: string, type: GalleryImageType) {
  await ensureGalleryBucket();

  const folder = type === "upload" ? "uploads" : type === "cutout" ? "cutouts" : type === "model-image" ? "model-images" : "shop-images";
  const prefix = `${accountId}/${folder}`;
  const response = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prefix,
      limit: 30,
      offset: 0,
      sortBy: {
        column: "created_at",
        order: "desc"
      }
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? "Supabase gallery could not be loaded.");
  }

  const files = (await response.json()) as Array<{ name?: string; created_at?: string; updated_at?: string }>;
  return Promise.all(
    files
      .filter((file) => file.name && !file.name.endsWith("/"))
      .map(async (file) => {
        const path = `${prefix}/${file.name}`;
        return {
          id: path,
          type,
          path,
          url: await getSignedUrl(path),
          createdAt: file.created_at ?? file.updated_at ?? new Date().toISOString(),
          name: file.name ?? "image"
        } satisfies GalleryImageItem;
      })
  );
}

export async function listGalleryImages(accountId: string) {
  const [uploads, cutouts, shopImages, modelImages] = await Promise.all([
    listFolder(accountId, "upload"),
    listFolder(accountId, "cutout"),
    listFolder(accountId, "shop-image"),
    listFolder(accountId, "model-image")
  ]);
  return [...uploads, ...cutouts, ...shopImages, ...modelImages].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function deleteGalleryImage(path: string) {
  await ensureGalleryBucket();

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
    throw new Error(payload?.message ?? "Image could not be deleted from Supabase.");
  }
}
