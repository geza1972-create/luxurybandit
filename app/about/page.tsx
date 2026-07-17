import Link from "next/link";
import { Sparkles, Heart, MessageCircle, Lock, UserPlus } from "lucide-react";
import TopNav from "@/components/TopNav";
import { readTryThisLookState, getPricingConfig, fmtCents } from "@/lib/try-this-look-store";
import AboutStep3Videos from "@/components/AboutStep3Videos";
import AboutVideoPicker from "@/components/AboutVideoPicker";

export const metadata = { title: "How it works — LuxuryBandit" };
// Signed video URLs expire — render fresh on each request.
export const dynamic = "force-dynamic";

type StepMedia = {
  models: { id: string; name: string; photo: string }[];   // featured models to browse
  videos: { poster: string }[];                            // hero showcase clips (admin-picked)
};

// One state read → the models + showcase videos the explainer needs.
async function stepMedia(): Promise<StepMedia> {
  const empty: StepMedia = { models: [], videos: [] };
  try {
    const state = await readTryThisLookState();
    const models = [...(state.curators ?? [])]
      .filter(c => (c as { photoUrl?: string }).photoUrl && ((c as { status?: string }).status ?? "active") === "active")
      .sort((a, b) => ((b as { featured?: boolean }).featured ? 1 : 0) - ((a as { featured?: boolean }).featured ? 1 : 0))
      .slice(0, 3)
      .map(c => ({ id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || (c as { firstName?: string }).firstName || "Model", photo: (c as { photoUrl?: string }).photoUrl as string }));
    // Hero showcase — admin-picked clips lead; else fall back to featured models' clips.
    const featuredIds = new Set(models.map(m => m.id));
    const withVid = (state.generations ?? []).filter(g => (g as { videoUrl?: string }).videoUrl && (g as { imageUrl?: string }).imageUrl && !(g as { hidden?: boolean }).hidden);
    const pick = (g: unknown) => ({ poster: (g as { imageUrl?: string }).imageUrl as string, video: (g as { videoUrl?: string }).videoUrl as string });
    const chosen: { poster: string; video: string }[] = [];
    for (const g of withVid) { if ((g as { showcase?: boolean }).showcase && !chosen.some(c => c.video === (g as { videoUrl?: string }).videoUrl)) chosen.push(pick(g)); }
    if (chosen.length === 0) {
      for (const g of withVid) { if (chosen.length >= 3) break; if (featuredIds.has((g as { curatorId?: string }).curatorId ?? "") && !chosen.some(c => c.video === (g as { videoUrl?: string }).videoUrl)) chosen.push(pick(g)); }
      for (const g of withVid) { if (chosen.length >= 3) break; if (!chosen.some(c => c.video === (g as { videoUrl?: string }).videoUrl)) chosen.push(pick(g)); }
    }
    return { models, videos: chosen.slice(0, 3) };
  } catch { return empty; }
}

