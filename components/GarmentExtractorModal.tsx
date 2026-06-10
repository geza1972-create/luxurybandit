"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

type DetectedProduct = {
  label: string;
  color: string;
  material: string;
  shape?: string;
  details?: string;
  description: string;
  bbox?: number[]; // [x, y, w, h] in 0-1000 normalized coords
};

interface GarmentExtractorModalProps {
  /** data URL or signed URL of the source image */
  imageSrc: string;
  onConfirm: (crops: string[]) => void;
  onCancel: () => void;
}

const COLORS = [
  "#3b82f6", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"
];

export default function GarmentExtractorModal({
  imageSrc,
  onConfirm,
  onCancel,
}: GarmentExtractorModalProps) {
  const [isDetecting, setIsDetecting] = useState(true);
  const [products, setProducts] = useState<DetectedProduct[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsDetecting(true);
      setError(null);
      try {
        // Convert URL to blob so we can POST it
        const res = await fetch(imageSrc);
        const blob = await res.blob();
        const form = new FormData();
        form.append("image", blob, "garment.jpg");
        const apiRes = await fetch("/api/detect-products", {
          method: "POST",
          body: form,
          headers: { "x-shopcut-account-id": "admin-internal" },
        });
        const payload = await apiRes.json();
        if (cancelled) return;
        if (!apiRes.ok || !Array.isArray(payload.products)) {
          setError(payload.error ?? "Detection failed.");
        } else {
          setProducts(payload.products);
          // Auto-select all detected pieces
          setSelected(new Set(payload.products.map((_: unknown, i: number) => i)));
        }
      } catch {
        if (!cancelled) setError("Detection failed. Please try again.");
      } finally {
        if (!cancelled) setIsDetecting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [imageSrc]);

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const confirmExtract = async () => {
    const img = imgRef.current;
    if (!img) return;
    setIsExtracting(true);
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    const indices = Array.from(selected).sort((a, b) => a - b);
    const selectedProducts = indices.map(i => products[i]);
    const selectedLabels = selectedProducts.map(p => p.label).join(", ");

    // Merge all selected bounding boxes into ONE unified crop.
    // This keeps the whole outfit together (e.g. corset + garter = one image).
    const bboxes = selectedProducts
      .map(p => p.bbox)
      .filter((b): b is number[] => Array.isArray(b) && b.length === 4);

    let cropDataUrl: string;

    if (bboxes.length > 0) {
      // Union of all bounding boxes
      const minX = Math.min(...bboxes.map(b => b[0]));
      const minY = Math.min(...bboxes.map(b => b[1]));
      const maxX = Math.max(...bboxes.map(b => b[0] + b[2]));
      const maxY = Math.max(...bboxes.map(b => b[1] + b[3]));
      const bw = maxX - minX;
      const bh = maxY - minY;

      // 10% padding so straps and edges are not cut off
      const padX = (bw / 1000) * nw * 0.10;
      const padY = (bh / 1000) * nh * 0.10;
      const sx = Math.max(0, (minX / 1000) * nw - padX);
      const sy = Math.max(0, (minY / 1000) * nh - padY);
      const sw = Math.min(nw - sx, (bw / 1000) * nw + padX * 2);
      const sh = Math.min(nh - sy, (bh / 1000) * nh + padY * 2);

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        cropDataUrl = canvas.toDataURL("image/jpeg", 0.95);
      } else {
        cropDataUrl = imageSrc;
      }
    } else {
      cropDataUrl = imageSrc;
    }

    // Detect if selected items are clothing (→ FASHN) or non-clothing like shoes/bags/jewellery (→ OpenAI)
    const nonClothingPattern = /\b(shoe|shoes|boot|boots|sneaker|sneakers|heel|heels|loafer|sandal|bag|handbag|clutch|backpack|purse|tote|wallet|belt|scarf|hat|cap|sunglasses|glasses|necklace|bracelet|ring|earring|jewellery|jewelry|watch|accessory)\b/i;
    const isNonClothing = selectedProducts.every(p => nonClothingPattern.test(p.label));

    const cleanCrops: string[] = [];
    try {
      const blob = await fetch(cropDataUrl).then((r) => r.blob());
      const form = new FormData();
      form.append("image", blob, "crop.jpg");
      form.append("square", "true");

      let res: Response;

      if (isNonClothing) {
        // Shoes, bags, accessories → OpenAI background removal
        form.append("mode", "rebuild");
        form.append("background", "transparent");
        form.append(
          "prompt",
          [
            `Clean PNG product cutout of ONLY the fashion product(s): ${selectedLabels}.`,
            "REMOVE completely: person, skin, hands, background, floor, furniture, and anything that is NOT the product.",
            "KEEP exactly: every detail of the product — shape, material, hardware, color, texture, stitching, logo.",
            "Output: transparent background. Product centered with comfortable margins. Do not crop any part of it.",
            "Do NOT redesign or change the product in any way.",
          ].join(" ")
        );
        res = await fetch("/api/generate-product", {
          method: "POST",
          body: form,
          headers: { "x-shopcut-account-id": "admin-internal" },
        });
      } else {
        // Clothing & lingerie → FASHN (same as ImageEditor)
        form.append("mode", "retouch-cutout");
        form.append("aspectRatio", "1:1");
        form.append(
          "prompt",
          [
            "Create a clean ecommerce apparel image from this source photo.",
            "Use the image as the main source of truth.",
            "Extract the visible selected apparel only.",
            "Remove person, body, skin, hair, background, scene, shadows, and props unless they are part of the apparel.",
            `Selected apparel pieces: ${selectedLabels}.`,
            "Background: pure white studio background. Square 1:1 ecommerce image.",
            "Preserve exact garment design, colors, prints, logos, seams, straps, hardware, fabric types, shape, and proportions.",
            "Do not invent new apparel pieces.",
            "Center the complete apparel with comfortable margins.",
          ].join("\n")
        );
        res = await fetch("/api/generate-fashn", {
          method: "POST",
          body: form,
          headers: { "x-shopcut-account-id": "admin-internal" },
        });
      }

      const payload = await res.json();
      if (res.ok && payload.image) {
        cleanCrops.push(payload.image);
      } else {
        cleanCrops.push(cropDataUrl);
      }
    } catch {
      cleanCrops.push(cropDataUrl);
    }

    if (cleanCrops.length === 0) cleanCrops.push(imageSrc);
    setIsExtracting(false);
    onConfirm(cleanCrops);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-black/10 p-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em] text-cobalt">
              Extract clothes
            </div>
            <div className="mt-0.5 text-sm font-bold text-ink/65">
              {isDetecting
                ? "Detecting clothing pieces…"
                : error
                ? "Detection failed"
                : `${products.length} piece${products.length !== 1 ? "s" : ""} detected — select which to extract`}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="h-8 w-8 grid place-items-center rounded-md border border-black/10 bg-panel text-ink/50 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Image + bbox overlays */}
        <div className="relative overflow-auto bg-black/5 flex-shrink-0" style={{ maxHeight: "45vh" }}>
          {isDetecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-cobalt" />
            </div>
          )}
          {/* Image — w-full h-auto so bbox % coords map exactly */}
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt=""
              crossOrigin="anonymous"
              className="w-full h-auto block"
            />
            {/* Bbox overlays */}
            {!isDetecting &&
              products.map((product, i) => {
                if (!product.bbox || product.bbox.length < 4) return null;
                const [bx, by, bw, bh] = product.bbox;
                const isSelected = selected.has(i);
                const color = COLORS[i % COLORS.length];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggle(i)}
                    style={{
                      left: `${bx / 10}%`,
                      top: `${by / 10}%`,
                      width: `${bw / 10}%`,
                      height: `${bh / 10}%`,
                      borderColor: color,
                      backgroundColor: isSelected ? `${color}30` : `${color}08`,
                    }}
                    className="absolute border-2 transition-colors cursor-pointer"
                  >
                    <span
                      className="absolute -top-5 left-0 rounded-sm px-1.5 py-0.5 text-[10px] font-black text-white whitespace-nowrap"
                      style={{ backgroundColor: color }}
                    >
                      {product.label}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Product chip list */}
        {!isDetecting && products.length > 0 && (
          <div className="border-t border-black/10 p-4">
            <div className="mb-2 text-xs font-bold text-ink/45">Select pieces to extract as garment reference:</div>
            <div className="flex flex-wrap gap-2">
              {products.map((product, i) => {
                const isSelected = selected.has(i);
                const color = COLORS[i % COLORS.length];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggle(i)}
                    style={
                      isSelected
                        ? { borderColor: color, color: color, backgroundColor: `${color}12` }
                        : {}
                    }
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black transition-all ${
                      isSelected
                        ? "border-current"
                        : "border-black/15 bg-panel text-ink/40"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0 transition-colors"
                      style={{ backgroundColor: isSelected ? color : "#d1d5db" }}
                    />
                    {product.label}
                    {product.shape ? ` · ${product.shape}` : ""}
                    {isSelected && <Check className="h-3 w-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
            {products.some((p) => selected.has(products.indexOf(p)) && p.bbox) && (
              <div className="mt-2 text-xs font-bold text-ink/40">
                Selected pieces will be extracted as clean product images — person and background removed. The result is saved directly to the gallery.
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="border-t border-red-200 bg-red-50 p-3 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 border-t border-black/10 p-4 mt-auto">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-md border border-black/15 bg-panel px-5 text-sm font-black text-ink"
          >
            Cancel
          </button>
          {!error && (
            <button
              type="button"
              onClick={() => void confirmExtract()}
              disabled={isDetecting || isExtracting || selected.size === 0}
              className="h-11 flex-1 rounded-md bg-cobalt px-5 text-sm font-black text-white disabled:opacity-40"
            >
              {isDetecting
                ? "Detecting clothing…"
                : isExtracting
                ? "Extracting clothes, removing background…"
                : `Extract ${selected.size} clothing piece${selected.size !== 1 ? "s" : ""} → save to gallery`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
