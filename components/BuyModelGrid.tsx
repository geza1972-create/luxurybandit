"use client";

import { Play } from "lucide-react";

type Model = { name: string; photo: string; video?: string; poster?: string };

// "Own a unique influencer" grid: each model is one-of-a-kind and STILL FREE. Tapping a
// card opens the ONE shared form dialog (InfluencerFormDialog) via a window event —
// no per-card form. Scarcity: "claim her before someone else does."
export default function BuyModelGrid({ models }: { models: Model[] }) {
  const claim = (m: Model) => {
    try { window.dispatchEvent(new CustomEvent("lb-buy-influencer", { detail: { model: m.name || "" } })); } catch { /**/ }
  };

  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {models.map((m, i) => (
        <button key={i} type="button" onClick={() => claim(m)}
          className="group relative block aspect-[3/4] overflow-hidden rounded-xl lb-media-bg active:scale-95 transition">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.poster || m.photo} alt={m.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
          <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white shadow">
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> Free
          </span>
          {m.video ? <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-black/45 text-white backdrop-blur"><Play className="h-2.5 w-2.5" fill="currentColor" /></span> : null}
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1.5 pt-5 text-center">
            <span className="text-[10px] font-black text-amber-300">Buy now →</span>
          </span>
        </button>
      ))}
    </div>
  );
}
