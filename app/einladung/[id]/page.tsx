import Link from "next/link";
import { notFound } from "next/navigation";
import { readEinladungen } from "@/lib/try-this-look-store";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import LightSwitch from "@/components/LightSwitch";

/**
 * DIE EINLADUNG, wie der Gast sie sieht (Owner 31.07.2026).
 *
 * Absichtlich eine eigene, nackte Seite: keine Kopfleiste, kein Menü, keine anderen Themen.
 * Wer diesen Link bekommt, ist nicht auf einer Werbeseite, sondern bei der Einladung eines
 * Freundes — alles andere wäre peinlich für die, die ihn verschickt hat, und dann verschickt
 * sie ihn nicht.
 *
 * Die Herkunft steht in EINER Zeile ganz unten. Das ist der ganze Kanal: unaufdringlich genug,
 * dass sie sich nicht schämt, sichtbar genug, dass ein Gast sie findet.
 *
 * `noindex`: Diese Seite gehört zwei Menschen, nicht Google.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Einladung",
  robots: { index: false, follow: false },
};

const TEXTE: Record<string, { save: string; wann: string; wo: string; herkunft: string; eigenes: string }> = {
  de: { save: "Wir heiraten", wann: "Wann", wo: "Wo", herkunft: "Dieses Video ist mit LuxuryBandit gemacht.", eigenes: "Macht euer eigenes" },
  en: { save: "We're getting married", wann: "When", wo: "Where", herkunft: "This video was made with LuxuryBandit.", eigenes: "Make your own" },
  ro: { save: "Ne căsătorim", wann: "Când", wo: "Unde", herkunft: "Videoclipul e făcut cu LuxuryBandit.", eigenes: "Faceți-l pe al vostru" },
  es: { save: "Nos casamos", wann: "Cuándo", wo: "Dónde", herkunft: "Este vídeo está hecho con LuxuryBandit.", eigenes: "Haced el vuestro" },
  fr: { save: "Nous nous marions", wann: "Quand", wo: "Où", herkunft: "Cette vidéo est faite avec LuxuryBandit.", eigenes: "Faites la vôtre" },
  pt: { save: "Vamos casar", wann: "Quando", wo: "Onde", herkunft: "Este vídeo foi feito com LuxuryBandit.", eigenes: "Façam o vosso" },
  it: { save: "Ci sposiamo", wann: "Quando", wo: "Dove", herkunft: "Questo video è fatto con LuxuryBandit.", eigenes: "Fate il vostro" },
};

export default async function EinladungPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alle = await readEinladungen().catch(() => []);
  const e = alle.find(x => x.id === id);
  if (!e || e.revoked || !e.videoUrl) notFound();

  const T = TEXTE[String(e.lang ?? "en")] ?? TEXTE.en;
  // Datum in der Sprache der Einladung — „14. August 2026" liest sich wie eine Einladung,
  // „2026-08-14" wie ein Formular.
  const datum = e.datum
    ? new Date(e.datum + "T12:00:00Z").toLocaleDateString(
        { de: "de-DE", en: "en-GB", ro: "ro-RO", es: "es-ES", fr: "fr-FR", pt: "pt-PT", it: "it-IT" }[String(e.lang ?? "en")] ?? "en-GB",
        { day: "numeric", month: "long", year: "numeric" },
      )
    : "";

  return (
    <main className="lb-bg min-h-screen text-white">
      <div className="mx-auto w-full max-w-[440px] px-4 pb-16 pt-6">
        {/* HELL UND DUNKEL AUCH HIER (Owner 31.07.2026: „und es muss light und dark sein").
            Klein und in der Ecke: Diese Seite ist eine Einladung, kein Bedienfeld — der
            Schalter darf da sein, aber er darf dem Brautpaar nicht die Schau stehlen. */}
        <div className="mb-4 flex justify-end"><LightSwitch /></div>
        <p className="text-center text-[12px] font-black uppercase tracking-[0.3em] text-[#f6cf51]">
          {T.save}
        </p>
        <h1 className="mt-2 text-center text-[30px] font-black leading-tight">
          {e.sie} <span className="text-[#f6cf51]">&amp;</span> {e.er}
        </h1>

        <div className="mt-5">
          <EinladungAnsicht id={e.id} videoUrl={e.videoUrl} />
        </div>

        {(datum || e.ort) && (
          <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
            {datum && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-white/45">{T.wann}</p>
                <p className="mt-0.5 text-[18px] font-black">{datum}</p>
              </div>
            )}
            {e.ort && (
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-white/45">{T.wo}</p>
                <p className="mt-0.5 text-[16px] font-bold">{e.ort}</p>
              </div>
            )}
          </div>
        )}

        {/* DIE EINE ZEILE. Mehr Werbung macht die Einladung unsendbar — und dann gibt es
            diesen Kanal gar nicht. */}
        <p className="mt-10 text-center text-[11px] font-medium leading-snug text-white/35">
          {T.herkunft}{" "}
          <Link href="/themes/wedding?utm_source=einladung" className="underline">{T.eigenes}</Link>
        </p>
      </div>
    </main>
  );
}
