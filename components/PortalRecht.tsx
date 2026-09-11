import { headers } from "next/headers";
import { resolveLang } from "@/lib/lang-server";
import { portalPfade } from "@/lib/lakatosbandi-adressen";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import { rechtTexte, type RechtTexte } from "@/lib/lakatosbandi-recht";
import { eur, VERSUSFORGE_ABO_CENTS } from "@/lib/pricing";
import PortalKopf from "@/components/PortalKopf";
import PortalFuss from "@/components/PortalFuss";

/**
 * EINE RECHTSSEITE VON LAKATOSBANDI.COM im Stil des Portals — Impressum, Datenschutz oder AGB.
 * Texte und Begründung in lib/lakatosbandi-recht.ts. Sprache über `?lang=`, Englisch zuerst.
 */
export default async function PortalRecht({ welche, lang: wunsch }: { welche: keyof Pick<RechtTexte, "impressum" | "datenschutz" | "agb">; lang?: string }) {
  const L = portalSprache(wunsch, await resolveLang("en"));
  const R = rechtTexte(L);
  const S = R[welche];
  const T = portalTexte(L);
  const P = portalPfade((await headers()).get("host"));
  const preis = eur(VERSUSFORGE_ABO_CENTS, L);

  return (
    <div className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      <PortalKopf T={T} lang={L} login={P.login} start={P.start} journal={P.journal(L)} />
      <main className="mx-auto w-full max-w-[760px] px-5 pb-16 pt-12 md:pt-16">
        <h1 className="m-0 font-serif text-[36px] font-normal leading-[1.15] md:text-[48px]">{S.titel}</h1>
        {S.intro ? <p className="mt-5 text-[17px] leading-[1.65] text-[#444]">{S.intro}</p> : null}
        {S.abschnitte.map((a, i) => (
          <section key={i} className="mt-10">
            <h2 className="m-0 text-[20px] font-semibold leading-[1.3]">{a.h}</h2>
            {a.p.map((absatz, k) => (
              <p key={k} className="mt-3 text-[16px] leading-[1.7] text-[#333]">{absatz.replace(/\{[^}]*\}/, preis)}</p>
            ))}
          </section>
        ))}
        <p className="mt-10">
          <a href={`/contact?reason=general&lang=${L}`} className="text-[16px] font-semibold text-[#111] underline">{R.kontaktWort}</a>
        </p>
        <p className="mt-10 border-t border-[#e5e5e5] pt-6 text-[14px] leading-[1.6] text-[#777]">{R.sprachHinweis}</p>
        <p className="mt-2 text-[13px] text-[#999]">{R.stand}</p>
      </main>
      <PortalFuss lang={L} />
    </div>
  );
}
