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
  Loader2, Lock, RefreshCw, Send, Sparkles, X, Film, Volume2, VolumeX,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Look = {
  id: string; name: string; storeName?: string; storeSlug?: string;
  price?: string; salePrice?: string; inStock?: boolean;
  imageUrl: string; frontImageUrl?: string; garmentFrontImageUrl?: string;
  galleryImageUrls?: string[];
  lingerie?: boolean;
  alternatives?: { title: string; link: string; thumbnail: string; price?: string; source?: string }[];
};

type Step = "upload" | "crop" | "confirm" | "generating" | "result" | "locked";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Shrink a (possibly multi-MB PNG) data URL to a compact JPEG before sending it
// in a JSON body — Vercel rejects request bodies over ~4.5MB, which silently
// dropped feed posts on production (worked locally where there's no such limit).
async function compressDataUrl(dataUrl: string, maxDim = 1080, quality = 0.85): Promise<string> {
  if (!dataUrl.startsWith("data:image/")) return dataUrl;
  try {
    return await new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  } catch { return dataUrl; }
}

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

// Crop a person photo to roughly the head + shoulders (drop the lower body). Used
// before sending the photo to Pixverse reference mode so a revealing input (e.g. a
// bikini selfie) doesn't trip moderation — and the face stays the clear reference.
function cropToFace(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const cw = img.width;
      const ch = Math.max(1, Math.round(img.height * 0.52)); // keep top ~half
      const canvas = document.createElement("canvas");
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(src); return; }
      ctx.drawImage(img, 0, 0, cw, ch, 0, 0, cw, ch);
      try { resolve(canvas.toDataURL("image/jpeg", 0.9)); } catch { resolve(src); }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

// Grab the first frame of a video as a still (the lingerie "Photo" tier — the photo
// is a frame of the reference video, so no separate FASHN generation is needed).
// Fetches via blob (object URL) so the canvas isn't CORS-tainted.
async function extractFirstFrame(videoUrl: string): Promise<string | null> {
  try {
    const blob = await (await fetch(videoUrl)).blob();
    const objUrl = URL.createObjectURL(blob);
    return await new Promise<string | null>((resolve) => {
      const v = document.createElement("video");
      v.muted = true; (v as HTMLVideoElement & { playsInline?: boolean }).playsInline = true;
      v.onloadeddata = () => { try { v.currentTime = 0.05; } catch { resolve(null); } };
      v.onseeked = () => {
        try {
          const c = document.createElement("canvas");
          c.width = v.videoWidth; c.height = v.videoHeight;
          const ctx = c.getContext("2d");
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(v, 0, 0);
          resolve(c.toDataURL("image/jpeg", 0.92));
        } catch { resolve(null); } finally { URL.revokeObjectURL(objUrl); }
      };
      v.onerror = () => { URL.revokeObjectURL(objUrl); resolve(null); };
      v.src = objUrl;
    });
  } catch { return null; }
}

