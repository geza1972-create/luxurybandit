"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, ArrowLeft, Check, RefreshCw, Lock, Play, Trash2, ImageUp, X } from "lucide-react";
import PremiumDialog from "@/components/PremiumDialog";
import { FeedGate } from "@/components/FeedGate";
import BottomNav from "@/components/BottomNav";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

type Outfit = { id: string; name: string; imageUrl: string; lookId?: string };
type Look = { id: string; name: string; imageUrl?: string; frontImageUrl?: string; videoPosterUrl?: string; modelPhotoUrl?: string; curatorName?: string };

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
  const [gModels, setGModels] = useState<{ id: string; name: string; photoUrl: string; featured?: boolean }[]>([]);
  const [isPaid, setIsPaid] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [outfitZoom, setOutfitZoom] = useState(false); // fullscreen the selected garment
  useEffect(() => { try { setIsPaid(!!localStorage.getItem("luxurybandit-try-look-admin-pin") || localStorage.getItem("lb_paid") === "1"); } catch { /**/ } }, []);
  const [pickedModel, setPickedModel] = useState("");
  const [pickedModelId, setPickedModelId] = useState("");
  const [pickedModelName, setPickedModelName] = useState("");
  // "Choose other model" opens the model picker even when a model was preset (came from
  // a model page with ?model=). Load the models list for both entry points.
  const [chooseModel, setChooseModel] = useState(false);
  useEffect(() => {
    if (!pickModel && !chooseModel) return;
    fetch("/api/try-this-look?models=1").then(r => r.json()).then(d => setGModels(Array.isArray(d.models) ? d.models : [])).catch(() => {});
  }, [pickModel, chooseModel]);

  // "Choose other look" — a gallery of ALL portal garments; only the free (featured) ones
  // are selectable, the rest are Premium (padlock). Picking one reloads the funnel on that look.
  const [chooseLook, setChooseLook] = useState(false);
  const [gGarments, setGGarments] = useState<{ id: string; name: string; img: string; featured?: boolean }[]>([]);
  useEffect(() => {
    if (!chooseLook || gGarments.length) return;
    fetch("/api/try-this-look").then(r => r.json()).then(d => {
      const looks: any[] = Array.isArray(d.looks) ? d.looks : []; // eslint-disable-line @typescript-eslint/no-explicit-any
      const g = looks
        .filter(l => (l.productType === "ai" || l.wardrobe) && (l.frontImageUrl || l.imageUrl) && l.published !== false)
        .map(l => ({ id: l.id, name: l.name, img: (l.frontImageUrl || l.imageUrl) as string, featured: l.featured === true }))
        .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      setGGarments(g);
    }).catch(() => {});
  }, [chooseLook]); // eslint-disable-line react-hooks/exhaustive-deps

  const [look, setLook] = useState<Look | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [avatar, setAvatar] = useState<string>("");       // user's own photo (data URL)
  const [gateOpen, setGateOpen] = useState(false);
  const [rendering, setRendering] = useState(false);       // fake "generating" spinner before the teaser
  const [plan, setPlan] = useState<"pro" | "creator">("pro");
  const [billing, setBilling] = useState<"month" | "year">("month");
  const fileRef = useRef<HTMLInputElement>(null);

  // Admin-only prompt preview/editor (@Bild1 = model, @Bild2 = outfit).
  const [adminPin, setAdminPin] = useState("");
  const [prompt, setPrompt] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  // Admin can flip to the pure end-user view to test exactly what a user sees.
  const [previewAsUser, setPreviewAsUser] = useState(false);
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
  const REVEAL_MS = 30000;
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
  const isModelSession = !!myModel && !adminPin;
  const [genError, setGenError] = useState("");
  const genStartedRef = useRef(false);
  // The chosen model's videos (incl. the one just made) — shown as a gallery on the done screen.
  const [madeVideos, setMadeVideos] = useState<{ id: string; imageUrl: string; videoUrl?: string; lookName?: string; feed?: boolean; public?: boolean }[]>([]);
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
    if (!window.confirm("Dieses Video endgültig löschen?")) return;
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
  const modelImg = avatar || pickedModel || modelParam || look?.modelPhotoUrl || look?.videoPosterUrl || look?.frontImageUrl || look?.imageUrl || "";
  const teaserImg = garmentParam || outfit?.imageUrl || modelImg;
  // The model the try-on is attributed to (final pick wins; empty for own-photo try-ons).
  const chosenModelId = !avatar ? (pickedModelId || modelIdParam) : "";
  const chosenModelName = !avatar ? (pickedModelName || modelNameParam) : "";

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

  const onUnlock = () => {
    // Already signed in (guest session) OR admin previewing the flow → straight to plans.
    // In the admin's "User view", still show the gate so they can test the guest experience.
    if (isAuthed() || (adminPin && !previewAsUser)) setStep(4);
    else setGateOpen(true);
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
      const person = avatar || pickedModel || modelParam || look?.modelPhotoUrl || look?.videoPosterUrl || look?.frontImageUrl || look?.imageUrl || "";
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
      if (!avatar && chosenModelId && (!adminPin || previewAsUser)) {
        try {
          const combo = `${chosenModelId}|${lookId}|${motion}`;
          const cached = await fetch(`/api/try-this-look?combo=${encodeURIComponent(combo)}`).then(r => r.json());
          if (cached?.hit && cached.videoUrl) {
            setGenVideoUrl(cached.videoUrl);
            if (cached.generationId) setGenId(cached.generationId); // so "View post" links to this clip
            setGenStatus("done");
            return; // served from storage — nothing generated, nothing saved
          }
        } catch { /* cache miss or offline → fall through to real generation */ }
      }
      // Send the admin prompt EXACTLY as written (tokens like @Bild1 / @Bild2 bind to the
      // reference images server-side) — no remapping, same as typing it into Pixverse.
      const start = await fetch("/api/generate-tryon-video", { method: "POST", headers: H, body: JSON.stringify({ lookId, garment, person, prompt: prompt || "", motion, slowmo }) }).then(r => r.json());
      if (!start.videoId) throw new Error(start.error || "Start fehlgeschlagen.");
      let videoUrl = "";
      for (let i = 0; i < 45; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`).then(r => r.json());
        if (p.status === "done" && p.videoUrl) { videoUrl = p.videoUrl; break; }
        if (p.status === "failed") throw new Error(p.error || "Generierung fehlgeschlagen.");
      }
      if (!videoUrl) throw new Error("Zeitüberschreitung.");
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
        if (p.status === "failed") throw new Error(p.error || "Umrechnen fehlgeschlagen.");
      }
      if (!hdUrl) throw new Error("Zeitüberschreitung beim Umrechnen.");
      await fetch("/api/try-this-look", { method: "POST", headers: H, body: JSON.stringify({ action: "attach-generation-video", generationId: id, videoUrl: hdUrl }) });
      if (id === genId) setGenVideoUrl(hdUrl); // refresh the top player if it's the main clip
      setHdMsg("In HD umgerechnet ✓ — neu laden zum Ansehen.");
    } catch (e) {
      setHdMsg(e instanceof Error ? e.message : "Fehler beim Umrechnen");
    } finally { setHdBusyId(""); }
  };

  // Real users generate automatically after paying. Admins do NOT auto-generate (that
  // would burn Pixverse credits on every test) — they trigger it with an explicit button.
  useEffect(() => { if (step === 5 && !adminPin) void generateReal(); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Once done: load the chosen model's videos (incl. the one just made) → shown as a gallery
  // on the result screen so the admin sees it landed in her "In motion".
  useEffect(() => {
    if (genStatus !== "done" || !chosenModelId) return;
    const t = setTimeout(() => {
      // Admins see all of her videos (incl. the just-made, still-unpublished one via manage=1);
      // end-users only her published ones.
      fetch(`/api/try-this-look?curatorTryons=${encodeURIComponent(chosenModelId)}${adminPin ? "&manage=1" : ""}`, adminPin ? { headers: { "x-try-look-admin-pin": adminPin } } : undefined)
        .then(r => r.json())
        .then(d => setMadeVideos((d.userGallery ?? []).filter((v: { videoUrl?: string }) => v.videoUrl)))
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [genStatus, chosenModelId, adminPin]);

  const price = plan === "pro" ? (billing === "month" ? "$58.99" : "$29.49") : (billing === "month" ? "$128.99" : "$64.49");

  // "Motion" picker — what she does in the video. Users see ONLY these two chips;
  // the actual prompt swap (walk/turn vs dance + music) happens server-side.
  // Hidden for model sessions (they generate photos, no motion).
  const motionPicker = !isModelSession ? (
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
  const adminPromptPanel = (adminPin && !previewAsUser) ? (
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
                {outfit?.imageUrl && <img src={outfit.imageUrl} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="text-[12px] font-black">@Bild2</span>
            </div>
          </div>
          <p className="mt-2 text-[11px] font-bold text-white/35">@Bild1 = Model / Avatar · @Bild2 = gewähltes Outfit</p>
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
            <span>🐢 Slow motion {slowmo ? "· an" : "· aus"}</span>
            <span className={`grid h-5 w-9 items-center rounded-full px-0.5 ${slowmo ? "bg-amber-400" : "bg-white/20"}`}>
              <span className={`h-4 w-4 rounded-full bg-white transition-transform ${slowmo ? "translate-x-4" : ""}`} />
            </span>
          </button>
          <p className="mt-1.5 text-[11px] font-bold text-white/35">Werbemodus: langsamer 10s-Clip, direkt in HD (1080p), Musik passend. Kostet mehr — nur für dieses Video.</p>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="relative min-h-[100dvh] bg-[#0d0b0a] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-[#0d0b0a]/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => (step > 2 ? setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5) : router.back())}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 active:opacity-70">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center gap-1.5">
            {[1, 2, 3, 4].map(n => (
              <span key={n} className={`h-1 flex-1 rounded-full ${n <= step ? "bg-amber-400" : "bg-white/15"}`} />
            ))}
          </div>
        </div>
        {/* Admin bar — available on EVERY step: flip between admin view and the
            exact end-user view. */}
        {adminPin && (
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => setPreviewAsUser(v => !v)}
              className={`ml-auto shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide active:opacity-70 ${previewAsUser ? "bg-white text-black" : "bg-amber-400 text-black"}`}>
              {previewAsUser ? "User view" : "Admin view"}
            </button>
          </div>
        )}
      </div>

      {/* ── Step 1 is skipped (the garment is already chosen) — brief loader ── */}
      {step === 1 && (
        <div className="grid place-items-center px-4 py-28">
          <Loader2 className="h-6 w-6 animate-spin text-white/30" />
        </div>
      )}

      {/* ── Step 2: model / replace avatar ─────────────────────────────────── */}
      {step === 2 && (
        <div className="px-4 pb-48 pt-2">
          <h1 className="text-[22px] font-black leading-tight">Who should wear it?</h1>
          {(pickModel || chooseModel) && !pickedModel && !avatar ? (
            <>
              <p className="mt-2 text-[13px] font-bold text-white/50">Pick a model to wear this piece.</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {(() => {
                  const anyFeatured = gModels.some(m => m.featured);
                  // Featured (free) models lead; then the rest (Premium).
                  const ordered = [...gModels].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
                  // Uploading YOUR OWN photo is Premium too (paying customers only).
                  const yourLocked = !isPaid;
                  const yourTile = (
                    <button key="__your" type="button"
                      onClick={() => { if (yourLocked) { setShowPremium(true); return; } fileRef.current?.click(); }}
                      className="overflow-hidden rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] active:scale-[0.98] transition-transform">
                      <div className="relative grid aspect-[9/16] w-full place-items-center px-1 pb-6 text-center">
                        <ImageUp className="h-8 w-8 text-amber-400" />
                        {yourLocked && (
                          <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/70 backdrop-blur"><Lock className="h-3.5 w-3.5 text-amber-400" /></span>
                        )}
                      </div>
                      <div className="px-1.5 py-1"><span className="line-clamp-1 text-[11px] font-black text-amber-400">Your photo</span></div>
                    </button>
                  );
                  const modelTiles = ordered.map(m => {
                    const locked = anyFeatured && !m.featured && !isPaid;
                    return (
                      <button key={m.id} type="button"
                        onClick={() => { if (locked) { setShowPremium(true); return; } setPickedModel(m.photoUrl); setPickedModelId(m.id); setPickedModelName(m.name); }}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] active:scale-[0.98] transition-transform">
                        <div className="relative aspect-[9/16] w-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.photoUrl} alt={m.name} className={`h-full w-full object-cover object-top ${locked ? "blur-[6px] scale-105 opacity-70" : ""}`} />
                          {/* Admin-only: ★ marks the FREE (featured) models, so you generate the
                              right 12 combos. End-users don't see it. */}
                          {adminPin && m.featured && (
                            <span className="absolute left-1.5 top-1.5 z-20 grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-[13px] font-black text-black shadow" title="Free model">★</span>
                          )}
                          {locked && (
                            <span className="absolute inset-0 z-10 grid place-items-center bg-black/25">
                              <span className="grid h-9 w-9 place-items-center rounded-full bg-black/70 backdrop-blur"><Lock className="h-4 w-4 text-white" /></span>
                            </span>
                          )}
                        </div>
                        <div className="px-1.5 py-1"><span className={`line-clamp-1 text-[11px] font-black ${locked ? "text-amber-400" : ""}`}>{locked ? "Premium" : m.name}</span></div>
                      </button>
                    );
                  });
                  // Insert the "Your photo" tile at the 3rd position of the gallery.
                  return [...modelTiles.slice(0, 2), yourTile, ...modelTiles.slice(2)];
                })()}
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-[13px] font-bold text-white/50">{pickedModel ? "Great pick — or replace her with your own photo." : "The model from the video is ready. Keep her, or replace her with your own photo."}</p>
              <div className="mx-auto mt-3 w-fit overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
                {/* Height-constrained so 'Choose other model' + the outfit stay on screen. */}
                <div className="relative aspect-[9/16] h-[38vh] max-w-[78vw]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {modelImg ? <img src={modelImg} alt="" className="h-full w-full object-cover object-top" /> : <div className="h-full w-full bg-white/5" />}
                  <button type="button" onClick={() => (avatar ? fileRef.current?.click() : (setPickedModel(""), setChooseModel(true)))}
                    className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-full bg-black/70 px-4 py-2.5 text-[13px] font-black backdrop-blur active:scale-95">
                    <RefreshCw className="h-3.5 w-3.5" /> {avatar ? "Change photo" : "Change model"}
                  </button>
                </div>
              </div>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={async e => { const f = e.target.files?.[0]; if (f) try { setAvatar(await fileToDataUrl(f)); } catch { /**/ } }} />

          {outfit && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <button type="button" onClick={() => setOutfitZoom(true)} className="h-14 w-11 shrink-0 overflow-hidden rounded-lg active:scale-95 transition" title="Kleid groß ansehen">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={outfit.imageUrl} alt="" className="h-full w-full object-cover" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">Selected outfit</p>
                <p className="truncate text-sm font-black">{outfit.name}</p>
              </div>
              <button type="button" onClick={() => setChooseLook(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[12px] font-black text-white active:scale-95 transition">
                <RefreshCw className="h-3.5 w-3.5" /> Change look
              </button>
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
                  style={revealing ? { filter: `blur(${revealSharp ? 0 : 26}px)`, transform: `scale(${revealSharp ? 1 : 1.08})`, transition: `filter ${REVEAL_MS}ms linear, transform ${REVEAL_MS}ms ease-out` } : undefined}
                  loop playsInline muted={revealing} controls={!revealing} />
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
              <h1 className="mt-6 text-center text-[22px] font-black leading-tight">{previewVideoUrl ? "Enjoy your video 🎉" : "Your video is ready."}</h1>
              <p className="mt-2 text-center text-[13px] font-bold text-white/50">{previewVideoUrl ? "It's free — tap 🔊 for sound. Sign in to save & download it." : "Sign in to watch and download it in full quality."}</p>
              {/* Motion was chosen before generating — no picker on the ready step. */}
              {adminPromptPanel}
            </>
          )}
        </div>
      )}

      {/* ── Step 4: plans ──────────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="px-4 pb-28 pt-2">
          <h1 className="text-center text-[26px] font-black">Select your plan</h1>
          <p className="mt-1 text-center text-[13px] font-bold text-white/50">Unlock your video and unlimited try-ons.</p>

          <div className="mx-auto mt-5 flex w-fit items-center gap-1 rounded-full bg-white/10 p-1 text-sm font-black">
            <button type="button" onClick={() => setBilling("month")} className={`rounded-full px-4 py-1.5 ${billing === "month" ? "bg-white text-black" : "text-white/60"}`}>Monthly</button>
            <button type="button" onClick={() => setBilling("year")} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 ${billing === "year" ? "bg-white text-black" : "text-white/60"}`}>Yearly <span className="rounded-full bg-amber-400 px-1.5 text-[10px] text-black">-50%</span></button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {(["pro", "creator"] as const).map(p => (
              <button key={p} type="button" onClick={() => setPlan(p)}
                className={`rounded-2xl border p-4 text-left transition ${plan === p ? "border-amber-400 bg-amber-400/10" : "border-white/12 bg-white/[0.03]"}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[13px] font-black uppercase tracking-wide ${p === "pro" ? "text-amber-400" : "text-white"}`}>{p}</span>
                  {plan === p && <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-black"><Check className="h-3.5 w-3.5" /></span>}
                </div>
                <p className="mt-3 text-[12px] font-bold text-white/50">{p === "pro" ? "Best start" : "Full access"}</p>
                <p className="mt-1 text-2xl font-black">{p === "pro" ? (billing === "month" ? "$58.99" : "$29.49") : (billing === "month" ? "$128.99" : "$64.49")}</p>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            {[["Video", "Your try-on video in full quality"], ["Unlimited", "Unlimited try-ons on any look"], ["Avatar", "Use your own photo as the model"]].map(([t, d]) => (
              <div key={t} className="flex items-center gap-3 py-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-400/20 text-amber-400"><Check className="h-4 w-4" /></span>
                <div><p className="text-sm font-black">{t}</p><p className="text-[12px] font-bold text-white/45">{d}</p></div>
              </div>
            ))}
          </div>

          {/* Admin: skip the paywall and jump to the unlocked result (test the paid flow). */}
          {adminPin && !previewAsUser && (
            <button type="button" onClick={() => setStep(5)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 py-3 text-[13px] font-black text-emerald-300 active:scale-95 transition-transform">
              <Check className="h-4 w-4" /> Admin: als bezahlt fortfahren →
            </button>
          )}
        </div>
      )}

      {/* ── Step 5: unlocked / paid result ─────────────────────────────────── */}
      {step === 5 && (
        <div className="px-4 pb-40 pt-2">
          {genStatus === "idle" && <div className="mb-3">{motionPicker}</div>}
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
                  <div className="absolute inset-0 grid place-items-center">
                    {genStatus === "generating" ? (
                      <div className="flex flex-col items-center gap-3 px-6 text-center text-white/90">
                        <Loader2 className="h-9 w-9 animate-spin" />
                        <span className="text-sm font-black">{isModelSession ? "Dein Foto wird generiert…" : "Dein Video wird generiert…"}</span>
                        <span className="text-[12px] font-bold text-white/50">{isModelSession ? "Dauert ~30 Sekunden." : "Das dauert ~1–2 Minuten. Bleib dran."}</span>
                      </div>
                    ) : genStatus === "error" ? (
                      <div className="flex flex-col items-center gap-2 px-6 text-center">
                        <span className="text-sm font-black text-red-300">Generierung fehlgeschlagen</span>
                        <span className="text-[12px] font-bold text-white/50">{genError}</span>
                        <button type="button" onClick={() => { genStartedRef.current = false; void generateReal(); }}
                          className="mt-1 rounded-full bg-white/15 px-4 py-1.5 text-[12px] font-black text-white active:opacity-70">Erneut versuchen</button>
                      </div>
                    ) : adminPin ? (
                      <button type="button" onClick={() => void generateReal()}
                        className="flex items-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-black active:scale-95">
                        <Sparkles className="h-4 w-4" /> Video generieren (echt · Credits)
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
            {genStatus === "done" ? (genPhotoUrl ? "Dein Foto ist fertig 🎉" : "Enjoy your video 🎉") : isModelSession ? "Wir zaubern dein Foto…" : "Wir zaubern dein Video…"}
          </h1>
          <p className="mt-2 text-center text-[13px] font-bold text-white/50">
            {genStatus === "done"
              ? (genPhotoUrl ? "Gespeichert. Das Team macht aus deinen besten Fotos Videos für dein Profil." : "Gespeichert in deiner Galerie — ansehen & verwalten unter Account.")
              : "Dein Try-on wird in voller Qualität erstellt."}
          </p>

          {/* View the finished video as a full post (before/after, like & share, other looks). */}
          {genStatus === "done" && genVideoUrl && genId && (
            <div className="mt-4 flex justify-center">
              <button type="button" onClick={() => router.push(`/post/${genId}`)}
                className="lb-gold flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black active:scale-95 transition">
                <Sparkles className="h-4 w-4" /> View your video
              </button>
            </div>
          )}

          {/* Admin: HD the keeper right here. Upscales THIS 360p clip to 1080p (no re-gen). */}
          {adminPin && genStatus === "done" && genVideoUrl && genId && (
            <div className="mt-4 flex flex-col items-center gap-1.5">
              <button type="button" onClick={() => upscaleVideo(genId, genVideoUrl)} disabled={!!hdBusyId}
                className="flex items-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-black active:scale-95 transition disabled:opacity-50">
                {hdBusyId === genId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {hdBusyId === genId ? "Rechne in HD um…" : "In HD umrechnen (1080p · Credits)"}
              </button>
              {hdMsg && <span className="text-[12px] font-bold text-white/50">{hdMsg}</span>}
            </div>
          )}

          {/* After generating: a gallery of the model's videos (incl. this one). Admins set
              each one's visibility right here — Fashionshow (feed + her profile "In motion"),
              Öffentlich (everyone vs members-only), or delete. */}
          {genStatus === "done" && madeVideos.length > 0 && (
            <div className="mt-7">
              <p className="mb-2 text-[13px] font-black">{chosenModelName ? `${chosenModelName}'s Videos` : "Deine Videos"}</p>
              <div className={`grid gap-3 ${adminPin ? "grid-cols-2" : "grid-cols-3"}`}>
                {madeVideos.map(v => {
                  const status = v.public ? "Öffentlich" : v.feed ? "Fashionshow" : "Privat";
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
                              className={`flex-1 rounded-lg px-1.5 py-1.5 text-[10px] font-black transition ${v.public ? "bg-emerald-500 text-white" : "bg-white/10 text-white/60"}`}>{v.public ? "Öffentlich" : "Mitglieder"}</button>
                            <button type="button" onClick={() => deleteVideoGen(v.id)}
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-red-500/20 text-red-300 active:scale-90"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                          {/* Upscale THIS clip to HD (1080p) — no re-generation, same content. */}
                          {v.videoUrl && (
                            <button type="button" onClick={() => upscaleVideo(v.id, v.videoUrl!)} disabled={!!hdBusyId}
                              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-400/90 px-1.5 py-1.5 text-[10px] font-black text-black active:scale-95 transition disabled:opacity-50">
                              {hdBusyId === v.id ? <><Loader2 className="h-3 w-3 animate-spin" /> HD…</> : <><Sparkles className="h-3 w-3" /> In HD umrechnen</>}
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
                {/* Motion pick lives right at the decision point (also on steps 3+5). */}
                {motionPicker && <div className="mb-3 -mt-2">{motionPicker}</div>}
                <button type="button" onClick={goStep3}
                  className="lb-gold flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition-transform">
                  <Sparkles className="h-5 w-5" /> {isModelSession ? "Generate my photo" : "Generate my video"}
                </button>
              </>
            )
          )}
          {step === 3 && !rendering && !revealing && (
            previewVideoUrl && previewGenId ? (
              // Free video is already playing above → open the full post (free), no wall.
              <button type="button" onClick={() => router.push(`/post/${previewGenId}`)}
                className="lb-gold flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition-transform">
                <Sparkles className="h-5 w-5" /> View your video →
              </button>
            ) : (
              <button type="button" onClick={onUnlock}
                className="lb-gold flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition-transform">
                {(isAuthed() || (adminPin && !previewAsUser)) ? "Continue" : "Sign in & watch"}
              </button>
            )
          )}
          {step === 4 && (
            <button type="button" onClick={() => alert("Checkout — subscription billing wird als Nächstes verdrahtet.")}
              className="lb-gold flex h-14 w-full items-center justify-center rounded-full text-base font-black active:scale-95 transition-transform">
              Continue — {price}/{billing === "month" ? "mo" : "mo, billed yearly"}
            </button>
          )}
        </div>
      )}
      {step === 5 && <BottomNav forceShow />}

      {gateOpen && (
        <FeedGate mode="auth" reason="Sign in to watch your video" lookId={lookId} lookName={look?.name}
          advanceOnSignup
          onClose={() => setGateOpen(false)} onAuthed={() => { setGateOpen(false); setStep(4); }} />
      )}

      <PremiumDialog open={showPremium} onClose={() => setShowPremium(false)} />

      {/* Fullscreen garment view — tap the outfit thumbnail to open, tap/X to close. */}
      {outfitZoom && (garmentParam || outfit?.imageUrl) && (
        <div className="fixed inset-0 z-[95] flex flex-col bg-black/95" onClick={() => setOutfitZoom(false)}>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-black text-white">{outfit?.name || "Selected outfit"}</p>
            <button type="button" onClick={() => setOutfitZoom(false)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white active:scale-90 transition"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex flex-1 items-center justify-center px-4 pb-8" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={garmentParam || outfit?.imageUrl || ""} alt={outfit?.name || ""} className="max-h-full max-w-full rounded-2xl object-contain" />
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
          <p className="px-4 pb-2 text-[12px] font-bold text-white/45">Only the free looks are selectable — the rest are Premium.</p>
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-8" onClick={(e) => e.stopPropagation()}>
           <div className="grid grid-cols-3 gap-2">
            {gGarments.length === 0 ? (
              <div className="col-span-3 grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
            ) : (() => {
              const anyFeatured = gGarments.some(g => g.featured);
              return gGarments.map(g => {
                const locked = anyFeatured && !g.featured && !isPaid;
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
