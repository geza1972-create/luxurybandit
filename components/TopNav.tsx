"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Send, Instagram, ChevronLeft } from "lucide-react";
import LangSwitch from "@/components/LangSwitch";

/**
 * The ONE shared top bar for every page. Left: LB logo + wordmark → home. Right:
 * the 3 CI icons (Search · Share · Instagram) by default — pass `actions` to
 * override them (e.g. /stores wires the Search icon to its own search bar).
 *
 * KEIN Hamburger-Menü mehr hier — das Menü lebt appweit UNTEN (BottomNav's
 * Floating-Button). Page-specific chrome (search fields, filter chips, tabs)
 * lives in a SEPARATE row BELOW this bar.
 */
const MOTTO = "The influencer marketplace";

export default function TopNav({
  subtitle,
  actions,
  back = true,
}: {
  subtitle?: string;
  actions?: React.ReactNode;          // override the default 3 CI icons
  back?: boolean;                     // Zurück-Pfeil (an, außer man setzt back={false})
}) {
  const router = useRouter();
  // ZURÜCK: Regel im Haus — jede Seite braucht einen sichtbaren Rückweg. Auf den Browser-
  // Button ist kein Verlass (In-App-Browser von Instagram/Facebook haben oft keinen).
  // Nur zeigen, wenn es auch etwas zum Zurückgehen gibt (Direktaufruf hat keine Historie).
  const [canBack, setCanBack] = useState(false);
  useEffect(() => { try { setCanBack(window.history.length > 1); } catch { /**/ } }, []);
  const ig = process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE ?? "luxurybandit";
  const share = () => {
    try {
      const url = window.location.href;
      if (typeof navigator !== "undefined" && navigator.share) { navigator.share({ title: "LuxuryBandit", url }).catch(() => {}); }
      else { navigator.clipboard?.writeText(url).catch(() => {}); }
    } catch { /**/ }
  };
  const iconBtn = "flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:text-white";

  return (
    <header data-topnav="1" className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0b0a]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        {back && canBack && (
          <button type="button" onClick={() => router.back()} aria-label="Back"
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 active:scale-90 transition hover:text-white">
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {/* Brand → STARTSEITE = die Themen (/themes). Direkt die echte Route, nicht "/",
            damit die Client-Navigation nicht erst über den Redirect läuft. */}
        <button type="button" onClick={() => router.push("/themes")} aria-label="Home"
          className="flex min-w-0 items-center gap-2 active:opacity-70 transition-opacity">
          <span className="relative h-9 w-9 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lb-logo.png" alt="LuxuryBandit" className="h-9 w-9 rounded-full object-contain"
              onError={(e) => { e.currentTarget.style.display = "none"; const f = e.currentTarget.nextElementSibling as HTMLElement | null; if (f) f.style.display = "flex"; }} />
            <span style={{ display: "none" }} className="absolute inset-0 items-center justify-center rounded-full bg-black text-xs font-black tracking-tight text-white select-none">LB</span>
          </span>
          <span className="min-w-0 text-left">
            <span className="block whitespace-nowrap text-sm font-black uppercase leading-none tracking-widest text-white">LuxuryBandit</span>
            {/* Das MOTTO steht IMMER unter dem Wortmark (Owner-Regel) — ein Seitenname
                kommt allenfalls dahinter, ersetzt es aber nie. */}
            <span className="mt-0.5 block truncate text-[9px] font-black uppercase leading-tight tracking-[0.08em] text-[#f6cf51] sm:text-[10px] sm:tracking-[0.14em]">
              {MOTTO}
            </span>
          </span>
        </button>

        {/* Right: the 3 CI icons (or a page override). No menu button — menu is in the bottom nav.
            Die SPRACHWAHL steht NICHT mehr hier: sie hat auf schmalen Geräten das Wortmark
            überlagert und das Motto abgeschnitten (Owner 28.07.2026) — sie sitzt jetzt in
            einer eigenen Zeile unter dem Header. */}
        <div className="flex shrink-0 items-center gap-2">
          {actions ?? (
            <>
              <button type="button" onClick={() => router.push("/stores?view=grid")} className={iconBtn} aria-label="Search">
                <Search className="h-4 w-4" />
              </button>
              <button type="button" onClick={share} className={iconBtn} aria-label="Share">
                <Send className="h-4 w-4" />
              </button>
              <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" className={iconBtn} aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </a>
            </>
          )}
        </div>
      </div>
      {/* Eigene, ruhige Zeile für die Sprache — rechtsbündig, damit Logo und Motto
          darüber ungestört bleiben. */}
      <div className="mx-auto flex max-w-6xl justify-end px-4 pb-2">
        <LangSwitch />
      </div>
    </header>
  );
}
