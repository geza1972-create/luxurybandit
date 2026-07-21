"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Volume2, VolumeX } from "lucide-react";

// Was der ABONNENT auf /wetter/<model>?name=…&city=…&lang=… sieht:
// persönlicher Gruß + Wetter aus seiner Stadt + Look vom Tag + Chat mit dem Model (im Abo unbegrenzt).
//
// MODEL-AGNOSTISCH: Model-ID + -Name kommen als Props (dieses Mal Bella, kann jede andere sein).
// WELTWEIT: jeder Text aus der Übersetzungs-Tabelle `T` (keyed by lang); Wetter (Open-Meteo) global,
// Bedingungs-Wörter pro Sprache; Zeitzone der Stadt mit abgefangen (spätere „Morgen"-Zustellung).

const DEFAULT_MODEL_ID = "curator-1783683672619-td4cy"; // Bella = Fallback/erstes Model
const DEFAULT_LANG = "ro";

type Msg = { role: "user" | "assistant"; content: string };
type Look = { kind: "image" | "video"; mediaUrl: string; posterUrl?: string };

// Open-Meteo weather_code → sprach-neutraler Schlüssel + Emoji.
function wxKey(code: number): { key: string; e: string } {
  if (code === 0) return { key: "clear", e: "☀️" };
  if (code <= 2) return { key: "partly", e: "🌤️" };
  if (code === 3) return { key: "cloudy", e: "☁️" };
  if (code <= 48) return { key: "fog", e: "🌫️" };
  if (code <= 67) return { key: "rain", e: "🌧️" };
  if (code <= 77) return { key: "snow", e: "❄️" };
  if (code <= 82) return { key: "showers", e: "🌦️" };
  if (code <= 99) return { key: "storm", e: "⛈️" };
  return { key: "", e: "🌡️" };
}

// Wetter-Wörter pro Sprache (Emoji ist sprach-neutral).
const WX: Record<string, Record<string, string>> = {
  ro: { clear: "senin", partly: "parțial noros", cloudy: "noros", fog: "ceață", rain: "ploaie", snow: "ninsoare", showers: "averse", storm: "furtună", "": "" },
  en: { clear: "clear", partly: "partly cloudy", cloudy: "cloudy", fog: "fog", rain: "rain", snow: "snow", showers: "showers", storm: "storm", "": "" },
  de: { clear: "klar", partly: "teils bewölkt", cloudy: "bewölkt", fog: "Nebel", rain: "Regen", snow: "Schnee", showers: "Schauer", storm: "Gewitter", "": "" },
};

// Alle sichtbaren Texte pro Sprache. Model-Name wird eingesetzt. Fallback: EN.
type Copy = {
  greet: (n: string) => string;
  wxLine: (city: string, word: string, emoji: string, temp: number) => string;
  wxLoading: (city: string) => string;
  online: string;
  opener: (userName: string, model: string) => string;
  placeholder: (model: string) => string;
  aiNote: (model: string) => string;
};
const T: Record<string, Copy> = {
  ro: {
    greet: n => `Bună dimineața, ${n}!`,
    wxLine: (c, w, e, t) => `La ${c} azi e ${w} ${e}, ${t}°.`,
    wxLoading: c => `La ${c}…`,
    online: "online",
    opener: (n) => `Bună dimineața, ${n}! Mă bucur că ești aici. Cum ai dormit?`,
    placeholder: m => `Scrie-i lui ${m}…`,
    aiNote: m => `✨ Vorbești cu asistentul AI al lui ${m} — o persona AI, nu persoana reală.`,
  },
  de: {
    greet: n => `Guten Morgen, ${n}!`,
    wxLine: (c, w, e, t) => `In ${c} ist heute ${w} ${e}, ${t}°.`,
    wxLoading: c => `In ${c}…`,
    online: "online",
    opener: (n) => `Guten Morgen, ${n}! Schön, dass du da bist. Wie hast du geschlafen?`,
    placeholder: m => `Schreib ${m}…`,
    aiNote: m => `✨ Du chattest mit ${m}s KI-Assistentin — eine KI-Persona, nicht die echte Person.`,
  },
  en: {
    greet: n => `Good morning, ${n}!`,
    wxLine: (c, w, e, t) => `In ${c} it's ${w} ${e}, ${t}° today.`,
    wxLoading: c => `In ${c}…`,
    online: "online",
    opener: (n) => `Good morning, ${n}! So glad you're here. How did you sleep?`,
    placeholder: m => `Message ${m}…`,
    aiNote: m => `✨ You're chatting with ${m}'s AI assistant — an AI persona, not the real person.`,
  },
};

