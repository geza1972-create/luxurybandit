import { SectionTitle, Lead } from "@/components/Landing";
import ThemenVorspann from "@/components/ThemenVorspann";
import type { kissText } from "@/lib/kiss-i18n";

/**
 * DER INHALT DER TANZ-LANDINGPAGE — EINMAL GESCHRIEBEN, ZWEIMAL GEZEIGT
 * (Owner 14.08.2026, Dauerregel: alles von der Landingpage auch im Tunnel, unter dem
 * Anmeldeformular).
 *
 * EINE VERSCHIEBUNG WAR NOETIG: Der Vorspann stand INNERHALB der Trichter-Huelle
 * (`<div data-trichter>`) und liess sich so nicht mit herausloesen. Die Huelle umschliesst
 * jetzt nur noch den Trichter selbst; der Vorspann ist das erste Stueck dieses Inhalts.
 * Sichtbar aendert das nichts — beide sassen ohnehin untereinander.
 */
export default function SurpriseInhalt({ T }: { T: ReturnType<typeof kissText> }) {
  return (
    <>
            {/* DER VORSPANN STEHT UNTER DER KARTE (Owner 10.08.2026: „ich will den CTA im
                Viewport shen" · „dieser Aufbau der Landing pge gilt für alle seiten").
                Anlass, Grund und die drei Schritte standen ZWISCHEN Titel und Karte und
                schoben den Kaufknopf um eine halbe Handyhöhe nach unten — erklärt wurde,
                bevor irgendetwas zu sehen war. Die Hausordnung seit dem Kuss lautet
                andersherum: erst sehen, was herauskommt, dann lesen, wie es geht. */}
        <ThemenVorspann anlass={T.anlass} grund={T.grund}
          wieGeht={T.wieGeht} wieGehtPrivat={T.wieGehtPrivat} />

        {/* WARUM SIE EINS SCHICKT — die Anlaesse stehen NACH dem Beispiel und nach dem
            Trichter: Erst sieht sie, was herauskommt, dann liest sie, warum es sie angeht.
            Umgekehrt waere es eine Predigt vor dem Beweis. */}
        <div className="mt-12">
          <SectionTitle>{T.anlaesseTitel}</SectionTitle>
          <ul className="mt-3 space-y-2">
            {T.anlaesse.map((zeile: string, i: number) => (
              <li key={i} className="flex gap-2.5 text-[14px] font-semibold leading-snug text-white/75">
                <span className="mt-[3px] text-[13px] leading-none text-[#f6cf51]">❤</span>
                {zeile}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-l-2 border-[#f6cf51]/50 pl-3 text-[15px] font-black leading-snug text-white">
            {T.anlaesseSchluss}
          </p>
        </div>

        <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
          <div>
            <SectionTitle>How it stays private</SectionTitle>
            <Lead>
              We do not send it for you and we do not publish it: the video lands in your gallery
              and as a download on your phone, and you decide who ever sees it. It appears in no
              feed and on no profile. Want the file gone from our side too? Write to us and it is
              deleted.
            </Lead>
          </div>
          <div>
            {/* Diese Ueberschrift bleibt aus der alten Seite — sie ist der Satz, der hier am
                meisten zaehlt, und er stand schon vor diesem Umbau richtig da. */}
            <SectionTitle>Only for photos of yourself</SectionTitle>
            <Lead>
              Before anything renders you confirm that the photo shows you — or someone who has
              allowed you to use it — and that everyone shown is 18 or older. Please keep it that
              way: making an intimate video of someone else, or passing one on without their
              consent, is a criminal offence in most countries.
            </Lead>
          </div>
          <div>
            <SectionTitle>Why your face still looks like your face</SectionTitle>
            <Lead>
              Your photo and the outfit go to the video model together, in one pass — so what
              moves on screen is built from your own picture rather than from a copy of it. That is
              the whole point of putting yourself in the video, and it is what the price pays for.
              AI-generated, private, yours.
            </Lead>
          </div>
        </section>
    </>
  );
}
