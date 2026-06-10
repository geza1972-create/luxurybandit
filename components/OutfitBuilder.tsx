"use client";

import { getClientAccountId, getWorkspaceStorageKey } from "@/lib/client-account";
import { Check, Download, Footprints, Gem, ImagePlus, Loader2, RefreshCw, Shirt, Sparkles, Trash2, UserRound } from "lucide-react";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type GalleryImageItem = {
  id: string;
  type: "upload" | "cutout" | "shop-image" | "model-image";
  path: string;
  url: string;
  createdAt: string;
  name: string;
};

type ModelGalleryItem = {
  id: string;
  name: string;
  imageDataUrl: string;
  createdAt: string;
};

type CreditStatus = {
  accountId: string;
  credits: number;
  freeCredits: number;
  costs: {
    "detect-products": number;
    "retouch-cutout": number;
    "rebuild-product": number;
    "fashion-model": number;
    "fashion-model-selected": number;
  };
};

type OutfitSlot = "upper_body" | "lower_body" | "shoes" | "accessory" | "full_body";
type ProductSource = "user" | "shopcut";
type ModelFraming = "full_body" | "same_as_upload" | "half_body";
type AiModelGender = "female" | "male";

type ProductAsset = {
  id: string;
  source: ProductSource;
  name: string;
  category: string;
  bodyZone: OutfitSlot;
  imageUrl: string;
  retouchedImageUrl?: string;
  thumbnailUrl: string;
  color?: string;
  description?: string;
  isTryOnReady: boolean;
  createdAt: string;
  tags: string[];
  collectionName?: string;
  isPublicGalleryItem: boolean;
  disabledReason?: string;
  productGroupId?: string;
  productGroupTitle?: string;
  viewType?: "front" | "back";
  displayOrder?: number;
};

type StoredDetectedProduct = {
  label?: string;
  color?: string;
  material?: string;
  shape?: string;
  details?: string;
  description?: string;
  selected?: boolean;
};

type StoredProductAsset = {
  id: string;
  name: string;
  bodyZone: OutfitSlot;
  imageDataUrl: string;
  description?: string;
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

const MODEL_GALLERY_STORAGE_KEY = "shopcut-ai-model-gallery";
const DETECTED_PRODUCTS_STORAGE_KEY = "shopcut-ai-latest-detected-products";
const PRODUCT_ASSETS_STORAGE_KEY = "shopcut-ai-product-assets";
const getModelGalleryStorageKey = () => getWorkspaceStorageKey(MODEL_GALLERY_STORAGE_KEY);
const getProductAssetsStorageKey = () => getWorkspaceStorageKey(PRODUCT_ASSETS_STORAGE_KEY);
const AI_GENERATED_MODEL_ID = "ai-generated-new-model";
const MAX_MODEL_GALLERY_ITEMS = 8;
const MAX_STORED_MODEL_EDGE = 700;

const outfitSlots: Array<{ label: string; value: OutfitSlot }> = [
  { label: "Tops", value: "upper_body" },
  { label: "Bottoms", value: "lower_body" },
  { label: "Shoes", value: "shoes" },
  { label: "Accessories", value: "accessory" },
  { label: "Full outfit", value: "full_body" }
];

const modelFramingOptions: Array<{ label: string; value: ModelFraming; prompt: string }> = [
  {
    label: "Full body",
    value: "full_body",
    prompt: "Show the complete model from head to toe in a full-body catalog pose."
  },
  {
    label: "Same as uploaded",
    value: "same_as_upload",
    prompt: "Keep the model crop and framing close to the uploaded model reference."
  },
  {
    label: "Half body",
    value: "half_body",
    prompt: "Show the model as a half-body ecommerce crop while keeping the selected garments visible."
  }
];

const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const sampleProductSvg = (label: string, color: string, shape: "shirt" | "pants" | "blouse" | "shoes" | "dress" | "jacket") => {
  const common = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><rect width="800" height="800" fill="#f8f8f6"/><g filter="url(#s)"><path d="M0 0h1" fill="none"/></g><defs><filter id="s"><feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#000" flood-opacity=".14"/></filter></defs>`;
  const endSvg = `<title>${label}</title></svg>`;
  if (shape === "shirt") {
    return svgDataUrl(`${common}<path d="M275 205l-95 58 52 116 58-29v245h220V350l58 29 52-116-95-58-58 58H333l-58-58z" fill="${color}" stroke="#111" stroke-width="10" stroke-linejoin="round"/><path d="M333 263c20 34 114 34 134 0" fill="none" stroke="#111" stroke-width="8"/>${endSvg}`);
  }
  if (shape === "pants") {
    return svgDataUrl(`${common}<path d="M300 165h200l28 428H428l-28-255-28 255H272l28-428z" fill="${color}" stroke="#111" stroke-width="10" stroke-linejoin="round"/><path d="M300 225h200M400 165v168" stroke="#111" stroke-width="8"/>${endSvg}`);
  }
  if (shape === "blouse") {
    return svgDataUrl(`${common}<path d="M275 190l-102 82 65 98 53-32 14 252h190l14-252 53 32 65-98-102-82-64 58H339l-64-58z" fill="${color}" stroke="#111" stroke-width="9" stroke-linejoin="round"/><path d="M340 248c22 38 98 38 120 0M400 255v320" stroke="#d6d6d6" stroke-width="8"/>${endSvg}`);
  }
  if (shape === "shoes") {
    return svgDataUrl(`${common}<path d="M165 438c70 10 132-4 188-47 22 54 8 93-42 119H160c-40 0-50-54 5-72z" fill="${color}" stroke="#111" stroke-width="10" stroke-linejoin="round"/><path d="M445 438c70 10 132-4 188-47 22 54 8 93-42 119H440c-40 0-50-54 5-72z" fill="${color}" stroke="#111" stroke-width="10" stroke-linejoin="round"/>${endSvg}`);
  }
  if (shape === "dress") {
    return svgDataUrl(`${common}<path d="M330 155h140l58 190 82 250H190l82-250 58-190z" fill="${color}" stroke="#111" stroke-width="10" stroke-linejoin="round"/><path d="M330 155c16 82 124 82 140 0M272 345h256" stroke="#111" stroke-width="8"/>${endSvg}`);
  }
  return svgDataUrl(`${common}<path d="M272 178l-76 96 58 88 42-34v265h208V328l42 34 58-88-76-96-70 62H342l-70-62z" fill="${color}" stroke="#111" stroke-width="10" stroke-linejoin="round"/><path d="M400 242v345M342 240l-30 350M458 240l30 350" stroke="#222" stroke-width="7"/>${endSvg}`);
};

const shopcutGalleryProducts: ProductAsset[] = [
  {
    id: "shopcut-blue-tshirt",
    source: "shopcut",
    name: "Blue T-shirt",
    category: "T-shirt",
    bodyZone: "upper_body",
    imageUrl: sampleProductSvg("Blue T-shirt", "#2f65d8", "shirt"),
    retouchedImageUrl: sampleProductSvg("Blue T-shirt", "#2f65d8", "shirt"),
    thumbnailUrl: sampleProductSvg("Blue T-shirt", "#2f65d8", "shirt"),
    color: "blue",
    description: "Blue short sleeve T-shirt",
    isTryOnReady: true,
    createdAt: "2026-06-04T00:00:00.000Z",
    tags: ["basic", "top"],
    collectionName: "Basics",
    isPublicGalleryItem: true
  },
  {
    id: "shopcut-black-trousers",
    source: "shopcut",
    name: "Black trousers",
    category: "Trousers",
    bodyZone: "lower_body",
    imageUrl: sampleProductSvg("Black trousers", "#111111", "pants"),
    retouchedImageUrl: sampleProductSvg("Black trousers", "#111111", "pants"),
    thumbnailUrl: sampleProductSvg("Black trousers", "#111111", "pants"),
    color: "black",
    description: "Black straight-leg trousers",
    isTryOnReady: true,
    createdAt: "2026-06-04T00:00:00.000Z",
    tags: ["basic", "bottom"],
    collectionName: "Basics",
    isPublicGalleryItem: true
  },
  {
    id: "shopcut-white-blouse",
    source: "shopcut",
    name: "White blouse",
    category: "Blouse",
    bodyZone: "upper_body",
    imageUrl: sampleProductSvg("White blouse", "#ffffff", "blouse"),
    retouchedImageUrl: sampleProductSvg("White blouse", "#ffffff", "blouse"),
    thumbnailUrl: sampleProductSvg("White blouse", "#ffffff", "blouse"),
    color: "white",
    description: "White long sleeve blouse",
    isTryOnReady: true,
    createdAt: "2026-06-04T00:00:00.000Z",
    tags: ["top", "studio"],
    collectionName: "New Drop",
    isPublicGalleryItem: true
  },
  {
    id: "shopcut-sneakers",
    source: "shopcut",
    name: "White sneakers",
    category: "Sneakers",
    bodyZone: "shoes",
    imageUrl: sampleProductSvg("Sneakers", "#f7f7f7", "shoes"),
    retouchedImageUrl: sampleProductSvg("Sneakers", "#f7f7f7", "shoes"),
    thumbnailUrl: sampleProductSvg("Sneakers", "#f7f7f7", "shoes"),
    color: "white",
    description: "White low-top sneakers",
    isTryOnReady: true,
    createdAt: "2026-06-04T00:00:00.000Z",
    tags: ["shoes"],
    collectionName: "Streetwear",
    isPublicGalleryItem: true
  },
  {
    id: "shopcut-dress",
    source: "shopcut",
    name: "Green dress",
    category: "Dress",
    bodyZone: "full_body",
    imageUrl: sampleProductSvg("Green dress", "#2f7d5b", "dress"),
    retouchedImageUrl: sampleProductSvg("Green dress", "#2f7d5b", "dress"),
    thumbnailUrl: sampleProductSvg("Green dress", "#2f7d5b", "dress"),
    color: "green",
    description: "Green sleeveless dress",
    isTryOnReady: true,
    createdAt: "2026-06-04T00:00:00.000Z",
    tags: ["dress"],
    collectionName: "Summer",
    isPublicGalleryItem: true
  },
  {
    id: "shopcut-jacket",
    source: "shopcut",
    name: "Denim jacket",
    category: "Jacket",
    bodyZone: "upper_body",
    imageUrl: sampleProductSvg("Denim jacket", "#4d6f94", "jacket"),
    retouchedImageUrl: sampleProductSvg("Denim jacket", "#4d6f94", "jacket"),
    thumbnailUrl: sampleProductSvg("Denim jacket", "#4d6f94", "jacket"),
    color: "blue denim",
    description: "Blue denim jacket",
    isTryOnReady: true,
    createdAt: "2026-06-04T00:00:00.000Z",
    tags: ["jacket", "outerwear"],
    collectionName: "Streetwear",
    isPublicGalleryItem: true
  }
];

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

const dataUrlToBlob = (dataUrl: string) => {
  const [header, payload] = dataUrl.split(",");
  const mimeType = header.match(/data:(.*?)(;base64)?$/)?.[1] ?? "image/png";

  if (header.includes(";base64")) {
    const byteCharacters = window.atob(payload);
    const byteNumbers = Array.from(byteCharacters, (character) => character.charCodeAt(0));
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  }

  return new Blob([decodeURIComponent(payload)], { type: mimeType });
};

const fileToResizedDataUrl = (file: File, maxEdge = MAX_STORED_MODEL_EDGE, quality = 0.86) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        const longestEdge = Math.max(width, height);
        const scale = longestEdge > maxEdge ? maxEdge / longestEdge : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.onerror = () => reject(new Error("Model image could not be loaded."));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Model image could not be read."));
    reader.readAsDataURL(file);
  });

