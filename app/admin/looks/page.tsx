"use client";

import { Check, ImagePlus, Loader2, Pencil, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, RefObject, useEffect, useRef, useState } from "react";

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
  availabilityNote?: string;
  deliveryTime?: string;
  productNote?: string;
  createdAt: string;
  imageUrl: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  garmentFrontImageUrl?: string;
  garmentBackImageUrl?: string;
  galleryImageUrls?: string[];
};

type Store = {
  id: string;
  name: string;
  slug: string;
  address?: string;
  whatsappNumber?: string;
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
  imageUrl?: string;
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
  galleryImages: string[];
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
  showAdvancedViews: boolean;
  isSaving: boolean;
  onImageUpload: (event: ChangeEvent<HTMLInputElement>, view: "front" | "back" | "garment-front" | "garment-back") => void;
  onGalleryUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearGallery: () => void;
  onRemoveGalleryImage: (image: string) => void;
  onToggleAdvancedViews: () => void;
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
  onSubmit: () => void;
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
  showAdvancedViews,
  isSaving,
  onImageUpload,
  onGalleryUpload,
  onClearGallery,
  onRemoveGalleryImage,
  onToggleAdvancedViews,
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
  onSubmit,
  onCancel
}: LookFormProps) {
  const isEdit = mode === "edit";
  const displayFrontImage = frontImage ?? look?.frontImageUrl ?? look?.imageUrl ?? null;
  const displayBackImage = backImage ?? look?.backImageUrl ?? null;
  const displayGarmentFrontImage = garmentFrontImage ?? look?.garmentFrontImageUrl ?? null;
  const displayGarmentBackImage = garmentBackImage ?? look?.garmentBackImageUrl ?? null;
  const currentGalleryImages = look?.galleryImageUrls ?? [];
  const galleryImagesToShow = galleryImages.length ? galleryImages : currentGalleryImages;

  return (
    <div className="grid content-start gap-3">
      <input ref={frontFileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => onImageUpload(event, "front")} />
      <input ref={backFileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => onImageUpload(event, "back")} />
      <input ref={garmentFrontFileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => onImageUpload(event, "garment-front")} />
      <input ref={garmentBackFileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => onImageUpload(event, "garment-back")} />
      <input ref={galleryFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onGalleryUpload} />

      <div className="rounded-md border border-cobalt/20 bg-cobalt/5 p-3 text-sm font-bold leading-6 text-ink/60">
        {isEdit
          ? "Replace only the images you want to change. Unchanged images stay saved."
          : "For the Instagram test, upload one main campaign image and optional product gallery images. Customers can swipe through the gallery on mobile before they try the look."}
      </div>

      <div className="grid gap-3 rounded-md border border-black/10 bg-panel p-3">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Product images</div>
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => frontFileInputRef.current?.click()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-cobalt/25 bg-cobalt/10 px-4 text-sm font-black text-cobalt"
          >
            <ImagePlus aria-hidden="true" className="h-4 w-4" />
            {isEdit ? "Replace campaign image" : "Upload campaign image"}
          </button>
          <button
            type="button"
            onClick={() => garmentFrontFileInputRef.current?.click()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-cobalt/25 bg-cobalt/10 px-4 text-sm font-black text-cobalt"
          >
            <ImagePlus aria-hidden="true" className="h-4 w-4" />
            {isEdit ? "Replace clean garment reference" : "Upload clean garment reference"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => galleryFileInputRef.current?.click()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-black text-ink"
        >
          <ImagePlus aria-hidden="true" className="h-4 w-4" />
          {isEdit ? "Replace gallery images" : "Upload product gallery images"}
        </button>
        <div className="rounded-md border border-black/10 bg-white p-3">
          <button
            type="button"
            onClick={onToggleAdvancedViews}
            className="flex w-full items-center justify-between text-left text-sm font-black text-ink"
          >
            <span>Advanced: front/back views</span>
            <span>{showAdvancedViews ? "Hide" : "Show"}</span>
          </button>
          {showAdvancedViews && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => backFileInputRef.current?.click()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink"
              >
                <ImagePlus aria-hidden="true" className="h-4 w-4" />
                {isEdit ? "Replace back campaign image" : "Optional back campaign image"}
              </button>
              <button
                type="button"
                onClick={() => garmentBackFileInputRef.current?.click()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink"
              >
                <ImagePlus aria-hidden="true" className="h-4 w-4" />
                {isEdit ? "Replace back garment reference" : "Optional back garment reference"}
              </button>
            </div>
          )}
        </div>

        {(displayFrontImage || displayBackImage || displayGarmentFrontImage || displayGarmentBackImage) && (
          <div className="grid gap-3 md:grid-cols-2">
            {displayFrontImage && (
              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-cobalt">Campaign image</div>
                <img src={displayFrontImage} alt="" className="aspect-square w-full rounded-md border border-black/10 bg-white object-contain" />
              </div>
            )}
            {displayGarmentFrontImage && (
              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-cobalt">Clean garment reference</div>
                <img src={displayGarmentFrontImage} alt="" className="aspect-square w-full rounded-md border border-black/10 bg-white object-contain" />
              </div>
            )}
            {displayBackImage && (
              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-ink/45">Back campaign</div>
                <img src={displayBackImage} alt="" className="aspect-square w-full rounded-md border border-black/10 bg-white object-contain" />
              </div>
            )}
            {displayGarmentBackImage && (
              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-ink/45">Back garment reference</div>
                <img src={displayGarmentBackImage} alt="" className="aspect-square w-full rounded-md border border-black/10 bg-white object-contain" />
              </div>
            )}
          </div>
        )}

        <div className="grid gap-2 rounded-md border border-black/10 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">Product gallery</div>
              <div className="text-sm font-bold text-ink/55">
                {galleryImagesToShow.length
                  ? `${galleryImagesToShow.length} gallery images`
                  : "No gallery images yet"}
              </div>
            </div>
            {galleryImagesToShow.length > 0 && (
              <button
                type="button"
                onClick={onClearGallery}
                className="h-9 rounded-md border border-coral/30 bg-coral/10 px-3 text-xs font-black text-coral"
              >
                Clear gallery
              </button>
            )}
          </div>
          {galleryImagesToShow.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
              {galleryImagesToShow.slice(0, 12).map((image, index) => (
                <div key={`${image.slice(0, 24)}-${index}`} className="relative">
                  <img src={image} alt="" className="aspect-square rounded border border-black/10 bg-panel object-cover object-top" />
                  <button
                    type="button"
                    onClick={() => onRemoveGalleryImage(image)}
                    className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full border border-white/80 bg-black/70 text-xs font-black text-white shadow-soft"
                    aria-label={`Remove gallery image ${index + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-black/15 bg-panel p-3 text-xs font-bold text-ink/45">
              No gallery images yet.
            </div>
          )}
        </div>
      </div>

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
      <input
        value={price}
        onChange={(event) => onPriceChange(event.target.value)}
        placeholder="Regular price optional, e.g. 189 EUR"
        className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
      />
      <input
        value={salePrice}
        onChange={(event) => onSalePriceChange(event.target.value)}
        placeholder="Action price optional, e.g. 129 EUR"
        className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
      />
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
      <label className="flex items-center gap-3 rounded-md border border-black/10 bg-panel px-3 py-3 text-sm font-bold text-ink">
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
      <div className={onCancel ? "grid grid-cols-2 gap-2" : ""}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSaving}
          className={`inline-flex h-12 items-center justify-center gap-2 rounded-md px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-50 ${isEdit ? "bg-cobalt" : "bg-coral"}`}
        >
          {isSaving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden="true" className="h-4 w-4" />}
          {isEdit ? "Save changes" : "Save and make active"}
        </button>
        {onCancel && (
          <button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="inline-flex h-12 items-center justify-center rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
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
  const [editingLookId, setEditingLookId] = useState<string | null>(null);
  const [editLookName, setEditLookName] = useState("");
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
  const [editFrontLookImage, setEditFrontLookImage] = useState<string | null>(null);
  const [editBackLookImage, setEditBackLookImage] = useState<string | null>(null);
  const [editGarmentFrontImage, setEditGarmentFrontImage] = useState<string | null>(null);
  const [editGarmentBackImage, setEditGarmentBackImage] = useState<string | null>(null);
  const [editGalleryImages, setEditGalleryImages] = useState<string[]>([]);
  const [editOriginalGalleryImages, setEditOriginalGalleryImages] = useState<string[]>([]);
  const [publicTryOnUrl, setPublicTryOnUrl] = useState("");
  const [newFrontLookImage, setNewFrontLookImage] = useState<string | null>(null);
  const [newBackLookImage, setNewBackLookImage] = useState<string | null>(null);
  const [newGarmentFrontImage, setNewGarmentFrontImage] = useState<string | null>(null);
  const [newGarmentBackImage, setNewGarmentBackImage] = useState<string | null>(null);
  const [newGalleryImages, setNewGalleryImages] = useState<string[]>([]);
  const [data, setData] = useState<AdminPayload>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateLook, setShowCreateLook] = useState(false);
  const [showAdvancedViews, setShowAdvancedViews] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [generationGalleryLookId, setGenerationGalleryLookId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  const savePin = () => {
    window.localStorage.setItem(ADMIN_PIN_KEY, pin);
    void loadData(pin);
  };

  const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>, view: "front" | "back" | "garment-front" | "garment-back") => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setMessage(null);
    try {
      validateImageFile(file);
      const dataUrl = await fileToDataUrl(file);
      if (view === "front") setNewFrontLookImage(dataUrl);
      else if (view === "back") setNewBackLookImage(dataUrl);
      else if (view === "garment-front") setNewGarmentFrontImage(dataUrl);
      else setNewGarmentBackImage(dataUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : SUPPORTED_IMAGE_MESSAGE);
      if (view === "front") setNewFrontLookImage(null);
      else if (view === "back") setNewBackLookImage(null);
      else if (view === "garment-front") setNewGarmentFrontImage(null);
      else setNewGarmentBackImage(null);
      event.target.value = "";
    }
  };

  const handleGalleryUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setError(null);
    setMessage(null);
    try {
      files.forEach(validateImageFile);
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      setNewGalleryImages((current) => [...current, ...dataUrls].slice(0, 12));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : SUPPORTED_IMAGE_MESSAGE);
    } finally {
      event.target.value = "";
    }
  };

  const handleEditImageUpload = async (event: ChangeEvent<HTMLInputElement>, view: "front" | "back" | "garment-front" | "garment-back") => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setMessage(null);
    try {
      validateImageFile(file);
      const dataUrl = await fileToDataUrl(file);
      if (view === "front") setEditFrontLookImage(dataUrl);
      else if (view === "back") setEditBackLookImage(dataUrl);
      else if (view === "garment-front") setEditGarmentFrontImage(dataUrl);
      else setEditGarmentBackImage(dataUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : SUPPORTED_IMAGE_MESSAGE);
      if (view === "front") setEditFrontLookImage(null);
      else if (view === "back") setEditBackLookImage(null);
      else if (view === "garment-front") setEditGarmentFrontImage(null);
      else setEditGarmentBackImage(null);
    } finally {
      event.target.value = "";
    }
  };

  const handleEditGalleryUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setError(null);
    setMessage(null);
    try {
      files.forEach(validateImageFile);
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      setEditGalleryImages((current) => [...current, ...dataUrls].slice(0, 12));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : SUPPORTED_IMAGE_MESSAGE);
    } finally {
      event.target.value = "";
    }
  };

  const removeCreateGalleryImage = (image: string) => {
    setNewGalleryImages((current) => current.filter((item) => item !== image));
  };

  const removeEditGalleryImage = (image: string) => {
    setEditGalleryImages((current) => current.filter((item) => item !== image));
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

  const uploadLook = async () => {
    if (!newFrontLookImage) {
      setError("Upload a campaign image first.");
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
        frontImage: newFrontLookImage,
        backImage: newBackLookImage,
        garmentFrontImage: newGarmentFrontImage,
        garmentBackImage: newGarmentBackImage,
        galleryImages: newGalleryImages
      });
      setSelectedStoreSlug(normalizeSlug(storeSlug));
      setNewFrontLookImage(null);
      setNewBackLookImage(null);
      setNewGarmentFrontImage(null);
      setNewGarmentBackImage(null);
      setNewGalleryImages([]);
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
      setShowAdvancedViews(false);
      setMessage("New look is now active.");
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

  const deleteLook = async (look: Look) => {
    const confirmed = window.confirm(`Delete "${look.name}" from look history?`);
    if (!confirmed) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await callAdminAction({ action: "delete-look", id: look.id });
      setMessage("Look deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Look could not be deleted.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingLook = (look: Look) => {
    setEditingLookId(look.id);
    setEditLookName(look.name);
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
    setEditFrontLookImage(null);
    setEditBackLookImage(null);
    setEditGarmentFrontImage(null);
    setEditGarmentBackImage(null);
    setEditOriginalGalleryImages(look.galleryImageUrls ?? []);
    setEditGalleryImages(look.galleryImageUrls ?? []);
    setMessage(null);
    setError(null);
  };

  const cancelEditingLook = () => {
    setEditingLookId(null);
    setEditLookName("");
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
    setEditFrontLookImage(null);
    setEditBackLookImage(null);
    setEditGarmentFrontImage(null);
    setEditGarmentBackImage(null);
    setEditOriginalGalleryImages([]);
    setEditGalleryImages([]);
  };

  const saveEditedLook = async (look: Look) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const keepGalleryIndexes = editGalleryImages
        .filter((image) => !image.startsWith("data:image/"))
        .map((image) => editOriginalGalleryImages.indexOf(image))
        .filter((index) => index >= 0);
      await callAdminAction({
        action: "update-look",
        id: look.id,
        name: editLookName.trim() || look.name,
        campaignName: editCampaignName.trim(),
        storeName: look.storeName ?? storeName.trim(),
        storeSlug: look.storeSlug ?? storeSlug.trim(),
        storeAddress: look.storeAddress ?? storeAddress.trim(),
        whatsappNumber: look.whatsappNumber ?? whatsappNumber.trim(),
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
        frontImage: editFrontLookImage,
        backImage: editBackLookImage,
        garmentFrontImage: editGarmentFrontImage,
        garmentBackImage: editGarmentBackImage,
        galleryImages: editGalleryImages.filter((image) => image.startsWith("data:image/")),
        keepGalleryIndexes
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
            <p className="text-xs font-bold leading-5 text-ink/50">
              Set <span className="font-black">TRY_THIS_LOOK_ADMIN_PIN</span> in Vercel to control who can enter.
            </p>
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
          <h1 className="text-5xl font-black leading-none text-ink">Looks</h1>
          <p className="max-w-3xl text-sm font-bold leading-6 text-ink/60">
            Manage one boutique, its offers, Instagram creatives, and incoming leads.
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
              placeholder="Admin PIN, optional for local MVP"
              className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
            />
            <button type="button" onClick={savePin} className="h-12 rounded-md bg-ink px-5 text-sm font-black text-white">
              Load admin
            </button>
          </div>
          <p className="text-xs font-bold leading-5 text-ink/50">
            For production, set <span className="font-black">TRY_THIS_LOOK_ADMIN_PIN</span> in your server environment.
          </p>
        </section>

        {error && <div className="rounded-md border border-coral/25 bg-coral/10 p-4 text-sm font-black text-coral">{error}</div>}
        {message && <div className="rounded-md border border-cobalt/20 bg-cobalt/10 p-4 text-sm font-black text-cobalt">{message}</div>}

        <section className="grid gap-4 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">Step 1</div>
              <h2 className="mt-1 text-3xl font-black leading-none text-ink">Boutique</h2>
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
                    href={`/try-this-look?store=${selectedStore.slug}`}
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
              <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">Step 2</div>
              <div className="text-xl font-black text-ink">Active offers</div>
              <div className="flex flex-wrap gap-2">
                {visibleActiveLooks.length ? (
                  visibleActiveLooks.map((look) => (
                    <span key={look.id} className="rounded-md bg-white px-3 py-2 text-xs font-black text-ink shadow-soft">
                      {look.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm font-bold text-ink/50">No active looks yet.</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={selectedStoreSlug ? `/try-this-look?store=${selectedStoreSlug}` : "/try-this-look"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md bg-cobalt px-3 text-xs font-black text-white"
              >
                Open user page
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
                  {selectedStore ? `Create a new look for ${selectedStore.name}.` : "Choose or save a store before uploading a look."}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateLook((value) => !value)}
                className="h-10 rounded-md bg-ink px-4 text-xs font-black text-white"
              >
                {showCreateLook ? "Hide form" : "Add new look"}
              </button>
            </div>
            {showCreateLook && (
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
                galleryImages={newGalleryImages}
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
                showAdvancedViews={showAdvancedViews}
                isSaving={isSaving}
                onImageUpload={(event, view) => void handleImageUpload(event, view)}
                onGalleryUpload={(event) => void handleGalleryUpload(event)}
                onClearGallery={() => setNewGalleryImages([])}
                onRemoveGalleryImage={removeCreateGalleryImage}
                onToggleAdvancedViews={() => setShowAdvancedViews((value) => !value)}
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
                onSubmit={() => void uploadLook()}
              />
            )}
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">Step 3</div>
              <h2 className="mt-1 text-2xl font-black">Offers</h2>
            </div>
            <button type="button" onClick={() => void loadData()} className="inline-flex h-10 items-center gap-2 rounded-md bg-panel px-3 text-sm font-black">
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Refresh
            </button>
          </div>
          {isLoading ? (
            <div className="text-sm font-black text-ink/50">Loading...</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {looksForSelectedStore.length === 0 && (
                <div className="rounded-md border border-black/10 bg-panel p-4 text-sm font-bold text-ink/55 sm:col-span-2 lg:col-span-4">
                  No looks for this store yet. Upload the first look for this boutique above.
                </div>
              )}
              {looksForSelectedStore.map((look) => {
                const active = activeLookIds.has(look.id);
                const isEditing = editingLookId === look.id;
                const lookGenerations = (data.generations ?? []).filter((generation) => generation.lookId === look.id);
                return (
                  <article key={look.id} className={`grid gap-2 rounded-md border p-3 ${isEditing ? "border-cobalt bg-white sm:col-span-2 lg:col-span-4" : active ? "border-cobalt bg-cobalt/10" : "border-black/10 bg-panel"}`}>
                    {!isEditing && (
                      <>
                        <div className={`grid gap-1 ${look.backImageUrl ? "grid-cols-2" : ""}`}>
                          <img src={look.frontImageUrl ?? look.imageUrl} alt={`${look.name} front`} className="aspect-square w-full rounded-md border border-black/10 bg-white object-contain" />
                          {look.backImageUrl && (
                            <img src={look.backImageUrl} alt={`${look.name} back`} className="aspect-square w-full rounded-md border border-black/10 bg-white object-contain" />
                          )}
                        </div>
                        {look.backImageUrl && <div className="rounded-full bg-cobalt/10 px-2 py-1 text-center text-[10px] font-black uppercase tracking-[0.12em] text-cobalt">Front + Back</div>}
                        {(look.galleryImageUrls ?? []).length > 0 && (
                          <div className="rounded-full bg-panel px-2 py-1 text-center text-[10px] font-black uppercase tracking-[0.12em] text-ink/50">
                            {(look.galleryImageUrls ?? []).length} gallery images
                          </div>
                        )}
                      </>
                    )}
                    {isEditing ? (
                      <div className="grid gap-3 rounded-md border border-black/10 bg-white p-3">
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">Edit look</div>
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
                          galleryImages={editGalleryImages}
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
                          showAdvancedViews={showAdvancedViews}
                          isSaving={isSaving}
                          onImageUpload={(event, view) => void handleEditImageUpload(event, view)}
                          onGalleryUpload={(event) => void handleEditGalleryUpload(event)}
                          onClearGallery={() => setEditGalleryImages([])}
                          onRemoveGalleryImage={removeEditGalleryImage}
                          onToggleAdvancedViews={() => setShowAdvancedViews((value) => !value)}
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
                          onSubmit={() => void saveEditedLook(look)}
                          onCancel={cancelEditingLook}
                        />
                        <a
                          href={`/admin/creative?look=${look.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-3 text-xs font-black text-white"
                        >
                          Create Instagram post
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
                    {look.storeName && <div className="text-xs font-black text-ink/60">{look.storeName}</div>}
                    {look.storeSlug && (
                      <a
                        href={`/try-this-look?store=${look.storeSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-cobalt underline-offset-2 hover:underline"
                      >
                        /try-this-look?store={look.storeSlug}
                      </a>
                    )}
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
                    <button
                      type="button"
                      disabled={!lookGenerations.length}
                      onClick={() => setGenerationGalleryLookId(look.id)}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 bg-white px-3 text-xs font-black text-ink disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {lookGenerations.length} generated images
                    </button>
                    <div className="text-xs font-bold text-ink/45">{new Date(look.createdAt).toLocaleString()}</div>
                    {!isEditing && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => startEditingLook(look)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-black text-ink disabled:cursor-wait disabled:opacity-50"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                        Edit
                      </button>
                    )}
                    {!isEditing && (
                      <a
                        href={`/admin/creative?look=${look.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cobalt px-3 text-xs font-black text-white"
                      >
                        Create Instagram post
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={active || isSaving}
                      onClick={() => void setActiveLook(look.id)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-3 text-xs font-black text-white disabled:bg-cobalt disabled:opacity-100"
                    >
                      {active && <Check aria-hidden="true" className="h-4 w-4" />}
                      {active ? "Active" : "Make active"}
                    </button>
                    {active && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void unsetActiveLook(look.id)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-black text-ink disabled:cursor-wait disabled:opacity-50"
                      >
                        Remove active
                      </button>
                    )}
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
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="grid gap-2 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
            <h2 className="text-2xl font-black">Funnel stats</h2>
            {funnelStats.some((item) => item.value > 0) ? (
              funnelStats.map((item) => (
                <div key={item.label} className="flex items-center justify-between border-b border-black/5 py-2 text-sm font-black">
                  <span>{item.label}</span>
                  <span className="text-cobalt">{item.value}</span>
                </div>
              ))
            ) : (
              <p className="text-sm font-bold text-ink/50">No events yet.</p>
            )}
          </div>

          <div className="grid gap-2 rounded-lg border border-black/10 bg-white p-4 shadow-soft lg:col-span-2">
            <h2 className="text-2xl font-black">Customer requests</h2>
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
                      <div className="grid grid-cols-3 gap-2">
                        {(["new", "contacted", "closed"] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={isSaving || (lead.status ?? "new") === status}
                            onClick={() => void updateLeadStatus(lead, status)}
                            className="h-9 rounded-md border border-black/10 bg-white px-2 text-[11px] font-black capitalize text-ink disabled:bg-cobalt disabled:text-white"
                          >
                            {status}
                          </button>
                        ))}
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
              <p className="text-sm font-bold text-ink/50">No leads yet.</p>
            )}
          </div>
        </section>

      </section>
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
    </main>
  );
}
