import { SectionTitle, Lead } from "@/components/Landing";
import ThemenVorspann from "@/components/ThemenVorspann";
import type { kissText } from "@/lib/kiss-i18n";

/**
 * DER INHALT DER BIRTHDAY-LANDINGPAGE — EINMAL GESCHRIEBEN, ZWEIMAL GEZEIGT
 * (Owner 14.08.2026, Dauerregel: „alles was wir auf der Landingpage haben auch im Tunel
 * zeigen aber unter dem Anmeldeformular" — „das gilt generell für den Tunel").
 *
 * Wer aus einer Anzeige kommt, landet direkt auf `/themes/birthday/start` und sieht die
 * Landingpage nie. Diese Datei rendern deshalb BEIDE Seiten: die Landingpage unter ihrem
 * Trichter, die Tunnel-Seite unter dem Anmeldeformular. Nie zwei Fassungen desselben
 * Textes — die laufen garantiert auseinander.
 *
 * Reine Anzeige, kein Zustand: bleibt Server-Komponente, kostet den Tunnel kein JavaScript.
 */
export default function BirthdayInhalt({ T }: { T: ReturnType<typeof kissText> }) {
  return (
    <>

        {/**
          * DIE ZEILE UNTER DEM BEISPIEL (Owner 09.08.2026: „direkt unter dem Beispielvideo
          * würde ich nur schreiben: Stell dir vor, diese Person wärst du … Das ist
          * wesentlich verkäuferischer, weil es den Kunden sofort in das Ergebnis hineinzieht").
          *
          * Sie steht bewusst NICHT im Trichter, sondern direkt darunter: Der Trichter gehört
          * allen Themen, dieser Satz nur dem Geburtstag.
          */}
        {T.unterVideo && (
          <p className="mt-5 border-l-2 border-[#f6cf51]/50 pl-3 text-[15px] font-semibold leading-snug text-white/85">
            {T.unterVideo}
          </p>
        )}

        {/* ANLASS · GRUND · DREI SCHRITTE · PRIVATZEILE — das Kuss-Muster (Owner 05.08.2026:
            „alle Topic-Seiten sollen so aufgebaut werden, ist die Kiss-Seite" · „was ich
            vermisse jetzt bei topics … die Schritte, die Begründung, der Anlass").
            Steht seit 09.08. UNTER der Karte: erst der Beweis, dann die Erklärung. */}
        <ThemenVorspann anlass={T.anlass} grund={T.grund}
          wieGeht={T.wieGeht} wieGehtPrivat={T.wieGehtPrivat} />

        {/**
          * WAS ER BEKOMMT (Owner 09.08.2026, mit einem fertigen Verkaufstext: „Aus ein paar
          * gesprochenen Worten wird ein Moment").
          *
          * Der Absatz steht zwischen den drei Schritten und dem Beispiel, weil er genau die
          * Lücke füllt, die vorher offen war: Er hat gelesen, WIE es geht, und sieht gleich,
          * WAS herauskommt — dazwischen fehlte der Satz, der beides verbindet. Er verspricht
          * nichts Technisches, sondern beschreibt das Ergebnis.
          */}
        {T.filmTitel && (
          <div className="mt-12">
            <SectionTitle>{T.filmTitel}</SectionTitle>
            <Lead>{T.filmText}</Lead>
          </div>
        )}


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
            <SectionTitle>Only your own face</SectionTitle>
            <Lead>
              You record yourself, so the face and the voice in the video are yours. If you use a
              photo of someone else, you need their permission — and everyone shown must be 18 or
              older. Putting a person into a video without their consent is a criminal offence in
              most countries, birthday or not.
            </Lead>
          </div>
          <div>
            <SectionTitle>Your face, your voice — nothing invented</SectionTitle>
            <Lead>
              We keep your face exactly as it is and use the sound of your own recording, so the
              person on screen is you and the words are yours. Only the outfit, the cake and the
              room around you are created. That is what the price pays for: not a card that talks
              about you, but a few seconds of you, saying it.
            </Lead>
          </div>
        </section>
    </>
  );
}
