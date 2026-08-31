import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import JoburiFunnel from "@/components/JoburiFunnel";
import { joburiTexte } from "@/lib/joburi-texte";

/**
 * DER JOBURI-TRICHTER — EIGENE ADRESSE, EIGENE SPRACHE (Owner 31.08.2026).
 *
 * WARUM `/joburi` UND NICHT `/themes/...`: Diese Adresse steht in einer rumänischen
 * Meta-Anzeige. „joburi" ist für die Zielgruppe sofort lesbar; ein englischer Themenpfad
 * mit Marke davor wäre eine Hürde in genau der Sekunde, in der geklickt wird.
 *
 * DIE SPRACHE KOMMT NICHT AUS DER ÜBERSETZUNG (siehe lib/joburi-texte): Rumänisch steht
 * statisch im Code. Der erste Besucher wartet damit 0 statt 26 bis 44 Sekunden — bei einem
 * Trichter, den eine Anzeige füttert, entscheidet das über den ganzen Test.
 *
 * `?lang=de` schaltet auf die deutsche Fassung, falls derselbe Trichter später in
 * Deutschland läuft. Ebenfalls statisch, ebenfalls ohne Modell.
 */

export const metadata: Metadata = {
  title: "Joburi cu germană | Vezi oportunitățile",
  description: "Vorbești germană? Răspunde la 4 întrebări și îți arătăm joburi reale care ți s-ar putea potrivi.",
  robots: { index: false, follow: false },
};

export default async function JoburiSeite({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const lang = String(sp.lang ?? "ro");
  const T = joburiTexte(lang);

  return (
    <main className="lb-bg min-h-screen text-white">
      {/* KEIN „LB" IM KOPF (Owner 31.08.2026, zu David: „steht LB" — zwei Buchstaben, die
          niemand kennt, an der Stelle, wo der Absender steht, schaffen kein Vertrauen).
          Hier steht, worum es geht: Jobs mit Deutsch. */}
      {/**
        * PRODUKTNAME UND ABSENDER (Owner 31.08.2026, Punkt 6: „Joburi cu Germană — by
        * LuxuryBandit") — der Name sagt, worum es geht, der Zusatz sagt, bei wem er ist.
        *
        * `schlicht` schliesst den Trichter (Punkt 5): kein Weg zu Assets, zum Konto, zu
        * einem anderen Produkt. Der Zurück-Pfeil ist ebenfalls aus — er führte auf die
        * Startseite des Portals, also aus dem Trichter heraus.
        */}
      <TopNav schlicht back={false} marke="Joburi cu Germană" heim="/joburi" motto="by LuxuryBandit" />

      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">{T.kicker}</p>
        <h1 className="mt-1 text-[28px] font-black leading-[1.06]">
          {T.titel} <span className="text-[#f6cf51]">{T.titelZwei}</span>
        </h1>
        <p className="mt-2.5 text-[15px] font-medium leading-snug text-white/85">{T.untertitel}</p>

        <div className="mt-5">
          <JoburiFunnel T={T} lang={lang} />
        </div>
      </div>

      <SeitenFuss art="schlicht" lang={lang} />
    </main>
  );
}
