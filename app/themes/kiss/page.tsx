import Link from "next/link";
import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { KUSS_SZENEN } from "@/lib/kuss-szenen";
import { resolveLang } from "@/lib/lang-server";
import { trObject } from "@/lib/tr-object";
import { Kicker, H1, Y } from "@/components/Landing";
import KissFunnel from "@/components/KissFunnel";
import KissInhalt from "@/components/KissInhalt";
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
  /**
   * DER SEO-ABSCHNITT SPRACH ENGLISCH (Owner 10.08.2026, mit Bildschirmfoto der deutschen
   * Seite: „das ist halb englisch, hab dueutsch").
   *
   * Er war der letzte handgetippte Text auf dieser Seite — zwei Überschriften und zwei
   * Absätze, direkt im JSX. Eine Seite, die auf Deutsch anfängt und auf Englisch aufhört,
   * liest sich wie eine unfertige Übersetzung; genau dort steht aber das Kaufargument.
   * Jetzt derselbe Weg wie überall: englische Quelle im Code, Übersetzung zur Laufzeit mit
   * Dauer-Cache (`trObject`).
   */
  const s = await trObject({
    seo1h: "Kiss video AI generator — online, no app",
    seo1p: "You are in the video, not just watching one. Add a photo of yourself, pick one of our AI models or upload a screenshot of any star, and the kiss video AI generator renders the two of you sharing one tender kiss. Straight in the browser — nothing to install.",
    seo2h: "Why the face still looks like your face",
    seo2p: "A kiss is the hardest thing to render: it is exactly where the two faces meet, half-turned and in motion. We run the video models that hold the face and the movement — cheaper ones lose both, and then it is not your face any more. That is the whole point of putting yourself in the picture. AI-generated, private, yours: your photo is never published and never shown to another user.",
  }, L);
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
  /**
   * NUR DATEIEN, DIE ES GIBT (Owner 07.08.2026: „jetzt muss ich wissen warum beim ersten
   * video ein poster fehlt").
   *
   * Hier standen vier Namen, und ZWEI davon lagen nicht in `public/Kiss`: `kiss.mp4` und
   * `1785526379575-f07947ab-…mp4`. Der Browser meldet dafuer `MediaError 4` und zeigt eine
   * leere Flaeche — und weil die erste Folie eine davon war, empfing die Kuss-Seite jeden
   * Besucher mit einem leeren Blatt. Ein fehlendes Poster war es nie; es fehlte das VIDEO.
   *
   * Dafuer lag `kiss-beispiel.mp4` ungenutzt daneben. Wer diese Liste anfasst, prueft die
   * Namen gegen `ls public/Kiss` — ein Tippfehler ist hier unsichtbar, bis die Karte leer ist.
   */
  /* AUS DEN VORLAGEN, NICHT VON HAND (18.08.2026) — siehe die Begruendung in
     app/themes/kiss/start/page.tsx. Der Warnsatz oben („wer diese Liste anfasst, prueft die
     Namen gegen ls public/Kiss") ist damit erledigt: Es gibt nichts mehr zu tippen. */
  const examples: string[] = KUSS_SZENEN.map(s => s.clip);

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
      <TopNav marke="LB - Kiss" heim="/media-kit" motto="The Media Creator" sprachen={["en", "de"]} />
      <TrackView event="kiss_view" lookId="themes-kiss" lookName="Kiss-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        {showAdmin && <ManageViewToggle view={view} />}

        {showCustomer ? (
          <div className={showAdmin ? "mt-4" : ""}>
            {/* Hero — in der Sprache des Besuchers (Owner 30.07.2026, Punkt 4). Das erste,
                was ein Anzeigenklick sieht; Englisch kostete hier Klicks. */}
            <H1>{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        {/* DER PREIS-CHIP IST RAUS — er steht jetzt IM Kaufknopf (Owner 10.08.2026: „ab 4,99 -
            Jetzt starten. Schreibst du in dem Button"). Zweimal derselbe Preis, vierzig Pixel
            auseinander, ist keine Auskunft, sondern ein Grund, warum der Knopf nicht mehr ins
            Bild passte. Der Baustein `ThemenPreis` bleibt und trägt die anderen Themen. */}

            {/**
              * ANLASS · GRUND · DREI SCHRITTE · PRIVATZEILE (Owner 05.08.2026: „was noch fehlt
              * ist der Anlass und Grund").
              *
              * Der Block stand hier ausgeschrieben und war die Vorlage für alle Themenseiten —
              * abschreiben musste ihn trotzdem jede. Seit dem 05.08. abends ist er ein eigener
              * Baustein (`components/ThemenVorspann`), den Geburtstag, Tanz, Hochzeit und
              * Urlaub genauso setzen. Die Begründung für die Reihenfolge steht dort.
              */}
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
            {/* DER INHALT DER LANDINGPAGE — aus einer gemeinsamen Datei, damit der Tunnel
                unter seinem Anmeldeformular exakt dasselbe zeigen kann (Owner 14.08.2026,
                Dauerregel fuer den Tunnel). */}
            <KissInhalt T={T} s={s} />
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
        <SeitenFuss marke="LB - Kiss" />
    </main>
  );
}
