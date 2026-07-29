import TopNav from "@/components/TopNav";
import ModelCard from "@/components/ModelCard";
import TrackView from "@/components/TrackView";
import SubscribeCta from "@/components/SubscribeCta";
import PaidReturn from "@/components/PaidReturn";
import BellaChatBlock from "@/components/BellaChatBlock";
import HolidayFunnel from "@/components/HolidayFunnel";
import { Kicker, H1, Y, SectionTitle, Lead, Fine } from "@/components/Landing";
import ManageViewToggle from "@/components/ManageViewToggle";
import ThemeMediaAdmin from "@/components/ThemeMediaAdmin";
import WetterSubscribers from "@/components/WetterSubscribers";
import { resolveLang } from "@/lib/lang-server";
import { buildBellaCard } from "@/lib/bella-card";
import { HOLIDAY_SCENES } from "@/lib/holiday-scenes";
import { getSignedUrl, readThemeConfig, type KissConfig } from "@/lib/try-this-look-store";

/**
 * DIE BELLA-SEITE (Owner 29.07.2026: „wir müssen ein Thema machen nur mit Bella").
 *
 * WARUM SIE EXISTIERT: Der mit Abstand beste Instagram-Reel des Kontos heißt „Go on holiday
 * with Bella in Tenerife" — 2.975 Aufrufe und 132 Likes gegen sonst 46–182 Aufrufe und 0–1
 * Likes. Er zeigte auf `/urlaub-mit-bella`, eine Seite, die ein abgeschaltetes Angebot über
 * 49 $ pro Tag verkauft („sie reist FÜR dich"). Der beste Werbespot der Kontogeschichte
 * bewarb also ein Produkt, das es nicht mehr gibt.
 *
 * WAS SICH ÄNDERT: Dasselbe Versprechen, aber mit dem lebenden Produkt — er lädt sein Foto
 * hoch und ist WIRKLICH mit im Bild. Kein Zwischenschritt, keine Landeseite vor der
 * Landeseite: der Trichter läuft hier, auf dieser Seite.
 *
 * KEINE NEUE KASSE: Es ist dasselbe Themen-Abo wie überall (24,50 €/Monat, 25 Generierungen
 * über alle Themen zusammen). `SubscribeCta topic="holiday"` zeigt auf
 * /api/holiday-abo-checkout. In Stripe ist dafür nichts anzulegen.
 */

export const dynamic = "force-dynamic";   // signierte Medien-Adressen verfallen nach 24 h

const BELLA_ID = "curator-1783683672619-td4cy";

export const metadata = {
  title: "Tenerife with Bella — and you in the picture | LuxuryBandit",
  description:
    "Not her holiday — yours. Upload your photo and Bella is in the video with you: a walk on the beach, coffee, dancing. Chatting with her is free; 24,50 € a month for 25 videos across all topics.",
  keywords: ["bella", "ai influencer", "holiday video with ai model", "put yourself in a video", "ai girlfriend video", "tenerife"],
  alternates: { canonical: "/themes/bella" },
};

