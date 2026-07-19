"use client";

import { useRef, useState } from "react";

// Bellas Beiträge als Karussell: seitlich durchblättern statt untereinander.
// Nutzt natives Scroll-Snapping (auf dem Handy also echtes Wischen), der Index wird
// nur für die Punkte-Anzeige mitgeführt.

export type BellaPost = {
  id: string;
  kind: "image" | "video";
  caption: string;
  mediaUrl: string;
  posterUrl?: string;
};

export default function BellaPostsCarousel({ posts, name }: { posts: BellaPost[]; name: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    if (i !== active) setActive(Math.min(Math.max(i, 0), posts.length - 1));
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  if (posts.length === 0) return null;

  return (
    <div>
      <div ref={trackRef} onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {posts.map((p, i) => (
          <article key={p.id} className="w-full shrink-0 snap-center">
            <div className="w-full bg-black">
              {p.kind === "video" ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={p.mediaUrl} poster={p.posterUrl || undefined} controls playsInline preload="metadata"
                  className="block max-h-[70vh] w-full object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.mediaUrl} alt={`${name} ${i + 1}`} loading={i < 2 ? "eager" : "lazy"}
                  className="block max-h-[70vh] w-full object-contain" />
              )}
            </div>
            {p.caption && (
              <p className="whitespace-pre-line px-5 pt-3 text-[14px] font-semibold leading-relaxed text-white/85">
                {p.caption}
              </p>
            )}
          </article>
        ))}
      </div>

      {posts.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-4">
          {posts.map((p, i) => (
            <button key={p.id} type="button" onClick={() => goTo(i)} aria-label={`Beitrag ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-[#c9a23f]" : "w-1.5 bg-white/25"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
