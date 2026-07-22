"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { CornerOrnaments } from "@/components/BoxOrnaments";
import BellaPostsCarousel from "@/components/BellaPostsCarousel";

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
  greetPre: string;   // Gruß ohne Name (Name danach in Gold)
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
    greetPre: "Bună dimineața,",
    wxLine: (c, w, e, t) => `La ${c} azi e ${w} ${e}, ${t}°.`,
    wxLoading: c => `La ${c}…`,
    online: "online",
    opener: (n) => `Bună dimineața, ${n}! Mă bucur că ești aici. Cum ai dormit?`,
    placeholder: m => `Scrie-i lui ${m}…`,
    aiNote: m => `✨ Vorbești cu asistentul AI al lui ${m} — o persona AI, nu persoana reală.`,
  },
  de: {
    greet: n => `Guten Morgen, ${n}!`,
    greetPre: "Guten Morgen,",
    wxLine: (c, w, e, t) => `In ${c} ist heute ${w} ${e}, ${t}°.`,
    wxLoading: c => `In ${c}…`,
    online: "online",
    opener: (n) => `Guten Morgen, ${n}! Schön, dass du da bist. Wie hast du geschlafen?`,
    placeholder: m => `Schreib ${m}…`,
    aiNote: m => `✨ Du chattest mit ${m}s KI-Assistentin — eine KI-Persona, nicht die echte Person.`,
  },
  en: {
    greet: n => `Good morning, ${n}!`,
    greetPre: "Good morning,",
    wxLine: (c, w, e, t) => `In ${c} it's ${w} ${e}, ${t}° today.`,
    wxLoading: c => `In ${c}…`,
    online: "online",
    opener: (n) => `Good morning, ${n}! So glad you're here. How did you sleep?`,
    placeholder: m => `Message ${m}…`,
    aiNote: m => `✨ You're chatting with ${m}'s AI assistant — an AI persona, not the real person.`,
  },
};

