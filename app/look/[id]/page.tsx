"use client";

export const dynamic = "force-dynamic";

import CropModal from "@/components/CropModal";
import HomeFeed, { type FeedLook } from "@/components/HomeFeed";
import { getClientAccountId } from "@/lib/client-account";
import {
  getStoredAuthSession,
  resetPassword,
  signInWithPassword,
  signUpWithPassword,
  type SupabaseAuthSession,
} from "@/lib/supabase-auth-client";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  ChevronLeft,
  Download,
  Home,
  Image as ImageIcon,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  ShoppingBag,
  Sparkles,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";

type Look = {
  id: string;
  name: string;
  storeName?: string;
  storeSlug?: string;
  storeAddress?: string;
  price?: string;
  salePrice?: string;
  discountLabel?: string;
  inStock?: boolean;
  availableSizes?: string[];
  productNote?: string;
  buyUrl?: string;
  alternatives?: { title: string; link: string; source?: string; thumbnail: string; price?: string; priceValue?: number; currency?: string }[];
  imageUrl: string;
  frontImageUrl?: string;
  garmentFrontImageUrl?: string;
  galleryImageUrls?: string[];
  curatorId?: string;
  curatorName?: string;
  curatorPhotoUrl?: string;
  curatorMotto?: string;
  curatorNote?: string;
  commentsOff?: boolean;
};

type Payload = { looks?: Look[]; error?: string };
type UserLook = { id: string; lookId: string; imageUrl: string; thumbUrl?: string; userPhotoUrl?: string; customerName: string; createdAt: string };

