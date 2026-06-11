"use client";

export const dynamic = "force-dynamic";

import CropModal from "@/components/CropModal";
import GarmentExtractorModal from "@/components/GarmentExtractorModal";
import { ArrowLeft, ArrowRight, Camera, Check, Eye, EyeOff, Ghost, ImagePlus, Images, Layers, Loader2, PackageCheck, Pencil, RefreshCw, Scissors, Sparkles, Star, StarOff, Tag, Trash2, UserRound } from "lucide-react";
import NextImage from "next/image";
import Link from "next/link";
import { ChangeEvent, RefObject, useEffect, useRef, useState } from "react";

function inferGarmentCategory(look: { name?: string; productNote?: string; hashtags?: string }): "tops" | "bottoms" | "one-pieces" | "lingerie" {
  const text = [look.name, look.productNote, look.hashtags].filter(Boolean).join(" ").toLowerCase();
  if (/\b(lingerie|bra|bralette|corset|bustier|panty|panties|thong|g-string|string|garter|garter belt|stocking|stockings|suspender|underwear|slip|negligee|babydoll|teddy|lace set|sexy set)\b/.test(text)) return "lingerie";
  if (/\b(dress|jumpsuit|romper|bodysuit|catsuit|one.piece|playsuit|overall)\b/.test(text)) return "one-pieces";
  if (/\b(skirt|pants|shorts|jeans|trousers|leggings|chinos|culotte)\b/.test(text)) return "bottoms";
  return "tops";
}

type Look = {
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
  dealEndsAt?: string;
  inStock?: boolean;
  published?: boolean;
  availabilityNote?: string;
  deliveryTime?: string;
  productNote?: string;
  hashtags?: string;
  productType?: "real" | "virtual";
  createdAt: string;
  imageUrl: string;
  frontImageUrl?: string;
  frontImagePath?: string;
  backImageUrl?: string;
  garmentFrontImageUrl?: string;
  garmentBackImageUrl?: string;
  galleryImageUrls?: string[];
  galleryImagePaths?: string[];
};

// Stable gallery entry: existing images have storagePath, new uploads are data URLs
type GalleryEntry = {
  key: string;          // storagePath for existing, temp id for new
  url: string;          // signed URL or data URL
  storagePath?: string; // stable backend path (only for existing images)
  isNew: boolean;
};

type Store = {
  id: string;
  name: string;
  slug: string;
  address?: string;
  whatsappNumber?: string;
  ownerUserId?: string;
  ownerEmail?: string;
  aiEnabled?: boolean;
  aiCreditsLimit?: number;
  aiCreditsUsed?: number;
  pendingAiRequest?: boolean;
  createdAt: string;
};

type Lead = {
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
  uploadedPhotoUrl?: string;
  status?: "new" | "contacted" | "closed";
  createdAt: string;
};

type Generation = {
  id: string;
  lookId: string;
  visitorId?: string;
  storeName?: string;
  lookName?: string;
  customerName?: string;
  imageUrl?: string;
  hidden?: boolean;
  createdAt: string;
};

type AdminPayload = {
  activeLook?: Look;
  activeLooks?: Look[];
  stores?: Store[];
  looks?: Look[];
  events?: Array<{ id: string; name: string; lookId: string; createdAt: string; selectedSize?: string; storeName?: string; lookName?: string }>;
  leads?: Lead[];
  generations?: Generation[];
  error?: string;
};

const normalizeImageUrl = (value = "") => {
  if (!value) return "";
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split("?")[0] ?? value;
  }
};

const uniqueImageUrls = (images: string[]) => {
  const seen = new Set<string>();
  return images.flatMap((image) => {
    const key = image.startsWith("data:image/") ? image : normalizeImageUrl(image);
    if (!image || seen.has(key)) return [];
    seen.add(key);
    return [image];
  });
};

const getVisibleLookImages = (look?: Pick<Look, "frontImageUrl" | "imageUrl" | "galleryImageUrls"> | null) => {
  const images = [
    look?.frontImageUrl ?? look?.imageUrl,
    ...(look?.galleryImageUrls ?? [])
  ].filter(Boolean) as string[];
  return uniqueImageUrls(images).slice(0, 10);
};

// Build stable GalleryEntry list from a Look, using storagePaths as keys.
//
// IMPORTANT: The API's serializeLook returns:
//   galleryImageUrls = [frontUrl, g1Url, g2Url, ...]  (front is always at index 0)
//   galleryImagePaths = [g1Path, g2Path, ...]          (front is excluded)
// → The arrays are offset by 1. We must skip galleryImageUrls[0] when pairing with paths.
const buildGalleryEntries = (look: Look): GalleryEntry[] => {
  const frontPath = look.frontImagePath;
  const frontUrl = look.frontImageUrl ?? look.imageUrl;
  const galleryPaths = look.galleryImagePaths ?? [];
  const galleryUrls = look.galleryImageUrls ?? [];

  // When frontPath exists, galleryImageUrls[0] = frontUrl and gallery entries start at [1]
  const urlOffset = frontPath ? 1 : 0;

  const entries: GalleryEntry[] = [];
  if (frontPath && frontUrl) {
    entries.push({ key: frontPath, url: frontUrl, storagePath: frontPath, isNew: false });
  }
  for (let i = 0; i < galleryPaths.length; i++) {
    const path = galleryPaths[i];
    const url = galleryUrls[i + urlOffset] ?? "";
    if (path && url && path !== frontPath) {
      entries.push({ key: path, url, storagePath: path, isNew: false });
    }
  }
  // Fallback: no stable path info → use visible URL list
  if (entries.length === 0) {
    getVisibleLookImages(look).forEach((url, i) => {
      entries.push({ key: `url-${i}-${url.slice(-16)}`, url, isNew: false });
    });
  }
  return entries.slice(0, 6);
};

const ADMIN_PIN_KEY = "luxurybandit-try-look-admin-pin";
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SUPPORTED_IMAGE_MESSAGE = "Unsupported image format. Please upload JPG, PNG, or WebP.";

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Image could not be read."));
    reader.readAsDataURL(file);
  });

const validateImageFile = (file: File) => {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(SUPPORTED_IMAGE_MESSAGE);
  }
};

const readJsonResponse = async <T,>(response: Response): Promise<T & { error?: string }> => {
  const text = await response.text();
  if (!text) return { error: `Server returned an empty response (${response.status}).` } as T & { error?: string };
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return { error: text.slice(0, 500) || "Server returned an invalid response." } as T & { error?: string };
  }
};

const dataUrlToBlob = (dataUrl: string) => {
  const [header, base64] = dataUrl.split(",");
  const mimeType = header.match(/data:(.*?);base64/)?.[1] ?? "image/png";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
};

const imageUrlToBlob = async (imageUrl: string) => {
  if (imageUrl.startsWith("data:image/")) return dataUrlToBlob(imageUrl);
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("Reference image could not be loaded.");
  return response.blob();
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Image could not be prepared."));
    reader.readAsDataURL(blob);
  });

