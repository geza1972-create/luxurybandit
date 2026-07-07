import Link from "next/link";
import { ArrowLeft, Camera, ChevronDown, Coins, Heart, Sparkles, BadgeCheck, Play, Eye, Building2 } from "lucide-react";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import TrackView from "@/components/TrackView";

export const metadata = {
  title: "Become a LuxuryBandit Model — earn with every look",
  description: "Being a LuxuryBandit Model is different: upload one photo, get styled in luxury looks by AI, collect likes, get discovered by fashion brands — and earn with every look. Stop posting for free.",
  openGraph: {
    title: "Make money daily — become a LuxuryBandit Model",
    description: "Upload one photo. We generate your videos. You earn with every look.",
    images: [{ url: "/become-a-model-banner.jpg", width: 1280, height: 720 }],
    // og:url + og:type — the Facebook Sharing Debugger flags both when missing.
    url: "/become-a-model",
    type: "website",
  },
  // fb:app_id comes from the ROOT layout (single source) — every page carries it.
};

// Signed media URLs expire — render fresh per request (same as /about).
export const dynamic = "force-dynamic";

// Gina is the living example on this page: her real photo → her real generated
// videos → fans trying looks on her. Public clips only (never members-only).
async function ginaExample() {
  try {
    const state = await readTryThisLookState();
    const gina = (state.curators ?? []).find(c => c.firstName === "Gina" && c.lastName === "Popescu");
    if (!gina) return { photo: "", clips: [] as { poster: string; video: string }[] };
    const clips = (state.generations ?? [])
      .filter(g => (g as { curatorId?: string }).curatorId === gina.id && (g as { videoUrl?: string }).videoUrl && (g as { public?: boolean }).public === true && !(g as { hidden?: boolean }).hidden)
      .slice(0, 3)
      .map(g => ({ poster: ((g as { imageUrl?: string }).imageUrl ?? "") as string, video: (g as { videoUrl?: string }).videoUrl as string }));
    return { photo: ((gina as { photoUrl?: string }).photoUrl ?? "") as string, clips };
  } catch { return { photo: "", clips: [] as { poster: string; video: string }[] }; }
}

