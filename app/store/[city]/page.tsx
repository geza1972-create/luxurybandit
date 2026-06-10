"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, UserPlus, UserCheck } from "lucide-react";

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
};

type StoreData = {
  looks?: Look[];
  stores?: { name: string; slug: string; address?: string; whatsappNumber?: string }[];
};

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
      className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-black transition active:scale-95 ${
        following
          ? "border border-black/20 bg-white text-black/60"
          : "bg-black text-white"
      }`}
    >
      {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {following ? "Following" : "Follow"}
    </button>
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
      {/* ── Header — alles in einer Zeile ── */}
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/95 backdrop-blur">
        <div className="flex items-center gap-2 px-2 py-2">
          {/* Back */}
          <button
            type="button"
            onClick={() => router.back()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-black/60 active:bg-black/5"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Avatar */}
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(slug)}&backgroundColor=ffffff&color=000000`}
              alt={storeName}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Name + address */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-black">{storeName}</p>
            {store?.address && (
              <p className="truncate text-[10px] font-bold text-black/40">{store.address}</p>
            )}
          </div>

          {/* Stats */}
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

          {/* Follow */}
          <FollowBtn storeSlug={slug} storeName={storeName} />
        </div>
      </header>

      {/* ── Grid ── */}
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
                <button
                  key={look.id}
                  type="button"
                  onClick={() => router.push(`/look/${look.id}`)}
                  className="group relative aspect-square overflow-hidden bg-black/5 active:opacity-80 transition-opacity"
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

                  {/* Price overlay — always shown on mobile */}
                  {(look.salePrice ?? look.price) && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                      <span className="text-[11px] font-black text-white">
                        {look.salePrice ?? look.price}
                      </span>
                    </div>
                  )}

                  {/* Sold out */}
                  {isSoldOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="rounded bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black">Sold</span>
                    </div>
                  )}

                  {/* Discount badge */}
                  {look.discountLabel && !isSoldOut && (
                    <div className="absolute right-1 top-1 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                      {look.discountLabel}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
