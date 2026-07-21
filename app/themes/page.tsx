import Link from "next/link";
import TopNav from "@/components/TopNav";
import { CloudSun, Sparkles, Flame, MapPin, KeyRound, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Katalog aller „Themen" — jedes Thema liefert täglich Content von einem Model.
// Aktiv: Wetter am Morgen (/themes/wetter/<model>). Weitere sind vorbereitet (coming soon).
export const metadata = {
  title: "Topics — a daily message from your influencer | LuxuryBandit",
  description: "Pick a topic and get daily content from your favorite AI influencer: morning weather, luxury looks, lingerie, city secrets and more.",
  alternates: { canonical: "/themes" },
  openGraph: { title: "LuxuryBandit Topics", description: "Daily content from your favorite influencer — pick a topic." },
};

type Theme = { icon: LucideIcon; title: string; tagline: string; href?: string; badge?: string };

const THEMES: Theme[] = [
  { icon: CloudSun, title: "Morning Weather", tagline: "A message every morning — your weather, a new look, and a chat with her.", href: "/themes/wetter/bella" },
  { icon: Sparkles, title: "Luxury Looks — every day", tagline: "A fresh luxury outfit every day, styled on your favorite influencer." },
  { icon: Flame, title: "Lingerie Looks", tagline: "A daily intimate look — tasteful, private, subscriber-only." },
  { icon: MapPin, title: "City Secrets", tagline: "Learn something new about a city every day — hidden gems and little stories." },
  { icon: KeyRound, title: "Secrets", tagline: "A little secret she shares only with you, every day." },
];

export default function ThemesCatalog() {
  return (
    <main className="lb-bg min-h-[100dvh] text-white">
      <TopNav />

      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-400">LuxuryBandit Topics</p>
        <h1 className="mt-1 text-[30px] font-black leading-tight tracking-tight">
          Pick a topic. <span className="text-amber-400">Get it every day.</span>
        </h1>
        <p className="mt-2 max-w-xl text-[15px] font-semibold leading-relaxed text-white/65">
          Each topic sends you daily content from your favorite influencer — plus a chat with her.
          Right now <span className="font-black text-white">Morning Weather</span> is live; more are on the way.
        </p>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = !!t.href;
            const inner = (
              <>
                <div className="flex items-start gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${active ? "bg-amber-400 text-black" : "bg-white/10 text-white/60"}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[16px] font-black leading-tight">{t.title}</p>
                      {active
                        ? <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-400">Live</span>
                        : <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white/50">Coming soon</span>}
                    </div>
                    <p className="mt-1 text-[13px] font-semibold leading-snug text-white/60">{t.tagline}</p>
                  </div>
                </div>
                {active && (
                  <span className="mt-3 inline-flex items-center gap-1.5 self-start text-[13px] font-black text-amber-400">
                    Open <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </>
            );
            return active ? (
              <Link key={t.title} href={t.href!}
                className="flex flex-col rounded-2xl border border-amber-400/40 bg-amber-400/[0.04] p-4 transition active:scale-[0.99] hover:border-amber-400/70">
                {inner}
              </Link>
            ) : (
              <div key={t.title} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-4 opacity-80">
                {inner}
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-[12px] font-semibold text-white/40">
          Want your own topic as an influencer? <Link href="/curators/apply" className="font-black text-amber-400 underline underline-offset-2">Become a model →</Link>
        </p>
      </div>
    </main>
  );
}
