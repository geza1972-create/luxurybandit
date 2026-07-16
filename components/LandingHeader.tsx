import Link from "next/link";

// THE shared landing-page header (our CI for landing pages) — the same top nav used on
// /own-influencer. Logo → home, the standard nav links, and the Models CTA. Sticky.
const NAV = [
  { label: "For Creators", href: "/own-influencer#creators" },
  { label: "Marketplace", href: "/stores?view=grid" },
  { label: "Models", href: "/stores?view=models" },
  { label: "Login", href: "/login" },
];

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0b0a]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/own-influencer" className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lb-logo.png" alt="LuxuryBandit" className="h-9 w-9 shrink-0 rounded-full object-contain" />
          <span className="min-w-0 leading-none">
            <span className="block truncate text-[15px] font-black tracking-wide">LUXURYBANDIT</span>
            <span className="block text-[8.5px] font-bold uppercase tracking-[0.12em] text-amber-400/80">The Influencer Marketplace</span>
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-6 md:flex">
          {NAV.map(n => (
            <Link key={n.label} href={n.href} className="text-[13px] font-bold text-white/70 transition hover:text-white">{n.label}</Link>
          ))}
        </nav>
        <Link href="/stores?view=models" className="ml-auto shrink-0 rounded-full border border-amber-400 px-4 py-2 text-[13px] font-black text-amber-400 transition hover:bg-amber-400 hover:text-black md:ml-0">
          Models
        </Link>
      </div>
    </header>
  );
}
