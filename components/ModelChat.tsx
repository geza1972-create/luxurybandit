"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, Send, Lock, Sparkles, Smile, Gift } from "lucide-react";

type ChatMsg = { role: "user" | "assistant"; content: string };

// Free users get a few lines to try; after that the composer locks and we upsell.
const FREE_USER_MESSAGES = 30;
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
  open, onClose, curatorId, modelName, modelFirstName, bio, style, avatarUrl, isPaid, onNeedPremium,
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
}) {
  const router = useRouter();
  const storeKey = `lb_modelchat_${curatorId}`;
  // Stable per-device id so the admin can follow one visitor's conversation over time.
  const visitorId = (() => {
    if (typeof window === "undefined") return "anon";
    try { let v = localStorage.getItem("lb_visitor"); if (!v) { v = (crypto.randomUUID?.() ?? String(Date.now())); localStorage.setItem("lb_visitor", v); } return v; } catch { return "anon"; }
  })();
  const [stage, setStage] = useState<"name" | "chat">("name");
  const [userName, setUserName] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
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

  if (!open) return null;

  const userTurns = messages.filter(m => m.role === "user").length;
  const locked = !isPaid && userTurns >= FREE_USER_MESSAGES;

  const submitName = () => {
    const n = input.trim();
    if (!n) return;
    setUserName(n);
    setInput("");
    setStage("chat");
    // Warm, free greeting — no API call for the intro.
    setMessages([{ role: "assistant", content: `Love that name, ${n}! 😍 So tell me — what look are you in the mood for today?` }]);
  };

  const sendMessage = async (textArg?: string) => {
    const text = (textArg ?? input).trim();
    if (!text || sending) return;
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
        body: JSON.stringify({ curatorId, visitorId, userName, messages: next }),
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
    <div className="fixed left-0 top-0 z-[92] h-[100dvh] w-full origin-top bg-black/60" style={vpStyle} onClick={onClose}>
      <div className="absolute inset-0 mx-auto flex max-w-[440px] flex-col bg-[#0d0b0a]"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10">
            {avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={avatarUrl} alt={first} className="h-full w-full object-cover" />
              : <span className="grid h-full w-full place-items-center text-sm font-black text-white/60">{first.slice(0, 1)}</span>}
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0d0b0a] bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">{first}</p>
            <p className="text-[11px] font-bold text-emerald-400">online now</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white active:scale-90 transition"><X className="h-5 w-5" /></button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
          {/* Intro / name prompt */}
          {stage === "name" && messages.length === 0 && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white/10 px-3.5 py-2.5 text-sm font-medium text-white/90">
                Hey there 💕 I'm {first}. Before we start… what should I call you?
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
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
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

          {/* Premium wall — free trial used up */}
          {locked && (
            <div className="mt-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-center">
              <Lock className="mx-auto h-5 w-5 text-amber-400" />
              <p className="mt-2 text-sm font-black text-white">Keep chatting with {first}</p>
              <p className="mt-1 text-[12px] font-bold text-white/55">You&apos;ve used your {FREE_USER_MESSAGES} free messages. Go Premium to chat with {first} without limits — and your conversations are saved so you can pick up where you left off.</p>
              <button type="button" onClick={onNeedPremium}
                className="lb-gold mt-3 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-black active:scale-95 transition">
                <Sparkles className="h-4 w-4" /> Unlock Premium
              </button>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-white/10 px-3 pt-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.85rem)" }}>
          {locked ? (
            <button type="button" onClick={onNeedPremium}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white/10 text-sm font-black text-white/70 active:scale-95 transition">
              <Lock className="h-4 w-4" /> Go Premium to keep chatting
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
                        <span className="text-[10px] font-black text-white/60">{g.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-end gap-1.5">
              {stage === "chat" && (
                <>
                  <button type="button" onClick={() => { setShowEmoji(v => !v); setShowGifts(false); }}
                    className={`grid h-11 w-9 shrink-0 place-items-center rounded-full transition active:scale-90 ${showEmoji ? "text-amber-400" : "text-white/45"}`}><Smile className="h-6 w-6" /></button>
                  <button type="button" onClick={() => { setShowGifts(v => !v); setShowEmoji(false); }}
                    className={`grid h-11 w-9 shrink-0 place-items-center rounded-full transition active:scale-90 ${showGifts ? "text-amber-400" : "text-white/45"}`}><Gift className="h-6 w-6" /></button>
                </>
              )}
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                onFocus={() => { setShowEmoji(false); setShowGifts(false); }}
                rows={1}
                placeholder={stage === "name" ? "Type your name…" : `Message ${first}…`}
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white outline-none focus:border-amber-400 placeholder:text-white/30" />
              <button type="button"
                onClick={() => (stage === "name" ? submitName() : void sendMessage())}
                disabled={sending || !input.trim()}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-400 text-black disabled:opacity-40 active:scale-90 transition">
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
              </div>
            </>
          )}
          {!isPaid && stage === "chat" && !locked && (
            <p className="mt-2 text-center text-[11px] font-bold text-white/30">{Math.max(0, FREE_USER_MESSAGES - userTurns)} free messages left · Premium saves your chat</p>
          )}
          {/* AI transparency (EU AI Act) — users must be told they're chatting with an AI. */}
          <p className="mt-1.5 text-center text-[10px] font-bold text-white/25">✨ AI chat · you&apos;re messaging an AI persona, for fun</p>
        </div>
      </div>
    </div>
  );
}
