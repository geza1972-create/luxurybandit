"use client";

import { Download, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  productNote?: string;
  imageUrl?: string;
  frontImageUrl?: string;
  galleryImageUrls?: string[];
};

type Generation = {
  id: string;
  lookId: string;
  imageUrl?: string;
  createdAt: string;
};

type CreativePayload = {
  looks?: Look[];
  activeLook?: Look;
  generations?: Generation[];
  error?: string;
};

type SlidePreview = {
  id: string;
  title: string;
  filename: string;
  dataUrl: string;
};

const ADMIN_PIN_KEY = "luxurybandit-try-look-admin-pin";
const WIDTH = 1080;
const HEIGHT = 1350;

const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");

const parseDiscountPercent = (value?: string) => {
  if (!value) return "";
  const match = value.match(/-?\d+/);
  if (!match) return "";
  const amount = match[0].startsWith("-") ? match[0] : `-${match[0]}`;
  return `${amount}%`;
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

const loadImage = async (src: string) => {
  const response = await fetch(src);
  if (!response.ok) throw new Error("Image could not be loaded for export.");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Image could not be prepared for export."));
      image.src = objectUrl;
    });
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
  const words = text.split(/\s+/);
  let line = "";
  let currentY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
};

const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
};

const drawImageCover = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) => {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
};

const drawImageContain = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) => {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
};

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const writeUint16 = (bytes: number[], value: number) => {
  bytes.push(value & 0xff, (value >>> 8) & 0xff);
};

const writeUint32 = (bytes: number[], value: number) => {
  bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
};

const dataUrlToBytes = (dataUrl: string) => {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = window.atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const createZipBlob = (files: Array<{ filename: string; bytes: Uint8Array }>) => {
  const encoder = new TextEncoder();
  const body: number[] = [];
  const centralDirectory: number[] = [];

  for (const file of files) {
    const filenameBytes = encoder.encode(file.filename);
    const offset = body.length;
    const checksum = crc32(file.bytes);

    writeUint32(body, 0x04034b50);
    writeUint16(body, 20);
    writeUint16(body, 0);
    writeUint16(body, 0);
    writeUint16(body, 0);
    writeUint16(body, 0);
    writeUint32(body, checksum);
    writeUint32(body, file.bytes.length);
    writeUint32(body, file.bytes.length);
    writeUint16(body, filenameBytes.length);
    writeUint16(body, 0);
    body.push(...filenameBytes, ...file.bytes);

    writeUint32(centralDirectory, 0x02014b50);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, checksum);
    writeUint32(centralDirectory, file.bytes.length);
    writeUint32(centralDirectory, file.bytes.length);
    writeUint16(centralDirectory, filenameBytes.length);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, 0);
    writeUint32(centralDirectory, offset);
    centralDirectory.push(...filenameBytes);
  }

  const centralDirectoryOffset = body.length;
  const centralDirectorySize = centralDirectory.length;
  const zipBytes: number[] = [...body, ...centralDirectory];

  writeUint32(zipBytes, 0x06054b50);
  writeUint16(zipBytes, 0);
  writeUint16(zipBytes, 0);
  writeUint16(zipBytes, files.length);
  writeUint16(zipBytes, files.length);
  writeUint32(zipBytes, centralDirectorySize);
  writeUint32(zipBytes, centralDirectoryOffset);
  writeUint16(zipBytes, 0);

  return new Blob([new Uint8Array(zipBytes)], { type: "application/zip" });
};

function drawHeader(ctx: CanvasRenderingContext2D, look: Look, dark = false) {
  ctx.fillStyle = dark ? "rgba(255,255,255,0.92)" : "#111111";
  ctx.font = "900 30px Arial";
  ctx.fillText("LUXURYBANDIT DEALS", 150, 92);
  ctx.fillStyle = dark ? "rgba(255,255,255,0.88)" : "#111111";
  drawRoundedRect(ctx, 58, 48, 84, 84, 14);
  ctx.fillStyle = dark ? "#111111" : "#ffffff";
  ctx.font = "900 34px Arial";
  ctx.fillText("LB", 78, 102);
  ctx.fillStyle = dark ? "rgba(255,255,255,0.72)" : "rgba(17,17,17,0.62)";
  ctx.font = "800 24px Arial";
  ctx.fillText(look.storeName ?? "Local boutique", 150, 132);
}

