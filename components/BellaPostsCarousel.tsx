"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Maximize2, X, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";

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
  day?: string;   // YYYY-MM-DD — für welchen Tag der Beitrag ist
  time?: string;  // HH:MM — bei mehreren Beiträgen am selben Tag
};

// "2027-07-22" → "22.07.2027"; optionale Uhrzeit dahinter.
function fmtDay(day?: string, time?: string): string {
  if (!day) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  const d = m ? `${m[3]}.${m[2]}.${m[1]}` : day;
  return time ? `${d} · ${time}` : d;
}

export default function BellaPostsCarousel({ posts, name }: { posts: BellaPost[]; name: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [active, setActive] = useState(0);
  const [playingId, setPlayingId] = useState("");
  const [muted, setMuted] = useState(true);   // Autostart geht nur STUMM; Ton per Knopf
  const [zoom, setZoom] = useState<{ url: string; kind: "image" | "video"; poster?: string } | null>(null);

  // Aktive Slide automatisch abspielen (stumm), alle anderen pausieren. Werbung = Autostart.
  useEffect(() => {
    const activeId = posts[active]?.id;
    Object.entries(videoRefs.current).forEach(([k, v]) => {
      if (!v) return;
      if (k === activeId) { v.muted = muted; v.defaultMuted = muted; void v.play().then(() => setPlayingId(k)).catch(() => {}); }
      else v.pause();
    });
  }, [active, posts, muted]);

  const toggleMute = () => setMuted(m => !m);

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
                damit nichts vom Bild abgeschnitten wird (in den Bildern steht Text).
                `object-top`: passt ein Bild nicht genau, liegt der schwarze Rest UNTEN
                unter dem Text — oben bleibt es bündig am Header. */}
            <div className="relative aspect-[3/4] w-full bg-black">
              {p.kind === "video" ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    ref={el => { videoRefs.current[p.id] = el; if (el) { el.muted = muted; el.defaultMuted = muted; } }}
                    src={p.mediaUrl}
                    poster={p.posterUrl || undefined}
                    muted playsInline loop
                    preload="metadata"
                    onEnded={() => setPlayingId("")}
                    onPause={() => setPlayingId(id => (id === p.id ? "" : id))}
                    onCanPlay={() => { if (posts[active]?.id === p.id) { const v = videoRefs.current[p.id]; if (v) { v.muted = muted; void v.play().catch(() => {}); } } }}
                    onClick={() => toggle(p.id)}
                    className="absolute inset-0 h-full w-full cursor-pointer object-contain object-top"
                  />
                  {playingId !== p.id && (
                    <button type="button" onClick={() => toggle(p.id)} aria-label="Video abspielen"
                      className="absolute inset-0 grid place-items-center">
                      <span className="lb-onmedia grid h-16 w-16 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/40 backdrop-blur-sm transition active:scale-95">
                        <Play className="ml-0.5 h-7 w-7" fill="currentColor" />
                      </span>
                    </button>
                  )}
                  {/* Ton an/aus (Autostart ist stumm). */}
                  <button type="button" onClick={(e) => { e.stopPropagation(); toggleMute(); }} aria-label="Ton"
                    className="lb-onmedia absolute bottom-2 left-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/30 backdrop-blur transition active:scale-95">
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.mediaUrl} alt={`${name} ${i + 1}`} loading={i < 2 ? "eager" : "lazy"}
                  className="absolute inset-0 h-full w-full object-contain object-top" />
              )}
              {/* Groß ansehen — Vollbild, ohne das Tap-to-Play zu stören. */}
              <button type="button" aria-label="Groß ansehen"
                onClick={(e) => { e.stopPropagation(); setZoom({ url: p.mediaUrl, kind: p.kind, poster: p.posterUrl }); }}
                className="lb-onmedia absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/30 backdrop-blur transition active:scale-95">
                <Maximize2 className="h-4 w-4" />
              </button>
              {/* Text-Overlay: ABSOLUT im Bild verankert (unten). Verlauf läuft nach oben ins
                  Transparente aus und endet IMMER an der Bildkante → nie ein dunkler Streifen
                  auf der Seite, in hell UND dunkel. Das war die Ursache des „Verlauf-Problems". */}
              {(p.title || p.caption || fmtDay(p.day, p.time)) && (
                <div className="lb-onmedia pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0d0b0a] via-[#0d0b0a]/70 to-transparent px-5 pb-4 pt-16">
                {/* Für welchen Tag (+ Uhrzeit) der Beitrag ist — direkt über dem Titel. */}
                {fmtDay(p.day, p.time) && (
                  <p className="mb-1.5 text-[12px] font-black uppercase tracking-wide text-white/85 drop-shadow-[0_1px_6px_rgba(0,0,0,0.95)]">📅 {fmtDay(p.day, p.time)}</p>
                )}
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
            </div>
          </article>
        ))}
      </div>

      {/* Pfeile links/rechts — damit man auch OHNE Wischen (Desktop/Maus) blättern kann.
          Auf dem Handy geht zusätzlich echtes Wischen. */}
      {posts.length > 1 && (
        <>
          <button type="button" onClick={() => goTo(Math.max(0, active - 1))} aria-label="Zurück"
            disabled={active === 0}
            className="lb-onmedia absolute left-2 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/25 backdrop-blur transition active:scale-95 disabled:opacity-0">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => goTo(Math.min(posts.length - 1, active + 1))} aria-label="Weiter"
            disabled={active === posts.length - 1}
            className="lb-onmedia absolute right-2 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/25 backdrop-blur transition active:scale-95 disabled:opacity-0">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

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

      {/* Vollbild-Vorschau der Slide (Bild/Video groß ansehen). */}
      {zoom && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-3" onClick={() => setZoom(null)}>
          <button type="button" onClick={() => setZoom(null)} aria-label="Schließen"
            className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white active:scale-95">
            <X className="h-5 w-5" />
          </button>
          {zoom.kind === "video"
            // eslint-disable-next-line jsx-a11y/media-has-caption
            ? <video src={zoom.url} poster={zoom.poster || undefined} controls autoPlay playsInline onClick={e => e.stopPropagation()} className="max-h-full max-w-full rounded-2xl" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={zoom.url} alt="" onClick={e => e.stopPropagation()} className="max-h-full max-w-full rounded-2xl object-contain" />}
        </div>
      )}
    </div>
  );
}
