import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { H1, Y } from "@/components/Landing";
import KissFunnel from "@/components/KissFunnel";
import BirthdayInhalt from "@/components/BirthdayInhalt";
import ThemenPreis from "@/components/ThemenPreis";
import SeitenFuss from "@/components/SeitenFuss";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
/* „Traum" ist aus den Beispielen raus (Owner 27.08.2026: „entferne das erste Video,
   das passt nicht vom Stil. Dafür ist das zweite Video der Hook") — der Look selbst bleibt
   im Generator wählbar, nur als Aushängeschild taugte das bunte Bild nicht. */
import { GEBURTSTAG_VIDEO, GEBURTSTAG_VIDEO_MANN, GEBURTSTAG_SET } from "@/lib/geburtstag";

/**
 * THEMA "SHE SAYS HAPPY BIRTHDAY" (Owner 03.08.2026: "genau wie Surprise him machen. Ein
 * Bild von sich hochladen und den Namen von dem, der Geburtstag hat, eingeben - dann wird
 * eine Dame in einem Look generiert, mit der Torte in der Hand, genau wie Bella, und auch
 * die Umgebung ist gleich. Das muss direkt an Pixverse.").
 *
 * DIE SEITE IST NEU GEBAUT, NICHT ERGAENZT - genau wie "Surprise him" wenige Stunden vorher.
 * Vorher lief hier `components/BirthdayFunnel.tsx` mit einem eigenen Weg. Jetzt: derselbe
 * Trichter, dasselbe Guthaben, dieselbe Kasse, dieselbe Auslieferung, ein Pflegeort.
 *
 * DIREKT AN PIXVERSE, kein Anziehen davor: Die Vorlage geht als zweites Referenzbild mit
 * (`garmentBild` in lib/geschenke.ts). Ein Zwischenschritt ueber FASHN wuerde Torte und Raum
 * verlieren - FASHN zieht um, es baut keine Szene.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "She says Happy Birthday — one private AI video | LuxuryBandit",
  description: "Upload one photo of yourself, type the birthday name, and she says Happy Birthday with the cake in her hands - a private video, made in minutes.",
  keywords: ["happy birthday video", "personalised birthday video", "ai birthday greeting", "birthday video with name", "send a birthday video"],
  alternates: { canonical: "/themes/birthday" },
  /* Ohne eigenes openGraph erbt diese Seite das Haus-Bild aus app/layout.tsx (LB-Logo) —
     beim Teilen auf WhatsApp/Facebook stünde die Startseite statt der Geburtstagskarte. */
  openGraph: {
    title: "She says Happy Birthday — one private AI video",
    description: "Upload one photo of yourself, type the birthday name, and she says Happy Birthday with the cake in her hands - a private video, made in minutes.",
    type: "website",
    url: "/themes/birthday",
    images: [{ url: GEBURTSTAG_SET, width: 720, height: 960 }],
  },
};

export default async function BirthdayThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();              // Sprache der Seite (Cookie)
  const T = kissText(L, "birthday");         // Ueberschrift und Zeilen in seiner Sprache
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);   // Aktionscode aus der Anzeige

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav marke="LB - Birthday" heim="/media-kit" motto="The Media Creator" sprachen={["en", "de"]} />
      <TrackView event="birthday_view" lookId="themes-birthday" lookName="Geburtstags-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <H1>{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        {/* DER PREIS-CHIP IST RAUS — er steht jetzt IM Kaufknopf (Owner 10.08.2026: „ab 4,99 -
            Jetzt starten. Schreibst du in dem Button"). Zweimal derselbe Preis, vierzig Pixel
            auseinander, ist keine Auskunft, sondern ein Grund, warum der Knopf nicht mehr ins
            Bild passte. Der Baustein `ThemenPreis` bleibt und trägt die anderen Themen. */}

        {/**
          * DIE KARTE STEHT DIREKT UNTER DEM TITEL (Owner 09.08.2026: „Die Karte auf der
          * Landingpage muss unter dem Titel stehen").
          *
          * DIE TRAUMWELT IST DIE ERSTE FOLIE (Owner 09.08.2026: „im Slide mach die Dream
          * World als erstes"). Sie ist das Ungewöhnliche, das die Überschrift verspricht
          * („auf eine Art, die niemand erwartet") — die fotorealistischen Beispiele zeigen,
          * was er sonst noch bekommen kann, aber sie verkaufen nicht den Unterschied.
          *
          * Das ist zugleich die Hausordnung seit dem Kuss — erst sehen, was herauskommt,
          * dann lesen, wie es geht. Vorher lagen Anlass, Grund und die drei Schritte
          * dazwischen: eine halbe Bildschirmhöhe Erklärung, bevor er den Beweis sah. Wer
          * das Ergebnis nicht kennt, liest die Erklärung nicht.
          */}
        <KissFunnel variant="birthday" code={code} lang={L} beispielVideos={[GEBURTSTAG_VIDEO, GEBURTSTAG_VIDEO_MANN]} />
        {/* DER INHALT DER LANDINGPAGE — aus einer gemeinsamen Datei, damit der
            Tunnel exakt dasselbe unter seinem Anmeldeformular zeigt
            (Owner 14.08.2026, Dauerregel fuer den Tunnel). */}
        <BirthdayInhalt T={T} />
      </div>
        {/* DER FUSS — auf jeder Themenseite (Owner 05.08.2026). Impressum, AGB und
            Datenschutz standen nur im Menue; wer aus einer Anzeige kommt, hat sie nie
            gesehen. Siehe components/SeitenFuss. */}
        <SeitenFuss marke="LB - Birthday" />
    </main>
  );
}
