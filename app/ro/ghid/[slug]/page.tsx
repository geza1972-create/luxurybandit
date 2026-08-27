import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RatgeberSeite from "@/components/RatgeberSeite";
import { ratgeber, alleRatgeber, mitPreis, ratgeberUrl } from "@/lib/ratgeber";

/**
 * DIE RUMAENISCHE RATGEBER-ADRESSE — `/ro/ghid/<slug>`. Spiegel zu `app/de/ratgeber/[slug]`;
 * die Begruendung fuer das Sprach-Segment steht dort.
 *
 * Der Pfad heisst „ghid", nicht „ratgeber": Eine Adresse, die der Leser lesen kann, ist Teil
 * des Ergebnisses in der Trefferliste.
 */

export const dynamic = "force-static";

export function generateStaticParams() {
  return alleRatgeber("ro").map(a => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = ratgeber("ro", slug);
  if (!a) return {};
  const beschreibung = mitPreis(a.beschreibung, "ro");
  return {
    title: `${a.titel} | LuxuryBandit`,
    description: beschreibung,
    alternates: {
      canonical: ratgeberUrl("ro", a.slug),
      languages: {
        ro: ratgeberUrl("ro", a.slug),
        de: ratgeberUrl("de", a.paar),
        "x-default": ratgeberUrl("de", a.paar),
      },
    },
    openGraph: { title: a.titel, description: beschreibung, type: "article", locale: "ro_RO" },
  };
}

export default async function Seite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artikel = ratgeber("ro", slug);
  if (!artikel) notFound();
  return <RatgeberSeite lang="ro" artikel={artikel} />;
}
