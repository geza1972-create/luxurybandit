"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";

type ChatMsg = { role: "user" | "assistant"; content: string };

// Inline chat box embedded right under the thumbs on a model's profile — same UX as the
// Wetter subscriber chat (no modal, no name gate: she greets, you type, she replies). Uses the
// same /api/model-chat backend (her real persona), so it behaves like the full ModelChat.
// Same 8 languages as the Wetter page, with the same visible language switcher.
const LANGS = ["ro", "de", "en", "es", "fr", "pt", "pl", "it"] as const;
type Lang = (typeof LANGS)[number];
const LABEL: Record<Lang, string> = {
  ro: "Română", de: "Deutsch", en: "English", es: "Español",
  fr: "Français", pt: "Português", pl: "Polski", it: "Italiano",
};
const GREET: Record<Lang, string> = {
  ro: "Bună 💛 mă bucur că ești aici. Despre ce vrei să vorbim?",
  de: "Hey du 💛 schön, dass du da bist. Worüber wollen wir reden?",
  en: "Hey you 💛 I'm so happy you're here. What do you want to talk about?",
  es: "Hola 💛 me alegra que estés aquí. ¿De qué quieres hablar?",
  fr: "Coucou 💛 contente que tu sois là. De quoi veux-tu parler ?",
  pt: "Oi 💛 fico feliz que você esteja aqui. Sobre o que quer falar?",
  pl: "Hej 💛 cieszę się, że tu jesteś. O czym chcesz porozmawiać?",
  it: "Ciao 💛 sono felice che tu sia qui. Di cosa vuoi parlare?",
};
const PLACEHOLDER: Record<Lang, (n: string) => string> = {
  ro: n => `Scrie-i lui ${n}…`, de: n => `Nachricht an ${n}…`, en: n => `Message ${n}…`,
  es: n => `Mensaje para ${n}…`, fr: n => `Message à ${n}…`, pt: n => `Mensagem para ${n}…`,
  pl: n => `Wiadomość do ${n}…`, it: n => `Messaggio a ${n}…`,
};
const FREE_LEFT: Record<Lang, (n: number) => string> = {
  ro: n => `${n} mesaje gratuite rămase`, de: n => `${n} Gratis-Nachrichten übrig`, en: n => `${n} free messages left`,
  es: n => `${n} mensajes gratis restantes`, fr: n => `${n} messages gratuits restants`, pt: n => `${n} mensagens grátis restantes`,
  pl: n => `${n} darmowych wiadomości`, it: n => `${n} messaggi gratuiti rimasti`,
};

