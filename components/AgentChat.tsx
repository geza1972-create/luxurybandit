"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Wrench } from "lucide-react";
import { Wortmarke, Zeichen } from "@/components/VersusForgeMarke";
import SprachKnopf from "@/components/SprachKnopf";
import { LANGS, LANG_LABEL, LANG_COOKIE, type Lang } from "@/lib/lang";
import type { AgentChatTexte } from "@/lib/agent-chat-texte";

/**
 * DER AGENT ALS CHAT — der Prototyp auf dem Zweig `agent` (Owner 09.09.2026).
 *
 * ── WAS MAN HIER SEHEN SOLL ────────────────────────────────────────────────────────────────
 *
 * Nicht die Gestaltung — die ist dieselbe wie auf `main`. Sondern DASS DER AGENT ETWAS TUT:
 * Er liest eine Website, weil eine Adresse fiel. Er prüft einen Hook, bevor er ihn vorschlägt.
 * Er baut das Bild, sobald der Satz steht. Niemand drückt dafür einen Knopf, und in keiner
 * Zeile Code steht, in welcher Reihenfolge das passiert.
 *
 * DESHALB DIE WERKZEUGZEILE unter den Nachrichten: Sie zeigt, was er gerade benutzt hat. Für
 * einen Kunden würde sie später verschwinden — hier ist sie der Beweis.
 *
 * WAS ER NOCH NICHT KANN: Plan bauen, Trichter anlegen, Mail verschicken, Anfragen zählen.
 * Alle vier Funktionen existieren; sie kommen dazu, wenn die Schleife trägt. Drei Werkzeuge
 * sind ein Beweis, zehn wären ein Umbau vor der Abnahme.
 *
 * ── KEIN SATZ MEHR IN DIESER DATEI ─────────────────────────────────────────────────────────
 *
 * Alles Gesprochene steht in `lib/agent-chat-texte.ts` und kommt übersetzt herein. Der Grund
 * steht dort; hier zählt die Folge: Wer einen Satz ändern will, ändert ihn an EINER Stelle
 * und in allen drei Sprachen zugleich.
 */

type Nachricht = {
  rolle: "mensch" | "agent";
  text: string;
  benutzt?: string[];
  bild?: string;
  /** Mehrere Kacheln untereinander — die Vorführung am Anfang. */
  bilder?: string[];
  vorschlaege?: string[];
  /** Die Sprachfrage — sie trägt keine Chips, sondern die Sprachen als Knöpfe. */
  sprachfrage?: boolean;
};

/**
 * ── DIE SPRACHFRAGE STEHT AUF ENGLISCH (Owner 09.09.2026: „er kann gleich damit anfangen,
 * welche Sprache er spricht — auf Englisch? Choose a language") ─────────────────────────────
 *
 * DIE BEGRÜNDUNG IST EINE ABZÄHLUNG: Diese eine Zeile muss jemand lesen können, dessen
 * Sprache wir noch NICHT kennen. Auf Deutsch gestellt, verliert sie den Rumänen; auf
 * Rumänisch den Deutschen. Englisch ist die einzige, die in dieser Runde fast jeder
 * entziffert — und wer sie nicht liest, erkennt trotzdem seine Sprache auf dem Knopf
 * darunter, weil dort „Română" steht und nicht „Rumänisch".
 *
 * DREI WÖRTER, KEIN SATZ. Was vor der Sprachwahl steht, wird nicht gelesen, sondern erkannt.
 */
const SPRACHFRAGE = "Choose a language";

/**
 * ── ER DARF DIE SPRACHE AUCH TIPPEN (Owner 09.09.2026, mit Bild: er schrieb „Polish", und
 * der Agent fragte zurueck, ob er einen Text polieren solle) ────────────────────────────────
 *
 * ZWEI FEHLER LAGEN DARIN, beide meine:
 *  · Die Sprachfrage ging NICHT im Verlauf mit — das Modell bekam ein nacktes „Polish" ohne
 *    die Frage davor und musste raten. Ein Wort ohne Frage ist keine Antwort.
 *  · Es kostete einen bezahlten Aufruf, um auf eine Frage zu antworten, die der Browser
 *    selbst beantworten kann ([[kein-token-fuer-abbrecher]]).
 *
 * WER EINE SPRACHE NENNT, MEINT DIE SPRACHE. Das erkennt eine Liste, kein Modell — und sie
 * erkennt auch die, die wir NICHT sprechen: Auf „Polish" gehoert eine ehrliche Absage, nicht
 * eine Rueckfrage. Es sind drei Sprachen, und das darf man sagen.
 *
 * DIE SCHREIBWEISEN GEHEN QUER DURCH: Jemand nennt seine Sprache mal in der eigenen, mal in
 * der Sprache der Seite. „Romanian", „rumänisch", „română" — dasselbe Anliegen.
 */
const SPRACH_WORTE: Record<Lang, string[]> = {
  de: ["deutsch", "german", "germana", "germană", "de", "nemteste", "nemțește"],
  en: ["english", "englisch", "engleza", "engleză", "en"],
  ro: ["romana", "română", "romanian", "rumaenisch", "rumänisch", "ro", "romaneste", "românește"],
};

