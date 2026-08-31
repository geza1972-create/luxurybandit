import type { Metadata } from "next";
import { resolveLang } from "@/lib/lang-server";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import JoburiFunnel from "@/components/JoburiFunnel";
import { joburiTexte, JOBURI_SPRACHEN } from "@/lib/joburi-texte";

/**
 * DER JOBURI-TRICHTER — EIGENE ADRESSE, EIGENE SPRACHE (Owner 31.08.2026).
 *
 * `/joburi/germana` UND NICHT MEHR NUR `/joburi` (Owner 31.08.2026: „die url muss heissen
 * erst mal /joburi/germana nicht joburi"): `joburi` wird damit die Rubrik und `germana` der
 * konkrete Trichter — Platz für weitere Sprachen daneben, ohne dass eine Adresse ihre
 * Bedeutung ändert. Und der Empfänger liest schon am Link, worum es geht: Jobs mit Deutsch.
 *
 * `/joburi` selbst leitet weiter (siehe app/joburi/page.tsx) — die Anzeigen tragen die alte
 * Adresse, und ein toter Anzeigen-Link ist bezahltes Geld, das ins Leere läuft.
 *
 * WARUM ÜBERHAUPT HIER UND NICHT `/themes/...`: Diese Adresse steht in einer rumänischen
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

/* Titel und Beschreibung folgen der Sprache — sie sind das, was in der Vorschau einer
   verschickten Nachricht steht. Ein rumänischer Titel über einem deutschen Text ist der
   erste Bruch, den der Empfänger sieht; sie standen bis zum 31.08. fest auf Rumänisch. */
export async function generateMetadata({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const T = joburiTexte(String(sp.lang ?? "") || (await resolveLang("ro")));
  return {
    title: `${T.studieTitel} ${T.studieTitelZwei}`,
    description: T.studieUnter,
    robots: { index: false, follow: false },
  };
}

export default async function JoburiSeite({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  /* Die Adresse sticht die gespeicherte Wahl — ein gezielt verschickter Link kommt bei
     jedem Empfänger gleich an. Ohne Angabe: seine Wahl, dann seine Browsersprache, dann
     Rumänisch (die Sprache, für die dieser Trichter gebaut ist). */
  const lang = String(sp.lang ?? "") || (await resolveLang("ro"));
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
      <TopNav schlicht back={false} marke="Joburi cu Germană" heim="/joburi/germana" motto="by LB Funnels Creator" sprachen={[...JOBURI_SPRACHEN]} />

      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        {/* TALENT MARKET PULSE (Owner 31.08.2026): Die Seite verspricht keine Stellen mehr,
            sondern eine Frage — und die Frage ist das Angebot. Sie hält damit nichts, was ein
            leerer Bestand brechen könnte. */}
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">{T.studieKicker}</p>
        <h1 className="mt-1 text-[28px] font-black leading-[1.06]">
          {T.studieTitel} <span className="text-[#f6cf51]">{T.studieTitelZwei}</span>
        </h1>
        <p className="mt-2.5 text-[15px] font-medium leading-snug text-white/85">{T.studieUnter}</p>
        {/* Was ihn erwartet, bevor er anfängt: sieben Klicks, keine Person. Genau die zwei
            Zahlen entscheiden, ob jemand die erste Frage überhaupt antippt. */}
        <p className="mt-2 text-[12px] font-black uppercase tracking-[0.14em] text-white/45">{T.studieDauer}</p>

        <div className="mt-5">
          <JoburiFunnel T={T} lang={lang} />
        </div>
      </div>

      <SeitenFuss art="schlicht" lang={lang} />
    </main>
  );
}
