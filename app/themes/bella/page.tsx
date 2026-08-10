import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { fillPrices } from "@/lib/pricing";
import SubscribeCta from "@/components/SubscribeCta";
import PaidReturn from "@/components/PaidReturn";
import BellaChatBlock from "@/components/BellaChatBlock";
import ExampleVideoSlider from "@/components/ExampleVideoSlider";
import HolidayFunnel from "@/components/HolidayFunnel";
import { Kicker, H1, Y, SectionTitle, Lead, Fine } from "@/components/Landing";
import ManageViewToggle from "@/components/ManageViewToggle";
import ThemeMediaAdmin from "@/components/ThemeMediaAdmin";
import SeitenFuss from "@/components/SeitenFuss";
import { resolveLang } from "@/lib/lang-server";
import { HOLIDAY_SCENES } from "@/lib/holiday-scenes";
import { getSignedUrl, readThemeConfig, readTryThisLookState, type KissConfig } from "@/lib/try-this-look-store";

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
 * KEINE NEUE KASSE: Es ist dasselbe Themen-Abo wie überall (24,50 €/Monat, 5 Generierungen
 * über alle Themen zusammen). `SubscribeCta topic="holiday"` zeigt auf
 * /api/holiday-abo-checkout. In Stripe ist dafür nichts anzulegen.
 */

export const dynamic = "force-dynamic";   // signierte Medien-Adressen verfallen nach 24 h

const BELLA_ID = "curator-1783683672619-td4cy";

export const metadata = {
  title: "Tenerife with Bella — and you in the picture | LuxuryBandit",
  description:
    fillPrices("Not her holiday — yours. Upload your photo and Bella is in the video with you: a walk on the beach, coffee, dancing. Chatting with her is free; {price} a month for {videos} videos across all topics.", "en"),
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

  // Nur Name und Foto — seit die Sammelkarte raus ist, wäre buildBellaCard() Verschwendung:
  // das zählt Generierungen, Follower und rechnet ihren Growth-Score aus, für zwei Felder.
  // Auf einer Seite, die bezahlten Anzeigenverkehr empfängt, ist das echte Ladezeit.
  const state = await readTryThisLookState().catch(() => null);
  const bella = (state?.curators ?? []).find(c => c.id === BELLA_ID) as
    | { firstName?: string; lastName?: string; modelName?: string; photoUrl?: string } | undefined;
  const fullName = String(bella?.modelName ?? "").trim()
    || [bella?.firstName, bella?.lastName].filter(Boolean).join(" ").trim()
    || "Bella";
  const first = fullName.split(" ")[0];
  const avatarUrl = bella?.photoUrl || "";

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

      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
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

        {/* Beispiele oben: erst sehen, was rauskommt, dann selbst machen.
            Antippbar (anhalten/weiter) und mit Musik — Ton startet aus, Knopf oben rechts. */}
        <ExampleVideoSlider urls={examples} />

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

        {/* Ihre Sammelkarte stand hier und ist am 29.07.2026 wieder raus (Owner: „macht doch
            keinen Sinn"). Zu Recht: die Karte verkauft den Marktplatz-Gedanken — Growth-Score,
            „Looking for sponsor", „Sponsor an AI influencer". Diese Seite hat genau eine
            Aufgabe, nämlich ein Video mit IHM darin. Zwei Angebote auf einer Seite heißt
            keines. Ihre Karte lebt unverändert auf ihrem Profil weiter. */}

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
              modelName={fullName}
              first={first}
              avatarUrl={avatarUrl}
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
              {/* Zahlen kommen aus lib/pricing.ts — hier steht keine einzige (Owner 29.07.2026). */}
              {fillPrices("Chatting is free, always. The first video starts your subscription at {price} a month "
                + "— that is 50 % off {list}, and it stays 50 % off for as long as you stay. It covers {videos} "
                + "videos a month across ALL topics together; every extra video is {extra}. Cancel any "
                + "time in your account; the month you paid for stays yours.", "en")}
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
            {/* HIER STAND DIE WETTER-ABONNENTENLISTE — am 29.07.2026 wieder entfernt.
                Der Owner: „Die Wetter Leads sind die Wetter Leads und nicht die Urlaub Leads."
                Er hat recht, und es war doppelt falsch:
                  1. FALSCHE LISTE: `wetterSubsPath()` leitet die Bella-ID auf die gemeinsame
                     `wetter-subscribers.json` um — auf dieser Seite stand also wortwörtlich
                     das Publikum der Morgennachricht, und ein CSV-Import hier hätte die
                     Urlaubs-Leads in die Wetter-Liste geschrieben.
                  2. FALSCHER ZWECK: Das Panel verschickt die tägliche Wetternachricht
                     (wetter-send / wetter-email-blast / wetter-sms). Für ein Thema, das
                     einmalig ein Video verkauft, ist das kein sinnvolles Werkzeug.
                Eine eigene Interessentenliste für dieses Thema existiert noch nicht. Bis es
                sie gibt, steht hier lieber nichts als die falschen Leute. */}
          </div>
        )}
      </div>
        {/* DER FUSS — auf jeder Themenseite (Owner 05.08.2026). Impressum, AGB und
            Datenschutz standen nur im Menue; wer aus einer Anzeige kommt, hat sie nie
            gesehen. Siehe components/SeitenFuss. */}
        <SeitenFuss />
    </main>
  );
}
