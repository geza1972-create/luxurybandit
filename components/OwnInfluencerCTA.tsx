"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Check } from "lucide-react";
import { trackMetaPixel } from "@/lib/meta-pixel";

// The ad-test CTA: "Own an AI Influencer — start from $8". Captures an email (lead +
// Meta), opens our integrated Premium subscription checkout ($49/mo, FIRST MONTH $8 via
// the auto-applied coupon — POST omits `plan` so the route uses the Premium price + the
// first-month coupon). Returns to ?premium=success (fires the Meta Subscribe event).
// Content is fulfilled manually at first — this validates demand.
export default function OwnInfluencerCTA() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("premium") === "success") {
        setSuccess(true);
        trackMetaPixel("Subscribe", { content_category: "influencer_subscription", value: 8, currency: "USD" });
      }
    } catch { /**/ }
  }, []);

  const start = async () => {
    const e = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setErr("Enter a valid email so we can link your influencer."); return; }
    setErr(""); setLoading(true);
    try {
      trackMetaPixel("InitiateCheckout", { content_category: "influencer_subscription", value: 8, currency: "USD" });
      const r = await fetch("/api/premium", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // No `plan` → Premium price + auto first-month coupon ($8 first month, then $49/mo).
        body: JSON.stringify({ email: e, returnPath: "/own-influencer" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) { setErr(d.error || "Could not start checkout — please try again."); setLoading(false); return; }
      window.location.href = d.url as string; // Stripe subscription checkout; returns to ?premium=success
    } catch { setErr("Something went wrong — please try again."); setLoading(false); }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/[0.08] p-5 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500 text-white"><Check className="h-6 w-6" /></span>
        <p className="mt-3 text-lg font-black text-white">You&apos;re in! 🎉</p>
        <p className="mt-1 text-[14px] font-semibold leading-relaxed text-white/70">
          Your AI influencer is being set up. We&apos;ll email you as soon as her first content is ready.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-b from-amber-400/[0.12] to-transparent p-5 text-center">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">First month $8 · then $49/month</p>
      <h2 className="mt-1 text-[24px] font-black leading-tight text-white">Own your AI influencer.<br /><span className="text-amber-400">We create her content.</span></h2>
      <p className="mx-auto mt-2 max-w-sm text-[14px] font-semibold leading-relaxed text-white/65">
        Fresh luxury photos &amp; videos every week — you just grow the business. No prompts, no editing, no daily posting.
      </p>
      <div className="mx-auto mt-4 flex max-w-sm flex-col gap-2">
        <input type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") void start(); }} placeholder="you@email.com"
          className="h-12 w-full rounded-full border border-white/20 bg-white/[0.06] px-5 text-center text-sm font-bold text-white outline-none placeholder:text-white/35 focus:border-amber-400" />
        <button type="button" onClick={() => void start()} disabled={loading}
          className="lb-gold flex h-13 min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 text-base font-black active:scale-95 transition disabled:opacity-60">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} Start — $8
        </button>
      </div>
      {err && <p className="mt-2 text-[13px] font-bold text-red-400">{err}</p>}
      <p className="mt-3 text-[12px] font-bold text-white/40">First month $8, then $49/mo · cancel anytime · secure Stripe checkout</p>
    </div>
  );
}
