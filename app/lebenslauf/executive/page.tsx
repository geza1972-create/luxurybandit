import type { Metadata } from "next";
import LebenslaufExecutive from "@/components/LebenslaufExecutive";
import { EXECUTIVE_BEISPIEL } from "@/lib/lebenslauf-vorlage";
import { executiveInSprache } from "@/lib/lebenslauf-uebersetzen";
import { resolveLang } from "@/lib/lang-server";

/**
 * DIE VORLAGE „EXECUTIVE" ZUM ANSEHEN — /lebenslauf/executive.
 *
 * Eine feste Adresse mit dem Muster-Profil, damit die Vorlage beurteilt werden kann, OHNE dass
 * ein echtes Profil in Supabase liegen muss. Sie ist der lebende Beweis, nicht ein Bild davon:
 * Was hier steht, IST der Baustein `components/LebenslaufExecutive.tsx` — ändert er sich,
 * ändert sich diese Seite mit (dieselbe Bauweise wie die CI-Muster-Seite `/ci`).
 *
 * STATISCH SCHLÄGT DYNAMISCH: `/lebenslauf/[id]` liegt daneben, aber Next.js gibt einem
 * festen Segment den Vorrang — diese Seite fängt „executive" ab, ohne dass die echte
 * Profilseite etwas davon merkt.
 *
 * SEIT 24.08.2026 IST DIE ECHTE PROFILSEITE UMGESTELLT (Owner: „Die Leute kaufen was sie
 * sehen"): `app/lebenslauf/[id]/page.tsx` rendert dieselbe Vorlage über den Übersetzer
 * `executiveAusProfil` (lib/lebenslauf-vorlage.ts). Diese Seite hier bleibt das öffentliche
 * Beispiel — die Landingpage verlinkt sie („Die Seite, die du bekommst").
 */

export const metadata: Metadata = {
  title: "Executive — candidate profile template",
  /* NICHT INDEXIEREN: Anna Keller ist erfunden (der Muster-Lebenslauf im Repo trägt es selbst
     als „FICTIONAL SAMPLE CV"). Ein erfundener Mensch, der bei Google als echter Kandidat
     auftaucht, ist genau die Sorte Schaden, die eine Bewerbungsplattform nicht haben darf. */
  robots: { index: false, follow: false },
};

export default async function ExecutiveVorlagePage() {
  const lang = await resolveLang();
  /* Auch das Beispiel folgt dem Sprachschalter — wer auf Rumänisch kauft, soll das Beispiel
     auf Rumänisch lesen (einmal übersetzt, dann Cache; Haus-Muster aus lib/tr-object.ts). */
  const profil = await executiveInSprache(EXECUTIVE_BEISPIEL, lang);
  return <LebenslaufExecutive profil={profil} lang={lang} />;
}
