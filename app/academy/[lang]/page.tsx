import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArmeeLandingSeite from "@/components/ArmeeLandingSeite";
import { ACADEMY_DOMAIN } from "@/lib/armee-musik";
import { ARMEE_SPRACHEN, DEMO_KUNDE, armeeSpot, armeeTexte } from "@/lib/demo-armee";

/**
 * EINE ADRESSE JE SPRACHE (Owner 04.09.2026: „ich kann einzelne Sprachen nicht sharen. Ich
 * brauche die und rumänisch brauche ich auch") — dasselbe Muster wie
 * `app/recruiting/[lang]/page.tsx`.
 *
 *   yourvideogenerator.com/academy/de
 *   yourvideogenerator.com/academy/ro
 *   yourvideogenerator.com/academy/en
 *
 * WARUM IM PFAD UND NICHT `?lang=ro`: Ein Fragezeichen-Anhängsel überlebt das Weitergeben
 * schlecht — Mail-Programme und Netzwerke kürzen Links in der Vorschau, manche schneiden die
 * Parameter ab, und wer die Adresse von Hand abtippt, lässt sie weg. Was im Pfad steht,
 * bleibt dran.
 *
 * NUR DIE DREI, DIE ES WIRKLICH GIBT: `/academy/fr` ist keine Seite, sondern ein Fehler.
 */

type Params = { params: Promise<{ lang: string }> };

export function generateStaticParams() {
  return ARMEE_SPRACHEN.map(lang => ({ lang }));
}

const gueltig = (lang: string) => (ARMEE_SPRACHEN as readonly string[]).includes(lang);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params;
  if (!gueltig(lang)) return {};
  const T = armeeTexte(lang);
  const bild = `${ACADEMY_DOMAIN}${armeeSpot(lang).poster}`;
  const titel = `${T.claimEins} ${T.claimZwei} — ${DEMO_KUNDE.name}`;
  return {
    title: titel,
    description: T.lpSub,
    openGraph: {
      title: titel, description: T.lpSub, type: "website",
      siteName: DEMO_KUNDE.name, url: `${ACADEMY_DOMAIN}/academy/${lang}`,
      images: [{ url: bild, width: 720, height: 1280 }],
    },
    twitter: { card: "summary_large_image", title: titel, description: T.lpSub, images: [bild] },
    /* Damit Suchmaschinen die drei Fassungen als dieselbe Seite in drei Sprachen lesen und
       nicht als drei konkurrierende Seiten. */
    alternates: {
      canonical: `/academy/${lang}`,
      languages: Object.fromEntries(ARMEE_SPRACHEN.map(l => [l, `/academy/${l}`])),
    },
  };
}

export default async function ArmeeLandingInSprache({ params }: Params) {
  const { lang } = await params;
  if (!gueltig(lang)) notFound();
  return <ArmeeLandingSeite lang={lang} imPfad />;
}
