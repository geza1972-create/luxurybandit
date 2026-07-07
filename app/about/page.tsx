import Link from "next/link";
import { ArrowLeft, Sparkles, Heart, Coins, ShoppingBag, MessageCircle, Music } from "lucide-react";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import AboutGarmentPicker from "@/components/AboutGarmentPicker";
import AboutVideoPicker from "@/components/AboutVideoPicker";

export const metadata = { title: "How it works — LuxuryBandit" };
// Signed video URLs expire — render fresh on each request.
export const dynamic = "force-dynamic";

type StepMedia = {
  clips: { poster: string; video: string }[]; // Gina hero clips
  curatorId: string;
  models: { id: string; name: string; photo: string }[];   // step 1 — the featured models
  garments: { id: string; name: string; img: string }[];   // step 2 — some outfits
  videos: { poster: string }[];                            // step 3 — blurred (members-only)
};

// One state read → all the visuals the explainer needs.
async function stepMedia(): Promise<StepMedia> {
  const empty: StepMedia = { clips: [], curatorId: "", models: [], garments: [], videos: [] };
  try {
    const state = await readTryThisLookState();
    const gina = (state.curators ?? []).find(c => c.firstName === "Gina" && c.lastName === "Popescu");
    const clips = gina ? (state.generations ?? [])
      .filter(g => (g as { curatorId?: string }).curatorId === gina.id && (g as { videoUrl?: string }).videoUrl && (g as { public?: boolean }).public === true && !(g as { hidden?: boolean }).hidden)
      .slice(0, 3)
      .map(g => ({ poster: ((g as { imageUrl?: string }).imageUrl ?? "") as string, video: (g as { videoUrl?: string }).videoUrl as string })) : [];
    // Step 1 — the featured models (Gina / Amara / Felicia).
    const models = (state.curators ?? [])
      .filter(c => (c as { featured?: boolean }).featured && (c as { photoUrl?: string }).photoUrl)
      .slice(0, 3)
      .map(c => ({ id: c.id, name: [c.firstName, c.lastName].filter(Boolean).join(" ").trim(), photo: (c as { photoUrl?: string }).photoUrl as string }));
    // Step 2 — outfits. Admin-picked (featured) looks lead; if none are picked yet,
    // fall back to the first few wardrobe pieces so the section is never empty.
    const wardrobe = (state.looks ?? [])
      .filter(l => ((l as { productType?: string }).productType === "ai" || (l as { wardrobe?: boolean }).wardrobe) && ((l as { frontImageUrl?: string }).frontImageUrl || (l as { imageUrl?: string }).imageUrl) && (l as { published?: boolean }).published !== false);
    const pickedGarments = wardrobe.filter(l => (l as { featured?: boolean }).featured);
    const garments = (pickedGarments.length ? pickedGarments : wardrobe)
      .slice(0, 4)
      .map(l => ({ id: l.id, name: l.name, img: ((l as { frontImageUrl?: string }).frontImageUrl || (l as { imageUrl?: string }).imageUrl) as string }));
    // Step 3 — admin-picked showcase clips lead (set via the picker); else fall back
    // to the featured MODELS' clips so it's never empty. Full playing videos.
    const featuredIds = new Set(models.map(m => m.id));
    const withVid = (state.generations ?? []).filter(g => (g as { videoUrl?: string }).videoUrl && (g as { imageUrl?: string }).imageUrl && !(g as { hidden?: boolean }).hidden);
    const pick = (g: unknown) => ({ poster: (g as { imageUrl?: string }).imageUrl as string, video: (g as { videoUrl?: string }).videoUrl as string });
    const chosen: { poster: string; video: string }[] = [];
    // 1) admin-picked showcase clips
    for (const g of withVid) { if ((g as { showcase?: boolean }).showcase && !chosen.some(c => c.video === (g as { videoUrl?: string }).videoUrl)) chosen.push(pick(g)); }
    // 2) fallback: one per featured model, then any featured-model clip, then any clip
    if (chosen.length === 0) {
      for (const m of models) { const hit = withVid.find(g => (g as { curatorId?: string }).curatorId === m.id); if (hit) chosen.push(pick(hit)); }
      for (const g of withVid) { if (chosen.length >= 3) break; if (featuredIds.has((g as { curatorId?: string }).curatorId ?? "") && !chosen.some(c => c.video === (g as { videoUrl?: string }).videoUrl)) chosen.push(pick(g)); }
      for (const g of withVid) { if (chosen.length >= 3) break; if (!chosen.some(c => c.video === (g as { videoUrl?: string }).videoUrl)) chosen.push(pick(g)); }
    }
    const videos = chosen.slice(0, 3);
    return { clips, curatorId: gina?.id ?? "", models, garments, videos };
  } catch { return empty; }
}

