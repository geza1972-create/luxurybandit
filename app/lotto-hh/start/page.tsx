import type { Metadata } from "next";
import ArmeeFunnel from "@/components/ArmeeFunnel";
import ImmerOben from "@/components/ImmerOben";
import { KAMPAGNEN } from "@/lib/kampagnen";

/**
 * DER TRICHTER VON LOTTO HAMBURG — dieselbe Bauart wie `app/academy/start/page.tsx`, nur
 * mit dem Wortschatz und den Szenen aus `lib/kampagnen.ts` statt aus `lib/demo-armee.ts`.
 * `ArmeeFunnel` bleibt derselbe geprüfte Baustein; nur das `kampagne`-Prop sagt ihm, wohin
 * er gehört (Thema, Erzeugungsroute, Soundtrack, Domain, Rückweg).
 */

const K = KAMPAGNEN["lotto-hh"];

export const metadata: Metadata = {
  title: `${K.texte.claimEins} ${K.texte.claimZwei} — ${K.marke}`,
  description: `${K.texte.claimDrei} ${K.texte.lpSub}`,
  openGraph: {
    title: `${K.texte.claimEins} ${K.texte.claimZwei} — ${K.marke}`,
    description: `${K.texte.claimDrei} ${K.texte.lpSub}`,
    type: "website", siteName: K.marke, url: `${K.domain}/${K.slug}/start`,
    images: [{ url: `${K.domain}${K.spot.poster}`, width: 720, height: 1280 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${K.texte.claimEins} ${K.texte.claimZwei} — ${K.marke}`,
    description: `${K.texte.claimDrei} ${K.texte.lpSub}`,
    images: [`${K.domain}${K.spot.poster}`],
  },
};

export default function LottoHhStartSeite() {
  return (
    <main className="lb-bg min-h-screen text-white">
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <ImmerOben />
        <ArmeeFunnel
          szenen={K.szenen} texte={K.texte}
          kampagne={{
            theme: K.slug, videoApi: `/api/kampagne/${K.slug}/video`, musik: "academy",
            domain: K.domain, ansichtBasis: `/${K.slug}/v`, zurueckHref: `/${K.slug}`,
          }}
        />
      </div>
    </main>
  );
}
