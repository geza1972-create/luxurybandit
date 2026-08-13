import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { H1, Y, SectionTitle, Lead } from "@/components/Landing";
import { Kasten } from "@/components/CI";
import { ShieldCheck } from "lucide-react";
import { CornerOrnaments } from "@/components/BoxOrnaments";
import KissFunnel from "@/components/KissFunnel";
import UploadsAdmin from "@/components/UploadsAdmin";
import ManageViewToggle from "@/components/ManageViewToggle";
import SeitenFuss from "@/components/SeitenFuss";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import { trObject } from "@/lib/tr-object";
import { versprechenVideos } from "@/lib/versprechen-videos";

/**
 * THEMA „DAS VERSPRECHEN" — SEIT 11.08.2026 DAS FUTURE SELF PROGRAM (Owner, wörtlich: „Das
 * ist nicht mehr nur ein Video. Future Self Program. Er bekommt seinen Future Film,
 * sein Versprechen, eine private persönliche Seite, ein 30-Tage-Programm mit Checkliste,
 * Fortschritt und einen 90-Tage-Anschluss.").
 *
 * NUR DIE LANDINGPAGE ÄNDERT SICH HIER — Positionierung, Text, sichtbarer Preis. Der Trichter
 * (`KissFunnel`), die Kasse, die Auslieferung und das Future-Program selbst bleiben unberührt:
 * Es ist derselbe Look (Villa/Wagen, `lib/versprechen-looks`), dieselbe Aufnahme statt
 * Foto-Upload, derselbe Seitenaufbau (Landingpage.md §9). `filmTitel`/`filmText` bleiben in
 * `lib/kiss-i18n.ts` unverändert stehen — sie sind der Kartentitel des ausgelieferten Videos,
 * nicht nur Landingpage-Text; diese Seite zeigt sie seit dem Umbau nicht mehr an.
 *
 * DER PREIS KOMMT AUS DER TABELLE (`VERSPRECHEN_CENTS` in lib/pricing.ts), nie aus
 * einer getippten Zahl — Memory `prices-only-from-pricing-table`. Seit der Preissenkung vom
 * 11.08.2026 rechnet diese Seite ihn nicht mehr selbst aus: Der finale Kaufblock zeigt den Satz
 * `finalPreisZeile` aus kiss-i18n, dessen {programm} `fillPrices` füllt.
 *
 * DIE HIERARCHIE — UMGEBAUT 11.08.2026 (Owner, wörtlich: „The PROGRAM is the product. The
 * Future Film is only the emotional entry point. … It must feel like: buy a serious Future
 * Self Program that begins with a powerful Future Film").
 *
 * Vorher stand nach der Video-Karte nur eine schmale Zeile mit Preis, und der grosse
 * Programm-Abschnitt kam erst weit unten, hinter „Mehr als ein Video" — die Seite wirkte wie
 * „kauf ein Video, bekomm ein paar Extras". Jetzt zieht der Verkauf nach oben, direkt unter die
 * Hero-Karte:
 *   1. Hero (H1 + heroSub) + KissFunnel-Karte — unverändert, das ist der emotionale Einstieg.
 *   2. NEU: ein grosser goldener Produktkasten — „FUTURE SELF PROGRAM", der Preis riesig,
 *      darunter die drei Zeilen aus `unterVideoZeilen`. Der alte schmale border-left-Block
 *      entfällt zugunsten dieses Kastens.
 *   3. NEU: die 6 Benefits als 2-Spalten-Kachelraster statt der schmalen nummerierten Liste —
 *      derselbe Abschnitt „Dein Future Self Program", nur als Kacheln und weiter oben.
 *   4. Erst DANACH „Mehr als ein Video" — es erklärt/vertieft, verkauft aber nicht mehr an.
 *   5. Rest unverändert: Emotional, „So funktioniert es", finaler Preis/CTA (Wiederholung am
 *      Seitenende bleibt gewollt), Datenschutz.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Future Self Program — a video message to your future self | LuxuryBandit",
  description: "Record yourself saying where you will be in five years. Get your Future Film, your promise, and a 30-day program with a daily checklist to keep it.",
  keywords: ["future self program", "video message to yourself", "promise video", "new year resolution video", "30 day program"],
  alternates: { canonical: "/themes/versprechen" },
};

export default async function VersprechenThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const T = kissText(L, "versprechen");
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  /* ADMIN-WERKZEUGE NUR MIT ?admin=1 (Owner 12.08.2026: „Versprechen keine eigene Liste
     hat. Es läuft alles über Kiss" — jetzt hat es seinen eigenen manage-Punkt, dieselbe
     Mechanik wie /themes/kiss). */
  const showAdmin = String(sp.admin ?? "") === "1";
  const view = sp.view === "kunde" ? "kunde" : "admin";
  const showCustomer = !showAdmin || view === "kunde";

  /* Die Datenschutz-Zeile am Fuss: englische Quelle im Code, Übersetzung zur Laufzeit mit
     Dauer-Cache — dieselbe Lösung wie auf allen anderen Themenseiten. Kürzer als vorher und
     weiter unten auf der Seite (Owner: „keep privacy information, but shorten it"). */
  const s = await trObject({
    privatH: "Private and yours alone",
    privatP: "Your video and your program page are never published — they land in your gallery, and only you decide who ever sees them. Everyone shown must be 18 or older; using someone else's face needs their consent.",
    /* Der Link unter der 30-Day Promise Guarantee — englische Quelle, Übersetzung zur
       Laufzeit wie der Rest dieser kleinen Tabelle. */
    terms: "Terms",
  }, L);

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <TrackView event="versprechen_view" lookId="themes-versprechen" lookName="Versprechen-Thema" />
      {/* Seitenkopf-Template: pt-3, H1 aus der Bibliothek, direkt die Karte (Landingpage.md §9). */}
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <H1>{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>

        {T.heroSub && (
          <p className="mt-2 text-[14px] font-semibold leading-snug text-white/80">
            {T.heroSub.join(" ")}
          </p>
        )}

        {/* DIE FOLIEN KOMMEN AUS DEM ORDNER: `versprechenVideos()` liest jede .mp4 in
            public/Versprechen — Kachel-Video zuerst, der Rest nach Namen. */}
        {showAdmin && <ManageViewToggle view={view} />}
        {showAdmin && view === "admin" && (
          /* DIE EIGENE VERSPRECHEN-LISTE (Owner 12.08.2026) — dieselbe Galerie wie bei
             Kiss, nur auf theme=versprechen gefiltert (/api/kiss-log?theme=…). */
          <div className="lb-theme mt-4">
            <UploadsAdmin title="Hochgeladen & erzeugt" theme="versprechen" />
          </div>
        )}
        {showCustomer && (
        <KissFunnel variant="versprechen" code={code} lang={L}
          beispielVideos={versprechenVideos()} />
        )}

        {/* DER GROSSE PRODUKTKASTEN — direkt unter der Video-Karte, damit der erste Blick nach
            dem Film auf das PROGRAMM fällt, nicht auf eine schmale Preiszeile (Owner
            11.08.2026: „it must feel like: buy a serious Future Self Program that begins with
            a powerful Future Film").

            SEIT 11.08.2026 (Owner, zum Screenshot des goldenen Kastens): „mach mir das auch in
            einer weissen karte." Die Videokarte direkt darüber IST bereits eine weisse Karte
            (`EinladungKarte`/`.lb-karte` — die elfenbeinfarbene Hülle, in der jedes Video im
            Haus lebt). Der Produktkasten bekommt jetzt dieselbe Hülle: gleicher Creme-Ton,
            gleicher Rahmen, gleiche Eckranken, damit beide Karten wie EIN Stück Papier wirken
            statt „Video" + „Werbekasten" hintereinander.

            Kein `Kasten art="gold"` mehr — das war der dunkle Trichter-Kasten. Stattdessen der
            EXAKTE Aufbau der Videokarte selbst (aus `ThemenListe`/`EinladungKarte` in CI.tsx):
            bare `.lb-karte`-Klasse für Hintergrund/Textfarbe, `CornerOrnaments` + `lb-karte-rahmen`
            für die Innenlinie — keine von Hand nachgebauten Farben, nur die vorhandenen
            Karten-Bausteine (Memory `lb-karte-important-frisst-inline-farben`: in der Karte
            gewinnt `!important` sowieso gegen jede Inline-Farbe).

            NICHT `KartenTitel` für die Überschrift: Der Baustein schaltet ab 18 Zeichen von
            gesperrten Versalien auf normale Schreibung um (Landingpage.md-Regel für lange
            Titel wie „Mein Geschenk für dich"). „Future Self Program" hat 19 Zeichen — genau
            über der Grenze — und würde dadurch klein und ohne Sperrung stehen, obwohl der
            Owner ausdrücklich „gross" und in der bisherigen Gestalt wollte. Die Zeile bleibt
            deshalb von Hand gesetzt, aber in der Kartentinte (`lb-karte-gold`) statt in Weiss.

            Der Preis bleibt die grösste Zeile. Er trägt `lb-karte-gold` — trotz des Namens
            NICHT golden: Owner 06.08.2026 hat Gold aus der Kartenschrift verbannt („das was
            gold ist muss schwarz hier"), seither ist `lb-karte-gold` die dunkle Kartentinte
            (#1a160f) und genau das benutzt auch der Preis in der echten Videokarte
            (`themen[vorn].abPreis` in CI.tsx). Dasselbe hier statt eines blassen Golds, das auf
            Creme kaum lesbar wäre.

            KEIN `MadeBy` in dieser Karte: Die Video-Karte direkt darüber trägt ihn schon
            (`fuss={<MadeBy karte />}` in KissFunnel.tsx) — ein zweiter „made by"-Chip zwei
            Karten hintereinander wäre eine Wiederholung, keine Auszeichnung. */}
        {/* KEINE PREISZEILE MEHR IN DER KARTE (Owner 11.08.2026: „nicht mehr überall den
            Preis wiederholen. Einmal im Hero bzw. CTA und einmal beim finalen Kaufblock
            reicht. Sonst wird die Seite zu preisgetrieben statt wertgetrieben."). Der
            Kaufknopf der Videokarte direkt darüber zeigt den Betrag, der finale Kaufblock
            unten noch einmal — die 34-px-Zeile hier war die dritte Nennung. */}
        <div className="lb-karte relative mt-5 overflow-hidden rounded-[22px] px-5 pb-5 pt-5 text-center shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <CornerOrnaments />
          <div className="lb-karte-rahmen pointer-events-none absolute inset-[10px] rounded-[14px]" />
          <div className="relative">
            <p className="lb-karte-gold text-[22px] font-black uppercase tracking-[0.08em]">
              Future Self Program
            </p>
            {T.unterVideoZeilen && (
              <div className="mt-4 space-y-1">
                {T.unterVideoZeilen.map((zeile: string, i: number) => (
                  <p key={i} className="text-[14px] font-black uppercase tracking-wide leading-snug">
                    {zeile}
                  </p>
                ))}
              </div>
            )}
            {/* DIE 30-DAY PROMISE GUARANTEE — IN DER KARTE, nicht darunter (Owner 11.08.2026,
                zum Screenshot der Karte: „Das muss in die karte eingebaut werden auch";
                Wortlaut der Garantie ebenfalls von ihm, wörtlich in kiss-i18n).

                EIGENSTÄNDIG NEBEN DER HAUS-GARANTIE (Memory `geld-zurueck-garantie`): Die
                allgemeine deckt nur Nicht-Lieferung + grosse Abweichung, NIE „nicht
                zufrieden". Diese hier erlaubt es ausdrücklich — aber erst, nachdem die
                ersten 7 Programmtage abgehakt sind. Die Hürde ist PRÜFBAR: checks["1"…"7"]
                in `try-this-look/future-program/<genId>.json`.

                Kartentinte statt Weiss (lb-karte-Klassen, Memory
                `lb-karte-important-frisst-inline-farben`); das Schild ist dasselbe wie am
                Zahlungssiegel. Nur beim Versprechen — andere Themen haben den Schlüssel
                nicht. */}
            {T.garantieTitel && (
              <div className="mx-auto mt-4 max-w-[320px] border-t border-[#1a160f]/15 pt-3">
                <div className="flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <p className="text-[12.5px] font-black uppercase tracking-wide">{T.garantieTitel}</p>
                </div>
                {T.garantieText && (
                  <p className="mt-1.5 text-[12px] font-semibold leading-snug opacity-75">
                    {T.garantieText}
                  </p>
                )}
                <a href="/terms#promise-garantie" className="mt-1.5 inline-block text-[11.5px] font-bold underline opacity-70">
                  → {s.terms}
                </a>
              </div>
            )}
            {T.jetztStarten && (
              <p className="mt-3 text-[12px] font-bold uppercase tracking-wide opacity-70">
                {T.jetztStarten}
              </p>
            )}
          </div>
        </div>

        {/* DIE 6 BENEFITS ALS KACHELN — derselbe Abschnitt „Dein Future Self Program", nur vom
            Listen- zum Kachel-Layout gewechselt und direkt hinter den Produktkasten gezogen
            (Owner: das Programm ist das Produkt, es gehört nach oben, nicht hinter „Mehr als
            ein Video"). 2 Spalten, kurze Titel wie „30 Tage" tragen die schmale Breite auch
            bei 375px; Texte laufen mehrzeilig, kein horizontales Scrollen. */}
        {T.wasBekommstTitel && (
          <div className="mt-10">
            <SectionTitle>{T.wasBekommstTitel}</SectionTitle>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {T.wasBekommstTitelListe?.map((titel: string, i: number) => (
                <Kasten key={i} art="still" polster="p-3">
                  <span className="text-[12px] font-black text-[#f6cf51]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-1 text-[14px] font-black leading-snug text-white">{titel}</p>
                  <p className="mt-1 text-[12.5px] font-medium leading-snug text-white/70">
                    {T.wasBekommstTextListe?.[i]}
                  </p>
                </Kasten>
              ))}
            </div>
          </div>
        )}

        {/* „MEHR ALS EIN VIDEO" — vertieft nur noch, verkauft nicht mehr an; der Verkauf ist
            schon oben passiert (Produktkasten + Benefits). */}
        {T.mehrTitel && (
          <div className="mt-12">
            <SectionTitle>{T.mehrTitel}</SectionTitle>
            {T.mehrText?.map((zeile: string, i: number) => (
              <Lead key={i} className={i > 0 ? "mt-2" : undefined}>{zeile}</Lead>
            ))}
          </div>
        )}

        {T.emoTitel && (
          <section className="mt-14 border-t border-white/10 pt-10">
            <SectionTitle>{T.emoTitel}</SectionTitle>
            {T.emoText?.map((zeile: string, i: number) => (
              <Lead key={i} className={i > 0 ? "mt-1" : undefined}>{zeile}</Lead>
            ))}
            {T.emoMarkensatz && (
              <p className="mt-5 text-[16px] font-black uppercase leading-snug text-[#f6cf51]">
                {T.emoMarkensatz.join(" ")}
              </p>
            )}
          </section>
        )}

        {T.howTitel && (
          <div className="mt-14">
            <SectionTitle>{T.howTitel}</SectionTitle>
            <ol className="mt-4 space-y-5">
              {T.howTitelListe?.map((titel: string, i: number) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f6cf51] text-[12px] font-black text-black">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[15px] font-black leading-snug text-white">{titel}</p>
                    <p className="mt-1 text-[14px] font-medium leading-snug text-white/75">
                      {T.howTextListe?.[i]}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {T.finalTitel && (
          <section className="mt-14 border-t border-white/10 pt-10 text-center">
            {T.finalTitel.map((zeile: string, i: number) => (
              <p key={i} className="text-[20px] font-black leading-tight text-white">{zeile}</p>
            ))}
            <p className="mt-4 text-[15px] font-black text-white">Future Self Program</p>
            {/* DER PREIS ALS SATZ STATT ALS NACKTER ZAHL-BROCKEN (11.08.2026, nach der
                Preissenkung). Solange das Programm teuer war, war die grosse Zahl das, was
                man erklären musste; jetzt ist sie das Argument und darf ausgesprochen werden
                — „Alles zusammen für …, einmalig, kein Abo."

                Der Betrag kommt weiterhin ausschliesslich aus VERSPRECHEN_CENTS: der Text
                trägt nur {programm}, gefüllt von fillPrices in `kissText` (Memory
                `prices-only-from-pricing-table`). Deshalb braucht diese Seite kein eigenes
                `eur(themenPreisCents(...))` mehr.

                DAMIT STEHT DER PREIS GENAU ZWEIMAL auf der Seite — Kaufknopf der Videokarte
                oben und diese Zeile im finalen Kaufblock — wie die Owner-Regel es verlangt. */}
            {T.finalPreisZeile && (
              <p className="mt-1 text-[19px] font-black leading-snug text-[#f6cf51]">{T.finalPreisZeile}</p>
            )}
            {T.finalIncludes && (
              <ul className="mx-auto mt-4 inline-block text-left text-[13px] font-semibold leading-relaxed text-white/75">
                {T.finalIncludes.map((zeile: string, i: number) => (
                  <li key={i}>· {zeile}</li>
                ))}
              </ul>
            )}
            {T.finalSub && (
              <p className="mt-5 text-[13px] font-black uppercase tracking-wide text-white/60">{T.finalSub}</p>
            )}
          </section>
        )}

        <section className="mt-14 border-t border-white/10 pt-8">
          <SectionTitle>{s.privatH}</SectionTitle>
          <Lead>{s.privatP}</Lead>
        </section>
      </div>
      <SeitenFuss />
    </main>
  );
}
