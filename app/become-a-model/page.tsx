import Link from "next/link";
import { ArrowLeft, Camera, Coins, Heart, Sparkles, BadgeCheck, Play, Eye, Building2 } from "lucide-react";

export const metadata = {
  title: "Become a LuxuryBandit Model — earn with every look",
  description: "Being a LuxuryBandit Model is different: upload one photo, get styled in luxury looks by AI, collect likes, get discovered by fashion brands — and earn with every look. Stop posting for free.",
  openGraph: {
    title: "Make money daily — become a LuxuryBandit Model",
    description: "Upload one photo. We generate your videos. You earn with every look.",
    images: [{ url: "/become-a-model-banner.jpg", width: 1280, height: 720 }],
  },
};

// Model recruiting landing page — the "Werde Model" ad traffic lands HERE.
// Pitch: you post on Instagram/TikTok for free — here the portal generates your
// videos from ONE photo, you collect likes, get discovered, and EARN.
export default function BecomeAModelPage() {
  const card = "flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4";
  const icon = "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-amber-400";

  return (
    <main className="min-h-[100dvh] bg-[#0d0b0a] pb-24 text-white">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-[#0d0b0a]/95 px-4 py-3 backdrop-blur">
        <Link href="/stores" aria-label="Back"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-white active:scale-90 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-sm font-black text-white">Become a LuxuryBandit Model</p>
      </header>

      <article className="mx-auto max-w-2xl px-5 py-8">
        {/* Hero */}
        <div className="text-center">
          {/* Campaign banner — also the OG/share image for the ads. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/become-a-model-banner.jpg" alt="Make money daily — become a LuxuryBandit model"
            className="mb-5 w-full rounded-2xl border border-amber-400/30" />
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">Become a LuxuryBandit Model</p>
          <h1 className="mt-2 text-[30px] font-black leading-tight">
            Stop posting for free.<br /><span className="text-amber-400">Start earning with every look.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] font-semibold leading-7 text-white/60">
            A <strong className="text-white">LuxuryBandit Model</strong> is not a normal model.
            On Instagram, Facebook and TikTok your photos earn likes — for the platform.
            Here, fans put YOU in luxury looks, and you get paid every single time.
          </p>
        </div>

        {/* How it works for her */}
        <h2 className="mt-10 flex items-center gap-2 text-lg font-black"><Sparkles className="h-5 w-5 text-amber-400" /> How it works</h2>
        <div className="mt-3 grid gap-2.5">
          <div className={card}>
            <span className={icon}><Camera className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-black">Upload 2 photos — that&apos;s it</p>
              <p className="mt-0.5 text-[13px] font-semibold leading-6 text-white/55">
                No shoots, no editing, no daily posting. Your face and one full-body shot are
                all the portal needs — <strong className="text-white">the videos are generated
                for you</strong>. And don&apos;t worry about quality:{" "}
                <strong className="text-white">our AI polishes every photo</strong>, so simple
                phone pictures are enough.
              </p>
            </div>
          </div>
          <div className={card}>
            <span className={icon}><Play className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-black">Get styled in luxury looks</p>
              <p className="mt-0.5 text-[13px] font-semibold leading-6 text-white/55">
                See yourself in designer outfits you&apos;d never have to buy — runway-quality
                videos on your own model page, produced by our team.
              </p>
            </div>
          </div>
          <div className={card}>
            <span className={icon}><Heart className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-black">Collect likes &amp; followers</p>
              <p className="mt-0.5 text-[13px] font-semibold leading-6 text-white/55">
                Your looks appear in the Fashionshow feed — fans follow you, like your videos and
                message you, just like on social. But here it counts for something.
              </p>
            </div>
          </div>
          <div className={card}>
            <span className={icon}><Eye className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-black">Get discovered</p>
              <p className="mt-0.5 text-[13px] font-semibold leading-6 text-white/55">
                Fashion brands browse LuxuryBandit for faces. A strong profile here is a portfolio
                that works for you around the clock.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3.5 rounded-2xl border border-amber-400/40 bg-amber-400/[0.08] p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-black"><Coins className="h-5 w-5" /></span>
            <div>
              <p className="text-sm font-black text-amber-400">Earn with every look</p>
              <p className="mt-0.5 text-[13px] font-semibold leading-6 text-white/60">
                Every time someone picks YOU to wear a look, you earn. More looks, more videos,
                more fans — more money. Your beauty, your income.
              </p>
            </div>
          </div>
        </div>

        {/* Trust */}
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-[13px] font-semibold leading-6 text-white/55">
            <strong className="text-white">Every profile is reviewed personally.</strong> We approve
            each model by hand — you&apos;ll get an email as soon as you&apos;re in. You stay in
            control of your profile, and intimate categories are never public.
          </p>
        </div>

        {/* Brands note */}
        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-[13px] font-semibold leading-6 text-white/55">
            <strong className="text-white">You&apos;re a brand or agency?</strong> Reach us at{" "}
            <a href="mailto:support@luxurybandit.com" className="font-black text-amber-400">support@luxurybandit.com</a> to
            work with our models.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-10 grid gap-2.5">
          <Link href="/curators/apply"
            className="lb-gold flex items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-black active:scale-95 transition-transform">
            <Coins className="h-5 w-5" /> Become a LuxuryBandit Model — it&apos;s free
          </Link>
          <Link href="/stores"
            className="flex items-center justify-center rounded-full px-6 py-3 text-sm font-black text-white/50 active:scale-95 transition-transform">
            Back to LuxuryBandit
          </Link>
        </div>
      </article>
    </main>
  );
}
