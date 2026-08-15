import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import HolidayStartClient from "./HolidayStartClient";
import HolidayInhalt from "@/components/HolidayInhalt";

/**
 * DIE TUNNEL-SEITE DES URLAUBS — EINE EIGENE ADRESSE FÜR DIE ANZEIGEN (KONZEPT-TUNNEL.md,
 * genau das Muster aus `app/themes/versprechen/start/page.tsx`).
 *
 * DIE AD-ADRESSEN:
 *   dunkel  /themes/holiday/start
 *   hell    /themes/holiday/start?light=1
 * Ein Aktionscode haengt als `?code=…` (oder `?promo=…`) dahinter.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Start your holiday invitation video | LuxuryBandit",
  description: "Invite someone to come away with you — name, email, pick a scene, then your holiday invitation video.",
  robots: { index: false, follow: true },
};

export default async function HolidayStartPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const T = kissText(L, "holiday");
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const hell = String(sp.light ?? "") === "1";

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      <div className="mx-auto flex w-full max-w-[440px] flex-col px-4 pb-24 pt-3">
        <Kicker>{T.heroY}</Kicker>
        <H1 className="mt-1">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        {/* `contents` STATT EINES EIGENEN KASTENS (15.08.2026): Diese Huelle hat die
            Tab-Leiste im Tunnel gefangen — `order-first` ordnet nur INNERHALB des eigenen
            Flex-Containers, und der war diese Huelle statt der Seitenspalte. Mit `contents`
            verschwindet sie aus dem Layout, ihre Kinder werden Geschwister von Kicker und
            Titel — und die Leiste kann darueber (Owner: „ueber den Titel bitte"). Den
            Abstand bringt der Trichter selbst mit (`mt-4` an seiner Wurzel). */}
        <div className="contents">
          {/* DERSELBE INHALT WIE AUF DER LANDINGPAGE, UNTER DEM ANMELDEFORMULAR
              (Owner 14.08.2026, Dauerregel fuer den Tunnel). */}
          <HolidayStartClient lang={L} code={code} inhalt={<HolidayInhalt T={T} L={L} />} />
        </div>
      </div>
      <SeitenFuss />
    </main>
  );
}
