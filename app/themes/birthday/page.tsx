import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { H1, Y, SectionTitle, Lead } from "@/components/Landing";
import { Lock } from "lucide-react";
import KissFunnel from "@/components/KissFunnel";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import { GEBURTSTAG_VIDEO } from "@/lib/geburtstag";

/**
 * THEMA "SHE SINGS HAPPY BIRTHDAY" (Owner 03.08.2026: "genau wie Surprise him machen. Ein
 * Bild von sich hochladen und den Namen von dem, der Geburtstag hat, eingeben - dann wird
 * eine Dame in einem Look generiert, mit der Torte in der Hand, genau wie Bella, und auch
 * die Umgebung ist gleich. Das muss direkt an Pixverse.").
 *
 * DIE SEITE IST NEU GEBAUT, NICHT ERGAENZT - genau wie "Surprise him" wenige Stunden vorher.
 * Vorher lief hier `components/BirthdayFunnel.tsx` mit einem eigenen Weg. Jetzt: derselbe
 * Trichter, dasselbe Guthaben, dieselbe Kasse, dieselbe Auslieferung, ein Pflegeort.
 *
 * DIREKT AN PIXVERSE, kein Anziehen davor: Die Vorlage geht als zweites Referenzbild mit
 * (`garmentBild` in lib/geschenke.ts). Ein Zwischenschritt ueber FASHN wuerde Torte und Raum
 * verlieren - FASHN zieht um, es baut keine Szene.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "She sings Happy Birthday — one private AI video | LuxuryBandit",
  description: "Upload one photo of yourself, type the birthday name, and she sings Happy Birthday with the cake in her hands - a private video, made in minutes.",
  keywords: ["happy birthday video", "personalised birthday video", "ai birthday greeting", "birthday video with name", "send a birthday video"],
  alternates: { canonical: "/themes/birthday" },
};

export default async function BirthdayThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();              // Sprache der Seite (Cookie)
  const T = kissText(L, "birthday");         // Ueberschrift und Zeilen in seiner Sprache
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);   // Aktionscode aus der Anzeige

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <TrackView event="birthday_view" lookId="themes-birthday" lookName="Geburtstags-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        <H1>{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>

        {/* DREI ZEILEN, BEVOR SIE SCROLLT — wie beim Kuss. Die Zeile darunter ist die
            wichtigste: Niemand laedt ein Foto von sich in Unterwaesche hoch, ohne zu wissen,
            wer es sieht. Die Antwort ist gut, also gehoert sie nach oben. */}
        <ol className="mt-3 space-y-1.5">
          {T.wieGeht.map((zeile: string, i: number) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] font-semibold leading-snug text-white/75">
              <span className="mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#f6cf51]/15 text-[11px] font-black text-[#f6cf51]">
                {i + 1}
              </span>
              {zeile}
            </li>
          ))}
        </ol>
        <p className="mt-2.5 flex items-start gap-1.5 text-[12.5px] font-bold leading-snug text-[#f6cf51]">
          <Lock className="mt-[2px] h-3.5 w-3.5 shrink-0" />
          {T.wieGehtPrivat}
        </p>

        {/* DAS ERGEBNIS ZUERST (Owner, seit dem Kuss die Hausordnung): erst sehen, was
            herauskommt, dann lesen, wie es geht. Es ist genau das Video, mit dem der Owner
            den Auftrag gegeben hat — und genau das, was die Kette hinten ausspuckt.

            IN DER KARTE, NICHT IN EINEM KASTEN (Owner 03.08.2026: „ich bitte dich, benutze
            IMMER die Cards für die Videos mit Titel oben und Made by Luxurybandit.com. Genau
            wie Kiss"). Hier stand ein nacktes gerundetes Rechteck — dieselbe Datei, aber ohne
            Rahmen, ohne Ranken, ohne Herkunft. Das ist der Unterschied zwischen einer Vorschau
            und einem Geschenk: Die Karte ist das Produkt, das Video ist nur ihr Inhalt.

            `EinladungAnsicht` bringt Ton-Knopf und die weiche Schleife mit (zwei Spieler
            blenden ineinander, kein `loop` — Hausregel: kein Schnitt alle sieben Sekunden). */}
        {/* NUR EINE KARTE, UND ES IST DIE DES TRICHTERS.
            Hier stand kurzzeitig eine zweite, eigene Karte ueber dem Trichter — und darunter
            stand die des Trichters leer da. Zweimal dasselbe Video untereinander ist kein
            „mehr zeigen", sondern ein Fehler, den jeder sieht. Der Trichter nimmt das
            Beispiel entgegen und fuellt seine eigene Karte damit; sobald ihr Video fertig
            ist, tritt es an dieselbe Stelle. Genau wie beim Kuss.

            Der Trichter — derselbe wie beim Kuss, nur mit einem Foto statt zweien. */}
        <KissFunnel variant="birthday" code={code} lang={L} beispielVideo={GEBURTSTAG_VIDEO} />

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
      </div>
    </main>
  );
}