// Dark "How it works" — written for USERS: discover influencers, follow them, chat, and
// subscribe to unlock her private world. No try-on. Model recruiting is a teaser → /curators/apply.
export default async function AboutPage() {
  const { models, videos } = await stepMedia();
  const p = await getPricingConfig();
  const sub = fmtCents(p.subscriptionMonthlyCents);
  const step = "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-400 text-sm font-black text-black";
  const card = "rounded-2xl border border-white/10 bg-white/[0.04] p-4";

  return (
    <main className="min-h-[100dvh] lb-bg pb-24 text-white">
      <TopNav />

      <article className="mx-auto max-w-2xl px-5 py-8">
        {/* Hero video showcase — the wow factor at the very top. (Admin picks which clips.) */}
        {videos.length > 0 && (
          <div className="mb-7">
            <AboutStep3Videos videos={videos} />
            <AboutVideoPicker />
          </div>
        )}

        {/* Hero */}
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">AI and real influencers · Luxury Looks</p>
        <h1 className="mt-2 text-[28px] font-black leading-tight">
          The influencer <span className="text-amber-400">marketplace.</span>
        </h1>
        <p className="mt-3 text-[15px] font-semibold leading-7 text-white/60">
          LuxuryBandit is a marketplace of AI &amp; real influencers. Browse them, watch their daily
          luxury looks, <strong className="text-white">follow</strong> the ones you love,{" "}
          <strong className="text-white">chat</strong> with them, and{" "}
          <strong className="text-white">subscribe</strong> to unlock her private photos &amp; videos.
        </p>

        {/* 3 steps — discover → chat → subscribe. */}
        <h2 className="mt-9 flex items-center gap-2 text-lg font-black"><Sparkles className="h-5 w-5 text-amber-400" /> In 3 steps</h2>
        <div className="mt-3 grid gap-2.5">
          {/* 1 — discover & follow */}
          <div className={card}>
            <div className="flex items-center gap-3.5">
              <span className={step}>1</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">Discover &amp; follow</p>
                <p className="mt-0.5 text-[13px] font-semibold leading-6 text-white/55">Browse the marketplace and follow any influencer — free. See her new looks every day.</p>
              </div>
            </div>
            {models.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {models.map(m => (
                  <Link key={m.id} href={`/curator/${m.id}`} className="block overflow-hidden rounded-xl bg-white/5 active:scale-95 transition-transform">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.photo} alt={m.name} className="aspect-[3/4] w-full object-cover" />
                    <span className="block truncate px-2 py-1.5 text-[11px] font-black text-white">{m.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {/* 2 — chat */}
          <div className={card}>
            <div className="flex items-center gap-3.5">
              <span className={step}>2</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">Chat with her</p>
                <p className="mt-0.5 text-[13px] font-semibold leading-6 text-white/55">
                  Send her a <MessageCircle className="-mt-0.5 inline h-3.5 w-3.5 text-amber-400" /> message,
                  get styled, and get to know her — she replies day and night.
                </p>
              </div>
            </div>
          </div>
          {/* 3 — subscribe */}
          <div className={card}>
            <div className="flex items-center gap-3.5">
              <span className={step}>3</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">Subscribe — unlock her private world</p>
                <p className="mt-0.5 text-[13px] font-semibold leading-6 text-white/55">
                  <Lock className="-mt-0.5 inline h-3.5 w-3.5 text-amber-400" /> {sub}/month (just $8 the
                  first month) unlocks her private photos &amp; videos. One subscription per influencer, cancel anytime.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Let's Play Big */}
        <h2 className="mt-9 text-lg font-black">Let&apos;s Play Big</h2>
        <p className="mt-2 text-[14px] font-semibold leading-7 text-white/60">
          The best looks land in <strong className="text-white">Let&apos;s Play Big</strong> — our feed.
          Follow your favorite influencers and never miss a new look.
        </p>

        {/* Money */}
        <h2 className="mt-9 text-lg font-black">How we make money</h2>
        <p className="mt-2 text-[14px] font-semibold leading-7 text-white/60">
          <strong className="text-white">Subscriptions.</strong> When you subscribe to an influencer, we
          keep a share and <strong className="text-white">the model earns 50%</strong>. Some shop links also
          earn us a small commission. We hold no inventory and sell no products ourselves.
        </p>

        {/* Model teaser → free application */}
        <Link href="/curators/apply"
          className="mt-9 flex items-center gap-3.5 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4 active:scale-[0.99] transition-transform">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-black"><Heart className="h-5 w-5" /></span>
          <span className="min-w-0">
            <span className="block text-sm font-black text-amber-400">Become a LuxuryBandit Model</span>
            <span className="block text-[13px] font-semibold leading-6 text-white/55">
              Apply free with your own photo, upload your private videos, and earn 50% of every subscription. →
            </span>
          </span>
        </Link>

        {/* LuxuryBandit — no email exposed, just a link to the contact form. */}
        <h2 className="mt-9 text-lg font-black">LuxuryBandit</h2>
        <p className="mt-2 text-[14px] font-semibold leading-7 text-white/60">
          LuxuryBandit · Timișoara, Romania<br />
          <Link href="/contact" className="font-black text-amber-400">Contact form →</Link>
        </p>

        {/* CTA */}
        <div className="mt-10 grid gap-2.5">
          <Link href="/stores?view=models"
            className="lb-gold flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-black active:scale-95 transition-transform">
            <Sparkles className="h-4 w-4" /> Explore the marketplace
          </Link>
          <Link href="/curators/apply"
            className="flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-6 py-3.5 text-sm font-black text-white active:scale-95 transition-transform">
            <UserPlus className="h-4 w-4 text-amber-400" /> Become a LuxuryBandit Model
          </Link>
        </div>
      </article>
    </main>
  );
}
