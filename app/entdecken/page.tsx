"use client";

export const dynamic = "force-dynamic";

import { Heart, Loader2, MessageCircle, Image as ImageIcon, Sparkles } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  productType?: "real" | "virtual";
  generationCount?: number;
  category?: string | null;
  createdAt?: string;
};

const AI_CATEGORIES = ["Vintage", "Luxury", "Streetwear", "Casual", "Sportswear", "Formalwear", "Accessories"] as const;
type AiCategory = typeof AI_CATEGORIES[number];
type Category = "trending" | "neu" | AiCategory;

// Deterministic counts
function viewCount(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(31, h) + id.charCodeAt(i) | 0;
  const n = (Math.abs(h) % 49901) + 100;
  return n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
function seedCommentCount(id: string): number {
  let h = 0;
  const s = id + "_comments";
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return (Math.abs(h) % 3) + 2;
}
function likeCount(id: string): string {
  let h = 0;
  const s = id + "_likes";
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  const n = (Math.abs(h) % 49800) + 200;
  return n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const FIXED_CATEGORIES: { key: "trending" | "neu"; label: string; emoji: string }[] = [
  { key: "trending", label: "Trending", emoji: "🔥" },
  { key: "neu",      label: "Neu",      emoji: "✨" },
];

export default function EntdeckenPage() {
  const router = useRouter();
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>("trending");

  useEffect(() => {
    fetch("/api/try-this-look")
      .then(r => r.json())
      .then((d: { looks?: Look[] }) => setLooks(d.looks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Which AI categories actually have data
  const activeAiCategories = useMemo(
    () => AI_CATEGORIES.filter(c => looks.some(l => l.category === c)),
    [looks]
  );

  const feed = useMemo(() => {
    if (category === "trending") {
      return [...looks].sort((a, b) => (b.generationCount ?? 0) - (a.generationCount ?? 0));
    }
    if (category === "neu") {
      return [...looks].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
    }
    // AI category filter
    return looks.filter(l => l.category === category);
  }, [looks, category]);

  return (
    <div className="min-h-screen bg-white pb-24" style={{ maxWidth: "100vw" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-black/8 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-lg px-4 pt-safe-top">
          <div className="flex items-center justify-between py-3">
            <span className="text-lg font-black tracking-tight text-black">Entdecken</span>
            <button
              type="button"
              onClick={() => router.push("/try-this-look")}
              className="flex items-center gap-1.5 rounded-full bg-cobalt px-3 py-1.5 text-[11px] font-black text-white active:opacity-70"
            >
              <Sparkles className="h-3 w-3" /> Try-on
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 pb-3 overflow-x-auto scrollbar-none">
            {FIXED_CATEGORIES.map(({ key, label, emoji }) => (
              <button key={key} type="button" onClick={() => setCategory(key)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-black transition ${
                  category === key ? "bg-black text-white" : "bg-black/6 text-black/60"
                }`}>
                {emoji} {label}
              </button>
            ))}
            {activeAiCategories.map(cat => (
              <button key={cat} type="button" onClick={() => setCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-black transition ${
                  category === cat ? "bg-black text-white" : "bg-black/6 text-black/60"
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Feed */}
      <main className="mx-auto max-w-lg">
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-black/30" />
          </div>
        )}

        {!loading && feed.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-24 text-center px-6">
            <span className="text-4xl">🛍️</span>
            <p className="text-sm font-black text-black/40">Noch keine Produkte.</p>
          </div>
        )}

        {!loading && feed.length > 0 && (
          <div className="grid grid-cols-3 gap-0.5">
            {feed.map((look) => {
              const thumb = look.frontImageUrl ?? look.imageUrl;
              const isSoldOut = look.inStock === false;
              return (
                <div key={look.id} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => router.push(`/look/${look.id}`)}
                    className="relative aspect-square overflow-hidden bg-black/5 active:opacity-80 transition-opacity" style={{touchAction:"manipulation"}}
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
                    {isSoldOut && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="rounded bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">Sold</span>
                      </div>
                    )}
                    {/* Trending badge */}
                    {category === "trending" && (look.generationCount ?? 0) >= 5 && (
                      <span className="absolute top-1.5 left-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-black text-white backdrop-blur-sm">
                        🔥 {look.generationCount}
                      </span>
                    )}
                  </button>

                  {/* Info row */}
                  <div className="flex items-center gap-1.5 px-2 pt-1 pb-0 bg-white">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); if (look.storeSlug) router.push(`/store/${look.storeSlug}`); }}
                      className="flex h-4 w-4 shrink-0 overflow-hidden rounded-full bg-black/5"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(look.storeSlug ?? "default")}&backgroundColor=ffffff&color=000000`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-[9px] font-black text-black/70">
                      {look.storeName ?? look.storeSlug ?? ""}
                    </span>
                    {(look.salePrice ?? look.price) && (
                      <span className="shrink-0 text-[9px] font-black text-black/70">{look.salePrice ?? look.price}</span>
                    )}
                  </div>

                  {/* Social bar */}
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
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                      <span className="text-[9px] font-bold">{viewCount(look.id)}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
