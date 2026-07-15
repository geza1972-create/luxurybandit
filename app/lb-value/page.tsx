import Link from "next/link";
import { TrendingUp, Video, Gift, Users, CalendarDays, Sparkles } from "lucide-react";
import TopNav from "@/components/TopNav";
import { getPricingConfig, fmtCents } from "@/lib/try-this-look-store";

export const metadata = {
  title: "LB-Value — how a model's value grows | LuxuryBandit",
  description: "LB-Value is a model's appreciating value on LuxuryBandit. It starts at a base and grows every day — per generated video, per super-follower, and per day owned.",
};

// Signed nothing here, but pricing is admin-editable → always render fresh so the numbers match
// the live price list.
export const dynamic = "force-dynamic";

// The LB-Value explainer. Every number is pulled from the central admin price list (getPricingConfig),
// so changing a value there updates this page automatically — no hardcoded prices.
export default async function LBValuePage() {
  const p = await getPricingConfig();
  const rows = [
    { icon: Sparkles, label: "Starting value", detail: "AI model, when she's created", value: fmtCents(p.freshBaseCents) },
    { icon: Sparkles, label: "Flagship tiers", detail: "premium models", value: `${fmtCents(p.flagshipBase1Cents)} · ${fmtCents(p.flagshipBase2Cents)} · ${fmtCents(p.flagshipBase3Cents)}` },
    { icon: Video, label: "Every generated video", detail: "her owner creates one", value: `+ ${fmtCents(p.videoValueCents)}` },
    { icon: Gift, label: "Every 10 videos", detail: "milestone bonus", value: `+ ${fmtCents(p.videoMilestoneBonusCents)}` },
    { icon: Users, label: "Every super-follower", detail: "a paying member backs her", value: `+ ${fmtCents(p.followerValueCents)}` },
    { icon: CalendarDays, label: "Every day owned", detail: "she grows while you hold her", value: `+ ${fmtCents(p.dayValueCents)}` },
  ];
  if ((p.lookValueCents ?? 0) > 0) rows.push({ icon: Sparkles, label: "Every look", detail: "added to her wardrobe", value: `+ ${fmtCents(p.lookValueCents)}` });

  return (
    <main className="min-h-[100dvh] bg-[#0d0b0a] text-white pb-16">
      <TopNav />
      <div className="mx-auto max-w-lg px-5 pt-8">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-black"><TrendingUp className="h-7 w-7" /></span>
        <h1 className="mt-4 text-3xl font-black leading-tight">LB-Market Value</h1>
        <p className="mt-2 text-[15px] font-semibold leading-7 text-white/65">
          Every model has an <strong className="text-white">LB-Market Value</strong> — her value on LuxuryBandit. The number on her
          card is <strong className="text-amber-300">today&apos;s value</strong>; it&apos;s an <strong className="text-amber-300">appreciating asset</strong> that
          <strong className="text-white"> grows every single day</strong>. Tomorrow it&apos;s worth more. Own her, help her grow, and her
          LB-Market Value rises with her.
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-amber-400/25 bg-amber-400/[0.05]">
          {rows.map((r, i) => (
            <div key={r.label} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-white/10" : ""}`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-amber-300"><r.icon className="h-4.5 w-4.5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-black leading-tight text-white">{r.label}</p>
                <p className="text-[11px] font-bold text-white/40">{r.detail}</p>
              </div>
              <span className="shrink-0 text-[15px] font-black text-amber-300">{r.value}</span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[13px] font-semibold leading-6 text-white/55">
          Generating one of her videos costs the owner <strong className="text-white">{fmtCents(p.videoGenCents)}</strong> — and adds
          <strong className="text-amber-300"> {fmtCents(p.videoValueCents)}</strong> to her LB-Value. The more she&apos;s used and followed, the more she&apos;s worth.
        </p>
        <p className="mt-1.5 text-[11px] font-medium text-white/30">Values are set by LuxuryBandit and can change over time.</p>

        <div className="mt-7 flex flex-col gap-2">
          <Link href="/own-influencer" className="lb-gold flex items-center justify-center rounded-full px-5 py-3.5 text-sm font-black active:scale-95 transition">Own an influencer →</Link>
          <Link href="/stores?view=models" className="flex items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-black text-white/80 active:scale-95 transition">Browse the marketplace</Link>
        </div>
      </div>
    </main>
  );
}
