import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { resolveLang } from "@/lib/lang-server";
import SubscribeCta from "@/components/SubscribeCta";
import { H1, Y, SectionTitle, Lead } from "@/components/Landing";
import KissFunnel from "@/components/KissFunnel";
import UploadsAdmin from "@/components/UploadsAdmin";
import ThemeMediaAdmin from "@/components/ThemeMediaAdmin";
import ManageViewToggle from "@/components/ManageViewToggle";
import AdminTabs from "@/components/AdminTabs";
import EinladungenAdmin from "@/components/EinladungenAdmin";
import KissModelsAdmin from "@/components/KissModelsAdmin";
import KissUsersAdmin from "@/components/KissUsersAdmin";
import WetterSubscribers from "@/components/WetterSubscribers";
import ExampleVideos from "@/components/ExampleVideos";
import { getSignedUrl, readThemeConfig } from "@/lib/try-this-look-store";
import { kissText } from "@/lib/kiss-i18n";

/**
 * THEMA „HOCHZEITSKUSS" (Owner 30.07.2026: „ich will eher wie sie sich einen Hochzeitskuss
 * geben als Bild. Sie und er … die Frauen lieben Hochzeiten").
 *
 * Es ist DERSELBE Trichter wie beim Kuss — `variant="wedding"` tauscht Auftrag, Rollen und
 * Beschriftung. Bewusst keine Kopie der Datei: Jede Korrektur von heute (Adresse vor der
 * Erzeugung, Zustimmung, serverseitige Lieferung, sieben Sprachen) müsste sonst zweimal
 * gemacht werden.
 *
 * ROLLEN: Hier bedient SIE. Schritt 1 ist die Braut — sie selbst —, Schritt 2 der Bräutigam.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Wedding kiss AI generator — you two on your wedding day | LuxuryBandit",
  description: "Upload your photo and his: the AI puts the two of you in a white dress and a suit, sharing your wedding kiss — as a picture, free, and as a video.",
  keywords: ["wedding kiss ai", "ai wedding photo", "wedding video ai generator", "ai wedding picture", "future wedding photo ai"],
  alternates: { canonical: "/themes/wedding" },
};

export default async function WeddingThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const T = kissText(L, "wedding");
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const showAdmin = String(sp.admin ?? "") === "1";
  const view = sp.view === "kunde" ? "kunde" : "admin";
  const showCustomer = !showAdmin || view === "kunde";

  const cfg = await readThemeConfig("wedding").catch(() => ({ modelIds: [] as string[], examplePaths: [] as string[] }));
  const examples: string[] = (await Promise.all((cfg.examplePaths ?? []).map((p: string) => getSignedUrl(p).catch(() => "")))).filter(Boolean);

  return (
    <main className={`lb-bg min-h-screen text-white${String(sp.light ?? "") === "1" ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      <TrackView event="wedding_view" lookId="themes-wedding" lookName="Hochzeits-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {showAdmin && <ManageViewToggle view={view} />}

        {showCustomer ? (
          <div className={showAdmin ? "mt-4" : ""}>
            <H1>{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>

            {/* Derselbe Trichter wie beim Kuss, andere Variante. */}
            <KissFunnel variant="wedding" code={code} lang={L} />

            {/* GROSS UND MIT TON (Owner 30.07.2026: „bitte mit vergroessern und song").
                Eine Reihe statt zweier Spalten: Ein Hochzeitskuss auf halber Breite ist eine
                Briefmarke — das ist das Bild, das den Trichter verkauft. Der Ton startet
                stumm, weil jeder Browser Ton ohne Zutun blockiert; ein Tipp auf den Knopf
                schaltet ihn an (siehe ExampleVideos). */}
            {examples.length > 0 && (
              <div className="mt-12">
                <SectionTitle>{T.examples}</SectionTitle>
                <ExampleVideos urls={examples} />
              </div>
            )}

            <SubscribeCta code={code} lang={L} />

            <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
              <div>
                <SectionTitle>Your wedding photo, before the wedding</SectionTitle>
                <Lead>
                  Upload one photo of yourself and one of him. The AI dresses you in a white
                  wedding dress and him in a suit and puts the two of you in your wedding kiss —
                  the picture is free, the video costs. Nothing is published, it is yours.
                </Lead>
              </div>
            </section>
          </div>
        ) : (
          <div className="lb-theme mt-4">
            <AdminTabs
              storageKey="lb_admin_tab_wedding"
              tabs={[
                { key: "galerie", label: "🖼 Galerie", node: <UploadsAdmin title="Hochgeladen & erzeugt" theme="wedding" /> },
                {
                  key: "medien", label: "🎬 Medien",
                  node: (
                    <ThemeMediaAdmin
                      theme="wedding"
                      title="Hochzeits-Medien"
                      teaserHint="Bild oder Video hochladen — wird das Cover der Hochzeits-Karte im Themes-Katalog."
                    />
                  ),
                },
                // EIGENE BRAEUTE (Owner 31.07.2026: „ich will die Wedding-Seite managen wie
                // Kiss"). Die Auswahl liegt in der Hochzeits-Datei, nicht in der von Kiss —
                // wer hier anhakt, aendert nur dieses Karussell.
                { key: "models", label: "👰 Bräute", node: <KissModelsAdmin theme="wedding" /> },
                // EIGENE LISTE, nach derselben Regel wie bei den Wetter-Leads: Wer sich fuer
                // die Hochzeit eingetragen hat, hat nicht um Kuss-Post gebeten.
                {
                  key: "leads", label: "✉️ Leads",
                  node: (
                    <WetterSubscribers
                      modelId="wedding"
                      modelName="Hochzeit"
                      listLabel="Hochzeits-Leads"
                      linkPath="/themes/wedding"
                      sending={false}
                      nurMail
                    />
                  ),
                },
                // DIE EINLADUNGEN mit ihren Oeffnungen — die eine Zahl, an der sich
                // entscheidet, ob aus dem Video ein Kanal wird (Konzept, Tor 2).
                { key: "einladungen", label: "💌 Einladungen", node: <EinladungenAdmin /> },
                { key: "videos", label: "▶ Videos", node: <KissUsersAdmin theme="wedding" /> },
              ]}
            />
          </div>
        )}
      </div>
    </main>
  );
}
