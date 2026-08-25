import type { Metadata } from "next";
import { EXECUTIVE_BEISPIEL } from "@/lib/lebenslauf-vorlage";
import SpielplatzClient from "./SpielplatzClient";
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
  /* NICHT INDEXIEREN: Andrei Popescu ist erfunden (Owner 25.08.2026 — vorher stand hier
     der echte Name und Werdegang des Gründers, was mit dem Avatar-Gesicht im Beispiel-Video
     nicht mehr zusammenging). Ein erfundener Mensch, der bei Google als echter Kandidat
     auftaucht, ist genau die Sorte Schaden, die eine Bewerbungsplattform nicht haben darf. */
  robots: { index: false, follow: false },
};

export default async function ExecutiveVorlagePage() {
  const lang = await resolveLang();
  /* Auch das Beispiel folgt dem Sprachschalter — wer auf Rumänisch kauft, soll das Beispiel
     auf Rumänisch lesen (einmal übersetzt, dann Cache; Haus-Muster aus lib/tr-object.ts). */
  const profil = await executiveInSprache(EXECUTIVE_BEISPIEL, lang);
  /* SEIT 25.08.2026 IST DIESE SEITE DER SPIELPLATZ (Owner: „Hier darf der User ruhig
     sehen, was er bekommt, also er kann spielen") — Muster + Bewerberberater, siehe
     SpielplatzClient. Das blosse Beispiel gibt es nicht mehr einzeln. */
  return <SpielplatzClient beispiel={profil} lang={lang} />;
}
