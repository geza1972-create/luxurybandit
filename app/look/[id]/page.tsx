"use client";

export const dynamic = "force-dynamic";

import CropModal from "@/components/CropModal";
import { getClientAccountId } from "@/lib/client-account";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  Download,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  RefreshCw,
  Share2,
  Sparkles,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";

type Look = {
  id: string;
  name: string;
  storeName?: string;
  storeSlug?: string;
  price?: string;
  salePrice?: string;
  discountLabel?: string;
  inStock?: boolean;
  availableSizes?: string[];
  productNote?: string;
  imageUrl: string;
  frontImageUrl?: string;
  garmentFrontImageUrl?: string;
  galleryImageUrls?: string[];
};

type Payload = { looks?: Look[]; error?: string };

const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Photo could not be read."));
    reader.readAsDataURL(file);
  });

const dataUrlToBlob = (dataUrl: string) => {
  const [header, payload] = dataUrl.split(",");
  const mimeType = header.match(/data:(.*?)(;base64)?$/)?.[1] ?? "image/png";
  if (header.includes(";base64")) {
    const bytes = window.atob(payload);
    const arr = Array.from(bytes, (c) => c.charCodeAt(0));
    return new Blob([new Uint8Array(arr)], { type: mimeType });
  }
  return new Blob([decodeURIComponent(payload)], { type: mimeType });
};

const imageUrlToDataUrl = async (src: string) => {
  const res = await fetch(src);
  if (!res.ok) throw new Error("Product image could not be loaded.");
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Product image could not be processed."));
    reader.readAsDataURL(blob);
  });
};

// ── Save button ──────────────────────────────────────────────────────────────
function SaveBtn({ lookId }: { lookId: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try { setSaved((JSON.parse(localStorage.getItem("lb_saved") ?? "[]") as string[]).includes(lookId)); } catch { /**/ }
  }, [lookId]);
  const toggle = () => {
    try {
      const list = JSON.parse(localStorage.getItem("lb_saved") ?? "[]") as string[];
      const next = saved ? list.filter(id => id !== lookId) : [...list, lookId];
      localStorage.setItem("lb_saved", JSON.stringify(next));
      setSaved(!saved);
    } catch { /**/ }
  };
  return (
    <button type="button" onClick={toggle} className="grid h-11 w-11 place-items-center">
      <Heart className={`h-6 w-6 drop-shadow ${saved ? "fill-red-500 text-red-500" : "fill-black/20 text-white"}`} />
    </button>
  );
}

