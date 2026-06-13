"use client";

export const dynamic = "force-dynamic";

import CropModal from "@/components/CropModal";
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
  imageUrl: string;
  frontImageUrl?: string;
  garmentFrontImageUrl?: string;
  galleryImageUrls?: string[];
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
    if (onAuthRequired && !getStoredAuthSession()) { onAuthRequired(); return; }
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
    if (onAuthRequired && !getStoredAuthSession()) { onAuthRequired(); return; }
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
function FollowBtn({ storeSlug, storeName }: { storeSlug: string; storeName: string }) {
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
  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-black transition ${following ? "bg-white/20 text-white" : "bg-white text-black"}`}
    >
      {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
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
  const [showInfo, setShowInfo] = useState(false);
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
      <button type="button" onClick={() => router.back()} className="text-xs font-black underline opacity-50">Go back</button>
    </div>
  );

  const images = [...new Set([look.frontImageUrl ?? look.imageUrl, ...(look.galleryImageUrls ?? [])].filter(Boolean))] as string[];
  const isSoldOut = look.inStock === false;
  const displayPrice = look.salePrice ?? look.price;
  const storeKey = look.storeSlug ?? look.storeName ?? "store";
  const garmentUrl = look.garmentFrontImageUrl ?? look.frontImageUrl ?? look.imageUrl;

  // ── Live drag gallery helpers ──
  const applyGalleryDrag = (offsetPx: number) => {
    if (!galleryRef.current) return;
    const pct = imgIndex * (100 / images.length);
    const w = galleryRef.current.parentElement?.clientWidth ?? window.innerWidth;
    const dragPct = (offsetPx / w) * (100 / images.length);
    galleryRef.current.style.transition = "none";
    galleryRef.current.style.transform = `translateX(calc(-${pct}% + ${offsetPx * (1 / images.length) * (images.length)}px))`;
  };
  const snapGallery = (targetIdx: number) => {
    if (!galleryRef.current) return;
    galleryRef.current.style.transition = "transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)";
    galleryRef.current.style.transform = `translateX(-${targetIdx * (100 / images.length)}%)`;
    setImgIndex(targetIdx);
  };

  // ── Touch handler ──
  // Returns true when any overlay/modal is open — drag must be suppressed then
  const anyModalOpen = () =>
    !!cropSrc || tryConfirming || showUserLooks || showComments || showAuthModal || showContact || showInfo || showSheet;

  const onPanelTouchStart = (e: React.TouchEvent) => {
    if (anyModalOpen()) return;
    panelStartX.current = e.touches[0].clientX;
    panelStartY.current = e.touches[0].clientY;
    dragStartX.current = e.touches[0].clientX;
    dragStartY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
    isDraggingGallery.current = false;
    isDraggingVertical.current = false;
    dragX.current = 0;
  };

  const onPanelTouchMove = (e: React.TouchEvent) => {
    if (anyModalOpen()) return;
    if (panel !== 0 || dragStartX.current === null || dragStartY.current === null) return;
    const dx = e.touches[0].clientX - dragStartX.current;
    const dy = e.touches[0].clientY - dragStartY.current;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    // Lock to horizontal or vertical once direction is clear
    if (!isDraggingGallery.current && !isDraggingVertical.current) {
      if (adx < 8 && ady < 8) return; // wait for clear intent
      if (ady > adx) {
        // Vertical live drag (TikTok carousel)
        isDraggingVertical.current = true;
      } else {
        isDraggingGallery.current = true;
      }
    }

    if (isDraggingVertical.current) {
      verticalDragRef.current = dy;
      setVerticalDrag(dy);
      return;
    }

    if (isDraggingGallery.current && images.length > 1) {
      dragX.current = dx;
      // Resistance at edges
      const atStart = imgIndex === 0 && dx > 0;
      const atEnd = imgIndex === images.length - 1 && dx < 0;
      const resistance = (atStart || atEnd) ? 0.25 : 1;
      if (!galleryRef.current) return;
      const baseOffset = -imgIndex * (100 / images.length);
      const w = galleryRef.current.parentElement?.clientWidth ?? window.innerWidth;
      const dragOffset = (dx * resistance / w) * 100;
      galleryRef.current.style.transition = "none";
      galleryRef.current.style.transform = `translateX(${baseOffset + dragOffset / images.length}%)`;
      e.stopPropagation();
    }
  };

  const onPanelTouchEnd = (e: React.TouchEvent) => {
    if (anyModalOpen()) { dragStartX.current = null; dragStartY.current = null; return; }
    if (panelStartX.current === null || panelStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - panelStartX.current;
    const dy = e.changedTouches[0].clientY - panelStartY.current;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const dt = Date.now() - dragStartTime.current;
    const vx = adx / dt; // px/ms velocity
    panelStartX.current = null;
    panelStartY.current = null;
    dragStartX.current = null;
    dragStartY.current = null;

    // Gallery drag snap
    if (isDraggingGallery.current && images.length > 1) {
      isDraggingGallery.current = false;
      const isFastSwipe = vx > 0.3; // fast flick
      if ((dx < -40 || isFastSwipe) && dx < 0 && imgIndex < images.length - 1) {
        snapGallery(imgIndex + 1);
      } else if ((dx > 40 || isFastSwipe) && dx > 0 && imgIndex > 0) {
        snapGallery(imgIndex - 1);
      } else {
        snapGallery(imgIndex); // snap back
      }
      return;
    }

    // Vertical carousel snap
    if (isDraggingVertical.current) {
      isDraggingVertical.current = false;
      const finalDrag = verticalDragRef.current;
      verticalDragRef.current = 0;
      const vh = window.innerHeight;
      const threshold = vh * 0.2; // 20% of screen to commit

      if (Math.abs(finalDrag) >= threshold && panel === 0 && allLooks.length > 1) {
        const nextIdx = finalDrag < 0
          ? (currentIdx + 1) % allLooks.length
          : (currentIdx - 1 + allLooks.length) % allLooks.length;
        const targetY = finalDrag < 0 ? -vh : vh;
        setVerticalSnapping(true);
        setVerticalDrag(targetY);
        setTimeout(() => {
          setCurrentIdx(nextIdx);
          setLook(allLooks[nextIdx]);
          setImgIndex(0);
          setImgLoaded(false);
          setShowSheet(false);
          const _ns = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
          window.history.replaceState(null, "", `/look/${_ns(allLooks[nextIdx].name) || allLooks[nextIdx].id}`);
          if (galleryRef.current) {
            galleryRef.current.style.transition = "none";
            galleryRef.current.style.transform = "translateX(0%)";
          }
          setVerticalDrag(0);
          setVerticalSnapping(false);
        }, 280);
      } else {
        // Snap back
        setVerticalSnapping(true);
        setVerticalDrag(0);
        setTimeout(() => setVerticalSnapping(false), 280);
      }
      return;
    }

    // Must have clear direction — ignore diagonal gestures
    if (adx < 50 && ady < 100) return;

    // Horizontal → panel switch (long swipe only, > 120px)
    if (adx > ady * 2 && adx >= 120) {
      if (dx < 0 && panel === 0) setPanel(1);
      if (dx > 0 && panel === 1) setPanel(0);
    }
  };

  // ── Wheel / trackpad scroll (desktop two-finger) ──
  const onWheel = (e: React.WheelEvent) => {
    if (panel !== 0 || allLooks.length <= 1) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (wheelCooldown.current || verticalSnapping) return;
    wheelCooldown.current = true;
    setTimeout(() => { wheelCooldown.current = false; }, 700);

    const vh = window.innerHeight;
    const nextIdx = e.deltaY > 0
      ? (currentIdx + 1) % allLooks.length
      : (currentIdx - 1 + allLooks.length) % allLooks.length;
    const targetY = e.deltaY > 0 ? -vh : vh;

    setVerticalSnapping(true);
    setVerticalDrag(targetY);
    setTimeout(() => {
      setCurrentIdx(nextIdx);
      setLook(allLooks[nextIdx]);
      setImgIndex(0);
      setImgLoaded(false);
      setShowSheet(false);
      window.history.replaceState(null, "", `/look/${allLooks[nextIdx].id}`);
      if (galleryRef.current) {
        galleryRef.current.style.transition = "none";
        galleryRef.current.style.transform = "translateX(0%)";
      }
      setVerticalDrag(0);
      setVerticalSnapping(false);
    }, 280);
  };

  // ── Contact form submission ──
  const handleContact = async () => {
    if (!buyerName.trim() || !buyerPhone.trim()) return;
    setSending(true);
    try {
      await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lead",
          lookId: look.id,
          customerName: buyerName.trim(),
          phone: buyerPhone.trim(),
          storeName: look.storeName,
          lookName: look.name,
          leadSource: "contact-form",
        }),
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  // ── Try-on: photo upload ──
  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!SUPPORTED_TYPES.includes(file.type)) {
      setTryOnError("Please upload a JPG, PNG or WebP photo.");
      e.target.value = "";
      return;
    }
    setTryOnError(null);
    setResultImage(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setCropSrc(dataUrl);
    } catch {
      setTryOnError("Photo could not be loaded.");
    }
    e.target.value = "";
  };

  // ── Auth: submit ──
  const handleAuthSubmit = async () => {
    if (!authEmail.trim() || (authMode !== "forgot" && !authPassword.trim())) return;
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      if (authMode === "login") {
        await signInWithPassword(authEmail.trim(), authPassword);
        setShowAuthModal(false);
        if (pendingGenerateRef.current) {
          pendingGenerateRef.current = false;
          setTimeout(() => void handleGenerate(), 100);
        }
      } else if (authMode === "signup") {
        const { confirmationRequired } = await signUpWithPassword(authEmail.trim(), authPassword, authName.trim() || undefined);
        if (confirmationRequired) {
          setAuthSuccess("Account created! Please confirm your email, then sign in.");
          setAuthMode("login");
        } else {
          // Email confirmation disabled — user is now logged in, go straight to try-on
          setShowAuthModal(false);
          if (pendingGenerateRef.current) {
            pendingGenerateRef.current = false;
            setTimeout(() => void handleGenerate(), 100);
          }
        }
      } else {
        await resetPassword(authEmail.trim());
        setAuthSuccess("E-Mail gesendet! Überprüfe dein Postfach.");
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Fehler. Bitte erneut versuchen.");
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Try-on: generate ──
  const handleGenerate = async () => {
    if (!authSession) {
      pendingGenerateRef.current = true;
      setShowAuthModal(true);
      return;
    }
    if (isGenerating) return;
    setIsGenerating(true);
    setTryOnError(null);
    setResultImage(null);
    setSharedToGallery(false);
    generationStartRef.current = Date.now();
    try {
      const garmentData = await imageUrlToDataUrl(garmentUrl);
      const formData = new FormData();
      formData.append("image", dataUrlToBlob(garmentData), `${look.id}.jpg`);
      if (userPhoto) formData.append("modelImage", dataUrlToBlob(userPhoto), "user-photo.jpg");
      formData.append("visitorId", accountId || "anon");
      formData.append("lookId", look.id);
      formData.append("mode", "fashion-model");
      formData.append("aspectRatio", "4:5");
      formData.append(
        "prompt",
        userPhoto
          ? [
              "Fashion try-on: dress the uploaded person in the selected garment.",
              "Preserve the person's face, hair, skin tone, and identity exactly.",
              "Use the garment image as the complete outfit reference.",
              "Remove the person's original clothing completely.",
              `Look: ${look.name}.`,
            ].join(" ")
          : [
              "Fashion campaign image. Professional adult AI fashion model wearing the selected garment.",
              "Preserve the garment type, structure, silhouette, colors, and proportions exactly.",
              `Look: ${look.name}.`,
            ].join(" ")
      );
      const billingId = accountId.startsWith("user-") ? accountId : `visitor-${accountId || "anon"}`;
      const res = await fetch("/api/generate-fashn", {
        method: "POST",
        body: formData,
        headers: { "x-shopcut-account-id": billingId },
      });
      const payload = await res.json() as { image?: string; error?: string };
      if (res.status === 402) { setTryOnError("No credits. Buy credits on the Try-This-Look page."); return; }
      if (!res.ok || !payload.image) throw new Error(payload.error ?? "Generation failed.");
      setResultImage(payload.image);
      // Auto-follow store when user generates
      if (look.storeSlug) {
        try {
          const existing = JSON.parse(localStorage.getItem("lb_following") ?? "[]") as string[];
          if (!existing.includes(look.storeSlug)) {
            localStorage.setItem("lb_following", JSON.stringify([...existing, look.storeSlug]));
          }
        } catch { /**/ }
      }
      setTryConfirming(false);
      setPanel(1);
    } catch (err) {
      setTryOnError(err instanceof Error ? err.message : "Generation failed.");
      setTryConfirming(false);
      setPanel(1);
    } finally {
      setIsGenerating(false);
    }
  };

  const shareToGallery = async (name: string) => {
    if (!resultImage || !look) return;
    setIsSharing(true);
    try {
      await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generation",
          lookId: look.id,
          visitorId: accountId || "anon",
          lookName: look.name,
          storeName: look.storeName,
          customerName: name.trim(),
          userId: authSession?.user?.id ?? undefined,
          image: resultImage,
          userPhotoImage: userPhoto,
        }),
      });
      setSharedToGallery(true);
      // Refresh user looks
      fetch(`/api/try-this-look?lookId=${look.id}&userLooks=1`)
        .then(r => r.json())
        .then((p: { userLooks?: UserLook[] }) => setUserLooks(p.userLooks ?? []))
        .catch(() => {});
    } catch { /**/ } finally {
      setIsSharing(false);
    }
  };

  const postComment = async () => {
    if (!commentText.trim() || !look) return;
    if (!authSession) { setShowAuthModal(true); return; }
    setIsPostingComment(true);
    try {
      const res = await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add-comment", lookId: look.id, text: commentText.trim(), authorName: authSession?.user?.email?.split("@")[0] ?? (commentName.trim() || "Anonymous") }),
      });
      const data = await res.json() as { comments?: Comment[] };
      const real = data.comments ?? [];
      setComments([...real, ...seedComments(look.id)]);
      setCommentText("");
    } catch { /**/ } finally {
      setIsPostingComment(false);
    }
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.download = "luxurybandit-try-this-look.png";
    a.href = resultImage;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const loadingProgress = Math.min(92, 10 + elapsedSec * 1.4);

  return (
    <div
      className="relative w-full overflow-hidden bg-black"
      style={{ height: "100dvh" }}
      onTouchStart={onPanelTouchStart}
      onTouchMove={onPanelTouchMove}
      onTouchEnd={onPanelTouchEnd}
      onWheel={onWheel}
    >
      {/* ── Two-panel slider ── */}
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ width: "200%", transform: `translateX(${panel === 1 ? "-50%" : "0"})` }}
      >

        {/* Hidden file input — always in DOM so it can be triggered from anywhere */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

        {/* ═══════════════════════════════════════════════
            PANEL 0 — Main look view
        ═══════════════════════════════════════════════ */}
        <div className="relative h-full overflow-hidden" style={{ width: "50%" }}>

          {/* ── Prev look preview (above — slides down) ── */}
          {currentIdx > 0 && allLooks[currentIdx - 1] && (
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: "100%", height: "100%",
              transform: `translateY(${verticalDrag}px)`,
              transition: verticalSnapping ? "transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)" : "none",
              willChange: "transform", zIndex: 0,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={optImg(allLooks[currentIdx - 1].frontImageUrl ?? allLooks[currentIdx - 1].imageUrl, 1080)}
                className="h-full w-full object-cover object-top" alt="" />
            </div>
          )}

          {/* ── Next look preview (below — slides up) ── */}
          {allLooks[currentIdx + 1] && (
            <div style={{
              position: "absolute", left: 0, right: 0, top: "100%", height: "100%",
              transform: `translateY(${verticalDrag}px)`,
              transition: verticalSnapping ? "transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)" : "none",
              willChange: "transform", zIndex: 0,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={optImg(allLooks[currentIdx + 1].frontImageUrl ?? allLooks[currentIdx + 1].imageUrl, 1080)}
                className="h-full w-full object-cover object-top" alt="" />
              <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
          )}

          {/* ── Current look content (translates with drag) ── */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 1,
            transform: `translateY(${verticalDrag}px)`,
            transition: verticalSnapping ? "transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)" : "none",
            willChange: "transform",
          }}>

          {/* Full-screen gallery — live drag like Instagram */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              ref={galleryRef}
              className="flex h-full"
              style={{ width: `${images.length * 100}%`, transform: `translateX(-${imgIndex * (100 / images.length)}%)`, willChange: "transform" }}
            >
              {images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={optImg(src, 1080)} alt={look.name}
                  className="h-full object-cover object-top"
                  style={{ width: `${100 / images.length}%` }}
                  draggable={false}
                  fetchPriority={i === 0 ? "high" : "low"}
                  onError={(e) => { const im = e.currentTarget; if (im.src !== src) im.src = src; }}
                  onLoad={() => { if (i === 0) setImgLoaded(true); }}
                />
              ))}
            </div>
            {/* Right-side gradient for icon readability */}
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/50 to-transparent" />

            {/* Loading skeleton — fades out once image is loaded */}
            <div
              className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-300"
              style={{ opacity: imgLoaded ? 0 : 1, background: "linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)" }}
            >
              <div className="absolute inset-0 animate-pulse" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
            </div>
          </div>

          {/* Preload adjacent look images */}
          {allLooks[currentIdx + 1] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={optImg(allLooks[currentIdx + 1].frontImageUrl ?? allLooks[currentIdx + 1].imageUrl, 1080)}
              className="hidden" alt="" aria-hidden fetchPriority="low" />
          )}
          {currentIdx > 0 && allLooks[currentIdx - 1] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={optImg(allLooks[currentIdx - 1].frontImageUrl ?? allLooks[currentIdx - 1].imageUrl, 1080)}
              className="hidden" alt="" aria-hidden fetchPriority="low" />
          )}

          {/* Top bar — back button + store button */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-3 pt-12">
            <button type="button" onClick={() => router.back()}
              className="grid h-11 w-11 place-items-center rounded-full bg-black/30 backdrop-blur text-white">
              <ChevronLeft className="h-6 w-6" />
            </button>
          </div>

          {/* Dots — centered, above peek bar */}
          {images.length > 1 && (
            <div className="absolute bottom-20 inset-x-0 z-20 flex justify-center items-center gap-[5px]"
              style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}>
              {images.map((_, i) => (
                <button key={i} type="button" onClick={() => setImgIndex(i)}
                  className={`rounded-full transition-all duration-200 ${i === imgIndex ? "h-2 w-2 bg-white" : "h-1.5 w-1.5 bg-white/40"}`} />
              ))}
            </div>
          )}

          {/* Right-side action buttons — TikTok style */}
          <div className="absolute right-2 z-20 flex flex-col items-center gap-5"
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 8rem)" }}>
            {/* Home */}
            <a href="/stores" className="flex flex-col items-center gap-[3px] active:scale-90 transition-transform">
              <Home strokeWidth={2} className="h-7 w-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
              <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">Home</span>
            </a>
            {/* Like */}
            <SaveBtnInsta lookId={look.id} initialCount={(look as any).likeCount ?? 0} onAuthRequired={() => setShowAuthModal(true)} />
            {/* Comments */}
            <button type="button" onClick={() => { if (!authSession) { setShowAuthModal(true); return; } setShowComments(true); }}
              className="flex flex-col items-center gap-[3px] active:scale-90 transition-transform">
              <MessageCircle strokeWidth={2} className="h-7 w-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
              <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">{comments.length}</span>
            </button>
            {/* Save / Bookmark */}
            <BookmarkBtn lookId={look.id} onAuthRequired={() => setShowAuthModal(true)} />
            {/* Share */}
            <button type="button"
              onClick={() => navigator.share?.({ title: look.name, url: `${window.location.origin}/look/${look.name.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||look.id}` }).catch(() => {})}
              className="flex flex-col items-center gap-[3px] active:scale-90 transition-transform">
              <Send strokeWidth={2} className="h-7 w-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
              <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">Share</span>
            </button>
            {/* Try This Look */}
            {!isSoldOut && (
              <>
                <button type="button" onClick={() => router.push(`/tryon/${look.id}`)}
                  className="flex flex-col items-center gap-[3px] active:scale-90 transition-transform">
                  <Sparkles strokeWidth={2} className="h-7 w-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
                  <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">Try-on</span>
                </button>
                {savedModelMeta && (
                  <button type="button"
                    onClick={() => router.push(`/tryon/${look.id}`)}
                    className="text-[10px] font-black text-amber-300 [text-shadow:0_1px_3px_#000] underline underline-offset-2 text-center leading-tight max-w-[52px]">
                    ✨ Foto nutzen
                  </button>
                )}
              </>
            )}
          </div>

          {/* Left-side community thumbnails — vertical strip */}
          {userLooks.length > 0 && (
            <div
              className="absolute left-2 z-20 flex flex-col items-center gap-1.5"
              style={{ bottom: "calc(env(safe-area-inset-bottom) + 8rem)" }}
            >
              <button
                type="button"
                onClick={() => setShowUserLooks(true)}
                className="flex flex-col items-center gap-1.5"
              >
                {userLooks.slice(0, 4).map((ul, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={ul.id}
                    src={optImg(ul.imageUrl, 200)}
                    alt={ul.customerName}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { const img = e.currentTarget; if (ul.imageUrl && img.src !== ul.imageUrl) img.src = ul.imageUrl; }}
                    className="h-[84px] w-[60px] rounded-lg object-cover object-top border-2 border-white/70 shadow-lg"
                    style={{ opacity: 1 - i * 0.12 }}
                  />
                ))}
                <span className="text-[10px] font-black text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] mt-0.5">
                  {userLooks.length > 4 ? `+${userLooks.length - 4} more` : `${userLooks.length} Tryon${userLooks.length !== 1 ? "s" : ""}`}
                </span>
              </button>
            </div>
          )}

          {/* Sold-out overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
              <span className="rounded-full bg-white px-6 py-2 text-sm font-black uppercase tracking-widest text-black">Sold out</span>
            </div>
          )}

          {/* ── Peek bar (always visible) ── */}
          <div className="absolute inset-x-0 bottom-0 z-20" style={{ paddingBottom: "calc(56px + env(safe-area-inset-bottom))" }}>
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => look.storeSlug ? router.push(`/store/${look.storeSlug}`) : undefined}
                  className="flex items-center gap-2 active:opacity-70">
                  <span className="flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white border-2 border-white/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(storeKey)}&backgroundColor=ffffff&color=000000`} alt="" className="h-full w-full object-cover" />
                  </span>
                  <span className="text-sm font-black text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">{look.storeName ?? storeKey}</span>
                </button>
                <FollowBtn storeSlug={storeKey} storeName={look.storeName ?? storeKey} />
                <button type="button" onClick={() => setShowSheet(true)}
                  className="ml-auto flex items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-xs font-black text-white backdrop-blur active:opacity-70 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
                  <span>{look.name.length > 18 ? look.name.slice(0, 18) + "…" : look.name}</span>
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* ── Bottom Sheet ── */}
          {showSheet && (
            <>
              {/* Backdrop */}
              <div className="absolute inset-0 z-30 bg-black/40" onClick={() => setShowSheet(false)} />
              {/* Sheet */}
              <div className="absolute inset-x-0 bottom-0 z-40 rounded-t-3xl bg-white"
                style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2" onClick={() => setShowSheet(false)}>
                  <div className="h-1 w-10 rounded-full bg-black/20" />
                </div>
                <div className="px-4 pb-2">
                  {/* Store row */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 overflow-hidden rounded-full bg-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(storeKey)}&backgroundColor=ffffff&color=000000`} alt="" className="h-full w-full object-cover" />
                    </span>
                    <span className="text-xs font-black text-black/50">{look.storeName ?? storeKey}</span>
                  </div>
                  {/* Draft banner */}
                  {isDraft && (
                    <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-700">
                      <span>⚠️ Draft — not publicly visible</span>
                    </div>
                  )}
                  {/* Title */}
                  <h1 className="text-xl font-black leading-tight text-black">{look.name}</h1>
                  {/* Price */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {look.discountLabel && <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-black text-white">{look.discountLabel}</span>}
                    {look.salePrice && <span className="text-lg font-black text-black">{look.salePrice}</span>}
                    {look.price && <span className={`text-base font-black ${look.salePrice ? "text-black/30 line-through" : "text-black"}`}>{look.price}</span>}
                  </div>
                  {/* Sizes */}
                  {(look.availableSizes ?? []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {look.availableSizes!.map(size => (
                        <span key={size} className="rounded-full border border-black/20 px-3 py-1 text-xs font-black text-black">{size}</span>
                      ))}
                    </div>
                  )}
                  {/* Description */}
                  {look.productNote && (
                    <button type="button" onClick={() => setShowInfo(v => !v)} className="mt-2 text-left text-xs font-medium text-black/50">
                      {showInfo ? look.productNote : `${look.productNote.slice(0, 80)}${look.productNote.length > 80 ? "… mehr" : ""}`}
                    </button>
                  )}
                  {/* Hint */}
                  <p className="mt-2 text-[10px] font-bold text-black/25">← swipe left for Try This Look</p>
                  {/* Buttons */}
                  <div className="mt-4 grid gap-2">
                    {!isSoldOut ? (
                      <>
                        <button type="button" onClick={() => { setShowSheet(false); setShowContact(true); }}
                          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-black text-base font-black text-white shadow-lg active:scale-95 transition-transform">
                          <MessageCircle className="h-5 w-5" />
                          Express Interest
                        </button>
                        <button type="button" onClick={() => { setShowSheet(false); router.push(`/tryon/${look.id}`); }}
                          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-black/5 text-sm font-black text-black active:scale-95 transition-transform">
                          <Sparkles className="h-4 w-4" />
                          Try This Look
                        </button>
                      </>
                    ) : (
                      <div className="flex h-14 w-full items-center justify-center rounded-2xl bg-black/5 text-base font-black text-black/30">
                        Sold out
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Tap zones for gallery */}
          {images.length > 1 && (
            <>
              <button type="button" onClick={() => imgIndex > 0 && snapGallery(imgIndex - 1)} className="absolute left-0 top-1/4 z-10 h-1/2 w-1/4" aria-label="Previous" />
              <button type="button" onClick={() => imgIndex < images.length - 1 && snapGallery(imgIndex + 1)} className="absolute right-0 top-1/4 z-10 h-1/2 w-1/4" aria-label="Next" />
            </>
          )}
          </div>{/* end translate wrapper */}
        </div>

        {/* ═══════════════════════════════════════════════
            PANEL 1 — Try This Look
        ═══════════════════════════════════════════════ */}
        <div className="relative h-full overflow-y-auto bg-[#fbfaf7]" style={{ width: "50%" }}>
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
            <button type="button" onClick={() => setPanel(0)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 text-ink">
              <X className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[0]} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover border border-black/10" />
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-ink">{look.name}</p>
                {displayPrice && <p className="text-[10px] font-bold text-ink/50">{displayPrice}</p>}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cobalt" />
              <span className="text-xs font-black text-cobalt">Try This Look</span>
            </div>
          </div>

          <div className="grid gap-4 p-4 pb-10">

            {/* Generating spinner (if arrived here while still generating) */}
            {isGenerating && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-cobalt" />
                <p className="text-sm font-bold text-ink/60">Generating your look… {elapsedSec}s</p>
                <div className="w-full overflow-hidden rounded-full bg-black/10 h-2">
                  <div className="h-full rounded-full bg-cobalt transition-all duration-700" style={{ width: `${loadingProgress}%` }} />
                </div>
              </div>
            )}

            {/* Error */}
            {tryOnError && (
              <div className="rounded-xl border border-coral/25 bg-coral/10 p-4 text-sm text-coral space-y-2">
                <p className="font-black">{tryOnError}</p>
                {tryOnError.toLowerCase().includes("rejected") && (
                  <ul className="text-xs font-bold text-coral/80 space-y-0.5 list-disc pl-4">
                    <li>Use a clear full-body or upper-body photo</li>
                    <li>Good lighting, face clearly visible</li>
                    <li>No heavy filters or cropped faces</li>
                    <li>JPG or PNG, not a screenshot</li>
                  </ul>
                )}
              </div>
            )}

            {/* Result */}
            {resultImage && (
              <div className="grid gap-3 rounded-xl border border-black/10 bg-white p-4 shadow-soft">
                <p className="text-sm font-black text-ink">Your look ✨</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultImage} alt="Try-on result" className="w-full rounded-lg border border-black/10 object-contain" />

                {/* Share to look gallery — FIRST so it's visible after the image */}
                {sharedToGallery ? (() => {
                  const meta = (authSession?.user as any)?.user_metadata ?? {};
                  const postedName = meta.username ?? meta.full_name ?? authSession?.user?.email?.split("@")[0] ?? shareNameInput.trim();
                  const profileSlug = postedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                  return (
                    <div className="grid gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-center text-sm font-black text-emerald-700">✓ Posted to the look gallery!</p>
                      {profileSlug && (
                        <a href={`/${profileSlug}`}
                          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-black text-white active:opacity-80">
                          View your gallery →
                        </a>
                      )}
                    </div>
                  );
                })() : (
                  <div ref={shareCardRef} className="grid gap-2 rounded-xl border-2 border-cobalt/30 bg-cobalt/5 p-3">
                    <p className="text-sm font-black text-cobalt">📸 Post to look gallery</p>
                    {authSession ? (
                      <p className="text-[11px] font-bold text-ink/50">
                        Posting as <span className="text-ink/70">{(authSession.user as any).user_metadata?.username ?? (authSession.user as any).user_metadata?.full_name ?? authSession.user.email?.split("@")[0] ?? "you"}</span>
                      </p>
                    ) : (
                      <>
                        <p className="text-[11px] font-bold text-ink/50">Your name will appear with your photo</p>
                        <input
                          type="text"
                          value={shareNameInput}
                          onChange={e => setShareNameInput(e.target.value)}
                          placeholder="Your name (optional)"
                          className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-bold text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-cobalt/30"
                        />
                      </>
                    )}
                    <button
                      type="button"
                      disabled={isSharing}
                      onClick={() => {
                        const meta = (authSession?.user as any)?.user_metadata ?? {};
                        const name = meta.username ?? meta.full_name ?? authSession?.user?.email?.split("@")[0] ?? shareNameInput.trim();
                        void shareToGallery(name);
                      }}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-cobalt text-sm font-black text-white disabled:opacity-50 active:scale-95 transition-transform"
                    >
                      {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Post to look gallery
                    </button>
                  </div>
                )}

                {/* Save / Share / Retry */}
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={downloadResult}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-ink text-xs font-black text-white">
                    <Download className="h-4 w-4" /> Save
                  </button>
                  <button type="button"
                    onClick={() => navigator.share?.({ title: look.name, url: `${window.location.origin}/look/${look.name.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||look.id}` }).catch(() => {})}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-coral text-xs font-black text-white">
                    <Send className="h-4 w-4" /> Share
                  </button>
                  <button type="button" onClick={() => { setResultImage(null); setUserPhoto(null); setSharedToGallery(false); }}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white text-xs font-black text-ink">
                    <RefreshCw className="h-4 w-4" /> Retry
                  </button>
                </div>

                {/* Try another look with this photo */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      sessionStorage.setItem("lb_model_image", resultImage!);
                      localStorage.setItem("lb_model_meta", JSON.stringify({
                        fromLookId: look.id,
                        fromLookName: look.name,
                        fromStoreSlug: look.storeSlug ?? "",
                        fromStoreName: look.storeName ?? "",
                        savedAt: new Date().toISOString(),
                      }));
                    } catch { /**/ }
                    router.push("/stores");
                  }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-black/10 bg-black text-sm font-black text-white active:scale-95 transition-transform"
                >
                  Try another look with this photo
                  <ArrowRight className="h-4 w-4" />
                </button>

                {/* CTA to buy */}
                {!isSoldOut && (
                  <button type="button" onClick={() => { setPanel(0); setShowContact(true); }}
                    className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-sm font-black text-white active:scale-95 transition-transform">
                    <MessageCircle className="h-4 w-4" /> Express interest
                  </button>
                )}
              </div>
            )}

            {/* Empty state — prompt to try */}
            {!resultImage && !isGenerating && (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cobalt/30 bg-cobalt/5 text-sm font-black text-cobalt">
                <ImagePlus className="h-5 w-5" />
                Upload your photo to try this look
              </button>
            )}

          </div>
        </div>
      </div>

      {/* ── Contact form sheet (panel 0) ── */}
      {showContact && (
        <div className="absolute inset-0 z-30 flex items-end bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowContact(false); setSent(false); } }}>
          <div className="w-full rounded-t-2xl bg-white px-5 pt-5 pb-8">
            {sent ? (
              <div className="py-6 text-center">
                <div className="mb-3 text-4xl">✅</div>
                <p className="text-base font-black text-black">Anfrage gesendet!</p>
                <p className="mt-1 text-sm font-bold text-black/50">Der Seller meldet sich bei dir.</p>
                <button type="button" onClick={() => { setShowContact(false); setSent(false); }}
                  className="mt-5 h-12 w-full rounded-2xl bg-black text-sm font-black text-white">Close</button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-black text-black">Express Interest</h2>
                  <button type="button" onClick={() => setShowContact(false)} className="text-xs font-bold text-black/40">Cancel</button>
                </div>
                <div className="grid gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black/40">Dein Name</label>
                    <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="z.B. Anna"
                      className="h-12 w-full rounded-xl border border-black/10 bg-black/[0.04] px-4 text-sm font-bold outline-none focus:border-black" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-black/40">Deine Telefonnummer</label>
                    <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="+40 7xx xxx xxx"
                      className="h-12 w-full rounded-xl border border-black/10 bg-black/[0.04] px-4 text-sm font-bold outline-none focus:border-black" />
                  </div>
                  <p className="text-xs font-bold text-black/35">Der Seller sieht deine Nummer und entscheidet ob er dich kontaktiert.</p>
                  <button type="button" disabled={!buyerName.trim() || !buyerPhone.trim() || sending} onClick={handleContact}
                    className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-black text-base font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
                    {sending ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Send Request"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Try-on confirmation / generating overlay ── */}
      {tryConfirming && userPhoto && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <ScrollLock />
          {/* Blurred photo background */}
          <div className="absolute inset-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={userPhoto} alt="" className="h-full w-full object-cover blur-2xl scale-110 opacity-70" />
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex h-full flex-col items-center justify-end px-5 pb-12 pt-8 gap-5">

            {/* Look (left) → arrow → User photo (right) */}
            <div className="flex w-full items-center justify-center gap-3 px-2">
              {/* The look — use first gallery image as fallback if garmentUrl is broken */}
              <div className="flex-1 aspect-[3/4] overflow-hidden rounded-2xl border-2 border-white/60 shadow-2xl bg-white relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={garmentUrl || images[0]}
                  alt={look.name}
                  className="h-full w-full object-contain"
                  onError={e => {
                    const el = e.currentTarget;
                    // Try gallery images in order until one works
                    const tried = el.dataset.tried ? parseInt(el.dataset.tried) : 0;
                    const next = images[tried];
                    if (next && el.src !== next) {
                      el.dataset.tried = String(tried + 1);
                      el.src = next;
                    }
                  }}
                />
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <ArrowRight className="h-8 w-8 text-white drop-shadow-lg" />
              </div>

              {/* User photo + circular spinner */}
              <div className="relative flex-1 aspect-[3/4]">
                <div className="h-full w-full overflow-hidden rounded-2xl border-2 border-white/30 shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={userPhoto} alt="Dein Foto" className={`h-full w-full object-cover object-top transition-all duration-500 ${isGenerating ? "blur-sm scale-105" : ""}`} />
                </div>
                {isGenerating && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="h-16 w-16 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                      <circle
                        cx="40" cy="40" r="34" fill="none"
                        stroke="white" strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - loadingProgress / 100)}`}
                        className="transition-all duration-700"
                      />
                    </svg>
                    <span className="absolute text-xs font-black text-white">{Math.round(loadingProgress)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Message */}
            <div className="text-center">
              {isGenerating ? (
                <>
                  <p className="text-lg font-black text-white [text-shadow:0_2px_8px_#000]">Generating your look…</p>
                  <p className="mt-1 text-sm font-bold text-white/70 [text-shadow:0_1px_4px_#000]">{elapsedSec}s — please wait</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-black text-white [text-shadow:0_2px_8px_#000]">Send this photo to AI?</p>
                  <p className="mt-1 text-sm font-bold text-white/70 [text-shadow:0_1px_4px_#000]">You will be shown wearing this look</p>
                </>
              )}
            </div>

            {/* Buttons — hidden while generating */}
            {!isGenerating && (
              <div className="grid w-full gap-2">
                <button
                  type="button"
                  onClick={() => { void handleGenerate(); }}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-base font-black text-black shadow-xl active:scale-95 transition-transform"
                >
                  <Sparkles className="h-5 w-5 text-cobalt" />
                  Yes, try the look
                  <span className="ml-auto rounded-full bg-cobalt/15 px-2 py-0.5 text-xs font-black text-cobalt">2 credits</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setTryConfirming(false); setUserPhoto(null); setTimeout(() => fileInputRef.current?.click(), 100); }}
                  className="flex h-12 w-full items-center justify-center rounded-2xl bg-white/20 text-sm font-black text-white backdrop-blur active:opacity-70"
                >
                  Upload a different photo
                </button>
                <button
                  type="button"
                  onClick={() => { setTryConfirming(false); setUserPhoto(null); }}
                  className="flex h-12 w-full items-center justify-center rounded-2xl bg-white/10 text-sm font-bold text-white/70 active:opacity-70"
                >
                  No, cancel
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── User looks gallery ── */}
      {showUserLooks && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-black/10 px-4 py-3">
            <button type="button" onClick={() => setShowUserLooks(false)}
              className="grid h-9 w-9 place-items-center rounded-full border border-black/10 text-ink">
              <X className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-ink">Community Looks</p>
              <p className="text-xs font-bold text-ink/40">{userLooks.length} {userLooks.length === 1 ? "person" : "people"} tried this look</p>
            </div>
          </div>

          {/* Store info row */}
          {look?.storeName && (
            <button type="button"
              onClick={() => { setShowUserLooks(false); if (look.storeSlug) { window.location.href = `/store/${look.storeSlug}`; } }}
              className="flex items-center gap-2.5 border-b border-black/5 px-4 py-2.5 active:bg-black/3 text-left">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(look.storeSlug ?? look.storeName ?? "")}&backgroundColor=ffffff&color=000000`}
                  alt={look.storeName} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-ink">{look.storeName}</p>
                {look.storeAddress && <p className="truncate text-[10px] font-bold text-ink/40">{look.storeAddress}</p>}
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink/30" />
            </button>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid gap-6">
              {userLooks.map(ul => {
                const isLiked = generationLikes[ul.id] ?? false;
                const lookUrl = typeof window !== "undefined"
                  ? `${window.location.origin}/look/${ul.lookId}`
                  : `/look/${ul.lookId}`;
                const handleGenLike = () => {
                  if (!authSession) { setShowUserLooks(false); setShowAuthModal(true); return; }
                  const next = { ...generationLikes, [ul.id]: !isLiked };
                  setGenerationLikes(next);
                  try { localStorage.setItem("lb_gen_likes", JSON.stringify(next)); } catch { /**/ }
                };
                const handleGenShare = async () => {
                  const postUrl = typeof window !== "undefined"
                    ? `${window.location.origin}/post/${ul.id}`
                    : `/post/${ul.id}`;
                  const shareData: ShareData = {
                    title: look?.name ?? "LuxuryBandit Look",
                    text: `${ul.customerName ? ul.customerName + " is wearing " : ""}${look?.name ?? "this look"} — LuxuryBandit`,
                    url: postUrl
                  };
                  if (navigator.share) {
                    try { await navigator.share(shareData); } catch { /**/ }
                  } else {
                    try { await navigator.clipboard.writeText(lookUrl); } catch { /**/ }
                  }
                };
                return (
                  <div key={ul.id} className="grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Before */}
                      {ul.userPhotoUrl && (
                        <div className="grid gap-1">
                          <div className="aspect-[3/4] overflow-hidden rounded-xl border border-black/10 bg-black/5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={optImg(ul.userPhotoUrl, 640)} alt="Original" loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
                          </div>
                          <p className="text-center text-[10px] font-bold text-ink/40">Before</p>
                        </div>
                      )}
                      {/* After */}
                      <div className={`grid gap-1 ${!ul.userPhotoUrl ? "col-span-2" : ""}`}>
                        <div className="aspect-[3/4] overflow-hidden rounded-xl border border-black/10 bg-black/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={optImg(ul.imageUrl, 640)} alt={ul.customerName || "User look"} loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
                        </div>
                        <p className="text-center text-[10px] font-bold text-ink/40">After</p>
                      </div>
                    </div>

                    {/* Creator row */}
                    {ul.customerName && (() => {
                      const slug = ul.customerName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                      return (
                        <a href={`/u/${slug}`} className="flex items-center gap-2 px-1 active:opacity-70">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(ul.customerName)}&backgroundColor=000000&fontColor=ffffff&fontSize=40`}
                            alt={ul.customerName} className="h-7 w-7 shrink-0 rounded-full object-cover" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-ink">{ul.customerName}</p>
                            <p className="text-[10px] font-bold text-ink/40">{new Date(ul.createdAt).toLocaleDateString("de-AT", { day: "numeric", month: "short" })}</p>
                          </div>
                        </a>
                      );
                    })()}

                    {/* Social bar */}
                    <div className="flex items-center gap-1.5 border-t border-black/5 pt-2">
                      {/* Like */}
                      <button type="button" onClick={handleGenLike}
                        className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black transition active:scale-95 ${
                          isLiked ? "bg-red-50 text-red-500" : "bg-black/5 text-ink/50"
                        }`}>
                        <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-red-500 stroke-red-500" : ""}`} />
                        <span>{fmtCount(genLikeCount(ul.id) + (isLiked ? 1 : 0))}</span>
                      </button>
                      {/* Comment */}
                      <button type="button"
                        onClick={() => { setShowUserLooks(false); if (!authSession) { setShowAuthModal(true); } else { setShowComments(true); } }}
                        className="flex items-center gap-1 rounded-full bg-black/5 px-3 py-1.5 text-xs font-black text-ink/50 active:scale-95 transition">
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>{fmtCount(genCommentCount(ul.id))}</span>
                      </button>
                      {/* Views — display only */}
                      <span className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-ink/30 pointer-events-none select-none">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        <span>{fmtCount(genViewCount(ul.id))}</span>
                      </span>
                      {/* Share */}
                      <button type="button" onClick={() => void handleGenShare()}
                        className="ml-auto flex items-center gap-1 rounded-full bg-black/5 px-3 py-1.5 text-xs font-black text-ink/50 active:scale-95 transition">
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Auth modal ── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-end bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAuthModal(false); pendingGenerateRef.current = false; } }}>
          <div className="w-full max-w-md rounded-t-3xl bg-white px-6 pt-5 mt-auto"
            style={{
              paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
              maxHeight: "min(96svh, 96vh)",
              overflowY: "auto",
              overscrollBehavior: "contain",
              marginBottom: kbOffset > 0 ? `${kbOffset}px` : undefined,
              transition: "margin-bottom 0.2s ease",
            }}>
            {/* Handle */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-black/15" />

            {/* Header */}
            <div className="mb-6 text-center">
              <p className="text-lg font-black text-ink">
                {authMode === "login" ? "Sign in" : authMode === "signup" ? "Create account" : "Reset password"}
              </p>
              <p className="mt-1 text-sm font-bold text-ink/50">
                {authMode === "login"
                  ? "Sign in to try the look"
                  : authMode === "signup"
                  ? "Create a free account"
                  : "We'll send you a link"}
              </p>
            </div>

            {/* Fields */}
            <div className="grid gap-3">
              {authMode === "signup" && (
                <input type="text" value={authName} onChange={e => { setAuthName(e.target.value); setAuthError(null); }}
                  placeholder="Your name or alias" autoComplete="nickname" maxLength={40}
                  className="h-12 w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 text-sm font-bold text-ink placeholder:text-ink/30 outline-none focus:border-black" />
              )}
              <input type="email" value={authEmail} onChange={e => { setAuthEmail(e.target.value); setAuthError(null); }}
                placeholder="E-Mail" autoComplete="email"
                className="h-12 w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 text-sm font-bold text-ink placeholder:text-ink/30 outline-none focus:border-black" />
              {authMode !== "forgot" && (
                <input type="password" value={authPassword} onChange={e => { setAuthPassword(e.target.value); setAuthError(null); }}
                  placeholder="Password" autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                  onKeyDown={e => { if (e.key === "Enter") void handleAuthSubmit(); }}
                  className="h-12 w-full rounded-xl border border-black/10 bg-black/[0.03] px-4 text-sm font-bold text-ink placeholder:text-ink/30 outline-none focus:border-black" />
              )}
            </div>

            {authError && <p className="mt-3 text-center text-xs font-bold text-red-500">{authError}</p>}
            {authSuccess && <p className="mt-3 text-center text-xs font-bold text-emerald-600">{authSuccess}</p>}

            {/* CTA */}
            <button type="button" onClick={() => void handleAuthSubmit()} disabled={authLoading}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black text-base font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
              {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {authMode === "login" ? "Sign in" : authMode === "signup" ? "Sign up" : "Send link"}
            </button>

            {/* Mode switch */}
            <div className="mt-4 flex flex-col items-center gap-2 text-xs font-bold text-ink/50">
              {authMode === "login" && (
                <>
                  <button type="button" onClick={() => { setAuthMode("signup"); setAuthError(null); setAuthSuccess(null); }}
                    className="underline underline-offset-2">No account? Sign up</button>
                  <button type="button" onClick={() => { setAuthMode("forgot"); setAuthError(null); setAuthSuccess(null); }}
                    className="underline underline-offset-2">Forgot password?</button>
                </>
              )}
              {authMode !== "login" && (
                <button type="button" onClick={() => { setAuthMode("login"); setAuthError(null); setAuthSuccess(null); }}
                  className="underline underline-offset-2">Back to sign in</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Comments sheet ── */}
      {showComments && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-black/10 px-4 py-3">
            <button type="button" onClick={() => setShowComments(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10">
              <X className="h-4 w-4" />
            </button>
            <div>
              <p className="text-sm font-black text-ink">Comments</p>
              <p className="text-xs font-bold text-ink/40">{comments.length} comments</p>
            </div>
          </div>

          {/* Comment list */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid gap-4">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cobalt/10 text-xs font-black text-cobalt">
                    {c.authorName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-ink">{c.authorName}</p>
                    <p className="mt-0.5 text-sm font-bold text-ink/80">{c.text}</p>
                    <p className="mt-0.5 text-[10px] font-bold text-ink/30">
                      {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-black/10 px-4 py-3 grid gap-2">
            {authSession?.user?.email && (
              <p className="text-xs font-bold text-ink/40">
                Commenting as <span className="text-ink/70">{authSession.user.email.split("@")[0]}</span>
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void postComment(); } }}
                placeholder="Add a comment…"
                className="h-11 min-w-0 flex-1 rounded-xl border border-black/10 bg-black/3 px-3 text-sm font-bold text-ink placeholder:text-ink/30 outline-none focus:border-cobalt"
              />
              <button type="button" onClick={() => void postComment()} disabled={!commentText.trim() || isPostingComment}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cobalt text-white disabled:opacity-40">
                {isPostingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Crop modal ── */}
      {cropSrc && (
        <CropModal
          imageSrc={cropSrc}
          onConfirm={(cropped) => { setUserPhoto(cropped); setCropSrc(null); setResultImage(null); setTryConfirming(true); }}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
