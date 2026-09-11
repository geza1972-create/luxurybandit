import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ARTIKEL, JOURNAL_SPRACHEN, JOURNAL_UI, lesezeit, type JournalSprache } from "@/lib/lakatosbandi-journal";
import { portalPfade, PORTAL_URL } from "@/lib/lakatosbandi-adressen";
import { portalTexte } from "@/lib/lakatosbandi-texte";
import PortalKopf from "@/components/PortalKopf";
import PortalFuss from "@/components/PortalFuss";

/**
 * DIE ÜBERSICHT DES JOURNALS — lakatosbandi.com/journal/<sprache> (Owner 10.09.2026: „und schreiben
 * einige Artikel"). Artikel in lib/lakatosbandi-journal.ts.
 */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };
const gueltig = (l: string): l is JournalSprache => (JOURNAL_SPRACHEN as string[]).includes(l);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!gueltig(lang)) return {};
  const U = JOURNAL_UI[lang];
  return {
    title: `${U.titel} — lakatosbandi.com`,
    description: U.lead,
    alternates: {
      canonical: `${PORTAL_URL}/journal/${lang}`,
      languages: { ...Object.fromEntries(JOURNAL_SPRACHEN.map(l => [l, `${PORTAL_URL}/journal/${l}`])), "x-default": `${PORTAL_URL}/journal/en` },
    },
  };
}

export default async function JournalUebersicht({ params }: Props) {
  const { lang } = await params;
  if (!gueltig(lang)) notFound();
  const U = JOURNAL_UI[lang];
  const T = portalTexte(lang);
  const P = portalPfade((await headers()).get("host"));

  return (
    <div className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      <PortalKopf T={T} lang={lang} login={P.login} start={P.start} journal={P.journal(lang)} sprachLink={l => P.journal(l)} />
      <main className="mx-auto w-full max-w-[1120px] px-5 pb-20 pt-12 md:pt-20">
        <h1 className="m-0 font-serif text-[40px] font-normal leading-[1.1] md:text-[56px]">{U.titel}</h1>
        <p className="mt-4 max-w-[640px] text-[17px] leading-[1.6] text-[#555]">{U.lead}</p>
        <ul className="mt-12 list-none divide-y divide-[#e5e5e5] border-y border-[#e5e5e5] p-0">
          {ARTIKEL.map((a, i) => {
            const t = a.texte[lang];
            return (
              <li key={a.slug}>
                <Link href={P.journal(lang, a.slug)} className="group grid grid-cols-1 gap-2 py-8 text-inherit no-underline md:grid-cols-[60px_1fr_140px] md:gap-6">
                  <span className="font-serif text-[26px] leading-none text-[#bbb]">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block font-serif text-[26px] leading-[1.25] group-hover:underline md:text-[30px]">{t.titel}</span>
                    <span className="mt-2 block max-w-[680px] text-[15.5px] leading-[1.6] text-[#555]">{t.beschreibung}</span>
                  </span>
                  <span className="text-[14px] text-[#888] md:text-right">{lesezeit(t)} {U.minuten}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
      <PortalFuss lang={lang} />
    </div>
  );
}
