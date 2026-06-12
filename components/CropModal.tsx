"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollLock } from "@/lib/use-scroll-lock";

type Rect = { x: number; y: number; w: number; h: number };
type Handle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | "move";

interface CropModalProps {
  imageSrc: string;
  aspectRatio?: number; // locks the crop handle interaction — undefined = free crop
  outputRatio?: number; // pads the OUTPUT with white to reach this ratio (e.g. 4/5), does not affect crop UI
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const HANDLE_SIZE = 20;   // visual size
const TOUCH_PAD  = 18;   // extra hit area padding for fingers
const MIN_SIZE = 40;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function getHandleRect(crop: Rect, handle: Handle): Rect {
  const h = HANDLE_SIZE;
  const cx = crop.x, cy = crop.y, cw = crop.w, ch = crop.h;
  switch (handle) {
    case "nw": return { x: cx - h / 2, y: cy - h / 2, w: h, h };
    case "ne": return { x: cx + cw - h / 2, y: cy - h / 2, w: h, h };
    case "sw": return { x: cx - h / 2, y: cy + ch - h / 2, w: h, h };
    case "se": return { x: cx + cw - h / 2, y: cy + ch - h / 2, w: h, h };
    case "n":  return { x: cx + cw / 2 - h / 2, y: cy - h / 2, w: h, h };
    case "s":  return { x: cx + cw / 2 - h / 2, y: cy + ch - h / 2, w: h, h };
    case "w":  return { x: cx - h / 2, y: cy + ch / 2 - h / 2, w: h, h };
    case "e":  return { x: cx + cw - h / 2, y: cy + ch / 2 - h / 2, w: h, h };
    default:   return { x: cx, y: cy, w: cw, h: ch };
  }
}

function hitHandle(px: number, py: number, crop: Rect, ratio?: number, isTouch = false): Handle | null {
  const pad = isTouch ? TOUCH_PAD : 2;
  const handles: Handle[] = ratio
    ? ["nw", "ne", "sw", "se"]
    : ["nw", "ne", "sw", "se", "n", "s", "e", "w"];
  for (const h of handles) {
    const r = getHandleRect(crop, h);
    if (px >= r.x - pad && px <= r.x + r.w + pad && py >= r.y - pad && py <= r.y + r.h + pad) return h;
  }
  if (px >= crop.x && px <= crop.x + crop.w && py >= crop.y && py <= crop.y + crop.h) return "move";
  return null;
}

function handleCursor(handle: Handle | null): string {
  switch (handle) {
    case "nw": case "se": return "nwse-resize";
    case "ne": case "sw": return "nesw-resize";
    case "n": case "s": return "ns-resize";
    case "e": case "w": return "ew-resize";
    case "move": return "move";
    default: return "crosshair";
  }
}

export default function CropModal({ imageSrc, aspectRatio, outputRatio, onConfirm, onCancel }: CropModalProps) {
  useScrollLock(); // prevent iOS background scroll while crop modal is open
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const dragRef = useRef<{ handle: Handle; startX: number; startY: number; startCrop: Rect } | null>(null);

  // Load image and set up canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      const maxW = Math.min(window.innerWidth - 48, 520);
      const maxH = window.innerHeight * 0.6;
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
      const dw = Math.round(img.naturalWidth * scale);
      const dh = Math.round(img.naturalHeight * scale);
      setDisplaySize({ w: dw, h: dh });
      // Initial crop: full image (or largest possible for locked aspect ratio)
      let cw = dw;
      let ch = aspectRatio ? Math.round(cw / aspectRatio) : dh;
      if (ch > dh) { ch = dh; cw = aspectRatio ? Math.round(ch * aspectRatio) : cw; }
      const cx = Math.round((dw - cw) / 2);
      const cy = Math.round((dh - ch) / 2);
      setCrop({ x: cx, y: cy, w: cw, h: ch });
    };
    img.src = imageSrc;
  }, [imageSrc, aspectRatio]);

  // Draw to canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || displaySize.w === 0) return;
    canvas.width = displaySize.w;
    canvas.height = displaySize.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw image
    ctx.drawImage(img, 0, 0, displaySize.w, displaySize.h);

    // Darken outside crop
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, displaySize.w, displaySize.h);
    ctx.clearRect(crop.x, crop.y, crop.w, crop.h);
    ctx.drawImage(img, 0, 0, displaySize.w, displaySize.h);

    // Crop border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(crop.x + 0.5, crop.y + 0.5, crop.w - 1, crop.h - 1);

    // Rule of thirds
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 0.75;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(crop.x + (crop.w * i) / 3, crop.y); ctx.lineTo(crop.x + (crop.w * i) / 3, crop.y + crop.h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(crop.x, crop.y + (crop.h * i) / 3); ctx.lineTo(crop.x + crop.w, crop.y + (crop.h * i) / 3); ctx.stroke();
    }

    // Handles
    const handles: Handle[] = aspectRatio ? ["nw", "ne", "sw", "se"] : ["nw", "ne", "sw", "se", "n", "s", "e", "w"];
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    for (const h of handles) {
      const r = getHandleRect(crop, h);
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    }
  }, [crop, displaySize, aspectRatio]);

  useEffect(() => { draw(); }, [draw]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const isTouch = "touches" in e;
    if (isTouch) { e.preventDefault(); e.stopPropagation(); }
    const { x, y } = getPos(e);
    const handle = hitHandle(x, y, crop, aspectRatio, isTouch);
    if (!handle) return;
    dragRef.current = { handle, startX: x, startY: y, startCrop: { ...crop } };
  };

  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const isTouch = "touches" in e;
    if (isTouch) { e.preventDefault(); e.stopPropagation(); }
    const { x, y } = getPos(e);

    if (!dragRef.current) {
      // Update cursor (mouse only)
      if (!isTouch) {
        const handle = hitHandle(x, y, crop, aspectRatio, false);
        canvas.style.cursor = handleCursor(handle);
      }
      return;
    }

    const { handle, startX, startY, startCrop: sc } = dragRef.current;
    const dx = x - startX;
    const dy = y - startY;
    const dw = displaySize.w;
    const dh = displaySize.h;

    let { x: nx, y: ny, w: nw, h: nh } = sc;

    if (handle === "move") {
      nx = clamp(sc.x + dx, 0, dw - sc.w);
      ny = clamp(sc.y + dy, 0, dh - sc.h);
    } else {
      // Resize
      if (handle.includes("e")) nw = clamp(sc.w + dx, MIN_SIZE, dw - sc.x);
      if (handle.includes("s")) nh = clamp(sc.h + dy, MIN_SIZE, dh - sc.y);
      if (handle.includes("w")) { const newW = clamp(sc.w - dx, MIN_SIZE, sc.x + sc.w); nx = sc.x + sc.w - newW; nw = newW; }
      if (handle.includes("n")) { const newH = clamp(sc.h - dy, MIN_SIZE, sc.y + sc.h); ny = sc.y + sc.h - newH; nh = newH; }

      if (aspectRatio) {
        // Lock aspect ratio — use the larger delta
        if (handle.includes("e") || handle.includes("w")) nh = nw / aspectRatio;
        else nw = nh * aspectRatio;
        // Keep anchor corner in place
        if (handle.includes("n")) ny = sc.y + sc.h - nh;
        if (handle.includes("w")) nx = sc.x + sc.w - nw;
        // Clamp
        if (nh > dh - ny) { nh = dh - ny; nw = nh * aspectRatio; }
        if (nw > dw - nx) { nw = dw - nx; nh = nw / aspectRatio; }
        if (nx < 0) { nx = 0; nw = Math.min(nw, dw); nh = nw / aspectRatio; }
        if (ny < 0) { ny = 0; nh = Math.min(nh, dh); nw = nh * aspectRatio; }
      }
    }

    setCrop({ x: nx, y: ny, w: nw, h: nh });
  };

  const onPointerUp = () => { dragRef.current = null; };
  const onTouchEnd = (e: React.TouchEvent) => { e.preventDefault(); e.stopPropagation(); dragRef.current = null; };

  const confirmCrop = () => {
    const img = imageRef.current;
    if (!img || displaySize.w === 0) return;
    const scaleX = img.naturalWidth / displaySize.w;
    const scaleY = img.naturalHeight / displaySize.h;
    const croppedW = Math.round(crop.w * scaleX);
    const croppedH = Math.round(crop.h * scaleY);
    const srcX = crop.x * scaleX;
    const srcY = crop.y * scaleY;

    const out = document.createElement("canvas");
    const ctx = out.getContext("2d");
    if (!ctx) return;

    if (outputRatio) {
      // Fit cropped area into outputRatio canvas, center it, pad with white
      const croppedAspect = croppedW / croppedH;
      let outW: number, outH: number;
      if (croppedAspect > outputRatio) {
        // cropped is wider than target → add top/bottom white bars
        outW = croppedW;
        outH = Math.round(croppedW / outputRatio);
      } else {
        // cropped is taller → add left/right white bars
        outH = croppedH;
        outW = Math.round(croppedH * outputRatio);
      }
      out.width = outW;
      out.height = outH;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
      const offsetX = Math.round((outW - croppedW) / 2);
      const offsetY = Math.round((outH - croppedH) / 2);
      ctx.drawImage(img, srcX, srcY, croppedW, croppedH, offsetX, offsetY, croppedW, croppedH);
    } else {
      out.width = croppedW;
      out.height = croppedH;
      ctx.drawImage(img, srcX, srcY, croppedW, croppedH, 0, 0, croppedW, croppedH);
    }

    onConfirm(out.toDataURL("image/jpeg", 0.92));
  };

  if (displaySize.w === 0) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80">
        <div className="text-sm font-black text-white">Loading…</div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-black/85 p-4"
      style={{ touchAction: "none" }}
      onTouchMove={e => e.preventDefault()}
    >
      <div className="text-sm font-black text-white/80">Drag to move · Drag corners to resize</div>
      <canvas
        ref={canvasRef}
        style={{ maxWidth: "100%", maxHeight: "60vh", touchAction: "none" }}
        className="rounded-md shadow-lg"
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onTouchEnd}
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 rounded-md border border-white/20 bg-white/10 px-5 text-sm font-black text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirmCrop}
          className="h-11 rounded-md bg-white px-6 text-sm font-black text-ink"
        >
          Apply crop
        </button>
      </div>
    </div>
  );
}
