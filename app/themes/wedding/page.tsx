import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { resolveLang } from "@/lib/lang-server";
import { H1, Y, SectionTitle, Lead } from "@/components/Landing";
import { Check } from "lucide-react";
import KissFunnel from "@/components/KissFunnel";
import UploadsAdmin from "@/components/UploadsAdmin";
import ThemeMediaAdmin from "@/components/ThemeMediaAdmin";
import ManageViewToggle from "@/components/ManageViewToggle";
import AdminTabs from "@/components/AdminTabs";
import EinladungenAdmin from "@/components/EinladungenAdmin";
import KissModelsAdmin from "@/components/KissModelsAdmin";
import KissUsersAdmin from "@/components/KissUsersAdmin";
import WetterSubscribers from "@/components/WetterSubscribers";
import ExampleVideos from "@/components/ExampleVideos";
import { getSignedUrl, readThemeConfig } from "@/lib/try-this-look-store";
import { kissText } from "@/lib/kiss-i18n";

/**
 * THEMA „HOCHZEITSKUSS" (Owner 30.07.2026: „ich will eher wie sie sich einen Hochzeitskuss
 * geben als Bild. Sie und er … die Frauen lieben Hochzeiten").
 *
 * Es ist DERSELBE Trichter wie beim Kuss — `variant="wedding"` tauscht Auftrag, Rollen und
 * Beschriftung. Bewusst keine Kopie der Datei: Jede Korrektur von heute (Adresse vor der
 * Erzeugung, Zustimmung, serverseitige Lieferung, sieben Sprachen) müsste sonst zweimal
 * gemacht werden.
 *
 * ROLLEN: Hier bedient SIE. Schritt 1 ist die Braut — sie selbst —, Schritt 2 der Bräutigam.
 */

export const dynamic = "force-dynamic";

/**
 * SEO AUF „HOCHZEITSEINLADUNG", nicht auf „Hochzeitskuss" (Owner 31.07.2026: „das muss doch
 * heissen Hochzeitseinladung, weil die Leute danach suchen werden").
 *
 * Er hat recht, und es ist der wichtigere Punkt: „AI wedding kiss" sucht niemand — das ist
 * unser Wort fuer unsere Technik. Gesucht wird „Hochzeitseinladung digital", „invitatie de
 * nunta video", „faire-part de mariage video": Menschen mit einem Datum, einer Gaesteliste und
 * einer Aufgabe. Die Begriffe stehen deshalb in Titel, Beschreibung UND im sichtbaren Text —
 * Google bewertet, was auf der Seite steht, nicht was in den Metadaten behauptet wird.
 */
/**
 * BEISPIELDATEN FUER DIE KARTEN unter dem Trichter. Erkennbar Muster, kein echtes Paar.
 * Der Ort wechselt mit der Sprache — eine rumaenische Besucherin soll sich die Einladung
 * vorstellen koennen, nicht eine fremde Stadt lesen.
 */
/** Die Sprachen, in denen die Einladung selbst erscheint — in der jeweiligen Sprache
 *  geschrieben, damit ein Gast seine eigene erkennt, ohne zu ueberlegen. */
const SPRACH_LABELS = [
  { code: "en", label: "English" }, { code: "ro", label: "Română" },
  { code: "fr", label: "Français" }, { code: "es", label: "Español" },
  { code: "it", label: "Italiano" }, { code: "pt", label: "Português" },
  { code: "de", label: "Deutsch" },
];
const BEISPIEL_NAMEN: [string, string][] = [["Ana", "Mihai"], ["Elena", "Andrei"]];
const BEISPIEL_ORT: Record<string, string> = {
  de: "Schlosshotel Grunewald", en: "The Old Manor House", ro: "Casa Timiș",
  es: "Hacienda Los Olivos", fr: "Château de Villandry", pt: "Quinta da Aveleda", it: "Villa Bellosguardo",
};
/** Die Anschrift MIT Postleitzahl — sie ist der Punkt, an dem sich eine Einladung von einem
 *  huebschen Video unterscheidet. Erkennbar Beispiel, kein echter Ort. */
const BEISPIEL_ADRESSE: Record<string, string> = {
  de: "Musterstraße 12, 14193 Berlin", en: "12 Sample Lane, SW1A 1AA London",
  ro: "Str. Exemplu 12, 106100 Sinaia", es: "Calle Ejemplo 12, 28001 Madrid",
  fr: "12 rue Exemple, 75008 Paris", pt: "Rua Exemplo 12, 1200-001 Lisboa",
  it: "Via Esempio 12, 00187 Roma",
};

export const metadata = {
  title: "Digital wedding invitation video — send it on WhatsApp | LuxuryBandit",
  description: "Make your wedding invitation as a video: upload one photo of you and one of him, and the two of you appear at your wedding. Send the invitation link on WhatsApp — the picture is free.",
  keywords: [
    "wedding invitation video", "digital wedding invitation", "send wedding invitation whatsapp",
    "online wedding invitation", "save the date video", "video invitation wedding",
    "invitatie de nunta video", "invitatie de nunta online", "faire-part de mariage video",
    "invitación de boda digital", "convite de casamento digital", "invito di matrimonio video",
    "digitale Hochzeitseinladung", "Hochzeitseinladung Video",
  ],
  alternates: { canonical: "/themes/wedding" },
};

