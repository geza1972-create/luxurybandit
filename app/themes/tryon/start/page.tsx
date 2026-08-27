import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { tryonVideos } from "@/lib/tryon-videos";
import TryonStartClient from "./TryonStartClient";
import { tryonText } from "@/lib/tryon-i18n";

/**
 * DER TRY-ON ALS TUNNEL-SEITE (Owner 13.08.2026: „wenn ich den tunel bei einem produkt
 * teste muss bei allen gehen. so einfach geht das") — dieselbe Ad-Adresse wie die sechs
 * Geschwister (KONZEPT-TUNNEL.md):
 *
 *   dunkel  /themes/tryon/start
 *   hell    /themes/tryon/start?light=1
 *
 * NUR ZWEI SCHRITTE HIER (siehe `PRODUKTE.tryon` in lib/produkte.ts): 1 Name+E-Mail,
 * 2 Look-Wahl als BildWahl-Slider. Der dritte Schritt IST die bewährte Try-on-Seite
 * (/tryon/<lookId>) — Foto, Erzeugung, Wasserzeichen, Registrier-Tor, Bezahl-Stufen
 * wohnen dort und werden nicht nachgebaut.
 *
 * DIE LOOKS KOMMEN AUS DEM KATALOG, serverseitig gelesen wie überall (readTryThisLookState),
 * mit drei Filtern: sichtbar (nicht hidden), mit Bild — und OHNE Lingerie: die Adresse ist
 * fürs Anzeigen-Publikum (Meta), Boudoir bleibt draussen wie in der „All"-Ansicht des Feeds
 * (Memory `editorial-categories`). Der öffentliche Name ist die Kuratoren-Beschreibung, nie
 * der Markenname (lib/look-title.ts, Memory `no-public-brand-names`).
 *
 * `imageUrl` kann als LEERER STRING hydratisiert sein (Memory
 * `store-hydrates-image-fields-as-empty-string`) — deshalb `||`-Prüfung, nie `??`.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Try on the look | LuxuryBandit",
  description: "Pick a look, upload one photo and see yourself wearing it — free preview.",
  robots: { index: false, follow: true },
};

/* Die Texte wohnen in lib/tryon-i18n.ts — EINE Tabelle für Landingpage UND Tunnel. */

export default async function TryonStartPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const S = tryonText(L);
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const hell = String(sp.light ?? "") === "1";

  /* DIE VORLAGEN SIND UNSERE VIDEOS (Pivot 13.08.2026 abends: „user selber klamotten
     hochladen … wir zeigen unsere videos als templates") — public/Tryon, dieselbe Quelle
     wie die Landingpage-Karte. Die A-List-Wardrobe ist aus dem Tunnel raus. */
  const vorlagen = tryonVideos();

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav marke="LB - Try-on" heim="/themes/tryon/start" motto="Virtual Try-On" />
      <div className="mx-auto flex w-full max-w-[440px] flex-col px-4 pb-24 pt-3">
        <Kicker>{S.kicker}</Kicker>
        <H1 className="mt-1">{S.h1a}<Y>{S.h1y}</Y>.</H1>
        {/* `contents` STATT EINES EIGENEN KASTENS (15.08.2026): Diese Huelle hat die
            Tab-Leiste im Tunnel gefangen — `order-first` ordnet nur INNERHALB des eigenen
            Flex-Containers, und der war diese Huelle statt der Seitenspalte. Mit `contents`
            verschwindet sie aus dem Layout, ihre Kinder werden Geschwister von Kicker und
            Titel — und die Leiste kann darueber (Owner: „ueber den Titel bitte"). Den
            Abstand bringt der Trichter selbst mit (`mt-4` an seiner Wurzel). */}
        <div className="contents">
          <TryonStartClient lang={L} code={code} vorlagen={vorlagen} />
        </div>
      </div>
      <SeitenFuss marke="LB - Try-on" />
    </main>
  );
}
