import Link from "next/link";
import { ArrowLeft, Sparkles, Heart, Coins, ShoppingBag, MessageCircle, Music } from "lucide-react";

export const metadata = { title: "How it works — LuxuryBandit" };

// Dark "How it works" — written for USERS: see your dream model in any look,
// message her, shop the look. Model recruiting lives on its own landing page
// (/become-a-model) and only gets a teaser here.
export default function AboutPage() {
  const step = "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-400 text-sm font-black text-black";
  const card = "flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4";

  return (
    <main className="min-h-[100dvh] bg-[#0d0b0a] pb-24 text-white">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-[#0d0b0a]/95 px-4 py-3 backdrop-blur">
        <Link href="/stores" aria-label="Back"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-white active:scale-90 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-sm font-black text-white">How it works</p>
      </header>

      <article className="mx-auto max-w-2xl px-5 py-8">
        {/* Hero */}
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">AI Fashion Models · Luxury Looks</p>
        <h1 className="mt-2 text-[28px] font-black leading-tight">
          Your dream model, <span className="text-amber-400">in any look.</span>
        </h1>
        <p className="mt-3 text-[15px] font-semibold leading-7 text-white/60">
          On LuxuryBandit you don&apos;t just scroll past a beautiful model — you decide what she
          wears next. Pick any designer outfit, and the AI creates a runway-quality video of her
          wearing it. Follow her, message her, shop her looks.
        </p>

        {/* 3 steps */}
        <h2 className="mt-9 flex items-center gap-2 text-lg font-black"><Sparkles className="h-5 w-5 text-amber-400" /> In 3 steps</h2>
        <div className="mt-3 grid gap-2.5">
          <div className={card}>
            <span className={step}>1</span>
            <div>
              <p className="text-sm font-black">Find your model</p>
              <p className="mt-0.5 text-[13px] font-semibold leading-6 text-white/55">
                Browse the <strong className="text-white">Models</strong> gallery or spot her in the{" "}
                <strong className="text-white">Fashionshow</strong> feed — then open her profile to
                see all her looks and videos.
              </p>
            </div>
          </div>
          <div className={card}>
            <span className={step}>2</span>
            <div>
              <p className="text-sm font-black">Choose her next look</p>
              <p className="mt-0.5 text-[13px] font-semibold leading-6 text-white/55">
                Tap <em className="not-italic text-amber-400">&ldquo;See her in other looks&rdquo;</em> and
                pick any piece from her wardrobe — then decide what she does:
                a simple turn, or <span className="text-white"><Music className="-mt-0.5 inline h-3.5 w-3.5 text-amber-400" /> dancing with music</span>.
              </p>
            </div>
          </div>
          <div className={card}>
            <span className={step}>3</span>
            <div>
              <p className="text-sm font-black">Watch, like, message, shop</p>
              <p className="mt-0.5 text-[13px] font-semibold leading-6 text-white/55">
                The AI generates her video in about two minutes. Like it, share it, send her a{" "}
                <MessageCircle className="-mt-0.5 inline h-3.5 w-3.5 text-amber-400" /> message —
                and if the piece has a <ShoppingBag className="-mt-0.5 inline h-3.5 w-3.5 text-amber-400" /> shop
                link, buy the real thing in one tap.
              </p>
            </div>
          </div>
        </div>

        {/* Fashionshow */}
        <h2 className="mt-9 text-lg font-black">The Fashionshow</h2>
        <p className="mt-2 text-[14px] font-semibold leading-7 text-white/60">
          The best videos land in the <strong className="text-white">Fashionshow</strong> — our public
          feed. Follow your favorite models and never miss a new look. Every video you create makes
          her page bigger.
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

        {/* Contact */}
        <h2 className="mt-9 text-lg font-black">Contact</h2>
        <p className="mt-2 text-[14px] font-semibold leading-7 text-white/60">
          LuxuryBandit · Timișoara, Romania<br />
          <a href="mailto:support@luxurybandit.com" className="font-black text-amber-400">support@luxurybandit.com</a>
        </p>

        {/* CTA */}
        <div className="mt-10 grid gap-2.5">
          <Link href="/stores"
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
