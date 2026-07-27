import Link from "next/link";
import TopNav from "@/components/TopNav";
import KissFunnel from "@/components/KissFunnel";
import KissModelsAdmin from "@/components/KissModelsAdmin";
import KissUsersAdmin from "@/components/KissUsersAdmin";
import KissMediaAdmin from "@/components/KissMediaAdmin";
import ManageViewToggle from "@/components/ManageViewToggle";
import { readKissConfig, getSignedUrl, type KissConfig } from "@/lib/try-this-look-store";

// THEMA „Kiss any Model" — Landing im Wetter-Muster: oben die Kundenansicht (Hero + der
// Kiss-Funnel; darunter Beispiel-Videos + Cross-Selling zu Try-On & Wetter), mit ?admin=1
// die Admin-Werkzeuge (Medien: Teaser + Beispiele · Models-Auswahl · Kiss-Nutzungen).

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

  // Beispiel-Videos (Admin-gepflegt) — signierte URLs frisch pro Request.
  const config: KissConfig = await readKissConfig().catch(() => ({ modelIds: [] }));
  const examples: string[] = (await Promise.all((config.examplePaths ?? []).map((p: string) => getSignedUrl(p).catch(() => "")))).filter(Boolean);

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {showAdmin && <ManageViewToggle view={view} />}

        {showCustomer ? (
          <div className={showAdmin ? "mt-4" : ""}>
            {/* Hero */}
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">LuxuryBandit · Kiss</p>
            <h1 className="mt-2 text-[34px] font-black leading-[1.05]">
              Kiss any <span className="text-[#f6cf51]">model</span> 💋
            </h1>
            <p className="mt-3 text-[15px] font-medium leading-snug text-white/80">
              Pick her, upload your photo — and watch the two of you share a tender kiss in a video. Your little movie moment.
            </p>

            {/* Der Kiss-Funnel (Coverflow + Foto + Fake-Render → Abo 24 €) */}
            <KissFunnel />

            {/* Beispiel-Videos (Admin lädt sie im Kiss-Medien-Tool hoch) */}
            {examples.length > 0 && (
              <div className="mt-12">
                <p className="text-[12px] font-black uppercase tracking-wide text-white/50">See it in action</p>
                <h2 className="mt-1 text-[22px] font-black leading-tight">Real kiss videos 💋</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {examples.map((url, i) => (
                    <div key={i} className="overflow-hidden rounded-2xl border border-white/10">
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <video src={url} muted loop playsInline autoPlay preload="metadata" className="aspect-[3/4] w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cross-Selling: die anderen Live-Themen */}
            <div className="mt-12">
              <p className="text-[12px] font-black uppercase tracking-wide text-white/50">More with her</p>
              <h2 className="mt-1 text-[22px] font-black leading-tight">You might also love</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/themes/tryon" className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 active:scale-[0.98] transition">
                  <span className="text-[22px]">✨</span>
                  <p className="mt-1 text-[14px] font-black">Try-On</p>
                  <p className="mt-0.5 text-[11px] font-bold leading-snug text-white/60">See any look on your dream model — in a video.</p>
                </Link>
                <Link href="/themes/wetter/bella" className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 active:scale-[0.98] transition">
                  <span className="text-[22px]">☀️</span>
                  <p className="mt-1 text-[14px] font-black">Morning Weather</p>
                  <p className="mt-0.5 text-[11px] font-bold leading-snug text-white/60">Wake up to her message — your weather, a new look, a chat.</p>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          // Kiss-eigene Tools: Medien (Teaser + Beispiel-Videos) → Models-Auswahl → Nutzungen.
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
