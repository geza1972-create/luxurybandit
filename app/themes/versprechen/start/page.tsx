import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import { versprechenVideos } from "@/lib/versprechen-videos";
import VersprechenStartClient from "./VersprechenStartClient";
import VersprechenInhalt from "@/components/VersprechenInhalt";
import { trObject } from "@/lib/tr-object";

/**
 * DIE TUNNEL-SEITE — EINE EIGENE ADRESSE FÜR DIE ANZEIGEN (Owner 12.08.2026, wörtlich: „die
 * muss ich in den ads einbauen").
 *
 * BISHER lebte der Zweischritt-Tunnel als Fenster ÜBER der Landingpage (`/themes/versprechen`,
 * `KissFunnel`s `stufenOffen`-Dialog) — gut fuer jemanden, der erst die Seite liest und dann
 * kauft, aber ohne eigene Adresse: Eine Anzeige, die direkt auf „Name + E-Mail" zielt, konnte
 * nirgendwo hinzeigen, das nicht zuerst die ganze Landingpage laedt. Diese Seite ist genau das
 * Ziel — derselbe Trichter (`KissFunnel variant="versprechen"`, ungeaendert), nur als
 * SEITENINHALT statt als Fenster (`tunnelSeite`-Flag in `KissFunnel.tsx`).
 *
 * `robots: { index: false, follow: true }` — dieselbe Regel wie bei den Look-Seiten
 * (`app/look/[id]/layout.tsx`): eine Werbe-Zielseite ohne eigenen redaktionellen Inhalt soll
 * nicht im Suchindex konkurrieren, Verweise von hier aus zaehlen aber weiter.
 *
 * HELL/DUNKEL UEBER `?light=1` — DERSELBE MECHANISMUS WIE UEBERALL IM HAUS (Owner 30.07.2026:
 * „light hat doch eine eigene Adresse … die muss ich immer in den ads eintragen"; wiederholt
 * 12.08.2026: „light sogar muss eine eigene url haben"). `lb-theme lb-fb` an `<main>`, exakt
 * das Muster aus `app/themes/kiss/page.tsx` — kein neuer Schalter, `LightSwitch`
 * (in `TopNav`) uebernimmt Umschalten und Merken wie auf jeder anderen Themenseite.
 *
 * DIE AD-ADRESSEN:
 *   dunkel  /themes/versprechen/start
 *   hell    /themes/versprechen/start?light=1
 * Ein Aktionscode haengt als `?code=…` (oder `?promo=…`) dahinter, genau wie auf der
 * Landingpage.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Start your Future Self Program | LuxuryBandit",
  description: "Record yourself saying where you will be in five years — name, email, then your Future Film.",
  robots: { index: false, follow: true },
};

export default async function VersprechenStartPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const T = kissText(L, "versprechen");
  /* DIESELBEN RESTTEXTE WIE AUF DER LANDINGPAGE (14.08.2026) — `VersprechenInhalt`
     braucht sie, und sie muessen wortgleich sein, sonst steht auf zwei Seiten desselben
     Produkts eine andere Datenschutzzeile. Quelle bleibt Englisch im Code, Uebersetzung
     zur Laufzeit mit Dauer-Cache — identisch zu app/themes/versprechen/page.tsx. */
  const s = await trObject({
    privatH: "Private and yours alone",
    privatP: "Your video and your program page are never published — they land in your gallery, and only you decide who ever sees them. Everyone shown must be 18 or older; using someone else's face needs their consent.",
    terms: "Terms",
  }, L);
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const hell = String(sp.light ?? "") === "1";

  return (
    /* GENAU DAS MUSTER AUS `app/themes/kiss/page.tsx`: `lb-theme lb-fb` nur bei `?light=1` —
       kein neues CSS, dieselbe helle Fassung, die die Anzeigen schon kennen. */
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      {/* DAS SEITENKOPF-TEMPLATE (Skill `ci-design`, „Der Kopf einer Seite"): Huelle `pt-3`,
          Kicker nur eine Zeile, H1 28px `mt-1`, direkt danach die Karte (hier: `KissFunnel`s
          eigene Video-Karte plus, gleich darunter, der immer offene Tunnel). */}
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        {/* DER KICKER TRÄGT DEN PRODUKTNAMEN, NICHT DAS AKZENTWORT (14.08.2026). Hier stand
            `T.heroY` — seit die Überschrift die Leistung nennt, waere das „30-TAGE-PROGRAMM"
            ueber „Dein Future Film und dein 30-Tage-Programm.", also derselbe Satzteil
            zweimal untereinander. Der Produktname ist in jeder Sprache derselbe. */}
        <Kicker>Future Self Program</Kicker>
        {/* DIE ÜBERSCHRIFT BLEIBT IM QUELLTEXT, ABER NICHT AUF DEM SCHIRM (Owner 14.08.2026:
            „ist da nicht zu viel Text für ein Formular? … Hier müsste nur Titel stehen und
            Formular").

            Wer aus einer Anzeige kommt, sah vier Textblöcke, bevor er das erste Feld erreichte:
            H1, Kartentitel, Erklärsatz, Leistungszeile. Sichtbar bleibt jetzt der Kartentitel
            („Mach deinem zukünftigen Ich ein Versprechen.") — die Zeile, die der Owner selbst
            als Überschrift dieses Bildschirms aufgeschrieben hat. Alles Weitere steht unter
            dem Formular, wo die Landingpage-Inhalte jetzt ohnehin liegen.

            `sr-only` statt Löschen: Suchmaschinen und Screenreader brauchen die H1, das
            Seitenkopf-Template verlangt sie — nur der Platz auf dem Handy ist zu kostbar, um
            dieselbe Aussage zweimal zu zeigen. */}
        <H1 className="sr-only">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        <div className="mt-4">
          {/* DERSELBE INHALT WIE AUF DER LANDINGPAGE, UNTER DEM ANMELDEFORMULAR (Owner
              14.08.2026, Dauerregel fuer den Tunnel). Er wird HIER auf dem Server gebaut
              und als fertiger Knoten durchgereicht — `TunnelSeite` haengt ihn unten an. */}
          <VersprechenStartClient lang={L} code={code} beispielVideos={versprechenVideos()}
            inhalt={<VersprechenInhalt T={T} s={s} />} />
        </div>
      </div>
      <SeitenFuss />
    </main>
  );
}
