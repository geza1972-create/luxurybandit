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
    // `relative`, damit die Punkte ÜBER dem Karussell liegen statt darin: sonst
    // stecken sie in jedem Beitrag und wandern beim Wischen mit.
    <div className="relative">
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

              {/* Titel UND Text liegen im Bild, unten. Der Text sass vorher unter dem
                  Bild — jetzt sitzt er direkt unter dem Titel, mit wenig Abstand.
                  Das Overlay ist durchklickbar, sonst käme das Video nicht an den Tipp. */}
              {(p.title || p.caption) && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-5 pb-2 pt-24">
                  {p.title && (
                    <p className="text-[28px] font-black leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">{p.title}</p>
                  )}
                  {p.caption && (
                    <p className="mt-1 whitespace-pre-line text-[13px] font-semibold leading-snug text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
                      {p.caption}
                    </p>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Punkte: liegen fest oben mittig über dem Bild und bleiben beim Wischen stehen.
          Der Streifen selbst ist durchklickbar, nur die Punkte fangen den Tipp ab. */}
      {posts.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex items-center justify-center gap-1.5">
          {posts.map((dot, j) => (
            <button key={dot.id} type="button" onClick={() => goTo(j)} aria-label={`Beitrag ${j + 1}`}
              className={`pointer-events-auto h-1.5 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.8)] transition-all ${j === active ? "w-5 bg-[#c9a23f]" : "w-1.5 bg-white/60"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
