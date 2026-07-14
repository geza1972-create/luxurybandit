"use client";

import { useRef, useState } from "react";
import { Play, X } from "lucide-react";

// Bandwidth-friendly showcase video: shows only the POSTER thumbnail until tapped (zero
// video bytes on page load). A tap opens the clip in a full-screen in-app overlay — big,
// with sound + native controls + a close button — instead of the flaky browser
// requestFullscreen API (which iframes/some browsers block, leaving a broken inline clip).
export default function LazyVideo({
  src, poster, className = "",
}: {
  src: string; poster?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  return (
    <>
      {/* Thumbnail — poster + play badge; loads no video until tapped. */}
      <button type="button" onClick={() => setOpen(true)} aria-label="Play video"
        className={`group relative block overflow-hidden ${className}`}>
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

      {/* Full-screen player overlay — full viewport, always shows a close button + controls. */}
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black" onClick={() => setOpen(false)}>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close"
            className="absolute right-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur active:scale-90"
            style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}>
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={ref} src={src} poster={poster || undefined} autoPlay controls playsInline
            onClick={e => e.stopPropagation()} className="max-h-full max-w-full" />
        </div>
      )}
    </>
  );
}
