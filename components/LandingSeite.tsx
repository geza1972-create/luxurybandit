import type { ReactNode } from "react";
import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import SeitenFuss from "@/components/SeitenFuss";
import ThemenVorspann from "@/components/ThemenVorspann";
import { Kicker, H1, Y, SectionTitle, Lead } from "@/components/Landing";

/**
 * DAS EINE LANDINGPAGE-GERÜST (Owner 13.08.2026: „lies die komponenten aus der Landingpage
 * bei Kiss oder Verprechen raus und mach ein landingpage template mit componenten draus") —
 * dasselbe Gesetz wie beim Tunnel (`TunnelSeite`, Memory `ein-tunnel-geruest-fuer-alle`),
 * jetzt für die Themenseiten: EINE Änderung am Aufbau = überall.
 *
 * DER AUFBAU IST DER DER KISS-SEITE (Owner 05.08.2026: „alle Topic-Seiten sollen so
 * aufgebaut werden, ist die Kiss-Seite"; CTA-Template 10.08.2026: „ich will den CTA im
 * Viewport"), in dieser festen Reihenfolge:
 *
 *   1  TopNav + TrackView
 *   2  Kicker (eine Zeile) + H1 (zweifarbig: heroA <Y>heroY</Y> heroB)
 *   3  `kinder` — DAS PRODUKT: die Video-/Trichter-Karte des Themas (KissFunnel,
 *      EinladungBauen, Video-Slides …). Erst sehen, was herauskommt.
 *   4  ThemenVorspann (Anlass · Grund · drei Schritte · Privatzeile) — UNTER der Karte,
 *      nie davor (sonst schiebt Erklärtext den Kaufknopf aus dem Bild)
 *   5  Die Anlässe-Liste (❤-Zeilen + Schlusssatz)
 *   6  Info-Sektionen (SectionTitle + Lead), z. B. Privatsphäre/Rechte
 *   7  SeitenFuss
 *
 * ALLES AUSSER KOPF UND FUSS IST OPTIONAL — eine Seite, die (noch) keine Anlässe-Texte
 * hat, lässt den Slot einfach weg; die Reihenfolge der vorhandenen Teile bleibt trotzdem
 * die eine des Hauses. BESTEHENDE Seiten (Kiss, Versprechen, …) bleiben vorerst auf ihrem
 * eigenen Markup (Preserve first — sie sind live und getestet); sie ziehen rollierend um,
 * wie bei der CI-Bibliothek (Memory `ci-bibliothek`). Erster Nutzer: /themes/tryon.
 */
export default function LandingSeite({ hell = false, trackEvent, trackId = "", trackName = "", kicker, heroA, heroY, heroB = "", kinder, vorspann, anlaesse, sektionen }: {
  /** Die helle Anzeigen-Fassung (`?light=1`) — dasselbe Muster wie überall (`lb-theme lb-fb`). */
  hell?: boolean;
  /** Insights-Ereignis der Seite (TrackView) — ohne `trackEvent` wird nicht gezählt. */
  trackEvent?: string;
  trackId?: string;
  trackName?: string;
  kicker?: string;
  /** Die zweifarbige H1: heroA in Schrift, heroY im Haus-Akzent, heroB als Schluss. */
  heroA: string;
  heroY: string;
  heroB?: string;
  /** DAS PRODUKT — Video-/Trichter-Karte, Slides, Produktkasten. Der Kern der Seite. */
  kinder: ReactNode;
  /** Anlass · Grund · drei Schritte · Privatzeile — die vier Texte aus der Sprachtabelle. */
  vorspann?: { anlass: string; grund: string; wieGeht: string[]; wieGehtPrivat: string };
  /** Die ❤-Liste mit Schlusssatz („Warum sie eins schickt"). */
  anlaesse?: { titel: string; zeilen: string[]; schluss: string };
  /** Freie Info-Sektionen am Fuss (Privatsphäre, Rechte, Technik …). */
  sektionen?: { titel: string; text: ReactNode }[];
}) {
  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      {trackEvent && <TrackView event={trackEvent} lookId={trackId} lookName={trackName} />}
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        {kicker && <Kicker>{kicker}</Kicker>}
        <H1 className={kicker ? "mt-1" : ""}>{heroA}<Y>{heroY}</Y>{heroB}</H1>

        {kinder}

        {vorspann && (
          <ThemenVorspann anlass={vorspann.anlass} grund={vorspann.grund}
            wieGeht={vorspann.wieGeht} wieGehtPrivat={vorspann.wieGehtPrivat} />
        )}

        {anlaesse && (
          /* Wörtlich das Markup der Surprise-/Kiss-Seite — ❤ in Haus-Gold, Schlusssatz
             mit Gold-Kante. Steht NACH dem Produkt: erst der Beweis, dann die Predigt. */
          <div className="mt-12">
            <SectionTitle>{anlaesse.titel}</SectionTitle>
            <ul className="mt-3 space-y-2">
              {anlaesse.zeilen.map((zeile, i) => (
                <li key={i} className="flex gap-2.5 text-[14px] font-semibold leading-snug text-white/75">
                  <span className="mt-[3px] text-[13px] leading-none text-[#f6cf51]">❤</span>
                  {zeile}
                </li>
              ))}
            </ul>
            <p className="mt-4 border-l-2 border-[#f6cf51]/50 pl-3 text-[15px] font-black leading-snug text-white">
              {anlaesse.schluss}
            </p>
          </div>
        )}

        {sektionen && sektionen.length > 0 && (
          <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
            {sektionen.map((s, i) => (
              <div key={i}>
                <SectionTitle>{s.titel}</SectionTitle>
                <Lead>{s.text}</Lead>
              </div>
            ))}
          </section>
        )}
      </div>
      <SeitenFuss />
    </main>
  );
}
