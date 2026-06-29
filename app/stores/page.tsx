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
import HomeFeed from "@/components/HomeFeed";
import { isAdminEmail } from "@/lib/is-admin-email";
import { LOOK_CATEGORIES, isHiddenFromAll, type LookCategory } from "@/lib/look-category";
import { Bookmark, EyeOff, Heart, Home, Image as ImageIcon, Info, Instagram, LayoutGrid, Loader2, LogOut, MessageCircle, Play, Search, Send, ShoppingBag, Sparkles, User, UserPlus, Volume2, VolumeX, X } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

// Serve Supabase images via Next.js' image optimizer (right-sized WebP) instead
// of full-resolution PNGs. Non-Supabase/empty URLs pass through unchanged.
function optImg(url: string | undefined, w = 1080, q = 70): string {
  if (!url || !url.includes("/storage/v1/")) return url ?? "";
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=${q}`;
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
  if (videoUrl) slides.push({ kind: "video", url: videoUrl });
  // 1) the generated (After) image on its own — the hero of the post.
  if (imageUrl) slides.push({ kind: "image", url: imageUrl });
  // 2) then the Before | After split (only when there's an uploaded Before photo).
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
  thumbUrl?: string;
  userPhotoUrl?: string;
  customerName: string;
  lookName: string;
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
        {/* Slide dots — show how many previews there are + where you are */}
        {slides.length > 1 && (
          <div className="absolute top-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === hIdx ? "w-5 bg-white" : "w-1.5 bg-white/45"}`} />
            ))}
          </div>
        )}
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/50 to-transparent pointer-events-none" />
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-4 pt-12" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        {/* ── The two core money buttons over the image ── */}
        {it.lookId && (
          <div className="mb-2.5 flex flex-wrap items-center justify-center gap-2.5">
            <a href={`/tryon/${it.lookId}`}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-white/80 px-5 text-sm font-black text-black backdrop-blur-md active:scale-95 transition-transform">
              <Sparkles className="h-4 w-4" /> Try on you
            </a>
            {/* Make AI-Video — ONLY on the user's OWN AI-picture post (no video yet).
                Owner → opens the try-on flow (video + 360° tiers). Staff keep the
                inline one-tap generate on any post (content seeding). */}
            {!it.videoUrl && it.mine && !isStaff && (
              <a href={`/tryon/${it.lookId}?make=video`}
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
            <a href={`${lookPath(it.lookName, it.lookId)}/details`}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/30 bg-black/35 px-5 text-sm font-black text-white backdrop-blur-md active:scale-95 transition-transform">
              <ShoppingBag className="h-4 w-4" /> Bandit the look
            </a>
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
                  : <img src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(creatorName)}&backgroundColor=ffffff&fontColor=000000&fontSize=40`}
                      alt={creatorName} className="h-9 w-9 shrink-0 rounded-full bg-white/10 object-cover" />}
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{creatorName}</p>
                  {it.lookName && <p className="truncate text-[11px] font-bold text-white/50">{it.lookName}{it.storeName ? ` · ${it.storeName}` : ""}</p>}
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
                <p className="truncate text-sm font-black text-white">{it.lookName}</p>
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
  router: ReturnType<typeof import("next/navigation").useRouter>;
}) {
  const [currentIdx, setCurrentIdx] = useState(initialIndex);
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
  const [curator, setCurator] = useState<{ firstName?: string } | null>(null);
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
        window.location.href = "/user/myaccount"; // land on the dashboard, not the feed
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
        setError("No curator found with that email. Become a curator first.");
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

        {/* Curator studio entry — ONLY for actual curators (separate curator session).
            No self-signup: normal users see nothing here. */}
        {curator && (
          <a href="/studio"
            className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-black px-4 py-3.5 text-white active:scale-[0.99] transition-transform">
            <span className="min-w-0">
              <span className="block text-sm font-black">Open your studio{curator.firstName ? `, ${curator.firstName}` : ""}</span>
              <span className="block text-[11px] font-bold text-white/55">Find trends · publish looks</span>
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
                <p className="truncate text-sm font-black text-ink">{curator.firstName || "Curator"}</p>
                <p className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Signed in as curator
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
              Sign in as curator (email above)
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
  const [adminPin, setAdminPin] = useState("");
  // Creators list (admin) for the in-feed "Assign to creator" picker (name + photo).
  const [assignCurators, setAssignCurators] = useState<{ id: string; firstName?: string; lastName?: string; photoUrl?: string }[]>([]);
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
  const [feedSelectMode, setFeedSelectMode] = useState(false);
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

  // React to bottom-nav deep links whenever search params change
  useEffect(() => {
    const panel = searchParams.get("panel");
    const tab = searchParams.get("tab");
    if (panel === "account") { setShowUserPanel(true); setSavedAutoOpen(false); setShowMerkliste(false); }
    if (panel === "saved") { setShowMerkliste(true); setShowUserPanel(false); }
    // Community try-on feed retired — always show the Trends feed.
    void tab;
  }, [searchParams]);

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
    fetch("/api/try-this-look")
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
    let items = communityItems;
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

  // Discover = ONE mixed archive: looks, curator videos AND try-ons, by timestamp.
  const historyItems = useMemo(() => {
    type HItem = { key: string; kind: "look" | "tryon"; id: string; lookId: string; thumb: string; videoUrl?: string; videoPoster?: string; hasBefore?: boolean; aiCreated?: boolean; brand?: string; category?: LookCategory; createdAt: string; name: string; price?: string | null; curatorName?: string; curatorPhoto?: string };
    const items: HItem[] = [];
    const lookById = new Map(looks.map((l) => [l.id, l]));
    for (const l of looks) {
      const thumb = l.frontImageUrl || l.imageUrl;
      // Poster only when it's a REAL model frame (never the floating product); else
      // the video tile shows the video's own first frame.
      const videoPoster = l.videoPosterUrl || l.tryOnImageUrl || undefined;
      // Sort by the most recent activity: a freshly generated video beats publish
      // date. Fall back to the timestamp embedded in the video filename for older ones.
      const videoTs = l.videoCreatedAt || tsFromVideoUrl(l.videoUrl) || "";
      const when = videoTs > (l.createdAt ?? "") ? videoTs : (l.createdAt ?? "");
      items.push({ key: `look-${l.id}`, kind: "look", id: l.id, lookId: l.id, thumb, videoUrl: l.videoUrl, videoPoster, aiCreated: l.aiCreated, brand: l.brand, category: l.category, createdAt: when, name: l.name, price: feedPrice(l), curatorName: l.curatorName, curatorPhoto: l.curatorPhotoUrl });
    }
    for (const c of communityItems) {
      // A try-on still IS a real model frame → use it as the video poster.
      const srcLook = lookById.get(c.lookId);
      items.push({ key: `tryon-${c.id}`, kind: "tryon", id: c.id, lookId: c.lookId, thumb: c.imageUrl, videoUrl: c.videoUrl, videoPoster: c.imageUrl, hasBefore: !!c.userPhotoUrl, brand: c.brand, category: c.category ?? srcLook?.category, createdAt: c.createdAt ?? "", name: c.customerName || c.lookName, price: srcLook ? feedPrice(srcLook) : null, curatorName: c.customerName });
    }
    items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    // Dedupe only the LOOK tiles by look (one tile per product, prefer the video).
    // EVERY community try-on keeps its own tile — so different people's try-ons
    // (Denisa, Anonymous, …) all show; they are not collapsed into the look.
    const score = (it: HItem) => (it.videoUrl ? 2 : 0) + (it.hasBefore ? 1 : 0);
    const byLook = new Map<string, HItem>();
    const tryons: HItem[] = [];
    for (const it of items) {
      if (it.kind === "tryon") { tryons.push(it); continue; }
      const key = it.lookId || it.key;
      const cur = byLook.get(key);
      if (!cur || score(it) > score(cur)) byLook.set(key, it);
    }
    return [...byLook.values(), ...tryons].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [looks, communityItems]);

  // Distinct curators with content (looks or try-ons) — for the header count.
  const curatorCount = useMemo(() => {
    const set = new Set<string>();
    for (const l of looks) if (l.curatorName) set.add(l.curatorName.toLowerCase());
    for (const c of communityItems) if (c.customerName) set.add(c.customerName.toLowerCase());
    return set.size;
  }, [looks, communityItems]);

  // The base feed: what PEOPLE generate (try-ons, image or video) + curator look
  // VIDEOS. Never a flat product/clothing still — those are "Kleidungsstücke".
  const feedItems = useMemo(
    () => historyItems.filter(it => it.kind === "tryon" || !!it.videoUrl),
    [historyItems],
  );
  // Category chips — only the editorial categories that actually have content. Boudoir
  // appears as a chip (so it's reachable) even though it's hidden from "All".
  const categoryChips = useMemo(() => {
    const present = new Set<LookCategory>();
    for (const it of feedItems) if (it.category) present.add(it.category);
    return LOOK_CATEGORIES.filter(c => present.has(c.slug));
  }, [feedItems]);
  const visibleHistory = useMemo(() => {
    let items = categoryFilter
      ? feedItems.filter(it => it.category === categoryFilter)
      // "All" → everything EXCEPT the hidden-from-All categories (Boudoir/lingerie).
      : feedItems.filter(it => !(it.category && isHiddenFromAll(it.category)));
    const q = query.trim().toLowerCase();
    if (q) items = items.filter(it => `${it.name} ${it.curatorName ?? ""}`.toLowerCase().includes(q));
    return items;
  }, [feedItems, categoryFilter, query]);
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
            lookId: it.kind === "look" ? it.id : "",
            imageUrl: it.videoPoster || it.thumb,
            videoUrl: it.videoUrl,
            thumbUrl: it.thumb,
            customerName: it.kind === "tryon" ? (it.curatorName ?? "") : "",
            lookName: it.name,
            storeName: lookById.get(it.id)?.storeName ?? "",
            storeSlug: lookById.get(it.id)?.storeSlug ?? "",
            curatorId: lookById.get(it.id)?.curatorId,
            curatorName: it.curatorName,
            curatorPhotoUrl: it.curatorPhoto,
            brand: it.brand,
            kind: "look",
            createdAt: it.createdAt,
          };
      return { ...base, slides: buildSlides(base.imageUrl, base.videoUrl, base.userPhotoUrl) };
    });
  }, [visibleHistory, looks, communityItems]);
  // The community-only grid mapped with preview slides too.
  const filteredCommunityAsReel = useMemo<CommunityItem[]>(() => {
    return filteredCommunity.map(c => ({ ...c, kind: "tryon" as const, slides: buildSlides(c.imageUrl, c.videoUrl, c.userPhotoUrl) }));
  }, [filteredCommunity]);

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

  // ── DEFAULT HOME = full-screen vertical reels feed (TikTok/IG style) ──
  if (!searchOpen && showReels) {
    if (!visibleHistoryAsReel.length) {
      return (
        <div className="grid min-h-dvh place-items-center bg-black" style={{ maxWidth: "100vw" }}>
          <Loader2 className="h-7 w-7 animate-spin text-white/40" />
        </div>
      );
    }
    return (
      <CommunityDetailView
        allItems={visibleHistoryAsReel}
        initialIndex={0}
        likes={communityLikes}
        onClose={() => router.push("/stores?view=grid")}
        onLikeToggle={(id) => {
          const next = { ...communityLikes, [id]: !(communityLikes[id] ?? false) };
          setCommunityLikes(next);
          try { localStorage.setItem("lb_gen_likes", JSON.stringify(next)); } catch { /**/ }
        }}
        onDelete={isAdmin ? (id) => { const it = visibleHistoryAsReel.find(i => i.id === id); if (it) void deleteCommunityItem(it); } : undefined}
        onAssign={isAdmin ? assignCommunityItem : undefined}
        onInfo={fetchPostInfo}
        curators={assignCurators}
        isAdmin={isAdmin}
        myCuratorId={myCuratorId}
        onHideItem={hideReelItem}
        onMakeVideo={makeLookVideo}
        makingVideoLookId={makingVideoLookId}
        router={router}
      />
    );
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
        {showMerkliste && <MerklistePanel onClose={() => setShowMerkliste(false)} />}
        {showUserPanel && <UserPanel onClose={() => { setShowUserPanel(false); setSavedAutoOpen(false); }} openSaved={savedAutoOpen} />}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white" style={{ maxWidth: "100vw" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/95 backdrop-blur">

        {/* Brand row */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1.5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white text-xs font-black tracking-tight select-none">
              LB
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-widest text-black leading-none">LuxuryBandit</div>
              <div className="text-[10px] font-bold text-black/40 mt-0.5">Bandit the look!</div>
            </div>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-2">
            {/* Search toggle */}
            <button type="button"
              onClick={() => { setSearchOpen(v => !v); if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50); else setQuery(""); }}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                searchOpen ? "border-black bg-black text-white" : "border-black/12 bg-black/4 text-black/50 hover:text-black"
              }`}
              aria-label="Suche">
              <Search className="h-4 w-4" />
            </button>

            <a href={`https://instagram.com/${process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE ?? "luxurybandit"}`} target="_blank" rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/12 bg-black/4 text-black/50 hover:text-black transition"
              aria-label="Instagram">
              <Instagram className="h-4 w-4" />
            </a>

            {/* Messages — moved up from the (removed) bottom bar */}
            <button type="button" onClick={() => router.push("/messages")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/12 bg-black/4 text-black/50 hover:text-black transition"
              aria-label="Messages">
              <MessageCircle className="h-4 w-4" />
            </button>

            {/* Account — opens the profile sheet (lives in BottomNav, via event) */}
            <button type="button" onClick={() => window.dispatchEvent(new Event("lb-open-account"))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/12 bg-black/4 text-black/50 hover:text-black transition"
              aria-label="Account">
              <User className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Collapsible search row */}
        {searchOpen && (
          <div className="flex items-center gap-2 px-3 pb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/30 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={typeFilter === "community" ? "User, Look oder Store…" : "Look, Store oder Preis…"}
                className="h-9 w-full rounded-full border border-black/10 bg-black/[0.03] pl-8 pr-8 text-sm font-bold outline-none focus:border-black/30 placeholder:text-black/25"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded-full bg-black/10 text-black/50 active:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stats row */}
        {!isLoading && (
          <div className="flex gap-6 px-4 pb-1.5">
            <div className="text-center">
              <div className="text-sm font-black text-black leading-none">{looks.length}</div>
              <div className="text-[10px] font-bold text-black/35 mt-0.5">listings</div>
            </div>
            {curatorCount > 0 && (
              <div className="text-center">
                <div className="text-sm font-black text-black leading-none">{curatorCount}</div>
                <div className="text-[10px] font-bold text-black/35 mt-0.5">Curator{curatorCount !== 1 ? "s" : ""}</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-sm font-black text-black leading-none">{looks.filter(l => l.inStock !== false).length}</div>
              <div className="text-[10px] font-bold text-black/35 mt-0.5">available</div>
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
                Hidden while filtering/searching to keep browsing clean. */}
            {!categoryFilter && !searchOpen && (
              <section className="px-4 pt-4 pb-3">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cobalt">LuxuryBandit</p>
                <h1 className="mt-1.5 text-[1.7rem] font-black leading-[1.1] tracking-tight text-black">
                  See how every brand<br />looks on <span className="text-cobalt">you</span>.
                </h1>
                <p className="mt-2 max-w-md text-sm font-medium leading-6 text-black/55">
                  Try any luxury look on your own photo — as a photo <span className="font-black text-black/70">and</span> a 5-second video.
                  Be the brand, find the trend, and shop it at any price.
                </p>
                <div className="mt-3 grid gap-1.5">
                  {[
                    [<ShoppingBag key="i" className="h-4 w-4 text-cobalt" />, "Bandit the look", "From the real luxury piece down to the best dupe."],
                    [<Sparkles key="i" className="h-4 w-4 text-cobalt" />, "Make a try-on", "Any look, on you, in seconds — photo + video."],
                    [<Heart key="i" className="h-4 w-4 text-cobalt" />, "Save your favourites", "Like looks, build your feed, shop when you're ready."],
                  ].map(([icon, title, text], i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="mt-0.5 shrink-0">{icon as React.ReactNode}</span>
                      <p className="text-[13px] leading-snug text-black/70">
                        <span className="font-black text-black">{title as string}</span> — {text as string}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3.5 flex items-center gap-2">
                  <button type="button" onClick={() => router.push("/stores")}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-black px-5 text-sm font-black text-white active:scale-95 transition-transform">
                    <Sparkles className="h-4 w-4" /> Explore the feed
                  </button>
                  <button type="button" onClick={() => router.push("/about")}
                    className="flex h-10 items-center justify-center rounded-full border border-black/15 bg-white px-5 text-sm font-black text-black active:scale-95 transition-transform">
                    How it works
                  </button>
                </div>
              </section>
            )}

            {/* Editorial category chips (After Dark / Riviera / Off-Duty / Boudoir) —
                NEVER brand names. "All" excludes Boudoir; pick the Boudoir chip to see it. */}
            {categoryChips.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button type="button" onClick={() => setCategoryFilter(null)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${categoryFilter === null ? "bg-black text-white" : "bg-black/[0.06] text-black/55"}`}>
                  All
                </button>
                {categoryChips.map(c => (
                  <button key={c.slug} type="button" onClick={() => setCategoryFilter(c.slug)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${categoryFilter === c.slug ? "bg-black text-white" : "bg-black/[0.06] text-black/55"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-0.5">
              {visibleHistory.map((it, idx) => (
                <div key={it.key} className="flex flex-col">
                  <button type="button"
                    onClick={() => { setReelItems(visibleHistoryAsReel); setCommunitySelectedIndex(idx); }}
                    className="relative aspect-square overflow-hidden bg-black/5 transition-opacity active:opacity-80">
                    {it.videoUrl ? (
                      // Video tile — always show a still poster so the tile is never a
                      // black box: the model poster if we have one, else the look's own
                      // image, and only as a last resort the video's first frame.
                      (() => { const poster = it.videoPoster || it.thumb; return (
                        <video src={poster ? it.videoUrl : `${it.videoUrl}#t=0.1`} poster={poster || undefined} muted playsInline preload="metadata"
                          className="h-full w-full bg-black object-cover object-top" />
                      ); })()
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={optImg(it.thumb, 400)} alt={it.name} loading="lazy" decoding="async"
                        onError={(e) => { const im = e.currentTarget; if (it.thumb && im.src !== it.thumb) im.src = it.thumb; }}
                        className="h-full w-full object-cover object-top" />
                    )}
                    {it.videoUrl && (
                      <span className="pointer-events-none absolute inset-0 grid place-items-center"><Play className="h-11 w-11 fill-white text-white opacity-45 drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]" /></span>
                    )}
                    {/* Label at the BOTTOM — the face is usually at the top of the crop */}
                    <span className="absolute left-1.5 bottom-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white backdrop-blur">
                      {it.kind === "tryon"
                        ? (it.videoUrl ? "Try-on · video" : "Try-on")
                        : it.aiCreated
                          ? "✦ Original"
                          : "Curated"}
                    </span>
                  </button>
                  <div className="flex items-center gap-1.5 px-2 pt-1 pb-1.5 bg-white">
                    {it.curatorName && (
                      <span className="flex h-4 w-4 shrink-0 overflow-hidden rounded-full bg-black/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.curatorPhoto || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(it.curatorName)}&backgroundColor=000000&fontColor=ffffff`} alt="" className="h-full w-full object-cover" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[9px] font-black text-black/70">{it.curatorName || it.name}</span>
                    {it.price && <span className="shrink-0 text-[9px] font-black text-ink">{it.price}</span>}
                  </div>
                </div>
              ))}
            </div>
            {categoryFilter && visibleHistory.length === 0 && (
              <p className="py-16 text-center text-sm font-black text-black/40">Nothing in this category yet.</p>
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
              <div className="grid grid-cols-3 gap-0.5">
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
                          // Open the full-screen vertical scroll feed (reels) starting here.
                          setReelItems(filteredCommunityAsReel); setCommunitySelectedIndex(itemIdx);
                        }}
                        className={`relative aspect-square w-full overflow-hidden bg-black/5 transition-opacity active:opacity-80 block ${
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
                            <img src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(item.customerName)}&backgroundColor=000000&fontColor=ffffff&fontSize=40`}
                              alt={item.customerName} className="h-full w-full object-cover" />
                          </a>
                        ) : null}
                        <span className="min-w-0 flex-1 truncate text-[9px] font-black text-black/70">
                          {item.customerName || item.lookName}
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
              Curators spot the trends and pick the real products worth buying. Every look comes with
              shop options across budgets — and you can try it on with AI, on your own photo, before you buy.
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
            <div className="grid grid-cols-3 gap-0.5">
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
                      className="relative aspect-square overflow-hidden bg-black/5 transition-opacity active:opacity-80"
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
                        <img src={look.curatorPhotoUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(look.curatorName || look.storeSlug || "LB")}&backgroundColor=000000&fontColor=ffffff`}
                          alt="" className="h-full w-full object-cover" />
                      </button>
                      <span className="min-w-0 flex-1 truncate text-[9px] font-black text-black/70">
                        {look.curatorName || look.storeName || look.storeSlug || ""}
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
                <div className="grid grid-cols-3 gap-0.5">
                  {filteredCommunity.map((item, itemIdx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => router.push(`/post/${item.id}`)}
                      className="relative aspect-square overflow-hidden bg-black/5 transition-opacity active:opacity-80"
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
                          <p className="truncate text-[10px] font-black text-white">{item.customerName}</p>
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
      {showMerkliste && <MerklistePanel onClose={() => setShowMerkliste(false)} />}

      {/* User panel */}
      {showUserPanel && <UserPanel onClose={() => { setShowUserPanel(false); setSavedAutoOpen(false); }} openSaved={savedAutoOpen} />}

      {/* ── Community detail fullscreen ── */}
      {communitySelectedIndex !== null && (reelItems ?? filteredCommunity).length > 0 && (
        <CommunityDetailView
          allItems={reelItems ?? filteredCommunity}
          initialIndex={Math.min(communitySelectedIndex, (reelItems ?? filteredCommunity).length - 1)}
          likes={communityLikes}
          onClose={() => { setCommunitySelectedIndex(null); setReelItems(null); }}
          onLikeToggle={(id) => {
            const next = { ...communityLikes, [id]: !(communityLikes[id] ?? false) };
            setCommunityLikes(next);
            try { localStorage.setItem("lb_gen_likes", JSON.stringify(next)); } catch { /**/ }
          }}
          onHide={isAdmin ? (id) => { const it = (reelItems ?? filteredCommunity).find(i => i.id === id); if (it) void hideCommunityItem(it); } : undefined}
          onDelete={isAdmin ? (id) => { const it = (reelItems ?? filteredCommunity).find(i => i.id === id) ?? visibleHistoryAsReel.find(i => i.id === id); if (it) void deleteCommunityItem(it); } : undefined}
          onAssign={isAdmin ? assignCommunityItem : undefined}
          onInfo={fetchPostInfo}
          curators={assignCurators}
          isAdmin={isAdmin}
          myCuratorId={myCuratorId}
          onHideItem={hideReelItem}
        onMakeVideo={makeLookVideo}
        makingVideoLookId={makingVideoLookId}
          router={router}
        />
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
