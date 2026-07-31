import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { resolveLang } from "@/lib/lang-server";
import { H1, Y, SectionTitle, Lead } from "@/components/Landing";
import { Check, FileText, Video, MessageCircle, UserCheck, Mail, MessagesSquare, Globe, ChevronRight } from "lucide-react";
import EinladungBauen from "@/components/EinladungBauen";
import UploadsAdmin from "@/components/UploadsAdmin";
import ThemeMediaAdmin from "@/components/ThemeMediaAdmin";
import ManageViewToggle from "@/components/ManageViewToggle";
import AdminTabs from "@/components/AdminTabs";
import EinladungenAdmin from "@/components/EinladungenAdmin";
import KissModelsAdmin from "@/components/KissModelsAdmin";
import KissUsersAdmin from "@/components/KissUsersAdmin";
import WetterSubscribers from "@/components/WetterSubscribers";
import ExampleVideos from "@/components/ExampleVideos";
import ZusagenKarte from "@/components/ZusagenKarte";
import SubscribeCta from "@/components/SubscribeCta";
import GruppenChat from "@/components/GruppenChat";
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
/** Beispiel-Gaesteliste. Vornamen, wie die echte Liste sie auch nur haette. */
const BEISPIEL_ZUSAGEN = [
  { name: "Maria", ja: true }, { name: "Andrei", ja: true }, { name: "Sofia", ja: true },
  { name: "Luca", ja: false }, { name: "Elena", ja: true },
];
/**
 * BEISPIEL-NEUIGKEIT UND -GESPRAECH (Saetze vom Owner, 31.07.2026).
 *
 * Bewusst genau diese: Sitzordnung, Musikwunsch, Wetter, eine kurzfristige Aenderung und ein
 * vergessenes Kleid. Das ist, was in einer Hochzeitsgruppe wirklich steht — und jeder Satz
 * zeigt nebenbei, wofuer das Abo bezahlt wird. Eine erfundene Nettigkeit („wir freuen uns so")
 * zeigt gar nichts.
 *
 * In allen sieben Sprachen, weil eine Verkaufsseite, die Mehrsprachigkeit verspricht und
 * darunter deutsche Kommentare zeigt, sich selbst widerlegt.
 */
/**
 * DAS ANGEBOT (Owner 31.07.2026: „bei Wedding machen wir auch ein Abo, bis sie heiraten von
 * mir aus. Auch 24,50, weil wir die Liste hosten muessen.").
 *
 * Der Satz steht UNTER der Vorlage und der Liste, nie darueber: Erst sieht sie die Karte, dann
 * was dazugehoert, dann den Preis. Umgekehrt zahlt niemand fuer acht Sekunden Film.
 *
 * Der Preis selbst steht nirgends hier — {price} kommt aus lib/pricing.
 */
