"use client";

import { getClientAccountId } from "@/lib/client-account";
import { Download, ImagePlus, Loader2, RefreshCw, Save, Share2, Sparkles } from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";

type TryLook = {
  id: string;
  name: string;
  campaignName?: string;
  storeName?: string;
  storeSlug?: string;
  storeAddress?: string;
  whatsappNumber?: string;
  availableSizes?: string[];
  price?: string;
  productNote?: string;
  imageUrl: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  garmentFrontImageUrl?: string;
  garmentBackImageUrl?: string;
  galleryImageUrls?: string[];
};

const TEST_LOOK: TryLook = {
  id: "test-look-001",
  name: "Futuristic Black Gold Look",
  campaignName: "Instagram test",
  imageUrl: "/test-look-001.svg"
};

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SUPPORTED_IMAGE_MESSAGE = "Unsupported image format. Please upload JPG, PNG, or WebP.";

type EventMetadata = {
  campaignId?: string;
  storeName?: string;
  lookName?: string;
  selectedSize?: string;
  utmSource?: string;
  utmCampaign?: string;
};

const trackEvent = (name: string, lookId?: string, metadata: EventMetadata = {}) => {
  // TODO: Connect to analytics before Instagram ads go live.
  console.info(`[LuxuryBandit event] ${name}`);
  void fetch("/api/try-this-look", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ action: "event", event: name, lookId, ...metadata })
  }).catch(() => undefined);
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
  const [header, payload] = dataUrl.split(",");
  const mimeType = header.match(/data:(.*?)(;base64)?$/)?.[1] ?? "image/png";
  if (header.includes(";base64")) {
    const byteCharacters = window.atob(payload);
    const byteNumbers = Array.from(byteCharacters, (character) => character.charCodeAt(0));
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  }
  return new Blob([decodeURIComponent(payload)], { type: mimeType });
};

const dataUrlToFile = (dataUrl: string, filename: string) => {
  const blob = dataUrlToBlob(dataUrl);
  return new File([blob], filename, { type: blob.type || "image/png" });
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Photo could not be read."));
    reader.readAsDataURL(file);
  });

const validateImageFile = (file: File) => {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(SUPPORTED_IMAGE_MESSAGE);
  }
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Selected look could not be read."));
    reader.readAsDataURL(blob);
  });

const imageUrlToDataUrl = async (src: string) => {
  const response = await fetch(src);
  if (!response.ok) throw new Error("Selected look could not be loaded.");
  const blob = await response.blob();
  if (!SUPPORTED_IMAGE_TYPES.includes(blob.type)) {
    throw new Error(SUPPORTED_IMAGE_MESSAGE);
  }
  return blobToDataUrl(blob);
};

const imageUrlToPngDataUrl = async (src: string) => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Selected look could not be loaded."));
    img.src = src;
  });

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Selected look could not be prepared.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
};

const prepareLookReference = async (src: string) => {
  if (src.startsWith("data:image/")) return src;
  if (src.toLowerCase().includes(".svg")) return imageUrlToPngDataUrl(src);
  return imageUrlToDataUrl(src);
};

const readImageSize = (src: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Image size could not be read."));
    image.src = src;
  });

const chooseTryOnAspectRatio = async (src: string) => {
  try {
    const { width, height } = await readImageSize(src);
    const ratio = width / height;
    const options = [
      { value: "9:16", ratio: 9 / 16 },
      { value: "3:4", ratio: 3 / 4 },
      { value: "4:5", ratio: 4 / 5 },
      { value: "1:1", ratio: 1 }
    ];
    return options.reduce((best, option) =>
      Math.abs(option.ratio - ratio) < Math.abs(best.ratio - ratio) ? option : best
    ).value;
  } catch {
    return "4:5";
  }
};

const publicLookName = (name: string) => {
  const technicalName = /screencapture|bildschirmfoto|screen shot|screenshot|\.png|\.jpe?g|\.webp/i.test(name);
  return technicalName ? "LuxuryBandit Selected Look" : name;
};

const uniqueImageList = (images: Array<string | undefined>) =>
  Array.from(new Set(images.filter((image): image is string => Boolean(image))));