export default async function BellaThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();   // Sprache aus dem Cookie — für Kaufknopf und Rückkehrer
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const showAdmin = String(sp.admin ?? "") === "1";   // Admin-Werkzeuge NUR mit ?admin=1
  const view = sp.view === "kunde" ? "kunde" : "admin";
  const showCustomer = !showAdmin || view === "kunde";

  const { card } = await buildBellaCard({ surface: "themes", scope: "bella" });
  const first = (card?.name || "Bella").split(" ")[0];

  // Beispiel-Videos: vom Admin gepflegt (ThemeMediaAdmin unter ?admin=1). Solange noch nichts
  // eingerichtet ist, liefert /api/theme-media die Holiday-Clips als Vorgabe — dieselbe Liste
  // steht in DEFAULTS dort. Angezogen, kein Dessous oberhalb der Kasse.
  const cfg: KissConfig = await readThemeConfig("bella").catch(() => ({ modelIds: [] }));
  const paths: string[] = cfg.examplePaths ?? [
    "try-this-look/videos/holiday-example.mp4",
    "try-this-look/videos/holiday-example-2.mp4",
    "try-this-look/videos/holiday-example-3.mp4",
    "try-this-look/videos/holiday-example-4.mp4",
  ];
  const examples = (await Promise.all(paths.map(p => getSignedUrl(p).catch(() => "")))).filter(Boolean) as string[];

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      {/* Diese Seite empfängt bezahlten Anzeigenverkehr — sie MUSS messbar sein.
          `utm_source` und die Geräte-Kennung reisen über logFunnelEvent mit. */}
      <TrackView event="bella_hub" lookId="themes-bella" lookName="Bella-Thema" />

      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {showAdmin && <ManageViewToggle view={view} />}

        {showCustomer ? (
        <div className={showAdmin ? "mt-4" : ""}>
        <Kicker>LuxuryBandit · {first}</Kicker>
        <H1>Tenerife with <Y>{first}</Y> — and you in it</H1>
        <Lead>
          Not her holiday. Yours. Upload one photo, pick the moment — a walk on the beach,
          coffee, dancing — and she is in the video with you.
        </Lead>
        <PaidReturn lang={L} />

        {/* Beispiele oben: erst sehen, was rauskommt, dann selbst machen. */}
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

        <Fine>
          {HOLIDAY_SCENES.length} moments to choose from — nothing random, and what you already
          made is marked so you never get the same video twice.
        </Fine>

        {/* DER TRICHTER, direkt hier. Bella steht vorn, wechseln bleibt erlaubt. */}
        <HolidayFunnel code={code} presetModelId={BELLA_ID} presetModelName={first} />

        {/* id="abo": der Gratis-Chat springt hierher, statt einen zweiten Kauf-Dialog zu öffnen */}
        <div id="abo" className="scroll-mt-24">
          <SubscribeCta code={code} lang={L} topic="holiday" />
        </div>

        {/* Erst machen lassen, DANN zeigen, wer sie ist. */}
        {card && (
          <div className="-mx-4 mt-12">
            <ModelCard {...card} showProfileLink />
          </div>
        )}

        {/* Der Gratis-Chat ist das Einzige, was im System nachweislich zieht. */}
        <section className="mt-12 border-t border-white/10 pt-10">
          <SectionTitle>Talk to her first — that part is free</SectionTitle>
          <Lead>
            Chatting with {first} costs nothing, in any language. Ask her where she would take
            you on the island, then make the video of it.
          </Lead>
          <div className="mt-4">
            <BellaChatBlock
              curatorId={BELLA_ID}
              modelName={card?.name || "Bella"}
              first={first}
              avatarUrl={card?.photo || ""}
              freeLimit={50}
            />
          </div>
        </section>

        <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
          <div>
            <SectionTitle>You choose the moment</SectionTitle>
            <Lead>
              Every one of the {HOLIDAY_SCENES.length} moments is its own scene: the beach at golden hour, a
              candlelit rooftop, a boat on turquoise water, a market, a hammock, warm rain. You tap
              the one you want and the video is made for it — no dice roll. Once a moment is made it
              is marked, so your next video is a different day of the same holiday.
            </Lead>
          </div>
          <div>
            <SectionTitle>What it costs</SectionTitle>
            <Lead>
              Chatting is free, always. The first video starts your subscription at 24,50 € a month
              — that is 50 % off 49 €, and it stays 50 % off for as long as you stay. It covers 25
              videos a month across ALL topics together; every extra video is 3.99 €. Cancel any
              time in your account; the month you paid for stays yours.
            </Lead>
          </div>
          <div>
            {/* PFLICHT, nicht Kür: Diese Seite empfängt bezahlten Verkehr, Meta verlangt die
                Kennzeichnung und die EU-KI-Verordnung ebenfalls. Steht sichtbar, nicht im
                Kleingedruckten am Seitenende. */}
            <SectionTitle>She is an AI</SectionTitle>
            <Lead>
              {first} is an AI persona. Every photo and video of her is generated — including the
              ones with you in them. Your own face stays your face: your photo goes in as a
              reference, and the result is yours to download.
            </Lead>
          </div>
        </section>
        </div>
        ) : (
          // ADMIN-WERKZEUGE (nur mit ?admin=1): Medien des Themas, darunter die Abonnenten —
          // dieselbe Aufteilung wie bei Kiss und Wetter, damit nichts neu gelernt werden muss.
          <div className="lb-theme mt-4 space-y-4">
            <ThemeMediaAdmin
              theme="bella"
              title="Bella-Medien"
              teaserHint="Bild oder Video hochladen — wird das Cover der Bella-Karte im Themes-Katalog."
            />
            <WetterSubscribers modelId={BELLA_ID} modelSlug="bella" modelName={first} />
          </div>
        )}
      </div>
    </main>
  );
}
