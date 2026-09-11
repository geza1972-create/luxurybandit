import { headers } from "next/headers";
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
const WORTE: Record<string, [string, string, string, string]> = {
  en: ["Contact", "Imprint", "Privacy", "Terms"],
  ro: ["Contact", "Date legale", "Confidențialitate", "Termeni"],
  de: ["Kontakt", "Impressum", "Datenschutz", "AGB"],
};

export default async function PortalFuss({ lang }: { lang: string }) {
  const [kontakt, impressum, datenschutz, agb] = WORTE[lang] ?? WORTE.en;
  const basis = imPortal((await headers()).get("host")) ? "" : "/portal";
  const links: [string, string][] = [
    [`/contact?reason=general&lang=${lang}`, kontakt],
    [`${basis}/imprint?lang=${lang}`, impressum],
    [`${basis}/privacy?lang=${lang}`, datenschutz],
    [`${basis}/terms?lang=${lang}`, agb],
  ];
  return (
    <footer className="border-t border-[#e5e5e5] px-5 pb-28 pt-8 md:pb-10">
      <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-4 text-[14px] text-[#666]">
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
