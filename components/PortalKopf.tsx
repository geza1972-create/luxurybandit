import Link from "next/link";
import type { PortalTexte } from "@/lib/lakatosbandi-texte";
import { PORTAL_SPRACHEN } from "@/lib/lakatosbandi-texte";

/**
 * DER KOPF VON LAKATOSBANDI.COM — Name, Unterzeile, Journal, Sprachen, Login für Künstler.
 *
 * Kein Haus-Logo und kein VersusForge-Gold: Das Portal ist der Ort für Künstler und Käufer,
 * VersusForge das Werkzeug dahinter (ROADMAP-ART.md, Teil 9).
 *
 * SPRACHE: Auf den meisten Portal-Seiten wechselt sie über `?lang=`. Das Journal hat die Sprache
 * im Pfad (`/journal/ro/…`, für Google) — dort reicht die Seite `sprachLink` herein, damit der
 * Umschalter auf dieselbe Seite in der anderen Sprache führt.
 */
export default function PortalKopf({ T, lang, login, start, journal, sprachLink }: {
  T: PortalTexte;
  lang: string;
  login: string;
  start: string;
  /** Link zum Journal in dieser Sprache. */
  journal?: string;
  /** Für Seiten mit Sprache im Pfad: die Adresse derselben Seite in Sprache `l`. */
  sprachLink?: (l: string) => string;
}) {
  return (
    <header className="border-b border-[#e5e5e5] px-5 py-4">
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4">
        <Link href={`${start}${lang === "en" ? "" : `?lang=${lang}`}`} className="text-[#111] no-underline">
          {/* DAS ZEICHEN (Owner 11.09.2026: „Schreib es wie VersusForge, aber schwarz-grau") — fett, eng, zweifarbig, mit Punkt. */}
          <span className="block text-[21px] font-black leading-none tracking-[-0.03em] text-[#111]">lakatos<span className="text-[#8a8a8a]">bandi.com</span></span>
          <span className="mt-1 block text-[10.5px] font-semibold uppercase leading-none tracking-[0.2em] text-[#777]">{T.unter}</span>
        </Link>
        <nav className="flex items-center gap-2.5 text-[13px] sm:gap-4 sm:text-[14px]">
          {journal && (
            <Link href={journal} className="hidden font-semibold text-[#111] no-underline hover:underline sm:inline">Journal</Link>
          )}
          {PORTAL_SPRACHEN.map(l => (
            <a key={l} href={sprachLink ? sprachLink(l) : `?lang=${l}`} aria-current={l === lang ? "true" : undefined}
              className={l === lang ? "font-bold text-[#111] no-underline" : "text-[#777] no-underline hover:text-[#111]"}>
              {l.toUpperCase()}
            </a>
          ))}
          {/* Einzeilig auch auf dem Handy — „Autentificare artist" brach sonst in zwei Zeilen. */}
          <Link href={`${login}?lang=${lang}`} className="whitespace-nowrap border border-[#111] px-2.5 py-1.5 text-[12.5px] font-semibold text-[#111] no-underline hover:bg-[#111] hover:text-white sm:px-3 sm:text-[14px]">
            {T.anmelden}
          </Link>
        </nav>
      </div>
    </header>
  );
}
