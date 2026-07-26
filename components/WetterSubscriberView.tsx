"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Lock, X, Play } from "lucide-react";
import { CornerOrnaments } from "@/components/BoxOrnaments";
import BellaPostsCarousel from "@/components/BellaPostsCarousel";
import { wxKey, WX_WORDS, forecastLine } from "@/lib/wetter-forecast";
import { startPremiumCheckout } from "@/lib/start-premium-checkout";

// Was der ABONNENT auf /wetter/<model>?name=…&city=…&lang=… sieht:
// persönlicher Gruß + Wetter aus seiner Stadt + Look vom Tag + Chat mit dem Model (im Abo unbegrenzt).
//
// MODEL-AGNOSTISCH: Model-ID + -Name kommen als Props (dieses Mal Bella, kann jede andere sein).
// WELTWEIT: jeder Text aus der Übersetzungs-Tabelle `T` (keyed by lang); Wetter (Open-Meteo) global,
// Bedingungs-Wörter pro Sprache; Zeitzone der Stadt mit abgefangen (spätere „Morgen"-Zustellung).

const DEFAULT_MODEL_ID = "curator-1783683672619-td4cy"; // Bella = Fallback/erstes Model
const DEFAULT_LANG = "en";   // Standard = EN, wenn keine Sprache übergeben

// {Name} / {name} im Titel durch den echten Namen ersetzen (feste Vorgabe wird personalisiert).
// Kein Name bekannt? Dann Platzhalter SAMT davorstehendem Komma entfernen und Satzzeichen
// glätten — sonst käme „Guten Morgen, !" beim Abonnenten an.
const personalizeName = (text: string, name: string) => {
  const n = (name || "").trim();
  if (n) return text.replace(/\{\s*name\s*\}/gi, n);
  return text
    .replace(/[,،]?\s*\{\s*name\s*\}/gi, "")   // „, {Name}" bzw. „{Name}" weg
    .replace(/\s+([!?.,])/g, "$1")             // Leerzeichen vor Satzzeichen
    .replace(/,\s*([!?])/g, "$1")              // „, !" → „!"
    .trim();
};

// Die KI beendet ihre Nachricht mit diesem Tag, wenn sie anbietet, sich „in etwas Heißem"
// zu zeigen. Der Chat blendet den Tag aus und zeigt stattdessen eine Look-Galerie
// (erste frei = Vorgeschmack, Rest gesperrt mit Schloss → Abo). Muss zu /api/model-chat passen.
const LINGERIE_TAG = "[[SHOW_LINGERIE]]";

type Msg = { role: "user" | "assistant"; content: string };
type Look = { kind: "image" | "video"; mediaUrl: string; posterUrl?: string };


