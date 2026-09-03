import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { H1, Y } from "@/components/Landing";
import KissFunnel from "@/components/KissFunnel";
import VersprechenInhalt from "@/components/VersprechenInhalt";
import UploadsAdmin from "@/components/UploadsAdmin";
import ManageViewToggle from "@/components/ManageViewToggle";
import SeitenFuss from "@/components/SeitenFuss";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import { trObject } from "@/lib/tr-object";
import { versprechenVideos } from "@/lib/versprechen-videos";

/**
 * THEMA „DAS VERSPRECHEN" — SEIT 11.08.2026 DAS FUTURE SELF PROGRAM (Owner, wörtlich: „Das
 * ist nicht mehr nur ein Video. Future Self Program. Er bekommt seinen Future Film,
 * sein Versprechen, eine private persönliche Seite, ein 30-Tage-Programm mit Checkliste,
 * Fortschritt und einen 90-Tage-Anschluss.").
 *
 * NUR DIE LANDINGPAGE ÄNDERT SICH HIER — Positionierung, Text, sichtbarer Preis. Der Trichter
 * (`KissFunnel`), die Kasse, die Auslieferung und das Future-Program selbst bleiben unberührt:
 * Es ist derselbe Look (Villa/Wagen, `lib/versprechen-looks`), dieselbe Aufnahme statt
 * Foto-Upload, derselbe Seitenaufbau (Landingpage.md §9). `filmTitel`/`filmText` bleiben in
 * `lib/kiss-i18n.ts` unverändert stehen — sie sind der Kartentitel des ausgelieferten Videos,
 * nicht nur Landingpage-Text; diese Seite zeigt sie seit dem Umbau nicht mehr an.
 *
 * DER PREIS KOMMT AUS DER TABELLE (`VERSPRECHEN_CENTS` in lib/pricing.ts), nie aus
 * einer getippten Zahl — Memory `prices-only-from-pricing-table`. Seit der Preissenkung vom
 * 11.08.2026 rechnet diese Seite ihn nicht mehr selbst aus: Der finale Kaufblock zeigt den Satz
 * `finalPreisZeile` aus kiss-i18n, dessen {programm} `fillPrices` füllt.
 *
 * DIE HIERARCHIE — UMGEBAUT 11.08.2026 (Owner, wörtlich: „The PROGRAM is the product. The
 * Future Film is only the emotional entry point. … It must feel like: buy a serious Future
 * Self Program that begins with a powerful Future Film").
 *
 * Vorher stand nach der Video-Karte nur eine schmale Zeile mit Preis, und der grosse
 * Programm-Abschnitt kam erst weit unten, hinter „Mehr als ein Video" — die Seite wirkte wie
 * „kauf ein Video, bekomm ein paar Extras". Jetzt zieht der Verkauf nach oben, direkt unter die
 * Hero-Karte:
 *   1. Hero (H1 + heroSub) + KissFunnel-Karte — unverändert, das ist der emotionale Einstieg.
 *   2. NEU: ein grosser goldener Produktkasten — „FUTURE SELF PROGRAM", der Preis riesig,
 *      darunter die drei Zeilen aus `unterVideoZeilen`. Der alte schmale border-left-Block
 *      entfällt zugunsten dieses Kastens.
 *   3. NEU: die 6 Benefits als 2-Spalten-Kachelraster statt der schmalen nummerierten Liste —
 *      derselbe Abschnitt „Dein Future Self Program", nur als Kacheln und weiter oben.
 *   4. Erst DANACH „Mehr als ein Video" — es erklärt/vertieft, verkauft aber nicht mehr an.
 *   5. Rest unverändert: Emotional, „So funktioniert es", finaler Preis/CTA (Wiederholung am
 *      Seitenende bleibt gewollt), Datenschutz.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  /* NICHT „a video message" (14.08.2026): Der Seitentitel ist das, was in der Suche und in
     jeder geteilten Vorschau steht — er verkaufte ein Video, waehrend das Produkt ein Film
     PLUS ein 30-Tage-Programm ist. Dieselbe Korrektur wie an der Überschrift. */
  title: "Future Self Program — your Future Film and 30 days | LuxuryBandit",
  description: "Record yourself saying where you will be in five years. Get your Future Film, your promise, and a 30-day program with a daily checklist to keep it.",
  keywords: ["future self program", "video message to yourself", "promise video", "new year resolution video", "30 day program"],
  alternates: { canonical: "/themes/versprechen" },
  /* Ohne eigenes openGraph erbt diese Seite das Haus-Bild aus app/layout.tsx (LB-Logo) —
     beim Teilen stünde die Startseite statt des Future-Film-Standbilds. */
  openGraph: {
    title: "Future Self Program — your Future Film and 30 days",
    description: "Record yourself saying where you will be in five years. Get your Future Film, your promise, and a 30-day program with a daily checklist to keep it.",
    type: "website",
    url: "/themes/versprechen",
    images: [{ url: "/Versprechen/promise-example-og.jpg", width: 960, height: 960 }],
  },
};

