"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Bookmark, Send, Sparkles, X, Loader2, Volume2, VolumeX, CornerDownRight, Info, Play, MapPin, Home } from "lucide-react";
import { lookPath } from "@/lib/look-slug";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { isAdminEmail } from "@/lib/is-admin-email";
import { safeLookImage } from "@/lib/look-image";
import { cleanEscapes } from "@/lib/reel-audit";

export type FeedLook = {
  id: string;
  name: string;
  imageUrl: string;
  frontImageUrl?: string;
  curatorId?: string;
  curatorName?: string;
  curatorPhotoUrl?: string;
  curatorNote?: string;
  productNote?: string;
  videoUrl?: string;
  videoPosterUrl?: string;
  tryOnImageUrl?: string;
  communityTryOns?: { imageUrl: string; videoUrl?: string; name?: string }[];
  feedOrder?: number;
  aiCreated?: boolean;
  lingerie?: boolean;
  commentsOff?: boolean;
  likeCount?: number;
  createdAt?: string;
  alternatives?: { title?: string; link?: string; source?: string; thumbnail?: string; price?: string; priceValue?: number; currency?: string; lingerie?: boolean }[];
  locationDupes?: { title?: string; link?: string; source?: string; thumbnail?: string; price?: string; region?: string }[];
  price?: string;
  salePrice?: string;
  buyUrl?: string;
  storeName?: string;
};

type ShopAlt = NonNullable<FeedLook["alternatives"]>[number];

// Shoppable price range across a look's options — "$35–$475".
function priceRange(look: FeedLook): string | null {
  const withVal = (look.alternatives ?? []).filter(a => typeof a.priceValue === "number" && (a.priceValue as number) > 0);
  if (withVal.length) {
    const byCur: Record<string, number[]> = {};
    for (const a of withVal) { const c = a.currency || "$"; (byCur[c] ??= []).push(a.priceValue as number); }
    const cur = Object.keys(byCur).sort((a, b) => byCur[b].length - byCur[a].length)[0];
    const v = byCur[cur]; const lo = Math.min(...v), hi = Math.max(...v);
    const f = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(2);
    return lo === hi ? `${cur}${f(lo)}` : `${cur}${f(hi)}–${cur}${f(lo)}`;
  }
  const raw = String(look.salePrice ?? look.price ?? "").trim();
  if (!raw) return null;
  return /^[\d.,]+$/.test(raw) ? `$${raw}` : raw;
}

function isAuthed() {
  try { if (JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id) return true; } catch { /**/ }
  try { return !!JSON.parse(localStorage.getItem("sb-session") ?? "{}")?.access_token; } catch { return false; }
}

function RailButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
      <span className={`drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.95)] ${active ? "text-rose-500" : "text-white"}`}>{icon}</span>
      <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.95)]">{label}</span>
    </button>
  );
}