const imageDataUrlToResizedDataUrl = (imageDataUrl: string, maxEdge = MAX_STORED_MODEL_EDGE, quality = 0.86) =>
  new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const longestEdge = Math.max(width, height);
      const scale = longestEdge > maxEdge ? maxEdge / longestEdge : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(imageDataUrl);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => reject(new Error("Generated model image could not be saved."));
    image.src = imageDataUrl;
  });

const urlToDataUrl = async (url: string) => {
  if (url.startsWith("data:image/")) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Apparel image could not be loaded.");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Apparel image could not be read."));
    reader.readAsDataURL(blob);
  });
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded."));
    image.src = src;
  });

const inferBodyZone = (name: string): OutfitSlot => {
  const text = name.toLowerCase();
  if (/\b(shoe|shoes|sneaker|sneakers|boot|boots|heel|heels|sandal|sandals|ankle cuff|anklet)\b/.test(text)) return "shoes";
  if (
    /\b(lingerie set|underwear set|bra and panty|bra panty|bra and panties|bra panties|garter set|matching set)\b/.test(text)
    || (/\b(bra|bralette|corset|bustier)\b/.test(text) && /\b(panty|panties|brief|briefs|thong|garter|stocking|stockings)\b/.test(text))
  ) return "full_body";
  if (/\b(bikini bottom|swim bottom|pant|pants|jean|jeans|short|shorts|skirt|legging|leggings|trouser|trousers|panty|panties|brief|briefs|thong|bottom|underwear bottom)\b/.test(text)) return "lower_body";
  if (/\b(swimsuit|swimwear|bathing suit|one piece|one-piece|monokini|dress|gown|robe|bodysuit|jumpsuit|set|outfit|full body)\b/.test(text)) return "full_body";
  if (/\b(bikini top|bra top|crop top)\b/.test(text)) return "upper_body";
  if (/\b(bag|handbag|hat|belt|scarf|accessory|glasses|sunglasses|earring|earrings|jewelry|jewellery|necklace|choker|bracelet|wrist cuff|hip hardware|body chain|harness)\b/.test(text)) return "accessory";
  return "upper_body";
};