export default async function WeddingThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const T = kissText(L, "wedding");
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const showAdmin = String(sp.admin ?? "") === "1";
  const view = sp.view === "kunde" ? "kunde" : "admin";
  const showCustomer = !showAdmin || view === "kunde";

  const cfg = await readThemeConfig("wedding").catch(() => ({ modelIds: [] as string[], examplePaths: [] as string[] }));
  // Rund hundert Tage voraus: So weit im Voraus verschickt man Einladungen, und es steht
  // damit immer in der Zukunft — anders als ein eingetipptes Datum.
  const inHundertTagen = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000);
  const beispielDatum = inHundertTagen.toISOString().slice(0, 10);
  const examples: string[] = (await Promise.all((cfg.examplePaths ?? []).map((p: string) => getSignedUrl(p).catch(() => "")))).filter(Boolean);

  return (
    /* HELL IST DIE VORGABE (Owner 31.07.2026: „default ist light modus"). Umgekehrt zu
       vorher: Die Seite kommt hell, `?light=0` schaltet dunkel. Eine Hochzeit ist hell, und
       der Sprung von der weissen Anzeige auf eine schwarze Seite kostete Klicks. Der
       Schalter im Balken ueberstimmt beides und merkt sich die Wahl. */
    <main className={`lb-bg min-h-screen text-white${String(sp.light ?? "") === "0" ? "" : " lb-theme lb-fb"}`}>
      <TopNav />
      <TrackView event="wedding_view" lookId="themes-wedding" lookName="Hochzeits-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {showAdmin && <ManageViewToggle view={view} />}

        {showCustomer ? (
          <div className={showAdmin ? "mt-4" : ""}>
            <H1>{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
            {/* EIN Satz, mehr nicht (Owner 31.07.2026). Die Überschrift sagt „Einladung",
                der erste Schritt fragt nach zwei Fotos — dazwischen fehlte die Erklärung. */}
            {T.heroLead && <Lead className="mt-2">{T.heroLead}</Lead>}

            {/* Derselbe Trichter wie beim Kuss, andere Variante. */}
            <KissFunnel variant="wedding" code={code} lang={L} />

            {/* GROSS UND MIT TON (Owner 30.07.2026: „bitte mit vergroessern und song").
                Eine Reihe statt zweier Spalten: Ein Hochzeitskuss auf halber Breite ist eine
                Briefmarke — das ist das Bild, das den Trichter verkauft. Der Ton startet
                stumm, weil jeder Browser Ton ohne Zutun blockiert; ein Tipp auf den Knopf
                schaltet ihn an (siehe ExampleVideos). */}
            {examples.length > 0 && (
              <div className="mt-12">
                <SectionTitle>{T.examples}</SectionTitle>
                {/* IN DER KARTE, NICHT NACKT (Owner 31.07.2026: „unten zeigst du die
                    Videos. Ich will die Einladungskarte sehen. Der User muss gleich sehen,
                    was er bekommt"). Namen und Ort sind erkennbar Beispiele; das Datum wird
                    hier gerechnet und nicht eingetippt, sonst steht in einem halben Jahr ein
                    Termin in der Vergangenheit auf der Verkaufsseite. */}
                <ExampleVideos urls={examples} karte={{
                  sprache: L,
                  paare: [
                    {
                      sie: BEISPIEL_NAMEN[0][0], er: BEISPIEL_NAMEN[0][1], datum: beispielDatum,
                      ort: BEISPIEL_ORT[L] ?? BEISPIEL_ORT.en,
                      adresse: BEISPIEL_ADRESSE[L] ?? BEISPIEL_ADRESSE.en,
                      // Nummer nur zum Zeigen — der Knopf ist auf der Verkaufsseite nicht
                      // verlinkt, sonst schreiben Fremde einer erfundenen Nummer.
                      telefon: "+00 000 000 000", demo: true,
                    },
                  ],
                }}
                  sprachen={SPRACH_LABELS}
                  sprachenTitel={T.einlSprachen} />
              </div>
            )}
            {/* WAS ER BEKOMMT (Owner 31.07.2026: „du musst noch zeigen was er bekommt").
                Direkt unter der Karte: Erst sieht er sie, dann liest er in fuenf Zeilen, was
                dazugehoert. Jede Zeile ist etwas, das es wirklich gibt — eine Liste, die mehr
                verspricht als die Seite haelt, kostet beim ersten Kunden mehr, als sie
                einbringt. */}
            <div className="mt-5 rounded-2xl border border-[#f6cf51]/25 bg-[#f6cf51]/[0.05] p-4">
              <p className="text-[15px] font-black text-white">{T.bekommstTitel}</p>
              <ul className="mt-2 space-y-1.5">
                {T.bekommst.map((zeile, i) => (
                  <li key={i} className="flex gap-2 text-[13px] font-bold leading-snug text-white/80">
                    <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[#f6cf51]" />
                    <span>{zeile}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* KEIN ABO AUF DER HOCHZEITSSEITE (Konzept §5, Owner 31.07.2026). Hier stand
                „Die heisseste KI-Erfahrung freischalten — 24,50 €/Monat": der Kuss-Kasten,
                der beim Duplizieren ungeprueft mitkam. Eine Hochzeit hat man einmal — ein
                Monatsabo dafuer ist unglaubwuerdig, und der Ton passt zum Anlass nicht. */}

            {/* DER SICHTBARE TEXT IST DAS SEO (Owner 31.07.2026: „mach die texte nach
                konzept auf der seite. Es muss seo tauglich sein"). Vier Abschnitte entlang
                dessen, was Menschen wirklich eintippen: eine Einladung als Video, digital
                verschicken, was es kostet, wie privat es bleibt. Keine Stichwortliste —
                Saetze, die auch ein Mensch liest, sonst wertet Google sie ab. */}
            <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
              <div>
                <SectionTitle>A wedding invitation as a video — with the two of you in it</SectionTitle>
                <Lead>
                  Instead of a printed card: your <strong>digital wedding invitation</strong> is a
                  short video in which you and your partner appear on your own wedding day — you in
                  a white dress, him in a white suit, in the church, with the kiss. Upload one photo
                  of yourself and one of him; the AI does the rest. The picture is free, so you see
                  what it looks like before you decide anything.
                </Lead>
              </div>
              <div>
                <SectionTitle>Send your invitation on WhatsApp</SectionTitle>
                <Lead>
                  Every invitation gets its own page with your names, the date and the place. You
                  send that one link — on WhatsApp, in your family group, wherever your guests
                  already are. No app for them, no login, no printing, no postage. The invitation
                  speaks your guests&rsquo; language by itself: whoever opens it reads it in their
                  own — English, Romanian, French, Spanish, Portuguese, Italian or German — so the
                  relatives abroad get the same invitation as everyone at home. You can take the
                  link back at any time, and you see how many guests have opened it.
                </Lead>
              </div>
              <div>
                <SectionTitle>Save the date — in the weeks before the wedding</SectionTitle>
                <Lead>
                  Most couples send a save-the-date two to four months before the wedding and the
                  full invitation six to eight weeks ahead. A video invitation gets watched instead
                  of skimmed, and it works the same for guests abroad — they open the same link on
                  their phone.
                </Lead>
              </div>
              <div>
                <SectionTitle>Your photos stay yours</SectionTitle>
                <Lead>
                  The two photos you upload are used to make your video and nothing else. They are
                  never published and never shown to other users, they are stored on servers in the
                  EU, and everything from a visit without a purchase is deleted after 90 days. The
                  invitation page itself is not listed anywhere and cannot be found on Google — only
                  the people you send the link to can open it.
                </Lead>
              </div>
            </section>
          </div>
        ) : (
          <div className="lb-theme mt-4">
            <AdminTabs
              storageKey="lb_admin_tab_wedding"
              tabs={[
                { key: "galerie", label: "🖼 Galerie", node: <UploadsAdmin title="Hochgeladen & erzeugt" theme="wedding" /> },
                {
                  key: "medien", label: "🎬 Medien",
                  node: (
                    <ThemeMediaAdmin
                      theme="wedding"
                      title="Hochzeits-Medien"
                      teaserHint="Bild oder Video hochladen — wird das Cover der Hochzeits-Karte im Themes-Katalog."
                    />
                  ),
                },
                // EIGENE BRAEUTE (Owner 31.07.2026: „ich will die Wedding-Seite managen wie
                // Kiss"). Die Auswahl liegt in der Hochzeits-Datei, nicht in der von Kiss —
                // wer hier anhakt, aendert nur dieses Karussell.
                { key: "models", label: "👰 Bräute", node: <KissModelsAdmin theme="wedding" /> },
                // EIGENE LISTE, nach derselben Regel wie bei den Wetter-Leads: Wer sich fuer
                // die Hochzeit eingetragen hat, hat nicht um Kuss-Post gebeten.
                {
                  key: "leads", label: "✉️ Leads",
                  node: (
                    <WetterSubscribers
                      modelId="wedding"
                      modelName="Hochzeit"
                      listLabel="Hochzeits-Leads"
                      linkPath="/themes/wedding"
                      sending={false}
                      nurMail
                    />
                  ),
                },
                // DIE EINLADUNGEN mit ihren Oeffnungen — die eine Zahl, an der sich
                // entscheidet, ob aus dem Video ein Kanal wird (Konzept, Tor 2).
                { key: "einladungen", label: "💌 Einladungen", node: <EinladungenAdmin /> },
                { key: "videos", label: "▶ Videos", node: <KissUsersAdmin theme="wedding" /> },
              ]}
            />
          </div>
        )}
      </div>
    </main>
  );
}
