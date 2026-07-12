"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";

// Bandwidth-friendly showcase video: shows only the POSTER image until tapped, then loads &
// plays the clip (preload="none" → zero video bytes on page load). Replaces autoplay clips on
// marketing/profile pages, where every visit used to download the full video whether watched
// or not. Muted-loop by default so a tapped clip feels like the old autoplay showcase.
export default function LazyVideo({
  src, poster, className = "", controls = false, loop = true, muted = true,
}: {
  src: string; poster?: string; className?: string; controls?: boolean; loop?: boolean; muted?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const start = () => {
    setStarted(true);
    const v = ref.current;
    if (v) { try { v.load(); void v.play().catch(() => {}); } catch { /**/ } }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {started ? (
        <video ref={ref} src={src} poster={poster || undefined} preload="auto"
          controls={controls} loop={loop} muted={muted} playsInline autoPlay
          className="h-full w-full object-cover" onClick={() => { const v = ref.current; if (!v) return; if (v.paused) void v.play().catch(() => {}); else v.pause(); }} />
      ) : (
        <button type="button" onClick={start} className="group relative block h-full w-full" aria-label="Play video">
          {poster
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={poster} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            : <span className="block h-full w-full bg-black" />}
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition group-active:scale-90">
              <Play className="h-6 w-6 translate-x-[1px]" fill="currentColor" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