const readableZone = (zone: OutfitSlot) => outfitSlots.find((slot) => slot.value === zone)?.label ?? "Apparel";

const isUnderwearProduct = (product: ProductAsset) =>
  /\b(bra|bralette|panty|panties|brief|briefs|thong|corset|garter|stocking|stockings|lingerie|underwear)\b/.test(
    `${product.name} ${product.description ?? ""} ${product.category}`.toLowerCase()
  );

const isLingerieMainOutfit = (product: ProductAsset) =>
  /\b(bra|bralette|panty|panties|brief|briefs|thong|corset|bustier|bodysuit|garter|stocking|stockings|lingerie|underwear|swimsuit|bikini)\b/.test(
    `${product.name} ${product.description ?? ""} ${product.category}`.toLowerCase()
  );

const isFullCoverProduct = (product: ProductAsset, selectedSlot?: OutfitSlot) =>
  selectedSlot === "full_body" || /\b(dress|gown|robe|jumpsuit|full body|long coat|cape)\b/.test(
    `${product.name} ${product.description ?? ""} ${product.category}`.toLowerCase()
  );

const detectedProductText = (product: StoredDetectedProduct) =>
  [product.color, product.shape, product.label].filter(Boolean).join(" ").trim() || product.label || "detected apparel";

const isApparelAssetCollection = (collectionName?: string) =>
  collectionName === "Apparel Assets" || collectionName === "Product Assets";

const isUserApparelCollection = (collectionName?: string) =>
  collectionName === "My Apparel" || collectionName === "My Products";