// Dark "How it works" — written for USERS: see your dream model in any look,
// message her, shop the look. Model recruiting lives on its own landing page
// (/become-a-model) and only gets a teaser here.
export default async function AboutPage() {
  const { models, garments, videos } = await stepMedia();
  const step = "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-400 text-sm font-black text-black";
  const card = "flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4";

  return (
    <main className="min-h-[100dvh] bg-[#0d0b0a] pb-24 text-white">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-[#0d0b0a]/95 px-4 py-3 backdrop-blur">
        <Link href="/stores?view=grid" aria-label="Back"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-white active:scale-90 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-sm font-black text-white">How it works</p>
      </header>

      <article className="mx-auto max-w-2xl px-5 py-8">
        {/* Hero */}
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">AI and real Fashion Models · Luxury Looks</p>
        <h1 className="mt-2 text-[28px] font-black leading-tight">
          Your dream model, <span className="text-amber-400">in any look.</span>
        </h1>
        <p className="mt-3 text-[15px] font-semibold leading-7 text-white/60">
          On LuxuryBandit you don&apos;t just scroll past a beautiful model — you decide what she
          wears next. Pick any designer outfit, and the AI creates a runway-quality video of her
          wearing it. Follow her, message her, shop her looks.
        </p>

        {/* 3 steps — now visual: tap a model OR an outfit, either way you land in the
            try-on funnel. Videos are the members-only payoff (shown blurred). */}
        <h2 className="mt-9 flex items-center gap-2 text-lg font-black"><Sparkles className="h-5 w-5 text-amber-400" /> In 3 steps</h2>
        <div className="mt-3 grid gap-2.5">
          {/* 1 — pick a model */}
          <div className={card}>
            <span className={step}>1</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">Pick your model</p>
              <p className="mt-0.5 text-[13px] font-semibold leading-6 text-white/55">Choose one of our models — tap to open her looks.</p>
              {models.length > 0 && (
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {models.map(m => (
                    <Link key={m.id} href={`/curator/${m.id}`} className="group block overflow-hidden rounded-xl lb-media-bg active:scale-95 transition-transform">
                      <div className="relative aspect-[3/4]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.photo} alt={m.name} className="h-full w-full object-cover object-top" />
                        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-[10px] font-black text-white">{m.name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* 2 — or pick an outfit first (both directions work) */}
          <div className={card}>
            <span className={step}>2</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">…or pick a look first</p>
              <p className="mt-0.5 text-[13px] font-semibold leading-6 text-white/55">
                Both ways work: tap a model then a look, or tap a look then a model. Then choose a
                simple turn or <span className="text-white"><Music className="-mt-0.5 inline h-3.5 w-3.5 text-amber-400" /> dancing with music</span>.
              </p>
              {garments.length > 0 && (
                <div className="mt-2.5 grid grid-cols-4 gap-2">
                  {garments.map(g => (
                    <Link key={g.id} href={`/try/${g.id}?garment=${encodeURIComponent(g.img)}&pick=1`} className="block overflow-hidden rounded-xl lb-media-bg active:scale-95 transition-transform">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.img} alt={g.name} className="aspect-[3/4] w-full object-cover" />
                    </Link>
                  ))}
                </div>
              )}
              {/* Admin: pick which garments show here (hidden for everyone else). */}
              <AboutGarmentPicker />
            </div>
          </div>
          {/* 3 — watch (members-only payoff, blurred teaser) */}
          <div className={card}>
            <span className={step}>3</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">Watch, like, message, shop</p>
              <p className="mt-0.5 text-[13px] font-semibold leading-6 text-white/55">
                Her runway video is ready in seconds. Like it, send her a{" "}
                <MessageCircle className="-mt-0.5 inline h-3.5 w-3.5 text-amber-400" /> message — and if the
                look has a <ShoppingBag className="-mt-0.5 inline h-3.5 w-3.5 text-amber-400" /> shop link, buy the real thing in one tap.
              </p>
              {videos.length > 0 && (
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {videos.map((v, i) => (
                    /* eslint-disable-next-line jsx-a11y/media-has-caption */
                    <video key={i} src={v.video} poster={v.poster || undefined} muted loop playsInline autoPlay preload="metadata"
                      className="aspect-[3/4] w-full rounded-xl lb-media-bg object-cover" />
                  ))}
                </div>
              )}
              {/* Admin: pick which feed videos show here. */}
              <AboutVideoPicker />
            </div>
          </div>
        </div>

        {/* Let's Play Big */}
        <h2 className="mt-9 text-lg font-black">Let&apos;s Play Big</h2>
        <p className="mt-2 text-[14px] font-semibold leading-7 text-white/60">
          The best videos land in <strong className="text-white">Let&apos;s Play Big</strong> — our feed.
          Follow your favorite models and never miss a new look.
        </p>

        {/* Money */}
        <h2 className="mt-9 text-lg font-black">How we make money</h2>
        <p className="mt-2 text-[14px] font-semibold leading-7 text-white/60">
          Premium try-ons (full-quality video, special categories, 360° views) are paid, and some
          shop links earn us a commission. We hold no inventory and sell no products ourselves —
          the price you pay in a shop is set by that shop.
        </p>

        {/* Model teaser → own landing page */}
        <Link href="/become-a-model"
          className="mt-9 flex items-center gap-3.5 rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4 active:scale-[0.99] transition-transform">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-black"><Heart className="h-5 w-5" /></span>
          <span className="min-w-0">
            <span className="block text-sm font-black text-amber-400">Become a LuxuryBandit Model</span>
            <span className="block text-[13px] font-semibold leading-6 text-white/55">
              Upload a few photos, get styled in luxury looks — and earn with every look. →
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
          <Link href="/stores?view=grid"
            className="lb-gold flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-black active:scale-95 transition-transform">
            <Sparkles className="h-4 w-4" /> Pick your model
          </Link>
          <Link href="/become-a-model"
            className="flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-6 py-3.5 text-sm font-black text-white active:scale-95 transition-transform">
            <Coins className="h-4 w-4 text-amber-400" /> Become a LuxuryBandit Model
          </Link>
        </div>
      </article>
    </main>
  );
}