// ── Follow button ────────────────────────────────────────────────────────────
function FollowBtn({ storeSlug, storeName }: { storeSlug: string; storeName: string }) {
  const [following, setFollowing] = useState(false);
  useEffect(() => {
    try { setFollowing((JSON.parse(localStorage.getItem("lb_following") ?? "[]") as string[]).includes(storeSlug)); } catch { /**/ }
  }, [storeSlug]);
  const toggle = () => {
    try {
      const list = JSON.parse(localStorage.getItem("lb_following") ?? "[]") as string[];
      const next = following ? list.filter(s => s !== storeSlug) : [...list, storeSlug];
      localStorage.setItem("lb_following", JSON.stringify(next));
      setFollowing(!following);
    } catch { /**/ }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-black transition ${following ? "bg-white/20 text-white" : "bg-white text-black"}`}
    >
      {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {following ? "Following" : "Follow"}
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function LookPage() {
  const params = useParams();
  const router = useRouter();
  const lookId = String(params?.id ?? "");

  // Look data
  const [look, setLook] = useState<Look | null>(null);
  const [storeLooks, setStoreLooks] = useState<Look[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Gallery
  const [imgIndex, setImgIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  // Panels: 0 = main look, 1 = try-on
  const [panel, setPanel] = useState<0 | 1>(0);

  // Contact form (panel 0)
  const [showContact, setShowContact] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Try-on (panel 1)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accountId, setAccountId] = useState("");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tryOnError, setTryOnError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const generationStartRef = useRef<number | null>(null);

  // Swipe tracking
  const touchStartX = useRef<number | null>(null);   // unused, kept for safety
  const panelStartX = useRef<number | null>(null);
  const panelStartY = useRef<number | null>(null);
  const gallerySwipedRef = useRef(false);            // unused, kept for safety

  useEffect(() => {
    setAccountId(getClientAccountId());
    fetch("/api/try-this-look")
      .then(r => r.json())
      .then((p: Payload) => {
        const all = p.looks ?? [];
        const current = all.find(l => l.id === lookId) ?? null;
        setLook(current);
        if (current?.storeSlug) {
          setStoreLooks(all.filter(l => l.storeSlug === current.storeSlug));
        }
      })
      .finally(() => setIsLoading(false));
  }, [lookId]);

  // Elapsed timer during generation
  useEffect(() => {
    if (!isGenerating) { setElapsedSec(0); generationStartRef.current = null; return; }
    if (!generationStartRef.current) generationStartRef.current = Date.now();
    const t = setInterval(() => setElapsedSec(Math.floor((Date.now() - (generationStartRef.current ?? Date.now())) / 1000)), 1000);
    return () => clearInterval(t);
  }, [isGenerating]);

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-black">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
    </div>
  );

  if (!look) return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black text-white">
      <span className="text-5xl">🛍️</span>
      <p className="text-sm font-black opacity-50">Listing not found</p>
      <button type="button" onClick={() => router.back()} className="text-xs font-black underline opacity-50">Go back</button>
    </div>
  );

  const images = [look.frontImageUrl ?? look.imageUrl, ...(look.galleryImageUrls ?? [])].filter(Boolean) as string[];
  const isSoldOut = look.inStock === false;
  const displayPrice = look.salePrice ?? look.price;
  const storeKey = look.storeSlug ?? look.storeName ?? "store";
  const garmentUrl = look.garmentFrontImageUrl ?? look.frontImageUrl ?? look.imageUrl;

  // ── Gallery navigation ──
  const prev = () => setImgIndex(i => (i - 1 + images.length) % images.length);
  const next = () => setImgIndex(i => (i + 1) % images.length);

  // ── Unified touch handler (outer container) ──
  const onPanelTouchStart = (e: React.TouchEvent) => {
    panelStartX.current = e.touches[0].clientX;
    panelStartY.current = e.touches[0].clientY;
  };
  const onPanelTouchEnd = (e: React.TouchEvent) => {
    if (panelStartX.current === null || panelStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - panelStartX.current;
    const dy = e.changedTouches[0].clientY - panelStartY.current;
    panelStartX.current = null;
    panelStartY.current = null;

    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    // Vertical swipe → navigate store looks (panel 0 only, vertical dominates)
    if (panel === 0 && ady >= 70 && ady > adx * 1.5) {
      const idx = storeLooks.findIndex(l => l.id === lookId);
      if (dy < 0 && idx < storeLooks.length - 1) {
        router.push(`/look/${storeLooks[idx + 1].id}`);
      } else if (dy > 0 && idx > 0) {
        router.push(`/look/${storeLooks[idx - 1].id}`);
      }
      return;
    }

    // Horizontal swipe (must dominate)
    if (adx < 40 || adx < ady * 1.2) return;

    // Short horizontal swipe → gallery image (panel 0, multi-image)
    if (panel === 0 && adx < 130 && images.length > 1) {
      dx < 0 ? next() : prev();
      return;
    }

    // Long horizontal swipe → panel change
    if (adx >= 80) {
      if (dx < 0 && panel === 0) setPanel(1);
      if (dx > 0 && panel === 1) setPanel(0);
    }
  };

  // ── Contact form submission ──
  const handleContact = async () => {
    if (!buyerName.trim() || !buyerPhone.trim()) return;
    setSending(true);
    try {
      await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lead",
          lookId: look.id,
          customerName: buyerName.trim(),
          phone: buyerPhone.trim(),
          storeName: look.storeName,
          lookName: look.name,
          leadSource: "contact-form",
        }),
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  // ── Try-on: photo upload ──
  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!SUPPORTED_TYPES.includes(file.type)) {
      setTryOnError("Please upload a JPG, PNG or WebP photo.");
      e.target.value = "";
      return;
    }
    setTryOnError(null);
    setResultImage(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setCropSrc(dataUrl);
    } catch {
      setTryOnError("Photo could not be loaded.");
    }
    e.target.value = "";
  };

  // ── Try-on: generate ──
  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setTryOnError(null);
    setResultImage(null);
    generationStartRef.current = Date.now();
    try {
      const garmentData = await imageUrlToDataUrl(garmentUrl);
      const formData = new FormData();
      formData.append("image", dataUrlToBlob(garmentData), `${look.id}.jpg`);
      if (userPhoto) formData.append("modelImage", dataUrlToBlob(userPhoto), "user-photo.jpg");
      formData.append("visitorId", accountId || "anon");
      formData.append("lookId", look.id);
      formData.append("mode", "fashion-model");
      formData.append("aspectRatio", "4:5");
      formData.append(
        "prompt",
        userPhoto
          ? [
              "Fashion try-on: dress the uploaded person in the selected garment.",
              "Preserve the person's face, hair, skin tone, and identity exactly.",
              "Use the garment image as the complete outfit reference.",
              "Remove the person's original clothing completely.",
              `Look: ${look.name}.`,
            ].join(" ")
          : [
              "Fashion campaign image. Professional adult AI fashion model wearing the selected garment.",
              "Preserve the garment type, structure, silhouette, colors, and proportions exactly.",
              `Look: ${look.name}.`,
            ].join(" ")
      );
      const billingId = accountId.startsWith("user-") ? accountId : `visitor-${accountId || "anon"}`;
      const res = await fetch("/api/generate-fashn", {
        method: "POST",
        body: formData,
        headers: { "x-shopcut-account-id": billingId },
      });
      const payload = await res.json() as { image?: string; error?: string };
      if (res.status === 402) { setTryOnError("No credits. Buy credits on the Try-This-Look page."); return; }
      if (!res.ok || !payload.image) throw new Error(payload.error ?? "Generation failed.");
      setResultImage(payload.image);
    } catch (err) {
      setTryOnError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.download = "luxurybandit-try-this-look.png";
    a.href = resultImage;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const loadingProgress = Math.min(92, 10 + elapsedSec * 1.4);

  return (
    <div
      className="relative w-full overflow-hidden bg-black"
      style={{ height: "100dvh" }}
      onTouchStart={onPanelTouchStart}
      onTouchEnd={onPanelTouchEnd}
    >
      {/* ── Two-panel slider ── */}
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ width: "200%", transform: `translateX(${panel === 1 ? "-50%" : "0"})` }}
      >

        {/* ═══════════════════════════════════════════════
            PANEL 0 — Main look view
        ═══════════════════════════════════════════════ */}
        <div className="relative h-full" style={{ width: "50%" }}>

          {/* Full-screen image */}
          <div className="absolute inset-0">
            {images[imgIndex] && (
              <Image src={images[imgIndex]} alt={look.name} fill sizes="100vw" className="object-cover object-top" priority />
            )}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 to-transparent" />
          </div>

          {/* Top bar */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-3 pt-12">
            <button type="button" onClick={() => router.back()}
              className="grid h-11 w-11 place-items-center rounded-full bg-black/30 text-white backdrop-blur">
              <ChevronLeft className="h-6 w-6" />
            </button>

            {images.length > 1 && (
              <div className="flex gap-1">
                {images.map((_, i) => (
                  <button key={i} type="button" onClick={() => setImgIndex(i)}
                    className={`h-1 rounded-full transition-all ${i === imgIndex ? "w-5 bg-white" : "w-1.5 bg-white/40"}`} />
                ))}
              </div>
            )}

            <div className="flex items-center gap-1">
              <SaveBtn lookId={look.id} />
              <button type="button"
                onClick={() => navigator.share?.({ title: look.name, url: window.location.href }).catch(() => {})}
                className="grid h-11 w-11 place-items-center">
                <Share2 className="h-5 w-5 text-white drop-shadow" />
              </button>
            </div>
          </div>

          {/* Sold-out overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
              <span className="rounded-full bg-white px-6 py-2 text-sm font-black uppercase tracking-widest text-black">Sold out</span>
            </div>
          )}

          {/* Bottom info */}
          <div className="absolute inset-x-0 bottom-0 z-20 px-4" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom) + 0.75rem)" }}>
            <div className="mb-3 flex items-center gap-2">
              <button type="button" onClick={() => look.storeSlug ? router.push(`/store/${look.storeSlug}`) : undefined}
                className="flex items-center gap-2 active:opacity-70">
                <span className="flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(storeKey)}&backgroundColor=ffffff&color=000000`} alt="" className="h-full w-full object-cover" />
                </span>
                <span className="text-sm font-black text-white drop-shadow">{look.storeName ?? storeKey}</span>
              </button>
              <FollowBtn storeSlug={storeKey} storeName={look.storeName ?? storeKey} />
            </div>

            <h1 className="text-xl font-black leading-tight text-white drop-shadow">{look.name}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {look.discountLabel && <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-black text-white">{look.discountLabel}</span>}
              {look.salePrice && <span className="text-lg font-black text-white">{look.salePrice}</span>}
              {look.price && <span className={`text-base font-black ${look.salePrice ? "text-white/40 line-through" : "text-white"}`}>{look.price}</span>}
            </div>

            {(look.availableSizes ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {look.availableSizes!.map(size => (
                  <span key={size} className="rounded-full border border-white/40 px-3 py-1 text-xs font-black text-white">{size}</span>
                ))}
              </div>
            )}

            {look.productNote && (
              <button type="button" onClick={() => setShowInfo(v => !v)} className="mt-2 text-left text-xs font-bold text-white/60">
                {showInfo ? look.productNote : `${look.productNote.slice(0, 60)}${look.productNote.length > 60 ? "… more" : ""}`}
              </button>
            )}

            {/* Hint: swipe left */}
            <p className="mt-2 text-[10px] font-bold text-white/30">← nach links wischen für Try This Look</p>

            <div className="mt-3 grid gap-2">
              {!isSoldOut ? (
                <>
                  <button type="button" onClick={() => setShowContact(true)}
                    className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-black text-base font-black text-white shadow-xl active:scale-95 transition-transform">
                    <MessageCircle className="h-5 w-5" />
                    Interesse melden
                  </button>
                  <button type="button" onClick={() => setPanel(1)}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/15 text-sm font-black text-white backdrop-blur active:scale-95 transition-transform">
                    <Sparkles className="h-4 w-4" />
                    Try This Look
                  </button>
                </>
              ) : (
                <div className="flex h-14 w-full items-center justify-center rounded-2xl bg-white/10 text-base font-black text-white/40">
                  Sold out
                </div>
              )}
            </div>
          </div>

          {/* Tap zones for gallery */}
          {images.length > 1 && (
            <>
              <button type="button" onClick={prev} className="absolute left-0 top-1/4 z-10 h-1/2 w-1/4" aria-label="Previous" />
              <button type="button" onClick={next} className="absolute right-0 top-1/4 z-10 h-1/2 w-1/4" aria-label="Next" />
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════════
            PANEL 1 — Try This Look
        ═══════════════════════════════════════════════ */}
        <div className="relative h-full overflow-y-auto bg-[#fbfaf7]" style={{ width: "50%" }}>
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
            <button type="button" onClick={() => setPanel(0)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 text-ink">
              <X className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[0]} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover border border-black/10" />
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-ink">{look.name}</p>
                {displayPrice && <p className="text-[10px] font-bold text-ink/50">{displayPrice}</p>}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cobalt" />
              <span className="text-xs font-black text-cobalt">Try This Look</span>
            </div>
          </div>

          <div className="grid gap-4 p-4 pb-10">

            {/* Side-by-side: your photo + the look */}
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">

                {/* Left: user photo */}
                <div className="grid gap-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-ink/40">Your photo</p>
                  {userPhoto ? (
                    <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-black/10 bg-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={userPhoto} alt="Your photo" className="h-full w-full object-cover object-top" />
                      <button type="button" onClick={() => { setUserPhoto(null); setResultImage(null); }}
                        className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 bg-black/[0.02] text-ink/35 hover:border-cobalt/40 hover:text-cobalt transition">
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-[10px] font-black">Upload</span>
                    </button>
                  )}
                </div>

                {/* Right: the look */}
                <div className="grid gap-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-ink/40">This look</p>
                  <div className="aspect-[3/4] overflow-hidden rounded-xl border border-black/10 bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={garmentUrl} alt={look.name} className="h-full w-full object-cover object-top" />
                  </div>
                </div>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white text-xs font-black text-ink">
                <ImagePlus className="h-3.5 w-3.5" />
                {userPhoto ? "Change photo" : "Upload your photo"}
              </button>
            </div>

            {/* Generate button — only when photo is uploaded */}
            {userPhoto ? (
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerate}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-cobalt text-base font-black text-white disabled:opacity-50 active:scale-95 transition-transform shadow-xl"
              >
                {isGenerating
                  ? <><Loader2 className="h-5 w-5 animate-spin" /> Generating… {elapsedSec}s</>
                  : <><Sparkles className="h-5 w-5" /> Try this look on me</>
                }
              </button>
            ) : (
              <p className="rounded-xl border border-black/8 bg-white p-4 text-center text-sm font-bold text-ink/40">
                Upload your photo to try this look on yourself.
              </p>
            )}

            {/* Progress bar */}
            {isGenerating && (
              <div className="overflow-hidden rounded-full bg-black/10 h-2">
                <div className="h-full rounded-full bg-cobalt transition-all duration-700" style={{ width: `${loadingProgress}%` }} />
              </div>
            )}

            {/* Error */}
            {tryOnError && (
              <div className="rounded-xl border border-coral/25 bg-coral/10 p-4 text-sm font-black text-coral">{tryOnError}</div>
            )}

            {/* Result */}
            {resultImage && (
              <div className="grid gap-3 rounded-xl border border-black/10 bg-white p-4 shadow-soft">
                <p className="text-sm font-black text-ink">Your look ✨</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultImage} alt="Try-on Ergebnis" className="w-full rounded-lg border border-black/10 object-contain" />
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={downloadResult}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-ink text-xs font-black text-white">
                    <Download className="h-4 w-4" /> Save
                  </button>
                  <button type="button"
                    onClick={() => navigator.share?.({ title: look.name, url: window.location.href }).catch(() => {})}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-coral text-xs font-black text-white">
                    <Share2 className="h-4 w-4" /> Teilen
                  </button>
                  <button type="button" onClick={() => { setResultImage(null); setUserPhoto(null); }}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white text-xs font-black text-ink">
                    <RefreshCw className="h-4 w-4" /> Retry
                  </button>
                </div>
                {/* CTA to buy */}
                {!isSoldOut && (
                  <button type="button" onClick={() => { setPanel(0); setShowContact(true); }}
                    className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-sm font-black text-white active:scale-95 transition-transform">
                    <MessageCircle className="h-4 w-4" /> Interesse melden
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Contact form sheet (panel 0) ── */}
      {showContact && (
        <div className="absolute inset-0 z-30 flex items-end bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowContact(false); setSent(false); } }}>
          <div className="w-full rounded-t-2xl bg-white px-5 pt-5 pb-8">
            {sent ? (
              <div className="py-6 text-center">
                <div className="mb-3 text-4xl">✅</div>
                <p className="text-base font-black text-black">Anfrage gesendet!</p>
                <p className="mt-1 text-sm font-bold text-black/50">Der Seller meldet sich bei dir.</p>
                <button type="button" onClick={() => { setShowContact(false); setSent(false); }}
                  className="mt-5 h-12 w-full rounded-2xl bg-black text-sm font-black text-white">Schließen</button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-black text-black">Interesse melden</h2>
                  <button type="button" onClick={() => setShowContact(false)} className="text-xs font-bold text-black/40">Abbrechen</button>
                </div>
                <div className="grid gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black/40">Dein Name</label>
                    <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="z.B. Anna"
                      className="h-12 w-full rounded-xl border border-black/10 bg-black/[0.04] px-4 text-sm font-bold outline-none focus:border-black" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black/40">Deine Telefonnummer</label>
                    <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="+40 7xx xxx xxx"
                      className="h-12 w-full rounded-xl border border-black/10 bg-black/[0.04] px-4 text-sm font-bold outline-none focus:border-black" />
                  </div>
                  <p className="text-xs font-bold text-black/35">Der Seller sieht deine Nummer und entscheidet ob er dich kontaktiert.</p>
                  <button type="button" disabled={!buyerName.trim() || !buyerPhone.trim() || sending} onClick={handleContact}
                    className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-black text-base font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
                    {sending ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Anfrage senden"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Crop modal ── */}
      {cropSrc && (
        <CropModal
          imageSrc={cropSrc}
          onConfirm={(cropped) => { setUserPhoto(cropped); setCropSrc(null); setResultImage(null); }}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
