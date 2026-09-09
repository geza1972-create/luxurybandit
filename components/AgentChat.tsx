"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Wrench } from "lucide-react";
import { Wortmarke } from "@/components/VersusForgeMarke";
import SprachKnopf from "@/components/SprachKnopf";

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
 */

type Nachricht = { rolle: "mensch" | "agent"; text: string; benutzt?: string[]; bild?: string; vorschlaege?: string[] };

/* Der Anzeigename — die internen Namen sind Werkzeugkennungen, keine Wörter für Menschen. */
const WERKZEUG_WORT: Record<string, string> = {
  website_lesen: "Website gelesen",
  hook_pruefen: "Hook geprüft",
  bild_bauen: "Bild gebaut",
};

/**
 * DER AGENT GRÜSST ZUERST (Owner 09.09.2026: „er muss doch auch mit einer Begrüssung
 * anfangen").
 *
 * ER HAT RECHT, UND ES IST MEHR ALS HÖFLICHKEIT: Ein leerer Chat ist eine Aufforderung ohne
 * Absender. Wer ihn öffnet, weiss nicht, mit wem er spricht und was hier erwartet wird —
 * und tippt im Zweifel gar nichts. Jeder Chat mit einem Betrieb fängt mit einer Zeile an.
 *
 * FEST GESCHRIEBEN, NICHT VOM MODELL: Ein Gruss vom Modell wäre ein bezahlter Aufruf bei
 * jedem Seitenaufruf — auch bei jedem Bot, der vorbeikommt, und bei jedem, der die Seite
 * öffnet und sofort wieder geht. Der Satz ändert sich nie; ihn erzeugen zu lassen wäre Geld
 * für ein bekanntes Ergebnis ([[kein-token-fuer-abbrecher]]).
 *
 * MIT BEISPIELEN, wie jede Frage hier (Owner im selben Lauf: „hier musst du Beispiele
 * liefern"). Wer nicht weiss, in welcher Form geantwortet wird, antwortet zu allgemein.
 *
 * ER GEHT IM VERLAUF MIT zum Server: Sonst grüsst der Agent in seiner ersten echten Antwort
 * ein zweites Mal.
 */
/**
 * WAS WIR LIEFERN — DER SATZ, DER ES BENENNT (Owner 09.09.2026: „nein, er liefert die
 * Marketingstrategie, die genau auf ihn zugeschnitten ist").
 *
 * MEINE FASSUNG WAR ZU KLEIN: „den einen Satz und die Seite dahinter" beschreibt zwei
 * Bauteile. Verkauft wird aber die STRATEGIE — und das Wort, auf das es ankommt, ist
 * „zugeschnitten": Der Unterschied zu allem anderen in diesem Feld ist nicht, dass wir Texte
 * schreiben, sondern dass sie aus SEINEM Geschäft kommen und ein Fremder sie nicht schreiben
 * könnte. Genau deshalb stellt die Maschine überhaupt Fragen.
 *
 * DIE DREI TEILE STEHEN TROTZDEM DABEI. Eine Strategie ohne Gegenstand ist ein Wort aus der
 * Beratersprache; die drei Stücke machen sie greifbar.
 */
const GRUSS = [
  /**
   * ER SAGT, WAS ER IST (Owner 09.09.2026: „er ist ein AI-Agent — bin ich richtig?").
   *
   * Ja, und es ist beweisbar: Er hat Werkzeuge und benutzt sie von sich aus. Genau das
   * unterscheidet einen Agenten von einem Chat, und der Mensch sieht es eine Nachricht
   * später, wenn seine Website gelesen wird, ohne dass er darum gebeten hat.
   *
   * ABER NICHT „TRAINIERT" (Owner: „er ist dafür trainiert"). Die Hausregel vom 06.09.2026
   * aus David gilt hier genauso: keine unbelegbaren Trainingsbehauptungen, sondern
   * Bauentscheidungen. Wir haben ihn nicht trainiert — wir haben ihm Regeln, ein Rezept und
   * Werkzeuge gegeben. „Gebaut" ist wahr und trägt weiter: Trainiert kann jeder behaupten,
   * gebaut heisst, jemand hat sich etwas dabei gedacht.
   */
  "Hallo, ich bin VersusForge — ein KI-Agent, gebaut für eine einzige Sache: Werbung, die Anfragen bringt.",
  "Ich baue dir eine Werbestrategie, die genau auf dein Geschäft zugeschnitten ist, nicht aus einer Vorlage: den Satz, der Leute anhält, wen er erreichen soll, und die Seite dahinter, auf der sie ihren Namen und ihre Nummer hinterlassen.",
  /**
   * ── DIE DREI REGELN VORWEG (Owner 09.09.2026: „bevor wir anfangen, muss ich dir auch sagen,
   * wie wir am schnellsten zum Ergebnis kommen. Rules") ────────────────────────────────────
   *
   * WARUM DAS AN DEN ANFANG GEHÖRT: Der Agent kann nur so gut sein wie das, was er bekommt.
   * Bisher hat er den Menschen erst NACH einer schwachen Antwort erfahren lassen, dass sie zu
   * allgemein war — das ist eine Korrektur, und Korrekturen kränken. Vorher gesagt, ist
   * dasselbe eine Spielregel, und die nimmt niemand persönlich.
   *
   * DREI, NICHT SIEBEN. Was am Anfang steht, wird überflogen; jede weitere Zeile senkt die
   * Wahrscheinlichkeit, dass eine gelesen wird.
   *
   * DIE DRITTE IST DIE WICHTIGSTE und sie gilt für beide Seiten: Was er nicht weiss, lässt er
   * weg — und wir erfinden es auch nicht. Damit steht die Hausregel gegen das Erfinden nicht
   * nur im Auftragstext, sondern im Gespräch, wo der Kunde sie sehen kann.
   */
  "Damit es schnell geht, drei Sachen:",
  "· Antworte konkret. „Gutes Essen“ bringt uns nicht weiter, „Lamm vom Holzkohlegrill“ schon.\n· Verstehe ich etwas falsch, sag es sofort — ich rechne damit.\n· Was du nicht weisst, lass weg. Ich erfinde nichts, und du sollst es auch nicht.",
  "Ein paar Minuten, dann steht deine Strategie. Machst du mit?",
].join("\n\n");