/**
 * SPRACHEN, DIE WIR NICHT SPRECHEN — erkannt, damit die Absage eine Antwort ist.
 *
 * Die Liste ist bewusst kurz: die Nachbarsprachen der beiden Märkte plus die grossen. Wer
 * etwas anderes nennt, faellt in den letzten Fall und wird einfach ins Gespraech gelassen.
 */
const FREMDE_SPRACHE = [
  "polish", "polnisch", "polski", "pl",
  "spanish", "spanisch", "espanol", "español", "spaniola", "spaniolă",
  "french", "franzoesisch", "französisch", "francais", "français", "franceza", "franceză",
  "italian", "italienisch", "italiano", "italiana", "italiană",
  "portuguese", "portugiesisch", "portugues", "português",
  "hungarian", "ungarisch", "magyar", "maghiara", "maghiară",
  "turkish", "tuerkisch", "türkisch", "turkce", "türkçe",
  "russian", "russisch", "russkiy", "rusa", "rusă",
  "ukrainian", "ukrainisch", "bulgarian", "bulgarisch", "serbian", "serbisch",
  "dutch", "niederlaendisch", "niederländisch", "greek", "griechisch",
];

/**
 * DIE ABSAGE STEHT AUF ENGLISCH, wie die Frage — aus demselben Grund: Wer nach Polnisch
 * fragt, liest weder Deutsch noch Rumänisch sicher.
 *
 * SIE NENNT DIE DREI BEIM NAMEN und entschuldigt sich nicht. „Noch nicht" ist wahr und sagt
 * zugleich, dass es kein Versehen ist.
 */
const SPRACHE_ABSAGE = "I speak German, English and Romanian — not more, not yet.";

/** Trifft das Getippte eine Sprache? Nur kurze Eingaben, sonst redet er schon über sein Geschäft. */
function sprachAntwort(text: string): { sprache?: Lang; fremd?: boolean } {
  const w = text.toLowerCase().trim().replace(/[.!?,]+$/, "");
  /* Mehr als drei Wörter ist keine Sprachnennung, sondern ein Satz — den nehmen wir ernst. */
  if (!w || w.split(/\s+/).length > 3) return {};
  for (const l of LANGS) if (SPRACH_WORTE[l].some(k => w === k || w.includes(k))) return { sprache: l };
  if (FREMDE_SPRACHE.some(k => w === k || w.includes(k))) return { fremd: true };
  return {};
}

