"use client";

import { useEffect, useRef, useState } from "react";
import AgeGate, { ageVerified } from "@/components/AgeGate";
import { useRouter } from "next/navigation";
import { Loader2, X, Send, Lock, Sparkles, Smile, Gift } from "lucide-react";
import { openerFor } from "@/lib/chat-opener";

type ChatMsg = { role: "user" | "assistant"; content: string };

// The visitor picks the chat language; the AI persona greets & replies in it (and still
// follows the fan if they switch mid-chat). Opener/placeholder/first-greeting are localised.
const LANGS = [
  { code: "en", label: "English" },
  { code: "ro", label: "Română" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
] as const;
type Lang = (typeof LANGS)[number]["code"];
const CHAT_T: Record<Lang, { who: string; name: string; msg: (f: string) => string; greet: (n: string) => string }> = {
  en: { who: "Aww, thank you for wanting to chat with me 💕 What's your name?", name: "Type your name…", msg: f => `Message ${f}…`, greet: n => `Lovely to meet you, ${n}! 😍 What do you want to talk about today?` },
  ro: { who: "Aww, mulțumesc că vrei să vorbești cu mine 💕 Cum te cheamă?", name: "Scrie numele tău…", msg: f => `Scrie-i lui ${f}…`, greet: n => `Îmi pare bine, ${n}! 😍 Despre ce vrei să vorbim azi?` },
  de: { who: "Aww, danke, dass du mit mir chatten möchtest 💕 Wie heißt du?", name: "Dein Name…", msg: f => `Nachricht an ${f}…`, greet: n => `Freut mich, ${n}! 😍 Worüber sprechen wir heute?` },
  fr: { who: "Aww, merci de vouloir discuter avec moi 💕 Comment tu t'appelles ?", name: "Ton prénom…", msg: f => `Message à ${f}…`, greet: n => `Enchantée, ${n} ! 😍 De quoi veux-tu parler aujourd'hui ?` },
  es: { who: "Aww, gracias por querer hablar conmigo 💕 ¿Cómo te llamas?", name: "Tu nombre…", msg: f => `Mensaje para ${f}…`, greet: n => `¡Encantada, ${n}! 😍 ¿De qué quieres hablar hoy?` },
  it: { who: "Aww, grazie di voler chattare con me 💕 Come ti chiami?", name: "Il tuo nome…", msg: f => `Messaggio a ${f}…`, greet: n => `Piacere, ${n}! 😍 Di cosa vuoi parlare oggi?` },
};

// Free users get a few lines to try; after that the composer locks and we upsell.
const FREE_USER_MESSAGES = 10;
// When the model offers to show herself in hot outfits (e.g. after a nudes request), the
// AI ends its reply with this tag; the client hides the tag and renders tappable lingerie
// looks she can be tried on in — turning the request into a paid try-on.
const LINGERIE_TAG = "[[SHOW_LINGERIE]]";

const EMOJIS = ["😍", "😘", "🥰", "😂", "😉", "😎", "🔥", "💋", "💕", "❤️", "🤩", "😳", "🙈", "👀", "✨", "💃", "👗", "👠", "💎", "🥂", "🌹", "🙏", "👋", "😅"];
const GIFTS = [
  { emoji: "🌹", name: "Rose" },
  { emoji: "🍫", name: "Chocolate" },
  { emoji: "🥂", name: "Champagne" },
  { emoji: "🧸", name: "Teddy" },
  { emoji: "💐", name: "Bouquet" },
  { emoji: "💎", name: "Diamond" },
  { emoji: "👑", name: "Crown" },
  { emoji: "💍", name: "Ring" },
];

export default function ModelChat({
  open, onClose, curatorId, modelName, modelFirstName, bio, style, avatarUrl, isPaid, onNeedPremium, isOwn = false, onBuyPass, page = false,
}: {
  open: boolean;
  onClose: () => void;
  curatorId: string;
  modelName: string;
  modelFirstName: string;
  bio?: string;
  style?: string;
  avatarUrl?: string;
  isPaid: boolean;
  onNeedPremium: () => void;
  isOwn?: boolean;              // true = this is the viewer's OWN influencer → free unlimited chat
  onBuyPass?: () => void;       // buy a $3.99 / 30-min chat pass for THIS influencer (falls back to onNeedPremium)
  page?: boolean; // true = render as a full dedicated page (no overlay/backdrop) — avoids the iOS keyboard bug
}) {
  const router = useRouter();
  const storeKey = `lb_modelchat_${curatorId}`;
  // Stable per-device id so the admin can follow one visitor's conversation over time.
  const visitorId = (() => {
    if (typeof window === "undefined") return "anon";
    try { let v = localStorage.getItem("lb_visitor"); if (!v) { v = (crypto.randomUUID?.() ?? String(Date.now())); localStorage.setItem("lb_visitor", v); } return v; } catch { return "anon"; }
  })();
  const [stage, setStage] = useState<"name" | "chat">("name");
  const [lang, setLang] = useState<Lang>(() => {
    try { const b = (navigator.language || "en").slice(0, 2).toLowerCase(); return (LANGS.some(l => l.code === b) ? b : "en") as Lang; } catch { return "en"; }
  });
  const t = CHAT_T[lang] ?? CHAT_T.en;
  const [userName, setUserName] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [needAge, setNeedAge] = useState(false);   // 18+-Abfrage vor der ersten Chat-Nachricht
  const [pendingText, setPendingText] = useState("");  // Nachricht, die auf die Bestätigung wartet
  const [streaming, setStreaming] = useState(false); // true once the reply starts arriving
  const [error, setError] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [lingerieLooks, setLingerieLooks] = useState<{ id: string; img: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const first = modelFirstName || modelName || "She";


  // Lazy-load a few lingerie looks the model can be tried on in — shown when she offers
  // to show herself "in something hot" (LINGERIE_TAG). No names/brands (licensing).
  useEffect(() => {
    if (!open || lingerieLooks.length) return;
    fetch("/api/try-this-look").then(r => r.json()).then(d => {
      const looks: Array<Record<string, unknown>> = Array.isArray(d.looks) ? d.looks : [];
      const ling = looks
        .filter(l => ((l.category === "boudoir") || l.lingerie === true) && (l.frontImageUrl || l.imageUrl) && l.published !== false)
        .slice(0, 8)
        .map(l => ({ id: String(l.id), img: String(l.frontImageUrl || l.imageUrl) }));
      setLingerieLooks(ling);
    }).catch(() => {});
  }, [open, lingerieLooks.length]);

  // Tap a lingerie look → open the try-on funnel for THIS model in that look.
  const openTryOn = (lookId: string, garment: string) => {
    const qs = new URLSearchParams({ modelId: curatorId, model: avatarUrl || "", garment, modelName });
    onClose();
    router.push(`/try/${lookId}?${qs.toString()}`);
  };

  // On open / model switch: ALWAYS start fresh (so one model's chat never leaks into
  // another's), then restore saved history ONLY for paying members — free chats are not
  // saved. `isPaid` here = an active subscriber (passed from the caller).
  useEffect(() => {
    if (!open) return;
    setMessages([]); setUserName(""); setStage("name");
    setShowEmoji(false); setShowGifts(false);
    if (!isPaid) return; // free = ephemeral, nothing to restore
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const saved = JSON.parse(raw) as { userName?: string; messages?: ChatMsg[] };
        if (saved.userName) { setUserName(saved.userName); setStage("chat"); }
        if (Array.isArray(saved.messages)) setMessages(saved.messages);
      }
    } catch { /**/ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, storeKey, isPaid]);

  // Persist ONLY for paying members; free chats stay ephemeral (cleared on close/switch).
  useEffect(() => {
    if (!open || !isPaid) return;
    try { localStorage.setItem(storeKey, JSON.stringify({ userName, messages })); } catch { /**/ }
  }, [open, storeKey, userName, messages, isPaid]);

  // Auto-scroll to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, stage]);

  // iOS keyboard fix. Two parts:
  //  (1) FREEZE the page: overflow:hidden alone is ignored by iOS Safari, so we position:fixed
  //      the body (preserving scroll) — nothing can scroll/peek behind the chat.
  //  (2) Size the overlay to the VISUAL viewport (the area above the keyboard) and translateY by
  //      its offset, so the composer sits right on the keyboard with no gap.
  const [vpStyle, setVpStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const b = document.body.style;
    const prev = { position: b.position, top: b.top, left: b.left, right: b.right, width: b.width, overflow: b.overflow };
    b.position = "fixed"; b.top = `-${scrollY}px`; b.left = "0"; b.right = "0"; b.width = "100%"; b.overflow = "hidden";
    const vp = window.visualViewport;
    const update = () => { if (vp) setVpStyle({ height: `${vp.height}px`, transform: `translateY(${vp.offsetTop}px)` }); };
    update();
    vp?.addEventListener("resize", update);
    vp?.addEventListener("scroll", update);
    return () => {
      Object.assign(b, prev);
      window.scrollTo(0, scrollY);
      vp?.removeEventListener("resize", update);
      vp?.removeEventListener("scroll", update);
      setVpStyle({});
    };
  }, [open]);

  // ── $3.99 / 30-minute chat pass for THIS influencer ──
  const [passUntil, setPassUntil] = useState(0); // epoch ms the active pass runs until (0 = none)
  const [buyingPass, setBuyingPass] = useState(false);
  useEffect(() => {
    const read = () => { try { const t = Number(localStorage.getItem(`lb_chatpass_${curatorId}`) || 0); if (t > Date.now()) setPassUntil(t); } catch { /**/ } };
    read();
    // Fired by the chat page after it verifies a returned $3.99 payment → pick the pass up live.
    window.addEventListener("lb-chatpass", read);
    return () => window.removeEventListener("lb-chatpass", read);
  }, [curatorId]);
  useEffect(() => {
    if (!passUntil) return;
    const ms = passUntil - Date.now();
    if (ms <= 0) { setPassUntil(0); return; }
    const to = setTimeout(() => setPassUntil(0), ms); // re-lock the moment the 30 min run out
    return () => clearTimeout(to);
  }, [passUntil]);

  if (!open) return null;

  const userTurns = messages.filter(m => m.role === "user").length;
  const hasPass = passUntil > Date.now();
  // Your OWN influencer → always free. Active subscribers (isPaid) chat unlimited. Everyone
  // else gets 10 free messages, then the wall — unless a paid 30-min pass is active.
  const locked = !isOwn && !isPaid && !hasPass && userTurns >= FREE_USER_MESSAGES;

  // Buy a $3.99 / 30-min pass for this influencer: Stripe popup → poll → unlock for 30 min.
  const buyChatPass = async () => {
    if (buyingPass) return;
    setBuyingPass(true);
    try {
      const returnPath = typeof window !== "undefined" ? window.location.pathname : "/";
      const r = await fetch("/api/chat-pass-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ curatorId, returnPath }) }).then(x => x.json()).catch(() => null);
      if (!r?.url || !r?.sessionId) { onBuyPass ? onBuyPass() : onNeedPremium(); setBuyingPass(false); return; }
      const popup = window.open(r.url, "lb-chatpass", "width=460,height=760");
      const started = Date.now();
      const poll = setInterval(async () => {
        const st = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(r.sessionId)}`).then(x => x.json()).catch(() => ({}));
        if (st?.paid) {
          clearInterval(poll); try { popup?.close(); } catch { /**/ }
          const until = Date.now() + 30 * 60 * 1000;
          try { localStorage.setItem(`lb_chatpass_${curatorId}`, String(until)); } catch { /**/ }
          setPassUntil(until); setBuyingPass(false);
        } else if ((popup && popup.closed) || Date.now() - started > 6 * 60 * 1000) {
          clearInterval(poll); setBuyingPass(false);
        }
      }, 2000);
    } catch { setBuyingPass(false); }
  };

  const submitName = () => {
    const n = input.trim();
    if (!n) return;
    setUserName(n);
    setInput("");
    setStage("chat");
    // Warm, free greeting — no API call for the intro. Danach ihre Einstiegsfrage mit den
    // vier Knöpfen (lib/chat-opener): vor einem leeren Feld schreibt kaum jemand als Erster.
    setMessages([{ role: "assistant", content: openerFor(lang).text }]);
  };

  const sendMessage = async (textArg?: string) => {
    const text = (textArg ?? input).trim();
    if (!text || sending) return;
    // 18+ gilt fürs CHATTEN (nicht für Bilder) — einmal pro Gerät, danach automatisch weiter.
    if (!ageVerified()) { setPendingText(text); setNeedAge(true); return; }
    if (locked) { onNeedPremium(); return; }
    setError("");
    setShowEmoji(false); setShowGifts(false);
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    if (textArg === undefined) setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/model-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curatorId, visitorId, userName, messages: next, lang }),
      });
      const ct = res.headers.get("content-type") || "";
      // JSON = an error or the "chat disabled" case; otherwise it's the streamed reply.
      if (ct.includes("application/json") || !res.body) {
        const d = await res.json().catch(() => ({}));
        if (!res.ok || !d.reply) throw new Error(d.error ?? "Message failed.");
        setMessages(m => [...m, { role: "assistant", content: String(d.reply) }]);
      } else {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let acc = "", started = false;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          if (!started) {
            // First token → hide the typing dots and drop in her (growing) bubble.
            started = true; setStreaming(true);
            setMessages(m => [...m, { role: "assistant", content: acc }]);
          } else {
            setMessages(m => { const c = m.slice(); c[c.length - 1] = { role: "assistant", content: acc }; return c; });
          }
        }
        if (!acc.trim()) throw new Error("Message failed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message failed.");
    } finally {
      setSending(false); setStreaming(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); stage === "name" ? submitName() : void sendMessage(); }
  };

  // Send a gift — appears as a playful action the model reacts to.
  const sendGift = (g: { emoji: string; name: string }) => {
    if (stage !== "chat") return;
    if (locked) { onNeedPremium(); return; }
    void sendMessage(`${g.emoji} *sends you a ${g.name}*`);
  };

  return (
    <div className={page ? "" : "fixed left-0 top-0 z-[92] h-[100dvh] w-full origin-top bg-black/60"}
      style={page ? undefined : vpStyle} onClick={page ? undefined : onClose}>
      <div className={page
          ? "lb-phone-col fixed inset-x-0 top-0 mx-auto flex h-[100dvh] max-w-[440px] flex-col lb-bg"
          : "absolute inset-0 mx-auto flex max-w-[440px] flex-col lb-bg"}
        style={page ? vpStyle : undefined}
        onClick={page ? undefined : (e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="relative w-10 aspect-[3/4] shrink-0 overflow-hidden rounded-xl bg-white/10">
            {avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={avatarUrl} alt={first} className="h-full w-full object-cover" />
              : <span className="grid h-full w-full place-items-center text-sm font-black text-white/80">{first.slice(0, 1)}</span>}
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0d0b0a] bg-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">{first}</p>
            <p className="text-[11px] font-bold text-amber-400">online now</p>
          </div>
          {/* Language picker — the fan chooses; the AI greets & replies in it. */}
          <select value={lang} onChange={e => setLang(e.target.value as Lang)} aria-label="Chat language"
            className="h-8 shrink-0 rounded-full border border-white/15 bg-white/5 px-2 text-[12px] font-black text-white/80 outline-none focus:border-amber-400">
            {LANGS.map(l => <option key={l.code} value={l.code} className="lb-bg text-white">{l.label}</option>)}
          </select>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white active:scale-90 transition"><X className="h-5 w-5" /></button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
          {/* Intro / name prompt */}
          {stage === "name" && messages.length === 0 && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white/10 px-3.5 py-2.5 text-sm font-medium text-white/90">
                {t.who}
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const offersLingerie = m.role === "assistant" && m.content.includes(LINGERIE_TAG);
            const text = offersLingerie ? m.content.replace(LINGERIE_TAG, "").trim() : m.content;
            return (
              <div key={i} className="space-y-2">
                <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] whitespace-pre-wrap px-3.5 py-2.5 text-sm font-medium ${m.role === "user"
                    ? "rounded-2xl rounded-tr-sm bg-amber-400 text-black"
                    : "rounded-2xl rounded-tl-sm bg-white/10 text-white/90"}`}>
                    {text}
                  </div>
                </div>
                {/* Her "want to see me in these?" lingerie looks → tap to try her on. */}
                {offersLingerie && lingerieLooks.length > 0 && (
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {lingerieLooks.slice(0, 6).map(l => (
                      <button key={l.id} type="button" onClick={() => openTryOn(l.id, l.img)}
                        className="group relative w-24 shrink-0 overflow-hidden rounded-xl border border-amber-400/30 bg-white/5 active:scale-95 transition">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={l.img} alt="" className="aspect-[3/4] w-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1.5 pt-4 text-[10px] font-black leading-tight text-white">See me in this 🔥</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Antwort-Knöpfe auf ihre Einstiegsfrage — nur, solange er noch nichts geschrieben
              hat. Ein Tipp schickt den Knopftext als ganz normale Nachricht an sie. */}
          {stage === "chat" && !sending && messages.every(m => m.role !== "user") && (
            <div className="flex flex-wrap gap-1.5">
              {openerFor(lang).chips.map(c => (
                <button key={c} type="button" onClick={() => void sendMessage(c)}
                  className="rounded-full border border-white/25 bg-white/[0.06] px-3 py-1.5 text-[12px] font-bold text-white active:scale-95 transition hover:border-[#f6cf51] hover:text-[#f6cf51]">
                  {c}
                </button>
              ))}
            </div>
          )}

          {sending && !streaming && (
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

          {error && <p className="text-center text-[12px] font-bold text-red-400">{error}</p>}

          {/* Wall after the free messages — personal: subscribe to keep talking to HER. */}
          {locked && (
            <div className="mt-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
              <div className="mx-auto h-16 w-16 overflow-hidden rounded-full border-2 border-amber-400/50 bg-white/10">
                {avatarUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={avatarUrl} alt={first} className="h-full w-full object-cover" />
                  : <span className="grid h-full w-full place-items-center text-xl font-black text-white/80">{first.slice(0, 1)}</span>}
              </div>
              <p className="mt-2.5 text-center text-sm font-black text-white">I loved talking to you 💕</p>
              <p className="mx-auto mt-1 max-w-xs text-center text-[12px] font-bold text-white/75">
                We&apos;re just getting started. Subscribe to keep chatting with {first} — and see all her private posts &amp; videos.
              </p>
              <button type="button" onClick={onNeedPremium}
                className="lb-gold mt-3 flex w-full items-center justify-center rounded-2xl px-4 py-3 text-[14px] font-black active:scale-95 transition">
                💛 Subscribe to {first}
              </button>
              <p className="mt-1.5 text-center text-[11px] font-bold text-white/75">Cancel anytime.</p>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-white/10 px-3 pt-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.85rem)" }}>
          {locked ? (
            <button type="button" onClick={onNeedPremium}
              className="lb-gold flex h-12 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-black active:scale-95 transition">
              💛 Subscribe to keep chatting with {first}
            </button>
          ) : (
            <>
              {/* Emoji palette */}
              {showEmoji && (
                <div className="mb-2 grid grid-cols-8 gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
                  {EMOJIS.map(e => (
                    <button key={e} type="button" onClick={() => { setInput(v => v + e); }}
                      className="grid h-8 place-items-center rounded-lg text-xl active:scale-90 active:bg-white/10 transition">{e}</button>
                  ))}
                </div>
              )}
              {/* Gift tray */}
              {showGifts && (
                <div className="mb-2 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-2">
                  <p className="px-1 pb-1.5 text-[11px] font-black text-amber-300/80">Send {first} a gift 🎁</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {GIFTS.map(g => (
                      <button key={g.name} type="button" onClick={() => sendGift(g)}
                        className="flex flex-col items-center gap-0.5 rounded-xl bg-white/5 py-2 active:scale-90 active:bg-white/10 transition">
                        <span className="text-2xl">{g.emoji}</span>
                        <span className="text-[10px] font-black text-white/80">{g.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-end gap-1.5">
              {stage === "chat" && (
                <>
                  <button type="button" onClick={() => { setShowEmoji(v => !v); setShowGifts(false); }}
                    className={`grid h-11 w-9 shrink-0 place-items-center rounded-full transition active:scale-90 ${showEmoji ? "text-amber-400" : "text-white/85"}`}><Smile className="h-6 w-6" /></button>
                  <button type="button" onClick={() => { setShowGifts(v => !v); setShowEmoji(false); }}
                    className={`grid h-11 w-9 shrink-0 place-items-center rounded-full transition active:scale-90 ${showGifts ? "text-amber-400" : "text-white/85"}`}><Gift className="h-6 w-6" /></button>
                </>
              )}
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                onFocus={() => { setShowEmoji(false); setShowGifts(false); }}
                rows={1}
                placeholder={stage === "name" ? t.name : t.msg(first)}
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white outline-none focus:border-amber-400 placeholder:text-white/50" />
              <button type="button"
                onClick={() => (stage === "name" ? submitName() : void sendMessage())}
                disabled={sending || !input.trim()}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-400 text-black disabled:opacity-40 active:scale-90 transition">
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
              </div>
            </>
          )}
          {!isOwn && !isPaid && !hasPass && stage === "chat" && !locked && (
            <p className="mt-2 text-center text-[11px] font-bold text-white/50">{Math.max(0, FREE_USER_MESSAGES - userTurns)} free messages left</p>
          )}
          {/* AI transparency (EU AI Act) — users must be told they're chatting with an AI. */}
          <p className="mt-1.5 text-center text-[11px] font-bold text-white/85">✨ You&apos;re chatting with {first}&apos;s AI Assistant — an AI persona, not the real person.</p>
        </div>
      </div>
      {/* 18+ nur fürs Chatten; nach „Ja" wird die wartende Nachricht abgeschickt. */}
      {needAge && <AgeGate onDone={() => { setNeedAge(false); const p = pendingText; setPendingText(""); if (p) void sendMessage(p); }} />}
    </div>
  );
}
