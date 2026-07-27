"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, ArrowLeft, ArrowRight, Check, RefreshCw, Lock, Play, Trash2, ImageUp, X, MessageCircle, Maximize2, Crown, Volume2, VolumeX, BadgeCheck, AlertTriangle } from "lucide-react";
import PremiumDialog from "@/components/PremiumDialog";
import SubscribeDialog from "@/components/SubscribeDialog";
import ModelChat from "@/components/ModelChat";
import { FeedGate } from "@/components/FeedGate";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { logFunnelEvent } from "@/lib/track-funnel";
import { trackMetaPixel } from "@/lib/meta-pixel";

type Outfit = { id: string; name: string; imageUrl: string; lookId?: string };
type Look = { id: string; name: string; imageUrl?: string; frontImageUrl?: string; videoPosterUrl?: string; modelPhotoUrl?: string; curatorName?: string; featured?: boolean };

// Rotating video prompts — a DIFFERENT scene/lighting/motion each generation, so the same
// model×look never looks the same twice (never boring). First @-token = person, second =
// outfit (server binds by order). Keep the "exactly the same" guarantee + "no text/logos".
// A fitting VACATION setting + she TURNS all the way around AND WALKS a few steps, ~7s, so the
// whole outfit is shown from every side. Neutral wording (Pixverse flags skin/lingerie words).
// Varied holiday locations so the clips aren't identical.
// Lead with a VISUALLY DISTINCT setting (Pixverse otherwise collapses similar "seaside/resort"
// scenes into ~2 looks). Neutral wording only — no lingerie/skin/lace words (Pixverse flags them).
// Shared motion + quality tail — appended to every scene so we only maintain the SETTING once.
const MOTION_TAIL =
  " @1 presents the @2. She turns slowly all the way around to show it from every side, then walks a few relaxed steps toward the camera. Keep @1 face and appearance and the @2 exactly the same throughout. Fluid natural motion, photorealistic, high-end look. No text or logos.";
