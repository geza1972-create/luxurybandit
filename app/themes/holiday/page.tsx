import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { resolveLang } from "@/lib/lang-server";
import { H1, Y } from "@/components/Landing";
import HolidayInhalt from "@/components/HolidayInhalt";
import { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungBauen from "@/components/EinladungBauen";
import ThemenPreis from "@/components/ThemenPreis";
import SeitenFuss from "@/components/SeitenFuss";
import { Knopf } from "@/components/CI";
import { kissText } from "@/lib/kiss-i18n";
import { trObject } from "@/lib/tr-object";
import { fillPrices, themenPreisZeile } from "@/lib/pricing";

/**
 * THEMA „URLAUBS-EINLADUNG" (Owner 04.08.2026: „du machst eine Invitation für Urlaub an
 * jemandem. DU und ich. Das sendet der User dann an die Person. Es wird genauso wie bei
 * Wedding Datum Ort eingetragen. Du musst das Konzept ändern.").
 *
 * DAS IST EIN KONZEPTWECHSEL, kein Umbau. Vorher stand hier „Holiday with your dream girl":
 * ein Fantasievideo mit einer Frau aus unserem Katalog, 25 Momente zum Durchprobieren, für
 * ihn allein — es verliess nie seinen Browser. Jetzt ist es eine EINLADUNG an einen echten
 * Menschen: zwei Fotos, Datum, Ort, ein Video von euch beiden und eine Seite, die er
 * verschickt.
 *
 * Damit wandert das Thema von der Kiss-Maschine in die HOCHZEITS-Maschine — es ist dasselbe
 * Modul (`EinladungBauen`), nur eine andere Variante. Deshalb ist diese Seite fast Zeile für
 * Zeile `app/themes/wedding/page.tsx`: derselbe helle Grund, dieselbe Karte oben, dieselben
 * SEO-Absätze darunter. Wer eine der beiden ändert, sollte in die andere schauen.
 *
 * WAS BEWUSST FEHLT gegenüber der Hochzeit: der Gruppenchat und die Menü-Demo. Eine
 * Urlaubs-Einladung geht an EINEN Menschen — Gästezahl und Caterer gibt es dort nicht.
 *
 * DAS ALTE THEMA LEBT WEITER auf `/themes/bella` (Tenerife with Bella): dieselbe
 * `HolidayFunnel`-Komponente, derselbe Model-Katalog. Sie wurde nicht gelöscht, nur hier
 * abgelöst.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Holiday invitation video — invite someone to come away with you | LuxuryBandit",
  description: "Invite someone on holiday with a video of the two of you. Upload one photo of yourself and one of them, add the date and the place, and send one link — they answer with one tap.",
  keywords: [
    "holiday invitation video", "invite someone on holiday", "digital invitation video",
    "video invitation", "come away with me", "travel invitation card",
    "invitatie video vacanta", "invitation vacances video", "invitación de vacaciones vídeo",
    "convite de férias vídeo", "invito vacanza video", "digitale Urlaubseinladung",
  ],
  alternates: { canonical: "/themes/holiday" },
};

/**
 * DIE ZUSAGE ALS DEMO — dasselbe Muster wie auf der Hochzeitsseite (Owner 01.08.2026: „User
 * muss wissen sofort was er bekommt"). Nur eben in der schlanken Fassung: ein Name, ein Ja.
 * Ohne Menü und ohne Gästezahl, denn genau so sieht die echte Karte beim Urlaub aus.
 */

/**
 * DER WERBETEXT — VON HAND, NICHT DURCH DIE MASCHINE (Owner 04.08.2026).
 *
 * Er hat ihn selbst vorgegeben: „Willst du deine Freude zeigen oder du willst jemandem eine
 * schöne Überraschung machen? Visualisiere deinen Wunsch, die Vorfreude wird schöner sein…"
 *
 * WARUM HIER UND NICHT IN `trObject`: Alle anderen Absätze dieser Seite werden zur Laufzeit
 * übersetzt. Bei Erklärtexten geht das gut; bei Werbung nicht. Der Owner hat es selbst
 * gemerkt — der Untertitel „…mit einem Video von euch beiden, die bereits dort sind" war ein
 * Maschinensatz, der grammatisch stimmt und nichts auslöst („was ist das?"). „Die Vorfreude
 * ist das Schönste" wird so zu einem Satz, den niemand fühlt.
 *
 * DER LETZTE SATZ TRÄGT DAS ARGUMENT: Wer jemanden so einlädt, verkauft nicht eine Reise,
 * sondern die Wochen davor. Das ist das Produkt — nicht das Video.
 */

export default async function HolidayThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const L = await resolveLang();
  const T = kissText(L, "holiday");
  /* NUR NOCH DER KICKER (14.08.2026): Die uebrigen Abschnittstexte sind mit dem Inhalt
     nach components/HolidayInhalt.tsx gezogen, damit der Tunnel sie ebenfalls bekommt.
     Diese eine Zeile steht ueber der Ueberschrift und bleibt deshalb hier. */
  const t = await trObject({ kicker: "Holiday invitation" }, L);

  // Das Beispielvideo in der leeren Karte — dasselbe, das im Themenkatalog läuft.
  /* ALLE Beispiele, nicht nur das erste — sie liegen jetzt als Karussell in EINER Karte
     (Owner 04.08.2026). So viele, wie im Speicher liegen; fehlende fallen still weg. */
  /**
   * DAS ABGENOMMENE VIDEO STEHT VORN (Owner 10.08.2026: „Die Videos und poster liegen doch
   * in Hollyday" — nachdem auf der Karte plötzlich ein Dessous-Standbild stand).
   *
   * Es ist die Dauerregel vom 07.08.: EIN Video für die Katalog-Kachel UND die Karte auf der
   * Landingpage. Die Kachel zeigte längst `/Holiday/urlaub-beispiel.mp4`, die Karte vier
   * andere aus der Ablage — zwei Quellen, zwei Versprechen. Wer aus dem Katalog klickt,
   * muss dasselbe wiedersehen, sonst bricht er ab.
   *
   * Und es löst das Poster gleich mit: Neben der Repo-Datei liegt `urlaub-beispiel.jpg`,
   * also greift die Regel „aus .mp4 wird .jpg" wieder. Bei signierten Ablage-Adressen kann
   * sie das nicht (der Anhang `?token=…` macht daraus keine Bildadresse).
   *
   * NUR AUS DEM EIGENEN ORDNER (Owner 10.08.2026: „keine Videos aus einem anderen Ordner
   * nehmen"). Hier hingen vier weitere aus der Ablage (`holiday-example…mp4`) als Folien
   * 2 bis 5 — darunter ein Dessous-Video. Sie waren nie abgenommen, sie waren nur
   * unsichtbar, weil ohne Poster eine dunkle Fläche davor stand. Eine Urlaubs-Einladung,
   * die mit Wäsche wirbt, verspricht etwas anderes als das Produkt.
   */
  const examples = ["/Holiday/urlaub-beispiel.mp4"];

  /* Englische Quelle im Code, Übersetzung zur Laufzeit mit Dauer-Cache — dieselbe Lösung wie
     auf der Hochzeitsseite. Sieben handgepflegte Tabellen je Seite altern beim ersten
     Textwechsel, und dann steht in fünf Sprachen etwas anderes als in zweien. */

  return (
    /**
     * DUNKEL IST DIE VORGABE (Owner 10.08.2026: „Hochzeitsplaner default dark." · „Urlaub
     * auch nach CI anpassen") — die Umkehr der Festlegung vom 04.08. Zwei helle Seiten mitten
     * in einem dunklen Haus lesen sich wie ein fremdes Produkt. `?light=1` schaltet weiterhin
     * die helle Anzeigen-Fassung, der Schalter im Balken überstimmt beides.
     */
    <main className={`lb-bg min-h-screen text-white${String(sp.light ?? "") === "1" ? " lb-theme lb-fb" : ""}`}>
      <TopNav heim="/media-kit" motto="The Media Creator" sprachen={["en", "de"]} />
      <TrackView event="holiday_view" lookId="themes-holiday" lookName="Urlaubs-Einladung" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        {/* Oben genau drei Zeilen (Kicker, H1, ein Satz) — alle Absätze stehen unter der
            Karte. Dieselbe Reihenfolge wie bei der Hochzeit: Die Karte sagt in einer halben
            Sekunde, was hier entsteht; ein Absatz braucht dafür zehn Sekunden Lesen. */}
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">{t.kicker}</p>
        <H1 className="mt-1">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        {/* HIER STAND EIN MASCHINENSATZ (Owner 04.08.2026: „oben steht: die bereits dort
            sind. Was ist das?"). Er kam aus `trObject` — „a video of the two of you already
            there" wird im Deutschen zu einem holprigen Nebensatz. Jetzt der Werbetext des
            Owners, von Hand in sieben Sprachen. */}
        {/* DER PREIS-CHIP IST RAUS — er steht jetzt IM Kaufknopf der Karte (Owner
            10.08.2026: „Button wie CI Preis-Jettzt starten"). */}

        {/* ANLASS · GRUND · DREI SCHRITTE · PRIVATZEILE — das Kuss-Muster (Owner 05.08.2026:
            „alle Topic-Seiten sollen so aufgebaut werden, ist die Kiss-Seite").
            Hier fehlte der ganze Block. Die drei Schritte hatte diese Seite nie — sie erbte
            über die Hochzeit die KUSS-Schritte („Wir machen aus euch beiden ein Kussvideo"),
            was auf einer Urlaubs-Einladung schlicht falsch ist; jetzt stehen eigene in
            `lib/kiss-i18n` (URLAUB). Der Anlass ist der des Owners: Überraschung, Antrag,
            Familienurlaub. */}

        {/* DIE AD-ADRESSE (KONZEPT-TUNNEL.md) — ein zweiter, schmalerer Weg direkt zum
            Drei-Schritt-Tunnel (`/themes/holiday/start`); `light`/`code` reisen mit. Der
            Bau-Kasten unten bleibt unveraendert. */}
        {/* Der Outline-Zweitknopf mit Preis („de la 9,99 €") ist RAUS (Owner 12.08.2026, mit Bild: „das raus, das haben wir sonst niergendwo") — die eine Tür in den Tunnel ist der goldene Karten-Knopf. */}

        <div className="mt-5">
          <EinladungBauen lang={L} variant="holiday" beispielVideos={examples} />
        </div>

        {/* DER INHALT DER LANDINGPAGE — aus einer gemeinsamen Datei, damit der Tunnel
            exakt dasselbe unter seinem Anmeldeformular zeigt (Owner 14.08.2026). */}
        <HolidayInhalt T={T} L={L} />
      </div>
        {/* DER FUSS — auf jeder Themenseite (Owner 05.08.2026). Impressum, AGB und
            Datenschutz standen nur im Menue; wer aus einer Anzeige kommt, hat sie nie
            gesehen. Siehe components/SeitenFuss. */}
        <SeitenFuss />
    </main>
  );
}
