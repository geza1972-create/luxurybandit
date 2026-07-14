"use client";

import { useEffect, useState } from "react";

type Item = { thumbnail?: string };

// A peek at the REAL wardrobe gallery — pulls the exact same data as /clothes
// (POST /api/mai-ieftin-chat { demoProducts: "haine" } → our collection + Bellucci),
// so the landing shows the genuine catalogue, not a reconstruction. Cached/zero-AI.
export default function WardrobePeek() {
  const [imgs, setImgs] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/mai-ieftin-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demoProducts: "haine" }),
        });
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        const own: Item[] = Array.isArray(d.ownProducts) ? d.ownProducts : [];
        const bell: Item[] = Array.isArray(d.products) ? d.products : [];
        const urls = [...own, ...bell].map(p => p?.thumbnail || "").filter(Boolean);
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
