import Link from "next/link";
import TopNav from "@/components/TopNav";
import { Kicker, H1, Y, SectionTitle, Lead } from "@/components/Landing";
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
  title: "Kiss video AI generator — your photo, her kiss, one AI video | LuxuryBandit",
  description: "AI kiss video maker online: pick a model or upload a screenshot of any star, add your photo, and the kiss video AI generator turns the two of you into one video.",
  keywords: ["kiss video ai", "kiss video ai generator", "kiss video ai free online", "ai kiss video maker", "face swap kiss video", "ai video generator", "deepfake kiss video", "ai model kiss"],
  alternates: { canonical: "/themes/kiss" },
};

export default async function KissThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);   // Aktionscode aus der Anzeige
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
            <Kicker>LuxuryBandit · Kiss</Kicker>
            <H1>Kiss any <Y>model</Y> 💋</H1>
            <Lead>
              Pick her, upload your photo — and watch the two of you share a tender kiss in a
              video. Your little movie moment.
            </Lead>

            {/* Der Kiss-Funnel (Coverflow + Foto + Fake-Render → Abo 24 €) */}
            <KissFunnel code={code} />

            {/* Beispiel-Videos (Admin lädt sie im Kiss-Medien-Tool hoch) */}
            {examples.length > 0 && (
              <div className="mt-12">
                <SectionTitle>Real kiss videos 💋</SectionTitle>
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
              <SectionTitle>You might also love</SectionTitle>
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
            <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
              <div>
                <SectionTitle>Kiss video AI generator — online, no app</SectionTitle>
                <Lead>
                  An AI kiss video maker that works with your own photo: pick one of our AI models or
                  upload a screenshot of any star, add a picture of yourself, and the kiss video AI
                  generator renders the two of you sharing one tender kiss. Face swap kiss videos
                  straight in the browser — nothing to install.
                </Lead>
              </div>
              <div>
                <SectionTitle>One of a kind — and the expensive AI behind it</SectionTitle>
                <Lead>
                  No other platform puts a whole AI influencer at your side: she chats, she wears
                  what you choose, she stars in your videos. We deliberately run the priciest video
                  models available, because cheap ones lose the face. AI-generated, private, yours.
                </Lead>
              </div>
            </section>
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
