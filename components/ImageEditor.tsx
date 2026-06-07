"use client";

import { getClientAccountId, getWorkspaceStorageKey } from "@/lib/client-account";
import { Brush, Check, Copy, Crop, Download, Eraser, Eye, EyeOff, Highlighter, ImagePlus, ListChecks, Loader2, MousePointer2, Sparkles, RotateCcw, RotateCw, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type ImageEditorProps = {
  viewName: string;
  onContinueToFashionCreator?: () => void;
};

type EditorState = {
  imageDataUrl: string | null;
  maskDataUrl: string | null;
};

type CutoutHistoryItem = {
  id: string;
  createdAt: string;
  imageDataUrl: string;
  maskDataUrl: string;
  cutoutDataUrl: string;
  prompt: string;
};

type GalleryImageItem = {
  id: string;
  type: "upload" | "cutout" | "shop-image" | "model-image";
  path: string;
  url: string;
  createdAt: string;
  name: string;
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

const STORAGE_PREFIX = "shopcut-ai-view";
const HISTORY_STORAGE_PREFIX = "shopcut-ai-history";
const DETECTED_PRODUCTS_STORAGE_KEY = "shopcut-ai-latest-detected-products";
const PRODUCT_ASSETS_STORAGE_KEY = "shopcut-ai-product-assets";
const getProductAssetsStorageKey = () => getWorkspaceStorageKey(PRODUCT_ASSETS_STORAGE_KEY);
const CANVAS_SIZE = 820;
const MAX_CANVAS_EDGE = 1600;
const MAX_HISTORY_ITEMS = 4;
const MAX_STORED_CUTOUT_EDGE = 600;
const MAX_GENERATED_OUTPUT_EDGE = 1024;

type EditorSize = {
  width: number;
  height: number;
};

const backgroundOptions = [
  {
    label: "White",
    value: "white",
    swatch: "#ffffff",
    prompt: "pure white studio background"
  },
  {
    label: "Light gray",
    value: "light-gray",
    swatch: "#e7e7e4",
    prompt: "light gray ecommerce studio background"
  },
  {
    label: "Light gradient",
    value: "light-gradient",
    swatch: "linear-gradient(180deg, #f1f1f1 0%, #e8e8e8 48%, #d3d3d3 100%)",
    prompt: "subtle light gray vertical studio gradient background, very light gray at the top and softly darker light gray at the bottom"
  },
  {
    label: "Dark gradient",
    value: "dark-gradient",
    swatch: "linear-gradient(180deg, #56585d 0%, #232428 62%, #050506 100%)",
    prompt: "dark charcoal vertical studio gradient background, softer gray at the top and deep black at the bottom"
  }
] as const;

type BackgroundValue = (typeof backgroundOptions)[number]["value"];
type ToolMode = "keep" | "erase";
type ProductView = "front" | "side" | "back";
type AiRetouchMode = "preserve" | "rebuild";
type AiRetouchProvider = "fashn" | "openai";
type DetectedProduct = {
  id: string;
  label: string;
  color?: string;
  material?: string;
  shape?: string;
  details?: string;
  description?: string;
  bbox?: number[];
  selected: boolean;
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

type GalleryUploadResponse = {
  images?: unknown[];
  image?: GalleryImageItem | null;
  path?: string;
};

type ImportedPageImage = {
  sourceUrl: string;
  dataUrl: string;
};

const productViewOptions = [
  {
    label: "Front",
    value: "front",
    instruction:
      "Product view selected by user: FRONT VIEW. Create the final ecommerce image as a front-facing product view. Preserve only the selected product piece(s), their real construction, material, color placement, silhouette, and proportions."
  },
  {
    label: "Side",
    value: "side",
    instruction:
      "Product view selected by user: SIDE VIEW. Create the final ecommerce image as a side-facing product view. Preserve only the selected product piece(s), side seams, straps, profile proportions, material, color placement, and silhouette."
  },
  {
    label: "Back",
    value: "back",
    instruction:
      "Product view selected by user: BACK VIEW. Create the final ecommerce image as a rear/back product view. Preserve only the selected product piece(s), rear straps, back closures, thong or panty back shape, back seams, rear-facing construction, material, color placement, and silhouette. Do not create front breast cups, cleavage, front torso panels, or a front panty view."
  }
] as const;

const shapeOptions = [
  { label: "I don't know", value: "unknown shape" },
  { label: "Brief", value: "brief" },
  { label: "Bikini", value: "bikini" },
  { label: "Tanga", value: "tanga" },
  { label: "Thong", value: "thong" },
  { label: "String", value: "string" },
  { label: "Brazilian", value: "brazilian" },
  { label: "High waist", value: "high-waist" },
  { label: "Cut-out", value: "cut-out" },
  { label: "Custom", value: "custom" }
] as const;

const criticalRulePresets = [
  {
    label: "Opaque black panty",
    value:
      "The panty must remain opaque black. Do not make the panty transparent. Do not add lace texture to the black panty. Preserve the distinction between black lace, nude mesh, and solid black fabric."
  },
  {
    label: "Preserve metal hardware",
    value:
      "Preserve visible metal hardware exactly. Do not add, remove, recolor, or redesign rings, sliders, hooks, clips, buckles, or clasps."
  },
  {
    label: "No bows or ribbons",
    value:
      "Do not add bows or ribbons. Preserve bows or ribbons only if they are clearly visible in the transparent cutout."
  },
  {
    label: "Preserve lace vs mesh",
    value:
      "Preserve the exact distinction between lace, mesh, opaque fabric, sheer fabric, elastic, seams, and trim. Do not reinterpret one material as another."
  }
] as const;

const aiRetouchModes = [
  {
    label: "Preserve Cutout",
    value: "preserve",
    description: "Default. Keeps the prepared asset close to the extracted cutout."
  },
  {
    label: "Rebuild Apparel",
    value: "rebuild",
    description: "Experimental. Stronger AI reconstruction and may change the apparel."
  }
] as const;

const aiRetouchProviders = [
  {
    label: "FASHN",
    value: "fashn",
    description: "Try this for apparel extraction. Uses the cleaned cutout as garment reference."
  },
  {
    label: "OpenAI",
    value: "openai",
    description: "Try this as an additional preparation test with the same cutout and prompt."
  }
] as const;

const editorGalleryGroups = [
  { title: "Uploads", types: ["upload"] as const, empty: "No Uploads yet." },
  { title: "Apparel", types: ["shop-image", "cutout"] as const, empty: "No Apparel assets yet." },
  { title: "Your Designs", types: ["model-image"] as const, empty: "No Fashion Creator designs yet." }
];

const galleryImageLabel = (type: GalleryImageItem["type"]) => {
  if (type === "upload") return "Upload";
  if (type === "cutout") return "Cutout";
  if (type === "model-image") return "Design";
  return "Apparel";
};

const sameViewPromptText =
  "preserve the exact visible product viewpoint from the input image. If the input shows the back, output the back. If it shows the side, output the side. Never rotate the product to another side";

const productPromptText = (product: DetectedProduct) => {
  const details = [product.color, product.material, product.shape, product.details, product.description]
    .map((detail) => detail?.trim())
    .filter(Boolean);
  const uniqueDetails = Array.from(new Set(details));
  return uniqueDetails.length ? `${product.label}: ${uniqueDetails.join(", ")}` : product.label;
};

const shortProductPieceText = (product: DetectedProduct) => {
  const color = product.color?.trim();
  const shape = product.shape?.trim();
  const shapeIsShort = shape && shape !== "unknown shape" && shape.length <= 16 && !shape.includes(",");
  return [color, shapeIsShort ? shape : "", product.label].filter(Boolean).join(" ");
};

const inferProductAssetBodyZone = (name: string): ProductAssetBodyZone => {
  const text = name.toLowerCase();
  if (/\b(shoe|sneaker|boot|heel|sandal)\b/.test(text)) return "shoes";
  if (/\b(pant|jean|short|skirt|legging|trouser|panty|brief|thong|bottom)\b/.test(text)) return "lower_body";
  if (/\b(dress|bodysuit|jumpsuit|set|outfit)\b/.test(text)) return "full_body";
  if (/\b(glasses|sunglasses|earring|jewelry|necklace|ring|watch|bag|hat|belt|scarf|accessory)\b/.test(text)) return "accessory";
  return "upper_body";
};

const isLikelyLingerieProducts = (products: DetectedProduct[]) => {
  const text = products
    .map((product) => [product.label, product.material, product.shape, product.details, product.description].filter(Boolean).join(" "))
    .join(" ")
    .toLowerCase();
  return /\b(lingerie|bra|bralette|panty|panties|thong|g-string|string|corset|bodysuit|garter|garter belt|stocking|stockings|suspender|suspender belt|lace underwear|underwear|briefs|bikini bottom)\b/.test(text);
};

const urlToDataUrl = async (url: string) => {
  if (url.startsWith("data:image/")) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Gallery image could not be loaded.");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gallery image could not be read."));
    reader.readAsDataURL(blob);
  });
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

const cropProductFromSource = async (sourceDataUrl: string, bbox?: number[], maxEdge = 520) => {
  if (!bbox || bbox.length !== 4) return null;
  const [x, y, width, height] = bbox;
  if (width <= 0 || height <= 0) return null;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Product crop image could not be loaded."));
    img.src = sourceDataUrl;
  });

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scaleX = sourceWidth / 1000;
  const scaleY = sourceHeight / 1000;
  const padding = Math.max(width, height) * 0.08;
  const sourceX = Math.max(0, Math.round((x - padding) * scaleX));
  const sourceY = Math.max(0, Math.round((y - padding) * scaleY));
  const cropWidth = Math.min(sourceWidth - sourceX, Math.round((width + padding * 2) * scaleX));
  const cropHeight = Math.min(sourceHeight - sourceY, Math.round((height + padding * 2) * scaleY));
  if (cropWidth <= 0 || cropHeight <= 0) return null;

  const output = document.createElement("canvas");
  const longestEdge = Math.max(cropWidth, cropHeight);
  const scale = longestEdge > maxEdge ? maxEdge / longestEdge : 1;
  output.width = Math.max(1, Math.round(cropWidth * scale));
  output.height = Math.max(1, Math.round(cropHeight * scale));
  const ctx = output.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, output.width, output.height);
  ctx.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, output.width, output.height);
  return output.toDataURL("image/png");
};

const splitImageIntoFrontBackViews = async (sourceDataUrl: string) => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Multi-view image could not be loaded."));
    img.src = sourceDataUrl;
  });

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const halfWidth = Math.floor(sourceWidth / 2);
  if (halfWidth <= 0 || sourceHeight <= 0) {
    throw new Error("Multi-view image is too small to split.");
  }

  const cropHalf = (sourceX: number, width: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = sourceHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Multi-view crop could not be created.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, sourceX, 0, width, sourceHeight, 0, 0, width, sourceHeight);
    return canvas.toDataURL("image/png");
  };

  return {
    front: cropHalf(0, halfWidth),
    back: cropHalf(halfWidth, sourceWidth - halfWidth)
  };
};

