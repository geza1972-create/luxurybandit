import TopNav from "@/components/TopNav";
import { Kicker, H1, Y, SectionTitle, Lead, Fine } from "@/components/Landing";
import KissFunnel from "@/components/KissFunnel";
import KissModelsAdmin from "@/components/KissModelsAdmin";
import KissUsersAdmin from "@/components/KissUsersAdmin";
import KissMediaAdmin from "@/components/KissMediaAdmin";
import ManageViewToggle from "@/components/ManageViewToggle";
import { getSignedUrl } from "@/lib/try-this-look-store";

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
  const showAdmin = String(sp.admin ?? "") === "1";
  const view = sp.view === "kunde" ? "kunde" : "admin";
  const showCustomer = !showAdmin || view === "kunde";

  // Beispiel-Video (vom Owner geliefert) — zeigt sofort, was hier herauskommt.
  const example = await getSignedUrl("try-this-look/videos/your-idol-with-you.mp4").catch(() => "");

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav subtitle="Your Idol" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {showAdmin && <ManageViewToggle view={view} />}

        {showCustomer ? (
          <div className={showAdmin ? "mt-4" : ""}>
            <Kicker>LuxuryBandit · Your Idol</Kicker>
            <H1>Your idol <Y>with you</Y> ✨</H1>
            {/* Klartext: es geht um JEDE Person, nicht nur um unsere Models. Der Nutzer soll
                sofort begreifen, dass ein einzelner Screenshot reicht — und dass die Technik
                dieselbe ist wie bei einem Deepfake (nur eben für ihn selbst, privat). */}
            <Lead>
              Take <span className="font-black text-white">any person you admire</span> — a superstar,
              a singer, an actress, an athlete, an influencer, or one of our models. One screenshot of
              her or him is enough.
            </Lead>
            <Lead className="mt-2">
              Add a photo of yourself and the AI puts the two of you together at a party, side by
              side. It works like a <span className="font-black text-white">deepfake</span>: your two
              faces, one video that looks like it really happened.
            </Lead>
            <Fine>AI-generated, not a real recording — and it&apos;s for you, not for social media.</Fine>

            {/* Gleicher Funnel wie Kiss, nur andere Variante */}
            <KissFunnel variant="idol" />

            {example && (
              <div className="mt-12">
                <SectionTitle>The two of you ✨</SectionTitle>
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video src={example} muted loop playsInline autoPlay preload="metadata" className="aspect-[3/4] w-full object-cover" />
                </div>
              </div>
            )}
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
          <div className="lb-theme mt-4 space-y-4">
            <KissMediaAdmin />
            <KissModelsAdmin />
            <KissUsersAdmin />
          </div>
        )}
      </div>
    </main>
  );
}
