import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ImmerOben from "@/components/ImmerOben";
import { GeteiltesVideo } from "@/components/AcademyGenerierungen";
import { readKissLog, getSignedUrl } from "@/lib/try-this-look-store";
import { KAMPAGNEN } from "@/lib/kampagnen";

/**
 * DAS GETEILTE VIDEO VON LOTTO HAMBURG — dieselbe Seite wie `app/academy/v/[id]/page.tsx`,
 * nur nach dem Thema `"lotto-hh"` gefiltert statt nach `"armee"`. Mit Schrift, Musik und
 * Schleife, wie jedes geteilte Video des Hauses (siehe Begründung dort).
 */
export const dynamic = "force-dynamic";

const K = KAMPAGNEN["lotto-hh"];

async function laden(id: string) {
  const alle = await readKissLog();
  const e = alle.find(x => x.id === id && x.theme === K.slug && !!x.videoUrl);
  if (!e) return null;
  return {
    videoUrl: e.videoUrl ?? "",
    vorname: (e.empfaenger ?? "").trim(),
    poster: e.imagePath ? await getSignedUrl(e.imagePath, 60 * 60 * 24 * 365).catch(() => "") : "",
  };
}

export async function generateMetadata({ params }: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const v = await laden(id);
  const T = K.texte;
  const titel = v?.vorname ? T.abspannEins.replace("{name}", v.vorname) : `${T.claimEins} ${T.claimZwei}`;
  return {
    title: `${titel} — ${K.marke}`,
    description: T.claimDrei,
    robots: { index: false, follow: false },
    openGraph: {
      title: titel, description: T.claimDrei, type: "video.other",
      siteName: K.marke, url: `${K.domain}/${K.slug}/v/${id}`,
      ...(v?.poster ? { images: [{ url: v.poster }] } : {}),
    },
  };
}

export default async function LottoHhGeteiltesVideoSeite({ params }: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const v = await laden(id);
  if (!v) notFound();
  const T = K.texte;

  return (
    <main className="lb-bg min-h-screen text-white">
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <ImmerOben />
        <GeteiltesVideo
          video={v.videoUrl} poster={v.poster} vorname={v.vorname}
          sprache="de" marke={K.marke}
          texte={{
            ton: T.ton, tonAus: T.tonAus, gross: T.gross, klein: T.klein,
            teilen: T.teilen, teilenKopiert: T.teilenKopiert, teilenText: T.teilenText,
            abspannEins: T.abspannEins, abspannZwei: T.abspannZwei,
            selbst: T.geteiltCta,
          }}
          selbstHref={`/${K.slug}/start`} />
      </div>
    </main>
  );
}
