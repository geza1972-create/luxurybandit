import type { Metadata } from "next";
import { headers } from "next/headers";
import { resolveLang } from "@/lib/lang-server";
import { portalPfade } from "@/lib/lakatosbandi";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import PortalKopf from "@/components/PortalKopf";
import PortalLogin from "@/components/PortalLogin";
import PortalFuss from "@/components/PortalFuss";

/**
 * DER LOGIN FÜR KÜNSTLER: LAKATOSBANDI.COM/LOGIN (Owner 10.09.2026: „einen Login müssen sie auch
 * haben fürs Dashboard").
 *
 * OHNE PASSWORT, WIE IM REST DES HAUSES: E-Mail eingeben → Mail mit dem Link zu seinem Dashboard.
 * Ein Passwort, das man einmal setzt und in vier Wochen vergisst, wäre für ihn ein Hindernis und
 * für uns ein zweiter Ort, an dem etwas schiefgehen kann (Begründung in
 * components/MandantZugang.tsx). Der Link aus der Anmelde-Mail funktioniert weiter.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Artist login — lakatosbandi.com",
  robots: { index: false, follow: false },
};

export default async function PortalLoginSeite({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const L = portalSprache(sp.lang, await resolveLang("en"));
  const T = portalTexte(L);
  const P = portalPfade((await headers()).get("host"));
  return (
    <div className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      <PortalKopf T={T} lang={L} login={P.login} start={P.start} journal={P.journal(L)} />
      <main className="mx-auto w-full max-w-[440px] px-5 pb-20 pt-14">
        <h1 className="m-0 font-serif text-[34px] font-normal leading-[1.15]">{T.loginTitel}</h1>
        <p className="mt-3 text-[16px] leading-[1.55] text-[#555]">{T.loginText}</p>
        <PortalLogin lang={L} feld={T.loginFeld} knopf={T.loginKnopf} gesendet={T.loginGesendet} fehler={T.loginFehler} />
      </main>
      <PortalFuss lang={L} />
    </div>
  );
}
