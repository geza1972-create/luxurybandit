import Link from "next/link";
import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { resolveLang } from "@/lib/lang-server";
import { H1, Y } from "@/components/Landing";
import WeddingInhalt, { weddingTexte } from "@/components/WeddingInhalt";
import { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungBauen from "@/components/EinladungBauen";
import ThemenVorspann from "@/components/ThemenVorspann";
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
import ThemenPreis from "@/components/ThemenPreis";
import SeitenFuss from "@/components/SeitenFuss";
import { Knopf } from "@/components/CI";
import { readThemeConfig } from "@/lib/try-this-look-store";
import { HOCHZEIT_VIDEO } from "@/lib/hochzeit-video";
import { kissText } from "@/lib/kiss-i18n";
import { trObject } from "@/lib/tr-object";
import { fillPrices, themenPreisZeile } from "@/lib/pricing";

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

export default async function WeddingThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const T = kissText(L, "wedding");
  /* Dieselben Texte wie im ausgegliederten Inhalt — eine Quelle fuer Landingpage und
     Tunnel (Owner 14.08.2026). */
  const t = await weddingTexte(L);
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const showAdmin = String(sp.admin ?? "") === "1";
  const view = sp.view === "kunde" ? "kunde" : "admin";
  const showCustomer = !showAdmin || view === "kunde";

  const cfg = await readThemeConfig("wedding").catch(() => ({ modelIds: [] as string[], examplePaths: [] as string[] }));
  /**
   * DAS ABGENOMMENE VIDEO STEHT VORN — dieselbe Regel wie beim Urlaub (Owner 10.08.2026,
   * Dauerregel seit 07.08.): Die Katalog-Kachel zeigt `/Wedding/hochzeit-beispiel.mp4`, also
   * beginnt die Karte auf dieser Seite mit demselben Video. Sein Poster liegt daneben
   * (`hochzeit-beispiel.jpg`) — deshalb hat die Folie ein echtes Standbild statt eines
   * Rückfalls.
   *
   * NUR AUS DEM EIGENEN ORDNER (Owner 10.08.2026: „keine Videos aus einem anderen Ordner
   * nehmen"): Die Beispiele aus der Ablage (`cfg.examplePaths`) hängen nicht mehr mit
   * daran. Was auf der Karte läuft, liegt sichtbar im Repo und ist abgenommen.
   */
  const examples: string[] = [HOCHZEIT_VIDEO];

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

  return (
    /**
     * DUNKEL IST DIE VORGABE (Owner 10.08.2026: „Hochzeitsplaner default dark.").
     *
     * Das dreht die Entscheidung vom 31.07.2026 um („default ist light modus", begründet mit
     * dem Sprung von der weissen Anzeige auf eine schwarze Seite). Der Grund für die Umkehr
     * ist das Haus: Jede andere Themenseite kommt dunkel, und eine einzige helle Seite mitten
     * darin liest sich wie ein fremdes Produkt — dieselbe Marke muss überall dieselbe Farbe
     * haben. `?light=1` schaltet weiterhin auf die helle Anzeigen-Fassung, und der Schalter
     * im Balken überstimmt beides und merkt sich die Wahl.
     */
    <main className={`lb-bg min-h-screen text-white${String(sp.light ?? "") === "1" ? " lb-theme lb-fb" : ""}`}>
      <TopNav marke="LB - Wedding" heim="/media-kit" motto="The Media Creator" sprachen={["en", "de"]} />
      <TrackView event="wedding_view" lookId="themes-wedding" lookName="Hochzeits-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
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
        {/* DER PREIS-CHIP IST RAUS — er steht jetzt IM Kaufknopf (Owner 10.08.2026: „ab 4,99 -
            Jetzt starten. Schreibst du in dem Button"). Zweimal derselbe Preis, vierzig Pixel
            auseinander, ist keine Auskunft, sondern ein Grund, warum der Knopf nicht mehr ins
            Bild passte. Der Baustein `ThemenPreis` bleibt und trägt die anderen Themen. */}

            {/* DIE AD-ADRESSE (KONZEPT-TUNNEL.md, Owner 12.08.2026: „die muss ich in den ads
                einbauen"): ein zweiter, schmalerer Weg direkt zum Drei-Schritt-Tunnel
                (`/themes/wedding/start`) — `light`/`code` reisen mit, genau das Muster aus
                `KissFunnel.schritteOeffnen`. Der Bau-Kasten unten bleibt unveraendert: wer
                lieber gleich hier ausfuellt, tut das weiter genauso wie vorher. */}
        {/* Der Outline-Zweitknopf mit Preis („de la 9,99 €") ist RAUS (Owner 12.08.2026, mit Bild: „das raus, das haben wir sonst niergendwo") — die eine Tür in den Tunnel ist der goldene Karten-Knopf. */}

            {/* ANLASS · GRUND · DREI SCHRITTE · PRIVATZEILE — das Kuss-Muster (Owner
                05.08.2026: „alle Topic-Seiten sollen so aufgebaut werden, ist die Kiss-Seite").
                Hier fehlte der ganze Block: Zwischen Preis und Karte stand nichts, was sagt,
                WOFÜR man das kauft. Die drei Schritte hatte diese Seite nie — sie erbte die
                Kuss-Schritte („Wir machen aus euch beiden ein Kussvideo"), die auf einer
                Hochzeitsseite falsch sind; jetzt stehen eigene in `lib/kiss-i18n` (HOCHZEIT).
                Die Privatzeile ist hier besonders wichtig: Wer die Adresse seines Saals und
                die Namen seiner Gäste einträgt, will wissen, dass die Seite nicht auffindbar
                ist. */}

            <div className="mt-5">
              <EinladungBauen lang={L} beispielVideo={examples[0] ?? ""} />
            </div>
            {/* DER KUNDEN-INHALT DER LANDINGPAGE — aus einer gemeinsamen Datei, damit
                der Tunnel exakt dasselbe unter seinem Anmeldeformular zeigt. Die
                Verwaltung im `else`-Zweig darunter bleibt, wo sie ist (14.08.2026). */}
            <WeddingInhalt T={T} t={t} L={L} />
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
        {/* DER FUSS — auf jeder Themenseite (Owner 05.08.2026). Impressum, AGB und
            Datenschutz standen nur im Menue; wer aus einer Anzeige kommt, hat sie nie
            gesehen. Siehe components/SeitenFuss. */}
        <SeitenFuss marke="LB - Wedding" />
    </main>
  );
}