// Model recruiting landing page — the "Werde Model" ad traffic lands HERE.
// Pitch: you post on Instagram/TikTok for free — here the portal generates your
// videos from ONE photo, you collect likes, get discovered, and EARN.
export default async function BecomeAModelPage() {
  const { photo, clips } = await ginaExample();
  const card = "flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4";
  const icon = "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-amber-400";

  return (
    <main className="min-h-[100dvh] bg-[#0d0b0a] pb-24 text-white">
      {/* Insights: recruiting funnel step 1 (landing view). */}
      <TrackView event="recruit_view" />
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-[#0d0b0a]/95 px-4 py-3 backdrop-blur">
        <Link href="/stores?view=grid" aria-label="Back"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-white active:scale-90 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="min-w-0 flex-1 truncate text-sm font-black text-white">Become a LuxuryBandit Model</p>
        {/* Straight into the show — visitors see what the fuss is about. */}
        <Link href="/stores?tab=community"
          className="lb-gold flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-black active:scale-95 transition-transform">
          <Play className="h-3.5 w-3.5" fill="currentColor" /> Let&apos;s Play Big
        </Link>
      </header>

      <article className="mx-auto max-w-2xl px-5 py-8">
        {/* Hero */}
        <div className="text-center">
          {/* Campaign banner — also the OG/share image for the ads. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/become-a-model-banner.jpg" alt="Make money daily — become a LuxuryBandit model"
            className="mb-4 w-full rounded-2xl border border-amber-400/30" />
          {/* CTA right under the banner — ad traffic converts above the fold. */}
          <Link href="/curators/apply"
            className="lb-gold mb-6 flex items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-black active:scale-95 transition-transform">
            <Coins className="h-5 w-5" /> Become a LuxuryBandit Model — it&apos;s free
          </Link>
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

        {/* The flow IN PICTURES — Gina as the living example: one photo in,
            videos out, fans try looks, money lands. (Public clips only.) */}
        {photo && clips.length >= 2 && (
          <section className="mt-10">
            <h2 className="flex items-center gap-2 text-lg font-black"><Play className="h-5 w-5 text-amber-400" fill="currentColor" /> Watch it happen</h2>
            <p className="mt-1 text-[13px] font-semibold text-white/50">This is Gina — a real LuxuryBandit example, from one photo to money.</p>

            {/* 1 · She uploads ONE photo */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-black"><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-[12px] text-black">1</span>She uploads one photo</p>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative h-44 w-[132px] shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-amber-400/50 lb-media-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="Uploaded photo" className="h-full w-full object-cover object-top" />
                  <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white backdrop-blur"><Camera className="h-3 w-3" /> Phone photo</span>
                </div>
                <p className="text-[13px] font-semibold leading-6 text-white/55">A simple phone picture is enough — <strong className="text-white">our AI polishes it</strong>. No shoot, no studio.</p>
              </div>
            </div>
            <div className="my-1.5 grid place-items-center text-amber-400"><ChevronDown className="h-5 w-5" /></div>

            {/* 2 · The portal animates her */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-black"><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-[12px] text-black">2</span>We turn it into videos</p>
              <div className="mt-3 flex items-center gap-4">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video src={clips[0].video} poster={clips[0].poster || undefined} muted loop playsInline autoPlay preload="metadata"
                  className="aspect-[9/16] h-44 shrink-0 rounded-xl lb-media-bg object-cover" />
                <p className="text-[13px] font-semibold leading-6 text-white/55">Runway-quality videos, generated by the portal — <strong className="text-white">she does nothing</strong>. They appear on her own model page.</p>
              </div>
            </div>
            <div className="my-1.5 grid place-items-center text-amber-400"><ChevronDown className="h-5 w-5" /></div>

            {/* 3 · Fans try looks on her */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-black"><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-[12px] text-black">3</span>Fans put her in new looks</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {clips.slice(1, 3).map((c, i) => (
                  /* eslint-disable-next-line jsx-a11y/media-has-caption */
                  <video key={i} src={c.video} poster={c.poster || undefined} muted loop playsInline autoPlay preload="metadata"
                    className="aspect-[9/16] w-full rounded-xl lb-media-bg object-cover" />
                ))}
              </div>
              <p className="mt-2.5 text-[13px] font-semibold leading-6 text-white/55">Fans pick outfits and <strong className="text-white">try them on her</strong> — same model, endless looks, new videos every day.</p>
            </div>
            <div className="my-1.5 grid place-items-center text-amber-400"><ChevronDown className="h-5 w-5" /></div>

            {/* 4 · Money lands */}
            <div className="rounded-2xl border border-amber-400/40 bg-amber-400/[0.08] p-4">
              <p className="text-sm font-black text-amber-400"><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-[12px] text-black">4</span>Every paid try-on pays her</p>
              {/* NO concrete amounts — we don't promise numbers, only the mechanism:
                  fans PAY for premium try-ons, and she gets her share of each one. */}
              <div className="mt-3 grid gap-1.5">
                {["Fan try-on · Riviera look", "Video try-on · Evening look", "360° view · Premium"].map(label => (
                  <div key={label} className="flex items-center justify-between rounded-xl bg-black/30 px-3.5 py-2.5">
                    <span className="flex items-center gap-2 text-[13px] font-bold text-white/70"><Coins className="h-4 w-4 text-amber-400" /> {label}</span>
                    <span className="text-[13px] font-black text-amber-400">→ her share</span>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[12px] font-semibold leading-5 text-white/50">Fans pay for premium try-ons — she gets her share of every single one, automatically, day and night.</p>
            </div>
          </section>
        )}

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
                Your looks appear in the Let&apos;s Play Big feed — fans follow you, like your videos and
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
          {/* Share — plain sharer links, no JS: Facebook builds its card from our
              OG banner (1280x720), WhatsApp from the same preview. */}
          <div className="flex items-center justify-center gap-2">
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://luxurybandit.com/become-a-model")}`}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/[0.08] px-4 py-3 text-[13px] font-black text-amber-400 active:scale-95 transition-transform">
              Share on Facebook
            </a>
            <a href={`https://wa.me/?text=${encodeURIComponent("Become a LuxuryBandit Model — make money daily 💛 https://luxurybandit.com/become-a-model")}`}
              target="_blank" rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-4 py-3 text-[13px] font-black text-white active:scale-95 transition-transform">
              Share on WhatsApp
            </a>
          </div>
          <Link href="/stores"
            className="flex items-center justify-center rounded-full px-6 py-3 text-sm font-black text-white/50 active:scale-95 transition-transform">
            Back to LuxuryBandit
          </Link>
        </div>
      </article>
    </main>
  );
}
