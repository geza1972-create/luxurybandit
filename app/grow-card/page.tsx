import Link from "next/link";
import { Crown, Check, UserPlus, MessageCircle, Lock } from "lucide-react";
import TopNav from "@/components/TopNav";
import { getPricingConfig, fmtCents } from "@/lib/try-this-look-store";

export const metadata = {
  title: "Follow, chat & subscribe to influencers | LuxuryBandit",
  description: "Follow any influencer on LuxuryBandit for free, chat with her, and subscribe to unlock her private photos & videos. Want her all to yourself? Exclusive sponsorship is arranged personally — get in touch.",
};

export const dynamic = "force-dynamic";

// How the influencer relationship works: follow (free) → chat → subscribe → (exclusive) own by contact.
export default async function GrowCardPage() {
  const p = await getPricingConfig();
  const sub = fmtCents(p.subscriptionMonthlyCents);
  const steps = [
    { icon: UserPlus, title: "Follow — free", detail: "Follow any influencer and watch her daily luxury looks in your feed. Costs nothing." },
    { icon: MessageCircle, title: "Chat with her", detail: "Message her, get styled, get to know her — she replies day and night." },
    { icon: Lock, title: "Subscribe — unlock her private world", detail: `${sub}/month (just $8 the first month) unlocks her private photos & videos. One subscription per influencer.` },
    { icon: Crown, title: "Become her sponsor", detail: "Pay her monthly Growth-Score price to become her owner. You're then her sponsor — she promotes YOUR products to her fans. Get in touch to start." },
  ];

  return (
    <main className="min-h-[100dvh] lb-bg text-white pb-16">
      <TopNav />
      <div className="mx-auto max-w-lg px-5 pt-8">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black"><Crown className="h-7 w-7" /></span>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">Follow · Subscribe · Own</p>
        <h1 className="mt-1 text-3xl font-black leading-tight">Discover your influencer.<br />Follow, chat &amp; subscribe.</h1>
        <p className="mt-3 text-[15px] font-semibold leading-7 text-white/85">
          Every influencer on LuxuryBandit is someone you can <strong className="text-white">follow for free</strong>,
          <strong className="text-white"> chat</strong> with, and <strong className="text-white">subscribe</strong> to —
          subscribing unlocks <strong className="text-white">her private photos &amp; videos</strong>. And you can
          <strong className="text-amber-300"> own</strong> an influencer — pay her monthly Growth-Score price to become her
          <strong className="text-white"> sponsor</strong>, and she promotes <strong className="text-white">your products</strong>.
        </p>

        <div className="mt-6 grid gap-2.5">
          {steps.map((s, i) => (
            <div key={s.title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><s.icon className="h-4.5 w-4.5" /></span>
              <div className="min-w-0">
                <p className="text-[14px] font-black leading-tight text-white"><span className="text-amber-400">{i + 1}.</span> {s.title}</p>
                <p className="mt-0.5 text-[12.5px] font-semibold leading-5 text-white/75">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-black text-white"><Check className="h-4 w-4 text-amber-400" /> Follow &amp; see her daily looks — free.</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-black text-white"><Check className="h-4 w-4 text-amber-400" /> Subscribe to unlock her private world.</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-black text-white"><Check className="h-4 w-4 text-amber-400" /> Sponsoring = pay monthly; she promotes your products.</p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Link href="/contact?reason=own" className="flex items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white/80 active:scale-95 transition">Contact us to own an influencer →</Link>
          <Link href="/stores?view=models" className="lb-gold flex items-center justify-center rounded-full px-5 py-3.5 text-sm font-black active:scale-95 transition">Explore the marketplace</Link>
        </div>
      </div>
    </main>
  );
}
