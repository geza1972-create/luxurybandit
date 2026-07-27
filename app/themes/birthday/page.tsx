import TopNav from "@/components/TopNav";
import BirthdayFunnel from "@/components/BirthdayFunnel";
import KissUsersAdmin from "@/components/KissUsersAdmin";
import ManageViewToggle from "@/components/ManageViewToggle";
import { readTryThisLookState, getSignedUrl } from "@/lib/try-this-look-store";

// THEMA „Birthdays" — gleiches Schema wie Kiss/Idol (Radar-Show → verpixelt → bezahlen →
// echter Render), aber EINZELKAUF 3,99 € statt Abo: so ein Video verschenkt man einmal.
// Der Nutzer gibt nur den Namen ein, Bella gratuliert ihm namentlich, danach teilen.

export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";

export const metadata = {
  title: "Birthday video — she says it by name | LuxuryBandit",
  description: "Enter a name and she wishes them a happy birthday in a personal video. Send it to them.",
};

export default async function BirthdayThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const showAdmin = String(sp.admin ?? "") === "1";
  const view = sp.view === "kunde" ? "kunde" : "admin";
  const showCustomer = !showAdmin || view === "kunde";

  const state = await readTryThisLookState();
  const bella = (state.curators ?? []).find(c => (c as { id?: string }).id === BELLA_ID) as { photoPath?: string; modelName?: string; firstName?: string } | undefined;
  const modelPhoto = bella?.photoPath ? (await getSignedUrl(bella.photoPath).catch(() => "")) || "" : "";
  const modelName = String(bella?.modelName || bella?.firstName || "Bella").split(" ")[0];
  const example = await getSignedUrl("try-this-look/videos/birthday-bella-cake.mp4").catch(() => "");

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav subtitle="Birthdays" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {showAdmin && <ManageViewToggle view={view} />}

        {showCustomer ? (
          <div className={showAdmin ? "mt-4" : ""}>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c9a23f]">LuxuryBandit · Birthdays</p>
            <h1 className="mt-2 text-[34px] font-black leading-[1.05]">
              She says <span className="text-[#c9a23f]">happy birthday</span> 🎂
            </h1>
            <p className="mt-3 text-[15px] font-medium leading-snug text-white/80">
              Type the name of whoever is celebrating — {modelName} wishes them a happy birthday by
              name, in her own video. Then send it to them.
            </p>

            <BirthdayFunnel modelPhoto={modelPhoto} modelName={modelName} />

            {example && (
              <div className="mt-12">
                <p className="text-[12px] font-black uppercase tracking-wide text-white/50">See it in action</p>
                <h2 className="mt-1 text-[22px] font-black leading-tight">A birthday from her 🎂</h2>
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video src={example} muted loop playsInline autoPlay preload="metadata" className="aspect-[3/4] w-full object-cover" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lb-theme mt-4 space-y-4">
            <KissUsersAdmin />
          </div>
        )}
      </div>
    </main>
  );
}
