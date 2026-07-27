import TopNav from "@/components/TopNav";
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
  title: "Your Idol with you — one video, the two of you | LuxuryBandit",
  description: "Pick your idol, upload your photo — and see the two of you together in a video.",
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
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">LuxuryBandit · Your Idol</p>
            <h1 className="mt-2 text-[34px] font-black leading-[1.05]">
              Your idol <span className="text-[#f6cf51]">with you</span> ✨
            </h1>
            {/* Klartext: es geht um JEDE Person, nicht nur um unsere Models. Der Nutzer soll
                sofort begreifen, dass ein einzelner Screenshot reicht — und dass die Technik
                dieselbe ist wie bei einem Deepfake (nur eben für ihn selbst, privat). */}
            <p className="mt-3 text-[15px] font-medium leading-snug text-white/80">
              Take <span className="font-black text-white">any person you admire</span> — a superstar,
              a singer, an actress, an athlete, an influencer, or one of our models. One screenshot of
              her or him is enough.
            </p>
            <p className="mt-2 text-[15px] font-medium leading-snug text-white/80">
              Add a photo of yourself and the AI puts the two of you together at a party, side by
              side. It works like a <span className="font-black text-white">deepfake</span>: your two
              faces, one video that looks like it really happened.
            </p>
            <p className="mt-2 text-[13px] font-bold leading-snug text-white/55">
              AI-generated, not a real recording — and it&apos;s for you, not for social media.
            </p>

            {/* Gleicher Funnel wie Kiss, nur andere Variante */}
            <KissFunnel variant="idol" />

            {example && (
              <div className="mt-12">
                <p className="text-[12px] font-black uppercase tracking-wide text-white/50">See it in action</p>
                <h2 className="mt-1 text-[22px] font-black leading-tight">The two of you ✨</h2>
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video src={example} muted loop playsInline autoPlay preload="metadata" className="aspect-[3/4] w-full object-cover" />
                </div>
              </div>
            )}
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
