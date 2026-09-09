"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BESCHREIBER, Wortmarke, mitMarke } from "@/components/VersusForgeMarke";
import { Check } from "lucide-react";
import { logFunnelEvent, logTunnelEvent } from "@/lib/track-funnel";
import { schrittMessen } from "@/lib/versusforge-messen";
import VersusForgeFunnel from "@/components/VersusForgeFunnel";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";
import { HEBEL } from "@/lib/versusforge-hook-rezept";

/**
 * EIN BEISPIELSTAND FÜR DIE ARBEITSANZEIGE — kein echter Kunde, keine echte Analyse.
 *
 * ES IST ABSICHTLICH KEIN VOLLES BILD: Vier von fünf Balken voll wäre Werbung für ein
 * Ergebnis. Ein Stand mitten in der Arbeit zeigt das, worum es geht — die Maschine sucht
 * noch, und deshalb fragt sie.
 *
 * Die Namen stehen nicht hier, sondern kommen aus dem Rezept (`schritt`): eine Quelle für
 * Trichter und Startseite.
 */
const ARBEIT_BEISPIEL: [string, number][] = [
  ["zweck", 80],
  ["geschichte", 45],
  ["identitaet", 20],
  ["beweis", 10],
  ["knappheit", 0],
];
import type { VersusForgeTexte } from "@/lib/versusforge-texte";

/**
 * DIE EINFACHE STARTSEITE (Owner 09.09.2026: „die Seite von VersusForge mag ich nicht" ·
 * „ich mag die Seite vom Zahnarzt" · „ich will es genauso").
 *
 * SIE IST DIE MANDANTENSEITE IN UNSEREN FARBEN. Derselbe Bau, dieselbe Reihenfolge:
 * Kopf mit dem Namen · eine Überschrift · ein Satz · Karten zum Antippen · ein Knopf · und
 * darunter, was der Besucher bekommt. Wer beide nebeneinanderlegt, sieht ein Bauwerk,
 * zweimal eingefärbt — und genau das ist die Aussage des Produkts.
 *
 * WAS DAFÜR WEGGEFALLEN IST: der Spot, die Argumentenliste, der Versus-Block, der
 * Was-ist-das-Block, das Beispiel-Dashboard, die Beispielrechnung. Sechs Abschnitte, durch
 * die sich niemand liest, bevor er anfängt — und jeder davon schob den Knopf weiter aus dem
 * Bild (Hausregel `cta-im-viewport-template`).
 *
 * WAS GEBLIEBEN IST, WEIL ES GEBRAUCHT WIRD: das Eingabefeld (bei uns tippt jemand seinen
 * Satz — anders als der Patient beim Zahnarzt, der nur antippt), die Sprachen, die Messung
 * und die Ablage für den Trichter.
 *
 * HELL UND IN DEN FARBEN DES ZAHNARZTES (Owner 09.09.2026: „nein, genauso in hell, und genau
 * so fängt es an wie beim Zahnarzt" · „dieselben Farben wie beim Zahnarzt").
 *
 * GOLD STEHT NUR NOCH IN DER WORTMARKE. Das ist eine Ansage, keine Kleinigkeit: Bis heute
 * war Gold die Farbe der ganzen Seite. Der Owner will hier dieselbe Palette wie beim
 * Mandanten — Weiss, Grau, Schwarz, ein ruhiges Blau. Was übrig bleibt und die Marke trägt,
 * ist das Zeichen selbst: „Versus" dunkel, „Forge." gold.
 *
 * UND DIESELBE TYPO (Owner 09.09.2026: „die selbe Typo"): 28/34 px Überschrift in
 * `font-extrabold`, 16 px Fliesstext, 16 px auf den Karten, 17 px im Knopf, 14 px im
 * Kleingedruckten. Nicht ähnlich — dieselben Zahlen wie in `MandantTrichter`. Sonst sind es
 * zwei Seiten, die sich gleichen wollen, und man sieht ihnen an, dass sie es nicht sind.
 *
 * DAMIT FÄLLT MEINE ANNAHME VON HEUTE VORMITTAG — ich hatte Schwarz für uns behalten. Der
 * Owner hat recht: Wenn beide Seiten dasselbe Bauwerk sein sollen, gehört auch dieselbe
 * Helligkeit dazu. Was die Marke trägt, ist das Gold in Wortmarke, Etiketten und Knopf —
 * nicht der schwarze Grund.
 *
 * DIE ALTE FASSUNG LIEGT UNANGETASTET IN `VersusForgeStart.tsx` — es ist ein Vorschlag
 * daneben, keine Löschung.
 */

