"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Check, X } from "lucide-react";
import { trackMetaPixel } from "@/lib/meta-pixel";

// The ad-test CTA: "Own an AI Influencer — start from $8". A tap on "Start — $8" opens a
// short form DIALOG (name / email / Instagram) — captured as a lead so the team can reach
// out and fulfil — then continues to the integrated Premium checkout ($49/mo, FIRST MONTH
// $8 via the auto coupon; POST omits `plan`). Returns to ?premium=success (Meta Subscribe).
export default function OwnInfluencerCTA() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
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

  const submit = async () => {
    const e = email.trim();
    if (!name.trim()) { setErr("Please enter your name."); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setErr("Enter a valid email so we can link your influencer."); return; }
    setErr(""); setLoading(true);
    try {
      trackMetaPixel("InitiateCheckout", { content_category: "influencer_subscription", value: 8, currency: "USD" });
      // Capture the lead first (so we keep the contact even if they drop off at Stripe).
      await fetch("/api/try-this-look", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lead", leadSource: "own-influencer", customerName: name.trim(), email: e, instagram: instagram.trim(), marketingConsent: true }),
      }).catch(() => {});
      // Then open the subscription checkout (no `plan` → Premium price + first-month $8 coupon).
      const r = await fetch("/api/premium", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
      <button type="button" onClick={() => { setErr(""); setOpen(true); }}
        className="lb-gold mx-auto mt-4 flex h-13 min-h-[52px] w-full max-w-sm items-center justify-center gap-2 rounded-full px-6 text-base font-black active:scale-95 transition">
        <Sparkles className="h-5 w-5" /> Start — $8
      </button>
      <p className="mt-3 text-[12px] font-bold text-white/40">First month $8, then $49/mo · cancel anytime · secure Stripe checkout</p>

      {/* Form dialog — fill in, then continue to payment. */}
      {open && (
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
              <p className="text-center text-[11px] font-bold text-white/35">🔒 Secure Stripe checkout · cancel anytime</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
