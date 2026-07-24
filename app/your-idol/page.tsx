import Link from "next/link";
import TopNav from "@/components/TopNav";
import BellaCarouselAdmin from "@/components/BellaCarouselAdmin";
import WetterSubscribers from "@/components/WetterSubscribers";

// „Your Idol as an AI-Model" — Landing im Wetter-/Urlaub-Muster: oben die Kundenansicht
// (Hero + CTA in den Idol-Funnel, ?idol=1 = direkt Foto hochladen statt Model wählen),
// darunter NUR mit ?admin=1 die Admin-Werkzeuge (eigenes Card-Tool scope="idol" + Abonnenten).

export const dynamic = "force-dynamic";

// Der Idol-Einstieg: Try-On-Funnel im Idol-Modus (Upload-Screen statt Model-Grid).
const IDOL_FUNNEL = "/try/look-1784191032626-70e3608b?idol=1";

export const metadata = {
  title: "Your Idol as an AI-Model — upload, chat, dress, animate | LuxuryBandit",
  description: "Upload your idol's photo — she becomes your AI model: chat with her, dress her, animate her into a video.",
};

export default async function YourIdolPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const showAdmin = String(sp.admin ?? "") === "1";   // Admin-Werkzeuge NUR mit ?admin=1

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {/* Hero */}
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c9a23f]">LuxuryBandit · Your Idol</p>
        <h1 className="mt-2 text-[34px] font-black leading-[1.05]">
          Your idol as an <span className="text-[#c9a23f]">AI-Model</span> 💫
        </h1>
        <p className="mt-3 text-[15px] font-medium leading-snug text-white/80">
          Upload her photo — she becomes your AI model. Chat with her, dress her in any look, and animate her into a video: walking, smiling, full of life.
        </p>

        {/* CTA → der Idol-Funnel (Upload-Screen) */}
        <Link href={IDOL_FUNNEL}
          className="lb-gold mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition">
          📸 Upload her photo — free
        </Link>
        <p className="mt-2 text-center text-[12px] font-semibold text-white/50">Your first video is free. She stays private to you.</p>

        {/* Admin-Werkzeuge — NUR mit ?admin=1 (die Tools blenden sich ohne PIN zusätzlich selbst aus). */}
        {showAdmin && (
          <div className="mt-8 space-y-4">
            <BellaCarouselAdmin heading="🎴 Idol-Card Tool" scope="idol" />
            <div className="lb-theme">
              <WetterSubscribers />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
