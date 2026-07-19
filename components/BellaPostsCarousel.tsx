"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";

// Bellas Beiträge als Karussell: seitlich durchblättern statt untereinander.
// Nutzt natives Scroll-Snapping (auf dem Handy also echtes Wischen), der Index wird
// nur für die Punkte-Anzeige mitgeführt.
//
// Videos sehen aus wie Bilder: KEINE nativen Regler, nur ein Play-Knopf in der Mitte.
// Tippen schaltet zwischen Abspielen und Pause um und setzt dort fort, wo es stand.

export type BellaPost = {
  id: string;
  kind: "image" | "video";
  title: string;
  caption: string;
  mediaUrl: string;
  posterUrl?: string;
};

export default function BellaPostsCarousel({ posts, name }: { posts: BellaPost[]; name: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [active, setActive] = useState(0);
  const [playingId, setPlayingId] = useState("");

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

  // Tippen = abspielen/pausieren. Fortsetzen statt neu starten.
  const toggle = (id: string) => {
    const v = videoRefs.current[id];
    if (!v) return;
    if (v.paused) {
      // Andere Videos anhalten, damit nie zwei gleichzeitig laufen.
      Object.entries(videoRefs.current).forEach(([k, other]) => { if (k !== id && other) other.pause(); });
      void v.play().then(() => setPlayingId(id)).catch(() => {});
    } else {
      v.pause();
      setPlayingId("");
    }
  };

  if (posts.length === 0) return null;

  return (
    <div>
      <div ref={trackRef} onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {posts.map((p, i) => (
          <article key={p.id} className="w-full shrink-0 snap-center">
            <div className="relative w-full bg-black">
              {p.kind === "video" ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    ref={el => { videoRefs.current[p.id] = el; }}
                    src={p.mediaUrl}
                    poster={p.posterUrl || undefined}
                    playsInline
                    preload="metadata"
                    onEnded={() => setPlayingId("")}
                    onPause={() => setPlayingId(id => (id === p.id ? "" : id))}
                    onClick={() => toggle(p.id)}
                    className="block max-h-[78vh] w-full cursor-pointer object-contain"
                  />
                  {playingId !== p.id && (
                    <button type="button" onClick={() => toggle(p.id)} aria-label="Video abspielen"
                      className="absolute inset-0 grid place-items-center">
                      <span className="grid h-16 w-16 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/40 backdrop-blur-sm transition active:scale-95">
                        <Play className="ml-0.5 h-7 w-7" fill="currentColor" />
                      </span>
                    </button>
                  )}
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.mediaUrl} alt={`${name} ${i + 1}`} loading={i < 2 ? "eager" : "lazy"}
                  className="block max-h-[78vh] w-full object-contain" />
              )}

              {/* Titel im Bild — immer unten, da Videos keine Regler mehr haben.
                  Direkt darunter die Punkte, damit man sofort sieht, dass es weitergeht.
                  Overlay selbst ist durchklickbar (sonst käme das Video nicht mehr an
                  den Tipp), nur die Punkte fangen den Klick ab. */}
              {(p.title || posts.length > 1) && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-5 pb-4 pt-16">
                  {p.title && (
                    <p className="text-[28px] font-black leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">{p.title}</p>
                  )}
                  {posts.length > 1 && (
                    <div className="pointer-events-auto mt-3 flex items-center gap-1.5">
                      {posts.map((dot, j) => (
                        <button key={dot.id} type="button" onClick={() => goTo(j)} aria-label={`Beitrag ${j + 1}`}
                          className={`h-1.5 rounded-full transition-all ${j === active ? "w-5 bg-[#c9a23f]" : "w-1.5 bg-white/40"}`} />
                      ))}
                    </div>
                  )}
                </div>
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

    </div>
  );
}
