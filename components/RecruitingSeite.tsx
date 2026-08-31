import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, SectionTitle, Lead, Fine, StepLabel, Y } from "@/components/Landing";
import { Kasten, Knopf } from "@/components/CI";
import RecruitingAnfrage from "@/components/RecruitingAnfrage";
import { recruitingTexte, RECRUITING_SPRACHEN } from "@/lib/recruiting-i18n";

/**
 * DIE FIRMENSEITE (Owner 31.08.2026: „Wir wollen jetzt mit Firmenakquise anfangen. Ziel ist
 * nicht, noch mehr Produkt zu bauen, sondern eine Seite zu haben, mit der ich Recruiter und
 * Unternehmen gezielt ansprechen kann.").
 *
 * WAS HIER BEWUSST NICHT STEHT (Owner, wörtlich: „Nicht unseren technischen Prozess
 * offenlegen … Wir verkaufen das Ergebnis, nicht das Rezept."): kein Meta-Targeting, kein
 * Trichteraufbau, keine der vier Fragen, keine Matching-Logik, kein Prompt, keine
 * Architektur. Der Abschnitt „So funktioniert es" ist absichtlich abstrakt — wer ihn liest,
 * versteht, was er bekommt, und könnte es nicht nachbauen.
 *
 * UND KEINE ZAHLEN: keine Preise (das Modell steht noch nicht fest — je Lead, je
 * qualifiziertem Kandidaten, Pilotpauschale oder Erfolg), und keine Leistungsversprechen wie
 * „3× mehr Kandidaten". Solange keine echten Daten vorliegen, wäre jede solche Zahl
 * erfunden — und das erste Gespräch mit einem Recruiter wäre das letzte.
 *
 * DEUTSCH, STATISCH: Die Zielgruppe sind deutschsprachige Recruiter und HR-Abteilungen von
 * Unternehmen in Rumänien. Der Text steht direkt in der Seite, nicht in der
 * Laufzeit-Übersetzung — aus demselben Grund wie bei `/joburi`: Der erste Besucher soll
 * nicht auf ein Modell warten.
 */

/* Titel und Beschreibung folgen der Sprache — sie sind das, was in der Vorschau einer
   verschickten Nachricht steht, und ein deutscher Titel unter einem rumänischen Link ist
   der erste Bruch, den der Empfänger sieht. */

/* Was in JEDER Sprache gleich bleibt: ein Sprachniveau, ein Ortsname, ein Betrag. Sie
   stehen hier und nicht in der Sprachdatei — sonst müsste man „C1" dreimal pflegen. */
const BEISPIEL_FEST = { deutsch: "C1", standort: "Timișoara", gehalt: "1.800 € netto" };

/**
 * EINE GESTALT, ZWEI ADRESSEN (Owner 31.08.2026: „ich brauche unterschiedliche URLs für die
 * Sprachen, weil ich diese weitergebe").
 *
 * `/recruiting` errät die Sprache; `/recruiting/de|ro|en` legt sie fest. Beide rendern
 * DIESEN Baustein — sonst gäbe es die Seite zweimal, und die zweite wäre schon beim nächsten
 * Textwunsch veraltet.
 *
 * `imPfad` sagt der Kopfzeile nur, welche Art von Adresse sie vor sich hat: Steht die
 * Sprache im Pfad, muss der Umschalter die ADRESSE wechseln statt nur ein Cookie zu setzen —
 * sonst tippt man „Deutsch" an und bleibt auf `/recruiting/ro`.
 */