// Try each candidate URL in order; return the first that yields a real image.
async function firstValidImageDataUrl(urls: (string | undefined)[]): Promise<string> {
  // Allow same-origin relative URLs too (e.g. /api/img-proxy?... used to fetch
  // CORS-blocked CDN thumbnails like the gstatic lingerie-card image).
  const candidates = urls.filter((u): u is string => !!u && (/^https?:\/\//i.test(u) || u.startsWith("/")));
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
  // Try-on video (auto-generated from the result image; charged in credits)
  const [videoStatus, setVideoStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [videoProgress, setVideoProgress] = useState(0);
  const videoProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoNote, setVideoNote] = useState<string | null>(null);
  const [videoMuted, setVideoMuted] = useState(true);
  // Consent to show this try-on in the look's feed carousel (default on).
  const [showInFeed, setShowInFeed] = useState(true);
  const sharedGenIdRef = useRef<string>("");
  // Optional email capture AFTER the result (lead) — for no-login QR/event try-ons.
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSending, setLeadSending] = useState(false);
  const [leadDone, setLeadDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [genMessage, setGenMessage] = useState("Generating your look…");
  const [sharedToGallery, setSharedToGallery] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareNameInput, setShareNameInput] = useState("");
  const [accountId, setAccountId] = useState("");

  // Profile photo as try-on base (creators) — gated behind a one-time consent
  const [curatorPhotoUrl, setCuratorPhotoUrl] = useState<string | null>(null);
  const [curatorId, setCuratorId] = useState("");
  const [curatorName, setCuratorName] = useState("");
  const [showPhotoConsent, setShowPhotoConsent] = useState(false);
  const [loadingProfilePhoto, setLoadingProfilePhoto] = useState(false);

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

    // Creators can try the look on their own profile photo (with consent)
    try {
      const c = JSON.parse(localStorage.getItem("lb_curator") ?? "{}");
      if (c?.id) {
        setCuratorId(c.id);
        // Pre-fill the "share to gallery" name from the session right away (editable).
        if (c.firstName) setShareNameInput((prev) => prev || c.firstName);
        fetch(`/api/curator?profile=${encodeURIComponent(c.id)}`)
          .then(r => r.json())
          .then(d => {
            if (d.profile?.photoUrl) setCuratorPhotoUrl(d.profile.photoUrl as string);
            const nm = `${d.profile?.firstName ?? ""} ${d.profile?.lastName ?? ""}`.trim() || d.profile?.motto || "";
            if (nm) { setCuratorName(nm); setShareNameInput((prev) => (!prev || prev === c.firstName) ? nm : prev); }
          })
          .catch(() => {});
      }
    } catch { /**/ }

    fetch(`/api/try-this-look?previewId=${encodeURIComponent(lookId)}`)
      .then(r => r.json())
      .then((p: { look?: Look }) => { if (p.look) setLook(p.look); })
      .catch(() => {})
      .finally(() => setIsLoadingLook(false));
  }, [lookId]);

  // ── Use the creator's profile photo as the try-on base ──
  const loadProfilePhoto = async () => {
    if (!curatorPhotoUrl) return;
    setLoadingProfilePhoto(true);
    setError(null);
    try {
      // Proxy keeps it same-origin so the signed URL converts cleanly to a data URL
      const res = await fetch(`/api/img-proxy?url=${encodeURIComponent(curatorPhotoUrl)}`);
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
      setUserPhoto(dataUrl);
      setStep("confirm");
    } catch {
      setError("Couldn't load your profile photo. Upload one instead.");
    } finally {
      setLoadingProfilePhoto(false);
    }
  };

  const onUseProfilePhoto = () => {
    let consented = false;
    try { consented = localStorage.getItem("lb_tryon_photo_consent") === "1"; } catch { /**/ }
    if (consented) void loadProfilePhoto();
    else setShowPhotoConsent(true);
  };

  const grantConsentAndUse = () => {
    try { localStorage.setItem("lb_tryon_photo_consent", "1"); } catch { /**/ }
    setShowPhotoConsent(false);
    void loadProfilePhoto();
  };

  // ── Progress timer ──
  useEffect(() => {
    if (step === "generating") {
      generationStartRef.current = Date.now();
      setProgress(0); setElapsedSec(0); setGenMessage("Generating your look…");
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

  // ── Try-on video ──
  // Animate the finished try-on still into a 5s music video (Pixverse). Auto-runs
  // when a result appears; costs credits (billed to the look's owner curator).
  const startTryonVideo = async (image: string, turnaround = false, ref?: { garment: string; person: string }) => {
    if (!look) return;
    setVideoStatus("generating");
    setVideoUrl(null);
    setVideoNote(null);
    // Time-based progress bar (ramps to ~95% over ~75s) so people wait, not bail.
    setVideoProgress(4);
    if (videoProgressRef.current) clearInterval(videoProgressRef.current);
    videoProgressRef.current = setInterval(() => {
      setVideoProgress(p => (p < 95 ? p + Math.max(0.4, (95 - p) * 0.035) : p));
    }, 600);
    const stopProgress = (final: number) => { if (videoProgressRef.current) clearInterval(videoProgressRef.current); setVideoProgress(final); };
    try {
      // Reference mode (lingerie): send garment + person; else the single still.
      const refSmall = ref ? { garment: await compressDataUrl(ref.garment), person: await compressDataUrl(ref.person) } : null;
      const imageSmall = ref ? "" : await compressDataUrl(image); // stay under Vercel's body limit
      const res = await fetch("/api/generate-tryon-video", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(staffCuratorId() ? { "x-curator-id": staffCuratorId() } : {}) },
        body: JSON.stringify({ lookId: look.id, image: imageSmall, turnaround, ...(refSmall ?? {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 402) { setVideoStatus("error"); setVideoNote("No credits left for a video — here's your photo."); return; }
      if (!res.ok || !data.videoId) { setVideoStatus("error"); setVideoNote("Video couldn't be created — here's your photo."); return; }
      // Poll until done / failed (~max 2.5 min).
      const videoId = String(data.videoId);
      const cid = String(data.curatorId ?? "");
      for (let i = 0; i < 50; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(videoId)}&curatorId=${encodeURIComponent(cid)}`)
          .then(r => r.json()).catch(() => null);
        if (p?.status === "done" && p.videoUrl) {
          stopProgress(100);
          setVideoUrl(p.videoUrl); setVideoStatus("done");
          // Attach the video to the feed post (if shared) so it plays in the carousel.
          if (sharedGenIdRef.current) {
            fetch("/api/try-this-look", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "attach-generation-video", generationId: sharedGenIdRef.current, videoUrl: p.videoUrl }),
            }).catch(() => {});
          }
          return p.videoUrl as string;
        }
        if (p?.status === "failed") { stopProgress(0); setVideoStatus("error"); setVideoNote(p.error ?? "Video failed — here's your photo."); return; }
      }
      stopProgress(0); setVideoStatus("error"); setVideoNote("Video is taking too long — here's your photo.");
    } catch {
      stopProgress(0); setVideoStatus("error"); setVideoNote("Video couldn't be created — here's your photo.");
    }
  };

  // Lingerie video/360° via Pixverse REFERENCE mode (garment + person) — keeps the
  // face (FASHN's photo doesn't). Person photo is cropped to head+shoulders first.
  const startReferenceVideo = async (turnaround: boolean, wantFrame = false) => {
    if (!look || !userPhoto) return;
    const altParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("alt") : null;
    const altIdx = altParam !== null && /^\d+$/.test(altParam) ? Number(altParam) : -1;
    const altThumb = altIdx >= 0 ? look.alternatives?.[altIdx]?.thumbnail : undefined;
    const altProxied = altThumb ? `/api/img-proxy?url=${encodeURIComponent(altThumb)}` : undefined;
    let garmentData: string;
    try {
      garmentData = await firstValidImageDataUrl([altThumb, altProxied, look.garmentFrontImageUrl, look.frontImageUrl, look.imageUrl]);
    } catch {
      setError("Couldn't load the garment image. Try again."); setStep("confirm"); return;
    }
    const personCropped = await cropToFace(userPhoto);
    setError(null);
    setResultImage(personCropped); // placeholder shown while the video renders
    setStep("result");
    const videoUrl = await startTryonVideo("", turnaround, { garment: garmentData, person: personCropped });
    // Photo tier: use the first frame of the reference video as the still (no FASHN).
    if (wantFrame && videoUrl) {
      const frame = await extractFirstFrame(videoUrl);
      if (frame) setResultImage(frame);
    }
  };

  // Is THIS try-on a lingerie one (the look itself, or the chosen lingerie card)?
  // Lingerie try-ons are NEVER auto-posted to the public A List and require an
  // 18+/own-photo consent — they involve intimate imagery of an uploaded person.
  const isLingerieTryon = () => {
    if (!look) return false;
    const p = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("alt") : null;
    const i = p !== null && /^\d+$/.test(p) ? Number(p) : -1;
    return look.lingerie === true || (i >= 0 && look.alternatives?.[i]?.lingerie === true);
  };
  const [show360Note, setShow360Note] = useState(false); // 360° premium tier — UI ready, payment via Stripe pending
  const [paidSoon, setPaidSoon] = useState<"" | "video" | "360">(""); // chosen paid video tier (awaiting Stripe)
  // Staff = acting-as a curator (e.g. Szidonia) → all tiers generate FREE for them,
  // no paywall. End-user charging arrives with Stripe.
  const staffCuratorId = () => { try { return String(JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id ?? ""); } catch { return ""; } };
  const isStaff = typeof window !== "undefined" && !!staffCuratorId();

  // ── Generate ──
  // photoOverride lets callers (e.g. the resume-after-application flow) pass the
  // photo directly, avoiding a stale `userPhoto` closure right after setUserPhoto.
  const handleGenerate = async (photoOverride?: string, tier: "photo" | "video" | "video360" = "photo") => {
    // No login required — anyone (e.g. someone scanning a projected QR) can try a
    // look on. Abuse is capped by the per-device daily limit on the server; the
    // look's owner curator/brand pays the credits. We capture an email AFTER the
    // result (optional), not before, to keep conversion high.
    if (!look) return;
    const photo = photoOverride ?? userPhoto;
    setError(null);
    setStep("generating");
    try {
      // ?alt=N → try on EXACTLY the chosen card's product image (the garment),
      // not the hero. Remote thumbnails are usually CORS-blocked, so we try the
      // direct URL first then the same image via /api/img-proxy (server-side fetch)
      // before ever falling back to the hero.
      const altParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("alt") : null;
      const altIdx = altParam !== null && /^\d+$/.test(altParam) ? Number(altParam) : -1;
      const altThumb = altIdx >= 0 ? look.alternatives?.[altIdx]?.thumbnail : undefined;
      const altProxied = altThumb ? `/api/img-proxy?url=${encodeURIComponent(altThumb)}` : undefined;
      const garmentData = await firstValidImageDataUrl([
        altThumb,
        altProxied,
        // Only fall back to the hero when no specific card was chosen.
        ...(altThumb ? [] : [look.garmentFrontImageUrl, look.frontImageUrl, look.imageUrl, look.galleryImageUrls?.[0]]),
      ]);
      const coverageRule = "Coverage rule: the generated image must keep the person at least as covered as in the original photo. Never expose more skin, remove undergarments, or show less clothing than the input. No nudity; keep intimate areas (chest, groin, buttocks) covered at all times.";
      const prompt = photo
        ? `Full-body virtual fashion try-on. Show the entire person from head to toe wearing the complete selected outfit. Replace the person's current clothing with the selected garment so the whole look is visible. Preserve the person's face, hair, skin tone, and identity exactly. Full-length framing. ${coverageRule} Look: ${look.name}.`
        : `Full-body fashion campaign image. Professional AI model shown head to toe wearing the complete selected outfit. Full-length framing. ${coverageRule} Look: ${look.name}.`;
      // Fresh FormData per request (a body can't be reused across two fetches).
      const buildForm = () => {
        const fd = new FormData();
        fd.append("image", dataUrlToBlob(garmentData), `${look.id}.jpg`);
        if (photo) fd.append("modelImage", dataUrlToBlob(photo), "user-photo.jpg");
        fd.append("visitorId", accountId || "anon");
        fd.append("lookId", look.id);
        fd.append("mode", "fashion-model");
        fd.append("aspectRatio", "9:16");
        fd.append("prompt", prompt);
        return fd;
      };
      // Signed-in users (Supabase OR curator session) bill as a "user-" account so
      // the anonymous 1-per-day try-on limit never applies to them.
      const curatorBillingId = (() => { try { return JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id ?? ""; } catch { return ""; } })();
      const billingId = authSession?.user?.id
        ? `user-${authSession.user.id}`
        : curatorBillingId
        ? `user-${curatorBillingId}`
        : accountId.startsWith("user-") ? accountId : `visitor-${accountId || "anon"}`;
      const headers = { "x-shopcut-account-id": billingId };
      // Engine routing decided UPFRONT from the look (no wasteful double-loop):
      //  • Lingerie/swim → FASHN directly (OpenAI would refuse or cover it up).
      //  • Normal apparel → OpenAI; only if OpenAI unexpectedly safety-blocks do we
      //    fall back to FASHN as a thin safety net.
      // Lingerie either because the LOOK is lingerie, or because the chosen shop
      // card (?alt=N) is the injected lingerie upsell → FASHN in both cases.
      const isLingerie = look.lingerie === true || (altIdx >= 0 && look.alternatives?.[altIdx]?.lingerie === true);
      let res: Response;
      let payload: { image?: string; error?: string; outOfCredits?: boolean };
      if (isLingerie) {
        res = await fetch("/api/generate-fashn", { method: "POST", body: buildForm(), headers });
        payload = await res.json() as typeof payload;
        if (res.status === 402) { setError(payload.error ?? "You're out of credits."); setStep("confirm"); return; }
      } else {
        res = await fetch("/api/generate-openai-tryon", { method: "POST", body: buildForm(), headers });
        payload = await res.json() as typeof payload;
        if (res.status === 402) { setError(payload.error ?? "You're out of credits."); setStep("confirm"); return; }
        const wasSafetyBlock = !res.ok && /safety|sexual/i.test(payload.error ?? "");
        if (wasSafetyBlock) {
          // Rare: a "normal" look our classifier missed. Restart the bar + try FASHN.
          setGenMessage("Fine-tuning this look for you…");
          generationStartRef.current = Date.now();
          setProgress(8);
          res = await fetch("/api/generate-fashn", { method: "POST", body: buildForm(), headers });
          payload = await res.json() as typeof payload;
          if (res.status === 402) { setError(payload.error ?? "You're out of credits."); setStep("confirm"); return; }
        }
      }
      if (!res.ok || !payload.image) throw new Error(payload.error ?? "Generation failed.");
      setResultImage(payload.image);
      setProgress(100);
      setStep("result");
      // Post the try-on FIRST (so its generation is persisted), THEN start the video.
      // Running them in parallel raced the shared state save and lost the try-on.
      void (async () => {
        // Lingerie try-ons stay PRIVATE — never auto-posted to the public A List.
        if (showInFeed && !isLingerieTryon()) await postToFeed(payload.image);
        // Video runs only when the chosen tier asks for it (Video = 5s, 360° = turnaround).
        if (tier === "video") await startTryonVideo(payload.image, false);
        else if (tier === "video360") await startTryonVideo(payload.image, true);
      })();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
      setStep("confirm");
    }
  };

  // ── Resume after the application flow ──
  // If the visitor went off to become a curator mid try-on, pick up where they left
  // off: restore their photo and run the generation now that they're signed in.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || !look) return;
    let resume: { returnTo?: string; lookId?: string; userPhoto?: string } | null = null;
    try { resume = JSON.parse(sessionStorage.getItem("lb_resume_tryon") ?? "null"); } catch { /* ignore */ }
    if (!resume || resume.lookId !== look.id) return;
    const isCurator = (() => { try { return !!JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id; } catch { return false; } })();
    if (!isCurator) return; // application not completed yet
    resumedRef.current = true;
    try { sessionStorage.removeItem("lb_resume_tryon"); } catch { /**/ }
    if (resume.userPhoto) {
      setUserPhoto(resume.userPhoto);
      // Pass the photo explicitly so generation doesn't race the state update.
      void handleGenerate(resume.userPhoto);
    } else {
      setStep("confirm"); // no photo saved → they re-pick, but stay on this look
    }
  }, [look]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Curator sign-in (email only, no password — our only login) ──
  const handleCuratorSignin = async () => {
    const email = authEmail.trim();
    if (!email) return;
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    try {
      const res = await fetch("/api/curator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signin", email }),
      });
      const data = await res.json();
      if (!res.ok || !data.curator) {
        setAuthError("No curator found with that email. Become a curator first to try looks on.");
        return;
      }
      localStorage.setItem("lb_curator", JSON.stringify({ id: data.curator.id, firstName: data.curator.firstName, email: data.curator.email, style: data.curator.style }));
      setShowAuth(false);
      if (pendingGenerateRef.current) { pendingGenerateRef.current = false; setTimeout(() => void handleGenerate(), 100); }
    } catch {
      setAuthError("Sign-in failed. Please try again.");
    } finally {
      setAuthLoading(false);
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

  // ── Post the try-on into the look's feed (with consent) ──
  // Posts the image immediately; the video is attached later when Pixverse is done.
  const postToFeed = async (image: string) => {
    if (!look) return;
    setIsSharing(true);
    try {
      const meta = (authSession?.user as any)?.user_metadata ?? {};
      const name = shareNameInput.trim() || curatorName || meta.username || meta.full_name || "Anonymous";
      // Compress before sending so the JSON body stays under Vercel's ~4.5MB limit.
      const [imageSmall, userPhotoSmall] = await Promise.all([
        compressDataUrl(image),
        userPhoto ? compressDataUrl(userPhoto) : Promise.resolve(undefined),
      ]);
      const res = await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generation", lookId: look.id,
          visitorId: accountId || "anon",
          lookName: look.name, storeName: look.storeName,
          customerName: name, userId: authSession?.user?.id ?? undefined,
          curatorId: curatorId || undefined,
          image: imageSmall, userPhotoImage: userPhotoSmall,
          feed: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.generationId) sharedGenIdRef.current = String(data.generationId);
      setSharedToGallery(true);
    } catch { /**/ } finally { setIsSharing(false); }
  };

  // Toggle whether this try-on appears in the feed (consent).
  const toggleShowInFeed = async (next: boolean) => {
    if (next && isLingerieTryon()) return; // lingerie is private — cannot be shared
    setShowInFeed(next);
    if (next && !sharedGenIdRef.current && resultImage) { await postToFeed(resultImage); return; }
    if (sharedGenIdRef.current) {
      fetch("/api/try-this-look", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-generation-feed", generationId: sharedGenIdRef.current, feed: next }),
      }).catch(() => {});
    }
  };

  // ── Download ──
  // Works for data URLs AND cross-origin (Supabase) URLs: fetch → blob → download.
  // The plain `<a download>` attribute is ignored for cross-origin links.
  const downloadFile = async (url: string, filename: string) => {
    try {
      if (url.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        return;
      }
      const res = await fetch(url);
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = obj; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(obj), 4000);
    } catch {
      window.open(url, "_blank"); // last resort: open it so the user can save manually
    }
  };
  // Save to the device. On iOS a normal download only offers "Save to Files" — to
  // get "Save to Photos" we must go through the native share sheet (Web Share API
  // with a File). Fall back to a regular download where sharing files isn't allowed.
  const saveToDevice = async (url: string, filename: string, mime: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || mime });
      const navAny = navigator as any;
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        await navAny.share({ files: [file] }); // iOS: offers "Save Video" / "Save Image" → Photos
        return;
      }
      const obj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = obj; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(obj), 4000);
    } catch {
      if (url.startsWith("data:")) { const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); }
      else window.open(url, "_blank");
    }
  };
  const handleDownload = () => { if (resultImage) void saveToDevice(resultImage, "luxurybandit-tryon.jpg", "image/jpeg"); };
  const handleDownloadVideo = () => { if (videoUrl) void saveToDevice(videoUrl, "luxurybandit-tryon.mp4", "video/mp4"); };

  // ── Save the display name onto the already-posted try-on ──
  const [nameSaved, setNameSaved] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const saveName = async () => {
    const name = shareNameInput.trim();
    if (!name) return;
    setNameSaving(true); setNameSaved(false);
    try {
      // If the try-on was already posted, just update its name; otherwise post it
      // now WITH the name (so Save always works, even if the auto-post hasn't run).
      if (sharedGenIdRef.current) {
        await fetch("/api/try-this-look", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "set-generation-name", generationId: sharedGenIdRef.current, customerName: name }),
        });
      } else if (resultImage && showInFeed && !isLingerieTryon()) {
        await postToFeed(resultImage);
        if (sharedGenIdRef.current) {
          await fetch("/api/try-this-look", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "set-generation-name", generationId: sharedGenIdRef.current, customerName: name }),
          });
        }
      }
      setNameSaved(true);
    } catch { /* ignore */ } finally { setNameSaving(false); }
  };

  // ── Optional email capture (lead) after the result ──
  const submitLead = async () => {
    const email = leadEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !look) return;
    setLeadSending(true);
    try {
      await fetch("/api/try-this-look", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lead", email, lookId: look.id, lookName: look.name, leadSource: "tryon", visitorId: accountId || "anon" }),
      });
      setLeadDone(true);
    } catch { /* ignore */ } finally { setLeadSending(false); }
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

  // ?alt=N → the user picked a specific shop card; preview EXACTLY that product
  // image (the garment they'll try on), not the hero. Proxy it so CORS-blocked
  // CDN thumbnails still render.
  const previewAltParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("alt") : null;
  const previewAltIdx = previewAltParam !== null && /^\d+$/.test(previewAltParam) ? Number(previewAltParam) : -1;
  const previewAltThumb = previewAltIdx >= 0 ? look.alternatives?.[previewAltIdx]?.thumbnail : undefined;
  // Lingerie if the look is lingerie OR the chosen shop card is the lingerie upsell.
  const effectiveLingerie = look.lingerie === true || (previewAltIdx >= 0 && look.alternatives?.[previewAltIdx]?.lingerie === true);

  // Use frontImageUrl for display — it always has a fresh signed URL.
  // garmentFrontImageUrl is for AI generation only (may be expired on legacy looks).
  const garmentPreviewUrl = previewAltThumb || look.frontImageUrl || look.imageUrl || (look.galleryImageUrls?.[0] ?? "");
  // Garment image for AI generation is resolved at call time in handleGenerate
  // (firstValidImageDataUrl), with a validated fallback chain.
  const lookBackPath = `/look/${look.id}`;

  // On error: a chosen card falls back to its proxied URL; otherwise the hero chain.
  const garmentFallbacks = [
    previewAltThumb ? `/api/img-proxy?url=${encodeURIComponent(previewAltThumb)}` : undefined,
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

  // Shared auth modal — used by the main view AND the locked teaser step (both
  // return early, so it must be rendered in each place it can be opened).
  const authModal = showAuth ? (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setShowAuth(false)} />
      <div className="fixed inset-x-0 bottom-0 z-[61] max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-white px-5 pt-5"
        style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-base font-black">Sign in to reveal your look</p>
          <button onClick={() => setShowAuth(false)} className="grid h-8 w-8 place-items-center rounded-full bg-black/5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs font-bold text-black/45">Curators sign in with their email — no password needed.</p>
        <div className="grid gap-3">
          <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void handleCuratorSignin(); }}
            placeholder="you@email.com" className="w-full rounded-xl border border-black/15 px-3 py-3 text-sm outline-none focus:border-black" />
          {authError && <p className="text-xs font-bold text-red-500">{authError}</p>}
          <button onClick={() => void handleCuratorSignin()} disabled={authLoading || !authEmail.trim()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
            {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </button>
        </div>
        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-black/10" />
          <span className="text-[11px] font-black uppercase tracking-wider text-black/30">New here?</span>
          <span className="h-px flex-1 bg-black/10" />
        </div>
        <button onClick={() => {
            // Remember where to come back to (+ the uploaded photo) so we can resume
            // the try-on right after the application is done.
            try {
              sessionStorage.setItem("lb_resume_tryon", JSON.stringify({
                returnTo: typeof window !== "undefined" ? window.location.pathname : "",
                lookId: look?.id ?? "",
                userPhoto: userPhoto ?? "",
              }));
            } catch { /* photo too big for storage — resume without it */ }
            router.push("/curators");
          }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-black/15 bg-white text-sm font-black text-black active:scale-95 transition-transform">
          <Sparkles className="h-4 w-4" /> Become a curator — it&apos;s free
        </button>
      </div>
    </>
  ) : null;

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
          <p className="text-lg font-black text-white">{genMessage}</p>
          <p className="mt-1 text-sm font-bold text-white/60">{elapsedSec}s — please wait</p>
        </div>
      </div>
    );
  }

  // ─── LOCKED STEP — look is "ready" but blurred until the visitor signs in ───
  if (step === "locked") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        {/* Blurred teaser of the result */}
        <div className="relative flex-1 overflow-hidden">
          {userPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userPhoto} alt="" className="h-full w-full object-cover object-top blur-2xl scale-125" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={garmentPreviewUrl} alt="" className="h-full w-full object-cover blur-2xl scale-125" onError={onGarmentError} />
          )}
          <div className="absolute inset-0 bg-black/40" />
          {/* Small sharp garment chip so they see what it's about */}
          <div className="absolute left-1/2 top-6 -translate-x-1/2 h-20 w-16 overflow-hidden rounded-xl border-2 border-white/40 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={garmentPreviewUrl} alt={look.name} className="h-full w-full object-cover" onError={onGarmentError} />
          </div>
          {/* Center lock + copy */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white/15 backdrop-blur">
              <Lock className="h-7 w-7 text-white" />
            </div>
            <p className="mt-4 text-xl font-black text-white">Your look is ready</p>
            <p className="mt-1.5 max-w-xs text-sm font-bold text-white/70">Sign in to reveal yourself wearing this look — it&apos;s free.</p>
          </div>
        </div>
        {/* Actions */}
        <div className="px-5 pt-4" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
          <button onClick={() => setShowAuth(true)}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-black text-black active:scale-95 transition-transform">
            <Sparkles className="h-4 w-4" /> Sign in to reveal
          </button>
          <button onClick={() => { pendingGenerateRef.current = false; setStep("confirm"); }}
            className="mt-2 flex h-11 w-full items-center justify-center text-sm font-black text-white/50">
            Back
          </button>
        </div>
        {authModal}
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

        {/* Result — VIDEO first so it's never missed, then the photo */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 flex flex-col gap-4">
          {/* Try-on video — big "Please wait!" loader over a blurred preview so
              people don't bail before the 5s video is ready */}
          {videoStatus === "generating" && (
            <div className="relative h-[44dvh] overflow-hidden rounded-2xl border border-black/10 shadow-lg">
              {resultImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resultImage} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-70" />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/40 px-8 text-center">
                <Loader2 className="h-9 w-9 animate-spin text-black" />
                <p className="text-xl font-black text-black">Please wait!</p>
                <p className="text-[13px] font-bold text-black/60">Creating your 5-second video… (~1 min)</p>
                <div className="mt-1 h-2 w-56 max-w-[80%] overflow-hidden rounded-full bg-black/15">
                  <div className="h-full rounded-full bg-black transition-[width] duration-500 ease-out" style={{ width: `${Math.min(100, Math.round(videoProgress))}%` }} />
                </div>
                <p className="text-[11px] font-black text-black/40">{Math.min(99, Math.round(videoProgress))}%</p>
              </div>
            </div>
          )}
          {videoStatus === "done" && videoUrl && (
            <div className="relative overflow-hidden rounded-2xl border border-black/10 shadow-lg">
              <video src={videoUrl} className="max-h-[58dvh] w-full bg-black object-contain" autoPlay loop playsInline muted={videoMuted} />
              <button type="button" aria-label={videoMuted ? "Unmute" : "Mute"}
                onClick={() => setVideoMuted(m => !m)}
                className="absolute bottom-3 left-3 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur active:scale-90 transition-transform">
                {videoMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button type="button" aria-label="Download video" onClick={handleDownloadVideo}
                className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur active:scale-90 transition-transform">
                <Download className="h-4 w-4" />
              </button>
              <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur">Video</span>
            </div>
          )}
          {videoStatus === "error" && videoNote && (
            <p className="rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 text-center text-[12px] font-bold text-black/45">{videoNote}</p>
          )}

          {/* Result photo */}
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultImage} alt="Your try-on result" className="max-h-[58dvh] w-full rounded-2xl border border-black/10 object-contain shadow-lg" />
            <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur">Photo</span>
            {/* Persistent video-loading bar ON the photo so the video isn't missed */}
            {videoStatus === "generating" && (
              <div className="absolute inset-x-0 bottom-0 rounded-b-2xl bg-black/75 px-4 py-3 backdrop-blur">
                <div className="mb-1.5 flex items-center justify-between text-[12px] font-black text-white">
                  <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Your video is loading… please wait</span>
                  <span>{Math.min(99, Math.round(videoProgress))}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${Math.min(100, Math.round(videoProgress))}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Download — photo (+ video only once one has been generated) */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleDownload}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-black/15 bg-white text-sm font-black text-black active:scale-95 transition-transform">
              <Download className="h-4 w-4" /> Download photo
            </button>
            {(videoStatus !== "idle" || videoUrl) && (
            <button type="button" onClick={handleDownloadVideo} disabled={videoStatus !== "done" || !videoUrl}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-black/15 bg-white text-sm font-black text-black active:scale-95 transition-transform disabled:opacity-40">
              {videoStatus === "generating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />} Video
            </button>
            )}
          </div>

          {/* 360° turnaround — premium tier (lingerie only). UI is here; the actual
              paid generation activates with Stripe checkout. */}
          {effectiveLingerie && (
            <div className="rounded-2xl bg-gradient-to-br from-black to-black/80 p-3.5 text-white">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-black"><Sparkles className="h-4 w-4" /> 360° turnaround <span className="font-bold text-white/55">· 10s</span></p>
                  <p className="mt-0.5 text-[12px] font-bold text-white/55">See the full look from every angle — front, sides &amp; back.</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-black">{isStaff ? "Free" : "$7.90"}</span>
              </div>
              <button type="button" disabled={isStaff && videoStatus === "generating"}
                onClick={() => { if (isStaff) void startReferenceVideo(true); else setShow360Note(true); }}
                className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-black active:scale-95 transition-transform disabled:opacity-50">
                {isStaff && videoStatus === "generating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Get the 360° video
              </button>
              {show360Note && !isStaff && <p className="mt-2 text-center text-[12px] font-bold text-white/70">Coming very soon — activates at checkout.</p>}
            </div>
          )}

          {/* Optional email capture (after the result) — for no-login QR/event
              try-ons. Soft lead: keep your look + join the community. */}
          {!authSession && !curatorId && (
            leadDone ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <p className="text-sm font-black text-emerald-700">✓ Sent! Check your inbox to save your look.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 flex flex-col gap-2.5">
                <div>
                  <p className="text-sm font-black">Keep your look &amp; join LuxuryBandit</p>
                  <p className="text-[12px] font-bold text-black/45">Drop your email to save this try-on and discover more — no account needed.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="email" inputMode="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") void submitLead(); }}
                    placeholder="you@email.com"
                    className="h-11 flex-1 rounded-xl border border-black/15 px-3 text-sm outline-none focus:border-black" />
                  <button type="button" onClick={() => void submitLead()} disabled={leadSending || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(leadEmail.trim())}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-black px-5 text-sm font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
                    {leadSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )
          )}

          {/* Show in feed — consent toggle. Lingerie try-ons are ALWAYS private and
              can never be posted to the public A List (intimate imagery / consent). */}
          {effectiveLingerie ? (
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.06] text-base">🔒</span>
              <div className="min-w-0">
                <p className="text-sm font-black">Private — only you</p>
                <p className="text-[12px] font-bold text-black/45">Lingerie try-ons are never posted publicly. Download or share it yourself.</p>
              </div>
            </div>
          ) : (
          <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black">Show in the look's feed</p>
                <p className="text-[12px] font-bold text-black/45">Your photo {videoUrl ? "& video " : ""}appears on this look so others see it worn.</p>
              </div>
              <button type="button" role="switch" aria-checked={showInFeed}
                onClick={() => void toggleShowInFeed(!showInFeed)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${showInFeed ? "bg-emerald-500" : "bg-black/20"}`}>
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${showInFeed ? "left-[1.375rem]" : "left-0.5"}`} />
              </button>
            </div>
            {showInFeed && (
              <div className="flex items-center gap-2">
                <input
                  value={shareNameInput}
                  onChange={e => { setShareNameInput(e.target.value); setNameSaved(false); }}
                  onKeyDown={e => { if (e.key === "Enter") void saveName(); }}
                  placeholder="Your name (shown on the post)"
                  className="h-11 flex-1 rounded-xl border border-black/15 px-3 text-sm outline-none focus:border-black"
                />
                <button type="button" onClick={() => void saveName()} disabled={nameSaving || !shareNameInput.trim()}
                  className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-black px-4 text-sm font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
                  {nameSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : nameSaved ? "✓ Saved" : "Save"}
                </button>
              </div>
            )}
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-black/40">
              {isSharing ? <><Loader2 className="h-3 w-3 animate-spin" /> Posting…</>
                : showInFeed ? <><Send className="h-3 w-3" /> {sharedToGallery ? "Posted to the feed" : "Will be posted"}</>
                : "Hidden — only you can see this"}
            </p>
          </div>
          )}

          {/* Try again */}
          <button onClick={() => { setResultImage(null); setUserPhoto(null); setVideoUrl(null); setVideoStatus("idle"); setVideoNote(null); setShowInFeed(true); sharedGenIdRef.current = ""; setSharedToGallery(false); setStep("upload"); }}
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

          {/* Choose what to create — Photo (the base try-on), Video, or 360°.
              Photo generates now; the paid video tiers activate with checkout. */}
          <div className="grid gap-2">
            <button type="button" onClick={() => { setPaidSoon(""); if (effectiveLingerie && isStaff) void startReferenceVideo(false, true); else void handleGenerate(); }}
              className="flex h-14 w-full items-center gap-3 rounded-2xl bg-white px-4 text-black shadow-xl active:scale-95 transition-transform">
              <Sparkles className="h-5 w-5 shrink-0 text-blue-600" />
              <span className="text-base font-black">Photo</span>
              <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-black ${effectiveLingerie && !isStaff ? "bg-black text-white" : "bg-emerald-100 text-emerald-700"}`}>{isStaff ? "Free" : effectiveLingerie ? "$2.90" : "Free"}</span>
            </button>
            <button type="button" onClick={() => { if (isStaff) { setPaidSoon(""); if (effectiveLingerie) void startReferenceVideo(false); else void handleGenerate(undefined, "video"); } else setPaidSoon("video"); }}
              className="flex h-14 w-full items-center gap-3 rounded-2xl bg-white/15 px-4 text-white backdrop-blur active:scale-95 transition-transform">
              <Film className="h-5 w-5 shrink-0" />
              <span className="text-base font-black">Video <span className="font-bold text-white/55">· 5s</span></span>
              <span className="ml-auto rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-black">{isStaff ? "Free" : effectiveLingerie ? "$4.90" : "$2.90"}</span>
            </button>
            {effectiveLingerie && (
              <button type="button" onClick={() => { if (isStaff) { setPaidSoon(""); void startReferenceVideo(true); } else setPaidSoon("360"); }}
                className="flex h-14 w-full items-center gap-3 rounded-2xl bg-white/15 px-4 text-white backdrop-blur active:scale-95 transition-transform">
                <RefreshCw className="h-5 w-5 shrink-0" />
                <span className="text-base font-black">360° turnaround <span className="font-bold text-white/55">· 10s</span></span>
                <span className="ml-auto rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-black">{isStaff ? "Free" : "$7.90"}</span>
              </button>
            )}
            {paidSoon && !isStaff && (
              <p className="text-center text-[12px] font-bold text-white/75">
                {paidSoon === "360" ? "360° video" : "Video"} comes very soon — activates at checkout. Tap <span className="text-white">Photo</span> to try it on now.
              </p>
            )}
            <button onClick={() => { setUserPhoto(null); fileInputRef.current?.click(); }}
              className="mt-1 flex h-12 w-full items-center justify-center rounded-2xl bg-white/20 text-sm font-black text-white backdrop-blur active:opacity-70">
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

      {/* Look preview + upload — scrollable so the action buttons are always reachable */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 py-5 gap-5">
        {/* Look image */}
        <div className="w-36 aspect-[3/4] shrink-0 rounded-2xl overflow-hidden border border-black/10 shadow-lg bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={garmentPreviewUrl} alt={look.name} className="h-full w-full object-contain" onError={onGarmentError} />
        </div>

        {/* Instructions */}
        <div className="text-center">
          <p className="text-xl font-black">Try this look on you</p>
          <p className="mt-1 text-sm text-black/50">Upload a photo and AI will dress you in this outfit</p>
        </div>

        {/* This step prices only the PHOTO. The optional video / 360° (and their
            prices) are chosen at the next step's tier menu. */}
        <div className="w-full max-w-xs rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 text-center">
          <p className="text-[13px] font-black text-black">Your try-on photo<span className="font-bold text-black/45"> — optional video after</span></p>
          <div className="mt-1.5 flex items-center justify-center">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-black text-white ${effectiveLingerie ? "bg-black" : "bg-emerald-600"}`}>
              Photo · {isStaff ? "Free" : effectiveLingerie ? "$2.90" : "Free"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full max-w-xs flex-col items-center gap-2.5">
          {/* Profile photo (creators) — primary when available */}
          {curatorPhotoUrl && (
            <button onClick={onUseProfilePhoto} disabled={loadingProfilePhoto}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-black text-white text-base font-black shadow-xl active:scale-95 transition-transform disabled:opacity-50">
              {loadingProfilePhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={curatorPhotoUrl} alt="" className="h-7 w-7 rounded-full object-cover border border-white/40" />
              )}
              Use my profile photo
            </button>
          )}
          <button onClick={() => fileInputRef.current?.click()}
            className={`flex h-14 w-full items-center justify-center gap-3 rounded-2xl text-base font-black active:scale-95 transition-transform ${curatorPhotoUrl ? "border-2 border-black/10 bg-white text-black" : "bg-black text-white shadow-xl"}`}>
            <ImagePlus className="h-5 w-5" />
            Upload {curatorPhotoUrl ? "another" : "your"} photo
          </button>
        </div>

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

      {/* Profile-photo consent */}
      {showPhotoConsent && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowPhotoConsent(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[51] rounded-t-2xl bg-white px-5 pt-5"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
            <div className="mb-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {curatorPhotoUrl && <img src={curatorPhotoUrl} alt="" className="h-12 w-12 rounded-full object-cover border border-black/10" />}
              <p className="text-base font-black">Use your profile photo?</p>
            </div>
            <p className="mb-1 text-sm leading-relaxed text-black/55">
              We&apos;ll send your profile photo to the AI to generate try-on images of you wearing this look.
            </p>
            <p className="mb-4 text-xs leading-relaxed text-black/40">
              It&apos;s only used when you start a try-on. You can upload a different photo anytime.
            </p>
            <div className="grid gap-2">
              <button onClick={grantConsentAndUse}
                className="flex h-13 min-h-[52px] w-full items-center justify-center rounded-2xl bg-black text-sm font-black text-white active:scale-95 transition-transform">
                Yes, use my profile photo
              </button>
              <button onClick={() => setShowPhotoConsent(false)}
                className="flex h-12 w-full items-center justify-center rounded-2xl text-sm font-bold text-black/50 active:opacity-70">
                Cancel
              </button>
            </div>
          </div>
        </>
      )}


      {/* Auth modal */}
      {authModal}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
    </div>
  );
}
