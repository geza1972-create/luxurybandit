import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveLang } from "@/lib/lang-server";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import JoburiFunnel from "@/components/JoburiFunnel";
import { joburiTexte, JOBURI_SPRACHEN } from "@/lib/joburi-texte";
import { kunde as leseKunde } from "@/lib/kunden-store";

/**
 * DER FUNNEL FÜR EINEN EINZELNEN KUNDEN (Owner 01.09.2026: „Recruiterseite und Funnel sind
 * ein Paket … Ich nehme an ich will jetzt für Krankenpfleger für ein Pflegehaus suchen.").
 *
 * DASSELBE BAUWERK, NUR BESCHRIFTET: Kein zweiter Funnel-Code — dieselbe `JoburiFunnel`-
 * Komponente wie `/joburi/germana`, nur mit dem Beruf-Platzhalter und der Branchen-Zeile des
 * Kunden überschrieben. Fragen, Logik und Speicherung bleiben identisch; nur `kunde={slug}`
 * kommt dazu, damit die Antworten diesem Kunden zugeordnet werden (siehe
 * `/kunde/[slug]` und `lib/kunden-store.ts`).
 *
 * `germana` BLEIBT DIE STATISCHE ADRESSE DANEBEN: Next.js bevorzugt ein festes Segment
 * (`app/joburi/germana`) gegenüber diesem dynamischen (`[kunde]`) — die alte, schon
 * beworbene Anzeige bricht dadurch nicht.
 */

export async function generateMetadata({ params }: { params: Promise<{ kunde: string }> }): Promise<Metadata> {
  const { kunde: slug } = await params;
  const k = await leseKunde(slug);
  if (!k) return { robots: { index: false, follow: false } };
  return {
    title: `${k.branche || k.name} — LB Talent Network`,
    robots: { index: false, follow: false },
  };
}

export default async function KundenJoburiSeite({
  params, searchParams,
}: {
  params: Promise<{ kunde: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { kunde: slug } = await params;
  const k = await leseKunde(slug);
  if (!k) notFound();

  const sp = await searchParams;
  const lang = String(sp.lang ?? "") || (await resolveLang("de"));
  const T = { ...joburiTexte(lang) };
  /* Nur die Beschriftung wechselt — dieselben drei Stellen, die auch beim allgemeinen
     Funnel die erste Frage und den Kopf ausmachen. */
  if (k.berufPlatzhalter) T.tnBerufPlatz = k.berufPlatzhalter;
  if (k.branche) {
    T.tnKicker = k.branche.toUpperCase();
    T.tnUnter = `${k.name} sucht: ${k.branche}. Sag uns einmal, was du kannst und was ein neues Angebot bieten müsste. Wenn wir etwas wirklich Passendes finden, melden wir uns.`;
  }

  return (
    <main className="lb-bg lb-theme lb-fb min-h-screen text-white">
      <TopNav schlicht back={false} marke={k.name} heim={`/joburi/${slug}`} motto="by LB Funnels Creator" sprachen={[...JOBURI_SPRACHEN]} />

      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <JoburiFunnel T={T} lang={lang} kunde={slug} kopf={
          <>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">{T.tnKicker}</p>
            <h1 className="mt-1 text-[28px] font-black leading-[1.06]">
              {T.tnTitel} <span className="text-[#f6cf51]">{T.tnTitelZwei}</span>
            </h1>
            <p className="mt-2.5 text-[15px] font-medium leading-snug text-white/85">{T.tnUnter}</p>
            <p className="mt-2 text-[12px] font-black uppercase tracking-[0.14em] text-white/45">{T.tnDauer}</p>
          </>
        } />
      </div>

      <SeitenFuss art="schlicht" lang={lang} />
    </main>
  );
}