const ABLAGE = "vf_auftrag";

/** Die vier Beispiele als Chips — nur der Satz, die Branche steht ohnehin darin. */
const KARTEN: { k: keyof VersusForgeTexte; z: "leads" | "verkauf" }[] = [
  { k: "bsp3", z: "verkauf" },
  { k: "bsp1", z: "leads" },
  { k: "bsp6", z: "verkauf" },
  { k: "bsp8", z: "verkauf" },
];

/**
 * Ein Listenpunkt: Stichwort fett, Zusatz grau — getrennt durch einen senkrechten Strich in
 * der Textdatei. Ohne Strich steht nur das Stichwort da, das ist ebenfalls erlaubt.
 */
function Punkt({ zeile }: { zeile: string }) {
  const [wort, zusatz] = String(zeile).split("|");
  return (
    <li className="flex gap-3 text-[16px] leading-[1.45] text-[#14181c]">
      {/* HÄKCHEN STATT PUNKT (Owner 09.09.2026: „mit Häkchen statt Bulletpoints"). Ein Punkt
          zählt auf, ein Häkchen bestätigt — und in beiden Listen steht Erledigtes: Das eine
          hat er schon, das andere bekommt er. Symbol aus lucide, kein Emoji (Hausregel). */}
      <Check className="mt-[3px] h-[18px] w-[18px] shrink-0 text-[#1d6fd0]" aria-hidden />
      <span>
        <b className="font-extrabold">{wort}</b>
        {zusatz ? <span className="text-[#5b666f]"> — {zusatz}</span> : null}
      </span>
    </li>
  );
}

