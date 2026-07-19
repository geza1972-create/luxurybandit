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
            {/* Feste Höhe für JEDE Slide (3:4). Sonst ist eine Slide hoch, die nächste
                flach — und der Text beginnt jedes Mal woanders. `contain` statt `cover`,
                damit nichts vom Bild abgeschnitten wird (in den Bildern steht Text). */}
            <div className="relative aspect-[3/4] w-full bg-black">
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
                    className="absolute inset-0 h-full w-full cursor-pointer object-contain"
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
                  className="absolute inset-0 h-full w-full object-contain" />
              )}
            </div>

            {/* Der Text hängt NICHT mehr unten am Bild, sondern beginnt bei jeder Slide
                an derselben Stelle: 55 % der Bildhöhe. Ein langer Text läuft nach unten
                über das Bild hinaus weiter — der Verlauf endet in der Seitenfarbe, damit
                das nahtlos aussieht. Durchklickbar, sonst käme das Video nicht an den Tipp. */}
            {/* -mt in Prozent der BREITE: 49,3 % statt 60 % setzt den Text 40 px tiefer
                (bei 375 px Bildschirm) und skaliert auf größeren Geräten mit. */}
            {(p.title || p.caption) && (
              <div className="pointer-events-none relative -mt-[49.3%] bg-gradient-to-b from-transparent via-[#0d0b0a]/85 to-[#0d0b0a] px-5 pb-4 pt-10">
                {p.title && (
                  <p className="text-[28px] font-black leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">{p.title}</p>
                )}
                {p.caption && (
                  <p className="mt-1 whitespace-pre-line text-[13px] font-semibold leading-snug text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.95)]">
                    {p.caption}
                  </p>
                )}
              </div>
            )}
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
