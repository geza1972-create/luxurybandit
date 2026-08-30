import type { Metadata } from "next";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import DavidReportAnsicht from "@/components/DavidReportAnsicht";
import DavidAngebote from "@/components/DavidAngebote";
import DavidSichern from "@/components/DavidSichern";
import LebenslaufBeispiel from "@/components/LebenslaufBeispiel";
import { Knopf } from "@/components/CI";
import { resolveLang } from "@/lib/lang-server";
import { davidTunnelInSprache } from "@/lib/david-tunnel-texte";
import { leseDavid } from "@/lib/david-store";
import { eur, RESUME_CENTS, DAVID_VIDEO_CENTS } from "@/lib/pricing";
import { CORA_MUSTER } from "@/lib/david-muster";
import { cookies } from "next/headers";
import { BESITZ_COOKIE, besitzImCookie } from "@/lib/lebenslauf-besitz-cookie";
import { isAdminRequest } from "@/lib/admin-auth";
import DavidBesitzTor from "@/components/DavidBesitzTor";

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

  /**
   * NUR DER BESITZER (Owner 28.08.2026: „ok aber darf niemand sehen nur er").
   *
   * Diese Seite hatte KEINE Prüfung: Sie las die Sitzung und zeigte sie. Wer die Adresse
   * hatte, las den ganzen Bericht — und darin steht mehr als in der Bewerbung selbst: die
   * Stelle, sein jetziger Arbeitgeber, die Schwachstellen seiner Unterlagen und Dinge, die
   * er im Gespräch erzählt und bewusst NICHT in seine Bewerbung geschrieben hat. Beim
   * heutigen Chef gelandet ist das kein peinlicher Moment, sondern ein Schaden.
   *
   * Der signierte Keks `lb_besitz` entscheidet — derselbe wie bei der Bewerbung, dieselbe
   * Kennung. Wer ihn nicht hat, bekommt das Tor: Der Besitzer weist sich dort in einer
   * Sekunde über seine Gerätekennung aus, ein Fremder kommt nicht weiter. Weitergeben lässt
   * sich der Link damit nicht mehr — der Keks reist nicht mit.
   */
  const keks = (await cookies()).get(BESITZ_COOKIE)?.value ?? "";
  const alsAdmin = await isAdminRequest(new Request("https://lb.local", {
    headers: { cookie: (await cookies()).toString() },
  })).catch(() => false);
  const darfSehen = alsAdmin || besitzImCookie(keks, String(id || ""));
  const preisUnterlagen = eur(RESUME_CENTS, L);
  /* Die Video-Bewerbung ist das teurere Stück (Skript, Avatar-Lauf, fertige Seite). */
  /* DER VIDEO-PREIS KOMMT AUS DEM VIDEO-PREIS (Fehler gefunden 29.08.2026, als der Owner den
     Preis auf 9,99 € setzte): Hier stand `LEBENSLAUF_CENTS` — der Preis eines ANDEREN
     Produkts. Beide standen zufällig auf 19 €, deshalb fiel es nie auf. In dem Moment, in dem
     einer von beiden geändert wird, zeigt die Seite einen Preis an und die Kasse bucht einen
     anderen ab. Die Kasse rechnet mit `DAVID_VIDEO_CENTS` (lib/pricing, `david-video`) —
     also muss die Anzeige es auch. */
  const preisVideo = eur(DAVID_VIDEO_CENTS, L);

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav marke="LB - David" heim="/themes/david" motto="AI Pre-Screening" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        {sitzung?.report && !darfSehen ? (
          /* Sitzung da, Keks fehlt — das Tor entscheidet, ob es der Besitzer ist. */
          <DavidBesitzTor id={String(id)} texte={{
            pruefe: S.torPruefe, titel: S.torTitel, text: S.torText,
            anmelden: S.torAnmelden, neu: S.torNeu,
          }} />
        ) : sitzung?.report ? (
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

            {/**
              * DIE MAIL STEHT UNTER DEM ANGEBOT (Owner 30.08.2026: „der Kauf steht zu weit
              * unten und Analyse schicken steht als erstes CTA da. Der User wird nach diesem
              * CTA nicht runterscrollen. Das darf kein Haupt-CTA sein.").
              *
              * Vorher stand dieser Block VOR den Angeboten und trug den einzigen goldenen
              * Knopf der Seite — das erste, was der Bewerber nach seinem Bericht sah, war
              * eine Aufforderung, sich selbst eine Mail zu schicken. Wer das tut, hält die
              * Seite für erledigt und ist weg, bevor er das Angebot überhaupt gelesen hat.
              * Jetzt kommt zuerst das Angebot; die Adresse steht als ruhiger Zweitweg
              * darunter (Knopf `umriss`, nicht Gold).
              *
              * AUCH HIER DIE ADRESSE (Owner 29.08.2026): Wer den Bericht Tage später aus
              * seinen Assets öffnet, ist derselbe Mensch mit demselben Problem — und diese
              * Seite erreicht er sogar dann, wenn die Mail nie ankam, weil sein Browser ihn
              * als Besitzer kennt.
              */}
            <DavidSichern genId={String(id)} email={sitzung.email ?? ""} S={S} />
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
