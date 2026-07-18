"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Bookmark, Send, Sparkles, X, Loader2, Volume2, VolumeX, CornerDownRight, Info, Play, MapPin, Home, ShoppingBag, EyeOff, Eye, Trash2, UserPlus, Check, ImageOff, RefreshCw, BadgeCheck, Download, Maximize2, Minimize2, Search } from "lucide-react";
import { lookPath } from "@/lib/look-slug";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { isAdminEmail } from "@/lib/is-admin-email";
import { safeLookImage } from "@/lib/look-image";
import { publicAuthorName } from "@/lib/display-name";
import { cleanEscapes } from "@/lib/reel-audit";
import { trackMetaPixel } from "@/lib/meta-pixel";
import { FeedGate } from "@/components/FeedGate";
import ModelChat from "@/components/ModelChat";
import PremiumDialog from "@/components/PremiumDialog";
import SubscribeDialog from "@/components/SubscribeDialog";

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
  clothesImageUrl?: string;   // curator-uploaded garment reference (shown as a carousel slide + used for try-on)
  locationImageUrl?: string;  // curator-uploaded location reference (used for try-on)
  communityTryOns?: { id?: string; imageUrl: string; videoUrl?: string; userPhotoUrl?: string; name?: string; hidden?: boolean; pending?: boolean; curatorId?: string; curatorPhotoUrl?: string; pinned?: boolean; createdAt?: string }[];
  videoCreatedAt?: string;
  feedOrder?: number;
  aiCreated?: boolean;
  lingerie?: boolean;
  commentsOff?: boolean;
  likeCount?: number;
  commentCount?: number;
  createdAt?: string;
  alternatives?: { title?: string; link?: string; source?: string; thumbnail?: string; price?: string; priceValue?: number; currency?: string; lingerie?: boolean; affiliate?: boolean }[];
  locationDupes?: { title?: string; link?: string; source?: string; thumbnail?: string; price?: string; region?: string; affiliate?: boolean }[];
  price?: string;
  salePrice?: string;
  buyUrl?: string;
  storeName?: string;
};

type ShopAlt = NonNullable<FeedLook["alternatives"]>[number];
type ShopEscape = NonNullable<FeedLook["locationDupes"]>[number];

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

// Compact engagement count: 62000 → "62k", 1500 → "1.5k", 980 → "980".
function fmtCount(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return (k >= 10 || Number.isInteger(k) ? Math.round(k) : k.toFixed(1)) + "k";
}

function RailButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
      <span className={`drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.95)] ${active ? "text-rose-500" : "text-white"}`}>{icon}</span>
      <span className="text-[11px] font-bold text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.95)]">{label}</span>
    </button>
  );
}

