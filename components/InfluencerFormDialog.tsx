"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { trackMetaPixel } from "@/lib/meta-pixel";

// THE one shared "start your AI influencer" form dialog. Rendered once on the landing.
// Every buy button — the "Start — $8" CTA and each "Who owns her?" model card — opens it
// by dispatching `window.dispatchEvent(new CustomEvent("lb-buy-influencer", { detail: { model } }))`.
// Captures a lead (so we keep the contact) → opens the Premium checkout ($8 first month).
export default function InfluencerFormDialog() {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { model?: string } | undefined;
      setModel(typeof detail?.model === "string" ? detail.model : "");
      setErr(""); setOpen(true);
    };
    window.addEventListener("lb-buy-influencer", onOpen as EventListener);
    return () => window.removeEventListener("lb-buy-influencer", onOpen as EventListener);
  }, []);

  const submit = async () => {
    const e = email.trim();
    if (!name.trim()) { setErr("Please enter your name."); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setErr("Enter a valid email so we can link your influencer."); return; }
    setErr(""); setLoading(true);
    try {
      trackMetaPixel("InitiateCheckout", { content_category: "influencer_subscription", value: 8, currency: "USD" });
      await fetch("/api/try-this-look", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lead", leadSource: model ? `own-influencer:${model}` : "own-influencer", customerName: name.trim(), email: e, instagram: instagram.trim(), marketingConsent: true }),
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

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={() => { if (!loading) setOpen(false); }}>
      <div className="w-full max-w-[440px] rounded-t-3xl border-t border-white/10 bg-[#141210] p-5 text-left sm:rounded-3xl sm:border" onClick={e => e.stopPropagation()}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}>
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-black text-white">Start your AI influencer</p>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-[12px] font-semibold leading-relaxed text-white/55">Tell us where to reach you — then continue to secure payment. First month $8, then $49/mo.</p>
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
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} Continue to payment — $8
          </button>
          {err && <p className="text-center text-[13px] font-bold text-red-400">{err}</p>}
          <p className="text-center text-[11px] font-bold text-white/35">First month $8, then $49/mo · 🔒 secure Stripe · cancel anytime</p>
        </div>
      </div>
    </div>
  );
}
