import Link from "next/link";
import { Sparkles, Video, MessageCircle, TrendingUp, Check, Crown, Camera, BarChart3, Users, Gem, Wand2 } from "lucide-react";
import { readTryThisLookState, getSignedUrl } from "@/lib/try-this-look-store";
import TrackView from "@/components/TrackView";
import LazyVideo from "@/components/LazyVideo";
import OwnInfluencerCTA from "@/components/OwnInfluencerCTA";
import AboutVideoPicker from "@/components/AboutVideoPicker";
import BuyModelGrid from "@/components/BuyModelGrid";
import BuyFormLink from "@/components/BuyFormLink";

export const metadata = {
  title: "LuxuryBandit — Own an AI Influencer. We'll help her grow.",
  description: "Launch your AI influencer business on LuxuryBandit — the marketplace where fans discover, follow and support AI influencers. We create the content daily, you build the audience. Start from $8 (first month, then $49/month).",
  openGraph: {
    title: "Own an AI Influencer — We'll help her grow | LuxuryBandit",
    description: "Launch your AI influencer business. We create the content, you build the audience, you earn from premium fan experiences. Start from $8 (first month, then $49/month).",
    images: [{ url: "/become-a-model-banner.jpg?v=2", width: 1280, height: 720 }],
    url: "/own-influencer",
    type: "website",
  },
};

// Signed media URLs expire — render fresh per request.
export const dynamic = "force-dynamic";

// Real content for the landing: Gina's clips (the "we create the content" proof) +
// a few real models for the "for fans" marketplace preview. Public clips only.
async function landingData() {
  try {
    const state = await readTryThisLookState();
    const curators = state.curators ?? [];
    const gina = curators.find(c => c.firstName === "Gina" && c.lastName === "Popescu") as { id?: string; photoUrl?: string } | undefined;
    const vids = (state.generations ?? []).filter(g => (g as { videoUrl?: string }).videoUrl && !(g as { hidden?: boolean }).hidden);
    const pick = (g: unknown) => ({ poster: ((g as { imageUrl?: string }).imageUrl ?? "") as string, video: (g as { videoUrl?: string }).videoUrl as string });
    // Admin-picked showcase clips lead (chosen via the on-page picker → `showcase` flag);
    // fall back to Gina's public clips so the section is never empty.
    const showcaseClips = vids.filter(g => (g as { showcase?: boolean }).showcase === true).slice(0, 6).map(pick);
    const ginaClips = gina ? vids.filter(g => (g as { curatorId?: string }).curatorId === gina.id && (g as { public?: boolean }).public === true).slice(0, 4).map(pick) : [];
    const clips = showcaseClips.length ? showcaseClips : ginaClips;
    // Buyable AI influencers = the UNCLAIMED avatar-face pool (admin-generated for sale) —
    // NOT the real curators (those are live models, not for sale). Sign the storage paths.
    const faces = (state.avatarFaces ?? []).filter(f => !(f as { claimedBy?: string }).claimedBy && !(f as { sold?: boolean }).sold && ((f as { imagePath?: string }).imagePath || (f as { imageUrl?: string }).imageUrl)).slice(0, 6);
    const models = await Promise.all(faces.map(async f => {
      const face = f as { imagePath?: string; imageUrl?: string; videoPath?: string; videoUrl?: string; createdAt?: string };
      const photo = face.imagePath ? await getSignedUrl(face.imagePath).catch(() => face.imageUrl || "") : (face.imageUrl || "");
      const video = face.videoPath ? await getSignedUrl(face.videoPath).catch(() => "") : (face.videoUrl || "");
      return { name: "", photo, video, poster: photo, createdAt: face.createdAt || "" };
    }));
    return { heroPhoto: (gina?.photoUrl ?? "") as string, clips, models };
  } catch { return { heroPhoto: "", clips: [] as { poster: string; video: string }[], models: [] as { name: string; photo: string }[] }; }
}