// ── Seller AI Row component ────────────────────────────────────────────────
function SellerAiRow({
  store,
  pin,
  onUpdated,
}: {
  store: Store;
  pin: string;
  onUpdated: () => void;
}) {
  const [limit, setLimit] = useState(String(store.aiCreditsLimit ?? 20));
  const [saving, setSaving] = useState(false);

  const update = async (fields: { aiEnabled?: boolean; resetCredits?: boolean; aiCreditsLimit?: number }) => {
    setSaving(true);
    try {
      await fetch("/api/try-this-look", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(pin ? { "x-try-look-admin-pin": pin } : {}),
        },
        body: JSON.stringify({ action: "update-seller", storeSlug: store.slug, ...fields }),
      });
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  const used = store.aiCreditsUsed ?? 0;
  const lim = store.aiCreditsLimit ?? 0;

  return (
    <div className={`rounded-lg border p-3 ${store.pendingAiRequest && !store.aiEnabled ? "border-amber-300 bg-amber-50" : "border-black/10 bg-panel"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-ink">{store.name}</span>
            {store.pendingAiRequest && !store.aiEnabled && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">AI request pending</span>
            )}
            {store.aiEnabled && (
              <span className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-black text-white">AI active</span>
            )}
          </div>
          <div className="text-xs font-bold text-ink/40 mt-0.5">
            {store.ownerEmail ?? store.slug}
            {store.aiEnabled && lim > 0 && (
              <span className="ml-2 font-black text-ink/60">{used}/{lim} credits</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Credit limit input */}
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="h-8 w-20 rounded-md border border-black/10 bg-white px-2 text-sm font-bold outline-none focus:border-cobalt"
            min={0}
            max={999}
          />
          <span className="text-xs font-bold text-ink/40">credits</span>
          {/* Toggle AI */}
          <button
            type="button"
            disabled={saving}
            onClick={() => update({ aiEnabled: !store.aiEnabled, aiCreditsLimit: Number(limit) || 20 })}
            className={`h-8 rounded-md px-3 text-xs font-black disabled:opacity-50 ${
              store.aiEnabled
                ? "border border-coral/30 bg-coral/10 text-coral"
                : "bg-ink text-white"
            }`}
          >
            {saving ? "…" : store.aiEnabled ? "Disable AI" : "Enable AI"}
          </button>
          {/* Reset credits */}
          {store.aiEnabled && (
            <button
              type="button"
              disabled={saving}
              onClick={() => update({ resetCredits: true, aiCreditsLimit: Number(limit) || lim })}
              className="h-8 rounded-md border border-black/10 bg-white px-3 text-xs font-black text-ink/60 disabled:opacity-50"
            >
              Reset
            </button>
          )}
        </div>
      </div>
      {store.aiEnabled && lim > 0 && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-cobalt transition-all"
            style={{ width: `${Math.min(100, (used / lim) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

const parsePriceNumber = (value: string) => {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

const calculateDiscountLabel = (regularPrice: string, actionPrice: string) => {
  const regular = parsePriceNumber(regularPrice);
  const action = parsePriceNumber(actionPrice);
  if (!regular || !action || action >= regular) return "";
  return `-${Math.round(((regular - action) / regular) * 100)}%`;
};

type LookFormProps = {
  mode: "create" | "edit";
  look?: Look;
  frontFileInputRef: RefObject<HTMLInputElement | null>;
  backFileInputRef: RefObject<HTMLInputElement | null>;
  garmentFrontFileInputRef: RefObject<HTMLInputElement | null>;
  garmentBackFileInputRef: RefObject<HTMLInputElement | null>;
  galleryFileInputRef: RefObject<HTMLInputElement | null>;
  frontImage: string | null;
  backImage: string | null;
  garmentFrontImage: string | null;
  garmentBackImage: string | null;
  galleryImages: GalleryEntry[];
  lookName: string;
  campaignName: string;
  availableSizes: string;
  price: string;
  salePrice: string;
  discountLabel: string;
  dealEndsAt: string;
  inStock: boolean;
  availabilityNote: string;
  deliveryTime: string;
  productNote: string;
  hashtags: string;
  productType: "real" | "virtual";
  onProductTypeChange: (value: "real" | "virtual") => void;
  isSaving: boolean;
  isGeneratingDescription?: boolean;
  sellerSlug?: string;
  stores?: Store[];
  onSellerSlugChange?: (slug: string) => void;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>, view: "front" | "back" | "garment-front" | "garment-back") => void;
  onGalleryUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearGallery: () => void;
  onRemoveGalleryImage: (key: string) => void;
  onMoveGalleryImage: (index: number, direction: -1 | 1) => void;
  onCropGalleryImage?: (key: string, url: string) => void;
  onPreviewGalleryImage?: (image: string) => void;
  onOpenAiTool?: () => void;
  onOpenExtractor?: () => void;
  onLookNameChange: (value: string) => void;
  onCampaignNameChange: (value: string) => void;
  onAvailableSizesChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onSalePriceChange: (value: string) => void;
  onDiscountLabelChange: (value: string) => void;
  onDealEndsAtChange: (value: string) => void;
  onInStockChange: (value: boolean) => void;
  onAvailabilityNoteChange: (value: string) => void;
  onDeliveryTimeChange: (value: string) => void;
  onProductNoteChange: (value: string) => void;
  onHashtagsChange: (value: string) => void;
  onGenerateDescription?: () => void;
  onSubmit: () => void;
  onSubmitDraft?: () => void;
  onCancel?: () => void;
};

function LookForm({
  mode,
  look,
  frontFileInputRef,
  backFileInputRef,
  garmentFrontFileInputRef,
  garmentBackFileInputRef,
  galleryFileInputRef,
  frontImage,
  backImage,
  garmentFrontImage,
  garmentBackImage,
  galleryImages,
  lookName,
  campaignName,
  availableSizes,
  price,
  salePrice,
  discountLabel,
  dealEndsAt,
  inStock,
  availabilityNote,
  deliveryTime,
  productNote,
  hashtags,
  isSaving,
  isGeneratingDescription = false,
  sellerSlug,
  stores,
  onSellerSlugChange,
  onImageUpload,
  onGalleryUpload,
  onClearGallery,
  onRemoveGalleryImage,
  onMoveGalleryImage,
  onCropGalleryImage,
  onPreviewGalleryImage,
  onOpenAiTool,
  onOpenExtractor,
  onLookNameChange,
  onCampaignNameChange,
  onAvailableSizesChange,
  onPriceChange,
  onSalePriceChange,
  onDiscountLabelChange,
  onDealEndsAtChange,
  onInStockChange,
  onAvailabilityNoteChange,
  onDeliveryTimeChange,
  onProductNoteChange,
  onHashtagsChange,
  productType,
  onProductTypeChange,
  onGenerateDescription,
  onSubmit,
  onSubmitDraft,
  onCancel
}: LookFormProps) {
  const isEdit = mode === "edit";
  const currentGalleryEntries = look ? buildGalleryEntries(look) : [];
  const galleryEntriesToShow = galleryImages.length ? galleryImages : currentGalleryEntries;
  const aiTileAvailable = isEdit && Boolean(onOpenAiTool) && galleryEntriesToShow.length > 0;
  const showAiImageTile = Boolean(onOpenAiTool) || !isEdit;

  return (
    <div className="grid content-start gap-3">
      <input ref={frontFileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => onImageUpload(event, "front")} />
      <input ref={galleryFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onGalleryUpload} />

      {/* Seller assignment — only shown in edit mode when stores are available */}
      {stores && onSellerSlugChange && (
        <div className="grid gap-1.5">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Seller</div>
          <select
            value={sellerSlug ?? ""}
            onChange={(e) => onSellerSlugChange(e.target.value)}
            className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm font-bold text-ink"
          >
            <option value="">— No seller assigned —</option>
            {stores.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name} ({s.slug})</option>
            ))}
          </select>
        </div>
      )}

      <p className="text-xs font-bold text-ink/40">
        Upload up to 10 photos. First image = main. Move left/right to reorder.
      </p>

      <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">Product gallery</div>
              <div className="text-sm font-bold text-ink/55">
                {galleryEntriesToShow.length
                  ? `${galleryEntriesToShow.length} / 10 photos`
                  : "No photos yet — add up to 10"}
              </div>
            </div>
            {galleryEntriesToShow.length > 0 && (
              <button
                type="button"
                onClick={onClearGallery}
                className="h-9 rounded-md border border-coral/30 bg-coral/10 px-3 text-xs font-black text-coral"
              >
                Clear gallery
              </button>
            )}
          </div>
          {(galleryEntriesToShow.length > 0 || galleryEntriesToShow.length < 10 || onOpenAiTool) ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {galleryEntriesToShow.slice(0, 10).map((entry, index) => (
                <div key={entry.key} className="relative overflow-hidden rounded border border-black/10 bg-panel">
                  <button
                    type="button"
                    onClick={() => onPreviewGalleryImage?.(entry.url)}
                    className="block w-full"
                    aria-label={`Open gallery image ${index + 1}`}
                  >
                    <img src={entry.url} alt="" className="aspect-square w-full rounded border border-black/10 bg-panel object-cover object-top" />
                  </button>
                  {index === 0 && (
                    <div className="absolute left-1 top-1 rounded-full bg-cobalt px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-white">
                      Main
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveGalleryImage(entry.key)}
                    className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full border border-white/80 bg-black/70 text-xs font-black text-white shadow-soft"
                    aria-label={`Remove gallery image ${index + 1}`}
                  >
                    ×
                  </button>
                  <div className={`absolute inset-x-1 bottom-1 grid gap-1 ${onCropGalleryImage ? "grid-cols-3" : "grid-cols-2"}`}>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => onMoveGalleryImage(index, -1)}
                      className="grid h-7 place-items-center rounded bg-white/90 text-ink shadow-soft disabled:opacity-35"
                      aria-label={`Move gallery image ${index + 1} left`}
                    >
                      <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                    {onCropGalleryImage && (
                      <button
                        type="button"
                        onClick={() => onCropGalleryImage(entry.key, entry.url)}
                        className="grid h-7 place-items-center rounded bg-white/90 text-ink shadow-soft"
                        aria-label={`Crop gallery image ${index + 1}`}
                      >
                        <Scissors aria-hidden="true" className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={index === galleryEntriesToShow.length - 1}
                      onClick={() => onMoveGalleryImage(index, 1)}
                      className="grid h-7 place-items-center rounded bg-white/90 text-ink shadow-soft disabled:opacity-35"
                      aria-label={`Move gallery image ${index + 1} right`}
                    >
                      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {galleryEntriesToShow.length < 10 && Array.from({ length: 10 - galleryEntriesToShow.length }).map((_, i) => (
                <button
                  key={`placeholder-${i}`}
                  type="button"
                  onClick={() => galleryFileInputRef.current?.click()}
                  className="grid aspect-square place-items-center rounded border border-dashed border-black/20 bg-white/60 text-center text-ink/30 transition hover:border-cobalt/40 hover:bg-cobalt/5 hover:text-cobalt"
                  aria-label={`Add photo ${galleryEntriesToShow.length + i + 1}`}
                >
                  <span className="grid gap-1">
                    <ImagePlus aria-hidden="true" className="mx-auto h-5 w-5" />
                    <span className="text-[9px] font-black uppercase tracking-[0.08em]">{galleryEntriesToShow.length + i + 1}</span>
                  </span>
                </button>
              ))}
              {onOpenExtractor && (
                <button
                  type="button"
                  onClick={onOpenExtractor}
                  className="grid aspect-square place-items-center rounded border border-dashed border-amber-400/60 bg-amber-50 p-2 text-center text-amber-700 transition hover:bg-amber-100"
                >
                  <span className="grid gap-1">
                    <Scissors aria-hidden="true" className="mx-auto h-5 w-5" />
                    <span className="text-[9px] font-black uppercase tracking-[0.08em]">Upload &amp;</span>
                    <span className="text-[9px] font-black uppercase tracking-[0.08em]">Extract</span>
                    <span className="text-[9px] font-bold leading-3 text-amber-600/70">Clothes</span>
                  </span>
                </button>
              )}
              {showAiImageTile && (
                aiTileAvailable ? (
                  <button
                    type="button"
                    onClick={onOpenAiTool}
                    className="grid aspect-square place-items-center rounded border border-dashed border-cobalt/45 bg-cobalt/10 p-2 text-center text-cobalt transition hover:bg-cobalt/15"
                  >
                    <span className="grid gap-1">
                      <Sparkles aria-hidden="true" className="mx-auto h-5 w-5" />
                      <span className="text-[9px] font-black uppercase tracking-[0.08em]">LuxbanditFit</span>
                      <span className="text-[9px] font-bold leading-3 text-ink/50">Generate</span>
                    </span>
                  </button>
                ) : (
                  <div className="grid aspect-square place-items-center rounded border border-dashed border-black/15 bg-panel p-2 text-center text-ink/30">
                    <span className="grid gap-1">
                      <Sparkles aria-hidden="true" className="mx-auto h-5 w-5" />
                      <span className="text-[9px] font-black uppercase tracking-[0.08em]">LuxbanditFit</span>
                      <span className="text-[9px] font-bold leading-3">Save first</span>
                    </span>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-black/15 bg-panel p-3 text-xs font-bold text-ink/45">
              No gallery images yet.
            </div>
          )}
      </div>

      {onGenerateDescription && (
        <button
          type="button"
          onClick={onGenerateDescription}
          disabled={isGeneratingDescription}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-cobalt/25 bg-cobalt/10 px-4 text-sm font-black text-cobalt disabled:cursor-wait disabled:opacity-60"
        >
          {isGeneratingDescription ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden="true" className="h-4 w-4" />}
          {isGeneratingDescription ? "Generating…" : "Generate AI title, description + hashtags"}
        </button>
      )}
      <input
        value={lookName}
        onChange={(event) => onLookNameChange(event.target.value)}
        placeholder="Public look name, e.g. LuxuryBandit Leopard Look"
        className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
      />
      <input
        value={campaignName}
        onChange={(event) => onCampaignNameChange(event.target.value)}
        placeholder="Campaign name, e.g. June Instagram Drop"
        className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
      />
      <input
        value={availableSizes}
        onChange={(event) => onAvailableSizesChange(event.target.value)}
        placeholder="Available sizes, e.g. XS, S, M, L"
        className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
      />
      <div className="flex h-12 items-center overflow-hidden rounded-md border border-black/10 bg-panel focus-within:border-cobalt">
        <input
          value={price.replace(/\s*(eur|€)/i, "").trim()}
          onChange={(event) => onPriceChange(event.target.value)}
          onBlur={(event) => {
            const v = event.target.value.trim();
            if (v && !/eur|€/i.test(v)) onPriceChange(v + " EUR");
          }}
          placeholder="Regular price, e.g. 189"
          className="h-full flex-1 bg-transparent px-3 text-sm font-bold outline-none"
        />
        <span className="select-none border-l border-black/10 px-3 text-sm font-black text-ink/45">EUR</span>
      </div>
      <div className="flex h-12 items-center overflow-hidden rounded-md border border-black/10 bg-panel focus-within:border-cobalt">
        <input
          value={salePrice.replace(/\s*(eur|€)/i, "").trim()}
          onChange={(event) => onSalePriceChange(event.target.value)}
          onBlur={(event) => {
            const v = event.target.value.trim();
            if (v && !/eur|€/i.test(v)) onSalePriceChange(v + " EUR");
          }}
          placeholder="Sale price optional, e.g. 129"
          className="h-full flex-1 bg-transparent px-3 text-sm font-bold outline-none"
        />
        <span className="select-none border-l border-black/10 px-3 text-sm font-black text-ink/45">EUR</span>
      </div>
      <input
        value={discountLabel}
        onChange={(event) => onDiscountLabelChange(event.target.value)}
        placeholder="Auto calculated deal label, e.g. -30%"
        className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
      />
      <input
        type="datetime-local"
        value={dealEndsAt}
        onChange={(event) => onDealEndsAtChange(event.target.value)}
        className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
      />
      <label className="flex items-center gap-3 px-1 py-1 text-sm font-bold text-ink">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(event) => onInStockChange(event.target.checked)}
          className="h-4 w-4 accent-cobalt"
        />
        <span>In stock now</span>
      </label>
      <input
        value={availabilityNote}
        onChange={(event) => onAvailabilityNoteChange(event.target.value)}
        inputMode="numeric"
        placeholder="Available in, e.g. 14"
        className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
      />
      <input
        value={deliveryTime}
        onChange={(event) => onDeliveryTimeChange(event.target.value)}
        inputMode="numeric"
        placeholder="Delivery time in days, e.g. 3"
        className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
      />
      <textarea
        value={productNote}
        onChange={(event) => onProductNoteChange(event.target.value)}
        placeholder="Product note optional, e.g. Limited drop, handmade, available this week."
        className="min-h-24 rounded-md border border-black/10 bg-panel p-3 text-sm font-bold outline-none focus:border-cobalt"
      />
      {/* Product type */}
      <div className="grid gap-1.5">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Product type</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onProductTypeChange("real")}
            className={`flex h-11 items-center justify-center gap-2 rounded-md border-2 text-sm font-black transition-all ${productType === "real" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-black/10 bg-panel text-ink/50"}`}
          >
            <span className="text-base">🏪</span> Real product
          </button>
          <button
            type="button"
            onClick={() => onProductTypeChange("virtual")}
            className={`flex h-11 items-center justify-center gap-2 rounded-md border-2 text-sm font-black transition-all ${productType === "virtual" ? "border-cobalt bg-cobalt/10 text-cobalt" : "border-black/10 bg-panel text-ink/50"}`}
          >
            <span className="text-base">✨</span> AI / Virtual
          </button>
        </div>
        <p className="text-xs font-bold text-ink/35">
          {productType === "real" ? "Physical item — can be ordered and delivered." : "AI-generated or virtual fashion — for inspiration only."}
        </p>
      </div>

      <div className="grid gap-1.5">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-ink/45"># Hashtags</div>
        <textarea
          value={hashtags}
          onChange={(event) => onHashtagsChange(event.target.value)}
          placeholder="#vintage #luxury #fashion #style — AI fills these automatically"
          rows={2}
          className="rounded-md border border-black/10 bg-panel p-3 text-sm font-bold outline-none focus:border-cobalt"
        />
        <p className="text-xs font-bold text-ink/35">Used for Instagram captions and search. Auto-filled by AI button above.</p>
      </div>
      <div className={`flex flex-col gap-2`}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSaving}
          className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-50 ${isEdit ? "bg-cobalt" : "bg-coral"}`}
        >
          {isSaving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden="true" className="h-4 w-4" />}
          {isEdit ? "Save changes" : "Save and publish"}
        </button>
        {!isEdit && onSubmitDraft && (
          <button
            type="button"
            onClick={onSubmitDraft}
            disabled={isSaving}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-black/15 bg-panel px-4 text-sm font-black text-ink disabled:opacity-50"
          >
            Save as draft
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="inline-flex h-11 w-full items-center justify-center rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ── Community Moderation Section ─────────────────────────────────────────────
function CommunityModerationSection({
  generations,
  isSaving,
  onToggleHide,
  onDelete,
  onBulkAction,
  onDataRefresh,
}: {
  generations: Generation[];
  isSaving: boolean;
  onToggleHide: (g: Generation) => Promise<void>;
  onDelete: (g: Generation) => Promise<void>;
  onBulkAction: (body: Record<string, unknown>) => Promise<unknown>;
  onDataRefresh: () => void;
}) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const visibleGenerations = showHidden
    ? generations.filter(g => g.hidden)
    : generations.filter(g => !g.hidden);

  const hiddenCount = generations.filter(g => g.hidden).length;
  const visibleCount = generations.filter(g => !g.hidden).length;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };

  const bulkHide = async () => {
    if (!selectedIds.size) return;
    setBulkWorking(true);
    await onBulkAction({ action: "bulk-hide-generations", ids: [...selectedIds] });
    onDataRefresh();
    exitSelectMode();
    setBulkWorking(false);
  };

  const bulkDelete = async () => {
    if (!selectedIds.size) return;
    if (!window.confirm(`${selectedIds.size} Posts permanent löschen?`)) return;
    setBulkWorking(true);
    await onBulkAction({ action: "bulk-delete-generations", ids: [...selectedIds] });
    onDataRefresh();
    exitSelectMode();
    setBulkWorking(false);
  };

  return (
    <section className="grid gap-4 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-ink">Community Posts</h2>
          <p className="mt-1 text-sm font-bold text-ink/50">
            {visibleCount} sichtbar{hiddenCount > 0 ? `, ${hiddenCount} ausgeblendet` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Hidden chip */}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => { setShowHidden(h => !h); exitSelectMode(); }}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${showHidden ? "bg-amber-500 text-white" : "border border-amber-300 bg-amber-50 text-amber-700"}`}
            >
              {showHidden ? `← Sichtbare anzeigen` : `👁 Ausgeblendet (${hiddenCount})`}
            </button>
          )}
          {/* Select mode toggle */}
          <button
            type="button"
            onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
            className={`rounded-full px-3 py-1.5 text-xs font-black transition ${selectMode ? "bg-black text-white" : "border border-black/15 bg-panel text-ink/60"}`}
          >
            {selectMode ? `Abbrechen${selectedIds.size ? ` (${selectedIds.size})` : ""}` : "Auswählen"}
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-black/8 bg-panel px-3 py-2">
          <span className="text-xs font-black text-ink/60">{selectedIds.size} ausgewählt</span>
          {!showHidden && (
            <button type="button" disabled={bulkWorking} onClick={() => void bulkHide()}
              className="rounded-md bg-amber-400 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
              {bulkWorking ? "…" : `Ausblenden (${selectedIds.size})`}
            </button>
          )}
          <button type="button" disabled={bulkWorking} onClick={() => void bulkDelete()}
            className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
            {bulkWorking ? "…" : `Löschen (${selectedIds.size})`}
          </button>
        </div>
      )}

      {/* Grid */}
      {visibleGenerations.length === 0 ? (
        <p className="text-sm font-bold text-ink/40 py-4 text-center">
          {showHidden ? "Keine ausgeblendeten Posts." : "Keine sichtbaren Posts."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {visibleGenerations.map(generation => {
            const isSelected = selectedIds.has(generation.id);
            return (
              <article
                key={generation.id}
                onClick={() => selectMode && toggleSelect(generation.id)}
                className={`grid gap-2 rounded-md border p-3 transition ${
                  selectMode ? "cursor-pointer" : ""
                } ${
                  isSelected ? "border-cobalt bg-cobalt/5 ring-2 ring-cobalt/40" :
                  generation.hidden ? "border-amber-200 bg-amber-50/50" :
                  "border-black/10 bg-panel"
                }`}
              >
                {generation.imageUrl && (
                  <div className="relative overflow-hidden rounded-md border border-black/10 bg-white">
                    <img src={generation.imageUrl} alt="Community post" className="aspect-square w-full object-cover object-top" />
                    {selectMode && (
                      <div className={`absolute inset-0 flex items-center justify-center transition ${isSelected ? "bg-black/30" : "bg-transparent"}`}>
                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-white bg-cobalt" : "border-white/80 bg-transparent"}`}>
                          {isSelected && <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="grid gap-0.5 text-[11px] font-bold text-ink/50">
                  {generation.customerName && <div className="font-black text-ink/70">{generation.customerName}</div>}
                  {generation.lookName && <div className="truncate">{generation.lookName}</div>}
                  {generation.hidden && <div className="text-amber-600 font-black text-[10px]">AUSGEBLENDET</div>}
                </div>
                {!selectMode && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => void onToggleHide(generation)} disabled={isSaving}
                      className={`inline-flex h-9 items-center justify-center rounded-md border text-[11px] font-black disabled:opacity-50 ${
                        generation.hidden ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-700"
                      }`}>
                      {generation.hidden ? "Einblenden" : "Ausblenden"}
                    </button>
                    <button type="button" onClick={() => void onDelete(generation)} disabled={isSaving}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-coral/30 bg-coral/10 text-[11px] font-black text-coral disabled:opacity-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function AdminLooksPage() {
  const frontFileInputRef = useRef<HTMLInputElement | null>(null);
  const backFileInputRef = useRef<HTMLInputElement | null>(null);
  const garmentFrontFileInputRef = useRef<HTMLInputElement | null>(null);
  const garmentBackFileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);
  const editFrontFileInputRef = useRef<HTMLInputElement | null>(null);
  const editBackFileInputRef = useRef<HTMLInputElement | null>(null);
  const editGarmentFrontFileInputRef = useRef<HTMLInputElement | null>(null);
  const editGarmentBackFileInputRef = useRef<HTMLInputElement | null>(null);
  const editGalleryFileInputRef = useRef<HTMLInputElement | null>(null);
  const aiModelPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [pin, setPin] = useState("");
  const [selectedStoreSlug, setSelectedStoreSlug] = useState("");
  const [lookName, setLookName] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [availableSizes, setAvailableSizes] = useState("");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [discountLabel, setDiscountLabel] = useState("");
  const [dealEndsAt, setDealEndsAt] = useState("");
  const [inStock, setInStock] = useState(false);
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [productNote, setProductNote] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [newProductType, setNewProductType] = useState<"real" | "virtual">("real");
  const [editingLookId, setEditingLookId] = useState<string | null>(null);
  const [editLookName, setEditLookName] = useState("");
  const [editStoreSlug, setEditStoreSlug] = useState("");
  const [editCampaignName, setEditCampaignName] = useState("");
  const [editAvailableSizes, setEditAvailableSizes] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editSalePrice, setEditSalePrice] = useState("");
  const [editDiscountLabel, setEditDiscountLabel] = useState("");
  const [editDealEndsAt, setEditDealEndsAt] = useState("");
  const [editInStock, setEditInStock] = useState(false);
  const [editAvailabilityNote, setEditAvailabilityNote] = useState("");
  const [editDeliveryTime, setEditDeliveryTime] = useState("");
  const [editProductNote, setEditProductNote] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [editProductType, setEditProductType] = useState<"real" | "virtual">("real");
  const [editFrontLookImage, setEditFrontLookImage] = useState<string | null>(null);
  const [editBackLookImage, setEditBackLookImage] = useState<string | null>(null);
  const [editGarmentFrontImage, setEditGarmentFrontImage] = useState<string | null>(null);
  const [editGarmentBackImage, setEditGarmentBackImage] = useState<string | null>(null);
  const [editGalleryEntries, setEditGalleryEntries] = useState<GalleryEntry[]>([]);
  const [publicTryOnUrl, setPublicTryOnUrl] = useState("");
  const [newFrontLookImage, setNewFrontLookImage] = useState<string | null>(null);
  const [newBackLookImage, setNewBackLookImage] = useState<string | null>(null);
  const [newGarmentFrontImage, setNewGarmentFrontImage] = useState<string | null>(null);
  const [newGarmentBackImage, setNewGarmentBackImage] = useState<string | null>(null);
  const [newGalleryEntries, setNewGalleryEntries] = useState<GalleryEntry[]>([]);
  const [data, setData] = useState<AdminPayload>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Look | null>(null);
  const [cropState, setCropState] = useState<{ src: string; onConfirm: (url: string) => void } | null>(null);
  const [showCreateLook, setShowCreateLook] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [generationGalleryLookId, setGenerationGalleryLookId] = useState<string | null>(null);
  const [previewGalleryImage, setPreviewGalleryImage] = useState<string | null>(null);
  const [aiToolLookId, setAiToolLookId] = useState<string | null>(null);
  const [aiReferenceImages, setAiReferenceImages] = useState<string[]>([]);
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [aiModelMode, setAiModelMode] = useState<"ai-model" | "my-photo" | "gallery-photo" | "no-model">("ai-model");
  const [aiProvider, setAiProvider] = useState<"openai" | "fashn">("fashn");
  const [aiGarmentCategory, setAiGarmentCategory] = useState<"tops" | "bottoms" | "one-pieces" | "lingerie">("tops");
  const [aiViewDirections, setAiViewDirections] = useState<Set<"front" | "back" | "side">>(new Set(["front"]));
  const [aiModelGender, setAiModelGender] = useState<"woman" | "man">("woman");
  const [aiSkinTone, setAiSkinTone] = useState<"white" | "light" | "asian" | "dark">("white");
  const [aiModelReferenceImage, setAiModelReferenceImage] = useState("");
  const [aiModelPhoto, setAiModelPhoto] = useState<string | null>(null);
  const [extractorSrc, setExtractorSrc] = useState<string | null>(null);
  const extractorInputRef = useRef<HTMLInputElement | null>(null);
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [aiToolError, setAiToolError] = useState<string | null>(null);
  const [descriptionGenerationTarget, setDescriptionGenerationTarget] = useState<"create" | "edit" | null>(null);
  const [aiGenerationStartedAt, setAiGenerationStartedAt] = useState<number | null>(null);
  const [aiGenerationSeconds, setAiGenerationSeconds] = useState(0);

  // Auto-switch: Lingerie / One-pieces cannot use "No Model" (OpenAI blocks them).
  // Whenever the garment category or model mode changes into this invalid combo, silently
  // switch to AI Model + FASHN so the user never hits the warning.
  useEffect(() => {
    if (
      aiModelMode === "no-model" &&
      (aiGarmentCategory === "lingerie" || aiGarmentCategory === "one-pieces")
    ) {
      setAiModelMode("ai-model");
      setAiProvider("fashn");
    }
  }, [aiGarmentCategory, aiModelMode]);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savedLook, setSavedLook] = useState<{ name: string; published: boolean } | null>(null);
  const [listingSearch, setListingSearch] = useState("");
  const [listingFilter, setListingFilter] = useState<"all" | "live" | "draft">("all");
  const [listingPage, setListingPage] = useState(1);
  const LISTINGS_PER_PAGE = 20;

  const loadData = async (adminPin = pin) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/try-this-look?admin=1", {
        headers: adminPin ? { "x-try-look-admin-pin": adminPin } : {}
      });
      const payload = await readJsonResponse<AdminPayload>(response);
      if (!response.ok) throw new Error(payload.error ?? "Admin data could not be loaded.");
      setData(payload);
      setSelectedStoreSlug((current) => {
        const nextSlug = current || payload.activeLook?.storeSlug || payload.stores?.[0]?.slug || "";
        const nextStore = payload.stores?.find((store) => store.slug === nextSlug);
        if (nextStore) {
          setStoreName(nextStore.name);
          setStoreSlug(nextStore.slug);
          setStoreAddress(nextStore.address ?? "");
          setWhatsappNumber(nextStore.whatsappNumber ?? "");
        }
        return nextSlug;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Admin data could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const storedPin = window.localStorage.getItem(ADMIN_PIN_KEY) ?? "";
    setPin(storedPin);
    setPublicTryOnUrl(`${window.location.origin}/try-this-look`);
    void loadData(storedPin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDiscountLabel(calculateDiscountLabel(price, salePrice));
  }, [price, salePrice]);

  useEffect(() => {
    setEditDiscountLabel(calculateDiscountLabel(editPrice, editSalePrice));
  }, [editPrice, editSalePrice]);

  useEffect(() => {
    if (!editingLookId) return; // closing is handled by cancelEditingLook / saveEditedLook
    const t = setTimeout(() => {
      document.querySelector(`[data-look-id="${editingLookId}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => clearTimeout(t);
  }, [editingLookId]);

  useEffect(() => {
    if (!isGeneratingAiImage || !aiGenerationStartedAt) {
      setAiGenerationSeconds(0);
      return;
    }
    const timer = window.setInterval(() => {
      setAiGenerationSeconds(Math.floor((Date.now() - aiGenerationStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [aiGenerationStartedAt, isGeneratingAiImage]);

  const savePin = () => {
    window.localStorage.setItem(ADMIN_PIN_KEY, pin);
    void loadData(pin);
  };

  const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");

  const generateProductDescription = async (mode: "create" | "edit") => {
    const image = mode === "create"
      ? newGalleryEntries[0]?.url ?? newFrontLookImage
      : editGalleryEntries[0]?.url ?? editFrontLookImage;
    const name = mode === "create" ? lookName : editLookName;
    if (!image) {
      setError("Upload at least one product photo first.");
      return;
    }

    setDescriptionGenerationTarget(mode);
    setError(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("image", await imageUrlToBlob(image), "product.png");
      formData.append("name", name);
      const response = await fetch("/api/generate-product-description", {
        method: "POST",
        body: formData
      });
      const payload = await readJsonResponse<{ title?: string; description?: string; hashtags?: string; error?: string }>(response);
      if (!response.ok) throw new Error(payload.error ?? "AI description could not be created.");
      const description = payload.description?.trim();
      if (!description) throw new Error("AI description was empty.");
      if (mode === "create") {
        if (payload.title && !lookName.trim()) setLookName(payload.title);
        setProductNote(description);
        if (payload.hashtags) setHashtags(payload.hashtags);
      } else {
        if (payload.title && !editLookName.trim()) setEditLookName(payload.title);
        setEditProductNote(description);
        if (payload.hashtags) setEditHashtags(payload.hashtags);
      }
      setMessage("AI title, description and hashtags added.");
    } catch (descriptionError) {
      setError(descriptionError instanceof Error ? descriptionError.message : "AI description could not be created.");
    } finally {
      setDescriptionGenerationTarget(null);
    }
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>, view: "front" | "back" | "garment-front" | "garment-back") => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setMessage(null);
    event.target.value = "";
    try {
      validateImageFile(file);
      const dataUrl = await fileToDataUrl(file);
      if (view === "front") setNewFrontLookImage(dataUrl);
      else if (view === "back") setNewBackLookImage(dataUrl);
      else if (view === "garment-front") setNewGarmentFrontImage(dataUrl);
      else setNewGarmentBackImage(dataUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : SUPPORTED_IMAGE_MESSAGE);
    }
  };

  const handleGalleryUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setError(null);
    setMessage(null);
    event.target.value = "";
    try {
      for (const file of files) {
        validateImageFile(file);
        const dataUrl = await fileToDataUrl(file);
        setNewGalleryEntries((current) => {
          if (current.length >= 10) return current;
          const entry: GalleryEntry = { key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`, url: dataUrl, isNew: true };
          const next = [...current, entry].slice(0, 10);
          setNewFrontLookImage(next[0]?.url ?? null);
          return next;
        });
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : SUPPORTED_IMAGE_MESSAGE);
    }
  };

  const handleEditImageUpload = async (event: ChangeEvent<HTMLInputElement>, view: "front" | "back" | "garment-front" | "garment-back") => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setMessage(null);
    event.target.value = "";
    try {
      validateImageFile(file);
      const dataUrl = await fileToDataUrl(file);
      if (view === "front") setEditFrontLookImage(dataUrl);
      else if (view === "back") setEditBackLookImage(dataUrl);
      else if (view === "garment-front") setEditGarmentFrontImage(dataUrl);
      else setEditGarmentBackImage(dataUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : SUPPORTED_IMAGE_MESSAGE);
    }
  };

  const handleEditGalleryUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setError(null);
    setMessage(null);
    event.target.value = "";
    try {
      for (const file of files) {
        validateImageFile(file);
        const dataUrl = await fileToDataUrl(file);
        setEditGalleryEntries((current) => {
          if (current.length >= 10) return current;
          const entry: GalleryEntry = { key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`, url: dataUrl, isNew: true };
          const next = [...current, entry].slice(0, 10);
          setEditFrontLookImage(next[0]?.url ?? null);
          return next;
        });
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : SUPPORTED_IMAGE_MESSAGE);
    }
  };

  const removeCreateGalleryImage = (key: string) => {
    setNewGalleryEntries((current) => {
      const next = current.filter((item) => item.key !== key);
      setNewFrontLookImage(next[0]?.url ?? null);
      return next;
    });
  };

  const removeEditGalleryImage = (key: string) => {
    setEditGalleryEntries((current) => {
      const next = current.filter((item) => item.key !== key);
      setEditFrontLookImage(next[0]?.url ?? null);
      return next;
    });
  };

  const moveEntryInList = (entries: GalleryEntry[], index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= entries.length) return entries;
    const next = [...entries];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  };

  const moveCreateGalleryImage = (index: number, direction: -1 | 1) => {
    setNewGalleryEntries((current) => {
      const next = moveEntryInList(current, index, direction);
      setNewFrontLookImage(next[0]?.url ?? null);
      return next;
    });
  };

  const moveEditGalleryImage = (index: number, direction: -1 | 1) => {
    setEditGalleryEntries((current) => {
      const next = moveEntryInList(current, index, direction);
      setEditFrontLookImage(next[0]?.url ?? null);
      return next;
    });
  };

  const cropCreateGalleryImage = (key: string, url: string) => {
    setCropState({
      src: url,
      onConfirm: (croppedUrl: string) => {
        setNewGalleryEntries((current) => {
          const next = current.map((e) =>
            e.key === key ? { ...e, url: croppedUrl, isNew: true } : e
          );
          setNewFrontLookImage(next[0]?.url ?? null);
          return next;
        });
        setCropState(null);
      }
    });
  };

  const cropEditGalleryImage = (key: string, url: string) => {
    setCropState({
      src: url,
      onConfirm: (croppedUrl: string) => {
        setEditGalleryEntries((current) => {
          const next = current.map((e) =>
            e.key === key ? { ...e, url: croppedUrl, isNew: true } : e
          );
          setEditFrontLookImage(next[0]?.url ?? null);
          return next;
        });
        setCropState(null);
      }
    });
  };

  const callAdminAction = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/try-this-look", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(pin ? { "x-try-look-admin-pin": pin } : {})
      },
      body: JSON.stringify(body)
    });
    const payload = await readJsonResponse<AdminPayload>(response);
    if (!response.ok) throw new Error(payload.error ?? "Admin action failed.");
    setData(payload);
    return payload;
  };

  const uploadLook = async (publish = false) => {
    const mainListingImage = newGalleryEntries[0]?.url ?? newFrontLookImage;
    if (!mainListingImage) {
      setError("Upload at least one product photo first.");
      return;
    }
    if (!storeName.trim() || !storeSlug.trim()) {
      setError("Choose a store first, or enter a new store name and URL slug.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({
        action: "upload-look",
        name: lookName.trim() || "New LuxuryBandit Look",
        campaignName: campaignName.trim() || "Instagram test",
        storeName: storeName.trim(),
        storeSlug: storeSlug.trim(),
        storeAddress: storeAddress.trim(),
        whatsappNumber: whatsappNumber.trim(),
        availableSizes: availableSizes
          .split(/[,\n]/)
          .map((size) => size.trim())
          .filter(Boolean),
        price: price.trim(),
        salePrice: salePrice.trim(),
        discountLabel: discountLabel.trim() || calculateDiscountLabel(price, salePrice),
        dealEndsAt: dealEndsAt.trim(),
        inStock,
        availabilityNote: availabilityNote.trim(),
        deliveryTime: deliveryTime.trim(),
        productNote: productNote.trim(),
        hashtags: hashtags.trim(),
        productType: newProductType,
        frontImage: mainListingImage,
        backImage: newBackLookImage,
        garmentFrontImage: newGarmentFrontImage,
        garmentBackImage: newGarmentBackImage,
        galleryImages: newGalleryEntries.map((e) => e.url),
        published: publish
      });
      setSelectedStoreSlug(normalizeSlug(storeSlug));
      const savedName = lookName.trim() || "New LuxuryBandit Look";
      setNewFrontLookImage(null);
      setNewBackLookImage(null);
      setNewGarmentFrontImage(null);
      setNewGarmentBackImage(null);
      setNewGalleryEntries([]);
      setLookName("");
      setCampaignName("");
      setAvailableSizes("");
      setPrice("");
      setSalePrice("");
      setDiscountLabel("");
      setDealEndsAt("");
      setInStock(false);
      setAvailabilityNote("");
      setDeliveryTime("");
      setProductNote("");
      setSavedLook({ name: savedName, published: publish });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Look could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveStore = async () => {
    if (!storeName.trim() || !storeSlug.trim()) {
      setError("Store name and URL slug are required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({
        action: "save-store",
        storeName: storeName.trim(),
        storeSlug: storeSlug.trim(),
        storeAddress: storeAddress.trim(),
        whatsappNumber: whatsappNumber.trim()
      });
      setSelectedStoreSlug(normalizeSlug(storeSlug));
      setMessage("Store saved.");
    } catch (storeError) {
      setError(storeError instanceof Error ? storeError.message : "Store could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteStore = async () => {
    if (!selectedStore) return;
    const confirmed = window.confirm(`Delete boutique "${selectedStore.name}" including its looks, customer requests, AI previews, and tracking data?`);
    if (!confirmed) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({ action: "delete-store", storeSlug: selectedStore.slug });
      startNewStore();
      setMessage("Boutique deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Boutique could not be deleted.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectStore = (slug: string) => {
    setSelectedStoreSlug(slug);
    setListingPage(1);
    setListingSearch("");
    const store = (data.stores ?? []).find((item) => item.slug === slug);
    if (!store) return;
    setStoreName(store.name);
    setStoreSlug(store.slug);
    setStoreAddress(store.address ?? "");
    setWhatsappNumber(store.whatsappNumber ?? "");
    setMessage(null);
    setError(null);
  };

  const startNewStore = () => {
    setSelectedStoreSlug("");
    setStoreName("");
    setStoreSlug("");
    setStoreAddress("");
    setWhatsappNumber("");
    setLookName("");
    setCampaignName("");
    setAvailableSizes("");
    setPrice("");
    setSalePrice("");
    setDiscountLabel("");
    setDealEndsAt("");
    setInStock(false);
    setAvailabilityNote("");
    setDeliveryTime("");
    setProductNote("");
    setMessage(null);
    setError(null);
  };

  const setActiveLook = async (id: string) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({ action: "set-active", id });
      setMessage("Look marked active.");
    } catch (activeError) {
      setError(activeError instanceof Error ? activeError.message : "Look could not be marked active.");
    } finally {
      setIsSaving(false);
    }
  };

  const unsetActiveLook = async (id: string) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({ action: "unset-active", id });
      setMessage("Look removed from active looks.");
    } catch (activeError) {
      setError(activeError instanceof Error ? activeError.message : "Look could not be removed from active looks.");
    } finally {
      setIsSaving(false);
    }
  };

  const markAsSold = async (look: Look) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({ action: "update-look", id: look.id, inStock: false });
      setMessage(`"${look.name}" marked as sold.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark as sold.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLook = async (look: Look) => {
    setDeleteConfirm(look);
  };

  const confirmDeleteLook = async (look: Look) => {
    setDeleteConfirm(null);
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({ action: "delete-look", id: look.id });
      setMessage("Listing deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Listing could not be deleted.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingLook = (look: Look) => {
    setEditingLookId(look.id);
    setEditLookName(look.name);
    setEditStoreSlug(look.storeSlug ?? "");
    setEditCampaignName(look.campaignName ?? "");
    setEditAvailableSizes((look.availableSizes ?? []).join(", "));
    setEditPrice(look.price ?? "");
    setEditSalePrice(look.salePrice ?? "");
    setEditDiscountLabel(look.discountLabel ?? "");
    setEditDealEndsAt(look.dealEndsAt ? String(look.dealEndsAt).slice(0, 16) : "");
    setEditInStock(Boolean(look.inStock));
    setEditAvailabilityNote(look.availabilityNote ?? "");
    setEditDeliveryTime(look.deliveryTime ?? "");
    setEditProductNote(look.productNote ?? "");
    setEditHashtags(look.hashtags ?? "");
    setEditProductType(look.productType ?? "real");
    setEditFrontLookImage(null);
    setEditBackLookImage(null);
    setEditGarmentFrontImage(null);
    setEditGarmentBackImage(null);
    setEditGalleryEntries(buildGalleryEntries(look));
    setMessage(null);
    setError(null);
  };

  const scrollToLook = (lookId: string | null) => {
    if (!lookId) return;
    setTimeout(() => {
      document.querySelector(`[data-look-id="${lookId}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const cancelEditingLook = () => {
    const lookId = editingLookId;
    setEditingLookId(null);
    scrollToLook(lookId);
    setEditLookName("");
    setEditStoreSlug("");
    setEditCampaignName("");
    setEditAvailableSizes("");
    setEditPrice("");
    setEditSalePrice("");
    setEditDiscountLabel("");
    setEditDealEndsAt("");
    setEditInStock(false);
    setEditAvailabilityNote("");
    setEditDeliveryTime("");
    setEditProductNote("");
    setEditHashtags("");
    setEditProductType("real");
    setEditFrontLookImage(null);
    setEditBackLookImage(null);
    setEditGarmentFrontImage(null);
    setEditGarmentBackImage(null);
    setEditGalleryEntries([]);
  };

  const saveEditedLook = async (look: Look) => {
    if (!editGalleryEntries.length) {
      setError("Keep at least one product photo in the gallery.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const frontEntry = editGalleryEntries[0];
      // Stable path of front image (if existing), or data URL (if new upload)
      const frontImagePath = !frontEntry.isNew ? frontEntry.storagePath : undefined;
      const frontImageDataUrl = frontEntry.isNew ? frontEntry.url : undefined;
      // Stable paths of existing gallery images to keep (excluding index 0 = front, which is sent via frontImagePath)
      const keepGalleryPaths = editGalleryEntries
        .slice(1)
        .filter((e) => !e.isNew && e.storagePath)
        .map((e) => e.storagePath as string);
      // New data URLs to upload and append to gallery
      const newGalleryDataUrls = editGalleryEntries
        .filter((e) => e.isNew)
        .map((e) => e.url);

      await callAdminAction({
        action: "update-look",
        id: look.id,
        name: editLookName.trim() || look.name,
        campaignName: editCampaignName.trim(),
        storeName: (() => { const s = data.stores?.find(x => x.slug === editStoreSlug); return s?.name ?? look.storeName ?? storeName.trim(); })(),
        storeSlug: editStoreSlug || (look.storeSlug ?? storeSlug.trim()),
        storeAddress: (() => { const s = data.stores?.find(x => x.slug === editStoreSlug); return s?.address ?? look.storeAddress ?? storeAddress.trim(); })(),
        whatsappNumber: (() => { const s = data.stores?.find(x => x.slug === editStoreSlug); return s?.whatsappNumber ?? look.whatsappNumber ?? whatsappNumber.trim(); })(),
        availableSizes: editAvailableSizes
          .split(/[,\n]/)
          .map((size) => size.trim())
          .filter(Boolean),
        price: editPrice.trim(),
        salePrice: editSalePrice.trim(),
        discountLabel: editDiscountLabel.trim() || calculateDiscountLabel(editPrice, editSalePrice),
        dealEndsAt: editDealEndsAt.trim(),
        inStock: editInStock,
        availabilityNote: editAvailabilityNote.trim(),
        deliveryTime: editDeliveryTime.trim(),
        productNote: editProductNote.trim(),
        hashtags: editHashtags.trim(),
        productType: editProductType,
        // Stable front image path (highest priority) or data URL for new upload
        frontImagePath,
        frontImage: frontImageDataUrl,
        backImage: editBackLookImage,
        garmentFrontImage: editGarmentFrontImage,
        garmentBackImage: editGarmentBackImage,
        // Stable gallery keys (replaces URL/index-based approach)
        keepGalleryPaths,
        galleryImages: newGalleryDataUrls
      });
      cancelEditingLook();
      setMessage("Look updated.");
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Look could not be updated.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteGeneration = async (generation: Generation) => {
    const confirmed = window.confirm("Delete this generated image?");
    if (!confirmed) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({ action: "delete-generation", id: generation.id });
      setSelectedGeneration(null);
      if ((data.generations ?? []).filter((item) => item.lookId === generation.lookId).length <= 1) {
        setGenerationGalleryLookId(null);
      }
      setMessage("Generated image deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Generated image could not be deleted.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleHideGeneration = async (generation: Generation) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const action = generation.hidden ? "unhide-generation" : "hide-generation";
      await callAdminAction({ action, id: generation.id });
      setMessage(generation.hidden ? "Post visible again." : "Post hidden from community.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update visibility.");
    } finally {
      setIsSaving(false);
    }
  };

  const addImageDataUrlToProductGallery = async (look: Look, imageDataUrls: string | string[]) => {
    const newImages = Array.isArray(imageDataUrls) ? imageDataUrls : [imageDataUrls];
    // If this look is currently being edited in the form, use the live edit state
    // (the user may have deleted images without saving yet)
    const isBeingEdited = editingLookId === look.id;
    const currentEntries = isBeingEdited ? editGalleryEntries : buildGalleryEntries(look);
    const existingCount = currentEntries.length;
    const slotsLeft = 10 - existingCount;
    if (slotsLeft <= 0) {
      setError("Product gallery already has 10 images. Remove one image first, then save before generating.");
      return;
    }
    // Only add as many as will fit
    const imagesToAdd = newImages.slice(0, slotsLeft);

    // Build stable keep paths from current state (not stale server data)
    const keepGalleryPaths = isBeingEdited
      ? currentEntries.slice(1).filter((e) => !e.isNew && e.storagePath).map((e) => e.storagePath as string)
      : (look.galleryImagePaths ?? []).filter(Boolean) as string[];

    const updatedPayload = await callAdminAction({
      action: "update-look",
      id: look.id,
      name: look.name,
      campaignName: look.campaignName ?? "",
      storeName: look.storeName ?? "",
      storeSlug: look.storeSlug ?? "",
      storeAddress: look.storeAddress ?? "",
      whatsappNumber: look.whatsappNumber ?? "",
      availableSizes: look.availableSizes ?? [],
      price: look.price ?? "",
      salePrice: look.salePrice ?? "",
      discountLabel: look.discountLabel ?? "",
      dealEndsAt: look.dealEndsAt ?? "",
      inStock: Boolean(look.inStock),
      availabilityNote: look.availabilityNote ?? "",
      deliveryTime: look.deliveryTime ?? "",
      productNote: look.productNote ?? "",
      hashtags: look.hashtags ?? "",
      galleryImages: imagesToAdd,
      keepGalleryPaths,
      frontImagePath: isBeingEdited
        ? (currentEntries[0]?.storagePath ?? look.frontImagePath)
        : look.frontImagePath
    });

    if (editingLookId === look.id) {
      const updatedLook = (updatedPayload.looks ?? []).find((item) => item.id === look.id);
      const nextEntries = updatedLook
        ? buildGalleryEntries(updatedLook)
        : [...editGalleryEntries, ...imagesToAdd.map((url, i) => ({ key: `new-${Date.now()}-${i}`, url, isNew: true }))].slice(0, 10);
      setEditGalleryEntries(nextEntries);
      setEditFrontLookImage(nextEntries[0]?.url ?? null);
    }
  };

  const addGenerationToProductGallery = async (generation: Generation) => {
    const look = (data.looks ?? []).find((item) => item.id === generation.lookId);
    if (!look || !generation.imageUrl) {
      setError("Generated image or listing was not found.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const generatedDataUrl = await blobToDataUrl(await imageUrlToBlob(generation.imageUrl));
      await addImageDataUrlToProductGallery(look, generatedDataUrl);
      setMessage("Generated image added to product gallery.");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Generated image could not be added to product gallery.");
    } finally {
      setIsSaving(false);
    }
  };

  const getLookReferenceImages = (look: Look) => {
    const entries = buildGalleryEntries(look);
    const productImages = entries.length
      ? entries.map((e) => e.url)
      : [look.frontImageUrl ?? look.imageUrl].filter(Boolean) as string[];
    const images = [
      ...productImages,
      look.garmentFrontImageUrl
    ].filter(Boolean) as string[];
    return Array.from(new Set(images)).slice(0, 6);
  };

  const openExtractorForLook = (look: Look) => {
    // Must set aiToolLookId so handleExtractorConfirm knows which look to save into
    setAiToolLookId(look.id);
    // Use front image, then first gallery image, then garment front
    const src =
      look.frontImageUrl ||
      (look.galleryImageUrls && look.galleryImageUrls[0]) ||
      look.garmentFrontImageUrl ||
      null;
    if (src) setExtractorSrc(src);
  };

  const openAiImageTool = (look: Look) => {
    const images = getLookReferenceImages(look);
    setAiToolLookId(look.id);
    setAiReferenceImages(images.slice(0, 1)); // pre-select first image
    setAiImagePrompt("");
    setAiProvider("fashn");
    setAiModelMode("ai-model");
    setAiGarmentCategory(inferGarmentCategory(look));
    setAiViewDirections(new Set(["front"]));
    setAiModelGender("woman");
    setAiSkinTone("white");
    setAiModelReferenceImage(images[1] ?? images[0] ?? "");
    setAiModelPhoto(null);
    setMessage(null);
    setError(null);
  };

  const closeAiImageTool = () => {
    setAiToolLookId(null);
    setAiReferenceImages([]);
    setAiImagePrompt("");
    setAiProvider("fashn");
    setAiModelMode("ai-model");
    setAiGarmentCategory("tops");
    setAiViewDirections(new Set(["front"]));
    setAiModelGender("woman");
    setAiSkinTone("white");
    setAiModelReferenceImage("");
    setAiModelPhoto(null);
    setAiGenerationStartedAt(null);
    setAiGenerationSeconds(0);
    setAiToolError(null);
  };

  const toggleAiReferenceImage = (image: string) => {
    setAiReferenceImages((current) => {
      if (current.includes(image)) {
        return current.filter((i) => i !== image);
      }
      return [...current, image].slice(0, 4); // max 4 reference images
    });
  };

  const handleAiModelPhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setMessage(null);
    try {
      validateImageFile(file);
      setAiModelPhoto(await fileToDataUrl(file));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : SUPPORTED_IMAGE_MESSAGE);
      setAiModelPhoto(null);
    } finally {
      event.target.value = "";
    }
  };

  const handleExtractorUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    try {
      validateImageFile(file);
      setExtractorSrc(await fileToDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : SUPPORTED_IMAGE_MESSAGE);
    }
  };

  const handleExtractorConfirm = async (crops: string[]) => {
    setExtractorSrc(null);
    if (!crops.length) return;

    // The extractor already removed person + background → clean garment images.
    // Save them directly to the product gallery — no extra AI step needed.
    const look = (data.looks ?? []).find((item) => item.id === aiToolLookId);
    if (look) {
      setIsSaving(true);
      setMessage("Adding extracted garment images to gallery…");
      setError(null);
      try {
        await addImageDataUrlToProductGallery(look, crops.slice(0, 4));
        setMessage(`${crops.length} extracted image${crops.length > 1 ? "s" : ""} added to gallery.`);
        // Close AI tool after successful extraction
        setAiToolLookId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save extracted images.");
        // Fallback: keep them as AI references so the user can still use them
        setAiReferenceImages(crops.slice(0, 4));
        setAiModelMode("no-model");
      } finally {
        setIsSaving(false);
      }
    } else {
      // No look context → just set as AI references (shouldn't normally happen)
      setAiReferenceImages(crops.slice(0, 4));
      setAiModelMode("no-model");
    }
  };

  const createAiImageForLook = async () => {
    const look = (data.looks ?? []).find((item) => item.id === aiToolLookId);
    if (!look) {
      setError("Choose a listing first.");
      return;
    }
    if (!aiReferenceImages.length) {
      setError("Select at least one product image as reference.");
      return;
    }
    if (aiModelMode === "my-photo" && !aiModelPhoto) {
      setError("Upload your model photo first, or choose AI model.");
      return;
    }
    if (aiModelMode === "gallery-photo" && !aiModelReferenceImage) {
      setError("Choose a gallery photo as model reference first, or choose AI model.");
      return;
    }

    setIsGeneratingAiImage(true);
    setAiGenerationStartedAt(Date.now());
    setError(null);
    // Gallery/My Photo: pose = reference photo, multi-direction makes no sense → always 1 image
    const directions = (aiModelMode === "gallery-photo" || aiModelMode === "my-photo")
      ? ["auto"]
      : Array.from(aiViewDirections);
    setMessage(`Creating ${directions.length} AI image${directions.length > 1 ? "s" : ""}. This can take a moment.`);

    // Build shared blobs once (avoid re-fetching for each direction)
    const referenceBlobs: Array<{ blob: Blob; name: string }> = [];
    for (let i = 0; i < aiReferenceImages.length; i++) {
      referenceBlobs.push({ blob: await imageUrlToBlob(aiReferenceImages[i]), name: `reference-${i + 1}.png` });
    }
    let modelBlob: { blob: Blob; name: string } | null = null;
    if (aiModelMode === "my-photo" && aiModelPhoto) {
      modelBlob = { blob: dataUrlToBlob(aiModelPhoto), name: "model-photo.jpg" };
    } else if (aiModelMode === "gallery-photo" && aiModelReferenceImage) {
      modelBlob = { blob: await imageUrlToBlob(aiModelReferenceImage), name: "gallery-model-photo.jpg" };
    }

    const buildPrompt = (dir: string) =>
      aiModelMode === "no-model"
        ? [
            "Create a professional product photo of the EXACT garment from the reference image.",
            "GHOST MANNEQUIN style: show the garment as if worn by an invisible body — structured, full shape visible, no person, no skin.",
            "CRITICAL: Reproduce the garment exactly — every detail of cut, material, texture, lace, straps, hardware, color, and silhouette must match the reference.",
            "Do NOT simplify, upgrade, or redesign the garment in any way.",
            `Show the ${dir} view of the garment.`,
            aiImagePrompt.trim() ? `User instruction: ${aiImagePrompt.trim()}` : "",
            `Listing name: ${look.name}.`,
            "Show the full garment from top to bottom without cropping. Clean white or very light neutral studio background. No person, no body, no skin visible. No text or badges."
          ].filter(Boolean).join("\n")
        : [
            aiModelMode === "my-photo" || aiModelMode === "gallery-photo"
              ? `Recreate the person from Image 2 wearing the EXACT garment from Image 1. Use Image 2 for the model's identity only: face, skin tone, hair, and body type. Do NOT copy the pose or view direction from Image 2.`
              : "Show the EXACT garment from Image 1 on a professional adult fashion model.",
            "CRITICAL: Do NOT substitute, upgrade, or replace the garment. The garment in the output must be identical to Image 1 in material, texture, cut, silhouette, logos, print, and color.",
            "If the garment in Image 1 is a shiny satin sauna suit, the output must show a shiny satin sauna suit — not a regular sweatshirt or tracksuit.",
            "Reproduce every visible detail from Image 1: fabric sheen, elasticated cuffs, collar style, logo placement, and overall shape.",
            `Show the model from the ${dir} — ${dir === "front" ? "facing the camera directly, full front view" : dir === "back" ? "turned completely away from the camera, showing the back of the garment" : "in a side profile pose, 90° to the camera"}.`,
            aiImagePrompt.trim() ? `User instruction: ${aiImagePrompt.trim()}` : "",
            `Listing name: ${look.name}.`,
            look.productNote ? `Product note: ${look.productNote}` : "",
            "Show the full garment from collar to hem without cropping.",
            "Clean fashion-listing background. No text, no prices, no badges."
          ].filter(Boolean).join("\n");

    try {
      const results = await Promise.allSettled(
        directions.map(async (dir) => {
          const formData = new FormData();
          for (const { blob, name } of referenceBlobs) formData.append("image", blob, name);
          if (modelBlob) formData.append("modelImage", modelBlob.blob, modelBlob.name);
          formData.append("visitorId", `admin-${Date.now()}`);
          formData.append("lookId", look.id);
          formData.append("mode", aiModelMode === "no-model" ? "no-model" : "fashion-model");
          formData.append("provider", aiModelMode === "no-model" ? "openai" : aiProvider);
          formData.append("category", aiGarmentCategory);
          // Gallery/My Photo: pose is determined by the reference photo — never override with a direction
          formData.append("viewDirection", (aiModelMode === "gallery-photo" || aiModelMode === "my-photo") ? "auto" : dir);
          formData.append("modelGender", aiModelGender);
          formData.append("skinTone", aiSkinTone);
          formData.append("aspectRatio", "4:5");
          formData.append("prompt", buildPrompt(dir));
          const response = await fetch("/api/try-this-look-openai", {
            method: "POST",
            body: formData,
            headers: { "x-shopcut-account-id": "admin-internal" }
          });
          const payload = await readJsonResponse<{ image?: string; error?: string }>(response);
          if (!response.ok || !payload.image) throw new Error(payload.error ?? `AI image (${dir}) could not be created.`);
          return { dir, image: payload.image };
        })
      );

      const successes = results.filter((r): r is PromiseFulfilledResult<{ dir: string; image: string }> => r.status === "fulfilled");
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

      const successImages = successes.map(r => r.value.image);
      // Log each generation separately (analytics)
      await Promise.allSettled(
        successImages.map(image => callAdminAction({ action: "generation", lookId: look.id, image, visitorId: "admin-internal" }))
      );
      // Save ALL new images in ONE batch call so they don't overwrite each other
      if (successImages.length > 0) {
        await addImageDataUrlToProductGallery(look, successImages);
      }

      if (failures.length > 0 && successes.length === 0) {
        const firstError = failures[0].reason instanceof Error ? failures[0].reason.message : "AI image could not be created.";
        throw new Error(firstError);
      }

      closeAiImageTool();
      setMessage(
        successes.length === directions.length
          ? `${successes.length} AI image${successes.length > 1 ? "s" : ""} created and added to gallery.`
          : `${successes.length} of ${directions.length} images created. ${failures.length} failed.`
      );
    } catch (generateError) {
      const rawMessage = generateError instanceof Error ? generateError.message : "";
      const friendlyMessage =
        !rawMessage || rawMessage.toLowerCase().includes("fetch") || rawMessage.toLowerCase().includes("failed to fetch")
          ? "Connection error — the AI request timed out or could not reach the server. Please try again."
          : rawMessage.includes("422") || rawMessage.includes("No Model mode")
          ? "This garment type cannot be processed in No Model mode. Switch to AI Model."
          : rawMessage.includes("402") || rawMessage.includes("credits")
          ? "Not enough credits to generate this image."
          : rawMessage || "AI image could not be created. Please try again.";
      setAiToolError(friendlyMessage);
      setError(friendlyMessage);
      setMessage(null);
    } finally {
      setIsGeneratingAiImage(false);
      setAiGenerationStartedAt(null);
    }
  };

  const updateLeadStatus = async (lead: Lead, status: "new" | "contacted" | "closed") => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({ action: "update-lead-status", id: lead.id, status });
      setMessage("Lead status updated.");
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Lead status could not be updated.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLead = async (lead: Lead) => {
    const confirmed = window.confirm(`Delete this customer request from ${lead.name || lead.phone || "this contact"}?`);
    if (!confirmed) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({ action: "delete-lead", id: lead.id });
      setMessage("Customer request deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Customer request could not be deleted.");
    } finally {
      setIsSaving(false);
    }
  };

  const openLeadWhatsApp = (lead: Lead) => {
    const normalizedPhone = String(lead.phone ?? "").replace(/[^\d]/g, "");
    if (!normalizedPhone) {
      setError("This lead has no WhatsApp phone number yet.");
      return;
    }
    window.open(`https://wa.me/${normalizedPhone}`, "_blank", "noopener,noreferrer");
  };

  const eventCounts = (data.events ?? []).reduce<Record<string, number>>((counts, event) => {
    counts[event.name] = (counts[event.name] ?? 0) + 1;
    return counts;
  }, {});

  const funnelStats = [
    { label: "Page views", value: eventCounts.page_view_try_this_look ?? 0 },
    { label: "Photo uploads", value: eventCounts.upload_user_photo ?? 0 },
    { label: "Generate clicks", value: eventCounts.click_generate_my_look ?? 0 },
    { label: "Successful generations", value: eventCounts.generation_success ?? 0 },
    { label: "Failed generations", value: eventCounts.generation_failed ?? 0 },
    { label: "Size selections", value: eventCounts.select_size ?? 0 },
    { label: "WhatsApp order clicks", value: eventCounts.click_order_whatsapp ?? 0 },
    { label: "Saves", value: eventCounts.save_to_gallery ?? 0 },
    { label: "Downloads", value: eventCounts.download_result ?? 0 },
    { label: "Leads", value: eventCounts.lead_submitted ?? 0 }
  ];

  const copyText = async (text: string, success: string) => {
    await navigator.clipboard.writeText(text);
    setMessage(success);
  };

  const stores = data.stores ?? [];
  const selectedStore = stores.find((store) => store.slug === selectedStoreSlug);
  const looksForSelectedStore = (data.looks ?? []).filter((look) => {
    if (!selectedStoreSlug) return true;
    return look.storeSlug === selectedStoreSlug;
  });
  const filteredListings = looksForSelectedStore.filter((look) => {
    const matchesSearch = !listingSearch || look.name.toLowerCase().includes(listingSearch.toLowerCase());
    const matchesFilter =
      listingFilter === "all" ? true :
      listingFilter === "live" ? look.published !== false :
      look.published === false;
    return matchesSearch && matchesFilter;
  });
  const totalListingPages = Math.max(1, Math.ceil(filteredListings.length / LISTINGS_PER_PAGE));
  const pagedListings = filteredListings.slice((listingPage - 1) * LISTINGS_PER_PAGE, listingPage * LISTINGS_PER_PAGE);
  const selectedStoreActiveLook = selectedStoreSlug
    ? looksForSelectedStore.find((look) => look.id === data.activeLook?.id) ?? looksForSelectedStore[0]
    : data.activeLook;
  const activeLook = selectedStoreActiveLook;
  const activeLooks = (selectedStoreSlug
    ? (data.activeLooks ?? []).filter((look) => look.storeSlug === selectedStoreSlug)
    : data.activeLooks ?? []
  );
  const visibleActiveLooks = activeLooks.length ? activeLooks : activeLook ? [activeLook] : [];
  const activeLookIds = new Set(visibleActiveLooks.map((look) => look.id));
  const contactForGeneration = (generation: Generation) => {
    const leads = data.leads ?? [];
    if (generation.visitorId) {
      const directLead = leads.find((lead) => lead.visitorId === generation.visitorId);
      if (directLead) return directLead;
    }

    const generatedAt = new Date(generation.createdAt).getTime();
    return leads.find((lead) => {
      if (lead.lookId !== generation.lookId) return false;
      const leadAt = new Date(lead.createdAt).getTime();
      return leadAt >= generatedAt && leadAt - generatedAt < 1000 * 60 * 60 * 24;
    });
  };
  const activeLookPublicUrl = selectedStoreSlug ? `${publicTryOnUrl}?store=${selectedStoreSlug}` : activeLook?.storeSlug ? `${publicTryOnUrl}?store=${activeLook.storeSlug}` : publicTryOnUrl;
  const isAdminAccessBlocked = error === "Admin access required." && !data.events;

  if (isAdminAccessBlocked) {
    return (
      <main className="min-h-screen bg-[#fbfaf7] px-4 py-5 text-ink">
        <section className="mx-auto grid w-full max-w-2xl gap-5">
          <header className="grid gap-2">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">LuxuryBandit Admin</div>
          <h1 className="text-5xl font-black leading-none text-ink">Try This Look</h1>
          <p className="max-w-3xl text-sm font-bold leading-6 text-ink/60">
            Enter the admin PIN to manage looks, leads, and generated images.
          </p>
          <Link href="/admin" className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-black/10 bg-white px-4 text-xs font-black text-ink shadow-soft">
            Back to dashboard
          </Link>
        </header>

          <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
            <div className="text-lg font-black">Admin access</div>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder="Admin PIN"
                className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
              />
              <button type="button" onClick={savePin} className="h-12 rounded-md bg-ink px-5 text-sm font-black text-white">
                Load admin
              </button>
            </div>
          </section>

          <div className="rounded-md border border-coral/25 bg-coral/10 p-4 text-sm font-black text-coral">
            Admin PIN required.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbfaf7] px-4 py-5 text-ink">
      <section className="mx-auto grid w-full max-w-6xl gap-5">
        <header className="grid gap-2">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">LuxuryBandit Admin</div>
            <h1 className="text-5xl font-black leading-none text-ink">Listings</h1>
          <p className="max-w-3xl text-sm font-bold leading-6 text-ink/60">
            Manage one seller, their listings, Instagram creatives, and incoming buyer requests.
          </p>
          <Link href="/admin" className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-black/10 bg-white px-4 text-xs font-black text-ink shadow-soft">
            Back to dashboard
          </Link>
        </header>

        <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-3 shadow-soft">
          <div className="text-sm font-black text-ink/60">Admin access</div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              type="password"
              placeholder="Admin PIN"
              className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
            />
            <button type="button" onClick={savePin} className="h-12 rounded-md bg-ink px-5 text-sm font-black text-white">
              Load admin
            </button>
          </div>
        </section>

        {error && <div className="rounded-md border border-coral/25 bg-coral/10 p-4 text-sm font-black text-coral">{error}</div>}
        {message && <div className="rounded-md border border-cobalt/20 bg-cobalt/10 p-4 text-sm font-black text-cobalt">{message}</div>}

        <section className="grid gap-4 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black leading-none text-ink">Seller</h2>
              <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-ink/55">
                Choose the store you want to work on. Everything below is filtered to this boutique.
              </p>
            </div>
            <button
              type="button"
              onClick={startNewStore}
              className="h-11 rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink"
            >
              New store
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[280px_1fr]">
            <div className="grid content-start gap-2">
              <select
                value={selectedStoreSlug}
                onChange={(event) => selectStore(event.target.value)}
                className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-black outline-none focus:border-cobalt"
              >
                <option value="">Create or choose store</option>
                {stores.map((store) => (
                  <option key={store.slug} value={store.slug}>
                    {store.name}
                  </option>
                ))}
              </select>
              {selectedStore && (
                <>
                  <a
                    href={`/store/${selectedStore.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center rounded-md bg-cobalt px-4 text-sm font-black text-white"
                  >
                    Open {selectedStore.name}
                  </a>
                  <button
                    type="button"
                    onClick={() => void deleteStore()}
                    disabled={isSaving}
                    className="h-11 rounded-md border border-coral/30 bg-coral/10 px-4 text-sm font-black text-coral disabled:cursor-wait disabled:opacity-50"
                  >
                    Delete boutique
                  </button>
                </>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                placeholder="Store name, e.g. LuxuryBandit Boutique"
                className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
              />
              <input
              value={storeSlug}
                onChange={(event) => setStoreSlug(normalizeSlug(event.target.value))}
                placeholder="Store URL slug, e.g. laden"
                className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
              />
              <input
                value={storeAddress}
                onChange={(event) => setStoreAddress(event.target.value)}
                placeholder="Store address"
                className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
              />
              <input
                value={whatsappNumber}
                onChange={(event) => setWhatsappNumber(event.target.value)}
                placeholder="WhatsApp order number"
                className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
              />
              <button
                type="button"
                onClick={() => void saveStore()}
                disabled={isSaving}
                className="h-12 rounded-md bg-ink px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-50 md:col-span-2"
              >
                Save store data
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-cobalt/20 bg-cobalt/5 p-3">
            <div className="grid gap-2">
              <div className="text-xl font-black text-ink">Live listings</div>
              <div className="flex flex-wrap gap-2">
                {visibleActiveLooks.length ? (
                  visibleActiveLooks.map((look) => (
                    <span key={look.id} className="rounded-md bg-white px-3 py-2 text-xs font-black text-ink shadow-soft">
                      {look.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm font-bold text-ink/50">No live listings yet.</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={selectedStoreSlug ? `/store/${selectedStoreSlug}` : "/try-this-look"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md bg-cobalt px-3 text-xs font-black text-white"
              >
                Open store page
              </a>
              <button
                type="button"
                onClick={() => void copyText(activeLookPublicUrl, "Public try-on link copied.")}
                className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-white px-3 text-xs font-black text-ink"
              >
                Copy link
              </button>
            </div>
          </div>

          <div className="grid content-start gap-3 rounded-md border border-black/10 bg-panel p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-ink/45">Add new offer</div>
                <div className="mt-1 text-sm font-bold text-ink/55">
                  {selectedStore ? `Create a new listing for ${selectedStore.name}.` : "Choose or save a seller before uploading a listing."}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateLook((value) => !value)}
                className="h-10 rounded-md bg-ink px-4 text-xs font-black text-white"
              >
                {showCreateLook ? "Hide form" : "Add new listing"}
              </button>
            </div>
            {showCreateLook && savedLook && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-lg font-black">✓</span>
                  <div className="grid gap-1">
                    <div className="text-sm font-black text-emerald-800">
                      {savedLook.published ? "Listing published and visible in the store." : "Listing saved as draft — not yet visible in the store."}
                    </div>
                    <div className="text-xs font-bold text-emerald-700 opacity-70">{savedLook.name}</div>
                    {!savedLook.published && (
                      <div className="mt-1 text-xs font-bold text-emerald-700 opacity-60">
                        Go to your listings below to review and make it live when ready.
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSavedLook(null)}
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-xs font-black text-white"
                >
                  + Add another listing
                </button>
              </div>
            )}
            {showCreateLook && !savedLook && (
              <LookForm
                mode="create"
                frontFileInputRef={frontFileInputRef}
                backFileInputRef={backFileInputRef}
                garmentFrontFileInputRef={garmentFrontFileInputRef}
                garmentBackFileInputRef={garmentBackFileInputRef}
                galleryFileInputRef={galleryFileInputRef}
                frontImage={newFrontLookImage}
                backImage={newBackLookImage}
                garmentFrontImage={newGarmentFrontImage}
                garmentBackImage={newGarmentBackImage}
                galleryImages={newGalleryEntries}
                lookName={lookName}
                campaignName={campaignName}
                availableSizes={availableSizes}
                price={price}
                salePrice={salePrice}
                discountLabel={discountLabel}
                dealEndsAt={dealEndsAt}
                inStock={inStock}
                availabilityNote={availabilityNote}
                deliveryTime={deliveryTime}
                productNote={productNote}
                isSaving={isSaving}
                isGeneratingDescription={descriptionGenerationTarget === "create"}
                onImageUpload={(event, view) => void handleImageUpload(event, view)}
                onGalleryUpload={(event) => void handleGalleryUpload(event)}
                onClearGallery={() => {
                  setNewGalleryEntries([]);
                  setNewFrontLookImage(null);
                }}
                onRemoveGalleryImage={removeCreateGalleryImage}
                onMoveGalleryImage={moveCreateGalleryImage}
                onCropGalleryImage={cropCreateGalleryImage}
                onPreviewGalleryImage={setPreviewGalleryImage}
                onLookNameChange={setLookName}
                onCampaignNameChange={setCampaignName}
                onAvailableSizesChange={setAvailableSizes}
                onPriceChange={setPrice}
                onSalePriceChange={setSalePrice}
                onDiscountLabelChange={setDiscountLabel}
                onDealEndsAtChange={setDealEndsAt}
                onInStockChange={setInStock}
                onAvailabilityNoteChange={setAvailabilityNote}
                onDeliveryTimeChange={setDeliveryTime}
                onProductNoteChange={setProductNote}
                hashtags={hashtags}
                onHashtagsChange={setHashtags}
                productType={newProductType}
                onProductTypeChange={setNewProductType}
                onGenerateDescription={() => void generateProductDescription("create")}
                onOpenExtractor={() => {
                  // For new looks, use the uploaded front image if available
                  const src = newFrontLookImage ?? (newGalleryEntries[0]?.url ?? null);
                  if (src) setExtractorSrc(src);
                }}
                onSubmit={() => void uploadLook(true)}
                onSubmitDraft={() => void uploadLook(false)}
              />
            )}
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Listings</h2>
            </div>
            <button type="button" onClick={() => void loadData()} className="inline-flex h-10 items-center gap-2 rounded-md bg-panel px-3 text-sm font-black">
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Refresh
            </button>
          </div>
          {/* Search + filter bar */}
          <div className="flex flex-wrap gap-2">
            <input
              value={listingSearch}
              onChange={(e) => { setListingSearch(e.target.value); setListingPage(1); }}
              placeholder="Search by name…"
              className="h-9 flex-1 min-w-[160px] rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
            />
            {(["all", "live", "draft"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => { setListingFilter(f); setListingPage(1); }}
                className={`h-9 rounded-md border px-3 text-xs font-black capitalize transition ${listingFilter === f ? "border-cobalt bg-cobalt text-white" : "border-black/10 bg-panel text-ink/60"}`}
              >
                {f === "all" ? `All (${looksForSelectedStore.length})` : f === "live" ? `Live (${looksForSelectedStore.filter(l => l.published !== false).length})` : `Draft (${looksForSelectedStore.filter(l => l.published === false).length})`}
              </button>
            ))}
          </div>
          {isLoading ? (
            <div className="text-sm font-black text-ink/50">Loading...</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {looksForSelectedStore.length === 0 && (
                <div className="rounded-md border border-black/10 bg-panel p-4 text-sm font-bold text-ink/55 sm:col-span-2 lg:col-span-4">
                  No listings for this seller yet. Upload the first listing above.
                </div>
              )}
              {looksForSelectedStore.length > 0 && pagedListings.length === 0 && (
                <div className="rounded-md border border-black/10 bg-panel p-4 text-sm font-bold text-ink/55 sm:col-span-2 lg:col-span-4">
                  No listings match your search.
                </div>
              )}
              {pagedListings.map((look) => {
                const active = activeLookIds.has(look.id);
                const isEditing = editingLookId === look.id;
                const lookGenerations = (data.generations ?? []).filter((generation) => generation.lookId === look.id);
                const adminGenerations = lookGenerations.filter((g) => g.visitorId?.startsWith("admin-"));
                const userGenerations = lookGenerations.filter((g) => !g.visitorId?.startsWith("admin-"));
                return (
                  <article key={look.id} data-look-id={look.id} className={`grid gap-2 rounded-md p-3 ${isEditing ? "bg-white sm:col-span-2 lg:col-span-4" : active ? "border border-cobalt bg-cobalt/10" : "border border-black/10 bg-panel"}`}>
                    {!isEditing && (
                      <>
                        <div className={`grid gap-1 ${look.backImageUrl ? "grid-cols-2" : ""}`}>
                          <div className="relative h-40 w-full overflow-hidden rounded-md bg-black/5">
                            <NextImage src={look.frontImageUrl ?? look.imageUrl ?? ""} alt={`${look.name} front`} fill sizes="320px" className="object-contain" />
                            {look.published === false && (
                              <div className="absolute left-1.5 top-1.5 rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow">
                                Draft
                              </div>
                            )}
                          </div>
                          {look.backImageUrl && (
                            <div className="relative h-40 w-full overflow-hidden rounded-md bg-black/5">
                              <NextImage src={look.backImageUrl} alt={`${look.name} back`} fill sizes="160px" className="object-contain" />
                            </div>
                          )}
                        </div>
                        {look.backImageUrl && <div className="rounded-full bg-cobalt/10 px-2 py-1 text-center text-[10px] font-black uppercase tracking-[0.12em] text-cobalt">Front + Back</div>}
                        {(look.galleryImagePaths ?? []).length > 0 && (
                          <div className="rounded-full bg-panel px-2 py-1 text-center text-[10px] font-black uppercase tracking-[0.12em] text-ink/50">
                            {(look.galleryImagePaths ?? []).length} gallery image{(look.galleryImagePaths ?? []).length !== 1 ? "s" : ""}
                          </div>
                        )}
                      </>
                    )}
                    {isEditing ? (
                      <div className="grid gap-3">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">Edit listing</div>
                          <h3 className="mt-1 text-2xl font-black text-ink">{look.name}</h3>
                        </div>
                        <LookForm
                          mode="edit"
                          look={look}
                          frontFileInputRef={editFrontFileInputRef}
                          backFileInputRef={editBackFileInputRef}
                          garmentFrontFileInputRef={editGarmentFrontFileInputRef}
                          garmentBackFileInputRef={editGarmentBackFileInputRef}
                          galleryFileInputRef={editGalleryFileInputRef}
                          frontImage={editFrontLookImage}
                          backImage={editBackLookImage}
                          garmentFrontImage={editGarmentFrontImage}
                          garmentBackImage={editGarmentBackImage}
                          galleryImages={editGalleryEntries}
                          lookName={editLookName}
                          campaignName={editCampaignName}
                          availableSizes={editAvailableSizes}
                          price={editPrice}
                          salePrice={editSalePrice}
                          discountLabel={editDiscountLabel}
                          dealEndsAt={editDealEndsAt}
                          inStock={editInStock}
                          availabilityNote={editAvailabilityNote}
                          deliveryTime={editDeliveryTime}
                          productNote={editProductNote}
                          isSaving={isSaving}
                          isGeneratingDescription={descriptionGenerationTarget === "edit"}
                          onImageUpload={(event, view) => void handleEditImageUpload(event, view)}
                          onGalleryUpload={(event) => void handleEditGalleryUpload(event)}
                          onClearGallery={() => {
                            setEditGalleryEntries([]);
                            setEditFrontLookImage(null);
                          }}
                          onRemoveGalleryImage={removeEditGalleryImage}
                          onMoveGalleryImage={moveEditGalleryImage}
                          onCropGalleryImage={cropEditGalleryImage}
                          onPreviewGalleryImage={setPreviewGalleryImage}
                          onOpenAiTool={() => openAiImageTool(look)}
                          onOpenExtractor={() => openExtractorForLook(look)}
                          onLookNameChange={setEditLookName}
                          onCampaignNameChange={setEditCampaignName}
                          onAvailableSizesChange={setEditAvailableSizes}
                          onPriceChange={setEditPrice}
                          onSalePriceChange={setEditSalePrice}
                          onDiscountLabelChange={setEditDiscountLabel}
                          onDealEndsAtChange={setEditDealEndsAt}
                          onInStockChange={setEditInStock}
                          onAvailabilityNoteChange={setEditAvailabilityNote}
                          onDeliveryTimeChange={setEditDeliveryTime}
                          onProductNoteChange={setEditProductNote}
                          hashtags={editHashtags}
                          onHashtagsChange={setEditHashtags}
                          productType={editProductType}
                          onProductTypeChange={setEditProductType}
                          onGenerateDescription={() => void generateProductDescription("edit")}
                          sellerSlug={editStoreSlug}
                          stores={data.stores ?? []}
                          onSellerSlugChange={setEditStoreSlug}
                          onSubmit={() => void saveEditedLook(look)}
                          onCancel={cancelEditingLook}
                        />
                        <a
                          href={`/admin/creative?look=${look.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-3 text-xs font-black text-white"
                        >
                          Create listing slides
                        </a>
                      </div>
                    ) : (
                      <>
                        <div className="font-black">{look.name}</div>
                        <div className="text-xs font-black uppercase tracking-[0.12em] text-cobalt/70">
                          {look.campaignName ?? "No campaign"}
                        </div>
                      </>
                    )}
                    <div className={`flex items-center gap-1.5 text-xs font-black ${look.storeName ? "text-ink/60" : "text-coral"}`}>
                      {look.storeSlug && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(look.storeSlug)}&backgroundColor=ffffff&color=000000`}
                          alt=""
                          className="h-4 w-4 shrink-0 rounded-full border border-black/10 bg-white object-cover"
                        />
                      )}
                      {look.storeName ?? "⚠ No seller assigned"}
                    </div>
                    {look.storeSlug && (() => {
                      const lookPath = `/look/${look.id}`;
                      const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${lookPath}`;
                      return (
                        <div className="grid gap-1">
                          <a
                            href={lookPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-cobalt underline-offset-2 hover:underline"
                          >
                            {lookPath}
                          </a>
                          <button
                            type="button"
                            onClick={async () => {
                              await navigator.clipboard.writeText(fullUrl);
                              setMessage("Instagram link copied — paste it in your bio or story.");
                            }}
                            className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-cobalt/25 bg-cobalt/5 px-3 text-xs font-black text-cobalt"
                          >
                            📸 Copy Instagram link
                          </button>
                        </div>
                      );
                    })()}
                    {look.storeAddress && <div className="text-xs font-bold text-ink/45">{look.storeAddress}</div>}
                    {(look.availableSizes ?? []).length > 0 && (
                      <div className="text-xs font-bold text-ink/45">Sizes: {(look.availableSizes ?? []).join(", ")}</div>
                    )}
                    {(look.salePrice || look.price || look.discountLabel) && (
                      <div className="flex flex-wrap gap-2 text-xs font-black">
                        {look.discountLabel && <span className="rounded-md bg-coral px-2 py-1 text-white">{look.discountLabel}</span>}
                        {look.salePrice && <span className="rounded-md bg-cobalt px-2 py-1 text-white">{look.salePrice}</span>}
                        {look.price && <span className="rounded-md bg-white px-2 py-1 text-ink/45 line-through">{look.price}</span>}
                      </div>
                    )}
                    {(look.inStock || look.availabilityNote || look.dealEndsAt) && (
                      <div className="grid gap-1 text-xs font-bold text-ink/50">
                        {look.inStock && <div>Availability: In stock now</div>}
                        {!look.inStock && look.availabilityNote && <div>Availability: {look.availabilityNote} days</div>}
                        {look.dealEndsAt && <div>Deal ends: {new Date(look.dealEndsAt).toLocaleString()}</div>}
                        {look.inStock && look.deliveryTime && <div>Delivery time: {look.deliveryTime} days</div>}
                      </div>
                    )}
                    {/* 1. EDIT — primary action, always first */}
                    {!isEditing && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => startEditingLook(look)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cobalt px-3 text-xs font-black text-white disabled:cursor-wait disabled:opacity-50"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                        Edit
                      </button>
                    )}

                    {/* 2. PUBLISH STATUS — Live/Draft badge + toggle */}
                    {look.published !== false ? (
                      <>
                        <span className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-black text-emerald-700">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Live
                        </span>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={async () => {
                            setIsSaving(true);
                            try {
                              await callAdminAction({ action: "update-look", id: look.id, published: false });
                              setMessage(`"${look.name}" hidden — set to Draft.`);
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Could not update.");
                            } finally { setIsSaving(false); }
                          }}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cobalt/10 px-3 text-xs font-black text-cobalt disabled:cursor-wait disabled:opacity-50"
                        >
                          <EyeOff aria-hidden="true" className="h-4 w-4" />
                          Hide (Draft)
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 text-xs font-black text-amber-700">
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          Draft
                        </span>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={async () => {
                            setIsSaving(true);
                            try {
                              await callAdminAction({ action: "update-look", id: look.id, published: true });
                              setMessage(`"${look.name}" is now live in the store.`);
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Could not update.");
                            } finally { setIsSaving(false); }
                          }}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-black text-emerald-700 disabled:cursor-wait disabled:opacity-50"
                        >
                          <Eye aria-hidden="true" className="h-4 w-4" />
                          Make live
                        </button>
                      </>
                    )}

                    {/* 3. ACTIVE (featured) */}
                    {active ? (
                      <>
                        <span className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-xs font-black text-emerald-700">
                          <Check aria-hidden="true" className="h-3.5 w-3.5" />
                          Active
                        </span>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void unsetActiveLook(look.id)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cobalt/10 px-3 text-xs font-black text-cobalt disabled:cursor-wait disabled:opacity-50"
                        >
                          <StarOff aria-hidden="true" className="h-4 w-4" />
                          Remove active
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void setActiveLook(look.id)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cobalt/10 px-3 text-xs font-black text-cobalt disabled:cursor-wait disabled:opacity-50"
                      >
                        <Star aria-hidden="true" className="h-4 w-4" />
                        Make active
                      </button>
                    )}

                    {/* 4. STOCK */}
                    {look.inStock !== false ? (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void markAsSold(look)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cobalt/10 px-3 text-xs font-black text-cobalt disabled:cursor-wait disabled:opacity-50"
                      >
                        <Tag aria-hidden="true" className="h-4 w-4" />
                        Mark as sold
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={async () => {
                          setIsSaving(true);
                          try {
                            await callAdminAction({ action: "update-look", id: look.id, inStock: true });
                            setMessage(`"${look.name}" marked as available again.`);
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Could not update.");
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 disabled:cursor-wait disabled:opacity-50"
                      >
                        <PackageCheck aria-hidden="true" className="h-4 w-4" />
                        Mark as available
                      </button>
                    )}

                    {/* 5. TOOLS */}
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => openAiImageTool(look)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cobalt/10 px-3 text-xs font-black text-cobalt"
                      >
                        <Sparkles aria-hidden="true" className="h-4 w-4" />
                        Create AI image
                      </button>
                    )}
                    {!isEditing && (
                      <a
                        href={`/admin/creative?look=${look.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cobalt/10 px-3 text-xs font-black text-cobalt"
                      >
                        <Layers aria-hidden="true" className="h-4 w-4" />
                        Create listing slides
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={!adminGenerations.length}
                      onClick={() => setGenerationGalleryLookId(look.id)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cobalt/10 px-3 text-xs font-black text-cobalt disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Images aria-hidden="true" className="h-4 w-4" />
                      {adminGenerations.length} generated images
                    </button>
                    <button
                      type="button"
                      disabled={!userGenerations.length}
                      onClick={() => setGenerationGalleryLookId(look.id)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cobalt/10 px-3 text-xs font-black text-cobalt disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <UserRound aria-hidden="true" className="h-4 w-4" />
                      User Gallery ({userGenerations.length})
                    </button>

                    {/* 6. META */}
                    <div className="text-xs font-bold text-ink/35">{new Date(look.createdAt).toLocaleString()}</div>

                    {/* 7. DELETE — always last */}
                    <button
                      type="button"
                      disabled={isSaving || (data.looks ?? []).length <= 1}
                      onClick={() => void deleteLook(look)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-coral/30 bg-coral/10 px-3 text-xs font-black text-coral disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      Delete
                    </button>
                  </article>
                );
              })}
            </div>
          )}
          {/* Pagination */}
          {totalListingPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-black/8 pt-3">
              <span className="text-xs font-bold text-ink/50">
                {((listingPage - 1) * LISTINGS_PER_PAGE) + 1}–{Math.min(listingPage * LISTINGS_PER_PAGE, filteredListings.length)} of {filteredListings.length}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={listingPage === 1}
                  onClick={() => setListingPage((p) => p - 1)}
                  className="h-8 w-8 rounded-md border border-black/10 bg-panel text-sm font-black disabled:opacity-30"
                >
                  ←
                </button>
                {Array.from({ length: totalListingPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setListingPage(p)}
                    className={`h-8 w-8 rounded-md text-xs font-black ${p === listingPage ? "bg-cobalt text-white" : "border border-black/10 bg-panel text-ink"}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={listingPage === totalListingPages}
                  onClick={() => setListingPage((p) => p + 1)}
                  className="h-8 w-8 rounded-md border border-black/10 bg-panel text-sm font-black disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-4">
          <div className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
            <h2 className="text-2xl font-black">Funnel stats</h2>
            {funnelStats.some((item) => item.value > 0) ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {funnelStats.map((item) => (
                  <div key={item.label} className="rounded-md border border-black/10 bg-panel p-3">
                    <div className="text-[11px] font-black uppercase tracking-[0.12em] text-ink/45">{item.label}</div>
                    <div className="mt-2 text-2xl font-black text-cobalt">{item.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold text-ink/50">No events yet.</p>
            )}
          </div>

          <div className="grid gap-2 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
            <h2 className="text-2xl font-black">Buyer requests</h2>
            {(data.leads ?? []).length ? (
              <div className="grid gap-2">
                {(data.leads ?? []).map((lead) => (
                  <div key={lead.id} className="rounded-md border border-black/10 bg-panel p-3 text-sm font-bold">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-base font-black">{lead.name || "No name"}</div>
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cobalt">
                        {lead.status ?? "new"}
                      </span>
                    </div>
                    <div>{lead.phone || "No phone"}</div>
                    <div>{lead.selectedSize ? `Size: ${lead.selectedSize}` : "No size selected"}</div>
                    <div>{lead.buyingPreference ? `Preference: ${lead.buyingPreference === "delivery" ? "Delivery" : "Pickup"}` : "No preference selected"}</div>
                    <div>{lead.leadSource ? `Source: ${lead.leadSource}` : "No source"}</div>
                    <div>{lead.marketingConsent ? "Marketing consent: yes" : "Marketing consent: no"}</div>
                    <div>{lead.email || "No email"}</div>
                    <div>{lead.instagram || "No Instagram"}</div>
                    {lead.uploadedPhotoUrl && (
                      <div className="mt-2 grid gap-1">
                        <div className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">Upload</div>
                        <a href={lead.uploadedPhotoUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-black/10 bg-white">
                          <img src={lead.uploadedPhotoUrl} alt="Customer upload" className="max-h-56 w-full object-contain" />
                        </a>
                      </div>
                    )}
                    <div className="mt-1 text-xs text-ink/45">{new Date(lead.createdAt).toLocaleString()}</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex min-h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-black text-ink">
                          <input
                            type="checkbox"
                            checked={(lead.status ?? "new") === "contacted" || (lead.status ?? "new") === "closed"}
                            disabled={isSaving || (lead.status ?? "new") === "closed"}
                            onChange={(event) => void updateLeadStatus(lead, event.target.checked ? "contacted" : "new")}
                            className="h-4 w-4 shrink-0 accent-cobalt"
                          />
                          Buyer contacted
                        </label>
                        <label className="flex min-h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-black text-ink">
                          <input
                            type="checkbox"
                            checked={(lead.status ?? "new") === "closed"}
                            disabled={isSaving}
                            onChange={(event) => void updateLeadStatus(lead, event.target.checked ? "closed" : "contacted")}
                            className="h-4 w-4 shrink-0 accent-cobalt"
                          />
                          Request closed
                        </label>
                      </div>
                      <button
                        type="button"
                        disabled={!lead.phone}
                        onClick={() => openLeadWhatsApp(lead)}
                        className="h-9 rounded-md bg-[#25D366] px-3 text-[11px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Open WhatsApp
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void deleteLead(lead)}
                      className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-coral/30 bg-coral/10 px-3 text-xs font-black text-coral disabled:cursor-wait disabled:opacity-50"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      Delete request
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold text-ink/50">No buyer requests yet.</p>
            )}
          </div>
        </section>

      </section>
      {aiToolLookId && (() => {
        const look = (data.looks ?? []).find((item) => item.id === aiToolLookId);
        const referenceImages = look ? getLookReferenceImages(look) : [];
        return (
          <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
            <div className="grid max-h-[92vh] w-full max-w-3xl gap-4 overflow-auto rounded-lg bg-white p-4 shadow-soft">
              <input ref={aiModelPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleAiModelPhotoUpload(event)} />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">Luxury Bandit AI Tool</div>
                  <h2 className="mt-1 text-2xl font-black text-ink">Create AI product image</h2>
                  <p className="mt-1 text-sm font-bold leading-6 text-ink/55">
                    Choose a product reference, choose a model source, and generate a new image for this listing. Internal test uses OpenAI now; sellers will need credits later.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAiImageTool}
                  disabled={isGeneratingAiImage}
                  className="h-11 rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              {look && (
                <div className="rounded-md border border-black/10 bg-panel p-3 text-sm font-black text-ink">
                  {look.storeName ? `${look.storeName} · ` : ""}{look.name}
                </div>
              )}

              {isGeneratingAiImage && (
                <div className="grid gap-3 rounded-md border border-cobalt/25 bg-cobalt/10 p-3">
                  <div className="flex items-center gap-3">
                    <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-cobalt" />
                    <div>
                      <div className="text-sm font-black text-cobalt">AI image is being created</div>
                      <div className="text-xs font-bold leading-5 text-ink/55">
                        Please wait. This usually takes 30 to 90 seconds. Running for {aiGenerationSeconds}s.
                      </div>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-cobalt" />
                  </div>
                  {aiReferenceImages.length > 0 && (
                    <div className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-md bg-white p-2">
                      <div className="flex flex-wrap gap-1">
                        {aiReferenceImages.map((img, i) => (
                          <img key={i} src={img} alt="" className="h-16 w-16 rounded border border-cobalt/40 object-cover object-top" />
                        ))}
                        {aiModelMode === "gallery-photo" && aiModelReferenceImage && (
                          <img src={aiModelReferenceImage} alt="" className="h-16 w-16 rounded border border-black/20 object-cover object-top" />
                        )}
                      </div>
                      <div className="text-xs font-bold leading-5 text-ink/60">
                        {aiReferenceImages.length} reference image{aiReferenceImages.length !== 1 ? "s" : ""} selected{aiModelMode === "gallery-photo" ? " + model reference" : ""}. Result will be saved to the gallery.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">1. Product reference</div>
                  <div className="text-xs font-bold text-ink/45">{aiReferenceImages.length} of max. 4 selected</div>
                </div>
                {referenceImages.length ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {referenceImages.map((image, index) => {
                      const selected = aiReferenceImages.includes(image);
                      return (
                        <div key={`${image.slice(0, 24)}-${index}`} className="relative">
                          <button
                            type="button"
                            onClick={() => toggleAiReferenceImage(image)}
                            className={`relative w-full overflow-hidden rounded-md border bg-panel p-1 ${selected ? "border-cobalt ring-2 ring-cobalt/25" : "border-black/10"}`}
                          >
                            <img src={image} alt="" className="aspect-square w-full rounded object-cover object-top" />
                            {selected && (
                              <div className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-cobalt">
                                <Check aria-hidden="true" className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-coral/20 bg-coral/10 p-3 text-sm font-black text-coral">
                    No product photos in this listing yet.
                  </div>
                )}
                {/* Upload a new photo to extract from */}
                <div className="flex items-center gap-2">
                  <input
                    ref={extractorInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleExtractorUpload(e)}
                  />
                  <button
                    type="button"
                    onClick={() => extractorInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-md border border-dashed border-cobalt/40 bg-cobalt/5 px-3 py-2 text-xs font-black text-cobalt hover:bg-cobalt/10 transition-colors"
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    Extract clothes from photo
                  </button>
                  <span className="text-xs font-bold text-ink/40">Upload any reference photo to detect &amp; crop individual garment pieces</span>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">2. Prompt</div>
                <textarea
                  value={aiImagePrompt}
                  onChange={(event) => setAiImagePrompt(event.target.value)}
                  placeholder="Optional: e.g. Make a black T-shirt with this motif. Show the whole shirt from collar to hem, full front visible."
                  className="min-h-24 rounded-md border border-black/10 bg-panel p-3 text-sm font-bold leading-6 outline-none focus:border-cobalt"
                />
              </div>

              <div className="grid gap-3 rounded-md border border-black/10 bg-panel p-3">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">3. Settings</div>

                <div className="grid gap-1">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-bold text-ink/55">Garment type</div>
                    <div className="text-xs text-ink/40">(auto-detected — change if wrong)</div>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {([
                      { value: "tops",       label: "Tops",       hint: "shirt, jacket, top, blouse" },
                      { value: "bottoms",    label: "Bottoms",    hint: "skirt, pants, jeans, shorts" },
                      { value: "one-pieces", label: "One-pieces", hint: "dress, jumpsuit, bodysuit" },
                      { value: "lingerie",   label: "Lingerie",   hint: "corset, bra, set, dessous" },
                    ] as const).map(({ value, label, hint }) => (
                      <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="aiGarmentCategory"
                          value={value}
                          checked={aiGarmentCategory === value}
                          onChange={() => setAiGarmentCategory(value)}
                          className="accent-cobalt h-3.5 w-3.5 cursor-pointer"
                        />
                        <span className="text-sm font-bold text-ink">{label}</span>
                        <span className="text-xs text-ink/35">{hint}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {(aiModelMode === "my-photo" || aiModelMode === "gallery-photo") ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-800 leading-5">
                    📐 <strong>The pose comes from your reference photo.</strong> Select the photo that shows the angle you want — front, back, or side. The AI cannot change the model's pose.
                    <span className="mt-1 block font-bold text-amber-600">Want a specific angle you don't have a photo for? Use <strong>AI Model</strong> instead and choose the view direction there.</span>
                  </div>
                ) : (
                  <div className="grid gap-1">
                    <div className="text-xs font-bold text-ink/55">
                      View direction
                      {aiModelMode === "ai-model" && aiViewDirections.size > 1 && (
                        <span className="ml-1.5 rounded bg-cobalt/15 px-1.5 py-0.5 text-[10px] font-black text-cobalt">
                          {aiViewDirections.size} images will be generated
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1">
                      {([
                        { value: "front", label: "Front" },
                        { value: "back",  label: "Back" },
                        { value: "side",  label: "Side" },
                      ] as const).map(({ value, label }) => (
                        <label key={value} className="flex cursor-pointer items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={aiViewDirections.has(value)}
                            onChange={() => {
                              setAiViewDirections(prev => {
                                const next = new Set(prev);
                                if (next.has(value)) {
                                  if (next.size > 1) next.delete(value);
                                } else {
                                  next.add(value);
                                }
                                return next;
                              });
                            }}
                            className="accent-cobalt h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className="text-sm font-bold text-ink">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-1">
                  <div className="text-xs font-bold text-ink/55">Model</div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {([
                      { value: "woman", label: "Woman" },
                      { value: "man",   label: "Man" },
                    ] as const).map(({ value, label }) => (
                      <label key={value} className="flex cursor-pointer items-center gap-1.5">
                        <input type="radio" name="aiModelGender" value={value} checked={aiModelGender === value} onChange={() => setAiModelGender(value)} className="accent-cobalt h-3.5 w-3.5 cursor-pointer" />
                        <span className="text-sm font-bold text-ink">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-1">
                  <div className="text-xs font-bold text-ink/55">Skin tone</div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {([
                      { value: "white",  label: "Fair" },
                      { value: "light",  label: "Light" },
                      { value: "asian",  label: "Tan" },
                      { value: "dark",   label: "Dark" },
                    ] as const).map(({ value, label }) => (
                      <label key={value} className="flex cursor-pointer items-center gap-1.5">
                        <input type="radio" name="aiSkinTone" value={value} checked={aiSkinTone === value} onChange={() => setAiSkinTone(value)} className="accent-cobalt h-3.5 w-3.5 cursor-pointer" />
                        <span className="text-sm font-bold text-ink">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">4. Model source</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {([
                    {
                      value: "ai-model",
                      icon: <Sparkles className="h-6 w-6" />,
                      label: "AI Model",
                      sub: "Generated model",
                    },
                    {
                      value: "my-photo",
                      icon: <Camera className="h-6 w-6" />,
                      label: "My Photo",
                      sub: "Upload your photo",
                    },
                    {
                      value: "gallery-photo",
                      icon: <Images className="h-6 w-6" />,
                      label: "Gallery Photo",
                      sub: "Use for consistent model",
                    },
                    {
                      value: "no-model",
                      icon: <Ghost className="h-6 w-6" />,
                      label: "No Model",
                      sub: "Garment only",
                    },
                  ] as const).map(({ value, icon, label, sub }) => {
                    const active = aiModelMode === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAiModelMode(value)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                          active
                            ? "border-cobalt bg-cobalt/8 text-cobalt"
                            : "border-black/10 bg-panel text-ink/50 hover:border-black/25 hover:text-ink/70"
                        }`}
                      >
                        {icon}
                        <span className="text-xs font-black leading-none">{label}</span>
                        <span className={`text-[10px] font-bold leading-none ${active ? "text-cobalt/70" : "text-ink/35"}`}>{sub}</span>
                      </button>
                    );
                  })}
                </div>
                {aiModelMode === "gallery-photo" && (
                  <div className="grid gap-2 rounded-md border border-black/10 bg-panel p-3">
                    <div className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">
                      Choose model image
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {referenceImages.map((image, index) => (
                        <button
                          key={`model-${image.slice(0, 24)}-${index}`}
                          type="button"
                          onClick={() => setAiModelReferenceImage(image)}
                          className={`overflow-hidden rounded-md border bg-white p-1 ${aiModelReferenceImage === image ? "border-cobalt ring-2 ring-cobalt/25" : "border-black/10"}`}
                        >
                          <img src={image} alt="" className="aspect-square w-full rounded object-cover object-top" />
                          <span className="mt-1 block text-[10px] font-black text-ink/50">Image {index + 1}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs font-bold leading-5 text-ink/50">
                      Select the photo that shows the angle you want to reproduce. The garment will be placed on the model in that exact pose.
                    </p>
                  </div>
                )}
                {aiModelMode === "my-photo" && (
                  <div className="grid gap-2 rounded-md border border-black/10 bg-panel p-3">
                    <button
                      type="button"
                      onClick={() => aiModelPhotoInputRef.current?.click()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-black text-white"
                    >
                      <ImagePlus aria-hidden="true" className="h-4 w-4" />
                      {aiModelPhoto ? "Change my photo" : "Upload my photo"}
                    </button>
                    {aiModelPhoto && (
                      <img src={aiModelPhoto} alt="" className="max-h-64 w-full rounded-md border border-black/10 bg-white object-contain" />
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
                <button
                  type="button"
                  onClick={closeAiImageTool}
                  disabled={isGeneratingAiImage}
                  className="inline-flex h-12 items-center justify-center rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void createAiImageForLook()}
                  disabled={isGeneratingAiImage || !referenceImages.length}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-cobalt px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isGeneratingAiImage ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden="true" className="h-4 w-4" />}
                  {isGeneratingAiImage
                    ? `Creating ${aiViewDirections.size} image${aiViewDirections.size > 1 ? "s" : ""}…`
                    : aiViewDirections.size > 1
                      ? `Create ${aiViewDirections.size} AI images`
                      : "Create AI image"}
                </button>
              </div>
              {aiToolError && (
                <div className="rounded-md border border-coral/30 bg-coral/10 p-3 text-sm font-bold text-coral">
                  {aiToolError}
                </div>
              )}
            </div>
          </div>
        );
      })()}
      {/* ── Community Moderation ── */}
      {data.generations && data.generations.filter(g => !g.visitorId?.startsWith("admin-") && g.imageUrl).length > 0 && (
        <CommunityModerationSection
          generations={data.generations.filter(g => !g.visitorId?.startsWith("admin-") && !!g.imageUrl) as Required<Pick<Generation,"imageUrl">> & Generation[]}
          isSaving={isSaving}
          onToggleHide={toggleHideGeneration}
          onDelete={deleteGeneration}
          onBulkAction={callAdminAction}
          onDataRefresh={() => void loadData()}
        />
      )}

      {previewGalleryImage && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true">
          <div className="grid max-h-[92vh] w-full max-w-5xl gap-3 overflow-auto rounded-lg bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xl font-black text-ink">Product photo</div>
              <button
                type="button"
                onClick={() => setPreviewGalleryImage(null)}
                className="h-11 rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink"
              >
                Close
              </button>
            </div>
            <img src={previewGalleryImage} alt="Product photo large" className="max-h-[72vh] w-full rounded-md border border-black/10 bg-white object-contain" />
            <button
              type="button"
              onClick={() => setPreviewGalleryImage(null)}
              className="inline-flex h-12 items-center justify-center rounded-md bg-ink px-4 text-sm font-black text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {generationGalleryLookId && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="grid max-h-[92vh] w-full max-w-6xl gap-3 overflow-auto rounded-lg bg-white p-4 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-2xl font-black text-ink">
                  {(data.looks ?? []).find((look) => look.id === generationGalleryLookId)?.name ?? "Generated images"}
                </div>
                <div className="mt-1 text-sm font-bold text-ink/55">AI previews for this offer only.</div>
              </div>
              <button
                type="button"
                onClick={() => setGenerationGalleryLookId(null)}
                className="h-11 rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink"
              >
                Close
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(data.generations ?? [])
                .filter((generation) => generation.lookId === generationGalleryLookId)
                .map((generation) => {
                  const contact = contactForGeneration(generation);
                  return (
                    <article key={generation.id} className="grid gap-2 rounded-md border border-black/10 bg-panel p-3">
                      {generation.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setSelectedGeneration(generation)}
                          className="group overflow-hidden rounded-md border border-black/10 bg-white"
                          title="Open large"
                        >
                          <img src={generation.imageUrl} alt="Generated look" className="aspect-square w-full object-contain transition group-hover:scale-[1.02]" />
                        </button>
                      )}
                      <div className="grid gap-1 text-xs font-bold text-ink/55">
                        <div>{new Date(generation.createdAt).toLocaleString()}</div>
                        <div className="rounded-md border border-black/10 bg-white p-2">
                          <div className="font-black text-ink">Customer</div>
                          <div>{contact?.name || "No name yet"}</div>
                          <div>{contact?.phone || "No phone yet"}</div>
                          <div>{contact?.email || "No email yet"}</div>
                          <div>{contact?.instagram || "No Instagram yet"}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void addGenerationToProductGallery(generation)}
                        disabled={isSaving}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cobalt px-3 text-xs font-black text-white disabled:cursor-wait disabled:opacity-50"
                      >
                        <ImagePlus aria-hidden="true" className="h-4 w-4" />
                        Add to product gallery
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleHideGeneration(generation)}
                        disabled={isSaving}
                        className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-xs font-black disabled:cursor-wait disabled:opacity-50 ${
                          generation.hidden ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {generation.hidden ? "Einblenden" : "Ausblenden"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteGeneration(generation)}
                        disabled={isSaving}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-coral/30 bg-coral/10 px-3 text-xs font-black text-coral disabled:cursor-wait disabled:opacity-50"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                        Delete
                      </button>
                    </article>
                  );
                })}
            </div>
          </div>
        </div>
      )}
      {selectedGeneration?.imageUrl && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="grid max-h-[92vh] w-full max-w-5xl gap-3 overflow-auto rounded-lg bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-2xl font-black text-ink">{selectedGeneration.lookName ?? "Generated look"}</div>
                <div className="mt-1 text-sm font-bold text-ink/55">{new Date(selectedGeneration.createdAt).toLocaleString()}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGeneration(null)}
                className="h-11 rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink"
              >
                Close
              </button>
            </div>
            <img src={selectedGeneration.imageUrl} alt="Generated look large" className="max-h-[72vh] w-full rounded-md border border-black/10 object-contain" />
            <div className="grid gap-2 rounded-md border border-black/10 bg-panel p-3 text-sm font-bold text-ink/65">
              {(() => {
                const contact = contactForGeneration(selectedGeneration);
                return (
                  <>
                    <div className="text-lg font-black text-ink">Customer</div>
                    <div>Name: {contact?.name || "No name yet"}</div>
                    <div>Phone: {contact?.phone || "No phone yet"}</div>
                    <div>Email: {contact?.email || "No email yet"}</div>
                    <div>Instagram: {contact?.instagram || "No Instagram yet"}</div>
                  </>
                );
              })()}
            </div>
            <button
              type="button"
              onClick={() => void addGenerationToProductGallery(selectedGeneration)}
              disabled={isSaving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-cobalt px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-50"
            >
              <ImagePlus aria-hidden="true" className="h-4 w-4" />
              Add to product gallery
            </button>
            <button
              type="button"
              onClick={() => void deleteGeneration(selectedGeneration)}
              disabled={isSaving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-coral/30 bg-coral/10 px-4 text-sm font-black text-coral disabled:cursor-wait disabled:opacity-50"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Delete generated image
            </button>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="grid w-full max-w-sm gap-4 rounded-xl border border-black/10 bg-white p-5 shadow-xl">
            <div>
              <div className="text-lg font-black text-ink">Delete listing?</div>
              <p className="mt-1 text-sm font-bold leading-6 text-ink/60">
                <span className="font-black text-ink">"{deleteConfirm.name}"</span> will be permanently removed. This cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="h-11 rounded-md border border-black/10 bg-panel text-sm font-black text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeleteLook(deleteConfirm)}
                className="h-11 rounded-md bg-coral text-sm font-black text-white"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
      {cropState && (
        <CropModal
          imageSrc={cropState.src}
          outputRatio={4 / 5}
          onConfirm={cropState.onConfirm}
          onCancel={() => setCropState(null)}
        />
      )}

      {extractorSrc && (
        <GarmentExtractorModal
          imageSrc={extractorSrc}
          onConfirm={handleExtractorConfirm}
          onCancel={() => setExtractorSrc(null)}
        />
      )}
    </main>
  );
}
