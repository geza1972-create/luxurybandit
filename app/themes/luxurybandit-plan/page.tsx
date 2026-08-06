import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import ThemeMediaAdmin from "@/components/ThemeMediaAdmin";
import PlanSlide from "@/components/PlanSlide";
import PlanFunnel from "@/components/PlanFunnel";
import { H1, Y, SectionTitle, Lead, Fine, Kicker } from "@/components/Landing";
import SeitenFuss from "@/components/SeitenFuss";
import { Upload, Lock, Check } from "lucide-react";
import { resolveLang } from "@/lib/lang-server";
import { planText } from "@/lib/plan-i18n";
import { PLAN_CENTS, eur, fillPrices } from "@/lib/pricing";

/**
 * THEMA „DAS LUXURYBANDIT SYSTEM" (Owner 04.08.2026).
 *
 * DER NAME IN DREI SCHRITTEN: erst „Die Wahrheit über LuxuryBandits" (verworfen: „das stimmt
 * gar nicht"), dann „Der LuxuryBandit Plan", dann „Plan klingt aber nicht so gut wie System"
 * — und auf die Rückfrage „einen Plan für ein System?" die Entscheidung: **EIN Wort, überall.
 * Es heisst System.** Zwei Wörter für dieselbe Sache sind eines zu viel.
 *
 * DAS WORT IST NICHT DAS RISIKO, DAS VERSPRECHEN IST ES. „Das System, mit dem du reich wirst"
 * ist eine Geschäftsmöglichkeit und kostet das Stripe-Konto; „das System, das deine Idee
 * prüft" ist Software mit vorzeigbarem Ergebnis. Deshalb steht der Block „Was das hier nicht
 * ist" (u. a. kein Versprechen auf Geld) auf der Seite und darf nicht wegoptimiert werden —
 * er ist das, was den Namen trägt. Der Ordner heisst weiter `luxurybandit-plan`: Eine
 * bereits geteilte Adresse ändert man nicht wegen eines Wortes.
 *
 * DER AUFBAU IST VORGEGEBEN (Owner: „oben steht slide und drüber, willst du das erreichen …
 * lade … drunter steht der rest", danach „gut, die Liste unter dem Slide"):
 *
 *   1. „Want that life? Then you need a system."
 *   2. Das Slide: du heute / in 2 / in 5   ← er sieht sich, bevor er liest
 *   3. „Das bekommst du:" als Punkte       ← was wir liefern, nicht als Fliesstext
 *   4. „Lade dein Bild hoch"               ← der Einstieg
 *   5. der Rest                            ← Clou, Ablauf, Genauigkeit, Grenzen
 *
 * DIE TEXTE STEHEN IN `lib/plan-i18n` (Owner: „du machst es gleich auf englisch auch, damit
 * schon was drin steht"). ENGLISCH IST DIE VORGABE: Der Sprachschalter steht bei den meisten
 * Besuchern auf „English", und die Zielmärkte sind Rumänien und die Latino-Länder.
 *
 * WAS NOCH FEHLT: der Trichter. Foto hochladen, Idee abfragen, die drei Jurys erzeugen, den
 * Lauf im Chat zeigen, die Mappe bauen — das ist der eigentliche Bau und existiert noch
 * nicht. Solange schickt der Knopf zum Anker unten, statt in eine Sackgasse zu führen; ein
 * Knopf, der nichts tut, ist schlimmer als keiner.
 *
 * Alle Regeln zu diesem Thema stehen im Skill `business-analyse`.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "The LuxuryBandit System — 20 people argue about your idea | LuxuryBandit",
  description:
    "Upload one photo and tell us your idea: twenty generated customers, professionals and neighbours argue about it — at the end your system stands, to share and to take away.",
  keywords: ["check my business idea", "validate business idea ai", "business plan ai", "simulate target audience"],
  alternates: { canonical: "/themes/luxurybandit-plan" },
};

export default async function PlanThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const T = planText(L);
  const adminAnsicht = sp.admin === "1";
  /**
   * HELL IST DIE VORGABE (Owner 04.08.2026: „Topic führt zu dunkler Seite bei Plan").
   *
   * Hier stand die Kiss-Schaltung: dunkel, und `?light=1` machte hell. Der Katalog und jede
   * andere Landing (Hochzeit, Urlaub) kommen aber HELL — wer aus dem hellen Katalog auf diese
   * Kachel tippt, fiel damit in eine schwarze Seite. Der Sprung liest sich wie ein Fehler und
   * kostet genau an der Stelle Klicks, an der der Besucher gerade erst neugierig geworden ist.
   *
   * Jetzt wie bei Hochzeit und Urlaub: hell als Vorgabe, `?light=0` schaltet dunkel, der
   * Schalter oben rechts überstimmt beides und merkt sich die Wahl.
   */
  const hell = String(sp.light ?? "") !== "0";

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      <TrackView event="plan_view" lookId="themes-plan" lookName="LuxuryBandit Plan" />

      {!adminAnsicht ? (
        <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">

          {/* Hell/Dunkel steht seit 06.08.2026 in `TopNav` selbst (Owner: „der light und
              dark shalter muss immer da sein im header") — hier ist nichts mehr nötig. */}

          {/* 1 · DIE FRAGE — und was er dafür bekommt, steht in der Überschrift
              (Owner: „hier steht nicht was wir liefern … einen Plan"). */}
          <Kicker>{T.kicker}</Kicker>
          <H1>{T.h1a}<Y>{T.h1y1}</Y>{T.h1b}<Y>{T.h1y2}</Y>{T.h1c}</H1>
          <Lead>{T.lead}</Lead>

          {/* 2 · DAS SLIDE — er sieht sich, bevor er liest */}
          <PlanSlide lang={L} />

          {/* 3 · DIE LISTE UNTER DEM SLIDE (Owner: „gut, die Liste unter dem Slide" ·
              „oder noch besser als Bulletpoints was wir liefern"). Erst das Bild, das ihn
              packt — dann die Punkte. Fliesstext wird überflogen, Zeilen mit Haken liest man
              zu Ende. */}
          <p className="mt-9 text-[16px] font-black text-white">{T.liefernTitel}</p>
          <ul className="mt-3.5 space-y-2">
            {T.liefern.map(([was, dazu]) => (
              <li key={was} className="flex gap-2.5 text-[13.5px] leading-snug text-white/80">
                <span className="mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#f6cf51]/15">
                  <Check className="h-3 w-3 text-[#f6cf51]" strokeWidth={3.5} />
                </span>
                <span>
                  <b className="font-black text-white">{was}</b>
                  <span className="font-semibold text-white/70"> — {dazu}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* 4 · DER EINSTIEG — jetzt der echte Trichter, kein Anker mehr.
              Adresse → Foto (mit Zuschnitt und Speichern) → Idee ja/nein → GRATIS ein Bild →
              das System für {plan}. Alles in `components/PlanFunnel`. */}
          <div id="so-laeuft-es" className="scroll-mt-20">
            <PlanFunnel lang={L} />
          </div>

          {/* 5 · DER REST — der Clou zuerst */}
          <section className="mt-14">
            <SectionTitle>{T.clouTitel}</SectionTitle>
            <Lead>{T.clouLead}</Lead>

            <div className="mt-5 overflow-hidden rounded-[18px] border border-white/10">
              {T.jurys.map((j, i) => (
                <div key={j.wer} className={`bg-white/[0.04] px-4 py-3.5 ${i > 0 ? "border-t border-white/10" : ""}`}>
                  <div className="flex items-baseline gap-2.5">
                    <b className="text-[14px] font-black text-[#f6cf51]">{j.wer}</b>
                    <span className="text-[12.5px] font-black uppercase tracking-wide text-white/60">{j.frage}</span>
                  </div>
                  <p className="mt-1.5 text-[13.5px] font-semibold leading-snug text-white/80">{j.was}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Der Ablauf */}
          <section className="mt-14">
            <SectionTitle>{T.schritteTitel}</SectionTitle>
            <div className="mt-4 grid gap-3">
              {T.schritte.map((s, i) => (
                <div key={s.titel} className="flex items-start gap-3.5 rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
                  <span className="lb-gold grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-black">{i + 1}</span>
                  <div>
                    <h3 className="text-[15px] font-black leading-tight text-white">{s.titel}</h3>
                    <p className="mt-1.5 text-[13.5px] font-semibold leading-snug text-white/80">{s.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <Fine className="mt-4">{T.schritteFein}</Fine>
          </section>

          {/* Je mehr du sagst */}
          <section className="mt-14">
            <SectionTitle>{T.genauTitel}</SectionTitle>
            <Lead>{T.genauLead}</Lead>
            <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-baseline justify-between">
                <b className="text-[13px] font-black text-white/85">{T.genauLabel}</b>
                <i className="not-italic text-[15px] font-black tabular-nums text-[#f6cf51]">78 %</i>
              </div>
              <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
                <span className="block h-full w-[78%] rounded-full bg-gradient-to-r from-[#c9861a] to-[#f6cf51]" />
              </div>
              <ul className="mt-4 grid gap-2.5">
                {T.genau.map(([plus, was]) => (
                  <li key={was} className="flex items-baseline gap-2.5 text-[13.5px] font-bold text-white/85">
                    <em className="w-11 shrink-0 not-italic text-[11.5px] font-black tabular-nums text-[#f6cf51]">{plus}</em>
                    {was}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* WAS ES KOSTET (Owner 04.08.2026: „Den Plan verkaufen wir für 9,99 €" ·
              „alles drum und dran. Bilder generieren und system.").
              Die Zahl steht NIE im Text — `{plan}` kommt aus `lib/pricing.ts` (PLAN_CENTS),
              `fillPrices` setzt sie in der Sprache des Besuchers ein. Hausregel seit
              29.07.2026, nachdem eine handgetippte Zahl in acht Sprachtabellen auseinanderlief. */}
          <section className="mt-14">
            <SectionTitle>{T.preisTitel}</SectionTitle>
            <div className="mt-4 rounded-[22px] border border-[#f6cf51]/40 bg-gradient-to-b from-[#f6cf51]/10 to-[#f6cf51]/[0.03] p-5 text-center">
              <div className="text-[40px] font-black leading-none tracking-tight text-[#f6cf51]">
                {eur(PLAN_CENTS, L)}
              </div>
              <p className="mt-2.5 text-[14px] font-black text-white/85">{T.preisWofuer}</p>
              <ul className="mt-4 grid gap-2 text-left">
                {T.preisDrin.map(z => (
                  <li key={z} className="flex gap-2.5 text-[13.5px] font-semibold leading-snug text-white/80">
                    <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[#f6cf51]" strokeWidth={3.5} />
                    {z}
                  </li>
                ))}
              </ul>
            </div>
            <Fine className="mt-3">{fillPrices(T.preisZeile, L)}</Fine>
          </section>

          {/* Was es nicht ist */}
          <section className="mt-14">
            <SectionTitle>{T.nichtTitel}</SectionTitle>
            <div className="mt-4 grid gap-2.5">
              {T.nicht.map(n => (
                <div key={n.titel} className="rounded-[16px] border border-dashed border-white/20 bg-white/[0.02] px-4 py-3.5">
                  <b className="text-[14px] font-black text-white">{n.titel}</b>
                  <p className="mt-1 text-[13px] font-semibold leading-snug text-white/70">{n.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Für wen */}
          <section className="mt-14">
            <div className="lb-gold rounded-[20px] p-5">
              <p className="text-[18px] font-black leading-snug text-[#1a1204]">{T.fuerWen}</p>
            </div>
            <Lead>
              {T.fuerWenLead1}<span className="font-black text-[#f6cf51]">{T.fuerWenBevor}</span>{T.fuerWenLead2}
            </Lead>
            <Fine className="mt-6">{T.fuss}</Fine>
          </section>

        </div>
      ) : (
        /* ADMIN-WERKZEUGE (nur mit ?admin=1) — dieselbe Aufteilung wie bei Kiss und Bella,
           damit nichts neu gelernt werden muss. `theme="plan"` zeigt auf plan-config.json. */
        <div className="lb-theme mt-4 space-y-4">
          <ThemeMediaAdmin
            theme="plan"
            title="Plan-Medien"
            teaserHint="Bild oder Video hochladen — wird das Cover der Plan-Karte im Themes-Katalog."
          />
        </div>
      )}
        {/* DER FUSS — auf jeder Themenseite (Owner 05.08.2026). Impressum, AGB und
            Datenschutz standen nur im Menue; wer aus einer Anzeige kommt, hat sie nie
            gesehen. Siehe components/SeitenFuss. */}
        <SeitenFuss />
    </main>
  );
}
