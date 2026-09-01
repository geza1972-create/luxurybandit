import type { LucideIcon } from "lucide-react";
import {
  Briefcase, Eye, Euro, FileCheck2, Globe, Home, MapPin, MessageSquare,
  Megaphone, MessagesSquare, RefreshCw, ShieldCheck, Star, Target, UserRound, Users,
} from "lucide-react";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, SectionTitle, Lead, Fine, Y, zweifarbig } from "@/components/Landing";
import { Kasten, Knopf } from "@/components/CI";
import RecruitingAnfrage from "@/components/RecruitingAnfrage";
import { recruitingTexte, RECRUITING_SPRACHEN } from "@/lib/recruiting-i18n";
import { studieZahlen } from "@/lib/joburi-studie";

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
 * UND KEINE ZAHLEN: keine Preise (das Modell steht noch nicht fest), und keine
 * Leistungsversprechen wie „3× mehr Kandidaten". Solange keine echten Daten vorliegen, wäre
 * jede solche Zahl erfunden — und das erste Gespräch mit einem Recruiter wäre das letzte.
 *
 * ═══ DIESE SEITE FOLGT DEM ENTWURF DES OWNERS, NICHT DEM HAUS-RASTER ═══
 *
 * Owner 31.08.2026, nach der ersten Desktop-Fassung: „Ich habe dir ein schönes Design
 * gegeben und was du gebaut hast sieht total anders aus."
 *
 * Er hatte recht. Die erste Fassung nahm die STRUKTUR seines Entwurfs und liess überall dort,
 * wo Entwurf und Haus-CI sich widersprachen, die Haus-CI gewinnen — Typo-Grössen,
 * Akzentbalken über jeder Überschrift, durchgehender Grund. Sein Auftrag lautete aber „die
 * visuelle Richtung des angehängten Bildes möglichst nah übernehmen". Auf DIESER Seite
 * gewinnt deshalb der Entwurf:
 *
 *   · Abschnitte wechseln über die volle Breite zwischen Grund und einem hellen Band
 *   · ruhigere Typo (H1 38 statt 44, Überschriften 32 statt 30, Fliesstext 15 statt 16)
 *   · die Positionierungszeile trägt die Akzentfarbe, nicht Grau
 *   · „Warum" und „Pilot" stehen zentriert und OHNE Akzentbalken
 *   · die Schritte sind zentrierte Karten mit Nummer oben und gestrichelter Verbindung
 *   · das Formular ist am Desktop dreispaltig
 *
 * WAS TROTZDEM AUS DER BIBLIOTHEK KOMMT: Knöpfe, Kästen, Eingaben, Kopf und Fuss. Geändert
 * sind Anordnung und Masse, nicht die Bausteine — und keine Zeile davon wirkt ausserhalb
 * dieser Seite.
 *
 * NICHT ÜBERNOMMEN, mit Grund: die PFEILE in den Knöpfen (Hausregel 12.08.2026: „auch in dem
 * Button machst du da komische zeichen. Die raus") und der Ergebnis-Streifen unter den
 * Schritten — dessen Satz steht im Entwurf, aber in keinem unserer Texte, und erfundene
 * Aussagen sind auf dieser Seite ausdrücklich verboten.
 */

/* Was in JEDER Sprache gleich bleibt: ein Sprachniveau, ein Ortsname, ein Betrag. */
const BEISPIEL_FEST = { deutsch: "C1", standort: "Timișoara", gehalt: "1.800 € net" };

/**
 * DIE SYMBOLE STEHEN HIER, NICHT IN DER SPRACHDATEI — sie sind für alle drei Sprachen
 * dieselben, und ein Symbol ist keine Übersetzung. Zugeordnet wird über die Position: Die
 * Reihenfolge der Texte ist in jeder Sprache gleich, weil sie dieselbe Liste beschreibt.
 */
const BEISPIEL_ZEICHEN: LucideIcon[] = [MessageSquare, MapPin, Home, UserRound, Euro, Target];
const ERHALTEN_ZEICHEN: LucideIcon[] = [Globe, Briefcase, MapPin, Home, Euro, RefreshCw, Target, FileCheck2];
const SEGMENT_ZEICHEN: LucideIcon[] = [Users, Eye, Star];
const ABLAUF_ZEICHEN: LucideIcon[] = [Briefcase, Megaphone, ShieldCheck, MessagesSquare];

/**
 * DAS HELLE BAND — der Rhythmus des Entwurfs.
 *
 * `bg-white/[0.03]` ist mit Absicht in der Schreibweise der DUNKLEN Welt notiert: Die helle
 * Fassung dreht jede `bg-white/…`-Fläche auf einen Hauch Tinte (globals.css), aus dem Hauch
 * Weiss auf Schwarz wird also von selbst ein hellgraues Band auf hellem Grund. EIN Ausdruck,
 * zwei richtige Ergebnisse — statt zweier Farben, die getrennt gepflegt werden müssten.
 */
const Band = ({ hell = false, className = "", children }: {
  hell?: boolean; className?: string; children: React.ReactNode;
}) => (
  <section className={`w-full ${hell ? "bg-white/[0.03]" : ""} ${className}`}>
    <div className="mx-auto w-full max-w-[440px] px-4 py-12 lg:max-w-[1120px] lg:px-8 lg:py-20">
      {children}
    </div>
  </section>
);

/**
 * SYMBOL IN DER ABGESETZTEN KACHEL — dieselbe Gestalt an jeder Karte.
 *
 * `lb-onmedia` ist hier kein Zierrat (Owner 31.08.2026, mit Bild der Kachel: „icon weiss").
 * In der hellen Fassung macht die Pauschalregel des Hauses aus jedem `bg-[#f6cf51]` eine
 * VOLLE blaue Fläche — aus dem 10-%-Hauch der dunklen Welt wird ein satter Knopf, und das
 * Symbol darauf blieb dunkel: dunkel auf Blau. `lb-onmedia` ist die Haus-Kennung für „Text
 * liegt auf einer farbigen Fläche" und zwingt Weiss; sie greift NUR in der hellen Fassung,
 * im Dunkeln bleibt das Symbol also gold auf goldenem Hauch.
 */
const Zeichen = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span className="lb-onmedia lb-gold grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#f6cf51]/30 bg-[#f6cf51]/10 text-[#f6cf51]">
    <Icon className="h-[18px] w-[18px]" />
  </span>
);