export default function AgentChat({ S, lang, gewaehlt }: {
  S: AgentChatTexte;
  /** Die Sprache, in der dieser Chat gerendert wurde — Wahl vor Browser. */
  lang: Lang;
  /** Steht schon eine WAHL im Cookie? Dann wird nicht mehr gefragt. */
  gewaehlt: boolean;
}) {
  const router = useRouter();

  /**
   * DER GRUSS — ZUSAMMENGESETZT, NICHT GETIPPT (Owner 09.09.2026: „er muss doch auch mit
   * einer Begrüssung anfangen").
   *
   * ER HAT RECHT, UND ES IST MEHR ALS HÖFLICHKEIT: Ein leerer Chat ist eine Aufforderung ohne
   * Absender. Wer ihn öffnet, weiss nicht, mit wem er spricht und was hier erwartet wird —
   * und tippt im Zweifel gar nichts.
   *
   * FEST GESCHRIEBEN, NICHT VOM MODELL: Ein Gruss vom Modell wäre ein bezahlter Aufruf bei
   * jedem Seitenaufruf — auch bei jedem Bot und bei jedem, der sofort wieder geht. Der Satz
   * ändert sich nie; ihn erzeugen zu lassen wäre Geld für ein bekanntes Ergebnis
   * ([[kein-token-fuer-abbrecher]]). Übersetzt wird er trotzdem — einmal je Sprache,
   * zwischengespeichert, nicht je Besucher.
   *
   * ER GEHT IM VERLAUF MIT zum Server: Sonst grüsst der Agent in seiner ersten echten Antwort
   * ein zweites Mal.
   *
   * DIE REIHENFOLGE IST DIE BEGRÜNDUNG:
   *  · wer spricht (ein KI-Agent, GEBAUT — nie „trainiert", Hausregel aus David vom 06.09.)
   *  · was er liefert (eine zugeschnittene Werbestrategie, nicht Texte aus einer Vorlage)
   *  · wie es schnell geht (drei Regeln, vorher gesagt statt hinterher korrigiert)
   *  · was es kostet (nichts — mit dem Grund, sonst sucht jeder den Haken)
   *  · was mit seinen Daten geschieht (VOR der Einwilligung, sonst ist es keine)
   *  · die Frage
   */
  const gruss = [
    S.gruss1,
    S.gruss2,
    S.grussRegelnTitel,
    S.grussRegeln,
    S.grussKostenlos,
    S.grussDatenschutz,
    S.grussFrage,
  ].join("\n\n");

  /* Der Anzeigename — die internen Namen sind Werkzeugkennungen, keine Wörter für Menschen. */
  const WERKZEUG_WORT: Record<string, string> = {
    website_lesen: S.werkzeugWebsite,
    hook_pruefen: S.werkzeugHook,
    bild_bauen: S.werkzeugBild,
    beispiel_zeigen: S.werkzeugBeispiel,
  };

  /**
   * ── WAS ZUERST IM CHAT STEHT ─────────────────────────────────────────────────────────────
   *
   * OHNE WAHL: die Sprachfrage, ALLEIN. Nicht Sprachfrage und Gruss untereinander — dann
   * läse er sechs Absätze in einer Sprache, die er vielleicht gerade wechseln will, und
   * unsere Vorstellung wäre verbrannt, bevor sie stattgefunden hat.
   *
   * MIT WAHL: sofort der Gruss. Wer schon einmal gewählt hat, wird nicht bei jedem Besuch
   * neu gefragt — das ist der Unterschied zwischen Aufmerksamkeit und Gängelei.
   */
  const [verlauf, setVerlauf] = useState<Nachricht[]>(
    gewaehlt
      ? [{ rolle: "agent", text: gruss, vorschlaege: [S.chipEinverstanden] }]
      : [{ rolle: "agent", text: SPRACHFRAGE, sprachfrage: true }],
  );
  const [eingabe, setEingabe] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");
  /** Erster Tipp auf „Neu anfangen" — der zweite räumt wirklich ab. */
  const [resetFragt, setResetFragt] = useState(false);
  const ende = useRef<HTMLDivElement>(null);
  const feld = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ende.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [verlauf.length, busy]);

  /**
   * ── DAS FELD WÄCHST MIT (Owner 09.09.2026, mit Bild: „hier stimmt was nicht. Kann sein,
   * dass sich das Feld vergrössern muss?") ───────────────────────────────────────────────────
   *
   * JA — UND ES WAR SCHLIMMER ALS UNSCHÖN. Das Feld stand fest auf einer Zeilenhöhe. Wer
   * mehr schrieb, sah seine eigene zweite Zeile angeschnitten am unteren Rand und die erste
   * gar nicht mehr. Man konnte nicht prüfen, was man abschickt.
   *
   * `rows={1}` UND `max-h` REICHTEN NICHT: Ein Textfeld wächst im Browser nicht von selbst,
   * es scrollt. Die Höhe muss gerechnet werden — erst auf null, dann auf den Inhalt.
   *
   * DIE OBERGRENZE BLEIBT: Ab 160 Pixeln scrollt es doch, sonst schiebt eine lange Antwort
   * das Gespräch aus dem Bild. Das ist der Fall, in dem Scrollen richtig ist.
   *
   * ES HÄNGT AN `eingabe`, NICHT AM TIPPEN: So wächst es auch, wenn Text per Sprache oder
   * per Chip hineinkommt — und schrumpft nach dem Senden von selbst wieder.
   */
  useEffect(() => {
    const el = feld.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [eingabe]);

  /**
   * NACH DER WAHL KOMMT DER GRUSS — UND ZWAR ÜBERSETZT.
   *
   * `router.refresh()` rendert die Server-Komponente neu und reicht die übersetzten Texte
   * herein, RÜHRT ABER DEN ZUSTAND IM BROWSER NICHT AN: `useState` läuft nur einmal, die
   * Sprachfrage bliebe stehen und der Gruss käme nie. Deshalb wird hier nachgezogen, sobald
   * eine Wahl vorliegt.
   *
   * NUR SOLANGE NICHTS ANDERES DASTEHT: Sobald jemand redet, wird der Verlauf nicht mehr
   * angefasst. Ein Sprachwechsel mitten im Gespräch darf keine Nachricht verschlucken.
   */
  useEffect(() => {
    if (!gewaehlt) return;
    setVerlauf(v => (v[v.length - 1]?.sprachfrage
      ? [{ rolle: "agent", text: gruss, vorschlaege: [S.chipEinverstanden] }]
      : v));
  }, [gewaehlt, gruss, S.chipEinverstanden]);

  const geraet = () => {
    try {
      let d = localStorage.getItem("lb_visitor") ?? "";
      if (!d) { d = crypto.randomUUID?.() ?? String(Date.now()); localStorage.setItem("lb_visitor", d); }
      return d;
    } catch { return ""; }
  };

  /**
   * DIE SPRACHE WÄHLEN — Cookie setzen, Server neu rendern.
   *
   * DASSELBE COOKIE WIE DER UMSCHALTER IN DER TOPNAV (`lb_lang`, ein Jahr): Die Wahl gilt
   * danach für den Trichter, das Impressum und den Datenschutz mit. Wer hier Rumänisch
   * wählt, liest auch das Kleingedruckte auf Rumänisch — sonst wäre die Frage eine Geste.
   *
   * `router.refresh()` STATT RELOAD: Die Server-Komponente rendert neu und liefert die
   * übersetzten Texte; im Chat steht zu diesem Zeitpunkt noch nichts, was verloren gehen
   * könnte. Genau deshalb steht die Frage GANZ am Anfang und nicht mittendrin.
   *
   * DIE STARTNACHRICHT WIRD HIER SOFORT GESETZT, ohne auf die Antwort des Servers zu warten:
   * Der Gruss kommt beim nächsten Rendern übersetzt herein, aber der Mensch soll nicht auf
   * einen leeren Schirm sehen, während das passiert.
   */
  const spracheWaehlen = (l: Lang) => {
    /* Fürs ganze Haus: Trichter, Impressum, Datenschutz sprechen danach dieselbe Sprache. */
    try {
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch { /* blockierte Cookies dürfen die Wahl nicht verschlucken — dafür die Adresse */ }
    /**
     * DIE WAHL GEHT IN DIE ADRESSE (Owner 09.09.2026: „keiner ist aktiv").
     *
     * `router.refresh()` allein hing an dem Cookie darüber. Wird es blockiert, sieht der
     * Server keine Wahl, rendert dieselbe Frage — und der Knopf tut sichtbar nichts.
     * Eine Adresse kann kein Browser wegwerfen.
     */
    router.replace(`/engine/agent?lang=${l}`);
  };

  /**
   * VON VORN — mit derselben Sprache.
   *
   * WAS WEGGEHT: das Gespräch. WAS BLEIBT: die Sprachwahl und die Gerätekennung, an der der
   * Tagesdeckel hängt. Ein Zurücksetzen, das den Deckel mit zurücksetzt, wäre ein offenes
   * Tor — dann kostet uns ein Knopf jede Nacht Geld ([[kein-token-fuer-abbrecher]]).
   */
  /**
   * ── KEINE UHR AUF EINER FRAGE AUS WÖRTERN (Owner 09.09.2026: „ich kann nicht neu
   * anfangen") ──────────────────────────────────────────────────────────────────────────────
   *
   * REPRODUZIERT UND GEMESSEN: Ich hatte die Frage nach drei Sekunden von selbst
   * zurückgesetzt. Wer „Wirklich löschen? Noch einmal drücken." erst LIEST und dann
   * entscheidet, braucht länger — sein zweiter Druck fragte also nur wieder, und gelöscht
   * wurde nie. Der Knopf war für einen Menschen unbenutzbar und für eine Maschine in
   * Ordnung; genau die Sorte Fehler, die man am Schreibtisch nicht sieht.
   *
   * DIE HAUSREGEL SAGT „nach 3 s zurück" ([[loeschen-zwei-tipps-rot]]) — und sie meint ein
   * rotes SYMBOL, das man nicht lesen muss. Sobald dort ein Satz steht, ist die Uhr eine
   * Falle.
   *
   * STATT EINER UHR: Die Frage bleibt stehen, bis er antwortet — und jede andere Handlung
   * nimmt sie zurück (tippen, senden, eine Sprache wählen). Damit kann sie niemanden
   * überraschen und niemanden aussperren.
   */
  const neuAnfangen = () => {
    if (!resetFragt) { setResetFragt(true); return; }
    setResetFragt(false);
    setEingabe("");
    setFehler("");
    /**
     * ZURÜCK AN DEN WIRKLICHEN ANFANG — ALSO ZUR SPRACHFRAGE (Owner 09.09.2026: „das ist
     * nicht der Anfang vom Chat").
     *
     * ER HAT RECHT, UND ES IST MEHR ALS EINE NACHRICHT WEITER: Seit heute fängt dieser Chat
     * mit der Sprache an. „Neu anfangen", das beim Gruss landet, überspringt den ersten
     * Schritt — und ausgerechnet den, den man beim Prüfen wieder braucht: einmal auf
     * Rumänisch, einmal auf Deutsch, hintereinander, ohne die Seite neu zu laden.
     *
     * DIE ADRESSE MUSS MIT ZURÜCK. `?lang=de` ist die Wahl in diesem Gespräch; bliebe sie
     * stehen, käme die Frage nicht wieder, egal was der Verlauf sagt.
     */
    setVerlauf([{ rolle: "agent", text: SPRACHFRAGE, sprachfrage: true }]);
    router.replace("/engine/agent");
  };

  const schicken = async () => {
    const w = eingabe.trim();
    if (!w || busy) return;
    setResetFragt(false);

    /**
     * ── SOLANGE DIE SPRACHFRAGE OFFEN IST, ANTWORTET DER BROWSER ───────────────────────────
     *
     * DREI FÄLLE, UND KEINER KOSTET EINEN AUFRUF:
     *  · Er nennt eine unserer Sprachen  → umschalten, fertig.
     *  · Er nennt eine andere            → ehrliche Absage, die Knöpfe bleiben stehen.
     *  · Er redet einfach los            → die vorgeschlagene Sprache gilt, die Frage wird
     *    durch den Gruss ersetzt, und seine Nachricht geht MIT dem Gruss zum Agenten.
     *
     * DER DRITTE FALL IST DER, DER MIR GEFEHLT HAT (09.09.2026, „Polish"): Vorher ging seine
     * Nachricht ohne jeden Zusammenhang hinaus — die Frage hatte ich aus dem Verlauf
     * genommen, der Gruss stand noch nicht darin. Ein Wort ohne Frage davor kann kein Modell
     * richtig verstehen, und geraten hat es dann auch.
     */
    /* „Offen" heisst: Das Letzte, was dastand, war die Sprachfrage — auch nach einer Absage.
       Sonst wäre „Polish, sorry — Romanian" beim zweiten Versuch nicht mehr erkannt worden. */
    const offen = verlauf[verlauf.length - 1]?.sprachfrage === true;
    if (offen) {
      const s = sprachAntwort(w);
      if (s.sprache) { setEingabe(""); spracheWaehlen(s.sprache); return; }
      if (s.fremd) {
        setEingabe("");
        setVerlauf(v => [...v, { rolle: "mensch", text: w }, { rolle: "agent", text: SPRACHE_ABSAGE, sprachfrage: true }]);
        return;
      }
    }

    /* Redet er los, ohne zu wählen, gilt die vorgeschlagene Sprache — und der Gruss steht
       vor seiner Nachricht, damit der Agent weiss, was vorher gesagt wurde. */
    const basis: Nachricht[] = offen
      ? [{ rolle: "agent", text: gruss }]
      : verlauf.filter(m => !m.sprachfrage);
    const naechster: Nachricht[] = [...basis, { rolle: "mensch", text: w }];
    setVerlauf(naechster);
    setEingabe("");
    setBusy(true); setFehler("");
    try {
      const res = await fetch("/api/versusforge-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          /* DIE SPRACHFRAGE GEHT NICHT MIT: „Choose a language" ist Bedienung, kein
             Gespräch. Herausgenommen wird sie oben, zusammen mit dem Gruss, der an ihre
             Stelle tritt — sonst stünde seine Antwort ohne Frage da. */
          verlauf: naechster.map(m => ({ rolle: m.rolle, text: m.text })),
          device: geraet(),
          /**
           * SEINE SPRACHE GEHT BEI JEDER NACHRICHT MIT (Owner 09.09.2026: „auch alles, was
           * er erstellt — den Trichter und Hook und Dashboard — wird in der Sprache erstellt,
           * die er spricht").
           *
           * Sie steht nicht nur im Auftragstext des Modells: Sie ist die Sprache, in der
           * später der Trichter, der Hook und das Dashboard angelegt werden. Deshalb reist
           * sie mit, statt auf dem Server erraten zu werden.
           */
          sprache: lang,
        }),
      });
      const d = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setFehler(String(d.error ?? S.fehler)); return; }
      /**
       * DER RIEGEL IM BROWSER (Owner 09.09.2026: „auf keinen Fall schon hier").
       *
       * Die Regel steht im Auftragstext — aber ein Auftragstext ist eine Bitte, und bei der
       * ersten Frage war der Schaden am grössten: drei Berufe aus tausend, ausgedacht von
       * uns. Solange er noch nichts über sein Geschäft gesagt hat, gibt es hier keine Chips,
       * egal was das Modell schickt. Zwei Riegel für einen Fehler, der teuer aussieht.
       */
      const hatErzaehlt = naechster.filter(m => m.rolle === "mensch").length > 1;
      setVerlauf([...naechster, {
        rolle: "agent",
        text: String(d.antwort ?? ""),
        benutzt: Array.isArray(d.benutzt) ? (d.benutzt as string[]) : [],
        bild: String(d.bild ?? ""),
        bilder: Array.isArray(d.bilder) ? (d.bilder as string[]) : [],
        vorschlaege: hatErzaehlt && Array.isArray(d.vorschlaege) ? (d.vorschlaege as string[]) : [],
      }]);
    } catch {
      setFehler(S.fehler);
    } finally { setBusy(false); }
  };

  return (
    <main className="lb-versusforge flex h-[100dvh] flex-col overflow-hidden bg-white text-[#14181c]">
      <header className="shrink-0 border-b border-[#dfe4e9] px-5 py-4">
        <div className="mx-auto flex w-full max-w-[820px] items-center justify-between gap-3">
          <Wortmarke className="text-[21px] font-black leading-none tracking-[-0.02em]" akzent="#1d6fd0" />
          {/* Dass es ein Muster ist, steht dran — nicht im Kleingedruckten. */}
          <span className="rounded-full border-[1.5px] border-[#1d6fd0]/35 bg-[#eaf2fc] px-3 py-1 text-[13.5px] font-black text-[#1d6fd0]">
            {S.muster}
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[820px] flex-1 flex-col overflow-hidden px-4">
        <div className="lb-wisch flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-5">
          {verlauf.map((m, i) => (
            <div key={i} className={m.rolle === "mensch" ? "flex justify-end" : "flex flex-col items-start gap-2"}>
              {/**
                * DER KOPF NEBEN SEINEN NACHRICHTEN (Owner 09.09.2026: „mit Icon").
                *
                * IM TRICHTER WAR ER FALSCH und flog am selben Tag raus („das raus"): Dort
                * stand er neben EINER Sprechzeile auf einer Seite, die schon eine Wortmarke
                * im Kopf trug — zweimal derselbe Absender, und dazwischen ein Satz über
                * Implantate. Im CHAT ist er richtig: Hier wechseln sich zwei Sprecher ab, und
                * jeder Chat, den er kennt, zeigt daneben, wer spricht.
                *
                * NUR BEIM ERSTEN EINER FOLGE: Drei Köpfe untereinander bei drei Nachrichten
                * hintereinander sind eine Kolonne, kein Gesprächspartner. So macht es
                * WhatsApp auch.
                */}
              {m.rolle === "agent" && verlauf[i - 1]?.rolle !== "agent" && (
                <div className="flex items-center gap-2">
{/**
                    * DAS ZEICHEN STATT EINES BILDES (Owner 09.09.2026: „mach ein Icon VF").
                    *
                    * ZWEI FASSUNGEN LAGEN VORHER HIER, beide falsch: der Kämpferkopf — das
                    * Markenbild, und ein Wappen redet nicht — und danach kurz Davids Gesicht,
                    * das aber einem anderen Produkt gehört.
                    *
                    * „VF" IST BEIDES ZUGLEICH: klein genug für eine Sprechblase und eindeutig
                    * genug, dass man nach einer Sekunde weiss, wer spricht. Der Baustein liegt
                    * in der Markendatei ([[ci-bibliothek]]) — hier steht nur die Grösse und
                    * das Blau dieser Seite.
                    */}
                  {/**
                    * HELLGRAUER KREIS STATT DES DUNKLEN (Owner 09.09.2026: „F helleres Blau"
                    * · „oder der Kreis hellgrau").
                    *
                    * DER ZWEITE VORSCHLAG IST DER BESSERE, und der Grund steht im Bild
                    * daneben: Die Sprechblasen dieses Chats sind hellgrau. Ein schwarzer
                    * Kreis davor ist der dunkelste Fleck auf dem ganzen Schirm und zieht mehr
                    * Aufmerksamkeit als der Satz, den er ankündigt.
                    *
                    * AUF HELLEM GRUND BRAUCHT DAS „F" KEIN AUFGEHELLTES BLAU MEHR: Das
                    * Seiten-Blau #1d6fd0 ist genau dafür gemacht, und es ist dasselbe wie in
                    * der Wortmarke oben — zwei Blautöne auf einem Schirm sähen aus wie ein
                    * Versehen.
                    */}
                  <Zeichen className="h-7 w-7 text-[13px]" grund="#e9edf1" schrift="#14181c" akzent="#1d6fd0" />
                  <span className="text-[13.5px] font-black tracking-[-0.01em] text-[#5b666f]">VersusForge</span>
                </div>
              )}
              <p className={`m-0 max-w-[86%] whitespace-pre-wrap text-[16.5px] leading-[1.5] md:text-[17.5px] ${
                m.rolle === "mensch"
                  ? "rounded-2xl rounded-br-md bg-[#1d6fd0] px-4 py-3 font-semibold text-white"
                  : "rounded-2xl rounded-bl-md bg-[#f1f4f7] px-4 py-3"}`}>
                {m.text}
              </p>

              {/**
                * ── DIE SPRACHEN ALS KNÖPFE ────────────────────────────────────────────────
                *
                * SIE SEHEN AUS WIE DIE CHIPS, TUN ABER ETWAS ANDERES: Ein Chip setzt Text ins
                * Feld, hier wird sofort umgeschaltet. Das ist der eine erlaubte Unterschied —
                * eine Sprachwahl ist keine Antwort an den Agenten, und sie durch das
                * Eingabefeld zu schicken hiesse, einen bezahlten Modellaufruf für „Română"
                * auszulösen.
                *
                * JEDE SPRACHE IN IHRER EIGENEN SCHREIBWEISE (`LANG_LABEL`): „Română", nicht
                * „Rumänisch". Wer die Frage darüber nicht liest, erkennt trotzdem sein Wort.
                *
                * ── KEINE VORAUSWAHL (Owner 09.09.2026: „nix als Default habe ich gesagt") ──
                *
                * ICH HATTE DIE BROWSERSPRACHE HERVORGEHOBEN und damit gegen seine Ansage
                * gebaut. Der Grund, warum er recht hat, ist derselbe, mit dem die Sprachfrage
                * überhaupt angefangen hat: Der Browser sagt, was jemand EINGESTELLT hat, nicht
                * in welcher Sprache er reden will. Eine hervorgehobene Antwort ist eine
                * Behauptung — und wer sie sieht, tippt sie an, auch wenn sie falsch ist. Genau
                * die Sorte Vermutung wollten wir loswerden.
                *
                * DREI GLEICHE KNÖPFE, FESTE REIHENFOLGE. Auch die Reihenfolge ist eine
                * Vorauswahl: Wer vorn steht, wird häufiger gewählt. Sie steht deshalb fest
                * und ändert sich nicht mit dem Besucher.
                */}
              {m.sprachfrage && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {LANGS.map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => spracheWaehlen(l)}
                      className="rounded-full border-[1.5px] border-[#dfe4e9] bg-white px-4 py-2 text-[15px] font-bold text-[#14181c] transition hover:border-[#1d6fd0] hover:text-[#1d6fd0]"
                    >
                      {LANG_LABEL[l]}
                    </button>
                  ))}
                </div>
              )}

              {/**
                * DIE CHIPS ZUR FRAGE (Owner 09.09.2026: „manche wissen es nicht, die musst du
                * als Chips anbieten").
                *
                * ANTIPPEN SETZT EIN, ES SCHICKT NICHT AB. Der Satz landet im Feld, er kann
                * ihn ändern oder ergänzen und drückt selbst. Auf der Startseite waren Chips
                * falsch, weil dort ein Klick seine eigene Beschreibung ERSETZT; hier sind sie
                * richtig, weil sie eine schwere Frage überhaupt erst beantwortbar machen.
                *
                * NUR AN DER LETZTEN NACHRICHT: Chips unter einer beantworteten Frage sind
                * eine Falle — man tippt sie an und schickt eine Antwort auf etwas, das drei
                * Nachrichten zurückliegt.
                */}
              {m.rolle === "agent" && i === verlauf.length - 1 && !busy && !!m.vorschlaege?.length && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {m.vorschlaege.map((v, n) => (
                    <button
                      key={n}
                      type="button"
                      /**
                       * NIE ZWEIMAL DASSELBE (Owner 09.09.2026, im selben Bild: „Da, sunt de
                       * acord, Da, sunt de acord, Da, sunt de …").
                       *
                       * Ein Chip HÄNGT AN, damit man mehrere Antworten sammeln kann — das ist
                       * richtig und bleibt. Falsch war, dass derselbe Chip beliebig oft
                       * anhängen durfte. Wer zweimal tippt, weil beim ersten Mal scheinbar
                       * nichts passierte, hat seinen Satz verdoppelt und schickt Unsinn.
                       */
                      onClick={() => setEingabe(alt => (alt.includes(v) ? alt : alt ? `${alt}, ${v}` : v))}
                      className="rounded-full border-[1.5px] border-[#dfe4e9] bg-white px-3.5 py-2 text-[14.5px] font-semibold text-[#14181c] transition hover:border-[#1d6fd0] hover:text-[#1d6fd0]"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}

              {/* ── DER BEWEIS: was er benutzt hat, ohne dass jemand es verlangt hat ── */}
              {!!m.benutzt?.length && (
                <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 pl-1 text-[13.5px] font-bold text-[#8b959d]">
                  <Wrench className="h-3.5 w-3.5" aria-hidden />
                  {m.benutzt.map(b => WERKZEUG_WORT[b] ?? b).join(" · ")}
                </p>
              )}

              {/**
                * ── DIE VORFÜHRUNG: KACHELN UNTEREINANDER (Owner 09.09.2026: „der muss aber
                * aus mehreren Slides bestehen" · „untereinander") ─────────────────────────
                *
                * NICHT ZUM WISCHEN: Im Chat ist Scrollen die einzige Bewegung, die jeder
                * ohne Erklärung macht. Ein Karussell in einer Sprechblase müsste man erst
                * entdecken — und was man entdecken muss, sehen die meisten nie.
                *
                * SCHMALER ALS EIN EINZELBILD: Vier Kacheln in voller Breite wären eine
                * Wand. So bleibt die Bewegung sichtbar, ohne das Gespräch zu verdrängen.
                */}
              {!!m.bilder?.length && (
                <div className="flex flex-col gap-2">
                  {m.bilder.map((b, n) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={n} src={b} alt=""
                      className="block w-full max-w-[220px] shadow-[0_4px_16px_rgba(20,24,28,.14)]"
                      style={{ aspectRatio: "1080 / 1350" }} />
                  ))}
                </div>
              )}

              {/* Das Bild steht IM Gespräch, nicht auf einer Seite danach. */}
              {m.bild && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.bild} alt={S.bildAlt}
                  className="block w-full max-w-[280px] shadow-[0_6px_22px_rgba(20,24,28,.16)]"
                  style={{ aspectRatio: "1080 / 1350" }} />
              )}
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <p className="m-0 flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-[#f1f4f7] px-4 py-4">
                {[0, 1, 2].map(i => (
                  <span key={i} className="lb-tippt h-2 w-2 rounded-full bg-[#8b959d]"
                    style={{ animationDelay: `${i * 0.16}s` }} />
                ))}
              </p>
            </div>
          )}
          <div ref={ende} />
        </div>

        {fehler && <p className="m-0 pb-2 text-[15px] font-bold text-[#c02626]">{fehler}</p>}

        {/**
          * ── HIER STANDEN DATENSCHUTZ UND IMPRESSUM (Owner 09.09.2026: „bitte die zwei raus,
          * wir haben die nicht gemacht … ich brauche stattdessen Chat-Reset") ───────────────
          *
          * SIE ZEIGTEN AUF DIE SEITEN DES HAUSES, nicht auf welche von VersusForge — auf
          * Rumänisch stand darunter „Confidențialitate", und dahinter lag eine Seite, die es
          * so nicht gibt. Ein Link, der ein Dokument verspricht, das niemand geschrieben hat,
          * ist schlechter als kein Link.
          *
          * WANN SIE ZURÜCK MÜSSEN, und das ist keine Formalie: Sobald dieser Agent eine
          * E-Mail-Adresse entgegennimmt und eine Anzeige darauf läuft. Der Datenschutzsatz im
          * Gruss kündigt genau das an. Bis dahin sammelt das Muster nichts.
          */}

        {/**
          * NEU ANFANGEN — ZWEI TIPPS, ROT ([[loeschen-zwei-tipps-rot]]).
          *
          * Der erste Tipp fragt, der zweite räumt ab, nach drei Sekunden ist die Frage von
          * selbst wieder weg. Kein Bestätigungsfenster ([[keine-overlay-dialoge]]).
          *
          * ER STEHT UNTER DEM FELD, klein und grau: Er wird selten gebraucht und darf mit dem
          * Sendeknopf nicht um Aufmerksamkeit streiten.
          */}
        {/* NICHT BEI DER SPRACHFRAGE: Dort gibt es nichts zurückzusetzen, und ein Knopf, der
            nichts tut, macht den ersten Schirm unruhig. */}
        <p className="m-0 flex items-center pb-1">
          <button
            type="button"
            hidden={verlauf[verlauf.length - 1]?.sprachfrage === true}
            onClick={neuAnfangen}
            disabled={busy}
            className={`rounded-full px-2 py-0.5 text-[13.5px] font-bold underline transition disabled:opacity-30 ${
              resetFragt ? "text-[#c02626]" : "text-[#8b959d] hover:text-[#14181c]"}`}
          >
            {resetFragt ? S.loeschenBestaetigen : S.loeschen}
          </button>
        </p>

        {/**
          * ── EINE BOX, KNÖPFE INNEN (Owner 09.09.2026, mit Bild von ChatGPT: „ChatGPT löst
          * es so") ──────────────────────────────────────────────────────────────────────────
          *
          * VORHER STANDEN DREI DINGE NEBENEINANDER: Feld, Mikrofon, Senden — jedes mit
          * eigenem Rahmen, alle gleich gross. Das las sich wie drei gleichwertige Wege, und
          * das Feld, das der eigentliche Weg ist, war das schmalste davon.
          *
          * JETZT IST ES EINE FLÄCHE: oben schreibt man, unten rechts stehen die zwei Knöpfe
          * darin. Das Feld bekommt die ganze Breite, und wenn es wächst, wächst die Box mit —
          * die Knöpfe bleiben, wo sie sind.
          *
          * DER RAHMEN LEUCHTET BEIM SCHREIBEN (`focus-within`): Vorher tat das nur das Feld
          * selbst; sitzt es ohne eigenen Rand in der Box, muss die Box es zeigen. Sonst sieht
          * man nicht, ob man gerade tippt oder nicht.
          */}
        <div className="sticky bottom-0 shrink-0 bg-white pb-3 pt-2">
          <div className="rounded-[24px] border-[1.5px] border-[#dfe4e9] bg-white px-4 pb-2 pt-3 transition focus-within:border-[#1d6fd0]">
            <textarea
              ref={feld}
              rows={1}
              value={eingabe}
              onChange={e => { setEingabe(e.target.value); setResetFragt(false); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void schicken(); } }}
              placeholder={S.platzhalter}
              /* KEIN EIGENER RAHMEN UND KEINE POLSTERUNG MEHR: beides gehört jetzt der Box.
                 `min-h` ist eine Zeile, den Rest rechnet der Effekt oben. */
              className="block max-h-[160px] min-h-[26px] w-full resize-none border-none bg-transparent p-0 text-[16px] leading-[1.45] text-[#14181c] placeholder:text-[#8b959d] outline-none"
            />
            <div className="mt-1.5 flex items-center justify-end gap-1">
              {/* SPRACHE (Owner 09.09.2026: „ich kann es mit Sprache steuern"). Der erkannte
                  Text landet IM FELD, nicht direkt im Gespräch — Begründung in
                  components/SprachKnopf.tsx.

                  DIE ERKENNUNG HÖRT IN SEINER SPRACHE ZU: Ohne `lang` verhört sich die
                  Abschrift bei kurzen Sätzen reihenweise — „Hallo" ist in sechs Sprachen
                  dasselbe Wort. */}
              <SprachKnopf
                lang={lang}
                aus={busy}
                schlicht
                fertig={t => setEingabe(v => (v ? `${v} ${t}` : t))}
              />
              <button
                type="button"
                onClick={() => void schicken()}
                disabled={busy || !eingabe.trim()}
                aria-label={S.senden}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1d6fd0] text-white transition active:scale-95 disabled:opacity-30"
              >
                <ArrowUp className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
