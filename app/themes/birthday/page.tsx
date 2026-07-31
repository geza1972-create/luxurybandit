import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { Kicker, H1, Y, SectionTitle, Lead } from "@/components/Landing";
import BirthdayFunnel from "@/components/BirthdayFunnel";
import KissUsersAdmin from "@/components/KissUsersAdmin";
import ManageViewToggle from "@/components/ManageViewToggle";
import AdminTabs from "@/components/AdminTabs";
import UploadsAdmin from "@/components/UploadsAdmin";
import { readTryThisLookState, getSignedUrl } from "@/lib/try-this-look-store";

// THEMA „Birthdays" — gleiches Schema wie Kiss/Idol (Radar-Show → verpixelt → bezahlen →
// echter Render), aber EINZELKAUF 3,99 € statt Abo: so ein Video verschenkt man einmal.
// Der Nutzer gibt nur den Namen ein, Bella gratuliert ihm namentlich, danach teilen.

export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";

export const metadata = {
  title: "Birthday video maker with a name — AI happy birthday video | LuxuryBandit",
  description: "Personalised birthday video message: type the name, and the AI birthday video maker has her say happy birthday out loud, by name. One video, 3.99 €, ready to send.",
  keywords: ["birthday video maker", "birthday video message", "personalized birthday video", "ai birthday video", "happy birthday video with name", "birthday video maker online", "ai video generator"],
  alternates: { canonical: "/themes/birthday" },
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
  // REFERENZ für Pixverse = ein Standbild AUS dem Geburtstagsvideo (Torte, Kerzen, festliche
  // Szene). Damit übernimmt die Generierung genau diesen Look — und der Owner hat getestet,
  // dass sie den Namen dann auch ausspricht. Ihr Profilfoto wäre die falsche Szene.
  const refPhoto = (await getSignedUrl("try-this-look/uploads/birthday-bella-cake-poster.jpg").catch(() => "")) || modelPhoto;

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav subtitle="Birthdays" />
      <TrackView event="birthday_view" lookId="themes-birthday" lookName="Birthday-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {showAdmin && <ManageViewToggle view={view} />}

        {showCustomer ? (
          <div className={showAdmin ? "mt-4" : ""}>
            <Kicker>LuxuryBandit · Birthdays</Kicker>
            <H1>She says <Y>happy birthday</Y> 🎂</H1>
            <Lead>
              Type the name of whoever is celebrating — {modelName} wishes them a happy birthday by
              name, in her own video. Then send it to them.
            </Lead>

            <BirthdayFunnel modelPhoto={refPhoto} modelName={modelName} />

            {example && (
              <div className="mt-12">
                <SectionTitle>A birthday from her 🎂</SectionTitle>
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video src={example} muted loop playsInline autoPlay preload="metadata" className="aspect-[3/4] w-full object-cover" />
                </div>
              </div>
            )}
            <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
              <div>
                <SectionTitle>Birthday video maker that says the name out loud</SectionTitle>
                <Lead>
                  A personalised birthday video message without templates: type the name, and the AI
                  birthday video maker has her wish them a happy birthday out loud — by name, lips in
                  sync, cake and candles included. One video, 3.99 €, then share it wherever you like.
                </Lead>
              </div>
              <div>
                <SectionTitle>Why this is unlike anything else</SectionTitle>
                <Lead>
                  LuxuryBandit is an AI influencer marketplace, not a video app: the same woman sends
                  you a message every morning, wears the looks you pick, chats with you — and here she
                  sings out a birthday. Built on the most expensive AI video models on the market.
                </Lead>
              </div>
            </section>
          </div>
        ) : (
          /* Reiter wie ueberall, damit die Werkzeuge an jedem Thema gleich aussehen — und
             mit der Galerie, die hier bisher ganz fehlte (Owner 31.07.2026). */
          <div className="lb-theme mt-4">
            <AdminTabs
              storageKey="lb_admin_tab_birthday"
              tabs={[
                { key: "galerie", label: "🖼 Galerie", node: <UploadsAdmin title="Hochgeladen & erzeugt" theme="birthday" /> },
                { key: "videos", label: "▶ Videos", node: <KissUsersAdmin theme="birthday" /> },
              ]}
            />
          </div>
        )}
      </div>
    </main>
  );
}
