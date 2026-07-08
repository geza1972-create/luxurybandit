"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X, Send, Lock, Sparkles } from "lucide-react";

type ChatMsg = { role: "user" | "assistant"; content: string };

// Free users get a few lines to try; after that the composer locks and we upsell.
const FREE_USER_MESSAGES = 5;

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
  const storeKey = `lb_modelchat_${curatorId}`;
  const [stage, setStage] = useState<"name" | "chat">("name");
  const [userName, setUserName] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const first = modelFirstName || modelName || "She";

  // Restore any previous conversation for this model.
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const saved = JSON.parse(raw) as { userName?: string; messages?: ChatMsg[] };
        if (saved.userName) { setUserName(saved.userName); setStage("chat"); }
        if (Array.isArray(saved.messages)) setMessages(saved.messages);
      }
    } catch { /**/ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, storeKey]);

  // Persist on every change.
  useEffect(() => {
    if (!open) return;
    try { localStorage.setItem(storeKey, JSON.stringify({ userName, messages })); } catch { /**/ }
  }, [open, storeKey, userName, messages]);

  // Auto-scroll to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, stage]);

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

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (locked) { onNeedPremium(); return; }
    setError("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/model-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelName, bio, style, userName, messages: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.reply) throw new Error(d.error ?? "Message failed.");
      setMessages(m => [...m, { role: "assistant", content: String(d.reply) }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message failed.");
    } finally {
      setSending(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); stage === "name" ? submitName() : void sendMessage(); }
  };

  return (
    <div className="fixed inset-0 z-[92] bg-black/60" onClick={onClose}>
      <div className="lb-phone-col fixed inset-x-0 bottom-0 top-0 mx-auto flex max-w-[440px] flex-col bg-[#0d0b0a]"
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

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] whitespace-pre-wrap px-3.5 py-2.5 text-sm font-medium ${m.role === "user"
                ? "rounded-2xl rounded-tr-sm bg-amber-400 text-black"
                : "rounded-2xl rounded-tl-sm bg-white/10 text-white/90"}`}>
                {m.content}
              </div>
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

          {error && <p className="text-center text-[12px] font-bold text-red-400">{error}</p>}

          {/* Premium wall — free trial used up */}
          {locked && (
            <div className="mt-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-center">
              <Lock className="mx-auto h-5 w-5 text-amber-400" />
              <p className="mt-2 text-sm font-black text-white">Keep chatting with {first}</p>
              <p className="mt-1 text-[12px] font-bold text-white/55">You've used your free messages. Go Premium to chat with {first} without limits.</p>
              <button type="button" onClick={onNeedPremium}
                className="lb-gold mt-3 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-black active:scale-95 transition">
                <Sparkles className="h-4 w-4" /> Unlock Premium
              </button>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-white/10 px-3 py-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          {locked ? (
            <button type="button" onClick={onNeedPremium}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white/10 text-sm font-black text-white/70 active:scale-95 transition">
              <Lock className="h-4 w-4" /> Go Premium to keep chatting
            </button>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
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
          )}
          {!isPaid && stage === "chat" && !locked && (
            <p className="mt-2 text-center text-[11px] font-bold text-white/30">{Math.max(0, FREE_USER_MESSAGES - userTurns)} free messages left</p>
          )}
        </div>
      </div>
    </div>
  );
}
