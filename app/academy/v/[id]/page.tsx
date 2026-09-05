import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ImmerOben from "@/components/ImmerOben";
import { GeteiltesVideo } from "@/components/AcademyGenerierungen";
import { readKissLog, getSignedUrl } from "@/lib/try-this-look-store";
import { resolveLang } from "@/lib/lang-server";
import { ACADEMY_DOMAIN } from "@/lib/armee-musik";
import { DEMO_KUNDE, armeeSprache, armeeTexte } from "@/lib/demo-armee";

/**
 * DAS GETEILTE VIDEO — mit Schrift, Musik und Schleife.
 *
 * Owner 02.09.2026: „wenn ich es share, kommt nur das Rohvideo an, ohne nichts. Es muss das
 * Original ankommen, mit Schrift und Musik" · „und Loop".
 *
 * WARUM EINE SEITE UND KEINE DATEI: Der Teilen-Knopf verschickte bis eben die signierte
 * Adresse der mp4. Eine mp4 kann nichts von dem tragen, was das Video hier ausmacht — der
 * Abspann liegt als Text ÜBER dem Bild, die Musik läuft daneben, und ob eine Datei in
 * Schleife läuft, entscheidet der Player des Empfängers, nicht wir. Beim Empfänger kam
 * deshalb ein stummer Clip an, der nach fünf Sekunden stehen blieb.
 *
 * Das alles ins Video zu rendern hiesse ffmpeg auf dem Server: Textspur einbrennen, Tonspur
 * mischen, neu kodieren — Minuten Rechenzeit je Video, und auf Vercel steht kein ffmpeg zur
 * Verfügung. Eine Seite kostet nichts und kann obendrein mehr: Sie trägt eine Vorschau mit
 * Bild, sie führt weiter zum Trichter, und wer sie öffnet, ist ein neuer Besucher.
 *
 * DIE KENNUNG IST DER SCHLÜSSEL. Wer die Adresse hat, sieht das Video — genau wie bei jeder
 * geteilten Einladung des Hauses. Sie ist eine UUID und steht nirgends; `noindex` hält sie
 * ausserdem aus den Suchmaschinen.
 */
export const dynamic = "force-dynamic";

async function laden(id: string) {
  const alle = await readKissLog();
  const e = alle.find(x => x.id === id && x.theme === "armee" && !!x.videoUrl);
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
  const T = armeeTexte(await resolveLang("de"));
  const titel = v?.vorname
    ? T.abspannEins.replace("{name}", v.vorname)
    : `${T.claimEins} ${T.claimZwei}`;
  return {
    title: `${titel} — ${DEMO_KUNDE.name}`,
    description: T.claimDrei,
    robots: { index: false, follow: false },
    openGraph: {
      title: titel, description: T.claimDrei, type: "video.other",
      siteName: DEMO_KUNDE.name,
      url: `${ACADEMY_DOMAIN}/academy/v/${id}`,
      ...(v?.poster ? { images: [{ url: v.poster }] } : {}),
    },
  };
}

export default async function GeteiltesVideoSeite({ params }: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const v = await laden(id);
  if (!v) notFound();

  const lang = await resolveLang("de");
  const T = armeeTexte(lang);

  return (
    <main className="lb-bg min-h-screen text-white">
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <ImmerOben />
        <GeteiltesVideo
          video={v.videoUrl} poster={v.poster} vorname={v.vorname}
          sprache={armeeSprache(lang)} marke={DEMO_KUNDE.name}
          texte={{
            ton: T.ton, tonAus: T.tonAus, gross: T.gross, klein: T.klein,
            teilen: T.teilen, teilenKopiert: T.teilenKopiert, teilenText: T.teilenText,
            abspannEins: T.abspannEins, abspannZwei: T.abspannZwei,
            selbst: T.geteiltCta,
          }}
          /**
           * DIREKT IN DEN TRICHTER (Owner 02.09.2026: „das soll direkt auf den Funnel
           * springen, nicht auf die Landingpage" · „damit auch andere sich generieren
           * können").
           *
           * Die Landingpage erklärt, was das Ding ist — wer hier steht, hat es gerade
           * gesehen. Ein Umweg über eine Erklärseite kostet an genau der Stelle Leute, an
           * der die Neugier am grössten ist: direkt nachdem jemand einen Bekannten in einer
           * Rolle gesehen hat, die er sich selbst vorstellen kann.
           */
          selbstHref="/academy/start" />
      </div>
    </main>
  );
}