// "2026-07-21" → "21.07.2026" (ohne Date, hydration-sicher).
function fmtDay(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : s;
}

export default function WetterSubscriberView({ name, city, look, lang = DEFAULT_LANG, modelId = DEFAULT_MODEL_ID, modelName = "Bella", subId = "", day = "", time = "" }: {
  name: string; city: string; look: Look | null; lang?: string; modelId?: string; modelName?: string; subId?: string; day?: string; time?: string;
}) {
  const L = (lang || DEFAULT_LANG).slice(0, 2).toLowerCase();
  const t = T[L] ?? T.en;
  const wxWords = WX[L] ?? WX.en;

  // Datum + Uhrzeit über dem Titel. Hat der Beitrag einen Tag, den zeigen; sonst das
  // heutige Datum + aktuelle Uhrzeit (erst im Effekt gesetzt → keine SSR-Abweichung).
  const [nowLabel, setNowLabel] = useState("");
  useEffect(() => {
    if (day) return;
    const d = new Date(); const p = (n: number) => String(n).padStart(2, "0");
    setNowLabel(`${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`);
  }, [day]);
  const dateLine = day ? (fmtDay(day) + (time ? ` · ${time}` : "")) : nowLabel;

  // Login auf DIESEM Gerät merken: kommt der Abonnent per `?s=`-Link, speichern wir die
  // Kennung — beim nächsten Öffnen von /wetter/<model> erkennt ihn die Seite ohne Link.
  useEffect(() => {
    if (!subId) return;
    try { localStorage.setItem(`lb_wetter_sub_${modelId}`, subId); } catch { /**/ }
  }, [subId, modelId]);

  const [weather, setWeather] = useState<{ temp: number; word: string; e: string } | null>(null);
  const tzRef = useRef<string>("");   // Zeitzone der Stadt — fürs spätere „Morgen"-Timing pro Land.

  // Look-Video: automatisch starten. Handys erlauben Autostart nur STUMM, deshalb muted +
  // playsInline. Das Poster ist bis dahin das Cover; ohne Poster zeigt der erste Frame.
  const lookVideoRef = useRef<HTMLVideoElement>(null);
  const [vidPlaying, setVidPlaying] = useState(false);   // läuft das Video? (steuert den Scan-Ladebalken)
  const [muted, setMuted] = useState(true);              // Autostart nur stumm erlaubt
  useEffect(() => {
    const v = lookVideoRef.current;
    if (!v || look?.kind !== "video") return;
    v.muted = true;
    v.play().catch(() => {});
  }, [look?.kind, look?.mediaUrl]);
  const toggleMute = () => {
    const v = lookVideoRef.current; if (!v) return;
    v.muted = !v.muted; setMuted(v.muted);
    if (v.paused) v.play().catch(() => {});
  };

  // Wetter aus der Stadt des Abonnenten (Open-Meteo, CORS-frei, kein Key, weltweit).
  useEffect(() => {
    if (!city) return;
    let ok = true;
    (async () => {
      try {
        const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${encodeURIComponent(L)}`).then(r => r.json());
        const loc = g?.results?.[0];
        if (!loc) return;
        tzRef.current = String(loc.timezone || "");   // ← Zeitzone mit abgefangen (steht bereit für die DB).
        const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code&timezone=auto`).then(r => r.json());
        const c = w?.current;
        if (ok && c) { const wk = wxKey(Number(c.weather_code)); setWeather({ temp: Math.round(c.temperature_2m), word: wxWords[wk.key] ?? "", e: wk.e }); }
      } catch { /**/ }
    })();
    return () => { ok = false; };
  }, [city, L, wxWords]);

  // ── Chat mit dem Model (Abonnent = unbegrenzt) ── in der Sprache des Abonnenten.
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: t.opener(name, modelName) }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    // Chat-Sitzung EINMAL zählen (nicht als Admin) → Wetter-Insights.
    try {
      const ck = `lb_wetter_chatted_${modelId}`;
      if (!sessionStorage.getItem(ck) && !localStorage.getItem("luxurybandit-try-look-admin-pin")) {
        sessionStorage.setItem(ck, "1");
        fetch("/api/wetter-stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId, kind: "chat" }) }).catch(() => {});
      }
    } catch { /**/ }
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next); setInput(""); setSending(true);
    try {
      const res = await fetch("/api/model-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curatorId: modelId, visitorId: (name || "sub").toLowerCase(), userName: name, messages: next, lang: L }),
      });
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json") || !res.body) {
        const d = await res.json().catch(() => ({}));
        setMessages(m => [...m, { role: "assistant", content: String(d.reply || "…") }]);
      } else {
        const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = "", started = false;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          if (!started) { started = true; setMessages(m => [...m, { role: "assistant", content: acc }]); }
          else setMessages(m => { const c = m.slice(); c[c.length - 1] = { role: "assistant", content: acc }; return c; });
        }
      }
    } catch { setMessages(m => [...m, { role: "assistant", content: "…" }]); }
    finally { setSending(false); }
  };

  return (
    <div className="mx-auto max-w-md px-4">
      {/* Persönlicher Gruß + Wetter */}
      <div className="pt-5">
        {dateLine && <p className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/50">📅 {dateLine}</p>}
        <p className="text-[24px] font-black leading-tight text-white">{t.greet(name)}</p>
        <p className="mt-1 text-[14px] font-semibold text-white/70">
          {weather ? t.wxLine(city, weather.word, weather.e, weather.temp) : t.wxLoading(city)}
        </p>
      </div>

      {/* Look vom Tag */}
      {look && (
        <div className="relative mt-4 aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
          {look.kind === "video" ? (
            <>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={lookVideoRef} src={look.mediaUrl}
                autoPlay muted loop playsInline preload="auto"
                onPlaying={() => setVidPlaying(true)}
                onWaiting={() => setVidPlaying(false)}
                onLoadedData={() => { const v = lookVideoRef.current; if (v) { v.muted = muted; v.play().catch(() => {}); } }}
                className="h-full w-full object-contain object-top" />
              {/* Lade-/Scan-Modus: läuft, bis das Video wirklich abspielt. */}
              {!vidPlaying && (
                <>
                  <div className="pointer-events-none absolute inset-0 bg-black/30" />
                  <span className="lb-scanline pointer-events-none absolute inset-x-3 h-[3px] rounded-full bg-gradient-to-r from-transparent via-[#c9a23f] to-transparent shadow-[0_0_16px_4px_rgba(201,162,63,0.55)]" />
                  <span className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] font-black uppercase tracking-[0.25em] text-white/80">{L === "en" ? "loading" : L === "de" ? "lädt" : "se încarcă"}…</span>
                </>
              )}
              {/* Ton an/aus (Autostart ist stumm). */}
              <button type="button" onClick={toggleMute} aria-label="Ton"
                className="lb-onmedia absolute bottom-2 right-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white ring-1 ring-white/25 backdrop-blur active:scale-95 transition">
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={look.mediaUrl} alt="" className="h-full w-full object-contain object-top" />
          )}
        </div>
      )}

      {/* Chat mit dem Model */}
      <div className="mb-8 mt-6 rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <p className="text-[13px] font-black text-white">{modelName} <span className="font-bold text-emerald-600">{t.online}</span></p>
        </div>
        <div ref={scrollRef} className="max-h-[46vh] space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] whitespace-pre-wrap px-3.5 py-2.5 text-sm font-medium ${m.role === "user"
                ? "rounded-2xl rounded-tr-sm bg-[#111] text-white"
                : "rounded-2xl rounded-tl-sm bg-white/10 text-white/90"}`}>{m.content}</div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50" />
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-end gap-1.5 border-t border-white/10 px-3 py-3">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            rows={1} placeholder={t.placeholder(modelName)}
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/15 bg-white px-4 py-3 text-sm font-medium text-white outline-none focus:border-black/70 placeholder:text-white/50" />
          <button type="button" onClick={() => void send()} disabled={sending || !input.trim()}
            className="lb-onmedia grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1a160f] text-white disabled:opacity-40 active:scale-90 transition">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        <p className="px-4 pb-3 text-center text-[11px] font-bold text-white/80">{t.aiNote(modelName)}</p>
      </div>
    </div>
  );
}
