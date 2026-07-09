"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, ArrowLeft, ArrowRight, Check, RefreshCw, Lock, Play, Trash2, ImageUp, X, MessageCircle, Maximize2, Crown } from "lucide-react";
import PremiumDialog from "@/components/PremiumDialog";
import SubscribeDialog from "@/components/SubscribeDialog";
import ModelChat from "@/components/ModelChat";
import { FeedGate } from "@/components/FeedGate";
import BottomNav from "@/components/BottomNav";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

type Outfit = { id: string; name: string; imageUrl: string; lookId?: string };
type Look = { id: string; name: string; imageUrl?: string; frontImageUrl?: string; videoPosterUrl?: string; modelPhotoUrl?: string; curatorName?: string; featured?: boolean };

// Rotating video prompts — a DIFFERENT scene/lighting/motion each generation, so the same
// model×look never looks the same twice (never boring). First @-token = person, second =
// outfit (server binds by order). Keep the "exactly the same" guarantee + "no text/logos".
const PROMPT_POOL = [
  "@1 presents the @2 in an elegant studio with soft premium lighting and a subtle gentle sway. Keep @1 face and appearance and the @2 exactly the same. Fluid calm motion, photorealistic, high-end fashion catalogue look. No text or logos.",
  "@1 presents the @2 on a rooftop terrace at golden-hour sunset with a warm glow and a slow graceful turn. Keep @1 face and appearance and the @2 exactly the same. Fluid calm motion, photorealistic, high-end fashion catalogue look. No text or logos.",
  "@1 presents the @2 in a bright minimalist white studio with soft daylight and a slow confident walk toward the camera. Keep @1 face and appearance and the @2 exactly the same. Fluid calm motion, photorealistic, high-end fashion catalogue look. No text or logos.",
  "@1 presents the @2 in a luxury penthouse beside floor-to-ceiling windows with soft natural light and a graceful side-to-side sway. Keep @1 face and appearance and the @2 exactly the same. Fluid calm motion, photorealistic, high-end fashion catalogue look. No text or logos.",
  "@1 presents the @2 in a marble hallway with warm ambient light and a slow quarter turn. Keep @1 face and appearance and the @2 exactly the same. Fluid calm motion, photorealistic, high-end fashion catalogue look. No text or logos.",
  "@1 presents the @2 on a sunlit garden terrace with natural light and a light playful spin. Keep @1 face and appearance and the @2 exactly the same. Fluid calm motion, photorealistic, high-end fashion catalogue look. No text or logos.",
  "@1 presents the @2 in a dark studio under a single soft spotlight with a slow elegant turn. Keep @1 face and appearance and the @2 exactly the same. Fluid calm motion, photorealistic, high-end fashion catalogue look. No text or logos.",
  "@1 presents the @2 in a chic boutique with warm designer lighting and a subtle confident sway. Keep @1 face and appearance and the @2 exactly the same. Fluid calm motion, photorealistic, high-end fashion catalogue look. No text or logos.",
];
const pickPrompt = () => PROMPT_POOL[Math.floor(Math.random() * PROMPT_POOL.length)];

// Downscale a picked avatar so it stays small (never uploaded before payment anyway).
async function fileToDataUrl(file: File, max = 1000, quality = 0.85): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", quality);
}

const isAuthed = () => { try { return !!getStoredAuthSession(); } catch { return false; } };

// Fallback prompt shown when the admin taps "Reset text" (mirrors the server default).
const DEFAULT_HINT = "Mache die Frau aus @Bild1 angezogen in @Bild2 in verschiedenen Urlaubsorten auf der Welt, in unterschiedlichen Locations, wie sie durchläuft.";

