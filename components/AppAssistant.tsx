"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, X, Send, Sparkles, MessageCircle } from "lucide-react";

type ChatMsg = { role: "user" | "assistant"; content: string };

const HELLO = "Hi! I'm your LuxuryBandit assistant ✨ Ask me anything — how to try on a look, chat with a model, or become a model yourself. How can I help?";

// A floating, app-wide help chat. Explains what the app can do (kept vague on secrets
// by the server). Hidden on admin/seller/auth screens.
export default function AppAssistant() {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // Not on admin/seller/auth surfaces — this is for end users. Note: when the OWNER is
  // signed in, every public page is mirrored under /admin/… (AdminUrlMirror). So the
  // real admin DASHBOARD is exactly "/admin"; "/admin/curator/x" is just a mirrored
  // public page where the assistant SHOULD appear. Strip the mirror prefix first.
  const isDashboard = pathname === "/admin" || pathname === "/admin/";
  const real = pathname.replace(/^\/admin(?=\/)/, "") || "/";
  const hidden = isDashboard || /^\/(seller|auth)(\/|$)/.test(real) || real.startsWith("/curators/profile");
  if (hidden) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/app-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label="Ask the LuxuryBandit assistant"
          className="fixed bottom-20 right-4 z-[80] grid h-13 w-13 place-items-center rounded-full bg-[#0d0b0a] text-white shadow-[0_6px_20px_rgba(0,0,0,0.35)] ring-1 ring-white/15 active:scale-90 transition"
          style={{ height: "3.25rem", width: "3.25rem" }}>
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[93] bg-black/60" onClick={() => setOpen(false)}>
          <div className="lb-phone-col fixed inset-x-0 bottom-0 top-0 mx-auto flex max-w-[440px] flex-col bg-[#0d0b0a]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-400 text-black"><Sparkles className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">LuxuryBandit Assistant</p>
                <p className="text-[11px] font-bold text-emerald-400">online</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white active:scale-90 transition"><X className="h-5 w-5" /></button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/10 px-3.5 py-2.5 text-sm font-medium text-white/90">{HELLO}</div>
              </div>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] whitespace-pre-wrap px-3.5 py-2.5 text-sm font-medium ${m.role === "user"
                    ? "rounded-2xl rounded-tr-sm bg-amber-400 text-black"
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
              {error && <p className="text-center text-[12px] font-bold text-red-400">{error}</p>}
            </div>

            {/* Composer */}
            <div className="border-t border-white/10 px-3 py-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
              <div className="flex items-end gap-2">
                <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey} rows={1}
                  placeholder="Ask about LuxuryBandit…"
                  className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white outline-none focus:border-amber-400 placeholder:text-white/30" />
                <button type="button" onClick={() => void send()} disabled={sending || !input.trim()}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-400 text-black disabled:opacity-40 active:scale-90 transition">
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
