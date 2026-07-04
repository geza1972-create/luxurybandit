"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, ArrowLeft, Check, RefreshCw, Lock, Play, LayoutGrid } from "lucide-react";
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

  const [look, setLook] = useState<Look | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
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
  const [genError, setGenError] = useState("");
  const genStartedRef = useRef(false);

  useEffect(() => {
    try { setAdminPin(localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""); } catch { /**/ }
  }, []);

  useEffect(() => {
    fetch(`/api/try-this-look?previewId=${encodeURIComponent(lookId)}`).then(r => r.json()).then(d => setLook(d.look ?? null)).catch(() => {});
    fetch(`/api/try-this-look`).then(r => r.json()).then(d => {
      // Show global outfits (no lookId) plus any assigned to THIS look.
      setOutfits((d.outfits ?? []).filter((o: Outfit) => !o.lookId || o.lookId === lookId));
      setPrompt(d.funnelVideoPrompt ?? "");
    }).catch(() => {});
  }, [lookId]);

  const savePrompt = async () => {
    setPromptSaving(true); setPromptSaved(false);
    try {
      const res = await fetch("/api/try-this-look", { method: "POST", headers: { "Content-Type": "application/json", ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}) }, body: JSON.stringify({ action: "set-funnel-prompt", prompt }) });
      if (res.ok) { setPromptSaved(true); window.setTimeout(() => setPromptSaved(false), 2000); }
    } catch { /**/ } finally { setPromptSaving(false); }
  };

  // The "woman from the video" reference — the look's own poster/front image, unless the
  // user replaced it with their own avatar.
  const modelImg = avatar || modelParam || look?.modelPhotoUrl || look?.videoPosterUrl || look?.frontImageUrl || look?.imageUrl || "";
  const teaserImg = outfit?.imageUrl || modelImg;

  const goStep3 = () => {
    // Fake render: a short spinner, then the blurred "ready" teaser. No real generation.
    setRendering(true);
    setStep(3);
    window.setTimeout(() => setRendering(false), 2200);
  };

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
      const person = avatar || modelParam || look?.modelPhotoUrl || look?.videoPosterUrl || look?.frontImageUrl || look?.imageUrl || "";
      const garment = (outfitOverride ?? outfit)?.imageUrl || "";
      if (!person || !garment) throw new Error("Referenzbilder fehlen.");
      // Send the admin prompt EXACTLY as written (tokens like @Bild1 / @Bild2 bind to the
      // reference images server-side) — no remapping, same as typing it into Pixverse.
      const start = await fetch("/api/generate-tryon-video", { method: "POST", headers: H, body: JSON.stringify({ lookId, garment, person, prompt: prompt || "" }) }).then(r => r.json());
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
      if (poster) {
        const gen = await fetch("/api/try-this-look", { method: "POST", headers: H, body: JSON.stringify({
          action: "generation", lookId, image: poster, genKind: "video", feed: false,
          customerName: (session?.user?.email?.split("@")[0]) || "You",
          ownerEmail: session?.user?.email || "", userId: session?.user?.id || "",
        }) }).then(r => r.json());
        if (gen.generationId) await fetch("/api/try-this-look", { method: "POST", headers: H, body: JSON.stringify({ action: "attach-generation-video", generationId: gen.generationId, videoUrl }) });
      }
    } catch (e) {
      setGenStatus("error"); setGenError(e instanceof Error ? e.message : "Fehler");
    }
  };

  // Pick another outfit from the under-video gallery → generate a fresh video for it.
  const regenerateWith = (o: Outfit) => {
    setOutfit(o);
    genStartedRef.current = false;
    setGenVideoUrl(""); setGenStatus("idle"); setGenError("");
    void generateReal(o);
  };

  // Real users generate automatically after paying. Admins do NOT auto-generate (that
  // would burn Pixverse credits on every test) — they trigger it with an explicit button.
  useEffect(() => { if (step === 5 && !adminPin) void generateReal(); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const price = plan === "pro" ? (billing === "month" ? "$58.99" : "$29.49") : (billing === "month" ? "$128.99" : "$64.49");

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
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="lb-phone-col relative min-h-[100dvh] bg-[#0d0b0a] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-[#0d0b0a]/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => (step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5) : router.back())}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 active:opacity-70">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-1 items-center gap-1.5">
            {[1, 2, 3, 4].map(n => (
              <span key={n} className={`h-1 flex-1 rounded-full ${n <= step ? "bg-amber-400" : "bg-white/15"}`} />
            ))}
          </div>
        </div>
        {/* Admin bar — available on EVERY step: jump back to this look's gallery, and
            flip between admin view and the exact end-user view. */}
        {adminPin && (
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => router.push(`/admin/outfits?look=${encodeURIComponent(lookId)}`)}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white active:opacity-70">
              <LayoutGrid className="h-3.5 w-3.5" /> Zur Galerie
            </button>
            <button type="button" onClick={() => setPreviewAsUser(v => !v)}
              className={`ml-auto shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide active:opacity-70 ${previewAsUser ? "bg-white text-black" : "bg-amber-400 text-black"}`}>
              {previewAsUser ? "User view" : "Admin view"}
            </button>
          </div>
        )}
      </div>

      {/* ── Step 1: pick an outfit ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="px-4 pb-28 pt-2">
          <h1 className="text-[22px] font-black leading-tight">See this look on {avatar ? "you" : "the model"} — in any outfit</h1>
          <p className="mt-2 text-[13px] font-bold text-white/50">Want to see the model (or your own avatar) from this video wearing something else? Pick an outfit to start.</p>
          {outfits.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-[13px] font-bold text-white/40">Outfits coming soon.</div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {outfits.map(o => (
                <button key={o.id} type="button" onClick={() => { setOutfit(o); setStep(2); }}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] active:scale-[0.98] transition-transform">
                  <div className="aspect-[3/4] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.imageUrl} alt={o.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="absolute inset-x-2 bottom-2 rounded-xl bg-black px-3 py-2">
                    <span className="line-clamp-1 text-[13px] font-black text-white">{o.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: model / replace avatar ─────────────────────────────────── */}
      {step === 2 && (
        <div className="px-4 pb-28 pt-2">
          <h1 className="text-[22px] font-black leading-tight">Who should wear it?</h1>
          <p className="mt-2 text-[13px] font-bold text-white/50">The model from the video is ready. Keep her, or replace her with your own photo.</p>

          <div className="mx-auto mt-4 max-w-[78vw] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
            <div className="relative aspect-[3/4] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {modelImg ? <img src={modelImg} alt="" className="h-full w-full object-cover object-top" /> : <div className="h-full w-full bg-white/5" />}
              <button type="button" onClick={() => fileRef.current?.click()}
                className="absolute inset-x-4 bottom-4 flex items-center justify-center gap-2 rounded-full bg-black/70 px-5 py-3 text-sm font-black backdrop-blur active:scale-95">
                <RefreshCw className="h-4 w-4" /> {avatar ? "Replace your photo" : "Replace with your Photo"}
              </button>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={async e => { const f = e.target.files?.[0]; if (f) try { setAvatar(await fileToDataUrl(f)); } catch { /**/ } }} />

          {outfit && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={outfit.imageUrl} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">Selected outfit</p>
                <p className="truncate text-sm font-black">{outfit.name}</p>
              </div>
            </div>
          )}
          {adminPromptPanel}
        </div>
      )}

      {/* ── Step 3: fake "video ready" blurred teaser ──────────────────────── */}
      {step === 3 && (
        <div className="px-4 pb-28 pt-2">
          <div className="relative mx-auto mt-2 overflow-hidden rounded-3xl border border-white/10">
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
          </div>
          {!rendering && (
            <>
              <h1 className="mt-6 text-center text-[22px] font-black leading-tight">Your video is ready.</h1>
              <p className="mt-2 text-center text-[13px] font-bold text-white/50">Sign in to watch and download it in full quality.</p>
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
          <div className="relative mx-auto mt-2 max-w-[78vw] overflow-hidden rounded-3xl border border-emerald-400/30 bg-black">
            <div className="relative aspect-[3/4] w-full">
              {genStatus === "done" && genVideoUrl ? (
                <video src={genVideoUrl} className="h-full w-full object-cover" autoPlay loop muted playsInline controls />
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {modelImg && <img src={modelImg} alt="" className={`h-full w-full object-cover object-top ${genStatus === "generating" ? "scale-110 blur-2xl opacity-60" : ""}`} />}
                  <div className="absolute inset-0 grid place-items-center">
                    {genStatus === "generating" ? (
                      <div className="flex flex-col items-center gap-3 px-6 text-center text-white/90">
                        <Loader2 className="h-9 w-9 animate-spin" />
                        <span className="text-sm font-black">Dein Video wird generiert…</span>
                        <span className="text-[12px] font-bold text-white/50">Das dauert ~1–2 Minuten. Bleib dran.</span>
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
          <h1 className="mt-6 text-center text-[22px] font-black leading-tight">{genStatus === "done" ? "Enjoy your video 🎉" : "Wir zaubern dein Video…"}</h1>
          <p className="mt-2 text-center text-[13px] font-bold text-white/50">{genStatus === "done" ? "Gespeichert in deiner Galerie — ansehen & verwalten unter Account." : "Dein Try-on wird in voller Qualität erstellt."}</p>

          {/* Under the video: the outfit gallery. Tap another outfit → a fresh video is
              generated above (each result also saves to your gallery). */}
          {outfits.length > 0 && (
            <div className="mt-7">
              <p className="mb-2 text-[13px] font-black">Try another outfit</p>
              <div className="grid grid-cols-3 gap-2">
                {outfits.map(o => (
                  <button key={o.id} type="button" onClick={() => regenerateWith(o)} disabled={genStatus === "generating"}
                    className={`relative overflow-hidden rounded-xl border active:scale-95 transition-transform disabled:opacity-40 ${outfit?.id === o.id ? "border-amber-400" : "border-white/10"}`}>
                    <div className="aspect-[3/4] w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={o.imageUrl} alt={o.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="absolute inset-x-1 bottom-1 rounded-lg bg-black px-2 py-1">
                      <span className="line-clamp-1 text-[10px] font-black text-white">{o.name}</span>
                    </div>
                    {outfit?.id === o.id && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-black"><Check className="h-3 w-3" /></span>}
                  </button>
                ))}
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
            <button type="button" onClick={goStep3}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-amber-400 text-base font-black text-black active:scale-95 transition-transform">
              <Sparkles className="h-5 w-5" /> Generate my video
            </button>
          )}
          {step === 3 && !rendering && (
            <button type="button" onClick={onUnlock}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-amber-400 text-base font-black text-black active:scale-95 transition-transform">
              {(isAuthed() || (adminPin && !previewAsUser)) ? "Continue" : "Sign in & watch"}
            </button>
          )}
          {step === 4 && (
            <button type="button" onClick={() => alert("Checkout — subscription billing wird als Nächstes verdrahtet.")}
              className="flex h-14 w-full items-center justify-center rounded-full bg-amber-400 text-base font-black text-black active:scale-95 transition-transform">
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
    </div>
  );
}
