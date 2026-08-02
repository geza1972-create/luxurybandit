import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { resolveLang } from "@/lib/lang-server";
import { H1, Y, SectionTitle, Lead } from "@/components/Landing";
import { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungBauen from "@/components/EinladungBauen";
import UploadsAdmin from "@/components/UploadsAdmin";
import ThemeMediaAdmin from "@/components/ThemeMediaAdmin";
import ManageViewToggle from "@/components/ManageViewToggle";
import AdminTabs from "@/components/AdminTabs";
import EinladungenAdmin from "@/components/EinladungenAdmin";
import KissModelsAdmin from "@/components/KissModelsAdmin";
import KissUsersAdmin from "@/components/KissUsersAdmin";
import WetterSubscribers from "@/components/WetterSubscribers";
import ZusagenKarte from "@/components/ZusagenKarte";
import GruppenChat from "@/components/GruppenChat";
import { getSignedUrl, readThemeConfig } from "@/lib/try-this-look-store";
import { kissText } from "@/lib/kiss-i18n";
import { trObject } from "@/lib/tr-object";
import { fillPrices } from "@/lib/pricing";

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

export const metadata = {
  title: "Wedding invitation video & online wedding planner | LuxuryBandit",
  description: "Your wedding invitation as a video, made from two photos — plus the guest list, menu choices and a group chat on one page. Send one link; each guest reads it in their own language.",
  keywords: [
    "wedding invitation video", "digital wedding invitation", "send wedding invitation whatsapp",
    "online wedding invitation", "save the date video", "video invitation wedding",
    "online wedding planner", "wedding planner app", "wedding rsvp online", "digital guest list",
    "invitatie de nunta video", "invitatie de nunta online", "planificator de nunta online",
    "faire-part de mariage video", "organisateur de mariage en ligne",
    "invitación de boda digital", "organizador de boda online",
    "convite de casamento digital", "organizador de casamento online",
    "invito di matrimonio video", "wedding planner online",
    "digitale Hochzeitseinladung", "Hochzeitseinladung Video", "Hochzeitsplaner online", "digitale Gästeliste Hochzeit",
  ],
  alternates: { canonical: "/themes/wedding" },
};

/**
 * DIE DEMO UNTER DEM TRICHTER (Owner 01.08.2026: „ich sehe Chat und Einladungsliste auf
 * dieser Seite nicht" — „User muss wissen sofort was er bekommt").
 *
 * Die Beispiel-Einladung zeigt Zusagen und Gruppenchat laengst — aber eben erst nach einem
 * Klick. Die Braut, die hier ankommt, entscheidet auf DIESER Seite; also stehen beide
 * Bausteine jetzt direkt darunter, als Demo (Antworten wird nur vorgespielt, nichts wird
 * gespeichert). Daten wie auf /einladung/beispiel.
 */
/**
 * NAMEN ALS PAAR ODER MIT NACHNAME (Owner 02.08.2026: „Namen müssen hier als paar oder mit
 * Nachname stehen"). Ein einzelner Vorname wirkte auf der Demo wie ein Platzhalter — echte
 * Gästelisten zeigen entweder das Paar, das gemeinsam zugesagt hat, oder einen vollen Namen.
 */
const DEMO_ZUSAGEN = [
  { name: "Maria & Radu", ja: true, menu: "vegetarisch" as const, personen: 2 }, { name: "Andrei Ionescu", ja: true, personen: 1 },
  { name: "Sofia & Matei", ja: true, menu: "vegan" as const, personen: 2 }, { name: "Luca Popescu", ja: false }, { name: "Elena & Cristian", ja: true, personen: 2 },
];
const DEMO_NAMEN = ["Maria", "Andrei", "Maria", "Sofia"];
const DEMO_CHAT: Record<string, string[]> = {
  de: ["Jochen und Gina sitzen am Tisch 6.", "Können wir eine Volksmusik-Band bekommen?", "Wie wird das Wetter?", "Hilfe, ich habe mein Kleid zu Hause vergessen — wo finde ich eins in der Stadt?"],
  en: ["Jochen and Gina are at table 6.", "Could we get a folk band?", "What's the weather going to be like?", "Help, I left my dress at home — where can I find one in town?"],
  ro: ["Jochen și Gina stau la masa 6.", "Putem avea o formație de muzică populară?", "Cum va fi vremea?", "Ajutor, mi-am uitat rochia acasă — de unde pot lua una în oraș?"],
  es: ["Jochen y Gina están en la mesa 6.", "¿Podemos tener un grupo de música popular?", "¿Qué tiempo va a hacer?", "¡Socorro! Me he dejado el vestido en casa — ¿dónde encuentro uno en la ciudad?"],
  fr: ["Jochen et Gina sont à la table 6.", "Peut-on avoir un groupe folklorique ?", "Quel temps fera-t-il ?", "Au secours, j'ai oublié ma robe — où en trouver une en ville ?"],
  pt: ["O Jochen e a Gina estão na mesa 6.", "Podemos ter uma banda de música popular?", "Como vai estar o tempo?", "Socorro, deixei o vestido em casa — onde arranjo um na cidade?"],
  it: ["Jochen e Gina sono al tavolo 6.", "Possiamo avere una band di musica popolare?", "Che tempo farà?", "Aiuto, ho dimenticato il vestito a casa — dove ne trovo uno in città?"],
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
  const examples: string[] = (await Promise.all((cfg.examplePaths ?? []).map((p: string) => getSignedUrl(p).catch(() => "")))).filter(Boolean);

  /**
   * DER TEXT UNTER DER KARTE — IN DER SPRACHE DES BESUCHERS (Owner 31.07.2026: „stimmen die
   * Sprachen überall?").
   *
   * Nein, sie stimmten nicht: Die Karte, die Überschrift und der eine Satz darüber standen auf
   * Rumänisch, und darunter kamen vier Absätze Englisch. Auf einer Seite, deren wichtigstes
   * Versprechen „die Einladung spricht die Sprache eurer Gäste" ist, widerlegt das die Seite
   * selbst — noch bevor jemand ein Foto hochlädt.
   *
   * Englische Quelle im Code, Übersetzung zur Laufzeit mit Dauer-Cache (`trObject`, wie auf der
   * Chat-Seite). Sieben handgepflegte Tabellen pro Seite altern beim ersten Textwechsel, und
   * dann steht in fünf Sprachen etwas anderes als in zweien.
   *
   * Zwei Sätze sind beim Übertragen korrigiert worden, weil sie Entscheidungen von heute
   * widersprachen: kein Kuss im Video (Owner: „ich will nicht, dass sie sich küssen im Video")
   * und kein WhatsApp mehr im Versprechen („wir machen nur share").
   */
  const t = await trObject({
    s1h: "A wedding invitation as a video — with the two of you in it",
    s1p: fillPrices("Instead of a printed card, your digital wedding invitation is a short video in which you and your partner appear on your own wedding day — you in a white dress, him in a white suit, in the church. Upload one photo of yourself and one of him; the AI does the rest. Every video costs {once} — there is no free trial.", "en"),
    /* Ohne das doppelte „you": Daraus machte die Maschine „Ein Link — du sendest ihn so, wie
       du bereits alles sendest". Kurze Quellsaetze ohne wiederholtes Fuerwort uebersetzen
       sich in allen sieben Sprachen sauberer. */
    s2h: "One link, sent from your phone",
    s2p: "Every invitation gets its own page with your names, the date and the address. You send that one link with your phone, wherever your guests already are. No app for them, no login, no printing, no postage. The invitation speaks your guests' language by itself: whoever opens it reads it in their own — English, Romanian, French, Spanish, Portuguese, Italian or German — so the relatives abroad get the same invitation as everyone at home. You can take the link back at any time, and you see how many guests have opened it.",
    s3h: "Save the date — in the weeks before the wedding",
    s3p: "Most couples send a save-the-date two to four months before the wedding and the full invitation six to eight weeks ahead. A video invitation gets watched instead of skimmed, and it works the same for guests abroad — they open the same link on their phone.",
    s4h: "Your photos stay yours",
    s4p: "The two photos you upload are used to make your video and nothing else. They are never published and never shown to other users, they are stored on servers in the EU, and everything from a visit without a purchase is deleted after 90 days. The invitation page itself is not listed anywhere and cannot be found on Google — only the people you send the link to can open it.",
    zusCap: "With the subscription: your guests reply with one tap and say how many are coming — you always see the exact guest count and every menu choice.",
    chatCap: "Also in the subscription: the group chat for all your guests — no app, no login needed.",
    kicker: "Digital wedding planner",
    claim: "Your wedding invitation as a video — plus the guest list, menu choices and a group chat. All in one link.",
  }, L);

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
            {/* DIE KARTE STEHT GANZ OBEN (Owner 31.07.2026: „er sieht die Landingpage direkt
                auf dieser Seite und drückt auf das Bild und öffnet sich ein Dialog … Alle
                Texte dann unter der Karte").

                Der vierstufige Trichter davor ist weg, und die Überschrift ist unter die
                Karte gerutscht. Grund ist nicht Geschmack, sondern die Reihenfolge des
                Verstehens: Die Karte sagt in einer halben Sekunde, was hier entsteht — ein
                Absatz braucht dafür zehn Sekunden Lesen, und die gibt uns kaum jemand. Wer
                die Karte sieht, füllt sie aus wie ein Formular, das er schon kennt.

                Für Google ändert sich nichts: Die H1 steht weiter im Quelltext, nur weiter
                unten. Die Suchmaschine liest die Seite, sie scrollt nicht.

                Update 02.08.2026: Die Überschrift steht wieder ÜBER der Karte — Owner:
                „Oben muss gleich stehen, was ich verkaufe." Oben stehen genau drei Zeilen
                (Kicker, H1, ein Satz); alle ABSÄTZE bleiben weiter unter der Karte. */}
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">{t.kicker}</p>
            <H1 className="mt-1">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
            <Lead className="mt-2">{t.claim}</Lead>

            <div className="mt-5">
              <EinladungBauen lang={L} beispielVideo={examples[0] ?? ""} />
            </div>

            {/* SOFORT SEHEN, WAS MAN BEKOMMT: Zusagenliste und Gruppenchat als Demo. */}
            <div className="mt-6 space-y-4">
              <p className="text-center text-[12px] font-bold leading-snug text-white/60">✓ {t.zusCap}</p>
              <ZusagenKarte sprache={KARTE_TEXTE[L] ? L : "en"} demo zusagen={DEMO_ZUSAGEN} />
              <p className="pt-2 text-center text-[12px] font-bold leading-snug text-white/60">✓ {t.chatCap}</p>
              <GruppenChat sprache={KARTE_TEXTE[L] ? L : "en"} demo sie="Ana" er="Mihai"
                nachrichten={(DEMO_CHAT[L] ?? DEMO_CHAT.en).map((t, i) => ({ name: DEMO_NAMEN[i] ?? "Gast", text: t }))} />
            </div>

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
                <SectionTitle>{t.s1h}</SectionTitle>
                <Lead>{t.s1p}</Lead>
              </div>
              <div>
                <SectionTitle>{t.s2h}</SectionTitle>
                <Lead>{t.s2p}</Lead>
              </div>
              <div>
                <SectionTitle>{t.s3h}</SectionTitle>
                <Lead>{t.s3p}</Lead>
              </div>
              <div>
                <SectionTitle>{t.s4h}</SectionTitle>
                <Lead>{t.s4p}</Lead>
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