// Route Supabase images through Next.js' built-in image optimizer so they are
// served as right-sized WebP instead of full-resolution PNGs. Non-Supabase or
// empty URLs are returned unchanged (e.g. data: URLs for fresh local previews).
function optImg(url: string | undefined, w = 1080, q = 70): string {
  if (!url || !url.includes("/storage/v1/")) return url ?? "";
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=${q}`;
}
type Comment = { id: string; lookId: string; authorName: string; text: string; createdAt: string };

// Deterministic seed comments so every look feels alive
const SEED_TEXTS = [
  ["Obsessed with this look 🔥", "Need this in my wardrobe ASAP"],
  ["This is everything 😍", "Where can I get this??"],
  ["Stunning combination 💕", "The details are insane"],
  ["This gives main character energy 🖤", "Absolutely love it"],
  ["Slay! This is so unique 🌟", "Can't stop staring at this"],
  ["This is art 🎨", "Bold and beautiful"],
  ["Living for this aesthetic ✨", "So editorial!"],
  ["Goals 🙌", "This is exactly my vibe"],
];
const SEED_NAMES = ["Sofia", "Luna", "Mia", "Emma", "Lena", "Zara", "Nina", "Alicia", "Sara", "Leyla", "Vera", "Maja"];
function seedComments(lookId: string): Comment[] {
  let h = 0;
  for (let i = 0; i < lookId.length; i++) { h = Math.imul(31, h) + lookId.charCodeAt(i) | 0; }
  const abs = Math.abs(h);
  const pair = SEED_TEXTS[abs % SEED_TEXTS.length];
  const count = 2 + (abs % 3); // 2-4 seed comments
  const out: Comment[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (abs + i * 7) % SEED_TEXTS.length;
    const textIdx = (abs + i * 3) % 2;
    const nameIdx = (abs + i * 11) % SEED_NAMES.length;
    void pair;
    out.push({
      id: `seed-${lookId}-${i}`,
      lookId,
      authorName: SEED_NAMES[nameIdx],
      text: SEED_TEXTS[idx][textIdx],
      createdAt: new Date(Date.now() - (i + 1) * 3600000 * (2 + (abs + i) % 12)).toISOString(),
    });
  }
  return out;
}

// Seeded engagement counts for generation cards
function seedInt(id: string, salt: string, min: number, max: number): number {
  let h = 0;
  const s = id + salt;
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  return min + (Math.abs(h) % (max - min + 1));
}
function fmtCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
function genLikeCount(id: string) { return seedInt(id, "_gl", 18, 480); }
// A curator session (localStorage) counts as signed in — no Supabase token needed.
function isAuthed() {
  if (getStoredAuthSession()) return true;
  try { return !!JSON.parse(localStorage.getItem("lb_curator") ?? "{}").id; } catch { return false; }
}
function genCommentCount(id: string) { return seedInt(id, "_gc", 2, 28); }
function genViewCount(id: string) { return seedInt(id, "_gv", 200, 980); }

const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Photo could not be read."));
    reader.readAsDataURL(file);
  });

const dataUrlToBlob = (dataUrl: string) => {
  const [header, payload] = dataUrl.split(",");
  const mimeType = header.match(/data:(.*?)(;base64)?$/)?.[1] ?? "image/png";
  if (header.includes(";base64")) {
    const bytes = window.atob(payload);
    const arr = Array.from(bytes, (c) => c.charCodeAt(0));
    return new Blob([new Uint8Array(arr)], { type: mimeType });
  }
  return new Blob([decodeURIComponent(payload)], { type: mimeType });
};

const imageUrlToDataUrl = async (src: string) => {
  const res = await fetch(src);
  if (!res.ok) throw new Error("Product image could not be loaded.");
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Product image could not be processed."));
    reader.readAsDataURL(blob);
  });
};

// ── Save button ──────────────────────────────────────────────────────────────
function SaveBtn({ lookId }: { lookId: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try { setSaved((JSON.parse(localStorage.getItem("lb_saved") ?? "[]") as string[]).includes(lookId)); } catch { /**/ }
  }, [lookId]);
  const toggle = () => {
    try {
      const list = JSON.parse(localStorage.getItem("lb_saved") ?? "[]") as string[];
      const next = saved ? list.filter(id => id !== lookId) : [...list, lookId];
      localStorage.setItem("lb_saved", JSON.stringify(next));
      setSaved(!saved);
    } catch { /**/ }
  };
  return (
    <button type="button" onClick={toggle} className="grid h-11 w-11 place-items-center">
      <Heart className={`h-6 w-6 drop-shadow ${saved ? "fill-red-500 text-red-500" : "fill-black/20 text-white"}`} />
    </button>
  );
}

// ── Bookmark button ──────────────────────────────────────────────────────────
function BookmarkBtn({ lookId, onAuthRequired }: { lookId: string; onAuthRequired?: () => void }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try { setSaved((JSON.parse(localStorage.getItem("lb_bookmarks") ?? "[]") as string[]).includes(lookId)); } catch { /**/ }
  }, [lookId]);
  const toggle = () => {
    if (onAuthRequired && !isAuthed()) { onAuthRequired(); return; }
    try {
      const list = JSON.parse(localStorage.getItem("lb_bookmarks") ?? "[]") as string[];
      const next = saved ? list.filter(id => id !== lookId) : [...list, lookId];
      localStorage.setItem("lb_bookmarks", JSON.stringify(next));
      setSaved(!saved);
    } catch { /**/ }
  };
  return (
    <button type="button" onClick={toggle} className="flex flex-col items-center gap-[3px] active:scale-90 transition-transform">
      <Bookmark strokeWidth={2} className={`h-7 w-7 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] transition-transform ${saved ? "fill-white text-white" : "text-white"}`} />
      <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">Save</span>
    </button>
  );
}

// ── Like button (Instagram Reels style) ──────────────────────────────────────
function SaveBtnInsta({ lookId, initialCount, onAuthRequired }: { lookId: string; initialCount: number; onAuthRequired?: () => void }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  useEffect(() => {
    try { setLiked((JSON.parse(localStorage.getItem("lb_saved") ?? "[]") as string[]).includes(lookId)); } catch { /**/ }
  }, [lookId]);
  const toggle = async () => {
    if (onAuthRequired && !isAuthed()) { onAuthRequired(); return; }
    const next = !liked;
    try {
      const list = JSON.parse(localStorage.getItem("lb_saved") ?? "[]") as string[];
      localStorage.setItem("lb_saved", JSON.stringify(next ? [...list, lookId] : list.filter(id => id !== lookId)));
    } catch { /**/ }
    setLiked(next);
    setCount(c => c + (next ? 1 : -1));
    fetch("/api/try-this-look", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "like", lookId, liked: next }),
    }).catch(() => {});
  };
  return (
    <button type="button" onClick={toggle} className="flex flex-col items-center gap-[3px] active:scale-90 transition-transform">
      <Heart strokeWidth={2} className={`h-7 w-7 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] transition-transform ${liked ? "fill-red-500 text-red-500 scale-110" : "text-white"}`} />
      <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">{count > 0 ? String(count) : "Like"}</span>
    </button>
  );
}

// ── Follow button ────────────────────────────────────────────────────────────
function FollowBtn({ storeSlug, storeName, iconOnly }: { storeSlug: string; storeName: string; iconOnly?: boolean }) {
  const [following, setFollowing] = useState(false);
  useEffect(() => {
    try { setFollowing((JSON.parse(localStorage.getItem("lb_following") ?? "[]") as string[]).includes(storeSlug)); } catch { /**/ }
  }, [storeSlug]);
  const toggle = () => {
    try {
      const list = JSON.parse(localStorage.getItem("lb_following") ?? "[]") as string[];
      const next = following ? list.filter(s => s !== storeSlug) : [...list, storeSlug];
      localStorage.setItem("lb_following", JSON.stringify(next));
      setFollowing(!following);
    } catch { /**/ }
  };
  if (iconOnly) {
    return (
      <button type="button" onClick={toggle} aria-label={following ? "Following" : "Follow"}
        className={`grid h-7 w-7 place-items-center rounded-full shadow active:scale-90 transition ${following ? "bg-white/30 text-white" : "bg-cobalt text-white"}`}>
        {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex h-7 items-center rounded-full px-3.5 text-xs font-black transition ${following ? "bg-white/20 text-white" : "bg-white text-black"}`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}