const readStoredDetectedProducts = () => {
  try {
    const storedProducts = window.localStorage.getItem(DETECTED_PRODUCTS_STORAGE_KEY);
    const parsedProducts = storedProducts ? JSON.parse(storedProducts) as StoredDetectedProduct[] : [];
    return Array.isArray(parsedProducts) ? parsedProducts.filter((product) => product?.label) : [];
  } catch {
    window.localStorage.removeItem(DETECTED_PRODUCTS_STORAGE_KEY);
    return [];
  }
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

const makeUserProducts = (images: GalleryImageItem[], detectedProducts: StoredDetectedProduct[], productAssets: StoredProductAsset[]): ProductAsset[] => {
  const localProductAssets = productAssets.map((asset) => ({
    id: asset.id,
    source: "user" as const,
    name: asset.name,
    category: readableZone(inferBodyZone(`${asset.name} ${asset.description ?? ""}`)),
    bodyZone: inferBodyZone(`${asset.name} ${asset.description ?? ""}`),
    imageUrl: asset.imageDataUrl,
    retouchedImageUrl: asset.imageDataUrl,
    thumbnailUrl: asset.imageDataUrl,
    color: asset.color,
    description: asset.description || asset.name,
    isTryOnReady: true,
    createdAt: asset.createdAt,
    tags: ["user", "asset"],
    collectionName: "Apparel Assets",
    isPublicGalleryItem: false,
    productGroupId: asset.productGroupId,
    productGroupTitle: asset.productGroupTitle,
    viewType: asset.viewType,
    displayOrder: asset.displayOrder
  } satisfies ProductAsset));

  const detectedNames = detectedProducts.map(detectedProductText).filter(Boolean);
  const detectedSummary = detectedNames.join(", ");
  const retouchedProducts = images
    .filter((image) => image.type === "shop-image")
    .map((image, index) => {
      const detectedName = detectedNames[index] ?? detectedNames[0] ?? "";
      const bodyZone = inferBodyZone(detectedName || image.name);
      return {
        id: image.id,
        source: "user",
        name: detectedName ? `Design Ready: ${detectedName}` : `Design Ready ${index + 1}`,
        category: readableZone(bodyZone),
        bodyZone,
        imageUrl: image.url,
        retouchedImageUrl: image.url,
        thumbnailUrl: image.url,
        description: detectedSummary || "User-created Design Ready apparel asset",
        isTryOnReady: true,
        createdAt: image.createdAt,
        tags: ["user", "retouch"],
        collectionName: "My Apparel",
        isPublicGalleryItem: false
      } satisfies ProductAsset;
    });

  const disabledCutouts = images
    .filter((image) => image.type === "cutout")
    .map((image, index) => ({
      id: image.id,
      source: "user",
      name: `Cutout ${index + 1}`,
      category: "Cutout",
      bodyZone: inferBodyZone(image.name),
      imageUrl: image.url,
      thumbnailUrl: image.url,
      description: "Raw cutout. Create Design Ready apparel first before using it in LuxbanditFit.",
      isTryOnReady: false,
      createdAt: image.createdAt,
      tags: ["user", "cutout"],
      collectionName: "My Apparel",
      isPublicGalleryItem: false,
      disabledReason: "Create Design Ready apparel first"
    } satisfies ProductAsset));

  return [...localProductAssets, ...retouchedProducts, ...disabledCutouts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
};

export function OutfitBuilder() {
  const modelFileInputRef = useRef<HTMLInputElement | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [credits, setCredits] = useState<CreditStatus | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImageItem[]>([]);
  const [latestDetectedProducts, setLatestDetectedProducts] = useState<StoredDetectedProduct[]>([]);
  const [storedProductAssets, setStoredProductAssets] = useState<StoredProductAsset[]>([]);
  const [productSource, setProductSource] = useState<ProductSource>("user");
  const [modelGallery, setModelGallery] = useState<ModelGalleryItem[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [aiModelGender, setAiModelGender] = useState<AiModelGender>("female");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [slotByProductId, setSlotByProductId] = useState<Record<string, OutfitSlot>>({});
  const [modelFraming, setModelFraming] = useState<ModelFraming>("full_body");
  const [outfitPrompt, setOutfitPrompt] = useState("");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [imageDialog, setImageDialog] = useState<ImageDialog | null>(null);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSeconds, setGenerationSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isOtherProductsOpen, setIsOtherProductsOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const userProducts = useMemo(
    () => makeUserProducts(galleryImages, latestDetectedProducts, storedProductAssets),
    [galleryImages, latestDetectedProducts, storedProductAssets]
  );
  const activeProducts: ProductAsset[] = productSource === "user" ? userProducts : shopcutGalleryProducts;
  const usesAiGeneratedModel = selectedModelId === AI_GENERATED_MODEL_ID;
  const selectedModel = modelGallery.find((model) => model.id === selectedModelId) ?? null;
  const selectedProducts = selectedProductIds
    .map((id) => activeProducts.find((product) => product.id === id))
    .filter((product): product is ProductAsset => Boolean(product));
  const selectedFraming = modelFramingOptions.find((option) => option.value === modelFraming) ?? modelFramingOptions[0];
  const hasUnderwearSelection = selectedProducts.some(isUnderwearProduct);
  const hasFullCoverSelection = selectedProducts.some((product) => isFullCoverProduct(product, slotByProductId[product.id] ?? product.bodyZone));
  const selectedVisibleSlots = selectedProducts.map((product) => slotByProductId[product.id] ?? product.bodyZone);
  const hasFullBodySlot = selectedVisibleSlots.includes("full_body");
  const hasUpperBodySlot = selectedVisibleSlots.includes("upper_body") || hasFullBodySlot;
  const hasLowerBodySlot = selectedVisibleSlots.includes("lower_body") || hasFullBodySlot;
  const hasShoesSlot = selectedVisibleSlots.includes("shoes");
  const hasAccessorySlot = selectedVisibleSlots.includes("accessory");
  const hasLingerieMainOutfit = selectedProducts.some(isLingerieMainOutfit);
  const hasCompleteVisibleOutfit = hasFullBodySlot || (hasUpperBodySlot && hasLowerBodySlot);
  const hasMainOutfitSelection = hasCompleteVisibleOutfit || hasLingerieMainOutfit;
  const selectedReadyProductCount = selectedProducts.filter((product) => product.isTryOnReady).length;
  const creationModeLabel = hasMainOutfitSelection ? "Your own complete creation" : "AI Creation";
  const creationModeDescription = hasMainOutfitSelection
    ? "The selected apparel or lingerie is the main visible look, so the result can stay closer to your own choices."
    : "Important clothing is missing, so AI may invent apparel to keep the model covered.";
  const recommendedProducts = useMemo(() => {
    if (productSource === "shopcut") return activeProducts.filter((product) => product.isTryOnReady);
    const productAssets = activeProducts.filter((product) => isApparelAssetCollection(product.collectionName));
    return productAssets.length > 0 ? productAssets : activeProducts.filter((product) => product.isTryOnReady && isUserApparelCollection(product.collectionName));
  }, [activeProducts, productSource]);
  const otherProducts = useMemo(
    () => activeProducts.filter((product) => !recommendedProducts.some((recommendedProduct) => recommendedProduct.id === product.id)),
    [activeProducts, recommendedProducts]
  );
  const recommendedProductGroups = useMemo(() => {
    if (productSource !== "user") return [];
    const groups = new Map<string, ProductAsset[]>();
    recommendedProducts
      .filter((product) => isApparelAssetCollection(product.collectionName))
      .forEach((product) => {
        const key = product.productGroupId || product.retouchedImageUrl || product.imageUrl || product.thumbnailUrl;
        groups.set(key, [...(groups.get(key) ?? []), product]);
      });
    return Array.from(groups.values()).sort((a, b) => Date.parse(b[0]?.createdAt ?? "") - Date.parse(a[0]?.createdAt ?? ""));
  }, [productSource, recommendedProducts]);
  const otherProductGroups = useMemo(() => {
    const groups = new Map<string, ProductAsset[]>();
    otherProducts.forEach((product) => {
      const key = product.productGroupId || product.retouchedImageUrl || product.imageUrl || product.thumbnailUrl;
      groups.set(key, [...(groups.get(key) ?? []), product]);
    });
    return Array.from(groups.values()).sort((a, b) => Date.parse(b[0]?.createdAt ?? "") - Date.parse(a[0]?.createdAt ?? ""));
  }, [otherProducts]);

  const loadGallery = useCallback(async (nextAccountId = accountId) => {
    if (!nextAccountId) return;
    setIsLoadingGallery(true);
    setError(null);

    try {
      const response = await fetch("/api/gallery", {
        headers: {
          "x-shopcut-account-id": nextAccountId
        }
      });
      const payload = await readJsonResponse<{ images?: GalleryImageItem[] }>(response);
      if (!response.ok || !payload.images) throw new Error(payload.error ?? "Gallery could not be loaded.");
      setGalleryImages(payload.images);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gallery could not be loaded.");
    } finally {
      setIsLoadingGallery(false);
    }
  }, [accountId]);

  useEffect(() => {
    const syncAccountData = () => {
      const nextAccountId = getClientAccountId();
      setAccountId(nextAccountId);
      void fetch("/api/account/credits", {
        headers: {
          "x-shopcut-account-id": nextAccountId
        }
      })
        .then((response) => response.json())
        .then((payload: CreditStatus) => setCredits(payload))
        .catch(() => setCredits(null));
      void loadGallery(nextAccountId);

      try {
        const modelGalleryStorageKey = getModelGalleryStorageKey();
        const storedGallery = window.localStorage.getItem(modelGalleryStorageKey);
        const parsedGallery = storedGallery ? JSON.parse(storedGallery) as ModelGalleryItem[] : [];
        const validGallery = Array.isArray(parsedGallery)
          ? parsedGallery.filter((item) => item?.id && item?.imageDataUrl).slice(0, MAX_MODEL_GALLERY_ITEMS)
          : [];
        setModelGallery(validGallery);
        setSelectedModelId(validGallery[0]?.id ?? AI_GENERATED_MODEL_ID);
      } catch {
        window.localStorage.removeItem(getModelGalleryStorageKey());
      }
      setLatestDetectedProducts(readStoredDetectedProducts());
      setStoredProductAssets(readStoredProductAssets());
    };

    syncAccountData();

    const handleGalleryUpdate = () => {
      const nextAccountId = getClientAccountId();
      setAccountId(nextAccountId);
      setLatestDetectedProducts(readStoredDetectedProducts());
      setStoredProductAssets(readStoredProductAssets());
      void loadGallery(nextAccountId);
    };
    window.addEventListener("shopcut-gallery-updated", handleGalleryUpdate);
    window.addEventListener("luxurybandit-auth-updated", syncAccountData);
    return () => {
      window.removeEventListener("shopcut-gallery-updated", handleGalleryUpdate);
      window.removeEventListener("luxurybandit-auth-updated", syncAccountData);
    };
  }, [loadGallery]);

  useEffect(() => {
    setSelectedProductIds([]);
    setSlotByProductId({});
  }, [productSource]);

  useEffect(() => {
    if (!isGenerating) return;
    setGenerationSeconds(0);
    const interval = window.setInterval(() => {
      setGenerationSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    const modelPrompt = usesAiGeneratedModel
      ? `Use a new AI-generated adult ${aiModelGender} fashion model.`
      : "Use the selected uploaded model reference.";
    const selectedDescriptions = selectedProducts
      .filter((product) => product.isTryOnReady)
      .map((product) => {
        const zone = readableZone(slotByProductId[product.id] ?? product.bodyZone);
        const details = [product.color, product.description].filter(Boolean).join(", ");
        return `${zone}: ${details || product.name}`;
      })
      .join("\n");

    setOutfitPrompt([
      "Create a professional ecommerce fashion model image using the attached clean garment reference as the exact clothing source.",
      "",
      usesAiGeneratedModel
        ? "Dress the new AI-generated model in only these selected apparel assets:"
        : "Dress the selected model in only these selected apparel assets:",
      selectedDescriptions || "Selected design-ready apparel assets.",
      "",
      modelPrompt,
      "The attached garment reference contains only selected Design Ready / LuxbanditCut Gallery apparel assets.",
      "Use the garment reference as the source of truth.",
      "Do not use unselected garments.",
      "Do not add extra clothing pieces that are not in the selected apparel assets.",
      "Do not remove selected outfit pieces.",
      "Do not change colors.",
      "Do not convert shorts into pants.",
      "Do not cover selected upper body item.",
      "Preserve selected garment colors and shapes exactly.",
      "Preserve prints, seams, logos, fabric types, hardware, placement, and proportions.",
      selectedFraming.prompt,
      "Use a clean square ecommerce studio composition.",
      "Neutral standing catalog pose. Apparel-focused, non-erotic, commercial fashion presentation."
    ].join("\n"));
  }, [aiModelGender, selectedFraming.prompt, selectedProducts, slotByProductId, usesAiGeneratedModel]);

  const persistModelGallery = (items: ModelGalleryItem[]) => {
    const limitedItems = items.slice(0, MAX_MODEL_GALLERY_ITEMS);
    try {
      window.localStorage.setItem(getModelGalleryStorageKey(), JSON.stringify(limitedItems));
    } catch {
      window.localStorage.removeItem(getModelGalleryStorageKey());
    }
    return limitedItems;
  };

  const handleModelUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageDataUrl = await fileToResizedDataUrl(file);
      const modelItem: ModelGalleryItem = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name.replace(/\.[^.]+$/, "").slice(0, 32) || `Model ${modelGallery.length + 1}`,
        imageDataUrl,
        createdAt: new Date().toISOString()
      };
      const nextGallery = persistModelGallery([modelItem, ...modelGallery]);
      setModelGallery(nextGallery);
      setSelectedModelId(modelItem.id);
      setError(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Model image could not be added.");
    } finally {
      if (modelFileInputRef.current) modelFileInputRef.current.value = "";
    }
  };

  const handleDeleteModel = (id: string) => {
    const nextGallery = modelGallery.filter((model) => model.id !== id);
    const storedGallery = persistModelGallery(nextGallery);
    setModelGallery(storedGallery);
    if (selectedModelId === id) setSelectedModelId(storedGallery[0]?.id ?? AI_GENERATED_MODEL_ID);
  };

  const saveAiGeneratedModelReference = async (imageDataUrl: string) => {
    try {
      const compactModelImage = await imageDataUrlToResizedDataUrl(imageDataUrl);
      const modelItem: ModelGalleryItem = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: `AI ${aiModelGender} model`,
        imageDataUrl: compactModelImage,
        createdAt: new Date().toISOString()
      };
      const nextGallery = persistModelGallery([modelItem, ...modelGallery]);
      setModelGallery(nextGallery);
      setSelectedModelId(modelItem.id);
    } catch {
      // Gallery save is a convenience. Keep the generated fashion image even if this fails.
    }
  };

  const toggleProduct = (product: ProductAsset) => {
    if (!product.isTryOnReady || !product.retouchedImageUrl) return;
    setSelectedProductIds((ids) => {
      if (ids.includes(product.id)) return ids.filter((id) => id !== product.id);
      setSlotByProductId((slots) => ({ ...slots, [product.id]: slots[product.id] ?? product.bodyZone }));
      return [...ids, product.id];
    });
  };

  const handleDeleteProductAsset = async (product: ProductAsset) => {
    if (product.source !== "user") return;
    setDeletingProductId(product.id);
    setError(null);

    try {
      if (isApparelAssetCollection(product.collectionName)) {
        const nextAssets = storedProductAssets.filter((asset) => asset.id !== product.id);
        window.localStorage.setItem(getProductAssetsStorageKey(), JSON.stringify(nextAssets));
        setStoredProductAssets(nextAssets);
      } else {
        const image = galleryImages.find((item) => item.id === product.id);
        if (!accountId || !image) throw new Error("This image could not be found in the saved gallery.");
        const response = await fetch("/api/gallery", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-shopcut-account-id": accountId
          },
          body: JSON.stringify({ path: image.path })
        });
        const payload = await readJsonResponse<{ images?: GalleryImageItem[] }>(response);
        if (!response.ok || !payload.images) throw new Error(payload.error ?? "Apparel image could not be deleted.");
        setGalleryImages(payload.images);
        window.dispatchEvent(new Event("shopcut-gallery-updated"));
      }

      setSelectedProductIds((ids) => ids.filter((id) => id !== product.id));
      setSlotByProductId((slots) => {
        const nextSlots = { ...slots };
        delete nextSlots[product.id];
        return nextSlots;
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Apparel asset could not be deleted.");
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleDeleteProductAssetGroup = async (products: ProductAsset[]) => {
    const productIds = products.map((product) => product.id);
    setDeletingProductId(productIds[0] ?? null);
    setError(null);

    try {
      if (products.every((product) => isApparelAssetCollection(product.collectionName))) {
        const nextAssets = storedProductAssets.filter((asset) => !productIds.includes(asset.id));
        window.localStorage.setItem(getProductAssetsStorageKey(), JSON.stringify(nextAssets));
        setStoredProductAssets(nextAssets);
      } else {
        if (!accountId) throw new Error("Gallery account is not ready yet.");
        const paths = galleryImages.filter((image) => productIds.includes(image.id)).map((image) => image.path);
        for (const path of paths) {
          const response = await fetch("/api/gallery", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "x-shopcut-account-id": accountId
            },
            body: JSON.stringify({ path })
          });
          const payload = await readJsonResponse<{ images?: GalleryImageItem[] }>(response);
          if (!response.ok || !payload.images) throw new Error(payload.error ?? "Apparel group could not be deleted.");
        }
        setGalleryImages((images) => images.filter((image) => !paths.includes(image.path)));
        window.dispatchEvent(new Event("shopcut-gallery-updated"));
      }

      setSelectedProductIds((ids) => ids.filter((id) => !productIds.includes(id)));
      setSlotByProductId((slots) => {
        const nextSlots = { ...slots };
        productIds.forEach((id) => {
          delete nextSlots[id];
        });
        return nextSlots;
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Apparel group could not be deleted.");
    } finally {
      setDeletingProductId(null);
    }
  };

  const createOutfitReference = async () => {
    const readyProducts = selectedProducts.filter((product) => product.isTryOnReady && product.retouchedImageUrl);
    if (readyProducts.length === 0) throw new Error("Select at least one Design Ready apparel asset.");

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Outfit reference could not be created.");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const slots: Record<OutfitSlot, { x: number; y: number; w: number; h: number }> = {
      upper_body: { x: 322, y: 60, w: 380, h: 300 },
      lower_body: { x: 322, y: 374, w: 380, h: 300 },
      shoes: { x: 322, y: 700, w: 380, h: 180 },
      accessory: { x: 662, y: 706, w: 220, h: 170 },
      full_body: { x: 272, y: 70, w: 480, h: 760 }
    };

    for (const product of readyProducts) {
      const garmentSource = product.retouchedImageUrl;
      if (!garmentSource) continue;
      const dataUrl = await urlToDataUrl(garmentSource);
      const image = await loadImage(dataUrl);
      const slot = slots[slotByProductId[product.id] ?? product.bodyZone];
      const scale = Math.min(slot.w / image.width, slot.h / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      const x = slot.x + (slot.w - width) / 2;
      const y = slot.y + (slot.h - height) / 2;
      ctx.drawImage(image, x, y, width, height);
    }

    return canvas.toDataURL("image/png");
  };

  const saveGalleryImage = async (type: "model-image", image: string) => {
    if (!accountId) return;
    const response = await fetch("/api/gallery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shopcut-account-id": accountId
      },
      body: JSON.stringify({ type, image })
    });
    const payload = await readJsonResponse<{ images?: unknown[] }>(response);
    if (!response.ok || !payload.images) throw new Error(payload.error ?? "Image could not be saved to gallery.");
    window.dispatchEvent(new Event("shopcut-gallery-updated"));
  };

  const handleGenerateOutfit = async () => {
    if (!accountId || isGenerating) return;
    const readyProducts = selectedProducts.filter((product) => product.isTryOnReady && product.retouchedImageUrl);
    if (!selectedModel && !usesAiGeneratedModel) {
      setError("Choose a model reference or use AI-generated new model first.");
      return;
    }
    if (readyProducts.length === 0) {
      setError("Select at least one Design Ready apparel asset. Raw cutouts need to be prepared first.");
      return;
    }
    setIsGenerating(true);
    setGenerationSeconds(0);
    setError(null);
    setResultImage(null);

    try {
      const outfitReference = await createOutfitReference();
      const formData = new FormData();
      formData.append("image", dataUrlToBlob(outfitReference), "shopcut-clean-try-on-reference.png");
      if (selectedModel) {
        formData.append("modelImage", dataUrlToBlob(selectedModel.imageDataUrl), "shopcut-selected-model.jpg");
      }
      formData.append("prompt", outfitPrompt);
      formData.append("mode", "fashion-model");
      formData.append("square", "true");
      formData.append("width", "1024");
      formData.append("height", "1024");

      const response = await fetch("/api/generate-fashn", {
        method: "POST",
        body: formData,
        headers: {
          "x-shopcut-account-id": accountId
        }
      });
      const payload = await readJsonResponse<{ image?: string; credits?: CreditStatus }>(response);
      if (payload.credits) setCredits(payload.credits);
      if (!response.ok || !payload.image) throw new Error(payload.error ?? "FASHN could not create the outfit image.");
      setResultImage(payload.image);
      await saveGalleryImage("model-image", payload.image);
      if (usesAiGeneratedModel) {
        await saveAiGeneratedModelReference(payload.image);
      }
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "FASHN could not create the outfit image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderProductCard = (product: ProductAsset) => {
    const selected = selectedProductIds.includes(product.id);
    const tryOnImage = product.retouchedImageUrl;
    return (
      <div key={product.id} className={`rounded-md border p-2 ${selected ? "border-cobalt bg-cobalt/10" : "border-black/10 bg-panel"} ${!product.isTryOnReady ? "opacity-65" : ""}`}>
        <button
          type="button"
          onClick={() => toggleProduct(product)}
          disabled={!product.isTryOnReady}
          className="block w-full overflow-hidden rounded-md border border-black/10 bg-white text-left focus:outline-none focus:ring-2 focus:ring-cobalt disabled:cursor-not-allowed"
        >
          <img src={product.thumbnailUrl} alt={product.name} className="aspect-square w-full object-contain" />
        </button>
        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-black text-ink">{product.name}</div>
            <div className="text-[11px] font-bold text-ink/45">{readableZone(product.bodyZone)}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {selected && <Check aria-hidden="true" className="h-4 w-4 text-cobalt" />}
            {product.source === "user" && (
              <button
                type="button"
                onClick={() => void handleDeleteProductAsset(product)}
                disabled={deletingProductId === product.id}
                className="grid h-7 w-7 place-items-center rounded-md border border-black/10 bg-white text-red-600 disabled:opacity-45"
                title="Delete apparel asset"
              >
                {deletingProductId === product.id ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>
        {product.isTryOnReady && tryOnImage ? (
          <div className="mt-2 inline-flex rounded-full bg-cobalt/10 px-2 py-1 text-[10px] font-black uppercase tracking-normal text-cobalt">
            Design Ready
          </div>
        ) : (
          <div className="mt-2 rounded-md border border-coral/20 bg-coral/10 p-2 text-[11px] font-black text-coral">
            {product.disabledReason ?? "Create Design Ready apparel first"}
          </div>
        )}
      </div>
    );
  };

  const renderProductGroupCard = (products: ProductAsset[]) => {
    const sortedProducts = [...products].sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
    const firstProduct = sortedProducts[0];
    if (!firstProduct) return null;
    const selectedCount = sortedProducts.filter((product) => selectedProductIds.includes(product.id)).length;
    const hasMultipleViews = sortedProducts.some((product) => product.viewType) && sortedProducts.length > 1;
    return (
      <div key={firstProduct.imageUrl} className="rounded-md border border-black/10 bg-panel p-3">
        <div className="grid gap-4 md:grid-cols-[380px_minmax(0,1fr)]">
          <button
            type="button"
            onClick={() =>
              setImageDialog({
                title: "Apparel asset group",
                src: firstProduct.thumbnailUrl
              })
            }
            className="block overflow-hidden rounded-md border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-cobalt"
          >
            <img src={firstProduct.thumbnailUrl} alt="Apparel asset group" className="aspect-square w-full object-contain" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-sm font-black text-ink">
                  {hasMultipleViews ? firstProduct.productGroupTitle || "Linked apparel product" : `${products.length} apparel item${products.length === 1 ? "" : "s"} from one image`}
                </div>
                <div className="mt-1 text-xs font-bold text-ink/50">
                  {hasMultipleViews ? `${sortedProducts.length} views available. Front view is for normal front-facing try-on.` : selectedCount > 0 ? `${selectedCount} selected for LuxbanditFit` : "Choose only the pieces you want."}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleDeleteProductAssetGroup(products)}
                disabled={deletingProductId === firstProduct.id}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-xs font-black text-red-600 disabled:opacity-45"
              >
                {deletingProductId === firstProduct.id ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Trash2 aria-hidden="true" className="h-4 w-4" />}
                Delete group
              </button>
            </div>
            <div className="mt-3 grid max-h-[28rem] gap-2 overflow-auto pr-1">
              {sortedProducts.map((product) => {
                const selected = selectedProductIds.includes(product.id);
                return (
                  <div key={product.id} className={`rounded-md border p-3 ${selected ? "border-cobalt bg-cobalt/10" : "border-black/10 bg-white"} ${!product.isTryOnReady ? "opacity-60" : ""}`}>
                    <button
                      type="button"
                      onClick={() => toggleProduct(product)}
                      disabled={!product.isTryOnReady}
                      className="flex w-full items-center justify-between gap-3 text-left disabled:cursor-not-allowed"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-ink">{product.name}</span>
                        <span className="block text-xs font-bold text-ink/45">
                          {product.isTryOnReady
                            ? `${product.viewType ? `${product.viewType === "front" ? "Front" : "Back"} view · ` : ""}${readableZone(product.bodyZone)} · Click to add to the look`
                            : product.disabledReason ?? "Create Design Ready apparel first"}
                        </span>
                      </span>
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${selected ? "border-cobalt bg-cobalt text-white" : "border-black/20 bg-white"}`}>
                        {selected && <Check aria-hidden="true" className="h-4 w-4" />}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
      <div>
        <div className="text-3xl font-black uppercase tracking-normal text-cobalt md:text-4xl">LuxbanditFit</div>
        <h2 className="mt-1 text-xl font-black text-ink">Create new fashion designs on one selected model</h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-ink/60">
          Select Design Ready apparel assets or LuxbanditCut Gallery items, choose a model, then create a new fashion image with FASHN.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-4">
          <div className="rounded-md border border-black/10 bg-panel p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-ink">1. Select model and outfit</div>
                <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">
                  Pick clothes, shoes, and accessories like in a shop. LuxbanditCut uses your Design Ready apparel automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadGallery()}
                disabled={isLoadingGallery}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-black text-ink disabled:opacity-45"
              >
                {isLoadingGallery ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="h-4 w-4" />}
                Refresh
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-black/10 bg-white p-2">
              {[
                { label: "My Apparel", value: "user" as const },
                { label: "LuxbanditCut Gallery", value: "shopcut" as const }
              ].map((source) => (
                <button
                  key={source.value}
                  type="button"
                  onClick={() => setProductSource(source.value)}
                  className={`h-10 rounded-md text-sm font-black ${
                    productSource === source.value ? "bg-ink text-white" : "border border-black/10 bg-panel text-ink/60"
                  }`}
                >
                  {source.label}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-md border border-black/10 bg-panel p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-ink">Select model</div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">
                    Choose your own model reference or let LuxbanditCut create a new model for this design.
                  </p>
                </div>
                <div>
                  <input ref={modelFileInputRef} className="hidden" type="file" accept="image/*" onChange={handleModelUpload} />
                  <button
                    type="button"
                    onClick={() => modelFileInputRef.current?.click()}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-cobalt px-3 text-xs font-black text-white"
                  >
                    <ImagePlus aria-hidden="true" className="h-4 w-4" />
                    Add model reference
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[260px_minmax(0,1fr)]">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedModelId(AI_GENERATED_MODEL_ID)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedModelId(AI_GENERATED_MODEL_ID);
                    }
                  }}
                  className={`cursor-pointer rounded-md border p-3 focus:outline-none focus:ring-2 focus:ring-cobalt ${usesAiGeneratedModel ? "border-cobalt bg-cobalt/10" : "border-black/10 bg-white"}`}
                >
                  <div className="flex w-full items-center justify-between gap-3 text-left">
                    <div className="inline-flex items-center gap-3">
                      <span className={`grid h-10 w-10 place-items-center rounded-md ${usesAiGeneratedModel ? "bg-cobalt text-white" : "bg-panel text-ink/45"}`}>
                        {usesAiGeneratedModel ? <Check aria-hidden="true" className="h-5 w-5" /> : <UserRound aria-hidden="true" className="h-5 w-5" />}
                      </span>
                      <span>
                        <span className="block text-sm font-black text-ink">AI-generated new model</span>
                        <span className="block text-xs font-bold text-ink/50">Used when no uploaded model is selected.</span>
                      </span>
                    </div>
                  </div>
                  <label className="mt-3 grid gap-1">
                    <span className="text-[11px] font-black uppercase tracking-[0.12em] text-ink/45">Model type</span>
                    <select
                      value={aiModelGender}
                      onChange={(event) => {
                        setAiModelGender(event.target.value as AiModelGender);
                        setSelectedModelId(AI_GENERATED_MODEL_ID);
                      }}
                      className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-black text-ink outline-none focus:border-cobalt"
                    >
                      <option value="female">Woman</option>
                      <option value="male">Man</option>
                    </select>
                  </label>
                </div>
                <div>
                  {modelGallery.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {modelGallery.map((model) => (
                        <div key={model.id} className={`rounded-md border p-2 ${selectedModelId === model.id ? "border-cobalt bg-cobalt/10" : "border-black/10 bg-white"}`}>
                          <button
                            type="button"
                            onClick={() => setSelectedModelId(model.id)}
                            className="block w-full overflow-hidden rounded-md border border-black/10 bg-white focus:outline-none focus:ring-2 focus:ring-cobalt"
                          >
                            <img src={model.imageDataUrl} alt={model.name} className="aspect-square w-full object-cover" />
                          </button>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <button type="button" onClick={() => setSelectedModelId(model.id)} className="min-w-0 truncate text-left text-xs font-black text-ink">
                              {model.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteModel(model.id)}
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-black/10 bg-white text-red-600"
                            >
                              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md border border-black/10 bg-white p-3 text-sm font-bold leading-6 text-ink/55">
                      No model references yet. LuxbanditCut will use the AI-generated model unless you upload one.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 rounded-md border border-black/10 bg-white p-3">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Model framing</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {modelFramingOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setModelFraming(option.value)}
                      className={`min-h-10 rounded-md px-2 text-xs font-black ${
                        modelFraming === option.value ? "bg-ink text-white" : "border border-black/10 bg-panel text-ink/65"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <section className="sticky top-2 z-20 mt-3 grid gap-2 rounded-md border border-cobalt/20 bg-white/95 p-2 shadow-soft backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-black text-ink">Outfit checklist</div>
                <div className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                  hasMainOutfitSelection ? "bg-cobalt text-white" : "bg-coral/15 text-coral"
                }`}>
                  {creationModeLabel}
                </div>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-4">
                {[
                  { label: "Model selected", done: Boolean(selectedModel) || usesAiGeneratedModel, icon: UserRound },
                  { label: "Main outfit", done: hasMainOutfitSelection, icon: Shirt },
                  { label: "Shoes selected", done: hasShoesSlot, icon: Footprints },
                  { label: "Extras selected", done: hasAccessorySlot, icon: Gem }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className={`flex min-h-10 items-center gap-2 rounded-md border px-2 py-1.5 ${
                      item.done ? "border-cobalt/25 bg-white text-ink" : "border-black/10 bg-panel text-ink/45"
                    }`}>
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${
                        item.done ? "bg-cobalt text-white" : "bg-panel text-ink/35"
                      }`}>
                        {item.done ? <Check aria-hidden="true" className="h-4 w-4" /> : <Icon aria-hidden="true" className="h-4 w-4" />}
                      </span>
                      <span className="truncate text-xs font-black">{item.label}</span>
                    </div>
                  );
                })}
              </div>
              {selectedReadyProductCount === 0 ? (
                <p className="rounded-md border border-coral/25 bg-coral/10 px-2 py-1.5 text-xs font-black leading-5 text-coral">
                  Choose at least one outfit item before creating.
                </p>
              ) : (
                <p className={`rounded-md border px-2 py-1.5 text-xs font-black leading-5 ${
                  hasMainOutfitSelection ? "border-cobalt/20 bg-white text-cobalt" : "border-coral/25 bg-coral/10 text-coral"
                }`}>
                  {creationModeDescription}
                </p>
              )}
            </section>
            {hasUnderwearSelection && hasFullCoverSelection && (
              <div className="mt-3 rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-black leading-6 text-coral">
                Visibility warning: you selected underwear and a full outfit. In a normal ecommerce image, the underwear will probably be hidden. Use either a lingerie look or a dressed outfit.
              </div>
            )}

            {activeProducts.length > 0 ? (
              <div className="mt-3 grid gap-4">
                <div className="grid gap-2 rounded-md border border-black/10 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.15em] text-ink/45">
                        {productSource === "user" ? "My wardrobe" : "LuxbanditCut Gallery"}
                      </div>
                      <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">
                        Choose the clothes, shoes, and accessories you want on the model.
                      </p>
                    </div>
                    <div className="rounded-full bg-panel px-2 py-1 text-[11px] font-black text-ink/50">{recommendedProducts.length}</div>
                  </div>
                  {recommendedProducts.length > 0 ? (
                    recommendedProductGroups.length > 0 ? (
                      <div className="grid gap-3">
                        {recommendedProductGroups.map(renderProductGroupCard)}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
                        {recommendedProducts.map(renderProductCard)}
                      </div>
                    )
                  ) : (
                    <p className="rounded-md border border-coral/20 bg-coral/10 p-3 text-sm font-bold leading-6 text-coral">
                      No apparel assets yet. In Apparel Extractor, mark one item, prepare it, then save it as a Design Ready asset.
                    </p>
                  )}
                </div>
                {productSource === "user" && otherProducts.length > 0 && (
                  <div className="rounded-md border border-black/10 bg-white p-3">
                    <button
                      type="button"
                      onClick={() => setIsOtherProductsOpen((open) => !open)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <span>
                        <span className="block text-xs font-black uppercase tracking-[0.15em] text-ink/45">Other saved images</span>
                        <span className="mt-1 block text-xs font-semibold leading-5 text-ink/55">
                          Intermediate cutouts are hidden to keep the main choice simple.
                        </span>
                      </span>
                      <span className="rounded-full bg-panel px-3 py-1 text-xs font-black text-ink/60">
                        {isOtherProductsOpen ? "Hide" : `${otherProducts.length} items`}
                      </span>
                    </button>
                    {isOtherProductsOpen && (
                      <div className="mt-3 grid gap-3">
                        {otherProductGroups.map(renderProductGroupCard)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 rounded-md border border-black/10 bg-white p-3 text-sm font-bold leading-6 text-ink/55">
                No apparel assets yet. Create Design Ready apparel in Apparel Extractor first, or switch to LuxbanditCut Gallery.
              </p>
            )}
          </div>
        </div>

        <div className="grid content-start gap-3 rounded-md border border-black/10 bg-panel p-3">
          <div>
            <div className="text-sm font-black text-ink">2. Create fashion design</div>
            <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">
              LuxbanditFit uses your connected FASHN account. Only selected Design Ready apparel assets are sent to FASHN.
            </p>
          </div>
          <div className="rounded-md border border-black/10 bg-white p-3">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-ink/45">Selection</div>
            <p className="mt-2 text-sm font-bold leading-6 text-ink/70">
              Source: {productSource === "user" ? "My Apparel" : "LuxbanditCut Gallery"}
            </p>
            <p className="text-sm font-bold leading-6 text-ink/70">
              Model: {usesAiGeneratedModel ? `AI-generated ${aiModelGender} model` : selectedModel?.name ?? "None selected"}
            </p>
            <p className="text-sm font-bold leading-6 text-ink/70">
              Apparel assets: {selectedProducts.filter((product) => product.isTryOnReady).length}
            </p>
            <p className="text-sm font-bold leading-6 text-ink/70">
              Framing: {selectedFraming.label}
            </p>
            <p className="text-sm font-bold leading-6 text-ink/70">Provider: FASHN</p>
          </div>
          <textarea
            value={outfitPrompt}
            onChange={(event) => setOutfitPrompt(event.target.value)}
            className="min-h-52 w-full resize-y rounded-md border border-black/10 bg-white p-3 font-mono text-xs font-semibold leading-5 text-ink outline-none focus:border-cobalt"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={handleGenerateOutfit}
            disabled={(!selectedModel && !usesAiGeneratedModel) || selectedReadyProductCount === 0 || isGenerating}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cobalt px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isGenerating ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden="true" className="h-4 w-4" />}
            Create your own fashion now
          </button>
          {((!selectedModel && !usesAiGeneratedModel) || selectedReadyProductCount === 0) && (
            <p className="rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-black leading-6 text-coral">
              {!selectedModel && !usesAiGeneratedModel
                ? "Select a model reference or use AI-generated new model first."
                : "Choose at least one outfit item first."}
            </p>
          )}
          {isGenerating && (
            <div className="grid gap-3 rounded-md border border-cobalt/20 bg-cobalt/10 p-3">
              <div className="flex items-center justify-between gap-2 text-sm font-black text-ink">
                <span className="inline-flex items-center gap-2">
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-cobalt" />
                  Creating outfit
                </span>
                <span className="text-cobalt">{generationSeconds < 60 ? `${generationSeconds}s` : `${Math.floor(generationSeconds / 60)}m ${generationSeconds % 60}s`}</span>
              </div>
              <p className="text-xs font-semibold leading-5 text-ink/65">Please wait. This can take up to 3 minutes.</p>
            </div>
          )}
          {error && (
            <p className="rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-bold leading-6 text-coral">
              {error}
            </p>
          )}
          {resultImage ? (
            <div className="grid gap-2">
              <div className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${
                hasMainOutfitSelection ? "bg-cobalt text-white" : "bg-coral/15 text-coral"
              }`}>
                {creationModeLabel}
              </div>
              <button
                type="button"
                onClick={() => setImageDialog({ title: "Outfit result", src: resultImage })}
                className="overflow-hidden rounded-md border border-black/10 bg-white text-left focus:outline-none focus:ring-2 focus:ring-cobalt"
              >
                <img src={resultImage} alt="Generated outfit result" className="aspect-square w-full object-contain" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const link = document.createElement("a");
                  link.download = "shopcut-outfit-builder.png";
                  link.href = resultImage;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                }}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-black text-white"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                Download outfit PNG
              </button>
            </div>
          ) : (
            <div className="grid aspect-square place-items-center rounded-md border border-black/10 bg-white p-5 text-center text-sm font-bold text-ink/55">
              Outfit result appears here.
            </div>
          )}
        </div>
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
    </div>
  );
}
