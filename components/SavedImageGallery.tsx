"use client";

import { getClientAccountId, getWorkspaceStorageKey } from "@/lib/client-account";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type GalleryImageItem = {
  id: string;
  type: "upload" | "cutout" | "shop-image" | "model-image";
  path: string;
  url: string;
  createdAt: string;
  name: string;
};

type ProductAssetBodyZone = "upper_body" | "lower_body" | "shoes" | "accessory" | "full_body";

type StoredProductAsset = {
  id: string;
  name: string;
  bodyZone: ProductAssetBodyZone;
  imageDataUrl: string;
  description: string;
  color?: string;
  createdAt: string;
  productGroupId?: string;
  productGroupTitle?: string;
  viewType?: "front" | "back";
  displayOrder?: number;
  sourceImageId?: string;
  sourceImageUrl?: string;
  cutoutImageUrl?: string;
  retouchedImageUrl?: string;
};

type ImageDialog = {
  title: string;
  src: string;
  checkerboard?: boolean;
};

const PRODUCT_ASSETS_STORAGE_KEY = "shopcut-ai-product-assets";
const getProductAssetsStorageKey = () => getWorkspaceStorageKey(PRODUCT_ASSETS_STORAGE_KEY);

const readJsonResponse = async <T,>(response: Response): Promise<T & { error?: string }> => {
  const text = await response.text();
  if (!text) {
    return { error: `Server returned an empty response (${response.status}). Please try again.` } as T & { error?: string };
  }

  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return { error: text.slice(0, 500) || "Server returned an invalid response. Please try again." } as T & { error?: string };
  }
};

const galleryGroups = [
  { title: "Your Designs", types: ["model-image"] as const, empty: "No Fashion Creator designs yet." },
  { title: "My Apparel", types: ["shop-image", "cutout"] as const, empty: "No Apparel assets yet." },
  { title: "Uploads", types: ["upload"] as const, empty: "No Uploads yet." },
];

const galleryLabel = (type: GalleryImageItem["type"]) => {
  if (type === "upload") return "Upload";
  if (type === "cutout") return "Cutout";
  if (type === "model-image") return "Design";
  return "Apparel";
};

const readStoredProductAssets = () => {
  try {
    const productAssetsStorageKey = getProductAssetsStorageKey();
    const storedAssets = window.localStorage.getItem(productAssetsStorageKey);
    const parsedAssets = storedAssets ? JSON.parse(storedAssets) as StoredProductAsset[] : [];
    return Array.isArray(parsedAssets) ? parsedAssets.filter((asset) => asset?.id && asset?.imageDataUrl && asset?.name) : [];
  } catch {
    window.localStorage.removeItem(getProductAssetsStorageKey());
    return [];
  }
};