// Alle sichtbaren Texte pro Sprache. Model-Name wird eingesetzt. Fallback: EN.
type Copy = {
  greet: (n: string) => string;
  greetPre: string;   // Gruß ohne Name (Name danach in Gold)
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
    wxLoading: c => `La ${c}…`,
    online: "online",
    opener: (n) => `Bună dimineața, ${n}! Mă bucur că ești aici. Cum ai dormit?`,
    placeholder: m => `Scrie-i lui ${m}…`,
    aiNote: m => `✨ Vorbești cu asistentul AI al lui ${m} — o persona AI, nu persoana reală.`,
  },
  de: {
    greet: n => `Guten Morgen, ${n}!`,
    greetPre: "Guten Morgen,",
    wxLoading: c => `In ${c}…`,
    online: "online",
    opener: (n) => `Guten Morgen, ${n}! Schön, dass du da bist. Wie hast du geschlafen?`,
    placeholder: m => `Schreib ${m}…`,
    aiNote: m => `✨ Du chattest mit ${m}s KI-Assistentin — eine KI-Persona, nicht die echte Person.`,
  },
  en: {
    greet: n => `Good morning, ${n}!`,
    greetPre: "Good morning,",
    wxLoading: c => `In ${c}…`,
    online: "online",
    opener: (n) => `Good morning, ${n}! So glad you're here. How did you sleep?`,
    placeholder: m => `Message ${m}…`,
    aiNote: m => `✨ You're chatting with ${m}'s AI assistant — an AI persona, not the real person.`,
  },
  es: {
    greet: n => `¡Buenos días, ${n}!`,
    greetPre: "¡Buenos días,",
    wxLoading: c => `En ${c}…`,
    online: "en línea",
    opener: (n) => `¡Buenos días, ${n}! Me alegra que estés aquí. ¿Qué tal dormiste?`,
    placeholder: m => `Escríbele a ${m}…`,
    aiNote: m => `✨ Estás chateando con la asistente AI de ${m} — una persona AI, no la persona real.`,
  },
  fr: {
    greet: n => `Bonjour, ${n} !`,
    greetPre: "Bonjour,",
    wxLoading: c => `À ${c}…`,
    online: "en ligne",
    opener: (n) => `Bonjour, ${n} ! Contente que tu sois là. Tu as bien dormi ?`,
    placeholder: m => `Écris à ${m}…`,
    aiNote: m => `✨ Tu discutes avec l'assistante AI de ${m} — une persona AI, pas la vraie personne.`,
  },
  pt: {
    greet: n => `Bom dia, ${n}!`,
    greetPre: "Bom dia,",
    wxLoading: c => `Em ${c}…`,
    online: "online",
    opener: (n) => `Bom dia, ${n}! Ainda bem que estás aqui. Dormiste bem?`,
    placeholder: m => `Escreve à ${m}…`,
    aiNote: m => `✨ Estás a conversar com a assistente AI da ${m} — uma persona AI, não a pessoa real.`,
  },
  pl: {
    greet: n => `Dzień dobry, ${n}!`,
    greetPre: "Dzień dobry,",
    wxLoading: c => `W ${c}…`,
    online: "online",
    opener: (n) => `Dzień dobry, ${n}! Cieszę się, że jesteś. Jak spałeś?`,
    placeholder: m => `Napisz do ${m}…`,
    aiNote: m => `✨ Rozmawiasz z asystentką AI ${m} — to persona AI, nie prawdziwa osoba.`,
  },
  it: {
    greet: n => `Buongiorno, ${n}!`,
    greetPre: "Buongiorno,",
    wxLoading: c => `A ${c}…`,
    online: "online",
    opener: (n) => `Buongiorno, ${n}! Che bello averti qui. Hai dormito bene?`,
    placeholder: m => `Scrivi a ${m}…`,
    aiNote: m => `✨ Stai chattando con l'assistente AI di ${m} — una persona AI, non la persona reale.`,
  },
};

