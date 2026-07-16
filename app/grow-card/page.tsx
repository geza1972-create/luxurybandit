import Link from "next/link";
import { Sparkles, Crown, ShoppingBag, Repeat, History, Check } from "lucide-react";
import TopNav from "@/components/TopNav";
import { getPricingConfig, fmtCents } from "@/lib/try-this-look-store";

export const metadata = {
  title: "Own & collect an AI influencer | LuxuryBandit",
  description: "Every AI influencer on LuxuryBandit is a one-of-a-kind collectible with a single owner. Claim her, own her, grow her — and her full history stays on her card forever.",
};

export const dynamic = "force-dynamic";

// The ownership explainer for a Model Card — a premium collectible, NOT a financial asset.
export default async function GrowCardPage() {
  const p = await getPricingConfig();
  const sub = fmtCents(p.subscriptionMonthlyCents);
  const steps = [
    { icon: Crown, title: "Become a member", detail: `A ${sub}/month membership unlocks the marketplace — it's what lets you claim and own AI influencers.` },
    { icon: ShoppingBag, title: "Claim her", detail: "You claim ownership at her price. From that day she's yours — one of a kind, exclusively yours." },
    { icon: Sparkles, title: "Own her — grow her", detail: "Generate her videos, add luxury looks, gain fans — her Growth Score rises and her collection grows for YOU." },
    { icon: Repeat, title: "Pass her on anytime", detail: "List her and another creator can claim her. Ownership transfers cleanly to them." },
    { icon: History, title: "Her history stays", detail: "Every owner and every transfer is kept on her card forever — her provenance, like any fine collectible." },
  ];

  return (
    <main className="min-h-[100dvh] lb-bg text-white pb-16">
      <TopNav />
      <div className="mx-auto max-w-lg px-5 pt-8">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black"><Crown className="h-7 w-7" /></span>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">Own · Collect · Grow</p>
        <h1 className="mt-1 text-3xl font-black leading-tight">Own an AI influencer.<br />She grows with you.</h1>
        <p className="mt-3 text-[15px] font-semibold leading-7 text-white/65">
          Every influencer on LuxuryBandit is a <strong className="text-white">one-of-a-kind collectible</strong> with a
          single owner. Members can <strong className="text-white">claim</strong> her, <strong className="text-white">own</strong> her,
          and <strong className="text-white">grow</strong> her — and later <strong className="text-white">pass her on</strong> to
          another creator, while her full history stays on the card. Think rare sneakers or a luxury watch — <strong className="text-amber-300">not an investment</strong>.
        </p>

        <div className="mt-6 grid gap-2.5">
          {steps.map((s, i) => (
            <div key={s.title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><s.icon className="h-4.5 w-4.5" /></span>
              <div className="min-w-0">
                <p className="text-[14px] font-black leading-tight text-white"><span className="text-amber-400">{i + 1}.</span> {s.title}</p>
                <p className="mt-0.5 text-[12.5px] font-semibold leading-5 text-white/55">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-black text-white"><Check className="h-4 w-4 text-amber-400" /> One owner at a time — she's exclusively yours.</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-black text-white"><Check className="h-4 w-4 text-amber-400" /> Pass her to another creator anytime.</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-black text-white"><Check className="h-4 w-4 text-amber-400" /> Her card keeps every owner in its history.</p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Link href="/lb-value" className="flex items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white/80 active:scale-95 transition">How she grows →</Link>
          <Link href="/stores?view=models" className="lb-gold flex items-center justify-center rounded-full px-5 py-3.5 text-sm font-black active:scale-95 transition">Explore the marketplace</Link>
        </div>
      </div>
    </main>
  );
}
