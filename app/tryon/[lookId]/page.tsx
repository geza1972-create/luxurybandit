"use client";

export const dynamic = "force-dynamic";

import CropModal from "@/components/CropModal";
import { getClientAccountId } from "@/lib/client-account";
import { publicLookTitle, publicLookLabel } from "@/lib/look-title";
import {
  getStoredAuthSession,
  signInWithPassword,
  signUpWithPassword,
  resetPassword,
  signInWithOAuth,
  type SupabaseAuthSession,
} from "@/lib/supabase-auth-client";
import { trackMetaPixel } from "@/lib/meta-pixel";
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
  clothesImageUrl?: string;   // curator-uploaded garment reference → preferred try-on garment
  locationImageUrl?: string;  // curator-uploaded location reference → try-on background/scene
  galleryImageUrls?: string[];
  lingerie?: boolean;
  curatorNote?: string; productNote?: string;
  alternatives?: { title: string; link: string; thumbnail: string; price?: string; source?: string }[];
};

type Step = "upload" | "crop" | "confirm" | "generating" | "result" | "locked" | "paused";

// Exact wording the user actively consents to before publishing (FIX 4). Logged
// verbatim on the generation alongside a timestamp so consent is provable.
const PUBLISH_CONSENT_TEXT = "Yes, I agree that this image I created may be published to the LuxuryBandit community.";
// Rights attestation: the uploader confirms they may use the uploaded photo (it's
// them or they have the depicted person's permission). Protects against uploading a
// third party's photo without consent. Also logged verbatim.
const RIGHTS_CONSENT_TEXT = "I confirm I am the person in the photo, or I have their permission, and I have the right to use this photo.";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Shrink a (possibly multi-MB PNG) data URL to a compact JPEG before sending it
// in a JSON body — Vercel rejects request bodies over ~4.5MB, which silently
// dropped feed posts on production (worked locally where there's no such limit).
// Turn a video failure into a clear, actionable note. Moderation blocks (and most
// reference/lingerie failures) mean the portrait OR the product image is too
// revealing — say so explicitly so the user knows what to change.
function failureNote(err: string | undefined, isReference: boolean): string {
  const moderation = !!err && /moderat|block|policy|guidelin|violat|flag|sensitive|nsfw|safety|content/i.test(err);
  if (moderation || isReference) {
    return "Generation blocked — your photo or the product image is likely too revealing. Use a more covered photo (face & upper body, clothed) and try again.";
  }
  return err || "Video couldn't be created — here's your photo.";
}

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
  const [tryonPaused, setTryonPaused] = useState(false); // global kill-switch (admin/staff bypass)
  const [isLoadingLook, setIsLoadingLook] = useState(true);
  // Cross-sell: other looks to try on next (shown on the result step).
  const [moreLooks, setMoreLooks] = useState<{ id: string; name: string; img: string; price?: string; lingerie?: boolean }[]>([]);
  // `name` here is the PUBLIC label (curator description), never the brand product name.
  useEffect(() => {
    fetch("/api/try-this-look").then(r => r.json()).then((d: any) => {
      const all = (d.looks ?? d.activeLooks ?? []) as any[];
      setMoreLooks(all
        .filter(l => l.id !== lookId && (l.frontImageUrl || l.imageUrl))
        .slice(0, 40) // show (nearly) the whole gallery — it's a horizontal scroll row
        .map(l => ({ id: l.id, name: publicLookLabel(l), img: l.frontImageUrl || l.imageUrl, price: l.salePrice || l.price, lingerie: !!l.lingerie })));
    }).catch(() => {});
  }, [lookId]);

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
  // CONSENT: proceeding past the confirm step (which clearly says the look will be
  // posted, with a "No, cancel" out) publishes it — and they can Remove it anytime
  // on the result. Lingerie stays private regardless.
  const [showInFeed, setShowInFeed] = useState(true);
  const showInFeedRef = useRef(true); // mirror so async saves read the latest toggle
  useEffect(() => { showInFeedRef.current = showInFeed; }, [showInFeed]);
  const sharedGenIdRef = useRef<string>("");
  // Public (signed) URL of the posted try-on — used to show the image in the email.
  const sharedImageUrlRef = useRef<string>("");
  // Which tier produced the current result (recorded on the saved generation for history).
  const lastGenKindRef = useRef<"photo" | "video" | "video360">("photo");
  // The pending generation (held while the anonymous visitor is at the email gate —
  // we DON'T spend AI credits until they submit their email). + a flag for the fast
  // "fake" loading shown before the gate (no real API call yet).
  const pendingGenRef = useRef<{ photoOverride?: string; tier: "photo" | "video" | "video360" } | null>(null);
  const fakeGenRef = useRef(false);
  // Optional email capture AFTER the result (lead) — for no-login QR/event try-ons.
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSending, setLeadSending] = useState(false);
  const [leadDone, setLeadDone] = useState(false);
  // Email GATE: anonymous visitors must drop their email to reveal the result (the
  // Instagram-ad funnel). Once passed, further generations show the result directly.
  const [gatePassed, setGatePassed] = useState(false);
  const [gateEmail, setGateEmail] = useState("");
  const [gateSending, setGateSending] = useState(false);
  // Registration gate (no more anonymous email-only reveals): email + password create a
  // real account, then reveal. gateInfo carries the "confirm your email" case.
  const [gatePassword, setGatePassword] = useState("");
  const [gateBusy, setGateBusy] = useState(false);
  const [gateInfo, setGateInfo] = useState("");
  // Active publish consent (FIX 4): a separate, NOT pre-checked box the user must tick
  // before the real generation starts. We log the exact wording + timestamp on the
  // generation so active consent is provable. Kept separate from Terms/Privacy.
  // Visibility choice at the gate: "public" = shared to the community (= active publish
  // consent), "private" = only in the user's own account. Default public.
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [rightsConsent, setRightsConsent] = useState(false); // I'm in the photo / have permission
  const consentRef = useRef<{ at: string; publishText: string; rightsText: string } | null>(null);
  // The email this try-on belongs to (gate email, or the logged-in account's email).
  // Saved on the generation so the owner can find + delete it from their account.
  const ownerEmailRef = useRef("");
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
    if (session?.user?.email) ownerEmailRef.current = String(session.user.email).trim().toLowerCase();

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
        setShowInFeed(true); // staff/curators deliberately create feed content → default ON
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
      .then((p: { look?: Look; tryonPaused?: boolean }) => {
        if (p.look) { setLook(p.look); trackMetaPixel("ViewContent", { content_name: p.look.name, content_category: "tryon" }); }
        setTryonPaused(p.tryonPaused === true);
      })
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
      // Let the user frame it themselves (face/upper body) before trying on.
      setCropSrc(dataUrl);
      setStep("crop");
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
        // Fake pre-gate loading fills fast; the real generation fills steadily.
        setProgress(fakeGenRef.current ? Math.min(96, sec * 38) : Math.min(92, 5 + sec * 3.2));
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
    // Persist so picking another look (cross-sell) keeps the photo — no re-upload.
    try { sessionStorage.setItem("lb_model_image", croppedDataUrl); } catch { /**/ }
    setCropSrc(null);
    setStep("confirm");
  };

  // Discard the uploaded photo (X / "use a different photo") — also clear the
  // persisted copy so a fresh look starts at the upload step, not pre-filled.
  const discardPhoto = () => {
    setUserPhoto(null);
    setVisibility("public"); // reset to default for a fresh try-on
    setRightsConsent(false); // re-consent required
    consentRef.current = null;
    try { sessionStorage.removeItem("lb_model_image"); } catch { /**/ }
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
      // Reference (lingerie) failures are almost always moderation: the portrait or
      // the product image is too revealing. Tell the user exactly what to fix.
      if (!res.ok || !data.videoId) {
        setVideoStatus("error");
        setVideoNote(failureNote(data.error, !!ref));
        return;
      }
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
        if (p?.status === "failed") { stopProgress(0); setVideoStatus("error"); setVideoNote(failureNote(p.error, !!ref)); return; }
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
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const garmentParam = params.get("garment");
    const garmentUrl = garmentParam ? decodeURIComponent(garmentParam) : "";
    const garmentProxied = garmentUrl ? `/api/img-proxy?url=${encodeURIComponent(garmentUrl)}` : undefined;
    const altParam = params.get("alt");
    const altIdx = altParam !== null && /^\d+$/.test(altParam) ? Number(altParam) : -1;
    const altThumb = altIdx >= 0 ? look.alternatives?.[altIdx]?.thumbnail : undefined;
    const altProxied = altThumb ? `/api/img-proxy?url=${encodeURIComponent(altThumb)}` : undefined;
    let garmentData: string;
    try {
      // When a specific product is chosen (?garment=url or ?alt=N), use EXACTLY that
      // image — never silently fall back to the look's hero (wrong-garment bug).
      const candidates = garmentUrl
        ? [garmentUrl, garmentProxied]
        : altIdx >= 0
          ? [altThumb, altProxied]
          // Prefer the curator's uploaded garment reference (clothesImageUrl) — that's the
          // actual piece — over the look's hero/product image.
          : [look.clothesImageUrl, look.garmentFrontImageUrl, look.frontImageUrl, look.imageUrl];
      garmentData = await firstValidImageDataUrl(candidates);
    } catch {
      setError("Couldn't load the selected product image. Pick the look again."); setStep("confirm"); return;
    }
    // Use the photo EXACTLY as the user framed it in the crop step — no auto-crop.
    // (We can't reliably guess where the face is; the user already chose the frame.)
    const personCropped = userPhoto;
    setError(null);
    setResultImage(personCropped); // placeholder shown while the video renders
    setStep("result");
    const videoUrl = await startTryonVideo("", turnaround, { garment: garmentData, person: personCropped });
    // Photo still = first frame of the reference video (no FASHN). Time-boxed so a
    // slow/blocked frame grab can NEVER stop the video from being saved.
    let frameImg = personCropped;
    if (videoUrl) {
      const frame = await Promise.race([extractFirstFrame(videoUrl), new Promise<null>(r => setTimeout(() => r(null), 8000))]);
      if (frame) { frameImg = frame; if (wantFrame) setResultImage(frame); }
    }
    // Creator (staff): ALWAYS save the video to the gallery so it's never lost —
    // create a generation (their curatorId) + attach the video. The feed toggle
    // controls public visibility (saved either way).
    if (isStaff && videoUrl) {
      try {
        await postToFeed(frameImg);
        if (sharedGenIdRef.current) {
          await fetch("/api/try-this-look", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "attach-generation-video", generationId: sharedGenIdRef.current, videoUrl }) });
        }
      } catch { /* keep the result even if save fails */ }
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
  const [photoBig, setPhotoBig] = useState(false); // tap the result photo → fullscreen
  // Staff = acting-as a curator (e.g. Szidonia) → all tiers generate FREE for them,
  // no paywall. End-user charging arrives with Stripe.
  const staffCuratorId = () => { try { return String(JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id ?? ""); } catch { return ""; } };
  const adminPin = () => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } };
  const isStaff = typeof window !== "undefined" && !!staffCuratorId();
  // Admin (PIN) OR staff (curator) bypass the try-on kill-switch and can always generate.
  const canUseTryon = typeof window !== "undefined" && (isStaff || !!adminPin());

  // ── Generate ──
  // photoOverride lets callers (e.g. the resume-after-application flow) pass the
  // photo directly, avoiding a stale `userPhoto` closure right after setUserPhoto.
  const handleGenerate = async (photoOverride?: string, tier: "photo" | "video" | "video360" = "photo", force = false) => {
    if (!look) return;
    lastGenKindRef.current = tier; // remember the tier so the saved generation records it
    // EMAIL GATE FIRST (Instagram-ad funnel): for an anonymous visitor we show a quick
    // "creating your look" loading and then ask for their email — and only spend AI
    // credits AFTER they submit it (in revealWithEmail → handleGenerate(..., force)).
    // Logged-in users / staff (and the forced post-email call) generate immediately.
    const anonymous = !authSession && !curatorId && !isStaff;
    if (anonymous && !gatePassed && !force) {
      pendingGenRef.current = { photoOverride, tier };
      fakeGenRef.current = true;
      setError(null);
      setStep("generating"); // FAKE loading — no API call, no credits
      window.setTimeout(() => { fakeGenRef.current = false; setStep("locked"); }, 2800);
      return;
    }
    const photo = photoOverride ?? userPhoto;
    setError(null);
    setStep("generating");
    try {
      // ?alt=N → try on EXACTLY the chosen card's product image (the garment),
      // not the hero. Remote thumbnails are usually CORS-blocked, so we try the
      // direct URL first then the same image via /api/img-proxy (server-side fetch)
      // before ever falling back to the hero.
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
      // ?garment=<encoded url> → try on an arbitrary external product image (used by
      // the brand storefront's live results that aren't tied to a stored look).
      const garmentParam = params.get("garment");
      const garmentUrl = garmentParam ? decodeURIComponent(garmentParam) : "";
      const garmentProxied = garmentUrl ? `/api/img-proxy?url=${encodeURIComponent(garmentUrl)}` : undefined;
      const altParam = params.get("alt");
      const altIdx = altParam !== null && /^\d+$/.test(altParam) ? Number(altParam) : -1;
      const altThumb = altIdx >= 0 ? look.alternatives?.[altIdx]?.thumbnail : undefined;
      const altProxied = altThumb ? `/api/img-proxy?url=${encodeURIComponent(altThumb)}` : undefined;
      const garmentData = await firstValidImageDataUrl([
        garmentUrl, garmentProxied,
        altThumb, altProxied,
        // No specific product chosen → prefer the curator's uploaded garment reference
        // (clothesImageUrl), then the look's hero/product images.
        ...(garmentUrl || altThumb ? [] : [look.clothesImageUrl, look.garmentFrontImageUrl, look.frontImageUrl, look.imageUrl, look.galleryImageUrls?.[0]]),
      ]);
      const coverageRule = "Coverage rule: the generated image must keep the person at least as covered as in the original photo. Never expose more skin, remove undergarments, or show less clothing than the input. No nudity; keep intimate areas (chest, groin, buttocks) covered at all times.";
      const prompt = photo
        ? `Virtual fashion try-on. Dress the SAME person from the uploaded photo in the complete selected outfit and render them full-length, from head to toe, in a natural standing fashion pose. IMPORTANT: the uploaded photo may show only part of the person (a face, a head-and-shoulders selfie, or an upper body). If so, realistically extend it into a complete full-length body that matches their apparent age, build, and skin tone — do NOT ask for or require a full-body photo, just generate the rest of the body naturally. Preserve the person's face, hair, skin tone, and identity exactly. Professional editorial framing. ${coverageRule} Look: ${look.name}.`
        : `Full-body fashion campaign image. Professional AI model shown head to toe wearing the complete selected outfit. Full-length framing. ${coverageRule} Look: ${look.name}.`;
      // Curator-uploaded location reference → sent as a background/scene image for the
      // try-on (OpenAI path only; FASHN garment-swap ignores it). Best-effort: a failed
      // fetch just means no location background, never a failed try-on.
      const locationData = look.locationImageUrl
        ? await firstValidImageDataUrl([look.locationImageUrl, `/api/img-proxy?url=${encodeURIComponent(look.locationImageUrl)}`]).catch(() => "")
        : "";
      // Fresh FormData per request (a body can't be reused across two fetches).
      const buildForm = () => {
        const fd = new FormData();
        fd.append("image", dataUrlToBlob(garmentData), `${look.id}.jpg`);
        if (photo) fd.append("modelImage", dataUrlToBlob(photo), "user-photo.jpg");
        if (locationData) fd.append("locationImage", dataUrlToBlob(locationData), "location.jpg");
        fd.append("visitorId", accountId || "anon");
        fd.append("lookId", look.id);
        fd.append("mode", "fashion-model");
        fd.append("aspectRatio", "9:16");
        fd.append("prompt", prompt);
        // Identify staff so they bypass the try-on kill-switch server-side.
        if (staffCuratorId()) fd.append("curatorId", staffCuratorId());
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
      // Include the admin PIN so an admin bypasses the kill-switch server-side too.
      const headers: Record<string, string> = { "x-shopcut-account-id": billingId, ...(adminPin() ? { "x-try-look-admin-pin": adminPin() } : {}) };
      // Engine routing decided UPFRONT from the look (no wasteful double-loop):
      //  • Lingerie/swim → FASHN directly (OpenAI would refuse or cover it up).
      //  • Normal apparel → OpenAI; only if OpenAI unexpectedly safety-blocks do we
      //    fall back to FASHN as a thin safety net.
      // Lingerie either because the LOOK is lingerie, or because the chosen shop
      // card (?alt=N) is the injected lingerie upsell → FASHN in both cases.
      const isLingerie = look.lingerie === true || (altIdx >= 0 && look.alternatives?.[altIdx]?.lingerie === true);
      let res: Response;
      let payload: { image?: string; error?: string; outOfCredits?: boolean; paused?: boolean };
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
      // Kill-switch: try-on is paused. The account/email is already captured (the gate ran
      // before this), so we show a friendly "coming soon" screen instead of an error.
      if (res.status === 403 && payload.paused) { setTryonPaused(true); setStep("paused"); return; }
      if (!res.ok || !payload.image) throw new Error(payload.error ?? "Generation failed.");
      setResultImage(payload.image);
      setProgress(100);
      // The email gate already happened BEFORE this generation, so just show the result.
      setStep("result");
      // Post the try-on FIRST (so its generation is persisted), THEN start the video.
      // Running them in parallel raced the shared state save and lost the try-on.
      void (async () => {
        // Always SAVE the try-on (so it's in the user's account); postToFeed sets the
        // `feed` flag = public choice (and lingerie stays private for end-users).
        await postToFeed(payload.image);
        // Email the look + a sign-in link to the gate email — app-controlled via Resend
        // (Supabase's own magic-link email is disabled on this project). Anonymous funnel
        // visitors only; logged-in users & staff already have a session.
        if (ownerEmailRef.current && !authSession && !isStaff) {
          void fetch("/api/send-look-link", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: ownerEmailRef.current,
              lookName: look?.name,
              imageUrl: sharedImageUrlRef.current || undefined,
              redirectTo: `${window.location.origin}/auth/confirm`,
            }),
          }).catch(() => {});
        }
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
    let resume: { returnTo?: string; lookId?: string; userPhoto?: string; visibility?: "public" | "private"; rightsConsentAt?: string; name?: string } | null = null;
    try { resume = JSON.parse(sessionStorage.getItem("lb_resume_tryon") ?? "null"); } catch { /* ignore */ }
    if (!resume || resume.lookId !== look.id) return;
    const isCurator = (() => { try { return !!JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id; } catch { return false; } })();
    // Resume once the visitor is authenticated — either they finished the curator
    // application (isCurator) OR they signed in via Google/Facebook (authSession).
    if (!isCurator && !authSession) return;
    resumedRef.current = true;
    try { sessionStorage.removeItem("lb_resume_tryon"); } catch { /**/ }
    // Gate conversion via Google/Facebook — fire the pixel events (this effect only runs
    // when the visitor came back from an OAuth sign-in they started at the try-on gate).
    trackMetaPixel("Lead", { content_name: look.name, content_category: "tryon" });
    trackMetaPixel("CompleteRegistration", { content_name: look.name, method: "social" });
    // Restore the consent the user gave at the gate BEFORE the OAuth redirect, so the
    // resumed generation logs it and respects the public/private choice.
    if (resume.visibility) {
      const isPublic = resume.visibility === "public";
      setShowInFeed(isPublic);
      showInFeedRef.current = isPublic;
      setVisibility(resume.visibility);
      setRightsConsent(true);
      if (resume.name) setShareNameInput(resume.name); // keep the name they entered → shown on the post
      consentRef.current = { at: resume.rightsConsentAt || new Date().toISOString(), publishText: isPublic ? PUBLISH_CONSENT_TEXT : "", rightsText: RIGHTS_CONSENT_TEXT };
    }
    let photo = resume.userPhoto;
    if (!photo) { try { photo = sessionStorage.getItem("lb_model_image") ?? ""; } catch { /**/ } }
    if (photo) {
      setUserPhoto(photo);
      // Pass the photo explicitly so generation doesn't race the state update.
      void handleGenerate(photo);
    } else {
      setStep("confirm"); // no photo saved → they re-pick, but stay on this look
    }
  }, [look, authSession]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const name = shareNameInput.trim() || curatorName || meta.username || meta.full_name || "LuxuryBandit member";
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
          ownerEmail: ownerEmailRef.current || authSession?.user?.email || undefined,
          curatorId: curatorId || undefined,
          image: imageSmall, userPhotoImage: userPhotoSmall,
          genKind: lastGenKindRef.current, // photo | video | video360 (for the post-info history)
          // Public only if chosen Public AND (not lingerie OR a creator/admin). End-user
          // lingerie try-ons stay private; staff/creators MAY publish lingerie to the feed.
          feed: showInFeedRef.current && (!isLingerieTryon() || isStaff),
          // Provable active consents (verbatim wording + timestamp).
          publishConsent: showInFeedRef.current && (!isLingerieTryon() || isStaff) && !!consentRef.current?.publishText,
          consentTimestamp: consentRef.current?.at,
          consentText: consentRef.current?.publishText || undefined,
          rightsConsent: !!consentRef.current?.rightsText,
          rightsConsentText: consentRef.current?.rightsText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.generationId) sharedGenIdRef.current = String(data.generationId);
      // Signed URL of the just-posted try-on (returned by the generation action) → email.
      if (data?.imageUrl) sharedImageUrlRef.current = String(data.imageUrl);
      setSharedToGallery(true);
    } catch { /**/ } finally { setIsSharing(false); }
  };

  // Toggle whether this try-on appears in the feed (consent).
  const toggleShowInFeed = async (next: boolean) => {
    if (next && isLingerieTryon() && !isStaff) return; // end-user lingerie stays private; creators/admin may publish
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
      } else if (resultImage && showInFeed && (!isLingerieTryon() || isStaff)) {
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

  // ── Email GATE: reveal the result after the visitor drops their email ──
  // Registration required to reveal (no more anonymous email-only reveals): create a real
  // account with email + password — or sign in if it already exists — record consent,
  // capture the lead (WITH the name) for the funnel, then reveal.
  const gateRegister = async () => {
    const email = gateEmail.trim().toLowerCase();
    const pw = gatePassword;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || pw.length < 6 || !look) return;
    if (!rightsConsent || !shareNameInput.trim()) return; // name + rights attestation required
    setError(null); setGateInfo(""); setGateBusy(true);
    const isPublic = visibility === "public" && !effectiveLingerie; // lingerie is never public
    consentRef.current = { at: new Date().toISOString(), publishText: isPublic ? PUBLISH_CONSENT_TEXT : "", rightsText: RIGHTS_CONSENT_TEXT };
    setShowInFeed(isPublic);
    ownerEmailRef.current = email;
    const name = shareNameInput.trim();
    // Capture the lead (with the name) too — feeds the funnel + the admin Users list.
    void fetch("/api/try-this-look", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lead", email, customerName: name, lookId: look.id, lookName: look.name, leadSource: "tryon", marketingConsent: true, visitorId: accountId || "anon" }),
    }).catch(() => {});
    const reveal = (session: SupabaseAuthSession) => {
      trackMetaPixel("Lead", { content_name: look.name, content_category: "tryon" });
      setAuthSession(session); setGatePassed(true); setGateBusy(false);
      const a = pendingGenRef.current;
      void handleGenerate(a?.photoOverride, a?.tier ?? "photo", true);
    };
    try {
      const { session, confirmationRequired } = await signUpWithPassword(email, pw, name);
      if (session) { trackMetaPixel("CompleteRegistration", { content_name: look.name }); return reveal(session); }
      if (confirmationRequired) {
        setGateInfo("Wir haben dir eine Bestätigungs-Mail geschickt. Bestätige deine E-Mail und melde dich dann an, um deinen Look zu sehen.");
        setGateBusy(false);
        return;
      }
    } catch {
      // Email likely already registered → try signing in with the given password.
      try { const s = await signInWithPassword(email, pw); if (s) return reveal(s); } catch { /**/ }
      setError("E-Mail schon registriert oder Passwort falsch. Bitte einloggen oder anderes Passwort wählen.");
      setGateBusy(false);
      return;
    }
    setGateBusy(false);
  };

  // Reveal via Google/Facebook: save where to resume, then bounce through OAuth.
  // On return, /auth/confirm signs them in and sends them back here; the resume
  // effect picks up the saved photo and runs the generation (now authenticated).
  const gateOAuth = (provider: "google" | "facebook") => {
    if (!look || !rightsConsent || !shareNameInput.trim()) return; // name + consent required
    let photo = userPhoto ?? "";
    try { if (!photo) photo = sessionStorage.getItem("lb_model_image") ?? ""; } catch { /**/ }
    // Persist name + consent + visibility through the OAuth round-trip so the resumed
    // generation uses them (the social path must not bypass any of it).
    try {
      sessionStorage.setItem("lb_resume_tryon", JSON.stringify({
        lookId: look.id, userPhoto: photo, returnTo: `/tryon/${look.id}`,
        visibility, rightsConsentAt: new Date().toISOString(), name: shareNameInput.trim(),
      }));
    } catch { /**/ }
    // Where to land after OAuth — stored (not in the redirect URL) so Supabase's
    // redirect allowlist can't drop it and bounce us to the Site URL (the feed).
    try { sessionStorage.setItem("lb_oauth_return", `/tryon/${look.id}`); } catch { /**/ }
    signInWithOAuth(provider, `${window.location.origin}/auth/confirm`);
  };

  // Cross-sell carousel — other looks to try on next. Reused on the result, confirm
  // and generating steps (dark=true for the dark steps). items-start keeps every card
  // top-aligned so none look "shifted".
  const crossSellRow = (dark: boolean) => {
    // Boudoir (lingerie) templates are NOT offered in the general "choose a look"
    // row — same rule as the feed's "All". Only when the current look is itself
    // Boudoir do we surface other Boudoir looks.
    const showBoudoir = effectiveLingerie;
    const looksToShow = moreLooks.filter(l => showBoudoir || !l.lingerie);
    return looksToShow.length === 0 ? null : (
    <div className="w-full max-w-md">
      <p className={`mb-2 text-sm font-black ${dark ? "text-white" : "text-black"}`}>Try these looks too ✨</p>
      <div className="flex items-start gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {looksToShow.map(l => (
          <button key={l.id} type="button" onClick={() => router.push(`/tryon/${l.id}`)}
            className="w-24 shrink-0 text-left active:scale-95 transition-transform">
            <div className={`relative aspect-[3/4] overflow-hidden rounded-xl border ${dark ? "border-white/15 bg-white/5" : "border-black/10 bg-black/[0.03]"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.img} alt={l.name} loading="lazy" className="h-full w-full object-cover object-top" />
            </div>
            <p className={`mt-1 line-clamp-1 text-[11px] font-black ${dark ? "text-white" : "text-black"}`}>{l.name}</p>
            <p className={`text-[10px] font-bold ${dark ? "text-white/50" : "text-black/45"}`}>{l.price || " "}</p>
          </button>
        ))}
      </div>
    </div>
    );
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

  // Kill-switch: try-on is paused for end-users. The visit still reached us (the click
  // is counted), we just show a "coming soon" screen. Admin/staff bypass and proceed.
  if (tryonPaused && !canUseTryon) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-white px-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-black/[0.06]">
            <Sparkles className="h-7 w-7 text-black/60" />
          </div>
          <h1 className="text-xl font-black text-black">Try-on is coming soon</h1>
          <p className="mt-2 text-sm font-medium text-black/55">
            Virtual try-on for <span className="font-bold text-black">{look.name}</span> is almost ready — we&apos;re putting the final touches on it. Check back very soon to dress this look on your own photo.
          </p>
          <button onClick={() => router.back()} className="mt-6 rounded-full bg-black px-6 py-3 text-sm font-black text-white active:scale-95 transition-transform">
            Back to the feed
          </button>
        </div>
      </main>
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

  // Run the paid video deliverable once payment is confirmed. Same routing as the
  // staff (free) branch: 360° + lingerie video use the reference-video pipeline; a
  // normal video animates the user's own result photo.
  const runPaidVideo = (tier: "video" | "video360") => {
    if (tier === "video360") { void startReferenceVideo(true); return; }
    if (effectiveLingerie) { void startReferenceVideo(false); return; }
    if (resultImage) void startTryonVideo(resultImage, false);
  };

  // Paid tier → Stripe Checkout in a POPUP (keeps the user's photo/result in memory —
  // a full-page redirect would lose them). We poll the session; on paid → generate.
  const startCheckout = async (tier: "video" | "video360") => {
    setError(null);
    // Open the popup synchronously in the click gesture so it isn't blocked.
    const popup = typeof window !== "undefined" ? window.open("about:blank", "lb-checkout", "width=480,height=760") : null;
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookId: look.id, tier }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.url || !d?.sessionId) {
        try { popup?.close(); } catch { /**/ }
        setError(d?.error || "Could not start checkout. Please try again.");
        return;
      }
      if (popup) popup.location.href = d.url; else window.location.href = d.url;
      const sid = String(d.sessionId);
      const deadline = Date.now() + 6 * 60 * 1000; // give them 6 min to pay
      const poll = async () => {
        if (Date.now() > deadline) return;
        let paid = false;
        try {
          const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(sid)}`).then(r => r.json());
          paid = !!s?.paid;
        } catch { /* transient — keep polling */ }
        if (paid) { try { popup?.close(); } catch { /**/ } runPaidVideo(tier); return; }
        if (popup?.closed) return; // user closed the popup without paying
        window.setTimeout(poll, 2500);
      };
      window.setTimeout(poll, 2500);
    } catch {
      try { popup?.close(); } catch { /**/ }
      setError("Could not start checkout. Please try again.");
    }
  };

  // "THE LOOK" preview = the exact piece we try on. Prefer the curator's uploaded
  // garment reference (clothesImageUrl) so the shown image MATCHES what the AI dresses
  // you in — not the (possibly stale) look hero/video still.
  const garmentPreviewUrl = previewAltThumb || look.clothesImageUrl || look.frontImageUrl || look.imageUrl || (look.galleryImageUrls?.[0] ?? "");
  // Garment image for AI generation is resolved at call time in handleGenerate
  // (firstValidImageDataUrl), with a validated fallback chain.
  const lookBackPath = `/look/${look.id}`;

  // On error: a chosen card falls back to its proxied URL; otherwise the garment chain.
  const garmentFallbacks = [
    previewAltThumb ? `/api/img-proxy?url=${encodeURIComponent(previewAltThumb)}` : undefined,
    look.clothesImageUrl,
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
      <div className="lb-phone-col fixed inset-x-0 bottom-0 z-[61] max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-white px-5 pt-5"
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
          <div className="flex-1 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/30 bg-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={garmentPreviewUrl} alt={look.name} className="h-full w-full object-cover object-top" onError={onGarmentError} />
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
        {/* Cross-sell while they wait */}
        <div className="mt-2 w-full max-w-md px-5">{crossSellRow(true)}</div>
      </div>
    );
  }

  // ─── PAUSED — kill-switch is on. Reached only AFTER the account/email was captured,
  //     so we keep the lead and show a friendly "coming soon" instead of an error. ───
  if (step === "paused") {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-white px-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-black/[0.06] text-3xl">✨</div>
          <h1 className="text-xl font-black text-black">Try-on is coming very soon</h1>
          <p className="mt-2 text-sm font-medium text-black/55">
            You&apos;re on the list{ownerEmailRef.current ? <> — we&apos;ll email <span className="font-bold text-black">{ownerEmailRef.current}</span></> : ""} the moment it goes live. Thanks for your patience!
          </p>
          <a href="/stores" className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-black text-white active:scale-95 transition-transform">
            Explore the feed
          </a>
        </div>
      </main>
    );
  }

  // ─── LOCKED STEP — look is "ready" but blurred until the visitor signs in ───
  if (step === "locked") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        {/* Blurred teaser background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={userPhoto || garmentPreviewUrl} alt="" className="h-full w-full object-cover object-top blur-2xl scale-125" onError={onGarmentError} />
          <div className="absolute inset-0 bg-black/65" />
        </div>
        {/* Back — never a dead end */}
        <button onClick={() => { pendingGenerateRef.current = false; setStep("confirm"); }} aria-label="Back"
          className="absolute top-12 left-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur active:scale-90 transition-transform">
          <ChevronLeft className="h-5 w-5" />
        </button>
        {/* CENTERED WHITE CARD — the email field is the clear, high-contrast focus */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-5" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-black text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="mt-3 text-2xl font-black text-black">Your look is ready ✨</p>
            <p className="mt-1.5 text-sm font-bold text-black/55">Your name, then confirm the points below, then sign in.</p>

            {/* Your name — REQUIRED, shown on your look. Comes first; gates all sign-in. */}
            <input type="text" value={shareNameInput} autoFocus
              onChange={e => setShareNameInput(e.target.value)}
              placeholder="Your name (shown on your look) *"
              className="mt-4 h-13 w-full rounded-2xl border-2 border-black/15 bg-black/[0.02] px-4 py-3.5 text-base font-bold text-black placeholder:text-black/35 outline-none focus:border-black" />

            {/* STEP 1 — consent FIRST, so no sign-in method (incl. Google/Facebook) can
                bypass it. Rights attestation is required for all paths. */}
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-left">
              <input type="checkbox" checked={rightsConsent} onChange={e => setRightsConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-black" />
              <span className="text-[12px] font-bold leading-snug text-black/70">
                I confirm I am the person in the photo, or I have their permission, and I have the right to use this photo.
              </span>
            </label>
            {/* Who can see it — Public (= consent to publish) or Only me (account only).
                Lingerie/swimwear can NEVER be public: forced to "Only me", Public disabled. */}
            <p className="mt-3 mb-1.5 text-left text-[11px] font-black uppercase tracking-wider text-black/40">Who can see this?</p>
            <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-black/[0.05] p-1">
              <button type="button" disabled={effectiveLingerie} onClick={() => setVisibility("public")}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-black transition disabled:opacity-30 ${(visibility === "public" && !effectiveLingerie) ? "bg-white text-black shadow-sm ring-1 ring-black/5" : "text-black/45"}`}>
                <Sparkles className="h-4 w-4" /> Public
              </button>
              <button type="button" onClick={() => setVisibility("private")}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-black transition ${(visibility === "private" || effectiveLingerie) ? "bg-white text-black shadow-sm ring-1 ring-black/5" : "text-black/45"}`}>
                🔒 Only me
              </button>
            </div>
            <p className="mt-1.5 text-left text-[11px] font-bold leading-snug text-black/45">
              {effectiveLingerie
                ? "Lingerie & swimwear stay private — only you can see this in your account. It can't be published to the community."
                : visibility === "public"
                  ? "Public means you agree this image may be shared to the LuxuryBandit community. You can remove it anytime."
                  : "Only you can see this in your account. You can publish it later if you change your mind."}
            </p>

            {/* STEP 2 — sign in. All methods DISABLED until the rights box is ticked, so
                Google/Facebook can't skip the consent above. */}
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-black/10" />
              <span className="text-[11px] font-black uppercase tracking-wider text-black/30">{(shareNameInput.trim() && rightsConsent) ? "now sign in" : "add your name & tick the box"}</span>
              <div className="h-px flex-1 bg-black/10" />
            </div>
            <div className={`grid gap-2.5 ${(shareNameInput.trim() && rightsConsent) ? "" : "pointer-events-none opacity-40"}`}>
              <button type="button" disabled={!shareNameInput.trim() || !rightsConsent} onClick={() => gateOAuth("google")}
                className="flex h-13 w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-black/12 bg-white py-3.5 text-base font-black text-black active:scale-95 transition-transform">
                <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                Continue with Google
              </button>
              <button type="button" disabled={!shareNameInput.trim() || !rightsConsent} onClick={() => gateOAuth("facebook")}
                className="flex h-13 w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-black/12 bg-white py-3.5 text-base font-black text-black active:scale-95 transition-transform">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#1877F2" d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.95h-1.51c-1.49 0-1.96.93-1.96 1.88V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z"/></svg>
                Continue with Facebook
              </button>
              <div className="my-1 flex items-center gap-3">
                <div className="h-px flex-1 bg-black/10" />
                <span className="text-[11px] font-black uppercase tracking-wider text-black/30">or register with email</span>
                <div className="h-px flex-1 bg-black/10" />
              </div>
              <input type="email" inputMode="email" autoComplete="email" value={gateEmail}
                onChange={e => setGateEmail(e.target.value)}
                placeholder="you@email.com"
                className="h-13 w-full rounded-2xl border-2 border-black/15 bg-black/[0.02] px-4 py-3.5 text-base font-bold text-black placeholder:text-black/35 outline-none focus:border-black" />
              <input type="password" autoComplete="new-password" value={gatePassword}
                onChange={e => setGatePassword(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") void gateRegister(); }}
                placeholder="Choose a password (min. 6)"
                className="h-13 w-full rounded-2xl border-2 border-black/15 bg-black/[0.02] px-4 py-3.5 text-base font-bold text-black placeholder:text-black/35 outline-none focus:border-black" />
              <button onClick={() => void gateRegister()}
                disabled={gateBusy || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(gateEmail.trim()) || gatePassword.length < 6 || !rightsConsent || !shareNameInput.trim()}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-base font-black text-white active:scale-95 transition-transform disabled:opacity-30">
                {gateBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Create account &amp; reveal
              </button>
              {gateInfo && <p className="rounded-xl bg-cobalt/10 px-3 py-2 text-[12px] font-bold text-cobalt">{gateInfo}</p>}
            </div>
            <p className="mt-2.5 text-[11px] font-bold text-black/40">Your look is saved to your account — you can manage it anytime.</p>
            <button onClick={() => { pendingGenerateRef.current = false; discardPhoto(); setStep("upload"); }}
              className="mt-1 flex h-10 w-full items-center justify-center text-sm font-black text-black/50 active:opacity-70">
              Use a different photo
            </button>
          </div>
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

          {/* Result photo — tap to view fullscreen */}
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultImage} alt="Your try-on result" onClick={() => setPhotoBig(true)}
              className="max-h-[58dvh] w-full cursor-zoom-in rounded-2xl border border-black/10 object-contain shadow-lg active:opacity-90" />
            <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur">Photo</span>
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">Tap to enlarge</span>
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

          {/* Turn it into a video — paid upsell (free for staff). Shown for EVERY look
              (lingerie too, at the lingerie price); for lingerie the 360° card below is
              an ADDITIONAL premium option, not a replacement. */}
          {videoStatus === "idle" && !videoUrl && (
            <div className="rounded-2xl bg-gradient-to-br from-black to-black/80 p-3.5 text-white">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-black"><Film className="h-4 w-4" /> Want a video of this? <span className="font-bold text-white/55">· 5s</span></p>
                  <p className="mt-0.5 text-[12px] font-bold text-white/55">Bring your look to life — a 5-second clip to post &amp; share.</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-black">{isStaff ? "Free" : effectiveLingerie ? "$4.90" : "$2.90"}</span>
              </div>
              <button type="button"
                onClick={() => { if (isStaff) { if (effectiveLingerie) void startReferenceVideo(false); else if (resultImage) void startTryonVideo(resultImage, false); } else void startCheckout("video"); }}
                className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-black active:scale-95 transition-transform">
                <Film className="h-4 w-4" /> Make it a video
              </button>
              {paidSoon === "video" && !isStaff && <p className="mt-2 text-center text-[12px] font-bold text-white/70">Opening secure checkout…</p>}
            </div>
          )}

          {/* 360° turnaround — premium tier (lingerie only), IN ADDITION to the video
              card above. UI is here; the paid generation activates with Stripe checkout. */}
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
                onClick={() => { if (isStaff) void startReferenceVideo(true); else void startCheckout("video360"); }}
                className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-black active:scale-95 transition-transform disabled:opacity-50">
                {isStaff && videoStatus === "generating" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Get the 360° video
              </button>
              {show360Note && !isStaff && <p className="mt-2 text-center text-[12px] font-bold text-white/70">Opening secure checkout…</p>}
            </div>
          )}

          {/* Optional email capture (after the result) — for no-login QR/event
              try-ons. Hidden once the email GATE already captured it. */}
          {!authSession && !curatorId && !gatePassed && (
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

          {/* Show in feed. Lingerie is private for anonymous end-users; a creator
              (staff/curator like Szidonia) may save & post their own content. */}
          {effectiveLingerie && !isStaff ? (
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.06] text-base">🔒</span>
              <div className="min-w-0">
                <p className="text-sm font-black">Private — only you</p>
                <p className="text-[12px] font-bold text-black/45">Lingerie try-ons are never posted publicly. Download or share it yourself.</p>
              </div>
            </div>
          ) : (
          <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 flex flex-col gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black">Share your look &amp; win ✨</p>
              <p className="text-[12px] font-bold text-black/45">Post your {videoUrl ? "photo & video " : "photo "}to the community — the most-liked looks win credits.<span className="text-emerald-600">*</span></p>
            </div>
            {showInFeed ? (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[12px] font-black text-emerald-700">
                  {isSharing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Posting…</> : <><Send className="h-3.5 w-3.5" /> Posted to the community</>}
                </p>
                <button type="button" onClick={() => void toggleShowInFeed(false)} className="text-[12px] font-black text-black/45 active:opacity-70">Remove</button>
              </div>
            ) : (
              <>
                <input
                  value={shareNameInput}
                  onChange={e => { setShareNameInput(e.target.value); setNameSaved(false); }}
                  placeholder="Your name (shown on your post)"
                  className="h-11 w-full rounded-xl border border-black/15 px-3 text-sm outline-none focus:border-black"
                />
                <button type="button" disabled={isSharing}
                  onClick={async () => { await toggleShowInFeed(true); if (shareNameInput.trim()) await saveName(); }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white active:scale-95 transition-transform disabled:opacity-50">
                  {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish this
                </button>
                <p className="text-center text-[11px] font-bold leading-snug text-black/40">
                  By publishing you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms</a> &amp; <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a>.
                </p>
              </>
            )}
            <p className="text-[11px] font-bold leading-snug text-black/35"><span className="text-emerald-600">*</span> The more likes your look gets, the more credits you earn — spend them on more try-ons &amp; videos.</p>
          </div>
          )}

          {/* Cross-sell — other looks to try on next */}
          {crossSellRow(false)}

          {/* Download — secondary (the name/feed step above is the primary action) */}
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

          {/* Try again */}
          <button onClick={() => { setResultImage(null); discardPhoto(); setVideoUrl(null); setVideoStatus("idle"); setVideoNote(null); setShowInFeed(true); sharedGenIdRef.current = ""; setSharedToGallery(false); setStep("upload"); }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-black/15 text-sm font-black active:opacity-70">
            <RefreshCw className="h-4 w-4" /> Try a different photo
          </button>
        </div>

        {/* Fullscreen photo — tap anywhere to close */}
        {photoBig && resultImage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95" onClick={() => setPhotoBig(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultImage} alt="Your try-on result" className="max-h-[100dvh] w-full object-contain" />
            <button type="button" aria-label="Close" onClick={() => setPhotoBig(false)}
              className="absolute right-4 top-12 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur active:scale-90">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
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

        {/* Content — flows from the top and scrolls if taller than the screen, so the
            CTA + consent line below the images are never cut off. */}
        <div className="relative z-10 flex flex-col min-h-screen px-5 pt-14 gap-6"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}>
          {/* Back */}
          <button onClick={() => setStep("upload")}
            className="absolute top-5 left-4 grid h-10 w-10 place-items-center rounded-full bg-black/30 text-white">
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Cross-sell up top — sits just below the Back button (top-5 + h-10 ≈ 60px). */}
          <div className="pt-4">{crossSellRow(true)}</div>

          {/* Title — ABOVE the two images. Lingerie/swim is a PAID try-on, so don't say
              "free": make the cost explicit. */}
          <div className="text-center">
            <p className="text-2xl font-black text-white [text-shadow:0_2px_8px_#000]">See yourself in this look ✨</p>
            <p className="mt-1 text-sm font-bold text-white/75">
              {(effectiveLingerie && !isStaff)
                ? "Lingerie & swimwear try-ons are paid — $2.90 per look, private to you."
                : "Your free AI try-on — ready in seconds"}
            </p>
          </div>

          {/* Side by side */}
          <div className="flex items-center gap-4">
            <div className="flex-1 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/60 bg-black/20 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={garmentPreviewUrl} alt={look.name} className="h-full w-full object-cover object-top" onError={onGarmentError} />
            </div>
            <ArrowRight className="h-8 w-8 text-white drop-shadow-lg shrink-0" />
            <div className="relative flex-1 aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={userPhoto} alt="Your photo" className="h-full w-full object-cover object-top" />
              {/* Delete this photo → back to upload to pick another */}
              <button type="button" aria-label="Remove photo"
                onClick={() => { discardPhoto(); setStep("upload"); }}
                className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur active:scale-90 transition-transform">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>


          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/20 p-3 text-sm text-white">
              <p className="font-black">{error}</p>
              {error.toLowerCase().includes("rejected") && (
                <ul className="mt-1.5 text-xs text-white/80 list-disc pl-4 space-y-0.5">
                  <li>Any clear photo of you works — selfie or full-length</li>
                  <li>Good lighting, face clearly visible</li>
                  <li>No heavy filters</li>
                </ul>
              )}
            </div>
          )}

          {/* Choose what to create — Photo (the base try-on), Video, or 360°.
              Photo generates now; the paid video tiers activate with checkout. */}
          <div className="grid gap-2">
            <button type="button" onClick={() => { setPaidSoon(""); void handleGenerate(); }}
              className="flex h-14 w-full items-center gap-3 rounded-2xl bg-white px-4 text-black shadow-xl active:scale-95 transition-transform">
              <Sparkles className="h-5 w-5 shrink-0 text-blue-600" />
              <span className="text-base font-black">See me in this look</span>
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
            {/* The publish/private choice is made at the next step (the gate); just point
                to the Terms/Privacy here. */}
            <p className="px-2 text-center text-[11px] leading-snug font-medium text-white/65">
              Next you&apos;ll choose to keep it private or share it. You agree to our{" "}
              <a href="/terms" className="font-bold text-white/85 underline">Terms</a> &{" "}
              <a href="/privacy" className="font-bold text-white/85 underline">Privacy</a>.
            </p>
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
          <p className="text-sm font-black truncate">{publicLookTitle(look) || "Luxury look"}</p>
        </div>
        {look.price && <p className="text-sm font-black shrink-0">{look.salePrice ?? look.price}</p>}
      </div>

      {/* Look preview + upload — scrollable so the action buttons are always reachable */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 py-5 gap-5">
        {/* Instructions — price folded into the title (the pill looked like a button) */}
        <div className="text-center">
          <p className="text-xl font-black">Try this look on you · <span className={effectiveLingerie && !isStaff ? "text-black" : "text-emerald-600"}>{isStaff ? "Free" : effectiveLingerie ? "$2.90" : "Free"}</span></p>
          <p className="mt-1 text-sm text-black/50">Add your photo and AI dresses you in this outfit — optional video after</p>
        </div>

        {/* The look + YOUR photo placeholder, side by side — makes the try-on obvious.
            The placeholder IS the upload target. */}
        <div className="flex w-full max-w-sm items-center justify-center gap-2.5">
          {/* The look */}
          <div className="flex-1">
            <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-black/10 bg-black/[0.03] shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={garmentPreviewUrl} alt={look.name} className="h-full w-full object-cover object-top" onError={onGarmentError} />
            </div>
            <p className="mt-1.5 text-center text-[11px] font-black uppercase tracking-[0.12em] text-black/40">The look</p>
          </div>
          {/* + connector */}
          <span className="shrink-0 pb-5 text-2xl font-black text-black/20">+</span>
          {/* Your photo = upload placeholder */}
          <div className="flex-1">
            <button onClick={() => fileInputRef.current?.click()}
              className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/25 bg-black/[0.02] px-2 text-center transition active:scale-95 hover:border-black/45">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-black text-white shadow-lg"><ImagePlus className="h-5 w-5" /></span>
              <span className="text-sm font-black leading-tight text-black">Upload your photo</span>
              <span className="text-[11px] font-bold leading-tight text-black/40">Tap to add any photo of yourself</span>
            </button>
            <p className="mt-1.5 text-center text-[11px] font-black uppercase tracking-[0.12em] text-black/40">You</p>
          </div>
        </div>

        {/* Profile photo (creators) — alternative to uploading */}
        {curatorPhotoUrl && (
          <button onClick={onUseProfilePhoto} disabled={loadingProfilePhoto}
            className="flex h-12 w-full max-w-sm items-center justify-center gap-3 rounded-2xl border-2 border-black/10 bg-white text-sm font-black text-black active:scale-95 transition-transform disabled:opacity-50">
            {loadingProfilePhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={curatorPhotoUrl} alt="" className="h-7 w-7 rounded-full object-cover border border-black/15" />
            )}
            Use my profile photo instead
          </button>
        )}

        {/* Tips */}
        <div className="w-full max-w-xs rounded-xl border border-black/8 bg-black/[0.03] p-4">
          <p className="text-xs font-black text-black/50 mb-2">Photo tips for best results:</p>
          <ul className="text-xs text-black/40 space-y-1 list-disc pl-4">
            <li>Any photo of you — a selfie or full-length both work</li>
            <li>Good lighting, face clearly visible</li>
            <li>No heavy filters</li>
          </ul>
        </div>
      </div>

      {/* Profile-photo consent */}
      {showPhotoConsent && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowPhotoConsent(false)} />
          <div className="lb-phone-col fixed inset-x-0 bottom-0 z-[51] rounded-t-2xl bg-white px-5 pt-5"
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