const hasBoutiqueData = (look: TryLook) =>
  Boolean(look.storeName?.trim() || look.whatsappNumber?.trim() || look.availableSizes?.length || look.price?.trim() || look.productNote?.trim());

const normalizeWhatsAppNumber = (value = "") => value.replace(/[^\d]/g, "");
const VISITOR_ID_KEY = "luxurybandit-try-look-visitor-id";

const recommendedProviderForLook = (look: TryLook): "fashn" | "openai" => {
  const text = [
    look.name,
    look.productNote,
    look.campaignName,
    look.storeName
  ].join(" ").toLowerCase();
  return /lingerie|dessous|bra|panty|panties|bodysuit|body suit|corset|stocking|garter|thong|lace|sheer|bikini|swimsuit/.test(text)
    ? "fashn"
    : "openai";
};

export default function TryThisLookPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultSectionRef = useRef<HTMLElement | null>(null);
  const [accountId, setAccountId] = useState("");
  const [visitorId, setVisitorId] = useState("");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [selectedLook, setSelectedLook] = useState<TryLook>(TEST_LOOK);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingLead, setIsSavingLead] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedView, setSelectedView] = useState<"front" | "back">("front");
  const [activeLookImageIndex, setActiveLookImageIndex] = useState(0);
  const [tryOnProvider, setTryOnProvider] = useState<"fashn" | "openai">("fashn");
  const [showAiModelConfirm, setShowAiModelConfirm] = useState(false);
  const [usedAiModel, setUsedAiModel] = useState(false);
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentUrl, setCurrentUrl] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAccountId(getClientAccountId());
    const storedVisitorId = window.localStorage.getItem(VISITOR_ID_KEY) || `visitor-${Date.now()}-${crypto.randomUUID()}`;
    window.localStorage.setItem(VISITOR_ID_KEY, storedVisitorId);
    setVisitorId(storedVisitorId);
    setCurrentUrl(window.location.href);
    const params = new URLSearchParams(window.location.search);
    setUtmSource(params.get("utm_source") ?? "");
    setUtmCampaign(params.get("utm_campaign") ?? "");
    const loadActiveLook = async () => {
      try {
        const storeSlug = params.get("store") ?? "";
        const response = await fetch(`/api/try-this-look${storeSlug ? `?store=${encodeURIComponent(storeSlug)}` : ""}`);
        const payload = await readJsonResponse<{ activeLook?: TryLook }>(response);
        if (response.ok && payload.activeLook?.imageUrl) {
          setSelectedLook(payload.activeLook);
          trackEvent("page_view_try_this_look", payload.activeLook.id, {
            campaignId: payload.activeLook.id,
            storeName: payload.activeLook.storeName,
            lookName: publicLookName(payload.activeLook.name),
            utmSource: params.get("utm_source") ?? undefined,
            utmCampaign: params.get("utm_campaign") ?? undefined
          });
          return;
        }
      } catch {
        // Keep the bundled test look if the admin look cannot be loaded.
      }
      trackEvent("page_view_try_this_look", TEST_LOOK.id);
    };

    void loadActiveLook();
  }, []);

  useEffect(() => {
    setTryOnProvider(recommendedProviderForLook(selectedLook));
    setResultImage(null);
    setActiveLookImageIndex(0);
  }, [selectedLook]);

  useEffect(() => {
    if (!isGenerating || !generationStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - generationStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [generationStartedAt, isGenerating]);

  const boutiqueMode = hasBoutiqueData(selectedLook);
  const lookName = publicLookName(selectedLook.name);
  const hasBackView = Boolean(selectedLook.backImageUrl || selectedLook.garmentBackImageUrl);
  const selectedBackPreviewUrl = selectedLook.backImageUrl ?? selectedLook.garmentBackImageUrl;
  const selectedFrontPreviewUrl = selectedLook.frontImageUrl ?? selectedLook.garmentFrontImageUrl ?? selectedLook.imageUrl;
  const previewImageUrl = selectedView === "back" && selectedBackPreviewUrl ? selectedBackPreviewUrl : selectedFrontPreviewUrl;
  const lookImages = uniqueImageList([
    selectedFrontPreviewUrl,
    selectedBackPreviewUrl,
    ...(selectedLook.galleryImageUrls ?? [])
  ]);
  const displayPreviewImageUrl = lookImages[activeLookImageIndex] ?? previewImageUrl;
  const missingBackGarmentReference = selectedView === "back" && hasBackView && !selectedLook.garmentBackImageUrl;
  const selectedGarmentReferenceUrl = selectedView === "back"
    ? selectedLook.garmentBackImageUrl ?? ""
    : selectedLook.garmentFrontImageUrl ?? selectedFrontPreviewUrl;
  const canGenerate = !isGenerating && !missingBackGarmentReference;
  const loadingProgress = Math.min(92, 10 + elapsedSeconds * 1.3);
  const loadingTimeText = elapsedSeconds < 60
    ? `${elapsedSeconds}s`
    : `${Math.floor(elapsedSeconds / 60)}m ${String(elapsedSeconds % 60).padStart(2, "0")}s`;
  const eventMetadata = {
    campaignId: selectedLook.id,
    storeName: selectedLook.storeName,
    lookName,
    utmSource: utmSource || undefined,
    utmCampaign: utmCampaign || undefined
  };
  const trackLookEvent = (name: string, metadata: EventMetadata = {}) => {
    trackEvent(name, selectedLook.id, { ...eventMetadata, ...metadata });
  };
  const brandName = selectedLook.storeName?.trim() || "LuxuryBandit";
  const brandInitials = brandName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "LB";

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setMessage(null);
    setResultImage(null);
    try {
      validateImageFile(file);
      const dataUrl = await fileToDataUrl(file);
      setUserPhoto(dataUrl);
      trackLookEvent("upload_user_photo");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : SUPPORTED_IMAGE_MESSAGE);
      event.target.value = "";
    }
  };

  const saveToGallery = async (image: string) => {
    if (!accountId) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/gallery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-shopcut-account-id": accountId
        },
        body: JSON.stringify({ type: "model-image", image })
      });
      const payload = await readJsonResponse<{ images?: unknown[] }>(response);
      if (!response.ok || !payload.images) throw new Error(payload.error ?? "Result could not be saved.");
      setMessage("Saved to gallery.");
      window.dispatchEvent(new Event("shopcut-gallery-updated"));
      trackLookEvent("save_to_gallery");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Result could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async (allowAiModel = false) => {
    if (isGenerating) return;
    if (!userPhoto && !allowAiModel) {
      setShowAiModelConfirm(true);
      return;
    }
    if (missingBackGarmentReference) {
      setError("Back view needs a clean back AI garment reference. Add it in admin, or switch to Front.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    setMessage(null);
    setResultImage(null);
    setGenerationStartedAt(Date.now());
    setUsedAiModel(!userPhoto);
    trackLookEvent("click_generate_my_look");
    window.setTimeout(() => resultSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

    try {
      const lookReference = await prepareLookReference(selectedGarmentReferenceUrl);
      const aspectRatio = userPhoto ? await chooseTryOnAspectRatio(userPhoto) : "4:5";
      const formData = new FormData();
      formData.append("image", dataUrlToBlob(lookReference), `${selectedLook.id}.png`);
      if (userPhoto) formData.append("modelImage", dataUrlToBlob(userPhoto), "user-photo.jpg");
      formData.append(
        "prompt",
        (userPhoto ? [
          "Create a realistic fashion try-on image using two sources:",
          "",
          "IDENTITY SOURCE OF TRUTH:",
          "The uploaded user photo is the identity source of truth.",
          "Use it for the person's face, hair, skin tone, and recognizable identity.",
          "",
          "LOOK SOURCE OF TRUTH:",
          "The selected look image is the complete fashion look source of truth.",
          "Use it for the outfit, garment coverage, styling, pose direction, visible body framing, and overall fashion presentation.",
          "",
          "Task:",
          "Create a new try-on image where the uploaded person's identity appears in the selected look.",
          "This is closer to identity transfer into the selected fashion look than placing clothes over the old outfit.",
          "",
          `Selected look name: ${lookName}.`,
          selectedLook.productNote ? `Product note: ${selectedLook.productNote}` : "",
          `Selected view: ${selectedView}.`,
          "",
          "Strict identity preservation:",
          "- Preserve the uploaded person's face, hairstyle, hair color, skin tone, and recognizable identity.",
          "- Do not change the person's face into the campaign model's face.",
          "- Do not change the hairstyle unless it is physically necessary to fit the look.",
          "- Keep the person looking like the uploaded user.",
          "- Preserve natural body proportions. Do not compress, stretch, shrink, or shorten the torso, hips, arms, or legs.",
          "- Do not make the legs smaller or shorter just to fit the person into the frame.",
          "",
          "Strict complete-look preservation:",
          "- Recreate the selected look image as faithfully as possible.",
          "- Preserve garment type, structure, silhouette, cut, colors, patterns, prints, logos, seams, trims, straps, sleeves, hardware, transparency, opaque panels, and proportions.",
          "- Do not redesign the outfit.",
          "- Do not simplify the outfit.",
          "- Do not omit lower-body parts.",
          "- Do not omit upper-body parts.",
          "- Do not convert a one-piece into separate unrelated garments.",
          "- Do not convert the selected look into a different dress, blouse, skirt, pants, or bodysuit.",
          "- If the selected look shows no pants, do not add pants.",
          "- If the selected look shows stockings, tights, bare legs, sandals, heels, or accessories, preserve them as shown.",
          "- Do not reinterpret opaque fabric as transparent.",
          "- Do not reinterpret transparent fabric as opaque unless required only minimally for fit realism.",
          "",
          "Replacement rules:",
          "- Remove the uploaded user's current clothing completely.",
          "- Do not keep the uploaded user's original top, pants, skirt, jacket, or lower-body clothing.",
          "- Do not layer the selected look over the uploaded user's old outfit.",
          "- Dress the person only in the selected look.",
          "",
          "View and orientation rules:",
          "- Match the visible garment view from the selected look.",
          selectedView === "front" ? "- The selected look is front view. Output front view." : "- The selected look is back view. Output back view.",
          "- Do not invent a different angle than required.",
          hasBackView ? "- Front and back reference views may exist for understanding, but generate only the requested visible result for this try-on." : "",
          "",
          "Background and composition rules:",
          "- Follow the selected look image composition and portrait framing more than the uploaded user's original background.",
          "- Do not reproduce text overlays, product-card labels, badges, prices, or UI graphics from the selected look image.",
          "- Do not force a square crop.",
          "- Keep the body naturally proportioned inside the portrait frame. Use comfortable margins instead of squeezing the person.",
          "- Output a clean portrait-oriented result.",
          "",
          "Final goal:",
          "A believable result where the uploaded person's identity appears in the complete selected fashion look."
        ] : [
          "Create a realistic fashion campaign image using the selected look as the source of truth.",
          "",
          "No user photo was uploaded.",
          "Use a professional adult AI fashion model.",
          "The selected look image is the complete outfit source of truth.",
          "",
          `Selected look name: ${lookName}.`,
          selectedLook.productNote ? `Product note: ${selectedLook.productNote}` : "",
          `Selected view: ${selectedView}.`,
          "",
          "Strict look preservation:",
          "- Preserve the garment type, structure, silhouette, cut, colors, patterns, prints, logos, seams, trims, straps, sleeves, hardware, transparency, opaque panels, length, coverage, and proportions.",
          "- Do not redesign the outfit.",
          "- Do not convert a dress into a blouse.",
          "- Do not add pants if the selected look does not show pants.",
          "- Do not omit stockings, tights, shoes, accessories, or lower garments when visible in the selected look.",
          "- Keep the full look complete on the AI model.",
          "",
          "Model and output:",
          "- Professional adult fashion model.",
          "- Natural premium fashion pose.",
          "- Full body visible when the look includes full-body styling.",
          "- Clean portrait-oriented campaign image.",
          "- Do not show UI labels, prices, badges, or screenshot text."
        ]).join("\n")
      );
      formData.append("mode", "fashion-model");
      formData.append("aspectRatio", aspectRatio);

      const provider = userPhoto ? tryOnProvider : "fashn";
      const response = await fetch(provider === "openai" ? "/api/try-this-look-openai" : "/api/generate-fashn", {
        method: "POST",
        body: formData,
        headers: {
          "x-shopcut-account-id": accountId
        }
      });
      const payload = await readJsonResponse<{ image?: string }>(response);
      if (!response.ok || !payload.image) throw new Error(payload.error ?? "Look could not be generated.");
      setResultImage(payload.image);
      void fetch("/api/try-this-look", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "generation", lookId: selectedLook.id, image: payload.image, visitorId, ...eventMetadata })
      }).catch(() => undefined);
      trackLookEvent("generation_success");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Look could not be generated.");
      trackLookEvent("generation_failed");
    } finally {
      setIsGenerating(false);
      setGenerationStartedAt(null);
    }
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const link = document.createElement("a");
    link.download = "luxurybandit-try-this-look.png";
    link.href = resultImage;
    document.body.appendChild(link);
    link.click();
    link.remove();
    trackLookEvent("download_result");
  };

  const shareResult = async () => {
    if (!resultImage) return;
    setError(null);
    setMessage(null);

    try {
      const file = dataUrlToFile(resultImage, "luxurybandit-try-this-look.png");
      const shareData = {
        title: "LuxuryBandit Look",
        text: "I made this look with LuxuryBandit.",
        files: [file]
      };

      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        trackLookEvent("share_result");
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: "LuxuryBandit Look",
          text: "I made this look with LuxuryBandit."
        });
        trackLookEvent("share_result");
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      setMessage("Share link copied.");
      trackLookEvent("share_result");
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setError(shareError instanceof Error ? shareError.message : "This browser could not share the image.");
    }
  };

  const saveLead = async () => {
    if (!customerName.trim() && !phone.trim() && !email.trim() && !instagram.trim()) {
      setError("Please add your name, phone, email, or Instagram handle.");
      return;
    }

    setIsSavingLead(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/try-this-look", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "lead", lookId: selectedLook.id, visitorId, customerName, phone, email, instagram, ...eventMetadata })
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload.error ?? "Contact could not be saved.");
      setMessage("Done. We will send you new LuxuryBandit looks.");
      setCustomerName("");
      setPhone("");
      setEmail("");
      setInstagram("");
    } catch (leadError) {
      setError(leadError instanceof Error ? leadError.message : "Contact could not be saved.");
    } finally {
      setIsSavingLead(false);
    }
  };

  const buildWhatsAppUrl = () => {
    const phone = normalizeWhatsAppNumber(selectedLook.whatsappNumber);
    if (!phone || !selectedSize) return "";
    const lines = [
      `Hi, I want to order ${lookName} from ${selectedLook.storeName ?? "LuxuryBandit"}.`,
      `Size: ${selectedSize}.`,
      "I tried it on with LuxuryBandit."
    ];
    if (selectedLook.price) lines.push(`Price: ${selectedLook.price}`);
    if (currentUrl) lines.push(`Try-on link: ${currentUrl}`);
    return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  const handleOrderViaWhatsApp = () => {
    const url = buildWhatsAppUrl();
    if (!url) return;
    trackLookEvent("click_order_whatsapp", { selectedSize });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="min-h-screen bg-[#fbfaf7] px-4 py-5 text-ink">
      <section className="mx-auto grid w-full max-w-xl gap-5">
        <header className="grid gap-3 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-cobalt text-base font-black text-white shadow-soft">{brandInitials}</div>
          <div className="grid gap-1">
            <div className="text-lg font-black text-ink">{brandName}</div>
            {selectedLook.storeAddress && <div className="text-sm font-bold text-ink/55">{selectedLook.storeAddress}</div>}
            {selectedLook.whatsappNumber && <div className="text-sm font-bold text-ink/55">WhatsApp: {selectedLook.whatsappNumber}</div>}
          </div>
          <h1 className="text-5xl font-black leading-[0.95] text-ink">
            {boutiqueMode ? "Try this new arrival on yourself" : "Try this look on yourself"}
          </h1>
          <p className="mx-auto max-w-md text-base font-bold leading-7 text-ink/60">
            {boutiqueMode && selectedLook.storeName
              ? `${selectedLook.storeName} just received this look. Upload your photo, try it on, and order directly via WhatsApp.`
              : "Upload your photo and see yourself in this AI fashion look."}
          </p>
        </header>

        <section className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-soft">
          <div className="relative overflow-hidden bg-panel">
            <img src={displayPreviewImageUrl} alt={lookName} className="aspect-[4/5] w-full object-cover object-top" />
            {lookImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveLookImageIndex((index) => (index - 1 + lookImages.length) % lookImages.length)}
                  className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl font-black text-ink shadow-soft"
                  aria-label="Previous product photo"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLookImageIndex((index) => (index + 1) % lookImages.length)}
                  className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl font-black text-ink shadow-soft"
                  aria-label="Next product photo"
                >
                  ›
                </button>
              </>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-white/80">
                {boutiqueMode ? "New arrival" : "Selected look"}
              </div>
              <div className="mt-1 text-3xl font-black leading-none text-white">{lookName}</div>
              {boutiqueMode && selectedLook.storeName && <div className="mt-2 text-sm font-black text-white/85">{selectedLook.storeName}</div>}
            </div>
          </div>
          {lookImages.length > 1 && (
            <div className="grid gap-2 border-t border-black/10 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">Product photos</div>
                <div className="text-xs font-black text-ink/45">
                  {activeLookImageIndex + 1}/{lookImages.length}
                </div>
              </div>
              <div className="flex snap-x gap-2 overflow-x-auto pb-1">
                {lookImages.map((image, index) => {
                  const active = index === activeLookImageIndex;
                  return (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveLookImageIndex(index)}
                      className={`h-20 w-16 shrink-0 snap-start overflow-hidden rounded-md border bg-panel ${active ? "border-cobalt ring-2 ring-cobalt/20" : "border-black/10"}`}
                      aria-label={`Show product photo ${index + 1}`}
                    >
                      <img src={image} alt="" className="h-full w-full object-cover object-top" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {boutiqueMode && (
            <div className="grid gap-3 p-4">
              {hasBackView && (
                <div className="grid grid-cols-2 gap-2">
                  {(["front", "back"] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => {
                        setSelectedView(view);
                        const viewImage = view === "back" ? selectedBackPreviewUrl : selectedFrontPreviewUrl;
                        const viewIndex = lookImages.findIndex((image) => image === viewImage);
                        if (viewIndex >= 0) setActiveLookImageIndex(viewIndex);
                        setResultImage(null);
                      }}
                      className={`h-11 rounded-md border text-sm font-black capitalize ${
                        selectedView === view ? "border-cobalt bg-cobalt text-white" : "border-black/10 bg-panel text-ink"
                      }`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              )}
              {missingBackGarmentReference && (
                <p className="rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-black leading-6 text-coral">
                  Back view is visible for customers, but generation needs a clean back AI garment reference. Upload it in admin or switch to Front.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {selectedLook.price && <span className="rounded-full bg-ink px-3 py-1 text-xs font-black text-white">{selectedLook.price}</span>}
                {(selectedLook.availableSizes ?? []).map((size) => (
                  <span key={size} className="rounded-full bg-cobalt/10 px-3 py-1 text-xs font-black text-cobalt">
                    {size}
                  </span>
                ))}
              </div>
              {selectedLook.productNote && <p className="text-sm font-bold leading-6 text-ink/60">{selectedLook.productNote}</p>}
            </div>
          )}
        </section>

        <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-3 shadow-soft">
          <div>
            <div className="text-2xl font-black text-ink">Your Photo</div>
            <p className="mt-1 text-sm font-bold leading-6 text-ink/55">
              Upload a full-body photo. This helps LuxuryBandit fit the look more accurately to your real body.
            </p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          {!userPhoto && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative overflow-hidden rounded-md border border-black/10 bg-white"
            >
              <img src="/full-body-upload-guide.svg" alt="Full-body photo guide" className="max-h-[520px] w-full object-contain opacity-75" />
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-md bg-white/90 p-4 text-center shadow-soft">
                <div className="text-lg font-black text-ink">Upload a full-body photo</div>
                <div className="mt-1 text-sm font-bold leading-5 text-ink/55">Front view, good lighting, full body visible.</div>
              </div>
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md border border-black/10 bg-panel px-4 text-base font-black text-ink"
          >
            <ImagePlus aria-hidden="true" className="h-4 w-4" />
            {userPhoto ? "Change photo" : boutiqueMode ? "Try it on me" : "Upload photo"}
          </button>

          {userPhoto && (
            <img src={userPhoto} alt="Your uploaded photo" className="max-h-[520px] w-full rounded-md border border-black/10 object-contain" />
          )}

          {userPhoto && (
            <div className="grid gap-2 rounded-md border border-black/10 bg-panel p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-ink/45">Try-on engine</div>
                <div className="rounded-full bg-cobalt/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cobalt">
                  Auto selected
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTryOnProvider("fashn");
                    setResultImage(null);
                  }}
                  className={`h-11 rounded-md border text-sm font-black ${
                    tryOnProvider === "fashn" ? "border-cobalt bg-cobalt text-white" : "border-black/10 bg-white text-ink"
                  }`}
                >
                  FASHN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTryOnProvider("openai");
                    setResultImage(null);
                  }}
                  className={`h-11 rounded-md border text-sm font-black ${
                    tryOnProvider === "openai" ? "border-cobalt bg-cobalt text-white" : "border-black/10 bg-white text-ink"
                  }`}
                >
                  OpenAI test
                </button>
              </div>
              <p className="text-xs font-bold leading-5 text-ink/55">
                LuxuryBandit uses FASHN for lingerie-style looks and OpenAI for regular fashion looks. You can still switch it for testing.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={!canGenerate}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-md bg-cobalt px-4 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isGenerating ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Sparkles aria-hidden="true" className="h-4 w-4" />}
            {isGenerating ? "Creating your look..." : userPhoto ? "See it on me" : "Create with AI model"}
          </button>
          {!userPhoto && (
            <p className="rounded-md border border-cobalt/15 bg-cobalt/5 p-3 text-sm font-black leading-6 text-ink/60">
              No photo? You can still create a preview with an AI model.
            </p>
          )}
          {missingBackGarmentReference && (
            <p className="rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-black leading-6 text-coral">
              Back generation is paused because the back campaign photo can be blocked by the provider. Add a clean back garment reference in admin first.
            </p>
          )}
          {userPhoto && (
            <p className="rounded-md border border-cobalt/15 bg-cobalt/5 p-3 text-sm font-black leading-6 text-ink/60">
              Step A uses your photo for identity and the selected look as the complete fashion reference.
            </p>
          )}

          {error && <p className="rounded-md border border-coral/25 bg-coral/10 p-3 text-sm font-black leading-6 text-coral">{error}</p>}
          {message && <p className="rounded-md border border-cobalt/20 bg-cobalt/10 p-3 text-sm font-black leading-6 text-cobalt">{message}</p>}
        </section>

        {(isGenerating || resultImage) && (
          <section ref={resultSectionRef} className="grid gap-4 rounded-lg border border-black/10 bg-white p-3 shadow-soft">
            <div>
              <div className="text-2xl font-black text-ink">Your AI Fashion Result</div>
              <p className="mt-1 text-sm font-bold leading-6 text-ink/55">
                {usedAiModel
                  ? "Created with an AI model because no personal photo was uploaded."
                  : "Step A result: your identity transferred into the selected LuxuryBandit look."}
              </p>
            </div>
            {isGenerating && (
              <div className="grid gap-4 rounded-md border border-cobalt/20 bg-cobalt/5 p-3">
                <div className="relative overflow-hidden rounded-md border border-black/10 bg-panel">
                  <img src={userPhoto ?? previewImageUrl} alt="" className="max-h-[620px] w-full object-contain opacity-55 blur-sm" />
                  <div className="absolute inset-0 grid place-items-center bg-white/35 p-5 text-center">
                    <div className="grid w-full max-w-sm gap-4 rounded-md bg-white/90 p-5 shadow-soft">
                      <Loader2 aria-hidden="true" className="mx-auto h-8 w-8 animate-spin text-cobalt" />
                      <div>
                        <div className="text-2xl font-black text-ink">Creating your look...</div>
                        <p className="mt-2 text-sm font-bold leading-6 text-ink/60">
                          Please wait. This usually takes around 20-90 seconds. Sometimes it can take up to 3 minutes.
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <div className="h-3 overflow-hidden rounded-full bg-cobalt/10">
                          <div className="h-full rounded-full bg-cobalt transition-all duration-700" style={{ width: `${loadingProgress}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-ink/45">
                          <span>{tryOnProvider === "fashn" ? "FASHN" : "OpenAI"} is working</span>
                          <span>{loadingTimeText}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {resultImage && (
              <>
                <div className="grid gap-2">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">Generated try-on result</div>
                  <img src={resultImage} alt="Your generated try-on result" className="max-h-[780px] w-full rounded-md border border-black/10 object-contain" />
                </div>
                <div className="grid gap-2 sm:grid-cols-4">
                  <button
                    type="button"
                    onClick={downloadResult}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-black text-white"
                  >
                    <Download aria-hidden="true" className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => void shareResult()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-coral px-3 text-sm font-black text-white"
                  >
                    <Share2 aria-hidden="true" className="h-4 w-4" />
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveToGallery(resultImage)}
                    disabled={isSaving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cobalt px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}
                    Save to gallery
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResultImage(null);
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-black/10 bg-panel px-3 text-sm font-black text-ink"
                  >
                    <RefreshCw aria-hidden="true" className="h-4 w-4" />
                    Try another photo
                  </button>
                </div>
              </>
            )}

            {resultImage && boutiqueMode && (
              <div className="grid gap-3 rounded-md border border-black/10 bg-panel p-3">
                <div>
                  <div className="text-xl font-black text-ink">Want this look?</div>
                  <p className="mt-1 text-xs font-bold leading-5 text-ink/55">Choose your size and order directly from the boutique via WhatsApp.</p>
                </div>
                {(selectedLook.availableSizes ?? []).length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {(selectedLook.availableSizes ?? []).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setSelectedSize(size);
                          trackLookEvent("select_size", { selectedSize: size });
                        }}
                        className={`h-11 rounded-md border text-sm font-black ${
                          selectedSize === size ? "border-cobalt bg-cobalt text-white" : "border-black/10 bg-white text-ink"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md border border-coral/20 bg-coral/10 p-3 text-xs font-black text-coral">No sizes were added for this campaign yet.</p>
                )}
                <button
                  type="button"
                  onClick={handleOrderViaWhatsApp}
                  disabled={!selectedSize || !normalizeWhatsAppNumber(selectedLook.whatsappNumber)}
                  className="inline-flex h-12 items-center justify-center rounded-md bg-[#25D366] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Order via WhatsApp
                </button>
              </div>
            )}

            {resultImage && (
              <div className="grid gap-2 rounded-md border border-cobalt/15 bg-cobalt/5 p-3">
                <div className="text-lg font-black text-ink">Get new looks</div>
                <p className="text-xs font-bold leading-5 text-ink/55">
                  Leave your contact details and we&apos;ll send you the next drops to try on.
                </p>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Name"
                  className="h-11 rounded-md border border-black/10 bg-white px-3 text-sm font-bold outline-none focus:border-cobalt"
                />
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Phone / WhatsApp"
                  className="h-11 rounded-md border border-black/10 bg-white px-3 text-sm font-bold outline-none focus:border-cobalt"
                />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  className="h-11 rounded-md border border-black/10 bg-white px-3 text-sm font-bold outline-none focus:border-cobalt"
                />
                <input
                  value={instagram}
                  onChange={(event) => setInstagram(event.target.value)}
                  placeholder="Instagram handle"
                  className="h-11 rounded-md border border-black/10 bg-white px-3 text-sm font-bold outline-none focus:border-cobalt"
                />
                <button
                  type="button"
                  onClick={() => void saveLead()}
                  disabled={isSavingLead}
                  className="inline-flex h-11 items-center justify-center rounded-md bg-coral px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-50"
                >
                  {isSavingLead ? "Saving..." : "Send me new looks"}
                </button>
              </div>
            )}
          </section>
        )}
      </section>
      {showAiModelConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="grid w-full max-w-md gap-4 rounded-lg bg-white p-5 text-center shadow-soft">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-cobalt/10 text-cobalt">
              <Sparkles aria-hidden="true" className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-ink">Create with an AI model?</div>
              <p className="mt-2 text-sm font-bold leading-6 text-ink/60">
                You did not upload a photo of yourself. LuxuryBandit can create this look on a professional AI model instead.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowAiModelConfirm(false)}
                className="h-12 rounded-md border border-black/10 bg-panel px-4 text-sm font-black text-ink"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAiModelConfirm(false);
                  void handleGenerate(true);
                }}
                className="h-12 rounded-md bg-cobalt px-4 text-sm font-black text-white"
              >
                Yes, create
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
