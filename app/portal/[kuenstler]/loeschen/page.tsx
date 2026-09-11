import type { Metadata } from "next";
import { headers } from "next/headers";
import { mandantOeffentlich } from "@/lib/versusforge-mandanten";
import { istKuenstler, portalPfade } from "@/lib/lakatosbandi";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import PortalKopf from "@/components/PortalKopf";
import PortalFuss from "@/components/PortalFuss";
import PortalLoeschen from "@/components/PortalLoeschen";

/**
 * LAKATOSBANDI.COM/{NAME}/LOESCHEN — der Löschlink aus seinen Mails (Owner 11.09.2026: „nicht auf VersusForge").
 * Ohne Schlüssel oder für einen Eintrag, den es nicht (mehr) gibt, steht nur ein ruhiger Satz da — keine Auskunft,
 * ob es den Künstler gibt.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "lakatosbandi.com", robots: { index: false, follow: false } };

type Props = { params: Promise<{ kuenstler: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function PortalKuenstlerLoeschen({ params, searchParams }: Props) {
  const { kuenstler } = await params;
  const sp = await searchParams;
  const m = await mandantOeffentlich(kuenstler);
  const L = portalSprache(sp.lang, m?.sprache ?? "en");
  const T = portalTexte(L);
  const P = portalPfade((await headers()).get("host"));
  const k = String(sp.k ?? "");

  return (
    <div className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      <PortalKopf T={T} lang={L} login={P.login} start={P.start} journal={P.journal(L)} />
      <main className="mx-auto w-full max-w-[560px] px-5 pb-24 pt-14">
        {m && istKuenstler(m) && k
          ? <PortalLoeschen mandant={kuenstler} k={k} T={T} start={P.start} />
          : <p className="m-0 text-[18px] leading-[1.5]">{T.loeschenOhneLink}</p>}
      </main>
      <PortalFuss lang={L} />
    </div>
  );
}
