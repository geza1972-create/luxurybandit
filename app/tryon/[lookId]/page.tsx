"use client";

export const dynamic = "force-dynamic";

import CropModal from "@/components/CropModal";
import { getClientAccountId } from "@/lib/client-account";
import {
  getStoredAuthSession,
  signInWithPassword,
  signUpWithPassword,
  resetPassword,
  type SupabaseAuthSession,
} from "@/lib/supabase-auth-client";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  ArrowRight, ChevronLeft, Download, ImagePlus,
  Loader2, RefreshCw, Send, Sparkles, X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Look = {
  id: string; name: string; storeName?: string; storeSlug?: string;
  price?: string; salePrice?: string; inStock?: boolean;
  imageUrl: string; frontImageUrl?: string; garmentFrontImageUrl?: string;
  galleryImageUrls?: string[];
};

type Step = "upload" | "crop" | "confirm" | "generating" | "result";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const bytes = atob(b64);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

async function imageUrlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  // Guard: a relative/404 URL makes the dev server return the HTML app shell,
  // which would be sent to the AI as a bogus "image". Only accept real images.
  if (!res.ok || !blob.type.startsWith("image/")) {
    throw new Error(`Not an image (status ${res.status}, type ${blob.type || "unknown"})`);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Try each candidate URL in order; return the first that yields a real image.
async function firstValidImageDataUrl(urls: (string | undefined)[]): Promise<string> {
  const candidates = urls.filter((u): u is string => !!u && /^https?:\/\//i.test(u));
  for (const u of candidates) {
    try {
      return await imageUrlToDataUrl(u);
    } catch {
      /* try next candidate */
    }
  }
  throw new Error("No valid garment image found for this look.");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TryonPage() {
  const params = useParams();
  const router = useRouter();
  const lookId = String(params?.lookId ?? "");

  const [look, setLook] = useState<Look | null>(null);
  const [isLoadingLook, setIsLoadingLook] = useState(true);

  const [step, setStep] = useState<Step>("upload");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [sharedToGallery, setSharedToGallery] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareNameInput, setShareNameInput] = useState("");
  const [accountId, setAccountId] = useState("");

  // Auth
  const [authSession, setAuthSession] = useState<SupabaseAuthSession | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "reset">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generationStartRef = useRef<number | null>(null);
  const pendingGenerateRef = useRef(false);

  // ── Load look ──
  useEffect(() => {
    setAccountId(getClientAccountId());
    const session = getStoredAuthSession();
    setAuthSession(session);

    // If user has a saved model photo (from "✨ Foto nutzen"), pre-load it into confirm step
    try {
      const saved = sessionStorage.getItem("lb_model_image");
      if (saved) {
        setUserPhoto(saved);
        setStep("confirm");
      }
    } catch { /**/ }

    fetch(`/api/try-this-look?previewId=${encodeURIComponent(lookId)}`)
      .then(r => r.json())
      .then((p: { look?: Look }) => { if (p.look) setLook(p.look); })
      .catch(() => {})
      .finally(() => setIsLoadingLook(false));
  }, [lookId]);

  // ── Progress timer ──
  useEffect(() => {
    if (step === "generating") {
      generationStartRef.current = Date.now();
      setProgress(0); setElapsedSec(0);
      timerRef.current = setInterval(() => {
        const sec = (Date.now() - (generationStartRef.current ?? Date.now())) / 1000;
        setElapsedSec(Math.floor(sec));
        setProgress(Math.min(92, 5 + sec * 3.2));
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  // ── File pick ──
  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = ev => {
      setCropSrc(ev.target?.result as string);
      setStep("crop");
    };
    reader.readAsDataURL(file);
  };

  // ── Crop confirmed ──
  const handleCropConfirm = (croppedDataUrl: string) => {
    setUserPhoto(croppedDataUrl);
    setCropSrc(null);
    setStep("confirm");
  };

  // ── Generate ──
  const handleGenerate = async () => {
    if (!authSession) { pendingGenerateRef.current = true; setShowAuth(true); return; }
    if (!look) return;
    setError(null);
    setStep("generating");
    try {
      const garmentData = await firstValidImageDataUrl([
        look.garmentFrontImageUrl,
        look.frontImageUrl,
        look.imageUrl,
        look.galleryImageUrls?.[0],
      ]);
      const formData = new FormData();
      formData.append("image", dataUrlToBlob(garmentData), `${look.id}.jpg`);
      if (userPhoto) formData.append("modelImage", dataUrlToBlob(userPhoto), "user-photo.jpg");
      formData.append("visitorId", accountId || "anon");
      formData.append("lookId", look.id);
      formData.append("mode", "fashion-model");
      formData.append("aspectRatio", "9:16");
      const coverageRule = "Coverage rule: the generated image must keep the person at least as covered as in the original photo. Never expose more skin, remove undergarments, or show less clothing than the input. No nudity; keep intimate areas (chest, groin, buttocks) covered at all times.";
      formData.append("prompt", userPhoto
        ? `Full-body virtual fashion try-on. Show the entire person from head to toe wearing the complete selected outfit. Replace the person's current clothing with the selected garment so the whole look is visible. Preserve the person's face, hair, skin tone, and identity exactly. Full-length framing. ${coverageRule} Look: ${look.name}.`
        : `Full-body fashion campaign image. Professional AI model shown head to toe wearing the complete selected outfit. Full-length framing. ${coverageRule} Look: ${look.name}.`
      );
      const billingId = accountId.startsWith("user-") ? accountId : `visitor-${accountId || "anon"}`;
      const res = await fetch("/api/generate-fashn", {
        method: "POST", body: formData,
        headers: { "x-shopcut-account-id": billingId },
      });
      const payload = await res.json() as { image?: string; error?: string };
      if (res.status === 402) { setError("No credits. Buy credits first."); setStep("confirm"); return; }
      if (!res.ok || !payload.image) throw new Error(payload.error ?? "Generation failed.");
      setResultImage(payload.image);
      setProgress(100);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
      setStep("confirm");
    }
  };

  // ── Auth submit ──
  const handleAuth = async () => {
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    try {
      if (authMode === "login") {
        await signInWithPassword(authEmail.trim(), authPassword);
        const fresh = getStoredAuthSession();
        setAuthSession(fresh);
        setShowAuth(false);
        if (pendingGenerateRef.current) { pendingGenerateRef.current = false; setTimeout(() => void handleGenerate(), 100); }
      } else if (authMode === "signup") {
        const { confirmationRequired } = await signUpWithPassword(authEmail.trim(), authPassword, authName.trim() || undefined);
        if (confirmationRequired) { setAuthSuccess("Account created! Please confirm your email, then sign in."); setAuthMode("login"); }
        else {
          const fresh = getStoredAuthSession();
          setAuthSession(fresh);
          setShowAuth(false);
          if (pendingGenerateRef.current) { pendingGenerateRef.current = false; setTimeout(() => void handleGenerate(), 100); }
        }
      } else {
        await resetPassword(authEmail.trim());
        setAuthSuccess("Check your inbox for a reset link.");
      }
    } catch (err) { setAuthError(err instanceof Error ? err.message : "Error. Please try again."); }
    finally { setAuthLoading(false); }
  };

  // ── Share to gallery ──
  const handleShare = async () => {
    if (!resultImage || !look) return;
    setIsSharing(true);
    try {
      const meta = (authSession?.user as any)?.user_metadata ?? {};
      const name = shareNameInput.trim() || meta.username || meta.full_name || "Anonymous";
      await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generation", lookId: look.id,
          visitorId: accountId || "anon",
          lookName: look.name, storeName: look.storeName,
          customerName: name, userId: authSession?.user?.id ?? undefined,
          image: resultImage, userPhotoImage: userPhoto,
        }),
      });
      setSharedToGallery(true);
    } catch { /**/ } finally { setIsSharing(false); }
  };

  // ── Download ──
  const handleDownload = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage; a.download = `luxurybandit-tryon.jpg`; a.click();
  };

  // ─── Loading ───
  if (isLoadingLook) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-black/20 border-t-black animate-spin" />
      </div>
    );
  }

  if (!look) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm font-black text-black/40">Look not found</p>
        <button onClick={() => router.back()} className="text-sm font-black underline">Go back</button>
      </div>
    );
  }

  // Use frontImageUrl for display — it always has a fresh signed URL.
  // garmentFrontImageUrl is for AI generation only (may be expired on legacy looks).
  const garmentPreviewUrl = look.frontImageUrl ?? look.imageUrl ?? (look.galleryImageUrls?.[0] ?? "");
  // Garment image for AI generation is resolved at call time in handleGenerate
  // (firstValidImageDataUrl), with a validated fallback chain.
  const lookBackPath = `/look/${look.id}`;

  // Fallback chain: garmentFrontImageUrl → frontImageUrl → imageUrl → galleryImageUrls[0]
  const garmentFallbacks = [
    look.frontImageUrl,
    look.imageUrl,
    ...(look.galleryImageUrls ?? []),
  ].filter((u): u is string => !!u);

  const onGarmentError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    const tried = el.dataset.tried ? parseInt(el.dataset.tried) : 0;
    const next = garmentFallbacks[tried];
    if (next && el.src !== next) {
      el.dataset.tried = String(tried + 1);
      el.src = next;
    }
  };

  // ─── CROP STEP ───
  if (step === "crop" && cropSrc) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <CropModal
          imageSrc={cropSrc}
          aspectRatio={9 / 16}
          onConfirm={handleCropConfirm}
          onCancel={() => { setCropSrc(null); setStep("upload"); }}
        />
      </div>
    );
  }

  // ─── GENERATING STEP ───
  if (step === "generating") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 gap-8 px-6">
        {/* Side by side preview */}
        <div className="flex items-center gap-4 w-full max-w-xs">
          <div className="flex-1 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/30 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={garmentPreviewUrl} alt={look.name} className="h-full w-full object-contain" onError={onGarmentError} />
          </div>
          <ArrowRight className="h-8 w-8 text-white/60 shrink-0" />
          <div className="flex-1 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/30 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {userPhoto && <img src={userPhoto} alt="Your photo" className="h-full w-full object-cover object-top blur-sm scale-110" />}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="white" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute text-xs font-black text-white">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-lg font-black text-white">Generating your look…</p>
          <p className="mt-1 text-sm font-bold text-white/60">{elapsedSec}s — please wait</p>
        </div>
      </div>
    );
  }

  // ─── RESULT STEP ───
  if (step === "result" && resultImage) {
    return (
      <div className="min-h-screen bg-white flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-12 pb-3 border-b border-black/10">
          <button onClick={() => router.push(lookBackPath)}
            className="grid h-10 w-10 place-items-center rounded-full bg-black/5">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="flex-1 text-sm font-black">Your look ✨</p>
          <button onClick={handleDownload}
            className="grid h-10 w-10 place-items-center rounded-full bg-black/5">
            <Download className="h-5 w-5" />
          </button>
        </div>

        {/* Result image */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 flex flex-col gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultImage} alt="Your try-on result" className="w-full rounded-2xl border border-black/10 object-contain shadow-lg" />

          {/* Share to gallery */}
          {sharedToGallery ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-sm font-black text-emerald-700">✓ Posted to the look gallery!</p>
              <button onClick={() => router.push(lookBackPath)}
                className="mt-3 text-sm font-black text-emerald-600 underline">
                View on look page →
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 flex flex-col gap-3">
              <p className="text-sm font-black">Share to community gallery</p>
              <input
                value={shareNameInput}
                onChange={e => setShareNameInput(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full rounded-xl border border-black/15 px-3 py-2.5 text-sm outline-none focus:border-black"
              />
              <button onClick={() => void handleShare()} disabled={isSharing}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
                {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Post to gallery</>}
              </button>
            </div>
          )}

          {/* Try again */}
          <button onClick={() => { setResultImage(null); setUserPhoto(null); setStep("upload"); }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-black/15 text-sm font-black active:opacity-70">
            <RefreshCw className="h-4 w-4" /> Try a different photo
          </button>
        </div>
      </div>
    );
  }

  // ─── CONFIRM STEP ───
  if (step === "confirm" && userPhoto) {
    return (
      <div className="min-h-screen bg-black flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {/* Blurred bg */}
        <div className="fixed inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={userPhoto} alt="" className="h-full w-full object-cover blur-2xl scale-110 opacity-60" />
          <div className="absolute inset-0 bg-black/50" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col min-h-screen px-5 pt-14 gap-6 justify-end"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}>
          {/* Back */}
          <button onClick={() => setStep("upload")}
            className="absolute top-12 left-4 grid h-10 w-10 place-items-center rounded-full bg-black/30 text-white">
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Side by side */}
          <div className="flex items-center gap-4">
            <div className="flex-1 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/60 bg-white shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={garmentPreviewUrl} alt={look.name} className="h-full w-full object-contain" onError={onGarmentError} />
            </div>
            <ArrowRight className="h-8 w-8 text-white drop-shadow-lg shrink-0" />
            <div className="flex-1 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={userPhoto} alt="Your photo" className="h-full w-full object-cover object-top" />
            </div>
          </div>

          {/* Message */}
          <div className="text-center">
            <p className="text-lg font-black text-white [text-shadow:0_2px_8px_#000]">Send this photo to AI?</p>
            <p className="mt-1 text-sm font-bold text-white/70">You will be shown wearing this look</p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/20 p-3 text-sm text-white">
              <p className="font-black">{error}</p>
              {error.toLowerCase().includes("rejected") && (
                <ul className="mt-1.5 text-xs text-white/80 list-disc pl-4 space-y-0.5">
                  <li>Use a full-body standing photo to see the whole look</li>
                  <li>Good lighting, face clearly visible</li>
                  <li>No heavy filters or cropped faces</li>
                </ul>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="grid gap-2">
            <button onClick={() => void handleGenerate()}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-base font-black text-black shadow-xl active:scale-95 transition-transform">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Yes, try the look
              <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-600">2 credits</span>
            </button>
            <button onClick={() => { setUserPhoto(null); fileInputRef.current?.click(); }}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-white/20 text-sm font-black text-white backdrop-blur active:opacity-70">
              Upload a different photo
            </button>
            <button onClick={() => router.push(lookBackPath)}
              className="flex h-12 w-full items-center justify-center rounded-2xl bg-white/10 text-sm font-bold text-white/70 active:opacity-70">
              No, cancel
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
      </div>
    );
  }

  // ─── UPLOAD STEP (default) ───
  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-black/10">
        <button onClick={() => router.push(lookBackPath)}
          className="grid h-10 w-10 place-items-center rounded-full bg-black/5">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-black/40 truncate">{look.storeName}</p>
          <p className="text-sm font-black truncate">{look.name}</p>
        </div>
        {look.price && <p className="text-sm font-black shrink-0">{look.salePrice ?? look.price}</p>}
      </div>

      {/* Look preview + upload */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {/* Look image */}
        <div className="w-48 aspect-[3/4] rounded-2xl overflow-hidden border border-black/10 shadow-lg bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={garmentPreviewUrl} alt={look.name} className="h-full w-full object-contain" onError={onGarmentError} />
        </div>

        {/* Instructions */}
        <div className="text-center">
          <p className="text-xl font-black">Try this look on you</p>
          <p className="mt-1 text-sm text-black/50">Upload a photo and AI will dress you in this outfit</p>
        </div>

        {/* Upload button */}
        <button onClick={() => fileInputRef.current?.click()}
          className="flex h-14 w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-black text-white text-base font-black shadow-xl active:scale-95 transition-transform">
          <ImagePlus className="h-5 w-5" />
          Upload your photo
        </button>

        {/* Tips */}
        <div className="w-full max-w-xs rounded-xl border border-black/8 bg-black/[0.03] p-4">
          <p className="text-xs font-black text-black/50 mb-2">Photo tips for best results:</p>
          <ul className="text-xs text-black/40 space-y-1 list-disc pl-4">
            <li>Full body, standing — to see the whole look</li>
            <li>Good lighting, face clearly visible</li>
            <li>No heavy filters</li>
          </ul>
        </div>
      </div>

      {/* Auth modal */}
      {showAuth && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowAuth(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[51] rounded-t-2xl bg-white px-5 pt-5"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            <div className="flex items-center justify-between mb-5">
              <p className="text-base font-black">
                {authMode === "login" ? "Sign in to try the look" : authMode === "signup" ? "Create account" : "Reset password"}
              </p>
              <button onClick={() => setShowAuth(false)} className="grid h-8 w-8 place-items-center rounded-full bg-black/5">
                <X className="h-4 w-4" />
              </button>
            </div>
            {authSuccess ? (
              <p className="text-sm font-bold text-emerald-600 mb-4">{authSuccess}</p>
            ) : (
              <div className="grid gap-3">
                {authMode === "signup" && (
                  <input value={authName} onChange={e => setAuthName(e.target.value)}
                    placeholder="Name" className="w-full rounded-xl border border-black/15 px-3 py-3 text-sm outline-none focus:border-black" />
                )}
                <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                  placeholder="Email" className="w-full rounded-xl border border-black/15 px-3 py-3 text-sm outline-none focus:border-black" />
                {authMode !== "reset" && (
                  <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)}
                    placeholder="Password" className="w-full rounded-xl border border-black/15 px-3 py-3 text-sm outline-none focus:border-black" />
                )}
                {authError && <p className="text-xs font-bold text-red-500">{authError}</p>}
                <button onClick={() => void handleAuth()} disabled={authLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
                  {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : authMode === "login" ? "Sign in" : authMode === "signup" ? "Create account" : "Send reset link"}
                </button>
              </div>
            )}
            <div className="mt-4 flex justify-center gap-4 text-xs font-bold text-black/40">
              {authMode !== "login" && <button onClick={() => setAuthMode("login")}>Sign in</button>}
              {authMode !== "signup" && <button onClick={() => setAuthMode("signup")}>Create account</button>}
              {authMode !== "reset" && <button onClick={() => setAuthMode("reset")}>Forgot password</button>}
            </div>
          </div>
        </>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
    </div>
  );
}
