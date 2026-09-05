import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import { Knopf } from "@/components/CI";
import { GenerierungenAnsicht } from "@/components/AcademyGenerierungen";
import { resolveLang } from "@/lib/lang-server";
import { ARMEE_SPRACHEN, DEMO_KUNDE, armeeSprache, armeeTexte } from "@/lib/demo-armee";

/**
 * „AKTUELLE GENERIERUNGEN" — wo der Besucher sein Video wiederfindet.
 *
 * Owner 02.09.2026: „Der User muss sein Video dort sehen. Es soll nicht springen." Vorher
 * führte der einzige Weg zu einem erzeugten Video über `/my-gallery` — eine Haus-Seite mit
 * Konto-Zwang und LuxuryBandit-Kopf. Wer auf einer Seite mit der Marke des Kunden darauf
 * tippte, stand plötzlich unter fremdem Absender; und ein Bewerber ohne Konto kam gar nicht
 * erst hin.
 *
 * FÜR ÖFFENTLICHE DISPLAYS GEBAUT (Owner, im selben Zug): Es steht genau EIN Video hier, das
 * vom nächsten Lauf überschrieben wird. Ein Bildschirm auf einer Messe ist ein Gerät für
 * viele Menschen — eine Sammlung zeigte jedem Nächsten die Gesichter aller Vorherigen.
 *
 * KEIN INDEX: Auf dieser Seite steht das Gesicht eines Menschen. Sie gehört in keine
 * Suchmaschine, auch wenn nur findet, wer die Geräte-Kennung dieses Browsers hat.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${DEMO_KUNDE.name}`, robots: { index: false, follow: false } };
}

export default async function AcademyVideos({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const lang = String(sp.lang ?? "") || (await resolveLang("de"));
  const T = armeeTexte(lang);
  const zurueck = `/academy${sp.lang ? `?lang=${encodeURIComponent(String(sp.lang))}` : ""}`;

  return (
    <main className="lb-bg min-h-screen text-white">
      {/* White Label wie überall in diesem Bereich: kein Haus-Logo, kein Fuss, kein Menü
          (letzteres über den Pfad in `BottomNav`). */}
      <TopNav schlicht ohneLogo zurueckHeim marke={DEMO_KUNDE.name} heim="/academy"
        motto={null} sprachen={[...ARMEE_SPRACHEN]} />

      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        {/* Ohne Überschrift (Owner 02.09.2026: „Generations raus") — auf dieser Seite steht
            genau ein Video, und die Kopfzeile sagt schon, wo man ist. Eine Zeile „Deine
            Generierungen" darüber wiederholt nur, was man sieht, und schiebt am Display das
            Video nach unten. */}

        <GenerierungenAnsicht
          sprache={armeeSprache(lang)} marke={DEMO_KUNDE.name}
          texte={{
            lead: T.genSeiteLead, leerTitel: T.genLeerTitel, leerText: T.genLeerText,
            laedt: T.genLaedt, laeuftText: T.genLaeuftText,
            ton: T.ton, tonAus: T.tonAus, gross: T.gross, klein: T.klein,
            teilen: T.teilen, teilenKopiert: T.teilenKopiert, teilenText: T.teilenText,
          }} />

        <div className="mt-6">
          <Knopf art="umriss" href={zurueck}>{T.genZurueck}</Knopf>
        </div>
      </div>
    </main>
  );
}
