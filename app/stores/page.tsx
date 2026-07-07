"use client";

export const dynamic = "force-dynamic";

import {
  getStoredAuthSession,
  resetPassword,
  signInWithPassword,
  signInWithOAuth,
  signOut,
  signUpWithPassword,
} from "@/lib/supabase-auth-client";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { lookPath } from "@/lib/look-slug";
import HomeFeed, { type FeedLook } from "@/components/HomeFeed";
import { isAdminEmail } from "@/lib/is-admin-email";
import { LOOK_CATEGORIES, isHiddenFromAll, isLookCategory, type LookCategory } from "@/lib/look-category";
import { publicLookLabel } from "@/lib/look-title";
import { publicAuthorName } from "@/lib/display-name";
import { safeLookImage } from "@/lib/look-image";
import { Bookmark, Crop, Eye, EyeOff, Heart, Home, Image as ImageIcon, ImageUp, Info, Instagram, LayoutGrid, Loader2, LogOut, MessageCircle, Play, Search, Send, ShoppingBag, SlidersHorizontal, Sparkles, Trash2, User, UserPlus, Volume2, VolumeX, X } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PhotoCropper } from "../curators/taste-form";

// Serve Supabase images via Next.js' image optimizer (right-sized WebP) instead
// of full-resolution PNGs. Non-Supabase/empty URLs pass through unchanged.
function optImg(url: string | undefined, w = 1080, q = 70): string {
  if (!url || !url.includes("/storage/v1/")) return url ?? "";
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=${q}`;
}

// Fashionshow tile that PLAYS its clip (admin-picked "animated" posts). The <video>
// mounts only while the tile is on screen — mobile caps hardware decoders (~16),
// so off-screen tiles must not hold any.
function GridClip({ videoUrl, poster, alt }: { videoUrl: string; poster: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [playing, setPlaying] = useState(false); // video actually rendering frames
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(es => es.forEach(e => setInView(e.isIntersecting)), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative h-full w-full">
      {/* Optimized still (400w) shows INSTANTLY and stays underneath as the fallback,
          so a slow/buffering video never leaves the tile blank. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={optImg(poster, 400)} alt={alt} loading="lazy" decoding="async"
        onError={(e) => { const im = e.currentTarget; if (poster && im.src !== poster) im.src = poster; }}
        className="absolute inset-0 h-full w-full object-cover object-top" />
      {inView && (
        /* Video fades in only once it's playing; until then the still is visible. */
        <video src={videoUrl} muted loop playsInline autoPlay preload="metadata"
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-300 ${playing ? "opacity-100" : "opacity-0"}`} />
      )}
    </div>
  );
}

// Deterministic pseudo-random view count based on look ID
function viewCount(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) { h = Math.imul(31, h) + id.charCodeAt(i) | 0; }
  const n = (Math.abs(h) % 49901) + 100; // 100–50000
  return n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// Deterministic seed-based comment count (matches look page seed comments)
function seedCommentCount(id: string): number {
  let h = 0;
  const s = id + "_comments";
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  return (Math.abs(h) % 3) + 2; // 2–4
}