export default async function OwnInfluencerLanding() {
  const { heroPhoto, clips, models } = await landingData();

  const NAV = [
    { label: "For Creators", href: "#creators" },
    { label: "Who Owns Her", href: "#fans" },
    { label: "Marketplace", href: "/stores?view=grid" },
    { label: "Pricing", href: "#pricing" },
    { label: "How It Works", href: "#how" },
    { label: "Login", href: "/login" },
  ];
  const HERO_FEATURES = [
    { icon: Sparkles, label: "Daily luxury content" },
    { icon: Video, label: "AI fashion videos" },
    { icon: MessageCircle, label: "Premium fan interactions" },
    { icon: TrendingUp, label: "You earn revenue" },
  ];
  const CREATOR_POINTS = ["We create fresh content every day", "No AI skills required", "No editing or posting", "Grow your audience", "Earn from premium experiences"];
  const FAN_POINTS = ["Discover amazing AI influencers", "Chat with your favorites", "Unlock exclusive content", "Watch premium videos", "Try on her looks"];
  const STEPS = [
    { icon: Users, t: "Create your influencer", d: "Choose a style or create your own AI influencer." },
    { icon: Camera, t: "Choose a monthly plan", d: "Pick the plan that fits your goals." },
    { icon: Sparkles, t: "We create content every day", d: "Luxury photos, videos, looks and more." },
    { icon: MessageCircle, t: "Fans discover your influencer", d: "They follow, chat and unlock premium content." },
    { icon: TrendingUp, t: "You earn from premium experiences", d: "Grow your audience and your revenue." },
  ];
  const WHY = [
    { icon: Crown, t: "Own your influencer", d: "You own your AI influencer and your brand." },
    { icon: Users, t: "Fan connections", d: "Chat, engage and build real relationships with fans." },
    { icon: Camera, t: "Daily luxury content", d: "We create high-quality content every single day." },
    { icon: Gem, t: "Premium experiences", d: "Offer exclusive content, try-ons, videos and more." },
    { icon: BarChart3, t: "Build your business", d: "Grow your audience and increase your income." },
    { icon: Wand2, t: "We do the work", d: "No prompts. No editing. No daily posting." },
  ];

  return (
    <main className="lb-landing min-h-[100dvh] bg-[#0d0b0a] text-white">
      <TrackView event="recruit_view" />

      {/* ── Top nav ── */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0b0a]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/own-influencer" className="flex shrink-0 items-center gap-2.5">
            <img src="/lb-logo.png" alt="LuxuryBandit" className="h-9 w-9 shrink-0 rounded-full object-contain" />
            <span className="leading-none">
              <span className="block text-[15px] font-black tracking-wide">LUXURYBANDIT</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400/80">AI Influencer Marketplace</span>
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-6">
            {NAV.map(n => (
              <Link key={n.label} href={n.href} className="text-[13px] font-bold text-white/70 transition hover:text-white">{n.label}</Link>
            ))}
          </nav>
          <Link href="#launch" className="ml-auto shrink-0 rounded-full border border-amber-400 px-4 py-2 text-[13px] font-black text-amber-400 transition hover:bg-amber-400 hover:text-black">
            Get Started
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10">
          {/* Image */}
          <div className="relative order-1 mx-auto w-full max-w-md overflow-hidden rounded-3xl">
            {heroPhoto ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={heroPhoto} alt="Your AI influencer" className="aspect-[4/5] w-full rounded-3xl object-cover" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src="/become-a-model-banner.jpg?v=2" alt="Own an AI Influencer on LuxuryBandit" className="w-full rounded-3xl" />
            )}
          </div>
          {/* Copy */}
          <div className="order-2 text-center">
            <h1 className="text-[30px] font-black leading-[0.98] tracking-tight">
              OWN AN<br /><span className="text-amber-400">AI INFLUENCER.</span>
            </h1>
            <p className="mt-3 text-[20px] font-black leading-tight">We&apos;ll help her grow.</p>
            <p className="mx-auto mt-4 max-w-md text-[15px] font-semibold leading-7 text-white/65">
              Launch your <strong className="text-white">AI influencer business</strong> on LuxuryBandit. We create the content, you build the audience and earn from premium fan experiences.
            </p>
            <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-4">
              {HERO_FEATURES.map(f => (
                <div key={f.label} className="flex flex-col items-center gap-1.5 text-center">
                  <f.icon className="h-6 w-6 text-amber-400" />
                  <span className="text-[12px] font-bold leading-tight text-white/70">{f.label}</span>
                </div>
              ))}
            </div>
            <div id="launch" className="mt-7 scroll-mt-24"><OwnInfluencerCTA /></div>
          </div>
        </div>
      </section>

      {/* ── For Creators / For Fans ── */}
      <section className="border-b border-white/10">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12">
          {/* Creators */}
          <div id="creators" className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">For Creators</p>
            <h2 className="mt-2 text-[26px] font-black leading-tight">Launch your<br />AI influencer business.</h2>
            <ul className="mt-5 space-y-2.5">
              {CREATOR_POINTS.map(p => (
                <li key={p} className="flex items-start gap-2.5 text-[14px] font-semibold text-white/80">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> {p}
                </li>
              ))}
            </ul>
            {clips.length >= 2 && (
              <div className="mt-6 grid grid-cols-3 gap-2">
                {clips.slice(0, 3).map((c, i) => (
                  <LazyVideo key={i} src={c.video} poster={c.poster || undefined} className="aspect-[9/16] w-full rounded-xl lb-media-bg" />
                ))}
              </div>
            )}
            {/* Admin: pick which videos show here (shared `showcase` flag). Self-hides for everyone else. */}
            <AboutVideoPicker />
            <Link href="#launch" className="mt-6 inline-flex rounded-full border border-white/20 px-5 py-2.5 text-[13px] font-black text-white transition hover:border-amber-400 hover:text-amber-400">
              Learn more for creators
            </Link>
          </div>
          {/* Who owns her? — one-of-a-kind influencers, claim before taken */}
          <div id="fans" className="scroll-mt-24 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">The AI Influencer Marketplace</p>
            <h2 className="mt-2 text-[30px] font-black uppercase leading-none tracking-tight">Who owns her?</h2>
            <p className="mt-3 text-[14px] font-semibold leading-relaxed text-white/70">
              Every AI influencer is one-of-a-kind — and only <span className="font-black text-white">one person</span> can own her: her daily content, her chats, her whole audience. These are <span className="font-black text-emerald-400">still free</span>. Claim one before someone else does — or <BuyFormLink className="font-black text-amber-400 underline decoration-amber-400/40 underline-offset-2">create your own</BuyFormLink>.
            </p>
            {models.length >= 1 && <BuyModelGrid models={models.slice(0, 6)} />}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="scroll-mt-24 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-center text-[28px] font-black">How it works</h2>
          <div className="mt-8 grid gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="text-center">
                <span className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-amber-400 text-[14px] font-black text-black">{i + 1}</span>
                <s.icon className="mx-auto mt-3 h-7 w-7 text-amber-400" />
                <p className="mt-2 text-[13px] font-black uppercase tracking-wide">{s.t}</p>
                <p className="mx-auto mt-1 max-w-[180px] text-[12px] font-semibold leading-5 text-white/50">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why + Start card ── */}
      <section id="pricing" className="scroll-mt-24 border-b border-white/10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12">
          {/* Why */}
          <div>
            <h2 className="text-[26px] font-black uppercase tracking-tight text-amber-400">Why LuxuryBandit?</h2>
            <div className="mt-6 grid gap-5">
              {WHY.map(w => (
                <div key={w.t} className="flex gap-3">
                  <w.icon className="mt-0.5 h-6 w-6 shrink-0 text-amber-400" />
                  <div>
                    <p className="text-[14px] font-black">{w.t}</p>
                    <p className="mt-0.5 text-[13px] font-semibold leading-5 text-white/55">{w.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Start card */}
          <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-b from-amber-400/[0.10] to-transparent p-6">
            <p className="text-[12px] font-black uppercase tracking-[0.15em] text-amber-400">Start your journey today</p>
            <p className="mt-2 max-w-sm text-[14px] font-semibold leading-6 text-white/65">Join the first creators building their AI influencer business on LuxuryBandit.</p>
            <div className="mt-5 flex items-end gap-1">
              <span className="text-[12px] font-bold text-white/50">Start for only</span>
            </div>
            <p className="-mt-1"><span className="text-[48px] font-black leading-none text-amber-400">$8</span><span className="text-[14px] font-bold text-white/60"> first month</span></p>
            <p className="mt-1 text-[12px] font-bold text-white/45">then $49/month · cancel anytime</p>
            <div className="mt-5"><OwnInfluencerCTA /></div>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="border-b border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center">
          <h2 className="text-[30px] font-black leading-tight">Own an AI Influencer.<br /><span className="text-amber-400">We&apos;ll help her grow.</span></h2>
          <div className="mx-auto mt-6 max-w-md"><OwnInfluencerCTA /></div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/lb-logo.png" alt="LuxuryBandit" className="h-11 w-11 rounded-full object-contain" />
          <span className="text-[15px] font-black tracking-wide">LUXURYBANDIT</span>
          <p className="text-[12px] font-bold text-white/45">The AI Influencer Marketplace. Own. Grow. Earn.</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-bold text-white/55">
            <Link href="/stores?view=grid" className="hover:text-white">Marketplace</Link>
            <Link href="#pricing" className="hover:text-white">Pricing</Link>
            <Link href="#how" className="hover:text-white">How It Works</Link>
            <Link href="/about" className="hover:text-white">About</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
          </div>
          <p className="mt-3 text-[11px] font-bold text-white/30">© 2026 LuxuryBandit. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