export default function VersusForgeStartEinfach({
  S, lang, probe = false, basis = "/",
}: { S: VersusForgeTexte; lang: string; probe?: boolean; basis?: string }) {
  const router = useRouter();
  const [ziel, setZiel] = useState<"leads" | "verkauf">("leads");
  const [text, setText] = useState("");
  /** Sobald der erste Satz steht, läuft das Gespräch an DIESER Stelle weiter. */
  const [auftrag, setAuftrag] = useState<{ ziel: "leads" | "verkauf"; text: string } | null>(null);
  const [fehler, setFehler] = useState("");

  const hier = (extra: string) => {
    const teile = [probe && basis === "/" ? "vf=1" : "", extra].filter(Boolean).join("&");
    return teile ? `${basis}?${teile}` : basis;
  };

  /* Kommt jemand aus dem Trichter zurück, weil dort etwas schiefging, steht der Grund an
     dem Feld, in das er geschrieben hat — nicht auf einem Schirm, den er nicht mehr sieht. */
  useEffect(() => {
    try {
      const f = sessionStorage.getItem("vf_fehler");
      if (f) { sessionStorage.removeItem("vf_fehler"); setFehler(f); }
      /**
       * SEIN SATZ STEHT WIEDER IM FELD (Owner 09.09.2026: „die erste Eingabe speichern wir
       * doch auch").
       *
       * Wer im Trichter auf „Zurück" tippt, kommt hierher — und sah bis eben ein leeres
       * Feld. Zwei, drei Sätze über sein Geschäft tippt niemand zweimal; der Zurück-Weg war
       * damit in Wahrheit ein Abbruch.
       *
       * DER TRICHTER LEGT IHN AB (`vf_zurueck` in VersusForgeFunnel), und hier wird er
       * gelesen und sofort weggeräumt: Er gilt für diesen einen Rückweg, nicht für den
       * nächsten Besuch — sonst begänne ein neuer Lauf mit einem alten Satz.
       */
      const zurueck = sessionStorage.getItem("vf_zurueck");
      if (zurueck) { sessionStorage.removeItem("vf_zurueck"); setText(zurueck); }
    } catch { /**/ }
  }, []);

  const start = () => {
    /**
     * KEINE PRÜFUNG MEHR AM EINGANG (Owner 09.09.2026, nach seinem Test mit „hallo":
     * „meinst du das?").
     *
     * ER HAT MICH BEI EINEM WIDERSPRUCH ERWISCHT. Ich baue den ganzen Trichter zum Gespräch
     * um — und lasse davor einen Formular-Prüfer stehen, der „hallo" mit einer roten Zeile
     * abweist. In einem Chat antwortet man auf „hallo". Genau dieses Zurückweisen ist das
     * Verhalten, wegen dem er sein eigenes Werkzeug nicht benutzt.
     *
     * WER DAS ABFÄNGT: der Agent selbst. Ein Gruss bekommt einen Gruss und eine Frage
     * zurück, Tastaturgeklapper bekommt eine ruhige Bitte um einen Satz. Beides ist ein
     * kleiner Aufruf und wird vom Deckel je Gerät begrenzt — dieselbe Bremse wie überall.
     *
     * NUR LEER GEHT NICHT: Aus nichts kann auch ein Gespräch nichts machen.
     */
    if (!text.trim()) { setFehler(S.feldZuKurz); return; }
    setFehler("");
    try { sessionStorage.setItem(ABLAGE, JSON.stringify({ ziel, text: text.trim(), url: "" })); } catch { /**/ }
    void logTunnelEvent("funnel_started", "versusforge");
    void logFunnelEvent("vf_start", { theme: "versusforge", ziel, ueber: "wurzel" });
    /* SPROSSE EINS: die Startseite. Sie ist der Nenner der ganzen Leiter — ohne sie weiss
       niemand, ob von zehn Besuchern acht angefangen haben oder von tausend achtzehn.
       Hier und nicht beim Laden der Seite: Gemessen wird der Mensch, der etwas geschrieben
       hat und weitergeht; ein Bot, der die Startseite abruft, ist kein Besucher. */
    schrittMessen(EIGENER_MANDANT, "seite");
    /**
     * KEIN SEITENWECHSEL MEHR (Owner 09.09.2026: „bei VersusForge müsste sich ein Chat
     * öffnen und alles lösen" · „ein Chat wie Claude hier" · „sieht das aus wie ein Chat?").
     *
     * HIER STAND `router.push("/engine/start")`. Das war der letzte Formular-Rest und der
     * grösste: Feld ausfüllen, Knopf drücken, neue Seite. Ein Chat wechselt keine Seite —
     * man tippt, und es antwortet an derselben Stelle, unter dem, was man geschrieben hat.
     * Solange dieser Sprung drin war, konnte das Ding aussehen wie es wollte; es war ein
     * Formular.
     */
    setAuftrag({ ziel, text: text.trim() });
  };

  return (
    /* `lb-versusforge` OHNE `lb-bg`: Die Klasse blendet über `globals.css` die Haus-Leiste
       aus (die runde Schaltfläche unten rechts gehört LuxuryBandit, nicht hierher). Den
       schwarzen Grund bringt erst das zweite `lb-bg` mit — den wollen wir hier nicht. */
    /* `h-[100dvh]` sobald der Chat läuft: Die Fläche gehört dann dem Gespräch, und die
       Eingabeleiste klebt am unteren Rand des BILDSCHIRMS, nicht am Ende einer Seite, die
       weiterscrollt. Ohne Chat bleibt es `min-h-screen` — die Verkaufsseite darf lang sein. */
    <main className={`lb-versusforge flex flex-col bg-white text-[#14181c] ${
      auftrag ? "h-[100dvh] overflow-hidden" : "min-h-screen"}`}>
      {/* Der Kopf trägt NUR den Namen und die Sprachen. Kein Menü — es gibt nichts, wohin
          man von hier aus wollte, ausser anzufangen. */}
      <header className="border-b border-[#dfe4e9] px-5 py-4">
        <div className="mx-auto flex w-full max-w-[620px] items-center justify-between gap-3">
          {/* NUR DIE WORTMARKE, KEIN ROBOTERKOPF (Owner 09.09.2026: „Logo raus, Farben
              anpassen"). Beim Zahnarzt steht oben sein Name und sonst nichts — ein Bild
              daneben ist auf dieser Seite Schmuck, und Schmuck kostet die Höhe, die der
              Knopf braucht. */}
          <span className="min-w-0">
            <Wortmarke className="block text-[21px] font-black leading-none tracking-[-0.02em] text-[#14181c]" akzent="#1d6fd0" />
            {/* Der Beschreiber sagt, WAS es ist — gesperrt und klein, wie die Zeile unter
                dem Namen einer Praxis. Kein `p` im `p`: das kostete am 08.09. schon einmal
                einen Hydration-Fehler. */}
            <span className="mt-1.5 block text-[9px] font-black uppercase tracking-[0.3em] text-[#8b959d]">
              {BESCHREIBER}
            </span>
          </span>
          <div className="flex items-center gap-1.5">
            {(["de", "en", "ro"] as const).map(l => (
              <a key={l} href={hier(`lang=${l}`)}
                className={`rounded-full px-2.5 py-1 text-[12px] font-black uppercase tracking-wider transition ${
                  lang.slice(0, 2) === l ? "bg-[#1d6fd0] text-white" : "border border-[#dfe4e9] text-[#5b666f] hover:text-[#14181c]"}`}>
                {l}
              </a>
            ))}
          </div>
        </div>
      </header>

      {/**
        * LÄUFT DAS GESPRÄCH, IST DIE SEITE DER CHAT (Owner 09.09.2026: „sieht das aus wie ein
        * Chat?" · „du machst mir ein Chat wie WA" · „wie ChatGPT").
        *
        * Überschrift, Feld, Beispiele und die drei Verkaufsblöcke sind das Schaufenster.
        * Sobald der erste Satz steht, ist er im Laden — und dann ist alles, was noch
        * verkauft, im Weg. Ein Chat, unter dem eine Werbeseite weiterscrollt, ist kein Chat.
        *
        * VOLLE HÖHE, EINGABE UNTEN: Genau so sieht jeder Chat aus, den er kennt. Die Fläche
        * gehört dem Gespräch, nicht der Seite.
        */}
      {auftrag ? (
        <div className="mx-auto flex w-full max-w-[820px] flex-1 flex-col px-4 pb-4 pt-4">
          <VersusForgeFunnel S={S} lang={lang} auftrag={auftrag} />
        </div>
      ) : (
      <div className="mx-auto w-full max-w-[620px] flex-1 px-5 pb-12 pt-7 md:pt-13">
        {/**
          * DER HOOK IST DIE ÜBERSCHRIFT (Owner 09.09.2026: „das ist der Hook jetzt und dann
          * ein Eingabefeld drunter").
          *
          * NUR DIE ERSTE ZEILE. `hookFrage2` trägt den langen Nachsatz („Hier fängt es mit
          * der Anzeige an — die Strecke dahinter entsteht daraus") und steht weiter auf der
          * alten Seite. Fünf Zeilen Überschrift schoben den Knopf aus dem Bild; genau das
          * unterscheidet unsere Seite von der des Zahnarztes, wo zwei Zeilen stehen.
          *
          * UND ES IST DER BESSERE HOOK: Er benennt einen Zustand, den der Leser schon hat
          * und für normal hält — genau die Regel aus `versusforge-hook-rezept.ts`.
          */}
        {/**
          * DIE ÜBERSCHRIFT MUSS SELBST WIE EIN HOOK AUSSEHEN (Owner 09.09.2026: „das muss
          * gross, fett und wie ein Hook schon aussehen").
          *
          * ER HAT RECHT, UND ES IST MEHR ALS GESCHMACK: Auf dieser Seite verkaufen wir
          * Hooks. Steht der eigene in derselben Grösse da wie eine Zwischenüberschrift, ist
          * das der erste Gegenbeweis, den ein Besucher sieht — noch bevor er ein Wort gelesen
          * hat.
          *
          * 34/48 px in `font-black`, enge Sperrung, dichte Zeilen — dieselbe Anmutung wie auf
          * dem Anzeigenbild, das er am Ende bekommt. Zwei Stellen, eine Handschrift.
          */}
        <h1 className="m-0 text-[34px] font-black leading-[1.05] tracking-[-0.04em] md:text-[48px]">
          {S.hookFrage}
          {/* Zweifarbig wie jede H1 im Haus: der Zustand dunkel, der Ausweg im Akzent. */}
          <span className="block text-[#1d6fd0]">{S.einfachTitel2}</span>
        </h1>
        {/* KEIN ERKLÄRSATZ UNTER DEM HOOK (Owner 09.09.2026: „das raus"). Er wiederholte,
            was die Karten und der Block „Was du bekommst" ohnehin sagen — und schob das
            Eingabefeld nach unten. Der Hook, dann das Feld. Sonst nichts dazwischen. */}

        {/* Das Feld bleibt — bei uns tippt jemand seinen Satz. Die Karten darunter füllen es,
            für alle, die lieber antippen als schreiben. */}
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); if (fehler) setFehler(""); }}
          rows={3}
          placeholder={S.einfachPlatzhalter}
          /* BLAUE UMRANDUNG (Owner 09.09.2026). Das Feld ist die eine Stelle, an der etwas
             passieren soll — mit grauem Rand sah es aus wie ein Kasten mit Text darin, nicht
             wie ein Feld, in das man schreibt. */
          className="mt-5 w-full resize-none rounded-xl border-[1.5px] border-[#1d6fd0] bg-white px-4 py-3.5 text-[16px] font-semibold text-[#14181c] placeholder:text-[#8b959d] outline-none focus:border-[#1d6fd0]"
        />
        {fehler && <p className="mt-2 text-[14.5px] font-bold text-[#c02626]">{fehler}</p>}

        <button
          type="button"
          onClick={start}
          className="mt-5 w-full rounded-xl bg-[#1d6fd0] px-5 py-4 text-[17px] font-extrabold text-white active:scale-[.99] md:w-auto md:min-w-[280px] md:px-10"
        >
          {S.hookKnopf}
        </button>

        {/* DIE KARTEN UNTER DEN KNOPF (Owner 09.09.2026: „und die sollen unter dem Button
            stehen").
            Und es stimmt auch inhaltlich: Wer schon weiss, was er will, tippt oben und
            drückt. Die Karten sind für den, der es NICHT weiss — der liest weiter, und dort
            findet er sie. Vorher standen sie zwischen Feld und Knopf und schoben genau den
            Knopf nach unten, den der Entschlossene sucht. */}
        {/**
          * ALS CHIPS, OHNE BLAUE SCHRIFT (Owner 09.09.2026: „die als Chips ohne blaue
          * Schrift").
          *
          * HEUTE VORMITTAG WAREN CHIPS FALSCH („zu klein und zu blass") — aber das war auf
          * schwarzem Grund in 12 px Grau. Auf Weiss in 15 px mit dunkler Schrift stimmt der
          * Kontrast, und die kleinere Form passt besser unter den Knopf: Sie sind ein
          * Angebot, kein zweiter Weg.
          *
          * DIE BRANCHEN-ETIKETTEN SIND MIT WEG. Sie waren die blaue Schrift — und in einer
          * Zeile wie „Ich bin Zahnarzt und biete Implantate" steht die Branche ohnehin drin.
          *
          * AUSWAHL VERSCHIEBT NIE (CI): gleiche Rahmenstärke und Polsterung in beiden
          * Zuständen, es wechselt ausschliesslich die Farbe.
          */}
        {/**
          * ── SIE SIND NICHT MEHR ANTIPPBAR (Owner 09.09.2026) ─────────────────────────────
          *
          * „Ich tendiere fast, dass ich die unteren nicht als Chips mache, sonst kommen
          * wieder die Faulen und klicken nur bis zum nächsten. Die brauche ich nicht." ·
          * „Da können nur Beispiele stehen, aber nicht zum Übernehmen."
          *
          * ER HAT RECHT, UND ES IST HEUTE BEWEISBAR GEWORDEN. Seit die Maschine fünf Hebel
          * aus SEINEN Angaben füllt, ist ein übernommener Fremdsatz das Gegenteil von einer
          * Eingabe: Alle fünf Stände bleiben unten, der Plan wird eine Hülse, und der Hook
          * ist der, den er heute im Dashboard gesehen hat. Ein Klick, der zwei Modellaufrufe
          * kostet und garantiert nichts Brauchbares ergibt.
          *
          * WARUM SIE TROTZDEM STEHEN BLEIBEN: Der Owner stand am 08.09. selbst vor dem
          * leeren Feld und fragte „was soll ich schreiben?". Beispiele beantworten das —
          * sie zeigen die FORM, nicht den Inhalt. Genau die Trennung, die er verlangt:
          * lesen ja, übernehmen nein.
          *
          * DIE HAUSREGEL [[chat-no-personal-questions-buttons-only]] („der Nutzer will
          * klicken, nicht tippen") gilt hier bewusst NICHT. Sie stammt von Besuchern, die
          * ein Geschenk kaufen; hier sitzt ein Unternehmer, der sein Geschäft beschreibt,
          * und was er tippt, IST das Produkt. Ein Klick kann das nicht ersetzen.
          *
          * KEINE KNÖPFE, KEIN `hover`, KEIN CURSOR: Was aussieht wie ein Knopf, wird
          * angetippt — auch wenn nichts passiert, und dann ist die Seite kaputt.
          */}
        <div className="mt-5">
          <p className="text-[13.5px] font-bold uppercase tracking-[0.12em] text-[#8b959d]">
            {S.bspTitel}
          </p>
          <ul className="mt-2.5 flex list-none flex-col gap-1.5 p-0">
            {KARTEN.map(({ k }) => {
              const satz = String(S[k] ?? "");
              if (!satz) return null;
              return (
                <li key={k} className="text-[15px] leading-[1.45] text-[#5b666f]">
                  <span aria-hidden="true" className="mr-2 text-[#c3ccd4]">–</span>
                  {satz}
                </li>
              );
            })}
          </ul>
        </div>



        {/* KEIN SATZ UNTER DEM KNOPF (Owner 09.09.2026: „raus"). Er versprach dasselbe, was
            der Block „Was du bekommst" gleich darunter ausführlich sagt — zweimal derselbe
            Inhalt in zwölf Zeilen Abstand. Der Knopf schliesst den oberen Teil ab. */}

        {/**
          * DREI BLÖCKE, IN DIESER REIHENFOLGE (Owner 09.09.2026: „zwei Boxen, beide mit
          * Überschrift" · „das ist extra und kommt als letztes").
          *
          *  1. Was du bekommst — kostenlos
          *  2. Was du kaufen kannst
          *  3. Was VersusForge überhaupt IST
          *
          * DIE DEFINITION KOMMT ZULETZT, und das ist die richtige Reihenfolge: Wer aus einer
          * Anzeige kommt, will wissen, was er DAVON hat — nicht, was das Ding ist. Die
          * Erklärung liest, wer nach den zwei Listen immer noch da ist.
          *
          * WEISSE KARTEN MIT SCHATTEN (Owner 09.09.2026: „ich hätte gerne statt schwarze
          * Boxen weisse mit Schatten auf der Seite").
          *
          * Schwarz war heute Mittag richtig, als der Block am Seitenende unterzugehen drohte.
          * Jetzt sind es drei Kästen hintereinander — dreimal Schwarz macht aus einer hellen
          * Seite eine dunkle mit weissen Rändern. Der Schatten hebt sie genauso heraus, ohne
          * die Seite zu kippen, und die Schrift bleibt dieselbe wie überall sonst.
          */}
        <section className="mt-12 rounded-2xl bg-white p-6 shadow-[0_10px_34px_rgba(20,24,28,.10)] md:p-7">
          <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.02em]">{S.bekommtTitel}</h2>

          <ul className="mt-5 grid list-none gap-3 p-0">
            {[S.aboutListe1, S.aboutListe2, S.aboutListe3, S.aboutListe4, S.aboutListe5]
              .filter(Boolean)
              .map(z => <Punkt key={z} zeile={z} />)}
          </ul>

          <p className="mt-5 text-[17px] font-extrabold text-[#1d6fd0]">{S.aboutGratis}</p>
        </section>

        <section className="mt-3 rounded-2xl bg-white p-6 shadow-[0_10px_34px_rgba(20,24,28,.10)] md:p-7">
          <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.02em]">{S.aboutKaufTitel}</h2>
          {/* Der Satz sagt, was schon da ist — sonst liest sich die Liste wie ein zweites
              Angebot statt wie das fehlende Stück. */}
          <p className="mt-2.5 text-[16px] font-bold leading-[1.5] text-[#14181c]">{S.aboutKaufLead}</p>

          <ul className="mt-5 grid list-none gap-3 p-0">
            {[S.aboutKauf1, S.aboutKauf2, S.aboutKauf3, S.aboutKauf4].filter(Boolean).map(z => (
              <Punkt key={z} zeile={z} />
            ))}
          </ul>

          <p className="mt-5 text-[17px] font-extrabold text-[#1d6fd0]">{S.aboutKaufPreis}</p>
          {/* DIE TRENNUNG GEHÖRT DAZU: Ohne diesen Satz liest sich das Budget wie ein Preis,
              den wir verlangen. */}
          <p className="mt-4 text-[13.5px] leading-[1.5] text-[#7d8791]">{S.aboutDrei}</p>
        </section>

        {/* DAS BEISPIEL — vor der Erklärung, nach den zwei Angeboten. Wer die Listen gelesen
            hat, will sehen, ob es stimmt; wer es gesehen hat, braucht die Definition
            vielleicht gar nicht mehr. */}
        {/* WEISS MIT SCHATTEN, KEIN RAHMEN, KEIN BABYBLAU (Owner 09.09.2026). Ein hellblauer
              Kasten neben drei weissen sieht aus, als wäre er wichtiger — ist er nicht, er ist
              nur ein Beispiel. Der Schatten reicht; alle vier Kästen tragen jetzt dieselbe
              Form. */}
        <section className="mt-3 rounded-2xl bg-white p-6 shadow-[0_10px_34px_rgba(20,24,28,.10)] md:p-7">
          <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.02em] text-[#14181c]">{S.beispielTitel}</h2>
          <p className="mt-2.5 text-[16px] leading-[1.5] text-[#5b666f]">{S.beispielText}</p>
          <a
            href="/versusforge/beispiel/anzeige"
            className="mt-4 inline-block rounded-xl bg-[#1d6fd0] px-6 py-3.5 text-[16px] font-extrabold text-white"
          >
            {S.beispielKnopf}
          </a>
        </section>

        {/* Die Erklärung — extra und zuletzt. */}
        <section className="mt-3 rounded-2xl bg-white p-6 shadow-[0_10px_34px_rgba(20,24,28,.10)] md:p-7">
          <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.02em]">{mitMarke(S.aboutTitel, "#1d6fd0")}</h2>
          <p className="mt-2.5 text-[16px] font-bold leading-[1.5] text-[#14181c]">{S.aboutEins}</p>

          {/**
            * WIE SIE ARBEITET (Owner 09.09.2026: „das kannst du eventuell sagen unter Was ist
            * VersusForge, wie die Maschine arbeitet").
            *
            * DAS EINZIGE STÜCK DER SEITE, DAS ZEIGT STATT BEHAUPTET. „KI-gestützte
            * Werbetexte" schreibt jeder hin; hier sieht man, dass etwas Bestimmtes gesucht
            * wird — und dass es noch fehlt. Genau das trennt eine Maschine von einem
            * Formular.
            *
            * ES IST DIE ARBEITSANZEIGE, NICHT DAS REZEPT: unsere eigenen Namen, die Formel
            * bleibt drinnen. Und die Zahlen sind als Beispiel gekennzeichnet — ohne den
            * Hinweis läse es sich wie eine echte Analyse.
            */}
          <div className="mt-6 border-t border-[#eef1f4] pt-5">
            <h3 className="m-0 text-[17px] font-extrabold tracking-[-0.01em]">{S.arbeitTitel}</h3>
            <p className="mt-2 text-[15px] leading-[1.5] text-[#5b666f]">{S.arbeitText}</p>

            <div className="mt-4 flex flex-col gap-2 rounded-xl bg-[#f5f7f9] p-4">
              {ARBEIT_BEISPIEL.map(([schluessel, wert]) => {
                const name = HEBEL.find(h => h.schluessel === schluessel)?.schritt ?? "";
                /* „Dran" ist der erste noch schwach gefüllte — dieselbe Hervorhebung wie im
                   Trichter, damit die Seite zeigt, was er dort wiedersieht. */
                const dran = schluessel === "beweis";
                return (
                  <div key={schluessel} className="flex items-center gap-3">
                    <span className={`w-[80px] shrink-0 text-[13.5px] font-bold ${dran ? "text-[#1d6fd0]" : "text-[#5b666f]"}`}>
                      {name}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#dfe4e9]">
                      <span className={`block h-full rounded-full ${dran ? "bg-[#1d6fd0]" : "bg-[#9aa6b1]"}`}
                        style={{ width: `${wert}%` }} />
                    </span>
                    <span className={`w-[38px] shrink-0 text-right text-[13.5px] font-bold ${dran ? "text-[#1d6fd0]" : "text-[#8b959d]"}`}>
                      {wert}%
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2.5 text-[13.5px] font-semibold text-[#8b959d]">{S.arbeitBeispiel}</p>
          </div>
        </section>
      </div>
      )}

      <footer className="border-t border-[#dfe4e9] px-5 pb-6 pt-4">
        <div className="mx-auto flex w-full max-w-[620px] flex-wrap items-center gap-2 text-[14px] text-[#5b666f]">
          {/* DREI LINKS, IN DIESER REIHENFOLGE (Owner 09.09.2026: „About, Impressum,
              Datenschutz"). */}
          <a href="/about" className="hover:text-[#14181c]">{S.fussAbout}</a>
          <span aria-hidden="true">·</span>
          <a href="/imprint" className="hover:text-[#14181c]">{S.fussImpressum}</a>
          <span aria-hidden="true">·</span>
          <a href="/privacy" className="hover:text-[#14181c]">{S.fussDatenschutz}</a>
          <span className="basis-full md:ml-auto md:basis-auto">{S.wasVon}</span>
        </div>
      </footer>
    </main>
  );
}
