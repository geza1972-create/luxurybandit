"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Clip = { poster: string; video: string };

// Step-3 "Watch" clips: muted autoplay previews in a 3-up grid; tapping one opens
// it FULL in a fullscreen overlay, playing with sound and controls.
export default function AboutStep3Videos({ videos }: { videos: Clip[] }) {
  const [active, setActive] = useState<Clip | null>(null);
  if (!videos.length) return null;

  return (
    <>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {videos.map((v, i) => (
          <button key={i} type="button" onClick={() => setActive(v)}
            className="relative overflow-hidden rounded-xl lb-media-bg active:scale-95 transition-transform">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={v.video} poster={v.poster || undefined} muted loop playsInline autoPlay preload="metadata"
              className="aspect-[9/16] w-full object-cover" />
          </button>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setActive(null)}>
          <button type="button" onClick={() => setActive(null)}
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur active:scale-90"><X className="h-5 w-5" /></button>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={active.video} poster={active.poster || undefined} autoPlay loop playsInline controls
            onClick={e => e.stopPropagation()}
            className="max-h-[90dvh] w-auto max-w-[100vw] rounded-2xl object-contain" />
        </div>
      )}
    </>
  );
}