export default function TryFunnelPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lookId = String(params?.lookId ?? "");
  // The specific try-on's ORIGINAL image, passed from the feed (?model=…). It's the person
  // who actually did THIS try-on — used as the model instead of the look's stock still.
  const modelParam = searchParams?.get("model") ?? "";
  // The chosen model's identity (so the generated try-on is attributed to HER — feed +
  // her profile "In motion" — not the garment's owner). Passed from a model page; overridden
  // when the user switches models in the picker.
  const modelIdParam = searchParams?.get("modelId") ?? "";
  const modelNameParam = searchParams?.get("modelName") ?? "";
  // When opened from a model's wardrobe: the exact garment to put her in (its image URL).
  const garmentParam = searchParams?.get("garment") ?? "";
  // Garment-first (from the Garderobe tab): the garment is chosen but not the model yet →
  // step 2 shows a model picker.
  const pickModel = (searchParams?.get("pick") ?? "") === "1";
  // Set when the user taps an outfit → the top shows the chosen outfit + model (a confirm view)
  // instead of the model coverflow. "Cancel" reveals the picker again.
  const pickedParam = (searchParams?.get("picked") ?? "") === "1";
  const [gModels, setGModels] = useState<{ id: string; name: string; photoUrl: string; featured?: boolean; realModel?: boolean }[]>([]);
  const [isPaid, setIsPaid] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false); // $49/mo subscriber → unlimited chat
  const [showPremium, setShowPremium] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [outfitZoom, setOutfitZoom] = useState(false); // fullscreen the selected garment
  const [zoomSrc, setZoomSrc] = useState(""); // fullscreen ANY outfit tapped from the strip
  const [zoomName, setZoomName] = useState("");
  useEffect(() => { try { const admin = !!localStorage.getItem("luxurybandit-try-look-admin-pin"); setIsPaid(admin || localStorage.getItem("lb_paid") === "1"); setIsSubscribed(admin || localStorage.getItem("lb_subscribed") === "1"); } catch { /**/ } }, []);
  const [pickedModel, setPickedModel] = useState("");
  // Resolve the model's photo from ?modelId= when no ?model= photo is passed — so a shareable
  // link (e.g. an ad) only needs /try/<look>?modelId=<id> and never a photo token that expires.
  const [modelPhotoResolved, setModelPhotoResolved] = useState("");
  useEffect(() => {
    if (!modelIdParam || modelParam || avatar) return;
    fetch("/api/try-this-look?models=1").then(r => r.json())
      .then(d => { const m = (Array.isArray(d.models) ? d.models : []).find((x: { id: string }) => x.id === modelIdParam); if (m?.photoUrl) setModelPhotoResolved(m.photoUrl as string); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelIdParam]);
  const [pickedModelId, setPickedModelId] = useState("");
  const [pickedModelName, setPickedModelName] = useState("");
  // "Choose other model" opens the model picker even when a model was preset (came from
  // a model page with ?model=). Load the models list for both entry points.
  const [chooseModel, setChooseModel] = useState(false);
  // Load the models list once on mount — the customer coverflow carousel and the
  // "Who should wear it?" grid both need it right away (not only when a modal opens).
  useEffect(() => {
    fetch("/api/try-this-look?models=1").then(r => r.json()).then(d => setGModels(Array.isArray(d.models) ? d.models : [])).catch(() => {});
  }, []);

  // "Choose other look" — a gallery of ALL portal garments; only the free (featured) ones
  // are selectable, the rest are Premium (padlock). Picking one reloads the funnel on that look.
  const [chooseLook, setChooseLook] = useState(false);
  const [gGarments, setGGarments] = useState<{ id: string; name: string; img: string; featured?: boolean; hasVideo?: boolean }[]>([]);
  const [lookVideoFilter, setLookVideoFilter] = useState<"all" | "video" | "novideo">("all"); // admin production filter

  const [look, setLook] = useState<Look | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [comboCancelled, setComboCancelled] = useState(false); // "Cancel" on the outfit+model confirm view
  const [avatar, setAvatar] = useState<string>("");       // user's own photo (data URL)
  const [gateOpen, setGateOpen] = useState(false);
  const [rendering, setRendering] = useState(false);       // fake "generating" spinner before the teaser
  // Paid video pack ($8 → 4 videos). packCredits = how many the signed-in user has left.
  const [packCredits, setPackCredits] = useState<number | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const swipeRef = useRef(0); // carousel drag: pointer-down X, to detect left/right swipes
  const swipedRef = useRef(false); // a swipe just happened → suppress the trailing card click
  const [lockedNudge, setLockedNudge] = useState(false); // tried to generate on a Premium model

  // Admin-only prompt preview/editor (@Bild1 = model, @Bild2 = outfit).
  const [adminPin, setAdminPin] = useState("");
  const [prompt, setPrompt] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  // Admin can flip to the pure end-user view to test exactly what a user sees.
  const [previewAsUser, setPreviewAsUser] = useState(false);
  // Load garments once on mount — the customer's inline Outfits scroll, the "Change look"
  // modal, and the admin production strip all read this list.
  useEffect(() => {
    if (gGarments.length) return;
    fetch("/api/try-this-look").then(r => r.json()).then(d => {
      const looks: any[] = Array.isArray(d.looks) ? d.looks : []; // eslint-disable-line @typescript-eslint/no-explicit-any
      const g = looks
        .filter(l => (l.productType === "ai" || l.wardrobe) && (l.frontImageUrl || l.imageUrl) && l.published !== false)
        .map(l => ({ id: l.id, name: l.name, img: (l.frontImageUrl || l.imageUrl) as string, featured: l.featured === true, hasVideo: !!l.videoUrl }))
        .sort((a, b) => (b.hasVideo ? 1 : 0) - (a.hasVideo ? 1 : 0) || (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      setGGarments(g);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Real video generation (step 5, after "paid"): generate → save as the user's own
  // generation → play here. Appears in /user/tryons + admin Posts.
  const [genStatus, setGenStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [genVideoUrl, setGenVideoUrl] = useState("");
  const [genPhotoUrl, setGenPhotoUrl] = useState(""); // model self-service result (photo-only)
  // The generation id of the just-made video — lets the admin upscale THIS clip to HD
  // right here on the result screen (no need to hunt for it in the feed).
  const [genId, setGenId] = useState("");
  const [hdBusyId, setHdBusyId] = useState(""); // which generation id is upscaling ("" = none)
  const [hdMsg, setHdMsg] = useState("");
  // Free cache hit: if this exact combo already exists, we PLAY the real video right on the
  // "ready" step (step 3) instead of a blurred teaser + sign-in wall — free videos are watchable.
  const [previewVideoUrl, setPreviewVideoUrl] = useState("");
  const [previewGenId, setPreviewGenId] = useState("");
  // Theatrical reveal for a free cache hit: the real video plays and slowly sharpens from
  // blurry over ~30s (instead of a boring spinner). `revealSharp` drives the CSS deblur.
  const [revealing, setRevealing] = useState(false);
  const [revealSharp, setRevealSharp] = useState(false);
  const [previewPoster, setPreviewPoster] = useState("");
  const revealVideoRef = useRef<HTMLVideoElement>(null);
  const REVEAL_MS = 10000;
  // "Motion" pick: what she DOES in the video. The user only sees the two chips —
  // the prompt swap happens server-side. Dance = Pixverse also generates music.
  const [motion, setMotion] = useState<"turn" | "dance">("turn");
  // Admin per-video option: generate this clip in gentle slow motion (Pixverse makes the
  // music match the slower pace — no audio distortion, unlike slowing playback).
  const [slowmo, setSlowmo] = useState(false);
  // A signed-in MODEL (curator session): she generates PHOTOS of herself — the team
  // turns the best ones into videos. Admin keeps the full video flow.
  const [myModel, setMyModel] = useState<{ id: string; firstName?: string } | null>(null);
  useEffect(() => {
    try { const c = JSON.parse(localStorage.getItem("lb_curator") ?? "null"); if (c?.id) setMyModel(c); } catch { /**/ }
  }, []);
  // Models are treated exactly like normal users in the funnel now: they generate VIDEOS
  // (not photo-only) and spend the same $8 video-pack credits. So the model-session branch
  // is disabled here. (Their public model page / creator side is unaffected.)
  const isModelSession = false;
  const [genError, setGenError] = useState("");
  const genStartedRef = useRef(false);
  const forceFreshRef = useRef(false); // "Generate a fresh one" → skip cache, make a NEW unique clip
  // The chosen model's videos (incl. the one just made) — shown as a gallery on the done screen.
  const [madeVideos, setMadeVideos] = useState<{ id: string; imageUrl: string; videoUrl?: string; lookName?: string; feed?: boolean; public?: boolean }[]>([]);
  // Admin "My Gallery" on the model step: ALL generated videos across models (not just this
  // model). Model-by-model separation comes later.
  const [galleryVideos, setGalleryVideos] = useState<{ id: string; imageUrl: string; videoUrl?: string; lookName?: string; curatorId?: string; feed?: boolean; public?: boolean }[]>([]);
  // Admin: per-video visibility controls on the result gallery.
  const vidAction = async (body: Record<string, unknown>) => {
    await fetch("/api/try-this-look", { method: "POST", headers: { "Content-Type": "application/json", ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}) }, body: JSON.stringify(body) }).catch(() => {});
  };
  const setVideoFeed = async (id: string, feed: boolean) => {
    setMadeVideos(m => m.map(x => x.id === id ? { ...x, feed, ...(feed ? {} : { public: false }) } : x));
    await vidAction({ action: "set-generation-feed", generationId: id, feed });
  };
  const setVideoPublic = async (id: string, pub: boolean) => {
    setMadeVideos(m => m.map(x => x.id === id ? { ...x, public: pub, ...(pub ? { feed: true } : {}) } : x));
    await vidAction({ action: "set-generation-public", generationId: id, public: pub });
  };
  const deleteVideoGen = async (id: string) => {
    if (!window.confirm("Delete this video permanently?")) return;
    setMadeVideos(m => m.filter(x => x.id !== id));
    await vidAction({ action: "delete-generation", id });
  };

  useEffect(() => {
    // Admin "view as her" preview: PIN ignored so the funnel behaves exactly like
    // for the model herself (photo path, no admin panels).
    try { setAdminPin(localStorage.getItem("lb_preview_model") ? "" : (localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "")); } catch { /**/ }
  }, []);

  useEffect(() => {
    fetch(`/api/try-this-look?previewId=${encodeURIComponent(lookId)}`).then(r => r.json()).then(d => setLook(d.look ?? null)).catch(() => {});
    fetch(`/api/try-this-look`).then(r => r.json()).then(d => {
      setPrompt(d.funnelVideoPrompt ?? "");
    }).catch(() => {});
  }, [lookId]);

  // The garment is always determined (from a model's wardrobe via ?garment=, else the
  // look's own piece) — so we SKIP the generic outfit picker and start at "Who wears it?".
  const skipRef = useRef(false);
  useEffect(() => {
    if (skipRef.current || step !== 1) return;
    const g = garmentParam || look?.frontImageUrl || look?.imageUrl || "";
    if (g) {
      skipRef.current = true;
      setOutfit({ id: "wardrobe", name: "Selected piece", imageUrl: g, lookId });
      setStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garmentParam, look]);

  const savePrompt = async () => {
    setPromptSaving(true); setPromptSaved(false);
    try {
      const res = await fetch("/api/try-this-look", { method: "POST", headers: { "Content-Type": "application/json", ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}) }, body: JSON.stringify({ action: "set-funnel-prompt", prompt }) });
      if (res.ok) { setPromptSaved(true); window.setTimeout(() => setPromptSaved(false), 2000); }
    } catch { /**/ } finally { setPromptSaving(false); }
  };

  // The "woman from the video" reference — the look's own poster/front image, unless the
  // user replaced it with their own avatar.
  const modelImg = avatar || pickedModel || modelParam || modelPhotoResolved || look?.modelPhotoUrl || look?.videoPosterUrl || look?.frontImageUrl || look?.imageUrl || "";
  const teaserImg = garmentParam || outfit?.imageUrl || modelImg;
  // The model the try-on is attributed to (final pick wins; empty for own-photo try-ons).
  const chosenModelId = !avatar ? (pickedModelId || modelIdParam) : "";
  const chosenModelName = !avatar ? (pickedModelName || modelNameParam) : "";
  // Is this a FREE look? Featured looks are the free showcase (same ones the "Choose a
  // look" picker leaves selectable) → generating them costs nothing, no credit, no $8.
  // Own-photo (avatar) try-ons are the paid custom feature, so they never count as free.
  // Every fresh generation now costs a credit (new users get 3 FREE, then $8 = 4). Looks
  // that already have a video still play instantly & free (cached reveal) — only a NEW,
  // real generation spends a credit. So no look generates unlimited-free anymore.
  const lookIsFree = false;
  // A guest = not signed in and not the admin previewing as admin. Guests may WATCH the
  // teaser reveal, but must register / sign in before they can actually watch the finished
  // video (lead-capture gate at the "video ready" moment).
  const guest = !isAuthed() && !(adminPin && !previewAsUser);

  // Does this exact free combo (model × garment × motion) already exist? If so we can play
  // the REAL video on the ready step — no blur, no sign-in wall. Own-photo picks never cache.
  const lookupCachedVideo = async (): Promise<string> => {
    setPreviewVideoUrl(""); setPreviewGenId(""); setPreviewPoster("");
    if (avatar || !chosenModelId) return "";
    try {
      const combo = `${chosenModelId}|${lookId}|${motion}`;
      const cached = await fetch(`/api/try-this-look?combo=${encodeURIComponent(combo)}`).then(r => r.json());
      if (cached?.hit && cached.videoUrl) { setPreviewVideoUrl(cached.videoUrl); setPreviewGenId(cached.generationId || ""); setPreviewPoster(cached.posterUrl || ""); return cached.videoUrl as string; }
    } catch { /**/ }
    return "";
  };
  // During the reveal the clip stays PAUSED (just the still sharpens); it starts playing
  // only once the reveal finishes.
  useEffect(() => {
    const v = revealVideoRef.current;
    if (!v) return;
    if (revealing) { try { v.pause(); v.currentTime = 0; } catch { /**/ } }
    else { try { void v.play().catch(() => {}); } catch { /**/ } }
  }, [revealing, previewVideoUrl]);

  const goStep3 = async () => {
    setStep(3);
    setRendering(true); setRevealing(false); setRevealSharp(false);
    const hit = await lookupCachedVideo();
    if (hit) {
      // Free video exists → theatrical ~30s "unsharp → sharp" reveal of the REAL clip.
      setRendering(false);
      setRevealing(true);
      // next frame: flip to sharp so the CSS filter transition (REVEAL_MS) animates.
      requestAnimationFrame(() => requestAnimationFrame(() => setRevealSharp(true)));
      window.setTimeout(() => setRevealing(false), REVEAL_MS);
    } else {
      // No cached video → the old short spinner, then the blurred teaser + sign-in gate.
      window.setTimeout(() => setRendering(false), 2200);
    }
  };
  // Re-check the cache when the motion chip changes on the ready step (turn ↔ dance).
  useEffect(() => { if (step === 3) void lookupCachedVideo(); }, [motion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resume after a login round-trip (esp. Google OAuth, which fully reloads): if we come back
  // signed in with the resume flag set, replay the reveal instead of dropping at step 2.
  useEffect(() => {
    if (!look || step !== 2) return;
    let resume = false;
    try { resume = sessionStorage.getItem("lb_tryon_resume") === "1"; } catch { /**/ }
    if (resume && isAuthed()) { try { sessionStorage.removeItem("lb_tryon_resume"); } catch { /**/ } void goStep3(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look]);

  // A FREE (cached) try-on is served from the shared library, so nothing is saved for the
  // user by default → their "My try-ons" stays empty. Claim it: copy the shared clip into a
  // generation owned by the signed-in user (idempotent) so it shows in their gallery and gets
  // its own post. Returns the user's own generation id (falls back to the shared one).
  const claimedRef = useRef("");
  // Where "View your video" goes: a real generation → its post; a look-video fallback
  // (no per-user generation) → the look's own page.
  const goToResult = (genId: string) => router.push(genId && !genId.startsWith("look:") ? `/post/${genId}` : `/look/${lookId}`);
  const claimCachedTryOn = async (sourceId?: string): Promise<string> => {
    const src = sourceId || previewGenId;
    if (!src || src.startsWith("look:")) return ""; // look-video fallback isn't a saveable generation
    if (claimedRef.current) return claimedRef.current;
    const session = getStoredAuthSession();
    const email = session?.user?.email;
    if (!email) return src;
    try {
      const r = await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}) },
        body: JSON.stringify({
          action: "save-cached-tryon", generationId: src,
          ownerEmail: email, userId: session?.user?.id || "",
          customerName: email.split("@")[0] || "You",
        }),
      }).then(res => res.json());
      if (r?.generationId) { claimedRef.current = r.generationId; return r.generationId; }
    } catch { /**/ }
    return src;
  };
  // Once a signed-in visitor is shown a free cached clip, save it to their gallery.
  useEffect(() => { if (step === 3 && previewGenId && isAuthed()) void claimCachedTryOn(); }, [step, previewGenId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onUnlock = () => {
    // Already signed in (guest session) OR admin previewing the flow → straight to plans.
    // In the admin's "User view", still show the gate so they can test the guest experience.
    // Free look → straight to generation (no paywall). Paid look → plans/pack step.
    if (isAuthed() || (adminPin && !previewAsUser)) setStep(lookIsFree ? 5 : 4);
    else {
      // Remember we're mid-funnel so a Google-OAuth round-trip (full reload) resumes the
      // reveal instead of dropping the visitor back at step 2.
      try { sessionStorage.setItem("lb_tryon_resume", "1"); } catch { /**/ }
      setGateOpen(true);
    }
  };

  // Extract a poster frame from the finished video (for the generation thumbnail).
  const posterFromVideo = async (videoUrl: string): Promise<string> => {
    try {
      const v = document.createElement("video");
      v.crossOrigin = "anonymous"; v.muted = true; v.src = videoUrl;
      await new Promise<void>(res => { v.onloadeddata = () => res(); v.onerror = () => res(); setTimeout(res, 7000); });
      try { v.currentTime = Math.min(2, (v.duration || 3) / 2); } catch { /**/ }
      await new Promise(r => setTimeout(r, 1000));
      const c = document.createElement("canvas"); c.width = v.videoWidth || 480; c.height = v.videoHeight || 640;
      c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.8);
    } catch { return ""; }
  };

  // Real generation: person (avatar or the video's model) + chosen outfit + the prompt →
  // Pixverse video → save as the user's own generation (poster + video). Runs once.
  const generateReal = async (outfitOverride?: Outfit) => {
    if (genStartedRef.current) return;
    genStartedRef.current = true;
    setGenStatus("generating"); setGenError("");
    const H = { "Content-Type": "application/json", ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}) };
    try {
      const person = avatar || pickedModel || modelParam || modelPhotoResolved || look?.modelPhotoUrl || look?.videoPosterUrl || look?.frontImageUrl || look?.imageUrl || "";
      const garment = garmentParam || (outfitOverride ?? outfit)?.imageUrl || "";
      if (!person || !garment) throw new Error("Referenzbilder fehlen.");

      // ── MODEL self-service: PHOTO ONLY (OpenAI dress-up, cents) — no Pixverse video.
      // The photo is saved privately, attributed to her; the team makes videos from it.
      if (isModelSession && myModel) {
        const toFile = async (src: string, name: string) => {
          const blob = await fetch(src).then(r => r.blob());
          return new File([blob], name, { type: blob.type || "image/jpeg" });
        };
        const fd = new FormData();
        fd.append("modelImage", await toFile(person, "person.jpg"));
        fd.append("image", await toFile(garment, "garment.jpg"));
        fd.append("curatorId", myModel.id);
        const res = await fetch("/api/generate-openai-tryon", { method: "POST", headers: { "x-curator-id": myModel.id }, body: fd });
        const out = await res.json();
        if (!res.ok || !out.image) throw new Error(out.error || "Foto-Generierung fehlgeschlagen.");
        setGenPhotoUrl(out.image); setGenStatus("done");
        // Save as HER generation (private; the admin reviews + makes the video).
        await fetch("/api/try-this-look", { method: "POST", headers: { ...H, "x-curator-id": myModel.id }, body: JSON.stringify({
          action: "generation", lookId, image: out.image, genKind: "photo", feed: false,
          customerName: chosenModelName || myModel.firstName || "Model",
          curatorId: myModel.id,
          ...(person.startsWith("data:image/") ? { userPhotoImage: person } : person ? { userPhotoUrl: person } : {}),
        }) });
        return;
      }
      // ── Reuse cache ──────────────────────────────────────────────────────────
      // Before spending a Pixverse credit, ask the server whether this exact try-on
      // (model × garment × motion) already exists. A hit plays the stored video
      // instantly — no generation, no cost. Own-photo try-ons (avatar) never cache:
      // the person is different every time, so there is nothing to reuse. Admins bypass
      // the lookup (except in "preview as user" mode) — they PRE-generate the library and
      // may want to redo a bad clip; their output still becomes a cache entry for users.
      if (!avatar && chosenModelId && (!adminPin || previewAsUser) && !forceFreshRef.current) {
        try {
          const combo = `${chosenModelId}|${lookId}|${motion}`;
          const cached = await fetch(`/api/try-this-look?combo=${encodeURIComponent(combo)}`).then(r => r.json());
          if (cached?.hit && cached.videoUrl) {
            setGenVideoUrl(cached.videoUrl);
            // Claim it for the signed-in user (copy → their gallery + own post); fall back
            // to the shared clip id if not signed in.
            const mineId = cached.generationId ? await claimCachedTryOn(cached.generationId) : "";
            if (mineId) setGenId(mineId); else if (cached.generationId) setGenId(cached.generationId);
            setGenStatus("done");
            return; // served from storage — nothing re-generated
          }
        } catch { /* cache miss or offline → fall through to real generation */ }
      }
      forceFreshRef.current = false; // consumed → next generation caches normally again
      // Send the admin prompt EXACTLY as written (tokens like @Bild1 / @Bild2 bind to the
      // reference images server-side) — no remapping, same as typing it into Pixverse.
      // Rotate the prompt each generation (turn motion) so every clip differs; dance keeps
      // its own server prompt.
      const genPrompt = motion === "dance" ? (prompt || "") : pickPrompt();
      const start = await fetch("/api/generate-tryon-video", { method: "POST", headers: H, body: JSON.stringify({ lookId, garment, person, prompt: genPrompt, motion, slowmo }) }).then(r => r.json());
      if (!start.videoId) throw new Error(start.error || "Start fehlgeschlagen.");
      let videoUrl = "";
      for (let i = 0; i < 45; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json());
        if (p.status === "done" && p.videoUrl) { videoUrl = p.videoUrl; break; }
        if (p.status === "failed") throw new Error(p.error || "Generation failed.");
      }
      if (!videoUrl) throw new Error("Timed out.");
      setGenVideoUrl(videoUrl); setGenStatus("done");
      // Save it as the signed-in user's own generation (poster + attach video).
      const session = getStoredAuthSession();
      const poster = await posterFromVideo(videoUrl);
      // Attribute the try-on to the MODEL who's actually wearing it (final pick wins over the
      // one passed in the URL) — so it lands under HER in the feed + her profile "In motion",
      // NOT the garment owner. Own-photo try-ons (avatar) stay attributed to the user.
      if (poster) {
        const gen = await fetch("/api/try-this-look", { method: "POST", headers: H, body: JSON.stringify({
          action: "generation", lookId, image: poster, genKind: "video", feed: false, motion,
          customerName: chosenModelName || (session?.user?.email?.split("@")[0]) || "You",
          ...(chosenModelId ? { curatorId: chosenModelId } : {}),
          ownerEmail: session?.user?.email || "", userId: session?.user?.id || "",
          // Save the model/before photo so the post gets a real Before/After slide.
          ...(person.startsWith("data:image/") ? { userPhotoImage: person } : person ? { userPhotoUrl: person } : {}),
        }) }).then(r => r.json());
        if (gen.generationId) {
          setGenId(gen.generationId); // remember it so the admin can upscale this clip to HD here
          await fetch("/api/try-this-look", { method: "POST", headers: H, body: JSON.stringify({ action: "attach-generation-video", generationId: gen.generationId, videoUrl }) });
        }
      }
    } catch (e) {
      setGenStatus("error"); setGenError(e instanceof Error ? e.message : "Fehler");
      // Generation failed → give the paid credit back so nobody pays for nothing.
      if (!adminPin) {
        const email = payEmail();
        if (email) fetch("/api/video-pack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, action: "refund" }) })
          .then(r => r.json()).then(d => { if (typeof d.credits === "number") setPackCredits(d.credits); }).catch(() => {});
      }
    }
  };

  // Admin: upscale a 360p try-on clip to HD (1080p) via Pixverse and replace it in place.
  // Same content, higher resolution — NO re-generation (the upscale endpoint takes no
  // prompt). Works for the just-made video AND any of her clips in the gallery below.
  const upscaleVideo = async (id: string, srcVideoUrl: string) => {
    if (!id || !srcVideoUrl || hdBusyId) return;
    setHdBusyId(id); setHdMsg("Rechne in HD um… (~1–2 Min)");
    const H = { "Content-Type": "application/json", ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}) };
    try {
      const start = await fetch("/api/generate-tryon-video", { method: "POST", headers: H, body: JSON.stringify({ upscale: true, videoUrl: srcVideoUrl }) }).then(r => r.json());
      if (!start.videoId) throw new Error(start.error || "Upscale-Start fehlgeschlagen.");
      let hdUrl = "";
      for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}`).then(r => r.json());
        if (p.status === "done" && p.videoUrl) { hdUrl = p.videoUrl; break; }
        if (p.status === "failed") throw new Error(p.error || "Upscale failed.");
      }
      if (!hdUrl) throw new Error("Timed out while upscaling.");
      await fetch("/api/try-this-look", { method: "POST", headers: H, body: JSON.stringify({ action: "attach-generation-video", generationId: id, videoUrl: hdUrl }) });
      if (id === genId) setGenVideoUrl(hdUrl); // refresh the top player if it's the main clip
      setHdMsg("Upscaled to HD ✓ — reload to watch.");
    } catch (e) {
      setHdMsg(e instanceof Error ? e.message : "Fehler beim Umrechnen");
    } finally { setHdBusyId(""); }
  };

  // Real users generate automatically after paying. Admins do NOT auto-generate (that
  // would burn Pixverse credits on every test) — they trigger it with an explicit button.
  useEffect(() => { if (step === 5 && !adminPin) void generateReal(); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Admin production: tap a garment in the strip → just SELECT it (reload the funnel on it
  // for the SAME model). It does NOT auto-generate — the admin then taps "Generate video now".
  const produceForGarment = (g: { id: string; img: string }) => {
    const qs = new URLSearchParams({ modelId: chosenModelId, model: modelImg, garment: g.img, modelName: chosenModelName });
    router.push(`/try/${g.id}?${qs.toString()}`);
  };
  // Admin: generate the current model×garment now (real, fresh) — the manual trigger.
  const generateNow = () => { setStep(5); void generateReal(); };

  // Once done: load the chosen model's videos (incl. the one just made) → shown as a gallery
  // on the result screen so the admin sees it landed in her "In motion".
  useEffect(() => {
    // After a generation (result screen): load HER videos for the "her videos" strip.
    if (genStatus !== "done" || !chosenModelId) return;
    const t = setTimeout(() => {
      fetch(`/api/try-this-look?curatorTryons=${encodeURIComponent(chosenModelId)}${adminPin ? "&manage=1" : ""}`, adminPin ? { headers: { "x-try-look-admin-pin": adminPin } } : undefined)
        .then(r => r.json())
        .then(d => setMadeVideos((d.userGallery ?? []).filter((v: { videoUrl?: string }) => v.videoUrl)))
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [genStatus, chosenModelId, adminPin]);
  // Admin "My Gallery" on the model step: ALL generated videos across every model.
  useEffect(() => {
    if (!(adminPin && !previewAsUser) || step !== 2 || galleryVideos.length) return;
    fetch(`/api/try-this-look?adminPosts=1`, { headers: { "x-try-look-admin-pin": adminPin } })
      .then(r => r.json())
      .then(d => setGalleryVideos((Array.isArray(d.posts) ? d.posts : []).filter((v: { videoUrl?: string }) => v.videoUrl)))
      .catch(() => {});
  }, [adminPin, previewAsUser, step, galleryVideos.length]);

  // ── Paid video pack ($8 → 4 videos) ────────────────────────────────────────
  const payEmail = () => getStoredAuthSession()?.user?.email?.trim().toLowerCase() || "";
  // Load the signed-in user's remaining video credits when they hit the paywall.
  useEffect(() => {
    if (step !== 2 && step !== 4) return; // show credits on the model step too
    const email = payEmail();
    if (!email) { setPackCredits(0); return; }
    fetch(`/api/video-pack?email=${encodeURIComponent(email)}`).then(r => r.json())
      .then(d => setPackCredits(Number(d.credits ?? 0))).catch(() => setPackCredits(0));
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // The paywall's main action: spend a credit and generate. When the 3 free credits (and any
  // monthly subscriber allowance) are used up, open the Premium subscription paywall instead
  // (first month $8, then $49/mo → 40 videos/month). Premium is the only paid tier now.
  const startPaidGenerate = async () => {
    if (adminPin) { setStep(5); return; }
    const email = payEmail();
    if (!email) { window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
    setPayError(""); setPayBusy(true);
    try {
      const spend = await fetch("/api/video-pack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, action: "spend" }) });
      if (spend.status === 402) {
        // Out of credits → Premium subscription (the only way to get more videos now).
        setPayBusy(false);
        setShowPremium(true);
        return;
      }
      const sd = await spend.json().catch(() => ({}));
      if (!spend.ok) throw new Error(sd.error ?? "Could not start your video.");
      setPackCredits(typeof sd.credits === "number" ? sd.credits : (c => (c ?? 1) - 1)(packCredits));
      setStep(5);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPayBusy(false);
    }
  };

  // "Motion" picker — what she does in the video. Users see ONLY these two chips;
  // the actual prompt swap (walk/turn vs dance + music) happens server-side.
  // Hidden for model sessions (they generate photos, no motion).
  // Motion choice (turn / dance) is ADMIN-only now — customers just get "Generate my video"
  // (defaults to Simple turn), so the page isn't cluttered. Admin keeps it for production.
  // Motion picker removed entirely (turn is the default; prompt rotates automatically).
  const motionPicker = false ? (
    <div className="mt-5">
      <div className="flex justify-center gap-2">
        {([["turn", "🔄 Simple turn"], ["dance", "💃 Dance · with music"]] as const).map(([key, label]) => {
          // Dance is Premium — free users get the paywall instead of selecting it.
          const danceLocked = key === "dance" && !isPaid;
          return (
            <button key={key} type="button"
              onClick={() => { if (danceLocked) { setShowPremium(true); return; } setMotion(key); }}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-black transition active:scale-95 ${motion === key ? "bg-amber-400 text-black" : "bg-white/10 text-white/60"}`}>
              {label}{danceLocked && <Lock className="h-3 w-3" />}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  // Admin-only: preview + edit the video-generation prompt with the two live references
  // (@Bild1 = model/avatar, @Bild2 = chosen outfit). Global template, saved on the state.
  // Admin prompt panel removed — the prompt now rotates automatically per generation.
  const adminPromptPanel = false ? (
    <div className="mt-5 rounded-2xl border border-amber-400/40 bg-amber-400/[0.06] p-3">
      <button type="button" onClick={() => setPromptOpen(o => !o)} className="flex w-full items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-amber-400">
          <Sparkles className="h-3.5 w-3.5" /> Admin · Video-Prompt
        </span>
        <span className="text-[11px] font-bold text-white/40">{promptOpen ? "hide" : "preview / edit"}</span>
      </button>
      {promptOpen && (
        <div className="mt-3">
          {/* The two live references shown as chips, exactly like @Bild1 / @Bild2. */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/10 p-1 pr-2">
              <span className="h-9 w-9 overflow-hidden rounded-md bg-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {modelImg && <img src={modelImg} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="text-[12px] font-black">@Bild1</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-white/10 p-1 pr-2">
              <span className="h-9 w-9 overflow-hidden rounded-md bg-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {outfit?.imageUrl && <img src={outfit?.imageUrl} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="text-[12px] font-black">@Bild2</span>
            </div>
          </div>
          <p className="mt-2 text-[11px] font-bold text-white/35">@Bild1 = model / avatar · @Bild2 = chosen outfit</p>
          <textarea value={prompt} onChange={e => { setPrompt(e.target.value); setPromptSaved(false); }} rows={4}
            className="mt-2 w-full resize-none rounded-xl border border-white/15 bg-black/40 p-3 text-[13px] font-semibold leading-snug text-white outline-none focus:border-amber-400" />
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => void savePrompt()} disabled={promptSaving}
              className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-amber-400 px-5 text-[13px] font-black text-black active:scale-95 disabled:opacity-50">
              {promptSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : promptSaved ? <Check className="h-4 w-4" /> : null}
              {promptSaved ? "Saved" : "Save prompt"}
            </button>
            <button type="button" onClick={() => { setPrompt(DEFAULT_HINT); setPromptSaved(false); }}
              className="text-[12px] font-bold text-white/40 active:opacity-70">Reset text</button>
          </div>
          {/* Per-video slow motion — baked in at generation so the music stays in sync. */}
          <button type="button" onClick={() => setSlowmo(s => !s)}
            className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-[13px] font-black transition ${slowmo ? "border-amber-400 bg-amber-400/15 text-amber-300" : "border-white/15 bg-black/30 text-white/70"}`}>
            <span>🐢 Slow motion {slowmo ? "· on" : "· off"}</span>
            <span className={`grid h-5 w-9 items-center rounded-full px-0.5 ${slowmo ? "bg-amber-400" : "bg-white/20"}`}>
              <span className={`h-4 w-4 rounded-full bg-white transition-transform ${slowmo ? "translate-x-4" : ""}`} />
            </span>
          </button>
          <p className="mt-1.5 text-[11px] font-bold text-white/35">Ad mode: slower 10s clip, straight to HD (1080p), matching music. Costs more — for this video only.</p>
        </div>
      )}
    </div>
  ) : null;

  // Admin production strip: a horizontal, scrollable row of garments; tap one → generate a
  // video for the CURRENT model on that garment (same window). 🎬 = already has a video.
  const adminProduce = !!adminPin && !previewAsUser;
  // The currently-chosen model, and whether it's a Premium (non-free) one the visitor can't
  // generate on. Only lock if the model is in the list AND not featured (unknown → allow).
  const chosenModelObj = gModels.find(m => m.id === chosenModelId);
  const chosenModelLocked = !isPaid && !adminProduce && !avatar && !!chosenModelObj && !chosenModelObj.featured;
  const adminProduceStrip = adminProduce ? (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="mr-1 text-[11px] font-black uppercase tracking-wide text-white/40">Outfits</span>
        <span className="ml-auto text-[10px] font-bold text-white/35">tap to pick</span>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {gGarments.length === 0 ? (
          <div className="grid h-24 w-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
        ) : gGarments.filter(g => lookVideoFilter === "all" || (lookVideoFilter === "video" ? g.hasVideo : !g.hasVideo)).map(g => (
          <button key={g.id} type="button" onClick={() => produceForGarment(g)}
            className={`relative w-[72px] shrink-0 overflow-hidden rounded-xl border bg-white active:scale-95 transition ${g.id === lookId ? "border-amber-400 ring-1 ring-amber-400" : "border-white/10"}`}>
            <div className="relative aspect-[3/4] w-full bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.img} alt={g.name} loading="lazy" className="h-full w-full object-contain" />
              {g.hasVideo && <span className="absolute right-0.5 top-0.5 rounded-full bg-emerald-500 px-1 text-[10px] font-black text-white">🎬</span>}
            </div>
            <span className="block truncate px-1 py-0.5 text-[8px] font-black text-black/60">{g.name}</span>
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative mx-auto min-h-[100dvh] w-full max-w-[440px] bg-[#0d0b0a] text-white shadow-[0_0_60px_rgba(0,0,0,0.45)]">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-[#0d0b0a]/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => {
              if (step > 2) { setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5); return; }
              // On step 2 (or opened straight from an ad link, no history) → go home instead
              // of a dead router.back().
              if (typeof window !== "undefined" && window.history.length > 1) router.back();
              else router.push("/home");
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 active:opacity-70">
            <ArrowLeft className="h-4 w-4" />
          </button>
          {/* Progress bar + admin-view toggle removed — it's all one window now. */}
        </div>
      </div>

      {/* ── Step 1 is skipped (the garment is already chosen) — brief loader ── */}
      {step === 1 && (
        <div className="grid place-items-center px-4 py-28">
          <Loader2 className="h-6 w-6 animate-spin text-white/30" />
        </div>
      )}

      {/* ── Step 2: model / replace avatar ─────────────────────────────────── */}
      {step === 2 && (
        <div className="px-4 pb-64 pt-2">
          {/* Reserve two lines so a longer name (which wraps) doesn't shift the carousel down. */}
          <h1 className="min-h-[2.5em] text-[22px] font-black leading-tight">{!avatar && chosenModelName && !((pickModel || chooseModel) && !pickedModel) ? `Watch ${chosenModelName.split(/\s+/)[0]} in her hottest looks 🔥` : "Who should wear it?"}</h1>
          {(pickModel || chooseModel) && !pickedModel && !avatar ? (
            <>
              <p className="mt-2 text-[13px] font-bold text-white/50">Pick a model to wear this piece.</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {(() => {
                  // Every generation costs 1 credit (new users get free welcome credits;
                  // then $8 = 4 more), so models aren't marked free/paid individually.
                  const ordered = [...gModels].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
                  // Your-own-photo is the PAID custom feature (never free, always 1 credit),
                  // so for non-paying users it wears a padlock — otherwise it looked free.
                  const yourLocked = !isPaid;
                  const yourTile = (
                    <button key="__your" type="button"
                      onClick={() => fileRef.current?.click()}
                      className="overflow-hidden rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] active:scale-[0.98] transition-transform">
                      <div className="relative grid aspect-[9/16] w-full place-items-center px-1 pb-6 text-center">
                        {yourLocked
                          ? <Lock className="h-7 w-7 text-amber-400" />
                          : <ImageUp className="h-8 w-8 text-amber-400" />}
                        {yourLocked && (
                          <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-black text-amber-300 backdrop-blur">Premium</span>
                        )}
                      </div>
                      <div className="px-1.5 py-1"><span className="line-clamp-1 text-[11px] font-black text-amber-400">Your photo</span></div>
                    </button>
                  );
                  const modelTiles = ordered.map(m => (
                    <button key={m.id} type="button"
                      onClick={() => { setPickedModel(m.photoUrl); setPickedModelId(m.id); setPickedModelName(m.name); }}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] active:scale-[0.98] transition-transform">
                      <div className="relative aspect-[9/16] w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.photoUrl} alt={m.name} className="h-full w-full object-cover object-top" />
                      </div>
                      <div className="px-1.5 py-1"><span className="line-clamp-1 text-[11px] font-black">{m.name}</span></div>
                    </button>
                  ));
                  // Insert the "Your photo" tile at the 3rd position of the gallery.
                  return [...modelTiles.slice(0, 2), yourTile, ...modelTiles.slice(2)];
                })()}
              </div>
            </>
          ) : avatar ? (
            <>
              <p className="mt-2 text-[13px] font-bold text-white/50">{!avatar && chosenModelName ? `Tap “Generate” to see ${chosenModelName.split(/\s+/)[0]} wear it — or switch the look / use your own photo.` : (pickedModel ? "Great pick — or replace her with your own photo." : "The model from the video is ready. Keep her, or replace her with your own photo.")}</p>
              <div className="mx-auto mt-3 w-fit overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
                {/* Height-constrained so 'Choose other model' + the outfit stay on screen. */}
                <div className="relative aspect-[9/16] h-[38vh] max-w-[78vw]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {modelImg ? <img src={modelImg} alt="" className="h-full w-full object-cover object-top" /> : <div className="h-full w-full bg-white/5" />}
                  {/* Chat with her — golden button on her photo, top-right. */}
                  {chosenModelId && chosenModelName && !avatar && (
                    <button type="button" onClick={() => setShowChat(true)} title={`Chat with ${chosenModelName.split(/\s+/)[0]}`}
                      className="lb-gold absolute right-2 top-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-black shadow-lg active:scale-95 transition">
                      <MessageCircle className="h-4 w-4" /> Chat
                    </button>
                  )}
                  <button type="button" onClick={() => (avatar ? fileRef.current?.click() : (setPickedModel(""), setChooseModel(true)))}
                    className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-full bg-black/70 px-4 py-2.5 text-[13px] font-black backdrop-blur active:scale-95">
                    <RefreshCw className="h-3.5 w-3.5" /> {avatar ? "Change photo" : "Change model"}
                  </button>
                </div>
              </div>
            </>
          ) : (pickedParam && !comboCancelled) ? (
            // Outfit chosen → confirm view: the OUTFIT (left) + the chosen MODEL (right),
            // with Cancel to reopen the picker.
            <>
              <p className="mt-2 text-[13px] font-bold text-white/50">{chosenModelLocked ? "This model is Premium — unlock her to generate, or cancel and pick a free model." : "Your look is set — tap “Generate” to see it, or cancel to choose again."}</p>
              <div className="mx-auto mt-3 flex items-stretch justify-center gap-3">
                <div className="w-[42%] max-w-[160px]">
                  <button type="button" onClick={() => { setZoomSrc(garmentParam || outfit?.imageUrl || ""); setZoomName(outfit?.name || ""); setOutfitZoom(true); }} className="block w-full overflow-hidden rounded-2xl border border-white/10 bg-white active:scale-95 transition">
                    <div className="relative aspect-[3/4] w-full bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={garmentParam || outfit?.imageUrl || ""} alt="" className="h-full w-full object-contain" />
                    </div>
                  </button>
                  <p className="mt-1 text-center text-[11px] font-black uppercase tracking-wide text-white/45">Outfit</p>
                </div>
                <div className="flex shrink-0 items-center self-center pb-4"><ArrowRight className="h-6 w-6 text-amber-400" /></div>
                <div className="w-[42%] max-w-[160px]">
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {modelImg ? <img src={modelImg} alt="" className={`h-full w-full object-cover object-top ${chosenModelLocked ? "blur-[3px] opacity-70" : ""}`} /> : <div className="h-full w-full bg-white/5" />}
                    {chosenModelLocked ? (
                      // Premium (non-free) model → show the same crown/PREMIUM lock as the carousel.
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/45 px-2 text-center">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-lg"><Crown className="h-5 w-5" /></span>
                        <span className="text-[11px] font-black uppercase tracking-wide text-amber-300">Premium</span>
                      </div>
                    ) : chosenModelId && chosenModelName && (
                      <button type="button" onClick={() => setShowChat(true)} className="lb-gold absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black shadow"><MessageCircle className="h-3.5 w-3.5" /> Chat</button>
                    )}
                  </div>
                  <p className={`mt-1 text-center text-[11px] font-black uppercase tracking-wide ${chosenModelLocked ? "text-amber-400" : "text-white/45"}`}>{chosenModelLocked ? "Premium" : (chosenModelName?.split(/\s+/)[0] || "Model")}</p>
                </div>
              </div>
              <button type="button" onClick={() => setComboCancelled(true)}
                className="mx-auto mt-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] font-black text-white/70 active:scale-95 transition">
                <X className="h-3.5 w-3.5" /> Cancel — choose again
              </button>
            </>
          ) : (
            // Customer model picker: a 3D coverflow. The chosen model sits large in front;
            // her neighbours angle back on both sides. Tap a side card (or an arrow) to bring
            // her forward — that selects her. Locked models (not Gina) show a padlock.
            <>
              <p className="mt-2 text-[13px] font-bold text-white/50">Swipe the models — your pick stands up front. Tap “Generate” to see her wear it.</p>
              {(() => {
                const om = [...gModels].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
                if (om.length === 0) return <div className="grid h-[46vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>;
                // Admin (production) and paying users can pick ANY model; everyone else only Gina.
                const unlockAll = isPaid || adminProduce;
                const active = Math.max(0, om.findIndex(m => m.id === chosenModelId));
                // Bring a model to the front — by tap OR swipe. Locked (Premium) models still
                // come forward with their padlock; the paywall only fires on "Generate".
                const setFront = (m: { id: string; name: string; photoUrl: string; featured?: boolean }) => {
                  setLockedNudge(false); setAvatar("");
                  setPickedModel(m.photoUrl); setPickedModelId(m.id); setPickedModelName(m.name);
                };
                const slide = (dir: number) => {
                  const ni = Math.min(om.length - 1, Math.max(0, active + dir));
                  if (ni !== active) setFront(om[ni]);
                };
                return (
                  <div className="relative mx-auto mt-2 h-[72vw] max-h-[300px] select-none overflow-hidden touch-pan-y" style={{ perspective: "1100px" }}
                    onPointerDown={(e) => { swipeRef.current = e.clientX; swipedRef.current = false; }}
                    onPointerUp={(e) => { const dx = e.clientX - swipeRef.current; if (Math.abs(dx) > 30) { swipedRef.current = true; slide(dx < 0 ? 1 : -1); } }}>
                    {om.map((m, i) => {
                      const off = i - active;
                      if (Math.abs(off) > 2) return null;
                      const mLocked = !unlockAll && !m.featured;
                      const isActive = off === 0;
                      return (
                        <div key={m.id} onClick={() => { if (swipedRef.current) { swipedRef.current = false; return; } if (!isActive) setFront(m); }}
                          className="absolute left-1/2 top-1/2 w-[54%] max-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl transition-all duration-300 ease-out"
                          style={{ transform: `translate(-50%,-50%) translateX(${off * 56}%) rotateY(${-off * 38}deg) scale(${isActive ? 1 : 0.82})`, zIndex: 20 - Math.abs(off), opacity: Math.abs(off) === 2 ? 0.45 : 1, cursor: isActive ? "default" : "pointer" }}>
                          <div className="relative aspect-[3/4] w-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m.photoUrl} alt={m.name} draggable={false} className={`h-full w-full object-cover object-top ${mLocked ? "blur-[3px] opacity-70" : ""}`} />
                            {m.realModel && (
                              <span className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black text-black shadow"><Check className="h-3 w-3" /> Real model</span>
                            )}
                            {mLocked
                              ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/45 px-4 text-center">
                                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-lg"><Crown className="h-6 w-6" /></span>
                                  <span className="text-[13px] font-black uppercase tracking-wide text-amber-300">Premium</span>
                                  {isActive && <span className="text-[11px] font-bold leading-snug text-white/80">This is a Premium feature. Unlock to try her on.</span>}
                                </div>
                              )
                              : m.featured && <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white">Free</span>}
                            {isActive && !mLocked && chosenModelName && (
                              <button type="button" onClick={(e) => { e.stopPropagation(); setShowChat(true); }} title={`Chat with ${chosenModelName.split(/\s+/)[0]}`}
                                className="lb-gold absolute right-2 top-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-black shadow-lg active:scale-95 transition">
                                <MessageCircle className="h-4 w-4" /> Chat
                              </button>
                            )}
                            {!mLocked && (
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-6">
                                <span className="text-[14px] font-black text-white">{m.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {/* Use your own photo — the paid custom feature (padlock for non-payers). */}
              <button type="button" onClick={() => ((isPaid || adminProduce) ? fileRef.current?.click() : setShowPremium(true))}
                className="mx-auto mt-2 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] font-black text-white/70 active:scale-95 transition">
                {(isPaid || adminProduce) ? <ImageUp className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5 text-amber-400" />} Use your own photo
              </button>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={async e => { const f = e.target.files?.[0]; if (f) try { setAvatar(await fileToDataUrl(f)); } catch { /**/ } }} />

          {/* Everyone (admin included) swipes ALL outfits right here; models live in the
              coverflow above. Same layout for admin and end-user. */}
          {(
            <>
              <div className="mt-4">
                <p className="mb-2 flex items-center text-[11px] font-black uppercase tracking-wide text-white/40">Outfits<span className="ml-auto text-[10px] font-bold normal-case text-white/35">swipe →</span></p>
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {gGarments.length === 0 ? (
                    <div className="grid h-24 w-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
                  ) : gGarments.map(g => (
                    <button key={g.id} type="button"
                      onClick={() => {
                        if (g.id === lookId) { setOutfitZoom(true); return; }
                        const curModelPhoto = pickedModel || modelParam || "";
                        router.push(`/try/${g.id}?modelId=${encodeURIComponent(chosenModelId)}&model=${encodeURIComponent(curModelPhoto)}&garment=${encodeURIComponent(g.img)}&modelName=${encodeURIComponent(chosenModelName)}&picked=1`);
                      }}
                      className={`relative w-[72px] shrink-0 overflow-hidden rounded-xl border bg-white active:scale-95 transition ${g.id === lookId ? "border-amber-400 ring-1 ring-amber-400" : "border-white/10"}`}>
                      <div className="relative aspect-[3/4] w-full bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.img} alt={g.name} loading="lazy" className="h-full w-full object-contain" />
                        {/* Enlarge this outfit full-screen (doesn't switch the look). */}
                        <span role="button" tabIndex={0} title="View full screen"
                          onClick={(e) => { e.stopPropagation(); setZoomSrc(g.img); setZoomName(g.name); setOutfitZoom(true); }}
                          className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white backdrop-blur active:scale-90 transition">
                          <Maximize2 className="h-3 w-3" />
                        </span>
                      </div>
                      <span className="block truncate px-1 py-0.5 text-[8px] font-black text-black/60">{g.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {/* Admin: the videos already generated for this model — right under the outfits. */}
          {adminProduce && galleryVideos.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[13px] font-black">My Gallery <span className="text-white/40">{galleryVideos.length}</span></p>
              <div className="grid grid-cols-3 gap-2">
                {galleryVideos.map(v => (
                  <a key={v.id} href={v.curatorId ? `/curator/${v.curatorId}` : "#"} className="relative block aspect-[9/16] overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] active:opacity-80">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.imageUrl} alt={v.lookName ?? ""} loading="lazy" className="h-full w-full object-cover object-top" />
                    <span className="absolute inset-0 grid place-items-center text-white/90"><Play className="h-7 w-7 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]" fill="currentColor" /></span>
                    <span className={`absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[8px] font-black backdrop-blur ${v.public ? "bg-emerald-500 text-white" : v.feed ? "bg-amber-400 text-black" : "bg-black/70 text-white"}`}>{v.public ? "Public" : v.feed ? "Show" : "Private"}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {adminPromptPanel}
        </div>
      )}

      {/* ── Step 3: the "video ready" step. A FREE cache hit plays the real video here
             (no blur, no wall); otherwise a blurred teaser + sign-in to unlock. ─────── */}
      {step === 3 && (
        <div className="px-4 pb-28 pt-2">
          <div className="relative mx-auto mt-2 overflow-hidden rounded-3xl border border-white/10">
            {previewVideoUrl && !rendering ? (
              // Free video already exists. Reveal it theatrically: it plays and slowly
              // sharpens from blurry over ~30s, THEN becomes fully watchable (controls).
              <div className="relative h-[52vh] w-full overflow-hidden bg-black">
                <video ref={revealVideoRef} src={previewVideoUrl} poster={previewPoster || undefined} preload="auto" className="h-full w-full object-contain"
                  style={
                    revealing
                      ? { filter: `blur(${revealSharp ? 0 : 26}px)`, transform: `scale(${revealSharp ? 1 : 1.08})`, transition: `filter ${REVEAL_MS}ms linear, transform ${REVEAL_MS}ms ease-out` }
                      : guest
                      ? { filter: "blur(22px)", transform: "scale(1.08)" } // finished but LOCKED until sign-in
                      : undefined
                  }
                  loop playsInline muted={revealing || guest} controls={!revealing && !guest} />
                {revealing ? (
                  <>
                    {/* White scanner beam sweeping down then up. */}
                    <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-white shadow-[0_0_18px_5px_rgba(255,255,255,0.7)]" />
                    <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-14 -translate-y-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
                    {/* Camera viewfinder corners. */}
                    <div className="pointer-events-none absolute left-3 top-3 z-20 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-white/90" />
                    <div className="pointer-events-none absolute right-3 top-3 z-20 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-white/90" />
                    <div className="pointer-events-none absolute bottom-3 left-3 z-20 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-white/90" />
                    <div className="pointer-events-none absolute bottom-3 right-3 z-20 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-white/90" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 text-white">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      <span className="text-sm font-black">Revealing your look…</span>
                    </div>
                  </>
                ) : guest ? (
                  // Reveal finished but the visitor isn't signed in → keep it locked behind
                  // the register/sign-in wall (the CTA sits in the button below).
                  <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/35">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span className="grid h-16 w-16 place-items-center rounded-full bg-white/15 backdrop-blur"><Lock className="h-7 w-7 text-white" /></span>
                      <span className="mt-1 flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[12px] font-black"><Check className="h-3.5 w-3.5" /> Video ready</span>
                    </div>
                  </div>
                ) : (
                  <span className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-black"><Check className="h-3.5 w-3.5" /> Free</span>
                )}
              </div>
            ) : (
              <div className="relative h-[44vh] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {teaserImg && <img src={teaserImg} alt="" className="h-full w-full scale-110 object-cover blur-2xl" aria-hidden />}
                <div className="absolute inset-0 grid place-items-center">
                  {rendering ? (
                    <div className="flex flex-col items-center gap-3 text-white/80">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="text-sm font-black">Generating your video…</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <span className="grid h-16 w-16 place-items-center rounded-full bg-white/15 backdrop-blur"><Play className="h-7 w-7" /></span>
                      <span className="mt-1 flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[12px] font-black"><Check className="h-3.5 w-3.5" /> Video ready</span>
                    </div>
                  )}
                </div>
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-black backdrop-blur"><Lock className="h-3 w-3" /> Locked</span>
              </div>
            )}
          </div>
          {!rendering && !revealing && (
            <>
              <h1 className="mt-6 text-center text-[22px] font-black leading-tight">Your video is ready 🎉</h1>
              <p className="mt-2 text-center text-[13px] font-bold text-white/50">{guest ? "Register or sign in to watch your video." : previewVideoUrl ? "It's free — tap 🔊 for sound. Saved to your account." : "Watch and download it in full quality."}</p>
              {/* Motion was chosen before generating — no picker on the ready step. */}
              {adminPromptPanel}
            </>
          )}
        </div>
      )}

      {/* ── Step 4: plans ──────────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="px-4 pb-28 pt-2">
          <h1 className="text-center text-[26px] font-black">Create your video</h1>
          <p className="mt-1 text-center text-[13px] font-bold text-white/50">{(packCredits ?? 0) > 0 ? "Ready to go — this uses 1 video credit." : "Go Premium — first month just $8, then $49/month."}</p>

          {(packCredits ?? 0) > 0 ? (
            /* Has credits → just generate. */
            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] p-5 text-center">
              <p className="text-3xl font-black text-white">{packCredits} <span className="text-base font-bold text-white/50">videos left</span></p>
              <p className="mt-1 text-[12px] font-bold text-white/45">Generating this video uses 1 credit.</p>
            </div>
          ) : (
            /* No credits → Premium subscription (first month $8, then $49/mo → 40 videos). */
            <div className="mx-auto mt-6 max-w-sm rounded-3xl border border-amber-400/30 bg-amber-400/[0.06] p-6 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">Premium</p>
              <p className="mt-1.5 flex items-end justify-center gap-1.5"><span className="text-4xl font-black text-white">$8</span><span className="mb-1 text-sm font-bold text-white/50">first month</span></p>
              <p className="mt-0.5 text-[12px] font-bold text-white/45">then $49/month · 40 try-on videos every month</p>
              <div className="mt-4 grid gap-2 text-left">
                {["40 try-on videos every month", "Every model, look & full video unlocked", "First month $8 · cancel anytime"].map(perk => (
                  <div key={perk} className="flex items-center gap-2.5"><Check className="h-4 w-4 shrink-0 text-amber-400" /><span className="text-[13px] font-bold text-white/80">{perk}</span></div>
                ))}
              </div>
            </div>
          )}

          {payError && <p className="mx-auto mt-3 max-w-sm text-center text-[12px] font-bold text-red-400">{payError}</p>}

          {/* Escape hatch — not ready to pay? Browse the free models gallery instead. */}
          <button type="button" onClick={() => router.push("/home")}
            className="mx-auto mt-6 block text-center text-[13px] font-black text-white/45 underline underline-offset-4 active:scale-95 transition">
            Visit the models gallery →
          </button>

          {/* Admin: skip the paywall and jump to the unlocked result (test the paid flow). */}
          {adminPin && !previewAsUser && (
            <button type="button" onClick={() => setStep(5)}
              className="mx-auto mt-4 flex w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 py-3 text-[13px] font-black text-emerald-300 active:scale-95 transition-transform">
              <Check className="h-4 w-4" /> Admin: continue as paid →
            </button>
          )}
        </div>
      )}

      {/* ── Step 5: unlocked / paid result ─────────────────────────────────── */}
      {step === 5 && (
        <div className="px-4 pb-40 pt-2">
          {genStatus === "idle" && motionPicker && <div className="mb-3">{motionPicker}</div>}
          <div className="relative mx-auto mt-2 max-w-[78vw] overflow-hidden rounded-3xl border border-emerald-400/30 bg-black">
            <div className="relative aspect-[9/16] w-full">
              {genStatus === "done" && genVideoUrl ? (
                // Both motions carry Pixverse's generated sound (the prompt asks for music),
                // so play unmuted. Native controls include a mute button; autoplay may need a
                // tap when unmuted, which is fine for the admin review screen.
                <video src={genVideoUrl} className="h-full w-full object-cover" autoPlay loop playsInline controls />
              ) : genStatus === "done" && genPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={genPhotoUrl} alt="" className="h-full w-full object-cover object-top" />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {modelImg && <img src={modelImg} alt="" className={`h-full w-full object-cover object-top ${genStatus === "generating" ? "scale-110 blur-2xl opacity-60" : ""}`} />}
                  {/* Scanner overlay while the real generation runs (same look as the free reveal). */}
                  {genStatus === "generating" && (
                    <>
                      {/* White scanner beam sweeping down then up. */}
                      <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-white shadow-[0_0_18px_5px_rgba(255,255,255,0.7)]" />
                      <div className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-14 -translate-y-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
                      {/* Camera viewfinder corners. */}
                      <div className="pointer-events-none absolute left-3 top-3 z-20 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-white/90" />
                      <div className="pointer-events-none absolute right-3 top-3 z-20 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-white/90" />
                      <div className="pointer-events-none absolute bottom-3 left-3 z-20 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-white/90" />
                      <div className="pointer-events-none absolute bottom-3 right-3 z-20 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-white/90" />
                    </>
                  )}
                  <div className="absolute inset-0 grid place-items-center">
                    {genStatus === "generating" ? (
                      <div className="flex flex-col items-center gap-3 px-6 text-center text-white/90">
                        <Sparkles className="h-8 w-8 animate-pulse" />
                        <span className="text-sm font-black">{isModelSession ? "Generating your photo…" : "Generating your video…"}</span>
                        <span className="text-[12px] font-bold text-white/60">{isModelSession ? "Takes ~30 seconds." : "This takes ~1–2 minutes. Hang tight."}</span>
                      </div>
                    ) : genStatus === "error" ? (
                      <div className="flex flex-col items-center gap-2 px-6 text-center">
                        <span className="text-sm font-black text-red-300">Generation failed</span>
                        <span className="text-[12px] font-bold text-white/50">{genError}</span>
                        <button type="button" onClick={() => { genStartedRef.current = false; void generateReal(); }}
                          className="mt-1 rounded-full bg-white/15 px-4 py-1.5 text-[12px] font-black text-white active:opacity-70">Try again</button>
                      </div>
                    ) : adminPin ? (
                      <button type="button" onClick={() => void generateReal()}
                        className="flex items-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-black active:scale-95">
                        <Sparkles className="h-4 w-4" /> Generate video (real · credits)
                      </button>
                    ) : (
                      <Loader2 className="h-8 w-8 animate-spin text-white/70" />
                    )}
                  </div>
                </>
              )}
              {genStatus === "done" && <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-black"><Check className="h-3.5 w-3.5" /> Ready</span>}
            </div>
          </div>
          <h1 className="mt-6 text-center text-[22px] font-black leading-tight">
            {genStatus === "done" ? (genPhotoUrl ? "Your photo is ready 🎉" : "Enjoy your video 🎉") : isModelSession ? "Conjuring your photo…" : "Conjuring your video…"}
          </h1>
          <p className="mt-2 text-center text-[13px] font-bold text-white/50">
            {genStatus === "done"
              ? (genPhotoUrl ? "Saved. The team turns your best photos into videos for your profile." : "Saved to your gallery — view & manage under Account.")
              : "Your try-on is being created in full quality."}
          </p>

          {/* View the finished video as a full post (before/after, like & share, other looks). */}
          {genStatus === "done" && genVideoUrl && genId && (
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={() => goToResult(genId)}
                className="lb-gold flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black active:scale-95 transition">
                <Sparkles className="h-4 w-4" /> View your video
              </button>
            </div>
          )}

          {/* HD (1080p) is a PREMIUM subscription perk. Admin + subscribers upscale here. */}
          {genStatus === "done" && genVideoUrl && genId && (adminPin || isSubscribed) && (
            <div className="mt-4 flex flex-col items-center gap-1.5">
              <button type="button" onClick={() => upscaleVideo(genId, genVideoUrl)} disabled={!!hdBusyId}
                className="flex items-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-black active:scale-95 transition disabled:opacity-50">
                {hdBusyId === genId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {hdBusyId === genId ? "Making it HD…" : "Get it in HD (1080p)"}
              </button>
              {hdMsg && <span className="text-[12px] font-bold text-white/50">{hdMsg}</span>}
            </div>
          )}
          {/* Non-subscriber → HD is a Premium upsell. */}
          {genStatus === "done" && genVideoUrl && genId && !adminPin && !isSubscribed && (
            <button type="button" onClick={() => setShowSubscribe(true)}
              className="mx-auto mt-4 flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-5 py-2.5 text-[13px] font-black text-amber-300 active:scale-95 transition">
              <Sparkles className="h-4 w-4" /> Want it in HD? Go Premium
            </button>
          )}

          {/* Admin: keep producing — tap the next outfit and it generates for the same model. */}
          {genStatus === "done" && <div className="px-1">{adminProduceStrip}</div>}

          {/* After generating: a gallery of the model's videos (incl. this one). Admins set
              each one's visibility right here — Fashionshow (feed + her profile "In motion"),
              Public (everyone vs members-only), or delete. */}
          {genStatus === "done" && madeVideos.length > 0 && (
            <div className="mt-7">
              <p className="mb-2 text-[13px] font-black">{chosenModelName ? `${chosenModelName}'s Videos` : "Your videos"}</p>
              <div className={`grid gap-3 ${adminPin ? "grid-cols-2" : "grid-cols-3"}`}>
                {madeVideos.map(v => {
                  const status = v.public ? "Public" : v.feed ? "Fashionshow" : "Private";
                  return (
                    <div key={v.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                      <a href={chosenModelId ? `/curator/${chosenModelId}` : "#"} className="relative block aspect-[9/16] active:opacity-80">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.imageUrl} alt={v.lookName ?? ""} loading="lazy" className="h-full w-full object-cover object-top" />
                        <span className="absolute inset-0 grid place-items-center text-white/90"><Play className="h-8 w-8 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]" fill="currentColor" /></span>
                        <span className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[9px] font-black backdrop-blur ${v.public ? "bg-emerald-500 text-white" : v.feed ? "bg-amber-400 text-black" : "bg-black/70 text-white"}`}>{status}</span>
                      </a>
                      {adminPin && (
                        <div className="p-1.5">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setVideoFeed(v.id, !v.feed)}
                              className={`flex-1 rounded-lg px-1.5 py-1.5 text-[10px] font-black transition ${v.feed ? "bg-amber-400 text-black" : "bg-white/10 text-white/60"}`}>Fashionshow</button>
                            <button type="button" onClick={() => setVideoPublic(v.id, !v.public)}
                              className={`flex-1 rounded-lg px-1.5 py-1.5 text-[10px] font-black transition ${v.public ? "bg-emerald-500 text-white" : "bg-white/10 text-white/60"}`}>{v.public ? "Public" : "Members"}</button>
                            <button type="button" onClick={() => deleteVideoGen(v.id)}
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-red-500/20 text-red-300 active:scale-90"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                          {/* Upscale THIS clip to HD (1080p) — no re-generation, same content. */}
                          {v.videoUrl && (
                            <button type="button" onClick={() => upscaleVideo(v.id, v.videoUrl!)} disabled={!!hdBusyId}
                              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-400/90 px-1.5 py-1.5 text-[10px] font-black text-black active:scale-95 transition disabled:opacity-50">
                              {hdBusyId === v.id ? <><Loader2 className="h-3 w-3 animate-spin" /> HD…</> : <><Sparkles className="h-3 w-3" /> Upscale to HD</>}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sticky CTA — funnel steps 1-4. On step 5 (unlocked) we bring the app's bottom
          navigation back instead of a funnel button. */}
      {step !== 5 && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#0d0b0a] via-[#0d0b0a] to-transparent px-4 pb-5 pt-8 lb-phone-col">
          {step === 1 && (
            <p className="text-center text-[12px] font-bold text-white/35">Pick an outfit above to continue</p>
          )}
          {step === 2 && (
            (pickModel || chooseModel) && !pickedModel && !avatar ? (
              <p className="text-center text-[12px] font-bold text-white/35">Pick a model above to continue</p>
            ) : (
              <>
                {motionPicker && <div className="mb-3 -mt-2">{motionPicker}</div>}
                {/* Free-credit meter: 3 free videos, 1 credit each. Not signed in → show the
                    offer, not a wrong "0 left" (anonymous has no balance yet). */}
                {!adminProduce && !chosenModelLocked && (
                  <p className="mb-2 text-center text-[12px] font-black text-white/50">
                    {!isAuthed()
                      ? "🎟️ 3 free videos · 1 credit each"
                      : packCredits == null
                      ? ""
                      : `🎟️ ${Math.min(3, Math.max(0, 3 - packCredits))}/3 free videos used${packCredits > 3 ? ` · ${packCredits} credits` : ` · ${packCredits} left`}`}
                  </p>
                )}
                {!adminProduce && chosenModelLocked && (
                  <p className="mb-2 text-center text-[12px] font-black text-amber-400/90">👑 Premium model · first month $8</p>
                )}
                {lockedNudge && chosenModelLocked && (
                  <div className="mb-2 flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-3 py-2.5 text-[12px] font-black text-amber-200">
                    <Lock className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>This model is Premium. Pick a free model (Gina) to generate now — or go Premium to unlock everyone.</span>
                  </div>
                )}
                <button type="button" onClick={() => { if (chosenModelLocked) { setLockedNudge(true); setShowPremium(true); return; } (adminProduce ? generateNow() : goStep3()); }}
                  className="lb-gold flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition-transform">
                  {chosenModelLocked
                    ? <><Crown className="h-5 w-5" /> Unlock with Premium</>
                    : <><Sparkles className="h-5 w-5" /> {adminProduce ? "Generate video now" : (isModelSession ? "Generate my photo" : "Generate my video")}
                        {!adminProduce && !isModelSession && <span className="rounded-full bg-black/15 px-2 py-0.5 text-[12px] font-black">1 credit</span>}</>}
                </button>
              </>
            )
          )}
          {step === 3 && !rendering && !revealing && (
            previewVideoUrl && previewGenId ? (
              guest ? (
                // Video is ready but LOCKED → register / sign in to watch it (lead gate).
                <button type="button" onClick={onUnlock}
                  className="lb-gold flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition-transform">
                  <Lock className="h-5 w-5" /> Register or sign in to watch
                </button>
              ) : (
                // Signed in → view the ready one, OR generate a fresh, unique one (new scene).
                <div className="grid gap-2">
                  <button type="button" onClick={async () => goToResult(await claimCachedTryOn())}
                    className="lb-gold flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition-transform">
                    <Sparkles className="h-5 w-5" /> View your video →
                  </button>
                  <button type="button" onClick={() => { forceFreshRef.current = true; genStartedRef.current = false; setGenStatus("idle"); void startPaidGenerate(); }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.06] text-[13px] font-black text-white active:scale-95 transition">
                    <RefreshCw className="h-4 w-4" /> Generate a fresh one — see her differently
                  </button>
                </div>
              )
            ) : (
              <button type="button" onClick={onUnlock}
                className="lb-gold flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition-transform">
                {(isAuthed() || (adminPin && !previewAsUser)) ? "Continue" : "Register or sign in to watch"}
              </button>
            )
          )}
          {step === 4 && !(adminPin && !previewAsUser) && (
            <button type="button" onClick={() => void startPaidGenerate()} disabled={payBusy || packCredits === null}
              className="lb-gold flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition-transform disabled:opacity-60">
              {payBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : ((packCredits ?? 0) > 0 ? "Generate my video →" : "Start Premium — $8 first month")}
            </button>
          )}
        </div>
      )}
      {step === 5 && <BottomNav forceShow />}

      {gateOpen && (
        <FeedGate mode="auth" reason="Register or sign in to watch your video" lookId={lookId} lookName={look?.name}
          advanceOnSignup
          onClose={() => setGateOpen(false)} onAuthed={() => {
            setGateOpen(false);
            try { sessionStorage.removeItem("lb_tryon_resume"); } catch { /**/ } // resumed in-place, don't re-fire on reload
            // If the video is already generated & cached, they signed in to WATCH it → save it
            // to their gallery, then open their own post. Otherwise continue the flow.
            if (previewVideoUrl && previewGenId) claimCachedTryOn().then(id => goToResult(id || previewGenId));
            else setStep(lookIsFree ? 5 : 4);
          }} />
      )}

      <PremiumDialog open={showPremium} onClose={() => setShowPremium(false)} />
      <SubscribeDialog open={showSubscribe} onClose={() => setShowSubscribe(false)} />
      {chosenModelId && (
        <ModelChat
          open={showChat}
          onClose={() => setShowChat(false)}
          curatorId={chosenModelId}
          modelName={chosenModelName || "Model"}
          modelFirstName={(chosenModelName || "").split(/\s+/)[0] || ""}
          avatarUrl={modelImg}
          isPaid={isSubscribed}
          onNeedPremium={() => { setShowChat(false); setShowSubscribe(true); }}
        />
      )}

      {/* Fullscreen garment view — tap the outfit thumbnail to open, tap/X to close. */}
      {outfitZoom && (zoomSrc || garmentParam || outfit?.imageUrl) && (
        <div className="fixed inset-0 z-[95] flex flex-col bg-black/95" onClick={() => { setOutfitZoom(false); setZoomSrc(""); setZoomName(""); }}>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-black text-white">{zoomName || outfit?.name || "Selected outfit"}</p>
            <button type="button" onClick={() => { setOutfitZoom(false); setZoomSrc(""); setZoomName(""); }}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white active:scale-90 transition"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex flex-1 items-center justify-center px-4 pb-8" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoomSrc || garmentParam || outfit?.imageUrl || ""} alt={zoomName || outfit?.name || ""} className="max-h-full max-w-full rounded-2xl object-contain" />
          </div>
        </div>
      )}

      {/* Choose another look — free (featured) garments are selectable; the rest are Premium. */}
      {chooseLook && (
        <div className="fixed inset-0 z-[95] bg-black/95" onClick={() => setChooseLook(false)}>
         <div className="mx-auto flex h-full w-full max-w-[440px] flex-col border-x border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-black text-white">Choose a look</p>
            <button type="button" onClick={() => setChooseLook(false)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white active:scale-90 transition"><X className="h-5 w-5" /></button>
          </div>
          {adminPin ? (
            <div className="px-4 pb-2">
              <p className="text-[12px] font-bold text-white/45">Production: pick a look for {chosenModelName?.split(" ")[0] || "the model"}, then Generate. <span className="text-emerald-400">🎬 = already has a video.</span></p>
              <div className="mt-2 flex gap-1.5">
                {([["all", "All"], ["novideo", "To do"], ["video", "🎬 With video"]] as const).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setLookVideoFilter(k)}
                    className={`rounded-full px-3 py-1 text-[11px] font-black transition ${lookVideoFilter === k ? "bg-white text-black" : "bg-white/10 text-white/60"}`}>{label}</button>
                ))}
              </div>
            </div>
          ) : (
            <p className="px-4 pb-2 text-[12px] font-bold text-white/45">Pick any look — your first 3 videos are free.</p>
          )}
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-8" onClick={(e) => e.stopPropagation()}>
           <div className="grid grid-cols-3 gap-2">
            {gGarments.length === 0 ? (
              <div className="col-span-3 grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
            ) : (() => {
              const anyFeatured = gGarments.some(g => g.featured);
              return gGarments
                .filter(g => lookVideoFilter === "all" || (lookVideoFilter === "video" ? g.hasVideo : !g.hasVideo))
                .map(g => {
                // All looks are selectable now (even for guests) — you only pay per GENERATION
                // (3 free, then $8), not per look. So nothing is locked here.
                const locked = false; void anyFeatured;
                return (
                  <button key={g.id} type="button"
                    onClick={() => {
                      if (locked) { setShowPremium(true); return; }
                      const curModelPhoto = pickedModel || modelParam || "";
                      router.push(`/try/${g.id}?modelId=${encodeURIComponent(chosenModelId)}&model=${encodeURIComponent(curModelPhoto)}&garment=${encodeURIComponent(g.img)}&modelName=${encodeURIComponent(chosenModelName)}`);
                    }}
                    className="overflow-hidden rounded-xl border border-white/10 bg-white active:scale-95 transition">
                    <div className="relative aspect-[3/4] w-full bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.img} alt={g.name} loading="lazy" className={`h-full w-full object-contain ${locked ? "blur-[5px] opacity-70" : ""}`} />
                      {adminPin && g.featured && (
                        <span className="absolute left-1 top-1 z-10 rounded-full bg-amber-400 px-1.5 text-[11px] font-black text-black shadow" title="Free look">★</span>
                      )}
                      {locked && (
                        <span className="absolute inset-0 grid place-items-center bg-black/20"><span className="grid h-8 w-8 place-items-center rounded-full bg-black/70 backdrop-blur"><Lock className="h-4 w-4 text-white" /></span></span>
                      )}
                    </div>
                    <div className="px-1 py-1"><span className={`line-clamp-1 text-[10px] font-black ${locked ? "text-amber-500" : "text-black/70"}`}>{locked ? "Premium" : g.name}</span></div>
                  </button>
                );
              });
            })()}
           </div>
          </div>
         </div>
        </div>
      )}
    </div>
  );
}
