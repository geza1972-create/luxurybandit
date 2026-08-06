"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Play } from "lucide-react";

/**
 * Die Beispiel-Videos oben auf einer Themenseite — antippbar und mit Musik
 * (Owner 29.07.2026: „die Videos sind anklickbar und mit musik … Und Sound zum stoppen").
 *
 * ENTSCHEIDUNGEN, die dahinterstecken:
 *
 * 1. Die Clips laufen weiter stumm in Schleife, statt auf einen Tipp zu warten. Ein
 *    Standbild oder gar ein schwarzes Feld ist der schlechteste erste Eindruck, und die
 *    Browser lassen stummes Abspielen ohne Zutun zu — Ton nicht. Der Tipp schaltet also
 *    nicht „an/aus", sondern hält an und weiter, genau wie im Feed.
 *
 * 2. Die Musik ist EIN Element für den ganzen Slider, nicht eins pro Video. Vier Spuren
 *    gleichzeitig wären Lärm. Sie kommt aus /api/feed-music (die mp3-Dateien in /public).
 *
 * 3. Ton startet AUS. Ungefragt losplärrende Seiten schließt man sofort — und der Browser
 *    würde es ohnehin blockieren. Der erste Tipp auf ein Video schaltet ihn an, weil genau
 *    das die Handlung ist, die der Browser als Erlaubnis akzeptiert. Der Lautsprecher-Knopf
 *    stoppt ihn jederzeit wieder.
 */
export default function ExampleVideoSlider({ urls }: { urls: string[] }) {
  const [soundOn, setSoundOn] = useState(false);
  const [paused, setPaused] = useState<Record<number, boolean>>({});
  const [track, setTrack] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Musikspur holen. Eine feste Wahl (die erste) statt Zufall — sonst zöge der Server eine
  // andere als der Browser und React meckert über abweichende Ausgabe.
  useEffect(() => {
    fetch("/api/feed-music", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { const t = Array.isArray(d?.tracks) ? d.tracks : []; if (t.length) setTrack(String(t[0])); })
      .catch(() => {});
  }, []);

  // Ton an/aus zieht die Musik nach. `play()` kann abgelehnt werden (Autoplay-Regeln) —
  // dann bleibt der Knopf ehrlich auf „aus", statt an zu zeigen und still zu sein.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (soundOn) { a.volume = 0.55; a.play().catch(() => setSoundOn(false)); }
    else a.pause();
  }, [soundOn, track]);

  // Anhalten und weiter — NICHT von vorne. Ein Video, das bei jedem Tipp zurückspringt,
  // fühlt sich kaputt an.
  const toggle = (i: number) => {
    const v = videoRefs.current[i];
    if (!v) return;
    if (v.paused) { void v.play().catch(() => {}); setPaused(p => ({ ...p, [i]: false })); if (!soundOn) setSoundOn(true); }
    else { v.pause(); setPaused(p => ({ ...p, [i]: true })); }
  };

  if (!urls.length) return null;

  return (
    <div className="relative">
      <div className="lb-wisch -mx-4 mt-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2">
        {urls.map((url, i) => (
          <button key={i} type="button" onClick={() => toggle(i)} aria-label={paused[i] ? "Play" : "Pause"}
            className="relative w-[62%] max-w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={el => { videoRefs.current[i] = el; }} src={url}
              muted loop playsInline autoPlay preload="metadata"
              className="aspect-[3/4] w-full object-cover" />
            {paused[i] && (
              <span className="absolute inset-0 grid place-items-center bg-black/35">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90">
                  <Play className="ml-0.5 h-5 w-5 text-black" />
                </span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Ton-Knopf: sitzt über dem Slider, damit er beim Wischen nicht mitwandert. */}
      {track && (
        <button type="button" onClick={() => setSoundOn(s => !s)}
          aria-label={soundOn ? "Sound off" : "Sound on"}
          className="absolute right-1 top-7 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur active:scale-95 transition">
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      )}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      {track && <audio ref={audioRef} src={track} loop preload="none" />}
    </div>
  );
}
