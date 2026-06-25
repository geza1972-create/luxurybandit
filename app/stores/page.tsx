"use client";

export const dynamic = "force-dynamic";

import {
  getStoredAuthSession,
  resetPassword,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from "@/lib/supabase-auth-client";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { lookPath } from "@/lib/look-slug";
import HomeFeed from "@/components/HomeFeed";
import { isAdminEmail } from "@/lib/is-admin-email";
import { Bookmark, Heart, Home, Image as ImageIcon, Instagram, LayoutGrid, Loader2, LogOut, MessageCircle, Play, Search, Send, ShoppingBag, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

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
// Price to show on a feed card: the range when we have shop options, else the
// look's own price (formatted with a $ if it's a bare number — fixes "from 1190").
function feedPrice(look: Look): string | null {
  const range = priceRange(look.alternatives);
  if (range) return range;
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

type CommunityItem = {
  id: string;
  lookId: string;
  imageUrl: string;
  videoUrl?: string;
  brand?: string;
  thumbUrl?: string;
  userPhotoUrl?: string;
  customerName: string;
  lookName: string;
  storeName: string;
  storeSlug: string;
  curatorId?: string;
  createdAt: string;
};

// ── Community slide (extracted to avoid component-inside-component) ──────────
function CommunitySlide({ it, offset, verticalDrag, transition }: {
  it: CommunityItem; offset: number; verticalDrag: number; transition: string;
}) {
  const uname = it.customerName
    ? it.customerName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    : "";
  return (
    <div className="absolute inset-0 flex flex-col bg-black"
      style={{ transform: `translateY(calc(${offset * 100}% + ${verticalDrag}px))`, transition, willChange: "transform" }}>
      <div className="relative flex-1 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={optImg(it.imageUrl, 1080)} alt={it.lookName} loading="lazy" decoding="async"
          onError={(e) => { const im = e.currentTarget; if (im.src !== it.imageUrl) im.src = it.imageUrl; }}
          className="h-full w-full object-cover object-top" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/50 to-transparent pointer-events-none" />
      </div>
      <div className="flex items-center gap-3 bg-black px-4 py-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        {uname ? (
          <a href={`/u/${uname}`} className="flex items-center gap-2 min-w-0 flex-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(it.customerName)}&backgroundColor=ffffff&fontColor=000000&fontSize=40`}
              alt={it.customerName} className="h-9 w-9 shrink-0 rounded-full bg-white/10 object-cover" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{it.customerName}</p>
              {it.lookName && <p className="truncate text-[11px] font-bold text-white/50">{it.lookName}</p>}
            </div>
          </a>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">{it.lookName}</p>
            {it.storeName && <p className="truncate text-[11px] font-bold text-white/50">{it.storeName}</p>}
          </div>
        )}
        {it.storeName && (
          <a href={it.storeSlug ? `/store/${it.storeSlug}` : "#"}
            className="shrink-0 rounded-full border border-white/20 px-3 py-1.5 text-xs font-black text-white/70">
            {it.storeName}
          </a>
        )}
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
  router,
}: {
  allItems: CommunityItem[];
  initialIndex: number;
  likes: Record<string, boolean>;
  onClose: () => void;
  onLikeToggle: (id: string) => void;
  onHide?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAssign?: (id: string, customerName: string) => Promise<void>;
  router: ReturnType<typeof import("next/navigation").useRouter>;
}) {
  const [currentIdx, setCurrentIdx] = useState(initialIndex);
  const [verticalDrag, setVerticalDrag] = useState(0);
  const [verticalSnapping, setVerticalSnapping] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignName, setAssignName] = useState("");
  const [assignWorking, setAssignWorking] = useState(false);

  const isDraggingVertical = useRef(false);
  const verticalDragRef = useRef(0);
  const wheelCooldown = useRef(false);
  const touchStartY = useRef<number | null>(null);

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
    const threshold = window.innerHeight * 0.2;
    if (Math.abs(finalDrag) >= threshold && allItems.length > 1) {
      if (finalDrag < 0) snapTo((currentIdx + 1) % allItems.length, -window.innerHeight);
      else snapTo((currentIdx - 1 + allItems.length) % allItems.length, window.innerHeight);
    } else {
      setVerticalSnapping(true); setVerticalDrag(0);
      setTimeout(() => setVerticalSnapping(false), 280);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (wheelCooldown.current || verticalSnapping || allItems.length <= 1) return;
    const goNext = e.deltaY > 0;
    const newIdx = goNext ? (currentIdx + 1) % allItems.length : (currentIdx - 1 + allItems.length) % allItems.length;
    snapTo(newIdx, goNext ? -window.innerHeight : window.innerHeight);
    wheelCooldown.current = true;
    setTimeout(() => { wheelCooldown.current = false; }, 700);
  };

  const transition = verticalSnapping ? "transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)" : "none";

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      {/* Prev slide */}
      {prevItem && <CommunitySlide it={prevItem} offset={-1} verticalDrag={verticalDrag} transition={transition} />}
      {/* Current slide */}
      <CommunitySlide it={item} offset={0} verticalDrag={verticalDrag} transition={transition} />
      {/* Next slide */}
      {nextItem && <CommunitySlide it={nextItem} offset={1} verticalDrag={verticalDrag} transition={transition} />}

      {/* Right action column — always on top, not translated */}
      <div className="absolute right-2 z-20 flex flex-col items-center gap-5 pointer-events-auto"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}>
        {/* Home */}
        <a href="/stores" className="flex flex-col items-center gap-[3px] active:scale-90 transition-transform">
          <Home strokeWidth={2} className="h-7 w-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
          <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">Home</span>
        </a>
        {/* Like */}
        <button type="button" onClick={() => onLikeToggle(item.id)}
          className="flex flex-col items-center gap-[3px] active:scale-90 transition-transform">
          <Heart strokeWidth={2} className={`h-7 w-7 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] transition-transform ${isLiked ? "fill-red-500 text-red-500 scale-110" : "text-white"}`} />
          <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">{fmt(likeCount)}</span>
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
        {/* Try this look */}
        <button type="button" onClick={() => { onClose(); router.push(`/look/${item.lookId}`); }}
          className="flex flex-col items-center gap-[3px] active:scale-90 transition-transform">
          <Sparkles strokeWidth={2} className="h-7 w-7 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
          <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">Try-on</span>
        </button>
      </div>

      {/* Top bar — always on top, not translated */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-end p-4 pointer-events-auto"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-2">
          {onHide && (
            <button type="button" onClick={() => onHide(item.id)} title="Ausblenden"
              className="grid h-10 w-10 place-items-center rounded-full bg-amber-400/80 backdrop-blur text-white active:opacity-70">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={() => onDelete(item.id)} title="Delete"
              className="grid h-10 w-10 place-items-center rounded-full bg-red-500/80 backdrop-blur text-white active:opacity-70">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
          <button type="button" onClick={() => { onClose(); router.push(`/look/${item.lookId}`); }}
            className="flex h-10 items-center gap-2 rounded-full bg-black/50 backdrop-blur px-4 text-sm font-black text-white active:opacity-70">
            <Sparkles className="h-4 w-4" />
            Try this look
          </button>
        </div>
      </div>

      {/* Admin assign panel */}
      {onAssign && (
        <div className="absolute inset-x-0 bottom-0 z-20" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {assignOpen ? (
            <div className="flex items-center gap-2 bg-black/90 px-4 py-3 border-t border-white/10">
              <input type="text" value={assignName} onChange={e => setAssignName(e.target.value)}
                placeholder="Name oder E-Mail…"
                className="flex-1 h-10 rounded-xl bg-white/10 px-3 text-sm font-bold text-white placeholder:text-white/30 outline-none focus:bg-white/15"
                autoFocus />
              <button type="button" disabled={assignWorking || !assignName.trim()}
                onClick={async () => { setAssignWorking(true); await onAssign(item.id, assignName.trim()); setAssignWorking(false); setAssignOpen(false); }}
                className="h-10 rounded-xl bg-cobalt px-4 text-sm font-black text-white disabled:opacity-40 active:opacity-70">
                {assignWorking ? "…" : "Speichern"}
              </button>
              <button type="button" onClick={() => setAssignOpen(false)}
                className="h-10 w-10 grid place-items-center rounded-xl bg-white/10 text-white active:opacity-70">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-end bg-black/90 px-4 py-2 border-t border-white/10">
              <button type="button" onClick={() => { setAssignName(item.customerName ?? ""); setAssignOpen(true); }}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white/70 active:opacity-70">
                Zuweisen
              </button>
            </div>
          )}
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
            <p className="text-xs font-bold text-ink/40 py-2">Lädt…</p>
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

        {/* Curator studio entry (separate curator session) */}
        {curator ? (
          <a href="/studio"
            className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-black px-4 py-3.5 text-white active:scale-[0.99] transition-transform">
            <span className="min-w-0">
              <span className="block text-sm font-black">Open your studio{curator.firstName ? `, ${curator.firstName}` : ""}</span>
              <span className="block text-[11px] font-bold text-white/55">Find trends · publish looks</span>
            </span>
            <span className="shrink-0 text-lg font-black">→</span>
          </a>
        ) : (
          <a href="/curators"
            className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3.5 text-ink active:scale-[0.99] transition-transform">
            <span className="min-w-0">
              <span className="block text-sm font-black">Become a curator</span>
              <span className="block text-[11px] font-bold text-ink/45">Spot trends, earn via affiliate</span>
            </span>
            <span className="shrink-0 text-lg font-black text-ink/40">→</span>
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
          /* ── Curator sign-in (email only — our only login) ── */
          <div className="grid gap-4">
            <p className="text-xs font-bold text-ink/45">Already a curator? Sign in with your email — no password needed.</p>

            {error && <p className="rounded-xl border border-coral/25 bg-coral/10 px-4 py-3 text-xs font-black text-coral">{error}</p>}
            {message && <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-black text-green-700">{message}</p>}

            <input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") void handleCuratorSignin(); }}
              className="h-12 rounded-xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold outline-none focus:border-cobalt" />

            <button type="button"
              disabled={loading || !email.trim()}
              onClick={() => void handleCuratorSignin()}
              className="flex h-13 items-center justify-center rounded-xl bg-ink py-3.5 text-sm font-black text-white disabled:opacity-40">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </button>

            <div className="my-1 flex items-center gap-3">
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-[11px] font-black uppercase tracking-wider text-ink/30">New here?</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>
            <a href="/curators"
              className="flex h-13 items-center justify-center gap-2 rounded-xl border border-black/15 bg-white py-3.5 text-sm font-black text-ink active:scale-95 transition-transform">
              <Sparkles className="h-4 w-4" /> Become a curator — it&apos;s free
            </a>
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
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignName, setBulkAssignName] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  // Feed (default) vs. grid overview — driven by ?view=grid so the bottom-nav
  // Home toggle and the in-page controls stay in sync.
  const showGrid = searchParams.get("view") === "grid";
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [feedSelectMode, setFeedSelectMode] = useState(false);
  const [selectedLookIds, setSelectedLookIds] = useState<Set<string>>(new Set());
  const [feedBulkWorking, setFeedBulkWorking] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem("lb_following") ?? "[]") as string[];
      setFollowed(new Set(list));
    } catch { /**/ }

    // Check auth state + admin
    try {
      const session = getStoredAuthSession();
      setIsSignedIn(!!session);
      if (isAdminEmail(session?.user?.email) || session?.user?.email?.toLowerCase() === "support@luxurybandit.com") {
        setIsAdmin(true);
        const storedPin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
        setAdminPin(storedPin);
      }
    } catch { /**/ }
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

    const onAuth = () => { try { setIsSignedIn(!!getStoredAuthSession()); } catch { /**/ } };
    window.addEventListener("luxurybandit-auth-updated", onAuth);
    return () => window.removeEventListener("luxurybandit-auth-updated", onAuth);
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

  const hideCommunityItem = async (item: CommunityItem) => {
    await adminAction({ action: "hide-generation", id: item.id });
    setCommunityItems(prev => prev.filter(i => i.id !== item.id));
    setCommunitySelectedIndex(null);
  };

  const deleteCommunityItem = async (item: CommunityItem) => {
    if (!confirm("Beitrag permanent löschen?")) return;
    await adminAction({ action: "delete-generation", id: item.id });
    setCommunityItems(prev => prev.filter(i => i.id !== item.id));
    setCommunitySelectedIndex(null);
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
    if (!confirm(`${selectedLookIds.size} Looks permanent löschen?`)) return;
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
    if (!confirm(`${selectedIds.size} Beiträge permanent löschen?`)) return;
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

  // Load community try-ons for the merged Discover grid (and search/community tab)
  useEffect(() => {
    if ((typeFilter !== "community" && !searchOpen && !showGrid) || communityItems.length > 0) return;
    setCommunityLoading(true);
    fetch("/api/try-this-look?community=1")
      .then(r => r.json())
      .then((p: { community?: CommunityItem[] }) => setCommunityItems(p.community ?? []))
      .catch(() => {})
      .finally(() => setCommunityLoading(false));
  }, [typeFilter, communityItems.length, searchOpen, showGrid]);

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
    type HItem = { key: string; kind: "look" | "tryon"; id: string; thumb: string; videoUrl?: string; videoPoster?: string; aiCreated?: boolean; brand?: string; createdAt: string; name: string; price?: string | null; curatorName?: string; curatorPhoto?: string };
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
      items.push({ key: `look-${l.id}`, kind: "look", id: l.id, thumb, videoUrl: l.videoUrl, videoPoster, aiCreated: l.aiCreated, brand: l.brand, createdAt: when, name: l.name, price: feedPrice(l), curatorName: l.curatorName, curatorPhoto: l.curatorPhotoUrl });
    }
    for (const c of communityItems) {
      // A try-on still IS a real model frame → use it as the video poster.
      const srcLook = lookById.get(c.lookId);
      items.push({ key: `tryon-${c.id}`, kind: "tryon", id: c.id, thumb: c.imageUrl, videoUrl: c.videoUrl, videoPoster: c.imageUrl, brand: c.brand, createdAt: c.createdAt ?? "", name: c.customerName || c.lookName, price: srcLook ? feedPrice(srcLook) : null, curatorName: c.customerName });
    }
    items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return items;
  }, [looks, communityItems]);

  // Distinct curators with content (looks or try-ons) — for the header count.
  const curatorCount = useMemo(() => {
    const set = new Set<string>();
    for (const l of looks) if (l.curatorName) set.add(l.curatorName.toLowerCase());
    for (const c of communityItems) if (c.customerName) set.add(c.customerName.toLowerCase());
    return set.size;
  }, [looks, communityItems]);

  // Brand filter chips — only brands the curator named at generation (paid placement).
  const brandChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of historyItems) if (it.brand) counts.set(it.brand, (counts.get(it.brand) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([brand]) => brand);
  }, [historyItems]);
  const visibleHistory = useMemo(() => {
    let items = brandFilter ? historyItems.filter(it => it.brand === brandFilter) : historyItems;
    const q = query.trim().toLowerCase();
    if (q) items = items.filter(it => `${it.name} ${it.curatorName ?? ""} ${it.brand ?? ""}`.toLowerCase().includes(q));
    return items;
  }, [historyItems, brandFilter, query]);

  // ── Default home = full-screen vertical feed (TikTok/IG style, newest first) ──
  // The legacy grid below is kept only for the search experience.
  if (!searchOpen && !showGrid) {
    return (
      <div className="min-h-dvh bg-black" style={{ maxWidth: "100vw" }}>
        <HomeFeed looks={looks} />
        {/* Floating controls (top-right): gallery/grid + search */}
        <div className="fixed right-3 z-30 flex items-center gap-2" style={{ top: "calc(env(safe-area-inset-top) + 0.6rem)" }}>
          <button type="button" aria-label="Gallery" onClick={() => router.push("/stores?view=grid")}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur active:scale-90 transition-transform">
            <LayoutGrid className="h-4 w-4" />
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
            {/* Back to the full-screen feed */}
            <button type="button"
              onClick={() => { router.push("/stores"); setSearchOpen(false); setQuery(""); }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/12 bg-black/4 text-black/50 hover:text-black transition"
              aria-label="Feed">
              <Home className="h-4 w-4" />
            </button>

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
            {!brandFilter && !searchOpen && (
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
                    [<Sparkles key="i" className="h-4 w-4 text-cobalt" />, "Make a try-on", "Any look, on you, in seconds — photo + video."],
                    [<ShoppingBag key="i" className="h-4 w-4 text-cobalt" />, "Bandit the look", "From the real luxury piece down to the best dupe."],
                    [<Heart key="i" className="h-4 w-4 text-cobalt" />, "Join the community", "Become a curator, build a following — and earn."],
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
                  <button type="button" onClick={() => router.push("/curators")}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-black px-5 text-sm font-black text-white active:scale-95 transition-transform">
                    <Sparkles className="h-4 w-4" /> Become a curator
                  </button>
                  <button type="button" onClick={() => router.push("/about")}
                    className="flex h-10 items-center justify-center rounded-full border border-black/15 bg-white px-5 text-sm font-black text-black active:scale-95 transition-transform">
                    How it works
                  </button>
                </div>
              </section>
            )}

            {/* Brand filter chips — only brands named at generation (paid placement) */}
            {brandChips.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button type="button" onClick={() => setBrandFilter(null)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${brandFilter === null ? "bg-black text-white" : "bg-black/[0.06] text-black/55"}`}>
                  All
                </button>
                {brandChips.map(b => (
                  <button key={b} type="button" onClick={() => setBrandFilter(b)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${brandFilter === b ? "bg-black text-white" : "bg-black/[0.06] text-black/55"}`}>
                    {b}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-0.5">
              {visibleHistory.map(it => (
                <div key={it.key} className="flex flex-col">
                  <button type="button"
                    onClick={() => router.push(it.kind === "look" ? lookPath(it.name, it.id) : `/post/${it.id}`)}
                    className="relative aspect-square overflow-hidden bg-black/5 transition-opacity active:opacity-80">
                    {it.videoUrl ? (
                      // Video tile — show a real model frame: the model poster if we
                      // have one, else the video's own first frame (#t=0.1 forces it).
                      <video src={it.videoPoster ? it.videoUrl : `${it.videoUrl}#t=0.1`} poster={it.videoPoster} muted playsInline preload="metadata"
                        className="h-full w-full bg-black object-cover object-top" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={optImg(it.thumb, 400)} alt={it.name} loading="lazy" decoding="async"
                        onError={(e) => { const im = e.currentTarget; if (it.thumb && im.src !== it.thumb) im.src = it.thumb; }}
                        className="h-full w-full object-cover object-top" />
                    )}
                    {it.videoUrl && (
                      <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white backdrop-blur"><Play className="h-3 w-3 fill-current" /></span>
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
            {brandFilter && visibleHistory.length === 0 && (
              <p className="py-16 text-center text-sm font-black text-black/40">Nothing from {brandFilter} yet.</p>
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
                <p className="text-sm font-black text-black/40">Keine Ergebnisse für „{query}"</p>
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
                          {bulkWorking ? "…" : `Zuweisen (${selectedIds.size})`}
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
                        {selectMode ? `${selectedIds.size} ausgewählt` : `${filteredCommunity.length}${query ? ` von ${communityItems.length}` : ""} Beiträge`}
                      </span>
                      <div className="flex items-center gap-2">
                        {selectMode && selectedIds.size > 0 && (
                          <>
                            <button type="button" disabled={bulkWorking}
                              onClick={() => { setBulkAssignName(""); setBulkAssignOpen(v => !v); }}
                              className="rounded-full bg-cobalt px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-50 active:opacity-70">
                              Zuweisen
                            </button>
                            <button type="button" disabled={bulkWorking} onClick={() => void bulkHide()}
                              className="rounded-full bg-amber-400 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-50 active:opacity-70">
                              {bulkWorking ? "…" : "Ausblenden"}
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
                          router.push(`/post/${item.id}`);
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
                        {feedBulkWorking ? "…" : `Ausblenden (${selectedLookIds.size})`}
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

      {/* Bottom CTA */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <p className="text-center text-[11px] font-bold text-black/35">
          Selling vintage &amp; luxury?{" "}
          <a href="/seller/register" className="font-black text-black underline underline-offset-2">
            Start selling →
          </a>
        </p>
      </div>

      {/* Merkliste panel */}
      {showMerkliste && <MerklistePanel onClose={() => setShowMerkliste(false)} />}

      {/* User panel */}
      {showUserPanel && <UserPanel onClose={() => { setShowUserPanel(false); setSavedAutoOpen(false); }} openSaved={savedAutoOpen} />}

      {/* ── Community detail fullscreen ── */}
      {communitySelectedIndex !== null && filteredCommunity.length > 0 && (
        <CommunityDetailView
          allItems={filteredCommunity}
          initialIndex={Math.min(communitySelectedIndex, filteredCommunity.length - 1)}
          likes={communityLikes}
          onClose={() => setCommunitySelectedIndex(null)}
          onLikeToggle={(id) => {
            const next = { ...communityLikes, [id]: !(communityLikes[id] ?? false) };
            setCommunityLikes(next);
            try { localStorage.setItem("lb_gen_likes", JSON.stringify(next)); } catch { /**/ }
          }}
          onHide={isAdmin ? (id) => { const it = filteredCommunity.find(i => i.id === id); if (it) void hideCommunityItem(it); } : undefined}
          onDelete={isAdmin ? (id) => { const it = filteredCommunity.find(i => i.id === id); if (it) void deleteCommunityItem(it); } : undefined}
          onAssign={isAdmin ? async (id, customerName) => {
            await adminAction({ action: "assign-generation", id, customerName });
            setCommunityItems(prev => prev.map(i => i.id === id ? { ...i, customerName } : i));
          } : undefined}
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
