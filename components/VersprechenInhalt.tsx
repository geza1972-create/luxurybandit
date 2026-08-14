import { SectionTitle, Lead } from "@/components/Landing";
import { Kasten } from "@/components/CI";
import { ShieldCheck } from "lucide-react";
import { CornerOrnaments } from "@/components/BoxOrnaments";
import type { kissText } from "@/lib/kiss-i18n";

/**
 * DER INHALT DER VERSPRECHEN-LANDINGPAGE — EINMAL GESCHRIEBEN, ZWEIMAL GEZEIGT
 * (Owner 14.08.2026: „ich glaube dass alles was wir auf der Landingpage haben auch im Tunel
 * zeigen müssen aber unter dem Anmeldeformular" — „das gilt generell für den Tunel").
 *
 * WARUM: Wer aus einer Meta-Anzeige kommt, landet direkt auf `/themes/versprechen/start` und
 * sieht die Landingpage NIE. Damit fehlten ihm der Produktkasten, die 30-Tage-Garantie, die
 * sechs Bausteine und der Abschluss — er glaubte, er kaufe ein Video.
 *
 * WARUM ALS EIGENE DATEI: Der Inhalt stand als 200 Zeilen JSX mitten in
 * `app/themes/versprechen/page.tsx`. Ihn im Tunnel zu wiederholen hiesse, ihn ein zweites Mal
 * zu schreiben — und zwei Fassungen desselben Versprechens laufen garantiert auseinander,
 * genau wie es `mailQuestion` und `mailNote` heute vorgemacht haben. Jetzt rendern ihn beide
 * Seiten aus DIESER Datei: die Landingpage unter ihrem Trichter, die Tunnel-Seite unter dem
 * Anmeldeformular.
 *
 * Reine Anzeige, kein Zustand — bleibt eine Server-Komponente und kostet den Tunnel kein
 * zusaetzliches JavaScript.
 */
export default function VersprechenInhalt({ T, s }: {
  T: ReturnType<typeof kissText>;
  /** Die serverseitig uebersetzten Rest-Texte der Seite (privatH/privatP/terms). */
  s: Record<string, string>;
}) {
  return (
    <>

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
    </>
  );
}
