"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";

// Bandwidth-friendly showcase video: shows only the POSTER until tapped (preload="none" →
// zero video bytes on page load). With `fullscreen` (default) a tap opens the clip in the
// device's native full-screen player — with sound + controls — instead of playing in the
// small thumbnail. Without it, the clip plays inline (muted loop) like an autoplay showcase.
export default function LazyVideo({
  src, poster, className = "", controls = false, loop = true, muted = true, fullscreen = true,
}: {
  src: string; poster?: string; className?: string; controls?: boolean; loop?: boolean; muted?: boolean; fullscreen?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  // Called inside the tap gesture — the <video> is always in the DOM (preload="none"), so
  // requestFullscreen()/webkitEnterFullscreen() are allowed here (a later effect would lose
  // the user-gesture context and get rejected).
  const start = () => {
    const v = ref.current;
    if (!v) return;
    setStarted(true);
    try {
      if (fullscreen) { v.muted = false; v.controls = true; v.loop = false; }
      void v.play().catch(() => {});
      if (fullscreen) {
        const vAny = v as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
        if (typeof v.requestFullscreen === "function") void v.requestFullscreen().catch(() => {});
        else if (typeof vAny.webkitEnterFullscreen === "function") vAny.webkitEnterFullscreen();
      }
    } catch { /**/ }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <video ref={ref} src={src} poster={poster || undefined} preload="none"
        controls={controls} loop={loop} muted={muted} playsInline
        className="h-full w-full object-cover"
        onClick={() => { const v = ref.current; if (!v) return; if (v.paused) void v.play().catch(() => {}); else v.pause(); }} />
      {!started && (
        <button type="button" onClick={start} className="group absolute inset-0 grid place-items-center" aria-label="Play video">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition group-active:scale-90">
            <Play className="h-6 w-6 translate-x-[1px]" fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}
