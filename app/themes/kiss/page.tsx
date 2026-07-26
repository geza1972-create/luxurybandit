import TopNav from "@/components/TopNav";
import KissFunnel from "@/components/KissFunnel";
import BellaCarouselAdmin from "@/components/BellaCarouselAdmin";
import WetterSubscribers from "@/components/WetterSubscribers";
import ManageViewToggle from "@/components/ManageViewToggle";

// THEMA „Kiss any Model" — Landing im Wetter-Muster: oben die Kundenansicht (Hero + der
// Kiss-Funnel: Model wählen → eigenes Foto → Pixverse-Video, 360p-Teststufe), darunter NUR
// mit ?admin=1 die Admin-Werkzeuge (eigenes Card-Tool scope="kiss" + Abonnenten).

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kiss any Model — your photo, her kiss, one video | LuxuryBandit",
  description: "Pick a model, upload your photo — and watch the two of you share a kiss in a video.",
};

export default async function KissThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const showAdmin = String(sp.admin ?? "") === "1";   // Admin-Werkzeuge NUR mit ?admin=1
  const view = sp.view === "kunde" ? "kunde" : "admin";
  const showCustomer = !showAdmin || view === "kunde";

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {showAdmin && <ManageViewToggle view={view} />}

        {showCustomer ? (
          <div className={showAdmin ? "mt-4" : ""}>
            {/* Hero */}
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c9a23f]">LuxuryBandit · Kiss</p>
            <h1 className="mt-2 text-[34px] font-black leading-[1.05]">
              Kiss any <span className="text-[#c9a23f]">model</span> 💋
            </h1>
            <p className="mt-3 text-[15px] font-medium leading-snug text-white/80">
              Pick her, upload your photo — and watch the two of you share a tender kiss in a video. Your little movie moment.
            </p>

            {/* Der Kiss-Funnel: Model-Grid + eigenes Foto + Generieren (Testphase: staff-only) */}
            <KissFunnel />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <BellaCarouselAdmin heading="🎴 Kiss-Card Tool" scope="kiss" />
            <div className="lb-theme">
              <WetterSubscribers />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
