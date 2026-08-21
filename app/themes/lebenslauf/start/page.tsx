import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import LebenslaufStartClient from "./LebenslaufStartClient";

/**
 * DIE TUNNEL-SEITE DES LEBENSLAUF-PORTALS — genau das Muster aus
 * `app/themes/wedding/start/page.tsx` (KONZEPT-TUNNEL.md).
 *
 * DIE AD-ADRESSEN:
 *   dunkel  /themes/lebenslauf/start
 *   hell    /themes/lebenslauf/start?light=1
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Luxury Video Bewerbung — für Top Jobs | LuxuryBandit",
  description: "Foto und Lebenslauf hochladen — die KI zeigt dir, wofür du dich bewerben kannst.",
  robots: { index: false, follow: true },
};

export default async function LebenslaufStartPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const T = kissText(L, "lebenslauf");
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const hell = String(sp.light ?? "") === "1";

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      <div className="mx-auto flex w-full max-w-[440px] flex-col px-4 pb-24 pt-3">
        <Kicker>{T.heroY}</Kicker>
        <H1 className="mt-1">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        <div className="contents">
          <LebenslaufStartClient lang={L} code={code} />
        </div>
      </div>
      <SeitenFuss />
    </main>
  );
}