// ~50 visually DISTINCT luxury/travel settings. Each must end with a comma (the tail starts with " @1").
// Neutral wording only — no lingerie/skin/lace/body words (Pixverse flags them).
const SCENES = [
  "On a white-sand tropical beach with turquoise ocean waves behind her,",
  "In a grand marble palace hall with crystal chandeliers and tall gold-framed mirrors,",
  "On a modern city rooftop at night with a glowing skyline and warm neon lights behind her,",
  "In a lush tropical jungle beside a cascading waterfall with soft mist,",
  "In a cozy alpine chalet with a glowing fireplace and warm wooden interior,",
  "In an autumn park with golden falling leaves and soft afternoon light,",
  "By a sleek modern infinity pool at a hilltop villa at golden hour,",
  "On a Venetian palazzo balcony overlooking the Grand Canal at golden sunset,",
  "On a Santorini clifftop terrace with white walls and blue domes above the Aegean sea,",
  "On the deck of a luxury yacht on the open blue sea under a bright clear sky,",
  "On a Parisian rooftop terrace with the Eiffel Tower in the background at dusk,",
  "In a blooming cherry-blossom garden with soft pink petals drifting in the air,",
  "In a snow-covered pine forest with soft falling snowflakes and clear winter light,",
  "In an elegant Art Deco hotel lobby with golden accents and a grand staircase,",
  "On a Tuscan vineyard terrace at golden hour with rolling hills and cypress trees,",
  "In a Moroccan riad courtyard with colorful mosaic tiles and a central fountain,",
  "On a New York City street at night with bright billboards and yellow taxis,",
  "In a Japanese zen garden with raked gravel, stone lanterns and a red maple tree,",
  "On a Swiss mountain peak with panoramic snowy alps and a clear blue sky,",
  "On an overwater bungalow deck above a turquoise Maldives lagoon,",
  "In a Provence lavender field in full bloom under a soft violet sky,",
  "In a grand library with tall wooden bookshelves and warm reading lights,",
  "In a rooftop garden lounge with string lights and a city skyline at dusk,",
  "In a luxury private jet cabin with cream leather seats and soft lighting,",
  "On a Dubai skyscraper observation deck overlooking the glittering city at night,",
  "On a cobblestone European old-town street with charming cafés and flower boxes,",
  "In a sun-drenched Greek island harbor with white boats and deep blue water,",
  "In a modern glass penthouse living room with panoramic city views,",
  "In a botanical greenhouse full of tropical plants under a glass ceiling,",
  "On a serene lakeside dock at sunrise with calm reflective water and mountains,",
  "On a seaside boardwalk promenade lined with palm trees at golden hour,",
  "On an Amalfi Coast terrace overlooking colorful cliffside houses and the sea,",
  "In a luxury spa with a candle-lit indoor pool and soft rising steam,",
  "On a Scandinavian cabin terrace under the glowing northern lights,",
  "On a Parisian café terrace on a charming street in soft morning light,",
  "In a rose garden in full bloom with an ivy-covered stone archway,",
  "In a modern luxury boutique with soft spotlights and polished marble floors,",
  "On a tropical beach at sunset with palm trees and a warm orange sky,",
  "In a grand opera house foyer with a red carpet and gilded balconies,",
  "By a mountain-lake infinity pool at a wellness resort with alpine views,",
  "On a flower-market street with bright bouquets and bright morning sunlight,",
  "On a clifftop lighthouse path by the ocean under a dramatic blue sky,",
  "On an elegant shopping avenue at night with softly lit storefronts,",
  "In a countryside manor garden with fountains and manicured hedges,",
  "Beside a tropical waterfall lagoon with turquoise water and lush greenery,",
  "On a Prague old-town square with gothic towers at blue hour,",
  "In a sunlit Mediterranean courtyard with olive trees and terracotta pots,",
  "On a snow-covered village street with warm festive lights at dusk,",
  "In an elegant ballroom with a grand chandelier and a polished marble floor,",
  "On a rooftop helipad overlooking a coastal city skyline at sunset,",
];
const PROMPT_POOL = SCENES.map(s => s + MOTION_TAIL);
// Nie zweimal HINTEREINANDER dieselbe Szene: die zuletzt gezogene merken und ausschliessen.
const LAST_SCENE_KEY = "lb_try_last_scene";
const pickPrompt = () => {
  let last = -1;
  try { last = Number(localStorage.getItem(LAST_SCENE_KEY) ?? "-1"); } catch { /* no storage */ }
  const choices = PROMPT_POOL.map((_, k) => k).filter(k => k !== last);
  const i = choices[Math.floor(Math.random() * choices.length)] ?? 0;
  try { localStorage.setItem(LAST_SCENE_KEY, String(i)); } catch { /* no storage */ }
  return PROMPT_POOL[i];
};

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
const DEFAULT_HINT = "Mache die Frau aus @Bild1 angezogen in @Bild2 an einem passenden Urlaubsort. Sie dreht sich einmal langsam komplett um (alle Seiten zeigen) und läuft dann ein paar entspannte Schritte. @Bild2 und ihr Gesicht exakt gleich lassen.";

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
  // Language: DEFAULT EN. `?lang=ro|en` wins (ad links) and persists; otherwise a stored choice
  // (lb_lang) applies, else EN. A visible RO/EN switcher lets the visitor toggle. SSR-safe.
  const langParam = (searchParams?.get("lang") ?? "").toLowerCase();
  const [lang, setLang] = useState<"ro" | "en">("en"); // English forced everywhere (RO kept dormant)
  useEffect(() => {
    setLang("en");
    try { localStorage.setItem("lb_lang", "en"); } catch { /**/ }
  }, [langParam]);
  const pickLang = (l: "ro" | "en") => { setLang(l); try { localStorage.setItem("lb_lang", l); } catch { /**/ } };
  const L = (ro: string, en: string) => (lang === "ro" ? ro : en);
  // When opened from a model's wardrobe: the exact garment to put her in (its image URL).
  const garmentParam = searchParams?.get("garment") ?? "";
  // Garment-first (from the Garderobe tab): the garment is chosen but not the model yet →
  // step 2 shows a model picker.
  const pickModel = (searchParams?.get("pick") ?? "") === "1";
  // „Your Idol as an AI-Model": kein Model-Grid — der Nutzer lädt DIREKT das Foto seines Idols
  // hoch (wird zum `avatar`). Danach läuft alles wie beim eigenen Foto (Chat, Umziehen, Video).
  const idol = (searchParams?.get("idol") ?? "") === "1";
  // Set when the user taps an outfit → the top shows the chosen outfit + model (a confirm view)
  // instead of the model coverflow. "Cancel" reveals the picker again.
  const pickedParam = (searchParams?.get("picked") ?? "") === "1";
  // Kam der Nutzer aus dem Wetter-Chat? Dann führt „Chat with …" zurück DORTHIN (persistierter
  // Chat lädt wieder) statt in den separaten /chat. Nur same-origin-Pfade (Anti-Open-Redirect).
  const wchatRaw = searchParams?.get("wchat") ?? "";
  const wchatBack = wchatRaw.startsWith("/") ? wchatRaw : "";
  // Kam der Nutzer aus dem Wetter-Chat (bekannter Abonnent)? Dann sind die Teaser-Looks frei —
  // das 1-Gratis-Limit gilt für ihn nicht (er hat seine E-Mail schon gegeben).
  const fromWetter = (searchParams?.get("from") ?? "") === "wetter";
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
  const [yourPhotoFront, setYourPhotoFront] = useState(false); // the "Your photo" card is centered in the coverflow
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
  const [awaitingEmail, setAwaitingEmail] = useState(false); // cached video shown BLURRED behind the email gate
  const [hasLead, setHasLead] = useState(false); // gave their email (newsletter) → treated as "in", don't nag to register
  const [gateEmailOnly, setGateEmailOnly] = useState(true); // 1st gate = email only; 2nd+ = full account
  const [mounted, setMounted] = useState(false); // gate localStorage/session-reading UI to client-only (no hydration mismatch)
  useEffect(() => { setMounted(true); }, []);
  const [previewPoster, setPreviewPoster] = useState("");
  const revealVideoRef = useRef<HTMLVideoElement>(null);
  // Background music (the clips have no audio) + a sound toggle; tap the video to pause it.
  const musicRef = useRef<HTMLAudioElement>(null);
  const [musicMuted, setMusicMuted] = useState(true); // start SILENT — no jarring autoplay-with-sound
  const [vidPaused, setVidPaused] = useState(false);
  // The 🔊 toggle controls BOTH the background music AND the video's own audio.
  const toggleMusic = () => {
    const nextMuted = !musicMuted;
    const a = musicRef.current; const v = revealVideoRef.current;
    if (a) { a.muted = nextMuted; if (!nextMuted) a.play().catch(() => {}); }
    if (v) v.muted = nextMuted;
    setMusicMuted(nextMuted);
  };
  const toggleVideo = () => { const v = revealVideoRef.current; const a = musicRef.current; if (!v) return; if (v.paused) { v.play().catch(() => {}); a?.play().catch(() => {}); setVidPaused(false); } else { v.pause(); a?.pause(); setVidPaused(true); } };
  // Fullscreen the reveal video (native — element fullscreen on desktop/Android, iOS Safari uses
  // the video's own webkitEnterFullscreen).
  const goFullscreen = () => {
    const v = revealVideoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitRequestFullscreen?: () => void }) | null;
    if (!v) return;
    try {
      if (v.requestFullscreen) void v.requestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
      else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
    } catch { /**/ }
  };
  // Scanner "generation" reveal runs ~5s, then the pre-generated clip plays clear.
  const REVEAL_MS = 5000;
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
  // Pre-generation countdown: a ~4s window with a Cancel button BEFORE any credit is spent,
  // so a mistaken tap doesn't cost a credit.
  const [arming, setArming] = useState(false);
  const [armSecs, setArmSecs] = useState(0);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [videoZoom, setVideoZoom] = useState(false); // fullscreen the finished try-on video
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
    try { if (localStorage.getItem("lb_lead_email")) setHasLead(true); } catch { /**/ } // already gave email
  }, []);

  // Landing event for the ad funnel — fires once when someone opens /try (e.g. from the
  // Gina Facebook ad). Attaches utm_source (fb/ig) so Insights shows ad clicks + drop-off.
  useEffect(() => {
    if (!lookId) return;
    logFunnelEvent("tryon_open", { lookId, ...(modelNameParam ? { lookName: modelNameParam } : {}) });
    trackMetaPixel("ViewContent", { content_category: "tryon", content_name: modelNameParam || lookId }); // Meta: funnel landed (A/B optimisation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch(`/api/try-this-look?previewId=${encodeURIComponent(lookId)}`).then(r => r.json()).then(d => {
      // NEVER dead-end the funnel: if this look has no try-on video to reveal, send real
      // visitors to a look that DOES (admins stay — they produce the content). Keeps utm/lang.
      try {
        const staff = !!localStorage.getItem("luxurybandit-try-look-admin-pin") && !localStorage.getItem("lb_preview_model");
        if (d?.look && d.hasVideo === false && !staff && !idol && d.fallbackLookId && d.fallbackLookId !== lookId) {
          router.replace(`/try/${d.fallbackLookId}${window.location.search}`);
          return;
        }
      } catch { /**/ }
      setLook(d.look ?? null);
    }).catch(() => {});
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
  // Teaser still behind the "Video ready" lock (only shown when there's NO cached video). Prefer
  // a content-rich image (video poster → model/look photo) over the garment cut-out — a white
  // product on white blurs to nothing and looks blank. Never empty.
  const teaserImg = previewPoster || modelImg || outfit?.imageUrl || garmentParam || "";
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
    // Don't play (or trigger a download) while the clip is still gated behind the email wall.
    else if (!awaitingEmail) { try { void v.play().catch(() => {}); } catch { /**/ } }
  }, [revealing, awaitingEmail, previewVideoUrl]);

  const goStep3 = async () => {
    // Preload the music MUTED — the visitor turns sound on with the 🔊 toggle (no jarring autoplay).
    try { const a = musicRef.current; if (a) { a.muted = true; a.volume = 0.6; setMusicMuted(true); } } catch { /**/ }
    setStep(3);
    setRendering(true); setRevealing(false); setRevealSharp(false);
    const hit = await lookupCachedVideo();
    if (hit) {
      setRendering(false);
      // The 1st video is free after just an email (newsletter). The 2nd+ needs a real (confirmed)
      // account — a lone email-lead is spent once. Signed-in users & admin always pass.
      const authed = isAuthed();
      const leadEmail = (() => { try { return !!localStorage.getItem("lb_lead_email"); } catch { return false; } })();
      const leadUsed = (() => { try { return !!localStorage.getItem("lb_lead_used"); } catch { return false; } })();
      // Wetter-Abonnent (from=wetter + bekannte E-Mail) → immer frei; sonst 1 Gratis pro Lead.
      const canFree = authed || !!adminPin || (leadEmail && (fromWetter || !leadUsed));
      if (!canFree) {
        setGateEmailOnly(!leadEmail); // no email yet → email-only gate; email spent → full account
        setAwaitingEmail(true); setGateOpen(true); return;
      }
      // This reveal uses the one free email-lead pass (if not a real account) → mark it spent.
      // Wetter-Abonnenten verbrauchen das Limit NICHT (sie sollen die Teaser-Looks alle sehen).
      if (!authed && !adminPin && leadEmail && !fromWetter) { try { localStorage.setItem("lb_lead_used", "1"); } catch { /**/ } }
      // Theatrical ~30s "unsharp → sharp" reveal of the REAL clip.
      logFunnelEvent("tryon_generated", { lookId, ...(chosenModelName ? { lookName: chosenModelName } : {}) }); // Insights "Generated a video"
      setAwaitingEmail(false);
      setRevealing(true);
      // next frame: flip to sharp so the CSS filter transition (REVEAL_MS) animates.
      requestAnimationFrame(() => requestAnimationFrame(() => setRevealSharp(true)));
      window.setTimeout(() => setRevealing(false), REVEAL_MS);
    } else if (adminProduce) {
      // No pre-generated video yet AND this is the admin → build one (production).
      generateNow();
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
    if (resume && isAuthed()) { try { sessionStorage.removeItem("lb_tryon_resume"); } catch { /**/ } trackMetaPixel("CompleteRegistration", { content_category: "tryon" }); void goStep3(); }
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
    // Meta: the user committed to MAKING a video — the strongest intent signal in this funnel,
    // fired once. This is what FB's A/B test should optimise toward (not cheap PageViews).
    trackMetaPixel("Lead", { content_category: "tryon", content_name: lookId });
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

  // Entering the generation step arms a ~4s countdown (Cancel available) BEFORE anything is
  // spent or generated — a mis-tap costs nothing. When the step is left, cancel the timer.
  useEffect(() => {
    if (step !== 5) { if (armTimerRef.current) { clearTimeout(armTimerRef.current); armTimerRef.current = null; setArming(false); } return; }
    if (genStartedRef.current || arming || genStatus !== "idle") return;
    beginGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Admin: generate now — goes through the same 4s arm/cancel window (via the step-5 effect).
  const generateNow = () => { genStartedRef.current = false; setGenStatus("idle"); setStep(5); };

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

  // Start the ~4s pre-generation countdown (Cancel available). Nothing is spent yet.
  const beginGeneration = () => {
    if (armTimerRef.current) clearTimeout(armTimerRef.current);
    genStartedRef.current = false;
    setGenStatus("idle");
    setArming(true);
    let n = 4;
    setArmSecs(n);
    const tick = () => {
      n -= 1;
      if (n <= 0) { setArmSecs(0); setArming(false); armTimerRef.current = null; void runGeneration(); return; }
      setArmSecs(n);
      armTimerRef.current = setTimeout(tick, 1000);
    };
    armTimerRef.current = setTimeout(tick, 1000);
  };
  // Cancel during the countdown → back to the picker, no credit spent.
  const cancelGeneration = () => {
    if (armTimerRef.current) { clearTimeout(armTimerRef.current); armTimerRef.current = null; }
    setArming(false); setArmSecs(0);
    setStep(2);
  };
  // Countdown finished (not cancelled) → NOW spend a credit (customers) and generate.
  const runGeneration = async () => {
    if (!adminPin) {
      const email = payEmail();
      if (email) {
        try {
          const spend = await fetch("/api/video-pack", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, action: "spend" }) });
          if (spend.status === 402) { setShowPremium(true); setStep(2); return; } // out of credits → paywall
          const sd = await spend.json().catch(() => ({}));
          if (spend.ok && typeof sd.credits === "number") setPackCredits(sd.credits);
        } catch { /* network hiccup → generateReal still runs; it refunds on failure */ }
      }
    }
    void generateReal();
  };

  // The paywall's main action: check credits, then arm the countdown (the spend happens after
  // the 4s window). Out of credits → Premium subscription (first month $8, then $49/mo → 40).
  const startPaidGenerate = async () => {
    if (adminPin) { generateNow(); return; }
    const email = payEmail();
    if (!email) { window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`; return; }
    if ((packCredits ?? 0) <= 0) { setShowPremium(true); return; } // no credits → paywall, don't arm
    setPayError("");
    genStartedRef.current = false; setGenStatus("idle");
    setStep(5); // → step-5 effect arms the 4s countdown → runGeneration spends & generates
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
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-black transition active:scale-95 ${motion === key ? "bg-amber-400 text-black" : "bg-white/10 text-white/80"}`}>
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
        <span className="text-[11px] font-bold text-white/80">{promptOpen ? "hide" : "preview / edit"}</span>
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
          <p className="mt-2 text-[11px] font-bold text-white/75">@Bild1 = model / avatar · @Bild2 = chosen outfit</p>
          <textarea value={prompt} onChange={e => { setPrompt(e.target.value); setPromptSaved(false); }} rows={4}
            className="mt-2 w-full resize-none rounded-xl border border-white/15 bg-black/40 p-3 text-[13px] font-semibold leading-snug text-white outline-none focus:border-amber-400" />
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => void savePrompt()} disabled={promptSaving}
              className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-amber-400 px-5 text-[13px] font-black text-black active:scale-95 disabled:opacity-50">
              {promptSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : promptSaved ? <Check className="h-4 w-4" /> : null}
              {promptSaved ? "Saved" : "Save prompt"}
            </button>
            <button type="button" onClick={() => { setPrompt(DEFAULT_HINT); setPromptSaved(false); }}
              className="text-[12px] font-bold text-white/80 active:opacity-70">Reset text</button>
          </div>
          {/* Per-video slow motion — baked in at generation so the music stays in sync. */}
          <button type="button" onClick={() => setSlowmo(s => !s)}
            className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-[13px] font-black transition ${slowmo ? "border-amber-400 bg-amber-400/15 text-amber-300" : "border-white/15 bg-black/30 text-white/85"}`}>
            <span>🐢 Slow motion {slowmo ? "· on" : "· off"}</span>
            <span className={`grid h-5 w-9 items-center rounded-full px-0.5 ${slowmo ? "bg-amber-400" : "bg-white/20"}`}>
              <span className={`h-4 w-4 rounded-full bg-white transition-transform ${slowmo ? "translate-x-4" : ""}`} />
            </span>
          </button>
          <p className="mt-1.5 text-[11px] font-bold text-white/75">Ad mode: slower 10s clip, straight to HD (1080p), matching music. Costs more — for this video only.</p>
        </div>
      )}
    </div>
  ) : null;

  // Admin production strip: a horizontal, scrollable row of garments; tap one → generate a
  // video for the CURRENT model on that garment (same window). 🎬 = already has a video.
  const adminProduce = !!adminPin && !previewAsUser;
  const chosenModelObj = gModels.find(m => m.id === chosenModelId);
  // Landing straight from an ad (a model chosen via ?modelId, no browsing yet) → show the
  // OUTFIT→MODEL confirm view immediately (the look IS the outfit), not the coverflow. The
  // "Change outfit / Change model" links let them browse from there.
  const adLanding = !!modelIdParam && !!chosenModelName && !avatar && !pickModel && !chooseModel && !pickedModel;
  // AI models are free for everyone; REAL models are Premium-locked — EXCEPT on a direct ad
  // landing (the ad features THIS model, so show her + her free hook video, then paywall for more).
  const chosenModelLocked = !isPaid && !adminProduce && !avatar && !!chosenModelObj?.realModel && !adLanding;
  const showConfirm = (pickedParam || adLanding) && !comboCancelled;
  const inConfirm = step === 2 && !avatar && !((pickModel || chooseModel) && !pickedModel) && showConfirm;

  return (
    <div className="relative mx-auto min-h-[100dvh] w-full max-w-[440px] lb-bg text-white shadow-[0_0_60px_rgba(0,0,0,0.45)]">
      {/* Background music for the try-on video (the clips have no audio). Always mounted so
          it can start within the GO tap gesture. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={musicRef} src="/fassounds-escape-your-love-upbeat-fashion-pop-dance-412230.mp3" loop preload="auto" />
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-[#0d0b0a]/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => {
              // From any later step (generating / result / plans) → back to the FUNNEL START
              // (the model + outfit picker), not the previous step / the tariff.
              if (step > 2) {
                if (armTimerRef.current) { clearTimeout(armTimerRef.current); setArming(false); }
                genStartedRef.current = false; setGenStatus("idle");
                try { musicRef.current?.pause(); } catch { /**/ }
                setRevealing(false); setRendering(false);
                // Keep the combo → return to the outfit+model confirm view (the red set + Gina),
                // NOT the coverflow.
                setStep(2);
                return;
              }
              // Funnel verlassen: ZURÜCK dorthin, wo er herkam (z. B. die Wetter-Seite) — vorher
              // sprang der Pfeil hart in die Models-Galerie, das fühlte sich an wie „geht nicht
              // zurück". Nur ohne Historie (Direktaufruf aus einer Anzeige) in die Galerie.
              let hasHistory = false;
              try { hasHistory = window.history.length > 1; } catch { /**/ }
              if (hasHistory) router.back(); else router.push("/stores?view=models");
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 active:opacity-70">
            <ArrowLeft className="h-4 w-4" />
          </button>
          {/* Account chip — shows the email you're "in" with + whether it's a verified account
              (Google/full login = ✓) or just a newsletter email (⚠️ tap to create a full account). */}
          {mounted && (() => {
            const s = (() => { try { return getStoredAuthSession(); } catch { return null; } })();
            const sessEmail = s?.user?.email as string | undefined;
            const sessVerified = !!(s?.user as { email_confirmed_at?: string; confirmed_at?: string } | undefined)?.email_confirmed_at || !!(s?.user as { confirmed_at?: string } | undefined)?.confirmed_at;
            const leadEmail = (() => { try { return localStorage.getItem("lb_lead_email") || ""; } catch { return ""; } })();
            const email = sessEmail || leadEmail;
            if (!email) return null;
            const isVerified = !!sessEmail && sessVerified;
            return (
              <button type="button" onClick={() => { if (!isVerified) onUnlock(); }} title={isVerified ? "Verified account" : "Not verified — tap to create a full account"}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 active:scale-95 transition ${isVerified ? "bg-amber-500/15 text-amber-300 ring-amber-400/25" : "bg-amber-400/15 text-amber-300 ring-amber-400/30"}`}>
                {isVerified ? <BadgeCheck className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                <span className="max-w-[110px] truncate">{email}</span>
              </button>
            );
          })()}
          {/* Language switcher hidden — English is forced everywhere. Re-enable to bring RO back. */}
          {false && (
            <div className="ml-auto flex items-center rounded-full bg-white/[0.07] p-0.5 ring-1 ring-white/10">
              {(["en", "ro"] as const).map((l) => (
                <button key={l} type="button" onClick={() => pickLang(l)}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-black uppercase transition ${lang === l ? "bg-white text-black" : "text-white/75"}`}>
                  {l}
                </button>
              ))}
            </div>
          )}
          {/* Progress bar + admin-view toggle removed — it's all one window now. */}
        </div>
      </div>

      {/* ── Step 1 is skipped (the garment is already chosen) — brief loader ── */}
      {step === 1 && (
        <div className="grid place-items-center px-4 py-28">
          <Loader2 className="h-6 w-6 animate-spin text-white/50" />
        </div>
      )}

      {/* ── Step 2: model / replace avatar ─────────────────────────────────── */}
      {step === 2 && (
        <div className="px-4 pb-64 pt-2">
          {/* Reserve two lines so a longer name (which wraps) doesn't shift the carousel down. */}
          <h1 className="text-[30px] font-black leading-[1.06]">{idol && !avatar ? L("Idolul tau ca AI-Model", "Your idol as an AI-Model") : !avatar && chosenModelName && !((pickModel || chooseModel) && !pickedModel) ? L(`Vezi-o pe ${chosenModelName.split(/\s+/)[0]} în cele mai tari ținute 🔥`, `Watch ${chosenModelName.split(/\s+/)[0]} in her hottest looks 🔥`) : L("Cine s-o poarte?", "Who should wear it?")}</h1>
          {idol && !avatar ? (
            // „Your Idol as an AI-Model": kein Model-Grid — direkt das Idol-Foto hochladen.
            <>
              <p className="mt-3 text-[16px] font-medium leading-relaxed text-white/75">{L("Incarca poza idolului tau — devine AI-modelul tau: vorbesti cu ea, o imbraci, o animezi intr-un clip.", "Upload your idol's photo — she becomes your AI model: chat with her, dress her, animate her into a video.")}</p>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="mx-auto mt-6 flex aspect-[9/16] w-[62vw] max-w-[260px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-amber-400/40 bg-amber-400/[0.06] active:scale-[0.98] transition">
                <ImageUp className="h-10 w-10 text-amber-400" />
                <span className="text-[14px] font-black text-amber-400">📸 {L("Incarca poza", "Upload photo")}</span>
              </button>
            </>
          ) : (pickModel || chooseModel) && !pickedModel && !avatar ? (
            <>
              {/* Der Text der früheren Try-On-Landing steht jetzt HIER über der Model-Auswahl —
                  so entfällt die Zwischenseite, ohne dass die Erklärung verloren geht. */}
              <p className="mt-3 text-[16px] font-medium leading-relaxed text-white/75">
                {L("Alege un look și un model — și o vezi purtându-l într-un video. Se întoarce, merge, din toate unghiurile.",
                   "Pick a look, pick a model — and watch her wear it in a video. Turnaround, walk, every angle.")}
              </p>
              <p className="mt-2 text-[13px] font-bold leading-snug text-white/55">{L("Alege un model care s-o poarte.", "Pick a model to wear this piece.")}</p>
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
              <p className="mt-2 text-[13px] font-bold text-white/85">{!avatar && chosenModelName ? `Tap “Start” to see ${chosenModelName.split(/\s+/)[0]} wear it — free. Or switch the look / use your own photo.` : (pickedModel ? "Great pick — or replace her with your own photo." : "The model from the video is ready. Keep her, or replace her with your own photo.")}</p>
              <div className="mx-auto mt-3 w-fit overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
                {/* Height-constrained so 'Choose other model' + the outfit stay on screen. */}
                <div className="relative aspect-[9/16] h-[38vh] max-w-[78vw]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {modelImg ? <img src={modelImg} alt="" className="h-full w-full object-cover object-top" /> : <div className="h-full w-full bg-white/5" />}
                  {/* Chat with her — golden button on her photo, top-right. */}
                  {chosenModelId && chosenModelName && !avatar && (
                    <button type="button" onClick={() => chosenModelId && router.push(`/chat/${chosenModelId}`)} title={`Chat with ${chosenModelName.split(/\s+/)[0]}`}
                      className="lb-gold absolute right-2 top-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-black shadow-lg active:scale-95 transition">
                      <MessageCircle className="h-4 w-4" /> AI Chat
                    </button>
                  )}
                  <button type="button" onClick={() => (avatar ? fileRef.current?.click() : (setPickedModel(""), setChooseModel(true)))}
                    className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-full bg-black/70 px-4 py-2.5 text-[13px] font-black backdrop-blur active:scale-95">
                    <RefreshCw className="h-3.5 w-3.5" /> {avatar ? "Change photo" : "Change model"}
                  </button>
                </div>
              </div>
            </>
          ) : showConfirm ? (
            // Outfit chosen → confirm view: the OUTFIT (left) + the chosen MODEL (right),
            // with Cancel to reopen the picker.
            <>
              <p className="mt-1 text-[13px] font-bold text-white/85">{chosenModelLocked ? L("Acest model e Premium — deblocheaz-o sau alege un model gratuit mai jos.", "This model is Premium — unlock her, or pick a free model below.") : L("Ținuta e gata — apasă „GO” mai jos ca s-o vezi, gratuit.", "Your look is set — tap “GO” below to watch it, free.")}</p>
              <div className="mx-auto mt-3 flex items-stretch justify-center gap-3">
                <div className="w-[42%] max-w-[160px]">
                  <button type="button" onClick={() => { setZoomSrc(garmentParam || outfit?.imageUrl || look?.frontImageUrl || look?.imageUrl || ""); setZoomName(outfit?.name || ""); setOutfitZoom(true); }} className="block w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] active:scale-95 transition">
                    <div className="relative aspect-[3/4] w-full bg-white/[0.04]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={garmentParam || outfit?.imageUrl || look?.frontImageUrl || look?.imageUrl || ""} alt="" className="h-full w-full object-contain" />
                    </div>
                  </button>
                </div>
                <div className="flex shrink-0 items-center self-center"><ArrowRight className="h-6 w-6 text-amber-400" /></div>
                <div className="w-[42%] max-w-[160px]">
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {modelImg ? <img src={modelImg} alt="" className={`h-full w-full object-cover object-top ${chosenModelLocked ? "blur-[3px] opacity-70" : ""}`} /> : <div className="h-full w-full bg-white/5" />}
                    {!chosenModelLocked && chosenModelObj?.featured && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">Free</span>
                    )}
                    {chosenModelLocked ? (
                      // Premium (non-free) model → show the same crown/PREMIUM lock as the carousel.
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/45 px-2 text-center">
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black shadow-lg"><Crown className="h-5 w-5" /></span>
                        <span className="text-[11px] font-black uppercase tracking-wide text-amber-300">Premium</span>
                      </div>
                    ) : chosenModelObj?.featured && chosenModelId && chosenModelName && (
                      <button type="button" onClick={() => chosenModelId && router.push(`/chat/${chosenModelId}`)} className="lb-gold absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black shadow"><MessageCircle className="h-3.5 w-3.5" /> AI Chat</button>
                    )}
                  </div>
                </div>
              </div>
              {/* Subtle secondary options — the GO button is the star; these stay grey. */}
              <div className="mx-auto mt-3 flex items-center justify-center gap-4 text-[12px] font-black text-white/80">
                <button type="button" onClick={() => setChooseLook(true)}
                  className="underline decoration-white/20 underline-offset-4 active:opacity-70">{L("Schimbă ținuta", "Change outfit")}</button>
                <span className="text-white/40">·</span>
                <button type="button" onClick={() => { setComboCancelled(true); setYourPhotoFront(false); setAvatar(""); setPickedModel(""); setChooseModel(true); }}
                  className="underline decoration-white/20 underline-offset-4 active:opacity-70">{L("Schimbă modelul", "Change model")}</button>
              </div>

              {/* GO — inline, right under the images (NOT sticky). */}
              {chosenModelLocked && <p className="mt-4 text-center text-[12px] font-black text-amber-400/90">👑 Premium model · first month $8</p>}
              <button type="button" onClick={() => { logFunnelEvent("tryon_click", { lookId, ...(modelNameParam ? { lookName: modelNameParam } : {}) }); if (chosenModelLocked) { setLockedNudge(true); setShowPremium(true); return; } goStep3(); }}
                className="lb-gold mx-auto mt-4 flex h-14 w-full max-w-sm items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition-transform">
                {chosenModelLocked
                  ? <><Crown className="h-5 w-5" /> Unlock with Premium</>
                  : isModelSession ? <><Sparkles className="h-5 w-5" /> Generate my photo</>
                  : <><Play className="h-5 w-5 fill-current" /> GO{/* „Gratis" NUR beim Katalog-Model: eigenes Foto (Idol/Your photo) ist der BEZAHLTE Weg — dort wäre das Label eine Falschaussage. */ !avatar && !idol && <span className="rounded-full bg-black/15 px-2 py-0.5 text-[12px] font-black">{L("Gratis", "Free")}</span>}</>}
              </button>
            </>
          ) : (
            // Customer model picker: a 3D coverflow. The chosen model sits large in front;
            // her neighbours angle back on both sides. Tap a side card (or an arrow) to bring
            // her forward — that selects her. Locked models (not Gina) show a padlock.
            <>
              {/* Der Text der früheren Try-On-Landing steht jetzt HIER über der Model-Auswahl —
                  so entfällt die Zwischenseite, ohne dass die Erklärung verloren geht. */}
              <p className="mt-2 text-[15px] font-medium leading-snug text-white/80">
                {L("Alege un look și un model — și o vezi purtându-l într-un video. Se întoarce, merge, din toate unghiurile.",
                   "Pick a look, pick a model — and watch her wear it in a video. Turnaround, walk, every angle.")}
              </p>
              <p className="mt-2 text-[13px] font-bold text-white/85">Swipe the models — your pick stands up front. Tap “Start” to see her wear it, free.</p>
              {(() => {
                const om = [...gModels].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
                if (om.length === 0) return <div className="grid h-[46vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>;
                // "Use your own photo" lives IN the carousel as a card (3rd position), not a
                // separate button. It uploads (paid/admin) or opens the paywall.
                const YOURPHOTO = { id: "__yourphoto", name: "Your photo", photoUrl: "", featured: false } as typeof om[number];
                const cards = [...om];
                const uploadIdx = Math.min(2, cards.length);
                cards.splice(uploadIdx, 0, YOURPHOTO);
                // Admin (production) and paying users can pick ANY model; everyone else only Gina.
                const unlockAll = isPaid || adminProduce;
                const active = yourPhotoFront ? uploadIdx : Math.max(0, cards.findIndex(m => m.id === chosenModelId));
                // Bring a card to the front — by tap OR swipe. The "Your photo" tile can be
                // centered too (yourPhotoFront); it doesn't select a model. Locked (Premium)
                // models come forward with their padlock; the paywall only fires on "Generate".
                const setFront = (m: { id: string; name: string; photoUrl: string; featured?: boolean }) => {
                  setLockedNudge(false);
                  if (m.id === "__yourphoto") { setYourPhotoFront(true); return; }
                  setYourPhotoFront(false); setAvatar("");
                  setPickedModel(m.photoUrl); setPickedModelId(m.id); setPickedModelName(m.name);
                };
                const slide = (dir: number) => {
                  const ni = Math.min(cards.length - 1, Math.max(0, active + dir));
                  if (ni !== active) setFront(cards[ni]);
                };
                return (
                  <div className="relative mx-auto mt-2 h-[72vw] max-h-[300px] select-none overflow-hidden touch-pan-y" style={{ perspective: "1100px" }}
                    onPointerDown={(e) => { swipeRef.current = e.clientX; swipedRef.current = false; }}
                    onPointerUp={(e) => { const dx = e.clientX - swipeRef.current; if (Math.abs(dx) > 30) { swipedRef.current = true; slide(dx < 0 ? 1 : -1); } }}>
                    {cards.map((m, i) => {
                      const off = i - active;
                      if (Math.abs(off) > 2) return null;
                      const isUpload = m.id === "__yourphoto";
                      // AI models are free & fully visible for everyone; only REAL models blur + lock.
                      const mLocked = !isUpload && !!m.realModel && !unlockAll;
                      const isActive = off === 0;
                      return (
                        <div key={m.id} onClick={() => { if (swipedRef.current) { swipedRef.current = false; return; } if (isUpload) { if (!isActive) { setFront(m); return; } (isPaid || adminProduce) ? fileRef.current?.click() : setShowPremium(true); return; } if (!isActive) setFront(m); }}
                          className="absolute left-1/2 top-1/2 w-[54%] max-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl transition-all duration-300 ease-out"
                          style={{ transform: `translate(-50%,-50%) translateX(${off * 56}%) rotateY(${-off * 38}deg) scale(${isActive ? 1 : 0.82})`, zIndex: 20 - Math.abs(off), opacity: Math.abs(off) === 2 ? 0.45 : 1, cursor: "pointer" }}>
                          <div className="relative aspect-[3/4] w-full">
                            {isUpload ? (
                              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white/[0.04] px-3 text-center">
                                {(isPaid || adminProduce) ? <ImageUp className="h-9 w-9 text-amber-400" /> : <Lock className="h-8 w-8 text-amber-400" />}
                                <span className="text-[13px] font-black text-amber-300">Your photo</span>
                                <span className="text-[10px] font-bold text-white/75">{(isPaid || adminProduce) ? "Upload a selfie" : "Premium"}</span>
                              </div>
                            ) : (<>
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
                              : !m.realModel && <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white">Free</span>}
                            {isActive && !m.realModel && chosenModelName && (
                              // Chat is available with every (free) AI model.
                              <button type="button" onClick={(e) => { e.stopPropagation(); chosenModelId && router.push(`/chat/${chosenModelId}`); }} title={`Chat with ${chosenModelName.split(/\s+/)[0]}`}
                                className="lb-gold absolute right-2 top-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-black shadow-lg active:scale-95 transition">
                                <MessageCircle className="h-4 w-4" /> AI Chat
                              </button>
                            )}
                            {!mLocked && (
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-6">
                                <span className="text-[14px] font-black text-white">{m.name}</span>
                              </div>
                            )}
                            </>)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={async e => { const f = e.target.files?.[0]; if (f) try { setAvatar(await fileToDataUrl(f)); } catch { /**/ } }} />

          {/* Everyone (admin included) swipes ALL outfits right here; models live in the
              coverflow above. Hidden in the outfit+model confirm view (it distracts there). */}
          {!showConfirm && (
            <>
              <div className="mt-4">
                <p className="mb-2 flex items-center text-[11px] font-black uppercase tracking-wide text-white/80">Outfits<span className="ml-auto text-[10px] font-bold normal-case text-white/75">swipe →</span></p>
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {gGarments.length === 0 ? (
                    <div className="grid h-24 w-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-white/80" /></div>
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
          {!showConfirm && adminProduce && galleryVideos.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[13px] font-black">My Gallery <span className="text-white/80">{galleryVideos.length}</span></p>
              <div className="grid grid-cols-3 gap-2">
                {galleryVideos.map(v => (
                  <a key={v.id} href={v.curatorId ? `/curator/${v.curatorId}` : "#"} className="relative block aspect-[9/16] overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] active:opacity-80">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.imageUrl} alt={v.lookName ?? ""} loading="lazy" className="h-full w-full object-cover object-top" />
                    <span className="absolute inset-0 grid place-items-center text-white/90"><Play className="h-7 w-7 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]" fill="currentColor" /></span>
                    <span className={`absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[8px] font-black backdrop-blur ${v.public ? "bg-amber-500 text-white" : v.feed ? "bg-amber-400 text-black" : "bg-black/70 text-white"}`}>{v.public ? "Public" : v.feed ? "Show" : "Private"}</span>
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
                {/* Bandwidth: while the video is still behind the email gate, DON'T preload or
                    autoplay it — a gate-bouncer would otherwise download the whole clip for
                    nothing. Show just the (blurred) poster; load the video once they pass. */}
                <video ref={revealVideoRef} src={previewVideoUrl} poster={previewPoster || undefined} preload={awaitingEmail ? "none" : "auto"}
                  onClick={() => { if (revealing) return; if (awaitingEmail) { setGateOpen(true); return; } toggleVideo(); }}
                  className="h-full w-full cursor-pointer object-contain"
                  style={
                    revealing
                      ? { filter: `blur(${revealSharp ? 0 : 26}px)`, transform: `scale(${revealSharp ? 1 : 1.08})`, transition: `filter ${REVEAL_MS}ms linear, transform ${REVEAL_MS}ms ease-out` }
                      : awaitingEmail
                        ? { filter: "blur(26px)", transform: "scale(1.08)" } // teaser behind the email gate
                        : undefined
                  }
                  autoPlay={!awaitingEmail} loop playsInline muted={revealing || awaitingEmail || musicMuted} />
                {!revealing && !awaitingEmail && (
                  <>
                    {/* Sound (music) toggle */}
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleMusic(); }}
                      className="absolute right-3 top-3 z-30 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur active:scale-90 transition">
                      {musicMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </button>
                    {/* Fullscreen */}
                    <button type="button" onClick={(e) => { e.stopPropagation(); goFullscreen(); }} aria-label="Fullscreen"
                      className="absolute right-3 top-16 z-30 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur active:scale-90 transition">
                      <Maximize2 className="h-5 w-5" />
                    </button>
                    {/* Paused → big play button (tap the video to resume) */}
                    {vidPaused && (
                      <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-black/25">
                        <span className="grid h-16 w-16 place-items-center rounded-full bg-white/20 backdrop-blur"><Play className="h-8 w-8 fill-white text-white" /></span>
                      </div>
                    )}
                  </>
                )}
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
                      <span className="text-sm font-black">{L("Îți dezvăluim ținuta…", "Revealing your look…")}</span>
                    </div>
                  </>
                ) : awaitingEmail ? (
                  <button type="button" onClick={() => setGateOpen(true)} className="absolute inset-0 z-20 grid place-items-center bg-black/25">
                    <span className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 text-[13px] font-black text-black shadow-lg"><Play className="h-4 w-4 fill-black text-black" /> {L("Apasă ca s-o vezi", "Tap to watch")}</span>
                  </button>
                ) : (
                  <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-black"><Check className="h-3.5 w-3.5" /> Free</span>
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
                      <span className="mt-1 flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-[12px] font-black"><Check className="h-3.5 w-3.5" /> Video ready</span>
                    </div>
                  )}
                </div>
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-black backdrop-blur"><Lock className="h-3 w-3" /> Locked</span>
              </div>
            )}
          </div>
          {!rendering && !revealing && (
            <>
              <h1 className="mt-6 text-center text-[22px] font-black leading-tight">{!guest ? L("Videoul tău e gata 🎉", "Your video is ready 🎉") : hasLead ? L("Ești înăuntru! 💛", "You're in! 💛") : L("Vrei să vezi mai mult? 🔥", "Want to see more? 🔥")}</h1>
              <p className="mt-2 text-center text-[13px] font-bold text-white/85">{!guest ? (previewVideoUrl ? L("E gratis — apasă 🔊 pentru sunet.", "It's free — tap 🔊 for sound.") : L("Vezi-l și descarcă-l la calitate maximă.", "Watch and download it in full quality.")) : hasLead ? L("Îți trimitem look-uri noi în fiecare zi pe email. Apasă 🔊 pentru sunet.", "New looks land in your inbox every day. Tap 🔊 for sound.") : L("Autentifică-te gratis pentru sunet, salvare și mai multe ținute.", "Sign in free to unlock sound, save it, and watch more looks.")}</p>
              {/* Motion was chosen before generating — no picker on the ready step. */}
              {adminPromptPanel}
              {/* CTA — inline right under the video (NOT sticky). */}
              <div className="mx-auto mt-5 w-full max-w-sm">
                {previewVideoUrl && previewGenId ? (
                  guest ? (
                    /* CONCEPT 2.0 landing: the ad promises "chat with her" and the hook is
                       "see yourself in the look". Deliver BOTH — face-swap ($3.99) as the money
                       button + chat with her — under one value line ("a new model every day"). */
                    <div className="grid gap-2">
                      <p className="mb-1 text-center text-[12px] font-black text-[#e7c877]/90">{L("Un model nou în fiecare zi · Vezi-te pe tine · Vorbește cu ea", "A new model every day · See yourself in any look · Chat with her")}</p>
                      <button type="button" onClick={() => router.push(`/you-in-video?lang=${lang}`)}
                        className="lb-gold flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition-transform">
                        <Sparkles className="h-5 w-5" /> {L("Vezi-te pe TINE în video — $3.99 🎬", "See yourself in this video — $3.99 🎬")}
                      </button>
                      {chosenModelId && (
                        <button type="button" onClick={() => router.push(wchatBack || `/chat/${chosenModelId}`)}
                          className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[13px] font-black text-[#e7c877] active:scale-95 transition">
                          <MessageCircle className="h-4 w-4" /> {L("Vorbește cu", "Chat with")} {chosenModelName ? chosenModelName.split(/\s+/)[0] : L("ea", "her")}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <button type="button" onClick={async () => goToResult(await claimCachedTryOn())}
                        className="lb-gold flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition-transform">
                        <Sparkles className="h-5 w-5" /> {L("Vezi videoul tău →", "View your video →")}
                      </button>
                      {chosenModelId && (
                        <button type="button" onClick={() => router.push(wchatBack || `/chat/${chosenModelId}`)}
                          className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[13px] font-black text-[#e7c877] active:scale-95 transition">
                          <MessageCircle className="h-4 w-4" /> {L("Vorbește cu", "Chat with")} {chosenModelName ? chosenModelName.split(/\s+/)[0] : L("ea", "her")}
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  <button type="button" onClick={onUnlock}
                    className="lb-gold flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition-transform">
                    {(isAuthed() || (adminPin && !previewAsUser)) ? L("Continuă", "Continue") : L("Înregistrează-te ca să vezi", "Register or sign in to watch")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 4: plans ──────────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="px-4 pb-28 pt-2">
          <h1 className="text-center text-[26px] font-black">Create your video</h1>
          <p className="mt-1 text-center text-[13px] font-bold text-white/85">{(packCredits ?? 0) > 0 ? "Ready to go — this uses 1 video credit." : "Go Premium — first month just $8, then $49/month."}</p>

          {(packCredits ?? 0) > 0 ? (
            /* Has credits → just generate. */
            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-5 text-center">
              <p className="text-3xl font-black text-white">{packCredits} <span className="text-base font-bold text-white/85">videos left</span></p>
              <p className="mt-1 text-[12px] font-bold text-white/85">Generating this video uses 1 credit.</p>
            </div>
          ) : (
            /* No credits → Premium subscription (first month $8, then $49/mo → 40 videos). */
            <div className="mx-auto mt-6 max-w-sm rounded-3xl border border-amber-400/30 bg-amber-400/[0.06] p-6 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">Premium</p>
              <p className="mt-1.5 flex items-end justify-center gap-1.5"><span className="text-4xl font-black text-white">$8</span><span className="mb-1 text-sm font-bold text-white/85">first month</span></p>
              <p className="mt-0.5 text-[12px] font-bold text-white/85">then $49/month · 40 try-on videos every month</p>
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
            className="mx-auto mt-6 block text-center text-[13px] font-black text-white/85 underline underline-offset-4 active:scale-95 transition">
            Visit the models gallery →
          </button>

          {/* Admin: skip the paywall and jump to the unlocked result (test the paid flow). */}
          {adminPin && !previewAsUser && (
            <button type="button" onClick={() => setStep(5)}
              className="mx-auto mt-4 flex w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 py-3 text-[13px] font-black text-amber-300 active:scale-95 transition-transform">
              <Check className="h-4 w-4" /> Admin: continue as paid →
            </button>
          )}
        </div>
      )}

      {/* ── Step 5: unlocked / paid result ─────────────────────────────────── */}
      {step === 5 && (
        <div className="px-4 pb-40 pt-2">
          {/* Cancel — abort the generation and go back to the confirm view. */}
          <button type="button" onClick={() => {
              if (armTimerRef.current) { clearTimeout(armTimerRef.current); armTimerRef.current = null; }
              setArming(false); genStartedRef.current = false; setGenStatus("idle");
              try { musicRef.current?.pause(); } catch { /**/ }
              setRevealing(false); setRendering(false);
              setStep(2);
            }}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-black py-3 text-sm font-black text-white active:scale-95 transition">
            <X className="h-4 w-4" /> Cancel
          </button>
          {genStatus === "idle" && motionPicker && <div className="mb-3">{motionPicker}</div>}
          <div className="relative mx-auto mt-2 max-w-[78vw] overflow-hidden rounded-3xl border border-amber-400/30 bg-black">
            {/* 3:4 — passt zum 3:4-Video (vorher 9:16). */}
            <div className="relative aspect-[3/4] w-full">
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
                  {modelImg && <img src={modelImg} alt="" className={`h-full w-full object-cover object-top ${(genStatus === "generating" || arming) ? "scale-110 blur-2xl opacity-60" : ""}`} />}
                  {/* Scanner overlay while arming and while the real generation runs. */}
                  {(genStatus === "generating" || arming) && (
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
                    {arming ? (
                      <div className="flex flex-col items-center gap-3 px-6 text-center text-white/90">
                        <Sparkles className="h-8 w-8 animate-pulse" />
                        <span className="text-sm font-black">Starting your video…</span>
                        <span className="text-[12px] font-bold text-white/80">Begins in {armSecs}s{adminPin ? "" : " — cancel now and you keep your credit"}.</span>
                        <button type="button" onClick={cancelGeneration}
                          className="mt-1 flex items-center gap-1.5 rounded-full bg-white/20 px-5 py-2.5 text-[13px] font-black text-white backdrop-blur active:scale-95 transition">
                          <X className="h-4 w-4" /> Cancel
                        </button>
                      </div>
                    ) : genStatus === "generating" ? (
                      <div className="flex flex-col items-center gap-3 px-6 text-center text-white/90">
                        <Sparkles className="h-8 w-8 animate-pulse" />
                        <span className="text-sm font-black">{isModelSession ? "Generating your photo…" : "Generating your video…"}</span>
                        <span className="text-[12px] font-bold text-white/80">{isModelSession ? "Takes ~30 seconds." : "This takes ~1–2 minutes. Hang tight."}</span>
                      </div>
                    ) : genStatus === "error" ? (
                      <div className="flex flex-col items-center gap-2 px-6 text-center">
                        <span className="text-sm font-black text-red-300">Generation failed</span>
                        <span className="text-[12px] font-bold text-white/85">{genError}</span>
                        <button type="button" onClick={() => { genStartedRef.current = false; void generateReal(); }}
                          className="mt-1 rounded-full bg-white/15 px-4 py-1.5 text-[12px] font-black text-white active:opacity-70">Try again</button>
                      </div>
                    ) : adminPin ? (
                      <button type="button" onClick={() => void generateReal()}
                        className="flex items-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-black active:scale-95">
                        <Sparkles className="h-4 w-4" /> Generate video (real · credits)
                      </button>
                    ) : (
                      <Loader2 className="h-8 w-8 animate-spin text-white/85" />
                    )}
                  </div>
                </>
              )}
              {genStatus === "done" && <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-black"><Check className="h-3.5 w-3.5" /> Ready</span>}
            </div>
          </div>
          <h1 className="mt-6 text-center text-[22px] font-black leading-tight">
            {genStatus === "done" ? (genPhotoUrl ? "Your photo is ready 🎉" : "Enjoy your video 🎉") : isModelSession ? "Conjuring your photo…" : "Conjuring your video…"}
          </h1>
          <p className="mt-2 text-center text-[13px] font-bold text-white/85">
            {genStatus === "done"
              ? (genPhotoUrl ? "Saved. The team turns your best photos into videos for your profile." : "Saved to your gallery — view & manage under Account.")
              : "Your try-on is being created in full quality."}
          </p>

          {/* Full-screen the finished video + start over with a new look. */}
          {genStatus === "done" && (genVideoUrl || genPhotoUrl) && (
            <div className="mt-4 flex items-center justify-center gap-3">
              {genVideoUrl && (
                <button type="button" onClick={() => setVideoZoom(true)} title="View full screen"
                  className="lb-gold flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black active:scale-95 transition">
                  <Maximize2 className="h-4 w-4" /> Full screen
                </button>
              )}
              <button type="button" onClick={() => { setGenStatus("idle"); genStartedRef.current = false; setComboCancelled(true); setStep(2); }}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black text-white active:scale-95 transition">
                <RefreshCw className="h-4 w-4" /> Try a new look
              </button>
            </div>
          )}

          {/* "Get it in HD" is shown to EVERYONE. Premium subscribers (+ admin) upscale right
              here; non-subscribers get the Premium paywall (HD is a paid perk). */}
          {genStatus === "done" && genVideoUrl && genId && (
            <div className="mt-4 flex flex-col items-center gap-1.5">
              <button type="button" onClick={() => ((adminPin || isSubscribed) ? upscaleVideo(genId, genVideoUrl) : setShowPremium(true))} disabled={!!hdBusyId}
                className="flex items-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-black active:scale-95 transition disabled:opacity-50">
                {hdBusyId === genId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {hdBusyId === genId ? "Making it HD…" : (adminPin || isSubscribed) ? "Get it in HD (1080p)" : "Get it in HD (1080p) · Premium"}
              </button>
              {hdMsg && <span className="text-[12px] font-bold text-white/85">{hdMsg}</span>}
            </div>
          )}

          {/* Admin-only: manage the model's videos here (Fashionshow / Public / delete). The
              outfits strip is intentionally NOT shown on the result — customers use the
              "Try a new look" button above to start over (an outfit strip there confuses). */}
          {genStatus === "done" && adminPin && madeVideos.length > 0 && (
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
                        <span className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[9px] font-black backdrop-blur ${v.public ? "bg-amber-500 text-white" : v.feed ? "bg-amber-400 text-black" : "bg-black/70 text-white"}`}>{status}</span>
                      </a>
                      {adminPin && (
                        <div className="p-1.5">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setVideoFeed(v.id, !v.feed)}
                              className={`flex-1 rounded-lg px-1.5 py-1.5 text-[10px] font-black transition ${v.feed ? "bg-amber-400 text-black" : "bg-white/10 text-white/80"}`}>Fashionshow</button>
                            <button type="button" onClick={() => setVideoPublic(v.id, !v.public)}
                              className={`flex-1 rounded-lg px-1.5 py-1.5 text-[10px] font-black transition ${v.public ? "bg-amber-500 text-white" : "bg-white/10 text-white/80"}`}>{v.public ? "Public" : "Members"}</button>
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
          navigation back instead of a funnel button. Hidden on the confirm view, where the
          GO button is rendered inline under the images instead. */}
      {step !== 5 && step !== 3 && !inConfirm && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#0d0b0a] via-[#0d0b0a] to-transparent px-4 pb-5 pt-8 lb-phone-col">
          {step === 1 && (
            <p className="text-center text-[12px] font-bold text-white/75">Pick an outfit above to continue</p>
          )}
          {step === 2 && (
            (pickModel || chooseModel) && !pickedModel && !avatar ? (
              <p className="text-center text-[12px] font-bold text-white/75">Pick a model above to continue</p>
            ) : (
              <>
                {motionPicker && <div className="mb-3 -mt-2">{motionPicker}</div>}
                {/* Free-credit meter: 1 free video, 1 credit each. Not signed in → show the
                    offer, not a wrong "0 left" (anonymous has no balance yet). */}
                {!adminProduce && !chosenModelLocked && (
                  <p className="mb-2 text-center text-[12px] font-black text-white/85">
                    {!isAuthed()
                      ? L("🎟️ 1 video gratuit, apoi Premium", "🎟️ 1 free video, then Premium")
                      : packCredits == null
                      ? ""
                      : packCredits > 0
                      ? `🎟️ ${packCredits} free video${packCredits === 1 ? "" : "s"} left`
                      : "🎟️ Free video used — go Premium to keep creating"}
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
                <button type="button" onClick={() => { logFunnelEvent("tryon_click", { lookId, ...(modelNameParam ? { lookName: modelNameParam } : {}) }); if (chosenModelLocked) { setLockedNudge(true); setShowPremium(true); return; } goStep3(); }}
                  className="lb-gold flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition-transform">
                  {chosenModelLocked
                    ? <><Crown className="h-5 w-5" /> Unlock with Premium</>
                    : isModelSession ? <><Sparkles className="h-5 w-5" /> Generate my photo</>
                    : <><Play className="h-5 w-5 fill-current" /> GO{/* „Gratis" NUR beim Katalog-Model: eigenes Foto (Idol/Your photo) ist der BEZAHLTE Weg — dort wäre das Label eine Falschaussage. */ !avatar && !idol && <span className="rounded-full bg-black/15 px-2 py-0.5 text-[12px] font-black">{L("Gratis", "Free")}</span>}</>}
                </button>
              </>
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

      {gateOpen && (
        <FeedGate mode="auth" emailOnly={gateEmailOnly}
          reason={gateEmailOnly
            ? L(chosenModelName ? `Vezi-o pe ${chosenModelName.split(/\s+/)[0]} — pune emailul` : "Pune emailul ca s-o vezi",
                chosenModelName ? `Enter your email to watch ${chosenModelName.split(/\s+/)[0]}` : "Enter your email to watch")
            : L("Creează un cont gratuit ca să continui", "Create a free account to keep watching")}
          lookId={lookId} lookName={look?.name}
          advanceOnSignup
          onClose={() => setGateOpen(false)} onAuthed={async () => {
            setGateOpen(false);
            setAwaitingEmail(false); // email captured → run the reveal now
            setHasLead(true); // they're "in" now → don't nag them to register right after
            // AWAIT the signup event before the reveal fires its own event — the event log is
            // last-write-wins, so firing both at once would clobber "Signed up".
            await logFunnelEvent("tryon_signin", { lookId, ...(chosenModelName ? { lookName: chosenModelName } : {}) }); // Insights "Signed up"
            try { sessionStorage.removeItem("lb_tryon_resume"); } catch { /**/ } // resumed in-place, don't re-fire on reload
            // Signed in to WATCH → play the video RIGHT HERE (it unblurs now) and save it to
            // their gallery in the background. Do NOT navigate away (that dropped users on the
            // homepage). No cached video yet → continue the generation flow.
            if (previewVideoUrl && previewGenId) { void claimCachedTryOn(); void goStep3(); }
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

      {/* Finished try-on video, full screen. */}
      {videoZoom && genVideoUrl && (
        <div className="fixed inset-0 z-[96] flex flex-col bg-black" onClick={() => setVideoZoom(false)}>
          <div className="flex items-center justify-end px-4 py-3">
            <button type="button" onClick={() => setVideoZoom(false)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white active:scale-90 transition"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex flex-1 items-center justify-center px-2 pb-6" onClick={(e) => e.stopPropagation()}>
            <video src={genVideoUrl} className="max-h-full max-w-full rounded-2xl object-contain" autoPlay loop playsInline controls />
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
              <p className="text-[12px] font-bold text-white/85">Production: pick a look for {chosenModelName?.split(" ")[0] || "the model"}, then Generate. <span className="text-amber-400">🎬 = already has a video.</span></p>
              <div className="mt-2 flex gap-1.5">
                {([["all", "All"], ["novideo", "To do"], ["video", "🎬 With video"]] as const).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setLookVideoFilter(k)}
                    className={`rounded-full px-3 py-1 text-[11px] font-black transition ${lookVideoFilter === k ? "bg-white text-black" : "bg-white/10 text-white/80"}`}>{label}</button>
                ))}
              </div>
            </div>
          ) : (
            <p className="px-4 pb-2 text-[12px] font-bold text-white/85">Pick any look — your first 3 videos are free.</p>
          )}
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-8" onClick={(e) => e.stopPropagation()}>
           <div className="grid grid-cols-3 gap-2">
            {gGarments.length === 0 ? (
              <div className="col-span-3 grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/80" /></div>
            ) : (() => {
              const anyFeatured = gGarments.some(g => g.featured);
              return gGarments
                .filter(g => lookVideoFilter === "all" || (lookVideoFilter === "video" ? g.hasVideo : !g.hasVideo))
                .map(g => {
                // All looks are selectable now (even for guests) — you only pay per GENERATION
                // (1 free, then Premium), not per look. So nothing is locked here.
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