export default function ModelChatInline({
  curatorId, modelName, first, avatarUrl, isPaid = false, isOwn = false, freeLimit = 10, onNeedPremium,
}: {
  curatorId: string;
  modelName: string;
  first: string;
  avatarUrl?: string;
  isPaid?: boolean;
  isOwn?: boolean;
  freeLimit?: number;
  onNeedPremium: () => void;
}) {
  const [lang, setLang] = useState<Lang>(() => {
    try { const b = (navigator.language || "en").slice(0, 2).toLowerCase() as Lang; return LANGS.includes(b) ? b : "en"; } catch { return "en"; }
  });
  // Switch language → she greets & replies in it (like Wetter). If she's only greeted so far,
  // re-render the greeting in the new language; an ongoing chat just switches for future replies.
  const changeLang = (next: Lang) => {
    setLang(next);
    setMessages(m => (m.length === 1 && m[0].role === "assistant") ? [{ role: "assistant", content: GREET[next] }] : m);
  };
  const visitorId = (() => {
    if (typeof window === "undefined") return "anon";
    try { let v = localStorage.getItem("lb_visitor"); if (!v) { v = (crypto.randomUUID?.() ?? String(Date.now())); localStorage.setItem("lb_visitor", v); } return v; } catch { return "anon"; }
  })();

  const [messages, setMessages] = useState<ChatMsg[]>([{ role: "assistant", content: GREET[lang] }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, sending]);

  const userTurns = messages.filter(m => m.role === "user").length;
  const locked = !isOwn && !isPaid && userTurns >= freeLimit;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (locked) { onNeedPremium(); return; }
    setError("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next); setInput(""); setSending(true);
    try {
      const res = await fetch("/api/model-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curatorId, visitorId, userName: "", messages: next, lang }),
      });
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json") || !res.body) {
        const d = await res.json().catch(() => ({}));
        if (!res.ok || !d.reply) throw new Error(d.error ?? "Message failed.");
        setMessages(m => [...m, { role: "assistant", content: String(d.reply) }]);
      } else {
        const reader = res.body.getReader(); const dec = new TextDecoder();
        let acc = "", started = false;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          if (!started) { started = true; setStreaming(true); setMessages(m => [...m, { role: "assistant", content: acc }]); }
          else setMessages(m => { const c = m.slice(); c[c.length - 1] = { role: "assistant", content: acc }; return c; });
        }
        if (!acc.trim()) throw new Error("Message failed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message failed.");
    } finally { setSending(false); setStreaming(false); }
  };

  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } };

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white text-black shadow-sm">
      {/* Header — she's "online now". */}
      <div className="flex items-center gap-3 border-b border-black/10 px-3 py-2.5">
        <div className="relative aspect-[3/4] w-9 shrink-0 overflow-hidden rounded-lg bg-black/5">
          {avatarUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={avatarUrl} alt={first} className="h-full w-full object-cover" />
            : <span className="grid h-full w-full place-items-center text-sm font-black text-black/70">{first.slice(0, 1)}</span>}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-black text-black">{first}</p>
          <p className="text-[10px] font-bold text-emerald-600">online now</p>
        </div>
        {/* Sprach-Umschalter — dieselben 8 Sprachen wie bei Wetter; sie chattet in der gewählten. */}
        <div className="relative shrink-0">
          <select value={lang} onChange={e => changeLang(e.target.value as Lang)} aria-label="Sprache wählen"
            className="h-8 appearance-none rounded-full border border-black/15 bg-white pl-3 pr-6 text-[12px] font-black uppercase tracking-wide text-black outline-none active:scale-95">
            {LANGS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-black/50">▾</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="max-h-[300px] min-h-[140px] space-y-2.5 overflow-y-auto overscroll-contain bg-neutral-50 px-3 py-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[82%] whitespace-pre-wrap px-3 py-2 text-[13px] font-medium ${m.role === "user"
              ? "rounded-2xl rounded-tr-sm bg-black text-white"
              : "rounded-2xl rounded-tl-sm bg-white text-black ring-1 ring-black/10"}`}>{m.content}</div>
          </div>
        ))}
        {sending && !streaming && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 ring-1 ring-black/10">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40" />
              </span>
            </div>
          </div>
        )}
        {error && <p className="text-center text-[12px] font-bold text-red-500">{error}</p>}
      </div>

      {/* Composer / paywall */}
      <div className="border-t border-black/10 bg-white px-3 py-2.5">
        {locked ? (
          <button type="button" onClick={onNeedPremium}
            className="flex h-11 w-full items-center justify-center rounded-full bg-black text-[13px] font-black text-white active:scale-95 transition">
            Chatte weiter mit {first}
          </button>
        ) : (
          <div className="flex items-end gap-1.5">
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey} rows={1}
              placeholder={PLACEHOLDER[lang](first)}
              className="max-h-24 min-h-[42px] flex-1 resize-none rounded-2xl border border-black/15 bg-white px-3.5 py-2.5 text-[13px] font-medium text-black outline-none focus:border-black placeholder:text-black/40" />
            <button type="button" onClick={() => void sendMessage()} disabled={sending || !input.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-white disabled:opacity-30 active:scale-90 transition">
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        )}
        {!isOwn && !isPaid && !locked && userTurns > 0 && (
          <p className="mt-1.5 text-center text-[10px] font-bold text-black/45">{FREE_LEFT[lang](Math.max(0, freeLimit - userTurns))}</p>
        )}
        <p className="mt-1.5 text-center text-[10px] font-bold text-black/50">✨ {first}&apos;s AI — an AI persona, not the real person.</p>
      </div>
    </div>
  );
}
