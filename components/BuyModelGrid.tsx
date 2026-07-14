"use client";

import Link from "next/link";
import { Play } from "lucide-react";

type Model = { name: string; photo: string; video?: string; poster?: string; createdAt?: string };

const isNew = (createdAt?: string) => { if (!createdAt) return false; const t = Date.parse(createdAt); return !!t && Date.now() - t < 14 * 24 * 60 * 60 * 1000; };

// "Own a unique influencer" grid — matches the apply form's face box: red urgency störer
// on top, "NEW"/"FREE" badges per card. Tapping a card leads to /curators/apply to claim her.
export default function BuyModelGrid({ models }: { models: Model[] }) {
  return (
    <div className="mt-4">
      <div className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 px-4 py-2.5 text-center shadow-[0_6px_20px_rgba(220,38,38,0.45)]">
        <p className="text-[15px] font-black uppercase leading-none tracking-tight text-white drop-shadow">🔥 Grab yours before she&apos;s gone!</p>
        <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-white/90">Each face = only ONE owner, ever</p>
      </div>
      <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {models.map((m, i) => (
          <Link key={i} href="/curators/apply"
            className="group relative block aspect-[3/4] w-[30%] shrink-0 snap-start overflow-hidden rounded-xl lb-media-bg active:scale-95 transition">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.poster || m.photo} alt={m.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
            {isNew(m.createdAt)
              ? <span className="absolute right-1.5 top-1.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white shadow">New</span>
              : m.video ? <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-black/45 text-white backdrop-blur"><Play className="h-2.5 w-2.5" fill="currentColor" /></span> : null}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1.5 pt-5 text-center">
              <span className="text-[10px] font-black text-amber-300">Buy now →</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
