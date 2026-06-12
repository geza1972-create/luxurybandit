"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, Heart, Image as ImageIcon, MessageCircle, UserCheck, UserPlus, Loader2 } from "lucide-react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

type Look = {
  id: string;
  name: string;
  storeName?: string;
  storeSlug?: string;
  price?: string;
  salePrice?: string;
  discountLabel?: string;
  inStock?: boolean;
  productType?: "real" | "virtual";
  generationCount?: number;
  imageUrl: string;
  frontImageUrl?: string;
  galleryImageUrls?: string[];
};

type StoreData = {
  looks?: Look[];
  stores?: { name: string; slug: string; address?: string; whatsappNumber?: string }[];
};

function viewCount(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) { h = Math.imul(31, h) + id.charCodeAt(i) | 0; }
  const n = (Math.abs(h) % 49901) + 100;
  return n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
function likeCount(id: string): string {
  let h = 0;
  const s = id + "_likes";
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  const n = (Math.abs(h) % 980) + 20;
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
function seedCommentCount(id: string): number {
  let h = 0;
  const s = id + "_comments";
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  return (Math.abs(h) % 3) + 2;
}

function FollowBtn({ storeSlug, storeName }: { storeSlug: string; storeName: string }) {
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = getStoredAuthSession();
    const headers: Record<string, string> = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` } : {};
    fetch(`/api/follow?slug=${encodeURIComponent(storeSlug)}&type=store`, { headers })
      .then(r => r.ok ? r.json() : { following: false, followerCount: 0 })
      .then((d: { following: boolean; followerCount: number }) => {
        setFollowing(d.following);
        setFollowerCount(d.followerCount);
      }).catch(() => {});
  }, [storeSlug]);

  const toggle = async () => {
    const session = getStoredAuthSession();
    if (!session) { router.push("/stores?panel=account"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ slug: storeSlug, type: "store" }),
      });
      const d = await res.json() as { following: boolean; followerCount: number };
      setFollowing(d.following);
      setFollowerCount(d.followerCount);
    } catch { /**/ }
    finally { setLoading(false); }
  };

  void storeName;
  return (
    <div className="flex items-center gap-2">
      {followerCount > 0 && (
        <span className="text-xs font-bold text-black/40">{followerCount} followers</span>
      )}
      <button type="button" onClick={() => void toggle()} disabled={loading}
        className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-black transition active:scale-95 disabled:opacity-50 ${
          following ? "border border-black/20 bg-white text-black/60" : "bg-black text-white"
        }`}>
        {loading
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : following
            ? <><UserCheck className="h-3.5 w-3.5" />Following</>
            : <><UserPlus className="h-3.5 w-3.5" />Follow</>
        }
      </button>
    </div>
  );
}

export default function StoreGalleryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params?.city ?? "");

  const [data, setData] = useState<StoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    fetch(`/api/try-this-look?store=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((payload: StoreData) => setData(payload))
      .catch(() => setError("Store could not be loaded."))
      .finally(() => setIsLoading(false));
  }, [slug]);

  const storeLooks = (data?.looks ?? []).filter(
    (look) => look.storeSlug?.toLowerCase() === slug.toLowerCase()
  );
  const store = data?.stores?.find((s) => s.slug.toLowerCase() === slug.toLowerCase());
  const storeName = store?.name ?? slug;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <p className="text-sm font-bold text-red-500">{error}</p>
        <button type="button" onClick={() => router.back()} className="text-xs font-black underline text-black/40">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/95 backdrop-blur">
        <div className="flex items-center gap-2 px-2 py-2">
          <button type="button" onClick={() => router.back()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-black/60 active:bg-black/5">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(slug)}&backgroundColor=ffffff&color=000000`}
              alt={storeName} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-black">{storeName}</p>
            {store?.address && <p className="truncate text-[10px] font-bold text-black/40">{store.address}</p>}
          </div>
          <div className="flex shrink-0 gap-3 text-center">
            <div>
              <p className="text-sm font-black text-black">{storeLooks.length}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-black/40">Listings</p>
            </div>
            <div>
              <p className="text-sm font-black text-black">{storeLooks.filter(l => l.inStock !== false).length}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide text-black/40">Avail.</p>
            </div>
          </div>
          <FollowBtn storeSlug={slug} storeName={storeName} />
        </div>
      </header>

      {/* Grid */}
      <main className="pb-16">
        {storeLooks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <span className="text-4xl">🛍️</span>
            <p className="text-sm font-black text-black/40">No listings yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {storeLooks.map((look) => {
              const thumb = look.frontImageUrl ?? look.imageUrl;
              const isSoldOut = look.inStock === false;
              return (
                <div key={look.id} className="flex flex-col">
                  {/* Image */}
                  <button type="button" onClick={() => router.push(`/look/${look.id}`)}
                    className="relative aspect-square overflow-hidden bg-black/5 active:opacity-80 transition-opacity">
                    {thumb ? (
                      <Image src={thumb} alt={look.name} fill
                        sizes="(max-width: 768px) 33vw, 170px" className="object-cover object-top" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">🛍️</div>
                    )}

                    {/* Sold out only — image stays clean */}
                    {isSoldOut && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="rounded bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">Sold</span>
                      </div>
                    )}
                  </button>

                  {/* Info row */}
                  <div className="flex items-center gap-1.5 px-2 pt-1.5 pb-0.5 bg-white">
                    {(look.salePrice ?? look.price) && (
                      <span className="min-w-0 flex-1 truncate text-[9px] font-black text-black/70">{look.salePrice ?? look.price}</span>
                    )}
                    {look.discountLabel && !isSoldOut && (
                      <span className="shrink-0 rounded bg-black/10 px-1 py-0.5 text-[8px] font-black text-black/60">{look.discountLabel}</span>
                    )}
                    <span className="ml-auto shrink-0 rounded-full bg-black/8 px-1 py-0.5 text-[8px] font-black text-black/50">
                      {(look.productType ?? "real") === "virtual" ? "✨AI" : "🏪Real"}
                    </span>
                  </div>

                  {/* Social bar — display only */}
                  <div className="flex items-center gap-3 border-b border-black/5 bg-white px-2 py-1.5 pointer-events-none select-none text-black/50">
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
        )}
      </main>
    </div>
  );
}