export default async function VersprechenThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const T = kissText(L, "versprechen");
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  /* ADMIN-WERKZEUGE NUR MIT ?admin=1 (Owner 12.08.2026: „Versprechen keine eigene Liste
     hat. Es läuft alles über Kiss" — jetzt hat es seinen eigenen manage-Punkt, dieselbe
     Mechanik wie /themes/kiss). */
  const showAdmin = String(sp.admin ?? "") === "1";
  const view = sp.view === "kunde" ? "kunde" : "admin";
  const showCustomer = !showAdmin || view === "kunde";

  /* Die Datenschutz-Zeile am Fuss: englische Quelle im Code, Übersetzung zur Laufzeit mit
     Dauer-Cache — dieselbe Lösung wie auf allen anderen Themenseiten. Kürzer als vorher und
     weiter unten auf der Seite (Owner: „keep privacy information, but shorten it"). */
  const s = await trObject({
    privatH: "Private and yours alone",
    privatP: "Your video and your program page are never published — they land in your gallery, and only you decide who ever sees them. Everyone shown must be 18 or older; using someone else's face needs their consent.",
    /* Der Link unter der 30-Day Promise Guarantee — englische Quelle, Übersetzung zur
       Laufzeit wie der Rest dieser kleinen Tabelle. */
    terms: "Terms",
  }, L);

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav marke="LB - Future me" heim="/media-kit" motto="The Media Creator" sprachen={["en", "de"]} />
      <TrackView event="versprechen_view" lookId="themes-versprechen" lookName="Versprechen-Thema" />
      {/* Seitenkopf-Template: pt-3, H1 aus der Bibliothek, direkt die Karte (Landingpage.md §9). */}
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <H1>{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>

        {T.heroSub && (
          <p className="mt-2 text-[14px] font-semibold leading-snug text-white/80">
            {T.heroSub.join(" ")}
          </p>
        )}

        {/* DIE FOLIEN KOMMEN AUS DEM ORDNER: `versprechenVideos()` liest jede .mp4 in
            public/Versprechen — Kachel-Video zuerst, der Rest nach Namen. */}
        {showAdmin && <ManageViewToggle view={view} />}
        {showAdmin && view === "admin" && (
          /* DIE EIGENE VERSPRECHEN-LISTE (Owner 12.08.2026) — dieselbe Galerie wie bei
             Kiss, nur auf theme=versprechen gefiltert (/api/kiss-log?theme=…). */
          <div className="lb-theme mt-4">
            <UploadsAdmin title="Hochgeladen & erzeugt" theme="versprechen" />
          </div>
        )}
        {showCustomer && (
        <KissFunnel variant="versprechen" code={code} lang={L}
          beispielVideos={versprechenVideos()} />
        )}
        {/* DER INHALT DER LANDINGPAGE — jetzt aus einer gemeinsamen Datei, damit die
            Tunnel-Seite exakt dasselbe unter ihrem Anmeldeformular zeigen kann
            (Owner 14.08.2026, Dauerregel fuer den Tunnel). */}
        <VersprechenInhalt T={T} s={s} />
      </div>
      <SeitenFuss marke="LB - Future me" />
    </main>
  );
}
