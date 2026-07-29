import ModelCard from "@/components/ModelCard";
import TrackView from "@/components/TrackView";
import BellaBooking from "@/components/BellaBooking";
import BellaCarouselAdmin from "@/components/BellaCarouselAdmin";
import WetterSubscribers from "@/components/WetterSubscribers";
import LandingHeader from "@/components/LandingHeader";
import ManageViewToggle from "@/components/ManageViewToggle";
import { buildBellaCard } from "@/lib/bella-card";

export const metadata = {
  title: "Go on holiday with Bella in Tenerife — LuxuryBandit",
  description: "Your own AI influencer travels for you. Every day 3 videos + 3 stories from Tenerife. $49/day.",
};

// Signed media URLs expire — render fresh per request.
export const dynamic = "force-dynamic";

export default async function UrlaubMitBellaPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const showAdmin = String(sp.admin ?? "") === "1";
  const view = sp.view === "kunde" ? "kunde" : "admin";
  const showCustomer = !showAdmin || view === "kunde";
  const { card } = await buildBellaCard({ scope: "urlaub" });
  const first = (card?.name || "Bella").split(" ")[0];

  return (
    <main className="lb-bg min-h-screen text-white">
      <LandingHeader />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {showAdmin && <ManageViewToggle view={view} />}

        {showCustomer ? (
          <div className={showAdmin ? "mt-4" : ""}>
            {/* MESSUNG (29.07.2026): Diese Seite hat NICHTS mitgeschrieben — der Owner konnte
                nicht sagen, woher ihre Besucher kommen, obwohl sie aus Bellas Profil und aus
                dem Home-Feed verlinkt ist und der beste Instagram-Reel („Go on holiday with
                Bella in Tenerife") genau diese Überschrift trägt. Ab jetzt: Quelle, Land und
                Geräte-Kennung wie überall sonst. */}
            <TrackView event="urlaub_view" lookId="urlaub-mit-bella" lookName="Urlaub mit Bella" />
            {/* Hero */}
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">LuxuryBandit · Travel Program</p>
            <h1 className="mt-2 text-[34px] font-black leading-[1.05]">
              Go on holiday with <span className="text-[#f6cf51]">{first}</span> in Tenerife 🌴
            </h1>
            <p className="mt-3 text-[15px] font-medium leading-snug text-white/80">
              Your own AI influencer travels for you — and every day you get fresh videos & stories from the island. Like you're right there.
            </p>
            {/* Her REAL collectible card — randlos (hebt das px-4 des Containers auf) */}
            <div className="-mx-4 mt-6">
              {card ? (
                <ModelCard {...card} showProfileLink />
              ) : (
                <div className="grid aspect-[3/4] w-full place-items-center rounded-3xl border border-white/10 bg-white/5 text-white/50">
                  Bella lädt…
                </div>
              )}
            </div>
            {/* Booking (= registration) */}
            <BellaBooking firstName={first} />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <BellaCarouselAdmin heading="🎴 Urlaub-Card Tool" scope="urlaub" />
            <div className="lb-theme">
              <WetterSubscribers />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