/**
 * ZWEI CHIPS SCHON AM GRUSS — die einzige Ausnahme von der Regel „keine Chips, bevor er
 * gesagt hat, was er tut".
 *
 * SIE RATEN NICHTS ÜBER IHN. „Ja, fang an" ist eine Zustimmung, keine Behauptung über sein
 * Geschäft — und genau danach ist gefragt. Die zweite ist die Frage, die ohnehin jeder als
 * Erstes im Kopf hat; sie hier anzubieten ist ehrlicher, als sie zu übergehen.
 */
const GRUSS_CHIPS = ["Ja, fang an", "Was kostet das?"];

export default function AgentChat() {
  const [verlauf, setVerlauf] = useState<Nachricht[]>([{ rolle: "agent", text: GRUSS, vorschlaege: GRUSS_CHIPS }]);
  const [eingabe, setEingabe] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");
  const ende = useRef<HTMLDivElement>(null);

  useEffect(() => { ende.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [verlauf.length, busy]);

  const geraet = () => {
    try {
      let d = localStorage.getItem("lb_visitor") ?? "";
      if (!d) { d = crypto.randomUUID?.() ?? String(Date.now()); localStorage.setItem("lb_visitor", d); }
      return d;
    } catch { return ""; }
  };

  const schicken = async () => {
    const w = eingabe.trim();
    if (!w || busy) return;
    const naechster: Nachricht[] = [...verlauf, { rolle: "mensch", text: w }];
    setVerlauf(naechster);
    setEingabe("");
    setBusy(true); setFehler("");
    try {
      const res = await fetch("/api/versusforge-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verlauf: naechster.map(m => ({ rolle: m.rolle, text: m.text })), device: geraet() }),
      });
      const d = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setFehler(String(d.error ?? "Das ging gerade nicht.")); return; }
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
        vorschlaege: hatErzaehlt && Array.isArray(d.vorschlaege) ? (d.vorschlaege as string[]) : [],
      }]);
    } catch {
      setFehler("Das ging gerade nicht. Bitte noch einmal.");
    } finally { setBusy(false); }
  };

  return (
    <main className="lb-versusforge flex h-[100dvh] flex-col overflow-hidden bg-white text-[#14181c]">
      <header className="shrink-0 border-b border-[#dfe4e9] px-5 py-4">
        <div className="mx-auto flex w-full max-w-[820px] items-center justify-between gap-3">
          <Wortmarke className="text-[21px] font-black leading-none tracking-[-0.02em]" akzent="#1d6fd0" />
          {/* Dass es ein Muster ist, steht dran — nicht im Kleingedruckten. */}
          <span className="rounded-full border-[1.5px] border-[#1d6fd0]/35 bg-[#eaf2fc] px-3 py-1 text-[13.5px] font-black text-[#1d6fd0]">
            Agent · Muster
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/VersusForge/kaempfer-kopf.webp" alt="" aria-hidden
                    className="h-7 w-7 rounded-full object-cover ring-[1.5px] ring-[#1d6fd0]/40" />
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
                      onClick={() => setEingabe(alt => (alt ? `${alt}, ${v}` : v))}
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

              {/* Das Bild steht IM Gespräch, nicht auf einer Seite danach. */}
              {m.bild && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.bild} alt="Dein Anzeigenbild"
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

        <div className="sticky bottom-0 flex shrink-0 items-end gap-2 border-t border-[#e4e9ee] bg-white pb-3 pt-3">
          <textarea
            rows={1}
            value={eingabe}
            onChange={e => setEingabe(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void schicken(); } }}
            placeholder="Schreib oder sprich."
            className="max-h-[160px] min-h-[52px] flex-1 resize-none rounded-2xl border-[1.5px] border-[#dfe4e9] bg-white px-4 py-3.5 text-[16px] leading-[1.45] text-[#14181c] placeholder:text-[#8b959d] outline-none focus:border-[#1d6fd0]"
          />
          {/* SPRACHE NEBEN DEM FELD (Owner 09.09.2026: „ich kann es mit Sprache steuern").
              Der erkannte Text landet IM FELD, nicht direkt im Gespräch — Begründung in
              components/SprachKnopf.tsx. */}
          <SprachKnopf
            lang="de"
            aus={busy}
            fertig={t => setEingabe(v => (v ? `${v} ${t}` : t))}
          />
          <button
            type="button"
            onClick={() => void schicken()}
            disabled={busy || !eingabe.trim()}
            aria-label="Senden"
            className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-[#1d6fd0] text-white transition active:scale-95 disabled:opacity-30"
          >
            <ArrowUp className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
    </main>
  );
}