export function SavedImageGallery() {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImageItem[]>([]);
  const [productAssets, setProductAssets] = useState<StoredProductAsset[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageDialog, setImageDialog] = useState<ImageDialog | null>(null);

  const loadGallery = useCallback(async (nextAccountId = accountId) => {
    if (!nextAccountId) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/gallery", {
        headers: {
          "x-shopcut-account-id": nextAccountId
        }
      });
      const payload = await readJsonResponse<{ images?: GalleryImageItem[] }>(response);
      if (!response.ok || !payload.images) throw new Error(payload.error ?? "Gallery could not be loaded.");
      setImages(payload.images);
      setProductAssets(readStoredProductAssets());
      setSelectedPaths((paths) => paths.filter((path) => payload.images?.some((image) => image.path === path)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gallery could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    const syncGallery = () => {
      const nextAccountId = getClientAccountId();
      setAccountId(nextAccountId);
      setProductAssets(readStoredProductAssets());
      setSelectedPaths([]);
      void loadGallery(nextAccountId);
    };

    syncGallery();

    const handleGalleryUpdate = () => {
      const nextAccountId = getClientAccountId();
      setAccountId(nextAccountId);
      setProductAssets(readStoredProductAssets());
      void loadGallery(nextAccountId);
    };
    window.addEventListener("shopcut-gallery-updated", handleGalleryUpdate);
    window.addEventListener("luxurybandit-auth-updated", syncGallery);
    return () => {
      window.removeEventListener("shopcut-gallery-updated", handleGalleryUpdate);
      window.removeEventListener("luxurybandit-auth-updated", syncGallery);
    };
  }, [loadGallery]);

  const deleteImage = async (path: string) => {
    if (!accountId) return;
    setDeletingPath(path);
    setError(null);

    try {
      const response = await fetch("/api/gallery", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-shopcut-account-id": accountId
        },
        body: JSON.stringify({ path })
      });
      const payload = await readJsonResponse<{ images?: GalleryImageItem[] }>(response);
      if (!response.ok || !payload.images) throw new Error(payload.error ?? "Image could not be deleted.");
      setImages(payload.images.length ? payload.images : (currentImages) => currentImages.filter((image) => image.path !== path));
      setSelectedPaths((paths) => paths.filter((selectedPath) => selectedPath !== path));
      window.dispatchEvent(new Event("shopcut-gallery-updated"));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Image could not be deleted.");
    } finally {
      setDeletingPath(null);
    }
  };

  const toggleSelectedPath = (path: string) => {
    setSelectedPaths((paths) => (paths.includes(path) ? paths.filter((selectedPath) => selectedPath !== path) : [...paths, path]));
  };

  const deleteSelectedImages = async () => {
    if (!accountId || selectedPaths.length === 0) return;
    setIsDeletingSelected(true);
    setError(null);

    try {
      for (const path of selectedPaths) {
        const response = await fetch("/api/gallery", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-shopcut-account-id": accountId
          },
          body: JSON.stringify({ path })
        });
        const payload = await readJsonResponse<{ images?: GalleryImageItem[] }>(response);
        if (!response.ok || !payload.images) throw new Error(payload.error ?? "Selected images could not be deleted.");
      }
      setImages((currentImages) => currentImages.filter((image) => !selectedPaths.includes(image.path)));
      setSelectedPaths([]);
      await loadGallery();
      window.dispatchEvent(new Event("shopcut-gallery-updated"));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Selected images could not be deleted.");
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const productAssetGroups = productAssets.reduce<StoredProductAsset[][]>((groups, asset) => {
    const groupKey = asset.productGroupId || asset.imageDataUrl;
    const existingGroup = groups.find((group) => (group[0]?.productGroupId || group[0]?.imageDataUrl) === groupKey);
    if (existingGroup) {
      existingGroup.push(asset);
    } else {
      groups.push([asset]);
    }
    return groups;
  }, []).sort((a, b) => Date.parse(b[0]?.createdAt ?? "") - Date.parse(a[0]?.createdAt ?? ""));

  const deleteProductAssetGroup = (group: StoredProductAsset[]) => {
    const groupIds = new Set(group.map((asset) => asset.id));
    const nextAssets = productAssets.filter((asset) => !groupIds.has(asset.id));
    window.localStorage.setItem(getProductAssetsStorageKey(), JSON.stringify(nextAssets));
    setProductAssets(nextAssets);
    window.dispatchEvent(new Event("shopcut-gallery-updated"));
  };

  if (images.length === 0 && productAssets.length === 0) return null;

  return (
    <>
      <div className="rounded-md border-2 border-cobalt/25 bg-white p-3 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-black text-ink">Saved image gallery</div>
            <p className="mt-1 text-sm font-bold leading-6 text-ink/55">
              Supabase cloud storage: uploads, apparel assets, and Fashion Creator designs from this browser account.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsOpen((open) => !open)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-ink px-3 text-xs font-black text-white"
            >
              {isOpen ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              {isOpen ? "Close gallery" : "Open gallery"}
            </button>
            <button
              type="button"
              onClick={() => void loadGallery()}
              disabled={isLoading}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-black/10 bg-panel px-3 text-xs font-black text-ink disabled:opacity-45"
            >
              {isLoading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              Refresh
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-3 rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-bold leading-6 text-coral">
            {error}
          </p>
        )}
        {isOpen && (
          <div className="mt-3 grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-black/10 bg-panel p-2">
              <div className="text-xs font-black text-ink/60">
                {selectedPaths.length > 0 ? `${selectedPaths.length} selected` : "Select images to delete more than one at once."}
              </div>
              <button
                type="button"
                onClick={() => void deleteSelectedImages()}
                disabled={selectedPaths.length === 0 || isDeletingSelected}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-red-600 px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeletingSelected ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Trash2 aria-hidden="true" className="h-4 w-4" />}
                Delete selected
              </button>
            </div>
            {galleryGroups.map((group) => {
              const isApparelGroup = group.title === "My Apparel";
              const groupImages = images.filter((item) => group.types.some((type) => type === item.type));
              const visibleGroupImages = isApparelGroup && productAssetGroups.length > 0
                ? groupImages.filter((item) => item.type === "cutout")
                : groupImages;
              const itemCount = isApparelGroup && productAssetGroups.length > 0
                ? productAssetGroups.length + visibleGroupImages.length
                : visibleGroupImages.length;
              return (
                <section key={group.title} className="rounded-md border border-black/10 bg-panel p-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black uppercase tracking-[0.14em] text-ink/60">{group.title}</h3>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-ink/50">{itemCount}</span>
                  </div>
                  {itemCount > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                      {isApparelGroup && productAssetGroups.map((assetGroup) => {
                        const firstAsset = assetGroup[0];
                        if (!firstAsset) return null;
                        const sortedAssetGroup = [...assetGroup].sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
                        const hasMultipleViews = sortedAssetGroup.some((asset) => asset.viewType) && sortedAssetGroup.length > 1;
                        return (
                          <div key={firstAsset.productGroupId || firstAsset.imageDataUrl} className="rounded-md border border-black/10 bg-white p-2">
                            <button
                              type="button"
                              onClick={() =>
                                setImageDialog({
                                  title: firstAsset.productGroupTitle || `${assetGroup.length} Apparel item${assetGroup.length === 1 ? "" : "s"}`,
                                  src: firstAsset.imageDataUrl
                                })
                              }
                              className="block w-full overflow-hidden rounded-md border border-black/10 bg-white text-left focus:outline-none focus:ring-2 focus:ring-cobalt"
                              title="Open apparel group"
                            >
                              {hasMultipleViews ? (
                                <div className="grid aspect-square w-full grid-cols-2 gap-1 p-1">
                                  {sortedAssetGroup.slice(0, 2).map((asset) => (
                                    <div key={asset.id} className="relative overflow-hidden rounded border border-black/10 bg-panel">
                                      <img src={asset.imageDataUrl} alt={`${asset.viewType ?? "apparel"} view`} className="h-full w-full object-contain" />
                                      <span className="absolute bottom-1 left-1 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
                                        {asset.viewType ?? "View"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <img
                                  src={firstAsset.imageDataUrl}
                                  alt="Saved Apparel group"
                                  className="aspect-square w-full object-contain"
                                />
                              )}
                            </button>
                            <div className="mt-2 flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                {hasMultipleViews && (
                                  <span className="mb-1 inline-flex rounded-full bg-cobalt/10 px-2 py-1 text-[10px] font-black uppercase tracking-normal text-cobalt">
                                    {sortedAssetGroup.length} views
                                  </span>
                                )}
                                <span className="block text-xs font-black text-ink/70">
                                  {firstAsset.productGroupTitle || `${assetGroup.length} Apparel item${assetGroup.length === 1 ? "" : "s"}`}
                                </span>
                                <span className="mt-1 block truncate text-xs font-bold text-ink/45">
                                  {sortedAssetGroup.map((asset) => asset.viewType ? `${asset.viewType}: ${asset.name}` : asset.name).join(", ")}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteProductAssetGroup(assetGroup)}
                                className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-red-600"
                              >
                                <Trash2 aria-hidden="true" className="h-3 w-3" />
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {visibleGroupImages.map((item) => (
                        <div key={item.id} className={`rounded-md border p-2 ${selectedPaths.includes(item.path) ? "border-cobalt bg-cobalt/10" : "border-black/10 bg-white"}`}>
                          <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs font-black text-ink">
                            <input
                              type="checkbox"
                              checked={selectedPaths.includes(item.path)}
                              onChange={() => toggleSelectedPath(item.path)}
                              className="h-4 w-4 accent-cobalt"
                            />
                            Select
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setImageDialog({
                                title: `Saved ${galleryLabel(item.type)}`,
                                src: item.url,
                                checkerboard: item.type === "cutout"
                              })
                            }
                            className={`block w-full overflow-hidden rounded-md border border-black/10 text-left focus:outline-none focus:ring-2 focus:ring-cobalt ${
                              item.type === "cutout" ? "checkerboard" : "bg-white"
                            }`}
                            title="Open saved image"
                          >
                            <img
                              src={item.url}
                              alt={`Saved ${galleryLabel(item.type)}`}
                              className="aspect-square w-full object-contain"
                            />
                          </button>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-ink/60">
                              {galleryLabel(item.type)}
                            </span>
                            <button
                              type="button"
                              onClick={() => void deleteImage(item.path)}
                              disabled={deletingPath === item.path}
                              className="inline-flex items-center gap-1 text-xs font-black text-red-600 disabled:opacity-45"
                            >
                              {deletingPath === item.path ? <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" /> : <Trash2 aria-hidden="true" className="h-3 w-3" />}
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-md border border-black/10 bg-white p-3 text-sm font-bold text-ink/45">{group.empty}</p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
      {imageDialog && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setImageDialog(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-md bg-white px-3 py-2 text-sm font-black text-ink"
            onClick={() => setImageDialog(null)}
          >
            Close
          </button>
          <div className="grid max-h-[92vh] max-w-[92vw] gap-3 rounded-md bg-white p-3" onClick={(event) => event.stopPropagation()}>
            <div className="text-sm font-black text-ink">{imageDialog.title}</div>
            <div className={`overflow-auto rounded-md border border-black/10 ${imageDialog.checkerboard ? "checkerboard" : "bg-panel"}`}>
              <img src={imageDialog.src} alt={imageDialog.title} className="max-h-[82vh] max-w-[88vw] object-contain" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
