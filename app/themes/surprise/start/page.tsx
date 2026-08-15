import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import { POLEDANCE_VIDEO, POLEDANCE_REFERENZEN } from "@/lib/poledance";
import SurpriseStartClient from "./SurpriseStartClient";
import SurpriseInhalt from "@/components/SurpriseInhalt";

/**
 * DIE TUNNEL-SEITE DES TANZES — GENAU DAS MUSTER AUS
 * `app/themes/versprechen/start/page.tsx` (Owner 12.08.2026, „oberstes Gesetz": „allle
 * funnels und wenn eine änderung bitbs dann ist es bei allen gleich"; und, am selben Tag,
 * zur Rückkehr des Themas: „pool dancing kannst du hier einbauen und da machst du auch dort
 * den tunel einbauen"). Nur die URL-Steuerung liegt gemeinsam in `components/TunnelSeite.tsx`
 * — diese Datei konfiguriert, sie kopiert keine Logik.
 *
 * `robots: { index: false, follow: true }` — dieselbe Regel wie bei jeder anderen
 * Tunnel-Seite: eine Werbe-Zielseite ohne eigenen redaktionellen Inhalt.
 *
 * DIE AD-ADRESSEN:
 *   dunkel  /themes/surprise/start
 *   hell    /themes/surprise/start?light=1
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Start your surprise pole dance video | LuxuryBandit",
  description: "One photo of yourself, then pick a set — a short private video, made for him alone.",
  robots: { index: false, follow: true },
};

export default async function SurpriseStartPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const T = kissText(L, "poledance");
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const hell = String(sp.light ?? "") === "1";

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      <div className="mx-auto flex w-full max-w-[440px] flex-col px-4 pb-24 pt-3">
        <Kicker>{T.heroY || "Surprise him"}</Kicker>
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
          <SurpriseStartClient lang={L} code={code} inhalt={<SurpriseInhalt T={T} />}
            beispielVideos={[POLEDANCE_VIDEO, ...POLEDANCE_REFERENZEN.map(r => r.video)]} />
        </div>
      </div>
      <SeitenFuss />
    </main>
  );
}
