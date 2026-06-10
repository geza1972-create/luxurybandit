"use client";

export const dynamic = "force-dynamic";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MessageCircle, Heart, UserPlus, UserCheck, ChevronLeft, Share2 } from "lucide-react";

type Look = {
  id: string;
  name: string;
  storeName?: string;
  storeSlug?: string;
  storeAddress?: string;
  whatsappNumber?: string;
  price?: string;
  salePrice?: string;
  discountLabel?: string;
  dealEndsAt?: string;
  inStock?: boolean;
  availableSizes?: string[];
  availabilityNote?: string;
  deliveryTime?: string;
  productNote?: string;
  imageUrl: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  galleryImageUrls?: string[];
};

type Payload = { looks?: Look[]; error?: string };

// ── Save button ─────────────────────────────────────────────────────────────
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

function buildWhatsAppLink(number: string, name: string, price?: string) {
  const n = number.replace(/\D/g, "");
  const msg = encodeURIComponent(`Hi! I'm interested in "${name}"${price ? ` (${price})` : ""} — is it still available?`);
  return `https://wa.me/${n}?text=${msg}`;
}

export default function LookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storeSlug = String(params?.city ?? "");
  const lookId = String(params?.look ?? "");

  const [look, setLook] = useState<Look | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  // Touch swipe
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    fetch(`/api/try-this-look?store=${encodeURIComponent(storeSlug)}`)
      .then(r => r.json())
      .then((p: Payload) => setLook((p.looks ?? []).find(l => l.id === lookId) ?? null))
      .finally(() => setIsLoading(false));
  }, [storeSlug, lookId]);

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-black">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
    </div>
  );

  if (!look) return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black text-white">
      <span className="text-5xl">🛍️</span>
      <p className="text-sm font-black opacity-50">Listing not found</p>
      <button type="button" onClick={() => router.back()} className="text-xs font-black underline opacity-50">Go back</button>
    </div>
  );

  const images = [look.frontImageUrl ?? look.imageUrl, ...(look.galleryImageUrls ?? [])].filter(Boolean) as string[];
  const isSoldOut = look.inStock === false;
  const displayPrice = look.salePrice ?? look.price;
  const waLink = look.whatsappNumber ? buildWhatsAppLink(look.whatsappNumber, look.name, displayPrice) : null;

  const prev = () => setImgIndex(i => (i - 1 + images.length) % images.length);
  const next = () => setImgIndex(i => (i + 1) % images.length);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
    touchStartX.current = null;
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">

      {/* ── Full-screen image ── */}
      <div
        className="absolute inset-0"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {images[imgIndex] && (
          <Image
            src={images[imgIndex]}
            alt={look.name}
            fill
            sizes="100vw"
            className="object-cover object-top"
            priority
          />
        )}
        {/* gradient overlays */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      {/* ── Top bar ── */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-3 pt-12 pt-safe">
        <button
          type="button"
          onClick={() => router.back()}
          className="grid h-11 w-11 place-items-center rounded-full bg-black/30 text-white backdrop-blur"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Image dots */}
        {images.length > 1 && (
          <div className="flex gap-1">
            {images.map((_, i) => (
              <button key={i} type="button" onClick={() => setImgIndex(i)}
                className={`h-1 rounded-full transition-all ${i === imgIndex ? "w-5 bg-white" : "w-1.5 bg-white/40"}`}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-1">
          <SaveBtn lookId={look.id} />
          <button
            type="button"
            onClick={() => navigator.share?.({ title: look.name, url: window.location.href }).catch(() => {})}
            className="grid h-11 w-11 place-items-center"
          >
            <Share2 className="h-5 w-5 text-white drop-shadow" />
          </button>
        </div>
      </div>

      {/* ── Sold out overlay ── */}
      {isSoldOut && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
          <span className="rounded-full bg-white px-6 py-2 text-sm font-black uppercase tracking-widest text-black">Sold out</span>
        </div>
      )}

      {/* ── Bottom info panel ── */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-6 pb-safe">
        {/* Seller row */}
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => look.storeSlug && router.push(`/store/${look.storeSlug}`)}
            className="text-sm font-black text-white drop-shadow"
          >
            {look.storeName ?? storeSlug}
          </button>
          {look.storeSlug && <FollowBtn storeSlug={look.storeSlug} storeName={look.storeName ?? storeSlug} />}
        </div>

        {/* Product name */}
        <h1 className="text-xl font-black leading-tight text-white drop-shadow">
          {look.name}
        </h1>

        {/* Price row */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {look.discountLabel && (
            <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-black text-white">{look.discountLabel}</span>
          )}
          {look.salePrice && (
            <span className="text-lg font-black text-white">{look.salePrice}</span>
          )}
          {look.price && (
            <span className={`text-base font-black ${look.salePrice ? "text-white/40 line-through" : "text-white"}`}>{look.price}</span>
          )}
        </div>

        {/* Sizes */}
        {(look.availableSizes ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {look.availableSizes!.map(size => (
              <span key={size} className="rounded-full border border-white/40 px-3 py-1 text-xs font-black text-white">{size}</span>
            ))}
          </div>
        )}

        {/* Expandable notes */}
        {look.productNote && (
          <button type="button" onClick={() => setShowInfo(v => !v)} className="mt-2 text-left text-xs font-bold text-white/60">
            {showInfo ? look.productNote : `${look.productNote.slice(0, 60)}${look.productNote.length > 60 ? "… more" : ""}`}
          </button>
        )}

        {/* WhatsApp CTA */}
        <div className="mt-4">
          {waLink && !isSoldOut ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#25D366] text-base font-black text-white shadow-xl active:scale-95 transition-transform"
            >
              <MessageCircle className="h-5 w-5" />
              Contact on WhatsApp
            </a>
          ) : (
            <div className="flex h-14 w-full items-center justify-center rounded-2xl bg-white/10 text-base font-black text-white/40">
              Sold out
            </div>
          )}
        </div>
      </div>

      {/* ── Tap zones left/right to switch image ── */}
      {images.length > 1 && (
        <>
          <button type="button" onClick={prev} className="absolute left-0 top-1/4 z-10 h-1/2 w-1/4" aria-label="Previous photo" />
          <button type="button" onClick={next} className="absolute right-0 top-1/4 z-10 h-1/2 w-1/4" aria-label="Next photo" />
        </>
      )}
    </div>
  );
}
