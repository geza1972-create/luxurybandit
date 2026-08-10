import Link from "next/link";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y, SectionTitle, Lead, Fine } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { aboutText } from "@/lib/about-i18n";

/**
 * ÜBER LUXURYBANDIT — neu geschrieben am 05.08.2026, seit demselben Tag in SIEBEN SPRACHEN
 * (Owner: „so jetzt die Seite auch übersetzen" — und, nachdem ich es vertagt hatte: „hallo,
 * es ist nicht übersetzt").
 *
 * WAS HIER VORHER STAND: „AI and real influencers · Luxury Looks", „Subscribe — unlock her
 * private world" und zweimal „Become a LuxuryBandit Model" mit Link auf die Bewerbung — der
 * alte Marktplatz, den es so nicht mehr gibt. Der Owner hat es selbst gefunden: „diese About
 * ist richtig, dass da verlinkt wird?" Nein, war sie nicht.
 *
 * WARUM ES DIESE SEITE BRAUCHT: nicht wegen Google, sondern wegen des Preises. Wer 15 € an
 * eine Adresse zahlt, die er nicht kennt, schaut nach, wer dahintersteckt. Fehlt die Antwort,
 * fehlt sie genau in dem Moment, in dem er zögert.
 *
 * ALLE TEXTE STEHEN IN `lib/about-i18n.ts` — hier steht nur noch der Aufbau. Das ist die
 * Hausregel für jede Seite, die mehr als eine Sprache spricht: Wer einen Satz ändert, ändert
 * ihn dort, und alle sieben Sprachen bleiben beieinander.
 *
 * DAS BILD liegt in `public/Ich/eu2023.jpg` — dort hat der Owner es abgelegt; der Ordnername
 * ist seiner, ich benenne nichts um. Rund, mit goldenem Ring: Bei einem Produkt, bei dem
 * Fremde ihre eigenen Gesichter hochladen, ist ein echtes Gesicht auf der Anbieterseite die
 * stärkste Zusage, die man geben kann — sie ist nicht behauptet, sondern gezeigt.
 */

/* Die Sprache steht im Cookie — die Seite muss also je Aufruf gebaut werden. Ohne das liefert
   Next eine einmal erzeugte Fassung an alle, und sieben Sprachen sehen alle Englisch. */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "About LuxuryBandit — one-of-a-kind gifts from the new AI era",
  description:
    "One-of-a-kind gifts from the new AI era: you upload one photo and a finished gift comes out. Behind it, thirty years of software usability.",
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
        {/* HIER STAND DER ABSATZ ZUM „LUXURYBANDIT SYSTEM" — raus am 10.08.2026 (Owner, mit
            Bildschirmfoto des Absatzes: „das machst du raus"). Er beschrieb die
            Geschäftsideen-Analyse als zweites Standbein, direkt unter der Beschreibung des
            Portals; wer hierher kommt, will wissen, was das hier ist und wer dahintersteckt,
            nicht ein zweites Produkt erklärt bekommen. Der Text ist auch aus allen sieben
            Sprachblöcken entfernt (`lead2` in lib/about-i18n) — ein Feld, das niemand mehr
            anzeigt, kommt beim nächsten Umbau versehentlich zurück. */}
        <Lead>{T.portalLang}</Lead>

        <div className="mt-10">
          <SectionTitle>{T.werTitel}</SectionTitle>
          <div className="mt-4 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Ich/eu2023.jpg" alt="Geza"
              className="h-20 w-20 shrink-0 rounded-full object-cover"
              style={{ border: "2px solid rgba(246,207,81,0.55)" }} />
            <p className="text-[14px] font-medium leading-snug text-white/80">{T.werBild}</p>
          </div>
          <Lead>{T.wer1}</Lead>
          <Lead>{T.wer2}</Lead>
          <Lead>{T.wer3}</Lead>
        </div>

        <div className="mt-10">
          <SectionTitle>{T.warumTitel}</SectionTitle>
          <Lead>{T.warum1}</Lead>
          <Lead>{T.warum2}</Lead>
        </div>

        <div className="mt-10">
          <SectionTitle>{T.aiTitel}</SectionTitle>
          <Lead>{T.ai1}</Lead>
          <Lead>{T.ai2}</Lead>
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

        <div className="mt-10">
          <SectionTitle>{T.startTitel}</SectionTitle>
          <Lead>{T.startLead}</Lead>
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
