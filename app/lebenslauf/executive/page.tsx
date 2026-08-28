import type { Metadata } from "next";
import SpracheAmDokument from "@/components/SpracheAmDokument";
import { EXECUTIVE_BEISPIEL } from "@/lib/lebenslauf-vorlage";
import { CORA_MUSTER } from "@/lib/david-muster";
import { executiveInSprache, textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import SpielplatzClient from "./SpielplatzClient";
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

/**
 * DIE TEXTE DER MUSTER-SEITE — DEUTSCHE QUELLE, ÜBERSETZT ZUR LAUFZEIT (Owner 25.08.2026:
 * „Übersetzung muss funktionieren"). Sie lagen bis eben als de/en-Tabelle IM Client: Wer die
 * Seite auf Rumänisch öffnete — also genau der Markt, den wir angehen —, bekam Englisch.
 *
 * FLACH, DAMIT ES ÜBERSETZBAR IST: Die Listen der Analyse (was passt / was fehlt / Befunde)
 * stehen einzeln als g1…b3 statt als Arrays; `textbausteineInSprache` schickt alle Werte in
 * EINEM Aufruf durch den Haus-Übersetzer samt Dauer-Cache. Der Client rendert nur noch.
 */
const MUSTER_TEXTE = {
  videoEmpfehlung: "Unsere Empfehlung: eine Video-Bewerbung. Firmen sehen dich, bevor sie dich einladen — das hat kaum ein Bewerber.",
  anzeigePlatzhalter: "Stellenanzeige oder Link hier einfügen — du siehst sofort, wie gut sie zu dir passt.",
  anpassenCta: "Mach dir jetzt eine professionelle Bewerbung",
  /* Jedes Blatt wird EINZELN angepasst (Owner 25.08.2026: „Das wird auch per Klick
     angepasst, extra") — der Lebenslauf über den Knopf in der Analyse, das Anschreiben
     über den eigenen darunter. */
  anschreibenCta: "Anschreiben anpassen",
  analyseH: "Schnell-Analyse",
  analyseTeaser: "Was passt, was fehlt — und was an deinem Lebenslauf selbst schwach ist.",
  anzeigeH: "Beispiel einer Anzeige, die du gefunden hast",
  passt: "Das passt",
  fehlt: "Das fehlt",
  befundeH: "Am Lebenslauf selbst",
  anschreibenH: "Anschreiben",
  anschreibenTeaser: "Auf genau diese Anzeige zugeschnitten — Seite eins deiner Mappe.",
  demoBetreff: "Bewerbung als Fachpflegekraft Intensivmedizin",
  demoMeta: "Musterklinik München · Match 72 %",
  demoAnschreiben: "Sehr geehrte Damen und Herren,\n\nIhre Anzeige trifft genau meinen Werdegang: Seit 2021 betreue ich beatmete Patientinnen und Patienten auf einer interdisziplinären Intensivstation, davor fünf Jahre Zentrale Notaufnahme.\n\nDie Fachweiterbildung Intensiv- und Anästhesiepflege habe ich abgeschlossen, meine Berufsanerkennung für Deutschland ist beantragt. Ich kann kurzfristig anfangen und bin bereit umzuziehen.\n\nMit freundlichen Grüssen\nAndrei Popescu",
  demoHinweis: "Beispiel — so beginnt jede Bewerbung hier: Anschreiben oben, Lebenslauf darunter.",
  /* Owner 25.08.2026, auf Rumänisch diktiert („Ai găsit un anunț și vrei să vezi dacă
     anunțul se potrivește la tine, bagă textul și îți dăm o analiză") — die Zeile sagt
     nicht mehr, dass es ein Beispiel ist, sondern was man TUN soll. Deutsche Quelle,
     Rumänisch und die anderen fünf Sprachen kommen aus dem Übersetzer. */
  demoAnalyseHinweis: "Du hast eine Anzeige gefunden und willst wissen, ob sie zu dir passt? Füg den Text ein — wir geben dir die Analyse.",
  jobtitel: "Fachpflegekraft Intensivmedizin (m/w/d)",
  g1: "Fachweiterbildung Intensiv- und Anästhesiepflege verlangt — 2020 abgeschlossen.",
  g2: "Beatmungspflege gefordert — seit 2021 täglich auf der Intensivstation.",
  g3: "Deutsch mindestens B2 gefordert — C1 durch deutschsprachige Schule in Timișoara.",
  g4: "Schichtdienst gefordert — zwölf Jahre Schichterfahrung, fünf davon in der Notaufnahme.",
  l1: "Die Berufsanerkennung in Deutschland ist beantragt, aber noch nicht erteilt.",
  l2: "Zum Dokumentationssystem der Klinik steht im Lebenslauf nichts.",
  b1: "Deine Stationen stehen ohne Zahlen da — Bettenzahl und Betreuungsschlüssel belegen Erfahrung schneller als jede Beschreibung.",
  b2: "Die Fachweiterbildung steht ganz unten bei der Ausbildung, nicht oben, wo sie über die Einladung entscheidet.",
  b3: "Es fehlt ein Satz dazu, warum du nach Deutschland willst — das ist die erste Frage im Gespräch.",
};

export type MusterTexte = typeof MUSTER_TEXTE;

export default async function ExecutiveVorlagePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  /**
   * ZWEI MUSTER, EINE SEITE (28.08.2026): Die Bewerbungszentrale zeigt Andrei Popescu
   * (Pflege, rumänische Zielgruppe), David zeigt Oana Müller (Büro, deutschsprachig, und
   * dieselbe Person wie im Verwandlungs-Video). Beide Male dieselbe Darstellung — sonst
   * gäbe es die Muster-Seite zweimal, und die zweite würde beim ersten Umbau vergessen.
   */
  const sp = (await searchParams) ?? {};
  const muster = String(sp.muster ?? "") === "cora" ? CORA_MUSTER : EXECUTIVE_BEISPIEL;
  const lang = await resolveLang("ro");
  /* Auch das Beispiel folgt dem Sprachschalter — wer auf Rumänisch kauft, soll das Beispiel
     auf Rumänisch lesen (einmal übersetzt, dann Cache; Haus-Muster aus lib/tr-object.ts). */
  const profil = await executiveInSprache(muster, lang);
  /* SEIT 25.08.2026 IST DIESE SEITE DER SPIELPLATZ (Owner: „Hier darf der User ruhig
     sehen, was er bekommt, also er kann spielen") — Muster + Bewerberberater, siehe
     SpielplatzClient. Das blosse Beispiel gibt es nicht mehr einzeln. */
  const texte = await textbausteineInSprache(MUSTER_TEXTE, lang);
  return <>
    <SpracheAmDokument lang={lang} />
    <SpielplatzClient beispiel={profil} lang={lang} texte={texte} />
  </>;
}
