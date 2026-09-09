import type { Metadata } from "next";
import VersusForgeFunnel from "@/components/VersusForgeFunnel";
import { isLang, type Lang } from "@/lib/lang";
import { resolveLang } from "@/lib/lang-server";
import { versusforgeInSprache } from "@/lib/versusforge-texte";
import { Wortmarke } from "@/components/VersusForgeMarke";

/**
 * VERSUSFORGE — DER EINGANG (Owner 08.09.2026).
 *
 * Vorläufig unter luxurybandit.com, damit nur EINE Sache gleichzeitig gebaut wird. Die
 * eigene Adresse (versusforge.com, gekauft am 08.09.) wird angehängt, wenn der Berater
 * steht — nicht vorher: Sonst baut man das Produkt und den Umzug zugleich und weiss bei
 * jedem Fehler nicht, woher er kommt.
 *
 * Dasselbe Muster wie Davids Trichter: Die Seite liefert nur Texte und Sprache, der Ablauf
 * steht im Client-Baustein. Kein `TunnelSeite` — die Begründung steht dort und gilt hier
 * genauso (Schrittnummern in der Adresse gegen einen Gesprächszustand).
 *
 * NICHT INDEXIEREN: Der Trichter ist kein Ziel für Google.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VersusForge — dein eigener Kanal",
  description: "Sag in einem Satz, was du brauchst. Wir zeigen dir, was wir bauen würden.",
  robots: { index: false, follow: true },
};

export default async function VersusForgeStartSeite({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const spLang = String(sp.lang ?? "");
  const L: Lang = isLang(spLang) ? spLang : await resolveLang("de");
  /**
   * DER TRICHTER IST JETZT IMMER HELL (Owner 09.09.2026: „die Farben stimmen nicht zu der
   * ersten Seite. Es ist dark").
   *
   * Er hat recht, und es war ein Bruch mitten im Weg: Die Startseite ist seit heute hell,
   * die Mandantenseite auch, das Anzeigenbild ebenfalls — und dazwischen fiel man in eine
   * schwarze Seite. Wer das sieht, denkt, er sei woandershin geraten.
   *
   * ÜBER `lb-theme`, NICHT ÜBER 45 EINZELNE KLASSEN: Das Haus hat den Hell-Schalter längst
   * (`globals.css`, „Forced LIGHT"). Er dreht `text-white`, `bg-white/…`, `border-white/…`
   * und `bg-black` gemeinsam um. Von Hand nachzuziehen hiesse, dieselbe Regel ein zweites
   * Mal zu schreiben — und die zweite Fassung läuft irgendwann von der ersten weg.
   *
   * `?light=0` lässt die alte dunkle Fassung zum Vergleich stehen.
   */
  const hell = String(sp.light ?? "") !== "0";
  const S = await versusforgeInSprache(L);

  return (
    /**
     * DERSELBE RAHMEN WIE DIE STARTSEITE (Owner 09.09.2026: „ich bitte dich, pass es auf die
     * erste Seite an" · „Desktop responsive auch").
     *
     * `bg-white` schlägt den grauen Grund, den `lb-theme` aus `lb-bg` macht: Die Startseite
     * ist weiss, und ein Wechsel zu Grau mitten im Weg sieht aus wie eine andere Seite.
     *
     * DIESELBE BREITE: 620 px wie dort, nicht 760. Zwei Seiten, die verschieden breit sind,
     * lesen sich wie zwei Bauwerke — und genau das soll es nicht sein.
     */
    <main className={`lb-versusforge lb-bg flex min-h-screen flex-col bg-white${hell ? " lb-theme lb-fb" : ""}`}>
      {/* Der Kopf trägt NUR den Namen — wie auf der Startseite, mit derselben Linie darunter. */}
      <header className="border-b border-[#dfe4e9] px-5 py-4">
        <div className="mx-auto w-full max-w-[620px]">
          <Wortmarke className="text-[21px] font-black leading-none tracking-[-0.02em] text-[#14181c]" akzent="#1d6fd0" />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[620px] flex-1 flex-col px-5 pb-16 pt-7 md:pt-10">
        <VersusForgeFunnel S={S} lang={L} />
      </div>
      {/* DERSELBE FUSS WIE AUF DER STARTSEITE (09.09.2026). `SeitenFuss` brachte eine zweite
          Wortmarke in anderer Farbaufteilung mit — auf einer Seite zwei Marken. Kein
          LuxuryBandit hier: Die Firmenstrecke tritt unter eigenem Namen auf. */}
      <footer className="border-t border-[#dfe4e9] px-5 pb-6 pt-4">
        <div className="mx-auto flex w-full max-w-[620px] flex-wrap items-center gap-2 text-[14px] text-[#5b666f]">
          <a href="/about" className="hover:text-[#14181c]">{S.fussAbout}</a>
          <span aria-hidden="true">·</span>
          <a href="/imprint" className="hover:text-[#14181c]">{S.fussImpressum}</a>
          <span aria-hidden="true">·</span>
          <a href="/privacy" className="hover:text-[#14181c]">{S.fussDatenschutz}</a>
        </div>
      </footer>
    </main>
  );
}
