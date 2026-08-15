import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import { GEBURTSTAG_VIDEO, GEBURTSTAG_VIDEO_TRAUM, GEBURTSTAG_VIDEO_MANN } from "@/lib/geburtstag";
import BirthdayStartClient from "./BirthdayStartClient";
import BirthdayInhalt from "@/components/BirthdayInhalt";

/**
 * DIE TUNNEL-SEITE DES GEBURTSTAGS — GENAU DAS MUSTER AUS
 * `app/themes/versprechen/start/page.tsx` (Owner 12.08.2026, „oberstes Gesetz": „allle
 * funnels und wenn eine änderung bitbs dann ist es bei allen gleich"). Nur die
 * URL-Steuerung liegt gemeinsam in `components/TunnelSeite.tsx` — diese Datei konfiguriert,
 * sie kopiert keine Logik.
 *
 * `robots: { index: false, follow: true }` — dieselbe Regel wie bei den anderen
 * Tunnel-Seiten: eine Werbe-Zielseite ohne eigenen redaktionellen Inhalt.
 *
 * DIE AD-ADRESSEN:
 *   dunkel  /themes/birthday/start
 *   hell    /themes/birthday/start?light=1
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Start her birthday video | LuxuryBandit",
  description: "Name and email, then pick a look and record — her birthday video in your voice.",
  robots: { index: false, follow: true },
};

export default async function BirthdayStartPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const T = kissText(L, "birthday");
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const hell = String(sp.light ?? "") === "1";

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      <div className="mx-auto flex w-full max-w-[440px] flex-col px-4 pb-24 pt-3">
        <Kicker>{T.heroY || "Happy birthday video"}</Kicker>
        <H1 className="mt-1">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        {/* `contents` STATT EINES EIGENEN KASTENS (15.08.2026): Diese Huelle hat die
            Tab-Leiste im Tunnel gefangen — `order-first` ordnet nur INNERHALB des eigenen
            Flex-Containers, und der war diese Huelle statt der Seitenspalte. Mit `contents`
            verschwindet sie aus dem Layout, ihre Kinder werden Geschwister von Kicker und
            Titel — und die Leiste kann darueber (Owner: „ueber den Titel bitte"). Den
            Abstand bringt der Trichter selbst mit (`mt-4` an seiner Wurzel). */}
        <div className="contents">
          {/* DERSELBE INHALT WIE AUF DER LANDINGPAGE, UNTER DEM ANMELDEFORMULAR
              (Owner 14.08.2026, Dauerregel fuer den Tunnel). Auf dem Server gebaut und
              als fertiger Knoten durchgereicht; `TunnelSeite` haengt ihn unten an. */}
          <BirthdayStartClient inhalt={<BirthdayInhalt T={T} />} lang={L} code={code}
            beispielVideos={[GEBURTSTAG_VIDEO_TRAUM, GEBURTSTAG_VIDEO, GEBURTSTAG_VIDEO_MANN]} />
        </div>
      </div>
      <SeitenFuss />
    </main>
  );
}
