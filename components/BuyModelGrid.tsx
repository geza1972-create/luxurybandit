"use client";

import { useState } from "react";
import { Loader2, Sparkles, X, Play } from "lucide-react";
import { trackMetaPixel } from "@/lib/meta-pixel";

type Model = { name: string; photo: string; video?: string; poster?: string };

// "Own a unique influencer" grid: each model is one-of-a-kind and STILL FREE. Tapping a
// card opens a claim dialog (video preview + short form) → saves a lead → Stripe checkout.
// Scarcity: "claim her before someone else does."
export default function BuyModelGrid({ models }: { models: Model[] }) {
  const [sel, setSel] = useState<Model | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const open = (m: Model) => { setErr(""); setSel(m); };

  const submit = async () => {
    const e = email.trim();
    if (!name.trim()) { setErr("Please enter your name."); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setErr("Enter a valid email so we can link your influencer."); return; }
    setErr(""); setLoading(true);
    try {
      trackMetaPixel("InitiateCheckout", { content_category: "influencer_subscription", value: 8, currency: "USD" });
      await fetch("/api/try-this-look", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // Encode the claimed model in leadSource so the team knows which one to set up.
        body: JSON.stringify({ action: "lead", leadSource: `own-influencer:${sel?.name || "model"}`, customerName: name.trim(), email: e, instagram: instagram.trim(), marketingConsent: true }),
      }).catch(() => {});
      const r = await fetch("/api/premium", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, returnPath: "/own-influencer" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) { setErr(d.error || "Could not start checkout — please try again."); setLoading(false); return; }
      window.location.href = d.url as string;
    } catch { setErr("Something went wrong — please try again."); setLoading(false); }
  };

  return (
    <>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {models.map((m, i) => (
          <button key={i} type="button" onClick={() => open(m)}
            className="group relative block aspect-[3/4] overflow-hidden rounded-xl lb-media-bg active:scale-95 transition">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.poster || m.photo} alt={m.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
            <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white shadow">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> Free
            </span>
            {m.video ? <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-black/45 text-white backdrop-blur"><Play className="h-2.5 w-2.5" fill="currentColor" /></span> : null}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1.5 pt-5 text-center">
              <span className="text-[10px] font-black text-amber-300">Buy now →</span>
            </span>
          </button>
        ))}
      </div>

      {sel && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={() => { if (!loading) setSel(null); }}>
          <div className="w-full max-w-[440px] rounded-t-3xl border-t border-white/10 bg-[#141210] p-5 text-left sm:rounded-3xl sm:border" onClick={e => e.stopPropagation()}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-black text-white">Claim {sel.name || "this influencer"}</p>
              <button type="button" onClick={() => setSel(null)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] font-black text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Still free — be the one who owns her, before someone else claims her.</p>
            <div className="mx-auto mt-3 w-32 overflow-hidden rounded-2xl">
              {sel.video
                // eslint-disable-next-line jsx-a11y/media-has-caption
                ? <video src={sel.video} poster={sel.poster || sel.photo} autoPlay muted loop playsInline className="aspect-[3/4] w-full object-cover" />
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={sel.photo} alt={sel.name} className="aspect-[3/4] w-full object-cover" />}
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              <input type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                className="h-12 w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 text-sm font-bold text-white outline-none placeholder:text-white/35 focus:border-amber-400" />
              <input type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
                onKeyDown={e => { if (e.key === "Enter") void submit(); }}
                className="h-12 w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 text-sm font-bold text-white outline-none placeholder:text-white/35 focus:border-amber-400" />
              <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="Instagram handle (optional)"
                className="h-12 w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 text-sm font-bold text-white outline-none placeholder:text-white/35 focus:border-amber-400" />
              <button type="button" onClick={() => void submit()} disabled={loading}
                className="lb-gold mt-1 flex h-13 min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 text-base font-black active:scale-95 transition disabled:opacity-60">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} Claim her — pay $8
              </button>
              {err && <p className="text-center text-[13px] font-bold text-red-400">{err}</p>}
              <p className="text-center text-[11px] font-bold text-white/35">First month $8, then $49/mo · 🔒 secure Stripe · cancel anytime</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
