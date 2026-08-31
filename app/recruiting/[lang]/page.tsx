import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { recruitingTexte, RECRUITING_SPRACHEN } from "@/lib/recruiting-i18n";
import RecruitingSeite from "@/components/RecruitingSeite";

/**
 * EINE ADRESSE JE SPRACHE (Owner 31.08.2026: „ich brauche unterschiedliche URLs für die
 * Sprachen, weil ich diese weitergebe").
 *
 *   luxurybandit.com/recruiting/de
 *   luxurybandit.com/recruiting/ro
 *   luxurybandit.com/recruiting/en
 *
 * WARUM IM PFAD UND NICHT `?lang=ro`: Ein Fragezeichen-Anhängsel überlebt das Weitergeben
 * schlecht — Mail-Programme und Netzwerke kürzen Links in der Vorschau, manche schneiden die
 * Parameter ab, und wer die Adresse von Hand abtippt, lässt sie weg. Was im Pfad steht,
 * bleibt dran. Ausserdem sieht der Empfänger vor dem Klick, was ihn erwartet.
 *
 * NUR DIE DREI, DIE ES WIRKLICH GIBT: `/recruiting/fr` ist keine Seite, sondern ein Fehler.
 * Eine erfundene Sprachadresse, die klaglos Englisch ausliefert, verschickt man einmal und
 * merkt es nie.
 */

type Params = { params: Promise<{ lang: string }> };

/* Die drei Adressen werden beim Bauen erzeugt — sie sind statisch, es gibt nichts zu raten. */
export function generateStaticParams() {
  return RECRUITING_SPRACHEN.map(lang => ({ lang }));
}

const gueltig = (lang: string) => (RECRUITING_SPRACHEN as string[]).includes(lang);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params;
  if (!gueltig(lang)) return {};
  const T = recruitingTexte(lang);
  return {
    title: `LB Recruiting — ${T.positionierung}`,
    description: T.lead,
    /* Damit Suchmaschinen die drei Fassungen als dieselbe Seite in drei Sprachen lesen und
       nicht als drei konkurrierende Seiten. */
    alternates: {
      canonical: `/recruiting/${lang}`,
      languages: Object.fromEntries(RECRUITING_SPRACHEN.map(l => [l, `/recruiting/${l}`])),
    },
  };
}

export default async function RecruitingInSprache({ params }: Params) {
  const { lang } = await params;
  if (!gueltig(lang)) notFound();
  return <RecruitingSeite lang={lang} imPfad />;
}