function Slide({ look, onComment, muted, setMuted, index, onActive, single = false, onClose, recruitAd = false, realModelIds = [] }: { look: FeedLook; onComment: (look: FeedLook) => void; muted: boolean; setMuted: (fn: (m: boolean) => boolean) => void; index: number; onActive: (i: number) => void; single?: boolean; onClose?: () => void; recruitAd?: boolean; realModelIds?: string[] }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(look.likeCount ?? 0);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const [active, setActive] = useState(0);
  // Admin moderation of individual try-ons on this card (curated look stays untouched):
  //  • hidden override — optimistic hide/show toggle (server feed:false/true). A hidden
  //    try-on STAYS visible to the admin (as HIDDEN) so it can be re-activated.
  //  • deleted — try-ons the admin removed for good, dropped from the card.
  const [tryOnHiddenOverride, setTryOnHiddenOverride] = useState<Record<string, boolean>>({});
  const [deletedTryOnIds, setDeletedTryOnIds] = useState<Set<string>>(new Set());
  // Pending publish-requests the admin just approved in this session (optimistic → no
  // longer shown as PENDING). Rejected ones go into deletedTryOnIds (dropped from view).
  const [approvedRequestIds, setApprovedRequestIds] = useState<Set<string>>(new Set());
  const [inView, setInView] = useState(false);
  const [vidFailed, setVidFailed] = useState(false); // autoplay blocked → show a Play button
  // Feed videos are HD and heavy on mobile data, so they DON'T autoplay: each slide shows
  // its poster with a Play button, and the video bytes load only when the user taps (see
  // preload="none"). `paused` therefore starts TRUE — a slide plays only after an explicit tap.
  const [paused, setPaused] = useState(true); // not playing until the user taps
  const [playing, setPlaying] = useState(false); // active video is ACTUALLY playing (onPlaying)
  const [buffering, setBuffering] = useState(false); // tapped, waiting for enough data → scanner
  // "Bandit the feeling" reveal: on the video, a button fades in after 2s; tapping it
  // shows a "Slides werden erstellt…" hint, then reveals the shop product carousel.
  const [showBanditBtn, setShowBanditBtn] = useState(false);
  const [banditCreating, setBanditCreating] = useState(false);
  const [banditRevealed, setBanditRevealed] = useState(false);
  // Join/feedback sheet (register/sign-in gate for Follow, or "write us" feedback).
  const [gate, setGate] = useState<null | { mode: "auth" | "feedback"; reason?: string }>(null);
  const [showChat, setShowChat] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false); // $49/mo subscribe dialog (chat)
  const [immersive, setImmersive] = useState(false); // fullscreen video, all chrome hidden
  const [isPaid, setIsPaid] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false); // $49/mo subscriber → unlimited chat
  useEffect(() => {
    try {
      const admin = !!localStorage.getItem("luxurybandit-try-look-admin-pin");
      setIsPaid(admin || localStorage.getItem("lb_paid") === "1");
      setIsSubscribed(admin || localStorage.getItem("lb_subscribed") === "1");
    } catch { /**/ }
  }, []);
  const pausedRef = useRef(true); pausedRef.current = paused;
  const [infoOpen, setInfoOpen] = useState(false);
  // Who-tried-this-on is a business secret → only the admin sees the named list.
  // Also used to flag the admin's OWN feed interactions as internal so they don't
  // pollute the funnel analytics. Read synchronously (no async state race) in trackers.
  const isAdminNow = () => {
    try {
      const pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      const email = getStoredAuthSession()?.user?.email?.toLowerCase();
      return !!pin || (!!email && (isAdminEmail(email) || email === "support@luxurybandit.com"));
    } catch { return false; }
  };
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { setIsAdmin(isAdminNow()); }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
  const mediaRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  // Deepest carousel slide reached in this view — fires one "carousel_swipe" event per
  // NEW max slide so Insights can show how far people swipe (funnel: reached slide 2,3,4…).
  const maxSlideRef = useRef(0);
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
  // Escapes ("Urlaubsslides") — where to live the look (stays/destinations). Deduped.
  const shopEscapes = (() => {
    const seen = new Set<string>();
    return cleanEscapes(look.locationDupes ?? [])
      .filter(e => e?.thumbnail && e?.link && !seen.has(e.link!) && seen.add(e.link!))
      .slice(0, 4);
  })();
  // Licensing-safe hero still: our created image only (AI render / video poster),
  // never the scraped original product photo of a curated look.
  const heroImg = safeLookImage(look);
  const community = (look.communityTryOns ?? [])
    .filter(c => c?.imageUrl && !(c.id && deletedTryOnIds.has(c.id)))
    // Effective hidden/pending = local optimistic override, else the server's flag.
    .map(c => ({
      ...c,
      hidden: c.id && c.id in tryOnHiddenOverride ? tryOnHiddenOverride[c.id!] : !!c.hidden,
      pending: !!c.pending && !(c.id && approvedRequestIds.has(c.id)),
    }));
  // Representative try-on for the carousel — prefer one WITH video+before (full compare),
  // then video only, then before photo only, then any try-on (at least the photo).
  const repTryOn = community.find(c => !c.hidden && c.videoUrl && c.userPhotoUrl) ?? community.find(c => !c.hidden && c.videoUrl) ?? community.find(c => !c.hidden && c.userPhotoUrl) ?? community.find(c => !c.hidden) ?? community[0];
  // AUTHOR of this post: a try-on post belongs to the try-on's MODEL ("Assign to a
  // model" sets gen.curatorId/customerName) — NOT the look's owner. Curated posts
  // (no try-on) fall back to the look's curator. Name, avatar, profile link and the
  // "See her in other looks" CTA all follow this attribution.
  const rep = repTryOn as (typeof repTryOn & { curatorId?: string; curatorPhotoUrl?: string }) | undefined;
  const authorName = rep?.name || look.curatorName;
  const authorPhotoUrl = (rep?.name ? rep?.curatorPhotoUrl || rep?.userPhotoUrl : "") || look.curatorPhotoUrl;
  const authorCuratorId = (rep?.name ? rep?.curatorId : "") || look.curatorId;
  const isRealModel = !!authorCuratorId && realModelIds.includes(authorCuratorId);
  // LOCKED carousel order (see memory feed-post-carousel-structure):
  //   1) the try-on (member's try-on video, else the look's own video)
  //   2) Before/After compare (uploaded Before | After result) — when a before photo exists
  // NO separate "curated" still slide — the After already shows in the compare.
  const media: (
    | { type: "video" }
    | { type: "image" }
    | { type: "cvideo"; url: string; name?: string; poster?: string; id?: string; hidden?: boolean; pending?: boolean }
    | { type: "compare"; afterUrl: string; beforeUrl: string; name?: string; id?: string; hidden?: boolean; pending?: boolean }
    | { type: "cphoto"; url: string; name?: string; id?: string; hidden?: boolean; pending?: boolean }
    | { type: "refimage"; url: string; label: string }
    | { type: "product"; alt: ShopAlt }
    | { type: "escape"; esc: ShopEscape }
  )[] = [
    // Each feed post is a SINGLE try-on: ONLY its video + a Before/After — nothing else
    // (no other try-ons, no shop products, no escapes). The parent flattens looks into one
    // post per try-on, so `community`/`repTryOn` is exactly this post's try-on.
    // 1) the try-on video (else the look's own video, else the try-on's photo).
    ...(repTryOn?.videoUrl
      ? [{ type: "cvideo" as const, url: repTryOn.videoUrl, name: repTryOn.name, poster: repTryOn.imageUrl || repTryOn.userPhotoUrl || "", id: repTryOn.id, hidden: repTryOn.hidden, pending: repTryOn.pending }]
      : look.videoUrl ? [{ type: "video" as const }]
      : repTryOn?.imageUrl ? [{ type: "cphoto" as const, url: repTryOn.imageUrl, name: repTryOn.name, id: repTryOn.id, hidden: repTryOn.hidden, pending: repTryOn.pending }]
      : [{ type: "image" as const }]),
    // 2) Before/After compare — ONLY when this try-on has a before photo.
    ...(repTryOn?.userPhotoUrl && (repTryOn?.videoUrl || repTryOn?.imageUrl)
      ? [{ type: "compare" as const, afterUrl: repTryOn.imageUrl, beforeUrl: repTryOn.userPhotoUrl, name: repTryOn.name, id: repTryOn.id, hidden: repTryOn.hidden, pending: repTryOn.pending }]
      : []),
  ];
  const scrollToSlide = (i: number) => carouselRef.current?.scrollTo({ left: i * (carouselRef.current.clientWidth || 0), behavior: "smooth" });
  // First shop slide index = number of content slides (products/escapes are appended last).
  const productStartIdx = media.filter(m => m.type !== "product" && m.type !== "escape").length;

  // Tap "Bandit the feeling" on the video → show a "creating slides" hint, then reveal
  // the product carousel and glide to the first product slide.
  const revealBandit = () => {
    if (banditCreating || banditRevealed) return;
    trackEvent("bandit_click");
    // No shop dupes on this look → nothing to reveal in-feed; open the full look page
    // (where the "Bandit the feeling" experience continues) instead of a dead tap.
    if (shopAlts.length === 0) { router.push(`/look/${look.id}`); return; }
    setBanditCreating(true);
    window.setTimeout(() => {
      setBanditRevealed(true);
      setBanditCreating(false);
      window.setTimeout(() => { setActive(productStartIdx); scrollToSlide(productStartIdx); }, 90);
    }, 1600);
  };

  useEffect(() => {
    try { setLiked(!!JSON.parse(localStorage.getItem("lb_post_likes") ?? "{}")[look.id]); } catch { /**/ }
    try { setSaved((JSON.parse(localStorage.getItem("lb_bookmarks") ?? "[]") as string[]).includes(look.id)); } catch { /**/ }
  }, [look.id]);

  // Always open the carousel at slide 1 (the try-on video), not slide 2. When you
  // open a post or switch looks, jump the carousel back to the first slide.
  useEffect(() => {
    if (carouselRef.current) carouselRef.current.scrollLeft = 0;
    setActive(0);
    maxSlideRef.current = 0;
    setShowBanditBtn(false);
    setBanditCreating(false);
    setBanditRevealed(false);
  }, [look.id]);

  // Show the "Bandit the feeling" button on the video IMMEDIATELY (no delay, no wait
  // for the video to buffer/come into view) — it must be there right away.
  useEffect(() => {
    if (banditRevealed || showBanditBtn) return;
    // Show on any content slide (video, try-on video, before/after, photo, still) — every
    // look gets the buttons, not just ones with a video. Products/escapes are excluded.
    const showable = ["video", "cvideo", "compare", "cphoto", "image"].includes(media[active]?.type as string);
    if (showable) setShowBanditBtn(true);
  }, [active, banditRevealed, showBanditBtn]); // eslint-disable-line react-hooks/exhaustive-deps

  // carousel_swipe tracking REMOVED (2026-07-07, user: "bringt mir nichts") —
  // it flooded the live feed and the depth chart was never useful.

  // Detect whether the caption is actually truncated (only then show "more").
  useEffect(() => {
    const el = captionRef.current;
    if (el && !expanded) setClamped(el.scrollHeight > el.clientHeight + 2);
  }, [look.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track whether THIS slide's VIDEO is on screen. Observe the media area (the
  // 9:16 video box), NOT the whole <section> — the section also contains the name,
  // caption, CTA buttons and product grid, making it much taller than the phone
  // viewport, so its visible ratio stayed < 0.6 and inView never became true (→ no
  // autoplay AND no Play button on iPhone, though a manual tap still worked).
  useEffect(() => {
    const el = mediaRef.current;
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
  const viewTracked = useRef(false);
  useEffect(() => {
    if (!inView) return;
    onActive(index);
    if (!viewTracked.current) {
      viewTracked.current = true;
      fetch("/api/try-this-look", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "view", lookId: look.id, internal: isAdminNow() }) }).catch(() => {});
    }
  }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drive ALL videos (curator + community) from visibility + carousel position +
  // global mute: only the on-screen, active video plays; every other one is silent.
  // Also called from the videos' onCanPlay so a clip that wasn't buffered yet when
  // it scrolled into view still autostarts (fixes "only plays after tapping sound").
  const syncVideos = () => {
    for (const [idxStr, v] of Object.entries(videoRefs.current)) {
      if (!v) continue;
      const isActiveVideo = inView && Number(idxStr) === active;
      if (isActiveVideo) {
        // Play THIS clip's own baked-in music (Pixverse generate_audio_switch), gated by
        // the global sound toggle: the active clip follows `muted`, all others stay silent.
        v.muted = muted;
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
  // Switching carousel item resets to the paused/poster state — the new slide waits for a
  // tap before it loads & plays (no autoplay = no HD download on scroll).
  useEffect(() => { setPaused(true); pausedRef.current = true; setPlaying(false); setBuffering(false); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  // Scrubbing: drag on video to seek (like YouTube). DESKTOP-ONLY — mouse events
  // never fire on a touch device, so on phones a tap goes through handleVideoClick
  // (which fires on iOS) to toggle play/pause instead.
  const scrubRef = useRef<{ isScrubbing: boolean; wasPaused: boolean; justScrubbed: boolean }>({ isScrubbing: false, wasPaused: false, justScrubbed: false });
  const handleVideoMouseDown = (e: React.MouseEvent<HTMLVideoElement>) => {
    e.stopPropagation();
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
      v.muted = muted;
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
      // Resume from the exact position — don't let syncVideos reset it.
      const savedTime = v.currentTime;
      v.muted = muted;
      pausedRef.current = false; // update immediately so syncVideos doesn't race
      setPaused(false);
      // preload="none" → the first tap has to fetch the clip; show the scanner until it plays.
      if (v.readyState < 3) setBuffering(true);
      v.currentTime = savedTime;
      v.play().then(() => setVidFailed(false)).catch(() => setVidFailed(true));
    } else {
      pausedRef.current = true; // update immediately so onCanPlay/syncVideos don't un-pause
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
  // Try On → the new video funnel (outfit gallery → model → teaser → plans).
  const tryOnHref = `/try/${look.id}`;
  // Curator's own voice first, else the editorial note — never empty in the feed.
  const caption = (look.curatorNote || look.productNote || "").trim();
  const range = priceRange(look);

  const trackEvent = (event: string, extra?: Record<string, string>) => {
    let utmSource = "", referrer = "", visitor = "";
    try {
      const sp = new URLSearchParams(window.location.search);
      utmSource = sp.get("utm_source") || sp.get("source") || sp.get("ref") || "";
      referrer = document.referrer || "";
      const sess = getStoredAuthSession();
      const meta = (sess?.user as any)?.user_metadata ?? {};
      const cur = JSON.parse(localStorage.getItem("lb_curator") ?? "{}");
      visitor = (cur?.firstName ? `${cur.firstName}${cur.lastName ? " " + cur.lastName : ""}` : "")
        || meta?.full_name || meta?.username || sess?.user?.email || "";
    } catch { /**/ }
    // Attach the current carousel position to EVERY event so each button click can be
    // placed on its feed (lookId/lookName) AND the slide the user was on when they tapped.
    // (carousel_swipe passes its own slide/slides via extra, which override these.)
    fetch("/api/try-this-look", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "event", lookId: look.id, event, lookName: look.name, slide: active + 1, slides: media.length, utmSource, referrer, visitor, internal: isAdminNow(), ...extra }) }).catch(() => {});
    // Mirror key funnel actions to the Meta Pixel for ad optimization (skip admin/test traffic).
    if (!isAdminNow()) {
      const pixelEvent = event === "tryon_click" ? "TryOn" : event === "bandit_click" ? "BanditClick" : event === "product_click" ? "ShopClick" : "";
      if (pixelEvent) trackMetaPixel(pixelEvent, { content_name: look.name, content_category: "feed" });
    }
  };

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
  const creatorSlug = (authorName || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  useEffect(() => {
    try { const l = JSON.parse(localStorage.getItem("lb_following") ?? "[]"); setFollowing(Array.isArray(l) && l.includes(creatorSlug)); } catch { /**/ }
  }, [creatorSlug]);
  // Actually record/unrecord the follow (only reached once the user is signed in).
  const doFollow = () => {
    if (!creatorSlug) return;
    const next = !following;
    setFollowing(next);
    try {
      const l = JSON.parse(localStorage.getItem("lb_following") ?? "[]") as string[];
      localStorage.setItem("lb_following", JSON.stringify(next ? [...new Set([...l, creatorSlug])] : l.filter(s => s !== creatorSlug)));
    } catch { /**/ }
    try { fetch("/api/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: creatorSlug, type: "user" }) }).catch(() => {}); } catch { /**/ }
  };
  // Follow requires an account — anonymous "follows" are meaningless. If not signed in,
  // open the join sheet and complete the follow after they register/sign in.
  const toggleFollow = () => {
    if (!creatorSlug) return;
    if (!getStoredAuthSession()) { setGate({ mode: "auth", reason: `Create a free account to follow ${authorName || "this curator"}.` }); return; }
    doFollow();
  };

  // Curator + badge row. Always renders BELOW the video (name + description under
  // the post, Instagram-Reels style) — on the single-look page this also keeps the
  // page's fixed back button (top-left) off the logo/name/badge.
  // ── Admin moderation on a curated look (hide / delete / re-assign curator) ──
  const [modRemoved, setModRemoved] = useState(false); // hard-deleted → drop the card entirely
  // Hidden = invisible to end-users, but the admin still sees the card (with a HIDDEN badge).
  const [modHidden, setModHidden] = useState((look as any).published === false);
  const [modBusy, setModBusy] = useState<"" | "hide" | "delete" | "assign" | "approve" | "reject">("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [curatorList, setCuratorList] = useState<{ id: string; name: string; photoUrl?: string }[]>([]);
  const [feedLang, setFeedLang] = useState<"ro" | "en">("en"); // for the funnel CTA label
  useEffect(() => { try { setFeedLang(localStorage.getItem("lb_lang") === "ro" ? "ro" : "en"); } catch { /**/ } }, []);
  const adminPinVal = () => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } };
  const modHeaders = () => ({ "Content-Type": "application/json", ...(adminPinVal() ? { "x-try-look-admin-pin": adminPinVal() } : {}) });
  // The generation id of the try-on on the CURRENT slide (if any). When set, the admin
  // buttons act on that try-on ONLY — the curated look (the curator's "Mutter" post) is
  // left untouched. On a non-try-on (curated) slide they fall back to look-level actions.
  const activeSlide = media[active];
  const isTryOnSlide = !!activeSlide && (activeSlide.type === "cvideo" || activeSlide.type === "compare" || activeSlide.type === "cphoto");
  const activeTryOnId = isTryOnSlide ? (activeSlide as { id?: string }).id : undefined;
  // Pass the ORIGINAL photo this person UPLOADED (their "before" selfie) as the model —
  // NOT the try-on result — so the funnel dresses the real person in a new outfit.
  const goTryOn = () => {
    trackEvent("tryon_click");
    // Fashionshow is watch-only: "See her in other looks" sends viewers to the MODEL's
    // page (her clean wardrobe → the new generation flow), NOT the legacy per-look funnel
    // (whose garment/preview is stale). Fall back to the old funnel only if no model.
    if (authorCuratorId) { router.push(`/curator/${authorCuratorId}`); return; }
    const ct = (activeTryOnId ? community.find(c => c.id === activeTryOnId) : undefined) ?? repTryOn;
    const img = ct?.userPhotoUrl || ct?.imageUrl || "";
    router.push(img ? `${tryOnHref}?model=${encodeURIComponent(img)}` : tryOnHref);
  };
  const activeTryOnHidden = isTryOnSlide ? !!(activeSlide as { hidden?: boolean }).hidden : false;
  const activeTryOnPending = isTryOnSlide ? !!(activeSlide as { pending?: boolean }).pending : false;
  // Admin approves a pending publish request → the try-on goes public everywhere.
  const approveTryOn = async () => {
    if (!activeTryOnId) return;
    setModBusy("approve");
    try {
      await fetch("/api/try-this-look", { method: "POST", headers: modHeaders(), body: JSON.stringify({ action: "set-generation-feed", generationId: activeTryOnId, feed: true }) });
      setApprovedRequestIds(prev => { const n = new Set(prev); n.add(activeTryOnId); return n; });
    } catch { /**/ } finally { setModBusy(""); }
  };
  // Admin rejects a pending request → stays private, drops out of the queue.
  const rejectTryOn = async () => {
    if (!activeTryOnId) return;
    setModBusy("reject");
    try {
      await fetch("/api/try-this-look", { method: "POST", headers: modHeaders(), body: JSON.stringify({ action: "reject-tryon-request", generationId: activeTryOnId }) });
      setDeletedTryOnIds(prev => { const n = new Set(prev); n.add(activeTryOnId); return n; });
      setActive(0);
    } catch { /**/ } finally { setModBusy(""); }
  };
  const hideLook = async () => {
    setModBusy("hide");
    try {
      if (activeTryOnId) {
        // Toggle THIS try-on's visibility everywhere (grid, community, post, profile) —
        // the curated look stays. A hidden try-on remains on the card FOR THE ADMIN
        // (marked HIDDEN) so it can be re-activated; end-users never see it.
        const nextHidden = !activeTryOnHidden;
        await fetch("/api/try-this-look", { method: "POST", headers: modHeaders(), body: JSON.stringify({ action: "set-generation-feed", generationId: activeTryOnId, feed: !nextHidden }) });
        setTryOnHiddenOverride(prev => ({ ...prev, [activeTryOnId]: nextHidden }));
      } else {
        const next = !modHidden; // curated slide → unpublish/publish the look
        await fetch("/api/try-this-look", { method: "POST", headers: modHeaders(), body: JSON.stringify({ action: "update-look", id: look.id, published: !next }) });
        setModHidden(next);
      }
    } catch { /**/ } finally { setModBusy(""); }
  };
  const deleteLook = async () => {
    if (activeTryOnId) {
      if (typeof window !== "undefined" && !window.confirm("Delete this try-on permanently? (The look stays.)")) return;
      setModBusy("delete");
      try {
        await fetch("/api/try-this-look", { method: "POST", headers: modHeaders(), body: JSON.stringify({ action: "delete-generation", id: activeTryOnId }) });
        setDeletedTryOnIds(prev => { const n = new Set(prev); n.add(activeTryOnId); return n; });
        setActive(0);
      } catch { /**/ } finally { setModBusy(""); }
      return;
    }
    if (typeof window !== "undefined" && !window.confirm("Delete this look permanently?")) return;
    setModBusy("delete");
    try { await fetch("/api/try-this-look", { method: "POST", headers: modHeaders(), body: JSON.stringify({ action: "delete-look", id: look.id }) }); setModRemoved(true); }
    catch { /**/ } finally { setModBusy(""); }
  };
  // Admin: upscale the active try-on video to HD (1080p) via Pixverse, then replace it.
  const [upscaling, setUpscaling] = useState(false);
  const [idOpen, setIdOpen] = useState(false);   // "Video ersetzen" dialog (upload HD file / paste ID)
  const [idInput, setIdInput] = useState("");
  // Admin: you upscaled the video IN Pixverse yourself → paste the new video-ID (or URL) to
  // fetch + persist it and replace this try-on's video.
  const replaceFromPixverse = async (ref: string) => {
    if (!activeTryOnId || upscaling) return;
    const val = ref.trim();
    if (!val) return;
    setIdOpen(false);
    setUpscaling(true);
    try {
      let videoUrl = "";
      for (let i = 0; i < 60; i++) {
        const r = await fetch("/api/generate-tryon-video", { method: "POST", headers: modHeaders(), body: JSON.stringify({ importVideo: true, ref: val }) }).then(r => r.json());
        if (r.error) throw new Error(r.error);
        if (r.videoUrl) { videoUrl = r.videoUrl; break; }
        if (r.status === "processing") { await new Promise(res => setTimeout(res, 4000)); continue; }
        break;
      }
      if (!videoUrl) throw new Error("Kein Video erhalten (ID prüfen).");
      await fetch("/api/try-this-look", { method: "POST", headers: modHeaders(), body: JSON.stringify({ action: "attach-generation-video", generationId: activeTryOnId, videoUrl }) });
      alert("Video ersetzt ✓ — neu laden zum Ansehen.");
    } catch (e) { alert(e instanceof Error ? e.message : "Fehler beim Ersetzen"); }
    finally { setUpscaling(false); }
  };
  // Admin: download the active clip as an .mp4 (e.g. to post it to Instagram from the phone).
  const [dlBusy, setDlBusy] = useState(false);
  const downloadVideo = async () => {
    const src = (activeSlide as { url?: string })?.url || "";
    if (!src || dlBusy) return;
    setDlBusy(true);
    try {
      const blob = await fetch(src).then(r => r.blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `luxurybandit-${activeTryOnId || Date.now()}.mp4`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 8000);
    } catch { try { window.open(src, "_blank"); } catch { /**/ } }
    finally { setDlBusy(false); }
  };
  // Admin: ONE-CLICK — take the current cheap 360p try-on video and let Pixverse upscale it
  // to HD (1080p), then replace the stored clip. No manual Pixverse round-trip. Use this on
  // the keepers once a combo looks good.
  const runUpscale = async () => {
    if (!activeTryOnId || upscaling) return;
    const src = (activeSlide as { url?: string })?.url || "";
    if (!src) { alert("Kein Video zum Umrechnen gefunden."); return; }
    if (!window.confirm("Dieses Video in HD (1080p) umrechnen? Kostet Pixverse-Credits und dauert ~1–2 Min.")) return;
    setUpscaling(true);
    try {
      const start = await fetch("/api/generate-tryon-video", { method: "POST", headers: modHeaders(), body: JSON.stringify({ upscale: true, videoUrl: src }) }).then(r => r.json());
      if (!start.videoId) throw new Error(start.error || "Upscale-Start fehlgeschlagen.");
      let videoUrl = "";
      for (let i = 0; i < 90; i++) {
        await new Promise(res => setTimeout(res, 5000));
        const p = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}`).then(r => r.json());
        if (p.status === "done" && p.videoUrl) { videoUrl = p.videoUrl; break; }
        if (p.status === "failed") throw new Error(p.error || "Umrechnen fehlgeschlagen.");
      }
      if (!videoUrl) throw new Error("Zeitüberschreitung beim Umrechnen.");
      await fetch("/api/try-this-look", { method: "POST", headers: modHeaders(), body: JSON.stringify({ action: "attach-generation-video", generationId: activeTryOnId, videoUrl }) });
      alert("In HD umgerechnet ✓ — neu laden zum Ansehen.");
    } catch (e) { alert(e instanceof Error ? e.message : "Fehler beim Umrechnen"); }
    finally { setUpscaling(false); }
  };
  // Admin: upload a downloaded (HD) video FILE straight to Supabase → replace this try-on's video.
  // Direct signed-upload PUT so big files don't hit the ~4.5MB API-body limit.
  const videoFileRef = useRef<HTMLInputElement>(null);
  // Grab a poster frame from a video file (so the replaced post doesn't flash the OLD still).
  const firstFrameDataUrl = (file: File): Promise<string> => new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.muted = true; v.preload = "metadata"; v.src = url;
      const done = (out: string) => { try { URL.revokeObjectURL(url); } catch { /**/ } resolve(out); };
      v.onloadeddata = () => { try { v.currentTime = Math.min(0.1, (v.duration || 1) * 0.02); } catch { done(""); } };
      v.onseeked = () => {
        try {
          const c = document.createElement("canvas");
          c.width = v.videoWidth || 720; c.height = v.videoHeight || 1280;
          const ctx = c.getContext("2d");
          if (ctx) { ctx.drawImage(v, 0, 0, c.width, c.height); done(c.toDataURL("image/webp", 0.82)); } else done("");
        } catch { done(""); }
      };
      v.onerror = () => done("");
      setTimeout(() => done(""), 6000);
    } catch { resolve(""); }
  });
  const uploadReplace = async (file: File) => {
    if (!activeTryOnId || upscaling) return;
    if (!file.type.startsWith("video/")) { alert("Bitte eine Videodatei wählen."); return; }
    setUpscaling(true);
    try {
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
      const posterImage = await firstFrameDataUrl(file); // capture BEFORE upload (file still in memory)
      const sig = await fetch("/api/generate-tryon-video", { method: "POST", headers: modHeaders(), body: JSON.stringify({ importVideo: true, sign: true, ext }) }).then(r => r.json());
      if (!sig.uploadUrl || !sig.path) throw new Error(sig.error || "Upload konnte nicht starten (Rechte prüfen)");
      const put = await fetch(sig.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "video/mp4", "x-upsert": "true" }, body: file });
      if (!put.ok) throw new Error("Upload zu Supabase fehlgeschlagen");
      const att = await fetch("/api/generate-tryon-video", { method: "POST", headers: modHeaders(), body: JSON.stringify({ importVideo: true, videoPath: sig.path }) }).then(r => r.json());
      if (!att.videoUrl) throw new Error(att.error || "Signieren fehlgeschlagen");
      await fetch("/api/try-this-look", { method: "POST", headers: modHeaders(), body: JSON.stringify({ action: "attach-generation-video", generationId: activeTryOnId, videoUrl: att.videoUrl, ...(posterImage ? { posterImage } : {}) }) });
      setIdOpen(false);
      alert("Video ersetzt ✓ — neu laden zum Ansehen.");
    } catch (e) { alert(e instanceof Error ? e.message : "Fehler beim Hochladen"); }
    finally { setUpscaling(false); }
  };
  const openAssign = async () => {
    setAssignOpen(true);
    if (!curatorList.length) {
      try {
        // Public models list (no admin gate) so the picker always populates.
        const d = await fetch("/api/try-this-look?models=1", { headers: modHeaders() }).then(r => r.json());
        setCuratorList((d.models || [])
          .map((c: any) => ({ id: c.id, name: c.name || c.id, photoUrl: c.photoUrl || "" }))
          // Alphabetical by first name so the admin finds a model instantly.
          .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "en", { sensitivity: "base" })));
      } catch { /**/ }
    }
  };
  const assignLook = async (curatorId: string) => {
    setModBusy("assign");
    try {
      // A try-on slide → re-home the VIDEO to this model (sets its curatorId + name);
      // a plain look → reassign the look's owner.
      const body = activeTryOnId
        ? { action: "assign-generation", id: activeTryOnId, curatorId }
        : { action: "set-look-curator", lookId: look.id, curatorId };
      const res = await fetch("/api/try-this-look", { method: "POST", headers: modHeaders(), body: JSON.stringify(body) });
      const out = await res.json().catch(() => ({} as { error?: string; customerName?: string }));
      // The old silent version LOOKED broken: errors were swallowed and the feed kept
      // showing the previous name (it renders from props). Now: surface errors, and on
      // success confirm + reload so the new attribution is visible immediately.
      if (!res.ok || out.error) { alert(out.error || "Zuweisen fehlgeschlagen — Admin-PIN prüfen."); return; }
      setAssignOpen(false);
      alert(`Zugewiesen ✓${out.customerName ? ` an ${out.customerName}` : ""}`);
      window.location.reload();
    } catch { alert("Netzwerkfehler beim Zuweisen."); } finally { setModBusy(""); }
  };

  const headerBar = (
    <div className="z-20 lb-bg px-3 pb-2 pt-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => authorCuratorId && router.push(`/curator/${authorCuratorId}`)}
          className="flex min-w-0 items-center gap-2 active:opacity-80">
          <span className="w-9 aspect-[3/4] shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={authorPhotoUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(publicAuthorName(authorName))}&backgroundColor=000000&fontColor=ffffff`} alt="" className="h-full w-full object-cover" />
          </span>
          <span className="truncate text-sm font-black text-white">{publicAuthorName(authorName)}</span>
        </button>
        {isRealModel && (
          <span className="shrink-0 rounded-full bg-amber-500/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow">✓ Real model</span>
        )}
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${look.aiCreated ? "bg-white text-black" : "bg-white/10 text-white/60"}`}>
          {look.aiCreated ? "✦ Original" : "Model"}
        </span>
        {creatorSlug && (
          <button type="button" onClick={toggleFollow}
            className={`ml-auto shrink-0 rounded-full px-3.5 py-1 text-xs font-black transition active:scale-95 ${following ? "border border-white/25 text-white/60" : "lb-gold"}`}>
            {following ? "Following" : "Follow"}
          </button>
        )}
      </div>
      {/* Caption (description) right under the name, above the video. */}
      {caption && (
        <>
          <p ref={captionRef} className={`mt-1 text-[13px] leading-snug text-white/85 ${expanded ? "" : "line-clamp-1"}`}>{caption}</p>
          {clamped && (
            <button type="button" onClick={() => setExpanded(e => !e)} className="mt-0.5 text-[12px] font-bold text-white/45">
              {expanded ? "less" : "more"}
            </button>
          )}
        </>
      )}
    </div>
  );

  if (modRemoved) return null; // admin hid or deleted this look → drop the card

  return (
    <section ref={sectionRef} className="relative flex w-full flex-col lb-bg">
      {/* ── Media area — vertical format (9:16). Curator name + description render
          BELOW the video (see headerBar block after the media). ── */}
      {/* 9:16 — matches the generated try-on videos exactly (full vertical, no crop, no bars). */}
      <div ref={mediaRef} className={`relative w-full shrink-0 overflow-hidden lb-media-bg ${immersive ? "h-[100dvh]" : "aspect-[9/16]"}`}>
        {/* Blurred fill so the whole look stays visible without empty bars */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={videoStill} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-55 blur-2xl" />

        {/* Admin moderation — hide / delete / re-assign curator — top-centre over the video.
            Only the admin sees this; hidden looks stay visible here (with a HIDDEN badge). */}
        {isAdmin && !immersive && (
          <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/45 px-2 py-1.5 backdrop-blur-sm">
            {activeTryOnPending ? (
              // Pending publish request → the admin approves or rejects it.
              <>
                <button type="button" onClick={approveTryOn} disabled={!!modBusy} title="Approve — publish this try-on"
                  className="grid h-9 w-9 place-items-center rounded-full bg-amber-500/90 text-white active:opacity-70 disabled:opacity-40">
                  {modBusy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button type="button" onClick={rejectTryOn} disabled={!!modBusy} title="Reject — keep it private"
                  className="grid h-9 w-9 place-items-center rounded-full bg-red-500/90 text-white active:opacity-70 disabled:opacity-40">
                  {modBusy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                </button>
                <span className="ml-0.5 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
                  Pending
                </span>
              </>
            ) : (() => {
              const showAsHidden = activeTryOnId ? activeTryOnHidden : modHidden;
              const title = activeTryOnId
                ? (activeTryOnHidden ? "Re-activate this try-on" : "Hide this try-on (look stays)")
                : (modHidden ? "Show look to users" : "Hide look from users");
              const label = activeTryOnId ? (activeTryOnHidden ? "Hidden" : "Try-on") : (modHidden ? "Hidden" : "Look");
              return (
                <>
                  <button type="button" onClick={hideLook} disabled={!!modBusy} title={title}
                    className={`grid h-9 w-9 place-items-center rounded-full text-white active:opacity-70 disabled:opacity-40 ${showAsHidden ? "bg-amber-500/90" : "bg-amber-400/90"}`}>
                    {modBusy === "hide" ? <Loader2 className="h-4 w-4 animate-spin" /> : showAsHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={deleteLook} disabled={!!modBusy} title={activeTryOnId ? "Delete this try-on (look stays)" : "Delete look"}
                    className="grid h-9 w-9 place-items-center rounded-full bg-red-500/90 text-white active:opacity-70 disabled:opacity-40">
                    {modBusy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={openAssign} disabled={!!modBusy} title="Assign curator"
                    className="grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white active:opacity-70 disabled:opacity-40">
                    <UserPlus className="h-4 w-4" />
                  </button>
                  {/* Download the clip as .mp4 (post to Instagram from the phone). */}
                  {activeSlide?.type === "cvideo" && (
                    <button type="button" onClick={downloadVideo} disabled={dlBusy} title="Video herunterladen"
                      className="grid h-9 w-9 place-items-center rounded-full bg-white text-black active:opacity-70 disabled:opacity-40">
                      {dlBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    </button>
                  )}
                  {/* One-click: upscale THIS 360p try-on video to HD (1080p) via Pixverse. */}
                  {activeTryOnId && activeSlide?.type === "cvideo" && (
                    <button type="button" onClick={runUpscale} disabled={!!modBusy || upscaling} title="In HD umrechnen (1080p)"
                      className="grid h-9 min-w-9 place-items-center rounded-full bg-amber-400 px-2.5 text-[11px] font-black text-black active:opacity-70 disabled:opacity-40">
                      {upscaling ? <Loader2 className="h-4 w-4 animate-spin" /> : "HD"}
                    </button>
                  )}
                  {/* Replace this try-on's video with a downloaded HD file (or a Pixverse ID/URL). */}
                  {activeTryOnId && (
                    <button type="button" onClick={() => { setIdInput(""); setIdOpen(true); }} disabled={!!modBusy || upscaling} title="Video ersetzen (HD hochladen)"
                      className="grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white active:opacity-70 disabled:opacity-40">
                      {upscaling ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </button>
                  )}
                  {/* What the buttons currently target — so hiding a try-on vs the look is never ambiguous. */}
                  <span className={`ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white ${showAsHidden ? "bg-red-600" : "bg-black/60"}`}>
                    {label}
                  </span>
                </>
              );
            })()}
          </div>
        )}

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
                  {/* Only MOUNT the <video> when this look-reel is on-screen AND this is the
                      active horizontal slide (±1) — off-screen/far slides show a static
                      poster. Mobile browsers cap concurrent video decoders (~16); mounting
                      every feed video at once made none play. */}
                  {inView && Math.abs(i - active) <= 1 ? (
                  <video ref={el => { if (el) { videoRefs.current[i] = el; } else delete videoRefs.current[i]; }}
                    src={look.videoUrl} poster={videoStill || undefined} className="h-full w-full bg-black object-cover cursor-grab active:cursor-grabbing"
                    onClick={(e) => { e.stopPropagation(); handleVideoClick(); }} onMouseDown={handleVideoMouseDown} onMouseMove={handleVideoMouseMove} onMouseUp={handleVideoMouseUp} onMouseLeave={handleVideoMouseUp} muted loop playsInline preload="none" onCanPlay={syncVideos} onLoadedData={syncVideos}
                    onWaiting={() => { if (i === active) setBuffering(true); }}
                    onPlaying={() => { if (i === active) { setPlaying(true); setVidFailed(false); setBuffering(false); } }} onPause={() => { if (i === active) setPlaying(false); }} onStalled={() => { if (i === active) setPlaying(false); }} />
                  ) : videoStill ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={videoStill} alt="" loading="lazy" decoding="async" className="h-full w-full bg-black object-cover" />
                  ) : (
                    <div className="h-full w-full bg-black" />
                  )}
                  <button type="button" onClick={openLookInfo} onPointerDown={(e) => e.stopPropagation()} title="Info / history" style={{ touchAction: "manipulation" }}
                    className={`${immersive ? "hidden " : ""}absolute ${single ? "left-14" : "left-3"} top-3 z-20 flex items-center gap-1 cursor-pointer rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur transition hover:bg-black/80 active:opacity-70`}>{look.aiCreated ? "✦ AI video" : "Video"}<Info className="ml-1 h-3.5 w-3.5 opacity-90" /></button>
                </div>
              ) : m.type === "compare" ? (
                <div className="relative flex h-full w-full">
                  <div className="relative h-full w-1/2 overflow-hidden border-r border-white/25">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.beforeUrl} alt="Before" className="h-full w-full object-cover object-top" />
                    <span className="absolute left-2 top-12 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur">Before</span>
                  </div>
                  <div className="relative h-full w-1/2 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.afterUrl} alt="After" className="h-full w-full object-cover object-top" />
                    <span className="absolute left-2 top-12 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur">After</span>
                  </div>
                </div>
              ) : m.type === "cvideo" ? (
                // Community try-on video — same sound handling as the curator video.
                <div className="relative h-full w-full">
                  {/* Mount the <video> only when on-screen & near the active slide (see note above). */}
                  {inView && Math.abs(i - active) <= 1 ? (
                  <video ref={el => { if (el) { videoRefs.current[i] = el; } else delete videoRefs.current[i]; }}
                    src={m.url} poster={m.poster || videoStill} className="h-full w-full bg-black object-cover cursor-grab active:cursor-grabbing" onClick={(e) => { e.stopPropagation(); handleVideoClick(); }} onMouseDown={handleVideoMouseDown} onMouseMove={handleVideoMouseMove} onMouseUp={handleVideoMouseUp} onMouseLeave={handleVideoMouseUp} muted loop playsInline preload="none" onCanPlay={syncVideos} onLoadedData={syncVideos}
                    onWaiting={() => { if (i === active) setBuffering(true); }}
                    onPlaying={() => { if (i === active) { setPlaying(true); setVidFailed(false); setBuffering(false); } }} onPause={() => { if (i === active) setPlaying(false); }} onStalled={() => { if (i === active) setPlaying(false); }} />
                  ) : (m.poster || videoStill) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.poster || videoStill} alt="" loading="lazy" decoding="async" className="h-full w-full bg-black object-cover" />
                  ) : (
                    <div className="h-full w-full bg-black" />
                  )}
                  <button type="button" onClick={openLookInfo} onPointerDown={(e) => e.stopPropagation()} title="Info / history" style={{ touchAction: "manipulation" }}
                    className={`${immersive ? "hidden " : ""}absolute ${single ? "left-14" : "left-3"} top-3 z-20 flex items-center gap-1 cursor-pointer rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur transition hover:bg-black/80 active:opacity-70`}>Try-on video<Info className="ml-1 h-3.5 w-3.5 opacity-90" /></button>
                </div>
              ) : m.type === "cphoto" ? (
                // Community try-on photo (no before photo available, just the after result)
                <div className="relative h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={`${publicAuthorName(m.name)} try-on`} className="h-full w-full object-cover" />
                  {m.id?.startsWith("slide-") ? (
                    // Card-Studio story slides: small LuxuryBandit logo + her name, stacked,
                    // instead of the generic "X's story" info chip.
                    <button type="button" onClick={openLookInfo} onPointerDown={(e) => e.stopPropagation()} title="Info / history" style={{ touchAction: "manipulation" }}
                      className={`${immersive ? "hidden " : ""}absolute ${single ? "left-14" : "left-3"} top-3 z-20 flex flex-col items-center gap-0.5 cursor-pointer rounded-2xl bg-black/50 px-2.5 py-1.5 backdrop-blur transition hover:bg-black/70 active:opacity-70`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/lb-logo.png" alt="LuxuryBandit" className="h-6 w-6 rounded-full object-contain" />
                      <span className="text-[10px] font-black leading-none text-white">{publicAuthorName(m.name) || "LuxuryBandit"}</span>
                    </button>
                  ) : (
                    <button type="button" onClick={openLookInfo} onPointerDown={(e) => e.stopPropagation()} title="Info / history" style={{ touchAction: "manipulation" }}
                      className={`${immersive ? "hidden " : ""}absolute ${single ? "left-14" : "left-3"} top-3 z-20 flex items-center gap-1 cursor-pointer rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur transition hover:bg-black/80 active:opacity-70`}>{m.name ? `${publicAuthorName(m.name)}'s try-on` : "Try-on photo"}<Info className="ml-1 h-3.5 w-3.5 opacity-90" /></button>
                  )}
                </div>
              ) : m.type === "refimage" ? (
                // Curator-uploaded garment reference — the actual piece, shown whole
                // (object-contain on a blurred fill so odd aspect ratios aren't cropped).
                <div className="relative h-full w-full bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.label} className="absolute inset-0 h-full w-full object-contain" />
                  <span className={`${immersive ? "hidden " : ""}absolute ${single ? "left-14" : "left-3"} top-3 z-20 flex items-center gap-1 rounded-full bg-white/85 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-black/70 backdrop-blur`}>{m.label}</span>
                </div>
              ) : m.type === "image" ? (
                <div className="relative h-full w-full">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  ) : (
                    // No license-clear still (curated find whose only image is the brand's
                    // original, which we never show) and no video — nothing safe to display.
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-neutral-900 px-8 text-center">
                      <ImageOff className="h-9 w-9 text-white/30" />
                      <p className="text-sm font-black text-white/70">No preview yet</p>
                      <p className="text-[12px] font-bold leading-snug text-white/40">Add a try-on or video for this look — the original brand photo can’t be shown.</p>
                    </div>
                  )}
                  <button type="button" onClick={openLookInfo} onPointerDown={(e) => e.stopPropagation()} title="Info / history" style={{ touchAction: "manipulation" }}
                    className={`${immersive ? "hidden " : ""}absolute ${single ? "left-14" : "left-3"} top-3 z-20 flex items-center gap-1 cursor-pointer rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide backdrop-blur transition active:opacity-70 ${look.aiCreated ? "bg-black/70 text-white hover:bg-black/85" : "bg-white/85 text-black/70 hover:bg-white"}`}>
                    {look.aiCreated ? "✦ Original" : "Model"}<Info className="ml-1 h-3 w-3 opacity-80" />
                  </button>
                </div>
              ) : m.type === "product" ? (
                // Shop product slide — the ORIGINAL image at its native size, centered
                // (never upscaled/stretched), over a soft blurred fill of itself.
                <div className="relative h-full w-full overflow-hidden bg-neutral-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.alt.thumbnail} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
                    onLoad={(e) => { if (e.currentTarget.naturalWidth < 100) e.currentTarget.style.display = "none"; }}
                    onError={(e) => { const el = e.currentTarget; const u = m.alt.thumbnail || ""; if (!el.dataset.px && u) { el.dataset.px = "1"; el.src = `/api/img-proxy?url=${encodeURIComponent(u)}`; } else { el.style.display = "none"; } }} />
                  <div className="absolute inset-0 flex items-center justify-center p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.alt.thumbnail} alt="" className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
                      onLoad={(e) => { if (e.currentTarget.naturalWidth < 100) e.currentTarget.style.display = "none"; }}
                      onError={(e) => { const el = e.currentTarget; const u = m.alt.thumbnail || ""; if (!el.dataset.px && u) { el.dataset.px = "1"; el.src = `/api/img-proxy?url=${encodeURIComponent(u)}`; } else { el.style.display = "none"; } }} />
                  </div>
                  {/* Bottom scrim so the title + button stay legible over any image. */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/5 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  {/* Title above the single CTA, stacked (never overlapping). */}
                  <div className="absolute inset-x-0 bottom-7 z-20 flex flex-col items-center gap-2 px-6">
                    {(m.alt.title || m.alt.source) && (
                      <span className="max-w-full truncate text-center text-[12px] font-bold text-white drop-shadow-lg">{m.alt.title || m.alt.source}</span>
                    )}
                    <a href={m.alt.link} target="_blank" rel="sponsored noopener noreferrer"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); trackEvent("product_click", { productLabel: `${m.alt.title || m.alt.source || ""}${m.alt.price ? ` · ${m.alt.price}` : ""}`, productLink: m.alt.link || "" }); }}
                      className="flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-black text-black shadow-xl active:scale-95 transition-transform">
                      <ShoppingBag className="h-4 w-4" /> Shop Now{m.alt.price ? ` · ${m.alt.price}` : ""}
                    </a>
                  </div>
                </div>
              ) : m.type === "escape" ? (
                // Escape ("Urlaubsslide") — a real photo when we have one; otherwise a clean
                // placeholder. Favicons/tiny/dead thumbnails are hidden (never shown broken):
                // onLoad hides sub-100px images (favicons), onError proxies then hides.
                <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-neutral-600 to-neutral-900">
                  {/* Placeholder base — visible only when no real photo (the photo covers it). */}
                  <div className="absolute inset-0 grid place-items-center text-white/25"><MapPin className="h-20 w-20" strokeWidth={1.5} /></div>
                  {/* Only render the photo when it's a real image — skip favicons (which come back
                      as tiny google.com/s2/favicons icons and look broken). onLoad also hides any
                      other sub-100px image; onError proxies then hides. */}
                  {m.esc.thumbnail && !/s2\/favicons|favicon/i.test(m.esc.thumbnail) && (<>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.esc.thumbnail} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
                      onLoad={(e) => { if (e.currentTarget.naturalWidth < 100) e.currentTarget.style.display = "none"; }}
                      onError={(e) => { const el = e.currentTarget; const u = m.esc.thumbnail || ""; if (!el.dataset.px && u) { el.dataset.px = "1"; el.src = `/api/img-proxy?url=${encodeURIComponent(u)}`; } else { el.style.display = "none"; } }} />
                    <div className="absolute inset-0 flex items-center justify-center p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.esc.thumbnail} alt="" className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
                        onLoad={(e) => { if (e.currentTarget.naturalWidth < 100) e.currentTarget.style.display = "none"; }}
                        onError={(e) => { const el = e.currentTarget; const u = m.esc.thumbnail || ""; if (!el.dataset.px && u) { el.dataset.px = "1"; el.src = `/api/img-proxy?url=${encodeURIComponent(u)}`; } else { el.style.display = "none"; } }} />
                    </div>
                  </>)}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/5 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-7 z-20 flex flex-col items-center gap-2 px-6">
                    {(m.esc.title || m.esc.region || m.esc.source) && (
                      <span className="max-w-full truncate text-center text-[12px] font-bold text-white drop-shadow-lg">{m.esc.title || m.esc.region || m.esc.source}</span>
                    )}
                    <a href={m.esc.link} target="_blank" rel="sponsored noopener noreferrer"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); trackEvent("product_click", { productLabel: `🏝️ ${m.esc.title || m.esc.region || m.esc.source || "Escape"}${m.esc.price ? ` · ${m.esc.price}` : ""}`, productLink: m.esc.link || "", productThumb: m.esc.thumbnail || "" }); }}
                      className="flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-black text-black shadow-xl active:scale-95 transition-transform">
                      <MapPin className="h-4 w-4" /> Explore{m.esc.price ? ` · ${m.esc.price}` : ""}
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Overlay — shown whenever the ACTIVE video isn't playing. Videos don't autoplay
            (data-saving), so the poster stays visible with a Play button. Two modes:
            • BUFFERING (tapped, still fetching the HD clip): the scanner reveal — a beam
              sweeps over the poster with viewfinder corners, so the wait feels intentional.
            • IDLE/PAUSED: a tappable Play button over the poster.
            The whole overlay is tappable → plays. Hidden while scrubbing. */}
        {(media[active]?.type === "video" || media[active]?.type === "cvideo") && inView && !playing && !scrubRef.current.isScrubbing && (
          <button type="button" aria-label={buffering ? "Loading" : "Play"}
            onClick={() => { const v = videoRefs.current[active]; if (v) { pausedRef.current = false; setPaused(false); v.muted = muted; if (v.readyState < 3) setBuffering(true); v.play().then(() => { setVidFailed(false); setPlaying(true); }).catch(() => setVidFailed(true)); } }}
            className="absolute inset-0 z-10 grid place-items-center overflow-hidden">
            {buffering ? (
              <>
                {/* Scanner reveal over the poster while the clip loads. */}
                <span className="absolute inset-0 bg-black/30" />
                <span className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-[2px] bg-white shadow-[0_0_18px_5px_rgba(255,255,255,0.7)]" />
                <span className="lb-scanline pointer-events-none absolute inset-x-0 z-10 h-14 -translate-y-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
                <span className="pointer-events-none absolute left-3 top-3 z-20 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-white/90" />
                <span className="pointer-events-none absolute right-3 top-3 z-20 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-white/90" />
                <span className="pointer-events-none absolute bottom-3 left-3 z-20 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-white/90" />
                <span className="pointer-events-none absolute bottom-3 right-3 z-20 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-white/90" />
                <span className="relative z-20 flex items-center gap-2 text-white"><Sparkles className="h-4 w-4 animate-pulse" /><span className="text-sm font-black">Loading…</span></span>
              </>
            ) : (
              <>
                <span className="absolute inset-0 bg-black/25" />
                <Play className="relative z-10 h-16 w-16 fill-white/85 text-white/85" />
              </>
            )}
          </button>
        )}

        {/* Sound toggle — gates the ACTIVE clip's own baked-in music. Unmuting plays the
            video WITHIN this click gesture so the browser doesn't pause it for autoplay.
            Stays visible in fullscreen too (sound control is essential). */}
        <button type="button" aria-label={muted ? "Unmute" : "Mute"}
          onClick={(e) => {
            e.stopPropagation();
            const next = !muted;
            setMuted(() => next);
            const v = videoRefs.current[active];
            if (v) { v.muted = next; if (!next && !pausedRef.current) v.play().catch(() => {}); }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur active:scale-90 transition-transform ${immersive ? "bottom-4 left-4 z-30 opacity-70" : "bottom-3 left-3 z-10"}`}>
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* Fullscreen: hide ALL chrome to watch the video clean. Enter = button next to
            mute; exit = a subtle corner button (nothing else is on screen). */}
        {!immersive ? (
          <button type="button" aria-label="Fullscreen" onClick={(e) => { e.stopPropagation(); setImmersive(true); }} onPointerDown={(e) => e.stopPropagation()}
            className="absolute bottom-3 right-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur active:scale-90 transition-transform">
            <Maximize2 className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" aria-label="Exit fullscreen" onClick={(e) => { e.stopPropagation(); setImmersive(false); }} onPointerDown={(e) => e.stopPropagation()}
            className="absolute bottom-4 right-4 z-30 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white/70 opacity-70 backdrop-blur active:scale-90 transition">
            <Minimize2 className="h-5 w-5" />
          </button>
        )}

        {/* ON the video: the try-on CTA — "See her in other looks". ("Bandit the feeling"
            lives BELOW the video now, in the white caption bar.) */}
        {!immersive && ["video", "cvideo", "compare", "cphoto", "image"].includes(media[active]?.type as string) && (
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2">
            <button type="button"
              onClick={(e) => {
                e.stopPropagation();
                // Open HER price-finder chat (her photo + her looks), same as her profile.
                // Falls back to a look reference if this video has no model attached.
                const lg = (() => { try { return localStorage.getItem("lb_lang") === "ro" ? "ro" : "en"; } catch { return "en"; } })();
                if (authorCuratorId) { router.push(`/chat/${authorCuratorId}`); return; }
                const L = look as { name?: string; frontImageUrl?: string; imageUrl?: string; videoPosterUrl?: string };
                const m = media[active] as { poster?: string; url?: string; afterUrl?: string } | undefined;
                const img = L.frontImageUrl || L.imageUrl || m?.poster || m?.afterUrl || m?.url || L.videoPosterUrl || "";
                try { sessionStorage.setItem("lb_bandit_ref", JSON.stringify({ img, hint: L.name || "", kind: "product" })); } catch { /**/ }
                router.push("/luxury-products");
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/25 bg-black/45 px-6 py-2.5 text-sm font-black text-white backdrop-blur active:scale-95 transition">
              {authorCuratorId
                ? <><MessageCircle className="h-4 w-4" /> Chat with {publicAuthorName(authorName).split(/\s+/)[0]}</>
                : <><Search className="h-4 w-4" /> {feedLang === "en" ? "Find your look" : "Găsește-ți ținuta"}</>}
            </button>
            <button type="button"
              onClick={(e) => { e.stopPropagation(); goTryOn(); }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`lb-gold flex items-center gap-2 whitespace-nowrap rounded-full px-8 py-3.5 text-sm font-black shadow-xl transition-all duration-200 active:scale-95 ${(banditRevealed || (showBanditBtn && !banditCreating)) ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"}`}>
              <Sparkles className="h-4 w-4" /> See her in other looks
            </button>
          </div>
        )}

        {/* "Creating slides" hint while the carousel is being built. */}
        {banditCreating && (
          <div className="absolute inset-0 z-30 grid place-items-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-white" />
              <p className="text-lg font-black text-white">You bandit the look!</p>
              <p className="text-xs font-bold text-white/80">Die Ergebnisse werden gesucht …</p>
            </div>
          </div>
        )}


        {/* Right rail (on the image) — anchored to the TOP edge of the video so it
            clears the model's body and the bottom action buttons. */}
        {!immersive && (
          <div className="absolute right-2.5 top-3 z-10 flex flex-col items-center gap-4">
            <RailButton icon={<Heart className="h-8 w-8" fill={liked ? "currentColor" : "none"} strokeWidth={2} />} label={likeCount > 0 ? fmtCount(likeCount) : "Like"} active={liked} onClick={toggleLike} />
            <RailButton icon={<Bookmark className="h-8 w-8" fill={saved ? "currentColor" : "none"} strokeWidth={2} />} label={saved ? "Saved" : "Save"} active={saved} onClick={toggleSave} />
            <RailButton icon={<Send className="h-7 w-7" strokeWidth={2} />} label="Share" onClick={share} />
            <RailButton icon={<Home className="h-7 w-7" strokeWidth={2} />} label="Home" onClick={onClose ?? (() => router.push("/stores?view=grid"))} />
          </div>
        )}
      </div>

      {/* Carousel dots — directly under the video (Instagram-style) */}
      {media.length > 1 && !immersive && (
        <div className="shrink-0 flex justify-center gap-1.5 lb-bg pt-2 pb-1">
          {media.map((_, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${active === i ? "bg-white" : "bg-white/30"}`} />
          ))}
        </div>
      )}

      {/* Curator + badge — always below the video (name + description under the post). */}
      <div className={`shrink-0 ${immersive ? "hidden" : ""}`}>{headerBar}</div>

      {/* ── Dark caption + actions (Instagram-style, below the image) ── */}
      <div className={`shrink-0 lb-bg px-4 pt-2.5 ${immersive ? "hidden" : ""}`} style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4rem)" }}>
        {/* Who recreated this look — ADMIN ONLY (business secret). Sits under the
            caption. Replaces the old "Shop now" card; shopping is via "Bandit the look!". */}
        {single && isAdmin && (
          community.length > 0 ? (
            <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5">
              <p className="mb-2 px-0.5 text-[11px] font-black uppercase tracking-wide text-white/45">
                Admin · {community.length} {community.length === 1 ? "person tried this on" : "people tried this on"}
              </p>
              <div className="flex flex-col gap-1.5">
                {community.slice(0, 12).map((c, i) => {
                  const slug = (c.name ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                  const row = (
                    <>
                      <span className="w-9 aspect-[3/4] shrink-0 overflow-hidden rounded-lg bg-black/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.imageUrl} alt={c.name ? publicAuthorName(c.name) : "Member"} className="h-full w-full object-cover object-top" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-black text-white">{c.name ? publicAuthorName(c.name) : "Member"}</span>
                      {c.videoUrl && <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white/50">Video</span>}
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
            <p className="mt-2 px-0.5 text-[12px] font-bold text-white/45">Admin · no try-ons yet</p>
          )
        )}
        <div className="mt-1 flex items-center gap-3">
          <button type="button" onClick={() => setGate({ mode: "feedback" })} className="text-[12px] font-bold text-white/45">💬 Feedback / Contact</button>
        </div>
        {/* Slim recruiting ad — a GOLD BUTTON on every ~4th post (parent decides),
            scrolls with the caption so the snap feed stays untouched. */}
        {recruitAd && (
          <a href="/own-influencer"
            className="lb-gold mt-3 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12px] font-black active:scale-95 transition">
            <BadgeCheck className="h-4 w-4 shrink-0" /> Become a LuxuryBandit Model — every look pays →
          </a>
        )}
      </div>

      {/* Join / feedback sheet — Follow gate (register/sign-in) or "write us" feedback. */}
      {gate && (
        <FeedGate mode={gate.mode} reason={gate.reason} lookId={look.id} lookName={look.name} onClose={() => setGate(null)} onAuthed={gate.mode === "auth" ? doFollow : undefined} />
      )}

      {/* Chat with the model — opens from the "Chat with her" CTA on the video. */}
      {authorCuratorId && (
        <ModelChat
          open={showChat}
          onClose={() => setShowChat(false)}
          curatorId={authorCuratorId}
          modelName={publicAuthorName(authorName)}
          modelFirstName={publicAuthorName(authorName).split(/\s+/)[0] || ""}
          avatarUrl={authorPhotoUrl || ""}
          isPaid={isSubscribed}
          onNeedPremium={() => { setShowChat(false); setShowSubscribe(true); }}
        />
      )}
      <PremiumDialog open={showPremium} onClose={() => setShowPremium(false)} />
      <SubscribeDialog open={showSubscribe} onClose={() => setShowSubscribe(false)} />

      {/* Admin: assign this curated look to a curator */}
      {/* Paste the Pixverse video-ID/URL you upscaled yourself → replace this try-on's video. */}
      {idOpen && (
        <div className="lb-phone-col fixed inset-0 z-[90] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => !upscaling && setIdOpen(false)}>
          <div className="w-full rounded-t-3xl bg-white p-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }} onClick={e => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-black text-black">Video ersetzen (HD)</p>
              <button type="button" onClick={() => !upscaling && setIdOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-black/5"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-1 text-[12px] font-bold text-black/45">Lade das in Pixverse heruntergeladene HD-Video hoch — es wird bei uns gespeichert und ersetzt das alte.</p>
            {(() => { const n = (community.find(c => c.id === activeTryOnId) as { name?: string } | undefined)?.name; return n ? <p className="mb-3 text-[12px] font-black text-black">Ersetzt das Video von: {publicAuthorName(n)}</p> : <div className="mb-2" />; })()}
            {/* Primary: upload the downloaded file (works with ANY Pixverse account). */}
            <button type="button" onClick={() => videoFileRef.current?.click()} disabled={upscaling}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-sm font-black text-white active:scale-95 transition disabled:opacity-40">
              {upscaling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {upscaling ? "Wird ersetzt …" : "Video-Datei hochladen"}
            </button>
            <input ref={videoFileRef} type="file" accept="video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void uploadReplace(f); e.currentTarget.value = ""; }} />
            {/* Secondary: paste a Pixverse video-ID/URL (only works if it's the API account). */}
            <div className="my-3 flex items-center gap-2 text-[11px] font-black text-black/25"><span className="h-px flex-1 bg-black/10" />ODER PER ID/URL<span className="h-px flex-1 bg-black/10" /></div>
            <div className="flex gap-2">
              <input value={idInput} onChange={e => setIdInput(e.target.value)}
                placeholder="Pixverse Video-ID oder https://…-URL"
                className="h-11 min-w-0 flex-1 rounded-xl border border-black/12 bg-black/[0.02] px-3 text-sm font-bold text-black outline-none focus:border-black/40" />
              <button type="button" onClick={() => void replaceFromPixverse(idInput)} disabled={upscaling || !idInput.trim()}
                className="shrink-0 rounded-xl bg-black/[0.06] px-4 text-sm font-black text-black active:scale-95 transition disabled:opacity-40">Los</button>
            </div>
          </div>
        </div>
      )}

      {assignOpen && (
        <div className="lb-phone-col fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setAssignOpen(false)}>
          <div className="w-full rounded-t-3xl bg-white p-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }} onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-black text-black">Assign to a model</p>
              <button type="button" onClick={() => setAssignOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-black/5"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex max-h-[55dvh] flex-col gap-1 overflow-y-auto">
              {curatorList.length === 0 && <p className="py-6 text-center text-[12px] font-bold text-black/35">Loading models…</p>}
              {curatorList.map(c => (
                <button key={c.id} type="button" disabled={!!modBusy} onClick={() => void assignLook(c.id)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-black active:bg-black/[0.04] ${authorCuratorId === c.id ? "bg-black/[0.05]" : ""}`}>
                  <span className="w-10 aspect-[3/4] shrink-0 overflow-hidden rounded-xl bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.photoUrl
                      ? <img src={c.photoUrl} alt="" loading="lazy" className="h-full w-full object-cover object-top" />
                      : <span className="grid h-full w-full place-items-center text-xs font-black text-black/30">{c.name.slice(0, 1)}</span>}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  {authorCuratorId === c.id && <span className="shrink-0 text-[11px] font-black text-amber-600">current</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
                    <Row k="By" v={<span>{d.who || "—"}{d.isCurator && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-700">CURATOR</span>}</span>} />
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [gate, setGate] = useState(false); // inline register sheet when commenting logged-out

  const me = (() => { try { return JSON.parse(localStorage.getItem("lb_curator") ?? "{}"); } catch { return {}; } })();

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
    // Accept EITHER a curator login OR a Supabase account. Logged out → open the SAME
    // inline register sheet as Follow (no navigation, no white-page risk).
    const sess = getStoredAuthSession();
    if (!me?.id && !sess) { setGate(true); return; }
    const authorName = me.firstName
      || (sess?.user as any)?.user_metadata?.full_name
      || (sess?.user as any)?.user_metadata?.name
      || sess?.user?.email?.split("@")[0]
      || "You";
    setPosting(true);
    const optimistic: Comment = { id: `tmp-${Date.now()}`, authorName, text: t, createdAt: new Date().toISOString() };
    setComments(c => [optimistic, ...c]); setText("");
    try {
      const res = await fetch("/api/try-this-look", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add-comment", lookId: look.id, text: t, authorName }) });
      const d = await res.json();
      if (Array.isArray(d.comments)) setComments(d.comments);
    } catch { /* keep optimistic */ }
    setPosting(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="lb-phone-col fixed inset-x-0 bottom-0 z-[61] flex max-h-[75dvh] flex-col rounded-t-2xl bg-white">
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
              placeholder="Add a comment…"
              className="h-11 flex-1 rounded-full border border-black/12 bg-black/[0.03] px-4 text-sm outline-none focus:border-black" />
            <button type="button" onClick={() => void post()} disabled={posting || !text.trim()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black text-white disabled:opacity-30">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
      {gate && (
        <FeedGate mode="auth" reason="Create a free account to comment." lookId={look.id} lookName={look.name}
          onClose={() => setGate(false)} onAuthed={() => { setGate(false); void post(); }} />
      )}
    </>
  );
}

export default function HomeFeed({ looks, single = false, initialLookId, initialTryOnId, onClose, realModelIds = [] }: { looks: FeedLook[]; single?: boolean; initialLookId?: string; initialTryOnId?: string; onClose?: () => void; realModelIds?: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [commentsFor, setCommentsFor] = useState<FeedLook | null>(null);
  // One global sound switch for the whole feed. It now gates each clip's OWN baked-in
  // music (Pixverse generate_audio_switch) — the active <video> plays its audio when
  // unmuted (see syncVideos). The old global /public mp3 soundtrack is DISABLED so it
  // can't double up with the per-clip music; tracksRef stays empty → playTrack no-ops.
  const [muted, setMuted] = useState(true);
  const mutedRef = useRef(true); mutedRef.current = muted;
  const audioRef = useRef<HTMLAudioElement>(null);
  const tracksRef = useRef<string[]>([]);
  const curTrack = useRef(-1);
  const positions = useRef<Record<number, number>>({}); // per-track playback position
  // Global soundtrack disabled — the feed now uses each clip's baked-in music. (Re-enable
  // by restoring the /api/feed-music fetch here if you ever want a global track again.)

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
  // Looks in given order — the FINAL order is decided per POST below (pinned first,
  // then the post's own date), so the reel runs in the SAME row as the grid.
  const sorted = [...looks];

  // ONE POST PER TRY-ON. Each community try-on becomes its own post (just its video +
  // Before/After — see the `media` array). Looks with no try-on stay a single look-video
  // post. This makes the feed the exact mirror of the grid (one tile per try-on).
  const expanded: { look: FeedLook; key: string }[] = [];
  for (const lk of sorted) {
    const tryOns = (lk.communityTryOns ?? []).filter(c => !c.hidden && (c.videoUrl || c.imageUrl));
    if (tryOns.length === 0) {
      // A look-only post must have a VIDEO to enter the feed — flat clothing/product
      // stills have no place in the reel (user: "hier haben klamotten nichts zu suchen").
      // This matches the grid (which also requires a video), so grid = feed. Garments
      // stay in the catalogue/wardrobe; they only reach the feed via a try-on video.
      // Deep-linked looks still open so an admin can see one that needs media.
      const displayable = !!lk.videoUrl;
      const isWardrobe = (lk as { productType?: string }).productType === "ai" || (lk as { wardrobe?: boolean }).wardrobe === true;
      // Wardrobe garments NEVER become a feed post — not even when deep-linked (a flat
      // garment still opened via /look/[id] is exactly what the user wants gone).
      if ((displayable || lk.id === initialLookId) && !isWardrobe) expanded.push({ look: lk, key: lk.id });
      continue;
    }
    tryOns.forEach((t, idx) => expanded.push({ look: { ...lk, communityTryOns: [t] }, key: `${lk.id}::${t.id ?? idx}` }));
  }

  // Deep-link: when opened on a specific post (/look/[id]), ROTATE the feed so the
  // target look is first (scrollTop 0). This is rock-solid — unlike scrolling to a
  // computed offset, it doesn't depend on the (variable, still-loading) heights of
  // the posts above the target, which used to land us on the neighbouring look.
  // EXACT grid order: pinned posts first, then per-post date (a try-on sorts by ITS
  // createdAt, a look-video post by its video/look date) — the reel and the
  // Fashionshow grid run in the same row.
  const postDate = (e: { look: FeedLook }) => {
    const t = e.look.communityTryOns?.[0];
    if (t) return String(t.createdAt ?? e.look.createdAt ?? "");
    const v = String(e.look.videoCreatedAt ?? "");
    const c = String(e.look.createdAt ?? "");
    return v > c ? v : c;
  };
  const pinnedFirst = [...expanded].sort((a, b) =>
    ((b.look.communityTryOns?.[0]?.pinned ? 1 : 0) - (a.look.communityTryOns?.[0]?.pinned ? 1 : 0))
    || postDate(b).localeCompare(postDate(a)));
  const startIdx = initialTryOnId
    ? pinnedFirst.findIndex(e => e.look.communityTryOns?.[0]?.id === initialTryOnId)
    : initialLookId ? pinnedFirst.findIndex(e => e.look.id === initialLookId) : -1;
  const feed = startIdx > 0 ? [...pinnedFirst.slice(startIdx), ...pinnedFirst.slice(0, startIdx)] : pinnedFirst;

  // Always open at the FIRST slide. Rotation puts the target look at feed[0], but
  // the browser can restore a previous scrollTop on (re)mount and leave us parked
  // mid-feed — so force the scroll back to the top once on mount.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {feed.map((entry, i) => <Slide key={entry.key} look={entry.look} onComment={setCommentsFor} muted={muted} setMuted={setMuted} index={i} onActive={handleActive} single={single} onClose={onClose} recruitAd={i % 4 === 1} realModelIds={realModelIds} />)}
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