function Slide({ look, onComment, muted, setMuted, index, onActive, single = false }: { look: FeedLook; onComment: (look: FeedLook) => void; muted: boolean; setMuted: (fn: (m: boolean) => boolean) => void; index: number; onActive: (i: number) => void; single?: boolean }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(look.likeCount ?? 0);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [vidFailed, setVidFailed] = useState(false); // autoplay blocked → show a Play button
  const [paused, setPaused] = useState(false); // user tapped the video to pause
  const pausedRef = useRef(false); pausedRef.current = paused;
  const [infoOpen, setInfoOpen] = useState(false);
  // Who-tried-this-on is a business secret → only the admin sees the named list.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    try {
      const pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      const email = getStoredAuthSession()?.user?.email?.toLowerCase();
      setIsAdmin(!!pin || (!!email && (isAdminEmail(email) || email === "support@luxurybandit.com")));
    } catch { /**/ }
  }, []);
  const [infoData, setInfoData] = useState<Record<string, any> | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const openLookInfo = async () => {
    setInfoOpen(true); setInfoData(null); setInfoLoading(true);
    try {
      const pin = (() => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } })();
      const res = await fetch(`/api/try-this-look?postInfo=${encodeURIComponent(look.id)}`, { headers: pin ? { "x-try-look-admin-pin": pin } : {} });
      setInfoData(res.ok ? (await res.json())?.info ?? null : null);
    } catch { setInfoData(null); }
    setInfoLoading(false);
  };
  // All videos in this slide's carousel (curator + community), keyed by slide index.
  const videoRefs = useRef<Record<number, HTMLVideoElement>>({});
  const carouselRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  // Carousel order: ALL curator-created content first — try-on VIDEOS, then try-on
  // PHOTOS (most engaging — what the user asked for) — then the look's own video,
  // the product image, and finally the shop options.
  // Shop options: dedupe by link, then most expensive first (items without a
  // price go last) — a clean high→low range instead of a jumble.
  const shopAlts = (() => {
    const seen = new Set<string>();
    return (look.alternatives ?? [])
      .filter(a => a?.thumbnail && a?.link && !seen.has(a.link!) && seen.add(a.link!))
      .sort((a, b) => {
        const av = typeof a.priceValue === "number" && a.priceValue > 0 ? a.priceValue : -1;
        const bv = typeof b.priceValue === "number" && b.priceValue > 0 ? b.priceValue : -1;
        return bv - av;
      })
      .slice(0, 8);
  })();
  // Licensing-safe hero still: our created image only (AI render / video poster),
  // never the scraped original product photo of a curated look.
  const heroImg = safeLookImage(look);
  const community = (look.communityTryOns ?? []).filter(c => c?.imageUrl);
  const communityVideos = community
    .filter(c => c.videoUrl)
    .map(c => ({ type: "cvideo" as const, url: c.videoUrl as string, name: c.name }));
  const communityPhotos = community.map(c => ({ type: "cphoto" as const, url: c.imageUrl, name: c.name }));
  const media: (
    | { type: "video" }
    | { type: "image" }
    | { type: "cvideo"; url: string; name?: string }
    | { type: "cphoto"; url: string; name?: string }
    | { type: "product"; alt: ShopAlt }
  )[] = [
    // Try-ons are NOT mixed into an Original/Curated post anymore — they live on
    // their own under The A List. A look post shows only its own video + image.
    ...(look.videoUrl ? [{ type: "video" as const }] : []),
    // Still image: only the AI creation, or — for a curated "Studio Web" look — only
    // when there's NO video. A curated look WITH a video never shows a second still
    // (it's redundant and the render/original can be broken). Never the original photo.
    ...(heroImg && (look.aiCreated || !look.videoUrl) ? [{ type: "image" as const }] : []),
    // Shop options are NOT shown in the feed (no product slides, no list). The
    // dupes are fetched on demand only when the user taps "Bandit the look!".
  ];
  void shopAlts; void communityVideos; void communityPhotos;
  // How many people have tried this look on (distinct names, else photo count).
  const tryOnPeople = new Set(community.map(c => c.name).filter(Boolean)).size || community.length;
  const firstTryOnIdx = media.findIndex(m => m.type === "cphoto" || m.type === "cvideo");
  const scrollToSlide = (i: number) => carouselRef.current?.scrollTo({ left: i * (carouselRef.current.clientWidth || 0), behavior: "smooth" });

  useEffect(() => {
    try { setLiked(!!JSON.parse(localStorage.getItem("lb_post_likes") ?? "{}")[look.id]); } catch { /**/ }
    try { setSaved((JSON.parse(localStorage.getItem("lb_bookmarks") ?? "[]") as string[]).includes(look.id)); } catch { /**/ }
  }, [look.id]);

  // Detect whether the caption is actually truncated (only then show "more").
  useEffect(() => {
    const el = captionRef.current;
    if (el && !expanded) setClamped(el.scrollHeight > el.clientHeight + 2);
  }, [look.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track whether THIS slide is the one on screen (vertical snap).
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting && e.intersectionRatio >= 0.6),
      { threshold: [0, 0.6, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // When this slide scrolls into view, tell the feed to switch the soundtrack to
  // this slide's track (resuming, not restarting).
  useEffect(() => { if (inView) onActive(index); }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drive ALL videos (curator + community) from visibility + carousel position +
  // global mute: only the on-screen, active video plays; every other one is silent.
  // Also called from the videos' onCanPlay so a clip that wasn't buffered yet when
  // it scrolled into view still autostarts (fixes "only plays after tapping sound").
  const syncVideos = () => {
    for (const [idxStr, v] of Object.entries(videoRefs.current)) {
      if (!v) continue;
      const isActiveVideo = inView && Number(idxStr) === active;
      if (isActiveVideo) {
        // Videos always play silent — the feed soundtrack is the only audio, so
        // baked-in per-clip music (Pixverse) never clashes with it.
        v.muted = true;
        if (pausedRef.current) v.pause();
        else v.play().then(() => setVidFailed(false)).catch(() => setVidFailed(true));
      } else {
        v.pause();
        v.muted = true;
      }
    }
  };
  useEffect(() => {
    syncVideos();
  }, [inView, active, muted, paused]); // eslint-disable-line react-hooks/exhaustive-deps
  // Leaving the slide / switching carousel item clears a manual pause so it autoplays again.
  useEffect(() => { setPaused(false); }, [inView, active]);
  // Scrubbing: drag on video to seek (like YouTube). DESKTOP-ONLY — mouse events
  // never fire on a touch device, so on phones a tap goes through handleVideoClick
  // (which fires on iOS) to toggle play/pause instead.
  const scrubRef = useRef<{ isScrubbing: boolean; wasPaused: boolean; justScrubbed: boolean }>({ isScrubbing: false, wasPaused: false, justScrubbed: false });
  const handleVideoMouseDown = () => {
    const v = videoRefs.current[active];
    if (!v || !v.duration) return;
    // Don't pause/scrub yet — wait until the pointer actually moves, so a plain
    // click stays a click (→ play/pause toggle) instead of becoming a scrub.
    scrubRef.current.wasPaused = v.paused;
  };
  const handleVideoMouseMove = (e: React.MouseEvent<HTMLVideoElement>) => {
    const v = videoRefs.current[active];
    if (!v || !v.duration) return;
    if (e.buttons !== 1) return; // only while the primary button is held
    if (!scrubRef.current.isScrubbing) { scrubRef.current.isScrubbing = true; v.pause(); }
    const rect = v.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    v.currentTime = percentage * v.duration;
  };
  const handleVideoMouseUp = () => {
    if (!scrubRef.current.isScrubbing) return;
    const v = videoRefs.current[active];
    scrubRef.current.isScrubbing = false;
    scrubRef.current.justScrubbed = true; // suppress the click that follows a drag
    if (v && !scrubRef.current.wasPaused) {
      v.muted = true;
      v.play().then(() => setVidFailed(false)).catch(() => {});
    }
  };
  // Tap/click the video → toggle play/pause. This is the ONLY video interaction
  // that fires on iOS (mouse events don't), and calling play() here runs inside a
  // user gesture, so a clip whose autoplay was blocked still starts on tap.
  const handleVideoClick = () => {
    if (scrubRef.current.justScrubbed) { scrubRef.current.justScrubbed = false; return; }
    const v = videoRefs.current[active];
    if (!v) return;
    if (v.paused) {
      v.muted = true;
      setPaused(false);
      v.play().then(() => setVidFailed(false)).catch(() => setVidFailed(true));
    } else {
      setPaused(true);
      v.pause();
    }
  };

  const img = heroImg;
  // Still shown for a VIDEO (poster / paused / blocked-autoplay). A video is the
  // curator's own reel, so its uploaded cover (imageUrl) is safe to show even when
  // safeLookImage withholds it. For image-only looks we stay licensing-safe (heroImg).
  const videoStill = look.videoUrl
    ? (look.videoPosterUrl || heroImg || look.frontImageUrl || look.imageUrl || "")
    : heroImg;
  const detail = lookPath(look.name, look.id);
  // When the active carousel slide is a shop option, show its buy card on white below
  // AND make "Try This Look" use THAT product (its clean image), not the look's photo.
  const am = media[active];
  const activeProduct = am && am.type === "product" ? am.alt : null;
  const activeAltIdx = activeProduct
    ? (look.alternatives ?? []).findIndex(a => a?.link === activeProduct.link && a?.thumbnail === activeProduct.thumbnail)
    : -1;
  const tryOnHref = activeAltIdx >= 0 ? `/tryon/${look.id}?alt=${activeAltIdx}` : `/tryon/${look.id}`;
  // Curator's own voice first, else the editorial note — never empty in the feed.
  const caption = (look.curatorNote || look.productNote || "").trim();
  const range = priceRange(look);

  const toggleLike = () => {
    const next = !liked;
    setLiked(next); setLikeCount(c => Math.max(0, c + (next ? 1 : -1)));
    try { const m = JSON.parse(localStorage.getItem("lb_post_likes") ?? "{}"); if (next) m[look.id] = true; else delete m[look.id]; localStorage.setItem("lb_post_likes", JSON.stringify(m)); } catch { /**/ }
    fetch("/api/try-this-look", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "like", lookId: look.id, delta: next ? 1 : -1 }) }).catch(() => {});
  };
  const toggleSave = () => {
    setSaved(s => {
      const next = !s;
      try { const list = JSON.parse(localStorage.getItem("lb_bookmarks") ?? "[]") as string[]; const out = next ? [...new Set([look.id, ...list])] : list.filter(x => x !== look.id); localStorage.setItem("lb_bookmarks", JSON.stringify(out)); } catch { /**/ }
      return next;
    });
  };
  const share = () => {
    const url = `${window.location.origin}${detail}`;
    if (navigator.share) navigator.share({ title: look.name, url }).catch(() => {});
    else navigator.clipboard?.writeText(url).catch(() => {});
  };
  // Follow the curator (next to the name). Mirrors the localStorage + /api/follow
  // pattern used elsewhere; keyed by the curator's name slug.
  const creatorSlug = (look.curatorName || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  useEffect(() => {
    try { const l = JSON.parse(localStorage.getItem("lb_following") ?? "[]"); setFollowing(Array.isArray(l) && l.includes(creatorSlug)); } catch { /**/ }
  }, [creatorSlug]);
  const toggleFollow = () => {
    if (!creatorSlug) return;
    const next = !following;
    setFollowing(next);
    try {
      const l = JSON.parse(localStorage.getItem("lb_following") ?? "[]") as string[];
      localStorage.setItem("lb_following", JSON.stringify(next ? [...new Set([...l, creatorSlug])] : l.filter(s => s !== creatorSlug)));
    } catch { /**/ }
    try { fetch("/api/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: creatorSlug, type: "user" }) }).catch(() => {}); } catch { /**/ }
  };

  // Curator + badge row. Always renders BELOW the video (name + description under
  // the post, Instagram-Reels style) — on the single-look page this also keeps the
  // page's fixed back button (top-left) off the logo/name/badge.
  const headerBar = (
    <div className="z-20 bg-white px-3 pb-2 pt-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => look.curatorId && router.push(`/curator/${look.curatorId}`)}
          className="flex min-w-0 items-center gap-2 active:opacity-80">
          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-black/10 bg-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={look.curatorPhotoUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(look.curatorName || "LB")}&backgroundColor=000000&fontColor=ffffff`} alt="" className="h-full w-full object-cover" />
          </span>
          <span className="truncate text-sm font-black text-black">{look.curatorName || "LuxuryBandit"}</span>
        </button>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${look.aiCreated ? "bg-black text-white" : "bg-black/[0.06] text-black/60"}`}>
          {look.aiCreated ? "✦ Original" : "Curated"}
        </span>
        {creatorSlug && (
          <button type="button" onClick={toggleFollow}
            className={`ml-auto shrink-0 rounded-full px-3.5 py-1 text-xs font-black transition active:scale-95 ${following ? "border border-black/20 text-black/60" : "bg-black text-white"}`}>
            {following ? "Following" : "Follow"}
          </button>
        )}
      </div>
      {/* Caption (description) right under the name, above the video. */}
      {caption && (
        <>
          <p ref={captionRef} className={`mt-1 text-[13px] leading-snug text-black ${expanded ? "" : "line-clamp-1"}`}>{caption}</p>
          {clamped && (
            <button type="button" onClick={() => setExpanded(e => !e)} className="mt-0.5 text-[12px] font-bold text-black/40">
              {expanded ? "less" : "more"}
            </button>
          )}
        </>
      )}
    </div>
  );

  return (
    <section ref={sectionRef} className="relative flex w-full flex-col bg-white">
      {/* ── Media area — vertical format (9:16). Curator name + description render
          BELOW the video (see headerBar block after the media). ── */}
      <div className="relative aspect-[9/16] w-full shrink-0 overflow-hidden bg-black">
        {/* Blurred fill so the whole look stays visible without empty bars */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={videoStill} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-55 blur-2xl" />

        {/* Horizontal media carousel: video first, image second */}
        <div ref={carouselRef} className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const i = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth);
            if (i !== active) setActive(i); // the effect handles play/pause + mute
          }}>
          {media.map((m, i) => (
            <div key={i} className="relative h-full w-full shrink-0 snap-center">
              {m.type === "video" ? (
                <div className="relative h-full w-full">
                  <video ref={el => { if (el) videoRefs.current[i] = el; else delete videoRefs.current[i]; }}
                    src={look.videoUrl} poster={videoStill || undefined} className="h-full w-full object-cover cursor-grab active:cursor-grabbing"
                    onClick={handleVideoClick} onMouseDown={handleVideoMouseDown} onMouseMove={handleVideoMouseMove} onMouseUp={handleVideoMouseUp} onMouseLeave={handleVideoMouseUp} muted loop playsInline preload="metadata" onCanPlay={syncVideos} onLoadedData={syncVideos} />
                  <button type="button" onClick={openLookInfo} onPointerDown={(e) => e.stopPropagation()} title="Info / history" style={{ touchAction: "manipulation" }}
                    className={`absolute ${single ? "left-14" : "left-3"} top-3 z-20 flex items-center gap-1 cursor-pointer rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur transition hover:bg-black/80 active:opacity-70`}>{look.aiCreated ? "✦ AI video" : "Video"}<Info className="ml-1 h-3.5 w-3.5 opacity-90" /></button>
                </div>
              ) : m.type === "cphoto" ? (
                // Community try-on photo (someone wearing this look).
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={`${look.name} on ${m.name ?? "a member"}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={openLookInfo} onPointerDown={(e) => e.stopPropagation()} title="Info / history" style={{ touchAction: "manipulation" }}
                    className={`absolute ${single ? "left-14" : "left-3"} top-3 z-20 flex items-center gap-1 cursor-pointer rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur transition hover:bg-black/80 active:opacity-70`}>{m.name ? `${m.name}'s try-on` : "Member try-on"}<Info className="ml-1 h-3.5 w-3.5 opacity-90" /></button>
                </div>
              ) : m.type === "cvideo" ? (
                // Community try-on video — same sound handling as the curator video.
                <div className="relative h-full w-full">
                  <video ref={el => { if (el) videoRefs.current[i] = el; else delete videoRefs.current[i]; }}
                    src={m.url} className="h-full w-full bg-black object-cover cursor-grab active:cursor-grabbing" onClick={handleVideoClick} onMouseDown={handleVideoMouseDown} onMouseMove={handleVideoMouseMove} onMouseUp={handleVideoMouseUp} onMouseLeave={handleVideoMouseUp} muted loop playsInline preload="metadata" onCanPlay={syncVideos} onLoadedData={syncVideos} />
                  <button type="button" onClick={openLookInfo} onPointerDown={(e) => e.stopPropagation()} title="Info / history" style={{ touchAction: "manipulation" }}
                    className={`absolute ${single ? "left-14" : "left-3"} top-3 z-20 flex items-center gap-1 cursor-pointer rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur transition hover:bg-black/80 active:opacity-70`}>{m.name ? `${m.name}'s video` : "Member video"}<Info className="ml-1 h-3.5 w-3.5 opacity-90" /></button>
                </div>
              ) : m.type === "image" ? (
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={openLookInfo} onPointerDown={(e) => e.stopPropagation()} title="Info / history" style={{ touchAction: "manipulation" }}
                    className={`absolute ${single ? "left-14" : "left-3"} top-3 z-20 flex items-center gap-1 cursor-pointer rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide backdrop-blur transition active:opacity-70 ${look.aiCreated ? "bg-black/70 text-white hover:bg-black/85" : "bg-white/85 text-black/70 hover:bg-white"}`}>
                    {look.aiCreated ? "✦ Original" : "Curated"}<Info className="ml-1 h-3 w-3 opacity-80" />
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Play overlay — when autoplay was blocked (Safari!) OR the user tapped to pause.
            Shows the look's still behind the button so the video is never a black box. */}
        {(media[active]?.type === "video" || media[active]?.type === "cvideo") && (vidFailed || paused) && (
          <button type="button" aria-label="Play"
            onClick={() => { const v = videoRefs.current[active]; if (v) { setPaused(false); v.muted = true; v.play().then(() => setVidFailed(false)).catch(() => {}); } }}
            className="absolute inset-0 z-10 grid place-items-center bg-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={videoStill} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <Play className="relative z-10 h-16 w-16 fill-white/90 text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
          </button>
        )}

        {/* Mute toggle — shown whenever the active carousel slide is a video */}
        {(media[active]?.type === "video" || media[active]?.type === "cvideo") && (
          <button type="button" aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => setMuted(m => !m)}
            className="absolute bottom-3 left-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur active:scale-90 transition-transform">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        )}


        {/* Right rail (on the image) — anchored to the TOP edge of the video so it
            clears the model's body and the bottom action buttons. */}
        <div className="absolute right-2.5 top-3 z-10 flex flex-col items-center gap-4">
          <RailButton icon={<Heart className="h-8 w-8" fill={liked ? "currentColor" : "none"} strokeWidth={2} />} label={likeCount > 0 ? String(likeCount) : "Like"} active={liked} onClick={toggleLike} />
          {!look.commentsOff && (
            <RailButton icon={<MessageCircle className="h-8 w-8" strokeWidth={2} />} label="Comment" onClick={() => onComment(look)} />
          )}
          <RailButton icon={<Bookmark className="h-8 w-8" fill={saved ? "currentColor" : "none"} strokeWidth={2} />} label={saved ? "Saved" : "Save"} active={saved} onClick={toggleSave} />
          <RailButton icon={<Send className="h-7 w-7" strokeWidth={2} />} label="Share" onClick={share} />
          <RailButton icon={<Home className="h-7 w-7" strokeWidth={2} />} label="Home" onClick={() => router.push("/stores?view=grid")} />
        </div>
      </div>

      {/* Curator + badge — always below the video (name + description under the post). */}
      <div className="shrink-0">{headerBar}</div>

      {/* ── White caption + actions (Instagram-style, below the image) ── */}
      <div className="shrink-0 bg-white px-4 pt-2.5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4rem)" }}>
        {/* Carousel dots — on white, below the image (Instagram-style) */}
        {media.length > 1 && (
          <div className="mb-2 flex justify-center gap-1.5">
            {media.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${active === i ? "bg-black" : "bg-black/20"}`} />
            ))}
          </div>
        )}
        {/* ── Action buttons directly under the video ── */}
        <div className="mb-2.5 flex items-center gap-2">
          <button type="button" onClick={() => router.push(tryOnHref)}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-black/15 bg-white text-sm font-black text-black active:scale-95 transition-transform">
            <Sparkles className="h-4 w-4" /> Try This Look · {look.lingerie ? "$2.90" : "Free"}
          </button>
          <button type="button" onClick={() => router.push(`${detail}/details`)}
            className="flex h-11 shrink-0 items-center justify-center rounded-full bg-black px-5 text-sm font-black text-white active:scale-95 transition-transform">
            Bandit the feeling!
          </button>
        </div>
        {/* ── Mini preview: two full-width rows — "Look" (garments) + "Escape" (stays).
            Each thumb opens the full list (Bandit the feeling! detail). ── */}
        {(() => {
          const allClothes = (look.alternatives ?? []).filter(a => a.thumbnail && a.link);
          const allStays = cleanEscapes(look.locationDupes ?? []);
          const clothes = allClothes.slice(0, 4);
          const stays = allStays.slice(0, 4);
          if (!clothes.length && !stays.length) return null;
          const goDetail = () => router.push(`${detail}/details`);
          // No row titles — the last tile carries a "+N More Looks/Escapes" overlay instead.
          const thumb = (a: { thumbnail?: string; price?: string }, key: string, more: number, moreLabel: string) => (
            <button key={key} type="button" onClick={goDetail}
              className="relative block aspect-square min-w-0 flex-1 overflow-hidden rounded-lg bg-black/5 active:scale-95 transition-transform">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover"
                onError={(e) => { const el = e.currentTarget; if (a.thumbnail && !el.dataset.proxied) { el.dataset.proxied = "1"; el.src = `/api/img-proxy?url=${encodeURIComponent(a.thumbnail)}`; } }} />
              {more > 0 && (
                <span className="absolute inset-0 grid place-items-center bg-black/60 px-1 text-center text-white">
                  <span className="text-lg font-black leading-none">+{more}</span>
                  <span className="mt-0.5 text-[9px] font-bold uppercase leading-tight tracking-wide">{moreLabel}</span>
                </span>
              )}
            </button>
          );
          const row = (items: typeof clothes, total: number, prefix: string, moreLabel: string) => (
            <div className="flex gap-1.5">
              {items.map((a, i) => thumb(a, `${prefix}${i}`, (i === items.length - 1 ? total - items.length : 0), moreLabel))}
            </div>
          );
          return (
            <div className="mb-2.5 flex flex-col gap-1.5">
              <p className="text-[13px] font-black leading-snug text-black">We banditted the feeling for you — here are the results:</p>
              {clothes.length > 0 && row(clothes, allClothes.length, "c", "More Looks")}
              {stays.length > 0 && row(stays, allStays.length, "s", "More Escapes")}
            </div>
          );
        })()}
        {/* Who recreated this look — ADMIN ONLY (business secret). Sits under the
            caption. Replaces the old "Shop now" card; shopping is via "Bandit the look!". */}
        {single && isAdmin && (
          community.length > 0 ? (
            <div className="mt-2 rounded-2xl border border-black/10 bg-black/[0.02] p-2.5">
              <p className="mb-2 px-0.5 text-[11px] font-black uppercase tracking-wide text-black/40">
                Admin · {community.length} {community.length === 1 ? "person tried this on" : "people tried this on"}
              </p>
              <div className="flex flex-col gap-1.5">
                {community.slice(0, 12).map((c, i) => {
                  const slug = (c.name ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                  const row = (
                    <>
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-black/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.imageUrl} alt={c.name || "Member"} className="h-full w-full object-cover object-top" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-black text-black">{c.name || "Member"}</span>
                      {c.videoUrl && <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-black/45">Video</span>}
                    </>
                  );
                  return slug ? (
                    <button key={i} type="button" onClick={() => router.push(`/u/${slug}`)}
                      className="flex items-center gap-2.5 text-left active:opacity-70">{row}</button>
                  ) : (
                    <div key={i} className="flex items-center gap-2.5">{row}</div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="mt-2 px-0.5 text-[12px] font-bold text-black/40">Admin · no try-ons yet</p>
          )
        )}
        {/* Social proof — how many people tried this look on (tap → their try-ons) */}
        {tryOnPeople > 0 && firstTryOnIdx >= 0 && (
          <button type="button" onClick={() => scrollToSlide(firstTryOnIdx)}
            className="mt-1 flex items-center gap-1.5 text-[12px] font-black text-black active:opacity-70">
            <span className="flex -space-x-1.5">
              {community.slice(0, 3).map((c, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(c.name || "LB")}&backgroundColor=000000&fontColor=ffffff`} alt="" className="h-4 w-4 rounded-full border border-white object-cover" />
              ))}
            </span>
            {tryOnPeople} {tryOnPeople === 1 ? "person" : "people"} tried this on →
          </button>
        )}
        {!look.commentsOff && (
          <button type="button" onClick={() => onComment(look)} className="mt-0.5 text-[12px] font-bold text-black/40">View comments</button>
        )}
      </div>

      {/* Info / history sheet — public provenance for this look */}
      {infoOpen && (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/50" onClick={() => setInfoOpen(false)}>
          <div className="flex max-h-[78dvh] flex-col rounded-t-2xl bg-white text-left" onClick={e => e.stopPropagation()} style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
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
                const d = infoData;
                const isLook = d.kind === "look";
                const fmt = (iso: any) => { if (!iso) return "—"; try { return new Date(iso).toLocaleString("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return String(iso); } };
                const typeLabel = isLook
                  ? (d.aiCreated ? "AI-Studio look (AI-generated)" : "Curated look")
                  : (d.hadUserPhoto ? "Try-on (own photo uploaded)" : "Try-on (AI render, no own photo)");
                const mediaLabel = d.media === "video" ? (isLook ? "With video" : (d.videoKind === "video360" ? "AI-Video 360°" : "AI-Video")) : (isLook ? "Image only" : "AI-Picture");
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
    </section>
  );
}

type Comment = { id: string; authorName?: string; text: string; createdAt: string; parentId?: string; replyToName?: string };

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// Instagram-style comments bottom sheet.
function CommentsSheet({ look, onClose }: { look: FeedLook; onClose: () => void }) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const me = (() => { try { return JSON.parse(localStorage.getItem("lb_curator") ?? "{}"); } catch { return {}; } })();
  const authed = !!me?.id;

  useEffect(() => {
    fetch(`/api/try-this-look?comments=1&lookId=${encodeURIComponent(look.id)}`)
      .then(r => r.ok ? r.json() : { comments: [] })
      .then(d => setComments(Array.isArray(d.comments) ? d.comments : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [look.id]);

  const post = async () => {
    const t = text.trim();
    if (!t) return;
    if (!authed) { router.push("/stores?panel=account"); return; }
    setPosting(true);
    const optimistic: Comment = { id: `tmp-${Date.now()}`, authorName: me.firstName || "You", text: t, createdAt: new Date().toISOString() };
    setComments(c => [optimistic, ...c]); setText("");
    try {
      const res = await fetch("/api/try-this-look", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add-comment", lookId: look.id, text: t, authorName: me.firstName || "" }) });
      const d = await res.json();
      if (Array.isArray(d.comments)) setComments(d.comments);
    } catch { /* keep optimistic */ }
    setPosting(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[75dvh] flex-col rounded-t-2xl bg-white">
        <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
          <p className="text-sm font-black text-black">Comments{comments.length ? ` · ${comments.length}` : ""}</p>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-black/5"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-black/30" /></div>
          ) : comments.length === 0 ? (
            <p className="py-8 text-center text-sm font-bold text-black/35">No comments yet. Be the first.</p>
          ) : (
            (() => {
              // Thread: top-level comments, each with its replies nested below.
              const repliesByParent = new Map<string, Comment[]>();
              for (const c of comments) if (c.parentId) {
                const a = repliesByParent.get(c.parentId) ?? []; a.push(c); repliesByParent.set(c.parentId, a);
              }
              const top = comments.filter(c => !c.parentId);
              const Row = (c: Comment, reply: boolean) => (
                <div key={c.id} className={`flex gap-2.5 ${reply ? "ml-9" : ""}`}>
                  <span className={`grid shrink-0 place-items-center rounded-full font-black text-white ${reply ? "h-6 w-6 bg-black/60 text-[10px]" : "h-8 w-8 bg-black text-[11px]"}`}>{(c.authorName || "A").slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0">
                    {reply && <span className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-black text-black/40"><CornerDownRight className="h-3 w-3" /> Reply{c.replyToName ? ` to ${c.replyToName}` : ""}</span>}
                    <p className="text-[13px] leading-snug text-black"><span className="font-black">{c.authorName || "Anonymous"}</span> {c.text}</p>
                    <span className="text-[11px] font-bold text-black/35">{timeAgo(c.createdAt)}</span>
                  </div>
                </div>
              );
              return (
                <div className="grid gap-3.5">
                  {top.map(c => {
                    const reps = (repliesByParent.get(c.id) ?? []).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                    return (
                      <div key={c.id} className="grid gap-2.5">
                        {Row(c, false)}
                        {reps.map(r => Row(r, true))}
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
        <div className="border-t border-black/8" style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}>
          {/* Quick emoji bar */}
          <div className="flex gap-1 overflow-x-auto px-3 pt-2 pb-1 text-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {["❤️","🔥","😍","🙌","👏","😮","😂","✨","🖤","💯","👀","🥹","💅","👑","😎","🤍"].map(e => (
              <button key={e} type="button" onClick={() => setText(t => t + e)}
                className="shrink-0 px-1 leading-none active:scale-125 transition-transform">{e}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 pb-2.5">
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") void post(); }}
              placeholder={authed ? "Add a comment…" : "Sign in to comment…"}
              className="h-11 flex-1 rounded-full border border-black/12 bg-black/[0.03] px-4 text-sm outline-none focus:border-black" />
            <button type="button" onClick={() => void post()} disabled={posting || !text.trim()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black text-white disabled:opacity-30">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function HomeFeed({ looks, single = false, initialLookId }: { looks: FeedLook[]; single?: boolean; initialLookId?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [commentsFor, setCommentsFor] = useState<FeedLook | null>(null);
  // One global sound switch for the whole feed. The audio is a single looping
  // soundtrack (drop your track at public/feed-music.mp3) — consistent across all
  // clips, since Kling videos are silent and we keep every video muted.
  const [muted, setMuted] = useState(true);
  const mutedRef = useRef(true); mutedRef.current = muted;
  const audioRef = useRef<HTMLAudioElement>(null);
  const tracksRef = useRef<string[]>([]);
  const curTrack = useRef(-1);
  const positions = useRef<Record<number, number>>({}); // per-track playback position
  // Pull the mp3s from /public and shuffle them once.
  useEffect(() => {
    fetch("/api/feed-music").then(r => r.json())
      .then(d => { tracksRef.current = [...(d.tracks ?? [])].sort(() => Math.random() - 0.5); })
      .catch(() => {});
  }, []);

  // Switch the soundtrack to a given track, RESUMING from where it last paused
  // (so each track continues its sequence instead of restarting).
  const playTrack = useCallback((trackIdx: number) => {
    const a = audioRef.current, t = tracksRef.current;
    if (!a || !t.length || trackIdx === curTrack.current) return;
    if (curTrack.current >= 0) positions.current[curTrack.current] = a.currentTime || 0;
    curTrack.current = trackIdx;
    a.src = t[trackIdx];
    a.volume = 0.5;
    const resume = positions.current[trackIdx] || 0;
    const onMeta = () => { try { a.currentTime = resume; } catch { /**/ } if (!mutedRef.current) void a.play().catch(() => {}); a.removeEventListener("loadedmetadata", onMeta); };
    a.addEventListener("loadedmetadata", onMeta);
  }, []);

  // Active slide → its track (slideIndex % N) so scrolling alternates tracks.
  const handleActive = useCallback((slideIdx: number) => {
    const t = tracksRef.current;
    if (t.length) playTrack(slideIdx % t.length);
  }, [playTrack]);

  // Global mute toggle gates the whole soundtrack.
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    if (muted) { if (curTrack.current >= 0) positions.current[curTrack.current] = a.currentTime || 0; a.pause(); }
    else if (curTrack.current < 0 && tracksRef.current.length) playTrack(0);
    else void a.play().catch(() => {});
  }, [muted, playTrack]);
  // Newest first — fresh curator posts always surface at the top of the feed.
  const sorted = [...looks].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));

  // Deep-link: when opened on a specific post (/look/[id]), ROTATE the feed so the
  // target look is first (scrollTop 0). This is rock-solid — unlike scrolling to a
  // computed offset, it doesn't depend on the (variable, still-loading) heights of
  // the posts above the target, which used to land us on the neighbouring look.
  const startIdx = initialLookId ? sorted.findIndex(l => l.id === initialLookId) : -1;
  const feed = startIdx > 0 ? [...sorted.slice(startIdx), ...sorted.slice(0, startIdx)] : sorted;

  if (!feed.length) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-black text-center text-white/50">
        <p className="text-sm font-black">No looks yet.</p>
      </div>
    );
  }

  return (
    <>
      {/* Phone-width column, centered, so a wide screen doesn't blow the square video
          up to full width (which pushed the Look/Escape thumbs off the bottom). */}
      <div className="flex h-[100dvh] w-full justify-center bg-black">
        <div ref={scrollRef} className="h-[100dvh] w-full max-w-[440px] snap-y snap-mandatory overflow-y-scroll overscroll-contain bg-black [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {feed.map((look, i) => <Slide key={look.id} look={look} onComment={setCommentsFor} muted={muted} setMuted={setMuted} index={i} onActive={handleActive} single={single} />)}
        </div>
      </div>
      {/* Slide-coupled feed soundtrack — shuffled /public mp3s, the track changes
          as you scroll and resumes where it left off. Only audio source (videos muted). */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="auto" loop />
      {commentsFor && <CommentsSheet look={commentsFor} onClose={() => setCommentsFor(null)} />}
    </>
  );
}
