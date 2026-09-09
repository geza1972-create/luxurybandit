import { Fragment, type ReactNode } from "react";

/**
 * DER NAME SIEHT ÜBERALL GLEICH AUS (Owner 08.09.2026, am Fliesstext: „hier auch").
 *
 * Die Wortmarke ist zweifarbig — „Versus" in der Textfarbe, „Forge" in Gold.
 *
 * GEDREHT AM 08.09.2026 (Owner, mit seinem Bildentwurf des Kämpfers: „ja, dann ändere es du
 * auch"). Vorher war „Versus" gold. Der Entwurf setzt es andersherum, und der Entwurf
 * gewinnt: Ein Bild, das der Owner selbst gebaut hat, ist die Marke — der Code hat ihm zu
 * folgen, nicht umgekehrt.
 *
 * DER PUNKT BLEIBT GOLD. Er gehört zum Logo (Owner 08.09.2026) und schliesst den Namen mit
 * derselben Farbe, in der er endet.
 *
 * WER DAS ÄNDERT, ÄNDERT ES ÜBERALL — Kopf, Fuss, PDF, E-Mail, Kachelbild (Owner: „überall,
 * wo der Name steht"). Im Kopf ist das
 * einfach; im laufenden Satz nicht, denn dort kommt der Name aus einem übersetzten Text, und
 * in einen übersetzten Text darf keine Auszeichnung hinein: Der Übersetzer würde sie
 * zerlegen oder erfinden ([[uebersetzer-fallen]]).
 *
 * DESHALB WIRD NICHT DER TEXT AUSGEZEICHNET, SONDERN BEIM ANZEIGEN GETEILT. Der Markenname
 * ist in allen sieben Sprachen derselbe — er ist die einzige Zeichenfolge, auf die man sich
 * dabei verlassen kann. Wo er steht, ist egal: am Satzanfang wie im Deutschen, in der Mitte
 * wie anderswo.
 *
 * Das Gold färbt sich in der hellen Fassung von selbst ins Haus-Blau um (globals.css,
 * `.lb-fb [class*="text-[#f6cf51]"]`) — nichts davon muss doppelt gepflegt werden.
 *
 * DIE SCHRIFT SETZT DIE MARKE SELBST (Owner 08.09.2026: „du änderst nie die Schriftart von
 * VersusForge").
 *
 * Sie erbt sonst, was um sie herum steht — und einige Stellen im Haus sind Serifenschrift
 * (die Eingabefelder der CI) oder Monospace (der Bauplan). Ein Name, der je nach Nachbarschaft
 * anders aussieht, ist kein Name mehr. `font-sans` und `not-italic` stehen deshalb HIER und
 * nicht bei jedem Aufruf: Wer die Marke benutzt, soll nicht daran denken müssen.
 */
const SCHRIFT = "font-sans not-italic";

const NAME = "VersusForge";

/** Die Wortmarke allein — für Kopfzeilen, mit abschliessendem Punkt wie bei BlackRock. */
/**
 * `akzent` kam am 09.09.2026 dazu (Owner: „Logo raus, Farben anpassen").
 *
 * Auf der hellen Startseite trägt die Seite Blau, nicht Gold — und eine Wortmarke, die als
 * Einzige noch golden leuchtet, sieht aus wie ein vergessener Rest. Die Farbe steht deshalb
 * als Angabe hier statt fest im Zeichen; Gold bleibt der Vorgabewert, es ändert sich also
 * nichts an den Stellen, die nichts mitgeben.
 */
export function Wortmarke({ className = "", akzent = "#f6cf51" }: { className?: string; akzent?: string }) {
  return (
    <span className={`${SCHRIFT} ${className}`}>
      {/* DER PUNKT GEHÖRT INS LOGO (Owner 08.09.2026) — und damit in die Farbe der Marke,
          nicht in die des Textes. Bei BlackRock ist das kleine Zeichen am Ende Teil des
          Zeichens; ein Punkt in Textfarbe sähe aus wie das Satzende dahinter. */}
      Versus<span style={{ color: akzent }}>Forge.</span>
    </span>
  );
}

/**
 * Färbt jedes Vorkommen des Namens in einem fertigen Satz ein.
 *
 * Ohne Punkt am Ende: Im Fliesstext ist der Name Teil eines Satzes und trägt dessen
 * Zeichensetzung — ein zusätzlicher Punkt mitten im Satz sähe aus wie ein Tippfehler.
 */
export function mitMarke(text: string, akzent = "#f6cf51"): ReactNode {
  if (!text || !text.includes(NAME)) return text;
  return text.split(NAME).map((stueck, i) => (
    <Fragment key={i}>
      {i > 0 && (
        <span className={SCHRIFT}>
          Versus<span style={{ color: akzent }}>Forge</span>
        </span>
      )}
      {stueck}
    </Fragment>
  ));
}

