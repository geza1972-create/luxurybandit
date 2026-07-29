"use client";

import { useEffect, useRef, useState } from "react";
import AgeGate, { ageVerified } from "@/components/AgeGate";
import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import { openerFor } from "@/lib/chat-opener";
import { renewNote } from "@/lib/pricing";

type ChatMsg = { role: "user" | "assistant"; content: string };

// Inline chat box embedded right under the thumbs on a model's profile — same UX as the
// Wetter subscriber chat (no modal, no name gate: she greets, you type, she replies). Uses the
// same /api/model-chat backend (her real persona), so it behaves like the full ModelChat.
// Same 8 languages as the Wetter page, with the same visible language switcher.
//
// Monetisation (decided 2026-07-26):
//  • Bella = free: chats via the AI up to `freeLimit`, then a 24 € soft wall.
//  • Every OTHER model = paid: she greets, the visitor may write ONCE, she replies once
//    ("I'm not free — chat for 24 €, or try Bella for free"), then the wall.
//  • Unlock = the SAME 24 €/month Wetter abo (/api/model-chat-abo-checkout, popup + poll).
const LANGS = ["ro", "de", "en", "es", "fr", "pt", "pl", "it"] as const;
type Lang = (typeof LANGS)[number];
// Sie eröffnet mit einer FRAGE und vier Knöpfen (lib/chat-opener) — vor einem leeren Feld
// trauen sich die meisten nicht zu schreiben und springen ab.
const GREET = (l: Lang) => openerFor(l).text;
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
// The single "I'm not free" reply a paid model gives to the visitor's first message.
const CANNED: Record<Lang, string> = {
  de: "Ich bin leider nicht gratis 💛 aber ich chatte super gern mit dir. Für 24 €/Monat gehöre ich ganz dir. Wenn du lieber kostenlos chatten willst, dann versuch es mit Bella 💕",
  en: "I'm not free, sweetie 💛 but I'd love to chat with you. For 24,50 €/month I'm all yours. If you'd rather chat for free, try Bella 💕",
  ro: "Nu sunt gratis, dragule 💛 dar mi-ar plăcea să vorbesc cu tine. Pentru 24 €/lună sunt toată a ta. Dacă preferi să vorbești gratis, încearcă cu Bella 💕",
  es: "No soy gratis, cariño 💛 pero me encantaría hablar contigo. Por 24 €/mes soy toda tuya. Si prefieres chatear gratis, prueba con Bella 💕",
  fr: "Je ne suis pas gratuite, chéri 💛 mais j'adorerais discuter avec toi. Pour 24 €/mois je suis toute à toi. Si tu préfères discuter gratuitement, essaie avec Bella 💕",
  pt: "Eu não sou grátis, querido 💛 mas adoraria conversar com você. Por 24 €/mês sou toda sua. Se preferir conversar de graça, experimente a Bella 💕",
  pl: "Nie jestem darmowa, kochanie 💛 ale chętnie z tobą porozmawiam. Za 24 €/miesiąc jestem cała twoja. Jeśli wolisz czatować za darmo, spróbuj z Bellą 💕",
  it: "Non sono gratis, tesoro 💛 ma mi piacerebbe chiacchierare con te. Per 24 €/mese sono tutta tua. Se preferisci chattare gratis, prova con Bella 💕",
};
// Bella's soft wall after her free messages run out.
const KEEP: Record<Lang, string> = {
  de: "Ich rede so gern mit dir 💛 Für 24 €/Monat chatten wir unbegrenzt weiter.",
  en: "I love talking to you 💛 For 24,50 €/month we chat unlimited.",
  ro: "Îmi place să vorbesc cu tine 💛 Pentru 24 €/lună vorbim nelimitat.",
  es: "Me encanta hablar contigo 💛 Por 24 €/mes chateamos sin límite.",
  fr: "J'adore te parler 💛 Pour 24 €/mois on discute sans limite.",
  pt: "Adoro falar com você 💛 Por 24 €/mês conversamos sem limite.",
  pl: "Uwielbiam z tobą rozmawiać 💛 Za 24 €/miesiąc czatujemy bez limitu.",
  it: "Adoro parlare con te 💛 Per 24 €/mese chattiamo senza limiti.",
};
const UNLOCK: Record<Lang, string> = {
  de: "Die heißeste KI-Erfahrung freischalten — 24,50 €/Monat", en: "Unlock the hottest AI experience ever — €24.50/month", ro: "Deblochează cea mai fierbinte experiență AI — 24,50 €/lună", es: "Desbloquea la experiencia IA más ardiente — 24,50 €/mes",
  fr: "Débloque l'expérience IA la plus chaude — 24,50 €/mois", pt: "Desbloqueia a experiência de IA mais quente — 24,50 €/mês", pl: "Odblokuj najgorętsze doświadczenie AI — 24,50 €/miesiąc", it: "Sblocca l'esperienza AI più calda — 24,50 €/mese",
};
const BELLA_CTA: Record<Lang, string> = {
  de: "Gratis mit Bella chatten", en: "Chat free with Bella", ro: "Chat gratuit cu Bella", es: "Chatea gratis con Bella",
  fr: "Discuter gratis avec Bella", pt: "Conversar grátis com Bella", pl: "Czatuj za darmo z Bellą", it: "Chatta gratis con Bella",
};

