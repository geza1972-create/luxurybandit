import { headers } from "next/headers";
import { SPUR } from "@/components/PortalSpur";
import { imPortal } from "@/lib/lakatosbandi-adressen";

/**
 * DER FUSS VON LAKATOSBANDI.COM — Kontakt, Impressum, Datenschutz, AGB (Owner 10.09.2026: „Contact
 * hast du? · Impressum? · AGB?" · „die Inhalte musst du umschreiben auf diesen Seiten").
 *
 * EIGENE RECHTSTEXTE FÜR DAS PORTAL (lib/lakatosbandi-recht.ts): Auf lakatosbandi.com zeigen
 * `/imprint`, `/privacy`, `/terms` per Rewrite die Portal-Fassung; lokal liegen sie unter `/portal/…`.
 * Der Fuß liest den Host selbst, damit keine Seite den Pfad durchreichen muss.
 *
 * DAS KONTAKTFORMULAR ist das des Hauses (`/contact`); von lakatosbandi.com aus geht es an
 * service@versusforge.com (app/api/contact/route.ts).
 *
 * OFFEN (Roadmap): Die Texte hat noch kein Anwalt geprüft.
 */
/* ── PREISE UND JOURNAL GEHÖREN IN DEN FUSS (Owner 18.09.2026: „wo finde ich im Menü die
   Preise? Es ist nicht einmal im Footer") ───────────────────────────────────────────────────
   Im Kopf steht „Preise" erst ab `sm` — auf dem Handy also nirgends. Wer wissen will, was es
   kostet, suchte vergeblich. Der Fuss ist die zweite Stelle, an der jeder nachschaut. */
const WORTE: Record<string, [string, string, string, string, string, string, string]> = {
  en: ["Contact", "Imprint", "Privacy", "Terms", "Pricing", "Journal", "About"],
  ro: ["Contact", "Date legale", "Confidențialitate", "Termeni", "Prețuri", "Jurnal", "Despre"],
  de: ["Kontakt", "Impressum", "Datenschutz", "AGB", "Preise", "Journal", "Über uns"],
};

export default async function PortalFuss({ lang }: { lang: string }) {
  const [kontakt, impressum, datenschutz, agb, preise, journal, ueber] = WORTE[lang] ?? WORTE.en;
  const basis = imPortal((await headers()).get("host")) ? "" : "/portal";
  const links: [string, string][] = [
    [`${basis}/despre?lang=${lang}`, ueber],
    [`${basis}/preise?lang=${lang}`, preise],
    [`${basis}/journal/${lang}`, journal],
    [`/contact?reason=general&lang=${lang}`, kontakt],
    [`${basis}/imprint?lang=${lang}`, impressum],
    [`${basis}/privacy?lang=${lang}`, datenschutz],
    [`${basis}/terms?lang=${lang}`, agb],
  ];
  return (
    <footer className="border-t border-[#e5e5e5] px-5 pb-28 pt-8 md:pb-10">
      <div className={`${SPUR} flex flex-wrap items-center justify-between gap-4 text-[14px] text-[#666]`}>
        <span>© {new Date().getFullYear()} lakatosbandi.com · powered by VersusForge</span>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map(([href, wort]) => (
            <a key={href} href={href} className="text-[#444] no-underline hover:text-[#111] hover:underline">{wort}</a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
