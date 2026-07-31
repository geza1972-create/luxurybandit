import TopNav from "@/components/TopNav";
import { fillPrices } from "@/lib/pricing";
import TrackView from "@/components/TrackView";
import { resolveLang } from "@/lib/lang-server";
import SubscribeCta from "@/components/SubscribeCta";
import PaidReturn from "@/components/PaidReturn";
import { Kicker, H1, Y, SectionTitle, Lead, Fine } from "@/components/Landing";
import HolidayFunnel from "@/components/HolidayFunnel";
import { HOLIDAY_SCENES } from "@/lib/holiday-scenes";
import { getSignedUrl } from "@/lib/try-this-look-store";

// THEMA „Holiday with your dream girl" — löst die alte Bella-Reise ab: nicht mehr SIE
// reist und er schaut zu, sondern ER macht die Videos selbst. Gleiches Schema wie überall:
// Foto + Model + Szene → Fake-Render → Teaser → zahlen → echter Render → Download.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Holiday with your dream girl — you and her, 25 moments | LuxuryBandit",
  description: fillPrices("Upload your photo, pick her, pick the moment — a walk on the beach, a kiss, coffee, dancing. You make the videos yourself: {price} a month for {videos} videos across all topics, every extra one {extra}.", "en"),
  keywords: ["ai video generator", "ai girlfriend video", "holiday video with ai model", "put yourself in a video", "ai model video maker", "face swap video ai", "virtual girlfriend photos"],
  alternates: { canonical: "/themes/holiday" },
};

export default async function HolidayThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();   // Sprache der Seite (Cookie) — für den Kaufknopf
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);

  // Beispiele stehen UNTEN (Owner): erst machen lassen, dann zeigen, was rauskommt.
  // Beispiel-Slider: so viele, wie im Storage liegen (example, -2, -3, -4 …).
  const examples = (await Promise.all([
    getSignedUrl("try-this-look/videos/holiday-example.mp4").catch(() => ""),
    getSignedUrl("try-this-look/videos/holiday-example-2.mp4").catch(() => ""),
    getSignedUrl("try-this-look/videos/holiday-example-3.mp4").catch(() => ""),
    getSignedUrl("try-this-look/videos/holiday-example-4.mp4").catch(() => ""),
  ])).filter(Boolean) as string[];

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <TrackView event="holiday_view" lookId="themes-holiday" lookName="Holiday-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        <Kicker>LuxuryBandit · Holiday</Kicker>
        <H1>Holiday with your <Y>dream girl</Y></H1>
        <Lead>
          Not her holiday — yours. Upload your photo, pick the woman you want beside you, then
          pick the moment: a walk on the beach, holding hands, a kiss, coffee, dancing.
        </Lead>
        <PaidReturn lang={L} />
        <Fine>
          {HOLIDAY_SCENES.length} moments to choose from — nothing random, and what you already
          made is marked so you never get the same video twice.
        </Fine>

        {/* Beispiele GANZ OBEN als Slider (Owner): wischen, sehen was rauskommt, dann machen. */}
        {examples.length > 0 && (
          <div className="-mx-4 mt-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {examples.map((url, i) => (
              <div key={i} className="w-[62%] max-w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video src={url} muted loop playsInline autoPlay preload="metadata" className="aspect-[3/4] w-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <HolidayFunnel code={code} />


        <SubscribeCta code={code} lang={L} topic="holiday" />

        <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
          <div>
            <SectionTitle>You choose, nothing is random</SectionTitle>
            <Lead>
              Every one of the {HOLIDAY_SCENES.length} moments is its own scene: the beach at golden hour, a candlelit
              rooftop, a boat on turquoise water, a market, a hammock, warm rain. You tap the one you
              want, and the video is made for it — no dice roll, no surprise you did not order. Once a
              moment is made it is marked, so your next video is a different day of the same holiday.
            </Lead>
          </div>
          <div>
            <SectionTitle>What it costs</SectionTitle>
            <Lead>
              {fillPrices("The first video starts your subscription at {price} a month: {videos} videos a month across ALL topics together — Holiday, Chat, Kiss, whatever you feel like. Every extra video after that is {extra}. You can cancel the subscription in your account at any time; the month you paid for stays yours.", "en")}
            </Lead>
          </div>
          <div>
            <SectionTitle>Your face stays your face</SectionTitle>
            <Lead>
              Your photo and hers go in as references and the prompt holds both faces — that is why we
              run the expensive video model instead of the cheap one. AI-generated, not a real
              recording: it is your daydream on film, and it stays yours.
            </Lead>
          </div>
        </section>
      </div>
    </main>
  );
}
