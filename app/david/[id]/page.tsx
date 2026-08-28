import type { Metadata } from "next";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import DavidReportAnsicht from "@/components/DavidReportAnsicht";
import DavidAngebote from "@/components/DavidAngebote";
import LebenslaufBeispiel from "@/components/LebenslaufBeispiel";
import { Knopf } from "@/components/CI";
import { resolveLang } from "@/lib/lang-server";
import { davidTunnelInSprache } from "@/lib/david-tunnel-texte";
import { leseDavid } from "@/lib/david-store";
import { eur, RESUME_CENTS, LEBENSLAUF_CENTS } from "@/lib/pricing";
import { CORA_MUSTER } from "@/lib/david-muster";

/**
 * DER GESPEICHERTE BERICHT UNTER EIGENER ADRESSE.
 *
 * Der Owner will den Bericht in „Meine Assets" (§19) — eine Kachel dort braucht ein Ziel,
 * und ein Bericht ist kein Video und kein Bild, also führt sie hierher. Dieselbe Darstellung
 * wie im Trichter (`components/DavidReportAnsicht.tsx`), nur ohne das Gespräch drumherum.
 *
 * DIE ADRESSE IST DER SCHLÜSSEL — wie bei jedem Werk im Haus (`/einladung/<id>`): Die Kennung
 * ist eine Zufalls-UUID, sie steht in keiner Liste und ist nicht zu erraten. Ein Login gibt
 * es in diesem Trichter bewusst nicht (Owner §2: „Keine Registrierung mit Passwort").
 *
 * NIE INDEXIEREN: Hier stehen die Erkenntnisse aus dem Lebenslauf eines Menschen.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dein Pre-Screening-Ergebnis | LB - David",
  robots: { index: false, follow: false },
};

export default async function DavidBerichtSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const L = await resolveLang("de");
  const S = await davidTunnelInSprache(L);
  const sitzung = await leseDavid(String(id || ""));
  const preisUnterlagen = eur(RESUME_CENTS, L);
  /* Die Video-Bewerbung ist das teurere Stück (Skript, Avatar-Lauf, fertige Seite). */
  const preisVideo = eur(LEBENSLAUF_CENTS, L);

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav marke="LB - David" heim="/themes/david" motto="AI Pre-Screening" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        {sitzung?.report ? (
          <>
            {/* Kopf und Abschnitte kommen aus dem gemeinsamen Baustein — er trägt das
                Design des Owners (28.08.2026). */}
            <DavidReportAnsicht
              report={sitzung.report} T={S}
              kopf={{
                kicker: `${S.reportFuer} ${sitzung.vorname || ""}`.trim(),
                titel: S.reportTitel,
                jobTitel: sitzung.jobTitel,
                jobOrt: sitzung.jobOrt,
                jobArt: sitzung.jobArt,
                schwerpunkte: sitzung.cvBefund?.schwerpunkte,
                layout: sitzung.cvBefund?.layout,
                foto: sitzung.cvBefund?.foto,
              }} />

            {/* DIE BEZAHLTEN SCHRITTE STEHEN AUCH HIER (Owner 28.08.2026: „ich dachte wir
                machen das auf der ergebnis seite") — derselbe Baustein wie im Trichter, mit
                den Daten aus der gespeicherten Sitzung. Wer seinen Bericht Tage später aus
                den Assets öffnet, kann von hier aus kaufen, ohne noch einmal irgendetwas
                hochzuladen. */}
            <DavidAngebote
              S={S} preisUnterlagen={preisUnterlagen} preisVideo={preisVideo} lang={L}
              genId={String(id)} email={sitzung.email ?? ""}
              cvPath={sitzung.cvPath ?? ""} cvName={sitzung.cvName ?? ""}
              anzeige={sitzung.jobText ?? ""} vorname={sitzung.vorname}
              beispielCv={<LebenslaufBeispiel lang={L} profil={CORA_MUSTER} href="" />} />
          </>
        ) : (
          /* Kein Bericht (falsche Kennung oder abgebrochenes Screening) — eine ehrliche
             Auskunft und ein Weg zurück, nie eine leere Seite. */
          <div className="pt-10">
            <h1 className="text-[24px] font-black leading-tight">{S.reportFehler}</h1>
            <p className="mt-3 text-[15px] font-medium leading-relaxed text-white/80">{S.cvText}</p>
            <div className="mt-5">
              <Knopf art="gold" href="/themes/david/start">{S.screeningStarten}</Knopf>
            </div>
            <p className="mt-4 text-center text-[12.5px] font-bold text-white/50">
              <Link href="/themes/david" className="underline">David · AI Pre-Screening</Link>
            </p>
          </div>
        )}
      </div>
      <SeitenFuss art="schlicht" lang={L} />
    </main>
  );
}
