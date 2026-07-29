import Link from "next/link";
import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { Kicker, H1, Y, SectionTitle, Lead } from "@/components/Landing";
import BellaCarouselAdmin from "@/components/BellaCarouselAdmin";
import WetterSubscribers from "@/components/WetterSubscribers";
import ManageViewToggle from "@/components/ManageViewToggle";

// THEMA „Try-On" — Landing im Wetter-/Urlaub-Muster: oben die Kundenansicht (Hero + CTA in
// den Anprobier-Funnel), darunter NUR mit ?admin=1 die Admin-Werkzeuge (eigenes Card-Tool
// mit getrenntem Speicher scope="tryon" + die Abonnenten-Liste).

export const dynamic = "force-dynamic";

// Der Try-On-Funnel-Einstieg (gleicher Default-Look wie im Menü).
const TRYON_FUNNEL = "/try/look-1784191032626-70e3608b?pick=1";

export const metadata = {
  title: "Try on AI clothes — virtual try-on video with an AI model | LuxuryBandit",
  description: "AI outfit try-on: pick a look, pick an AI model, and watch her wear it in a video — turnaround, walk, every angle. Virtual try-on online, including lingerie looks.",
  keywords: ["try on ai clothes", "try on ai", "virtual try on ai", "ai outfit try on", "ai model try on", "lingerie try on ai", "ai fashion video", "ai video generator", "ai model generator"],
  alternates: { canonical: "/themes/tryon" },
};

export default async function TryOnThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const showAdmin = String(sp.admin ?? "") === "1";   // Admin-Werkzeuge NUR mit ?admin=1
  const view = sp.view === "kunde" ? "kunde" : "admin";   // Umschalter (Standard: Admin-Tools)
  const showCustomer = !showAdmin || view === "kunde";

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <TrackView event="tryon_view" lookId="themes-tryon" lookName="Try-On-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {showAdmin && <ManageViewToggle view={view} />}

        {showCustomer ? (
          <div className={showAdmin ? "mt-4" : ""}>
            {/* Hero */}
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">LuxuryBandit · Try-On</p>
            <h1 className="mt-2 text-[34px] font-black leading-[1.05]">
              See any look on your <span className="text-[#f6cf51]">dream model</span> ✨
            </h1>
            <p className="mt-3 text-[15px] font-medium leading-snug text-white/80">
              Pick a look, pick a model — and watch her wear it in a video. Turnaround, walk, every angle.
            </p>
            {/* CTA → der bestehende Anprobier-Funnel */}
            <Link href={TRYON_FUNNEL}
              className="lb-gold mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition">
              ▶ Start the try-on — free
            </Link>
            <p className="mt-2 text-center text-[12px] font-semibold text-white/50">The first video is free. No sign-up needed to look around.</p>
            <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
              <div>
                <SectionTitle>Try on AI clothes — virtual try-on in a video</SectionTitle>
                <Lead>
                  Pick a look, pick an AI model, and watch her wear it: the virtual try-on renders a
                  real video, not a flat photo montage — turnaround, walk, every angle. Everyday
                  outfits, luxury looks and lingerie try-ons, all with AI models, all in the browser.
                </Lead>
              </div>
              <div>
                <SectionTitle>The only place where she also talks back</SectionTitle>
                <Lead>
                  Other try-on tools stop at the picture. Here the AI model you dressed also chats
                  with you, sends you a message every morning and stars in your own videos — powered
                  by the most expensive video AI we can buy, so the garment and the face survive.
                </Lead>
              </div>
            </section>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <BellaCarouselAdmin heading="🎴 Try-On-Card Tool" scope="tryon" />
            <div className="lb-theme">
              <WetterSubscribers />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
