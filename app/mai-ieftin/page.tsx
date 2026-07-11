"use client";

export const dynamic = "force-dynamic";

import { Plus, ArrowUp, X, Menu } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

// ── Ambient background ornaments — thin gold geometry drifting up the dark page. A
// faint set drifts forever; a brighter "burst" replays on every new message (re-keyed). ──
const GLYPHS: Record<string, ReactNode> = {
  circle: <circle cx="12" cy="12" r="10" />,
  diamond: <polygon points="12,2 22,12 12,22 2,12" />,
  triangle: <polygon points="12,3 21,20 3,20" />,
  plus: <path d="M12 3v18M3 12h18" />,
  hex: <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" />,
  star: <path d="M12 2l2.4 7H22l-6 4.4 2.3 7L12 16l-6.6 4.4L8 13.4 2 9h7.6z" />,
};
type Orn = { type: keyof typeof GLYPHS; left: number; size: number; dur: number; delay: number; dx: number; r: number; op: number };
const AMBIENT: Orn[] = [
  { type: "circle", left: 8, size: 34, dur: 26, delay: 0, dx: 20, r: 160, op: 0.06 },
  { type: "diamond", left: 82, size: 26, dur: 30, delay: 4, dx: -24, r: -200, op: 0.06 },
  { type: "plus", left: 48, size: 20, dur: 22, delay: 9, dx: 14, r: 120, op: 0.05 },
  { type: "hex", left: 24, size: 40, dur: 34, delay: 13, dx: -18, r: -140, op: 0.05 },
  { type: "triangle", left: 68, size: 24, dur: 28, delay: 6, dx: 22, r: 200, op: 0.06 },
  { type: "star", left: 90, size: 22, dur: 24, delay: 16, dx: -12, r: 180, op: 0.07 },
];
const BURST: Orn[] = [
  { type: "star", left: 15, size: 26, dur: 3.8, delay: 0, dx: 24, r: 200, op: 0.22 },
  { type: "circle", left: 40, size: 30, dur: 4.4, delay: 0.2, dx: -18, r: -160, op: 0.15 },
  { type: "diamond", left: 62, size: 22, dur: 4.0, delay: 0.4, dx: 20, r: 220, op: 0.18 },
  { type: "plus", left: 80, size: 20, dur: 4.2, delay: 0.1, dx: -14, r: 140, op: 0.16 },
  { type: "hex", left: 30, size: 28, dur: 4.6, delay: 0.5, dx: 16, r: -180, op: 0.13 },
  { type: "triangle", left: 72, size: 24, dur: 3.6, delay: 0.3, dx: -22, r: 200, op: 0.2 },
];
function Orns({ items, oneShot }: { items: Orn[]; oneShot?: boolean }) {
  return (
    <>
      {items.map((o, i) => (
        <svg key={i} viewBox="0 0 24 24" fill="none" stroke="#c9a23f" strokeWidth="1" strokeLinejoin="round"
          style={{
            position: "absolute", left: `${o.left}%`, top: 0, width: o.size, height: o.size, opacity: 0,
            animation: `lb-rise ${o.dur}s ${o.delay}s ${oneShot ? "ease-out 1 forwards" : "linear infinite"}`,
            ["--dx" as string]: `${o.dx}px`, ["--r" as string]: `${o.r}deg`, ["--o" as string]: o.op,
          } as CSSProperties}>
          {GLYPHS[o.type]}
        </svg>
      ))}
    </>
  );
}
function AmbientGeometry({ burst }: { burst: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <Orns items={AMBIENT} />
      <div key={burst} className="absolute inset-0">
        <Orns items={BURST} oneShot />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// "Găsește-l mai ieftin" — a Dupe-style AI chat funnel (Romanian, DARK). The user
// types freely ("găsește o geantă ca de la Versace mai ieftin"), can attach a photo,
// and chats with an AI assistant (Claude Haiku via /api/mai-ieftin-chat) that helps
// find cheaper versions. Real product search isn't wired yet — the AI guides.
// ────────────────────────────────────────────────────────────────────────────
type ShopItem = { title: string; link: string; source?: string; thumbnail: string; price?: string };
// `apiContent` = what's sent to the AI (may differ from the displayed `content`, e.g. a
// "Yes" chip that actually carries the product hint). `refImg` = a reference still shown
// with the message (carried in from a feed "Bandit the look!" tap).
type Msg = { role: "user" | "assistant"; content: string; apiContent?: string; refImg?: string; products?: ShopItem[]; ownProducts?: ShopItem[]; original?: ShopItem[]; brand?: string; chips?: string[] };

type Lang = "ro" | "en";
const T: Record<Lang, { title: string; ph: string; free: string; original: string; inspo: string; cheaper: string; ours: string; introQ: string; yes: string; no: string; askMore: string; suggestions: string[] }> = {
  ro: {
    title: "Găsește-l mai ieftin",
    ph: "Scrie ce cauți, lipește un link sau o poză…",
    free: "Gratis · fără cont · în câteva secunde",
    original: "Originalul", inspo: "sursa noastră de inspirație",
    cheaper: "Același look, mai ieftin", ours: "Din colecția LuxuryBandit",
    introQ: "Vrei acest produs mai ieftin? Sau vrei altul?", yes: "Da", no: "Nu, altul",
    askMore: "Ok! Spune-mi ce cauți 🙂",
    suggestions: ["o geantă ca de la Versace, mai ieftin", "adidași ca Golden Goose", "o rochie de seară sub 200 lei"],
  },
  en: {
    title: "Find it cheaper",
    ph: "Type what you want, paste a link or a photo…",
    free: "Free · no account · in seconds",
    original: "The original", inspo: "our inspiration",
    cheaper: "Same look, cheaper", ours: "From the LuxuryBandit collection",
    introQ: "Do you want this product cheaper? Or a different one?", yes: "Yes", no: "No, another",
    askMore: "Ok! Tell me what you're looking for 🙂",
    suggestions: ["a bag like Versace, cheaper", "sneakers like Golden Goose", "an evening dress under €50"],
  },
};

export default function MaiIeftinPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(""); // object URL of an attached photo
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("ro");
  const t = T[lang];
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const refHintRef = useRef<string>(""); // hint from a feed "Bandit the look!" reference

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // A feed "Bandit the look!" tap stashes a reference (still + hint) in sessionStorage.
  // On open, show it and ask "want this cheaper, or another?" with Yes/No chips.
  useEffect(() => {
    let ref: { img?: string; hint?: string } | null = null;
    try { const s = sessionStorage.getItem("lb_bandit_ref"); if (s) { ref = JSON.parse(s); sessionStorage.removeItem("lb_bandit_ref"); } } catch { /**/ }
    if (ref && (ref.img || ref.hint)) {
      refHintRef.current = ref.hint || "";
      setMessages([{ role: "assistant", content: T.ro.introQ, chips: [T.ro.yes, T.ro.no], refImg: ref.img || "" }]);
    }
  }, []);

  const pickFile = (f?: File | null) => { if (f) { try { setPreview(URL.createObjectURL(f)); } catch { /**/ } } };
  const clearFile = () => { setPreview(""); if (fileRef.current) fileRef.current.value = ""; };

  const canSend = (text.trim().length > 0 || !!preview) && !loading;

  const send = async (override?: string, apiText?: string) => {
    const raw = (override ?? text).trim();
    if ((!raw && !preview) || loading) return;
    const content = raw + (preview ? `${raw ? " " : ""}${lang === "en" ? "(attached a photo)" : "(am atașat o poză)"}` : "");
    const userMsg: Msg = { role: "user", content, ...(apiText ? { apiContent: apiText } : {}) };
    const next: Msg[] = [...messages, userMsg];
    setMessages(next);
    setText(""); clearFile(); setLoading(true);
    try {
      const apiMessages = next.map((m) => ({ role: m.role, content: m.apiContent ?? m.content }));
      const r = await fetch("/api/mai-ieftin-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, lang }),
      });
      const d = await r.json().catch(() => ({}));
      setMessages((m) => [...m, { role: "assistant", content: d.reply || (lang === "en" ? "Can't reply right now. Try again." : "Momentan nu pot răspunde. Mai încearcă o dată."), products: Array.isArray(d.products) ? d.products : undefined, ownProducts: Array.isArray(d.ownProducts) ? d.ownProducts : undefined, original: Array.isArray(d.original) ? d.original : undefined, brand: typeof d.brand === "string" ? d.brand : undefined, chips: Array.isArray(d.chips) ? d.chips : undefined }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: lang === "en" ? "Something went wrong. Try again." : "Ceva n-a mers. Mai încearcă o dată." }]);
    } finally { setLoading(false); }
  };

  // Chip tap. On the reference intro (Yes/No), Yes searches for that product (carrying the
  // hidden hint to the AI); No starts a fresh request. Otherwise the chip text is sent.
  const onChip = (c: string) => {
    const atIntro = messages.length === 1 && !!messages[0]?.refImg;
    if (atIntro) {
      const isYes = c === T.ro.yes || c === T.en.yes;
      if (isYes) {
        const hint = refHintRef.current; refHintRef.current = "";
        void send(t.yes, `${lang === "en" ? "Find this product cheaper" : "Găsește-mi acest produs mai ieftin"}${hint ? `: ${hint}` : ""}`);
        return;
      }
      refHintRef.current = "";
      void send(t.no, lang === "en" ? "No, I want something else" : "Nu, caut altceva");
      return;
    }
    void send(c);
  };

  const empty = messages.length === 0 && !loading;

  // The input box — reused in both the empty (centered) and chat (bottom) layouts.
  const inputBox = (
    <div className="rounded-[28px] bg-white/[0.07] p-3 ring-1 ring-white/10 focus-within:ring-white/25 transition">
      {preview && (
        <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-white/10 p-1 pr-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-10 w-10 rounded-xl object-cover" />
          <button type="button" onClick={clearFile} aria-label="Șterge" className="text-white/60 active:scale-90 transition"><X className="h-4 w-4" /></button>
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
        rows={2}
        placeholder={t.ph}
        className="w-full resize-none bg-transparent px-2 pt-1 text-[16px] font-semibold text-white placeholder:text-white/40 outline-none"
      />
      <div className="mt-1 flex items-center justify-between px-1">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} aria-label="Adaugă o poză"
          className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10 active:scale-90 transition"><Plus className="h-5 w-5" /></button>
        <button type="button" onClick={() => void send()} disabled={!canSend} aria-label="Trimite"
          className="grid h-9 w-9 place-items-center rounded-full bg-white text-black disabled:bg-white/15 disabled:text-white/40 active:scale-90 transition"><ArrowUp className="h-5 w-5" strokeWidth={2.5} /></button>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-black text-white/90">
      {/* Ambient gold geometry drifting up the background; a burst replays on each message. */}
      <AmbientGeometry burst={messages.length} />
      {/* Top bar */}
      <header className="relative z-10 flex shrink-0 items-center justify-between px-5 py-4">
        <Link href="/home" aria-label="LuxuryBandit" className="inline-flex items-center gap-2 active:scale-95 transition">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lb-logo.png" alt="" className="h-8 w-8 rounded-full object-contain" />
          <span className="text-[17px] font-black tracking-tight text-white/85">LuxuryBandit</span>
        </Link>
        <div className="flex items-center gap-2">
          {/* Language switcher — Romanian default, toggle to English. */}
          <div className="flex items-center rounded-full bg-white/[0.07] p-0.5 ring-1 ring-white/10">
            {(["ro", "en"] as Lang[]).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)}
                className={`rounded-full px-2.5 py-1 text-[12px] font-black uppercase transition ${lang === l ? "bg-white text-black" : "text-white/55"}`}>
                {l}
              </button>
            ))}
          </div>
          {/* Opens the SAME app drawer as everywhere (mounted globally in BottomNav). */}
          <button type="button" onClick={() => { try { window.dispatchEvent(new Event("lb-open-account")); } catch { /**/ } }} aria-label="Meniu"
            className="grid h-10 w-10 place-items-center rounded-full text-white/75 hover:bg-white/10 active:scale-90 transition">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {empty ? (
        /* Empty / landing state — centered */
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-24">
          <div className="w-full max-w-md">
            <h1 className="mb-8 text-center text-[32px] font-black leading-tight tracking-tight text-white/75">{t.title}</h1>
            {inputBox}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {t.suggestions.map((s) => (
                <button key={s} type="button" onClick={() => void send(s)}
                  className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[13px] font-semibold text-white/70 ring-1 ring-white/10 active:scale-95 transition">{s}</button>
              ))}
            </div>
            <p className="mt-4 text-center text-[13px] font-semibold text-white/40">{t.free}</p>
          </div>
        </main>
      ) : (
        /* Chat state */
        <>
          <main className="relative z-10 flex-1 overflow-y-auto px-4 pb-4">
            <div className="mx-auto flex max-w-md flex-col gap-3 py-2">
              {messages.map((m, i) => (
                <div key={i} className="flex flex-col gap-2">
                  {/* Reference still carried in from the feed "Bandit the look!" tap */}
                  {m.refImg && (
                    <div className="self-start overflow-hidden rounded-2xl ring-1 ring-white/15">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.refImg} alt="" className="h-40 w-32 object-cover" />
                    </div>
                  )}
                  <div className={m.role === "user" ? "self-end max-w-[85%]" : "self-start max-w-[85%]"}>
                    <div className={m.role === "user"
                      ? "rounded-3xl rounded-br-lg bg-white px-4 py-2.5 text-[15px] font-semibold text-black"
                      : "rounded-3xl rounded-bl-lg bg-white/10 px-4 py-2.5 text-[15px] font-medium leading-relaxed text-white/80"}>
                      {m.content}
                    </div>
                  </div>
                  {/* Quick-reply chips — tap to refine (only on the latest reply) */}
                  {m.role === "assistant" && i === messages.length - 1 && !loading && m.chips && m.chips.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {m.chips.map((c, idx) => (
                        <button key={idx} type="button" onClick={() => onChip(c)}
                          className="rounded-full bg-white/[0.07] px-3.5 py-2 text-[13px] font-bold text-white/85 ring-1 ring-white/15 active:scale-95 transition">
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Designer original — the inspiration, credited (not cheaper). */}
                  {m.original && m.original.length > 0 && (
                    <>
                      <p className="px-1 pt-1 text-[11px] font-black uppercase tracking-wide text-white/45">
                        {t.original}{m.brand ? ` · ${m.brand}` : ""} <span className="font-semibold normal-case tracking-normal text-white/30">— {t.inspo}</span>
                      </p>
                      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
                        {m.original.map((p, idx) => (
                          <a key={idx} href={p.link} target="_blank" rel="noopener noreferrer"
                            className="w-36 shrink-0 overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/20 active:scale-95 transition">
                            <div className="aspect-square w-full bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.thumbnail} alt="" loading="lazy" className="h-full w-full object-contain" />
                            </div>
                            <div className="p-2">
                              {p.price && <p className="text-[14px] font-black text-white/90">{p.price}</p>}
                              <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-tight text-white/60">{p.title}</p>
                              <p className="mt-1 truncate text-[10px] font-bold text-white/35">Original{p.source ? ` · ${p.source}` : ""}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                  {/* Cheaper look-alikes — Gemini-style cards */}
                  {m.products && m.products.length > 0 && (
                    <>
                      <p className="px-1 pt-1 text-[11px] font-black uppercase tracking-wide text-[#b8912f]">{t.cheaper}</p>
                      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
                        {m.products.map((p, idx) => (
                          <a key={idx} href={p.link} target="_blank" rel="noopener noreferrer"
                            className="w-36 shrink-0 overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/10 active:scale-95 transition">
                            <div className="aspect-square w-full bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.thumbnail} alt="" loading="lazy" className="h-full w-full object-contain" />
                            </div>
                            <div className="p-2">
                              {p.price && <p className="text-[14px] font-black text-white">{p.price}</p>}
                              <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-tight text-white/65">{p.title}</p>
                              {p.source && <p className="mt-1 truncate text-[10px] font-bold text-white/35">{p.source}</p>}
                            </div>
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                  {/* Our own catalogue — "din colecția LuxuryBandit" */}
                  {m.ownProducts && m.ownProducts.length > 0 && (
                    <>
                      <p className="px-1 pt-1 text-[11px] font-black uppercase tracking-wide text-[#b8912f]">{t.ours}</p>
                      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
                        {m.ownProducts.map((p, idx) => (
                          <a key={idx} href={p.link}
                            className="w-36 shrink-0 overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-[#b8912f]/30 active:scale-95 transition">
                            <div className="aspect-square w-full bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
                            </div>
                            <div className="p-2">
                              {p.price && <p className="text-[14px] font-black text-white">{p.price}</p>}
                              <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-tight text-white/65">{p.title}</p>
                              <p className="mt-1 truncate text-[10px] font-bold text-[#b8912f]">LuxuryBandit</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {loading && (
                <div className="self-start">
                  <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-lg bg-white/10 px-4 py-3.5">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-white/50" style={{ animationDelay: `${d * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </main>
          <div className="relative z-10 shrink-0 px-4 pb-5 pt-1" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
            <div className="mx-auto max-w-md">{inputBox}</div>
          </div>
        </>
      )}
    </div>
  );
}
