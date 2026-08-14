import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import WeddingStartClient from "./WeddingStartClient";
import WeddingInhalt, { weddingTexte } from "@/components/WeddingInhalt";

/**
 * DIE TUNNEL-SEITE DER HOCHZEIT — EINE EIGENE ADRESSE FÜR DIE ANZEIGEN (KONZEPT-TUNNEL.md,
 * genau das Muster aus `app/themes/versprechen/start/page.tsx`).
 *
 * `robots: { index: false, follow: true }` — dieselbe Regel wie bei jeder anderen Tunnel-
 * Zielseite: keine eigene Konkurrenz im Suchindex, Verweise von hier zählen weiter.
 *
 * DIE AD-ADRESSEN:
 *   dunkel  /themes/wedding/start
 *   hell    /themes/wedding/start?light=1
 * Ein Aktionscode haengt als `?code=…` (oder `?promo=…`) dahinter, genau wie auf jeder
 * anderen Themenseite.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Start your wedding invitation video | LuxuryBandit",
  description: "Upload one photo of the bride and one of the groom — name, email, then your wedding invitation video.",
  robots: { index: false, follow: true },
};

export default async function WeddingStartPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const T = kissText(L, "wedding");
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  /* Dieselben Texte wie die Landingpage — eine Quelle (Owner 14.08.2026). */
  const t = await weddingTexte(L);
  const hell = String(sp.light ?? "") === "1";

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <Kicker>{T.heroY}</Kicker>
        <H1 className="mt-1">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        <div className="mt-4">
          {/* DERSELBE KUNDEN-INHALT WIE AUF DER LANDINGPAGE, UNTER DEM ANMELDEFORMULAR
              (Owner 14.08.2026, Dauerregel fuer den Tunnel). Die Verwaltung der
              Landingpage bleibt dort — sie hat im Kundentrichter nichts zu suchen. */}
          <WeddingStartClient lang={L} code={code} inhalt={<WeddingInhalt T={T} t={t} L={L} />} />
        </div>
      </div>
      <SeitenFuss />
    </main>
  );
}
