import type { Metadata } from "next";
import { FileText, Sparkles, ShieldCheck } from "lucide-react";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Knopf } from "@/components/CI";
import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import { isLang, type Lang } from "@/lib/lang";
import { resolveLang } from "@/lib/lang-server";
import { eur, RESUME_CENTS } from "@/lib/pricing";

/**
 * LB - RESUME GENERATOR — DIE LANDINGPAGE (Owner 26.08.2026, eigenes Tool mit eigener
 * Marke nach der Topic-Architektur des Tages). Bewusst schlank: Hero + CTA + drei
 * Punkte + Preis-Zeile — kein Bewerbungszentrale-Block (Owner: „das entfernst du auf
 * dem PDF generator"), kein Video (das Produkt IST ein PDF).
 */

const LP_QUELLE = {
  kicker: "Resume Generator",
  h1: "Für jede Stelle die perfekte Bewerbung.",
  unterzeile: "Du gibst die Anzeige ein und deinen Lebenslauf dazu — wir bauen die fertige Bewerbung als PDF: Titelblatt mit Anschreiben, sauberes Layout, ehrliche Analyse.",
  cta: "Bewerbung erzeugen — gratis",
  p1Titel: "Titelblatt mit Anschreiben",
  p1Text: "Das Anschreiben ist auf die Anzeige geschrieben — konkret, mit Belegen aus deinem Lebenslauf, Lücken offen angesprochen statt versteckt.",
  p2Titel: "Die ehrliche Analyse",
  p2Text: "Du siehst in Prozent, wie gut du auf die Stelle passt — Anforderung für Anforderung: erfüllt, übertragbar, erklärbar oder Blocker.",
  p3Titel: "Gratis als Muster",
  /* DER PREIS STEHT NICHT IM ÜBERSETZTEN SATZ (Owner-Fund 26.08.2026: Screenshot zeigte
     unübersetzt „{price}" statt der Zahl) — die KI-Übersetzung lief VOR der Einsetzung
     und übersetzte „preis" in der Klammer gleich mit zu „price"; der anschließende Ersatz
     suchte aber nach dem deutschen Wort und fand nichts mehr. Deshalb hier zwei Teile OHNE
     Platzhalter, die Zahl kommt beim Rendern unübersetzt dazwischen (Hausregel
     `prices-only-from-pricing-table`). */
  p3TextVor: "Das Muster-PDF mit Wasserzeichen kostet nichts und darf verschickt werden. Die volle Optimierung auf die Anzeige — ohne Wasserzeichen — kostet",
  p3TextNach: "einmalig.",
  preisZeileVor: "Kein Abo. Keine Anmeldung.",
  preisZeileNach: "nur, wenn du die Vollversion willst.",
} as const;

export const metadata: Metadata = {
  title: "Resume Generator — die perfekte Bewerbung als PDF | LB - Resume Generator",
  description: "Anzeige + Lebenslauf rein, fertige Bewerbung als PDF raus: Anschreiben, sauberes Layout, ehrliche Analyse. Gratis als Muster.",
};

export default async function ResumeLandingpage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const spLang = String(sp.lang ?? "");
  const L: Lang = isLang(spLang) ? spLang : await resolveLang("en");
  const hell = String(sp.light ?? "") === "1";
  const S = await textbausteineInSprache(LP_QUELLE as unknown as Record<string, string>, L);
  const preis = eur(RESUME_CENTS, L);
  const start = `/themes/resume/start${hell ? "?light=1" : ""}`;

  const punkte = [
    { icon: FileText, titel: S.p1Titel, text: S.p1Text },
    { icon: ShieldCheck, titel: S.p2Titel, text: S.p2Text },
    { icon: Sparkles, titel: S.p3Titel, text: `${S.p3TextVor} ${preis}, ${S.p3TextNach}` },
  ];

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav marke="LB - Resume Generator" heim="/themes/resume" motto="Perfect Resume PDF" />
      <div className="mx-auto flex w-full max-w-[440px] flex-col px-4 pb-24 pt-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#f6cf51]">{S.kicker}</p>
        <h1 className="mt-1 text-[28px] font-black leading-tight">{S.h1}</h1>
        <p className="mt-2 text-[14px] font-bold leading-snug text-white/60">{S.unterzeile}</p>
        <div className="mt-4">
          <Knopf art="gold" href={start}>{S.cta}</Knopf>
        </div>
        <p className="mt-2 text-center text-[11px] font-medium text-white/40">{S.preisZeileVor} {preis} {S.preisZeileNach}</p>

        <div className="mt-8 flex flex-col gap-3">
          {punkte.map((p, i) => (
            <div key={i} className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
              <p className="flex items-center gap-2 text-[14px] font-black text-white/90">
                <p.icon className="h-4 w-4 shrink-0 text-[#f6cf51]" /> {p.titel}
              </p>
              <p className="mt-1.5 text-[13px] font-medium leading-snug text-white/55">{p.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Knopf art="gold" href={start}>{S.cta}</Knopf>
        </div>
      </div>
      <SeitenFuss marke="LB - Resume Generator" />
    </main>
  );
}
