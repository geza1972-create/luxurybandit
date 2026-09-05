import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArmeeFunnel from "@/components/ArmeeFunnel";
import ImmerOben from "@/components/ImmerOben";
import { ACADEMY_DOMAIN } from "@/lib/armee-musik";
import { ARMEE_DEMO_HINWEIS, ARMEE_SPRACHEN, DEMO_KUNDE, armeeSpot, armeeSprache, armeeTexte, demoSzenen } from "@/lib/demo-armee";

/**
 * DER TRICHTER MIT FESTER SPRACHE IM PFAD — dasselbe Muster wie
 * `app/academy/[lang]/page.tsx` und `app/recruiting/[lang]/page.tsx`.
 *
 * Ein Link, der direkt in den Trichter führt (statt über die Landingpage), soll genauso
 * zuverlässig in der richtigen Sprache ankommen wie die Landingpage selbst — unabhängig vom
 * Cookie oder Browser dessen, der ihn öffnet.
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
  return {
    title: `${T.claimEins} ${T.claimZwei} — ${DEMO_KUNDE.name}`,
    description: `${T.claimDrei} ${T.lpSub}`,
    openGraph: {
      title: `${T.claimEins} ${T.claimZwei} — ${DEMO_KUNDE.name}`, description: `${T.claimDrei} ${T.lpSub}`,
      type: "website", siteName: DEMO_KUNDE.name, url: `${ACADEMY_DOMAIN}/academy/${lang}/start`,
      images: [{ url: bild, width: 720, height: 1280 }],
    },
    twitter: {
      card: "summary_large_image", title: `${T.claimEins} ${T.claimZwei} — ${DEMO_KUNDE.name}`,
      description: `${T.claimDrei} ${T.lpSub}`, images: [bild],
    },
  };
}

export default async function ArmeeStartInSprache({ params }: Params) {
  const { lang } = await params;
  if (!gueltig(lang)) notFound();
  return (
    <main className="lb-bg min-h-screen text-white">
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <ImmerOben />
        <ArmeeFunnel szenen={demoSzenen(lang)} texte={armeeTexte(lang)}
          hinweis={ARMEE_DEMO_HINWEIS[armeeSprache(lang)]}
          kampagne={{
            theme: "armee", videoApi: "/api/armee-video", musik: "academy",
            domain: ACADEMY_DOMAIN, ansichtBasis: "/academy/v", zurueckHref: `/academy/${lang}`,
          }} />
      </div>
    </main>
  );
}
