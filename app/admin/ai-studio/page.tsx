"use client";

export const dynamic = "force-dynamic";

import { useState, type ReactNode } from "react";

const ADMIN_PIN_KEY = "luxurybandit-try-look-admin-pin";

function getStoredPin() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(ADMIN_PIN_KEY) ?? "";
  } catch {
    return "";
  }
}

// Calls our server route (which holds the Anthropic key) — never the API directly.
async function callClaude(prompt: string, useSearch = false) {
  const res = await fetch("/api/admin-ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-try-look-admin-pin": getStoredPin(),
    },
    body: JSON.stringify({ prompt, useSearch }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
  return String(data.text ?? "").trim();
}

const C = {
  bg: "#080706", card: "#100E0C", border: "#1E1A14",
  gold: "#C9A84C", goldLight: "#E8C97A", goldDim: "rgba(201,168,76,0.1)",
  text: "#F2ECE0", muted: "#6A6050", faint: "#3A3528",
};

const TABS = [
  { id: "trends", icon: "◈", label: "Trend Scanner" },
  { id: "content", icon: "✦", label: "Content Ideas" },
  { id: "looks", icon: "◉", label: "Look Generator" },
  { id: "influencer", icon: "⬡", label: "Influencer Gratis" },
];

function ResultBox({ text, onCopy }: { text: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy && onCopy();
  };
  return (
    <div style={{ background: "#0A0806", border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.gold}`, borderRadius: 6, padding: 22, marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 10, color: C.gold, letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif" }}>AI Output</span>
        <button onClick={handleCopy} style={{ fontSize: 10, color: copied ? C.gold : C.muted, background: "none", border: `1px solid ${C.border}`, borderRadius: 3, padding: "4px 10px", cursor: "pointer", letterSpacing: "0.1em", fontFamily: "sans-serif", textTransform: "uppercase" }}>
          {copied ? "Copiat! ✓" : "Copiază"}
        </button>
      </div>
      <pre style={{ fontSize: 13, lineHeight: 1.85, whiteSpace: "pre-wrap", color: "#C4BAA8", fontFamily: "sans-serif", margin: 0 }}>{text}</pre>
    </div>
  );
}

function Inp({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 7, display: "block", fontFamily: "sans-serif" }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: "#0A0806", border: `1px solid ${C.border}`, borderRadius: 4, padding: "12px 16px", color: C.text, fontSize: 14, fontFamily: "sans-serif", outline: "none" }} />
    </div>
  );
}

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 7, display: "block", fontFamily: "sans-serif" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", background: "#0A0806", border: `1px solid ${C.border}`, borderRadius: 4, padding: "12px 16px", color: C.text, fontSize: 13, fontFamily: "sans-serif", outline: "none" }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Btn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: disabled ? "#2A2418" : C.gold, color: disabled ? C.faint : C.bg, padding: "12px 26px", border: "none", borderRadius: 4, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, fontFamily: "sans-serif" }}>
      {children}
    </button>
  );
}

function Card({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, marginBottom: 20 }}>
      <div style={{ fontSize: 20, fontWeight: 400, color: C.gold, marginBottom: 8, letterSpacing: "0.04em" }}>{title}</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 22, fontFamily: "sans-serif" }}>{desc}</div>
      {children}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: C.goldDim, border: `1px solid rgba(201,168,76,0.15)`, borderRadius: 6, padding: "12px 16px", fontSize: 12, color: "#8A7A5A", fontFamily: "sans-serif", lineHeight: 1.6, marginBottom: 20 }}>
      {children}
    </div>
  );
}

type TabProps = { loading: boolean; setLoading: (v: boolean) => void };

// ─── TABS ─────────────────────────────────────────────────────────────────────

function TrendTab({ loading, setLoading }: TabProps) {
  const [result, setResult] = useState("");
  const run = async () => {
    setLoading(true);
    try {
      const text = await callClaude(
        `Search the web and find the top 5 luxury and vintage fashion trends dominating social media in 2026.

For each trend:
TREND NAME: (name)
DESCRIPTION: (2 sentences – what it looks like, who wears it)
PLATFORMS: (Instagram / TikTok / Pinterest)
POPULARITY: (score 1-10)
KEY HASHTAGS: (#tag1 #tag2 #tag3)
VISUAL ELEMENTS: (3 specific visual cues: colors, fabrics, accessories)

Separate each trend with ---. Be practical for a luxury fashion marketplace admin.`, true
      );
      setResult(text);
    } catch (e) { setResult("Eroare: " + (e instanceof Error ? e.message : String(e))); }
    setLoading(false);
  };
  return (
    <div>
      <Card title="Trend Intelligence Scanner" desc="Scanează în timp real trendurile din nișa luxury & vintage pe Instagram, TikTok și Pinterest cu date live de pe web.">
        <Hint>💡 AI-ul caută pe web și îți returnează trendurile actuale – ce estetici sunt hot, pe ce platforme, și ce hashtag-uri să folosești.</Hint>
        <Btn onClick={run} disabled={loading}>◈ Scanează Trenduri Acum</Btn>
      </Card>
      {result && <ResultBox text={result} />}
    </div>
  );
}

function ContentTab({ loading, setLoading }: TabProps) {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("ambele");
  const [result, setResult] = useState("");
  const run = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const text = await callClaude(
        `Create 5 social media post ideas for LuxuryBandit, a vintage & luxury fashion marketplace. Motto: "Bandit this life."

Topic: "${topic}"
Platform focus: ${platform}

For each post:
POST #[nr]
PLATFORM: Instagram or TikTok
CAPTION: (engaging, emojis, max 60 words, ends with CTA)
HASHTAGS: (#tag1 #tag2 #tag3 #tag4 #tag5)
VISUAL: (1-sentence DALL-E/ChatGPT prompt)
---

Tone: aspirational, slightly rebellious, elegant. Not corporate.`
      );
      setResult(text);
    } catch (e) { setResult("Eroare: " + (e instanceof Error ? e.message : String(e))); }
    setLoading(false);
  };
  return (
    <div>
      <Card title="Generator de Idei de Conținut" desc="Introdu un topic sau trend și primești 5 idei de posturi cu caption, hashtag-uri și prompt vizual pentru AI.">
        <Inp label="Topic / Trend" value={topic} onChange={setTopic} placeholder="ex: quiet luxury, vintage Chanel, old money style..." />
        <Sel label="Platformă" value={platform} onChange={setPlatform} options={[
          { value: "ambele", label: "Instagram + TikTok" },
          { value: "Instagram", label: "Instagram" },
          { value: "TikTok", label: "TikTok" },
        ]} />
        <Btn onClick={run} disabled={loading || !topic}>✦ Generează Idei</Btn>
      </Card>
      {result && <ResultBox text={result} />}
    </div>
  );
}

function LooksTab({ loading, setLoading }: TabProps) {
  const [style, setStyle] = useState("quiet luxury");
  const [count, setCount] = useState("3");
  const [result, setResult] = useState("");
  const run = async () => {
    setLoading(true);
    try {
      const text = await callClaude(
        `Create ${count} complete luxury fashion "looks" for LuxuryBandit marketplace. Aesthetic style: "${style}".

For each look:
LOOK NAME: (creative name)
OUTFIT: (4-5 specific pieces with brand suggestions, mix vintage & contemporary)
COLOR PALETTE: (3 colors)
OCCASION: (when/where to wear)
PRICE RANGE: (budget version vs luxury version)
CHATGPT PROMPT: (detailed image prompt: model, setting, lighting, camera angle, mood – 3 sentences)
---

These will be inspiration galleries on LuxuryBandit. Make them aspirational but achievable.`
      );
      setResult(text);
    } catch (e) { setResult("Eroare: " + (e instanceof Error ? e.message : String(e))); }
    setLoading(false);
  };
  return (
    <div>
      <Card title="Look Generator" desc="Generează lookuri complete cu prompturi gata de folosit în ChatGPT sau Midjourney pentru galeria ta LuxuryBandit.">
        <Sel label="Estetică / Stil" value={style} onChange={setStyle} options={[
          { value: "quiet luxury", label: "Quiet Luxury" },
          { value: "old money", label: "Old Money" },
          { value: "european vintage", label: "European Vintage" },
          { value: "dark academia", label: "Dark Academia" },
          { value: "French Riviera chic", label: "French Riviera Chic" },
          { value: "modern minimalist luxury", label: "Modern Minimalist Luxury" },
          { value: "Balkan art luxury", label: "Balkan Art Luxury" },
        ]} />
        <Sel label="Număr de lookuri" value={count} onChange={setCount} options={[
          { value: "3", label: "3 lookuri" },
          { value: "5", label: "5 lookuri" },
        ]} />
        <Btn onClick={run} disabled={loading}>◉ Creează Lookuri</Btn>
      </Card>
      {result && <ResultBox text={result} />}
    </div>
  );
}

function InfluencerTab({ loading, setLoading }: TabProps) {
  const [market, setMarket] = useState("România");
  const [result, setResult] = useState("");
  const run = async () => {
    setLoading(true);
    try {
      const text = await callClaude(
        `I run LuxuryBandit, a vintage & luxury fashion marketplace ("Bandit this life"). Zero budget for influencers. Target market: ${market}.

Free micro-influencer strategy (500-10,000 followers):

1. WHERE TO FIND THEM
   – Specific hashtags on Instagram/TikTok
   – Type of accounts to look for
   – How to spot genuine vs fake

2. WHAT TO OFFER (no money)
   – 4 concrete things to offer instead of payment
   – How to frame it as a real collaboration

3. DM TEMPLATE
   – Romanian version (short, personal, not spammy)
   – English version

4. WHAT TO ASK THEM TO POST
   – Exact content format (Reel/Story/Post)
   – What to include, caption/tag requirements

5. HOW TO MEASURE SUCCESS
   – Simple metrics
   – What counts as a win

Realistic and actionable for someone starting from zero.`
      );
      setResult(text);
    } catch (e) { setResult("Eroare: " + (e instanceof Error ? e.message : String(e))); }
    setLoading(false);
  };
  return (
    <div>
      <Card title="Strategie Micro-Influenceri Gratuiți" desc="Zero buget? Primești o strategie completă pentru a colabora cu micro-influenceri în schimbul expunerii – exact modelul cu care a crescut Shein la început.">
        <Hint>💡 Nu ai nevoie de bani. Oferi expunere, statut și acces. AI-ul îți dă exact ce să spui și unde să cauți.</Hint>
        <Sel label="Piața țintă" value={market} onChange={setMarket} options={[
          { value: "România", label: "România" },
          { value: "Germania", label: "Germania" },
          { value: "Europa de Vest", label: "Europa de Vest" },
          { value: "International", label: "Internațional" },
        ]} />
        <Btn onClick={run} disabled={loading}>⬡ Generează Strategie</Btn>
      </Card>
      {result && <ResultBox text={result} />}
    </div>
  );
}

// ─── PIN GATE ───────────────────────────────────────────────────────────────

function PinGate({ onSaved }: { onSaved: (pin: string) => void }) {
  const [value, setValue] = useState("");
  const save = () => {
    const pin = value.trim();
    if (!pin) return;
    try { localStorage.setItem(ADMIN_PIN_KEY, pin); } catch { /**/ }
    onSaved(pin);
  };
  return (
    <div style={{ maxWidth: 380, margin: "80px auto", padding: 28 }}>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.2em", color: C.gold, textTransform: "uppercase", marginBottom: 6 }}>Luxury Bandit</div>
      <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 24, fontFamily: "sans-serif" }}>Admin · AI Studio</div>
      <Inp label="Admin PIN" value={value} onChange={setValue} placeholder="Introdu PIN-ul de admin" />
      <Btn onClick={save} disabled={!value.trim()}>Deblochează</Btn>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AdminAiStudio() {
  const [activeTab, setActiveTab] = useState("trends");
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState<string>(getStoredPin());

  if (!pin) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Georgia', serif" }}>
        <PinGate onSaved={setPin} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Georgia', serif" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.2em", color: C.gold, textTransform: "uppercase" }}>Luxury Bandit</div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 3, fontFamily: "sans-serif" }}>Admin · Trend Intelligence</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4CAF50" }} />
          <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.15em", fontFamily: "sans-serif", textTransform: "uppercase" }}>AI Activ</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, padding: "0 28px", overflowX: "auto" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: "14px 18px", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer", border: "none", background: "none", color: activeTab === t.id ? C.gold : C.muted, borderBottom: `2px solid ${activeTab === t.id ? C.gold : "transparent"}`, transition: "all 0.2s", fontFamily: "sans-serif", whiteSpace: "nowrap" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 28, maxWidth: 860 }}>
        {activeTab === "trends" && <TrendTab loading={loading} setLoading={setLoading} />}
        {activeTab === "content" && <ContentTab loading={loading} setLoading={setLoading} />}
        {activeTab === "looks" && <LooksTab loading={loading} setLoading={setLoading} />}
        {activeTab === "influencer" && <InfluencerTab loading={loading} setLoading={setLoading} />}
      </div>

      {/* Loading toast */}
      {loading && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: C.card, border: `1px solid ${C.gold}`, borderRadius: 6, padding: "12px 20px", fontSize: 11, color: C.gold, letterSpacing: "0.1em", fontFamily: "sans-serif", textTransform: "uppercase" }}>
          ◈ AI procesează...
        </div>
      )}
    </div>
  );
}
