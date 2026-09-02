import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveLang } from "@/lib/lang-server";
import TopNav from "@/components/TopNav";
import RecruiterDashboard from "@/components/RecruiterDashboard";
import {
  ARMEE_SPRACHEN, DEMO_KAMPAGNE, DEMO_KUNDE, DEMO_SCHLUESSEL, DEMO_TRICHTER,
  KOSTEN_JE_PROFIL_CENT, KOSTEN_JE_VIDEO_CENT, armeeTexte, demoMotive, demoProfile, recruiterTexte,
} from "@/lib/demo-armee";

/**
 * DIE RECRUITERSEITE — das Akquise-Werkzeug (Owner 01.09.2026: „Das ist mein Aquise seite.
 * Das zeige ich den Kunden, das bekommen sie.").
 *
 * SIE BLEIBT GESCHÜTZT, WÄHREND DER TRICHTER ÖFFENTLICH IST. Das ist kein Widerspruch,
 * sondern die Aufteilung des Produkts: Der Trichter gehört dem Bewerber und soll gefunden
 * werden; diese Seite gehört dem Kunden und zeigt seine Zahlen. Ein falscher Schlüssel
 * ergibt 404 — nicht „kein Zugang", denn schon diese Auskunft verriete, dass es hier etwas
 * gibt.
 *
 * ZWEI SPRACHEN (Owner 02.09.2026: „auf deutsch und englisch"): Beide statisch im Code, wie
 * beim Trichter. Sie SIEZT, während der Trichter duzt — hier steht ein Arbeitgeber, dort ein
 * Bewerber.
 *
 * KEIN HOHEITSZEICHEN: Der Name der (erfundenen) Organisation steht hier, ein nachgebautes
 * Wappen nicht.
 */

export async function generateMetadata({ params }: { params: Promise<{ schluessel: string }> }): Promise<Metadata> {
  const { schluessel } = await params;
  if (schluessel !== DEMO_SCHLUESSEL) return { robots: { index: false, follow: false } };
  return {
    title: `${DEMO_KUNDE.name} — Beispielansicht`,
    robots: { index: false, follow: false },
  };
}

export default async function DemoRecruiterSeite({ params, searchParams }: {
  params: Promise<{ schluessel: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { schluessel } = await params;
  if (schluessel !== DEMO_SCHLUESSEL) notFound();

  const sp = await searchParams;
  const lang = String(sp.lang ?? "") || (await resolveLang("de"));
  const T = recruiterTexte(lang);
  /* Der Claim wird nicht doppelt gepflegt: Was der Bewerber im Trichter liest, ist genau
     das, was der Kunde hier als Kampagnen-Aussage sieht. */
  const A = armeeTexte(lang);

  return (
    <main className="lb-bg min-h-screen text-white">
      {/* `schlicht` schliesst die Seite: kein Konto, kein Guthaben, kein Weg zu einem
          anderen Produkt. Der Kunde soll seine Kampagne sehen, nicht unseren Katalog. */}
      <TopNav schlicht back={false} marke={DEMO_KUNDE.name} heim={`/demo/${schluessel}`}
        motto={null} breit sprachen={[...ARMEE_SPRACHEN]} />

      <RecruiterDashboard daten={{
        kunde: DEMO_KUNDE,
        kampagne: DEMO_KAMPAGNE,
        trichter: DEMO_TRICHTER,
        kostenJeVideoCent: KOSTEN_JE_VIDEO_CENT,
        kostenJeProfilCent: KOSTEN_JE_PROFIL_CENT,
        motive: demoMotive(),
        claim: { zeileEins: A.claimEins, zeileZwei: A.claimZwei, zeileDrei: A.claimDrei },
        trichterHref: `/armee${lang.startsWith("en") ? "?lang=en" : ""}`,
        profile: demoProfile(),
        texte: T,
        beispiel: true,
      }} />
    </main>
  );
}
