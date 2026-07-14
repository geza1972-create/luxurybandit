"use client";

import { useEffect, useState } from "react";

type Outfit = { id: string; imageUrl?: string; lookId?: string };

// A peek at OUR wardrobe — the admin-managed outfit gallery (state.outfits, the
// garments you upload at /admin/outfits and dress the influencer in). NOT the
// /clothes catalogue (that mixes Bellucci + model look-photos). GET is signed & cheap.
export default function WardrobePeek() {
  const [imgs, setImgs] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/try-this-look", { cache: "no-store" });
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        const outfits: Outfit[] = Array.isArray(d.outfits) ? d.outfits : [];
        const urls = outfits.map(o => o.imageUrl || "").filter(Boolean);
        setImgs([...new Set(urls)].slice(0, 12));
      } catch { /* silent — box just hides its image row */ }
    })();
    return () => { alive = false; };
  }, []);

  if (imgs.length < 1) return null;

  return (
    <>
      <p className="mt-6 text-[11px] font-black uppercase tracking-[0.18em] text-white/45">A peek at the wardrobe</p>
      <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {imgs.map((src, i) => (
          <div key={i} className="relative aspect-[3/4] w-[30%] shrink-0 snap-start overflow-hidden rounded-xl bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="Wardrobe piece" loading="lazy" decoding="async" className="h-full w-full object-cover"
              onError={e => { e.currentTarget.style.display = "none"; }} />
          </div>
        ))}
      </div>
    </>
  );
}