export default function WetterSubscriberView({ name, city, look, lang = DEFAULT_LANG, modelId = DEFAULT_MODEL_ID, modelName = "Bella", subId = "", day = "", time = "", title = "", caption = "", firstMessage = "", dayContext = "" }: {
  name: string; city: string; look: Look | null; lang?: string; modelId?: string; modelName?: string; subId?: string; day?: string; time?: string;
  title?: string;         // „Titel" aus dem Beitrag — groß über dem Text
  caption?: string;       // „Text unter dem Bild" aus dem Beitrag
  firstMessage?: string;  // „Erste Nachricht im Chat" — Opener (leer = Standard-Gruß)
  dayContext?: string;    // „Ihr Tag heute" — steuert den Chat
}) {
  const L = (lang || DEFAULT_LANG).slice(0, 2).toLowerCase();
  const t = T[L] ?? T.en;
  const wxWords = WX[L] ?? WX.en;

  // Login auf DIESEM Gerät merken: kommt der Abonnent per `?s=`-Link, speichern wir die
  // Kennung — beim nächsten Öffnen von /wetter/<model> erkennt ihn die Seite ohne Link.
  useEffect(() => {
    if (!subId) return;
    try { localStorage.setItem(`lb_wetter_sub_${modelId}`, subId); } catch { /**/ }
  }, [subId, modelId]);

  const [weather, setWeather] = useState<{ temp: number; word: string; e: string } | null>(null);
  const tzRef = useRef<string>("");   // Zeitzone der Stadt — fürs spätere „Morgen"-Timing pro Land.

  // Selbst-Abmeldung (der Abonnent stoppt die tägliche Nachricht direkt hier).
  const [unsubbed, setUnsubbed] = useState(false);
  const [unsubbing, setUnsubbing] = useState(false);
  const unsubscribe = async () => {
    if (!subId) return;
    const ask = L === "de" ? "Keine Morgennachrichten mehr?" : L === "en" ? "Stop the morning messages?" : "Oprești mesajele de dimineață?";
    if (typeof window !== "undefined" && !window.confirm(ask)) return;
    setUnsubbing(true);
    try {
      await fetch("/api/wetter-unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId, s: subId }) });
      try { localStorage.removeItem(`lb_wetter_sub_${modelId}`); } catch { /**/ }
      setUnsubbed(true);
    } catch { /**/ } finally { setUnsubbing(false); }
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
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: firstMessage.trim() || t.opener(name, modelName) }]);
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
        body: JSON.stringify({ curatorId: modelId, visitorId: (name || "sub").toLowerCase(), userName: name, messages: next, lang: L, dayContext }),
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

  // "2026-07-22" → "22.07.2026" (+ optional Uhrzeit) fürs Datum unter dem Video.
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  const dateLabel = dm ? `${dm[3]}.${dm[2]}.${dm[1]}${time ? ` · ${time}` : ""}` : "";

  return (
    <div className="mx-auto max-w-md">
      {/* VIDEO zuerst — klebt direkt am Header (Muster), Video full, Sound oben links,
          Vergrößern oben rechts. KEIN Text im Bild (Overlay leer) → alle Texte kommen darunter. */}
      {look && (
        <BellaPostsCarousel name={modelName}
          posts={[{ id: "day", kind: look.kind, title: "", caption: "", mediaUrl: look.mediaUrl, posterUrl: look.posterUrl }]} />
      )}

      <div className="px-4">
      {/* ALLE Texte UNTER dem Video: Datum, Gruß, Wetter, Titel, Beitragstext. */}
      <div className="pt-4">
        {dateLabel && <p className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-400">📅 {dateLabel}</p>}
        <p className="text-[24px] font-black leading-tight text-white">{t.greetPre} <span className="text-amber-400">{name}!</span></p>
        <p className="mt-1 text-[14px] font-semibold text-white/70">
          {weather ? t.wxLine(city, weather.word, weather.e, weather.temp) : t.wxLoading(city)}
        </p>
        {title.trim() && <p className="mt-3 text-[20px] font-black leading-tight text-white">{title}</p>}
        {caption.trim() && <p className="mt-1.5 whitespace-pre-wrap text-[15px] font-semibold leading-relaxed text-white/70">{caption}</p>}
      </div>

      {/* Chat mit dem Model */}
      <div className="lb-theme relative mb-8 mt-6 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <CornerOrnaments />
        <div className="relative flex items-center justify-center gap-2 border-b border-black/10 px-9 py-3">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <p className="text-[13px] font-black text-white">{modelName} <span className="font-bold text-emerald-600">{t.online}</span></p>
        </div>
        <div ref={scrollRef} className="relative max-h-[46vh] space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] whitespace-pre-wrap px-3.5 py-2.5 text-sm font-medium ${m.role === "user"
                ? "lb-onmedia rounded-2xl rounded-tr-sm bg-[#1a160f] text-white"
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
        <div className="relative flex items-end gap-1.5 border-t border-black/10 px-3 py-3">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            rows={1} placeholder={t.placeholder(modelName)}
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-black/15 bg-white px-4 py-3 text-sm font-medium text-black outline-none focus:border-black placeholder:text-black/40" />
          <button type="button" onClick={() => void send()} disabled={sending || !input.trim()}
            className="lb-gold grid h-11 w-11 shrink-0 place-items-center rounded-full disabled:opacity-40 active:scale-90 transition">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        <p className="px-9 pb-4 pt-1 text-center text-[11px] font-bold text-white/80">{t.aiNote(modelName)}</p>
      </div>

      {/* Selbst-Abmeldung — der Abonnent stoppt die tägliche Nachricht direkt hier. */}
      {subId && (
        <div className="mb-8 text-center">
          {unsubbed ? (
            <p className="text-[12px] font-black text-white/50">
              {L === "de" ? "✓ Du bist abgemeldet — keine Nachrichten mehr." : L === "en" ? "✓ You're unsubscribed — no more messages." : "✓ Te-ai dezabonat — gata cu mesajele."}
            </p>
          ) : (
            <button type="button" onClick={() => void unsubscribe()} disabled={unsubbing}
              className="text-[12px] font-bold text-white/40 underline underline-offset-2 disabled:opacity-50">
              {L === "de" ? "Abmelden" : L === "en" ? "Unsubscribe" : "Dezabonează-te"}
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