const ANGEBOT: Record<string, { h: string; p: string; cta: string }> = {
  de: { h: "Eure Einladung, genau so", p: "Eure Seite, das Video, die Zusagen, die News und die Gruppe — wir halten alles am Laufen, bis eure Hochzeit vorbei ist.", cta: "Einladung freischalten — {price}/Monat" },
  en: { h: "Your invitation, just like this", p: "Your page, the video, the RSVPs, the news and the group — we keep it all running until your wedding is over.", cta: "Unlock your invitation — {price}/month" },
  ro: { h: "Invitația voastră, exact așa", p: "Pagina voastră, videoclipul, confirmările, noutățile și grupul — le ținem în funcțiune până trece nunta.", cta: "Deblochează invitația — {price}/lună" },
  es: { h: "Vuestra invitación, tal cual", p: "Vuestra página, el vídeo, las confirmaciones, las novedades y el grupo — lo mantenemos todo hasta que pase la boda.", cta: "Desbloquear la invitación — {price}/mes" },
  fr: { h: "Votre invitation, exactement ainsi", p: "Votre page, la vidéo, les réponses, les nouvelles et le groupe — nous gardons tout en ligne jusqu’après le mariage.", cta: "Débloquer l’invitation — {price}/mois" },
  pt: { h: "O vosso convite, tal e qual", p: "A vossa página, o vídeo, as confirmações, as novidades e o grupo — mantemos tudo a funcionar até passar o casamento.", cta: "Desbloquear o convite — {price}/mês" },
  it: { h: "Il vostro invito, proprio così", p: "La vostra pagina, il video, le conferme, le novità e il gruppo — teniamo tutto attivo finché il matrimonio non è passato.", cta: "Sblocca l’invito — {price}/mese" },
};
const BEISPIEL_NEWS_TXT: Record<string, string> = {
  de: "Achtung, neue Änderung: Die Hochzeit findet drinnen statt!",
  en: "Heads up, change of plan: the wedding will be held indoors!",
  ro: "Atenție, o schimbare: nunta va avea loc în interior!",
  es: "¡Atención, un cambio: la boda se celebrará dentro!",
  fr: "Attention, changement : le mariage aura lieu à l’intérieur !",
  pt: "Atenção, mudança: o casamento vai ser dentro!",
  it: "Attenzione, cambio: il matrimonio si terrà al chiuso!",
};
const BEISPIEL_CHAT_TXT: Record<string, string[]> = {
  de: ["Jochen und Gina sitzen am Tisch 6.",
       "Können wir eine Volksmusik-Band bekommen?",
       "Wie wird das Wetter?",
       "Hilfe, ich habe mein Kleid zu Hause vergessen — wo finde ich eins in der Stadt?"],
  en: ["Jochen and Gina are at table 6.",
       "Could we get a folk band?",
       "What’s the weather going to be like?",
       "Help, I left my dress at home — where can I find one in town?"],
  ro: ["Jochen și Gina stau la masa 6.",
       "Putem avea o formație de muzică populară?",
       "Cum va fi vremea?",
       "Ajutor, mi-am uitat rochia acasă — de unde pot lua una în oraș?"],
  es: ["Jochen y Gina están en la mesa 6.",
       "¿Podemos tener un grupo de música popular?",
       "¿Qué tiempo va a hacer?",
       "¡Socorro! Me he dejado el vestido en casa — ¿dónde encuentro uno en la ciudad?"],
  fr: ["Jochen et Gina sont à la table 6.",
       "Peut-on avoir un groupe de musique folklorique ?",
       "Quel temps va-t-il faire ?",
       "Au secours, j’ai oublié ma robe à la maison — où en trouver une en ville ?"],
  pt: ["O Jochen e a Gina estão na mesa 6.",
       "Podemos ter um grupo de música popular?",
       "Como vai estar o tempo?",
       "Socorro, esqueci-me do vestido em casa — onde arranjo um na cidade?"],
  it: ["Jochen e Gina sono al tavolo 6.",
       "Possiamo avere un gruppo di musica popolare?",
       "Che tempo farà?",
       "Aiuto, ho dimenticato il vestito a casa — dove ne trovo uno in città?"],
};
const CHAT_NAMEN = ["Ana", "Andrei", "Maria", "Sofia"];
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
            {/* DIE KARTE IST DIE SEITE (Owner 31.07.2026: „er sieht die Landingpage direkt
                auf dieser Seite und drückt auf das Bild und öffnet sich ein Dialog … dann hat
                er's zum Sharen direkt"). Der vierstufige Trichter davor ist weg: Wer zuerst
                die fertige Karte sieht, weiss sofort, was er baut. */}
            <EinladungBauen lang={L} />

            {/* GROSS UND MIT TON (Owner 30.07.2026: „bitte mit vergroessern und song").
                Eine Reihe statt zweier Spalten: Ein Hochzeitskuss auf halber Breite ist eine
                Briefmarke — das ist das Bild, das den Trichter verkauft. Der Ton startet
                stumm, weil jeder Browser Ton ohne Zutun blockiert; ein Tipp auf den Knopf
                schaltet ihn an (siehe ExampleVideos). */}
            {/* HIER WIRD NUR ERZEUGT (Owner 31.07.2026: „es ist alles so kompliziert auf
                dieser Seite, ich verstehe nichts mehr. Mehrere CTAs" — „auf dieser Seite
                generiert der User nur, sonst darf er nichts sehen").

                Gezaehlt waren es 16 anklickbare Dinge und DREI verschiedene Preis-Knoepfe.
                Jeder einzelne war fuer sich begruendbar; zusammen haben sie die eine Frage
                zugedeckt, auf die es ankommt: zwei Fotos hochladen und auf Erzeugen tippen.

                Beispiele, Sprachauswahl, Vorschaukarte, Leistungsliste und Kaufkasten sind
                deshalb weg. Sie sind nicht falsch — sie stehen nur am falschen Ort. Was er
                bekommt, sieht er in SEINER Einladung, gleich nachdem das Bild fertig ist;
                bezahlt wird, wenn die Probewoche endet. Der Text unten bleibt: Er ist fuer
                Google, nicht fuer den Besucher, und steht weit unterhalb. */}
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
