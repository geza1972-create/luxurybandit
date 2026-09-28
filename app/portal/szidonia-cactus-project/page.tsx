import type { Metadata } from "next";
import { headers } from "next/headers";
import { resolveLang } from "@/lib/lang-server";
import { portalPfade } from "@/lib/lakatosbandi-adressen";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import PortalKopf from "@/components/PortalKopf";
import PortalFuss from "@/components/PortalFuss";
import WasserSeite from "./WasserSeite";
import { TEXTE, type Sprache } from "./texte";

/**
 * WHAT REMAINS WHEN WATER DISAPPEARS? — SZIDONIAS KUNSTPROJEKT (Owner 28.09.2026).
 *
 * Auf lakatosbandi.com/Szidonia-cactus-project (Rewrite in next.config.mjs), lokal
 * /portal/szidonia-cactus-project. TEIL DER SEITE, nicht daneben (Owner: „das muss auf Weiss und
 * in die lakatosbandi.com Webseite integriert werden. Das ist doch ein Kunstprojekt" · „dort
 * haben wir doch 3 Sprachen im Header"): derselbe PortalKopf mit EN/RO/DE, derselbe PortalFuss,
 * weisser Grund wie „Despre". Bilder und Film: siehe `DATEIEN` in WasserSeite.tsx.
 */
export const dynamic = "force-dynamic";

const ADRESSE = "https://lakatosbandi.com/Szidonia-cactus-project";

async function sprache(wunsch?: string): Promise<Sprache> {
  const L = portalSprache(wunsch, await resolveLang("ro"));
  return L === "ro" || L === "de" ? L : "en";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const L = await sprache((await searchParams).lang);
  const T = TEXTE[L];
  return {
    title: T.metaTitel,
    description: T.metaText,
    alternates: {
      canonical: L === "en" ? ADRESSE : `${ADRESSE}?lang=${L}`,
      languages: { en: ADRESSE, ro: `${ADRESSE}?lang=ro`, de: `${ADRESSE}?lang=de` },
    },
    openGraph: {
      title: T.metaTitel,
      description: T.metaText,
      url: ADRESSE,
      siteName: "lakatosbandi.com",
      type: "website",
      images: [{ url: "https://lakatosbandi.com/lakatosbandi/cactus-project/hero.jpg", width: 1672, height: 941, alt: T.heroAlt }],
    },
    twitter: { card: "summary_large_image", title: T.metaTitel, description: T.metaText },
  };
}

export default async function KaktusProjekt({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const L = await sprache((await searchParams).lang);
  const T = portalTexte(L);
  const P = portalPfade((await headers()).get("host"));

  return (
    <div data-lang={L} className="lb-portal lb-kunstprojekt min-h-[100dvh] bg-white text-[#111]">
      <PortalKopf T={T} lang={L} login={P.login} start={P.start} preise={P.preise} journal={P.journal(L)} />
      <WasserSeite sprache={L} />
      <PortalFuss lang={L} />
    </div>
  );
}
