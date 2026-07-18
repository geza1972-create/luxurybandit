"use client";

export const dynamic = "force-dynamic";

import { Plus, ArrowUp, ArrowUpRight, X, Menu, ChevronDown, LayoutGrid, Users, Play, Share2, Check } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { Suspense, useEffect, useRef, useState } from "react";
import { signInWithOAuth, sendMagicLink, getStoredAuthSession } from "@/lib/supabase-auth-client";
import { logFunnelEvent } from "@/lib/track-funnel";
import { trackMetaPixel } from "@/lib/meta-pixel";

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
type Msg = { role: "user" | "assistant"; content: string; apiContent?: string; refImg?: string; refRound?: boolean; modelLooks?: { img: string; hint: string }[]; products?: ShopItem[]; ownProducts?: ShopItem[]; inspo?: ShopItem[]; modelVideos?: ShopItem[]; modelName?: string; original?: ShopItem[]; brand?: string; chips?: string[] };

type Lang = "ro" | "en";
const T: Record<Lang, { title: string; motto: string; ph: string; free: string; original: string; inspo: string; cheaper: string; ours: string; introQ: string; yes: string; no: string; askMore: string; inspo_btn: string; gallery: string; models: string; wantOthers: string; similar: string; wears: string; suggestions: string[] }> = {
  ro: {
    title: "Produse Luxury", motto: "Bandit the look",
    ph: "Scrie ce cauți sau lipește un link…",
    free: "Gratis · fără cont · în câteva secunde",
    original: "Piesa de designer", inspo: "inspirația noastră",
    cheaper: "Piese de lux pentru tine", ours: "Din colecția LuxuryBandit",
    introQ: "Vrei să-ți arăt piese de lux ca aceasta? Sau altceva?", yes: "Da", no: "Nu, altceva",
    askMore: "Perfect! Spune-mi ce cauți 🙂", inspo_btn: "Inspirație", gallery: "Galerie", models: "Modele", wantOthers: "Vreau altele", similar: "Piese similare", wears: "poartă",
    suggestions: ["un body negru elegant", "lenjerie de lux", "o piesă statement pentru diseară"],
  },
  en: {
    title: "Luxury Products", motto: "Bandit the look",
    ph: "Type what you want or paste a link…",
    free: "Free · no account · in seconds",
    original: "The designer piece", inspo: "our inspiration",
    cheaper: "Luxury picks for you", ours: "From the LuxuryBandit collection",
    introQ: "Want me to show you luxury pieces like this? Or something else?", yes: "Yes", no: "No, something else",
    askMore: "Perfect! Tell me what you're looking for 🙂", inspo_btn: "Inspiration", gallery: "Gallery", models: "Models", wantOthers: "I want others", similar: "Similar pieces", wears: "wears these",
    suggestions: ["a black elegant bodysuit", "luxury lingerie", "a statement piece for tonight"],
  },
};

// A self-playing example conversation ("▶ Demo") shown on the empty state so a visitor SEES
// exactly how it works before typing. Products/videos are fetched fresh & RANDOM each run (via
// the demoProducts:"showcase" branch) so it never shows the same pieces twice.
const DEMO: Record<Lang, { btn: string; q: string; a1: string; chips1: string[]; pick: string; a2: string; chips2: string[]; show: string; a3: string; wantDresses: string; a4: string; outro: string; tryCta: string }> = {
  ro: {
    btn: "Cum funcționează",
    q: "caut un body negru elegant",
    a1: "Perfect! Ce vibe cauți — pentru o seară specială, sexy sau casual chic? 💫",
    chips1: ["Elegant de seară", "Sexy și sofisticat", "Casual chic"],
    pick: "Elegant de seară",
    a2: "Superb ✨ Îți arăt acum sau mai adaugi ceva (culoare, mărime)?",
    chips2: ["Arată-mi", "Mai am ceva"],
    show: "Arată-mi",
    a3: "Am ales piese de lux pentru tine — și look-uri în mișcare 💛",
    wantDresses: "Superbe! Arată-mi mai multe ✨",
    a4: "Mai multe piese pe care le vei adora — vezi-le în mișcare ✨",
    outro: "Așa de simplu! Acum spune-mi TU ce cauți 💛",
    tryCta: "↺ Începe tu",
  },
  en: {
    btn: "How it works",
    q: "I'm looking for an elegant black bodysuit",
    a1: "Perfect! What's the vibe — a special evening, sexy, or casual chic? 💫",
    chips1: ["Evening elegant", "Sexy & sophisticated", "Casual chic"],
    pick: "Evening elegant",
    a2: "Lovely ✨ Show you now, or add something (colour, size)?",
    chips2: ["Show me", "One more thing"],
    show: "Show me",
    a3: "I picked luxury pieces for you — plus looks in motion 💛",
    wantDresses: "Love them! Show me more ✨",
    a4: "More pieces you'll love — see them in motion ✨",
    outro: "That simple! Now tell me what YOU want 💛",
    tryCta: "↺ Start yourself",
  },
};

