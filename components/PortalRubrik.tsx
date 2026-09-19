import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * ── DREI TÜREN GANZ OBEN (Owner 18.09.2026: „ich brauche auch so eine Rubrik" · „du musst
 * einige Artikel so bauen") ──────────────────────────────────────────────────────────────────
 *
 * ── WARUM SIE VOR DEN WISCHREIHEN STEHT ─────────────────────────────────────────────────────
 *
 * Die Startseite begann bisher mit zwanzig Blättern. Wer aus einer Anzeige kommt, sieht damit
 * Ware, bevor er weiss, was für ein Laden das ist — und wonach er überhaupt schauen soll. Diese
 * Rubrik beantwortet in drei Kacheln: was wir sind (gross), was es hier gibt (zwei kleine).
 *
 * ── DER AUFBAU IST DIE BOTSCHAFT ────────────────────────────────────────────────────────────
 *
 * Links eine grosse Fläche mit einem Bild, auf dem die Schrift liegt: Das ist die Haltung, und
 * sie bekommt den Platz. Rechts zwei nüchterne Zeilen mit Bild und Text nebeneinander: Das sind
 * Angebote, und die dürfen kleiner sein. Wären alle drei gleich gross, wäre keins wichtig.
 *
 * ── DIE SCHRIFT MUSS AUF JEDEM BILD LESBAR SEIN ─────────────────────────────────────────────
 *
 * Ein Raumfoto ist unten hell oder dunkel, je nach Bild. Deshalb liegt über der unteren Hälfte
 * ein Verlauf von Schwarz nach Durchsichtig — nicht als Deko, sondern damit Weiss dort in jedem
 * Fall steht. Ohne ihn verschwindet die Überschrift auf einem hellen Teppich.
 *
 * ── KEIN ZUSTAND, KEIN JAVASCRIPT ───────────────────────────────────────────────────────────
 *
 * Drei Links und zwei Bilder. Das ist eine Serverkomponente, und sie bleibt eine: Was sich nicht
 * bewegt, braucht keinen Browser.
 */

export type RubrikKachel = {
  kicker: string;
  titel: string;
  text: string;
  link: string;
  href: string;
  /**
   * Das Bild der Kachel — entweder eine Adresse oder ein fertiges Stück Anzeige (Owner
   * 18.09.2026: „hier muss ein Poster gezeigt werden"). Bei „Living Poster" ist das Werk allein
   * falsch: Das Produkt ist das BLATT mit Rahmen, Namen, Satz und Code. Das zeichnet die
   * `Poster`-Komponente, kein `<img>`.
   */
  bild: string | React.ReactNode;
};

export default function PortalRubrik({ gross, kacheln }: {
  gross: { kicker?: string; titel: string; text: string; link: string; href: string; bild: string };
  kacheln: RubrikKachel[];
}) {
  return (
    <section className="mt-10 grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:gap-6">
      {/* ── DIE GROSSE FLÄCHE ──────────────────────────────────────────────────────────────
          `aspect-[4/3]` am Telefon, feste Höhe am Rechner: Ein Raumfoto in voller Breite wäre
          auf dem Handy sonst einen halben Bildschirm hoch, bevor ein Wort dasteht. */}
      {/**
        * ── DIE SCHRIFT STEHT UNTER DEM WERK, NICHT DARAUF (Owner 18.09.2026: „und Schrift hier
        * drauf bringt nichts") ─────────────────────────────────────────────────────────────────
        *
        * Vorher lag die Überschrift auf dem Bild, mit einem Verlauf nach Schwarz darunter, damit
        * Weiss überall steht. Das funktioniert auf einem Raumfoto — auf einem GEMÄLDE nicht: Die
        * Schrift liegt in den Farben und ist trotzdem schwer zu lesen, und der Verlauf legt sich
        * über genau das, was wir zeigen wollen. Beides verliert.
        *
        * Jetzt derselbe Aufbau wie bei den zwei kleinen Kacheln — Bild, darunter Text. Das Werk
        * bleibt unberührt, die Schrift steht auf Weiss.
        */}
      {/**
        * ── DER TEXT STEHT NEBEN DEM BILD, UND DAS BILD WIRD NICHT BESCHNITTEN (Owner 19.09.2026:
        * „Bilder oben nicht abschneiden, und am besten den Text daneben stellen und das Bild
        * Hochformat lassen") ──────────────────────────────────────────────────────────────────
        *
        * ZWEI FEHLER IN EINEM AUFBAU. Erstens `object-cover` in einer 4:3-Fläche: Ein Hochformat
        * wird dafür oben und unten abgeschnitten — bei der Karikatur fehlte der Kopf, also genau
        * das, wofür geworben wird. Zweitens die weisse Platte auf dem Bild: Am Telefon deckte sie
        * fast alles zu, am Rechner lag sie über der unteren Ecke.
        *
        * JETZT NEBENEINANDER, wie bei den zwei kleinen Kacheln daneben — nur grösser. Das Bild
        * behält sein eigenes Verhältnis (`h-auto`, gedeckelt auf 520 px Höhe), nichts wird
        * zugeschnitten, und der Text steht auf Weiss statt auf dem Motiv.
        *
        * AM TELEFON GESTAPELT: Zwei Spalten auf 375 px lassen der Überschrift 170 px — das sind
        * zwei Wörter je Zeile. Bild oben, Text darunter.
        */}
      {/**
        * ── DIE TEXTSPALTE AUF CREME (Owner 19.09.2026: „für den Text creme BG") ────────────────
        *
        * Weiss neben einem Gemälde ist keine Farbe, sondern eine Lücke: Die Textspalte sah aus,
        * als sei das Bild zu schmal geraten. Creme macht daraus eine zweite Fläche — die Kachel
        * liest sich als EIN Stück statt als Bild mit Rest.
        *
        * `#f4efe2` ist der Papierton der Poster (`POSTER.farben.papier`, Owner: „nicht weiss,
        * sondern creme"). Derselbe Ton, der auf dieser Seite schon in jedem Blatt steht — keine
        * zweite Hausfarbe, die irgendwann auseinanderläuft.
        */}
      <Link href={gross.href}
        className="group grid gap-0 bg-[#f4efe2] text-inherit no-underline sm:grid-cols-[1.15fr_1fr] sm:items-center">
        <span className="block overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gross.bild} alt=""
            className="mx-auto block h-auto w-auto max-h-[380px] max-w-full transition duration-500 group-hover:scale-[1.02] sm:max-h-[520px]" />
        </span>
        {/* Die Polsterung sitzt HIER, nicht an der Kachel: Das Bild soll die Creme-Fläche bis an
            den Rand füllen, der Text darf es nicht. */}
        <span className="block px-5 pb-6 pt-5 sm:px-8 sm:py-8">
          {gross.kicker ? (
            <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#666]">{gross.kicker}</span>
          ) : null}
          <h2 className="m-0 max-w-[18ch] font-serif text-[26px] font-normal leading-[1.12] text-[#111] sm:text-[34px]">
            {gross.titel}
          </h2>
          <p className="mt-3 max-w-[42ch] text-[15px] leading-[1.55] text-[#555] sm:text-[17px]">{gross.text}</p>
          <span className="mt-4 inline-flex items-center gap-2 border-b border-[#111] pb-[2px] text-[15px] font-semibold text-[#111]">
            {gross.link}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </span>
      </Link>

      {/* ── DIE ZWEI KLEINEN ───────────────────────────────────────────────────────────────
          Bild links, Text rechts — dieselbe Zeile zweimal, damit die Augen beim zweiten nicht
          wieder suchen müssen. */}
      <div className="grid gap-5 lg:gap-6">
        {kacheln.map(k => (
          <Link key={k.titel} href={k.href}
            className="group grid grid-cols-[1fr_1.15fr] items-start gap-4 text-inherit no-underline sm:gap-5">
            <span className="block overflow-hidden">
              {typeof k.bild === "string" ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={k.bild} alt="" loading="lazy"
                  className="block aspect-[4/3] w-full bg-[#f5f5f5] object-cover transition duration-500 group-hover:scale-[1.03]" />
              ) : (
                /* Ein fertiges Blatt: kein Zuschnitt auf 4:3, sonst schnitte der Rahmen ab. */
                <span className="block transition duration-500 group-hover:scale-[1.02]">{k.bild}</span>
              )}
            </span>
            <span className="block">
              <span className="block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#666]">{k.kicker}</span>
              <span className="mt-1 block font-serif text-[22px] leading-[1.15] text-[#111] sm:text-[26px]">{k.titel}</span>
              <span className="mt-2 block text-[15px] leading-[1.5] text-[#555]">{k.text}</span>
              <span className="mt-3 inline-flex items-center gap-2 border-b border-[#111] pb-[2px] text-[15px] font-semibold text-[#111]">
                {k.link}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