async function renderSlide(slide: number, look: Look, offerUrl: string, aiImageUrl?: string) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create export canvas.");

  const productImageUrl = look.frontImageUrl ?? look.imageUrl ?? look.galleryImageUrls?.[0] ?? "";
  const productImage = productImageUrl ? await loadImage(productImageUrl) : null;
  const aiImage = aiImageUrl ? await loadImage(aiImageUrl).catch(() => null) : null;
  const discount = look.discountLabel || (look.salePrice && look.price ? "SPECIAL DEAL" : "NEW ARRIVAL");
  const promoPercent = parseDiscountPercent(look.discountLabel);
  const city = look.storeAddress?.split(",")[0]?.trim() || "Local boutique";

  ctx.fillStyle = "#f8f3eb";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (slide === 1) {
    if (productImage) drawImageCover(ctx, productImage, 0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgba(248,243,235,0.88)";
    ctx.fillRect(0, 0, 560, HEIGHT);
    drawHeader(ctx, look);
    ctx.fillStyle = "#111111";
    ctx.font = "900 64px Arial";
    ctx.fillText("LOCAL", 66, 250);
    ctx.fillText("BOUTIQUE", 66, 326);
    ctx.fillText("DROP", 66, 402);
    if (promoPercent) {
      ctx.fillStyle = "#111111";
      ctx.font = "900 66px Arial";
      ctx.fillText("UP TO", 66, 520);
      ctx.font = "900 210px Arial";
      ctx.fillText(promoPercent, 54, 720);
      ctx.font = "900 48px Arial";
      ctx.fillStyle = "rgba(17,17,17,0.72)";
      wrapText(ctx, "OFF SELECTED LOOKS", 66, 790, 430, 54);
    } else {
      ctx.font = "900 148px Arial";
      wrapText(ctx, discount.toUpperCase(), 60, 575, 480, 144);
    }
    ctx.font = "800 34px Arial";
    ctx.fillStyle = "#222222";
    wrapText(ctx, `${look.name} from ${city}.`, 66, promoPercent ? 900 : 845, 450, 44);
    ctx.font = "900 42px Arial";
    if (look.salePrice) ctx.fillText(look.salePrice, 66, promoPercent ? 1030 : 980);
    if (look.price) {
      ctx.fillStyle = "rgba(17,17,17,0.42)";
      ctx.font = "900 32px Arial";
      ctx.fillText(look.price, 66, promoPercent ? 1080 : 1030);
    }
    ctx.fillStyle = "#2d5bd7";
    drawRoundedRect(ctx, 66, promoPercent ? 1148 : 1134, 410, 92, 16);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 38px Arial";
    ctx.fillText("VIEW OFFERS", 104, promoPercent ? 1207 : 1193);
  }

  if (slide === 2) {
    drawHeader(ctx, look);
    ctx.fillStyle = "#111111";
    ctx.font = "900 76px Arial";
    wrapText(ctx, "TRY IT VIRTUALLY", 62, 245, 860, 86);
    ctx.font = "800 32px Arial";
    ctx.fillStyle = "rgba(17,17,17,0.62)";
    wrapText(ctx, "Shoppers preview the look, choose a size, and send a pre-order directly through WhatsApp.", 66, 420, 820, 46);
    const steps = [
      ["1", "Upload private photo"],
      ["2", "Choose your size"],
      ["3", "Pre-order on WhatsApp"]
    ];
    steps.forEach(([number, label], index) => {
      const y = 585 + index * 160;
      ctx.fillStyle = "#ffffff";
      drawRoundedRect(ctx, 66, y, 880, 112, 18);
      ctx.strokeStyle = "rgba(17,17,17,0.12)";
      ctx.lineWidth = 2;
      ctx.strokeRect(66, y, 880, 112);
      ctx.fillStyle = "#2d5bd7";
      drawRoundedRect(ctx, 96, y + 24, 64, 64, 12);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 32px Arial";
      ctx.fillText(number, 116, y + 65);
      ctx.fillStyle = "#111111";
      ctx.font = "900 36px Arial";
      ctx.fillText(label, 190, y + 68);
    });
    if (productImage) drawImageContain(ctx, productImage, 650, 120, 330, 390);
  }

  if (slide === 3) {
    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (aiImage) drawImageCover(ctx, aiImage, 0, 0, WIDTH, HEIGHT);
    else if (productImage) drawImageContain(ctx, productImage, 210, 230, 660, 760);
    ctx.fillStyle = "rgba(0,0,0,0.52)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawHeader(ctx, look, true);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 78px Arial";
    wrapText(ctx, "AI PREVIEW", 62, 930, 850, 88);
    ctx.font = "800 32px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.76)";
    wrapText(ctx, "See the look on a fashion model before sending your pre-order.", 66, 1100, 760, 44);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 3;
    ctx.strokeRect(66, 1188, 360, 80);
    ctx.font = "900 30px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("AI GENERATED", 96, 1238);
  }

  if (slide === 4) {
    if (productImage) drawImageCover(ctx, productImage, 0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawHeader(ctx, look, true);
    ctx.fillStyle = "#ffffff";
    if (promoPercent) {
      ctx.font = "900 42px Arial";
      ctx.fillText("LIMITED DEAL", 70, 330);
      ctx.font = "900 174px Arial";
      ctx.fillText(promoPercent, 58, 500);
      ctx.font = "900 86px Arial";
      wrapText(ctx, "TRY IT NOW", 66, 650, 840, 92);
    } else {
      ctx.font = "900 92px Arial";
      wrapText(ctx, "TRY IT NOW", 66, 370, 840, 98);
    }
    ctx.font = "800 34px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    wrapText(ctx, "Private photo. Choose your size. Pre-order the deal by WhatsApp.", 70, promoPercent ? 775 : 575, 820, 48);
    ctx.fillStyle = "#2d5bd7";
    drawRoundedRect(ctx, 70, promoPercent ? 930 : 760, 660, 112, 18);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 42px Arial";
    ctx.fillText("VIEW DEAL", 112, promoPercent ? 1000 : 830);
    ctx.font = "800 25px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    wrapText(ctx, offerUrl.replace(/^https?:\/\//, ""), 72, promoPercent ? 1160 : 990, 820, 38);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    drawRoundedRect(ctx, 70, promoPercent ? 1230 : 1120, 760, 92, 18);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 30px Arial";
    ctx.fillText("PRIVATE PHOTO · LOCAL PICKUP · WHATSAPP", 102, promoPercent ? 1288 : 1178);
  }

  return canvas.toDataURL("image/png");
}

export default function CreativeBuilderPage() {
  const [pin, setPin] = useState("");
  const [data, setData] = useState<CreativePayload>({});
  const [selectedLookId, setSelectedLookId] = useState("");
  const [previews, setPreviews] = useState<SlidePreview[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async (adminPin = pin) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/try-this-look?admin=1", {
        headers: adminPin ? { "x-try-look-admin-pin": adminPin } : {}
      });
      const payload = await readJsonResponse<CreativePayload>(response);
      if (!response.ok) throw new Error(payload.error ?? "Creative data could not be loaded.");
      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Creative data could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const storedPin = window.localStorage.getItem(ADMIN_PIN_KEY) ?? "";
    const params = new URLSearchParams(window.location.search);
    setPin(storedPin);
    setSelectedLookId(params.get("look") ?? "");
    void loadData(storedPin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPreviewIndex(0);
    setIsPreviewPlaying(true);
  }, [previews.length]);

  useEffect(() => {
    if (!isPreviewPlaying || previews.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentPreviewIndex((index) => (index + 1) % previews.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [isPreviewPlaying, previews.length]);

  const selectedLook = useMemo(() => {
    const looks = data.looks ?? [];
    return looks.find((look) => look.id === selectedLookId) ?? data.activeLook ?? looks[0];
  }, [data.activeLook, data.looks, selectedLookId]);

  const selectedGeneration = useMemo(() => {
    if (!selectedLook) return undefined;
    return (data.generations ?? []).find((generation) => generation.lookId === selectedLook.id && generation.imageUrl);
  }, [data.generations, selectedLook]);

  const offerUrl = selectedLook?.storeSlug
    ? `${typeof window === "undefined" ? "" : window.location.origin}/store/${selectedLook.storeSlug}/${normalizeSlug(selectedLook.name) || selectedLook.id}`
    : "";

  const renderCreatives = async () => {
    if (!selectedLook) return;
    setIsRendering(true);
    setError(null);
    setMessage(null);
    try {
      const slug = normalizeSlug(selectedLook.name) || selectedLook.id;
      const rendered = await Promise.all(
        [
          ["deal", "Deal slide"],
          ["try-on", "Try-on slide"],
          ["ai-preview", "AI preview slide"],
          ["cta", "CTA slide"]
        ].map(async ([id, title], index) => ({
          id,
          title,
          filename: `${slug}-${index + 1}-${id}.png`,
          dataUrl: await renderSlide(index + 1, selectedLook, offerUrl, selectedGeneration?.imageUrl)
        }))
      );
      setPreviews(rendered);
      setMessage("Listing slides created.");
    } catch (renderError) {
      setError(renderError instanceof Error ? renderError.message : "Listing slides could not be created.");
    } finally {
      setIsRendering(false);
    }
  };

  const downloadSlide = (slide: SlidePreview) => {
    const link = document.createElement("a");
    link.href = slide.dataUrl;
    link.download = slide.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadAll = () => {
    const files = previews.map((preview) => ({
      filename: preview.filename,
      bytes: dataUrlToBytes(preview.dataUrl)
    }));
    const zipBlob = createZipBlob(files);
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedLook ? normalizeSlug(selectedLook.name) || selectedLook.id : "luxurybandit"}-listing-slides.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyCaption = async () => {
    if (!selectedLook) return;
    const caption = [
      `${selectedLook.storeName ?? "Local boutique"} deal: ${selectedLook.name}`,
      selectedLook.discountLabel ? `${selectedLook.discountLabel} today.` : selectedLook.salePrice ? `Action price: ${selectedLook.salePrice}.` : "New arrival available now.",
      "Try it virtually, choose your size, and pre-order on WhatsApp.",
      offerUrl
    ].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(caption);
    setMessage("Caption copied.");
  };

  return (
    <main className="min-h-screen bg-[#fbfaf7] px-4 py-5 text-ink">
      <section className="mx-auto grid w-full max-w-7xl gap-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">LuxuryBandit Admin</div>
            <h1 className="mt-2 text-5xl font-black leading-none text-ink">Listing Creative Builder</h1>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-ink/60">
              Create four export-ready listing slides from an existing fashion listing.
            </p>
          </div>
          <button type="button" onClick={() => void loadData()} className="inline-flex h-11 items-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-black shadow-soft">
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Refresh
          </button>
        </header>

        <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-soft">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Admin PIN"
              className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt"
            />
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem(ADMIN_PIN_KEY, pin);
                void loadData(pin);
              }}
              className="h-12 rounded-md bg-ink px-5 text-sm font-black text-white"
            >
              Load looks
            </button>
          </div>
        </section>

        {error && <div className="rounded-md border border-coral/25 bg-coral/10 p-4 text-sm font-black text-coral">{error}</div>}
        {message && <div className="rounded-md border border-cobalt/20 bg-cobalt/10 p-4 text-sm font-black text-cobalt">{message}</div>}

        <section className="grid gap-4 rounded-lg border border-black/10 bg-white p-4 shadow-soft lg:grid-cols-[320px_1fr]">
          <div className="grid content-start gap-3">
            <div className="text-lg font-black">Look source</div>
            {isLoading ? (
              <div className="text-sm font-black text-ink/45">Loading...</div>
            ) : (
              <>
                <select
                  value={selectedLook?.id ?? ""}
                  onChange={(event) => {
                    setSelectedLookId(event.target.value);
                    setPreviews([]);
                    setCurrentPreviewIndex(0);
                  }}
                  className="h-12 rounded-md border border-black/10 bg-panel px-3 text-sm font-black outline-none focus:border-cobalt"
                >
                  {(data.looks ?? []).map((look) => (
                    <option key={look.id} value={look.id}>
                      {look.storeName ? `${look.storeName} - ` : ""}{look.name}
                    </option>
                  ))}
                </select>
                {selectedLook && (
                  <div className="grid gap-2 rounded-md border border-black/10 bg-panel p-3 text-sm font-bold text-ink/60">
                    {(selectedLook.frontImageUrl || selectedLook.imageUrl) && (
                      <img src={selectedLook.frontImageUrl ?? selectedLook.imageUrl} alt="" className="aspect-square w-full rounded-md border border-black/10 bg-white object-contain" />
                    )}
                    <div className="text-xl font-black text-ink">{selectedLook.name}</div>
                    <div>{selectedLook.storeName ?? "No store"}</div>
                    <div>{selectedLook.discountLabel || selectedLook.salePrice || selectedLook.price || "No deal data"}</div>
                    <div className="break-all text-cobalt">{offerUrl}</div>
                    {selectedGeneration ? <div className="text-cobalt">AI preview image found.</div> : <div>No AI preview yet. Slide 3 will use the product image.</div>}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void renderCreatives()}
                  disabled={!selectedLook || isRendering}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-cobalt px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-50"
                >
                  {isRendering ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                  {isRendering ? "Creating slides..." : "Create listing slides"}
                </button>
                <button
                  type="button"
                  onClick={() => void copyCaption()}
                  disabled={!selectedLook}
                  className="h-11 rounded-md border border-black/10 bg-white px-4 text-sm font-black text-ink disabled:opacity-50"
                >
                  Copy caption
                </button>
                {previews.length > 0 && (
                  <button type="button" onClick={downloadAll} className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-black text-white">
                    <Download aria-hidden="true" className="h-4 w-4" />
                    Download all PNGs
                  </button>
                )}
              </>
            )}
          </div>

          <div className="grid gap-4">
            <section className="grid gap-3 rounded-md border border-black/10 bg-panel p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">Carousel preview</div>
                  <div className="mt-1 text-sm font-bold text-ink/55">Simulated listing slide flow.</div>
                </div>
                {previews.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIsPreviewPlaying((value) => !value)}
                    className="h-10 rounded-md border border-black/10 bg-white px-4 text-xs font-black text-ink"
                  >
                    {isPreviewPlaying ? "Pause" : "Play"}
                  </button>
                )}
              </div>
              <div className="mx-auto grid w-full max-w-[260px] gap-3">
                <div className="overflow-hidden rounded-[28px] border border-black/15 bg-ink p-2 shadow-soft">
                  <div className="overflow-hidden rounded-[20px] bg-white">
                    <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-black text-white">LB</div>
                      <div>
                        <div className="text-xs font-black text-ink">luxurybandit.deals</div>
                        <div className="text-[10px] font-bold text-ink/45">{selectedLook?.storeName ?? "Local boutique"}</div>
                      </div>
                    </div>
                    <div className="relative aspect-[4/5] bg-panel">
                      {previews.length ? (
                        previews.map((preview, index) => (
                          <img
                            key={preview.id}
                            src={preview.dataUrl}
                            alt={preview.title}
                            className={`absolute inset-0 h-full w-full object-cover transition duration-500 ease-out ${
                              index === currentPreviewIndex ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"
                            }`}
                          />
                        ))
                      ) : selectedLook?.frontImageUrl || selectedLook?.imageUrl ? (
                        <img src={selectedLook.frontImageUrl ?? selectedLook.imageUrl} alt="" className="h-full w-full object-cover object-top opacity-80" />
                      ) : (
                        <div className="grid h-full place-items-center p-6 text-center text-xs font-black text-ink/45">
                          Create slides to preview the listing carousel.
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2 px-3 py-3">
                      <div className="flex justify-center gap-1">
                        {Array.from({ length: previews.length || 4 }).map((_, index) => (
                          <button
                            key={previews[index]?.id ?? index}
                            type="button"
                            onClick={() => previews.length && setCurrentPreviewIndex(index)}
                            className={`h-1.5 rounded-full transition-all ${index === currentPreviewIndex && previews.length ? "w-5 bg-cobalt" : "w-1.5 bg-ink/20"}`}
                            aria-label={`Show slide ${index + 1}`}
                          />
                        ))}
                      </div>
                      <div className="text-xs font-black text-ink">{previews[currentPreviewIndex]?.title ?? "Listing carousel preview"}</div>
                      <div className="text-[11px] font-bold leading-4 text-ink/55">
                        {previews.length ? "Swipe effect simulation for the four generated slides." : "After creating slides, this preview animates automatically."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {previews.length ? (
              previews.map((preview) => (
                <article key={preview.id} className="grid gap-2 rounded-md border border-black/10 bg-panel p-3">
                  <img src={preview.dataUrl} alt={preview.title} className="aspect-[4/5] w-full rounded-md border border-black/10 bg-white object-contain" />
                  <div className="text-sm font-black">{preview.title}</div>
                  <button
                    type="button"
                    onClick={() => downloadSlide(preview)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cobalt px-3 text-xs font-black text-white"
                  >
                    <Download aria-hidden="true" className="h-4 w-4" />
                    Download PNG
                  </button>
                </article>
              ))
            ) : (
              <div className="rounded-md border border-black/10 bg-panel p-6 text-sm font-bold text-ink/55 md:col-span-2 xl:col-span-4">
                Choose a listing and create the four slides.
              </div>
            )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
