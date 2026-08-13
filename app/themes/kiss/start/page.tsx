import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import KissStartClient from "./KissStartClient";

/**
 * DIE TUNNEL-SEITE DES KUSSES — GENAU DAS MUSTER AUS `app/themes/versprechen/start/page.tsx`
 * (Owner 12.08.2026, „oberstes Gesetz": „allle funnels und wenn eine änderung bitbs dann ist
 * es bei allen gleich"). Nur die URL-Steuerung liegt gemeinsam in `components/TunnelSeite.tsx`
 * — diese Datei konfiguriert, sie kopiert keine Logik.
 *
 * `robots: { index: false, follow: true }` — dieselbe Regel wie bei den Look-Seiten und der
 * Versprechen-Tunnel-Seite: eine Werbe-Zielseite ohne eigenen redaktionellen Inhalt.
 *
 * DIE AD-ADRESSEN:
 *   dunkel  /themes/kiss/start
 *   hell    /themes/kiss/start?light=1
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Start your kiss video | LuxuryBandit",
  description: "Your photo, her photo, one kiss video — name and email, then the two pictures.",
  robots: { index: false, follow: true },
};

const BEISPIEL_VIDEOS = [
  "/Kiss/kiss-beispiel.mp4",
  "/Kiss/Video4-kiss-normal.mp4",
  "/Kiss/kiss-stand-close.mp4",
];

export default async function KissStartPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const T = kissText(L, "kiss");
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const hell = String(sp.light ?? "") === "1";

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <Kicker>{T.heroY || "Kiss any model"}</Kicker>
        <H1 className="mt-1">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        <div className="mt-4">
          <KissStartClient lang={L} code={code} beispielVideos={BEISPIEL_VIDEOS} />
        </div>
      </div>
      <SeitenFuss />
    </main>
  );
}
