import Link from "next/link";
import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { resolveLang } from "@/lib/lang-server";
import SubscribeCta from "@/components/SubscribeCta";
import { Kicker, H1, Y, SectionTitle, Lead } from "@/components/Landing";
import KissFunnel from "@/components/KissFunnel";
import KissModelsAdmin from "@/components/KissModelsAdmin";
import KissUsersAdmin from "@/components/KissUsersAdmin";
import ThemeMediaAdmin from "@/components/ThemeMediaAdmin";
import UploadsAdmin from "@/components/UploadsAdmin";
import WetterSubscribers from "@/components/WetterSubscribers";
import ManageViewToggle from "@/components/ManageViewToggle";
import AdminTabs from "@/components/AdminTabs";
import { readKissConfig, getSignedUrl, type KissConfig, readThemeConfig, readTryThisLookState } from "@/lib/try-this-look-store";
import { kissText } from "@/lib/kiss-i18n";

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
  const L = await resolveLang();   // Sprache der Seite (Cookie) — für den Kaufknopf
  const T = kissText(L, "kiss");   // Überschrift in seiner Sprache (Trichtertexte: siehe KissFunnel)
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);   // Aktionscode aus der Anzeige
  const showAdmin = String(sp.admin ?? "") === "1";   // Admin-Werkzeuge NUR mit ?admin=1
  const view = sp.view === "kunde" ? "kunde" : "admin";
  const showCustomer = !showAdmin || view === "kunde";

  // Beispiel-Videos (Admin-gepflegt) — signierte URLs frisch pro Request.
  const config: KissConfig = await readKissConfig().catch(() => ({ modelIds: [] }));
  const examples: string[] = (await Promise.all((config.examplePaths ?? []).map((p: string) => getSignedUrl(p).catch(() => "")))).filter(Boolean);

  // COVER DER ANDEREN THEMEN (Owner 30.07.2026: „hier gehoeren die Topics mit Bildern rein,
  // alle"). Dieselbe Quelle wie in der Themenuebersicht: das im Medien-Werkzeug gepflegte
  // Cover je Thema. Fehlt eines, bleibt die Kachel ohne Bild — besser als ein toter Verweis.
  const THEMEN = ["tryon", "wetter", "chat", "holiday", "bella", "idol", "birthday", "surprise"] as const;
  const cover: Record<string, string> = {};
  await Promise.all(THEMEN.map(async t => {
    try {
      const c = await readThemeConfig(t);
      // Cover, sonst der erste Beispiel-Clip — dieselbe Reihenfolge wie in der Themenuebersicht.
      const pfad = c.teaserPath || (c.examplePaths ?? [])[0] || "";
      if (pfad) cover[t] = await getSignedUrl(pfad).catch(() => "");
    } catch { /* faellt unten auf ein Model-Foto zurueck */ }
  }));

  /**
   * RUECKFALL WIE IN DER THEMENUEBERSICHT (Owner 30.07.2026: „warum fehlen da die Videos oder
   * Bilder? Wir haben sie doch, nimm doch die Originale, es sind doch die von Topics").
   *
   * Fuer die meisten Themen ist im Medien-Werkzeug noch kein Cover gepflegt — dort zeigt die
   * Uebersicht ein Model-Foto aus dem Katalog. Genau das machen wir hier auch, statt eine
   * leere Kachel mit Emoji zu zeigen.
   */
  let fotos: string[] = [];
  try {
    const st = await readTryThisLookState();
    fotos = ((st?.curators ?? []) as Array<{ id?: string; photoUrl?: string; hidden?: boolean; status?: string }>)
      .filter(c => !!c.photoUrl && !c.hidden && c.status !== "removed")
      .map(c => c.photoUrl as string);
  } catch { /**/ }
  THEMEN.forEach((t, i) => { if (!cover[t] && fotos.length) cover[t] = fotos[i % fotos.length]; });

  return (
    /* HELLE FASSUNG FÜR DEN ANZEIGEN-VERKEHR (Owner 30.07.2026: „kannst du light design
       machen, damit die Leute nicht abschrecken von dem Wechseln, FB und wir? Es muss ähnlich
       aussehen").

       Facebook ist weiß, diese Seite ist schwarz — der Sprung kostet Klicks. `lb-theme` ist
       die bereits erprobte Hell-Fassung (läuft so auf /luxury-products): weißer Grund, dunkle
       Schrift, Gold bleibt Akzent. Über `?light=1` schaltbar, damit beide Fassungen mit
       derselben Anzeige gegeneinander laufen können — dann entscheiden Zahlen, nicht Geschmack. */
    <main className={`lb-bg min-h-screen text-white${String(sp.light ?? "") === "1" ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      <TrackView event="kiss_view" lookId="themes-kiss" lookName="Kiss-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {showAdmin && <ManageViewToggle view={view} />}

        {showCustomer ? (
          <div className={showAdmin ? "mt-4" : ""}>
            {/* Hero — in der Sprache des Besuchers (Owner 30.07.2026, Punkt 4). Das erste,
                was ein Anzeigenklick sieht; Englisch kostete hier Klicks. */}
            <H1>{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
            {/* Kein Vorspann und keine Ueberzeile mehr (Owner 30.07.2026: „das kann raus" — auf die Frage, ob der
                Absatz „Pick her, upload your photo …" gemeint ist: „ja, Pick her, …").
                Er kostete auf dem Handy eine halbe Bildschirmhoehe vor dem ersten Schritt.
                Der Satz steht weiterhin in den Seiten-Metadaten, damit Google und die
                Anzeigenvorschau nicht leer ausgehen. */}

            {/* Der Kiss-Funnel (Coverflow + Foto + Fake-Render → Abo 24 €). `lang` kommt aus
                dem Umschalter bzw. der Browsersprache — der Trichter spricht acht Sprachen
                (Owner 30.07.2026, Punkt 4 seiner Liste). */}
            <KissFunnel code={code} lang={L} />

            {/* Beispiel-Videos (Admin lädt sie im Kiss-Medien-Tool hoch) */}
            {examples.length > 0 && (
              <div className="mt-12">
                <SectionTitle>{T.examples}</SectionTitle>
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

            <SubscribeCta code={code} lang={L} />

            {/* CROSS-SELLING MIT BILDERN, ALLE THEMEN (Owner 30.07.2026: „hier gehoeren die
                Topics mit Bildern rein, alle"). Zwei Textkacheln verkaufen nichts — auf
                dieser Seite hat er gerade ein Bild von sich gesehen, also zeigen wir auch
                hier, was ihn erwartet. Cover kommen aus denselben Vorgaben wie in der
                Themenuebersicht; fehlt eines, traegt das Emoji die Kachel. */}
            <div className="mt-12">
              <SectionTitle>You might also love</SectionTitle>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {[
                  { href: "/themes/tryon", t: "Try-On", d: "See any look on your dream model — in a video.", e: "✨", img: cover["tryon"] ?? "" },
                  { href: "/themes/wetter/bella", t: "Morning Weather", d: "Wake up to her message — your weather, a new look, a chat.", e: "☀️", img: cover["wetter"] ?? "" },
                  { href: "/themes/chat", t: "Chat with an AI girl", d: "Text her whenever you want — she answers in your language.", e: "💬", img: cover["chat"] ?? "" },
                  { href: "/themes/holiday", t: "Holiday with her", d: "You and her: beach, kiss, coffee, dancing.", e: "🌴", img: cover["holiday"] ?? "" },
                  { href: "/themes/bella", t: "Tenerife with Bella", d: "Not her holiday — yours, with you in the picture.", e: "🏝", img: cover["bella"] ?? "" },
                  { href: "/your-idol", t: "Your idol with you", d: "The two of you together, in one video.", e: "⭐", img: cover["idol"] ?? "" },
                  { href: "/themes/birthday", t: "Birthday video", d: "She says the name — a video made for one person.", e: "🎂", img: cover["birthday"] ?? "" },
                  { href: "/themes/surprise", t: "Surprise him", d: "Your photo → a private video only he can open.", e: "🎁", img: cover["surprise"] ?? "" },
                ].map(x => (
                  <Link key={x.href} href={x.href}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] active:scale-[0.98] transition">
                    {/* 9:16 statt 4:3 (Owner 30.07.2026: „die Kacheln sind zu klein, 9:16").
                        Hochkant zeigt vom Motiv, worauf es ankommt — die Frau, nicht den
                        Himmel darueber — und ist dasselbe Format wie die Videos selbst. */}
                    <span className="relative block aspect-[9/16] w-full overflow-hidden bg-white/[0.05]">
                      {!x.img
                        ? <span className="grid h-full w-full place-items-center text-[30px]">{x.e}</span>
                        : /\.(mp4|webm|mov)(\?|$)/i.test(x.img)
                          // eslint-disable-next-line jsx-a11y/media-has-caption
                          ? <video src={x.img} muted loop playsInline autoPlay preload="metadata" className="h-full w-full object-cover object-top" />
                          // eslint-disable-next-line @next/next/no-img-element
                          : <img src={x.img} alt="" loading="lazy" className="h-full w-full object-cover object-top" />}
                      <span className="absolute left-1.5 top-1.5 text-[18px] drop-shadow">{x.e}</span>
                    </span>
                    <span className="block p-3">
                      <span className="block text-[13.5px] font-black">{x.t}</span>
                      <span className="mt-0.5 block text-[11px] font-bold leading-snug text-white/60">{x.d}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
              <div>
                <SectionTitle>Kiss video AI generator — online, no app</SectionTitle>
                <Lead>
                  You are in the video, not just watching one. Add a photo of yourself, pick one of
                  our AI models or upload a screenshot of any star, and the kiss video AI generator
                  renders the two of you sharing one tender kiss. The first picture is free, so you
                  see the result before you decide anything. Straight in the browser — nothing to
                  install.
                </Lead>
              </div>
              <div>
                {/* Hier standen zwei Superlative, die niemand belegen kann („one of a kind",
                    „the priciest models available") — dieselben, die auf der Startseite raus
                    sind. Eine Werbeaussage, die man nicht beweisen kann, ist angreifbar und
                    klingt beim Leser ohnehin nach Marktschreier. Das echte Kaufargument ist
                    konkret, ueberpruefbar und erklaert nebenbei den Preis. */}
                <SectionTitle>Why the face still looks like your face</SectionTitle>
                <Lead>
                  A kiss is the hardest thing to render: it is exactly where the two faces meet,
                  half-turned and in motion. We run the video models that hold the face and the
                  movement — cheaper ones lose both, and then it is not your face any more. That
                  is the whole point of putting yourself in the picture. AI-generated, private,
                  yours: your photo is never published and never shown to another user.
                </Lead>
              </div>
            </section>
          </div>
        ) : (
          /* REITER STATT EINER LANGEN ROLLE (Owner 30.07.2026: „ich brauche die galerie als
             tab oben damit ich nicht immer runterscrollen muss"). Die Galerie steht vorn und
             ist der Vorgabe-Reiter — sie ist das, was er am häufigsten ansieht. */
          <div className="lb-theme mt-4">
            <AdminTabs
              storageKey="lb_admin_tab_kiss"
              tabs={[
                {
                  key: "galerie", label: "🖼 Galerie",
                  // Wer hat was hochgeladen, wann — und was kam heraus.
                  node: <UploadsAdmin title="Hochgeladen & erzeugt" theme="kiss" />,
                },
                {
                  key: "medien", label: "🎬 Medien",
                  /* Seit 29.07.2026 dasselbe Werkzeug wie bei Bella (Owner: „ich muss die
                     videos auch hier per drag and drop verschieben können"). Es liest und
                     schreibt DIESELBE Datei wie vorher — `theme="kiss"` zeigt auf
                     kiss-config.json —, bringt aber Platznummern, Ziehen zum Umsortieren
                     und „Cover leeren" mit. */
                  node: (
                    <ThemeMediaAdmin
                      theme="kiss"
                      title="Kiss-Medien"
                      teaserHint="Bild oder Video hochladen — wird das Cover der Kiss-Karte im Themes-Katalog."
                    />
                  ),
                },
                { key: "models", label: "👩 Models", node: <KissModelsAdmin /> },
                {
                  key: "leads", label: "✉️ Leads",
                  /* EIGENE Liste für die Kissing-Leads aus Meta (Owner 29.07.2026, nach
                     seiner Regel „Die Wetter Leads sind die Wetter Leads"). Sie liegt in
                     einer eigenen Datei (`wetter-subscribers-kiss.json`) und hat KEINEN
                     Versandknopf: E-Mail, SMS und Bot bauen fest die Wetter-Nachricht —
                     diese Leute haben sich für das Kissing-Formular eingetragen und würden
                     sonst etwas Falsches bekommen. */
                  node: (
                    <WetterSubscribers
                      modelId="kiss"
                      modelName="Kissing"
                      listLabel="Kissing-Leads"
                      linkPath="/themes/kiss"
                      sending={false}
                      // Von einem Kissing-Lead haben wir nur die Adresse — Stadt, Telefon und
                      // Geburtstag sind Wetter-Felder und blieben hier immer leer.
                      nurMail
                    />
                  ),
                },
                { key: "videos", label: "▶ Videos", node: <KissUsersAdmin theme="kiss" /> },
              ]}
            />
          </div>
        )}
      </div>
    </main>
  );
}
