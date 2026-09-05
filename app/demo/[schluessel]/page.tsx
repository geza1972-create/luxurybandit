import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveLang } from "@/lib/lang-server";
import DemoRecruiterAnsicht from "@/components/DemoRecruiterAnsicht";
import { DEMO_KUNDE, DEMO_SCHLUESSEL } from "@/lib/demo-armee";

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
 * DREI SPRACHEN, ZWEI TÜREN (Owner 02.09.2026: „auf deutsch und englisch", 04.09.2026: „auch
 * ro, de, en"): Diese Datei ist die query-basierte Tür (`?lang=`, Cookie, Browsersprache).
 * `[lang]/page.tsx` daneben ist die feste, zum Weitergeben — beide rendern denselben
 * Baustein, `components/DemoRecruiterAnsicht.tsx`. Sie SIEZT, während der Trichter duzt —
 * hier steht ein Arbeitgeber, dort ein Bewerber.
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

  return <DemoRecruiterAnsicht schluessel={schluessel} lang={lang} />;
}