export function ImageEditor({ viewName, onContinueToFashionCreator }: ImageEditorProps) {
  const fabricCanvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<any>(null);
  const fabricModuleRef = useRef<any>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const editorSurfaceRef = useRef<HTMLDivElement | null>(null);
  const stepOneRef = useRef<HTMLDivElement | null>(null);
  const extractionResultsRef = useRef<HTMLDivElement | null>(null);
  const maskBufferRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const redoRef = useRef<ImageData[]>([]);
  const isDrawingRef = useRef(false);
  const hasSelectionRef = useRef(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(34);
  const [markerOpacity, setMarkerOpacity] = useState(100);
  const [zoom, setZoom] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [editorSize, setEditorSize] = useState<EditorSize>({ width: CANVAS_SIZE, height: CANVAS_SIZE });
  const [toolMode, setToolMode] = useState<ToolMode>("keep");
  const [isPrecisionMode] = useState(true);
  const [background, setBackground] = useState<BackgroundValue>("white");
  const [productView, setProductView] = useState<ProductView | null>(null);
  const [cutoutPreview, setCutoutPreview] = useState<string | null>(null);
  const [cutoutHistory, setCutoutHistory] = useState<CutoutHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [customShopPrompt, setCustomShopPrompt] = useState("");
  const [isShopPromptEdited, setIsShopPromptEdited] = useState(false);
  const [isShopPromptOpen, setIsShopPromptOpen] = useState(false);
  const [criticalProductNote, setCriticalProductNote] = useState<string>(criticalRulePresets[0].value);
  const [aiRetouchMode, setAiRetouchMode] = useState<AiRetouchMode>("preserve");
  const [aiRetouchProvider, setAiRetouchProvider] = useState<AiRetouchProvider>("fashn");
  const [shopImage, setShopImage] = useState<string | null>(null);
  const [imageDialog, setImageDialog] = useState<{ title: string; src: string; checkerboard?: boolean } | null>(null);
  const [isSourceGalleryOpen, setIsSourceGalleryOpen] = useState(false);
  const [sourceGalleryImages, setSourceGalleryImages] = useState<GalleryImageItem[]>([]);
  const [isLoadingSourceGallery, setIsLoadingSourceGallery] = useState(false);
  const [websiteImportUrl, setWebsiteImportUrl] = useState("");
  const [importedPageImages, setImportedPageImages] = useState<ImportedPageImage[]>([]);
  const [isImportingWebsiteImages, setIsImportingWebsiteImages] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSeconds, setGenerationSeconds] = useState(0);
  const [isDetectingProducts, setIsDetectingProducts] = useState(false);
  const [detectedProducts, setDetectedProducts] = useState<DetectedProduct[]>([]);
  const [isDetectedProductsOpen, setIsDetectedProductsOpen] = useState(false);
  const [cutoutError, setCutoutError] = useState<string | null>(null);
  const [retouchError, setRetouchError] = useState<string | null>(null);
  const [assetSaveMessage, setAssetSaveMessage] = useState<string | null>(null);
  const [brushCursor, setBrushCursor] = useState({ x: 0, y: 0, size: brushSize, visible: false });
  const [showSelectionOverlay, setShowSelectionOverlay] = useState(true);
  const [splitFrontBackMode, setSplitFrontBackMode] = useState(false);
  const [isProcessingMultiView, setIsProcessingMultiView] = useState(false);
  const [multiViewMessage, setMultiViewMessage] = useState<string | null>(null);
  const [clientAccountId, setClientAccountId] = useState<string | null>(null);
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null);
  const imageDataUrlRef = useRef<string | null>(null);
  const editorSizeRef = useRef<EditorSize>({ width: CANVAS_SIZE, height: CANVAS_SIZE });
  const markerOpacityRef = useRef(100);

  const storageKey = `${STORAGE_PREFIX}-${viewName.toLowerCase()}`;
  const historyStorageKey = `${HISTORY_STORAGE_PREFIX}-${viewName.toLowerCase()}`;

  useEffect(() => {
    const syncAccount = () => {
      const accountId = getClientAccountId();
      setClientAccountId(accountId);

      void fetch("/api/account/credits", {
        headers: {
          "x-shopcut-account-id": accountId
        }
      })
        .then((response) => response.json())
        .then((payload: CreditStatus) => setCreditStatus(payload))
        .catch(() => setCreditStatus(null));
    };

    syncAccount();
    window.addEventListener("luxurybandit-auth-updated", syncAccount);
    return () => window.removeEventListener("luxurybandit-auth-updated", syncAccount);
  }, []);

  const saveGalleryImage = useCallback(
    async (type: "upload" | "cutout" | "shop-image" | "model-image", image: string) => {
      if (!clientAccountId) return;

      try {
        const response = await fetch("/api/gallery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-shopcut-account-id": clientAccountId
          },
          body: JSON.stringify({ type, image })
        });
        const payload = await readJsonResponse<{ images?: unknown[] }>(response);
        if (!response.ok || !payload.images) throw new Error(payload.error ?? "Image could not be saved to gallery.");
        window.dispatchEvent(new Event("shopcut-gallery-updated"));
      } catch (error) {
        console.warn(error instanceof Error ? error.message : "Image could not be saved to gallery.");
      }
    },
    [clientAccountId]
  );

  const canvasToLimitedPngDataUrl = (canvas: HTMLCanvasElement, maxEdge = MAX_STORED_CUTOUT_EDGE) => {
    const longestEdge = Math.max(canvas.width, canvas.height);
    if (longestEdge <= maxEdge) return canvas.toDataURL("image/png");

    const scale = maxEdge / longestEdge;
    const output = document.createElement("canvas");
    output.width = Math.max(1, Math.round(canvas.width * scale));
    output.height = Math.max(1, Math.round(canvas.height * scale));
    const ctx = output.getContext("2d");
    if (!ctx) return canvas.toDataURL("image/png");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, 0, 0, output.width, output.height);
    return output.toDataURL("image/png");
  };

  const resizeImageDataUrl = (dataUrl: string, maxEdge = MAX_GENERATED_OUTPUT_EDGE) =>
    new Promise<string>((resolve) => {
      const image = new Image();
      image.onload = () => {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        const longestEdge = Math.max(width, height);
        if (!width || !height || longestEdge <= maxEdge) {
          resolve(dataUrl);
          return;
        }

        const scale = maxEdge / longestEdge;
        const output = document.createElement("canvas");
        output.width = Math.max(1, Math.round(width * scale));
        output.height = Math.max(1, Math.round(height * scale));
        const ctx = output.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, 0, 0, output.width, output.height);
        resolve(output.toDataURL("image/png"));
      };
      image.onerror = () => resolve(dataUrl);
      image.src = dataUrl;
    });

  const persistHistory = (items: CutoutHistoryItem[]) => {
    const limitedItems = items.slice(0, MAX_HISTORY_ITEMS);
    for (let count = limitedItems.length; count >= 1; count -= 1) {
      const attempt = limitedItems.slice(0, count);
      try {
        window.localStorage.setItem(historyStorageKey, JSON.stringify(attempt));
        return attempt;
      } catch {
        window.localStorage.removeItem(historyStorageKey);
      }
    }
    return [];
  };

  useEffect(() => {
    imageDataUrlRef.current = imageDataUrl;
  }, [imageDataUrl]);

  useEffect(() => {
    editorSizeRef.current = editorSize;
  }, [editorSize]);

  const resizeCanvas = (canvas: HTMLCanvasElement, size: EditorSize) => {
    if (canvas.width !== size.width) canvas.width = size.width;
    if (canvas.height !== size.height) canvas.height = size.height;
  };

  const syncEditorCanvases = useCallback((size: EditorSize) => {
    if (baseCanvasRef.current) resizeCanvas(baseCanvasRef.current, size);
    if (maskBufferRef.current) resizeCanvas(maskBufferRef.current, size);
    if (previewCanvasRef.current) resizeCanvas(previewCanvasRef.current, size);
    if (maskCanvasRef.current) resizeCanvas(maskCanvasRef.current, size);
    if (fabricCanvasElementRef.current) resizeCanvas(fabricCanvasElementRef.current, size);
    fabricCanvasRef.current?.setDimensions(size);
  }, []);

  const getMaskCanvas = useCallback(() => {
    if (!maskBufferRef.current) {
      const canvas = document.createElement("canvas");
      resizeCanvas(canvas, editorSizeRef.current);
      maskBufferRef.current = canvas;
    }
    return maskBufferRef.current;
  }, []);

  const getBaseCanvas = useCallback(() => {
    if (!baseCanvasRef.current) {
      const canvas = document.createElement("canvas");
      resizeCanvas(canvas, editorSizeRef.current);
      baseCanvasRef.current = canvas;
    }
    return baseCanvasRef.current;
  }, []);

  const getMaskContext = useCallback(() => {
    return getMaskCanvas().getContext("2d");
  }, [getMaskCanvas]);

  const resetPointerCanvas = useCallback(() => {
    const canvas = maskCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const redrawPreview = useCallback(() => {
    const baseCanvas = getBaseCanvas();
    const previewCanvas = previewCanvasRef.current;
    const ctx = previewCanvas?.getContext("2d");
    if (!baseCanvas || !previewCanvas || !ctx) return;

    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.drawImage(baseCanvas, 0, 0);
  }, [getBaseCanvas]);

  const hasMaskSelection = useCallback(() => {
    const ctx = getMaskContext();
    const canvas = getMaskCanvas();
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return data.some((value, index) => index % 4 === 3 && value > 0);
  }, [getMaskCanvas, getMaskContext]);

  const redrawSelectionOverlay = useCallback(() => {
    const maskCanvas = getMaskCanvas();
    const overlayCanvas = maskCanvasRef.current;
    const overlayCtx = overlayCanvas?.getContext("2d");
    if (!overlayCanvas || !overlayCtx) return;

    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    overlayCtx.save();
    overlayCtx.globalAlpha = markerOpacityRef.current / 100;
    overlayCtx.fillStyle = "#2457d6";
    overlayCtx.drawImage(maskCanvas, 0, 0, overlayCanvas.width, overlayCanvas.height);
    overlayCtx.globalCompositeOperation = "source-in";
    overlayCtx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    overlayCtx.restore();
  }, [getMaskCanvas]);

  useEffect(() => {
    markerOpacityRef.current = markerOpacity;
    redrawSelectionOverlay();
  }, [markerOpacity, redrawSelectionOverlay]);

  const getCutoutCanvas = useCallback(() => {
    const baseCanvas = getBaseCanvas();
    const maskCanvas = getMaskCanvas();
    const output = document.createElement("canvas");
    output.width = baseCanvas.width;
    output.height = baseCanvas.height;
    const ctx = output.getContext("2d");
    if (!ctx) return output;

    ctx.drawImage(baseCanvas, 0, 0);
    if (hasSelectionRef.current) {
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalCompositeOperation = "source-over";
    }
    return output;
  }, [getBaseCanvas, getMaskCanvas]);

  const getAiReferenceCanvas = useCallback(() => {
    const cutoutCanvas = hasSelectionRef.current ? getBaseCanvas() : getCutoutCanvas();
    const output = document.createElement("canvas");
    output.width = cutoutCanvas.width;
    output.height = cutoutCanvas.height;
    const ctx = output.getContext("2d");
    if (!ctx) return output;

    ctx.drawImage(cutoutCanvas, 0, 0);
    return output;
  }, [getBaseCanvas, getCutoutCanvas]);

  const getFocusReferenceCanvas = useCallback(() => {
    const baseCanvas = getBaseCanvas();
    const output = document.createElement("canvas");
    output.width = baseCanvas.width;
    output.height = baseCanvas.height;
    const ctx = output.getContext("2d");
    if (!ctx) return output;

    ctx.drawImage(baseCanvas, 0, 0);
    if (hasSelectionRef.current) {
      ctx.save();
      const focusMask = document.createElement("canvas");
      focusMask.width = baseCanvas.width;
      focusMask.height = baseCanvas.height;
      const focusCtx = focusMask.getContext("2d");
      if (focusCtx) {
        focusCtx.drawImage(getMaskCanvas(), 0, 0);
        focusCtx.globalCompositeOperation = "source-in";
        focusCtx.fillStyle = "#2457d6";
        focusCtx.fillRect(0, 0, focusMask.width, focusMask.height);
      }
      ctx.globalAlpha = 0.48;
      ctx.fillStyle = "#2457d6";
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(focusMask, 0, 0);
      ctx.restore();
    }
    return output;
  }, [getBaseCanvas, getMaskCanvas]);

  const saveState = useCallback(() => {
    const maskCanvas = getMaskCanvas();
    const payload: EditorState = {
      imageDataUrl: imageDataUrlRef.current,
      maskDataUrl: maskCanvas.toDataURL("image/png")
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      window.localStorage.removeItem(historyStorageKey);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }
  }, [getMaskCanvas, historyStorageKey, storageKey]);

  const refreshHistoryButtons = useCallback(() => {
    setCanUndo(historyRef.current.length > 1);
    setCanRedo(redoRef.current.length > 0);
  }, []);

  const pushHistory = useCallback(() => {
    const ctx = getMaskContext();
    const canvas = getMaskCanvas();
    if (!ctx || !canvas) return;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 40) historyRef.current.shift();
    redoRef.current = [];
    refreshHistoryButtons();
  }, [getMaskCanvas, getMaskContext, refreshHistoryButtons]);

  const restoreMask = useCallback(
    (imageData: ImageData) => {
      const ctx = getMaskContext();
      if (!ctx) return;
      ctx.putImageData(imageData, 0, 0);
      hasSelectionRef.current = hasMaskSelection();
      refreshHistoryButtons();
      redrawSelectionOverlay();
      redrawPreview();
      window.setTimeout(saveState, 0);
    },
    [getMaskContext, hasMaskSelection, redrawPreview, redrawSelectionOverlay, refreshHistoryButtons, saveState]
  );

  const renderFabricImage = useCallback(
    async (dataUrl: string) => {
      const fabric = fabricModuleRef.current;
      const canvas = fabricCanvasRef.current;
      if (!fabric || !canvas) return;

      const image = await fabric.FabricImage.fromURL(dataUrl);
      const size = editorSizeRef.current;
      canvas.setDimensions(size);
      canvas.clear();
      const originalSize = image.getOriginalSize?.() ?? { width: image.width, height: image.height };
      const imageWidth = originalSize.width || image.width;
      const imageHeight = originalSize.height || image.height;
      image.set({
        selectable: false,
        evented: false,
        originX: "left",
        originY: "top"
      });

      const scale = Math.min(size.width / imageWidth, size.height / imageHeight);
      image.scale(scale);
      image.set({
        left: (size.width - imageWidth * scale) / 2,
        top: (size.height - imageHeight * scale) / 2
      });

      canvas.add(image);
      canvas.renderAll();
      redrawPreview();
    },
    [redrawPreview]
  );

  const drawContainedImage = useCallback(
    (dataUrl: string) => {
      return new Promise<EditorSize>((resolve) => {
      const image = new Image();
      image.onload = () => {
        const imageWidth = image.naturalWidth || image.width;
        const imageHeight = image.naturalHeight || image.height;
        const outputScale = Math.min(1, MAX_CANVAS_EDGE / Math.max(imageWidth, imageHeight));
        const nextSize = {
          width: Math.max(1, Math.round(imageWidth * outputScale)),
          height: Math.max(1, Math.round(imageHeight * outputScale))
        };

        editorSizeRef.current = nextSize;
        setEditorSize(nextSize);
        syncEditorCanvases(nextSize);

        const canvas = getBaseCanvas();
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(nextSize);
          return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        redrawPreview();
        resolve(nextSize);
      };
      image.onerror = () => resolve(editorSizeRef.current);
      image.src = dataUrl;
      });
    },
    [getBaseCanvas, redrawPreview, syncEditorCanvases]
  );

  const loadImage = useCallback(
    (dataUrl: string, maskDataUrl?: string | null) => {
      void drawContainedImage(dataUrl).then(() => {
        void renderFabricImage(dataUrl);
        const maskCanvas = getMaskCanvas();
        const maskCtx = getMaskContext();
        if (!maskCanvas || !maskCtx) return;

        resetPointerCanvas();
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        historyRef.current = [];
        redoRef.current = [];

        if (maskDataUrl) {
          const maskImage = new Image();
          maskImage.onload = () => {
            maskCtx.drawImage(maskImage, 0, 0, maskCanvas.width, maskCanvas.height);
            hasSelectionRef.current = hasMaskSelection();
            redrawSelectionOverlay();
            pushHistory();
            redrawPreview();
            saveState();
          };
          maskImage.src = maskDataUrl;
        } else {
          hasSelectionRef.current = false;
          pushHistory();
          redrawPreview();
          saveState();
        }
      });
    },
    [drawContainedImage, getMaskCanvas, getMaskContext, hasMaskSelection, pushHistory, redrawPreview, redrawSelectionOverlay, renderFabricImage, resetPointerCanvas, saveState]
  );

  useEffect(() => {
    let disposed = false;

    void import("fabric").then((fabric) => {
      if (disposed || !fabricCanvasElementRef.current) return;
      fabricModuleRef.current = fabric;
      const canvas = new fabric.Canvas(fabricCanvasElementRef.current, {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        selection: false
      });
      canvas.skipTargetFind = true;
      fabricCanvasRef.current = canvas;
      if (imageDataUrlRef.current) void renderFabricImage(imageDataUrlRef.current);
    });

    return () => {
      disposed = true;
      fabricCanvasRef.current?.dispose();
      fabricCanvasRef.current = null;
    };
  }, [renderFabricImage]);

  useEffect(() => {
    const rawState = window.localStorage.getItem(storageKey);
    if (!rawState) return;
    try {
      const saved = JSON.parse(rawState) as EditorState;
      if (saved.imageDataUrl) {
        imageDataUrlRef.current = saved.imageDataUrl;
        setImageDataUrl(saved.imageDataUrl);
        loadImage(saved.imageDataUrl, saved.maskDataUrl);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [loadImage, storageKey]);

  useEffect(() => {
    const rawHistory = window.localStorage.getItem(historyStorageKey);
    if (!rawHistory) return;
    try {
      const savedHistory = JSON.parse(rawHistory) as CutoutHistoryItem[];
      const limitedHistory = Array.isArray(savedHistory) ? savedHistory.slice(0, MAX_HISTORY_ITEMS) : [];
      const storedHistory = persistHistory(limitedHistory);
      setCutoutHistory(storedHistory);
    } catch {
      window.localStorage.removeItem(historyStorageKey);
    }
  }, [historyStorageKey]);

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      applySourceImage(result);
      void saveGalleryImage("upload", result);
    };
    reader.readAsDataURL(file);
  };

  const applySourceImage = (dataUrl: string) => {
    imageDataUrlRef.current = dataUrl;
    setImageDataUrl(dataUrl);
    setProductView(null);
    setDetectedProducts([]);
    setAssetSaveMessage(null);
    setCutoutPreview(null);
    setActiveHistoryId(null);
    setAiPrompt("");
    setShopImage(null);
    setCutoutError(null);
    setRetouchError(null);
    loadImage(dataUrl);
  };

  const clearGeneratedOutputs = () => {
    setCutoutPreview(null);
    setActiveHistoryId(null);
    setAiPrompt("");
    setShopImage(null);
    setCutoutError(null);
    setRetouchError(null);
    setMultiViewMessage(null);
  };

  const handleDeleteUpload = () => {
    imageDataUrlRef.current = null;
    setImageDataUrl(null);
    clearGeneratedOutputs();
    setDetectedProducts([]);
    setProductView(null);
    hasSelectionRef.current = false;
    historyRef.current = [];
    redoRef.current = [];
    refreshHistoryButtons();
    resetPointerCanvas();
    const maskCanvas = getMaskCanvas();
    const maskCtx = maskCanvas.getContext("2d");
    maskCtx?.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    const baseCanvas = getBaseCanvas();
    const baseCtx = baseCanvas.getContext("2d");
    baseCtx?.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
    redrawPreview();
    redrawSelectionOverlay();
    window.localStorage.removeItem(storageKey);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteCutout = () => {
    clearGeneratedOutputs();
  };

  const handleRestoreHistoryItem = (item: CutoutHistoryItem) => {
    imageDataUrlRef.current = item.imageDataUrl;
    setImageDataUrl(item.imageDataUrl);
    setCutoutPreview(item.cutoutDataUrl);
    setActiveHistoryId(item.id);
    setAiPrompt(item.prompt);
    setShopImage(null);
    setCutoutError(null);
    setRetouchError(null);
    loadImage(item.imageDataUrl, item.maskDataUrl);
    window.setTimeout(() => {
      stepOneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const handleEditCurrentCutout = () => {
    const activeItem = cutoutHistory.find((item) => item.id === activeHistoryId);
    if (activeItem) {
      handleRestoreHistoryItem(activeItem);
      return;
    }

    window.setTimeout(() => {
      stepOneRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const handleDeleteHistoryItem = (id: string) => {
    const nextHistory = cutoutHistory.filter((item) => item.id !== id);
    persistHistory(nextHistory);
    setCutoutHistory(nextHistory);
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
      clearGeneratedOutputs();
    }
  };

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const updateBrushCursor = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const surface = editorSurfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    const visibleBrushSize = brushSize * (rect.width / Math.max(editorSizeRef.current.width, 1));
    setBrushCursor({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      size: visibleBrushSize,
      visible: true
    });
  };

  const paintAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const ctx = getMaskContext();
    const pointerCanvas = maskCanvasRef.current;
    const pointerCtx = pointerCanvas?.getContext("2d");
    if (!ctx || !pointerCanvas || !pointerCtx) return;
    const point = getCanvasPoint(event);
    const radius = brushSize / 2;
    const hardX = Math.round(point.x);
    const hardY = Math.round(point.y);

    if (toolMode === "keep") hasSelectionRef.current = true;
    ctx.globalCompositeOperation = toolMode === "keep" ? "source-over" : "destination-out";
    ctx.fillStyle = "#fff";
    ctx.imageSmoothingEnabled = false;
    ctx.beginPath();
    ctx.arc(hardX, hardY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    if (toolMode === "keep") {
      pointerCtx.globalCompositeOperation = "source-over";
      pointerCtx.fillStyle = `rgba(36, 87, 214, ${markerOpacityRef.current / 100})`;
      pointerCtx.imageSmoothingEnabled = false;
      pointerCtx.beginPath();
      pointerCtx.arc(hardX, hardY, radius, 0, Math.PI * 2);
      pointerCtx.fill();
    } else {
      pointerCtx.globalCompositeOperation = "destination-out";
      pointerCtx.imageSmoothingEnabled = false;
      pointerCtx.beginPath();
      pointerCtx.arc(hardX, hardY, radius, 0, Math.PI * 2);
      pointerCtx.fill();
      pointerCtx.globalCompositeOperation = "source-over";
    }

    if (toolMode === "erase") {
      hasSelectionRef.current = hasMaskSelection();
    }

    redrawPreview();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!imageDataUrl) return;
    updateBrushCursor(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    paintAt(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    updateBrushCursor(event);
    if (!isDrawingRef.current) return;
    paintAt(event);
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    pushHistory();
    window.setTimeout(saveState, 0);
  };

  const handleUndo = () => {
    if (historyRef.current.length <= 1) return;
    const current = historyRef.current.pop();
    if (current) redoRef.current.push(current);
    const previous = historyRef.current[historyRef.current.length - 1];
    if (previous) restoreMask(previous);
  };

  const handleRedo = () => {
    const next = redoRef.current.pop();
    if (!next) return;
    historyRef.current.push(next);
    restoreMask(next);
  };

  const handleExport = () => {
    if (!imageDataUrl) return;
    const cutoutCanvas = getCutoutCanvas();

    const link = document.createElement("a");
    link.download = `shopcut-${viewName.toLowerCase()}-transparent.png`;
    link.href = cutoutCanvas.toDataURL("image/png");
    link.click();
  };

  const buildPrompt = (productText: string) => {
    const selectedBackground = backgroundOptions.find((option) => option.value === background)?.prompt ?? backgroundOptions[0].prompt;
    return [
      "Create a clean ecommerce product image from this transparent product cutout.",
      "",
      "The cutout is the main source of truth.",
      "Retouch the existing product only.",
      "Do not redesign it.",
      "",
      `Selected product pieces: ${productText}.`,
      `View: ${sameViewPromptText}.`,
      `Background: ${selectedBackground}.`,
      "Square 1:1 ecommerce image.",
      "",
      "Preserve exactly: original shape, original proportions, original color placement, visible fabric types, visible seams, visible straps, visible hardware, visible silhouette.",
      "Material rule: preserve opaque and sheer areas exactly. Do not reinterpret opaque fabric as mesh, lace, sheer fabric, or skin.",
      "Cleanup rule: remove remaining person, skin, body, hair, and background traces only. Repair only tiny missing garment edges. Do not invent missing design features. Do not add new lace, bows, ribbons, trims, seams, decorations, or extra garment pieces.",
      "Output rule: center the complete selected product with comfortable margins. Do not crop straps, garters, panties, ribbons, or edges."
    ].join("\n");
  };

  async function saveMultiViewProductGroup(
    groupId: string,
    views: Array<{
      viewType: "front" | "back";
      displayOrder: number;
      sourceDataUrl: string;
      shopImageDataUrl: string;
      products: DetectedProduct[];
    }>
  ) {
    const createdAt = new Date().toISOString();
    const groupTitle =
      views
        .flatMap((view) => view.products.map(shortProductPieceText))
        .filter(Boolean)[0] || "front and back apparel";

    const newAssets = await Promise.all(views.map(async (view) => {
      const productText = view.products.map(shortProductPieceText).filter(Boolean).join(", ") || "apparel";
      const compactShopImage = await resizeImageDataUrl(view.shopImageDataUrl, 520);
      let assetImageUrl = compactShopImage;
      let assetImageId = `local-${Date.now()}-${view.viewType}`;

      try {
        const uploadedImage = await uploadGalleryImageAndReturnUrl("shop-image", compactShopImage);
        if (uploadedImage?.url) {
          assetImageUrl = uploadedImage.url;
          assetImageId = uploadedImage.id;
        }
      } catch {
        // Keep local fallback when Supabase is temporarily unavailable.
      }

      return {
        id: `${assetImageId}-${groupId}-${view.viewType}`,
        name: `${view.viewType === "front" ? "Front" : "Back"} view: ${productText}`,
        bodyZone: inferProductAssetBodyZone(productText),
        imageDataUrl: assetImageUrl,
        description: `${view.viewType} view. ${view.products.map(productPromptText).filter(Boolean).join(", ") || productText}`,
        color: view.products.find((product) => product.color)?.color,
        createdAt,
        productGroupId: groupId,
        productGroupTitle: groupTitle,
        viewType: view.viewType,
        displayOrder: view.displayOrder,
        sourceImageId: groupId,
        sourceImageUrl: view.sourceDataUrl,
        retouchedImageUrl: assetImageUrl
      } satisfies StoredProductAsset;
    }));

    const productAssetsStorageKey = getProductAssetsStorageKey();
    const storedAssets = window.localStorage.getItem(productAssetsStorageKey);
    const existingAssets = storedAssets ? JSON.parse(storedAssets) as StoredProductAsset[] : [];
    const validExistingAssets = Array.isArray(existingAssets)
      ? existingAssets.filter((asset) => asset?.id && asset?.imageDataUrl)
      : [];
    const nextAssets = [...newAssets, ...validExistingAssets].slice(0, 80);
    window.localStorage.setItem(productAssetsStorageKey, JSON.stringify(nextAssets));
    window.dispatchEvent(new Event("shopcut-gallery-updated"));
    return newAssets.length;
  }

  async function handleCreateMultiViewAssets() {
    if (!imageDataUrl || isProcessingMultiView || isDetectingProducts || isGenerating) return;

    setIsProcessingMultiView(true);
    setMultiViewMessage(null);
    setCutoutError(null);
    setRetouchError(null);
    setAssetSaveMessage(null);

    try {
      const splitViews = await splitImageIntoFrontBackViews(imageDataUrl);
      const groupId = `product-group-${Date.now()}-${crypto.randomUUID()}`;
      const results: Array<{
        viewType: "front" | "back";
        displayOrder: number;
        sourceDataUrl: string;
        shopImageDataUrl: string;
        products: DetectedProduct[];
      }> = [];
      const failures: string[] = [];

      for (const view of [
        { viewType: "front" as const, label: "Front", displayOrder: 1, dataUrl: splitViews.front },
        { viewType: "back" as const, label: "Back", displayOrder: 2, dataUrl: splitViews.back }
      ]) {
        try {
          setMultiViewMessage(`Processing ${view.label} view...`);
          const detected = await detectProductsFromDataUrl(view.dataUrl);
          const products = detected.products.length
            ? detected.products
            : [{
                id: `${view.viewType}-apparel`,
                label: "apparel",
                selected: true
              } satisfies DetectedProduct];
          const shopImageDataUrl = await createDesignReadyFromImportedImage(view.dataUrl, products, view.viewType);
          results.push({
            viewType: view.viewType,
            displayOrder: view.displayOrder,
            sourceDataUrl: view.dataUrl,
            shopImageDataUrl,
            products
          });
        } catch {
          failures.push(`${view.label} view failed`);
        }
      }

      if (results.length === 0) {
        throw new Error(failures.join(". ") || "Front and Back views failed.");
      }

      const savedCount = await saveMultiViewProductGroup(groupId, results);
      setMultiViewMessage(`${savedCount} product views created: ${results.map((result) => result.viewType === "front" ? "Front" : "Back").join(" and ")}.`);
      setShopImage(results[0]?.shopImageDataUrl ?? null);
      setProductView("front");
      setDetectedProducts(results[0]?.products ?? []);
      setAssetSaveMessage("Front and Back views are saved as one linked product group in My Apparel.");
      setRetouchError(failures.length > 0 ? failures.join(". ") : null);
      window.setTimeout(() => {
        extractionResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (error) {
      setMultiViewMessage(null);
      setCutoutError(error instanceof Error ? error.message : "Multi-view apparel could not be created.");
    } finally {
      setIsProcessingMultiView(false);
    }
  }

  const handleCreateCutoutPreview = () => {
    if (!imageDataUrl) return;
    if (splitFrontBackMode) {
      void handleCreateMultiViewAssets();
      return;
    }
    const cutoutCanvas = hasSelectionRef.current ? getBaseCanvas() : getCutoutCanvas();
    const selectedProductText = detectedProducts
      .filter((product) => product.selected)
      .map(productPromptText)
      .join(", ");
    const productText = selectedProductText || "the selected product pieces";

    try {
      const ctx = cutoutCanvas.getContext("2d");
      if (!ctx) throw new Error("Das Cutout konnte nicht vorbereitet werden.");

      const source = ctx.getImageData(0, 0, cutoutCanvas.width, cutoutCanvas.height);
      let minX = cutoutCanvas.width;
      let minY = cutoutCanvas.height;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < source.height; y += 1) {
        for (let x = 0; x < source.width; x += 1) {
          const alpha = source.data[(y * source.width + x) * 4 + 3];
          if (alpha > 12) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      if (maxX <= minX || maxY <= minY) {
        throw new Error("Ich finde kein freigestelltes Produkt. Bitte erst das Produkt sichtbar stehen lassen.");
      }

      const padding = 24;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(cutoutCanvas.width, maxX + padding);
      maxY = Math.min(cutoutCanvas.height, maxY + padding);

      const cropWidth = maxX - minX;
      const cropHeight = maxY - minY;
      const output = document.createElement("canvas");
      output.width = cropWidth;
      output.height = cropHeight;
      const outputCtx = output.getContext("2d");
      if (!outputCtx) throw new Error("Das Cutout konnte nicht erstellt werden.");

      outputCtx.drawImage(cutoutCanvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      const cutoutDataUrl = canvasToLimitedPngDataUrl(output);
      const prompt = buildPrompt(productText);
      const maskDataUrl = getMaskCanvas().toDataURL("image/png");
      const storedSourceDataUrl = getBaseCanvas().toDataURL("image/jpeg", 0.86);
      const historyItem: CutoutHistoryItem = {
        id: `${Date.now()}`,
        createdAt: new Date().toISOString(),
        imageDataUrl: storedSourceDataUrl,
        maskDataUrl,
        cutoutDataUrl,
        prompt
      };
      const nextHistory = [historyItem, ...cutoutHistory.filter((item) => item.cutoutDataUrl !== cutoutDataUrl)].slice(0, MAX_HISTORY_ITEMS);
      persistHistory(nextHistory);
      setCutoutPreview(cutoutDataUrl);
      setActiveHistoryId(historyItem.id);
      setAiPrompt(prompt);
      setCutoutHistory(nextHistory);
      setCutoutError(null);
      setRetouchError(null);
      void saveGalleryImage("cutout", cutoutDataUrl);
      window.setTimeout(() => {
        extractionResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      void handleDetectProducts(true);
    } catch (error) {
      setCutoutError(error instanceof Error ? error.message : "Das Cutout konnte nicht erstellt werden.");
    }
  };

  const handleDetectProducts = async (force = false) => {
    if ((!cutoutPreview && !force) || isDetectingProducts) return;
    const cutoutCanvas = hasSelectionRef.current ? getFocusReferenceCanvas() : getCutoutCanvas();

    setIsDetectingProducts(true);
    setRetouchError(null);

    try {
      const blob = await new Promise<Blob | null>((resolve) => cutoutCanvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Das Bild konnte nicht analysiert werden.");

      const formData = new FormData();
      formData.append("image", blob, `shopcut-${viewName.toLowerCase()}-selection.png`);

      const response = await fetch("/api/detect-products", {
        method: "POST",
        body: formData,
        headers: clientAccountId ? { "x-shopcut-account-id": clientAccountId } : undefined
      });

      const payload = await readJsonResponse<{
        products?: Array<string | { label?: string; color?: string; material?: string; shape?: string; details?: string; description?: string; bbox?: number[] }>;
        viewType?: ProductView | null;
        credits?: CreditStatus;
      }>(response);
      if (payload.credits) setCreditStatus(payload.credits);
      if (!response.ok || !payload.products) {
        throw new Error(payload.error ?? "Produkte konnten nicht erkannt werden.");
      }

      const products = payload.products.map((product, index) => {
        const label = typeof product === "string" ? product : product.label ?? "";
        const normalizedLabel = label.trim().toLowerCase();
        const color = typeof product === "string" ? "" : product.color?.trim().toLowerCase() ?? "";
        const material = typeof product === "string" ? "" : product.material?.trim().toLowerCase() ?? "";
        const shape = typeof product === "string" ? "" : product.shape?.trim().toLowerCase() ?? "";
        const details = typeof product === "string" ? "" : product.details?.trim().toLowerCase() ?? "";
        const description = typeof product === "string" ? "" : product.description?.trim().toLowerCase() ?? "";
        const bbox = typeof product === "string" || !Array.isArray(product.bbox)
          ? undefined
          : product.bbox.map((value) => Number(value)).filter((value) => Number.isFinite(value)).slice(0, 4);

        return {
          id: `${index}-${normalizedLabel.replace(/[^a-z0-9]+/g, "-")}`,
          label: normalizedLabel,
          color,
          material,
          shape,
          details,
          description,
          bbox: bbox?.length === 4 ? bbox : undefined,
          selected: true
        };
      }).filter((product) => product.label);
      setDetectedProducts(products);
      setAiRetouchProvider(isLikelyLingerieProducts(products) ? "fashn" : "openai");
      setIsShopPromptEdited(false);
      setIsDetectedProductsOpen(false);
      try {
        window.localStorage.setItem(DETECTED_PRODUCTS_STORAGE_KEY, JSON.stringify(products));
      } catch {
        window.localStorage.removeItem(DETECTED_PRODUCTS_STORAGE_KEY);
      }
      if (payload.viewType === "front" || payload.viewType === "side" || payload.viewType === "back") {
        setProductView(payload.viewType);
      }
    } catch (error) {
      setRetouchError(error instanceof Error ? error.message : "Produkte konnten nicht erkannt werden.");
    } finally {
      setIsDetectingProducts(false);
    }
  };

  const toggleDetectedProduct = (id: string) => {
    setDetectedProducts((products) => {
      const nextProducts = products.map((product) =>
        product.id === id ? { ...product, selected: !product.selected } : product
      );
      return nextProducts;
    });
  };

  const updateDetectedProduct = (id: string, field: keyof Pick<DetectedProduct, "label" | "color" | "material" | "shape" | "details" | "description">, value: string) => {
    setDetectedProducts((products) =>
      products.map((product) => (product.id === id ? { ...product, [field]: value } : product))
    );
  };

  const handleSaveSelectedProductsAsAssets = async () => {
    const assetSourceImage = shopImage;
    if (!assetSourceImage) {
      setRetouchError("Create a Design Ready image first. Fashion Creator assets are saved from the final prepared apparel image.");
      return;
    }

    const selectedProducts = detectedProducts.filter((product) => product.selected);
    if (selectedProducts.length === 0) {
      setRetouchError("Select at least one detected apparel piece before saving it for Fashion Creator.");
      return;
    }

    try {
      const compactAssetImage = await resizeImageDataUrl(assetSourceImage, 520);
      let assetImageUrl = compactAssetImage;
      let assetImageId = `local-${Date.now()}`;

      if (clientAccountId) {
        const response = await fetch("/api/gallery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-shopcut-account-id": clientAccountId
          },
          body: JSON.stringify({ type: "shop-image", image: compactAssetImage })
        });
        const payload = await readJsonResponse<GalleryUploadResponse>(response);
        if (!response.ok || !payload.image?.url) {
          throw new Error(payload.error ?? "Apparel asset image could not be saved to Supabase.");
        }
        assetImageUrl = payload.image.url;
        assetImageId = payload.image.id;
      }

      const productAssetsStorageKey = getProductAssetsStorageKey();
      const storedAssets = window.localStorage.getItem(productAssetsStorageKey);
      const existingAssets = storedAssets ? JSON.parse(storedAssets) as StoredProductAsset[] : [];
      const validExistingAssets = Array.isArray(existingAssets)
        ? existingAssets.filter((asset) => asset?.id && asset?.imageDataUrl && !asset.imageDataUrl.startsWith("data:image/"))
        : [];
      const selectedProductsForAssets = selectedProducts;
      const createdAt = new Date().toISOString();
      const productGroupId = `apparel-group-${Date.now()}-${crypto.randomUUID()}`;
      const productGroupTitle =
        selectedProductsForAssets
          .map((product) => shortProductPieceText(product) || product.label)
          .filter(Boolean)
          .slice(0, 3)
          .join(", ") || "Design Ready apparel";
      const newAssets = selectedProductsForAssets.map((product, index) => {
        const name = shortProductPieceText(product) || product.label || "apparel asset";
        return {
          id: `${assetImageId}-${product.id}`,
          name,
          bodyZone: inferProductAssetBodyZone(name),
          imageDataUrl: assetImageUrl,
          description: productPromptText(product),
          color: product.color,
          createdAt,
          productGroupId,
          productGroupTitle,
          displayOrder: index + 1,
          sourceImageId: assetImageId,
          retouchedImageUrl: assetImageUrl
        } satisfies StoredProductAsset;
      });

      const nextAssets = [...newAssets, ...validExistingAssets].slice(0, 24);
      try {
        window.localStorage.setItem(productAssetsStorageKey, JSON.stringify(nextAssets));
      } catch {
        window.localStorage.removeItem(productAssetsStorageKey);
        Object.keys(window.localStorage)
          .filter((key) => key.startsWith(HISTORY_STORAGE_PREFIX))
          .forEach((key) => window.localStorage.removeItem(key));
        window.localStorage.setItem(productAssetsStorageKey, JSON.stringify(newAssets));
      }
      window.dispatchEvent(new Event("shopcut-gallery-updated"));
      setAssetSaveMessage(`${newAssets.length} Fashion Creator asset${newAssets.length === 1 ? "" : "s"} saved under this Design Ready image. You can now build a look in Fashion Creator.`);
      setRetouchError(null);
    } catch {
      setAssetSaveMessage(null);
      setRetouchError("Apparel assets could not be saved. Browser storage may be full.");
    }
  };

  const handleDownloadGenerated = () => {
    if (!cutoutPreview) return;
    const link = document.createElement("a");
    link.download = `shopcut-${viewName.toLowerCase()}-cutout.png`;
    const base64 = cutoutPreview.split(",")[1];
    const byteCharacters = window.atob(base64);
    const byteNumbers = Array.from(byteCharacters, (character) => character.charCodeAt(0));
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: "image/png" });
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const handleOpenCutout = () => {
    if (!cutoutPreview) return;
    const imageWindow = window.open();
    if (!imageWindow) {
      setCutoutError("Das PNG konnte nicht in einem neuen Tab geöffnet werden.");
      return;
    }

    imageWindow.document.write(`
      <html>
        <head>
          <title>LuxuryBandit cutout PNG</title>
          <style>
            body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f1ea; }
            img { max-width: 95vw; max-height: 95vh; object-fit: contain; background-image:
              linear-gradient(45deg, #ddd 25%, transparent 25%),
              linear-gradient(-45deg, #ddd 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #ddd 75%),
              linear-gradient(-45deg, transparent 75%, #ddd 75%);
              background-position: 0 0, 0 12px, 12px -12px, -12px 0;
              background-size: 24px 24px;
            }
          </style>
        </head>
        <body><img alt="LuxuryBandit cutout PNG" src="${cutoutPreview}" /></body>
      </html>
    `);
    imageWindow.document.close();
  };

  const handleCropShopImage = async () => {
    if (!shopImage) return;
    setRetouchError(null);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error("Design Ready apparel image could not be loaded."));
        nextImage.src = shopImage;
      });

      const source = document.createElement("canvas");
      source.width = image.naturalWidth || image.width;
      source.height = image.naturalHeight || image.height;
      const sourceCtx = source.getContext("2d");
      if (!sourceCtx) throw new Error("Crop tool could not prepare the image.");
      sourceCtx.drawImage(image, 0, 0);

      const { width, height } = source;
      const pixels = sourceCtx.getImageData(0, 0, width, height);
      const sample = (x: number, y: number) => {
        const index = (Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))) * 4;
        return [pixels.data[index], pixels.data[index + 1], pixels.data[index + 2]];
      };
      const colorDistance = (a: number[], b: number[]) =>
        Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
      const luminanceOf = (color: number[]) => color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114;
      const sampleRowBackground = (y: number) => {
        const left = sample(Math.round(width * 0.035), y);
        const right = sample(Math.round(width * 0.965), y);
        return [
          Math.round((left[0] + right[0]) / 2),
          Math.round((left[1] + right[1]) / 2),
          Math.round((left[2] + right[2]) / 2)
        ];
      };

      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          const index = (y * width + x) * 4;
          const alpha = pixels.data[index + 3];
          if (alpha < 20) continue;

          const color = [pixels.data[index], pixels.data[index + 1], pixels.data[index + 2]];
          const rowBackground = sampleRowBackground(y);
          const luminance = luminanceOf(color);
          const backgroundLuminance = luminanceOf(rowBackground);
          const saturation = Math.max(color[0], color[1], color[2]) - Math.min(color[0], color[1], color[2]);
          const differsFromBackground = colorDistance(color, rowBackground) > 58;
          const muchDarkerThanBackground = backgroundLuminance - luminance > 58;
          const likelyProductPixel = differsFromBackground && (muchDarkerThanBackground || saturation > 24 || luminance < 95);

          if (likelyProductPixel) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      if (maxX <= minX || maxY <= minY) {
        throw new Error("Crop tool could not find the apparel edges. Try a clearer prepared result first.");
      }

      const productWidth = maxX - minX;
      const productHeight = maxY - minY;
      const padding = Math.round(Math.max(productWidth, productHeight) * 0.18);
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(width, maxX + padding);
      maxY = Math.min(height, maxY + padding);

      const cropWidth = maxX - minX;
      const cropHeight = maxY - minY;
      const squareSize = Math.min(width, height, Math.max(cropWidth, cropHeight));
      const centerX = minX + cropWidth / 2;
      const centerY = minY + cropHeight / 2;
      const sourceX = Math.max(0, Math.min(width - squareSize, Math.round(centerX - squareSize / 2)));
      const sourceY = Math.max(0, Math.min(height - squareSize, Math.round(centerY - squareSize / 2)));

      const output = document.createElement("canvas");
      output.width = MAX_GENERATED_OUTPUT_EDGE;
      output.height = MAX_GENERATED_OUTPUT_EDGE;
      const outputCtx = output.getContext("2d");
      if (!outputCtx) throw new Error("Crop tool could not create the cropped image.");
      outputCtx.imageSmoothingEnabled = true;
      outputCtx.imageSmoothingQuality = "high";
      outputCtx.drawImage(source, sourceX, sourceY, squareSize, squareSize, 0, 0, output.width, output.height);

      const croppedImage = output.toDataURL("image/png");
      setShopImage(croppedImage);
      void saveGalleryImage("shop-image", croppedImage);
    } catch (error) {
      setRetouchError(error instanceof Error ? error.message : "Crop tool could not fit the apparel.");
    }
  };

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

  const loadSourceGallery = async () => {
    if (!clientAccountId) return;
    setIsLoadingSourceGallery(true);
    setCutoutError(null);

    try {
      const response = await fetch("/api/gallery", {
        headers: {
          "x-shopcut-account-id": clientAccountId
        }
      });
      const payload = await readJsonResponse<{ images?: GalleryImageItem[] }>(response);
      if (!response.ok || !payload.images) throw new Error(payload.error ?? "Gallery could not be loaded.");
      setSourceGalleryImages(payload.images);
      setIsSourceGalleryOpen(true);
    } catch (error) {
      setCutoutError(error instanceof Error ? error.message : "Gallery could not be loaded.");
    } finally {
      setIsLoadingSourceGallery(false);
    }
  };

  const handleSelectSourceGalleryImage = async (item: GalleryImageItem) => {
    setIsLoadingSourceGallery(true);
    setCutoutError(null);
    setRetouchError(null);

    try {
      const dataUrl = await urlToDataUrl(item.url);
      applySourceImage(dataUrl);
      setIsSourceGalleryOpen(false);
    } catch (error) {
      setCutoutError(error instanceof Error ? error.message : "Gallery image could not be loaded.");
    } finally {
      setIsLoadingSourceGallery(false);
    }
  };

  const uploadGalleryImageAndReturnUrl = async (type: "upload" | "cutout" | "shop-image" | "model-image", image: string) => {
    if (!clientAccountId) return null;
    const response = await fetch("/api/gallery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shopcut-account-id": clientAccountId
      },
      body: JSON.stringify({ type, image })
    });
    const payload = await readJsonResponse<GalleryUploadResponse>(response);
    if (!response.ok || !payload.image?.url) throw new Error(payload.error ?? "Image could not be saved to gallery.");
    window.dispatchEvent(new Event("shopcut-gallery-updated"));
    return payload.image;
  };

  const detectProductsFromDataUrl = async (dataUrl: string) => {
    const formData = new FormData();
    formData.append("image", dataUrlToBlob(dataUrl), "luxurybandit-imported-source.png");
    const response = await fetch("/api/detect-products", {
      method: "POST",
      body: formData,
      headers: clientAccountId ? { "x-shopcut-account-id": clientAccountId } : undefined
    });
    const payload = await readJsonResponse<{
      products?: Array<string | { label?: string; color?: string; material?: string; shape?: string; details?: string; description?: string; bbox?: number[] }>;
      viewType?: ProductView | null;
      credits?: CreditStatus;
    }>(response);
    if (payload.credits) setCreditStatus(payload.credits);
    if (!response.ok || !payload.products) throw new Error(payload.error ?? "Apparel could not be detected.");

    const products = payload.products.map((product, index) => {
      const label = typeof product === "string" ? product : product.label ?? "";
      const normalizedLabel = label.trim().toLowerCase();
      const color = typeof product === "string" ? "" : product.color?.trim().toLowerCase() ?? "";
      const material = typeof product === "string" ? "" : product.material?.trim().toLowerCase() ?? "";
      const shape = typeof product === "string" ? "" : product.shape?.trim().toLowerCase() ?? "";
      const details = typeof product === "string" ? "" : product.details?.trim().toLowerCase() ?? "";
      const description = typeof product === "string" ? "" : product.description?.trim().toLowerCase() ?? "";
      const bbox = typeof product === "string" || !Array.isArray(product.bbox)
        ? undefined
        : product.bbox.map((value) => Number(value)).filter((value) => Number.isFinite(value)).slice(0, 4);

      return {
        id: `${index}-${normalizedLabel.replace(/[^a-z0-9]+/g, "-")}`,
        label: normalizedLabel,
        color,
        material,
        shape,
        details,
        description,
        bbox: bbox?.length === 4 ? bbox : undefined,
        selected: true
      };
    }).filter((product) => product.label);

    return { products, viewType: payload.viewType ?? null };
  };

  const buildBatchImportPrompt = (products: DetectedProduct[], viewType: ProductView | null) => {
    const productText = products.map(shortProductPieceText).filter(Boolean).join(", ") || "visible apparel";
    const selectedBackground = backgroundOptions.find((option) => option.value === background)?.prompt ?? backgroundOptions[0].prompt;
    const viewInstruction = viewType
      ? `${viewType} view. Preserve this exact visible product viewpoint.`
      : sameViewPromptText;

    return [
      "Create a clean ecommerce apparel image from this source photo.",
      "Use the image as the main source of truth.",
      "Extract the visible selected apparel only.",
      "Remove person, body, skin, hair, background, scene, shadows, and props unless they are part of the apparel.",
      `Selected apparel pieces: ${productText}.`,
      `View: ${viewInstruction}`,
      `Background: ${selectedBackground}. Square 1:1 ecommerce image.`,
      "Preserve exact garment design, colors, prints, logos, seams, straps, hardware, fabric types, shape, and proportions.",
      "Do not invent new apparel pieces. Do not add accessories that are not visible in the source.",
      "Center the complete apparel with comfortable margins."
    ].join("\n");
  };

  const createDesignReadyFromImportedImage = async (dataUrl: string, products: DetectedProduct[], viewType: ProductView | null) => {
    const prompt = buildBatchImportPrompt(products, viewType);
    const useFashnRetouch = isLikelyLingerieProducts(products);
    const formData = new FormData();
    formData.append("image", dataUrlToBlob(dataUrl), "luxurybandit-imported-apparel.png");
    formData.append("prompt", prompt);
    formData.append("mode", useFashnRetouch ? "retouch-cutout" : "preserve");
    formData.append("background", background);
    formData.append("square", "true");
    formData.append("width", "1024");
    formData.append("height", "1024");
    formData.append("productDescription", products.map(shortProductPieceText).filter(Boolean).join(", "));
    formData.append("viewMode", viewType ?? "auto");

    const response = await fetch(useFashnRetouch ? "/api/generate-fashn" : "/api/generate-product", {
      method: "POST",
      body: formData,
      headers: clientAccountId ? { "x-shopcut-account-id": clientAccountId } : undefined
    });
    const payload = await readJsonResponse<{ image?: string; credits?: CreditStatus }>(response);
    if (payload.credits) setCreditStatus(payload.credits);
    if (!response.ok || !payload.image) {
      throw new Error(payload.error ?? `${useFashnRetouch ? "FASHN" : "OpenAI"} could not create the apparel image.`);
    }

    return await resizeImageDataUrl(payload.image);
  };

  const saveImportedProductAssets = async (shopImageDataUrl: string, products: DetectedProduct[], sourceDataUrl?: string) => {
    const compactShopImage = await resizeImageDataUrl(shopImageDataUrl, 420);
    let assetImageUrl = compactShopImage;
    let assetImageId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    try {
      const uploadedImage = await uploadGalleryImageAndReturnUrl("shop-image", compactShopImage);
      if (uploadedImage?.url) {
        assetImageUrl = uploadedImage.url;
        assetImageId = uploadedImage.id;
      }
    } catch {
      // Keep local fallback when Supabase is temporarily unavailable.
    }

    const createdAt = new Date().toISOString();
    const productGroupId = `apparel-group-${Date.now()}-${crypto.randomUUID()}`;
    const productGroupTitle =
      products
        .map((product) => shortProductPieceText(product) || product.label)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ") || "Imported apparel";

    const newAssets = products.map((product, index) => {
      const name = shortProductPieceText(product) || product.label || "apparel asset";
      return {
        id: `${assetImageId}-${product.id}`,
        name,
        bodyZone: inferProductAssetBodyZone(name),
        imageDataUrl: assetImageUrl,
        description: productPromptText(product),
        color: product.color,
        createdAt,
        productGroupId,
        productGroupTitle,
        displayOrder: index + 1,
        sourceImageId: assetImageId,
        retouchedImageUrl: assetImageUrl
      } satisfies StoredProductAsset;
    });

    const productAssetsStorageKey = getProductAssetsStorageKey();
    const storedAssets = window.localStorage.getItem(productAssetsStorageKey);
    const existingAssets = storedAssets ? JSON.parse(storedAssets) as StoredProductAsset[] : [];
    const validExistingAssets = Array.isArray(existingAssets)
      ? existingAssets.filter((asset) => asset?.id && asset?.imageDataUrl)
      : [];
    const nextAssets = [...newAssets, ...validExistingAssets].slice(0, 80);
    window.localStorage.setItem(productAssetsStorageKey, JSON.stringify(nextAssets));
    window.dispatchEvent(new Event("shopcut-gallery-updated"));
    return newAssets.length;
  };

  const handleImportWebsiteImages = async () => {
    setIsImportingWebsiteImages(true);
    setBatchProgress("");
    setCutoutError(null);
    setRetouchError(null);

    try {
      const response = await fetch("/api/import-page-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: websiteImportUrl })
      });
      const payload = await readJsonResponse<{ images?: ImportedPageImage[] }>(response);
      if (!response.ok || !payload.images) throw new Error(payload.error ?? "Website images could not be imported.");
      setImportedPageImages(payload.images);
      setBatchProgress(`${payload.images.length} images found. Ready to process all.`);
    } catch (error) {
      setCutoutError(error instanceof Error ? error.message : "Website images could not be imported.");
    } finally {
      setIsImportingWebsiteImages(false);
    }
  };

  const handleBatchProcessImportedImages = async () => {
    if (importedPageImages.length === 0 || isBatchProcessing) return;
    setIsBatchProcessing(true);
    setCutoutError(null);
    setRetouchError(null);
    setAssetSaveMessage(null);

    let savedAssetCount = 0;
    try {
      for (const [index, image] of importedPageImages.entries()) {
        setBatchProgress(`Processing image ${index + 1}/${importedPageImages.length}: saving source...`);
        await saveGalleryImage("upload", image.dataUrl);

        setBatchProgress(`Processing image ${index + 1}/${importedPageImages.length}: detecting apparel...`);
        const detected = await detectProductsFromDataUrl(image.dataUrl);
        if (detected.products.length === 0) continue;

        setBatchProgress(`Processing image ${index + 1}/${importedPageImages.length}: creating Design Ready apparel...`);
        const designReadyImage = await createDesignReadyFromImportedImage(image.dataUrl, detected.products, detected.viewType);

        setBatchProgress(`Processing image ${index + 1}/${importedPageImages.length}: saving apparel assets...`);
        savedAssetCount += await saveImportedProductAssets(designReadyImage, detected.products, image.dataUrl);
      }

      setBatchProgress(`Done. ${savedAssetCount} Apparel asset${savedAssetCount === 1 ? "" : "s"} saved in My Apparel.`);
      setImportedPageImages([]);
      window.dispatchEvent(new Event("shopcut-gallery-updated"));
    } catch (error) {
      setRetouchError(error instanceof Error ? error.message : "Batch import could not be completed.");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const canvasToPngBlob = (canvas: HTMLCanvasElement) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Das Referenzbild konnte nicht erstellt werden."));
      }, "image/png");
    });

  const buildShopImagePrompt = useCallback(
    (enforceProductSelection = false) => {
      const selectedBackground = backgroundOptions.find((option) => option.value === background)?.prompt ?? backgroundOptions[0].prompt;
      const selectedProductView = productViewOptions.find((option) => option.value === productView)?.label;
      const selectedProductText = detectedProducts
        .filter((product) => product.selected)
        .map(shortProductPieceText)
        .join(", ");

      if (enforceProductSelection && detectedProducts.length > 0 && !selectedProductText) {
        throw new Error("Please select at least one apparel piece before creating the shop image.");
      }

      if (aiRetouchMode === "rebuild") {
        return [
          "Rebuild this product cutout into a clean square ecommerce product image.",
          "",
          "Experimental mode: stronger AI reconstruction is allowed, but keep the selected product pieces, color placement, view, and main silhouette close to the cutout.",
          "",
          `Selected product pieces: ${selectedProductText || "selected product cutout"}.`,
          `View: ${selectedProductView || "not selected"}.`,
          `Background: ${selectedBackground}.`,
          "Square 1:1 ecommerce image.",
          "",
          "Do not add unrelated garment pieces, bows, ribbons, trims, decorations, or new design features unless clearly visible in the cutout.",
          "Remove remaining person, skin, body, hair, and background traces.",
          "",
          `Critical rule: ${criticalProductNote.trim() || "Preserve the selected product as closely as possible."}`
        ].join("\n");
      }

      // Do not modify this prompt without testing. This is the working Preserve Cutout retouch mode.
      return [
        "Retouch this transparent product cutout.",
        "",
        "Keep the product almost exactly as shown.",
        "Do not redesign.",
        "Do not create a new product.",
        "Do not improve the design.",
        "Do not invent missing parts.",
        "",
        "Remove only background, skin, body, hair, and cutout artifacts.",
        "Smooth only small damaged edges.",
        "",
        "Keep the exact shape, color placement, lace, mesh, straps, hardware, and silhouette.",
        "",
        "If there is a black panty or black opaque fabric, keep it black and opaque.",
        "Do not make it transparent.",
        "Do not add lace texture to solid black fabric.",
        "",
        `Place the same cleaned cutout centered on a ${selectedBackground} square background.`,
        "",
        `Selected product pieces: ${selectedProductText || "selected product cutout"}.`,
        `View: ${selectedProductView || "not selected"}.`,
        `Critical rule: ${criticalProductNote.trim() || "Only retouch what is visible in the cutout. Do not invent product details."}`,
        "",
        "Mode: Retouch existing cutout. Conservative image editing only."
      ].filter(Boolean).join("\n");
    },
    [aiRetouchMode, background, criticalProductNote, detectedProducts, productView]
  );

  const generatedShopPrompt = useMemo(() => buildShopImagePrompt(false), [buildShopImagePrompt]);

  useEffect(() => {
    if (!isShopPromptEdited) setCustomShopPrompt(generatedShopPrompt);
  }, [generatedShopPrompt, isShopPromptEdited]);

  useEffect(() => {
    if (!isGenerating) return;
    setGenerationSeconds(0);
    const interval = window.setInterval(() => {
      setGenerationSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isGenerating]);

  const handleGenerateShopImage = async () => {
    if (!cutoutPreview || !aiPrompt.trim() || isGenerating) return;
    if (!productView) {
      setRetouchError("Please select Front, Side, or Back before creating the shop image.");
      return;
    }

    setIsGenerating(true);
    setGenerationSeconds(0);
    setRetouchError(null);

    try {
      const generatedPromptForValidation = buildShopImagePrompt(true);
      const shopPrompt = (isShopPromptEdited ? customShopPrompt : generatedPromptForValidation).trim();
      if (!shopPrompt) throw new Error("Prompt is empty. Please create or write a prompt before generating.");
      const useFashnRetouch = aiRetouchProvider === "fashn" && aiRetouchMode === "preserve";

      const formData = new FormData();
      formData.append("image", await canvasToPngBlob(getAiReferenceCanvas()), `shopcut-${viewName.toLowerCase()}-ai-reference.png`);
      formData.append("prompt", shopPrompt);
      formData.append("mode", useFashnRetouch ? "retouch-cutout" : aiRetouchMode);
      formData.append("background", background);
      formData.append("square", "true");
      formData.append("width", "1024");
      formData.append("height", "1024");

      const response = await fetch(useFashnRetouch ? "/api/generate-fashn" : "/api/generate-product", {
        method: "POST",
        body: formData,
        headers: clientAccountId ? { "x-shopcut-account-id": clientAccountId } : undefined
      });

      const payload = await readJsonResponse<{ image?: string; credits?: CreditStatus }>(response);
      if (payload.credits) setCreditStatus(payload.credits);
      if (!response.ok || !payload.image) {
        throw new Error(payload.error ?? `${useFashnRetouch ? "FASHN" : "OpenAI"} konnte das Shop-Bild nicht erstellen.`);
      }

      const resizedShopImage = await resizeImageDataUrl(payload.image);
      setShopImage(resizedShopImage);
      void saveGalleryImage("shop-image", resizedShopImage);
    } catch (error) {
      setRetouchError(error instanceof Error ? error.message : "Das Shop-Bild konnte nicht erstellt werden.");
    } finally {
      setIsGenerating(false);
    }
  };

  const activeRetouchProviderLabel = aiRetouchProvider === "fashn" && aiRetouchMode === "preserve" ? "FASHN" : "OpenAI";

  return (
    <div className="grid gap-4">
      <div ref={stepOneRef} className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
        <div>
          <div className="text-3xl font-black uppercase tracking-normal text-cobalt md:text-4xl">Step 1/1</div>
          <h2 className="mt-1 text-xl font-black text-ink">Upload and create apparel PNG</h2>
          <p className="mt-1 text-sm text-ink/60">Upload a real source photo, mark important details if needed, then click Detect apparel.</p>
          <p className="mt-2 rounded-md border border-cobalt/20 bg-cobalt/10 p-3 text-sm font-bold leading-6 text-ink">
            Use the Focus brush for logos, earrings, prints, hardware, or tiny details AI must preserve. The blue mark is only an instruction, not an apparel color.
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-md border border-black/10 bg-panel p-3">
            <input
              type="checkbox"
              checked={splitFrontBackMode}
              onChange={(event) => setSplitFrontBackMode(event.target.checked)}
              className="mt-1 h-5 w-5 accent-cobalt"
            />
            <span>
              <span className="block text-sm font-black text-ink">Split into Front + Back views</span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-ink/55">
                MVP mode: left half becomes Front, right half becomes Back. Both views are saved as one linked apparel product.
              </span>
            </span>
          </label>
        </div>
        <div className="grid gap-3 rounded-md border border-black/10 bg-panel p-3">
          <div>
            <div className="text-sm font-black text-ink">Import apparel from a website</div>
            <p className="mt-1 text-xs font-bold leading-5 text-ink/55">
              Paste a product page or gallery URL. LuxuryBandit finds up to 10 images and can automatically turn all of them into My Apparel assets.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              type="url"
              value={websiteImportUrl}
              onChange={(event) => setWebsiteImportUrl(event.target.value)}
              placeholder="https://example.com/product-page"
              className="h-11 rounded-md border border-black/10 bg-white px-3 text-sm font-bold text-ink outline-none focus:border-cobalt"
            />
            <button
              type="button"
              onClick={() => void handleImportWebsiteImages()}
              disabled={isImportingWebsiteImages || isBatchProcessing || !websiteImportUrl.trim()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-black text-ink disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isImportingWebsiteImages ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ImagePlus aria-hidden="true" className="h-4 w-4" />}
              Find images
            </button>
            <button
              type="button"
              onClick={() => void handleBatchProcessImportedImages()}
              disabled={isBatchProcessing || importedPageImages.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cobalt px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isBatchProcessing ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden="true" className="h-4 w-4" />}
              Process all images
            </button>
          </div>
          {batchProgress && (
            <p className="rounded-md border border-cobalt/20 bg-white p-3 text-sm font-black leading-6 text-cobalt">
              {batchProgress}
            </p>
          )}
          {importedPageImages.length > 0 && (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {importedPageImages.map((image, index) => (
                <button
                  key={`${image.sourceUrl}-${index}`}
                  type="button"
                  onClick={() => applySourceImage(image.dataUrl)}
                  className="overflow-hidden rounded-md border border-black/10 bg-white p-1 text-left focus:outline-none focus:ring-2 focus:ring-cobalt"
                  title="Load this image into the editor"
                >
                  <img src={image.dataUrl} alt={`Imported website image ${index + 1}`} className="aspect-square w-full rounded object-cover" />
                  <span className="mt-1 block truncate px-1 text-[11px] font-black text-ink/55">Image {index + 1}</span>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs font-bold leading-5 text-ink/45">
            Batch processing starts multiple AI jobs. Use it for speed; use the Focus brush only when a logo, jewelry, or tiny detail must be preserved more precisely.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <input ref={fileInputRef} className="hidden" type="file" accept="image/*" onChange={handleUpload} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-cobalt px-3 text-sm font-bold text-white hover:bg-cobalt/90"
            title="Upload image"
          >
            <ImagePlus aria-hidden="true" className="h-4 w-4" />
            Upload
          </button>
          <button
            type="button"
            onClick={() => void loadSourceGallery()}
            disabled={isLoadingSourceGallery}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-45"
            title="Choose image from gallery"
          >
            {isLoadingSourceGallery ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ImagePlus aria-hidden="true" className="h-4 w-4" />}
            Gallery
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className="grid h-10 w-10 place-items-center rounded-md border border-black/10 bg-panel text-ink disabled:cursor-not-allowed disabled:opacity-35"
            title="Undo"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className="grid h-10 w-10 place-items-center rounded-md border border-black/10 bg-panel text-ink disabled:cursor-not-allowed disabled:opacity-35"
            title="Redo"
          >
            <RotateCw aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.1).toFixed(1))))}
            className="grid h-10 w-10 place-items-center rounded-md border border-black/10 bg-panel text-ink"
            title="Zoom out"
          >
            <ZoomOut aria-hidden="true" className="h-4 w-4" />
          </button>
          <span className="min-w-14 text-center text-sm font-bold text-ink">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((value) => Math.min(2.5, Number((value + 0.1).toFixed(1))))}
            className="grid h-10 w-10 place-items-center rounded-md border border-black/10 bg-panel text-ink"
            title="Zoom in"
          >
            <ZoomIn aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!imageDataUrl}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-35"
            title="Export transparent PNG"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <div className="grid gap-3 rounded-md border border-black/10 bg-panel p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-ink">
                  <Brush aria-hidden="true" className="h-4 w-4 text-cobalt" />
                  Focus brush
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-ink/60">
                  Always available. Paint over logos, earrings, prints, hardware, or small details that AI should recognize and preserve more precisely.
                </p>
              </div>
              <div className="inline-flex h-9 items-center justify-center rounded-md bg-ink px-3 text-xs font-black text-white">
                Focus marking on
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 rounded-md border border-black/10 bg-panel p-2 sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setToolMode("keep")}
              className={`grid h-11 w-11 place-items-center rounded-md border ${
                toolMode === "keep" ? "border-ink bg-ink text-white" : "border-black/10 bg-panel text-ink"
              }`}
              title="Keep marker"
            >
              <Highlighter aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setToolMode("erase")}
              className={`grid h-11 w-11 place-items-center rounded-md border ${
                toolMode === "erase" ? "border-ink bg-ink text-white" : "border-black/10 bg-panel text-ink"
              }`}
              title="Erase"
            >
              <Eraser aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setShowSelectionOverlay((value) => !value)}
              className={`grid h-11 w-11 place-items-center rounded-md border ${
                showSelectionOverlay ? "border-black/10 bg-panel text-ink" : "border-ink bg-ink text-white"
              }`}
              title={showSelectionOverlay ? "Hide selection" : "Show selection"}
            >
              {showSelectionOverlay ? <Eye aria-hidden="true" className="h-5 w-5" /> : <EyeOff aria-hidden="true" className="h-5 w-5" />}
            </button>
            <div className="h-px w-11 bg-black/10 sm:h-px" />
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className="grid h-11 w-11 place-items-center rounded-md border border-black/10 bg-panel text-ink disabled:cursor-not-allowed disabled:opacity-35"
              title="Undo"
            >
              <RotateCcw aria-hidden="true" className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className="grid h-11 w-11 place-items-center rounded-md border border-black/10 bg-panel text-ink disabled:cursor-not-allowed disabled:opacity-35"
              title="Redo"
            >
              <RotateCw aria-hidden="true" className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 rounded-md border border-black/10 bg-panel p-2 sm:w-11 sm:flex-col" title="Marker size">
              <span
                className="rounded-full bg-cobalt/35 ring-2 ring-cobalt"
                style={{
                  width: Math.max(10, Math.min(26, brushSize / 3)),
                  height: Math.max(10, Math.min(26, brushSize / 3))
                }}
              />
              <input
                aria-label="Marker size"
                type="range"
                min="8"
                max="120"
                value={brushSize}
                onChange={(event) => setBrushSize(Number(event.target.value))}
                className="w-24 accent-cobalt sm:h-28 sm:w-6 sm:[writing-mode:vertical-rl]"
              />
            </div>
            <div className="flex items-center gap-2 rounded-md border border-black/10 bg-panel p-2 sm:w-11 sm:flex-col" title={`Marker opacity: ${markerOpacity}%`}>
              <span className="grid h-6 w-6 place-items-center rounded-md bg-cobalt text-[10px] font-black text-white">
                {markerOpacity}
              </span>
              <input
                aria-label="Marker opacity"
                type="range"
                min="15"
                max="100"
                value={markerOpacity}
                onChange={(event) => setMarkerOpacity(Number(event.target.value))}
                className="w-24 accent-cobalt sm:h-28 sm:w-6 sm:[writing-mode:vertical-rl]"
              />
            </div>
          </div>
          <div className="max-h-[86vh] overflow-auto rounded-md border border-black/15 bg-panel p-3">
          <div
            className="relative mx-auto"
            style={{
              width: Math.round((editorSize.width >= editorSize.height ? 820 : Math.round(820 * (editorSize.width / editorSize.height))) * zoom),
              minWidth: Math.round((editorSize.width >= editorSize.height ? 820 : Math.round(820 * (editorSize.width / editorSize.height))) * zoom),
              height: Math.round((editorSize.width >= editorSize.height ? 820 * (editorSize.height / editorSize.width) : 820) * zoom),
              minHeight: Math.round((editorSize.width >= editorSize.height ? 820 * (editorSize.height / editorSize.width) : 820) * zoom)
            }}
          >
          <div
            ref={editorSurfaceRef}
            className="checkerboard relative h-full w-full overflow-hidden rounded-md"
          >
            {!imageDataUrl && (
              <div className="absolute inset-0 z-10 grid place-items-center px-5 text-center">
                <div className="grid max-w-md gap-3 rounded-md bg-white/95 px-5 py-5 shadow-soft">
                  <div className="text-base font-black text-ink">Start with an apparel photo</div>
                  <p className="text-sm font-semibold leading-6 text-ink/60">
                    Upload a real source photo or choose an existing image from your gallery.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cobalt px-4 text-sm font-black text-white"
                    >
                      <ImagePlus aria-hidden="true" className="h-4 w-4" />
                      Upload photo
                    </button>
                    <button
                      type="button"
                      onClick={() => void loadSourceGallery()}
                      disabled={isLoadingSourceGallery}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {isLoadingSourceGallery ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ImagePlus aria-hidden="true" className="h-4 w-4" />}
                      Choose from gallery
                    </button>
                  </div>
                </div>
              </div>
            )}
            {imageDataUrl && (
              <button
                type="button"
                onClick={handleDeleteUpload}
                className="absolute right-3 top-3 z-20 inline-flex h-10 items-center gap-2 rounded-md bg-red-600 px-3 text-sm font-black text-white shadow-soft hover:bg-red-700"
                title="Delete uploaded image"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                Delete
              </button>
            )}
            <div
              className="absolute inset-0"
              style={{
                width: "100%",
                height: "100%"
              }}
            >
              <canvas ref={fabricCanvasElementRef} width={editorSize.width} height={editorSize.height} className="hidden" />
              <canvas ref={previewCanvasRef} width={editorSize.width} height={editorSize.height} className="absolute inset-0 h-full w-full" />
              <canvas
                ref={maskCanvasRef}
                width={editorSize.width}
                height={editorSize.height}
                className={`absolute inset-0 h-full w-full touch-none ${isPrecisionMode ? "cursor-none" : "pointer-events-none"} ${showSelectionOverlay ? "" : "opacity-0"}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerEnter={updateBrushCursor}
                onPointerOut={() => setBrushCursor((cursor) => ({ ...cursor, visible: false }))}
              />
            </div>
            {isPrecisionMode && brushCursor.visible && imageDataUrl && (
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute rounded-full ${
                  toolMode === "keep" ? "border-2 border-cobalt bg-cobalt/20" : "border-2 border-coral bg-white/30"
                }`}
                style={{
                  width: brushCursor.size,
                  height: brushCursor.size,
                  left: brushCursor.x,
                  top: brushCursor.y,
                  transform: "translate(-50%, -50%)"
                }}
              />
            )}
          </div>
          </div>
          </div>
          <button
            type="button"
            onClick={handleCreateCutoutPreview}
            disabled={!imageDataUrl || isDetectingProducts || isProcessingMultiView}
            className="col-span-full mt-3 inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-md bg-coral px-4 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDetectingProducts || isProcessingMultiView ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ListChecks aria-hidden="true" className="h-4 w-4" />}
            {splitFrontBackMode ? "Create Front + Back apparel views" : "Detect apparel"}
          </button>
          {multiViewMessage && (
            <p className="rounded-md border border-cobalt/20 bg-cobalt/10 p-3 text-sm font-black leading-6 text-cobalt">
              {multiViewMessage}
            </p>
          )}
        </div>

      </div>

      {(cutoutPreview || shopImage || multiViewMessage) && (
      <div ref={extractionResultsRef} className="grid gap-4 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
        <div className="grid gap-4">
          {cutoutError && <p className="rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-bold leading-6 text-coral">{cutoutError}</p>}
          <div className="rounded-md border border-black/10 bg-white p-3">
            <div className="text-3xl font-black uppercase tracking-normal text-cobalt md:text-4xl">Step 2/2</div>
            <div className="mt-1 text-sm font-black text-ink">Apparel extraction</div>
            <p className="mt-2 text-sm font-semibold leading-6 text-ink/65">
              This step extracts the visible apparel, removes remaining model/person traces, keeps the apparel structure, applies the selected background, and prepares a square Design Ready image.
            </p>
            <div className="mt-3 grid gap-2 rounded-md border border-cobalt/20 bg-cobalt/10 p-3 text-sm font-bold leading-6 text-ink">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Provider credits</span>
                <span className="rounded-md bg-white px-2 py-1 text-cobalt">
                  Test mode
                </span>
              </div>
              <p className="text-xs font-semibold leading-5 text-ink/60">
                LuxuryBandit does not block this MVP locally. The selected provider can still use your connected API account credits.
              </p>
            </div>
            <div className="mt-3 block text-xs font-bold uppercase tracking-[0.15em] text-ink/55">
              Apparel
            </div>
            <button
              type="button"
              onClick={() => void handleDetectProducts()}
              disabled={!cutoutPreview || isDetectingProducts}
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-cobalt px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              title={cutoutPreview ? "AI apparel detection uses OpenAI API credits" : "Create PNG + prompt first"}
            >
              {isDetectingProducts ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ListChecks aria-hidden="true" className="h-4 w-4" />}
              Detect apparel again
            </button>
            {!cutoutPreview ? (
              <p className="mt-2 rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-bold leading-6 text-coral">
                Missing apparel reference. First upload an image in Step 1 and click Detect apparel.
              </p>
            ) : (
              <p className="mt-2 text-xs font-semibold leading-5 text-ink/55">
                Optional AI step. Apparel detection is currently free in this MVP.
              </p>
            )}
            {detectedProducts.length === 0 ? (
              <p className="mt-3 rounded-md border border-black/10 bg-panel p-3 text-sm font-bold leading-6 text-ink/65">
                Run AI detect apparel first. Apparel view, background, critical note, prompt, and preparation controls appear after the apparel checklist is created.
              </p>
            ) : (
            <>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-black/10 bg-panel p-3">
                <div className="text-sm font-black text-ink">Select Apparel View</div>
                <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">
                  LuxuryBandit tries to select this automatically after apparel detection. You can change it before generating.
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {productViewOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setProductView(option.value)}
                      className={`h-11 rounded-md border px-2 text-sm font-black ${
                        productView === option.value ? "border-ink bg-ink text-white" : "border-black/10 bg-panel text-ink"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {!productView && <p className="mt-2 text-base font-black text-red-600">Required before generating.</p>}
              </div>
              <div className="rounded-md border border-black/10 bg-panel p-3">
                <div className="text-xs font-bold uppercase tracking-[0.15em] text-ink/55">Select Background</div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {backgroundOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBackground(option.value)}
                      className={`grid gap-2 text-center text-xs font-black text-ink ${
                        background === option.value ? "" : "text-ink/55"
                      }`}
                      title={option.label}
                    >
                      <span
                        className={`grid h-14 w-full place-items-center rounded-md border-2 ${
                          background === option.value ? "border-coral ring-2 ring-coral/30" : "border-black/15"
                        }`}
                        style={{ background: option.swatch }}
                      >
                        {background === option.value && (
                          <Check aria-hidden="true" className="h-5 w-5 text-white drop-shadow" />
                        )}
                      </span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-2 rounded-md border border-black/10 bg-panel p-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.15em] text-ink/55">Critical apparel note</div>
                <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">
                  Use this for one important extraction rule. Keep it short so the image cutout stays the source of truth.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {criticalRulePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setCriticalProductNote(preset.value);
                      setIsShopPromptEdited(false);
                    }}
                    className={`min-h-10 rounded-md border px-3 py-2 text-left text-xs font-black ${
                      criticalProductNote === preset.value ? "border-coral bg-coral/10 text-ink" : "border-black/10 bg-white text-ink/70"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <textarea
                value={criticalProductNote}
                onChange={(event) => {
                  setCriticalProductNote(event.target.value);
                  setIsShopPromptEdited(false);
                }}
                className="min-h-24 w-full resize-y rounded-md border border-black/10 bg-white p-3 text-sm font-semibold leading-6 text-ink outline-none focus:border-cobalt"
                placeholder="One critical rule for this apparel"
              />
            </div>
            <div className="mt-4 grid gap-2 rounded-md border border-black/10 bg-panel p-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.15em] text-ink/55">Preparation mode</div>
                <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">
                  Preserve Cutout is the default extraction mode. Rebuild Apparel is experimental and may change the apparel.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {aiRetouchModes.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => {
                      setAiRetouchMode(mode.value);
                      setIsShopPromptEdited(false);
                    }}
                    className={`min-h-20 rounded-md border p-3 text-left ${
                      aiRetouchMode === mode.value ? "border-ink bg-ink text-white" : "border-black/10 bg-white text-ink"
                    }`}
                  >
                    <span className="block text-sm font-black">{mode.label}</span>
                    <span className={`mt-1 block text-xs font-semibold leading-5 ${aiRetouchMode === mode.value ? "text-white/70" : "text-ink/55"}`}>
                      {mode.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-2 rounded-md border border-black/10 bg-panel p-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.15em] text-ink/55">Preparation provider</div>
                <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">
                  Preserve Cutout can be prepared with FASHN or OpenAI. Rebuild Apparel still uses OpenAI.
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">
                  After apparel detection, LuxuryBandit auto-selects FASHN for lingerie-style apparel and OpenAI for regular clothing. You can still change it manually.
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {aiRetouchProviders.map((provider) => {
                  const selected = aiRetouchProvider === provider.value;
                  const disabled = provider.value === "fashn" && aiRetouchMode === "rebuild";
                  return (
                    <button
                      key={provider.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => setAiRetouchProvider(provider.value)}
                      className={`min-h-20 rounded-md border p-3 text-left disabled:cursor-not-allowed disabled:opacity-45 ${
                        selected && !disabled ? "border-ink bg-ink text-white" : "border-black/10 bg-white text-ink"
                      }`}
                    >
                      <span className="block text-sm font-black">{provider.label}</span>
                      <span className={`mt-1 block text-xs font-semibold leading-5 ${selected && !disabled ? "text-white/70" : "text-ink/55"}`}>
                        {disabled ? "Only available for Preserve Cutout extraction." : provider.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mb-2 mt-5 text-sm font-black text-ink">Prepare apparel for Fashion Creator</div>
            <div className="mb-3 grid gap-3 rounded-md border border-black/10 bg-panel p-3 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
              <img src="/shopcut-logo.svg" alt="LuxuryBandit apparel extracted logo" className="mx-auto aspect-[2/1] w-full rounded-md border border-black/10 bg-white object-cover" />
              <div>
                <div className="text-lg font-black text-ink">Model removed. Apparel extracted.</div>
                <p className="mt-1 text-sm font-semibold leading-6 text-ink/60">
                  {isGenerating ? "LuxuryBandit is preparing the apparel now." : "Extract and prepare the selected apparel for Fashion Creator."}
                </p>
              </div>
            </div>
            {detectedProducts.length > 0 && (
              <div className="mb-3 rounded-md border border-black/10 bg-panel p-3">
                <button
                  type="button"
                  onClick={() => setIsDetectedProductsOpen((open) => !open)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span>
                    <span className="block text-3xl font-black uppercase tracking-normal text-cobalt md:text-4xl">
                      {detectedProducts.length} Apparel item{detectedProducts.length === 1 ? "" : "s"} identified
                    </span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-ink/55">
                      {detectedProducts.filter((product) => product.selected).length} selected for the final image. Open details to edit names, colors, shapes, and materials.
                    </span>
                  </span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-black/10 bg-white text-lg font-black text-ink">
                    {isDetectedProductsOpen ? "⌃" : "⌄"}
                  </span>
                </button>
                {isDetectedProductsOpen && (
                  <div className="mt-3 grid gap-3">
                    {detectedProducts.map((product) => (
                      <div key={product.id} className="grid gap-2 rounded-md border border-black/10 bg-white p-3">
                        <label className="flex min-h-8 items-start gap-2 text-sm font-bold text-ink">
                          <input
                            type="checkbox"
                            checked={product.selected}
                            onChange={() => toggleDetectedProduct(product.id)}
                            className="mt-1 h-4 w-4 accent-coral"
                          />
                          <span className="grid gap-0.5">
                            <span>{productPromptText(product)}</span>
                            <span className="text-xs font-semibold leading-5 text-ink/55">
                              Edit the detected apparel details before sending them to AI.
                            </span>
                          </span>
                        </label>
                        <div className="grid gap-2 md:grid-cols-2">
                          {[
                            ["label", "Name", "panty"],
                            ["color", "Color", "black"],
                            ["material", "Material", "opaque black fabric"],
                            ["description", "Full description", "black opaque tanga panty with cut-outs"]
                          ].map(([field, label, placeholder]) => (
                            <label key={field} className={field === "description" ? "grid gap-1 md:col-span-2" : "grid gap-1"}>
                              <span className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">{label}</span>
                              <input
                                value={String(product[field as keyof DetectedProduct] ?? "")}
                                onChange={(event) => updateDetectedProduct(product.id, field as keyof Pick<DetectedProduct, "label" | "color" | "material" | "shape" | "details" | "description">, event.target.value)}
                                placeholder={placeholder}
                                className="h-10 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold text-ink outline-none focus:border-cobalt"
                              />
                            </label>
                          ))}
                          <div className="grid gap-2 md:col-span-2">
                            <span className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">Shape / cut</span>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                              {shapeOptions.map((option) => {
                                const isCustom = option.value === "custom";
                                const isSelected = isCustom
                                  ? Boolean(product.shape && !shapeOptions.some((shape) => shape.value === product.shape && shape.value !== "custom"))
                                  : product.shape === option.value;
                                return (
                                  <label
                                    key={option.value}
                                    className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-xs font-black ${
                                      isSelected ? "border-coral bg-coral/10 text-ink" : "border-black/10 bg-panel text-ink/70"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`shape-${product.id}`}
                                      checked={isSelected}
                                      onChange={() => updateDetectedProduct(product.id, "shape", isCustom ? "" : option.value)}
                                      className="h-4 w-4 accent-coral"
                                    />
                                    {option.label}
                                  </label>
                                );
                              })}
                            </div>
                            <input
                              value={product.shape ?? ""}
                              onChange={(event) => updateDetectedProduct(product.id, "shape", event.target.value)}
                              placeholder="custom shape, e.g. asymmetric cut-out tanga with narrow side straps"
                              className="h-10 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold text-ink outline-none focus:border-cobalt"
                            />
                          </div>
                          <label className="grid gap-1 md:col-span-2">
                            <span className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">Special details</span>
                            <input
                              value={product.details ?? ""}
                              onChange={(event) => updateDetectedProduct(product.id, "details", event.target.value)}
                              placeholder="side cut-outs, high-leg openings, asymmetric edge, lace border"
                              className="h-10 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold text-ink outline-none focus:border-cobalt"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="mb-3 grid gap-2 rounded-md border border-black/10 bg-panel p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-black text-ink">Prompt sent to AI</div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">
                    This text changes with apparel checkboxes, apparel view, and background color. You can edit it before generating.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setIsShopPromptOpen((open) => !open)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-ink px-3 text-xs font-black text-white"
                  >
                    {isShopPromptOpen ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                    {isShopPromptOpen ? "Hide prompt" : "Show prompt"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsShopPromptEdited(false);
                      setCustomShopPrompt(generatedShopPrompt);
                    }}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-black/10 bg-white px-3 text-xs font-black text-ink"
                  >
                    Reset prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(customShopPrompt)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-black text-ink"
                  >
                    <Copy aria-hidden="true" className="h-4 w-4" />
                    Copy
                  </button>
                </div>
              </div>
              {isShopPromptOpen ? (
                <textarea
                  value={customShopPrompt}
                  onChange={(event) => {
                    setCustomShopPrompt(event.target.value);
                    setIsShopPromptEdited(true);
                  }}
                  className="min-h-72 w-full resize-y rounded-md border border-black/10 bg-white p-3 font-mono text-xs font-semibold leading-5 text-ink outline-none focus:border-cobalt"
                  spellCheck={false}
                />
              ) : (
                <p className="rounded-md border border-black/10 bg-white p-3 text-sm font-bold leading-6 text-ink/55">
                  Prompt is hidden. Open it only if you want to review or edit the exact text sent to AI.
                </p>
              )}
              {isShopPromptEdited && (
                <p className="text-xs font-bold text-coral">
                  Custom prompt is active. Reset prompt to rebuild it from the current selections.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleGenerateShopImage}
              disabled={!cutoutPreview || !aiPrompt.trim() || !productView || isGenerating}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cobalt px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isGenerating ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden="true" className="h-4 w-4" />}
              Create Design Ready apparel
            </button>
            {isGenerating && (
              <div className="mt-3 grid gap-3 rounded-md border border-cobalt/20 bg-cobalt/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-black text-ink">
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-cobalt" />
                    Preparing with {activeRetouchProviderLabel}
                  </div>
                  <div className="text-sm font-black text-cobalt">
                    {generationSeconds < 60
                      ? `${generationSeconds}s`
                      : `${Math.floor(generationSeconds / 60)}m ${generationSeconds % 60}s`}
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-cobalt transition-all duration-700"
                    style={{ width: `${Math.min(92, 18 + generationSeconds * 2)}%` }}
                  />
                </div>
                <p className="text-xs font-semibold leading-5 text-ink/65">
                  Please wait. This can take up to 3 minutes. The page is still working even if the image takes a moment.
                </p>
              </div>
            )}
            {!splitFrontBackMode && (!cutoutPreview || !aiPrompt.trim() || !productView) && (
              <p className="mt-3 rounded-md border border-black/10 bg-panel p-3 text-sm font-bold leading-6 text-ink/65">
                Button is disabled because apparel detection is not completed yet or Apparel View is not selected. First detect apparel, then choose Front, Side, or Back.
              </p>
            )}
            </>
            )}
            {retouchError && <p className="mt-3 rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-bold leading-6 text-coral">{retouchError}</p>}
            {shopImage ? (
              <div className="mt-3 grid gap-3">
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 sm:grid-cols-[150px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
                  <div className="grid content-start gap-2">
                    <div className="text-sm font-black text-ink">Original upload</div>
                    <button
                      type="button"
                      onClick={() => imageDataUrl && setImageDialog({ title: "Original upload", src: imageDataUrl })}
                      className="overflow-hidden rounded-md border border-black/10 bg-panel text-left focus:outline-none focus:ring-2 focus:ring-cobalt"
                      title="Open large preview"
                    >
                      {imageDataUrl ? (
                        <img src={imageDataUrl} alt={`${viewName} original uploaded reference`} className="aspect-square w-full object-contain" />
                      ) : (
                        <div className="grid aspect-square w-full place-items-center px-5 text-center text-sm font-bold text-ink/55">
                          Original upload appears here.
                        </div>
                      )}
                    </button>
                    <div className="mt-2 text-sm font-black text-ink">Transparent cutout</div>
                    <button
                      type="button"
                      onClick={() => cutoutPreview && setImageDialog({ title: "Transparent cutout", src: cutoutPreview, checkerboard: true })}
                      className="checkerboard overflow-hidden rounded-md border border-black/10 text-left focus:outline-none focus:ring-2 focus:ring-cobalt"
                      title="Open large preview"
                    >
                      {cutoutPreview ? (
                        <img src={cutoutPreview} alt={`${viewName} Step 2 transparent cutout`} className="aspect-square w-full object-contain" />
                      ) : (
                        <div className="grid aspect-square w-full place-items-center px-3 text-center text-xs font-bold text-ink/55">
                          Step 2 image appears here.
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleEditCurrentCutout}
                      className="inline-flex h-9 w-full items-center justify-center rounded-md border border-black/10 bg-white text-xs font-black text-cobalt"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-black text-ink">Design Ready apparel</div>
                    <button
                      type="button"
                      onClick={() => setImageDialog({ title: "Design Ready apparel", src: shopImage })}
                      className="overflow-hidden rounded-md border border-black/10 bg-panel text-left focus:outline-none focus:ring-2 focus:ring-cobalt"
                      title="Open large preview"
                    >
                      <img src={shopImage} alt={`${viewName} square shop result`} className="aspect-square w-full object-contain" />
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void handleCropShopImage()}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cobalt px-3 text-sm font-black text-white"
                  >
                    <Crop aria-hidden="true" className="h-4 w-4" />
                    Fit apparel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.download = `shopcut-${viewName.toLowerCase()}-shop-square.png`;
                      link.href = shopImage;
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                    }}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-black text-white"
                  >
                    <Download aria-hidden="true" className="h-4 w-4" />
                    Download Design Ready PNG
                  </button>
                </div>
                {detectedProducts.length > 0 && (
                  <div className="grid gap-2 rounded-md border border-cobalt/20 bg-cobalt/10 p-3">
                    <p className="text-xs font-semibold leading-5 text-ink/65">
                      Save the selected detected apparel from this Design Ready image to My Apparel for Fashion Creator.
                      If several pieces are selected, they are saved as separate checklist items under this same image.
                    </p>
                    <button
                      type="button"
                      onClick={handleSaveSelectedProductsAsAssets}
                      disabled={detectedProducts.filter((product) => product.selected).length === 0}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cobalt px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Check aria-hidden="true" className="h-4 w-4" />
                      Save selected as Fashion Creator assets
                    </button>
                    {assetSaveMessage && (
                      <p className="rounded-md border border-cobalt/20 bg-white p-3 text-sm font-black leading-6 text-cobalt">
                        {assetSaveMessage}
                      </p>
                    )}
                    {assetSaveMessage && onContinueToFashionCreator && (
                      <button
                        type="button"
                        onClick={onContinueToFashionCreator}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-black text-white"
                      >
                        <Sparkles aria-hidden="true" className="h-4 w-4" />
                        Continue in Fashion Creator
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 grid aspect-square w-full place-items-center rounded-md border border-black/10 bg-panel px-5 text-center text-sm font-bold text-ink/55">
                Design Ready apparel appears here.
              </div>
            )}
          </div>
        </div>
      </div>
      )}
      {isSourceGalleryOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Choose image from gallery"
          onClick={() => setIsSourceGalleryOpen(false)}
        >
          <div
            className="grid max-h-[92vh] w-full max-w-5xl gap-4 overflow-hidden rounded-lg bg-white p-4 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-black text-ink">Choose image from gallery</div>
                <p className="mt-1 text-sm font-bold leading-6 text-ink/55">
                  Select an existing image to load it into Step 1 instead of uploading a new file.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void loadSourceGallery()}
                  disabled={isLoadingSourceGallery}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-black/10 bg-panel px-3 text-xs font-black text-ink disabled:opacity-45"
                >
                  {isLoadingSourceGallery ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setIsSourceGalleryOpen(false)}
                  className="h-9 rounded-md bg-ink px-4 text-sm font-black text-white"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="grid max-h-[72vh] gap-4 overflow-auto pr-1">
              {editorGalleryGroups.map((group) => {
                const groupImages = sourceGalleryImages.filter((item) => group.types.some((type) => type === item.type));
                return (
                  <section key={group.title} className="rounded-md border border-black/10 bg-panel p-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-ink/60">{group.title}</h3>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-ink/50">{groupImages.length}</span>
                    </div>
                    {groupImages.length > 0 ? (
                      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                        {groupImages.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => void handleSelectSourceGalleryImage(item)}
                            disabled={isLoadingSourceGallery}
                            className={`rounded-md border border-black/10 bg-white p-2 text-left focus:outline-none focus:ring-2 focus:ring-cobalt disabled:cursor-wait disabled:opacity-60 ${
                              item.type === "cutout" ? "checkerboard" : ""
                            }`}
                            title="Use this image in Step 1"
                          >
                            <span className="block overflow-hidden rounded-md border border-black/10 bg-white">
                              <img
                                src={item.url}
                                alt={`Saved ${galleryImageLabel(item.type)}`}
                                className="aspect-square w-full object-contain"
                              />
                            </span>
                            <span className="mt-2 block truncate text-xs font-black text-ink">
                              {galleryImageLabel(item.type)}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-md border border-black/10 bg-white p-3 text-sm font-bold text-ink/45">{group.empty}</p>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {imageDialog && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${imageDialog.title} large preview`}
          onClick={() => setImageDialog(null)}
        >
          <div
            className="grid max-h-[92vh] w-full max-w-5xl gap-3 rounded-lg bg-white p-3 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-black text-ink">{imageDialog.title}</div>
              <button
                type="button"
                onClick={() => setImageDialog(null)}
                className="h-9 rounded-md bg-ink px-4 text-sm font-black text-white"
              >
                Close
              </button>
            </div>
            <div className={`max-h-[82vh] overflow-auto rounded-md border border-black/10 ${imageDialog.checkerboard ? "checkerboard" : "bg-panel"}`}>
              <img src={imageDialog.src} alt={`${viewName} large ${imageDialog.title} preview`} className="mx-auto max-h-[82vh] w-auto max-w-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