// A stable per-device id so a visitor's model chat groups into ONE conversation in the admin.
function getChatVisitorId(): string {
  try {
    let v = localStorage.getItem("lb_chat_visitor");
    if (!v) { v = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; localStorage.setItem("lb_chat_visitor", v); }
    return v;
  } catch { return "anon"; }
}

function MaiIeftinInner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(""); // object URL of an attached photo
  const [loading, setLoading] = useState(false);
  // Language lives in the URL (?lang=ro|en) so a page can be shared in a given language.
  const [lang, setLang] = useState<Lang>("en"); // English forced everywhere (RO strings kept as a dormant fallback)
  const [navOpen, setNavOpen] = useState(false);
  const t = T[lang];
  const setLangUrl = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem("lb_lang", l); } catch { /**/ }
    const p = new URLSearchParams(Array.from(params.entries()));
    p.set("lang", l);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };
  // English forced everywhere — normalise any stored/URL language back to EN. (RO kept dormant.)
  useEffect(() => {
    setLang("en");
    try { localStorage.setItem("lb_lang", "en"); } catch { /**/ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Append the current language to internal links so clicks keep the user in that language.
  const withLang = (href: string) => `${href}${href.includes("?") ? "&" : "?"}lang=${lang}`;
  const [shared, setShared] = useState(false);
  const [demoPlaying, setDemoPlaying] = useState(false); // "▶ Demo" self-playing example running
  const [openProduct, setOpenProduct] = useState<ShopItem | null>(null); // external link → preview dialog first (keep the customer in the funnel)
  // dupe.com-style lead wall: the CHAT stays free, but opening a shopping RESULT asks a
  // signed-out visitor to log in first ("Log in to see your results"). Google + email magic-link.
  const [signedIn, setSignedIn] = useState(true); // assume signed-in until checked → no gate flash
  const [gate, setGate] = useState(false);
  const [gateEmail, setGateEmail] = useState("");
  const [gateSent, setGateSent] = useState(false);
  useEffect(() => { try { setSignedIn(!!getStoredAuthSession()); } catch { setSignedIn(false); } }, []);
  // ── Funnel tracking (this chat is the target of the "…Chat" ads) ──────────────
  // Distinct miai_* events so Insights can finally measure chat-ad conversion — /luxury-products
  // was previously untracked. Fired once per session via refs.
  const firedChat = useRef(false);
  const firedProducts = useRef(false);
  useEffect(() => { logFunnelEvent("miai_open"); trackMetaPixel("ViewContent", { content_category: "chat" }); }, []);
  const openResult = (p: ShopItem) => {
    logFunnelEvent("miai_shop_click");
    if (!signedIn) { logFunnelEvent("miai_gate"); setGate(true); return; }
    setOpenProduct(p);
  };
  const gateGoogle = () => { try { signInWithOAuth("google", `${window.location.origin}/auth/confirm`); } catch { /**/ } };
  const gateSubmitEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!/.+@.+\..+/.test(gateEmail.trim())) return;
    try { await sendMagicLink(gateEmail.trim()); } catch { /**/ }
    setGateSent(true);
  };
  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) { await navigator.share({ title: "LuxuryBandit — Bandit the look", url }); }
      else { await navigator.clipboard?.writeText(url); setShared(true); setTimeout(() => setShared(false), 1600); }
    } catch { /**/ }
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const refHintRef = useRef<string>(""); // hint from a feed "Bandit the look!" reference
  const modelRef = useRef<{ id?: string; name?: string; style?: string; motto?: string; bio?: string } | null>(null); // model persona for the AI
  const modelHintsRef = useRef<string[]>([]); // her looks' hints → power the "Similar pieces" button

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // Model greeting (bilingual) shown when opened for a specific model.
  const modelGreeting = (n: string) => {
    const nm = (n || "").trim();
    return lang === "en"
      ? (nm ? `Thanks for choosing me, I'm ${nm}! Do you like my clothes or should I find you others? 💛` : "Thanks for choosing me! Do you like my clothes or should I find you others? 💛")
      : (nm ? `Merci că m-ai ales, eu sunt ${nm}! Îți plac hainele mele sau vrei să-ți găsesc alte haine? 💛` : "Merci că m-ai ales! Îți plac hainele mele sau vrei să-ți găsesc alte haine? 💛");
  };

  // Open state: ?model=<curatorId> (shareable) fetches her photo + looks — same as tapping
  // "Chat with her" on her profile OR "Find it cheaper" on her feed video. Otherwise a
  // sessionStorage "look" reference (a specific outfit) → the "this one cheaper?" flow.
  useEffect(() => {
    const modelId = params.get("model");
    if (modelId) {
      let alive = true;
      (async () => {
        try {
          const [pr, gr] = await Promise.all([
            fetch(`/api/curator?profile=${encodeURIComponent(modelId)}`).then((r) => r.json()).catch(() => ({})),
            fetch(`/api/try-this-look?curatorTryons=${encodeURIComponent(modelId)}`).then((r) => r.json()).catch(() => ({})),
          ]);
          if (!alive) return;
          const p = (pr && pr.profile) || {};
          const gallery: { imageUrl?: string; lookName?: string }[] = Array.isArray(gr?.userGallery) ? gr.userGallery : [];
          const n = p.firstName || gr?.displayName || "";
          const looks = gallery.filter((x) => x.imageUrl).slice(0, 8).map((x) => ({ img: x.imageUrl as string, hint: x.lookName || "" }));
          modelRef.current = { id: modelId, name: n, style: p.style, motto: p.motto, bio: p.bio }; // AI speaks as her
          refHintRef.current = "";
          modelHintsRef.current = looks.map((l) => l.hint).filter(Boolean);
          setMessages([{ role: "assistant", content: modelGreeting(n), refImg: p.photoUrl || p.photoFullUrl || "", refRound: true, modelLooks: looks, chips: [t.similar, t.wantOthers] }]);
        } catch { /**/ }
      })();
      return () => { alive = false; };
    }
    // Fallback: a look/product reference stashed in sessionStorage.
    let ref: { img?: string; hint?: string; kind?: string; name?: string; looks?: { img: string; hint: string }[] } | null = null;
    try { const s = sessionStorage.getItem("lb_bandit_ref"); if (s) { ref = JSON.parse(s); sessionStorage.removeItem("lb_bandit_ref"); } } catch { /**/ }
    if (ref && (ref.img || ref.hint)) {
      if (ref.kind === "model") {
        refHintRef.current = "";
        const looks = Array.isArray(ref.looks) ? ref.looks.filter((l) => l && l.img).slice(0, 8) : [];
        modelHintsRef.current = looks.map((l) => l.hint).filter(Boolean);
        if (ref.name) modelRef.current = { ...(modelRef.current || {}), name: ref.name };
        setMessages([{ role: "assistant", content: modelGreeting(ref.name || ""), refImg: ref.img || "", refRound: true, modelLooks: looks, chips: [t.similar, t.wantOthers] }]);
      } else {
        refHintRef.current = ref.hint || "";
        setMessages([{ role: "assistant", content: t.introQ, chips: [t.yes, t.no], refImg: ref.img || "" }]);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pickFile = (f?: File | null) => { if (f) { try { setPreview(URL.createObjectURL(f)); } catch { /**/ } } };
  const clearFile = () => { setPreview(""); if (fileRef.current) fileRef.current.value = ""; };

  const canSend = (text.trim().length > 0 || !!preview) && !loading && !demoPlaying;

  const send = async (override?: string, apiText?: string) => {
    const raw = (override ?? text).trim();
    if ((!raw && !preview) || loading || demoPlaying) return;
    const content = raw + (preview ? `${raw ? " " : ""}${lang === "en" ? "(attached a photo)" : "(am atașat o poză)"}` : "");
    const userMsg: Msg = { role: "user", content, ...(apiText ? { apiContent: apiText } : {}) };
    const next: Msg[] = [...messages, userMsg];
    setMessages(next);
    if (!firedChat.current) { firedChat.current = true; logFunnelEvent("miai_chat"); trackMetaPixel("Lead", { content_category: "chat" }); }
    setText(""); clearFile(); setLoading(true);
    try {
      const apiMessages = next.map((m) => ({ role: m.role, content: m.apiContent ?? m.content }));
      const r = await fetch("/api/mai-ieftin-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, lang, model: modelRef.current || undefined, curatorId: modelRef.current?.id, visitorId: getChatVisitorId() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!firedProducts.current && (Array.isArray(d.products) || Array.isArray(d.ownProducts) || Array.isArray(d.modelVideos))) { firedProducts.current = true; logFunnelEvent("miai_products"); }
      setMessages((m) => [...m, { role: "assistant", content: d.reply || (lang === "en" ? "Can't reply right now. Try again." : "Momentan nu pot răspunde. Mai încearcă o dată."), products: Array.isArray(d.products) ? d.products : undefined, ownProducts: Array.isArray(d.ownProducts) ? d.ownProducts : undefined, inspo: Array.isArray(d.inspo) ? d.inspo : undefined, modelVideos: Array.isArray(d.modelVideos) ? d.modelVideos : undefined, modelName: modelRef.current?.name || undefined, original: Array.isArray(d.original) ? d.original : undefined, brand: typeof d.brand === "string" ? d.brand : undefined, chips: Array.isArray(d.chips) ? d.chips : undefined }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: lang === "en" ? "Something went wrong. Try again." : "Ceva n-a mers. Mai încearcă o dată." }]);
    } finally { setLoading(false); }
  };

  // "Similar pieces" — deterministic (no AI): show HER matching try-on videos + our pieces +
  // similar online, grounded in her own looks. Always delivers instead of the persona re-asking.
  const sendSimilar = async () => {
    if (loading || demoPlaying) return;
    const hints = modelHintsRef.current.slice(0, 6).join(", ");
    setMessages((m) => [...m, { role: "user", content: t.similar }]);
    setLoading(true);
    try {
      const r = await fetch("/api/mai-ieftin-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ similar: true, curatorId: modelRef.current?.id, hints, lang, visitorId: getChatVisitorId() }),
      });
      const d = await r.json().catch(() => ({}));
      setMessages((m) => [...m, { role: "assistant", content: d.reply || (lang === "en" ? "Here's what I love 💛" : "Uite ce-mi place 💛"),
        modelVideos: Array.isArray(d.modelVideos) ? d.modelVideos : undefined, modelName: modelRef.current?.name || undefined,
        ownProducts: Array.isArray(d.ownProducts) ? d.ownProducts : undefined, products: Array.isArray(d.products) ? d.products : undefined }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: lang === "en" ? "Something went wrong. Try again." : "Ceva n-a mers. Mai încearcă." }]);
    } finally { setLoading(false); }
  };

  // "▶ Demo" — self-play a scripted example into the chat UI so a visitor SEES how it works.
  // Zero API cost (all local); reuses the real message/product rendering. Ends with a reset chip.
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  // A random showcase (different garment family + VIDEO looks each call) for the demo.
  const fetchShowcase = async (): Promise<{ ownProducts?: ShopItem[]; inspo?: ShopItem[] }> => {
    try {
      const r = await fetch("/api/mai-ieftin-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ demoProducts: "showcase", lang }) });
      const dd = await r.json().catch(() => ({}));
      return {
        ownProducts: Array.isArray(dd.ownProducts) && dd.ownProducts.length ? dd.ownProducts : undefined,
        inspo: Array.isArray(dd.inspo) && dd.inspo.length ? dd.inspo : undefined,
      };
    } catch { return {}; }
  };
  const playDemo = async () => {
    if (demoPlaying) return;
    const d = DEMO[lang];
    const push = (msg: Msg) => setMessages((m) => [...m, msg]);
    setDemoPlaying(true);
    setMessages([]);
    await sleep(350);
    push({ role: "user", content: d.q });
    await sleep(550); setLoading(true); await sleep(1100); setLoading(false);
    push({ role: "assistant", content: d.a1, chips: d.chips1 });
    await sleep(1500);
    push({ role: "user", content: d.pick });
    await sleep(450); setLoading(true); await sleep(1000); setLoading(false);
    push({ role: "assistant", content: d.a2, chips: d.chips2 });
    await sleep(1500);
    push({ role: "user", content: d.show });
    await sleep(450); setLoading(true); await sleep(1300);
    // Showcase 1 — a RANDOM garment family + VIDEO looks, so the demo shows DIFFERENT pieces
    // (and looks in motion) every single run instead of the same dresses.
    const sc1 = await fetchShowcase();
    setLoading(false);
    push({ role: "assistant", content: d.a3, inspo: sc1.inspo, ownProducts: sc1.ownProducts });
    await sleep(1600);
    push({ role: "user", content: d.wantDresses });
    await sleep(450); setLoading(true);
    const sc2 = await fetchShowcase(); // a second, different random showcase
    await sleep(700); setLoading(false);
    push({ role: "assistant", content: d.a4, inspo: sc2.inspo, ownProducts: sc2.ownProducts });
    await sleep(900);
    push({ role: "assistant", content: d.outro, chips: [d.tryCta] });
    setDemoPlaying(false);
  };

  // Landing from the homepage "How it works" CTA (?demo=1) → auto-play the demo so a first-time
  // visitor SEES exactly how it works. Only on the empty state (never a model chat).
  useEffect(() => {
    if (params.get("demo") === "1" && !params.get("model")) {
      const id = setTimeout(() => { void playDemo(); }, 700);
      return () => clearTimeout(id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Chip tap. On the reference intro (Yes/No), Yes searches for that product (carrying the
  // hidden hint to the AI); No starts a fresh request. Otherwise the chip text is sent.
  const onChip = (c: string) => {
    if (demoPlaying) return;
    // The demo's closing chip resets to a fresh empty state so the visitor starts for real.
    if (c === DEMO.ro.tryCta || c === DEMO.en.tryCta) { setMessages([]); setText(""); return; }
    // "Similar pieces" → show HER matching looks (videos) + our pieces + similar online, built
    // from her own looks so the search is grounded in her style.
    if (c === T.ro.similar || c === T.en.similar) { void sendSimilar(); return; }
    const atIntro = messages.length === 1 && !!messages[0]?.refImg;
    if (atIntro) {
      const isYes = c === T.ro.yes || c === T.en.yes;
      if (isYes) {
        const hint = refHintRef.current; refHintRef.current = "";
        void send(t.yes, `${lang === "en" ? "Show me luxury pieces like this" : "Arată-mi piese de lux ca aceasta"}${hint ? `: ${hint}` : ""}`);
        return;
      }
      // "Nu, altul" (feed) or "Vreau altele" (model) → open search.
      refHintRef.current = "";
      void send(c, lang === "en" ? "No, I want something else" : "Nu, caut altceva");
      return;
    }
    void send(c);
  };

  // Tapping one of the model's video looks → find that exact look cheaper (hint hidden).
  const onModelLook = (hint: string) => {
    void send(lang === "en" ? "This one 💛" : "Asta îmi place 💛", `${lang === "en" ? "Show me luxury pieces like this" : "Arată-mi piese de lux ca aceasta"}${hint ? `: ${hint}` : ""}`);
  };

  const empty = messages.length === 0 && !loading;

  // The input box — reused in both the empty (centered) and chat (bottom) layouts.
  const inputBox = (
    <div className="rounded-[28px] bg-white/[0.07] p-3 ring-1 ring-white/10 focus-within:ring-white/25 transition">
      {preview && (
        <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-white/10 p-1 pr-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-10 w-10 rounded-xl object-cover" />
          <button type="button" onClick={clearFile} aria-label="Șterge" className="text-white/80 active:scale-90 transition"><X className="h-4 w-4" /></button>
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
        rows={2}
        placeholder={t.ph}
        className="w-full resize-none bg-transparent px-2 pt-1 text-[16px] font-semibold text-white placeholder:text-white/80 outline-none"
      />
      <div className="mt-1 flex items-center justify-between px-1">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} aria-label="Adaugă o poză"
          className="grid h-9 w-9 place-items-center rounded-full text-white/85 hover:bg-white/10 active:scale-90 transition"><Plus className="h-5 w-5" /></button>
        <button type="button" onClick={() => void send()} disabled={!canSend} aria-label="Trimite"
          className="grid h-9 w-9 place-items-center rounded-full bg-white text-black disabled:bg-white/15 disabled:text-white/80 active:scale-90 transition"><ArrowUp className="h-5 w-5" strokeWidth={2.5} /></button>
      </div>
    </div>
  );

  return (
    <>
    <div className="lb-theme relative flex h-screen flex-col overflow-hidden bg-black text-white/90">
      {/* Ambient gold geometry drifting up the background; a burst replays on each message. */}
      <AmbientGeometry burst={messages.length} />
      {/* Top bar */}
      <header className="relative z-30 flex shrink-0 items-center justify-between px-5 py-4">
        <Link href="/home" aria-label="LuxuryBandit" className="inline-flex shrink-0 items-center active:scale-95 transition">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lb-logo.png" alt="LuxuryBandit" className="h-9 w-9 rounded-full object-contain" />
        </Link>
        <div className="flex items-center gap-2">
          {/* Explore dropdown — Inspiration (feed), Gallery, Models. */}
          <div className="relative">
            <button type="button" onClick={() => setNavOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-[13px] font-black text-white/85 ring-1 ring-white/10 active:scale-95 transition">
              <LayoutGrid className="h-4 w-4 text-white/80" /> {t.inspo_btn} <ChevronDown className="h-3.5 w-3.5 text-white/85" />
            </button>
            {navOpen && (
              <>
                <div className="fixed inset-0 z-[59]" onClick={() => setNavOpen(false)} />
                <div className="absolute right-0 top-full z-[60] mt-2 w-44 overflow-hidden rounded-2xl bg-[#111] p-1.5 shadow-2xl ring-1 ring-white/10">
                  {[{ href: "/stores", label: "Looks", Icon: Play }, { href: "/stores?view=grid", label: t.gallery, Icon: LayoutGrid }, { href: "/stores?view=models", label: t.models, Icon: Users }].map((n) => (
                    <Link key={n.href} href={withLang(n.href)} onClick={() => setNavOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-bold text-white/85 hover:bg-white/10 active:scale-[0.98] transition">
                      <n.Icon className="h-4 w-4 text-white/85" /> {n.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* Language switcher hidden — English is forced everywhere. Re-enable to bring RO back. */}
          {false && (
            <div className="flex items-center rounded-full bg-white/[0.07] p-0.5 ring-1 ring-white/10">
              {(["ro", "en"] as Lang[]).map((l) => (
                <button key={l} type="button" onClick={() => setLangUrl(l)}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-black uppercase transition ${lang === l ? "bg-white text-black" : "text-white/75"}`}>
                  {l}
                </button>
              ))}
            </div>
          )}
          {/* Share this page (URL carries ?model / ?lang so it opens the same view). */}
          <button type="button" onClick={() => void share()} aria-label="Share"
            className="grid h-10 w-10 place-items-center rounded-full text-white/75 hover:bg-white/10 active:scale-90 transition">
            {shared ? <Check className="h-5 w-5 text-amber-400" /> : <Share2 className="h-5 w-5" />}
          </button>
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
            <div className="mb-5 flex justify-center">
              <button type="button" onClick={() => void playDemo()}
                className="inline-flex items-center gap-2 rounded-full border border-[#c9a23f]/40 bg-[#c9a23f]/10 px-4 py-2 text-[13px] font-black text-[#e7c877] active:scale-95 transition">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#c9a23f] text-black"><Play className="h-3 w-3 fill-current" /></span>
                {DEMO[lang].btn}
              </button>
            </div>
            <p className="mb-1.5 text-center text-[12px] font-black uppercase tracking-[0.2em] text-[#c9a23f]">{t.motto}</p>
            <h1 className="mb-8 text-center text-[32px] font-black leading-tight tracking-tight text-white/75">{t.title}</h1>
            {inputBox}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {t.suggestions.map((s) => (
                <button key={s} type="button" onClick={() => void send(s)}
                  className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[13px] font-semibold text-white/85 ring-1 ring-white/10 active:scale-95 transition">{s}</button>
              ))}
            </div>
            <p className="mt-4 text-center text-[13px] font-semibold text-white/80">{t.free}</p>
          </div>
        </main>
      ) : (
        /* Chat state */
        <>
          <main className="relative z-10 flex-1 overflow-y-auto px-4 pb-4">
            <div className="mx-auto flex max-w-md flex-col gap-3 py-2">
              {messages.map((m, i) => (
                <div key={i} className="flex flex-col gap-2">
                  {/* Reference still — a round avatar for a model, a portrait card for a look. */}
                  {m.refImg && (
                    m.refRound ? (
                      <div className="w-20 aspect-[3/4] self-start overflow-hidden rounded-2xl bg-white/10 ring-2 ring-[#c9a23f]/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.refImg} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      </div>
                    ) : (
                      <div className="h-40 w-32 self-start overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.refImg} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      </div>
                    )
                  )}
                  <div className={m.role === "user" ? "self-end max-w-[85%]" : "self-start max-w-[85%]"}>
                    <div className={m.role === "user"
                      ? "lb-userbubble rounded-3xl rounded-br-lg bg-white px-4 py-2.5 text-[15px] font-semibold text-black"
                      : "rounded-3xl rounded-bl-lg bg-white/10 px-4 py-2.5 text-[15px] font-medium leading-relaxed text-white/80"}>
                      {m.content}
                    </div>
                  </div>
                  {/* The model's own video looks — tap one to find it cheaper. */}
                  {m.modelLooks && m.modelLooks.length > 0 && (
                    <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
                      {m.modelLooks.map((l, idx) => (
                        <button key={idx} type="button" onClick={() => onModelLook(l.hint)}
                          className="h-36 w-28 shrink-0 overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-[#b8912f]/30 active:scale-95 transition">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={l.img} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        </button>
                      ))}
                    </div>
                  )}
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
                  {/* 🎬 HER own matching looks first — the model's try-on videos (feed). Tap → the
                      look page where the video plays. This is the "Bella wears these" row. */}
                  {m.modelVideos && m.modelVideos.length > 0 && (
                    <>
                      <p className="px-1 pt-1 text-[11px] font-black uppercase tracking-wide text-[#c9a23f]">🎬 {m.modelName || (lang === "en" ? "She" : "Ea")} {t.wears}</p>
                      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
                        {m.modelVideos.map((p, idx) => (
                          <a key={idx} href={p.link} onClick={(e) => { e.preventDefault(); setOpenProduct(p); }}
                            className="relative h-44 w-28 shrink-0 overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-[#c9a23f]/25 active:scale-95 transition">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                            <span className="absolute inset-0 grid place-items-center">
                              <span className="grid h-10 w-10 place-items-center rounded-full bg-black/45 backdrop-blur">
                                <Play className="h-4 w-4 fill-white text-white" />
                              </span>
                            </span>
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                  {/* Our own LOOKS & clothes FIRST — big portrait editorial images (people want
                      to SEE the look, not just flat product shots). */}
                  {m.ownProducts && m.ownProducts.length > 0 && (
                    <>
                      <p className="px-1 pt-1 text-[11px] font-black uppercase tracking-wide text-[#b8912f]">{t.ours}</p>
                      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
                        {m.ownProducts.map((p, idx) => (
                          <a key={idx} href={p.link} onClick={(e) => { e.preventDefault(); setOpenProduct(p); }}
                            className="w-28 shrink-0 overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-[#b8912f]/30 active:scale-95 transition">
                            <div className="aspect-[3/4] w-full bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
                            </div>
                            <div className="p-2.5">
                              {p.price && <p className="text-[14px] font-black text-white">{p.price}</p>}
                              <p className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-tight text-white/85">{p.title}</p>
                              <p className="mt-1 truncate text-[10px] font-bold text-[#b8912f]">LuxuryBandit</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                  {/* Inspirație — a few of OUR try-on videos (poster still + play badge; tap
                      opens /look/[id] where the video plays). People want to SEE the vibe. */}
                  {m.inspo && m.inspo.length > 0 && (
                    <>
                      <p className="px-1 pt-1 text-[11px] font-black uppercase tracking-wide text-[#c9a23f]">{lang === "en" ? "Inspiration · our videos" : "Inspirație · videourile noastre"}</p>
                      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
                        {m.inspo.map((p, idx) => (
                          <a key={idx} href={p.link} onClick={(e) => { e.preventDefault(); setOpenProduct(p); }}
                            className="relative h-44 w-28 shrink-0 overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-[#c9a23f]/25 active:scale-95 transition">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                            <span className="absolute inset-0 grid place-items-center">
                              <span className="grid h-10 w-10 place-items-center rounded-full bg-black/45 backdrop-blur">
                                <Play className="h-4 w-4 fill-white text-white" />
                              </span>
                            </span>
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                  {/* Designer original — the inspiration, credited (not cheaper). */}
                  {m.original && m.original.length > 0 && (
                    <>
                      <p className="px-1 pt-1 text-[11px] font-black uppercase tracking-wide text-white/85">
                        {t.original}{m.brand ? ` · ${m.brand}` : ""} <span className="font-semibold normal-case tracking-normal text-white/50">— {t.inspo}</span>
                      </p>
                      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
                        {m.original.map((p, idx) => (
                          <button key={idx} type="button" onClick={() => openResult(p)}
                            className="w-28 shrink-0 overflow-hidden rounded-2xl bg-white/[0.06] text-left ring-1 ring-white/20 active:scale-95 transition">
                            <div className="aspect-square w-full bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.thumbnail} alt="" loading="lazy" className="h-full w-full object-contain" />
                            </div>
                            <div className="p-2">
                              {p.price && <p className="text-[14px] font-black text-white/90">{p.price}</p>}
                              <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-tight text-white/80">{p.title}</p>
                              <p className="mt-1 truncate text-[10px] font-bold text-white/75">Original{p.source ? ` · ${p.source}` : ""}</p>
                            </div>
                          </button>
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
                          <button key={idx} type="button" onClick={() => openResult(p)}
                            className="w-28 shrink-0 overflow-hidden rounded-2xl bg-white/[0.06] text-left ring-1 ring-white/10 active:scale-95 transition">
                            <div className="aspect-square w-full bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.thumbnail} alt="" loading="lazy" className="h-full w-full object-contain" />
                            </div>
                            <div className="p-2">
                              {p.price && <p className="text-[14px] font-black text-white">{p.price}</p>}
                              <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-tight text-white/85">{p.title}</p>
                              {p.source && <p className="mt-1 truncate text-[10px] font-bold text-white/75">{p.source}</p>}
                            </div>
                          </button>
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
      {/* Product preview dialog — an external link opens HERE first (image + price + a clear
          "go to shop" CTA) so the customer chooses to leave instead of being yanked off-site. */}
      {openProduct && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => setOpenProduct(null)}>
          <div className="lb-phone-col w-full" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto max-w-md rounded-t-3xl bg-[#111] p-5 ring-1 ring-white/10" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
              <div className="flex gap-4">
                <div className="h-40 w-32 shrink-0 overflow-hidden rounded-2xl bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={openProduct.thumbnail} alt="" className="h-full w-full object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                </div>
                <div className="min-w-0 flex-1">
                  {openProduct.price && <p className="text-[22px] font-black text-white">{openProduct.price}</p>}
                  <p className="mt-1 text-[14px] font-semibold leading-snug text-white/80">{openProduct.title}</p>
                  {openProduct.source && <p className="mt-1.5 text-[12px] font-bold text-[#c9a23f]">{openProduct.source}</p>}
                </div>
              </div>
              {openProduct.link?.startsWith("/") ? (
                /* Our own look/video → open it in-app (keep the customer in the funnel). */
                <button type="button" onClick={() => { const l = openProduct.link!; setOpenProduct(null); router.push(l); }}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#c9a23f] py-4 text-[15px] font-black text-black active:scale-[0.98] transition">
                  {lang === "en" ? "View look" : "Vezi look-ul"} <ArrowUpRight className="h-4 w-4" />
                </button>
              ) : (
                <a href={openProduct.link} target="_blank" rel="noopener noreferrer" onClick={() => setOpenProduct(null)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#c9a23f] py-4 text-[15px] font-black text-black active:scale-[0.98] transition">
                  {lang === "en" ? "View in shop" : "Vezi în magazin"} <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
              <button type="button" onClick={() => setOpenProduct(null)}
                className="mt-2 flex w-full items-center justify-center rounded-full py-3 text-[14px] font-bold text-white/85 active:scale-[0.98] transition">
                {lang === "en" ? "Stay here" : "Rămân aici"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    {/* ── "Log in to see your results" wall (dupe.com-style) — only when a signed-out visitor
        OPENS a shopping result. The chat itself stays free. Google + email magic-link. ── */}
    {gate && (() => {
      const teaser = messages
        .flatMap(m => [...(m.products ?? []), ...(m.original ?? []), ...(m.ownProducts ?? [])])
        .map(p => p.thumbnail).filter(Boolean).slice(0, 5);
      const en = lang === "en";
      return (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-white text-neutral-900">
          <button type="button" onClick={() => { setGate(false); setGateSent(false); }} aria-label="Close"
            className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-500 active:scale-90 transition">
            <X className="h-5 w-5" />
          </button>
          <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-[#c9a23f]/15 text-2xl font-black text-[#b8912f] ring-1 ring-[#c9a23f]/30">LB</div>
            <h2 className="text-[26px] font-black leading-tight tracking-tight">
              {en ? "Log in to see your results" : "Autentifică-te ca să vezi rezultatele"}
            </h2>
            <p className="mt-2.5 text-[15px] font-semibold leading-snug text-neutral-500">
              {en ? "No account? Sign up for free — we'll save these results for you." : "N-ai cont? Înregistrează-te gratuit — îți salvăm rezultatele."}
            </p>
            {teaser.length > 0 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                {teaser.map((src, i) => (
                  <div key={i} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-neutral-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  </div>
                ))}
              </div>
            )}
            {gateSent ? (
              <p className="mt-8 w-full rounded-2xl bg-[#c9a23f]/12 px-5 py-4 text-[15px] font-bold text-[#8a6d1f] ring-1 ring-[#c9a23f]/30">
                {en ? "Check your email for your sign-in link ✨" : "Verifică-ți emailul pentru linkul de conectare ✨"}
              </p>
            ) : (
              <>
                <button type="button" onClick={gateGoogle}
                  className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-neutral-200 bg-white py-4 text-[15px] font-bold text-neutral-900 shadow-sm active:scale-[0.98] transition">
                  <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  {en ? "Continue with Google" : "Continuă cu Google"}
                </button>
                <form onSubmit={gateSubmitEmail} className="mt-3 w-full">
                  <input type="email" required value={gateEmail} onChange={(e) => setGateEmail(e.target.value)}
                    placeholder={en ? "your@email.com" : "email@exemplu.com"}
                    className="w-full rounded-full border border-neutral-200 bg-white px-5 py-4 text-center text-[15px] font-semibold text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#c9a23f]" />
                  <button type="submit"
                    className="mt-3 w-full rounded-full bg-[#1a160f] py-4 text-[15px] font-black text-white active:scale-[0.98] transition">
                    {en ? "Continue with email" : "Continuă cu email"}
                  </button>
                </form>
              </>
            )}
            <p className="mt-6 text-[11px] font-semibold leading-relaxed text-neutral-400">
              {en ? "By continuing, you agree to our Terms and Privacy Policy." : "Continuând, ești de acord cu Termenii și Politica de confidențialitate."}
            </p>
          </div>
        </div>
      );
    })()}
    </>
  );
}

export default function MaiIeftinPage() {
  return (
    <Suspense fallback={<div className="lb-theme min-h-screen bg-black" />}>
      <MaiIeftinInner />
    </Suspense>
  );
}
