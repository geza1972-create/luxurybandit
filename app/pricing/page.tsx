"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Sparkles, MessageCircle, ArrowLeft } from "lucide-react";

// Public pricing menu. Pay-as-you-go: watching & browsing is free; generating your
// own try-on videos is a one-time $8 pack (4 videos). No subscription.
export default function PricingPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#0d0b0a] px-5 pb-24 pt-6 text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 active:scale-90 transition"><ArrowLeft className="h-5 w-5" /></button>
          <Link href="/home" className="text-lg font-black tracking-tight">LuxuryBandit</Link>
        </div>

        <h1 className="text-3xl font-black leading-tight">Simple pricing</h1>
        <p className="mt-1.5 text-sm font-bold text-white/50">Browsing & watching is free. You only pay when you create your own try-on video.</p>

        {/* Free */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-[12px] font-black uppercase tracking-wide text-white/45">Free</p>
          <p className="mt-1 text-3xl font-black">$0</p>
          <div className="mt-4 grid gap-2">
            {["Watch every runway try-on video", "Browse all looks & models", "Chat with the models (a few messages free)"].map(f => (
              <div key={f} className="flex items-center gap-2.5"><Check className="h-4 w-4 shrink-0 text-white/40" /><span className="text-[13px] font-bold text-white/70">{f}</span></div>
            ))}
          </div>
        </div>

        {/* $8 pack — the main offer */}
        <div className="mt-4 rounded-3xl border border-amber-400/40 bg-amber-400/[0.06] p-5 shadow-[0_0_40px_-15px_rgba(251,191,36,0.5)]">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-black uppercase tracking-wide text-amber-400">Video pack</p>
            <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-black text-black">Most popular</span>
          </div>
          <p className="mt-1 flex items-end gap-1.5"><span className="text-4xl font-black">$8</span><span className="mb-1 text-sm font-bold text-white/50">for 4 videos</span></p>
          <p className="text-[12px] font-black text-amber-400/90">$2 per video · pay once · no subscription</p>
          <div className="mt-4 grid gap-2">
            {["Your own try-on in full quality", "Put any model in any look", "Keep, share & download your videos", "Unused videos never expire"].map(f => (
              <div key={f} className="flex items-center gap-2.5"><Check className="h-4 w-4 shrink-0 text-amber-400" /><span className="text-[13px] font-bold text-white/85">{f}</span></div>
            ))}
          </div>
          <Link href="/home" className="lb-gold mt-5 flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-black active:scale-95 transition">
            <Sparkles className="h-4 w-4" /> Create your video
          </Link>
        </div>

        {/* Chat note */}
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-[13px] font-bold text-white/60">Chat with the models is free to try. Tap the message icon on any model to start.</p>
        </div>

        <p className="mt-6 text-center text-[11px] font-bold text-white/30">Prices in USD. Payments are handled securely by Stripe.</p>
      </div>
    </div>
  );
}
