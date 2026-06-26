"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Bookmark, Send, Sparkles, X, Loader2, Volume2, VolumeX, CornerDownRight } from "lucide-react";
import { lookPath } from "@/lib/look-slug";
import TryOnQR from "@/components/TryOnQR";

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
  commentsOff?: boolean;
  likeCount?: number;
  createdAt?: string;
  alternatives?: { title?: string; link?: string; source?: string; thumbnail?: string; price?: string; priceValue?: number; currency?: string }[];
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
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
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
    ...communityVideos,
    ...communityPhotos,
    ...(look.videoUrl ? [{ type: "video" as const }] : []),
    { type: "image" as const },
    // Shop options are NOT shown in the feed (no product slides, no list). The
    // dupes are fetched on demand only when the user taps "Bandit the look!".
  ];
  void shopAlts;
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
        void v.play().catch(() => {});
      } else {
        v.pause();
        v.muted = true;
      }
    }
  };
  useEffect(() => {
    syncVideos();
  }, [inView, active, muted]); // eslint-disable-line react-hooks/exhaustive-deps

  const img = look.frontImageUrl ?? look.imageUrl;
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

  // Curator + badge row. On the single-look page it moves BELOW the image so the
  // page's fixed back button (top-left) doesn't sit on top of the logo/name/badge.
  const headerBar = (
    <div className={`z-20 flex items-center gap-2 bg-white px-3 ${single ? "pb-2 pt-3" : "pb-2 pr-14"}`} style={single ? undefined : { paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
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
    </div>
  );

  return (
    <section ref={sectionRef} className="relative flex h-[100dvh] w-full snap-start snap-always flex-col bg-white">
      {/* ── Header bar (white) — curator + badge ABOVE the image (feed). On the single
          look page it renders below the image instead (see white caption block). ── */}
      {!single && headerBar}

      {/* ── Image area ── */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        {/* Blurred fill so the whole look stays visible without empty bars */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-55 blur-2xl" />

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
                    src={look.videoUrl} poster={look.videoPosterUrl || img} className="h-full w-full object-contain"
                    muted loop playsInline preload="metadata" onCanPlay={syncVideos} onLoadedData={syncVideos} />
                  <span className={`absolute ${single ? "left-14" : "left-3"} top-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur`}>{look.aiCreated ? "✦ AI video" : "Video"}</span>
                </div>
              ) : m.type === "cphoto" ? (
                // Community try-on photo (someone wearing this look).
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={`${look.name} on ${m.name ?? "a member"}`} className="h-full w-full object-contain" />
                  <span className={`absolute ${single ? "left-14" : "left-3"} top-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur`}>{m.name ? `${m.name}'s try-on` : "Member try-on"}</span>
                </div>
              ) : m.type === "cvideo" ? (
                // Community try-on video — same sound handling as the curator video.
                <div className="relative h-full w-full">
                  <video ref={el => { if (el) videoRefs.current[i] = el; else delete videoRefs.current[i]; }}
                    src={m.url} className="h-full w-full bg-black object-contain" muted loop playsInline preload="metadata" onCanPlay={syncVideos} onLoadedData={syncVideos} />
                  <span className={`absolute ${single ? "left-14" : "left-3"} top-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur`}>{m.name ? `${m.name}'s video` : "Member video"}</span>
                </div>
              ) : m.type === "image" ? (
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={look.name} className="h-full w-full object-contain" />
                  <span className={`absolute ${single ? "left-14" : "left-3"} top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide backdrop-blur ${look.aiCreated ? "bg-black/70 text-white" : "bg-white/85 text-black/70"}`}>
                    {look.aiCreated ? "✦ Original" : "Curated"}
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Mute toggle — shown whenever the active carousel slide is a video */}
        {(media[active]?.type === "video" || media[active]?.type === "cvideo") && (
          <button type="button" aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => setMuted(m => !m)}
            className="absolute bottom-3 left-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur active:scale-90 transition-transform">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        )}


        {/* Right rail (on the image) */}
        <div className="absolute right-2.5 bottom-4 z-10 flex flex-col items-center gap-4">
          <RailButton icon={<Heart className="h-8 w-8" fill={liked ? "currentColor" : "none"} strokeWidth={2} />} label={likeCount > 0 ? String(likeCount) : "Like"} active={liked} onClick={toggleLike} />
          {!look.commentsOff && (
            <RailButton icon={<MessageCircle className="h-8 w-8" strokeWidth={2} />} label="Comment" onClick={() => onComment(look)} />
          )}
          <RailButton icon={<Bookmark className="h-8 w-8" fill={saved ? "currentColor" : "none"} strokeWidth={2} />} label={saved ? "Saved" : "Save"} active={saved} onClick={toggleSave} />
          <RailButton icon={<Send className="h-7 w-7" strokeWidth={2} />} label="Share" onClick={share} />
        </div>
      </div>

      {/* Curator + badge — on the single look page this sits below the image, clear
          of the page's fixed back button. */}
      {single && <div className="shrink-0">{headerBar}</div>}

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
        {/* Main product image → its own buy card so the user knows what they see:
            "Shop now" when there's a shop link, otherwise a simple Details link. */}
        {am?.type === "image" && (
          <div className="mb-2 flex items-center gap-3 rounded-2xl border border-black/10 bg-black/[0.02] p-2.5">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-[13px] font-black text-black">{look.name}</p>
              <p className="mt-0.5 truncate text-[12px] font-bold text-black/45">{[look.storeName, look.salePrice || look.price].filter(Boolean).join(" · ") || "The original piece"}</p>
            </div>
            {look.buyUrl ? (
              <a href={look.buyUrl} target="_blank" rel="noopener noreferrer"
                className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-black px-5 text-sm font-black text-white active:scale-95 transition-transform">
                Shop now →
              </a>
            ) : (
              <button type="button" onClick={() => router.push(`${detail}/details`)}
                className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-black/15 bg-white px-5 text-sm font-black text-black active:scale-95 transition-transform">
                Details →
              </button>
            )}
          </div>
        )}
        <p ref={captionRef} className={`text-[13px] leading-snug text-black ${expanded ? "" : "line-clamp-2"}`}>
          <span className="text-black/45">{look.aiCreated ? "Created by " : "Curated by "}</span>
          <button type="button" onClick={() => look.curatorId && router.push(`/curator/${look.curatorId}`)} className="font-black">{look.curatorName || "LuxuryBandit"}</button>
          {caption ? <> — {caption}</> : null}
        </p>
        {clamped && (
          <button type="button" onClick={() => setExpanded(e => !e)} className="mt-0.5 text-[12px] font-bold text-black/40">
            {expanded ? "less" : "more"}
          </button>
        )}
        <p className="mt-1 truncate text-[12px] font-bold text-black/45">{look.name}</p>
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
        <div className="mt-2.5 flex items-center gap-2">
          <button type="button" onClick={() => router.push(tryOnHref)}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-black/15 bg-white text-sm font-black text-black active:scale-95 transition-transform">
            <Sparkles className="h-4 w-4" /> Try This Look · 2 Credits
          </button>
          <TryOnQR lookId={look.id} lookName={look.name} variant="icon" />
          <button type="button" onClick={() => router.push(`${detail}/details`)}
            className="flex h-11 shrink-0 items-center justify-center rounded-full bg-black px-5 text-sm font-black text-white active:scale-95 transition-transform">
            Bandit the look!
          </button>
        </div>
      </div>
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

export default function HomeFeed({ looks, single = false }: { looks: FeedLook[]; single?: boolean }) {
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
  const feed = [...looks].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));

  if (!feed.length) {
    return (
      <div className="grid h-[100dvh] place-items-center bg-black text-center text-white/50">
        <p className="text-sm font-black">No looks yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="h-[100dvh] w-full snap-y snap-mandatory overflow-y-scroll overscroll-contain bg-black [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {feed.map((look, i) => <Slide key={look.id} look={look} onComment={setCommentsFor} muted={muted} setMuted={setMuted} index={i} onActive={handleActive} single={single} />)}
      </div>
      {/* Slide-coupled feed soundtrack — shuffled /public mp3s, the track changes
          as you scroll and resumes where it left off. Only audio source (videos muted). */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="auto" loop />
      {commentsFor && <CommentsSheet look={commentsFor} onClose={() => setCommentsFor(null)} />}
    </>
  );
}
