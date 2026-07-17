import Link from "next/link";
import { Sparkles, Video, MessageCircle, TrendingUp, Check, Crown, Camera, BarChart3, Users, Gem, Wand2, MapPin } from "lucide-react";
import { readTryThisLookState, getSignedUrl, getPricingConfig, fmtCents, readCardStudioSlides } from "@/lib/try-this-look-store";
import { influencerPriceCents, fmtPriceCents } from "@/lib/influencer-price";
import ModelCard from "@/components/ModelCard";
import TrackView from "@/components/TrackView";
import LazyVideo from "@/components/LazyVideo";
import OwnInfluencerCTA from "@/components/OwnInfluencerCTA";
import AboutVideoPicker from "@/components/AboutVideoPicker";
import BuyModelGrid from "@/components/BuyModelGrid";
import BuyFormLink from "@/components/BuyFormLink";
import WardrobePeek from "@/components/WardrobePeek";

export const metadata = {
  title: "LuxuryBandit — Own an AI Influencer. We'll help her grow.",
  description: "Own an AI influencer on LuxuryBandit — she's yours, one of a kind. Generate her videos in one tap, use them anywhere, and watch her Growth Score grow. Membership $4.99/month.",
  openGraph: {
    title: "Own an AI Influencer — We'll help her grow | LuxuryBandit",
    description: "Own your AI influencer — a one-of-a-kind digital collectible. Generate her videos yourself, grow her Growth Score every day. Membership $4.99/month.",
    images: [{ url: "/become-a-model-banner.jpg?v=3", width: 1280, height: 720 }],
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
    // Landing example = Bella (her ads performed best). Found by her stable id, robust to renames.
    const gina = curators.find(c => c.id === "curator-1783683672619-td4cy") as { id?: string; firstName?: string; lastName?: string; photoUrl?: string; flagship?: boolean; realModel?: boolean; purchasedAt?: string; createdAt?: string; bio?: string; motto?: string; brands?: string } | undefined;
    const vids = (state.generations ?? []).filter(g => (g as { videoUrl?: string }).videoUrl && !(g as { hidden?: boolean }).hidden);
    const pick = (g: unknown) => ({ poster: ((g as { imageUrl?: string }).imageUrl ?? "") as string, video: (g as { videoUrl?: string }).videoUrl as string });
    // Admin-picked showcase clips lead (chosen via the on-page picker → `showcase` flag);
    // fall back to Gina's public clips so the section is never empty.
    const showcaseClips = vids.filter(g => (g as { showcase?: boolean }).showcase === true).slice(0, 6).map(pick);
    const ginaClips = gina ? vids.filter(g => (g as { curatorId?: string }).curatorId === gina.id && (g as { public?: boolean }).public === true).slice(0, 4).map(pick) : [];
    const clips = showcaseClips.length ? showcaseClips : ginaClips;
    // Gina's collectible-card data — her live Growth Score + her looks/clip.
    const ginaKey = [gina?.firstName, gina?.lastName].filter(Boolean).join(" ").trim().toLowerCase() || "bella jussi";
    let ginaLooks = 0, ginaVideos = 0;
    const ginaClipTiles: { poster: string; video: string; private: boolean; createdAt: string; look: string }[] = [];
    for (const g of (state.generations ?? [])) {
      if ((g as { feed?: boolean }).feed !== true) continue;
      const gn = String((g as { customerName?: string }).customerName ?? "").trim().toLowerCase();
      if (gn !== ginaKey) continue;
      ginaLooks++;
      const vurl = (g as { videoUrl?: string }).videoUrl;
      if (vurl) ginaVideos++;
      const thumb = (g as { imageUrl?: string }).imageUrl;
      // Her video clips → clickable thumbs. Public shown to all; private = members-only.
      if (vurl && thumb) ginaClipTiles.push({ poster: thumb, video: vurl, private: (g as { public?: boolean }).public !== true, createdAt: (g as { createdAt?: string }).createdAt ?? "", look: String((g as { lookName?: string }).lookName ?? "") });
    }
    // Public clips first, private (members-only) after — show all (swipeable), cap high for perf.
    ginaClipTiles.sort((a, b) => Number(a.private) - Number(b.private));
    const ginaTiles = ginaClipTiles.slice(0, 30);
    const ginaFollowers = (state.follows ?? []).filter((f: unknown) => (f as { followeeType?: string }).followeeType === "user" && (f as { followeeSlug?: string }).followeeSlug === gina?.id).length;
    const prc = (state.pricing ?? {}) as { flagshipBase1Cents?: number; flagshipBase2Cents?: number; flagshipBase3Cents?: number };
    const flagshipBases = [prc.flagshipBase1Cents ?? 50000, prc.flagshipBase2Cents ?? 150000, prc.flagshipBase3Cents ?? 500000];
    const ginaValueCents = gina ? influencerPriceCents({
      name: ginaKey, flagship: gina.flagship, realModel: gina.realModel === true,
      videoCount: ginaVideos, lookCount: ginaLooks, followerCount: ginaFollowers,
      purchasedAt: gina.purchasedAt, createdAt: gina.createdAt,
      flagshipTier: (gina as { flagshipTier?: number }).flagshipTier, flagshipBases,
    }) : 0;
    const heroClip = ginaTiles[0] || ginaClips[0] || clips[0] || { poster: "", video: "" };
    // A short 6-char model number derived from her id — a stable "serial" for the card.
    const ginaSerial = (gina?.id ?? "").replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase() || "GINA01";
    // ── Her brand story: who she is + per-look story (date · location · caption). ──
    // Dynamic card identity — her stored fields win; the crafted copy is only the fallback.
    // NB: keep this TRUE — no claimed brand deals ("discovered by…") until one actually exists.
    const ginaIntro = String((gina as any)?.intro ?? "").trim()
      || "Hi, I'm Bella — your Monaco influencer. I travel the world, test the newest trends first-hand — I'm obsessed with Gianna Bellucci lingerie — and bring every look to you with photos and stories from each stop. Follow along and never miss a drop.";
    const ginaTitle = String((gina as any)?.title ?? "").trim() || "Monaco Influencer";
    const ginaSponsor = String((gina as any)?.sponsor ?? "").trim() || "Gianna Bellucci";
    const LOCATIONS = ["Monte-Carlo, Monaco", "Saint-Tropez, France", "Lake Como, Italy", "Milan, Italy", "Paris, France", "Mykonos, Greece", "Dubai, UAE", "Ibiza, Spain"];
    const STORIES = [
      "Golden hour on the terrace — testing this season's liquid-satin trend. Verdict: obsessed.",
      "Off-duty in the old town. Sheer lace is having a moment; here's how I'd wear it by day.",
      "Rooftop sunset, city lights. This is the silhouette everyone will copy next month.",
      "Poolside and unbothered. Reporting live on the trend that's taking over the Riviera.",
      "Backstage energy. New drop, first look — you saw it here before anyone else.",
      "A quiet luxury moment. Sometimes the simplest piece is the whole story.",
    ];
    const fmtDate = (iso: string) => { try { return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""; } catch { return ""; } };
    const ginaStory = ginaTiles.slice(0, 8).map((t, i) => ({
      poster: t.poster, video: t.video, private: false, // showcase landing: always show her looks
      date: fmtDate(t.createdAt),
      location: LOCATIONS[i % LOCATIONS.length],
      story: STORIES[i % STORIES.length],
      brand: "Gianna Bellucci",   // her sponsor — every look she wears is theirs
      shopUrl: "/haine",          // "Shop now" → the clothes gallery (Gianna Bellucci pieces)
    }));
    // Card Studio slides targeted at THIS landing (LP-Own-Model) lead the carousel.
    const ownModelClips = [] as { poster: string; video: string; private: boolean; story?: string }[];
    const cardStudioSlides = await readCardStudioSlides();
    // NEWEST first — same rule as everywhere: her latest post leads the carousel.
    for (const sl of [...cardStudioSlides].sort((a: any, b: any) => (a.order ?? 1e9) - (b.order ?? 1e9)).reverse()) {
      const s = sl as any;
      if (s.hidden === true || s.customer) continue;
      if (s.pages && !s.pages.includes("lp-own-model")) continue; // empty array = nowhere
      const media = s.path ? await getSignedUrl(s.path).catch(() => "") : "";
      if (!media) continue;
      const poster = s.posterPath ? await getSignedUrl(s.posterPath).catch(() => "") : "";
      const cap = [s.title, s.caption].filter(Boolean).join(" — ") || undefined;
      ownModelClips.push(s.kind === "video"
        ? { poster: poster || "", video: media, private: s.private === true, story: cap }
        : { poster: media, video: "", private: s.private === true, story: cap });
    }
    const ginaClips2 = [...ownModelClips, ...ginaStory];
    const ginaCard = {
      id: (gina?.id ?? "") as string,
      serial: ginaSerial,
      name: "Bella",
      title: ginaTitle,
      intro: ginaIntro,
      sponsor: ginaSponsor,
      photo: (gina?.photoUrl ?? "") as string,
      video: heroClip.video || "",
      poster: heroClip.poster || (gina?.photoUrl ?? ""),
      clips: ginaClips2,
      valueLabel: fmtPriceCents(ginaValueCents),
      looks: ginaLooks,
      bio: (gina?.bio || gina?.motto || "") as string,
      brands: (gina?.brands || "") as string,
      createdAt: (gina?.createdAt || "") as string,
      forSale: typeof (gina as { forSale?: boolean })?.forSale === "boolean"
        ? (gina as { forSale?: boolean }).forSale
        : !(gina as { ownerEmail?: string })?.ownerEmail,
      country: ((gina as { country?: string })?.country || "") as string,
      owner: (() => {
        const oe = String((gina as { ownerEmail?: string })?.ownerEmail || "").trim().toLowerCase();
        if (!oe) return "";
        const local = oe.split("@")[0].split(/[._-]/)[0];
        return local ? local.charAt(0).toUpperCase() + local.slice(1) : "";
      })(),
    };
    // Buyable AI influencers = the UNCLAIMED avatar-face pool (admin-generated for sale) —
    // NOT the real curators (those are live models, not for sale). Sign the storage paths.
    const faces = (state.avatarFaces ?? []).filter(f => !(f as { claimedBy?: string }).claimedBy && !(f as { sold?: boolean }).sold && ((f as { imagePath?: string }).imagePath || (f as { imageUrl?: string }).imageUrl)).slice(0, 12);
    const models = await Promise.all(faces.map(async f => {
      const face = f as { imagePath?: string; imageUrl?: string; videoPath?: string; videoUrl?: string; createdAt?: string };
      const photo = face.imagePath ? await getSignedUrl(face.imagePath).catch(() => face.imageUrl || "") : (face.imageUrl || "");
      const video = face.videoPath ? await getSignedUrl(face.videoPath).catch(() => "") : (face.videoUrl || "");
      return { name: "", photo, video, poster: photo, createdAt: face.createdAt || "" };
    }));
    return { heroPhoto: (gina?.photoUrl ?? "") as string, clips, models, ginaCard, ginaIntro, ginaStory };
  } catch { return { heroPhoto: "", clips: [] as { poster: string; video: string }[], models: [] as { name: string; photo: string }[], ginaCard: null, ginaIntro: "", ginaStory: [] as { poster: string; video: string; private: boolean; date: string; location: string; story: string }[] }; }
}