/* Zentrierte Überschrift OHNE Akzentbalken — im Entwurf tragen „Warum" und „Pilot" keinen.
   Zweifarbig bleibt sie trotzdem: dieselbe Haus-Regel wie `SectionTitle`, nur ohne Strich. */
const MitteTitel = ({ children }: { children: string }) => (
  <h2 className="text-[26px] font-black leading-[1.12] lg:text-[32px]">{zweifarbig(children)}</h2>
);

/** Die Überschrift eines linken Abschnitts — Balken wie im Entwurf, Grösse aus dem Entwurf. */
const BalkenTitel = ({ children }: { children: string }) => (
  <SectionTitle className="[&>h2]:text-[26px] [&>h2]:mt-3 lg:[&>h2]:text-[32px]">{children}</SectionTitle>
);

/**
 * EINE GESTALT, ZWEI ADRESSEN (Owner 31.08.2026: „ich brauche unterschiedliche URLs für die
 * Sprachen, weil ich diese weitergebe").
 *
 * `/recruiting` errät die Sprache; `/recruiting/de|ro|en` legt sie fest. Beide rendern
 * DIESEN Baustein — sonst gäbe es die Seite zweimal, und die zweite wäre schon beim nächsten
 * Textwunsch veraltet.
 */
export default async function RecruitingSeite({ lang, imPfad = false }: { lang: string; imPfad?: boolean }) {
  const T = recruitingTexte(lang);
  /* Die Studie kommt vom Server und ist zwischengespeichert (lib/joburi-studie.ts) — sonst
     holte jeder Seitenaufruf jede Antwort einzeln aus dem Speicher. Steht zu wenig zur
     Verfügung, ist `belastbar` false und der ganze Abschnitt entfällt, statt dünne Zahlen
     zu zeigen. */
  const studie = await studieZahlen();
  const heim = imPfad ? `/recruiting/${lang}` : "/recruiting";

  const beispiel: [string, string][] = [
    [T.beispielFelder.deutsch, BEISPIEL_FEST.deutsch],
    [T.beispielFelder.standort, BEISPIEL_FEST.standort],
    [T.beispielFelder.modell, T.beispielWerte.modell],
    [T.beispielFelder.status, T.beispielWerte.status],
    [T.beispielFelder.gehalt, BEISPIEL_FEST.gehalt],
    [T.beispielFelder.interesse, T.beispielWerte.interesse],
  ];

  /* `lb-recruiting` holt die Seite am Desktop aus der 440er-Telefonspalte des Hauses (siehe
     globals.css, `.lb-frame:has(…)`) — ohne diese Kennung endet der Rahmen bei 440 px und
     jedes Raster darunter bliebe wirkungslos. */
  return (
    <main className="lb-bg lb-recruiting lb-theme lb-fb min-h-screen text-white">
      {/**
        * HELL SCHON VOM SERVER — KEIN SCHWARZER BLITZ (Owner 31.08.2026, an der laufenden
        * Anzeige: „was ich nicht mag, das erst mal die darkseite lädt").
        *
        * Die helle Fassung wurde bisher erst IM BROWSER gesetzt (`LightSwitch`, der die
        * Klassen nachträglich an `main` hängt). Der Server lieferte also Schwarz, und wer aus
        * einer Anzeige kam, sah eine dunkle Seite aufblitzen, bevor sie hell wurde. Auf einer
        * bezahlten Landung ist das der erste Eindruck — und er kostet Klicks, für die schon
        * gezahlt ist.
        *
        * `lb-theme lb-fb` stehen deshalb fest im ausgelieferten HTML. Der Umschalter bleibt:
        * Er liest beim Start, was hier schon steht, ist damit einig mit dem Server — und wer
        * lieber dunkel will, tippt ihn weiterhin an.
        */}
      {/* `schlicht` nimmt Konto, Guthaben und Galerie aus dem Kopf, `breit` hält ihn am
          Desktop auf Inhaltsbreite und zieht Hell/Dunkel + Sprache in die blaue Leiste. */}
      <TopNav schlicht breit sprachen={RECRUITING_SPRACHEN} sprachePfad={imPfad} back={false} marke="LB Recruiting" heim={heim} motto={T.kopfMotto} />

      {/* ── 1 · HERO — links das Angebot, rechts der Beweis ── */}
      <section className="w-full">
        <div className="mx-auto w-full max-w-[440px] px-4 pb-12 pt-3 lg:max-w-[1120px] lg:px-8 lg:pb-20 lg:pt-12">
          <div className="lg:grid lg:grid-cols-[1fr_0.92fr] lg:items-start lg:gap-16">
            <div>
              <Kicker>{T.kicker}</Kicker>
              <H1 className="lg:text-[38px] lg:leading-[1.12]">
                {T.h1Weiss}{" "}<Y>{T.h1Akzent}</Y>
              </H1>
              <Lead className="lg:max-w-[44ch] lg:text-[15px]">{T.lead}</Lead>
              {/* Im Entwurf trägt diese Zeile die Akzentfarbe, nicht Grau — sie ist eine
                  Aussage über uns, kein Kleingedrucktes. */}
              <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51] lg:mt-6">
                {T.positionierung}
              </p>
              {/* Ein Knopf über die volle Spaltenbreite sieht am Desktop nach Warnband aus. */}
              <div className="mt-4 flex flex-col gap-2.5 lg:mt-6 lg:max-w-[320px]">
                <Knopf art="gold" href="#pilot">{T.ctaHaupt}</Knopf>
                <Knopf art="umriss" href="#ablauf">{T.ctaZweit}</Knopf>
              </div>
            </div>

            <div className="mt-6 lg:mt-0">
              {/**
                * DAS MOTIV DES OWNERS (31.08.2026: „und die kannst du mir auf die recruiter
                * seite auch rein machen").
                *
                * Es hebt die Regel von heute Morgen auf — „keine Bilder oder Stockfotos
                * ergänzen" — und zwar durch ihn selbst: Das hier ist kein gekauftes
                * Symbolfoto aus einer Bildagentur, sondern SEIN Bild, und es zeigt genau das,
                * was der Recruiter kaufen soll: jemanden mit Deutsch am Schreibtisch.
                *
                * Es steht ÜBER dem Beispielprofil, nicht statt seiner: Das Bild macht auf,
                * die sechs Zeilen darunter beweisen. Ein Bild allein wäre Dekoration.
                */}
              {/**
                * GANZ, NICHT ZUGESCHNITTEN (Owner 31.08.2026: „auf der Seite /recruiting/de
                * muss ich das ganze bild sehen").
                *
                * `aspect-[1086/1448]` ist das ECHTE Seitenverhältnis der Datei — damit
                * schneidet `object-cover` nichts weg, es gibt nichts zu beschneiden. Eine
                * feste Höhe (vorher 210/260 px) machte aus dem Hochformat einen Streifen und
                * nahm der Aufnahme die Hälfte, samt der Flagge.
                */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Joburi/german-jobs.jpg" alt=""
                className="aspect-[1086/1448] w-full rounded-2xl object-cover" />

              {/* DAS BEISPIELPROFIL STEHT VOR JEDEM ARGUMENT: Sechs Zeilen, die aussehen wie
                  das, was er bekommt, sagen mehr als drei Absätze darüber. */}
              <Kasten polster="p-5 lg:p-7" className="mt-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">
                {T.beispielTitel}
              </p>
              <dl className="mt-4">
                {beispiel.map(([feld, wert], i) => {
                  const Icon = BEISPIEL_ZEICHEN[i] ?? Target;
                  return (
                    <div key={feld}
                      className={`flex items-baseline justify-between gap-4 py-2.5 ${i > 0 ? "border-t border-white/12" : ""}`}>
                      <dt className="flex shrink-0 items-center gap-2 text-[12.5px] font-bold text-white/60">
                        <Icon className="h-4 w-4 shrink-0 text-white/45" />{feld}
                      </dt>
                      <dd className="text-right text-[13.5px] font-black text-white/90">{wert}</dd>
                    </div>
                  );
                })}
              </dl>
                <Fine>{T.beispielHinweis}</Fine>
              </Kasten>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2 · DAS PROBLEM — Text links, die Karte, die die Abwehr nimmt, rechts ── */}
      <Band>
        <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <BalkenTitel>{T.problemTitel}</BalkenTitel>
            <Lead className="lg:max-w-[46ch] lg:text-[15px]">{T.problemText}</Lead>
          </div>
          <div className="mt-5 lg:mt-0">
            <Kasten art="gold" polster="p-5 lg:p-6">
              <div className="flex items-start gap-3.5">
                <Zeichen icon={Users} />
                <p className="text-[15px] font-black leading-snug text-white lg:text-[15.5px]">{T.problemHervor}</p>
              </div>
            </Kasten>
          </div>
        </div>
      </Band>

      {/* ── 3 · WAS SIE ERHALTEN — mobil 2×4, am Desktop 4×2 auf hellem Band ── */}
      <Band hell>
        <BalkenTitel>{T.erhaltenTitel}</BalkenTitel>
        <div className="mt-6 grid grid-cols-2 gap-2.5 lg:mt-9 lg:grid-cols-4 lg:gap-4">
          {T.erhalten.map((e, i) => {
            const Icon = ERHALTEN_ZEICHEN[i] ?? Target;
            return (
              <Kasten key={e} polster="p-4 lg:p-5">
                <Icon className="h-5 w-5 text-[#f6cf51]" />
                <p className="mt-3 text-[13px] font-black leading-snug text-white/90 lg:text-[13.5px]">{e}</p>
              </Kasten>
            );
          })}
        </div>
        <p className="mt-6 text-[13.5px] font-medium leading-relaxed text-white/70 lg:mx-auto lg:mt-8 lg:max-w-[74ch] lg:text-center lg:text-[14px]">
          {T.erhaltenText}
        </p>
      </Band>

      {/* ── 4 · DER UNTERSCHIED — die drei Segmente nebeneinander ── */}
      <Band>
        <BalkenTitel>{T.unterschiedTitel}</BalkenTitel>
        <Lead className="lg:max-w-[74ch] lg:text-[15px]">{T.unterschiedText}</Lead>
        <div className="mt-6 flex flex-col gap-2.5 lg:mt-9 lg:grid lg:grid-cols-3 lg:gap-5">
          {T.segmente.map((s, i) => {
            const Icon = SEGMENT_ZEICHEN[i] ?? Users;
            return (
              <Kasten key={s.titel} polster="p-5 lg:p-6">
                <Zeichen icon={Icon} />
                <p className="mt-3.5 text-[15px] font-black text-white">{s.titel}</p>
                <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-white/75">{s.text}</p>
              </Kasten>
            );
          })}
        </div>
        {/* DER ZWEITE WEG ZUM FORMULAR: Wer bis hierher gelesen hat und überzeugt ist, soll
            nicht erst durch zwei weitere Abschnitte wischen, um den Knopf zu finden. */}
        <div className="mt-7 lg:mx-auto lg:mt-11 lg:max-w-[340px]">
          <Knopf art="gold" href="#pilot">{T.ctaHaupt}</Knopf>
        </div>
      </Band>

      {/* ── 4b · DIE STUDIE — der Beleg für den Abschnitt darüber ──
          Sie steht bewusst HIER und nicht weiter unten: Direkt davor behaupten wir, auch
          Passive zu erreichen. Eine Behauptung, der sofort die eigene Zahl folgt, liest sich
          anders als eine, die zwei Abschnitte später vielleicht belegt wird.
          KOSTEN, REICHWEITE UND EINZELNE PERSONEN STEHEN NICHT DRIN (siehe lib/joburi-studie.ts):
          Wer erfährt, was uns eine Antwort kostet, zahlt dafür nie wieder einen Preis. */}
      {studie.belastbar && (
        <Band>
          <BalkenTitel>{T.studieTitel}</BalkenTitel>
          <Lead className="lg:max-w-[74ch] lg:text-[15px]">{T.studieText}</Lead>

          {/* Die drei Geldzahlen zuerst — sie sind das, wonach als Erstes gefragt wird. */}
          <div className="mt-6 grid grid-cols-2 gap-2.5 lg:mt-9 lg:grid-cols-3 lg:gap-5">
            {([
              [T.studieJetzt, studie.jetztMedian],
              [T.studieWechsel, studie.wechselMedian],
              [T.studieSprung, studie.sprungMedian],
            ] as [string, number | null][]).filter(([, v]) => v !== null).map(([k, v]) => (
              <Kasten key={k} polster="p-5 lg:p-6">
                <p className="text-[12px] font-black uppercase tracking-[0.1em] text-white/50">{k}</p>
                <p className="mt-2 text-[30px] font-black leading-none tabular-nums text-[#f6cf51] lg:text-[38px]">
                  {v!.toLocaleString("de-DE")} €
                </p>
                <p className="mt-1.5 text-[12px] font-medium text-white/45">{T.studieQuelle}</p>
              </Kasten>
            ))}
          </div>

          {/* DIE ZAHL, DIE EIN ERSTGESPRÄCH ERÖFFNET (Owner 31.08.2026): Sie beantwortet die
              Frage, die vor jeder Kandidatensuche steht — „muss ich mehr zahlen?". Ein
              Portal kann sie nicht beantworten, weil dort niemand danach gefragt wird. */}
          {studie.ohneMehrGeld !== null && (
            <div className="mt-2.5 lg:mt-5">
              <Kasten polster="p-5 lg:p-6">
                <p className="text-[34px] font-black leading-none text-[#f6cf51] lg:text-[46px]">{studie.ohneMehrGeld} %</p>
                <p className="mt-2 text-[15px] font-black leading-snug text-white lg:text-[17px]">{T.studieOhneGeld}</p>
                <p className="mt-1 text-[13.5px] font-medium leading-snug text-white/65">{T.studieOhneGeldText}</p>
              </Kasten>
            </div>
          )}

          {/* Die Anteile — jede Liste entfällt, sobald zu wenig dahintersteht. */}
          <div className="mt-2.5 grid grid-cols-1 gap-2.5 lg:mt-5 lg:grid-cols-2 lg:gap-5">
            {([
              [T.studieSuche, studie.suche, T.studieSuchen],
              [T.studieDeutsch, studie.deutsch, T.studieNiveaus],
              [T.studieBerufe, studie.berufe, T.studieFelder],
              [T.studieAbschluss, studie.abschluss, T.studieAbschluesse],
            ] as [string, { schluessel: string; prozent: number }[], Record<string, string>][])
              .filter(([, liste]) => liste.length > 0)
              .map(([titel, liste, namen]) => (
                <Kasten key={titel} polster="p-5 lg:p-6">
                  <p className="text-[12px] font-black uppercase tracking-[0.1em] text-white/50">{titel}</p>
                  <div className="mt-3 flex flex-col gap-2.5">
                    {liste.map(a => (
                      <div key={a.schluessel} className="flex flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[13.5px] font-bold text-white/85">{namen[a.schluessel] ?? a.schluessel}</span>
                          <span className="shrink-0 text-[13.5px] font-black tabular-nums text-[#f6cf51]">{a.prozent} %</span>
                        </div>
                        {/* Der Balken sagt dasselbe wie die Zahl — aber er sagt es beim
                            Überfliegen, und überflogen wird eine Verkaufsseite immer. */}
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/12">
                          <div className="h-full rounded-full bg-[#f6cf51]" style={{ width: `${a.prozent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Kasten>
              ))}
          </div>

          {/* Die Fallzahl steht nur da, wenn sie für uns spricht — darunter wäre sie ein
              Eigentor (siehe lib/joburi-studie.ts). */}
          {studie.fallzahl !== null && (
            <p className="mt-4 text-[12.5px] font-bold uppercase tracking-[0.1em] text-white/40">
              {studie.fallzahl.toLocaleString("de-DE")} {T.studieFallzahl}
            </p>
          )}
        </Band>
      )}

      {/* ── 5 · WARUM LUXURYBANDIT — zentriert, ohne Balken, auf hellem Band ──
          Er steht hier und nicht oben (Owner: „Nicht im Hero platzieren und nicht wie eine
          Rechtfertigung formulieren."): Wer bis hierher gelesen hat, ist vom Angebot
          überzeugt und fragt sich als Letztes, mit wem er es zu tun hat. */}
      <Band hell>
        <div className="lg:mx-auto lg:max-w-[760px] lg:text-center">
          <MitteTitel>{T.warumTitel}</MitteTitel>
          <p className="mt-3 text-[15px] font-bold leading-relaxed text-white/85">{T.warumLead}</p>
          <p className="mt-3 text-[14px] font-medium leading-relaxed text-white/75">{T.warumText}</p>
          <p className="mt-5 text-[11.5px] font-black uppercase tracking-[0.18em] text-[#f6cf51]">
            {T.warumClaim}
          </p>
        </div>
      </Band>

      {/* ── 6 · SO FUNKTIONIERT ES — vier zentrierte Karten, am Desktop verbunden ──
          ABSICHTLICH ABSTRAKT (siehe Kopf der Datei): vier Sätze, die das Ergebnis
          beschreiben, und keiner, aus dem sich der Weg dorthin nachbauen liesse. */}
      <Band>
        <div id="ablauf" className="scroll-mt-24" />
        <BalkenTitel>{T.ablaufTitel}</BalkenTitel>
        {/* Die gestrichelte Linie liegt HINTER den Karten und nur am Desktop — sie sagt
            „Kette", nicht „vier Angebote". Auf dem Handy stehen die Karten untereinander,
            dort wäre eine waagerechte Linie sinnlos. */}
        <div className="relative mt-6 lg:mt-9">
          <span aria-hidden className="pointer-events-none absolute left-[12%] right-[12%] top-[64px] hidden border-t border-dashed border-white/20 lg:block" />
          <div className="relative flex flex-col gap-3 lg:grid lg:grid-cols-4 lg:gap-5">
            {T.ablauf.map((a, i) => {
              const Icon = ABLAUF_ZEICHEN[i] ?? Briefcase;
              return (
                <Kasten key={a.titel} polster="p-5" className="lg:text-center">
                  <div className="flex items-center gap-3 lg:flex-col lg:gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f6cf51] text-[11px] font-black text-[#1a160f]">
                      {`0${i + 1}`}
                    </span>
                    <Zeichen icon={Icon} />
                  </div>
                  <p className="mt-3.5 text-[14.5px] font-black leading-snug text-white">{a.titel}</p>
                  <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-white/75">{a.text}</p>
                </Kasten>
              );
            })}
          </div>
        </div>
      </Band>

      {/* ── 7 · PILOT — zentriert eingeleitet, das Formular als breite Karte ── */}
      <Band hell>
        <div id="pilot" className="scroll-mt-24" />
        <div className="lg:mx-auto lg:max-w-[760px] lg:text-center">
          <MitteTitel>{T.pilotTitel}</MitteTitel>
          <p className="mt-3 text-[15px] font-medium leading-relaxed text-white/85">{T.pilotText}</p>
          {/* KEINE ZAHL, SONDERN DIE ZUSAGE ZU MESSEN — das ist das Einzige, was sich vor dem
              ersten Piloten ehrlich versprechen lässt. */}
          <Fine>{T.pilotHinweis}</Fine>
        </div>
        <div className="mt-6 lg:mt-10">
          <RecruitingAnfrage T={T} />
        </div>
      </Band>

      {/* Der schlichte Fuss: das gesetzliche Minimum, keine Portal-Werbung. */}
      <SeitenFuss art="schlicht" lang={lang} marke="LB Recruiting" />
    </main>
  );
}
