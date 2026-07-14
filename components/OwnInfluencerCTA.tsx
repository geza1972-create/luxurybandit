"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Check } from "lucide-react";
import { trackMetaPixel } from "@/lib/meta-pixel";

// The ad-test CTA card. "Choose an Influencer" leads to the existing application form
// (/curators/apply) — sign-up + set up your influencer. Returns to ?premium=success
// (fires the Meta Subscribe event). The $49/mo Premium sub, first month $8.
export default function OwnInfluencerCTA() {
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("premium") === "success") {
        setSuccess(true);
        try { localStorage.removeItem("lb-apply-draft-v1"); } catch { /**/ } // signup done → drop the saved form draft
        trackMetaPixel("Subscribe", { content_category: "influencer_subscription", value: 8, currency: "USD" });
      }
    } catch { /**/ }
  }, []);

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
      <h2 className="text-[24px] font-black leading-tight text-white">Own your AI influencer.<br /><span className="text-amber-400">We create her content.</span></h2>
      <p className="mx-auto mt-2 max-w-sm text-[14px] font-semibold leading-relaxed text-white/65">
        Fresh luxury photos &amp; videos every week — you just grow the business. No prompts, no editing, no daily posting.
      </p>
      <Link href="/curators/apply"
        className="lb-gold mx-auto mt-4 flex h-13 min-h-[52px] w-full max-w-sm items-center justify-center gap-2 rounded-full px-6 text-base font-black active:scale-95 transition">
        <Sparkles className="h-5 w-5" /> Choose an Influencer
      </Link>
      <p className="mt-3 text-[12px] font-bold text-white/40">First month $8, then $49/mo · cancel anytime · secure Stripe checkout</p>
    </div>
  );
}
