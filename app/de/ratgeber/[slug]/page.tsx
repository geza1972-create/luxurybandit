import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RatgeberSeite from "@/components/RatgeberSeite";
import { ratgeber, alleRatgeber, mitPreis, ratgeberUrl } from "@/lib/ratgeber";

/**
 * DIE DEUTSCHE RATGEBER-ADRESSE — `/de/ratgeber/<slug>`.
 *
 * WARUM EIN SPRACH-SEGMENT IN DER ADRESSE, wo das ganze Haus sonst ohne auskommt: Der Rest
 * des Portals uebersetzt zur LAUFZEIT auf derselben Adresse. Das ist fuer Besucher richtig
 * und fuer Suchmaschinen unbrauchbar — Googlebot ruft mit englischen Kopfzeilen ab und
 * indexiert genau eine Fassung je Adresse (gemessen am 27.08.2026). Ein Ratgeber, der
 * gefunden werden soll, braucht deshalb eine Adresse, die IMMER dieselbe Sprache liefert.
 *
 * `generateStaticParams` + `dynamic = "force-static"`: Die Seite haengt an nichts, was sich
 * je Abruf aendert. Byte-gleiche Auslieferung ist hier keine Optimierung, sondern die
 * Bedingung dafuer, dass Google eine stabile Fassung sieht.
 */

export const dynamic = "force-static";

export function generateStaticParams() {
  return alleRatgeber("de").map(a => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = ratgeber("de", slug);
  if (!a) return {};
  const beschreibung = mitPreis(a.beschreibung, "de");
  return {
    title: `${a.titel} | LuxuryBandit`,
    description: beschreibung,
    alternates: {
      canonical: ratgeberUrl("de", a.slug),
      /* DAS SPRACHPAAR — ohne `hreflang` haelt Google die zwei Fassungen fuer zwei
         konkurrierende Seiten und waehlt eine davon aus. `x-default` zeigt auf die
         deutsche, weil der groessere Markt dort liegt. */
      languages: {
        de: ratgeberUrl("de", a.slug),
        ro: ratgeberUrl("ro", a.paar),
        "x-default": ratgeberUrl("de", a.slug),
      },
    },
    openGraph: { title: a.titel, description: beschreibung, type: "article", locale: "de_DE" },
  };
}

export default async function Seite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artikel = ratgeber("de", slug);
  if (!artikel) notFound();
  return <RatgeberSeite lang="de" artikel={artikel} />;
}
