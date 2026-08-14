import { SectionTitle, Lead } from "@/components/Landing";
import ThemenVorspann from "@/components/ThemenVorspann";
import type { kissText } from "@/lib/kiss-i18n";

/**
 * DER INHALT DER KUSS-LANDINGPAGE — EINMAL GESCHRIEBEN, ZWEIMAL GEZEIGT
 * (Owner 14.08.2026, Dauerregel: „alles was wir auf der Landingpage haben auch im Tunel
 * zeigen … aber unter dem Anmeldeformular" — „das gilt generell für den Tunel").
 *
 * Gleiche Bauart wie `VersprechenInhalt`: Vorspann, Anlässe und die SEO-Abschnitte standen
 * als JSX mitten in `app/themes/kiss/page.tsx` und waren damit fuer jeden, der aus einer
 * Anzeige direkt in `/themes/kiss/start` faellt, unsichtbar. Jetzt rendern beide Seiten
 * DIESE Datei — die Landingpage unter ihrem Trichter, der Tunnel unter dem Anmeldeformular.
 *
 * Reine Anzeige, kein Zustand: bleibt Server-Komponente, kostet den Tunnel kein JavaScript.
 */
export default function KissInhalt({ T, s }: {
  T: ReturnType<typeof kissText>;
  /** Die serverseitig uebersetzten SEO-/Datenschutz-Texte der Seite. */
  s: Record<string, string>;
}) {
  return (
    <>

            {/* DER VORSPANN STEHT UNTER DER KARTE (Owner 10.08.2026: „ich will den CTA im
                Viewport shen" · „dieser Aufbau der Landing pge gilt für alle seiten").
                Anlass, Grund und die drei Schritte standen ZWISCHEN Titel und Karte und
                schoben den Kaufknopf um eine halbe Handyhöhe nach unten — erklärt wurde,
                bevor irgendetwas zu sehen war. Die Hausordnung seit dem Kuss lautet
                andersherum: erst sehen, was herauskommt, dann lesen, wie es geht. */}
            <ThemenVorspann anlass={T.anlass} grund={T.grund}
              wieGeht={T.wieGeht} wieGehtPrivat={T.wieGehtPrivat} />

            {/* Beispiel-Videos (Admin lädt sie im Kiss-Medien-Tool hoch) */}
            {/* MEHR VON DEMSELBEN, ALS KARTEN (Owner 31.07.2026: „du machst diese Karte
                mehrmals untereinander und nimmst unsere Kiss-Videos"). Dieselbe Karte wie
                oben, viermal — jede mit „Personen ersetzen". Wer scrollt, sieht viermal das
                Ergebnis, das er haben kann, statt acht Briefmarken. */}
            {/* DIE ZWEITE KARTE IST WEG (Owner 05.08.2026: „nein, es sind zwei Karten").
                Hier stand die Beispiel-Galerie — erst als Stapel, dann als eigene Karte mit
                Karussell. Beides war eine ZWEITE Karte unter der ersten, und genau das wollte
                er nicht: „eine Karte und die Videos wechseln sich ab in der Karte."
                Alle Beispiele liegen jetzt in der Karte oben (`beispielVideos` am Trichter).
                Die Seite ist damit um eine ganze Handy-Höhe je Beispiel kürzer. */}

            {/* WARUM MAN EINEN SCHICKT (Owner 03.08.2026: „unten soll dann stehn warum man
                das machen sollte. Es zeigt Liebe, es zeigt etwas schönes … du vermisst
                jemandem, das ist ein Liebesbeweis").
                ANLAESSE, KEINE WARNUNGEN — vom Owner am 03.08. ausdruecklich so entschieden.
                Ein „bitte nicht" an dieser Stelle bremst genau die Stimmung, aus der heraus
                jemand einen Kuss verschickt; die Pflichten traegt der Nutzungshinweis im
                Trichter darueber.
                Die Zeilen stehen NACH den Beispielen: Erst sieht er, was dabei herauskommt,
                dann liest er, warum es ihn angeht. Umgekehrt waere es eine Predigt vor dem
                Beweis. */}
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
              {/* Der Schlusssatz ist der Satz des Owners, nur zugespitzt: „das ist ein
                  Liebesbeweis". Er steht abgesetzt, weil er das Argument traegt — alles
                  darueber sind nur die Gelegenheiten dazu. */}
              <p className="mt-4 border-l-2 border-[#f6cf51]/50 pl-3 text-[15px] font-black leading-snug text-white">
                {T.anlaesseSchluss}
              </p>
            </div>

            {/* EIGENER WORTLAUT, WEIL DER ALTE NICHT MEHR STIMMT (Owner 31.07.2026: „das
                passt nicht").
                Dort stand „Videos mit ihr — und du mit im Bild". Es gibt keine „ihr" mehr:
                Seit heute nimmt dieser Trichter nur noch SEINE eigenen Fotos („du machst nur
                upload your photo, nicht unsere Models"). Der Satz warb also fuer einen
                Katalog, den es auf dieser Seite nicht mehr gibt.
                Und „die heisseste KI-Erfahrung" ist eine Behauptung — die Zahl daneben ist
                ein Angebot. Zahlen kommen aus lib/pricing, nie von Hand. */}
            {/* DER ABO-BLOCK IST RAUS (Owner 03.08.2026: „wir haben so was gar nicht mehr,
                2,99 im Abokauf. Wir haben nur Credits. Schaffe Abo für Kissing ab").
                Hier stand „20 Videos im Monat … jedes weitere 2,99 €" und „Freischalten —
                24,50 €/Monat" — beides gibt es fuer den Kuss nicht mehr. Der einzige Weg
                ist die Aufladung im Trichter darueber; ein Monatspreis daneben zieht genau
                die Aufmerksamkeit ab, die der 4,99-Einstieg braucht. Der Baustein bleibt
                fuer Hochzeit, Wetter und Chat. */}

            {/* „YOU MIGHT ALSO LOVE" IST RAUS (Owner 31.07.2026: „das machst du eh falsch,
                falsche Bilder").
                Er hat recht, und der Fehler stand im Code: Fuer Themen ohne eigenes Cover
                nahm die Kachel EIN BELIEBIGES Kuratorinnen-Foto (`fotos[i % fotos.length]`).
                Damit warb „Birthday video" mit einer fremden Frau, die nichts mit
                Geburtstagen zu tun hat — acht Kacheln, die etwas anderes versprechen als
                das, was dahinter liegt. Ein zufaelliges Bild ist schlimmer als gar keines.
                An dieser Stelle stehen jetzt unsere eigenen Kuss-Videos als Karten. */}
            <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
              <div>
                <SectionTitle>{s.seo1h}</SectionTitle>
                <Lead>{s.seo1p}</Lead>
              </div>
              <div>
                {/* Hier standen zwei Superlative, die niemand belegen kann („one of a kind",
                    „the priciest models available") — dieselben, die auf der Startseite raus
                    sind. Eine Werbeaussage, die man nicht beweisen kann, ist angreifbar und
                    klingt beim Leser ohnehin nach Marktschreier. Das echte Kaufargument ist
                    konkret, ueberpruefbar und erklaert nebenbei den Preis. */}
                <SectionTitle>{s.seo2h}</SectionTitle>
                <Lead>{s.seo2p}</Lead>
              </div>
            </section>
    </>
  );
}
