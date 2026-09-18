import Link from "next/link";
import type { PortalTexte } from "@/lib/lakatosbandi-texte";
import { PORTAL_SPRACHEN } from "@/lib/lakatosbandi-texte";
import PortalMenue from "@/components/PortalMenue";
import ArtistFair from "@/components/ArtistFair";

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
export default function PortalKopf({ T, lang, login, start, preise, journal, sprachLink }: {
  T: PortalTexte;
  lang: string;
  login: string;
  start: string;
  /** Die Preisseite. Fehlt sie, bleibt der Menüpunkt weg — kein Link ins Leere. */
  preise?: string;
  /** Link zum Journal in dieser Sprache. */
  journal?: string;
  /** Für Seiten mit Sprache im Pfad: die Adresse derselben Seite in Sprache `l`. */
  sprachLink?: (l: string) => string;
}) {
  return (
    <header className="border-b border-[#e5e5e5] px-5 py-4">
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-2 sm:gap-4">
        {/* ── EUER BILD NEBEN DEM LOGO (Owner 14.09.2026: „bild von uns im kreis neben dran" ·
            „auf der webseite ebenso") — dasselbe Foto wie im Trichter, damit beide Seiten
            denselben ersten Eindruck machen: zwei Menschen, keine Firma.

            BEIDE IN EINEM RAHMEN, nicht als zwei Kinder des `justify-between`: Sonst rutschen
            Bild und Logo an die gegenüberliegenden Ränder — derselbe Fehler, der im Trichter
            schon einmal passiert ist (Owner 11.09.2026: „muss an dem Logo hängen"). */}
        <span className="flex min-w-0 shrink items-center gap-3">
          {/* ── DAS SIEGEL STATT DES FOTOS (Owner 18.09.2026: „auf unserer Seite machst du gross
              im header den Stempel auch" · „statt unser Logo") ─────────────────────────────────
              Hier stand unser Foto (Owner 14.09.2026: „Bild von uns im Kreis nebendran"). Seit es
              „Artist Fair" gibt, ist das Zeichen wichtiger als unsere Gesichter: Wer die Seite
              zum ersten Mal öffnet, soll in der ersten Sekunde sehen, wofür sie steht. Das Foto
              bleibt im Trichter und auf der Über-uns-Seite. */}
          {/* Auf dem Handy bleibt er weg (Owner 18.09.2026: „mach den Stempel raus im mobile") —
              dort drängen Name, Menü, drei Sprachen und Login auf 375 px, und der Name wurde zu
              „lakatosba…". Ab `sm` steht das Zeichen wieder da. */}
          <ArtistFair groesse={0} klasse="hidden h-14 w-14 shrink-0 text-[#111] sm:block" />
        <Link href={`${start}${lang === "en" ? "" : `?lang=${lang}`}`} className="min-w-0 shrink text-[#111] no-underline">
          {/* DAS ZEICHEN (Owner 11.09.2026: „lakatosbandi.com ist besser als lakatosbandi." · „Logo alles schwarz
              bitte") — fett, eng, ganz schwarz, mit „.com". Auf dem Handy kleiner (18px statt 21px), sonst sprengt
              es mit dem längeren Namen den Kopf (Owner 11.09.2026: Menü rechts wurde abgeschnitten). */}
          <span className="block truncate text-[18px] font-black leading-none tracking-[-0.03em] text-[#111] sm:text-[21px]">lakatosbandi.com</span>
          <span className="mt-1 hidden text-[10.5px] font-semibold uppercase leading-none tracking-[0.2em] text-[#777] sm:block">{T.unter}</span>
        </Link>
        </span>
        <nav className="flex shrink-0 items-center gap-2 text-[13px] sm:gap-4 sm:text-[14px]">
          {/* PREISE VOR JOURNAL (Owner 14.09.2026: „hier braucht man eigentlich ein Menü für
              Preise") — wer wissen will, was es kostet, soll nicht suchen. Wie Journal erst ab
              `sm`: Auf dem Handy ist der Kopf mit Logo, Sprachen und Login bereits voll. */}
          {/* ── EIN ICON STATT DREI WÖRTER (Owner 18.09.2026: „mach doch ein Icon im Menü oben") ──
              Preise und Journal standen als Text im Kopf und verschwanden auf dem Handy — genau
              dort hat er die Preise gesucht. Jetzt liegen sie unter dem Strich-Symbol, zusammen
              mit „Über uns" und „Kontakt". Sprachen und Login bleiben draussen. */}
          <PortalMenue label={T.preiseWort} eintraege={[
            ...(preise ? [{ href: `${preise}?lang=${lang}`, wort: T.preiseWort }] : []),
            ...(journal ? [{ href: journal, wort: "Journal" }] : []),
            { href: `${start === "/" ? "" : "/portal"}/despre?lang=${lang}`, wort: T.ueberUnsWort },
            { href: `/contact?reason=general&lang=${lang}`, wort: T.kontaktWort },
          ]} />
          {PORTAL_SPRACHEN.map(l => (
            <a key={l} href={sprachLink ? sprachLink(l) : `?lang=${l}`} aria-current={l === lang ? "true" : undefined}
              className={l === lang ? "font-bold text-[#111] no-underline" : "text-[#777] no-underline hover:text-[#111]"}>
              {l.toUpperCase()}
            </a>
          ))}
          {/* Einzeilig auch auf dem Handy — kurzer Text dort, „Autentificare artist" nur ab sm (Owner 11.09.2026). */}
          <Link href={`${login}?lang=${lang}`} className="whitespace-nowrap border border-[#111] px-2 py-1.5 text-[12px] font-semibold text-[#111] no-underline hover:bg-[#111] hover:text-white sm:px-3 sm:text-[14px]">
            <span className="sm:hidden">{T.anmeldenKurz}</span>
            <span className="hidden sm:inline">{T.anmelden}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
