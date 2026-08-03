"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Send, Instagram, Youtube, ChevronLeft } from "lucide-react";
import { YOUTUBE_CHANNEL } from "@/lib/social";
import LangSwitch from "@/components/LangSwitch";
import GuthabenChip from "@/components/GuthabenChip";

/**
 * The ONE shared top bar for every page. Left: LB logo + wordmark → home. Right:
 * the CI icons (Share · YouTube · Instagram) by default — pass `actions` to
 * override them (e.g. /stores wires the Search icon to its own search bar).
 *
 * KEIN Hamburger-Menü mehr hier — das Menü lebt appweit UNTEN (BottomNav's
 * Floating-Button). Page-specific chrome (search fields, filter chips, tabs)
 * lives in a SEPARATE row BELOW this bar.
 */
// Ohne „The" (Owner 30.07.2026: „entferne THE"). Neben den drei Symbolen rechts war die
// Zeile zu lang und wurde abgeschnitten — man konnte das Motto nicht lesen.
/**
 * DAS MOTTO (Owner 31.07.2026: „das Motto soll nicht mehr Influencer Marketplace stehen,
 * sondern AI MARKETPLACE").
 *
 * Es steht unter dem Logo auf jeder Seite. „Influencer marketplace" beschrieb das Portal, als
 * es um Models ging; inzwischen macht der Kunde SEIN Video mit SEINEM Foto — das ist keine
 * Vermittlung von Influencerinnen mehr.
 */
const MOTTO = "AI marketplace";

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

  // z-50 statt z-30 (Owner 03.08.2026: „share button ist drüber"): Die Knoepfe AUF den
  // Karten (Teilen, Ton, Loeschen) stehen ebenfalls auf z-30 — als spaetere Elemente im
  // Dokument gewannen sie gegen den klebenden Header und schwebten beim Scrollen ueber
  // Guthaben-Chip und Sprachwahl. 50 liegt ueber allem Seiteninhalt und unter allem, was
  // wirklich darueber gehoert: Menue (60/61), BottomNav (70), Dialoge (80–96).
  return (
    <header data-topnav="1" className="sticky top-0 z-50 border-b border-white/10 bg-[#0d0b0a]/95 backdrop-blur">
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

        {/* Right: the CI icons (or a page override). No menu button — menu is in the bottom nav.
            Die SPRACHWAHL steht NICHT mehr hier: sie hat auf schmalen Geräten das Wortmark
            überlagert und das Motto abgeschnitten (Owner 28.07.2026) — sie sitzt jetzt in
            einer eigenen Zeile unter dem Header. */}
        <div className="flex shrink-0 items-center gap-2">
          {actions ?? (
            <>
              {/* DIE SUCHE IST INS MENUE GEZOGEN (Owner 31.07.2026: „man kann den Namen
                  nicht lesen. Vielleicht die Suche im Menü").
                  Vier Symbole neben dem Wortmark liessen fuer „LUXURYBANDIT" zu wenig Platz —
                  der Name ist das eine, was auf jeder Seite lesbar sein MUSS. Verloren geht
                  nichts: Das Menue fuehrt mit „Models" auf dieselbe Seite, und zwar fuer
                  jeden, nicht nur fuer Personal. */
              }
              <button type="button" onClick={share} className={iconBtn} aria-label="Share">
                <Send className="h-4 w-4" />
              </button>
              {/* Bellas Kanal — neben Instagram, damit er auf JEDER Seite steht und nicht
                  irgendwo einmal. */}
              <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer" className={iconBtn} aria-label="Bella auf YouTube">
                <Youtube className="h-4 w-4" />
              </a>
              <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" className={iconBtn} aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </a>
            </>
          )}
        </div>
      </div>
      {/* Eigene, ruhige Zeile für die Sprache — rechtsbündig, damit Logo und Motto
          darüber ungestört bleiben. */}
      {/* Eigene Zeile, mit Kennzeichnung: In der Anzeigen-Fassung (.lb-fb) rutscht sie per
          CSS UNTER die blaue Leiste (Owner 30.07.2026: „die Sprachen schiebst du mir unter
          dem Header"). Sonst bleibt alles wie bisher. */}
      {/* GUTHABEN LINKS, SPRACHE RECHTS (Owner 03.08.2026: „könnte das Guthaben im Header
          stehen? … mit Icon bitte"). Der Chip zeigt sich nur, wenn wir die Adresse kennen —
          siehe GuthabenChip. `justify-between` statt `justify-end`: ohne Chip rückt die
          Sprache dank des leeren ersten Kinds trotzdem nach rechts. */}
      <div data-langrow="1" className="mx-auto flex max-w-6xl items-center justify-between px-4 pb-2">
        {/* Der Span steht IMMER — rendert der Chip nichts, bleibt er leer, und
            `justify-between` schiebt die Sprache weiter nach rechts wie bisher. */}
        <span><GuthabenChip /></span>
        <LangSwitch />
      </div>
    </header>
  );
}