/**
 * DIE MARKENZEILE (Owner 08.09.2026, aus seinem eigenen Bildentwurf: „STRATEGY WINS MORE
 * THAN ADS. — das ist mega").
 *
 * SIE SAGT DAS PRODUKT IN FÜNF WÖRTERN: Verkauft wird die Strategie, die Anzeige ist nur
 * ihr Ergebnis. Damit beantwortet sie nebenbei die Frage, an der das Produkt heute Nachmittag
 * fast gescheitert wäre — warum jemand hierher kommt statt zu ChatGPT: Für eine Strategie
 * holt man sich einen Berater, für einen Text nicht.
 *
 * SIE BLEIBT ENGLISCH UND GEHT NICHT DURCH DEN ÜBERSETZER — zwei Gründe, beide praktisch:
 *  · Eine Markenzeile ist Teil des Namens. „Just do it" wird auch nicht übersetzt, und der
 *    Name des Hauses ist ohnehin englisch.
 *  · Der Übersetzer verstümmelt kurze, zugespitzte Sätze zuverlässig ([[uebersetzer-fallen]]).
 *    Was nie durch ihn läuft, kann er nicht kaputtmachen — auf allen sieben Sprachen steht
 *    derselbe Satz.
 *
 * WORTLAUT NICHT ANFASSEN. Er ist vom Owner, nicht formuliert, sondern gefunden.
 */
export const MARKENZEILE = "Strategy wins more than ads.";

/**
 * DER BESCHREIBER (Owner 08.09.2026: „VersusForge — The Strategy Machine").
 *
 * ZWEI ZEILEN, ZWEI AUFGABEN — und sie stehen bewusst NICHT untereinander:
 *  · `BESCHREIBER` sagt, WAS es ist. Er steht auf der Seite unter der Wortmarke.
 *  · `MARKENZEILE` sagt, WARUM. Sie steht auf der Schlusstafel der Anzeige.
 *
 * Untereinander gesetzt wiederholen beide das Wort „Strategy" und heben sich gegenseitig
 * auf. Getrennt trifft jede einmal.
 *
 * ENGLISCH UND OHNE ÜBERSETZER, aus demselben Grund wie die Markenzeile: Es ist Teil des
 * Namens, und was nie übersetzt wird, kann der Übersetzer nicht verstümmeln.
 */
/**
 * GEÄNDERT AM 09.09.2026 (Owner: „VersusForge. Marketing Engine").
 *
 * Vorher: „The Strategy Machine". Der Weg dahin ging über „Marketing Tool" (verworfen) und
 * „Werbeberater" (kurz angenommen, dann verworfen) — beide beschrieben eine Kategorie, in
 * die man einsortiert wird. „Engine" beschreibt, was das Ding TUT: Es läuft und produziert.
 * Und es passt zu dem Satz, der seit dem 08.09. gilt: VersusForge ist die Engine von
 * LuxuryBandit.
 */
export const BESCHREIBER = "Marketing Engine";

/** Was unter der Wortmarke steht: der Beschreiber, nicht die Markenzeile. */
export function Markenzeile({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[12px] font-black uppercase tracking-[0.22em] text-white/45 ${className}`}>
      {BESCHREIBER}
    </p>
  );
}

/**
 * DAS LOGO — KOPF PLUS WORTMARKE (Owner 08.09.2026: „hier links" · „ja, das ist auch das
 * Logo" · „die Leute wissen nicht, wer er ist").
 *
 * EIN GESICHT UND EIN NAME ZUSAMMEN SIND EINE PERSON. Ein Roboter allein ist eine
 * Illustration, die niemand einordnet — genau das war der Einwand. Dieselbe Lösung wie bei
 * David: Man lernt in einer Sekunde, wer da spricht.
 *
 * EIN BAUSTEIN, NICHT ZWEI NEBENEINANDER GESETZTE TEILE (Hausregel `ci-bibliothek`): Kopf,
 * Ring, Abstand und Grösse gehören zusammen. Wer sie an jeder Stelle neu zusammenstellt, hat
 * nach drei Seiten drei verschiedene Logos.
 *
 * DER RING KOMMT AUS CSS, nicht aus dem Bild: So bleibt das Bild ein schlichter Ausschnitt
 * (9 KB) und der Ring folgt der Marke, wenn sich das Gold je ändert.
 */
export function Logo({ className = "", gross = false }: { className?: string; gross?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/VersusForge/kaempfer-kopf.webp"
        alt=""
        aria-hidden
        className={`shrink-0 rounded-full object-cover ring-2 ring-[#f6cf51]/70 ${gross ? "h-16 w-16" : "h-11 w-11 md:h-12 md:w-12"}`}
      />
      <div className="min-w-0">
        <Wortmarke className={gross ? "block text-[30px] font-black leading-none tracking-[-0.02em] md:text-[38px]" : ""} />
        <Markenzeile className="mt-1" />
      </div>
    </div>
  );
}
