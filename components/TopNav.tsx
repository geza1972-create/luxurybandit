"use client";

import { useRouter } from "next/navigation";

/**
 * The ONE shared top bar for every page. Left: LB logo + wordmark → home (root
 * landing). Right: optional page-specific action icons (search/share/…).
 *
 * KEIN Hamburger-Menü mehr hier — das Menü lebt appweit UNTEN (BottomNav's
 * Floating-Button). So gibt es nie zwei Menüs. Page-specific chrome (search
 * fields, filter chips, tabs) lives in a SEPARATE row BELOW this bar.
 */
export default function TopNav({
  subtitle = "The influencer marketplace",
  actions,
}: {
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <header data-topnav="1" className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0b0a]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        {/* Brand → the "Own an AI Influencer" landing. Target its real route (not "/")
            so client-side nav lands there directly, instead of falling through the old
            root→/stores redirect chain (which, for admins, ends on /admin/stores). */}
        <button type="button" onClick={() => router.push("/stores?view=models")} aria-label="Home"
          className="flex min-w-0 items-center gap-2 active:opacity-70 transition-opacity">
          <span className="relative h-9 w-9 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lb-logo.png" alt="LuxuryBandit" className="h-9 w-9 rounded-full object-contain"
              onError={(e) => { e.currentTarget.style.display = "none"; const f = e.currentTarget.nextElementSibling as HTMLElement | null; if (f) f.style.display = "flex"; }} />
            <span style={{ display: "none" }} className="absolute inset-0 items-center justify-center rounded-full bg-black text-xs font-black tracking-tight text-white select-none">LB</span>
          </span>
          <span className="min-w-0 text-left">
            <span className="block whitespace-nowrap text-sm font-black uppercase leading-none tracking-widest text-white">LuxuryBandit</span>
            {subtitle ? <span className="mt-0.5 block truncate text-[10px] font-black uppercase leading-tight tracking-[0.14em] text-[#c9a23f]/80">{subtitle}</span> : null}
          </span>
        </button>

        {/* Right: optional page actions only — no menu button (menu is in the bottom nav). */}
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