/** Mounts → locks body scroll; unmounts → restores it. Use conditionally by rendering only when needed. */
function ScrollLock() { useScrollLock(); return null; }

// ── Main page ────────────────────────────────────────────────────────────────
export default function LookPage() {
  const params = useParams();
  const router = useRouter();
  const lookId = String(params?.id ?? "");

  // Look data
  const [look, setLook] = useState<Look | null>(null);
  const [allLooks, setAllLooks] = useState<Look[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Gallery
  const [imgIndex, setImgIndex] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const dragX = useRef(0);
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartTime = useRef(0);
  const isDraggingGallery = useRef(false);

  // Panels: 0 = main look, 1 = try-on
  const [panel, setPanel] = useState<0 | 1>(0);

  // Contact form (panel 0)
  const [showContact, setShowContact] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Try-on (panel 1)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [accountId, setAccountId] = useState("");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [tryConfirming, setTryConfirming] = useState(false);
  const [userLooks, setUserLooks] = useState<UserLook[]>([]);
  const [showUserLooks, setShowUserLooks] = useState(false);
  const [generationLikes, setGenerationLikes] = useState<Record<string, boolean>>({});
  const [shareNameInput, setShareNameInput] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [sharedToGallery, setSharedToGallery] = useState(false);
  const [savedModelMeta, setSavedModelMeta] = useState<{ fromLookName: string; fromStoreName: string } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentName, setCommentName] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tryOnError, setTryOnError] = useState<string | null>(null);
  const [isDraft, setIsDraft] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const generationStartRef = useRef<number | null>(null);

  // ── Auth ──
  const [authSession, setAuthSession] = useState<SupabaseAuthSession | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [kbOffset, setKbOffset] = useState(0); // keyboard push-up offset

  // Lock body scroll when auth modal is open (prevents iOS background scroll)
  useEffect(() => {
    if (!showAuthModal) return;
    const y = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overscrollBehavior = "";
      window.scrollTo(0, y);
    };
  }, [showAuthModal]);

  // Push auth sheet above keyboard on iOS (visualViewport shrinks when keyboard opens)
  useEffect(() => {
    if (!showAuthModal || typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      const hidden = window.innerHeight - vv.height - vv.offsetTop;
      setKbOffset(Math.max(0, hidden));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, [showAuthModal]);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  // pending action to run after login
  const pendingGenerateRef = useRef(false);

  // Swipe tracking
  const touchStartX = useRef<number | null>(null);   // unused, kept for safety
  const panelStartX = useRef<number | null>(null);
  const panelStartY = useRef<number | null>(null);
  const gallerySwipedRef = useRef(false);            // unused, kept for safety
  // Vertical carousel drag (TikTok-style)
  const [verticalDrag, setVerticalDrag] = useState(0);
  const [verticalSnapping, setVerticalSnapping] = useState(false);
  const verticalDragRef = useRef(0);
  const isDraggingVertical = useRef(false);
  // Wheel / trackpad scroll debounce
  const wheelCooldown = useRef(false);

  // Load auth session on mount + listen for changes
  useEffect(() => {
    setAuthSession(getStoredAuthSession());
    const handler = () => setAuthSession(getStoredAuthSession());
    window.addEventListener("luxurybandit-auth-updated", handler);
    return () => window.removeEventListener("luxurybandit-auth-updated", handler);
  }, []);

  // Load generation likes from localStorage
  useEffect(() => {
    try { setGenerationLikes(JSON.parse(localStorage.getItem("lb_gen_likes") ?? "{}")); } catch { /**/ }
  }, []);

  useEffect(() => {
    setAccountId(getClientAccountId());
    // Extract real look ID from slug format "name--look-id"
    const ddIdx = lookId.lastIndexOf("--");
    const resolvedLookId = ddIdx >= 0 ? lookId.slice(ddIdx + 2) : lookId;

    fetch("/api/try-this-look")
      .then(r => r.json())
      .then((p: Payload) => {
        const all = p.looks ?? [];
        const toSlug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        // New URL format: "readable-slug--look-id" — extract ID after double dash
        // Also support legacy: raw ID or plain name slug
        const extractId = (param: string) => {
          const ddIdx = param.lastIndexOf("--");
          return ddIdx >= 0 ? param.slice(ddIdx + 2) : param;
        };
        const resolvedId = extractId(lookId);
        const current = all.find(l =>
          l.id === resolvedId ||          // new format: ID extracted from slug
          l.id === lookId ||              // legacy: raw ID
          toSlug(l.name) === lookId       // legacy: plain name slug
        ) ?? null;

        if (current) {
          setLook(current);
          setAllLooks(all);
          const idx = all.findIndex(l =>
            l.id === resolvedId || l.id === lookId || toSlug(l.name) === lookId
          );
          setCurrentIdx(idx >= 0 ? idx : 0);
          const s = toSlug(current.name);
          const canonical = s ? `${s}--${current.id}` : current.id;
          if (canonical !== lookId) window.history.replaceState(null, "", `/look/${canonical}`);
          setIsLoading(false);
        } else {
          // Not in public list — may be a draft. Try preview fallback.
          fetch(`/api/try-this-look?previewId=${encodeURIComponent(resolvedId)}`)
            .then(r => r.json())
            .then((preview: { look?: Look; isDraft?: boolean }) => {
              if (preview.look) {
                setLook(preview.look);
                setAllLooks([preview.look]);
                setCurrentIdx(0);
                setIsDraft(preview.isDraft ?? false);
              }
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
        }
      })
      .catch(() => setIsLoading(false));
  }, [lookId]);

  // Per-look content (user try-ons + comments) — refetch whenever the displayed
  // look changes, including in-feed swipes that update `look` without a URL change.
  useEffect(() => {
    const id = look?.id;
    if (!id) return;
    fetch(`/api/try-this-look?lookId=${encodeURIComponent(id)}&userLooks=1`)
      .then(r => r.json())
      .then((p: { userLooks?: UserLook[] }) => setUserLooks(p.userLooks ?? []))
      .catch(() => {});
    fetch(`/api/try-this-look?lookId=${encodeURIComponent(id)}&comments=1`)
      .then(r => r.json())
      .then((p: { comments?: Comment[] }) => {
        const real = p.comments ?? [];
        const seeded = seedComments(id);
        setComments([...real, ...seeded]);
      })
      .catch(() => setComments(seedComments(id)));
  }, [look?.id]);

  // Elapsed timer during generation
  useEffect(() => {
    if (!isGenerating) { setElapsedSec(0); generationStartRef.current = null; return; }
    if (!generationStartRef.current) generationStartRef.current = Date.now();
    const t = setInterval(() => setElapsedSec(Math.floor((Date.now() - (generationStartRef.current ?? Date.now())) / 1000)), 1000);
    return () => clearInterval(t);
  }, [isGenerating]);

  // Auto-scroll to share card when result arrives
  useEffect(() => {
    if (resultImage && shareCardRef.current) {
      setTimeout(() => shareCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 200);
    }
  }, [resultImage]);

  // Check for saved model photo from a previous try-on
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lb_model_meta");
      if (raw && sessionStorage.getItem("lb_model_image")) {
        const meta = JSON.parse(raw);
        setSavedModelMeta({ fromLookName: meta.fromLookName ?? "", fromStoreName: meta.fromStoreName ?? "" });
      }
    } catch { /**/ }
  }, []);

  // Sync gallery position on imgIndex change (must be before early returns)
  useEffect(() => {
    if (!galleryRef.current || !look) return;
    const imgCount = [...new Set([look.frontImageUrl ?? look.imageUrl, ...(look.galleryImageUrls ?? [])].filter(Boolean))].length;
    galleryRef.current.style.transition = "transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)";
    galleryRef.current.style.transform = `translateX(-${imgIndex * (100 / Math.max(imgCount, 1))}%)`;
  }, [imgIndex, look]);

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-black">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
    </div>
  );

  if (!look) return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black text-white">
      <span className="text-5xl">🛍️</span>
      <p className="text-sm font-black opacity-50">Listing not found</p>
      <button type="button" onClick={() => { if (typeof window !== "undefined" && window.history.length > 1) router.back(); else router.push("/stores"); }} className="text-xs font-black underline opacity-50">Go back</button>
    </div>
  );

  // New post view (video + carousel + shop slides) — replaces the legacy layout.
  return (
    <div className="relative">
      <button type="button" onClick={() => { if (typeof window !== "undefined" && window.history.length > 1) router.back(); else router.push("/stores"); }} aria-label="Back"
        className="fixed left-3 z-40 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur active:scale-90 transition-transform"
        style={{ top: "calc(env(safe-area-inset-top) + 0.6rem)" }}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <HomeFeed looks={(allLooks.length ? allLooks : [look]) as unknown as FeedLook[]} initialLookId={look.id} single />
    </div>
  );

}