export default function RecruitingSeite({ lang, imPfad = false }: { lang: string; imPfad?: boolean }) {
  const T = recruitingTexte(lang);
  const heim = imPfad ? `/recruiting/${lang}` : "/recruiting";

  const beispiel: [string, string][] = [
    [T.beispielFelder.deutsch, BEISPIEL_FEST.deutsch],
    [T.beispielFelder.standort, BEISPIEL_FEST.standort],
    [T.beispielFelder.modell, T.beispielWerte.modell],
    [T.beispielFelder.status, T.beispielWerte.status],
    [T.beispielFelder.gehalt, BEISPIEL_FEST.gehalt],
    [T.beispielFelder.interesse, T.beispielWerte.interesse],
  ];

  return (
    <main className="lb-bg min-h-screen text-white">
      {/* REDUZIERT (Owner: „Keine Ablenkung zu den anderen LuxuryBandit-Produkten"):
          `schlicht` nimmt Konto, Guthaben, Galerie und Sprachwahl aus dem Kopf, `back={false}`
          den Weg zurück ins Portal. Was bleibt, ist der Name des Angebots. */}
      <TopNav schlicht sprachen={RECRUITING_SPRACHEN} sprachePfad={imPfad} back={false} marke="LB Recruiting" heim={heim} motto={T.kopfMotto} />

      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        {/* ── HERO ── */}
        <Kicker>{T.kicker}</Kicker>
        <H1>
          {T.h1Weiss}{" "}<Y>{T.h1Akzent}</Y>
        </H1>
        <Lead>{T.lead}</Lead>
        {/* DIE POSITIONIERUNGSZEILE — DREI WÖRTER STATT DREI ZAHLEN (Owner 31.08.2026:
            „Noch keine Zahlen, weil wir noch keine belastbaren Ergebnisse haben.").
            Sie steht unmittelbar vor dem Knopf, weil sie genau dort die Frage beantwortet,
            die in der Sekunde des Klickens aufkommt: Wen erreicht ihr, wo, und in welchem
            Zustand? */}
        <p className="mt-4 text-[12px] font-black uppercase tracking-[0.14em] text-white/55">
          {T.positionierung.split(" · ").map((teil, i) => (
            <span key={teil}>{i > 0 && <span className="text-[#f6cf51]"> · </span>}{teil}</span>
          ))}
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          <Knopf art="gold" href="#pilot">{T.ctaHaupt}</Knopf>
          <Knopf art="umriss" href="#ablauf">{T.ctaZweit}</Knopf>
        </div>

        {/* DAS BEISPIELPROFIL STEHT VOR JEDEM ARGUMENT: Ein Recruiter überfliegt eine
            Akquise-Seite; sechs Zeilen, die aussehen wie das, was er bekommt, sagen mehr als
            drei Absätze darüber. `Kasten` liefert die Fassung mit — in der hellen Welt weisse
            Karte mit Haarlinie, in der dunklen der gewohnte Kasten. */}
        <Kasten polster="p-4" className="mt-6">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">
            {T.beispielTitel}
          </p>
          <dl className="mt-3">
            {beispiel.map(([feld, wert], i) => (
              <div key={feld}
                className={`flex items-baseline justify-between gap-4 py-2 ${i > 0 ? "border-t border-white/12" : ""}`}>
                <dt className="shrink-0 text-[12.5px] font-bold text-white/60">{feld}</dt>
                <dd className="text-right text-[13.5px] font-black text-white/90">{wert}</dd>
              </div>
            ))}
          </dl>
          <Fine>{T.beispielHinweis}</Fine>
        </Kasten>

        {/* ── DAS PROBLEM ── */}
        <section className="mt-12">
          <SectionTitle>{T.problemTitel}</SectionTitle>
          <Lead>{T.problemText}</Lead>
          {/* DER SATZ, DER DIE ABWEHR NIMMT: Wer eine Agentur hört, denkt an Ablösung des
              eigenen Kanals. Er steht deshalb hervorgehoben und nicht im Fliesstext. */}
          <Kasten art="gold" polster="p-4" className="mt-5">
            <p className="text-[15.5px] font-black leading-snug text-white">{T.problemHervor}</p>
          </Kasten>
        </section>

        {/* ── WAS SIE ERHALTEN ── */}
        <section className="mt-12">
          <SectionTitle>{T.erhaltenTitel}</SectionTitle>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {T.erhalten.map(e => (
              <div key={e} className="rounded-xl border border-white/20 bg-white/[0.05] px-3 py-2.5 text-[13px] font-black leading-snug text-white/90">
                {e}
              </div>
            ))}
          </div>
          <Lead>{T.erhaltenText}</Lead>
        </section>

        {/* ── DER UNTERSCHIED ── */}
        <section className="mt-12">
          <SectionTitle>{T.unterschiedTitel}</SectionTitle>
          <Lead>{T.unterschiedText}</Lead>
          <div className="mt-5 flex flex-col gap-2.5">
            {T.segmente.map(s => (
              <Kasten key={s.titel} polster="p-4">
                <p className="text-[15px] font-black text-white">{s.titel}</p>
                <p className="mt-1 text-[13.5px] font-medium leading-snug text-white/75">{s.text}</p>
              </Kasten>
            ))}
          </div>
          {/* DER ZWEITE WEG ZUM FORMULAR (Owner 31.08.2026). Er steht genau hier, weil dieser
              Abschnitt das Argument ist, das den Unterschied macht — wer bis hierher gelesen
              hat und überzeugt ist, soll nicht erst durch zwei weitere Abschnitte wischen,
              um den Knopf zu finden. */}
          <div className="mt-6">
            <Knopf art="gold" href="#pilot">{T.ctaHaupt}</Knopf>
          </div>
        </section>

        {/* ── WARUM LUXURYBANDIT ──
            Er steht hier und nicht oben (Owner 31.08.2026: „Nicht im Hero platzieren und
            nicht wie eine Rechtfertigung formulieren."): Wer bis hierher gelesen hat, ist
            vom Angebot überzeugt und fragt sich als Letztes, mit wem er es zu tun hat.
            Kompakt gehalten — die blaue Akzentlinie der Abschnittsüberschrift trägt ihn,
            keine zweite Hervorhebungsfläche neben dem Kasten weiter oben. */}
        <section className="mt-12">
          <SectionTitle>{T.warumTitel}</SectionTitle>
          <Lead>{T.warumLead}</Lead>
          <p className="mt-3 text-[14.5px] font-medium leading-relaxed text-white/80">{T.warumText}</p>
          {/* Das Markenwort steht ruhig darunter, in der Akzentfarbe und in Versalien — ein
              Schlusssatz, kein Knopf. */}
          <p className="mt-4 text-[12.5px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">
            {T.warumClaim}
          </p>
        </section>

        {/* ── SO FUNKTIONIERT ES ──
            ABSICHTLICH ABSTRAKT (siehe Kopf der Datei): vier Sätze, die das Ergebnis
            beschreiben, und keiner, aus dem sich der Weg dorthin nachbauen liesse. */}
        <section id="ablauf" className="mt-12 scroll-mt-24">
          <SectionTitle>{T.ablaufTitel}</SectionTitle>
          <div className="mt-5 flex flex-col gap-5">
            {T.ablauf.map((a, i) => (
              <div key={a.titel}>
                <StepLabel>{`0${i + 1}`} · {a.titel}</StepLabel>
                <p className="mt-1.5 text-[14.5px] font-medium leading-relaxed text-white/85">{a.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── PILOT ── */}
        <section id="pilot" className="mt-12 scroll-mt-24">
          <SectionTitle>{T.pilotTitel}</SectionTitle>
          <Lead>{T.pilotText}</Lead>
          {/* KEINE ZAHL, SONDERN DIE ZUSAGE ZU MESSEN — das ist das Einzige, was sich vor dem
              ersten Piloten ehrlich versprechen lässt. */}
          <Fine>{T.pilotHinweis}</Fine>

          <div className="mt-5">
            <RecruitingAnfrage T={T} />
          </div>
        </section>
      </div>

      {/* Der schlichte Fuss: das gesetzliche Minimum, keine Portal-Werbung — dieselbe
          Entscheidung wie auf den Bewerber-Seiten. */}
      <SeitenFuss art="schlicht" lang={lang} marke="LB Recruiting" />
    </main>
  );
}
