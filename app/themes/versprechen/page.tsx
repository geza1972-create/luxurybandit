import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { H1, Y, SectionTitle, Lead } from "@/components/Landing";
import KissFunnel from "@/components/KissFunnel";
import ThemenVorspann from "@/components/ThemenVorspann";
import SeitenFuss from "@/components/SeitenFuss";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import { trObject } from "@/lib/tr-object";
import { VERSPRECHEN_VIDEO } from "@/lib/versprechen";

/**
 * THEMA „DAS VERSPRECHEN" (Owner 10.08.2026).
 *
 * > „Das Luxury system machen wir anders. Da ändern wir das konzept brutal. Wir verkaufen
 * > keine Systeme. Wir generieren genauso wie die anderen. Sende ein Verprechen an dich und
 * > an deine Freunde. Du lädst ein Video von dir hoch und sagst ich werde es in den nächsten
 * > Jaren schaffen. Wir löschen das jetzoge jetzt und wir duplizieren die Vorlage Geburstag
 * > und passen das an. Es hat den sleben Tunel und aufbau."
 *
 * WAS HIER VORHER STAND: `/themes/luxurybandit-plan` — zwanzig erzeugte Kunden streiten über
 * eine Geschäftsidee, heraus kommt ein Bericht. Ein anderes Produkt, ein anderer Trichter,
 * ein anderer Kaufweg: das Einzige im Haus, das kein Video war. Es ist gelöscht.
 *
 * DIESE SEITE IST DIE GEBURTSTAGSSEITE, Zeile für Zeile — derselbe Trichter
 * (`KissFunnel`, Aufnahme statt Foto-Upload), dasselbe Guthaben, dieselbe Kasse, dieselbe
 * Auslieferung, derselbe Seitenaufbau (Landingpage.md §9). Anders sind nur der LOOK
 * (`lib/versprechen-looks`: Villa und Wagen statt Torte und Kerzen) und die Texte
 * (`VERSPRECHEN` in lib/kiss-i18n, das sich auf den Geburtstag legt).
 *
 * NOCH KEIN BEISPIELVIDEO: `VERSPRECHEN_VIDEO` ist leer, bis der erste Lauf abgenommen ist.
 * Kein geliehenes Video aus einem anderen Thema — ein Beispiel, das etwas anderes zeigt als
 * das, was man kauft, ist eine falsche Zusage.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Promise yourself you will make it — one private AI video | LuxuryBandit",
  description: "Say it out loud: I am going to make it. You record yourself, and the video shows you in front of the villa with the car — ready to send to the people who should hold you to it.",
  keywords: ["promise video", "new year resolution video", "motivation video with your face", "ai video of yourself", "send a promise"],
  alternates: { canonical: "/themes/versprechen" },
};

export default async function VersprechenThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const T = kissText(L, "versprechen");
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);

  /* Die drei Erklärabschnitte am Fuss: englische Quelle im Code, Übersetzung zur Laufzeit mit
     Dauer-Cache — dieselbe Lösung wie auf allen anderen Themenseiten. */
  const s = await trObject({
    privatH: "How it stays private",
    privatP: "We do not send it for you and we do not publish it: the video lands in your gallery and as a download on your phone, and you decide who ever sees it. It appears in no feed and on no profile. Want the file gone from our side too? Write to us and it is deleted.",
    gesichtH: "Only your own face",
    gesichtP: "You record yourself, so the face and the voice in the video are yours. If you use a photo of someone else, you need their permission — and everyone shown must be 18 or older. Putting a person into a video without their consent is a criminal offence in most countries.",
    echtH: "Your face, your voice — nothing invented",
    echtP: "We keep your face exactly as it is and use the sound of your own recording, so the person on screen is you and the words are yours. Only the clothes, the house and the car around you are created. That is what the price pays for: not a card that talks about you, but a few seconds of you, saying it.",
  }, L);

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <TrackView event="versprechen_view" lookId="themes-versprechen" lookName="Versprechen-Thema" />
      {/* Seitenkopf-Template: pt-3, H1 aus der Bibliothek, direkt die Karte (Landingpage.md §9). */}
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <H1>{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>

        <KissFunnel variant="versprechen" code={code} lang={L}
          beispielVideos={VERSPRECHEN_VIDEO ? [VERSPRECHEN_VIDEO] : []} />

        {T.unterVideo && (
          <p className="mt-5 border-l-2 border-[#f6cf51]/50 pl-3 text-[15px] font-semibold leading-snug text-white/85">
            {T.unterVideo}
          </p>
        )}

        <ThemenVorspann anlass={T.anlass} grund={T.grund}
          wieGeht={T.wieGeht} wieGehtPrivat={T.wieGehtPrivat} />

        {T.filmTitel && (
          <div className="mt-12">
            <SectionTitle>{T.filmTitel}</SectionTitle>
            <Lead>{T.filmText}</Lead>
          </div>
        )}

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
            <SectionTitle>{s.privatH}</SectionTitle>
            <Lead>{s.privatP}</Lead>
          </div>
          <div>
            <SectionTitle>{s.gesichtH}</SectionTitle>
            <Lead>{s.gesichtP}</Lead>
          </div>
          <div>
            <SectionTitle>{s.echtH}</SectionTitle>
            <Lead>{s.echtP}</Lead>
          </div>
        </section>
      </div>
      <SeitenFuss />
    </main>
  );
}