export default function ModelChatInline({
  curatorId, modelName, first, avatarUrl, isPaid = false, isOwn = false, freeLimit = 1,
  bella = false, bellaHref = "", onNeedPremium,
}: {
  curatorId: string;
  modelName: string;
  first: string;
  avatarUrl?: string;
  isPaid?: boolean;
  isOwn?: boolean;
  freeLimit?: number;   // Bella only: free messages before the soft wall (paid models get 1).
  bella?: boolean;      // true = Bella → free AI chat; false = paid model → 1 reply then wall.
  bellaHref?: string;   // where "Chat free with Bella" links.
  onNeedPremium: () => void; // fallback if the checkout can't start.
}) {
  const [lang, setLang] = useState<Lang>(() => {
    try { const b = (navigator.language || "en").slice(0, 2).toLowerCase() as Lang; return LANGS.includes(b) ? b : "en"; } catch { return "en"; }
  });
  const changeLang = (next: Lang) => {
    setLang(next);
    setMessages(m => (m.length === 1 && m[0].role === "assistant") ? [{ role: "assistant", content: GREET(next) }] : m);
  };
  const visitorId = (() => {
    if (typeof window === "undefined") return "anon";
    try { let v = localStorage.getItem("lb_visitor"); if (!v) { v = (crypto.randomUUID?.() ?? String(Date.now())); localStorage.setItem("lb_visitor", v); } return v; } catch { return "anon"; }
  })();

  const [messages, setMessages] = useState<ChatMsg[]>([{ role: "assistant", content: GREET(lang) }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [needAge, setNeedAge] = useState(false);   // 18+-Abfrage vor der ersten Chat-Nachricht
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(false); // paid the 24 € abo → unlimited chat with HER
  const [buying, setBuying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef("");   // angetippter Knopf, der hinter der 18+-Abfrage wartet

  // Pick up an existing/returned 24 € unlock for THIS model.
  useEffect(() => {
    try { if (localStorage.getItem(`lb_modelchat_paid_${curatorId}`) === "1") setUnlocked(true); } catch { /**/ }
    try { const p = new URLSearchParams(window.location.search); if (p.get("chatpaid") === "1") { localStorage.setItem(`lb_modelchat_paid_${curatorId}`, "1"); setUnlocked(true); } } catch { /**/ }
  }, [curatorId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, sending]);

  const paidAccess = isPaid || isOwn || unlocked;
  const userTurns = messages.filter(m => m.role === "user").length;
  // Wall: paid models allow 1 line; Bella allows `freeLimit`; unlocked/own/subscriber = never.
  const wall = !paidAccess && (bella ? userTurns >= freeLimit : userTurns >= 1);

  // Start the 24 € abo (same Wetter price) — popup + poll, unlocks live on payment.
  const buyAbo = async () => {
    if (buying) return;
    setBuying(true);
    try {
      const returnPath = typeof window !== "undefined" ? window.location.pathname : `/curator/${curatorId}`;
      const r = await fetch("/api/model-chat-abo-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ curatorId, returnPath }) }).then(x => x.json()).catch(() => null);
      if (!r?.url || !r?.sessionId) { onNeedPremium(); setBuying(false); return; }
      const popup = window.open(r.url, "lb-modelabo", "width=460,height=760");
      const started = Date.now();
      const poll = setInterval(async () => {
        const st = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(r.sessionId)}`).then(x => x.json()).catch(() => ({}));
        if (st?.paid) {
          clearInterval(poll); try { popup?.close(); } catch { /**/ }
          try { localStorage.setItem(`lb_modelchat_paid_${curatorId}`, "1"); } catch { /**/ }
          setUnlocked(true); setBuying(false);
        } else if ((popup && popup.closed) || Date.now() - started > 6 * 60 * 1000) {
          clearInterval(poll); setBuying(false);
        }
      }, 2000);
    } catch { setBuying(false); }
  };

  // `preset` = ein angetippter Knopf aus dem Einstieg; sonst das, was er getippt hat.
  const sendMessage = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || sending || wall) return;
    // 18+ gilt fürs CHATTEN (nicht für Bilder) — einmal pro Gerät, danach automatisch weiter.
    // Den Text merken, sonst geht der angetippte Knopf hinter der Abfrage verloren.
    if (!ageVerified()) { pendingRef.current = text; setNeedAge(true); return; }
    pendingRef.current = "";
    setError("");
    // Paid model, free visitor: exactly ONE reply, then the wall. No AI call (no cost).
    if (!paidAccess && !bella) {
      setMessages(m => [...m, { role: "user", content: text }, { role: "assistant", content: CANNED[lang] }]);
      if (!preset) setInput("");
      return;
    }
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next); if (!preset) setInput(""); setSending(true);
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
        {/* Antwort-Knöpfe auf ihre Einstiegsfrage — nur, solange er noch nichts geschrieben
            hat. Ein Tipp schickt den Knopftext als ganz normale Nachricht an sie. */}
        {userTurns === 0 && !sending && !wall && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {openerFor(lang).chips.map(c => (
              <button key={c} type="button" onClick={() => void sendMessage(c)}
                className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-[12px] font-bold text-black active:scale-95 transition hover:border-black/40">
                {c}
              </button>
            ))}
          </div>
        )}
        {error && <p className="text-center text-[12px] font-bold text-red-500">{error}</p>}
      </div>

      {/* Composer / paywall */}
      <div className="border-t border-black/10 bg-white px-3 py-2.5">
        {wall ? (
          <div className="space-y-2">
            {bella && <p className="px-1 text-center text-[12px] font-bold text-black/70">{KEEP[lang]}</p>}
            <button type="button" onClick={() => void buyAbo()} disabled={buying}
              className="lb-buy flex w-full items-center justify-center rounded-full bg-black font-black text-white disabled:opacity-40 active:scale-95 transition">
              {buying ? <Loader2 className="h-5 w-5 animate-spin" /> : `💛 ${UNLOCK[lang]}`}
            </button>
            <p className="px-1 text-center text-[10px] font-medium leading-snug text-black/45">{renewNote(lang)}</p>
            {!bella && bellaHref && (
              <Link href={bellaHref}
                className="flex h-11 w-full items-center justify-center rounded-full border border-black/20 bg-white text-[13px] font-black text-black active:scale-95 transition">
                {BELLA_CTA[lang]}
              </Link>
            )}
          </div>
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
        {bella && !paidAccess && !wall && userTurns > 0 && (
          <p className="mt-1.5 text-center text-[10px] font-bold text-black/45">{FREE_LEFT[lang](Math.max(0, freeLimit - userTurns))}</p>
        )}
        <p className="mt-1.5 text-center text-[10px] font-bold text-black/50">✨ {first}&apos;s AI — an AI persona, not the real person.</p>
      </div>
      {/* 18+ nur fürs Chatten; nach „Ja" wird die Nachricht direkt abgeschickt. */}
      {needAge && <AgeGate lang={lang} onDone={() => { setNeedAge(false); void sendMessage(pendingRef.current || undefined); }} />}
    </div>
  );
}
