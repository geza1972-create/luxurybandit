import Link from "next/link";
import { ArrowLeft, Coins, Video, Wallet, MessageCircle, TrendingUp, Check } from "lucide-react";

export const metadata = {
  title: "How LuxuryBandit Models earn — 30% of every video",
  description: "Every LuxuryBandit Model keeps 30% (~$1.20) of every paid video a fan makes with her — it lands in her account automatically. Payouts via bank or PayPal. Chat earnings coming soon.",
  openGraph: {
    title: "Get paid for your looks — LuxuryBandit Model earnings",
    description: "Keep 30% of every paid video made with you. Automatic. Withdraw anytime.",
    url: "/earnings",
    type: "website",
  },
};

// Public explainer for the model earnings program. Linked from the application form,
// the onboarding email, and each model's private earnings box (/curators/profile).
export default function EarningsPage() {
  const steps = [
    { icon: Video, title: "A fan makes a video with you", body: "Anyone can turn your look into a paid AI try-on video ($3.99). It plays in your feed and gets you discovered." },
    { icon: Coins, title: "You keep 30% — automatically", body: "≈ $1.20 lands in your account the moment the video is paid for. No invoices, no waiting, nothing to claim." },
    { icon: Wallet, title: "Withdraw anytime", body: "Add your IBAN or PayPal on your profile and request a payout once you reach the minimum. We transfer it to you." },
  ];

  return (
    <div className="min-h-screen bg-[#0d0b0a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#0d0b0a]/90 px-3 py-3 backdrop-blur">
        <Link href="/become-a-model" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 active:scale-90">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-[13px] font-black tracking-widest text-[#e7c877]">LUXURYBANDIT</span>
        <div className="w-9" />
      </div>

      <div className="mx-auto w-full max-w-md px-5 pb-24 pt-8">
        {/* Hero */}
        <p className="text-center text-[12px] font-black uppercase tracking-[0.2em] text-[#e7c877]">Model earnings</p>
        <h1 className="mt-2 text-center text-[30px] font-black leading-[1.1]">Get paid every time a fan picks you</h1>
        <p className="mx-auto mt-3 max-w-sm text-center text-[14px] font-bold leading-relaxed text-white/55">
          Every LuxuryBandit Model — including our newest faces — keeps <b className="text-[#e7c877]">30%</b> of every paid video made with her. It&apos;s automatic.
        </p>

        {/* Big number */}
        <div className="mx-auto mt-7 max-w-sm rounded-3xl border border-[#c9a23f]/40 bg-gradient-to-b from-[#c9a23f]/[0.12] to-transparent p-6 text-center">
          <p className="text-[12px] font-black uppercase tracking-wider text-[#e7c877]">Your cut per video</p>
          <p className="mt-1 text-5xl font-black">~$1.20</p>
          <p className="mt-1 text-[13px] font-bold text-white/50">= 30% of every $3.99 video</p>
        </div>

        {/* How it works */}
        <div className="mt-9 space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#c9a23f]/15 text-[#e7c877]">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[15px] font-black leading-tight">{s.title}</p>
                <p className="mt-1 text-[13px] font-bold leading-relaxed text-white/50">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* What counts */}
        <div className="mt-8 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.05] p-4">
          <p className="text-[13px] font-black text-emerald-300">Good to know</p>
          <ul className="mt-2 space-y-1.5">
            {[
              "The more fans pick you, the more you earn — there's no cap.",
              "Your first video is free to make; each extra one costs you just $3.99.",
              "Earnings land in your account automatically — check them any time on your profile.",
            ].map((t, i) => (
              <li key={i} className="flex gap-2 text-[13px] font-bold leading-relaxed text-white/60">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Coming soon */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[#e7c877]"><MessageCircle className="h-5 w-5" /></span>
          <p className="text-[13px] font-bold leading-relaxed text-white/55"><b className="text-white">Coming soon:</b> paid chat with fans — your biggest earner yet. 💬</p>
        </div>

        {/* CTA */}
        <Link href="/curators/apply"
          className="lb-gold mt-9 flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black active:scale-95 transition">
          <TrendingUp className="h-5 w-5" /> Become a Model &amp; start earning
        </Link>
        <p className="mt-3 text-center text-[12px] font-bold text-white/35">Already a model? Your earnings are on your profile.</p>
      </div>
    </div>
  );
}
