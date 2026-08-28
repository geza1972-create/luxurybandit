import { Fragment } from "react";
import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import DavidFunnel from "@/components/DavidFunnel";
import DavidInhalt from "@/components/DavidInhalt";
import LebenslaufBeispiel from "@/components/LebenslaufBeispiel";
import { isLang, type Lang } from "@/lib/lang";
import { resolveLang } from "@/lib/lang-server";
import { eur, RESUME_CENTS, LEBENSLAUF_CENTS } from "@/lib/pricing";
import { davidTunnelInSprache } from "@/lib/david-tunnel-texte";
import { davidTexteInSprache } from "@/lib/david-texte";
import { CORA_MUSTER } from "@/lib/david-muster";

/**
 * DER DAVID-TRICHTER — die Seite hinter „Jetzt kostenlos starten".
 *
 * Sie liefert nur INHALTE; der Ablauf steht in `components/DavidFunnel.tsx`. Dasselbe
 * Muster wie beim Resume Generator: deutsche Textquelle, zur Laufzeit übersetzt, Preis
 * fertig formatiert aus `lib/pricing` (nie eine Zahl im Text).
 *
 * WARUM HIER KEIN `TunnelSeite` STEHT (bewusste Abweichung von der Dauerregel
 * `ein-tunnel-geruest-fuer-alle`, dokumentiert statt stillschweigend): Das Gerüst verwaltet
 * SCHRITT-NUMMERN IN DER ADRESSE, damit ein Besucher vor- und zurückspringen kann. Genau das
 * ist hier falsch — David führt ein Gespräch, dessen Zustand auf dem Server liegt (Fragen,
 * Antworten, Bericht). Ein Zurück-Sprung per Adresse würde ihn mitten in ein Gespräch
 * setzen, das es im Browser nicht mehr gibt. Der Resume Generator (26.08.2026) hat dieselbe
 * Entscheidung getroffen. Was das Gerüst SONST mitbringt, ist hier trotzdem da: der
 * Landingpage-Inhalt unter dem Trichter und die Funnel-Ereignisse.
 *
 * NICHT INDEXIEREN: Der Trichter ist kein Ziel für Google — die Landingpage ist es.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dein Pre-Screening mit David | LB - David",
  description: "Lebenslauf und Wunschstelle hochladen, Fragen beantworten, vollständiges Ergebnis erhalten — kostenlos.",
  robots: { index: false, follow: true },
};

export default async function DavidStartSeite({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const spLang = String(sp.lang ?? "");
  const L: Lang = isLang(spLang) ? spLang : await resolveLang("de");
  const hell = String(sp.light ?? "") === "1";
  const S = await davidTunnelInSprache(L);
  const T = await davidTexteInSprache(L);
  /* Lebenslauf UND Anschreiben laufen über EINEN Kauf — den des Resume Generators
     (`RESUME_CENTS`). Kein neuer Preis, keine zweite Zahl (Owner §25). */
  const preisUnterlagen = eur(RESUME_CENTS, L);
  const preisVideo = eur(LEBENSLAUF_CENTS, L);

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav marke="LB - David" heim="/themes/david" motto="AI Pre-Screening" />
      <div className="mx-auto flex w-full max-w-[440px] flex-col px-4 pb-24 pt-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#f6cf51]">{T.kicker}</p>
        <h1 className="mt-1 text-[26px] font-black leading-tight">{T.h1a}{T.h1y}{T.h1b}</h1>

        <DavidFunnel
          S={S} lang={L} preisUnterlagen={preisUnterlagen} preisVideo={preisVideo}
          /* „Die Leute kaufen, was sie sehen" (Owner 24.08.2026) — das Muster-Dossier von
             Oana Müller, derselben Person, die im Verwandlungs-Video zu sehen ist. Das
             Video selbst braucht hier kein Prop mehr: Es steht ohne Karte im Angebots-
             Baustein (Owner 28.08.2026). */
          /* Jedes durchgereichte Server-Stück bekommt einen Schlüssel: Next liefert eine
             async Server-Komponente als LISTE an den Client-Baum, und React verlangt dort
             einen `key`. */
          beispielCv={<Fragment key="cv"><LebenslaufBeispiel lang={L} profil={CORA_MUSTER} href="" /></Fragment>}
          inhalt={<Fragment key="inhalt"><DavidInhalt T={T} href="/themes/david/start" ohneCta /></Fragment>}
        />
      </div>
      {/* Der schlichte Fuss wie in allen Bewerber-Strecken — in der Sprache der Seite. */}
      <SeitenFuss art="schlicht" lang={L} />
    </main>
  );
}
