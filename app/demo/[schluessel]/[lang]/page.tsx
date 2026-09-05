import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DemoRecruiterAnsicht from "@/components/DemoRecruiterAnsicht";
import { ARMEE_SPRACHEN, DEMO_KUNDE, DEMO_SCHLUESSEL } from "@/lib/demo-armee";

/**
 * EINE ADRESSE JE SPRACHE — dasselbe Muster wie `app/academy/[lang]/page.tsx` (Owner
 * 04.09.2026: „dann für die Seiten brauche ich auch ro, de, en").
 *
 *   luxurybandit.com/demo/<schluessel>/de
 *   luxurybandit.com/demo/<schluessel>/ro
 *   luxurybandit.com/demo/<schluessel>/en
 *
 * WARUM IM PFAD UND NICHT NUR `?lang=ro`: Ein Fragezeichen-Anhängsel überlebt das
 * Weitergeben schlecht — wer die Adresse von Hand abtippt oder in eine Nachricht einfügt,
 * lässt es weg. Was im Pfad steht, bleibt dran.
 */

type Params = { params: Promise<{ schluessel: string; lang: string }> };

const gueltig = (lang: string) => (ARMEE_SPRACHEN as readonly string[]).includes(lang);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { schluessel } = await params;
  if (schluessel !== DEMO_SCHLUESSEL) return { robots: { index: false, follow: false } };
  return {
    title: `${DEMO_KUNDE.name} — Beispielansicht`,
    robots: { index: false, follow: false },
  };
}

export default async function DemoRecruiterSeiteInSprache({ params }: Params) {
  const { schluessel, lang } = await params;
  if (schluessel !== DEMO_SCHLUESSEL) notFound();
  if (!gueltig(lang)) notFound();

  return <DemoRecruiterAnsicht schluessel={schluessel} lang={lang} imPfad />;
}
