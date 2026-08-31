import Link from "next/link";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y, SectionTitle, Lead, Fine } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { aboutText, MARKENSATZ_1, MARKENSATZ_2 } from "@/lib/about-i18n";

/**
 * ÜBER LUXURYBANDIT — Owner-Neufassung 11.08.2026 („update ONLY the About page copy. Do not
 * redesign the page. Do not change layout, components, navigation, footer, colors or
 * spacing. Do not change any other page."). Ersetzt die Texte vom 05.08.2026 — der Aufbau
 * (Kicker/H1, Foto-Block, Abschnitte aus SectionTitle+Lead, Versprechen-Liste, CTA-Knopf,
 * „Schreib uns"-Zeile, Fuss) bleibt exakt derselbe Satz an Bausteinen, nur mit neuem Inhalt
 * befüllt. Zwei Abschnitte sind neu dazugekommen („Warum LuxuryBandit?" und „Was LuxuryBandit
 * nicht sein will") — beide nutzen denselben Baustein wie die bestehenden Abschnitte
 * (SectionTitle + gestapelte Lead-Absätze), nichts Neues gebaut.
 *
 * ALLE TEXTE STEHEN IN `lib/about-i18n.ts` — hier steht nur noch der Aufbau (Hausregel, siehe
 * dort). Die zwei Markensätze „We don't take from people. We take life into our own hands."
 * und „BANDIT THIS LIFE." liefert der Owner ausdrücklich UNÜBERSETZT — sie stehen darum nicht
 * in der Sprachtabelle, sondern als eigene Konstanten (`MARKENSATZ_1/2`), die in jeder Sprache
 * gleich erscheinen.
 *
 * DIE FRÜHER HIER GEZEIGTE PORTALBESCHREIBUNG (T.portalLang) ist raus — die neue Owner-Copy
 * hat einen eigenen Eingangstext für die About-Seite (`intro*`-Felder). `portalKurz`/
 * `portalLang` bleiben unverändert in about-i18n.ts stehen, weil Startseite und AGB sie
 * weiterhin direkt lesen (Memory portal-beschreibung-original-in-about) — diese Seite zeigt
 * sie nur nicht mehr an.
 *
 * DAS BILD liegt weiter in `public/Ich/eu2023.jpg` — unverändert, wie im alten Aufbau.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "About LuxuryBandit — software, portals and checkout journeys",
  description:
    "We build software, portals and checkout journeys that sell — from the Meta ad to the purchase. Behind it, thirty years of design and software usability.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const L = await resolveLang();
  const T = aboutText(L);

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-10 pt-3">
        <Kicker>{T.kicker}</Kicker>
        <H1>{T.h1a}<Y>{T.h1y}</Y></H1>

        <Lead>{T.introLead}</Lead>
        {T.introListe.map((zeile) => (
          <Lead key={zeile}>{zeile}</Lead>
        ))}
        <Lead>{T.introKeineKi}</Lead>
        {T.introBringst.map((zeile) => (
          <Lead key={zeile}>{zeile}</Lead>
        ))}

        <div className="mt-10">
          <SectionTitle>{T.werTitel}</SectionTitle>
          <div className="mt-4 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Ich/eu2023.jpg" alt="Geza"
              className="h-20 w-20 shrink-0 rounded-full object-cover"
              style={{ border: "2px solid rgba(246,207,81,0.55)" }} />
            <p className="text-[14px] font-medium leading-snug text-white/80">{T.werBild}</p>
          </div>
          {T.wer.map((zeile) => (
            <Lead key={zeile}>{zeile}</Lead>
          ))}
        </div>

        {/* NEU seit 11.08.2026 — derselbe Bausteintyp (SectionTitle + Lead-Absätze) wie jeder
            andere Abschnitt hier, nur ein Abschnitt mehr als vorher. */}
        <div className="mt-10">
          <SectionTitle>{T.warumLbTitel}</SectionTitle>
          {T.warumLb.map((zeile) => (
            <Lead key={zeile}>{zeile}</Lead>
          ))}
          <Lead>{MARKENSATZ_1}</Lead>
          <Lead>{MARKENSATZ_2}</Lead>
        </div>

        <div className="mt-10">
          <SectionTitle>{T.warumTitel}</SectionTitle>
          {T.warum.map((zeile) => (
            <Lead key={zeile}>{zeile}</Lead>
          ))}
        </div>

        <div className="mt-10">
          <SectionTitle>{T.aiTitel}</SectionTitle>
          {T.ai.map((zeile) => (
            <Lead key={zeile}>{zeile}</Lead>
          ))}
        </div>

        <div className="mt-10">
          <SectionTitle>{T.verspTitel}</SectionTitle>
          <ul className="mt-3 space-y-3">
            {T.versp.map(([titel, text]) => (
              <li key={titel} className="text-[15px] font-medium leading-snug text-white/80">
                <strong className="font-black text-white">{titel}</strong> {text}
              </li>
            ))}
          </ul>
        </div>

        {/* NEU seit 11.08.2026 — wieder derselbe Bausteintyp wie oben, kein neuer Baustein. */}
        <div className="mt-10">
          <SectionTitle>{T.nichtTitel}</SectionTitle>
          {T.nicht.map((zeile) => (
            <Lead key={zeile}>{zeile}</Lead>
          ))}
        </div>

        <div className="mt-10">
          <SectionTitle>{T.startTitel}</SectionTitle>
          {T.startLead.map((zeile) => (
            <Lead key={zeile}>{zeile}</Lead>
          ))}
          <Lead>{MARKENSATZ_2}</Lead>
          <Link href="/themes"
            className="lb-gold mt-4 flex h-13 w-full items-center justify-center rounded-full py-3.5 text-[15px] font-black active:scale-95 transition">
            {T.startCta}
          </Link>
          <Fine>
            {T.fein}
            <Link href="/contact" className="font-black text-[#f6cf51] underline underline-offset-2">{T.feinLink}</Link>
          </Fine>
        </div>

        <SeitenFuss />
      </div>
    </main>
  );
}
