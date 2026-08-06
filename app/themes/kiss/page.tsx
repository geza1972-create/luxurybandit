import Link from "next/link";
import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { resolveLang } from "@/lib/lang-server";
import { Kicker, H1, Y, SectionTitle, Lead } from "@/components/Landing";
import KissFunnel from "@/components/KissFunnel";
import ThemenVorspann from "@/components/ThemenVorspann";
import KissModelsAdmin from "@/components/KissModelsAdmin";
import KissUsersAdmin from "@/components/KissUsersAdmin";
import ThemeMediaAdmin from "@/components/ThemeMediaAdmin";
import UploadsAdmin from "@/components/UploadsAdmin";
import WetterSubscribers from "@/components/WetterSubscribers";
import ManageViewToggle from "@/components/ManageViewToggle";
import AdminTabs from "@/components/AdminTabs";
import ThemenPreis from "@/components/ThemenPreis";
import SeitenFuss from "@/components/SeitenFuss";
import { readThemeConfig, readTryThisLookState } from "@/lib/try-this-look-store";
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

/**
 * Was das Abo beim Kuss wirklich bietet — Zahlen als Platzhalter, nie getippt.
 *
 * OHNE „Chatten bleibt gratis" (Owner 31.07.2026: „chatten gibts hier nicht"). Der Satz kam
 * aus dem alten Abo-Text und stimmt auf den Chat-Seiten — hier verspricht er etwas, das es
 * auf dieser Seite gar nicht gibt. Ein Versprechen, das der Besucher nicht einloesen kann,
 * kostet mehr Vertrauen, als der Satz an Wert bringt.
 */

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

  /**
   * DIE VIER FERTIGEN VIDEOS AUS public/Kiss — und NUR diese (Owner 06.08.2026: „bei Kiss in
   * der Card, nimm bitte die Videos die sich in /public/Kiss befinden"). Lokal statt
   * signierter Supabase-Adressen: keine Speicher-Abfragen je Aufruf, die Karte ist nie leer,
   * wenn der Speicher hakt — und keine acht Folien, weil die alten Admin-Beispiele
   * (`config.examplePaths`) dieselben Küsse noch einmal zeigten. Die stehen weiter im
   * Admin-Werkzeug, gerendert werden sie hier nicht mehr.
   */
  const examples: string[] = [
    "/Kiss/kiss.mp4",
    "/Kiss/Video4-kiss-normal.mp4",
    "/Kiss/kiss-stand-close.mp4",
    "/Kiss/1785526379575-f07947ab-363f-4b74-85bf-89aebaff8e31.mp4",
  ];

  /* Die Cover der anderen Themen wurden nur fuer „You might also love" geladen — acht
     Supabase-Abfragen je Seitenaufruf. Der Block ist raus (siehe unten), also auch das. */

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
            <ThemenPreis thema="kiss" lang={L} className="mt-3" />

            {/**
              * ANLASS · GRUND · DREI SCHRITTE · PRIVATZEILE (Owner 05.08.2026: „was noch fehlt
              * ist der Anlass und Grund").
              *
              * Der Block stand hier ausgeschrieben und war die Vorlage für alle Themenseiten —
              * abschreiben musste ihn trotzdem jede. Seit dem 05.08. abends ist er ein eigener
              * Baustein (`components/ThemenVorspann`), den Geburtstag, Tanz, Hochzeit und
              * Urlaub genauso setzen. Die Begründung für die Reihenfolge steht dort.
              */}
            <ThemenVorspann anlass={T.anlass} grund={T.grund}
              wieGeht={T.wieGeht} wieGehtPrivat={T.wieGehtPrivat} />
            {/* Kein Vorspann und keine Ueberzeile mehr (Owner 30.07.2026: „das kann raus" — auf die Frage, ob der
                Absatz „Pick her, upload your photo …" gemeint ist: „ja, Pick her, …").
                Er kostete auf dem Handy eine halbe Bildschirmhoehe vor dem ersten Schritt.
                Der Satz steht weiterhin in den Seiten-Metadaten, damit Google und die
                Anzeigenvorschau nicht leer ausgehen. */}

            {/* Der Kiss-Funnel (Coverflow + Foto + Fake-Render → Abo 24 €). `lang` kommt aus
                dem Umschalter bzw. der Browsersprache — der Trichter spricht acht Sprachen
                (Owner 30.07.2026, Punkt 4 seiner Liste). */}
            {/* Dasselbe Beispielvideo, das weiter unten im Katalog laeuft — es fuellt jetzt
                die Karte oben, bis das eigene Bild da ist. Kein zweiter Ort zum Pflegen. */}
            <KissFunnel code={code} lang={L} beispielVideos={examples} />

            {/* Beispiel-Videos (Admin lädt sie im Kiss-Medien-Tool hoch) */}
            {/* MEHR VON DEMSELBEN, ALS KARTEN (Owner 31.07.2026: „du machst diese Karte
                mehrmals untereinander und nimmst unsere Kiss-Videos"). Dieselbe Karte wie
                oben, viermal — jede mit „Personen ersetzen". Wer scrollt, sieht viermal das
                Ergebnis, das er haben kann, statt acht Briefmarken. */}
            {/* DIE ZWEITE KARTE IST WEG (Owner 05.08.2026: „nein, es sind zwei Karten").
                Hier stand die Beispiel-Galerie — erst als Stapel, dann als eigene Karte mit
                Karussell. Beides war eine ZWEITE Karte unter der ersten, und genau das wollte
                er nicht: „eine Karte und die Videos wechseln sich ab in der Karte."
                Alle Beispiele liegen jetzt in der Karte oben (`beispielVideos` am Trichter).
                Die Seite ist damit um eine ganze Handy-Höhe je Beispiel kürzer. */}

            {/* WARUM MAN EINEN SCHICKT (Owner 03.08.2026: „unten soll dann stehn warum man
                das machen sollte. Es zeigt Liebe, es zeigt etwas schönes … du vermisst
                jemandem, das ist ein Liebesbeweis").
                ANLAESSE, KEINE WARNUNGEN — vom Owner am 03.08. ausdruecklich so entschieden.
                Ein „bitte nicht" an dieser Stelle bremst genau die Stimmung, aus der heraus
                jemand einen Kuss verschickt; die Pflichten traegt der Nutzungshinweis im
                Trichter darueber.
                Die Zeilen stehen NACH den Beispielen: Erst sieht er, was dabei herauskommt,
                dann liest er, warum es ihn angeht. Umgekehrt waere es eine Predigt vor dem
                Beweis. */}
            <div className="mt-12">
              <SectionTitle>{T.anlaesseTitel}</SectionTitle>
              <ul className="mt-3 space-y-2">
                {T.anlaesse.map((zeile: string, i: number) => (
                  <li key={i} className="flex gap-2.5 text-[14px] font-semibold leading-snug text-white/75">
                    <span className="mt-[3px] text-[13px] leading-none text-[#f6cf51]">❤</span>
                    {zeile}
                  </li>
                ))}
              </ul>
              {/* Der Schlusssatz ist der Satz des Owners, nur zugespitzt: „das ist ein
                  Liebesbeweis". Er steht abgesetzt, weil er das Argument traegt — alles
                  darueber sind nur die Gelegenheiten dazu. */}
              <p className="mt-4 border-l-2 border-[#f6cf51]/50 pl-3 text-[15px] font-black leading-snug text-white">
                {T.anlaesseSchluss}
              </p>
            </div>

            {/* EIGENER WORTLAUT, WEIL DER ALTE NICHT MEHR STIMMT (Owner 31.07.2026: „das
                passt nicht").
                Dort stand „Videos mit ihr — und du mit im Bild". Es gibt keine „ihr" mehr:
                Seit heute nimmt dieser Trichter nur noch SEINE eigenen Fotos („du machst nur
                upload your photo, nicht unsere Models"). Der Satz warb also fuer einen
                Katalog, den es auf dieser Seite nicht mehr gibt.
                Und „die heisseste KI-Erfahrung" ist eine Behauptung — die Zahl daneben ist
                ein Angebot. Zahlen kommen aus lib/pricing, nie von Hand. */}
            {/* DER ABO-BLOCK IST RAUS (Owner 03.08.2026: „wir haben so was gar nicht mehr,
                2,99 im Abokauf. Wir haben nur Credits. Schaffe Abo für Kissing ab").
                Hier stand „20 Videos im Monat … jedes weitere 2,99 €" und „Freischalten —
                24,50 €/Monat" — beides gibt es fuer den Kuss nicht mehr. Der einzige Weg
                ist die Aufladung im Trichter darueber; ein Monatspreis daneben zieht genau
                die Aufmerksamkeit ab, die der 4,99-Einstieg braucht. Der Baustein bleibt
                fuer Hochzeit, Wetter und Chat. */}

            {/* „YOU MIGHT ALSO LOVE" IST RAUS (Owner 31.07.2026: „das machst du eh falsch,
                falsche Bilder").
                Er hat recht, und der Fehler stand im Code: Fuer Themen ohne eigenes Cover
                nahm die Kachel EIN BELIEBIGES Kuratorinnen-Foto (`fotos[i % fotos.length]`).
                Damit warb „Birthday video" mit einer fremden Frau, die nichts mit
                Geburtstagen zu tun hat — acht Kacheln, die etwas anderes versprechen als
                das, was dahinter liegt. Ein zufaelliges Bild ist schlimmer als gar keines.
                An dieser Stelle stehen jetzt unsere eigenen Kuss-Videos als Karten. */}
            <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
              <div>
                <SectionTitle>Kiss video AI generator — online, no app</SectionTitle>
                <Lead>
                  You are in the video, not just watching one. Add a photo of yourself, pick one of
                  our AI models or upload a screenshot of any star, and the kiss video AI generator
                  renders the two of you sharing one tender kiss. Straight in the browser — nothing
                  to install.
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
        {/* DER FUSS — auf jeder Themenseite (Owner 05.08.2026). Impressum, AGB und
            Datenschutz standen nur im Menue; wer aus einer Anzeige kommt, hat sie nie
            gesehen. Siehe components/SeitenFuss. */}
        <SeitenFuss />
    </main>
  );
}
