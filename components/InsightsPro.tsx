"use client";

import { useMemo } from "react";
import { Eye, MousePointerClick, Sparkles, Heart, Users, Trash2, Loader2, TrendingDown, Globe, Flame, Crown } from "lucide-react";

export type InsightsEvent = {
  id: string; name: string; createdAt: string; internal?: boolean;
  lookId?: string; lookName?: string; source?: string; country?: string;
  device?: string;   // Geräte-Kennung (lb_visitor) — zählt MENSCHEN statt Klicks
};
type Range = "today" | "7d" | "30d" | "all";

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n)));
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
// Collapse the many raw source spellings into clean buckets (fb + facebook + meta → one, etc.).
const normSource = (raw?: string) => {
  const s = (raw || "").toLowerCase().trim();
  if (!s) return "";
  if (s === "fb" || s.includes("facebook") || s.includes("meta") || s.includes("fbclid")) return "facebook";
  if (s === "ig" || s.includes("instagram")) return "instagram";
  if (s.includes("tiktok") || s === "tt") return "tiktok";
  if (s.includes("twitter") || s === "x" || s.includes("t.co")) return "twitter";
  if (s.includes("localhost") || s.includes("127.0.0.1") || s.includes("vercel.app")) return "dev";
  if (s.includes("google") || s.includes("search")) return "search";
  return s;
};
const srcLabel = (s: string) => ({ instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", twitter: "Twitter/X", search: "Search", direct: "Direct", host: "Referral", dev: "Dev / test" } as Record<string, string>)[s] || (s ? s[0].toUpperCase() + s.slice(1) : "Unknown");

// Country ISO code → flag emoji + readable name, so "RO" reads as "🇷🇴 Romania".
const CN: Record<string, string> = { RO: "Romania", DE: "Germany", GR: "Greece", US: "United States", GB: "United Kingdom", FR: "France", ES: "Spain", IT: "Italy", TH: "Thailand", NL: "Netherlands", AT: "Austria", CH: "Switzerland", MD: "Moldova", PL: "Poland", HU: "Hungary", BG: "Bulgaria", TR: "Turkey", AE: "UAE", RS: "Serbia", UA: "Ukraine", PT: "Portugal", BE: "Belgium", IE: "Ireland", SE: "Sweden", CZ: "Czechia" };
const flagOf = (cc: string) => cc.length === 2 && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map(c => 0x1f1e6 + c.charCodeAt(0) - 65)) : "";
const countryLabel = (cc?: string) => { const c = (cc || "").toUpperCase(); if (!c) return "Unknown"; return `${flagOf(c)} ${CN[c] || c}`.trim(); };

export default function InsightsPro({
  feedEvents, viewsByDay, visitsByDay, looks, range, setRange, onReset, resetting,
}: {
  feedEvents: InsightsEvent[];
  viewsByDay: Record<string, number>;
  visitsByDay: Record<string, number>;
  looks: { id: string; name: string; thumb: string }[];
  range: Range;
  setRange: (r: Range) => void;
  onReset: () => void;
  resetting: boolean;
}) {
  const data = useMemo(() => {
    const nowMs = Date.now();
    const cutoff = range === "today" ? new Date().setHours(0, 0, 0, 0)
      : range === "7d" ? nowMs - 7 * 864e5
      : range === "30d" ? nowMs - 30 * 864e5 : 0;
    const evs = feedEvents.filter(e => !e.internal && new Date(e.createdAt).getTime() >= cutoff);
    const countOf = (n: string) => evs.filter(e => e.name === n).length;

    // VERSCHIEDENE MENSCHEN (29.07.2026). „Website visits" zählt Aufrufe, nicht Personen —
    // die Frage „wie viele Besucher hatte ich?" war daraus nicht zu beantworten. Gezählt
    // werden verschiedene Geräte-Kennungen; `mitKennung` zeigt ehrlich, wie viel Prozent der
    // Ereignisse überhaupt eine tragen (vor dem 29.07. war es fast keines).
    const mitDevice = evs.filter(e => e.device);
    const menschen = new Set(mitDevice.map(e => e.device)).size;
    const abdeckung = evs.length > 0 ? Math.round((mitDevice.length / evs.length) * 100) : 0;

    const sumDays = (rec: Record<string, number>) => Object.entries(rec).reduce((s, [day, n]) =>
      range === "all" || new Date(day + "T00:00:00").getTime() >= cutoff ? s + (Number(n) || 0) : s, 0);
    const visits = sumDays(visitsByDay);
    const views = sumDays(viewsByDay);

    // Funnel: landing → content → intent → account → result.
    const funnel = [
      { key: "visits", label: "Website visits", n: visits },
      { key: "views", label: "Watched a video", n: views },
      { key: "tryon", label: "Tapped “Try-on”", n: countOf("tryon_click") },
      { key: "open", label: "Opened the funnel", n: countOf("tryon_open") },
      { key: "signup", label: "Signed up", n: countOf("tryon_signin") },
      { key: "generated", label: "Generated a video", n: countOf("tryon_generated") },
    ];

    // Traffic sources & countries.
    const bd = (pick: (e: InsightsEvent) => string | undefined) => {
      const m = new Map<string, number>();
      for (const e of evs) { const k = (pick(e) || "").trim(); if (!k) continue; m.set(k, (m.get(k) ?? 0) + 1); }
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const sources = bd(e => normSource(e.source)).slice(0, 6);
    const countries = bd(e => e.country).slice(0, 6);

    // Top content: looks by intent events.
    const intent = new Set(["tryon_click", "like_click", "product_click", "bandit_click", "tryon_open"]);
    const lookMap = new Map<string, number>();
    for (const e of evs) { if (!intent.has(e.name) || !e.lookId) continue; lookMap.set(e.lookId, (lookMap.get(e.lookId) ?? 0) + 1); }
    const thumbById = new Map(looks.map(l => [l.id, l]));
    const topLooks = [...lookMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([id, n]) => ({ id, n, name: thumbById.get(id)?.name || "Look", thumb: thumbById.get(id)?.thumb || "" }));

    // Top models: which model profiles get opened most (model_click fires on /curator/[id]).
    const modelMap = new Map<string, { n: number; name: string }>();
    for (const e of evs) {
      if (e.name !== "model_click" || !e.lookId) continue;
      const cur = modelMap.get(e.lookId) ?? { n: 0, name: e.lookName || "Model" };
      cur.n++; if (e.lookName) cur.name = e.lookName;
      modelMap.set(e.lookId, cur);
    }
    const topModels = [...modelMap.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 8)
      .map(([id, v]) => ({ id, n: v.n, name: v.name }));

    // Daily trend (accurate from per-day tallies), last N days.
    const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
    const trend: { day: string; visits: number; views: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(nowMs - i * 864e5);
      const key = d.toISOString().slice(0, 10);
      trend.push({ day: d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" }), visits: Number(visitsByDay[key] || 0), views: Number(viewsByDay[key] || 0) });
    }

    const recruit = [
      { label: "Saw the model ad", n: countOf("recruit_view") },
      { label: "Opened the form", n: countOf("apply_view") },
      { label: "Applied", n: countOf("apply_submit") },
      { label: "Signed in", n: countOf("recruit_signin") },
    ];

    // Chat funnel (/luxury-products) — the target of the "…Chat" ads.
    const chatFunnel = [
      { label: "Opened the chat", n: countOf("miai_open") },
      { label: "Started chatting", n: countOf("miai_chat") },
      { label: "Saw products", n: countOf("miai_products") },
      { label: "Tapped a product", n: countOf("miai_shop_click") },
    ];

    // Payment (Premium subscription) funnel — paywall → click → checkout → subscribed.
    const payment = [
      { label: "Saw the paywall", n: countOf("paywall_view") },
      { label: "Tapped “Start Premium”", n: countOf("premium_click") },
      { label: "Reached checkout", n: countOf("checkout_start") },
      { label: "Subscribed", n: countOf("subscribe_success") },
    ];

    return { visits, views, funnel, sources, countries, topLooks, topModels, trend, recruit, chatFunnel, payment,
      tryons: countOf("tryon_click"), generated: countOf("tryon_generated"), likes: countOf("like_click"),
      subscribed: countOf("subscribe_success"), menschen, abdeckung };
  }, [feedEvents, viewsByDay, visitsByDay, looks, range]);

  const trendMax = Math.max(1, ...data.trend.map(t => Math.max(t.visits, t.views)));
  const overallConv = pct(data.generated, data.visits);

  const Bars = ({ rows, accent = "bg-cobalt" }: { rows: [string, number][]; accent?: string }) => {
    const max = Math.max(1, ...rows.map(r => r[1]));
    if (!rows.length) return <p className="py-4 text-center text-[11px] font-bold text-ink/35">No data in this range.</p>;
    return (
      <div className="flex flex-col gap-1.5">
        {rows.map(([k, n]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-24 shrink-0 truncate text-[11px] font-bold text-ink/60" title={k}>{k}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]"><div className={`h-full rounded-full ${accent}`} style={{ width: `${(n / max) * 100}%` }} /></div>
            <span className="w-9 shrink-0 text-right text-[11px] font-black text-ink">{fmt(n)}</span>
          </div>
        ))}
      </div>
    );
  };

  const card = "rounded-2xl border border-black/8 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]";

  return (
    <div className="mt-4 space-y-4 pb-16">
      {/* Header: range + reset */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full bg-black/[0.04] p-1">
          {(["today", "7d", "30d", "all"] as Range[]).map(k => (
            <button key={k} type="button" onClick={() => setRange(k)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-black transition ${range === k ? "bg-black text-white" : "text-ink/50"}`}>
              {k === "today" ? "Today" : k === "all" ? "All" : k}
            </button>
          ))}
        </div>
        <button type="button" disabled={resetting} onClick={onReset}
          className="flex items-center gap-1.5 rounded-full border border-coral/30 px-3 py-1.5 text-[12px] font-black text-coral disabled:opacity-40 active:scale-95 transition">
          {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Reset
        </button>
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Visits", n: data.visits, Icon: MousePointerClick, sub: "landed on the app" },
          { label: "Views", n: data.views, Icon: Eye, sub: `${pct(data.views, data.visits)}% of visits` },
          { label: "Try-ons", n: data.tryons, Icon: Sparkles, sub: `${pct(data.tryons, data.visits)}% of visits` },
          { label: "Generated", n: data.generated, Icon: Flame, sub: `${overallConv}% end-to-end` },
        ].map(({ label, n, Icon, sub }) => (
          <div key={label} className={card}>
            <Icon className="mb-1 h-4 w-4 text-ink/35" />
            <p className="text-2xl font-black leading-none text-ink">{fmt(n)}</p>
            <p className="mt-1 text-[11px] font-black text-ink/70">{label}</p>
            <p className="text-[10px] font-bold text-ink/35">{sub}</p>
          </div>
        ))}
      </div>

      {/* VERSCHIEDENE MENSCHEN — die Zahl, die vorher niemand beantworten konnte.
          Bewusst mit Abdeckungs-Hinweis: solange die Geräte-Kennung nicht auf jedem
          Ereignis sitzt, ist die Zahl eine Untergrenze und darf nicht als Wahrheit gelten. */}
      <div className={card}>
        <div className="flex items-baseline justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-black text-ink"><Users className="h-4 w-4 text-ink/40" /> Different people</p>
            <p className="mt-0.5 text-[11px] font-bold text-ink/40">Distinct devices, not clicks. This is the number that answers “how many visitors did I have?”</p>
          </div>
          <p className="text-3xl font-black leading-none text-ink">{fmt(data.menschen)}</p>
        </div>
        {data.abdeckung < 90 && (
          <p className="mt-2 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold leading-snug text-amber-700">
            Only {data.abdeckung}% of events carry a device id, so this is a floor, not the truth.
            Events logged before 29.07.2026 have none at all — the number becomes reliable from then on.
          </p>
        )}
      </div>

      {/* Conversion funnel */}
      <div className={card}>
        <p className="text-sm font-black text-ink">Conversion funnel</p>
        <p className="mt-0.5 text-[11px] font-bold text-ink/40">From landing to a finished video. % is of all visits; the drop shows where you lose people.</p>
        <div className="mt-3 space-y-2">
          {data.funnel.map((s, i) => {
            const ofVisits = pct(s.n, data.funnel[0].n);
            const prev = i > 0 ? data.funnel[i - 1].n : s.n;
            const drop = i > 0 && prev > 0 ? 100 - pct(s.n, prev) : 0;
            return (
              <div key={s.key}>
                <div className="flex items-baseline justify-between text-[12px]">
                  <span className="font-black text-ink">{s.label}</span>
                  <span className="font-black text-ink">{fmt(s.n)} <span className="text-ink/40">· {ofVisits}%</span></span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-black/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-cobalt to-cobalt/70" style={{ width: `${Math.max(ofVisits, s.n > 0 ? 3 : 0)}%` }} />
                </div>
                {i > 0 && drop >= 40 && (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] font-black text-coral"><TrendingDown className="h-3 w-3" /> {drop}% drop off here</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily trend */}
      <div className={card}>
        <p className="text-sm font-black text-ink">Traffic over time</p>
        <div className="mt-1 flex items-center gap-3 text-[10px] font-black">
          <span className="flex items-center gap-1 text-ink/60"><span className="h-2 w-2 rounded-full bg-cobalt" /> Visits</span>
          <span className="flex items-center gap-1 text-ink/60"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Views</span>
        </div>
        <div className="mt-3 flex items-end gap-1" style={{ height: 120 }}>
          {data.trend.map((t, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1" title={`${t.day}: ${t.visits} visits · ${t.views} views`}>
              <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 96 }}>
                <div className="w-1/2 rounded-t bg-cobalt" style={{ height: `${(t.visits / trendMax) * 100}%` }} />
                <div className="w-1/2 rounded-t bg-emerald-400" style={{ height: `${(t.views / trendMax) * 100}%` }} />
              </div>
              {data.trend.length <= 14 && <span className="text-[8px] font-bold text-ink/35">{t.day.slice(0, 5)}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Sources + countries */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className={card}>
          <p className="flex items-center gap-1.5 text-sm font-black text-ink"><Globe className="h-4 w-4 text-ink/40" /> Where they come from</p>
          <div className="mt-3"><Bars rows={data.sources.map(([k, n]) => [srcLabel(k), n])} /></div>
        </div>
        <div className={card}>
          <p className="flex items-center gap-1.5 text-sm font-black text-ink"><Globe className="h-4 w-4 text-ink/40" /> Top countries</p>
          <div className="mt-3">{data.countries.length ? <Bars rows={data.countries.map(([k, n]) => [countryLabel(k), n])} accent="bg-emerald-500" /> : <p className="text-xs font-bold text-ink/35">No geo yet for this range.</p>}</div>
        </div>
      </div>

      {/* Top content */}
      <div className={card}>
        <p className="flex items-center gap-1.5 text-sm font-black text-ink"><Flame className="h-4 w-4 text-ink/40" /> Top-performing looks</p>
        {data.topLooks.length === 0 ? (
          <p className="py-4 text-center text-[11px] font-bold text-ink/35">No engagement in this range.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {data.topLooks.map(l => (
              <div key={l.id} className="overflow-hidden rounded-xl border border-black/8">
                <div className="relative aspect-[3/4] bg-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {l.thumb ? <img src={l.thumb} alt={l.name} className="h-full w-full object-cover" /> : null}
                  <span className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-black text-white">{fmt(l.n)}</span>
                </div>
                <p className="truncate px-1.5 py-1 text-[10px] font-bold text-ink/60">{l.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top models — which model profiles get opened most */}
      <div className={card}>
        <p className="flex items-center gap-1.5 text-sm font-black text-ink"><Flame className="h-4 w-4 text-ink/40" /> Most-clicked models</p>
        <p className="mt-0.5 text-[11px] font-bold text-ink/40">Which model profiles visitors open the most.</p>
        {data.topModels.length === 0 ? (
          <p className="py-4 text-center text-[11px] font-bold text-ink/35">No model clicks in this range.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {data.topModels.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="w-4 shrink-0 text-[11px] font-black text-ink/35">{i + 1}</span>
                <span className="flex-1 truncate text-[12px] font-bold text-ink">{m.name}</span>
                <div className="h-2.5 w-24 overflow-hidden rounded-full bg-black/[0.06]"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.max(pct(m.n, data.topModels[0].n), 4)}%` }} /></div>
                <span className="w-8 shrink-0 text-right text-[12px] font-black text-ink">{fmt(m.n)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recruiting funnel */}
      <div className={card}>
        <p className="flex items-center gap-1.5 text-sm font-black text-ink"><Users className="h-4 w-4 text-ink/40" /> Model recruiting</p>
        <p className="mt-0.5 text-[11px] font-bold text-ink/40">From the “become a model” ad to a submitted application.</p>
        <div className="mt-3 space-y-2">
          {data.recruit.map((s, i) => (
            <div key={s.label}>
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="font-black text-ink">{s.label}</span>
                <span className="font-black text-ink">{fmt(s.n)} <span className="text-ink/40">· {pct(s.n, data.recruit[0].n)}%</span></span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-black/[0.06]"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.max(pct(s.n, data.recruit[0].n), s.n > 0 ? 3 : 0)}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat funnel (/luxury-products) — where the "…Chat" ads land */}
      <div className={card}>
        <p className="flex items-center gap-1.5 text-sm font-black text-ink"><Users className="h-4 w-4 text-ink/40" /> Chat funnel (mai-ieftin)</p>
        <p className="mt-0.5 text-[11px] font-bold text-ink/40">Where the “…Chat” ads land: opened the chat → chatted → saw products → tapped one.</p>
        <div className="mt-3 space-y-2">
          {data.chatFunnel.map((s) => (
            <div key={s.label}>
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="font-black text-ink">{s.label}</span>
                <span className="font-black text-ink">{fmt(s.n)} <span className="text-ink/40">· {pct(s.n, data.chatFunnel[0].n)}%</span></span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-black/[0.06]"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.max(pct(s.n, data.chatFunnel[0].n), s.n > 0 ? 3 : 0)}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment (Premium subscription) funnel */}
      <div className={card}>
        <p className="flex items-center gap-1.5 text-sm font-black text-ink"><Crown className="h-4 w-4 text-amber-500" /> Premium payments</p>
        <p className="mt-0.5 text-[11px] font-bold text-ink/40">From seeing the paywall to an active $4.99/mo membership.</p>
        <div className="mt-3 space-y-2">
          {data.payment.map((s) => (
            <div key={s.label}>
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="font-black text-ink">{s.label}</span>
                <span className="font-black text-ink">{fmt(s.n)} <span className="text-ink/40">· {pct(s.n, data.payment[0].n)}%</span></span>
              </div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-black/[0.06]"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(pct(s.n, data.payment[0].n), s.n > 0 ? 3 : 0)}%` }} /></div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] font-bold text-ink/45">Paywall → checkout: <span className="text-ink">{pct(data.payment[2].n, data.payment[0].n)}%</span> · checkout → subscribed: <span className="text-ink">{pct(data.payment[3].n, data.payment[2].n)}%</span></p>
      </div>

      <p className="px-1 text-[10px] font-bold leading-relaxed text-ink/35">
        Visits &amp; Views are exact per-day counts. Funnel steps, sources, countries and top looks use the most recent activity, and your own admin session is always excluded. <Heart className="inline h-3 w-3" /> = real likes only.
      </p>
    </div>
  );
}
