import Link from "next/link";
import { TrendingUp, Crown, ShoppingBag, Repeat, History, Check } from "lucide-react";
import TopNav from "@/components/TopNav";
import { getPricingConfig, fmtCents } from "@/lib/try-this-look-store";

export const metadata = {
  title: "LB-Value Grow Card — own an influencer | LuxuryBandit",
  description: "An LB-Value Grow Card is a collectible influencer whose value grows daily. Members buy her, own her, and can resell her — ownership moves like an NFT while her full history stays.",
};

export const dynamic = "force-dynamic";

// The ownership explainer for a Model Card. Every price is pulled from the admin price list.
export default async function GrowCardPage() {
  const p = await getPricingConfig();
  const sub = fmtCents(p.subscriptionMonthlyCents);
  const steps = [
    { icon: Crown, title: "Become a member", detail: `A ${sub}/month membership unlocks the marketplace — it's what lets you buy and own influencers.` },
    { icon: ShoppingBag, title: "Buy her at her LB-Value", detail: "You buy her at her current LB-Value — today's price. From that day she's yours." },
    { icon: TrendingUp, title: "You own her — she grows", detail: "Generate her videos, gain super-followers — her LB-Value rises every day, and it grows for YOU." },
    { icon: Repeat, title: "Resell anytime", detail: "List her for sale and a new member buys her at her current LB-Value. Ownership leaves you and moves to them." },
    { icon: History, title: "History stays — like an NFT", detail: "Every owner and every transfer is kept on her card forever. The influencer moves owners; her provenance never disappears." },
  ];

  return (
    <main className="min-h-[100dvh] bg-[#0d0b0a] text-white pb-16">
      <TopNav />
      <div className="mx-auto max-w-lg px-5 pt-8">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black"><TrendingUp className="h-7 w-7" /></span>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">LB-Value Grow Card</p>
        <h1 className="mt-1 text-3xl font-black leading-tight">Own an influencer.<br />She grows with you.</h1>
        <p className="mt-3 text-[15px] font-semibold leading-7 text-white/65">
          Every influencer on LuxuryBandit is a <strong className="text-white">collectible card</strong> with a live
          <strong className="text-amber-300"> LB-Value</strong> that grows every day. Members can <strong className="text-white">buy</strong> her,
          <strong className="text-white"> own</strong> her, and later <strong className="text-white">resell</strong> her — ownership moves like an
          <strong className="text-amber-300"> NFT</strong>, while her full history stays on the card.
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
          <p className="flex items-center gap-1.5 text-[13px] font-black text-white"><Check className="h-4 w-4 text-amber-400" /> The seller gets her current LB-Value.</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-black text-white"><Check className="h-4 w-4 text-amber-400" /> The buyer starts fresh — her value grows for them.</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-black text-white"><Check className="h-4 w-4 text-amber-400" /> The card keeps every owner in its history.</p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Link href="/lb-value" className="flex items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white/80 active:scale-95 transition">How LB-Value grows →</Link>
          <Link href="/stores?view=models" className="lb-gold flex items-center justify-center rounded-full px-5 py-3.5 text-sm font-black active:scale-95 transition">Browse influencers for sale</Link>
        </div>
      </div>
    </main>
  );
}
