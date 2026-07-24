import Link from "next/link";
import TopNav from "@/components/TopNav";
import BellaCarouselAdmin from "@/components/BellaCarouselAdmin";
import WetterSubscribers from "@/components/WetterSubscribers";

// THEMA „Try-On" — Landing im Wetter-/Urlaub-Muster: oben die Kundenansicht (Hero + CTA in
// den Anprobier-Funnel), darunter NUR mit ?admin=1 die Admin-Werkzeuge (eigenes Card-Tool
// mit getrenntem Speicher scope="tryon" + die Abonnenten-Liste).

export const dynamic = "force-dynamic";

// Der Try-On-Funnel-Einstieg (gleicher Default-Look wie im Menü).
const TRYON_FUNNEL = "/try/look-1784191032626-70e3608b?pick=1";

export const metadata = {
  title: "Try-On — see any look on your dream model | LuxuryBandit",
  description: "Pick a look, pick a model — watch her wear it in a video. Your look, brought to life.",
};

export default async function TryOnThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const showAdmin = String(sp.admin ?? "") === "1";   // Admin-Werkzeuge NUR mit ?admin=1

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {/* Hero */}
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c9a23f]">LuxuryBandit · Try-On</p>
        <h1 className="mt-2 text-[34px] font-black leading-[1.05]">
          See any look on your <span className="text-[#c9a23f]">dream model</span> ✨
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

        {/* Admin-Werkzeuge — NUR mit ?admin=1 (die Tools blenden sich ohne PIN zusätzlich selbst aus). */}
        {showAdmin && (
          <div className="mt-8 space-y-4">
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
