import Link from "next/link";
import { Sparkles, Video, Star, Heart, Trophy, Shirt, TrendingUp } from "lucide-react";
import TopNav from "@/components/TopNav";
import { getPricingConfig } from "@/lib/try-this-look-store";

export const metadata = {
  title: "How your AI influencer grows | LuxuryBandit",
  description: "LuxuryBandit continuously helps your AI influencer evolve — with fresh luxury looks, premium videos, exclusive collections and a growing fan community. She becomes more complete, more unique and more desirable.",
};

// Pricing is admin-editable → always render fresh so the score points match the live list.
export const dynamic = "force-dynamic";

// "How your influencer grows" — the collectible-growth explainer. This is NOT a price sheet:
// the number on her card is a Growth Score (popularity), never a financial value.
export default async function InfluencerGrowthPage() {
  const p = await getPricingConfig();
  const pts = (c?: number) => `+${Math.max(1, Math.round((c ?? 0) / 100))}`;

  // The qualitative growth mechanics — how she evolves over time.
  const factors = [
    { icon: Shirt, title: "New luxury looks", detail: "Keep her fresh with exclusive fashion collections." },
    { icon: Video, title: "Premium videos", detail: "Regular content keeps her fans engaged." },
    { icon: Star, title: "Premium collections", detail: "Unlock exclusive themes and luxury experiences." },
    { icon: Heart, title: "Fan community", detail: "Followers, chats and interactions strengthen her." },
    { icon: Trophy, title: "Marketplace visibility", detail: "Featured creators gain more exposure." },
    { icon: Sparkles, title: "Creator upgrades", detail: "New personality packs, voice, stories and more to come." },
  ];

  // What lifts her Growth Score — plain points (NOT money), pulled from the live list.
  const scoreRows = [
    { label: "Every video you create", value: pts(p.videoValueCents) },
    { label: "Every 10 videos milestone", value: pts(p.videoMilestoneBonusCents) },
    { label: "Every super-follower", value: pts(p.followerValueCents) },
    { label: "Every day you sponsor her", value: pts(p.dayValueCents) },
  ];
  if ((p.lookValueCents ?? 0) > 0) scoreRows.push({ label: "Every look in her wardrobe", value: pts(p.lookValueCents) });

  return (
    <main className="min-h-[100dvh] lb-bg text-white pb-16">
      <TopNav />
      <div className="mx-auto max-w-lg px-5 pt-8">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black"><TrendingUp className="h-7 w-7" /></span>
        <h1 className="mt-4 text-3xl font-black leading-tight">How your influencer grows</h1>
        <p className="mt-2 text-[15px] font-semibold leading-7 text-white/85">
          LuxuryBandit continuously helps your AI influencer evolve — with <strong className="text-white">fresh content</strong>, <strong className="text-white">premium experiences</strong> and <strong className="text-white">community engagement</strong>.
        </p>
        {/* The emotional hook — the one line worth highlighting. */}
        <p className="mt-5 border-l-2 border-amber-400 pl-4 text-[21px] font-black leading-snug text-amber-300">
          She becomes more complete, more unique and more desirable<span className="text-white/85"> — not more expensive.</span>
        </p>

        {/* Growth mechanics — the qualitative ways she evolves. */}
        <div className="mt-6 grid gap-2.5">
          {factors.map((f) => (
            <div key={f.title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-300/20 to-amber-500/10 text-amber-300"><f.icon className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-black leading-tight text-white">{f.title}</p>
                <p className="text-[12px] font-semibold leading-snug text-white/85">{f.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Growth Score — a popularity score, explicitly NOT a price. Built by earning Growth Points. */}
        <div className="mt-8 rounded-2xl border border-amber-400/25 bg-amber-400/[0.05] p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-300/80">Growth Score</p>
          <p className="mt-1 text-[13px] font-semibold leading-6 text-white/75">A single number for how popular and developed she is. It rises as she earns <strong className="text-amber-200">Growth Points</strong> — it is <strong className="text-white">not money</strong> and not a price.</p>

          <p className="mt-4 mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/80">Earn Growth Points</p>
          <div className="overflow-hidden rounded-xl border border-white/10">
            {scoreRows.map((r, i) => (
              <div key={r.label} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-white/10" : ""}`}>
                <span className="text-[13px] font-bold text-white/85">{r.label}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-[14px] font-black text-amber-300"><Star className="h-3.5 w-3.5" fill="currentColor" /> {r.value} GP</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] font-medium text-white/50">Growth Points are set by LuxuryBandit and represent development inside the marketplace — never a financial value.</p>
        </div>

        <div className="mt-7 flex flex-col gap-2">
          <Link href="/own-influencer" className="lb-gold flex items-center justify-center rounded-full px-5 py-3.5 text-sm font-black active:scale-95 transition">Sponsor an AI influencer →</Link>
          <Link href="/stores?view=models" className="flex items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white/80 active:scale-95 transition">Explore the marketplace</Link>
        </div>
      </div>
    </main>
  );
}
