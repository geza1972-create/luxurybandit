import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import KissStartClient from "./KissStartClient";
import KissInhalt from "@/components/KissInhalt";
import { trObject } from "@/lib/tr-object";

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
  /* WORTGLEICH MIT DER LANDINGPAGE (14.08.2026): `KissInhalt` braucht diese Texte, und sie
     muessen auf beiden Seiten desselben Produkts identisch sein. Quelle Englisch im Code,
     Uebersetzung zur Laufzeit mit Dauer-Cache — kopiert aus app/themes/kiss/page.tsx. */
  const s = await trObject({
    seo1h: "Kiss video AI generator — online, no app",
    seo1p: "You are in the video, not just watching one. Add a photo of yourself, pick one of our AI models or upload a screenshot of any star, and the kiss video AI generator renders the two of you sharing one tender kiss. Straight in the browser — nothing to install.",
    seo2h: "Why the face still looks like your face",
    seo2p: "A kiss is the hardest thing to render: it is exactly where the two faces meet, half-turned and in motion. We run the video models that hold the face and the movement — cheaper ones lose both, and then it is not your face any more. That is the whole point of putting yourself in the picture. AI-generated, private, yours: your photo is never published and never shown to another user.",
  }, L);
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const hell = String(sp.light ?? "") === "1";

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <Kicker>{T.heroY || "Kiss any model"}</Kicker>
        <H1 className="mt-1">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        <div className="mt-4">
          {/* DERSELBE INHALT WIE AUF DER LANDINGPAGE, UNTER DEM ANMELDEFORMULAR
              (Owner 14.08.2026, Dauerregel fuer den Tunnel). */}
          <KissStartClient lang={L} code={code} beispielVideos={BEISPIEL_VIDEOS}
            inhalt={<KissInhalt T={T} s={s} />} />
        </div>
      </div>
      <SeitenFuss />
    </main>
  );
}
