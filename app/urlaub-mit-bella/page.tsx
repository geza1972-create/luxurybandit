import ModelCard from "@/components/ModelCard";
import BellaBooking from "@/components/BellaBooking";
import BellaCarouselAdmin from "@/components/BellaCarouselAdmin";
import LandingHeader from "@/components/LandingHeader";
import { buildBellaCard } from "@/lib/bella-card";

export const metadata = {
  title: "Go on holiday with Bella in Tenerife — LuxuryBandit",
  description: "Your own AI influencer travels for you. Every day 3 videos + 3 stories from Tenerife. $49/day.",
};

// Signed media URLs expire — render fresh per request.
export const dynamic = "force-dynamic";

export default async function UrlaubMitBellaPage() {
  const { card } = await buildBellaCard();
  const first = (card?.name || "Bella").split(" ")[0];

  return (
    <main className="min-h-screen bg-[#0d0b0a] text-white">
      <LandingHeader />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {/* Hero */}
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c9a23f]">LuxuryBandit · Travel Program</p>
        <h1 className="mt-2 text-[34px] font-black leading-[1.05]">
          Go on holiday with <span className="text-[#c9a23f]">{first}</span> in Tenerife 🌴
        </h1>
        <p className="mt-3 text-[15px] font-medium leading-snug text-white/60">
          Your own AI influencer travels for you — and every day you get fresh videos & stories from the island. Like you're right there.
        </p>

        {/* Her REAL collectible card */}
        <div className="mt-6">
          {card ? (
            <ModelCard {...card} showProfileLink />
          ) : (
            <div className="grid aspect-[3/4] w-full place-items-center rounded-3xl border border-white/10 bg-white/5 text-white/50">
              Bella lädt…
            </div>
          )}
        </div>

        {/* Admin-only: manage the slides shown in her card carousel (Peter intro + videos) */}
        <BellaCarouselAdmin />

        {/* Booking (= registration) */}
        <BellaBooking firstName={first} />
      </div>
    </main>
  );
}
