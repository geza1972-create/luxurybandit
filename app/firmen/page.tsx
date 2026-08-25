import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import TrackView from "@/components/TrackView";
import { Kicker, H1, Y, Lead, Fine } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import FirmenWartelisteClient from "./FirmenWartelisteClient";

/**
 * DIE FIRMEN-WARTELISTE — STUFE 0 DES MARKT-TESTS (KONZEPT-BEWERBUNGSZENTRALE.md,
 * beschlossen 25.08.2026): Das Firmen-Produkt („Anzeige rein, passende BEWERBUNGEN raus")
 * ist NICHT gebaut — diese Seite testet nur, ob Firmen es wollen. Anzeigen auf Bewerber
 * und Firmen laufen parallel; Cost je E-Mail-Eintragung entscheidet, welche Seite des
 * Markts zuerst bedient wird.
 *
 * BEWUSST KLEIN: eine Behauptung, drei Zeilen, ein Feld. Kein Preis, kein Produkt-Detail —
 * versprochen wird nur „bald", und genau das stimmt. Die Eintragungen landen als Mail beim
 * Betreiber (siehe FirmenWartelisteClient). Gold genau einmal (Skill `ci-design`).
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Passende Bewerbungen für Ihre Stelle | LuxuryBandit Talent",
  description: "Stellenanzeige einfügen — passende Video-Bewerbungen sehen. Bald verfügbar.",
  robots: { index: false, follow: false },
};

const TEXTE: Record<string, {
  kicker: string; h1A: string; h1Y: string; h1B: string;
  lead: string; punkte: string[]; fine: string;
}> = {
  de: {
    kicker: "Für Firmen",
    h1A: "Anzeige rein. ", h1Y: "Passende Bewerbungen", h1B: " raus.",
    lead: "Füge deine Stellenanzeige ein — Link oder Text — und du siehst Bewerbungen, die genau darauf zugeschnitten sind. Mit Video, Anschreiben und einem ehrlichen Match in Prozent.",
    punkte: [
      "Jede Bewerbung ist auf DEINE Anzeige zugeschnitten — kein Einheitsprofil",
      "Video statt Papier: Du siehst den Menschen, bevor du einlädst",
      "Kontakt erst, wenn beide Seiten wollen — keine kalten Listen",
    ],
    fine: "Bald verfügbar. Trag dich ein — du erfährst es zuerst, unverbindlich.",
  },
  en: {
    kicker: "For companies",
    h1A: "Paste your job ad. ", h1Y: "Get matching applications", h1B: ".",
    lead: "Paste your job ad — a link or its text — and see applications tailored to exactly that ad. With video, cover letter and an honest match in percent.",
    punkte: [
      "Every application is tailored to YOUR ad — no one-size-fits-all profiles",
      "Video instead of paper: you see the person before you invite them",
      "Contact only when both sides want it — no cold lists",
    ],
    fine: "Coming soon. Join the list — you'll hear first, no obligation.",
  },
};

export default async function FirmenPage() {
  const L = await resolveLang();
  const t = TEXTE[L] ?? TEXTE.en;

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav kreise={false} />
      <TrackView event="firmen_view" lookId="firmen-warteliste" lookName="Firmen-Warteliste" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <Kicker>{t.kicker}</Kicker>
        <H1 className="mt-1">{t.h1A}<Y>{t.h1Y}</Y>{t.h1B}</H1>
        <Lead className="mt-2">{t.lead}</Lead>

        <ul className="mt-6 space-y-3">
          {t.punkte.map(p => (
            <li key={p} className="flex gap-2.5 text-[14px] font-bold leading-snug text-white/85">
              <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#f6cf51]" />
              {p}
            </li>
          ))}
        </ul>

        <FirmenWartelisteClient lang={L} />
        <Fine className="mt-3">{t.fine}</Fine>
      </div>
      <SeitenFuss art="schlicht" />
    </main>
  );
}