// Deterministic like count
function likeCount(id: string): string {
  let h = 0;
  const s = id + "_likes";
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  const n = (Math.abs(h) % 49800) + 200;
  return n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

type Look = {
  id: string;
  name: string;
  storeName?: string;
  storeSlug?: string;
  price?: string;
  salePrice?: string;
  discountLabel?: string;
  inStock?: boolean;
  imageUrl: string;
  frontImageUrl?: string;
  galleryImageUrls?: string[];
  productType?: "real" | "virtual";
  brand?: string;
  lingerie?: boolean;
  category?: LookCategory;
  generationCount?: number;
  curatorId?: string;
  curatorName?: string;
  curatorPhotoUrl?: string;
  curatorMotto?: string;
  curatorNote?: string;
  productNote?: string;
  videoUrl?: string;
  videoCreatedAt?: string;
  videoPosterUrl?: string;
  tryOnImageUrl?: string;
  feedOrder?: number;
  aiCreated?: boolean;
  commentsOff?: boolean;
  likeCount?: number;
  createdAt?: string;
  alternatives?: { title: string; link: string; source?: string; thumbnail: string; price?: string; priceValue?: number; currency?: string }[];
};

// The AI hero isn't for sale — the dupes are. On cards we show the entry price
// of the cheapest dupe ("from $46") instead of the single source price.
// The shoppable price RANGE across a look's options — the "shop it at any price"
// hook made visible (e.g. "$35–$475"). Single option → just that price.
function priceRange(alts?: Look["alternatives"]): string | null {
  const withVal = (alts ?? []).filter(a => typeof a.priceValue === "number" && (a.priceValue as number) > 0);
  if (withVal.length === 0) return null;
  const byCur: Record<string, number[]> = {};
  for (const a of withVal) { const c = a.currency || "$"; (byCur[c] ??= []).push(a.priceValue as number); }
  const cur = Object.keys(byCur).sort((a, b) => byCur[b].length - byCur[a].length)[0];
  const vals = byCur[cur];
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
  return lo === hi ? `${cur}${fmt(lo)}` : `${cur}${fmt(hi)}–${cur}${fmt(lo)}`;
}
// Price to show on a feed card: the look's OWN price only. The dupe-derived
// "luxe→budget" range is NEVER shown here — it's revealed on demand (Bandit the
// look), never from the cached shop-options list.
function feedPrice(look: Look): string | null {
  const raw = String(look.salePrice ?? look.price ?? "").trim();
  if (!raw) return null;
  return /^[\d.,]+$/.test(raw) ? `$${raw}` : raw;
}

// Persisted videos are stored as /videos/<epoch-ms>-<uuid>.mp4 — recover the
// generation time from the filename for looks that predate the videoCreatedAt field.
function tsFromVideoUrl(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/\/videos\/(\d{10,})-/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? new Date(n).toISOString() : null;
}

type Payload = {
  looks?: Look[];
  stores?: { name: string; slug: string }[];
  error?: string;
};

// A single horizontally-swipeable preview slide: the video, then for a try-on a
// "compare" slide with the uploaded Before photo + the AI After result side by side.
// (The Before is the user's upload — NOT AI — so it gets no AI label.)
type Slide = { kind: "video" | "image" | "compare"; url: string; beforeUrl?: string };
function buildSlides(imageUrl: string, videoUrl: string | undefined, userPhotoUrl?: string): Slide[] {
  const slides: Slide[] = [];
  // ONLY the try-on video + the Before/After — nothing else.
  // 1) the try-on video (else the After image as the hero, when there's no video).
  if (videoUrl) slides.push({ kind: "video", url: videoUrl });
  else if (imageUrl) slides.push({ kind: "image", url: imageUrl });
  // 2) the Before | After split — only when there's an uploaded Before photo.
  if (userPhotoUrl && imageUrl) slides.push({ kind: "compare", url: imageUrl, beforeUrl: userPhotoUrl });
  return slides;
}

type CommunityItem = {
  id: string;
  lookId: string;
  imageUrl: string;
  videoUrl?: string;
  brand?: string;
  lingerie?: boolean;
  category?: LookCategory;
  public?: boolean; // admin "fully unlocked" → visible to everyone in "All"
  visibility?: "public" | "community" | "private"; // moderation tier (All | Community | Private chips)
  pinned?: boolean; // admin-pinned → first in grid + reel
  animated?: boolean; // admin-picked → tile plays inline in the grid
  thumbUrl?: string;
  userPhotoUrl?: string;
  customerName: string;
  lookName: string;
  lookTitle?: string;
  storeName: string;
  storeSlug: string;
  curatorId?: string;
  curatorName?: string;
  curatorPhotoUrl?: string;
  slides?: Slide[];
  kind?: "look" | "tryon"; // for the in-feed Hide action (unpublish look vs hide try-on)
  mine?: boolean; // this post belongs to the signed-in user → owner-only actions
  createdAt: string;
};

// ── Community slide (extracted to avoid component-inside-component) ──────────
function CommunitySlide({ it, offset, verticalDrag, transition, muted, onToggleMute, onHome, isStaff, onMakeVideo, makingVideoLookId, onInfo, onMediaReady }: {
  it: CommunityItem; offset: number; verticalDrag: number; transition: string;
  muted: boolean; onToggleMute: () => void; onHome: () => void;
  isStaff?: boolean; onMakeVideo?: (lookId: string) => void; makingVideoLookId?: string;
  onInfo?: () => void; // admin: open the post-info/history sheet (label becomes the trigger)
  onMediaReady?: (ready: boolean) => void; // drives the parent's top loading bar (current slide only)
}) {
  const uname = it.customerName
    ? it.customerName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    : "";
  // The creator shown at the bottom: the person who tried it on, else the curator.
  const creatorName = (it.customerName || it.curatorName || "").trim();
  const creatorSlug = creatorName ? creatorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : "";
  const [following, setFollowing] = useState(false);
  useEffect(() => {
    try { const l = JSON.parse(localStorage.getItem("lb_following") ?? "[]"); setFollowing(Array.isArray(l) && l.includes(creatorSlug)); } catch { /**/ }
  }, [creatorSlug]);
  const toggleFollow = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!creatorSlug) return;
    const next = !following;
    setFollowing(next);
    try {
      const l = JSON.parse(localStorage.getItem("lb_following") ?? "[]") as string[];
      const nl = next ? [...new Set([...l, creatorSlug])] : l.filter(s => s !== creatorSlug);
      localStorage.setItem("lb_following", JSON.stringify(nl));
    } catch { /**/ }
    try {
      const sess = getStoredAuthSession();
      const cur = (() => { try { return JSON.parse(localStorage.getItem("lb_curator") ?? "{}"); } catch { return {}; } })();
      const h: Record<string, string> = { "Content-Type": "application/json" };
      if (sess?.access_token) h.Authorization = `Bearer ${sess.access_token}`;
      else if (cur?.id) h["x-curator-id"] = cur.id;
      fetch("/api/follow", { method: "POST", headers: h, body: JSON.stringify({ slug: creatorSlug, type: "user" }) }).catch(() => {});
    } catch { /**/ }
  };
  // Horizontal preview slides: video → Before/After photos.
  const slides: Slide[] = (it.slides && it.slides.length)
    ? it.slides
    : [...(it.videoUrl ? [{ kind: "video" as const, url: it.videoUrl }] : []), { kind: "image" as const, url: it.imageUrl }];
  const [hIdx, setHIdx] = useState(0);
  const [paused, setPaused] = useState(false);   // user explicitly tapped to pause
  const [playFailed, setPlayFailed] = useState(false); // autoplay was blocked / not ready
  const [buffering, setBuffering] = useState(false); // video still loading → show a spinner
  const [soon, setSoon] = useState(false); // non-staff tapped Make AI-Video (paid, pending Stripe)
  const scrollerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isCurrent = offset === 0;
  const showingVideo = slides[hIdx]?.kind === "video";
  // The 3 reels slides (prev/current/next) are reused as you scroll, so reset the
  // horizontal slide back to the first one whenever the POST changes — otherwise a
  // post you scroll to opens on slide 2 (the one you'd swiped to on the previous post).
  useEffect(() => {
    setHIdx(0);
    setBuffering(false);
    const el = scrollerRef.current;
    if (el) el.scrollLeft = 0;
  }, [it.id]);
  // Try to (auto)play the current video. If the browser blocks it we flag it so a
  // Play button appears instead of a silently-frozen frame.
  const attemptPlay = () => {
    const v = videoRef.current;
    if (!v || !isCurrent || !showingVideo || paused) return;
    v.muted = muted; // set the PROPERTY (React's `muted` prop alone is unreliable → blocks muted autoplay)
    v.play().then(() => setPlayFailed(false)).catch(() => setPlayFailed(true));
  };
  // Play when this post is current + the video slide is on screen + not user-paused.
  // Retried from the video's onCanPlay/onLoadedData (see below) so a not-yet-ready
  // video still starts after a scroll.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (isCurrent && showingVideo && !paused) attemptPlay();
    else { try { v.pause(); } catch { /**/ } }
  }, [isCurrent, showingVideo, paused, muted]); // eslint-disable-line react-hooks/exhaustive-deps
  // Reset to playing whenever this post leaves the screen, so it auto-plays next time.
  useEffect(() => { if (!isCurrent) { setPaused(false); setPlayFailed(false); setBuffering(false); } }, [isCurrent]);
  // Tell the parent whether THIS (current) reel's media is ready → drives the top bar.
  const reportReady = (ready: boolean) => { if (isCurrent) onMediaReady?.(ready); };
  useEffect(() => {
    if (!isCurrent) return;
    const s = slides[hIdx];
    if (!s) { onMediaReady?.(true); return; }
    if (s.kind === "video") {
      const v = videoRef.current;
      onMediaReady?.(!!v && v.readyState >= 3); // ready if already buffered (preload), else wait for onCanPlay
    } else {
      onMediaReady?.(true); // images/compare load fast; onLoad also confirms below
    }
  }, [isCurrent, hIdx]); // eslint-disable-line react-hooks/exhaustive-deps
  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    if (i !== hIdx) setHIdx(i);
  };
  return (
    <div className="absolute inset-0 bg-black"
      style={{ transform: `translateY(calc(${offset * 100}% + ${verticalDrag}px))`, transition, willChange: "transform" }}>
      <div className="absolute inset-0 overflow-hidden">
        <div ref={scrollerRef} onScroll={onScroll}
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {slides.map((s, i) => (
            <div key={i} className="relative h-full w-full shrink-0 snap-center bg-black">
              {s.kind === "video" ? (
                <video ref={videoRef} src={s.url} poster={optImg(it.imageUrl, 1080)} muted={muted} loop playsInline
                  // Buffer the CURRENT and the NEXT reel ahead of time so a swipe doesn't
                  // stall waiting for the next video to load. The previous reel only keeps
                  // metadata (it's already been watched).
                  preload={offset >= 0 ? "auto" : "metadata"}
                  onClick={() => setPaused(p => !p)}
                  onWaiting={() => { setBuffering(true); reportReady(false); }}
                  onStalled={() => { setBuffering(true); reportReady(false); }}
                  onCanPlay={() => { setBuffering(false); reportReady(true); attemptPlay(); }}
                  onLoadedData={() => { setBuffering(false); reportReady(true); attemptPlay(); }}
                  onPlaying={() => { setBuffering(false); setPlayFailed(false); reportReady(true); }}
                  onPlay={() => setPlayFailed(false)}
                  className="h-full w-full object-cover object-top" />
              ) : s.kind === "compare" ? (
                // Before (upload, no AI label) | After (AI result) side by side
                <div className="flex h-full w-full">
                  <div className="relative h-full w-1/2 overflow-hidden border-r border-white/25">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={optImg(s.beforeUrl || "", 640)} alt="Before" onError={(e) => { const im = e.currentTarget; if (s.beforeUrl && im.src !== s.beforeUrl) im.src = s.beforeUrl; }} className="h-full w-full object-cover object-top" />
                    <span className="absolute left-2 top-12 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur">Before</span>
                  </div>
                  <div className="relative h-full w-1/2 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={optImg(s.url, 640)} alt="After" onError={(e) => { const im = e.currentTarget; if (im.src !== s.url) im.src = s.url; }} className="h-full w-full object-cover object-top" />
                    {onInfo ? (
                      <button type="button" onClick={onInfo} title="Info / history"
                        onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
                        style={{ touchAction: "manipulation" }}
                        className="absolute right-2 top-12 z-20 flex items-center gap-1 cursor-pointer rounded-full bg-black/55 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur transition hover:bg-black/80 active:opacity-70"><Sparkles className="h-2.5 w-2.5" />After <Info className="ml-0.5 h-2.5 w-2.5 opacity-90" /></button>
                    ) : (
                      <span className="absolute right-2 top-12 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur"><Sparkles className="h-2.5 w-2.5" />After</span>
                    )}
                  </div>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={optImg(s.url, 1080)} alt={it.lookName} loading="lazy" decoding="async"
                  onLoad={() => reportReady(true)}
                  onError={(e) => { const im = e.currentTarget; if (im.src !== s.url) im.src = s.url; }}
                  className="h-full w-full object-cover object-top" />
              )}
              {/* Play overlay — shown when the user paused OR autoplay was blocked. */}
              {s.kind === "video" && isCurrent && (paused || playFailed) && (
                <button type="button" aria-label="Play"
                  onClick={() => { setPaused(false); setPlayFailed(false); const v = videoRef.current; if (v) { v.muted = muted; v.play().catch(() => {}); } }}
                  className="absolute inset-0 z-10 grid place-items-center bg-black/10">
                  <Play className="h-16 w-16 fill-white/90 text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
                </button>
              )}
              {/* Buffering spinner — so a still-loading video reads as "loading", not
                  "end of feed". Shown only while the current video is actually waiting. */}
              {s.kind === "video" && isCurrent && buffering && !paused && !playFailed && (
                <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
                  <div className="flex flex-col items-center gap-2 rounded-2xl bg-black/35 px-5 py-4 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                    <span className="text-[11px] font-black text-white/90">Loading…</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* AI content label (top-left). Hidden on the compare slide — it mixes the
            uploaded Before (not AI) with the AI After, each labelled on its own half. */}
        {(slides[hIdx]?.kind === "video" || slides[hIdx]?.kind === "image") && (
          onInfo ? (
            // The label itself opens the post info/history sheet (whole pill clickable).
            // stopPropagation on pointer/touch start so a tap never turns into a swipe.
            <button type="button" onClick={onInfo} title="Info / history"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute left-3 top-3 z-20 flex items-center gap-1 cursor-pointer rounded-full bg-black/55 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white backdrop-blur transition hover:bg-black/80 active:opacity-70"
              style={{ top: "max(0.75rem, calc(env(safe-area-inset-top) + 0.25rem))", touchAction: "manipulation" }}>
              <Sparkles className="h-3.5 w-3.5" />{slides[hIdx].kind === "video" ? "AI-Video" : "AI Picture"}
              <Info className="ml-1 h-3.5 w-3.5 opacity-90" />
            </button>
          ) : (
            <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur"
              style={{ top: "max(0.75rem, calc(env(safe-area-inset-top) + 0.25rem))" }}>
              <Sparkles className="h-3 w-3" />{slides[hIdx].kind === "video" ? "AI-Video" : "AI Picture"}
            </span>
          )
        )}
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/50 to-transparent pointer-events-none" />
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-4 pt-12" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        {/* Slide dots — uniform + bottom-centered, same style as the feed (HomeFeed) */}
        {slides.length > 1 && (
          <div className="mb-3 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${i === hIdx ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        )}
        {/* ── The two core money buttons over the image ── */}
        {it.lookId && (
          <div className="mb-2.5 flex flex-wrap items-center justify-center gap-2.5">
            {/* Fashionshow is watch-only: send viewers to the MODEL's page (her clean
                wardrobe → the new flow), not the legacy per-look funnel. */}
            <a href={it.curatorId ? `/curator/${it.curatorId}` : `/try/${it.lookId}${it.userPhotoUrl ? `?model=${encodeURIComponent(it.userPhotoUrl)}` : ""}`}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-white/80 px-5 text-sm font-black text-black backdrop-blur-md active:scale-95 transition-transform">
              <Sparkles className="h-4 w-4" /> See her in other looks
            </a>
            {/* Make AI-Video — ONLY on the user's OWN AI-picture post (no video yet).
                Owner → opens the try-on flow (video + 360° tiers). Staff keep the
                inline one-tap generate on any post (content seeding). */}
            {!it.videoUrl && it.mine && !isStaff && (
              <a href={`/try/${it.lookId}${it.userPhotoUrl ? `?model=${encodeURIComponent(it.userPhotoUrl)}` : ""}`}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-white/80 px-5 text-sm font-black text-black backdrop-blur-md active:scale-95 transition-transform">
                <Sparkles className="h-4 w-4" /> Make AI-Video
              </a>
            )}
            {!it.videoUrl && isStaff && onMakeVideo && (
              <button type="button" disabled={makingVideoLookId === it.lookId}
                onClick={() => onMakeVideo(it.lookId)}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-white/80 px-5 text-sm font-black text-black backdrop-blur-md active:scale-95 transition-transform disabled:opacity-60">
                {makingVideoLookId === it.lookId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {makingVideoLookId === it.lookId ? "Generating…" : "Make AI-Video"}
              </button>
            )}
          </div>
        )}
        {/* ── Creator + Follow ── */}
        <div className="flex items-center gap-3">
          {creatorName ? (
            <>
              <a href={creatorSlug ? `/u/${creatorSlug}` : "#"} className="flex items-center gap-2 min-w-0 flex-1">
                {it.curatorPhotoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={it.curatorPhotoUrl} alt={creatorName} className="h-9 w-9 shrink-0 rounded-full bg-white/10 object-cover" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(publicAuthorName(creatorName))}&backgroundColor=ffffff&fontColor=000000&fontSize=40`}
                      alt={publicAuthorName(creatorName)} className="h-9 w-9 shrink-0 rounded-full bg-white/10 object-cover" />}
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{publicAuthorName(creatorName)}</p>
                  {it.lookTitle && <p className="truncate text-[11px] font-bold text-white/50">{it.lookTitle}</p>}
                </div>
              </a>
              <button type="button" onClick={toggleFollow}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-black transition active:scale-95 ${following ? "border border-white/35 text-white/80" : "bg-white text-black"}`}>
                {following ? "Following" : "Follow"}
              </button>
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">{it.lookTitle || "Luxury look"}</p>
                {it.storeName && <p className="truncate text-[11px] font-bold text-white/50">{it.storeName}</p>}
              </div>
              {it.storeName && (
                <a href={it.storeSlug ? `/store/${it.storeSlug}` : "#"}
                  className="shrink-0 rounded-full border border-white/20 px-3 py-1.5 text-xs font-black text-white/70">
                  {it.storeName}
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Comments bottom-sheet (used inside the reels feed) ──────────────────────
type FeedComment = { id: string; text: string; authorName: string; createdAt: string };
function CommentsSheet({ lookId, onClose }: { lookId: string; onClose: () => void }) {
  useScrollLock();
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const load = () => fetch(`/api/try-this-look?comments=1&lookId=${encodeURIComponent(lookId)}`)
    .then(r => r.json()).then((d: { comments?: FeedComment[] }) => setComments(d.comments ?? []))
    .catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [lookId]);
  const authorName = () => { try { return JSON.parse(localStorage.getItem("lb_curator") ?? "{}").firstName || "You"; } catch { return "You"; } };
  const submit = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    // optimistic
    const optimistic: FeedComment = { id: `tmp-${Date.now()}`, text: t, authorName: authorName(), createdAt: new Date().toISOString() };
    setComments(prev => [optimistic, ...prev]);
    setText("");
    await fetch("/api/try-this-look", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-comment", lookId, text: t, authorName: authorName() }) }).catch(() => {});
    setSending(false);
    void load();
  };
  return (
    <div className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div className="flex max-h-[78dvh] flex-col rounded-t-2xl bg-white" onClick={e => e.stopPropagation()}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
          <span className="text-sm font-black text-black">Comments{comments.length ? ` · ${comments.length}` : ""}</span>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-black/40 active:bg-black/5"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 overscroll-contain">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-black/30" /></div>
          ) : comments.length === 0 ? (
            <p className="py-8 text-center text-sm font-bold text-black/35">No comments yet — be the first.</p>
          ) : comments.map(c => (
            <div key={c.id} className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(c.authorName || "Guest")}&backgroundColor=000000&fontColor=ffffff&fontSize=40`}
                alt="" className="h-8 w-8 shrink-0 rounded-full bg-black/5" />
              <div className="min-w-0">
                <p className="text-xs font-black text-black">{c.authorName || "Guest"}</p>
                <p className="text-sm text-black/80 leading-snug break-words">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-black/8 px-3 py-2.5">
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void submit(); }}
            placeholder="Add a comment…" maxLength={500}
            className="h-10 flex-1 rounded-full bg-black/[0.05] px-4 text-sm font-medium text-black placeholder:text-black/35 outline-none focus:bg-black/[0.08]" />
          <button type="button" onClick={() => void submit()} disabled={sending || !text.trim()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-white disabled:opacity-30 active:scale-95">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Community detail fullscreen component — TikTok vertical carousel ─────────
function CommunityDetailView({
  allItems,
  initialIndex,
  likes,
  onClose,
  onLikeToggle,
  onHide,
  onDelete,
  onAssign,
  onInfo,
  curators,
  isAdmin,
  myCuratorId,
  onHideItem,
  onMakeVideo,
  makingVideoLookId,
  onUpscale,
  upscalingId,
  router,
}: {
  allItems: CommunityItem[];
  initialIndex: number;
  likes: Record<string, boolean>;
  onClose: () => void;
  onLikeToggle: (id: string) => void;
  onHide?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAssign?: (item: CommunityItem, curatorId: string, curatorName: string) => Promise<void>;
  onInfo?: (item: CommunityItem) => Promise<Record<string, unknown> | null>;
  curators?: { id: string; firstName?: string; lastName?: string; photoUrl?: string }[];
  isAdmin?: boolean;
  myCuratorId?: string;
  onHideItem?: (item: CommunityItem) => void;
  onMakeVideo?: (lookId: string) => void;
  makingVideoLookId?: string;
  onUpscale?: (item: CommunityItem) => void;
  upscalingId?: string;
  router: ReturnType<typeof import("next/navigation").useRouter>;
}) {
  const [currentIdx, setCurrentIdx] = useState(initialIndex);
  // Count a real feed view when a post becomes the active reel (once per look/session).
  const viewedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const it = allItems[currentIdx];
    const lookId = it?.lookId || it?.id;
    if (!lookId || viewedRef.current.has(lookId)) return;
    viewedRef.current.add(lookId);
    // Don't count the admin's/dev's own scrolling as a real view (internal → skipped
    // server-side), so the view count reflects REAL end-user impressions only.
    const internal = (() => { try { return !!localStorage.getItem("luxurybandit-try-look-admin-pin"); } catch { return false; } })();
    try {
      fetch("/api/try-this-look", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "view", lookId, internal }) }).catch(() => {});
    } catch { /**/ }
  }, [currentIdx, allItems]);
  const [verticalDrag, setVerticalDrag] = useState(0);
  const [verticalSnapping, setVerticalSnapping] = useState(false);
  // Thin top progress bar: shown on every scroll until the new reel's media is ready.
  const [mediaReady, setMediaReady] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignName, setAssignName] = useState("");
  const [assignWorking, setAssignWorking] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [muted, setMuted] = useState(true); // start muted so autoplay works; tap 🔊 for sound
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoData, setInfoData] = useState<Record<string, unknown> | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const openInfo = async () => {
    if (!onInfo) return;
    setInfoOpen(true); setInfoData(null); setInfoLoading(true);
    try { setInfoData(await onInfo(item)); } catch { setInfoData(null); }
    setInfoLoading(false);
  };

  const isDraggingVertical = useRef(false);
  const verticalDragRef = useRef(0);
  const wheelCooldown = useRef(false);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // The slides are positioned in % of the container; the drag/snap math must use the
  // SAME unit (the container's real px height) — window.innerHeight differs on mobile
  // (address bar), which left a gap showing the grid behind while scrolling.
  const slideH = () => containerRef.current?.clientHeight || (typeof window !== "undefined" ? window.innerHeight : 800);

  // ── Feed soundtrack ───────────────────────────────────────────────────────
  // Our own music (Pixverse/Kling clips are silent). Shuffled /public mp3s; the
  // track changes as you scroll and resumes where it left off. Gated by the same
  // `muted` toggle the user already taps for sound.
  const audioRef = useRef<HTMLAudioElement>(null);
  const tracksRef = useRef<string[]>([]);
  const curTrack = useRef(-1);
  const trackPos = useRef<Record<number, number>>({});
  const mutedRef = useRef(true); mutedRef.current = muted;
  useEffect(() => {
    fetch("/api/feed-music").then(r => r.json())
      .then(d => { tracksRef.current = [...(d.tracks ?? [])].sort(() => Math.random() - 0.5); })
      .catch(() => {});
  }, []);
  const playTrack = (trackIdx: number) => {
    const a = audioRef.current, t = tracksRef.current;
    if (!a || !t.length) return;
    if (trackIdx === curTrack.current) { if (!mutedRef.current) void a.play().catch(() => {}); return; }
    if (curTrack.current >= 0) trackPos.current[curTrack.current] = a.currentTime || 0;
    curTrack.current = trackIdx;
    a.src = t[trackIdx];
    a.volume = 0.5;
    const resume = trackPos.current[trackIdx] || 0;
    const onMeta = () => { try { a.currentTime = resume; } catch { /**/ } if (!mutedRef.current) void a.play().catch(() => {}); a.removeEventListener("loadedmetadata", onMeta); };
    a.addEventListener("loadedmetadata", onMeta);
  };
  // Active reel → its track (rotates as you scroll).
  useEffect(() => {
    const t = tracksRef.current;
    if (t.length) playTrack(currentIdx % t.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx]);
  // The sound toggle gates the whole soundtrack.
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    if (muted) { if (curTrack.current >= 0) trackPos.current[curTrack.current] = a.currentTime || 0; a.pause(); }
    else if (curTrack.current < 0 && tracksRef.current.length) playTrack(currentIdx % tracksRef.current.length);
    else void a.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  const item = allItems[currentIdx];
  const prevItem = allItems.length > 1 ? allItems[(currentIdx - 1 + allItems.length) % allItems.length] : null;
  const nextItem = allItems.length > 1 ? allItems[(currentIdx + 1) % allItems.length] : null;

  useEffect(() => {
    setAssignName(item?.customerName ?? "");
    setAssignOpen(false);
  }, [currentIdx, item?.customerName]);

  if (!item) return null;

  const isLiked = likes[item.id] ?? false;
  const username = item.customerName
    ? item.customerName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    : "";

  const seedVal = (salt: string, min: number, max: number) => {
    let h = 0; const s = item.id + salt;
    for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
    return min + (Math.abs(h) % (max - min + 1));
  };
  const fmt = (n: number) => n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  const likeCount = seedVal("_gl", 200, 49800) + (isLiked ? 1 : 0);
  const viewCount = seedVal("_gv", 1000, 49800);

  const shareItem = async () => {
    const url = `${window.location.origin}/look/${item.lookId}`;
    if (navigator.share) { try { await navigator.share({ title: item.lookName, url }); } catch { /**/ } }
    else { try { await navigator.clipboard.writeText(url); } catch { /**/ } }
  };

  const snapTo = (newIdx: number, targetY: number) => {
    setMediaReady(false); // show the loading bar until the new reel's media is ready
    setVerticalSnapping(true);
    setVerticalDrag(targetY);
    setTimeout(() => {
      setCurrentIdx(newIdx);
      setVerticalDrag(0);
      setVerticalSnapping(false);
    }, 280);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDraggingVertical.current = false;
    verticalDragRef.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (!isDraggingVertical.current && Math.abs(dy) > 8) isDraggingVertical.current = true;
    if (isDraggingVertical.current) { verticalDragRef.current = dy; setVerticalDrag(dy); }
  };

  const onTouchEnd = () => {
    if (!isDraggingVertical.current) return;
    isDraggingVertical.current = false;
    const finalDrag = verticalDragRef.current;
    const h = slideH();
    const threshold = h * 0.2;
    if (Math.abs(finalDrag) >= threshold && allItems.length > 1) {
      if (finalDrag < 0) snapTo((currentIdx + 1) % allItems.length, -h);
      else snapTo((currentIdx - 1 + allItems.length) % allItems.length, h);
    } else {
      setVerticalSnapping(true); setVerticalDrag(0);
      setTimeout(() => setVerticalSnapping(false), 280);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (allItems.length <= 1) return;
    if (wheelCooldown.current || verticalSnapping) return;
    // Take ONE step, then a FIXED short cooldown. (The old logic only cleared the lock
    // 160ms after trackpad momentum fully stopped, so it stayed locked for 1–2s and the
    // feed felt frozen between deliberate scrolls.) A fixed window absorbs a single
    // flick's momentum without blocking the next intentional scroll.
    wheelCooldown.current = true;
    if (wheelTimer.current) clearTimeout(wheelTimer.current);
    wheelTimer.current = setTimeout(() => { wheelCooldown.current = false; }, 500);
    const goNext = e.deltaY > 0;
    const newIdx = goNext ? (currentIdx + 1) % allItems.length : (currentIdx - 1 + allItems.length) % allItems.length;
    snapTo(newIdx, goNext ? -slideH() : slideH());
  };

  const transition = verticalSnapping ? "transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)" : "none";

  return (
    <div ref={containerRef} className="lb-phone-col fixed inset-0 z-[100] overflow-hidden bg-black overscroll-none"
      style={{ height: "100dvh" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      {/* Thin top progress bar — appears on every scroll until the new reel's media is
          ready, so the user can tell the next item is loading (not the end of the feed). */}
      {!mediaReady && (
        <div className="absolute inset-x-0 top-0 z-30 h-[3px] overflow-hidden bg-white/15">
          <div className="lb-loadbar h-full w-1/3 bg-white/90" />
        </div>
      )}
      {/* Prev slide */}
      {prevItem && <CommunitySlide it={prevItem} offset={-1} verticalDrag={verticalDrag} transition={transition} muted={muted} onToggleMute={() => setMuted(m => !m)} onHome={onClose} isStaff={!!isAdmin || !!myCuratorId} onMakeVideo={onMakeVideo} makingVideoLookId={makingVideoLookId} />}
      {/* Current slide */}
      <CommunitySlide it={item} offset={0} verticalDrag={verticalDrag} transition={transition} muted={muted} onToggleMute={() => setMuted(m => !m)} onHome={onClose} isStaff={!!isAdmin || !!myCuratorId} onMakeVideo={onMakeVideo} makingVideoLookId={makingVideoLookId} onInfo={openInfo} onMediaReady={setMediaReady} />
      {/* Next slide */}
      {nextItem && <CommunitySlide it={nextItem} offset={1} verticalDrag={verticalDrag} transition={transition} muted={muted} onToggleMute={() => setMuted(m => !m)} onHome={onClose} isStaff={!!isAdmin || !!myCuratorId} onMakeVideo={onMakeVideo} makingVideoLookId={makingVideoLookId} />}

      {/* Bottom-left: Sound on/off */}
      <button type="button" onClick={() => setMuted(m => !m)}
        className="absolute left-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur active:scale-90 transition-transform pointer-events-auto"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 7.5rem)" }}>
        {muted
          ? <VolumeX strokeWidth={2} className="h-5 w-5 text-white" />
          : <Volume2 strokeWidth={2} className="h-5 w-5 text-white" />}
      </button>
      {/* Feed soundtrack — our own music (clips are silent). eslint-disable-next-line jsx-a11y/media-has-caption */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="auto" loop />


      {/* Right action column — always on top, not translated */}
      <div className="absolute right-2 z-20 flex flex-col items-center gap-5 pointer-events-auto"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 7.5rem)" }}>
        {/* Like */}
        <button type="button" onClick={() => onLikeToggle(item.id)}
          className="flex flex-col items-center gap-[3px] active:scale-90 transition-transform">
          <Heart strokeWidth={2} className={`h-7 w-7 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] transition-transform ${isLiked ? "fill-red-500 text-red-500 scale-110" : "text-white"}`} />
          <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">{fmt(likeCount)}</span>
        </button>
        {/* Comments */}
        <button type="button" onClick={() => setCommentsOpen(true)}
          className="flex flex-col items-center gap-[3px] active:scale-90 transition-transform">
          <MessageCircle strokeWidth={2} className="h-7 w-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
          <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">{seedCommentCount(item.id)}</span>
        </button>
        {/* Views */}
        <div className="flex flex-col items-center gap-[3px] pointer-events-none select-none">
          <svg className="h-7 w-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">{fmt(viewCount)}</span>
        </div>
        {/* Save */}
        <button type="button"
          onClick={() => {
            try {
              const list = JSON.parse(localStorage.getItem("lb_bookmarks") ?? "[]") as string[];
              const id = item.id;
              const next = list.includes(id) ? list.filter(x => x !== id) : [...list, id];
              localStorage.setItem("lb_bookmarks", JSON.stringify(next));
            } catch { /**/ }
          }}
          className="flex flex-col items-center gap-[3px] active:scale-90 transition-transform">
          <Bookmark strokeWidth={2} className="h-7 w-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
          <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">Save</span>
        </button>
        {/* Share */}
        <button type="button" onClick={() => void shareItem()}
          className="flex flex-col items-center gap-[3px] active:scale-90 transition-transform">
          <Send strokeWidth={2} className="h-7 w-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
          <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">Share</span>
        </button>
        {/* Home / overview — under Share */}
        <button type="button" onClick={onClose}
          className="flex flex-col items-center gap-[3px] active:scale-90 transition-transform">
          <Home strokeWidth={2} className="h-7 w-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
          <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">Home</span>
        </button>
      </div>

      {/* Top bar — always on top, not translated. The container is click-through
          (pointer-events-none) so it doesn't swallow taps on the AI label below it;
          only the button group itself is interactive. */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-end p-4 pointer-events-none"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Info now lives on the AI-Video / AI Picture label (top-left) — see CommunitySlide. */}
          {/* Hide (owner/admin) — orange, next to delete */}
          {onHideItem && (isAdmin || (!!myCuratorId && item.curatorId === myCuratorId)) && (
            <button type="button" onClick={() => onHideItem(item)} title="Hide"
              className="grid h-10 w-10 place-items-center rounded-full bg-amber-400/85 backdrop-blur text-white active:opacity-70">
              <EyeOff className="h-5 w-5" />
            </button>
          )}
          {/* Delete (admin) — red. Looks delete the whole look; try-ons delete the post. */}
          {onDelete && (
            <button type="button" onClick={() => onDelete(item.id)} title="Delete"
              className="grid h-10 w-10 place-items-center rounded-full bg-red-500/85 backdrop-blur text-white active:opacity-70">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
          {/* Assign to a creator (admin) — look sets its curator, try-on sets the poster. */}
          {onAssign && (
            <button type="button" onClick={() => setAssignOpen(true)} title="Assign"
              className="grid h-10 w-10 place-items-center rounded-full bg-black/55 backdrop-blur text-white active:opacity-70">
              <UserPlus className="h-5 w-5" />
            </button>
          )}
          {/* Upscale to HD (admin, videos only) — Pixverse re-renders this exact video in
              1080p and replaces it. */}
          {onUpscale && isAdmin && item.videoUrl && (
            <button type="button" onClick={() => onUpscale(item)} title="Upscale to HD" disabled={upscalingId === item.id}
              className="grid h-10 min-w-10 place-items-center rounded-full bg-black/55 px-3 backdrop-blur text-[12px] font-black text-white active:opacity-70 disabled:opacity-60">
              {upscalingId === item.id ? <Loader2 className="h-5 w-5 animate-spin" /> : "HD"}
            </button>
          )}
        </div>
      </div>

      {/* Assign-to-creator picker (admin) — pick from the list of creators by name + photo */}
      {onAssign && assignOpen && (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/50" onClick={() => setAssignOpen(false)}>
          <div className="flex max-h-[72dvh] flex-col rounded-t-2xl bg-white" onClick={e => e.stopPropagation()}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
              <span className="text-sm font-black text-black">Assign to creator</span>
              <button type="button" onClick={() => setAssignOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-black/40 active:bg-black/5"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-2 overscroll-contain">
              {(curators ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm font-bold text-black/35">No creators loaded.</p>
              ) : (curators ?? []).map(c => {
                const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "Creator";
                return (
                  <button key={c.id} type="button" disabled={assignWorking}
                    onClick={async () => { setAssignWorking(true); await onAssign(item, c.id, name); setAssignWorking(false); setAssignOpen(false); }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition active:bg-black/5 disabled:opacity-50">
                    {c.photoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={c.photoUrl} alt={name} className="h-10 w-10 shrink-0 rounded-full object-cover bg-black/5" />
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=000000&fontColor=ffffff&fontSize=40`} alt={name} className="h-10 w-10 shrink-0 rounded-full bg-black/5" />}
                    <span className="min-w-0 flex-1 truncate text-sm font-black text-black">{name}</span>
                    {(item.kind === "look" ? item.curatorId === c.id : item.customerName === name) && <span className="text-[11px] font-black text-emerald-600">current</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Comments sheet */}
      {commentsOpen && item.lookId && (
        <CommentsSheet lookId={item.lookId} onClose={() => setCommentsOpen(false)} />
      )}

      {/* Info / history sheet (admin) — provenance of this post */}
      {onInfo && infoOpen && (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/50" onClick={() => setInfoOpen(false)}>
          <div className="flex max-h-[78dvh] flex-col rounded-t-2xl bg-white" onClick={e => e.stopPropagation()}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-black text-black"><Info className="h-4 w-4" /> Post info & history</span>
              <button type="button" onClick={() => setInfoOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-black/40 active:bg-black/5"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 overscroll-contain">
              {infoLoading ? (
                <div className="flex items-center justify-center py-10 text-black/40"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : !infoData ? (
                <p className="py-8 text-center text-sm font-bold text-black/35">No info found.</p>
              ) : (() => {
                const d = infoData as Record<string, any>;
                const isLook = d.kind === "look";
                const fmt = (iso: any) => {
                  if (!iso) return "—";
                  try { return new Date(iso).toLocaleString("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return String(iso); }
                };
                // Human label for the generation type.
                const typeLabel = isLook
                  ? (d.aiCreated ? "AI-Studio look (AI-generated)" : `Curated look${d.productType === "real" ? " · real product" : ""}`)
                  : (d.hadUserPhoto ? "Try-on (own photo uploaded)" : "Try-on (AI render, no own photo)");
                const mediaLabel = d.media === "video"
                  ? (isLook ? "With video" : (d.videoKind === "video360" ? "AI-Video 360°" : "AI-Video"))
                  : (isLook ? "Image only" : "AI-Picture");
                const Row = ({ k, v }: { k: string; v: ReactNode }) => (
                  <div className="flex items-start justify-between gap-4 border-b border-black/5 py-2.5">
                    <span className="shrink-0 text-[12px] font-bold uppercase tracking-wide text-black/40">{k}</span>
                    <span className="min-w-0 text-right text-[13px] font-semibold text-black">{v}</span>
                  </div>
                );
                return (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${isLook ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"}`}>{isLook ? "Look" : "Try-on"}</span>
                      <span className="rounded-full bg-black/8 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-black/60">{mediaLabel}</span>
                      {!isLook && d.media === "video" && !d.genKindKnown && (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700" title="Created before tier tracking — the exact video tier (360°?) wasn't saved.">Tier not recorded</span>
                      )}
                    </div>
                    <Row k="Created" v={fmt(d.createdAt)} />
                    <Row k="By" v={<span>{d.who || "—"}{d.isCurator && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">CURATOR</span>}</span>} />
                    <Row k="Type" v={typeLabel} />
                    <Row k="Media" v={mediaLabel} />
                    {isLook ? (
                      <>
                        {d.brand && <Row k="Brand" v={d.brand} />}
                        {d.price && <Row k="Price" v={d.price} />}
                        <Row k="Try-ons" v={String(d.tryOns ?? 0)} />
                        <Row k="Likes" v={String(d.likes ?? 0)} />
                        {d.media === "video" && d.videoCreatedAt && <Row k="Video created" v={fmt(d.videoCreatedAt)} />}
                        {d.status && <Row k="Status" v={String(d.status)} />}
                      </>
                    ) : (
                      <>
                        <Row k="Look" v={d.lookName || "—"} />
                        {d.source && <Row k="Source" v={String(d.source)} />}
                        {d.status && <Row k="Status" v={String(d.status)} />}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Merkliste panel (standalone full-screen saved products) ─────────────────
function MerklistePanel({ onClose }: { onClose: () => void }) {
  useScrollLock();
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ids: string[] = [];
    try { ids = JSON.parse(localStorage.getItem("lb_bookmarks") ?? "[]") as string[]; } catch { /**/ }
    setBookmarks(ids);
    if (ids.length === 0) { setLoading(false); return; }
    fetch("/api/try-this-look")
      .then(r => r.json())
      .then((data: Payload) => setLooks((data.looks ?? []).filter(l => ids.includes(l.id))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const remove = (id: string) => {
    const next = bookmarks.filter(b => b !== id);
    setBookmarks(next);
    setLooks(l => l.filter(x => x.id !== id));
    try { localStorage.setItem("lb_bookmarks", JSON.stringify(next)); } catch { /**/ }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/8 px-4 py-4 pt-safe-top">
        <h2 className="text-base font-black text-ink">Saved</h2>
        <button type="button" onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-full border border-black/10 text-ink/40">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-safe-bottom">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-black/30" />
          </div>
        ) : looks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center px-6">
            <span className="text-4xl">🔖</span>
            <p className="text-sm font-black text-black/40">No saved items yet.</p>
            <p className="text-xs text-black/30">Tap the bookmark icon on a look to save it.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-xs font-bold text-black/40 mb-1">{looks.length} {looks.length === 1 ? "item" : "items"} saved</p>
            {looks.map(look => {
              const img = look.frontImageUrl ?? look.imageUrl;
              return (
                <div key={look.id} className="flex items-center gap-3 rounded-xl border border-black/8 p-3">
                  <a href={lookPath(look.name, look.id)} className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70">
                    {img && (
                      <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-black/5">
                        <Image src={img} alt={look.name} fill className="object-cover object-top" sizes="48px" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-ink">{look.name}</p>
                      {look.storeName && <p className="truncate text-xs font-bold text-ink/40">{look.storeName}</p>}
                      {(() => {
                        const label = feedPrice(look);
                        return label ? <p className="mt-0.5 text-xs font-black text-ink">{label}</p> : null;
                      })()}
                    </div>
                  </a>
                  <button type="button" onClick={() => remove(look.id)}
                    className="shrink-0 grid h-7 w-7 place-items-center rounded-full bg-black/5 text-ink/30 active:opacity-70">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Saved looks list (bookmarks) – used inside UserPanel ─────────────────────
function SavedLooksList({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem("lb_bookmarks") ?? "[]") as string[];
      setBookmarks(ids);
    } catch { setBookmarks([]); }
  }, []);

  useEffect(() => {
    if (!open || bookmarks.length === 0) { setLoading(false); return; }
    setLoading(true);
    fetch("/api/try-this-look")
      .then(r => r.json())
      .then((data: Payload) => {
        const all = data.looks ?? [];
        setLooks(all.filter(l => bookmarks.includes(l.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, bookmarks]);

  const remove = (id: string) => {
    const next = bookmarks.filter(b => b !== id);
    setBookmarks(next);
    setLooks(l => l.filter(x => x.id !== id));
    try { localStorage.setItem("lb_bookmarks", JSON.stringify(next)); } catch { /**/ }
  };

  return (
    <div className="rounded-xl border border-black/8 bg-black/[0.02] overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3">
        <span className="text-sm font-black text-ink">Saved</span>
        <span className="flex items-center gap-1.5 text-xs font-bold text-ink/40">
          {bookmarks.length > 0 && <span className="rounded-full bg-cobalt/15 px-2 py-0.5 text-cobalt font-black">{bookmarks.length}</span>}
          <span>{open ? "▲" : "▼"}</span>
        </span>
      </button>
      {open && (
        <div className="border-t border-black/8 px-4 py-3">
          {loading ? (
            <p className="text-xs font-bold text-ink/40 py-2">Loading…</p>
          ) : looks.length === 0 ? (
            <p className="text-xs font-bold text-ink/40 py-2">Nothing saved yet.</p>
          ) : (
            <div className="grid gap-2">
              {looks.map(look => {
                const img = look.frontImageUrl ?? look.imageUrl;
                return (
                  <div key={look.id} className="flex items-center gap-3">
                    <a href={lookPath(look.name, look.id)} className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70">
                      {img && (
                        <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-black/5">
                          <Image src={img} alt={look.name} fill className="object-cover" sizes="40px" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-ink">{look.name}</p>
                        {look.storeName && <p className="truncate text-[10px] font-bold text-ink/40">{look.storeName}</p>}
                        {(() => {
                          const label = feedPrice(look);
                          return label ? <p className="text-[10px] font-black text-ink">{label}</p> : null;
                        })()}
                      </div>
                    </a>
                    <button type="button" onClick={() => remove(look.id)}
                      className="shrink-0 text-ink/30 hover:text-coral transition text-lg leading-none">
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── User panel ───────────────────────────────────────────────────────────────
function UserPanel({ onClose, openSaved = false }: { onClose: () => void; openSaved?: boolean }) {
  useScrollLock();
  const [session, setSession] = useState(() => {
    try { return getStoredAuthSession(); } catch { return null; }
  });
  const [tab, setTab] = useState<"signin" | "register" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [credits, setCredits] = useState<number | null>(null);
  const [isSeller, setIsSeller] = useState(false);
  // Curator session (separate from the auth login) → entry to their studio.
  const [curator, setCurator] = useState<{ id?: string; firstName?: string } | null>(null);
  useEffect(() => {
    try { const c = JSON.parse(localStorage.getItem("lb_curator") ?? "null"); setCurator(c?.id ? c : null); } catch { setCurator(null); }
  }, []);

  // Load credits + check seller status when signed in
  useEffect(() => {
    if (!session) { setIsSeller(false); return; }
    fetch("/api/gallery", {
      headers: { "x-shopcut-account-id": `user-${session.user.id}` }
    })
      .then(r => r.json())
      .then((p: any) => { if (typeof p.credits === "number") setCredits(p.credits); })
      .catch(() => {});
    // Check if this user is a seller
    fetch("/api/seller/me", {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
      .then(r => { if (r.ok) setIsSeller(true); })
      .catch(() => {});
  }, [session]);

  const handle = async (action: "signin" | "register" | "forgot") => {
    setError(""); setMessage(""); setLoading(true);
    try {
      if (action === "signin") {
        const s = await signInWithPassword(email.trim(), password);
        setSession(s);
        window.location.href = "/user/dashboard"; // land on the dashboard, not the feed
        return;
      } else if (action === "register") {
        await signUpWithPassword(email.trim(), password);
        setMessage("Account created! Check your email to confirm, then sign in.");
        setTab("signin");
      } else {
        await resetPassword(email.trim());
        setMessage("If this email exists, you'll get a reset link shortly.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => { signOut(); setSession(null); setCredits(null); };

  // Curator sign-in (email only, no password — our only login).
  const handleCuratorSignin = async () => {
    const em = email.trim();
    if (!em) return;
    setError(""); setMessage(""); setLoading(true);
    try {
      const res = await fetch("/api/curator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signin", email: em }),
      });
      const data = await res.json();
      if (!res.ok || !data.curator) {
        setError("No model found with that email. Become a model first.");
        return;
      }
      localStorage.setItem("lb_curator", JSON.stringify({ id: data.curator.id, firstName: data.curator.firstName, email: data.curator.email, style: data.curator.style }));
      setCurator(data.curator);
      try { window.dispatchEvent(new Event("luxurybandit-auth-updated")); } catch { /**/ }
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-t-2xl bg-white px-5 pt-5 pb-24 shadow-2xl overflow-y-auto overscroll-contain" style={{ maxHeight: "90dvh" }}>

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-ink">
            {session || curator ? "Your account" : tab === "signin" ? "Sign in" : tab === "register" ? "Create account" : "Reset password"}
          </h2>
          <button type="button" onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-black/10 text-ink/40">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Model entry — her OWN page (wardrobe + photos). The old Studio tool is
            retired for models; the team turns her photos into videos. */}
        {curator && (
          <a href={curator.id ? `/curator/${curator.id}` : "/stores"}
            className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-black px-4 py-3.5 text-white active:scale-[0.99] transition-transform">
            <span className="min-w-0">
              <span className="block text-sm font-black">Open your page{curator.firstName ? `, ${curator.firstName}` : ""}</span>
              <span className="block text-[11px] font-bold text-white/55">Pick outfits · create your photos</span>
            </span>
            <span className="shrink-0 text-lg font-black">→</span>
          </a>
        )}

        {session ? (
          /* ── Signed-in view ── */
          <div className="grid gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-black/8 bg-black/[0.02] p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white text-sm font-black">
                {session.user.email?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-ink">{session.user.email}</p>
                {isAdminEmail(session.user.email) ? (
                  <span className="mt-0.5 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-violet-700">Admin</span>
                ) : (
                  <p className="text-[11px] font-bold text-ink/40">Buyer account</p>
                )}
              </div>
            </div>

            {/* Credits + buy */}
            <div className="grid gap-2 rounded-xl border border-black/8 bg-black/[0.02] px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cobalt" />
                  <span className="text-sm font-black text-ink">Try-on credits</span>
                </div>
                <span className="text-sm font-black text-ink">
                  {credits === null ? "—" : credits}
                </span>
              </div>
              <a
                href={`https://buy.stripe.com/test_6oUcMX9ktesv3SE4xZ8Vi00?client_reference_id=${encodeURIComponent(`user-${session.user.id}`)}&prefilled_email=${encodeURIComponent(session.user.email ?? "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-cobalt text-xs font-black text-white"
              >
                <Sparkles className="h-3.5 w-3.5" /> Buy 10 credits
              </a>
            </div>

            {/* Saved looks */}
            <SavedLooksList defaultOpen={openSaved} />

            {/* Links */}
            {isAdminEmail(session.user.email) && (
              <a href="/admin/looks"
                className="flex h-11 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-sm font-black text-violet-700">
                Admin panel →
              </a>
            )}
            {isSeller && (
              <a href="/seller/dashboard"
                className="flex h-11 items-center justify-center rounded-xl border border-black/10 bg-white text-sm font-black text-ink">
                Seller dashboard →
              </a>
            )}

            <button type="button" onClick={handleSignOut}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white text-sm font-black text-ink/50 hover:text-coral transition">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        ) : curator ? (
          /* ── Curator signed-in view — curators have no password, so never show the
                buyer email/password form to them. ── */
          <div className="grid gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-black/8 bg-black/[0.02] p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white text-sm font-black">
                {(curator.firstName ?? "C").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-ink">{curator.firstName || "Model"}</p>
                <p className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Signed in as model
                </p>
              </div>
            </div>
            <a href="/curators/profile"
              className="flex h-11 items-center justify-center rounded-xl border border-black/10 bg-white text-sm font-black text-ink">
              My profile →
            </a>
            <button type="button"
              onClick={() => { try { localStorage.removeItem("lb_curator"); } catch { /**/ } setCurator(null); onClose(); }}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white text-sm font-black text-ink/50 hover:text-coral transition">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        ) : (
          /* ── Sign in: Google / Facebook / email+password (+ curator email) ── */
          <div className="grid gap-3">
            {/* Social — fastest */}
            <button type="button" onClick={() => signInWithOAuth("google", `${window.location.origin}/auth/confirm`)}
              className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-black/12 bg-white text-sm font-black text-ink active:scale-95 transition-transform">
              <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Continue with Google
            </button>
            <button type="button" onClick={() => signInWithOAuth("facebook", `${window.location.origin}/auth/confirm`)}
              className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-black/12 bg-white text-sm font-black text-ink active:scale-95 transition-transform">
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#1877F2" d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08V12h3.05V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.95h-1.51c-1.49 0-1.96.93-1.96 1.88V12h3.33l-.53 3.47h-2.8v8.38C19.61 22.95 24 17.99 24 12z"/></svg>
              Continue with Facebook
            </button>

            <div className="my-1 flex items-center gap-3">
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-[11px] font-black uppercase tracking-wider text-ink/30">or</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>

            {error && <p className="rounded-xl border border-coral/25 bg-coral/10 px-4 py-3 text-xs font-black text-coral">{error}</p>}
            {message && <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-black text-green-700">{message}</p>}

            <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)}
              className="h-12 rounded-xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold outline-none focus:border-cobalt" />
            {tab !== "forgot" && (
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") void handle(tab); }}
                className="h-12 rounded-xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold outline-none focus:border-cobalt" />
            )}

            <button type="button" disabled={loading || !email.trim()} onClick={() => void handle(tab)}
              className="flex h-12 items-center justify-center rounded-xl bg-ink text-sm font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tab === "register" ? "Create account" : tab === "forgot" ? "Send reset link" : "Sign in"}
            </button>

            <div className="flex items-center justify-between text-[11px] font-bold text-ink/45">
              <button type="button" onClick={() => { setError(""); setMessage(""); setTab(tab === "register" ? "signin" : "register"); }}>
                {tab === "register" ? "Have an account? Sign in" : "New here? Create account"}
              </button>
              {tab !== "forgot" ? (
                <button type="button" onClick={() => { setError(""); setMessage(""); setTab("forgot"); }}>Forgot password?</button>
              ) : (
                <button type="button" onClick={() => { setError(""); setMessage(""); setTab("signin"); }}>Back to sign in</button>
              )}
            </div>

            <div className="my-1 flex items-center gap-3">
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-[11px] font-black uppercase tracking-wider text-ink/30">curator?</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>
            <button type="button" disabled={loading || !email.trim()} onClick={() => void handleCuratorSignin()}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-black/15 bg-white text-sm font-black text-ink active:scale-95 transition-transform disabled:opacity-40">
              Sign in as model (email above)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
function StoresPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [looks, setLooks] = useState<Look[]>([]);
  const [stores, setStores] = useState<{ name: string; slug: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "community">("all");
  const [communityItems, setCommunityItems] = useState<CommunityItem[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communitySelectedIndex, setCommunitySelectedIndex] = useState<number | null>(null);
  // Items the full-screen scroll feed (reels) iterates over — set when opening it
  // from a grid (so the same overlay works for both the history grid and community).
  const [reelItems, setReelItems] = useState<CommunityItem[] | null>(null);
  // Tapping a grid tile opens the SAME HomeFeed reel (identical layout), positioned at
  // that try-on (or look, for tryon-less tiles). See the overlay render below.
  const [feedOpen, setFeedOpen] = useState<{ tryOnId?: string; lookId?: string } | null>(null);
  // The reel is an in-page OVERLAY, so the browser back button knows nothing about
  // it — pressing back used to leave /stores entirely (landing on the default reels
  // instead of the grid you came from). Push a history entry when the overlay opens;
  // popstate (= back) then only closes the overlay and the grid is still there.
  const openFeedOverlay = (v: { tryOnId?: string; lookId?: string }) => {
    setFeedOpen(v);
    try { window.history.pushState({ lbReel: 1 }, ""); } catch { /**/ }
  };
  const closeFeedOverlay = () => {
    // X button: consume our history entry so back/forward stays consistent —
    // the popstate handler does the actual close.
    try {
      if (window.history.state?.lbReel) { window.history.back(); return; }
    } catch { /**/ }
    setFeedOpen(null);
  };
  useEffect(() => {
    const onPop = () => setFeedOpen(cur => (cur ? null : cur));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  // Home has two views: the Feeds thumbnail grid, and the Models gallery (a grid of the
  // model profiles). Toggled at the top of the home.
  type GalleryModel = { id: string; name: string; photoUrl: string; style: string; lookCount: number; bio?: string; motto?: string; hidden?: boolean; hairColor?: string; createdAt?: string; pinned?: boolean };
  const [models, setModels] = useState<GalleryModel[]>([]);
  // Models tab: sort (newest first by default, so a freshly added model is on top)
  // + optional hair-color filter (models are AI-tagged blond/brunette/black/red).
  const [modelSort, setModelSort] = useState<"new" | "looks">("new");
  const [hairFilter, setHairFilter] = useState("");
  const HAIR_LABELS: Record<string, string> = { blond: "Blonde", brunette: "Brunette", black: "Black", red: "Red", other: "Other" };
  const shownModels = useMemo(() => {
    let base = hairFilter ? models.filter(m => (m.hairColor || "") === hairFilter) : models;
    // The header search filters THIS grid too (name / style / hair color).
    const q = query.trim().toLowerCase();
    if (q) base = base.filter(m => `${m.name} ${m.style || ""} ${m.hairColor || ""}`.toLowerCase().includes(q));
    const cmp = modelSort === "new"
      ? (a: GalleryModel, b: GalleryModel) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
      : (a: GalleryModel, b: GalleryModel) => b.lookCount - a.lookCount || a.name.localeCompare(b.name);
    // Admin-pinned models ALWAYS lead the gallery, then the chosen sort.
    return [...base].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || cmp(a, b));
  }, [models, modelSort, hairFilter, query]);
  const hairColorsPresent = useMemo(() => [...new Set(models.map(m => m.hairColor || "").filter(Boolean))], [models]);
  // Fashionshow ("feeds") is the default grid tab — it's the app's home view.
  const [homeTab, setHomeTab] = useState<"feeds" | "models" | "garderobe">("feeds");
  // Garderobe = every generated garment (all models' wardrobes), browsable by type.
  const [garmentType, setGarmentType] = useState<LookCategory | null>(null);
  // Admin: add a real Luxury Bandi garment (from a photo) into the Garderobe.
  const [addOpen, setAddOpen] = useState(false);
  const [agImage, setAgImage] = useState("");
  const [agName, setAgName] = useState("");
  const [agUrl, setAgUrl] = useState("");
  const [agCategory, setAgCategory] = useState<LookCategory | "">("");
  const [agExtract, setAgExtract] = useState(true);
  const [agBusy, setAgBusy] = useState(false);
  const [agMsg, setAgMsg] = useState("");
  const agFileRef = useRef<HTMLInputElement>(null);
  const onAgFile = async (f: File) => {
    try { setAgImage(await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); })); } catch { /**/ }
  };
  const submitAddGarment = async () => {
    if (agBusy || (!agImage && !agUrl.trim())) return;
    setAgBusy(true); setAgMsg(agUrl.trim() && !agImage ? "Bild aus URL holen & Details generieren …" : agExtract ? "Name, Beschreibung, Freistellen … (~30s)" : "Name & Beschreibung generieren …");
    try {
      const res = await fetch("/api/add-garment", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}) },
        body: JSON.stringify({ image: agImage || undefined, url: agUrl.trim() || undefined, name: agName.trim(), category: agCategory || undefined, extract: agExtract }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Fehler");
      const all = await fetch("/api/try-this-look").then(r => r.json()).then(x => (x.looks ?? []) as Look[]);
      setLooks(all);
      setAgImage(""); setAgName(""); setAgUrl(""); setAgMsg(""); setAddOpen(false);
    } catch (e) { setAgMsg(e instanceof Error ? e.message : "Fehler"); }
    finally { setAgBusy(false); }
  };

  // Admin: manage a single Garderobe garment (edit text / move category / replace / hide / delete).
  const [gManageId, setGManageId] = useState("");
  const [gmName, setGmName] = useState("");
  const [gmDesc, setGmDesc] = useState("");
  const [gmCat, setGmCat] = useState<"" | LookCategory>("");
  const [gmBuy, setGmBuy] = useState(""); // shop link ("Shop now" on the tile)
  const [gmBusy, setGmBusy] = useState(false);
  const [gmMsg, setGmMsg] = useState("");
  const gmReplaceRef = useRef<HTMLInputElement>(null);
  const reloadLooksAdmin = async () => {
    const pin = adminPin || (() => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } })();
    const payload = await fetch("/api/try-this-look", pin ? { headers: { "x-try-look-admin-pin": pin } } : undefined).then(r => r.json());
    setLooks((payload.looks ?? []) as Look[]);
  };
  // Admin write with BOTH the PIN and the Supabase token (admin-email sessions have no PIN).
  const adminWrite = (body: Record<string, unknown>) => {
    const token = getStoredAuthSession()?.access_token;
    return fetch("/api/try-this-look", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  };
  const openGManage = (g: { id: string; name?: string; productNote?: string; category?: LookCategory; buyUrl?: string }) => {
    setGManageId(g.id); setGmName(g.name ?? ""); setGmDesc(String(g.productNote ?? "")); setGmCat(isLookCategory(g.category) ? g.category : ""); setGmBuy(g.buyUrl ?? ""); setGmMsg(""); setGmBusy(false);
  };
  const closeGManage = () => { setGManageId(""); setGmBusy(false); setGmMsg(""); };
  const patchGarment = async (extra: Record<string, unknown>, successMsg = "Gespeichert ✓") => {
    if (!gManageId || gmBusy) return;
    setGmBusy(true); setGmMsg("");
    try {
      const res = await adminWrite({ action: "update-look", id: gManageId, ...extra });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Fehler");
      await reloadLooksAdmin();
      setGmMsg(successMsg);
    } catch (e) { setGmMsg(e instanceof Error ? e.message : "Fehler"); }
    finally { setGmBusy(false); }
  };
  // Save — empty title/description get filled by AI from the garment photo first.
  const saveGManage = async () => {
    let name = gmName.trim(), desc = gmDesc.trim();
    const gm = garments.find(g => g.id === gManageId);
    if ((!name || !desc) && gm) {
      setGmBusy(true); setGmMsg("KI schreibt Titel & Beschreibung …");
      try {
        const img = gm.frontImageUrl || gm.imageUrl || "";
        const blob = await fetch(img).then(r => r.blob());
        const fd = new FormData();
        fd.append("image", new File([blob], "garment.jpg", { type: blob.type || "image/jpeg" }));
        if (name) fd.append("name", name);
        const ai = await fetch("/api/generate-product-description", { method: "POST", body: fd }).then(r => r.json());
        if (!name && ai.title) { name = String(ai.title); setGmName(name); }
        if (!desc && ai.description) { desc = String(ai.description); setGmDesc(desc); }
      } catch { /* AI is best-effort — save whatever we have */ }
      setGmBusy(false);
    }
    return patchGarment({ name: name || undefined, productNote: desc, buyUrl: gmBuy.trim(), ...(gmCat ? { category: gmCat } : {}) });
  };
  const replaceGImage = async (file: File) => {
    const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
    if (!dataUrl.startsWith("data:image/")) return;
    await patchGarment({ frontImage: dataUrl, garmentFrontImage: dataUrl }, "Bild ersetzt ✓");
  };
  const deleteGManage = async () => {
    if (!gManageId || gmBusy) return;
    if (!confirm("Dieses Kleidungsstück endgültig löschen?")) return;
    const id = gManageId;
    setGmBusy(true); setGmMsg("");
    try {
      const res = await adminWrite({ action: "delete-look", id });
      if (!res.ok) throw new Error("Fehler");
      setGManageId("");
      setLooks(prev => prev.filter(l => l.id !== id));
      setGmBusy(false);
    } catch { setGmMsg("Fehler beim Löschen"); setGmBusy(false); }
  };
  const reloadModels = () => {
    const pin = (() => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } })();
    return fetch("/api/try-this-look?models=1", pin ? { headers: { "x-try-look-admin-pin": pin } } : undefined)
      .then(r => r.json()).then(d => setModels(Array.isArray(d.models) ? d.models : [])).catch(() => {});
  };
  useEffect(() => { void reloadModels(); }, []);
  // Admin: manage a model (edit name/bio, replace photo, hide/show, delete) or add a new one.
  const [mModelId, setMModelId] = useState("");   // "" = closed, "new" = add form, else edit
  const [mmName, setMmName] = useState("");
  const [mmStyle, setMmStyle] = useState("");
  const [mmBio, setMmBio] = useState("");
  const [mmPhoto, setMmPhoto] = useState("");      // new data URL (add / replace)
  const [mmBusy, setMmBusy] = useState(false);
  const [mmMsg, setMmMsg] = useState("");
  const mmPhotoRef = useRef<HTMLInputElement>(null);
  const openModelManage = (m: GalleryModel) => { setMModelId(m.id); setMmName(m.name ?? ""); setMmStyle(m.style ?? ""); setMmBio(m.bio ?? ""); setMmPhoto(""); setMmMsg(""); setMmBusy(false); };
  const openModelAdd = () => { setMModelId("new"); setMmName(""); setMmStyle(""); setMmBio(""); setMmPhoto(""); setMmMsg(""); setMmBusy(false); };
  const closeModelManage = () => { setMModelId(""); setMmBusy(false); setMmMsg(""); };
  const onModelPhoto = async (f: File) => { try { setMmPhoto(await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); })); } catch { /**/ } };
  // Crop the CURRENT photo (baked-in white edges from AI shots) — loads it as a
  // data URL (canvas would taint on the remote URL), opens the 3:4 cropper, and
  // saves the crop as her new photo in one go.
  const [mmCropSrc, setMmCropSrc] = useState("");
  const startModelCrop = async (m: GalleryModel) => {
    if (mmBusy) return;
    const raw = mmPhoto || m.photoUrl || "";
    if (!raw) { setMmMsg("Kein Foto vorhanden."); return; }
    if (raw.startsWith("data:")) { setMmCropSrc(raw); return; }
    setMmBusy(true); setMmMsg("");
    try {
      const blob = await (await fetch(raw)).blob();
      const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(blob); });
      setMmCropSrc(dataUrl);
    } catch { setMmMsg("Foto konnte nicht geladen werden."); }
    finally { setMmBusy(false); }
  };
  const finishModelCrop = async (dataUrl: string) => {
    setMmCropSrc("");
    if (mModelId === "new") { setMmPhoto(dataUrl); return; } // new model: crop is just the preview
    setMmBusy(true); setMmMsg("");
    try {
      const res = await adminWrite({ action: "update-curator", id: mModelId, photoImage: dataUrl });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Fehler");
      await reloadModels();
      closeModelManage();
    } catch (e) { setMmMsg(e instanceof Error ? e.message : "Fehler beim Speichern"); setMmBusy(false); }
  };
  const saveModel = async () => {
    if (mmBusy) return;
    const isNew = mModelId === "new";
    if (isNew && (!mmName.trim() || !mmPhoto)) { setMmMsg("Name und Foto nötig."); return; }
    setMmBusy(true); setMmMsg("");
    try {
      const body: Record<string, unknown> = isNew
        ? { action: "add-curator", name: mmName.trim(), style: mmStyle.trim(), bio: mmBio.trim(), photoImage: mmPhoto }
        : { action: "update-curator", id: mModelId, name: mmName.trim(), style: mmStyle.trim(), bio: mmBio.trim(), ...(mmPhoto ? { photoImage: mmPhoto } : {}) };
      const res = await adminWrite(body);
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Fehler");
      await reloadModels();
      closeModelManage();
    } catch (e) { setMmMsg(e instanceof Error ? e.message : "Fehler"); setMmBusy(false); }
  };
  const toggleModelHidden = async (m: GalleryModel) => {
    if (mmBusy) return;
    setMmBusy(true); setMmMsg("");
    try { const res = await adminWrite({ action: "update-curator", id: m.id, hidden: !m.hidden }); if (!res.ok) throw new Error("Fehler"); await reloadModels(); closeModelManage(); }
    catch { setMmMsg("Fehler"); setMmBusy(false); }
  };
  const deleteModel = async (m: GalleryModel) => {
    if (mmBusy) return;
    if (!confirm(`Model "${m.name}" endgültig löschen?`)) return;
    setMmBusy(true); setMmMsg("");
    try { const res = await adminWrite({ action: "delete-curator", id: m.id }); if (!res.ok) throw new Error("Fehler"); await reloadModels(); closeModelManage(); }
    catch { setMmMsg("Fehler beim Löschen"); setMmBusy(false); }
  };
  const [communityLikes, setCommunityLikes] = useState<Record<string, boolean>>({});
  // "Mine" filter for signed-in creators — show only their own try-ons / trends
  const [myCuratorId, setMyCuratorId] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [myTrendsOnly, setMyTrendsOnly] = useState(false);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [savedModel, setSavedModel] = useState<{ fromLookName: string; fromStoreName: string; imageUrl: string } | null>(null);
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [savedAutoOpen, setSavedAutoOpen] = useState(false);
  const [showMerkliste, setShowMerkliste] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  // Paying member → the Community feed is unlocked (open padlock). Admin is always unlocked.
  // No real subscription system yet: `lb_paid` is a placeholder the real checkout will set.
  const [isPaidMember, setIsPaidMember] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallDone, setPaywallDone] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  // Creators list (admin) for the in-feed "Assign to creator" picker (name + photo).
  const [assignCurators, setAssignCurators] = useState<{ id: string; firstName?: string; lastName?: string; photoUrl?: string }[]>([]);

  // When signed in as admin, mirror this page under /admin/stores so the URL reflects
  // admin mode (matches /admin/tryon, /admin/look). Preserves the query string.
  useEffect(() => {
    if (isAdmin && pathname === "/stores") {
      const q = typeof window !== "undefined" ? window.location.search : "";
      router.replace(`/admin/stores${q}`);
    }
  }, [isAdmin, pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignName, setBulkAssignName] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  // Home = the full-screen scrolling reels feed (DEFAULT landing). ?view=grid =
  // the 3-col grid overview. ?view=alist = The A List (HomeFeed of look posts).
  const view = searchParams.get("view");
  const showAList = false; // The A List was removed — one feed now (legacy ?view=alist → grid)
  const showGrid = view === "grid" || view === "alist";
  // Account/Saved deep links open over the grid, not the immersive reels.
  const showReels = !showAList && !showGrid && !searchParams.get("panel"); // default
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  // Editorial category filter (After Dark / Riviera / Boudoir / Off-Duty). Replaces
  // brand names as the top-level chips. null = "All" (Boudoir hidden from All).
  const [categoryFilter, setCategoryFilter] = useState<LookCategory | null>(null);
  // Fashionshow grid moderation tier — "public" (All) | "community" | "private" (admin).
  const [tierFilter, setTierFilter] = useState<"public" | "community" | "private">("public");
  // Admin bulk moderation: select try-on tiles, then move them to another tier.
  const [tierSelect, setTierSelect] = useState(false);
  const [tierSelected, setTierSelected] = useState<Set<string>>(new Set());
  const [tierBusy, setTierBusy] = useState(false);
  const moveSelectedTo = async (vis: "public" | "community" | "private") => {
    if (tierBusy || !tierSelected.size) return;
    setTierBusy(true);
    try {
      const ids = [...tierSelected];
      const res = await adminWrite({ action: "set-visibility", ids, visibility: vis });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Fehler");
      // Reflect instantly: retag moved items locally (feed + grid + reel all derive
      // from communityItems). Private items vanish for non-admin payloads anyway.
      setCommunityItems(prev => prev.map(c => ids.includes(c.id) ? { ...c, visibility: vis, public: vis === "public" } : c));
      setTierSelected(new Set());
      setTierSelect(false);
    } catch (e) { alert(e instanceof Error ? e.message : "Fehler beim Verschieben"); }
    finally { setTierBusy(false); }
  };
  // Pin/unpin the selected try-on posts — pinned lead the grid AND the reel.
  const pinSelected = async (pinned: boolean) => {
    if (tierBusy || !tierSelected.size) return;
    setTierBusy(true);
    try {
      const ids = [...tierSelected];
      const res = await adminWrite({ action: "set-pinned", kind: "tryon", ids, pinned });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Fehler");
      setCommunityItems(prev => prev.map(c => ids.includes(c.id) ? { ...c, pinned } : c));
      setTierSelected(new Set());
      setTierSelect(false);
    } catch (e) { alert(e instanceof Error ? e.message : "Fehler beim Fixieren"); }
    finally { setTierBusy(false); }
  };
  // Animate/stop the selected posts — chosen tiles PLAY inline in the grid.
  const animateSelected = async (animated: boolean) => {
    if (tierBusy || !tierSelected.size) return;
    setTierBusy(true);
    try {
      const ids = [...tierSelected];
      const res = await adminWrite({ action: "set-animated", ids, animated });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Fehler");
      setCommunityItems(prev => prev.map(c => ids.includes(c.id) ? { ...c, animated } : c));
      setTierSelected(new Set());
      setTierSelect(false);
    } catch (e) { alert(e instanceof Error ? e.message : "Fehler"); }
    finally { setTierBusy(false); }
  };
  // Same for MODELS: select in the gallery → pin to the top.
  const [modelSelect, setModelSelect] = useState(false);
  const [modelSelected, setModelSelected] = useState<Set<string>>(new Set());
  const [modelPinBusy, setModelPinBusy] = useState(false);
  const pinSelectedModels = async (pinned: boolean) => {
    if (modelPinBusy || !modelSelected.size) return;
    setModelPinBusy(true);
    try {
      const ids = [...modelSelected];
      const res = await adminWrite({ action: "set-pinned", kind: "model", ids, pinned });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Fehler");
      setModels(prev => prev.map(m => ids.includes(m.id) ? { ...m, pinned } : m));
      setModelSelected(new Set());
      setModelSelect(false);
    } catch (e) { alert(e instanceof Error ? e.message : "Fehler beim Fixieren"); }
    finally { setModelPinBusy(false); }
  };
  const [feedSelectMode, setFeedSelectMode] = useState(false);
  // Boudoir is gated: if the viewer is on it and signs out, drop them back to "All"
  // so lingerie never shows without a session. (Effect added after auth state below.)
  const [selectedLookIds, setSelectedLookIds] = useState<Set<string>>(new Set());
  const [feedBulkWorking, setFeedBulkWorking] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem("lb_following") ?? "[]") as string[];
      setFollowed(new Set(list));
    } catch { /**/ }

    // Check auth state + admin. Re-runnable so logging in WITHOUT a reload still
    // grants admin moderation (e.g. the in-feed Hide button) — the panel login
    // fires "luxurybandit-auth-updated" but used to only refresh isSignedIn.
    const applyAuthState = () => {
      try {
        const session = getStoredAuthSession();
        setIsSignedIn(!!session);
        const email = session?.user?.email?.toLowerCase();
        // Admin = the Studio PIN is stored (entered in the studio) OR an admin-email
        // Supabase session. The PIN alone is enough for in-feed moderation; the server
        // re-validates it on the actual action.
        const pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
        const admin = !!pin || (!!email && (isAdminEmail(email) || email === "support@luxurybandit.com"));
        setIsAdmin(admin);
        // Admin is always unlocked; otherwise a paying member (placeholder flag for now).
        let paid = false;
        try { paid = localStorage.getItem("lb_paid") === "1"; } catch { /**/ }
        setIsPaidMember(admin || paid);
        if (admin) setAdminPin(pin);
        // Keep the curator identity in sync too — otherwise a stale id keeps "recognising"
        // a curator (Hide button etc.) after they signed out, while the nav shows signed-out.
        try { setMyCuratorId(JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id ?? ""); } catch { setMyCuratorId(""); }
      } catch { /**/ }
    };
    applyAuthState();
    try { setCommunityLikes(JSON.parse(localStorage.getItem("lb_gen_likes") ?? "{}")); } catch { /**/ }

    // Load saved model photo
    try {
      const raw = localStorage.getItem("lb_model_meta");
      const img = sessionStorage.getItem("lb_model_image");
      if (raw && img) {
        const meta = JSON.parse(raw);
        setSavedModel({ fromLookName: meta.fromLookName ?? "", fromStoreName: meta.fromStoreName ?? "", imageUrl: img });
      }
    } catch { /**/ }

    const onAuth = () => applyAuthState();
    window.addEventListener("luxurybandit-auth-updated", onAuth);
    window.addEventListener("storage", onAuth);   // cross-tab sign-in/out
    window.addEventListener("focus", onAuth);      // returning from the Studio/login
    return () => {
      window.removeEventListener("luxurybandit-auth-updated", onAuth);
      window.removeEventListener("storage", onAuth);
      window.removeEventListener("focus", onAuth);
    };
  }, []);

  // Community (Boudoir slug) gate: it's for PAYING members only. If the filter is on it
  // and the viewer isn't a paying member (admin always counts), snap back to "All".
  useEffect(() => {
    if (categoryFilter === "boudoir" && !isPaidMember) setCategoryFilter(null);
    if (tierFilter !== "public" && !isPaidMember) setTierFilter("public");
  }, [categoryFilter, tierFilter, isPaidMember]);

  // React to bottom-nav deep links whenever search params change
  useEffect(() => {
    const panel = searchParams.get("panel");
    const tab = searchParams.get("tab");
    if (panel === "account") { setShowUserPanel(true); setSavedAutoOpen(false); setShowMerkliste(false); }
    if (panel === "saved") { setShowMerkliste(true); setShowUserPanel(false); }
    // Community try-on feed retired — always show the Trends feed.
    void tab;
  }, [searchParams]);

  // Closing a deep-linked panel MUST also drop ?panel=… from the URL, otherwise
  // showReels stays false (panel param present) and we render a blank white page.
  const stripPanelParam = () => {
    const sp = new URLSearchParams(Array.from(searchParams.entries()));
    if (sp.has("panel")) {
      sp.delete("panel");
      const qs = sp.toString();
      router.replace(qs ? `/stores?${qs}` : "/stores");
    }
  };

  const toggleFollow = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFollowed((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      try { localStorage.setItem("lb_following", JSON.stringify([...next])); } catch { /**/ }
      return next;
    });
  };

  // Admin moderation helpers
  const adminAction = async (body: Record<string, unknown>) => {
    await fetch("/api/try-this-look", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}) },
      body: JSON.stringify(body),
    });
  };

  // Admin: fetch provenance/history for a post (look or try-on) for the Info sheet.
  const fetchPostInfo = async (item: CommunityItem): Promise<Record<string, unknown> | null> => {
    try {
      const token = getStoredAuthSession()?.access_token;
      const res = await fetch(`/api/try-this-look?postInfo=${encodeURIComponent(item.id)}`, {
        headers: { ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) return null;
      const d = await res.json();
      return (d?.info as Record<string, unknown>) ?? null;
    } catch { return null; }
  };

  const hideCommunityItem = async (item: CommunityItem) => {
    await adminAction({ action: "hide-generation", id: item.id });
    setCommunityItems(prev => prev.filter(i => i.id !== item.id));
    setCommunitySelectedIndex(null);
  };

  const deleteCommunityItem = async (item: CommunityItem) => {
    if (item.kind === "look") {
      if (!confirm("Permanently delete this look?")) return;
      await adminAction({ action: "delete-look", id: item.lookId || item.id });
      setLooks(prev => prev.filter(l => l.id !== (item.lookId || item.id)));
    } else {
      if (!confirm("Permanently delete this post?")) return;
      await adminAction({ action: "delete-generation", id: item.id });
      setCommunityItems(prev => prev.filter(i => i.id !== item.id));
    }
    setCommunitySelectedIndex(null);
    setReelItems(null);
  };

  // Assign an item to a creator. Look → set its curator; try-on → set the poster name.
  const assignCommunityItem = async (item: CommunityItem, curatorId: string, curatorName: string) => {
    if (item.kind === "look") {
      await adminAction({ action: "set-look-curator", lookId: item.lookId || item.id, curatorId });
      setLooks(prev => prev.map(l => l.id === (item.lookId || item.id) ? { ...l, curatorId } as typeof l : l));
    } else {
      await adminAction({ action: "assign-generation", id: item.id, customerName: curatorName });
      setCommunityItems(prev => prev.map(i => i.id === item.id ? { ...i, customerName: curatorName } : i));
    }
  };

  // Hide an item straight from the feed (owner of the content, or admin).
  // Look → take it offline (unpublish). Try-on → remove it from the feed (feed:false).
  const hideReelItem = async (item: CommunityItem) => {
    if (item.kind === "look") {
      if (!confirm("Take this look offline (hide it from the feeds)?")) return;
      const token = getStoredAuthSession()?.access_token;
      if (isAdmin) {
        // Admin (PIN or admin-email session) → admin update-look. Send both the PIN
        // and the Supabase Bearer token so it works without a stored Studio PIN.
        await fetch("/api/try-this-look", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ action: "update-look", id: item.lookId, published: false }),
        }).catch(() => {});
      } else {
        // Owner curator → toggle their own look off.
        await fetch("/api/curator", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(myCuratorId ? { "x-curator-id": myCuratorId } : {}) },
          body: JSON.stringify({ action: "toggle-look", lookId: item.lookId, published: false }),
        }).catch(() => {});
      }
      setLooks(prev => prev.filter(l => l.id !== item.lookId));
    } else {
      if (!confirm("Hide this try-on from the feed?")) return;
      // Send admin creds so an admin hide also DEACTIVATES it (curator can't re-enable).
      const token = getStoredAuthSession()?.access_token;
      await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(myCuratorId ? { "x-curator-id": myCuratorId } : {}) },
        body: JSON.stringify({ action: "set-generation-feed", generationId: item.id, feed: false }),
      }).catch(() => {});
      setCommunityItems(prev => prev.filter(c => c.id !== item.id));
    }
    setCommunitySelectedIndex(null);
    setReelItems(null);
  };

  // Staff: turn an AI-picture look into an AI-video (Pixverse) from the feed.
  const [makingVideoLookId, setMakingVideoLookId] = useState("");
  const makeLookVideo = async (lookId: string) => {
    if (!lookId || makingVideoLookId) return;
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}), ...(myCuratorId ? { "x-curator-id": myCuratorId } : {}) };
    setMakingVideoLookId(lookId);
    try {
      const start = await fetch("/api/generate-look-video", { method: "POST", headers, body: JSON.stringify({ lookId }) });
      const sd = await start.json().catch(() => ({}));
      if (!start.ok || !sd.videoId) { alert(sd.error ?? "Could not start the video."); setMakingVideoLookId(""); return; }
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const pr = await fetch(`/api/generate-look-video?lookId=${encodeURIComponent(lookId)}`, { headers });
        const pd = await pr.json().catch(() => ({}));
        if (pd.status === "done" && pd.videoUrl) { setLooks(ls => ls.map(l => l.id === lookId ? { ...l, videoUrl: pd.videoUrl } : l)); break; }
        if (pd.status === "failed") { alert(pd.error ?? "Video generation failed."); break; }
      }
    } catch { /**/ }
    setMakingVideoLookId("");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); setBulkAssignOpen(false); setBulkAssignName(""); };

  // Feed (looks) bulk actions
  const exitFeedSelectMode = () => { setFeedSelectMode(false); setSelectedLookIds(new Set()); };

  const bulkHideLooks = async () => {
    if (!selectedLookIds.size) return;
    setFeedBulkWorking(true);
    await Promise.all([...selectedLookIds].map(id => adminAction({ action: "update-look", id, published: false })));
    setLooks(prev => prev.filter(l => !selectedLookIds.has(l.id)));
    exitFeedSelectMode();
    setFeedBulkWorking(false);
  };

  const bulkDeleteLooks = async () => {
    if (!selectedLookIds.size) return;
    if (!confirm(`Permanently delete ${selectedLookIds.size} looks?`)) return;
    setFeedBulkWorking(true);
    await Promise.all([...selectedLookIds].map(id => adminAction({ action: "delete-look", id })));
    setLooks(prev => prev.filter(l => !selectedLookIds.has(l.id)));
    exitFeedSelectMode();
    setFeedBulkWorking(false);
  };

  const bulkHide = async () => {
    if (!selectedIds.size) return;
    setBulkWorking(true);
    await adminAction({ action: "bulk-hide-generations", ids: [...selectedIds] });
    setCommunityItems(prev => prev.filter(i => !selectedIds.has(i.id)));
    exitSelectMode();
    setBulkWorking(false);
  };

  const bulkDelete = async () => {
    if (!selectedIds.size) return;
    if (!confirm(`Permanently delete ${selectedIds.size} posts?`)) return;
    setBulkWorking(true);
    await adminAction({ action: "bulk-delete-generations", ids: [...selectedIds] });
    setCommunityItems(prev => prev.filter(i => !selectedIds.has(i.id)));
    exitSelectMode();
    setBulkWorking(false);
  };

  const bulkAssign = async () => {
    if (!selectedIds.size || !bulkAssignName.trim()) return;
    setBulkWorking(true);
    await Promise.all([...selectedIds].map(id =>
      adminAction({ action: "assign-generation", id, customerName: bulkAssignName.trim() })
    ));
    const name = bulkAssignName.trim();
    setCommunityItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, customerName: name } : i));
    exitSelectMode();
    setBulkWorking(false);
  };

  // Admin: load the creators list for the in-feed "Assign to creator" picker.
  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/try-this-look?curators=1", { headers: { ...(adminPin ? { "x-try-look-admin-pin": adminPin } : {}) } })
      .then(r => r.ok ? r.json() : { curators: [] })
      .then((d: { curators?: typeof assignCurators }) => setAssignCurators((d.curators ?? []).slice().sort((a, b) => (a.firstName ?? "").localeCompare(b.firstName ?? ""))))
      .catch(() => {});
  }, [isAdmin, adminPin]);

  // Load community try-ons — needed for the reels landing AND the grid. Load on mount,
  // then REFRESH when the tab regains focus/visibility so a try-on the user just
  // generated (in the funnel / another tab) shows up at the top without a hard reload.
  useEffect(() => {
    let alive = true;
    const load = (showSpinner: boolean) => {
      if (showSpinner) setCommunityLoading(true);
      // Send identity so the feed can flag the user's OWN posts (for owner-only actions).
      const h: Record<string, string> = {};
      try { const s = getStoredAuthSession(); if (s?.access_token) h.Authorization = `Bearer ${s.access_token}`; } catch { /**/ }
      try { const id = JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id; if (id) h["x-curator-id"] = String(id); } catch { /**/ }
      // Send the studio PIN too, so an admin is a "gated" viewer and receives the
      // login-gated Boudoir try-ons (they only ever render under the Boudoir chip).
      try { const pin = localStorage.getItem("luxurybandit-try-look-admin-pin"); if (pin) h["x-try-look-admin-pin"] = pin; } catch { /**/ }
      fetch("/api/try-this-look?community=1", { headers: h })
        .then(r => r.json())
        .then((p: { community?: CommunityItem[] }) => { if (alive && p.community) setCommunityItems(p.community); })
        .catch(() => {})
        .finally(() => { if (showSpinner) setCommunityLoading(false); });
    };
    load(communityItems.length === 0); // spinner only on the very first load
    const onFocus = () => load(false);
    const onVisible = () => { if (document.visibilityState === "visible") load(false); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive = false; window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onVisible); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Send the admin pin (if any) so admins receive hidden (published:false) looks too.
    const pin = (() => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } })();
    fetch("/api/try-this-look", pin ? { headers: { "x-try-look-admin-pin": pin } } : undefined)
      .then((r) => r.json())
      .then((payload: Payload) => {
        setLooks(payload.looks ?? []);
        setStores(payload.stores ?? []);
      })
      .catch(() => setError("Could not load listings."))
      .finally(() => setIsLoading(false));
  }, []);

  // Read the signed-in creator's id (if any) for the "Mine" filter
  useEffect(() => {
    try { setMyCuratorId(JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id ?? ""); }
    catch { setMyCuratorId(""); }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = looks;
    if (myTrendsOnly && myCuratorId) items = items.filter((l) => (l as any).curatorId === myCuratorId);
    if (!q) return items;
    return items.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      (l.storeName ?? "").toLowerCase().includes(q) ||
      (l.storeSlug ?? "").toLowerCase().includes(q) ||
      (l.price ?? "").toLowerCase().includes(q) ||
      (l.discountLabel ?? "").toLowerCase().includes(q) ||
      ((l as any).hashtags ?? "").toLowerCase().includes(q) ||
      ((l as any).productNote ?? "").toLowerCase().includes(q)
    );
  }, [looks, query, myTrendsOnly, myCuratorId]);

  const myLookCount = useMemo(
    () => (myCuratorId ? looks.filter((l) => (l as any).curatorId === myCuratorId).length : 0),
    [looks, myCuratorId]
  );

  const filteredCommunity = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Intimate (Boudoir/lingerie) try-ons only ever appear under the gated Boudoir chip —
    // never in the open Community tab or search.
    let items = communityItems.filter((c) => !c.lingerie && !(c.category && isHiddenFromAll(c.category)));
    if (mineOnly && myCuratorId) items = items.filter((c) => c.curatorId === myCuratorId);
    if (!q) return items;
    return items.filter((c) =>
      (c.customerName ?? "").toLowerCase().includes(q) ||
      c.lookName.toLowerCase().includes(q) ||
      c.storeName.toLowerCase().includes(q)
    );
  }, [communityItems, query, mineOnly, myCuratorId]);

  // How many of the loaded try-ons belong to the signed-in creator
  const myTryOnCount = useMemo(
    () => (myCuratorId ? communityItems.filter((c) => c.curatorId === myCuratorId).length : 0),
    [communityItems, myCuratorId]
  );

  // The grid is the EXACT MIRROR of the public feed: one tile per try-on POST (the try-on
  // videos the feed shows), PLUS a look-video tile for looks that have a video but no
  // try-on yet. Nothing else — no separately-filtered "curated" list.
  const historyItems = useMemo(() => {
    type HItem = { key: string; kind: "look" | "tryon"; id: string; lookId: string; thumb: string; videoUrl?: string; videoPoster?: string; hasBefore?: boolean; aiCreated?: boolean; brand?: string; category?: LookCategory; createdAt: string; name: string; price?: string | null; curatorName?: string; curatorPhoto?: string; visibility: "public" | "community" | "private"; pinned?: boolean; animated?: boolean };
    const lookById = new Map(looks.map(l => [l.id, l]));
    const items: HItem[] = [];
    const looksWithTryOn = new Set<string>();
    // One tile per shared try-on — exactly what you scroll through in the feed.
    for (const c of communityItems) {
      const srcLook = lookById.get(c.lookId);
      looksWithTryOn.add(c.lookId);
      items.push({ key: `tryon-${c.id}`, kind: "tryon", id: c.id, lookId: c.lookId, thumb: c.imageUrl, videoUrl: c.videoUrl, videoPoster: c.imageUrl, hasBefore: !!c.userPhotoUrl, brand: c.brand, category: c.category ?? srcLook?.category, createdAt: c.createdAt ?? "", name: c.customerName || (srcLook ? publicLookLabel(srcLook) : "Luxury look"), price: srcLook ? feedPrice(srcLook) : null, curatorName: c.customerName, visibility: c.visibility ?? (c.public ? "public" : "community"), pinned: c.pinned, animated: c.animated });
    }
    // A look-VIDEO tile for looks that have a video but no try-on (so those feed posts are
    // mirrored too). Looks without a video and without a try-on don't appear in the feed.
    for (const l of looks) {
      if (looksWithTryOn.has(l.id) || !l.videoUrl) continue;
      // Same rule as the reel: a generated wardrobe garment is NOT feed content —
      // it only earns a post via its try-ons (grid and reel must run identically).
      if ((l as { productType?: string }).productType === "ai" || (l as { wardrobe?: boolean }).wardrobe === true) continue;
      const videoTs = l.videoCreatedAt || tsFromVideoUrl(l.videoUrl) || "";
      const when = videoTs > (l.createdAt ?? "") ? videoTs : (l.createdAt ?? "");
      items.push({ key: `look-${l.id}`, kind: "look", id: l.id, lookId: l.id, thumb: safeLookImage(l), videoUrl: l.videoUrl, videoPoster: l.videoPosterUrl || l.tryOnImageUrl || undefined, aiCreated: l.aiCreated, brand: l.brand, category: l.category, createdAt: when, name: publicLookLabel(l), price: feedPrice(l), curatorName: l.curatorName, curatorPhoto: l.curatorPhotoUrl, visibility: "public" });
    }
    return items.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [looks, communityItems]);

  // Distinct curators with content (looks or try-ons) — for the header count.
  const curatorCount = useMemo(() => {
    const set = new Set<string>();
    for (const l of looks) if (l.curatorName) set.add(l.curatorName.toLowerCase());
    for (const c of communityItems) if (c.customerName) set.add(c.customerName.toLowerCase());
    return set.size;
  }, [looks, communityItems]);

  // The grid mirrors the public feed = one tile per look-post. Same list.
  const feedItems = historyItems;
  // Category chips — only the editorial worlds that actually have looks. Community
  // (boudoir slug) is the gated world; it shows as a chip when boudoir looks exist.
  // Only two chips remain: "All" (rendered separately) + "Community" (the gated boudoir
  // filter). After Dark / Off-Duty / Riviera were dropped (user request 2026-07-04).
  const categoryChips = useMemo(() => LOOK_CATEGORIES.filter(c => c.slug === "boudoir"), []);
  const visibleHistory = useMemo(() => {
    // Moderation tiers (user request 2026-07-06): "All" = the PUBLIC feed (visibility
    // public only); "Community" = the member pool the admin reviews (new user videos
    // land here) and promotes from; "Private" = admin-only view of unshared try-ons.
    let items: typeof feedItems = feedItems.filter(it => it.visibility === tierFilter);
    const q = query.trim().toLowerCase();
    if (q) items = items.filter(it => `${it.name} ${it.curatorName ?? ""}`.toLowerCase().includes(q));
    return items;
  }, [feedItems, tierFilter, query]);
  // Grid pagination — render a first fast batch, then load more as you scroll (the grid
  // was mounting 40+ <video> tiles at once, which stalled the initial paint).
  const HISTORY_PAGE = 12;
  const [historyCount, setHistoryCount] = useState(HISTORY_PAGE);
  useEffect(() => { setHistoryCount(HISTORY_PAGE); }, [categoryFilter, tierFilter, query, typeFilter]);
  const pagedHistory = useMemo(() => visibleHistory.slice(0, historyCount), [visibleHistory, historyCount]);
  // The thumbnail grid is built from `communityItems` (?community=1 — the FULL shared set),
  // but the reel is built from `looks[].communityTryOns`, which the feed-gating trims (some
  // Community-tier try-ons are missing there). Tapping a thumb that's missing lands on the
  // wrong post. Fix: rebuild each look's try-ons from the SAME `communityItems` the thumbs
  // use, so every thumb has a matching reel post.
  const looksForFeed = useMemo(() => {
    const byLook = new Map<string, NonNullable<FeedLook["communityTryOns"]>>();
    for (const c of communityItems) {
      if (!c.lookId) continue;
      const list = byLook.get(c.lookId) ?? [];
      // Keep the MODEL attribution (curatorId + photo) — dropping it here made every
      // post link to the LOOK's owner instead of the try-on's model.
      list.push({ id: c.id, imageUrl: c.imageUrl, videoUrl: c.videoUrl, userPhotoUrl: c.userPhotoUrl, name: c.customerName, hidden: false, pending: false, curatorId: c.curatorId, curatorPhotoUrl: c.curatorPhotoUrl, pinned: c.pinned, createdAt: (c as { createdAt?: string }).createdAt });
      byLook.set(c.lookId, list);
    }
    const enriched = (looks as unknown as FeedLook[]).map(l => {
      const withTs = { ...l, videoCreatedAt: (l as unknown as { videoCreatedAt?: string }).videoCreatedAt || tsFromVideoUrl((l as unknown as { videoUrl?: string }).videoUrl) || undefined } as FeedLook;
      return byLook.has(l.id) ? { ...withTs, communityTryOns: byLook.get(l.id) } : withTs;
    });
    // Try-ons WITHOUT a look (e.g. uploaded "In motion" model clips, lookId "") can
    // never ride an existing look into the reel — synthesize a stub post per clip so
    // "public" really means "in the feed" for them too.
    const lookIds = new Set(looks.map(l => l.id));
    const orphans = communityItems
      .filter(c => !c.lookId || !lookIds.has(c.lookId))
      .map(c => ({
        id: `clip-${c.id}`,
        name: c.lookName || "In motion",
        createdAt: (c as { createdAt?: string }).createdAt ?? "",
        imageUrl: c.imageUrl,
        curatorId: c.curatorId,
        curatorName: c.customerName,
        curatorPhotoUrl: c.curatorPhotoUrl,
        category: c.category,
        communityTryOns: [{ id: c.id, imageUrl: c.imageUrl, videoUrl: c.videoUrl, userPhotoUrl: c.userPhotoUrl, name: c.customerName, hidden: false, pending: false, curatorId: c.curatorId, curatorPhotoUrl: c.curatorPhotoUrl, pinned: c.pinned, createdAt: (c as { createdAt?: string }).createdAt }],
      } as unknown as FeedLook));
    return [...enriched, ...orphans];
  }, [looks, communityItems]);
  // The MAIN reels feed is the PUBLIC feed: community/private try-ons stay out — a post
  // the admin demotes to Community disappears from the feed instantly. The grid overlay
  // keeps `looksForFeed` (full tier-gated set) so Community/Private tiles still open.
  const looksForFeedPublic = useMemo(() => {
    const publicIds = new Set(communityItems.filter(c => (c.visibility ?? (c.public ? "public" : "community")) === "public").map(c => c.id));
    return looksForFeed
      .map(l => l.communityTryOns?.length
        ? { ...l, communityTryOns: l.communityTryOns.filter(t => publicIds.has(t.id)) }
        : l)
      // A stub clip-post whose try-on is not public has NO content left — drop it,
      // or it would surface its poster as a flat look post in the public feed.
      .filter(l => !String(l.id).startsWith("clip-") || (l.communityTryOns?.length ?? 0) > 0);
  }, [looksForFeed, communityItems]);
  // Garderobe = every generated garment (all wardrobes), newest first, optionally by type.
  const garments = useMemo(() => {
    const g = (looks as unknown as { id: string; name: string; frontImageUrl?: string; imageUrl?: string; category?: LookCategory; curatorId?: string; productType?: string; wardrobe?: boolean; published?: boolean; productNote?: string; createdAt?: string; buyUrl?: string }[])
      // Admins also see hidden (published:false) garments so they can un-hide them.
      .filter(l => (l.productType === "ai" || l.wardrobe) && (l.frontImageUrl || l.imageUrl) && (l.published !== false || isAdmin));
    return g.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  }, [looks, isAdmin]);
  const garmentTypes = useMemo(() => {
    const present = new Set<LookCategory>();
    for (const g of garments) if (g.category) present.add(g.category);
    return LOOK_CATEGORIES.filter(c => present.has(c.slug));
  }, [garments]);
  const historySentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMoreHistory = historyCount < visibleHistory.length;
  useEffect(() => {
    if (!hasMoreHistory) return;
    const el = historySentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setHistoryCount(c => Math.min(c + HISTORY_PAGE, visibleHistory.length));
    }, { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMoreHistory, historyCount, visibleHistory.length]);
  // The visible grid mapped to the scroll-feed's item shape (looks + try-ons), so
  // tapping any tile opens a full-screen vertical reels feed of exactly what's shown.
  const visibleHistoryAsReel = useMemo<CommunityItem[]>(() => {
    const lookById = new Map(looks.map(l => [l.id, l]));
    const commById = new Map(communityItems.map(c => [c.id, c]));
    return visibleHistory.map((it): CommunityItem => {
      const base: CommunityItem = (it.kind === "tryon" && commById.has(it.id))
        ? { ...commById.get(it.id)!, kind: "tryon" }
        : {
            id: it.id,
            lookId: it.kind === "look" ? it.id : it.lookId,
            imageUrl: it.videoPoster || it.thumb,
            videoUrl: it.videoUrl,
            thumbUrl: it.thumb,
            customerName: it.kind === "tryon" ? (it.curatorName ?? "") : "",
            lookName: it.name,
            lookTitle: it.name, // it.name is already the public label (description), never the brand
            storeName: lookById.get(it.lookId)?.storeName ?? "",
            storeSlug: lookById.get(it.lookId)?.storeSlug ?? "",
            curatorId: lookById.get(it.lookId)?.curatorId,
            curatorName: it.curatorName,
            curatorPhotoUrl: it.curatorPhoto,
            brand: it.brand,
            kind: it.kind,
            createdAt: it.createdAt,
          };
      return { ...base, slides: buildSlides(base.imageUrl, base.videoUrl, base.userPhotoUrl) };
    });
  }, [visibleHistory, looks, communityItems]);
  // The community-only grid mapped with preview slides too.
  const filteredCommunityAsReel = useMemo<CommunityItem[]>(() => {
    return filteredCommunity.map(c => ({ ...c, kind: "tryon" as const, slides: buildSlides(c.imageUrl, c.videoUrl, c.userPhotoUrl) }));
  }, [filteredCommunity]);
  // The visible feed as LOOKS (one card style everywhere → HomeFeed). Try-on tiles
  // resolve to their source look so the feed is a single, consistent look-reel.
  const feedLooks = useMemo<Look[]>(() => {
    const byId = new Map(looks.map(l => [l.id, l]));
    const seen = new Set<string>();
    const out: Look[] = [];
    for (const it of visibleHistory) {
      const lookId = it.kind === "look" ? it.id : it.lookId;
      if (!lookId || seen.has(lookId)) continue;
      const l = byId.get(lookId);
      if (l) { seen.add(lookId); out.push(l); }
    }
    return out;
  }, [visibleHistory, looks]);

  // ── "More {brand} to try on" — products shown as a list below the curated grid.
  // Stored first (free: each look's saved shop alternatives, try-on via ?alt=N),
  // then optional live Google-Shopping results loaded on demand (?garment=url).
  const brandLooks = useMemo(
    () => (brandFilter ? looks.filter(l => (l as any).brand === brandFilter || new RegExp(brandFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test((l as any).name ?? "")) : []),
    [brandFilter, looks],
  );
  const brandStoredProducts = useMemo(() => {
    const out: { title?: string; link?: string; source?: string; thumbnail: string; price?: string; lingerie?: boolean; lookId: string; altIdx: number }[] = [];
    const seen = new Set<string>();
    for (const l of brandLooks) {
      const lookIsLingerie = !!(l as any).lingerie;
      (((l as any).alternatives ?? []) as any[]).forEach((a, idx) => {
        // Drop the old injected lingerie "upsell" on non-lingerie looks (confusing).
        if (a?.lingerie && !lookIsLingerie) return;
        const thumbnail = a?.thumbnail ?? "";
        const link = a?.link ?? "";
        if (!thumbnail || (link && seen.has(link))) return;
        if (link) seen.add(link);
        out.push({ title: a.title, link, source: a.source, thumbnail, price: a.price, lingerie: a.lingerie, lookId: l.id, altIdx: idx });
      });
    }
    return out;
  }, [brandLooks]);
  const brandRepLookId = brandLooks[0]?.id ?? "";
  const [liveProducts, setLiveProducts] = useState<{ title?: string; link?: string; source?: string; thumbnail: string; price?: string }[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveLoadedBrand, setLiveLoadedBrand] = useState<string | null>(null);
  useEffect(() => { setLiveProducts([]); setLiveLoadedBrand(null); }, [brandFilter]);
  const loadMoreBrand = async () => {
    if (!brandFilter) return;
    setLiveLoading(true);
    try {
      const d = await fetch(`/api/brand-shop?brand=${encodeURIComponent(brandFilter)}`).then(r => r.json());
      // Drop live items we already show as stored dupes (same link).
      const storedLinks = new Set(brandStoredProducts.map(p => p.link).filter(Boolean));
      setLiveProducts((Array.isArray(d.items) ? d.items : []).filter((i: any) => i.thumbnail && !storedLinks.has(i.link)));
    } catch { setLiveProducts([]); }
    setLiveLoadedBrand(brandFilter);
    setLiveLoading(false);
  };

  // Community paywall — shown when a non-paying viewer taps the locked Community chip.
  // Defined once here so every render branch (reels / A-List / grid) can drop it in.
  const paywallModal = showPaywall ? (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-6"
      onClick={() => { setShowPaywall(false); setPaywallDone(false); }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-black text-xl">{paywallDone ? "✨" : "🔒"}</div>
        {!paywallDone ? (
          <>
            <p className="mt-3 text-lg font-black text-black">Members only</p>
            <p className="mt-1.5 text-sm font-medium leading-6 text-black/55">The Community feed is only visible to paying members.</p>
            <button type="button" onClick={() => setPaywallDone(true)}
              className="mt-4 h-11 w-full rounded-full bg-black text-sm font-black text-white active:scale-95 transition-transform">Subscribe now</button>
            <button type="button" onClick={() => setShowPaywall(false)}
              className="mt-1 h-10 w-full text-sm font-black text-black/40 active:scale-95 transition-transform">Maybe later</button>
          </>
        ) : (
          <>
            <p className="mt-3 text-lg font-black text-black">Coming soon</p>
            <p className="mt-1.5 text-sm font-medium leading-6 text-black/55">Memberships are launching soon — you&apos;ll be able to subscribe right here.</p>
            <button type="button" onClick={() => { setShowPaywall(false); setPaywallDone(false); }}
              className="mt-4 h-11 w-full rounded-full bg-black text-sm font-black text-white active:scale-95 transition-transform">Got it</button>
          </>
        )}
      </div>
    </div>
  ) : null;

  // ── DEFAULT HOME = the single feed style (HomeFeed: caption on top, Look/Escape
  //    thumbnails, Bandit the feeling!). The old full-screen "Vollansicht" is gone. ──
  // Use ALL looks (same as /look/[id]), not filtered feedLooks. This way /stores and
  // /look/[id] scroll through the same feed.
  if (!searchOpen && showReels) {
    if (!looks.length) {
      return (
        <div className="grid min-h-dvh place-items-center bg-black" style={{ maxWidth: "100vw" }}>
          <Loader2 className="h-7 w-7 animate-spin text-white/40" />
        </div>
      );
    }
    return <HomeFeed looks={looksForFeedPublic} />;
  }

  // ── The A List = HomeFeed of look posts (?view=alist) ──
  if (!searchOpen && showAList) {
    return (
      <div className="min-h-dvh bg-black" style={{ maxWidth: "100vw" }}>
        <HomeFeed looks={looks} />
        {/* Floating controls (top-right): home + search */}
        <div className="fixed right-3 z-30 flex items-center gap-2" style={{ top: "calc(env(safe-area-inset-top) + 0.6rem)" }}>
          <button type="button" aria-label="Home" onClick={() => router.push("/stores")}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur active:scale-90 transition-transform">
            <Home className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Search"
            onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur active:scale-90 transition-transform">
            <Search className="h-4 w-4" />
          </button>
        </div>
        {showMerkliste && <MerklistePanel onClose={() => { setShowMerkliste(false); stripPanelParam(); }} />}
        {showUserPanel && <UserPanel onClose={() => { setShowUserPanel(false); setSavedAutoOpen(false); stripPanelParam(); }} openSaved={savedAutoOpen} />}
        {paywallModal}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0d0b0a] text-white" style={{ maxWidth: "100vw" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0d0b0a]/95 backdrop-blur">

        {/* Brand row */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1.5">
          {/* Logo → back to the feeds (the full-screen scrolling reel = /stores default). */}
          <button type="button" onClick={() => router.push("/stores")} aria-label="Feeds"
            className="flex items-center gap-2 active:opacity-70 transition-opacity">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white text-xs font-black tracking-tight select-none">
              LB
            </div>
            <div className="text-left">
              <div className="text-sm font-black uppercase tracking-widest text-white leading-none">LuxuryBandit</div>
              <div className="text-[10px] font-bold text-white/40 mt-0.5 leading-tight">Virtual Try-On</div>
            </div>
          </button>

          {/* Right icons */}
          <div className="flex items-center gap-2">
            {/* Search toggle */}
            <button type="button"
              onClick={() => { setSearchOpen(v => !v); if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50); else setQuery(""); }}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                searchOpen ? "border-white bg-white text-black" : "border-white/15 bg-white/5 text-white/60 hover:text-white"
              }`}
              aria-label="Suche">
              <Search className="h-4 w-4" />
            </button>

            <a href={`https://instagram.com/${process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE ?? "luxurybandit"}`} target="_blank" rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60 hover:text-white transition"
              aria-label="Instagram">
              <Instagram className="h-4 w-4" />
            </a>

            {/* Messages — moved up from the (removed) bottom bar */}
            <button type="button" onClick={() => router.push("/messages")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60 hover:text-white transition"
              aria-label="Messages">
              <MessageCircle className="h-4 w-4" />
            </button>

            {/* Account — opens the profile sheet (lives in BottomNav, via event) */}
            <button type="button" onClick={() => window.dispatchEvent(new Event("lb-open-account"))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60 hover:text-white transition"
              aria-label="Account">
              <User className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Collapsible search row */}
        {searchOpen && (
          <div className="flex items-center gap-2 px-3 pb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={typeFilter === "community" ? "User, Look oder Store…" : "Look, Store oder Preis…"}
                className="h-9 w-full rounded-full border border-white/15 bg-white/5 pl-8 pr-8 text-sm font-bold text-white outline-none focus:border-white/40 placeholder:text-white/25"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded-full bg-white/15 text-white/60 active:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stats row */}
        {!isLoading && (
          <div className="flex gap-6 px-4 pb-1.5">
            {curatorCount > 0 && (
              <div className="text-center">
                <div className="text-sm font-black text-white leading-none">{curatorCount}</div>
                <div className="text-[10px] font-bold text-white/40 mt-0.5">Model{curatorCount !== 1 ? "s" : ""}</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-sm font-black text-white leading-none">{looks.length}</div>
              <div className="text-[10px] font-bold text-white/40 mt-0.5">Looks</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-black text-white leading-none">{communityItems.length}</div>
              <div className="text-[10px] font-bold text-white/40 mt-0.5">Try-ons</div>
            </div>
          </div>
        )}

      </header>

      <main className="pb-24">

        {/* Saved model photo banner */}
        {savedModel && (
          <div className="mx-3 mt-3 flex items-center gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={savedModel.imageUrl} alt="" className="h-14 w-10 shrink-0 rounded-lg object-cover object-top border border-amber-200" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-amber-800">✨ Your photo is ready</p>
              <p className="truncate text-[11px] font-bold text-amber-700/70">From: {savedModel.fromLookName}</p>
              <p className="text-[11px] font-bold text-amber-600/60">Tap any look to try it on — 2 credits per generation</p>
            </div>
            <button type="button"
              onClick={() => {
                try { sessionStorage.removeItem("lb_model_image"); localStorage.removeItem("lb_model_meta"); } catch { /**/ }
                setSavedModel(null);
              }}
              className="shrink-0 rounded-full p-1.5 text-amber-500 hover:bg-amber-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Discover: one mixed archive (looks + curator videos + try-ons), newest
            first. Search filters THIS grid (no jump to a legacy page). ── */}
        {(showGrid || searchOpen) && (
          historyItems.length === 0 ? (
            <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-black/30" /></div>
          ) : (
          <>
            {/* Hero — explains in one glance what LuxuryBandit lets you do.
                Stays visible when a category chip is active too — hiding it made the
                page JUMP on every All↔Community switch. Only search collapses it. */}
            {!searchOpen && (
              <section className="px-4 pt-4 pb-3">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">AI Fashion Models · Luxury Looks</p>
                <h1 className="mt-1.5 text-[1.8rem] font-black leading-[1.08] tracking-tight text-white">
                  Your dream model, <span className="text-amber-400">in any look.</span>
                </h1>
                <p className="mt-2 max-w-md text-sm font-medium leading-6 text-white/60">
                  Pick a model, choose a designer outfit, and watch her wear it in a runway-quality
                  video — dancing or turning, your call. New looks drop every day.
                </p>
                <div className="mt-3 grid gap-1.5">
                  {[
                    [<Sparkles key="i" className="h-4 w-4 text-amber-400" />, "See her in any look", "Put your favorite model in the outfit YOU choose — like it, share it, shop it."],
                    [<MessageCircle key="i" className="h-4 w-4 text-amber-400" />, "Get in touch", "Follow her and send her a message right from her profile."],
                  ].map(([icon, title, text], i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="mt-0.5 shrink-0">{icon as React.ReactNode}</span>
                      <p className="text-[13px] leading-snug text-white/70">
                        <span className="font-black text-white">{title as string}</span> — {text as string}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3.5 flex items-center gap-2">
                  {/* Home already IS the grid — no reel CTA needed here. "How it works"
                      stays as the primary explainer. */}
                  <button type="button" onClick={() => router.push("/about")}
                    className="lb-black3d flex h-10 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-black active:scale-95 transition-transform">
                    <Play className="h-4 w-4" fill="currentColor" /> How it works
                  </button>
                </div>
                {/* Model recruiting → its own landing page. Solid gold pill so
                    would-be models can't miss it. */}
                <button type="button" onClick={() => router.push("/become-a-model")}
                  className="lb-gold mt-3 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[13px] font-black active:scale-95 transition-transform">
                  <Heart className="h-4 w-4" fill="currentColor" /> Become a LuxuryBandit Model — earn with every look →
                </button>
              </section>
            )}

            {/* Feeds | Models toggle — Home has two views: the try-on feeds, and the
                gallery of models (browse a model, then see her in looks). */}
            <div className="flex items-center gap-2 overflow-x-auto px-3 pt-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button type="button" onClick={() => setHomeTab("models")}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-black transition ${homeTab === "models" ? "lb-black3d" : "bg-white/10 text-white/60"}`}>Models{models.length ? ` · ${models.length}` : ""}</button>
              <button type="button" onClick={() => setHomeTab("garderobe")}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-black transition ${homeTab === "garderobe" ? "lb-black3d" : "bg-white/10 text-white/60"}`}>Wardrobe{garments.length ? ` · ${garments.length}` : ""}</button>
              <button type="button" onClick={() => setHomeTab("feeds")}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-black transition ${homeTab === "feeds" ? "lb-black3d" : "bg-white/10 text-white/60"}`}>Let&apos;s Play Big</button>
            </div>

            {homeTab === "models" ? (
              models.length === 0 ? (
                <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>
              ) : (
              <>
                {isAdmin && (
                  <div className="px-3 pb-1 pt-1">
                    <button type="button" onClick={openModelAdd}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-white/25 px-4 py-2.5 text-[13px] font-black text-white/70 active:scale-95 transition-transform">
                      <UserPlus className="h-4 w-4" /> Add a new model
                    </button>
                  </div>
                )}
                {/* Sort (newest first = default) + hair-color filter */}
                <div className="flex gap-2 overflow-x-auto px-3 pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button type="button" onClick={() => setModelSort("new")}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${modelSort === "new" && !hairFilter ? "bg-amber-400 text-black" : "bg-white/10 text-white/60"}`}>New</button>
                  <button type="button" onClick={() => setModelSort("looks")}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${modelSort === "looks" && !hairFilter ? "bg-amber-400 text-black" : "bg-white/10 text-white/60"}`}>Most looks</button>
                  {hairColorsPresent.map(h => (
                    <button key={h} type="button" onClick={() => setHairFilter(f => f === h ? "" : h)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${hairFilter === h ? "bg-white text-black" : "bg-white/10 text-white/60"}`}>
                      {HAIR_LABELS[h] ?? h}
                    </button>
                  ))}
                  {isAdmin && (
                    <button type="button" onClick={() => { setModelSelect(v => !v); setModelSelected(new Set()); }}
                      className={`ml-auto shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-black transition ${modelSelect ? "border-amber-400 bg-amber-400 text-black" : "border-white/20 bg-white/5 text-white/70"}`}>
                      {modelSelect ? "Fertig" : "Auswählen"}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 px-3 pb-8">
                {shownModels.map(m => (
                  <div key={m.id} className="relative">
                    {/* No light border — bright photo edges made it flash white on dark. */}
                    <a href={`/curator/${m.id}`}
                      onClick={(e) => {
                        if (!(modelSelect && isAdmin)) return;
                        e.preventDefault();
                        setModelSelected(prev => { const n = new Set(prev); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n; });
                      }}
                      className={`flex flex-col overflow-hidden rounded-2xl bg-white/[0.04] active:opacity-80 transition-opacity ${modelSelect && isAdmin && modelSelected.has(m.id) ? "ring-2 ring-amber-400" : ""}`}>
                      <div className="relative aspect-[3/4] overflow-hidden lb-media-bg">
                        {modelSelect && isAdmin && (
                          <span className={`absolute left-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full text-[13px] font-black ${modelSelected.has(m.id) ? "bg-amber-400 text-black" : "bg-black/60 text-white/60"}`}>✓</span>
                        )}
                        {isAdmin && m.pinned && (
                          <span className="absolute right-2 bottom-2 z-10 rounded-full bg-black/70 px-1.5 py-0.5 text-[11px] backdrop-blur">📌</span>
                        )}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.photoUrl} alt={m.name} loading="lazy" decoding="async" className={`h-full w-full object-cover object-top ${m.hidden ? "opacity-40" : ""}`} />
                        {m.lookCount > 0 && (
                          <span className="absolute left-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur">{m.lookCount} look{m.lookCount !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                      <div className="px-2.5 py-2">
                        <p className="truncate text-[13px] font-black text-white">{m.name}</p>
                        {m.style && <p className="truncate text-[11px] font-bold text-white/40">{m.style}</p>}
                      </div>
                    </a>
                    {m.hidden && <span className="absolute left-2 top-2 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-black text-white">Ausgeblendet</span>}
                    {isAdmin && (
                      <button type="button" onClick={() => openModelManage(m)}
                        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white backdrop-blur active:scale-90 transition"
                        aria-label="Model verwalten"><SlidersHorizontal className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
                </div>
              </>
              )
            ) : homeTab === "garderobe" ? (
              <>
                {/* Type filter — Alle + garment types (gowns / dresses / resort / lingerie). */}
                {garmentTypes.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button type="button" onClick={() => setGarmentType(null)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${garmentType === null ? "bg-white text-black" : "bg-white/10 text-white/60"}`}>Alle</button>
                    {garmentTypes.map(c => (
                      <button key={c.slug} type="button" onClick={() => setGarmentType(c.slug)}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${garmentType === c.slug ? "bg-white text-black" : "bg-white/10 text-white/60"}`}>{c.slug === "boudoir" ? "Lingerie" : c.label}</button>
                    ))}
                  </div>
                )}
                {isAdmin && (
                  <div className="px-3 pb-1">
                    <button type="button" onClick={() => { setAddOpen(true); setAgMsg(""); }}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-white/25 px-4 py-2.5 text-[13px] font-black text-white/70 active:scale-95 transition-transform">
                      <UserPlus className="h-4 w-4" /> Luxury-Bandi-Kleidungsstück hinzufügen
                    </button>
                  </div>
                )}
                {(() => {
                  const items = garmentType ? garments.filter(g => g.category === garmentType) : garments;
                  if (items.length === 0) return (
                    <div className="flex flex-col items-center gap-2 py-16 text-center">
                      <ImageIcon className="h-8 w-8 text-white/15" />
                      <p className="text-sm font-black text-white/40">Noch keine Kleidungsstücke — generiere eine Garderobe auf einer Model-Seite.</p>
                    </div>
                  );
                  return (
                    <div className="grid grid-cols-2 gap-2 px-3 pb-8">
                      {items.map(g => {
                        const img = (g.frontImageUrl ?? g.imageUrl) as string;
                        const hidden = g.published === false;
                        return (
                          <div key={g.id} className="relative flex flex-col overflow-hidden rounded-2xl border border-black/8 bg-white">
                            <button type="button"
                              onClick={() => router.push(`/try/${g.id}?garment=${encodeURIComponent(img)}&pick=1`)}
                              className="relative aspect-[3/4] w-full bg-neutral-50 active:opacity-80 transition-opacity">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={optImg(img, 500)} alt={g.name} loading="lazy" decoding="async"
                                onError={(e) => { const im = e.currentTarget; if (img && im.src !== img) im.src = img; }}
                                className={`h-full w-full object-contain ${hidden ? "opacity-40" : ""}`} />
                              {/* Make it obvious that tapping this piece generates a try-on VIDEO. */}
                              {!hidden && (
                                <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/80 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
                                  <Play className="h-2.5 w-2.5" fill="currentColor" /> Video erstellen
                                </span>
                              )}
                            </button>
                            <div className="px-2 py-1.5">
                              <span className="block truncate text-[11px] font-black text-black/70">{g.name}</span>
                              {g.buyUrl && (
                                <a href={g.buyUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={e => e.stopPropagation()}
                                  className="mt-1.5 flex items-center justify-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-[11px] font-black text-white active:scale-95 transition">
                                  <ShoppingBag className="h-3.5 w-3.5" /> Shop now
                                </a>
                              )}
                            </div>
                            {hidden && <span className="absolute left-2 top-2 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-black text-white">Ausgeblendet</span>}
                            {isAdmin && (
                              <button type="button" onClick={() => openGManage(g)}
                                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white backdrop-blur active:scale-90 transition"
                                aria-label="Verwalten"><SlidersHorizontal className="h-4 w-4" /></button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            ) : (
            <>

            {/* Moderation-tier chips: All = the PUBLIC feed; Community = the gated member
                pool (new user videos land here — the admin reviews & promotes); Private =
                admin-only view of unshared try-ons. Admin also gets a select toggle for
                bulk-moving posts between tiers. */}
            <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button type="button" onClick={() => setTierFilter("public")}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${tierFilter === "public" ? "lb-black3d" : "bg-white/10 text-white/60"}`}>
                All
              </button>
              <button type="button"
                onClick={() => { if (!isPaidMember) { setShowPaywall(true); return; } setTierFilter("community"); }}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${tierFilter === "community" ? "bg-white text-black" : "bg-white/10 text-white/60"}`}>
                {isPaidMember ? "🔓 " : "🔒 "}Community
              </button>
              {isAdmin && (
                <button type="button" onClick={() => setTierFilter("private")}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${tierFilter === "private" ? "lb-black3d" : "bg-white/10 text-white/60"}`}>
                  <EyeOff className="h-3.5 w-3.5" /> Private
                </button>
              )}
              {isAdmin && (
                <button type="button"
                  onClick={() => { setTierSelect(v => !v); setTierSelected(new Set()); }}
                  className={`ml-auto shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-black transition ${tierSelect ? "border-amber-400 bg-amber-400 text-black" : "border-white/20 bg-white/5 text-white/70"}`}>
                  {tierSelect ? "Fertig" : "Auswählen"}
                </button>
              )}
            </div>
            {/* Rounded cards like the Models grid (gap + rounded-2xl on the dark home). */}
            {/* Always exactly 3 per row (user request) — the page is a mobile column anyway. */}
            <div className="grid grid-cols-3 gap-1.5 px-3 pb-8">
              {pagedHistory.map((it, idx) => (
                <div key={it.key} className="flex flex-col overflow-hidden rounded-2xl bg-white/[0.04]">
                  <button type="button"
                    onClick={() => {
                      if (tierSelect && isAdmin) {
                        if (it.kind !== "tryon") return; // only try-ons carry a tier
                        setTierSelected(prev => { const n = new Set(prev); if (n.has(it.id)) n.delete(it.id); else n.add(it.id); return n; });
                        return;
                      }
                      openFeedOverlay({ tryOnId: it.kind === "tryon" ? it.id : undefined, lookId: it.lookId });
                    }}
                    className={`relative aspect-[3/4] overflow-hidden lb-media-bg transition-opacity active:opacity-80 ${
                      tierSelect && isAdmin
                        ? (it.kind !== "tryon" ? "opacity-30" : tierSelected.has(it.id) ? "ring-2 ring-inset ring-amber-400" : "")
                        : ""
                    }`}>
                    {tierSelect && isAdmin && it.kind === "tryon" && (
                      <span className={`absolute right-1.5 top-1.5 z-10 grid h-6 w-6 place-items-center rounded-full text-[13px] font-black ${tierSelected.has(it.id) ? "bg-amber-400 text-black" : "bg-black/60 text-white/60"}`}>✓</span>
                    )}
                    {isAdmin && it.pinned && (
                      <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-black/70 px-1.5 py-0.5 text-[11px] backdrop-blur">📌</span>
                    )}
                    {it.videoUrl ? (
                      // Video tile — the grid is NOT a player (tapping opens the reel), so
                      // with a poster we render a plain lazy <img>: sized-down (400px) and
                      // loaded only near the viewport — 12+ full-res posters used to load
                      // all at once. Only posterless videos mount a <video> (first frame).
                      (() => { const poster = it.videoPoster || it.thumb; return it.animated ? (
                        // Admin-picked "animated" post — plays inline (muted loop, IO-gated).
                        <GridClip videoUrl={it.videoUrl} poster={poster || ""} alt={it.name} />
                      ) : poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={optImg(poster, 400)} alt={it.name} loading="lazy" decoding="async"
                          onError={(e) => { const im = e.currentTarget; if (poster && im.src !== poster) im.src = poster; }}
                          className="h-full w-full object-cover object-top" />
                      ) : (
                        <video src={`${it.videoUrl}#t=0.1`} muted playsInline preload="metadata"
                          className="h-full w-full bg-black object-cover object-top" />
                      ); })()
                    ) : it.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={optImg(it.thumb, 400)} alt={it.name} loading="lazy" decoding="async"
                        onError={(e) => { const im = e.currentTarget; if (it.thumb && im.src !== it.thumb) im.src = it.thumb; }}
                        className="h-full w-full object-cover object-top" />
                    ) : (
                      // No render available — a neutral placeholder (never an empty src,
                      // which makes the browser re-request the whole page).
                      <div className="h-full w-full bg-black/[0.06]" />
                    )}
                    {it.videoUrl && !it.animated && (
                      <span className="pointer-events-none absolute inset-0 grid place-items-center"><Play className="h-11 w-11 fill-white text-white opacity-45 drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]" /></span>
                    )}
                    {/* Label at the BOTTOM — the face is usually at the top of the crop.
                        Try-on tiles carry NO badge (user request) — only look posts do. */}
                    {it.kind !== "tryon" && (
                      <span className="absolute left-1.5 bottom-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white backdrop-blur">
                        {it.aiCreated ? "✦ Original" : "Model"}
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-1.5 px-2.5 pt-1.5 pb-2">
                    {it.curatorName && (
                      <span className="flex h-5 w-5 shrink-0 overflow-hidden rounded-full bg-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.curatorPhoto || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(publicAuthorName(it.curatorName))}&backgroundColor=000000&fontColor=ffffff`} alt="" className="h-full w-full object-cover" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[11px] font-black text-white">{it.curatorName ? publicAuthorName(it.curatorName) : it.name}</span>
                    {it.price && <span className="shrink-0 text-[10px] font-black text-white/60">{it.price}</span>}
                  </div>
                </div>
              ))}
            </div>
            {hasMoreHistory && (
              <div ref={historySentinelRef} className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-black/25" />
              </div>
            )}
            {tierFilter !== "public" && visibleHistory.length === 0 && (
              <p className="py-16 text-center text-sm font-black text-white/40">Nothing here yet.</p>
            )}
            </>
            )}
          </>
          )
        )}

        {/* ── Community tab ── */}
        {typeFilter === "community" && (
          <>
            {/* Intro / page description */}
            <section className="px-4 pt-4 pb-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-cobalt">LuxuryBandit Try-ons</p>
              <h1 className="mt-1 text-xl font-semibold leading-tight tracking-tight text-black">
                Real people, wearing the looks
              </h1>
              <p className="mt-1.5 text-sm font-normal leading-6 text-black/55">
                See how trend looks land on real bodies — AI try-ons from the community.
                Try any look on yourself, then shop the style at the price that suits you.
              </p>
            </section>

            {/* All / Mine — only for signed-in creators */}
            {myCuratorId && (
              <div className="flex items-center gap-2 px-4 pb-1 pt-1">
                <button type="button" onClick={() => setMineOnly(false)}
                  className={`rounded-full px-4 py-1.5 text-xs font-black transition ${!mineOnly ? "bg-black text-white" : "bg-black/[0.04] text-black/45"}`}>
                  All try-ons
                </button>
                <button type="button" onClick={() => setMineOnly(true)}
                  className={`rounded-full px-4 py-1.5 text-xs font-black transition ${mineOnly ? "bg-black text-white" : "bg-black/[0.04] text-black/45"}`}>
                  My try-ons{myTryOnCount > 0 ? ` · ${myTryOnCount}` : ""}
                </button>
              </div>
            )}

            {/* Empty state when a creator has no try-ons of their own yet */}
            {!communityLoading && mineOnly && myCuratorId && myTryOnCount === 0 && (
              <div className="flex flex-col items-center gap-2 py-20 text-center px-8">
                <ImageIcon className="h-9 w-9 text-black/15" />
                <p className="text-sm font-black text-black/45">You haven&apos;t posted a try-on yet</p>
                <p className="max-w-xs text-xs font-medium leading-5 text-black/45">
                  Tap any look, try it on yourself, then share it — it&apos;ll show up here under your name.
                </p>
              </div>
            )}

            {communityLoading && (
              <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-black/30" />
              </div>
            )}
            {!communityLoading && communityItems.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-24 text-center px-6">
                <ImageIcon className="h-10 w-10 text-black/15" />
                <p className="text-sm font-black text-black/40">No community looks yet.</p>
                <p className="text-xs font-bold text-black/25">Try on a look to be the first!</p>
              </div>
            )}
            {!communityLoading && communityItems.length > 0 && filteredCommunity.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
                <span className="text-3xl">🔍</span>
                <p className="text-sm font-black text-black/40">No results for “{query}”</p>
              </div>
            )}
            {!communityLoading && filteredCommunity.length > 0 && (
              <>
                {/* Admin toolbar */}
                {isAdmin && (
                  <div className="border-b border-black/5 bg-white">
                    {/* Assign input row */}
                    {bulkAssignOpen && (
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-black/5">
                        <input
                          type="text"
                          value={bulkAssignName}
                          onChange={e => setBulkAssignName(e.target.value)}
                          placeholder="Name oder E-Mail…"
                          autoFocus
                          className="flex-1 h-9 rounded-xl border border-black/10 bg-black/[0.03] px-3 text-sm font-bold outline-none focus:border-cobalt"
                        />
                        <button type="button" disabled={bulkWorking || !bulkAssignName.trim()}
                          onClick={() => void bulkAssign()}
                          className="h-9 rounded-xl bg-cobalt px-3 text-xs font-black text-white disabled:opacity-40 active:opacity-70">
                          {bulkWorking ? "…" : `Assign (${selectedIds.size})`}
                        </button>
                        <button type="button" onClick={() => setBulkAssignOpen(false)}
                          className="h-9 w-9 grid place-items-center rounded-xl bg-black/5 text-black/50 active:opacity-70">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {/* Action row */}
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs font-bold text-black/40">
                        {selectMode ? `${selectedIds.size} selected` : `${filteredCommunity.length}${query ? ` of ${communityItems.length}` : ""} posts`}
                      </span>
                      <div className="flex items-center gap-2">
                        {selectMode && selectedIds.size > 0 && (
                          <>
                            <button type="button" disabled={bulkWorking}
                              onClick={() => { setBulkAssignName(""); setBulkAssignOpen(v => !v); }}
                              className="rounded-full bg-cobalt px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-50 active:opacity-70">
                              Assign
                            </button>
                            <button type="button" disabled={bulkWorking} onClick={() => void bulkHide()}
                              className="rounded-full bg-amber-400 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-50 active:opacity-70">
                              {bulkWorking ? "…" : "Hide"}
                            </button>
                            <button type="button" disabled={bulkWorking} onClick={() => void bulkDelete()}
                              className="rounded-full bg-red-500 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-50 active:opacity-70">
                              {bulkWorking ? "…" : "Delete"}
                            </button>
                          </>
                        )}
                        <button type="button" onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                          className={`rounded-full px-3 py-1.5 text-[11px] font-black active:opacity-70 ${
                            selectMode ? "bg-black text-white" : "bg-black/8 text-black/60"
                          }`}>
                          {selectMode ? "Cancel" : "Select"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0.5">
                {filteredCommunity.map((item, itemIdx) => {
                  const isSelected = selectedIds.has(item.id);
                  const username = item.customerName
                    ? item.customerName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
                    : "";
                  return (
                    <div key={item.id} className="flex flex-col">
                      {/* Image */}
                      <button type="button"
                        onClick={() => {
                          if (selectMode) { toggleSelect(item.id); return; }
                          // One feed everywhere → open the look's HomeFeed (not the old full-screen view).
                          router.push(lookPath(item.lookName, item.lookId || item.id));
                        }}
                        className={`relative aspect-[3/4] w-full overflow-hidden lb-media-bg transition-opacity active:opacity-80 block ${
                          selectMode && isSelected ? "opacity-60 ring-2 ring-inset ring-cobalt" : ""
                        }`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={optImg(item.imageUrl, 400)} alt={item.lookName}
                          loading="lazy" decoding="async"
                          onError={(e) => { const img = e.currentTarget; if (item.imageUrl && img.src !== item.imageUrl) img.src = item.imageUrl; }}
                          className="h-full w-full object-cover object-top" />
                        {item.videoUrl && !selectMode && (
                          <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white backdrop-blur"><Play className="h-3 w-3 fill-current" /></span>
                        )}
                        {selectMode && (
                          <div className={`absolute top-1.5 left-1.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition ${
                            isSelected ? "bg-cobalt border-cobalt" : "bg-black/30 border-white/60"
                          }`}>
                            {isSelected && (
                              <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </div>
                        )}
                      </button>
                      {/* Info row — same as regular feed */}
                      <div className="flex items-center gap-1.5 px-2 pt-1 pb-0 bg-white">
                        {username ? (
                          <a href={`/u/${username}`} onClick={e => e.stopPropagation()}
                            className="flex h-4 w-4 shrink-0 overflow-hidden rounded-full bg-black/5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(publicAuthorName(item.customerName))}&backgroundColor=000000&fontColor=ffffff&fontSize=40`}
                              alt={publicAuthorName(item.customerName)} className="h-full w-full object-cover" />
                          </a>
                        ) : null}
                        <span className="min-w-0 flex-1 truncate text-[9px] font-black text-black/70">
                          {publicAuthorName(item.customerName)}
                        </span>
                      </div>
                      {/* Social bar — same as regular feed */}
                      <div className="flex items-center gap-2 px-2 py-1 bg-white border-b border-black/5 select-none text-black/50">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold">{(() => { let h=0; const s=item.id+"_gl"; for(let i=0;i<s.length;i++){h=Math.imul(31,h)+s.charCodeAt(i)|0;} const n=200+(Math.abs(h)%49800); return n>=10000?`${(n/1000).toFixed(0)}k`:n>=1000?`${(n/1000).toFixed(1)}k`:String(n); })()}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold">{seedCommentCount(item.id)}</span>
                        </span>
                        <span className="ml-auto flex items-center gap-0.5">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                          <span className="text-[9px] font-bold">{(() => { let h=0; const s=item.id+"_gv"; for(let i=0;i<s.length;i++){h=Math.imul(31,h)+s.charCodeAt(i)|0;} const n=200+(Math.abs(h)%49800); return n>=10000?`${(n/1000).toFixed(0)}k`:n>=1000?`${(n/1000).toFixed(1)}k`:String(n); })()}</span>
                        </span>
                        {/* Share button */}
                        <button type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const url = `${window.location.origin}/post/${item.id}`;
                            if (navigator.share) { try { await navigator.share({ title: item.lookName, url }); } catch { /**/ } }
                            else { try { await navigator.clipboard.writeText(url); } catch { /**/ } }
                          }}
                          className="ml-1 flex items-center gap-0.5 pointer-events-auto hover:text-black transition">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            )}
          </>
        )}

        {/* Legacy Trends intro — replaced by the Discover grid above */}
        {false && (
          <section className="px-4 pt-4 pb-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-cobalt">Trends</p>
            <h1 className="mt-1 text-xl font-semibold leading-tight tracking-tight text-black">
              The look — shop it at any price
            </h1>
            <p className="mt-1.5 text-sm font-normal leading-6 text-black/55">
              Models try on the trends and show the real products worth buying. Every look comes with
              shop options across budgets — and you can model it yourself, on your own photo, before you buy.
            </p>
          </section>
        )}

        {/* All / My Trends — only for signed-in creators */}
        {false && myCuratorId && (
          <div className="flex items-center gap-2 px-4 pb-3 pt-1">
            <button type="button" onClick={() => setMyTrendsOnly(false)}
              className={`rounded-full px-4 py-1.5 text-xs font-black transition ${!myTrendsOnly ? "bg-black text-white" : "bg-black/[0.04] text-black/45"}`}>
              All trends
            </button>
            <button type="button" onClick={() => setMyTrendsOnly(true)}
              className={`rounded-full px-4 py-1.5 text-xs font-black transition ${myTrendsOnly ? "bg-black text-white" : "bg-black/[0.04] text-black/45"}`}>
              My trends{myLookCount > 0 ? ` · ${myLookCount}` : ""}
            </button>
          </div>
        )}

        {/* Empty state when creator has no looks of their own yet */}
        {false && !isLoading && myTrendsOnly && myCuratorId && myLookCount === 0 && (
          <div className="flex flex-col items-center gap-2 py-20 text-center px-8">
            <ShoppingBag className="h-9 w-9 text-black/15" />
            <p className="text-sm font-black text-black/45">You haven&apos;t published a look yet</p>
            <p className="max-w-xs text-xs font-medium leading-5 text-black/45">
              Go to your studio, create a look and publish it — it&apos;ll show up here.
            </p>
          </div>
        )}

        {false && isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-black/30" />
          </div>
        )}

        {false && error && (
          <p className="p-4 text-center text-sm font-bold text-red-500">{error}</p>
        )}

        {false && !isLoading && !error && looks.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-24 text-center px-6">
            <ShoppingBag className="h-10 w-10 text-black/15" />
            <p className="text-sm font-black text-black/40">No listings yet — check back soon.</p>
          </div>
        )}

        {false && !isLoading && looks.length > 0 && (
          <>
            {/* Admin feed toolbar */}
            {isAdmin && (
              <div className="border-b border-black/5 bg-white">
                <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 scrollbar-none">
                  {selectedLookIds.size > 0 && (
                    <>
                      <button type="button" disabled={feedBulkWorking} onClick={() => void bulkHideLooks()}
                        className="rounded-full bg-amber-400 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-50 active:opacity-70 shrink-0">
                        {feedBulkWorking ? "…" : `Hide (${selectedLookIds.size})`}
                      </button>
                      <button type="button" disabled={feedBulkWorking} onClick={() => void bulkDeleteLooks()}
                        className="rounded-full bg-red-500 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-50 active:opacity-70 shrink-0">
                        {feedBulkWorking ? "…" : `Delete (${selectedLookIds.size})`}
                      </button>
                    </>
                  )}
                  <button type="button"
                    onClick={() => feedSelectMode ? exitFeedSelectMode() : setFeedSelectMode(true)}
                    className={`ml-auto rounded-full px-3 py-1.5 text-[11px] font-black shrink-0 active:opacity-70 ${
                      feedSelectMode ? "bg-black text-white" : "bg-black/8 text-black/60"
                    }`}>
                    {feedSelectMode ? `Cancel${selectedLookIds.size ? ` (${selectedLookIds.size})` : ""}` : "Select"}
                  </button>
                </div>
              </div>
            )}

            {query && (
              <p className="px-3 py-2 text-xs font-bold text-black/30">
                {filtered.length} of {looks.length} results for &ldquo;{query}&rdquo;
              </p>
            )}

            {filtered.length === 0 && query && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <span className="text-3xl">🔍</span>
                <p className="text-sm font-black text-black/40">Nothing found for &ldquo;{query}&rdquo;</p>
              </div>
            )}

            {/* 3-col grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0.5">
              {filtered.map((look) => {
                const thumb = look.frontImageUrl ?? look.imageUrl;
                const isSoldOut = look.inStock === false;
                const isSelectedLook = selectedLookIds.has(look.id);
                return (
                  <div key={look.id} className="flex flex-col">
                    {/* Image */}
                    <button
                      type="button"
                      onClick={() => {
                        if (feedSelectMode) {
                          setSelectedLookIds(prev => {
                            const next = new Set(prev);
                            if (next.has(look.id)) next.delete(look.id); else next.add(look.id);
                            return next;
                          });
                        } else {
                          router.push(lookPath(look.name, look.id));
                        }
                      }}
                      className="relative aspect-[3/4] overflow-hidden lb-media-bg transition-opacity active:opacity-80"
                    >
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt={look.name}
                          fill
                          sizes="(max-width: 768px) 33vw, 170px"
                          className="object-cover object-top"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl">🛍️</div>
                      )}

                      {/* Sold out overlay only — image stays clean */}
                      {isSoldOut && !feedSelectMode && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <span className="rounded bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">Sold</span>
                        </div>
                      )}

                      {/* Select mode overlay */}
                      {feedSelectMode && (
                        <div className={`absolute inset-0 flex items-center justify-center transition-colors ${isSelectedLook ? "bg-black/40" : "bg-transparent"}`}>
                          <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelectedLook ? "border-white bg-black" : "border-white/70 bg-transparent"}`}>
                            {isSelectedLook && <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                          </div>
                        </div>
                      )}
                    </button>

                    {/* Info row — attributed to the curator who published it */}
                    <div className="flex items-center gap-1.5 px-2 pt-1 pb-0 bg-white">
                      {/* Curator avatar (falls back to store) */}
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); if (look.curatorId) router.push(`/curator/${look.curatorId}`); else if (look.storeSlug) router.push(`/store/${look.storeSlug}`); }}
                        className="flex h-4 w-4 shrink-0 overflow-hidden rounded-full bg-black/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={look.curatorPhotoUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(publicAuthorName(look.curatorName || look.storeSlug))}&backgroundColor=000000&fontColor=ffffff`}
                          alt="" className="h-full w-full object-cover" />
                      </button>
                      <span className="min-w-0 flex-1 truncate text-[9px] font-black text-black/70">
                        {look.curatorName ? publicAuthorName(look.curatorName) : (look.storeName || look.storeSlug || "")}
                      </span>
                      {(() => {
                        const label = feedPrice(look);
                        return label ? <span className="shrink-0 text-[9px] font-black text-ink">{label}</span> : null;
                      })()}
                      {look.discountLabel && !isSoldOut && (
                        <span className="shrink-0 rounded bg-black/10 px-1 py-0.5 text-[8px] font-black text-black/60">{look.discountLabel}</span>
                      )}
                    </div>

                    {/* Social bar — display only */}
                    <div className="flex items-center gap-2 px-2 py-1 bg-white border-b border-black/5 pointer-events-none select-none text-black/50">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold">{likeCount(look.id)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold">{seedCommentCount(look.id)}</span>
                      </span>
                      {(look.generationCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold">{look.generationCount}</span>
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-0.5">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        <span className="text-[9px] font-bold">{viewCount(look.id)}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Community search results when searching from All tab */}
            {query.trim() && filteredCommunity.length > 0 && (
              <div className="mt-4 mb-2">
                <p className="px-3 py-2 text-xs font-black text-black/40 uppercase tracking-widest">
                  Try Ons ({filteredCommunity.length})
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0.5">
                  {filteredCommunity.map((item, itemIdx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => router.push(`/post/${item.id}`)}
                      className="relative aspect-[3/4] overflow-hidden lb-media-bg transition-opacity active:opacity-80"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.customerName}
                        fill
                        sizes="(max-width: 768px) 33vw, 170px"
                        className="object-cover object-top"
                      />
                      {item.customerName && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                          <p className="truncate text-[10px] font-black text-white">{publicAuthorName(item.customerName)}</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Merkliste panel */}
      {showMerkliste && <MerklistePanel onClose={() => { setShowMerkliste(false); stripPanelParam(); }} />}

      {/* User panel */}
      {showUserPanel && <UserPanel onClose={() => { setShowUserPanel(false); setSavedAutoOpen(false); stripPanelParam(); }} openSaved={savedAutoOpen} />}
      {paywallModal}

      {/* ── Admin: add a real Luxury Bandi garment from a photo ── */}
      {addOpen && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => !agBusy && setAddOpen(false)}>
          <div className="w-full max-w-[440px] rounded-t-3xl bg-white p-5" onClick={e => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
            <p className="text-base font-black text-black">Kleidungsstück hinzufügen</p>
            <p className="mb-3 text-[12px] font-bold text-black/45">Foto hochladen — Name, Beschreibung &amp; Typ werden automatisch generiert. Optional das Stück freistellen (Person/Hintergrund weg).</p>
            <button type="button" onClick={() => agFileRef.current?.click()}
              className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-black/15 bg-black/[0.02]">
              {agImage
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={agImage} alt="" className="h-full w-full object-contain" />
                : <span className="flex flex-col items-center gap-1 text-black/35"><ImageIcon className="h-8 w-8" /><span className="text-xs font-black">Foto wählen</span></span>}
            </button>
            <input ref={agFileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void onAgFile(f); }} />
            <input type="url" value={agUrl} onChange={e => setAgUrl(e.target.value)} placeholder="Oder Produkt-/Affiliate-URL einfügen (Bild wird geholt)"
              className="mt-3 h-11 w-full rounded-xl border border-black/12 bg-black/[0.02] px-3 text-sm font-bold text-black outline-none focus:border-black/40" />
            <input type="text" value={agName} onChange={e => setAgName(e.target.value)} placeholder="Name — leer lassen = wird generiert"
              className="mt-2 h-11 w-full rounded-xl border border-black/12 bg-black/[0.02] px-3 text-sm font-bold text-black outline-none focus:border-black/40" />
            {/* Wrap (not horizontal scroll) so every category — incl. Lingerie — is visible. */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setAgCategory("")}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${agCategory === "" ? "bg-black text-white" : "bg-black/[0.06] text-black/55"}`}>Auto</button>
              {LOOK_CATEGORIES.map(c => (
                <button key={c.slug} type="button" onClick={() => setAgCategory(c.slug)}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${agCategory === c.slug ? "bg-black text-white" : "bg-black/[0.06] text-black/55"}`}>{c.slug === "boudoir" ? "Lingerie" : c.label}</button>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-[13px] font-black text-black/70">
              <input type="checkbox" checked={agExtract} onChange={e => setAgExtract(e.target.checked)} className="h-4 w-4" />
              Freistellen (Person entfernen → sauberes Produktfoto)
            </label>
            <button type="button" onClick={submitAddGarment} disabled={agBusy || (!agImage && !agUrl.trim())}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-sm font-black text-white active:scale-95 transition-transform disabled:opacity-40">
              {agBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {agBusy ? "Wird hinzugefügt …" : "Zur Garderobe hinzufügen"}
            </button>
            {agMsg && <p className="mt-2 text-center text-[12px] font-bold text-black/50">{agMsg}</p>}
          </div>
        </div>
      )}

      {/* ── Admin: add / manage a Model (name, style, bio, photo, hide, delete) ── */}
      {isAdmin && mModelId && (() => {
        const isNew = mModelId === "new";
        const m = isNew ? null : models.find(x => x.id === mModelId);
        if (!isNew && !m) return null;
        const previewPhoto = mmPhoto || m?.photoUrl || "";
        return (
          <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => !mmBusy && closeModelManage()}>
            <div className="w-full max-w-[440px] max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-white p-5" onClick={e => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}>
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
              <div className="mb-3 flex items-center justify-between">
                <p className="text-base font-black text-black">{isNew ? "Neues Model" : "Model verwalten"}</p>
                <button type="button" onClick={closeModelManage} className="grid h-8 w-8 place-items-center rounded-full bg-black/5"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => mmPhotoRef.current?.click()}
                  className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-neutral-50">
                  {previewPhoto
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={previewPhoto.startsWith("data:") ? previewPhoto : optImg(previewPhoto, 300)} alt="" className="h-full w-full object-cover object-top"
                        onError={(e) => { const im = e.currentTarget; if (!previewPhoto.startsWith("data:") && im.src !== previewPhoto) im.src = previewPhoto; }} />
                    : <span className="grid h-full w-full place-items-center text-black/30"><ImageIcon className="h-6 w-6" /></span>}
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[9px] font-black text-white">Foto</span>
                </button>
                <div className="grid min-w-0 flex-1 gap-2">
                  <input value={mmName} onChange={e => setMmName(e.target.value)} placeholder="Name"
                    className="h-10 w-full rounded-lg border border-black/12 bg-black/[0.02] px-3 text-sm font-bold text-black outline-none focus:border-black/40" />
                  <input value={mmStyle} onChange={e => setMmStyle(e.target.value)} placeholder="Stil (z.B. Drama, tastefully)"
                    className="h-10 w-full rounded-lg border border-black/12 bg-black/[0.02] px-3 text-sm font-bold text-black outline-none focus:border-black/40" />
                </div>
              </div>
              <textarea value={mmBio} onChange={e => setMmBio(e.target.value)} rows={3} placeholder="Beschreibung / Bio"
                className="mt-2 w-full resize-none rounded-lg border border-black/12 bg-black/[0.02] px-3 py-2 text-[13px] text-black outline-none focus:border-black/40" />
              <input ref={mmPhotoRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) void onModelPhoto(f); e.currentTarget.value = ""; }} />
              {!isNew && m && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => void startModelCrop(m)} disabled={mmBusy}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/[0.08] py-2.5 text-[12px] font-black text-amber-600 active:scale-95 transition disabled:opacity-50">
                    <Crop className="h-4 w-4" /> Zuschneiden
                  </button>
                  <button type="button" onClick={() => toggleModelHidden(m)} disabled={mmBusy}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-black/12 bg-black/[0.02] py-2.5 text-[12px] font-black text-black active:scale-95 transition disabled:opacity-50">
                    {m.hidden ? <><Eye className="h-4 w-4" /> Einblenden</> : <><EyeOff className="h-4 w-4" /> Ausblenden</>}
                  </button>
                  <button type="button" onClick={() => deleteModel(m)} disabled={mmBusy}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/[0.06] py-2.5 text-[12px] font-black text-red-500 active:scale-95 transition disabled:opacity-50">
                    <Trash2 className="h-4 w-4" /> Löschen
                  </button>
                </div>
              )}
              <button type="button" onClick={saveModel} disabled={mmBusy}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-sm font-black text-white active:scale-95 transition disabled:opacity-40">
                {mmBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : (isNew ? <><UserPlus className="h-4 w-4" /> Model hinzufügen</> : "Speichern")}
              </button>
              {mmMsg && <p className="mt-2 text-center text-[12px] font-bold text-black/50">{mmMsg}</p>}
            </div>
            {/* 3:4 cropper for the CURRENT photo — z-raised above the sheet (z-96);
                stopPropagation so taps inside don't hit the close-backdrop. */}
            {mmCropSrc && (
              <div className="relative z-[120]" onClick={e => e.stopPropagation()}>
                <PhotoCropper src={mmCropSrc} aspect="portrait"
                  onCancel={() => setMmCropSrc("")}
                  onDone={(dataUrl) => { void finishModelCrop(dataUrl); }} />
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Admin: manage a Garderobe garment (edit text / move category / replace / hide / delete) ── */}
      {isAdmin && gManageId && (() => {
        const gm = garments.find(g => g.id === gManageId);
        if (!gm) return null;
        const img = (gm.frontImageUrl ?? gm.imageUrl) as string;
        const hidden = gm.published === false;
        return (
          <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => !gmBusy && closeGManage()}>
            <div className="w-full max-w-[440px] max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-white p-5" onClick={e => e.stopPropagation()} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}>
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
              <div className="mb-3 flex items-center justify-between">
                <p className="text-base font-black text-black">Kleidungsstück verwalten</p>
                <button type="button" onClick={closeGManage} className="grid h-8 w-8 place-items-center rounded-full bg-black/5"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex gap-3">
                <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-black/8 bg-neutral-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={optImg(img, 300)} alt="" onError={(e) => { const im = e.currentTarget; if (img && im.src !== img) im.src = img; }} className="h-full w-full object-contain" />
                </div>
                <div className="grid min-w-0 flex-1 gap-2">
                  <input value={gmName} onChange={e => setGmName(e.target.value)} placeholder="Name (leer = KI schreibt ihn)"
                    className="h-10 w-full rounded-lg border border-black/12 bg-black/[0.02] px-3 text-sm font-bold text-black outline-none focus:border-black/40" />
                  <textarea value={gmDesc} onChange={e => setGmDesc(e.target.value)} rows={3} placeholder="Beschreibung (leer = KI schreibt sie)"
                    className="w-full resize-none rounded-lg border border-black/12 bg-black/[0.02] px-3 py-2 text-[13px] text-black outline-none focus:border-black/40" />
                </div>
              </div>
              <p className="mb-2 mt-4 text-[11px] font-black uppercase tracking-wide text-black/40">Kategorie</p>
              <div className="flex flex-wrap gap-2">
                {LOOK_CATEGORIES.map(c => (
                  <button key={c.slug} type="button" onClick={() => setGmCat(c.slug)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-black transition ${gmCat === c.slug ? "bg-black text-white" : "bg-black/[0.06] text-black/55"}`}>
                    {c.slug === "boudoir" ? "Lingerie" : c.label}
                  </button>
                ))}
              </div>
              <p className="mb-2 mt-4 text-[11px] font-black uppercase tracking-wide text-black/40">Shop-Link</p>
              <input value={gmBuy} onChange={e => setGmBuy(e.target.value)} type="url" inputMode="url" placeholder="https://shop.example.com/produkt…"
                className="h-10 w-full rounded-lg border border-black/12 bg-black/[0.02] px-3 text-[13px] font-bold text-black outline-none focus:border-black/40 placeholder:text-black/30" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button type="button" onClick={() => gmReplaceRef.current?.click()} disabled={gmBusy}
                  className="flex flex-col items-center gap-1 rounded-xl border border-black/12 bg-black/[0.02] py-2.5 text-[11px] font-black text-black active:scale-95 transition disabled:opacity-50">
                  <ImageUp className="h-4 w-4" /> Ersetzen
                </button>
                <button type="button" onClick={() => patchGarment({ published: hidden }, hidden ? "Sichtbar ✓" : "Ausgeblendet ✓")} disabled={gmBusy}
                  className="flex flex-col items-center gap-1 rounded-xl border border-black/12 bg-black/[0.02] py-2.5 text-[11px] font-black text-black active:scale-95 transition disabled:opacity-50">
                  {hidden ? <><Eye className="h-4 w-4" /> Einblenden</> : <><EyeOff className="h-4 w-4" /> Ausblenden</>}
                </button>
                <button type="button" onClick={deleteGManage} disabled={gmBusy}
                  className="flex flex-col items-center gap-1 rounded-xl border border-red-500/25 bg-red-500/[0.06] py-2.5 text-[11px] font-black text-red-500 active:scale-95 transition disabled:opacity-50">
                  <Trash2 className="h-4 w-4" /> Löschen
                </button>
              </div>
              <input ref={gmReplaceRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) void replaceGImage(f); e.currentTarget.value = ""; }} />
              <button type="button" onClick={saveGManage} disabled={gmBusy}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-sm font-black text-white active:scale-95 transition disabled:opacity-40">
                {gmBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
              </button>
              {gmMsg && <p className="mt-2 text-center text-[12px] font-bold text-black/50">{gmMsg}</p>}
            </div>
          </div>
        );
      })()}

      {/* Admin pin bar — appears while selecting MODELS in the gallery. */}
      {isAdmin && modelSelect && (
        <div className="lb-phone-col fixed inset-x-0 bottom-0 z-[85] flex flex-wrap items-center gap-2 border-t border-white/10 bg-[#0d0b0a]/95 px-4 py-3 backdrop-blur"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>
          <span className="shrink-0 text-[12px] font-black text-white/70">{modelSelected.size} ausgewählt</span>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
            <button type="button" disabled={modelPinBusy || !modelSelected.size} onClick={() => void pinSelectedModels(true)}
              className="lb-gold flex items-center gap-1 rounded-full px-3.5 py-2 text-[12px] font-black active:scale-95 transition disabled:opacity-40">
              {modelPinBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} 📌 Oben fixieren
            </button>
            <button type="button" disabled={modelPinBusy || !modelSelected.size} onClick={() => void pinSelectedModels(false)}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3.5 py-2 text-[12px] font-black text-white active:scale-95 transition disabled:opacity-40">
              Lösen
            </button>
          </div>
        </div>
      )}

      {/* Admin bulk-move bar — appears while selecting try-on tiles in the grid. */}
      {isAdmin && tierSelect && (
        <div className="lb-phone-col fixed inset-x-0 bottom-0 z-[85] flex flex-wrap items-center gap-2 border-t border-white/10 bg-[#0d0b0a]/95 px-4 py-3 backdrop-blur"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>
          <span className="shrink-0 text-[12px] font-black text-white/70">{tierSelected.size} ausgewählt</span>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
            <button type="button" disabled={tierBusy || !tierSelected.size} onClick={() => void animateSelected(true)}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-[12px] font-black text-white active:scale-95 transition disabled:opacity-40">▶ Animieren</button>
            <button type="button" disabled={tierBusy || !tierSelected.size} onClick={() => void animateSelected(false)}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-[12px] font-black text-white/70 active:scale-95 transition disabled:opacity-40">⏸ Stopp</button>
            <button type="button" disabled={tierBusy || !tierSelected.size} onClick={() => void pinSelected(true)}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-[12px] font-black text-white active:scale-95 transition disabled:opacity-40">📌 Oben</button>
            <button type="button" disabled={tierBusy || !tierSelected.size} onClick={() => void pinSelected(false)}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-[12px] font-black text-white/70 active:scale-95 transition disabled:opacity-40">Lösen</button>
            {tierFilter !== "public" && (
              <button type="button" disabled={tierBusy || !tierSelected.size} onClick={() => void moveSelectedTo("public")}
                className="lb-gold flex items-center gap-1 rounded-full px-3.5 py-2 text-[12px] font-black active:scale-95 transition disabled:opacity-40">
                {tierBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} → Public
              </button>
            )}
            {tierFilter !== "community" && (
              <button type="button" disabled={tierBusy || !tierSelected.size} onClick={() => void moveSelectedTo("community")}
                className="flex items-center gap-1 rounded-full bg-white/10 px-3.5 py-2 text-[12px] font-black text-white active:scale-95 transition disabled:opacity-40">
                {tierBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} → Community
              </button>
            )}
            {tierFilter !== "private" && (
              <button type="button" disabled={tierBusy || !tierSelected.size} onClick={() => void moveSelectedTo("private")}
                className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-3.5 py-2 text-[12px] font-black text-amber-400 active:scale-95 transition disabled:opacity-40">
                {tierBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} → Private
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Grid tile detail = the SAME HomeFeed reel (identical layout to the feed),
           opened at the tapped try-on (or look for tryon-less tiles). Home closes it. ── */}
      {feedOpen && looks.length > 0 && (
        <div className="fixed inset-0 z-[90] bg-black">
          <HomeFeed
            key={feedOpen.tryOnId || feedOpen.lookId}
            looks={looksForFeed}
            initialTryOnId={feedOpen.tryOnId}
            initialLookId={feedOpen.lookId}
            onClose={closeFeedOverlay}
          />
        </div>
      )}
    </div>
  );
}

export default function StoresPageWrapper() {
  return (
    <Suspense>
      <StoresPage />
    </Suspense>
  );
}