export default async function OwnInfluencerLanding() {
  const { heroPhoto, clips, models, ginaCard, ginaIntro, ginaStory } = await landingData();
  // All prices come from the admin-editable price list — change them once there, not here.
  const pricing = await getPricingConfig();
  const subLabel = fmtCents(pricing.subscriptionMonthlyCents);   // membership / month
  const chatLabel = fmtCents(pricing.chatPassCents);             // paid chat pass / 30 min
  const videoLabel = fmtCents(pricing.videoGenCents);            // generate a video
  const superFollowLabel = subLabel;   // Super Follow = the ONE membership price (no separate price)

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
    { icon: TrendingUp, label: "A growing fan community" },
  ];
  const CREATOR_POINTS = ["We add fresh clothes to her wardrobe daily", "No AI skills required", "You generate her videos yourself — one tap", "Mark videos private — only her Super Followers see them", "Earn when fans Super Follow her ($4.99/mo)", "Earn when fans pay to chat with her"];
  const FAN_POINTS = ["Discover amazing AI influencers", "Chat with your favorites", "Unlock exclusive content", "Watch premium videos", "Try on her looks"];
  const STEPS = [
    { icon: Users, t: "Pick your influencer", d: "Choose one of ours or create your own — one-of-a-kind, and she's yours." },
    { icon: Crown, t: "Start your membership", d: "$4.99/month unlocks your studio." },
    { icon: Sparkles, t: "Generate her videos", d: "One tap — we handle the AI. No prompts, no skills." },
    { icon: TrendingUp, t: "Her Growth Score grows", d: "Every video and every day makes her more popular." },
    { icon: Video, t: "Use her everywhere", d: "Post her videos on your shop, Facebook & Instagram — she's yours to use." },
  ];
  const WHY = [
    { icon: Crown, t: "Own your influencer", d: "You own your AI influencer and your brand." },
    { icon: TrendingUp, t: "Her Growth Score grows", d: "More looks, more videos, more fans — she grows more complete and desirable every day." },
    { icon: Users, t: "A loyal fanbase", d: "Build an audience that follows her every single day." },
    { icon: Camera, t: "Daily luxury content", d: "We create high-quality content every single day." },
    { icon: Gem, t: "One of a kind", d: "Fixed name, one owner — nobody else can have her. Yours alone." },
    { icon: BarChart3, t: "Earn from her", d: "Fans pay to chat with her and to super-follow her — you earn from it." },
    { icon: Wand2, t: "One-tap generation", d: "You generate her videos yourself — no prompts, no editing skills." },
  ];

  return (
    <main className="lb-landing min-h-[100dvh] lb-bg text-white">
      <TrackView event="recruit_view" />

      {/* ── Top nav ── */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0b0a]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/own-influencer" className="flex min-w-0 items-center gap-2.5">
            <img src="/lb-logo.png" alt="LuxuryBandit" className="h-9 w-9 shrink-0 rounded-full object-contain" />
            <span className="min-w-0 leading-none">
              <span className="block truncate text-[15px] font-black tracking-wide">LUXURYBANDIT</span>
              {/* Tighter tracking so the full motto fits even at 375px — never cut off. */}
              <span className="block text-[8.5px] font-bold uppercase tracking-[0.12em] text-amber-400/80">The Influencer Marketplace</span>
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-6">
            {NAV.map(n => (
              <Link key={n.label} href={n.href} className="text-[13px] font-bold text-white/70 transition hover:text-white">{n.label}</Link>
            ))}
          </nav>
          {/* Models-first funnel: the header CTA goes straight to the models gallery. */}
          <Link href="/stores?view=models" className="ml-auto shrink-0 rounded-full border border-amber-400 px-4 py-2 text-[13px] font-black text-amber-400 transition hover:bg-amber-400 hover:text-black">
            Models
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10">
          {/* Collectible card — Gina, the flagship, with her live Growth Score */}
          <div className="relative order-1 mx-auto w-full min-w-0 max-w-md">
            {ginaCard && ginaCard.photo ? (
              <ModelCard {...ginaCard} showProfileLink />
            ) : heroPhoto ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={heroPhoto} alt="Your AI influencer" className="aspect-[4/5] w-full rounded-3xl object-cover" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src="/become-a-model-banner.jpg?v=3" alt="Own an AI Influencer on LuxuryBandit" className="w-full rounded-3xl" />
            )}
          </div>
          {/* Copy */}
          <div className="order-2 text-center">
            <h1 className="text-[30px] font-black leading-[0.98] tracking-tight">
              OWN AN<br /><span className="text-amber-400">AI INFLUENCER.</span>
            </h1>
            <p className="mt-3 text-[20px] font-black leading-tight">We&apos;ll help her grow every single day!</p>
            <p className="mx-auto mt-4 max-w-md text-[15px] font-semibold leading-7 text-white/65">
              Own a one-of-a-kind <strong className="text-white">AI influencer</strong> on LuxuryBandit. Generate her videos in one tap, use them anywhere — and her <strong className="text-white">Growth Score</strong> grows every single day.
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

      {/* ── Membership — the ONE price, general benefits for everyone ── */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-b from-amber-400/[0.08] to-transparent p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">Membership · {subLabel}/month</p>
            <h2 className="mt-2 text-[26px] font-black leading-tight">One price.<br />The whole marketplace.</h2>
            <p className="mt-3 max-w-md text-[14px] font-semibold leading-6 text-white/65">Your LuxuryBandit membership unlocks everything — for every influencer here. Cancel anytime.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { icon: "💬", t: "Free unlimited chat", d: "Message any influencer, as much as you like." },
                { icon: "🔒", t: "Every private video", d: "See the private videos of every influencer." },
                { icon: "➕", t: "Super Follow anyone", d: "Back your favorites — they grow in value." },
                { icon: "👑", t: "Buy & own influencers", d: "Turn any influencer into your own asset." },
              ].map(x => (
                <div key={x.t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-2xl leading-none">{x.icon}</p>
                  <p className="mt-2 text-[15px] font-black text-white">{x.t}</p>
                  <p className="mt-0.5 text-[13px] font-semibold leading-snug text-white/55">{x.d}</p>
                </div>
              ))}
            </div>
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
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">The Influencer Marketplace</p>
            <h2 className="mt-2 text-[30px] font-black uppercase leading-none tracking-tight">Who owns her?</h2>
            <p className="mt-3 text-[14px] font-semibold leading-relaxed text-white/70">
              Every AI influencer is one-of-a-kind — and only <span className="font-black text-white">one person</span> can own her: her daily content, her chats, her whole audience. These are <span className="font-black text-amber-400">still free</span>. Claim one before someone else does — or <BuyFormLink className="font-black text-amber-400 underline decoration-amber-400/40 underline-offset-2">create your own</BuyFormLink>.
            </p>
            {models.length >= 1 && <BuyModelGrid models={models.slice(0, 12)} />}
          </div>
        </div>
      </section>

      {/* ── Growth Score: how she grows (NOT a financial value) ── */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-3xl border border-amber-400/25 bg-amber-400/[0.05] p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">Growth Score · she grows every day</p>
            <h2 className="mt-2 text-[26px] font-black leading-tight">We&apos;ll help her grow —<br />with a rising <span className="text-amber-300">Growth Score</span>.</h2>
            <p className="mt-3 text-[14px] font-semibold leading-relaxed text-white/70">
              Every influencer has a <span className="font-black text-amber-300">Growth Score</span> — how popular and developed she is here on LuxuryBandit. Build her out with looks, videos and fans and her score climbs. It&apos;s a mark of how unique and desirable she is — <span className="font-black text-white">not a price, not an investment</span>.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { v: "New looks", d: "exclusive fashion, added for you" },
                { v: "Premium videos", d: "one tap — fans stay engaged" },
                { v: "A fan community", d: "followers, chats & super-fans" },
                { v: "Marketplace fame", d: "featured creators get seen" },
              ].map(x => (
                <div key={x.d} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-[15px] font-black text-amber-300">{x.v}</p>
                  <p className="text-[12px] font-bold text-white/50">{x.d}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] font-bold text-white/40">Fans <span className="font-black text-white/70">Super Follow her for {superFollowLabel}/month</span> to unlock her <span className="font-black text-white/70">private videos</span> — <span className="font-black text-white/70">you earn from it</span>, and every super-follower lifts her <span className="font-black text-amber-300">Growth Score</span>. Mark any video private when you generate it — only Super Followers see it.</p>
            <Link href="/lb-value" className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 px-4 py-2 text-[12px] font-black text-amber-300 transition hover:bg-amber-400/10">How she grows →</Link>
          </div>
        </div>
      </section>

      {/* ── Her wardrobe / content engine ── */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">Her Wardrobe · Your Content Engine</p>
            <h2 className="mt-2 text-[26px] font-black leading-tight">New looks every day —<br />one tap to create.</h2>
            <p className="mt-3 text-[14px] font-semibold leading-relaxed text-white/70">
              The wardrobe&apos;s on us — the videos are yours to make:
            </p>
            <ul className="mt-5 space-y-3">
              {[
                { t: "New clothes every single day", d: "We add fresh outfits to her wardrobe daily." },
                { t: "A curated luxury wardrobe", d: "Only the finest pieces — hand-picked by us. She always wears luxury." },
                { t: "Generate her videos yourself", d: "One tap — we handle the AI. No prompts, no editing skills." },
                { t: "The videos are yours to use", d: "Post them on your own shop, your Facebook or your Instagram." },
                { t: "Every video grows her Growth Score", d: "The more you generate, the more popular and complete she becomes." },
              ].map(p => (
                <li key={p.t} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span>
                    <span className="block text-[14px] font-black text-white">{p.t}</span>
                    <span className="block text-[13px] font-semibold leading-snug text-white/60">{p.d}</span>
                  </span>
                </li>
              ))}
            </ul>
            <WardrobePeek />
            <Link href="/wardrobe" className="mt-6 inline-flex rounded-full border border-white/20 px-5 py-2.5 text-[13px] font-black text-white transition hover:border-amber-400 hover:text-amber-400">
              Browse the wardrobe
            </Link>
          </div>
        </div>
      </section>

      {/* ── Influencer chat (two-way) ── */}
      <section id="chat" className="scroll-mt-24 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">Influencer Chat · Two-Way</p>
            <h2 className="mt-2 text-[26px] font-black leading-tight">Talk to her.<br />She talks to your fans.</h2>
            <p className="mt-3 text-[14px] font-semibold leading-relaxed text-white/70">
              Your influencer is a real chat personality — for you and for her fans.
            </p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-400/15"><MessageCircle className="h-5 w-5 text-amber-400" /></span>
                  <span className="text-[15px] font-black text-white">You → your influencer</span>
                </div>
                <p className="mt-2.5 text-[13px] font-semibold leading-relaxed text-white/65">
                  Message her anytime and tell her your wishes — a new outfit, a campaign, the mood you want. She takes your direction and it shapes her content.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-400/15"><Users className="h-5 w-5 text-amber-400" /></span>
                  <span className="text-[15px] font-black text-white">Your influencer → fans</span>
                </div>
                <p className="mt-2.5 text-[13px] font-semibold leading-relaxed text-white/65">
                  She chats with her fans around the clock — answering, styling, keeping them close — turning attention into premium fan experiences you earn from.
                </p>
              </div>
            </div>
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
              <span className="text-[12px] font-bold text-white/50">Membership</span>
            </div>
            <p className="-mt-1"><span className="text-[48px] font-black leading-none text-amber-400">{subLabel}</span><span className="text-[14px] font-bold text-white/60"> / month</span></p>
            <p className="mt-1 text-[12px] font-bold text-white/45">cancel anytime · your influencer &amp; her videos are yours</p>
            <ul className="mt-4 space-y-1.5 text-[13px] font-bold text-white/70">
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> Buy &amp; own influencers</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> Super Follow anyone</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> See every private video</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /> Free unlimited chat</li>
            </ul>
            <div className="mt-5"><OwnInfluencerCTA /></div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/lb-logo.png" alt="LuxuryBandit" className="h-11 w-11 rounded-full object-contain" />
          <span className="text-[15px] font-black tracking-wide">LUXURYBANDIT</span>
          <p className="text-[12px] font-bold text-white/45">The Influencer Marketplace. Own. Grow. Earn.</p>
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
