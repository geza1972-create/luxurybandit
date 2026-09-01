import TopNav from "@/components/TopNav";
import { resolveLang } from "@/lib/lang-server";
import SubscribeCta from "@/components/SubscribeCta";
import { Kicker, H1, Y, SectionTitle, Lead, Fine } from "@/components/Landing";
import KissFunnel from "@/components/KissFunnel";
import KissModelsAdmin from "@/components/KissModelsAdmin";
import KissUsersAdmin from "@/components/KissUsersAdmin";
import KissMediaAdmin from "@/components/KissMediaAdmin";
import ManageViewToggle from "@/components/ManageViewToggle";
import AdminTabs from "@/components/AdminTabs";
import UploadsAdmin from "@/components/UploadsAdmin";
import { getSignedUrl } from "@/lib/try-this-look-store";
import { kissText } from "@/lib/kiss-i18n";

// THEMA „Your Idol with you" — baugleich zur Kiss-Landing (gleicher Funnel, andere
// Beschriftung + anderer Prompt: die beiden zusammen auf einer Party statt Kuss).
// Der Funnel wird NICHT kopiert, sondern über `variant` wiederverwendet — sonst müsste
// jeder spätere Fix zweimal gemacht werden.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deepfake video generator — you and your idol in one AI video | LuxuryBandit",
  description: "Free-to-start AI face swap video: upload one screenshot of any star and a photo of yourself, and the AI video generator puts the two of you together at a party.",
  keywords: ["deepfake video generator", "deepfake maker", "face swap video ai", "face swap ai free", "ai video generator", "ai video maker", "put yourself in a video", "ai model generator", "celebrity ai video"],
  alternates: { canonical: "/your-idol" },
};

export default async function YourIdolPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();   // Sprache der Seite (Cookie) — für den Kaufknopf
  const T = kissText(L, "idol");   // Überschrift und Vorspann in seiner Sprache
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);   // Aktionscode aus der Anzeige
  const showAdmin = String(sp.admin ?? "") === "1";
  const view = sp.view === "kunde" ? "kunde" : "admin";
  const showCustomer = !showAdmin || view === "kunde";

  // Beispiel-Video (vom Owner geliefert) — zeigt sofort, was hier herauskommt.
  const example = await getSignedUrl("try-this-look/videos/your-idol-with-you.mp4").catch(() => "");

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav subtitle="Your Idol" heim="/media-kit" motto="The Media Creator" sprachen={["en", "de"]} />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        {showAdmin && <ManageViewToggle view={view} />}

        {showCustomer ? (
          <div className={showAdmin ? "mt-4" : ""}>
            <Kicker>LuxuryBandit · Your Idol</Kicker>
            {/* In der Sprache des Besuchers (Owner 30.07.2026, Punkt 4) — die Anzeigen laufen
                in sieben Ländern, und dies ist der erste Satz, den ein Klick zu sehen bekommt. */}
            <H1>{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
            {/* Klartext: es geht um JEDE Person, nicht nur um unsere Models. Der Nutzer soll
                sofort begreifen, dass ein einzelner Screenshot reicht. */}
            <Lead>{T.leadA}</Lead>
            <Lead className="mt-2">{T.leadB}</Lead>
            <Fine>{T.fine}</Fine>

            {/* Gleicher Funnel wie Kiss, nur andere Variante — und dieselben acht Sprachen. */}
            <KissFunnel variant="idol" code={code} lang={L} />

            {example && (
              <div className="mt-12">
                <SectionTitle>{T.examples}</SectionTitle>
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video src={example} muted loop playsInline autoPlay preload="metadata" className="aspect-[3/4] w-full object-cover" />
                </div>
              </div>
            )}
            <SubscribeCta code={code} lang={L} />

            <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
              <div>
                <SectionTitle>An AI deepfake video of you and your idol</SectionTitle>
                <Lead>
                  This is a deepfake video generator built for one thing: putting you next to the
                  person you admire. Upload one screenshot — a singer, an actress, an athlete, an
                  influencer — add a photo of yourself, and the AI face swap video puts the two of
                  you at the same party. No app, no editing, no green screen: it runs in your
                  browser and you get a finished AI video.
                </Lead>
              </div>
              <div>
                <SectionTitle>Built on the most expensive video AI there is</SectionTitle>
                <Lead>
                  There is nothing else quite like LuxuryBandit: an AI influencer marketplace where
                  the same woman greets you in the morning, wears the looks you pick, chats with you
                  and stars in your videos. We pay for the top-tier video models instead of the cheap
                  ones — that is why a face keeps its likeness and a mouth moves with the words.
                  Every result is AI-generated and stays private.
                </Lead>
              </div>
            </section>
          </div>
        ) : (
          /* DIESELBEN REITER WIE BEI KISS (Owner 31.07.2026: „wir hatten doch die tabs
             Galerie … und hier sind sie nicht"). Und die GALERIE fehlte hier ganz — dabei
             ist sie das, was er am haeufigsten ansieht. Sie liest denselben Log wie bei
             Kiss, zeigt also auch die Idol-Durchlaeufe. */
          <div className="lb-theme mt-4">
            <AdminTabs
              storageKey="lb_admin_tab_idol"
              tabs={[
                { key: "galerie", label: "🖼 Galerie", node: <UploadsAdmin title="Hochgeladen & erzeugt" theme="idol" /> },
                { key: "medien", label: "🎬 Medien", node: <KissMediaAdmin /> },
                { key: "models", label: "👩 Models", node: <KissModelsAdmin /> },
                { key: "videos", label: "▶ Videos", node: <KissUsersAdmin theme="idol" /> },
              ]}
            />
          </div>
        )}
      </div>
    </main>
  );
}