export default function WetterSubscriberView({ name, city, look, lang = DEFAULT_LANG, modelId = DEFAULT_MODEL_ID, modelName = "Bella", subId = "", email = "", day = "", time = "", title = "", caption = "", firstMessage = "", dayContext = "", locked = false, modelSlug = "", monthlyCents = 2400 }: {
  name: string; city: string; look: Look | null; lang?: string; modelId?: string; modelName?: string; subId?: string; email?: string; day?: string; time?: string;
  title?: string;         // „Titel" aus dem Beitrag — groß über dem Text
  caption?: string;       // „Text unter dem Bild" aus dem Beitrag
  firstMessage?: string;  // „Erste Nachricht im Chat" — Opener (leer = Standard-Gruß)
  dayContext?: string;    // „Ihr Tag heute" — steuert den Chat
  locked?: boolean;       // nach 7 Öffnungen ohne Abo: Chat + Video gesperrt (Bild + Text bleiben)
  modelSlug?: string;     // für die Rückkehr-URL des Abo-Checkouts
  monthlyCents?: number;  // Abo-Preis (24 € = 2400) für den Freischalt-Button
}) {
  const L = (lang || DEFAULT_LANG).slice(0, 2).toLowerCase();
  const t = T[L] ?? T.en;
  const wxWords = WX_WORDS[L] ?? WX_WORDS.en;

  // Login auf DIESEM Gerät merken: kommt der Abonnent per `?s=`-Link, speichern wir die
  // Kennung — beim nächsten Öffnen von /wetter/<model> erkennt ihn die Seite ohne Link.
  useEffect(() => {
    if (!subId) return;
    try { localStorage.setItem(`lb_wetter_sub_${modelId}`, subId); } catch { /**/ }
  }, [subId, modelId]);

  const [weather, setWeather] = useState<{ temp: number; min: number; max: number; word: string; e: string; rainy: boolean; place: string } | null>(null);
  const tzRef = useRef<string>("");   // Zeitzone der Stadt — fürs spätere „Morgen"-Timing pro Land.

  // Paywall-Texte + Freischalten. Nach 7 Öffnungen sind Video + Chat gesperrt.
  const priceLabel = `${Math.round(monthlyCents / 100)} €`;
  const LOCK: Record<string, { spent: string; sub: string; cta: string; chat: string }> = {
    ro: { spent: "Ți-ai consumat toate creditele", sub: `Continuă cu ${priceLabel}/lună — video complet + chat nelimitat cu ${modelName}.`, cta: `🔓 Deblochează — ${priceLabel}/lună`, chat: "Deblochează pentru a continua conversația" },
    de: { spent: "Du hast alle Credits verbraucht", sub: `Weiter für ${priceLabel}/Monat — komplettes Video + unbegrenzter Chat mit ${modelName}.`, cta: `🔓 Freischalten — ${priceLabel}/Monat`, chat: "Zum Weiterchatten freischalten" },
    en: { spent: "You've used all your credits", sub: `Continue for ${priceLabel}/month — full video + unlimited chat with ${modelName}.`, cta: `🔓 Unlock — ${priceLabel}/month`, chat: "Unlock to keep chatting" },
    es: { spent: "Has usado todos tus créditos", sub: `Continúa por ${priceLabel}/mes — vídeo completo + chat ilimitado con ${modelName}.`, cta: `🔓 Desbloquear — ${priceLabel}/mes`, chat: "Desbloquea para seguir chateando" },
    fr: { spent: "Tu as utilisé tous tes crédits", sub: `Continue pour ${priceLabel}/mois — vidéo complète + chat illimité avec ${modelName}.`, cta: `🔓 Débloquer — ${priceLabel}/mois`, chat: "Débloque pour continuer à discuter" },
    pt: { spent: "Usaste todos os teus créditos", sub: `Continua por ${priceLabel}/mês — vídeo completo + chat ilimitado com ${modelName}.`, cta: `🔓 Desbloquear — ${priceLabel}/mês`, chat: "Desbloqueia para continuar a conversar" },
    pl: { spent: "Wykorzystałeś wszystkie kredyty", sub: `Kontynuuj za ${priceLabel}/mies. — pełne wideo + nielimitowany czat z ${modelName}.`, cta: `🔓 Odblokuj — ${priceLabel}/mies.`, chat: "Odblokuj, aby dalej czatować" },
    it: { spent: "Hai usato tutti i tuoi crediti", sub: `Continua per ${priceLabel}/mese — video completo + chat illimitata con ${modelName}.`, cta: `🔓 Sblocca — ${priceLabel}/mese`, chat: "Sblocca per continuare a chattare" },
  };
  const lk = LOCK[L] ?? LOCK.en;
  const [showLock, setShowLock] = useState(false);   // Overlay „Credits verbraucht" erst NACH Klick aufs Video
  const [unlocking, setUnlocking] = useState(false);
  const unlock = async () => {
    setUnlocking(true);
    try {
      const r = await fetch("/api/wetter-abo-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subId, modelId, modelSlug }) });
      const d = await r.json().catch(() => ({}));
      if (d?.url) { window.location.href = d.url; return; }
    } catch { /**/ }
    setUnlocking(false);
  };

  // Selbst-Abmeldung (der Abonnent stoppt die tägliche Nachricht direkt hier).
  const [unsubbed, setUnsubbed] = useState(false);
  const [unsubbing, setUnsubbing] = useState(false);
  const unsubscribe = async () => {
    if (!subId) return;
    const ask = (({ de: "Keine Morgennachrichten mehr?", en: "Stop the morning messages?", es: "¿Detener los mensajes de la mañana?", fr: "Arrêter les messages du matin ?", pt: "Parar as mensagens da manhã?", pl: "Zatrzymać poranne wiadomości?", it: "Fermare i messaggi del mattino?" } as Record<string, string>)[L]) ?? "Oprești mesajele de dimineață?";
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
    // Hauptstadt je Sprache — Rückfall, wenn die Stadt unbekannt/falsch geschrieben ist
    // (z. B. „Timisora"), damit die Vorhersage NIE ewig im Ladezustand hängt.
    const CAPITAL: Record<string, string> = { ro: "București", de: "Berlin", en: "London", es: "Madrid", fr: "Paris", pt: "Lisboa", pl: "Warszawa", it: "Roma" };
    const geocode = async (q: string) => {
      const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=${encodeURIComponent(L)}`).then(r => r.json());
      return g?.results?.[0] ?? null;
    };
    (async () => {
      try {
        let loc = await geocode(city);
        if (!loc) loc = await geocode(CAPITAL[L] ?? "London");   // Stadt nicht gefunden → Hauptstadt der Sprache
        if (!loc) return;
        tzRef.current = String(loc.timezone || "");   // ← Zeitzone mit abgefangen (steht bereit für die DB).
        const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`).then(r => r.json());
        const c = w?.current, dy = w?.daily;
        if (ok && c) {
          // Tages-VORHERSAGE: Tages-Wettercode + Hoch/Tief + Regenwahrscheinlichkeit (Fallback: aktuell).
          const dayCode = Number(dy?.weather_code?.[0] ?? c.weather_code);
          const wk = wxKey(dayCode);
          const now = Math.round(Number(c.temperature_2m));
          const max = Math.round(Number(dy?.temperature_2m_max?.[0] ?? c.temperature_2m));
          const min = Math.round(Number(dy?.temperature_2m_min?.[0] ?? c.temperature_2m));
          const rainy = Number(dy?.precipitation_probability_max?.[0] ?? 0) >= 40;
          setWeather({ temp: now, min, max, word: wxWords[wk.key] ?? "", e: wk.e, rainy, place: String(loc.name || city) });
        }
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

  // Chatverlauf über Seitenwechsel/Tab hinweg behalten — damit er nach dem Look-Video
  // NICHT „raus" ist, sondern das Gespräch weiterläuft. Key pro Model + Abonnent.
  const chatKey = `lb_wetter_chat_${modelId}_${subId || name || "anon"}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(chatKey);
      if (raw) { const saved = JSON.parse(raw) as Msg[]; if (Array.isArray(saved) && saved.length > 1) setMessages(saved); }
    } catch { /**/ }
    // nur beim Mount wiederherstellen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try { localStorage.setItem(chatKey, JSON.stringify(messages.slice(-40))); } catch { /**/ }
  }, [messages, chatKey]);

  // KURATIERTE Videos für den „zeig dich in etwas Heißem"-Moment ([[SHOW_LINGERIE]]):
  // Public = gratis Teaser (direkt abspielbar), Private = 🔒 (Poster only, → Abo).
  // Gesteuert über den Public/Private-Toggle in „My Gallery".
  const [videos, setVideos] = useState<{ id: string; locked: boolean; posterUrl: string; videoUrl: string }[]>([]);
  const [playing, setPlaying] = useState("");   // videoUrl im Vollbild-Player
  useEffect(() => {
    let ok = true;
    fetch(`/api/try-this-look?modelVideos=${encodeURIComponent(modelId)}&lingerie=1`)
      .then(r => r.json())
      .then(d => { if (ok && Array.isArray(d.videos)) setVideos(d.videos); })
      .catch(() => {});
    return () => { ok = false; };
  }, [modelId]);

  // Gesperrtes Video → Abo abschließen (Premium-Checkout mit der bekannten E-Mail; zurück hierher).
  const openLocked = () => {
    const ret = subId ? `${window.location.pathname}?s=${encodeURIComponent(subId)}` : window.location.pathname;
    if (email) void startPremiumCheckout(email, ret).catch(() => {});
  };

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
      {look && (locked ? (
        /* Gesperrt: Video SIEHT normal aus (klares Poster + Play). Erst beim Klick kommt
           „Credits verbraucht" + Freischalten — kein Blur, kein Dauer-Schloss. */
        <div className="relative select-none" onClick={() => setShowLock(true)}>
          {look.posterUrl
            ? <img src={look.posterUrl} alt="" className="max-h-[70vh] w-full object-cover" />
            : <div className="aspect-[3/4] w-full bg-black/60" />}
          {!showLock ? (
            <span className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-black/45 backdrop-blur-sm">
                <Play className="h-7 w-7 text-white" fill="currentColor" />
              </span>
            </span>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center">
              <Lock className="h-7 w-7 text-white" />
              <p className="text-[19px] font-black leading-tight text-white">{lk.spent}</p>
              <p className="max-w-xs text-[13px] font-semibold text-white/85">{lk.sub}</p>
              <button type="button" onClick={e => { e.stopPropagation(); void unlock(); }} disabled={unlocking}
                className="lb-gold mt-1 flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-black disabled:opacity-60">
                {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : lk.cta}
              </button>
            </div>
          )}
        </div>
      ) : (
        <BellaPostsCarousel name={modelName}
          posts={[{ id: "day", kind: look.kind, title: "", caption: "", mediaUrl: look.mediaUrl, posterUrl: look.posterUrl }]} />
      ))}

      <div className="px-4">
      {/* ALLE Texte UNTER dem Video: Datum · TITEL = der Gruß (Vorgabe, {Name} personalisiert) ·
          Wetter · Beitragstext. KEIN separater Auto-Gruß mehr → „Guten Morgen" steht nur EINMAL. */}
      <div className="pt-4">
        {dateLabel && <p className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-400">📅 {dateLabel}</p>}
        {title.trim()
          ? <p className="text-[24px] font-black leading-tight text-white">{personalizeName(title, name)}</p>
          : name.trim()
            ? <p className="text-[24px] font-black leading-tight text-white">{t.greetPre} <span className="text-amber-400">{name}!</span></p>
            : <p className="text-[24px] font-black leading-tight text-white">{t.greetPre.replace(/[,،]\s*$/, "")}!</p>}
        {city.trim() && (
          <p className="mt-1 text-[14px] font-semibold text-white/70">
            {weather ? forecastLine(L, weather.place, weather.word, weather.e, weather.min, weather.max, weather.rainy) : t.wxLoading(city)}
          </p>
        )}
        {caption.trim() && <p className="mt-2.5 whitespace-pre-wrap text-[15px] font-semibold leading-relaxed text-white/70">{caption}</p>}
      </div>

      {/* Chat mit dem Model */}
      <div className="lb-theme relative mb-8 mt-6 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <CornerOrnaments />
        <div className="relative flex items-center justify-center gap-2 border-b border-black/10 px-9 py-3">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <p className="text-[13px] font-black text-white">{modelName} <span className="font-bold text-emerald-600">{t.online}</span></p>
        </div>
        <div ref={scrollRef} className="relative max-h-[46vh] space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => {
            const offers = m.role === "assistant" && m.content.includes(LINGERIE_TAG);
            const text = offers ? m.content.replace(LINGERIE_TAG, "").trim() : m.content;
            const seeLbl = (({ ro: "Vezi-mă 🔥", de: "Sieh mich 🔥", en: "See me 🔥", es: "Verme 🔥", fr: "Vois-moi 🔥", pt: "Vê-me 🔥", pl: "Zobacz 🔥", it: "Guardami 🔥" } as Record<string, string>)[L]) ?? "See me 🔥";
            const unlockLbl = (({ ro: "Abonează-te", de: "Abo", en: "Unlock", es: "Desbloquear", fr: "Débloquer", pt: "Desbloquear", pl: "Odblokuj", it: "Sblocca" } as Record<string, string>)[L]) ?? "Unlock";
            return (
              <div key={i} className="space-y-2">
                <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] whitespace-pre-wrap px-3.5 py-2.5 text-sm font-medium ${m.role === "user"
                    ? "lb-onmedia rounded-2xl rounded-tr-sm bg-[#1a160f] text-white"
                    : "rounded-2xl rounded-tl-sm bg-white/10 text-white/90"}`}>{text}</div>
                </div>
                {/* „Willst du mich in diesen Looks sehen?" — Public = gratis (direkt abspielbar),
                    Private = 🔒 (→ Abo). Kuratiert über den Public/Private-Toggle in My Gallery. */}
                {offers && videos.length > 0 && (
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {videos.map(v => (
                      <button key={v.id} type="button" onClick={() => v.locked ? openLocked() : setPlaying(v.videoUrl)}
                        className="group relative w-24 shrink-0 overflow-hidden rounded-xl border border-amber-300/40 bg-black/5 active:scale-95 transition">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.posterUrl} alt="" className={`aspect-[3/4] w-full object-cover ${v.locked ? "scale-105 blur-[7px]" : ""}`} />
                        {v.locked ? (
                          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/35 text-white">
                            <Lock className="h-5 w-5" />
                            <span className="text-[9px] font-black uppercase tracking-wide">{unlockLbl}</span>
                          </span>
                        ) : (
                          <>
                            <span className="pointer-events-none absolute inset-0 grid place-items-center text-white/90"><Play className="h-6 w-6 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]" fill="currentColor" /></span>
                            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1.5 pt-4 text-[10px] font-black leading-tight text-white">{seeLbl}</span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
        {locked ? (
          /* Gesperrt: kein Eingabefeld → Freischalten. */
          <div className="relative flex flex-col items-center gap-2 border-t border-black/10 px-4 py-4 text-center">
            <p className="flex items-center gap-1.5 text-[13px] font-black text-white/85"><Lock className="h-4 w-4" /> {lk.chat}</p>
            <button type="button" onClick={() => void unlock()} disabled={unlocking}
              className="lb-gold flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black disabled:opacity-60">
              {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : lk.cta}
            </button>
          </div>
        ) : (
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
        )}
        <p className="px-9 pb-4 pt-1 text-center text-[11px] font-bold text-white/80">{t.aiNote(modelName)}</p>
      </div>

      {/* Selbst-Abmeldung — der Abonnent stoppt die tägliche Nachricht direkt hier. */}
      {subId && (
        <div className="mb-8 text-center">
          {unsubbed ? (
            <p className="text-[12px] font-black text-white/50">
              {(({ de: "✓ Du bist abgemeldet — keine Nachrichten mehr.", en: "✓ You're unsubscribed — no more messages.", es: "✓ Te diste de baja — no más mensajes.", fr: "✓ Tu es désabonné — plus de messages.", pt: "✓ Cancelaste a subscrição — sem mais mensagens.", pl: "✓ Wypisano Cię — koniec wiadomości.", it: "✓ Sei disiscritto — niente più messaggi." } as Record<string, string>)[L]) ?? "✓ Te-ai dezabonat — gata cu mesajele."}
            </p>
          ) : (
            <button type="button" onClick={() => void unsubscribe()} disabled={unsubbing}
              className="text-[12px] font-bold text-white/40 underline underline-offset-2 disabled:opacity-50">
              {(({ de: "Abmelden", en: "Unsubscribe", es: "Darse de baja", fr: "Se désabonner", pt: "Cancelar", pl: "Wypisz się", it: "Disiscriviti" } as Record<string, string>)[L]) ?? "Dezabonează-te"}
            </button>
          )}
        </div>
      )}
      </div>

      {/* Vollbild-Player für ein freies (Public) Video — kein Funnel, spielt direkt. */}
      {playing && (
        <div className="fixed inset-0 z-[130] flex flex-col bg-black/95" onClick={() => setPlaying("")}>
          <div className="flex justify-end p-3">
            <button type="button" onClick={() => setPlaying("")}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white active:scale-95"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex flex-1 items-center justify-center p-3" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={playing} controls autoPlay playsInline className="max-h-full max-w-full rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
