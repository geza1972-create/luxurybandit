"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { HEBEL } from "@/lib/versusforge-hook-rezept";

/**
 * DAS GESPRÄCH — EIN CHAT, KEINE SCHRITTE (Owner 09.09.2026).
 *
 * „Hier haben wir Schritte statt ein Chat." · „Es ist veraltet." · „Bei VersusForge müsste
 * sich ein Chat öffnen und alles lösen." · „Wir müssen dahin. Alles über den Chat zu lösen,
 * und irgendwann wird es per Sprache gesteuert."
 *
 * ── DER BEFUND, DER DAS AUSGELÖST HAT ──────────────────────────────────────────────────────
 *
 * „Ich habe den Bewerbungsgenerator gemacht, aber ich passe meine Bewerbung immer noch
 * schneller über Claude Code hier an."
 *
 * Der Eigentümer benutzt sein eigenes Werkzeug nicht, weil ein Chat schneller ist. Der Grund
 * ist nicht die Qualität der Ausgabe — es ist, dass ein Formular kein WIDERSPRECHEN kennt.
 * Vier Felder, eine Antwort je Feld, ein Ergebnis; passt es nicht, fängt man von vorn an. Im
 * Gespräch sagt man „kürzer", „nein, das stimmt nicht", „gib mir drei andere", „warum der?".
 *
 * WAS DAS FÜR DIE HEBEL HEISST: Sie bleiben, aber als AGENDA des Agenten statt als Schritte
 * des Menschen. Er redet, wie er will; die Anzeige rechts füllt sich. Wer sieht, dass „Beleg"
 * bei 10 steht, versteht die nächste Frage ohne Begründung.
 *
 * DER TEURE AUFRUF BLEIBT EINER: Das Gespräch läuft auf dem kleinen Modell. Den Plan baut
 * der Mensch mit einem Klick, wenn der Agent sagt, dass es reicht — kein Automatismus, der
 * Geld ausgibt, das niemand freigegeben hat ([[kein-token-fuer-abbrecher]]).
 *
 * FÜR SPRACHE VORBEREITET: Ein Verlauf aus Nachrichten ist genau das, was eine Sprachsteuerung
 * später braucht. Ein Schrittgerüst wäre dafür ein Umbau gewesen.
 */

export type Nachricht = { rolle: "mensch" | "agent"; text: string };

export default function VersusForgeGespraech({
  verlauf, stand, hebel, vorschlaege, busy, busyText, fehler, fertig,
  schicken, planBauen, zurueck, loeschen,
  texte,
}: {
  verlauf: Nachricht[];
  stand: Record<string, number>;
  hebel: string;
  vorschlaege: string[];
  busy: boolean;
  busyText: string;
  fehler: string;
  fertig: boolean;
  schicken: (text: string) => void;
  planBauen: () => void;
  zurueck: () => void;
  /** Räumt den ganzen Lauf ab und setzt ihn an den Anfang — Begründung am Knopf unten. */
  loeschen: () => void;
  texte: {
    platzhalter: string; senden: string; planKnopf: string; zurueck: string; denkt: string;
    loeschen: string; loeschenBestaetigen: string;
    /**
     * DIE FÜNF NAMEN IM FAHRPLAN — IN SEINER SPRACHE (Owner 10.09.2026, mit Bild der
     * rumänischen Seite: „das ist kein Rumänisch").
     *
     * Sie standen als deutsche Wörter aus `HEBEL` mitten in einer rumänischen Seite. Die
     * Namen kommen jetzt von aussen, aus den übersetzten Textbausteinen — `HEBEL` liefert nur
     * noch die Reihenfolge und den Schlüssel für den Fortschritt. Fehlt die Liste, bleiben
     * die deutschen Namen stehen: lieber ein deutsches Wort als ein leerer Balken.
     */
    schritte?: string[];
    /* Der Fahrplan über dem Gespräch — Begründung bei `HebelStand`. */
    fahrplanKopf?: string; fahrplanFein?: string;
  };
}) {
  const [eingabe, setEingabe] = useState("");
  const [loeschFragt, setLoeschFragt] = useState(false);
  const ende = useRef<HTMLDivElement>(null);

  /* Ans Ende scrollen, wenn etwas dazukommt — sonst steht die neue Antwort unter dem Rand. */
  useEffect(() => { ende.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [verlauf.length, busy, fertig]);

  const ab = () => {
    const w = eingabe.trim();
    if (!w || busy) return;
    setEingabe("");
    setLoeschFragt(false);
    schicken(w);
  };

  /**
   * ── ALLES LÖSCHEN — ZWEI TIPPS, ROT, KEINE UHR ────────────────────────────────────────────
   *
   * Owner 10.09.2026, in seinem eigenen Trichter festgefahren: „kann auch nicht alles löschen,
   * ich weiss nicht, was ich hier machen soll." Fünf Testnachrichten, eine rote Absage, kein
   * Ausweg — und `vf_lauf` bringt beim Neuladen genau denselben toten Verlauf zurück.
   *
   * KEINE UHR AUF EINER FRAGE AUS WÖRTERN: Die Hausregel [[loeschen-zwei-tipps-rot]] meint ein
   * rotes SYMBOL, das man nicht lesen muss. Steht dort ein Satz, sperrt eine Drei-Sekunden-Uhr
   * genau den aus, der ihn liest — im Agenten-Chat gemessen und dort schon behoben.
   *
   * STATTDESSEN NIMMT JEDE ANDERE HANDLUNG DIE FRAGE ZURÜCK: tippen, senden, den Plan bauen.
   */
  const abraeumen = () => {
    if (!loeschFragt) { setLoeschFragt(true); return; }
    setLoeschFragt(false);
    setEingabe("");
    loeschen();
  };

  /**
   * DIE FORM IST DIE VON WHATSAPP UND CHATGPT (Owner 09.09.2026: „du machst mir ein Chat wie
   * WA" · „wie ChatGPT" · „sieht das aus wie ein Chat?").
   *
   * DREI SACHEN MACHEN DEN UNTERSCHIED, und keine davon ist Farbe:
   *  1. DIE FLÄCHE GEHÖRT DEM GESPRÄCH. Volle Höhe, der Verlauf scrollt für sich. Ein Chat
   *     in einem Kasten mitten auf einer Seite ist ein Formular mit Sprechblasen.
   *  2. DIE EINGABE KLEBT UNTEN. Immer sichtbar, immer erreichbar, ohne Scrollen.
   *  3. NACHRICHTEN, KEINE ABSCHNITTE. Seine rechts, seine Antworten links, verschieden
   *     geformt — man sieht beim Überfliegen, wer spricht.
   */
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/**
        * ── DER FAHRPLAN IST RAUS (Owner 10.09.2026: „das zu zeigen bringt dem Kunden nichts.
        * Das ist eine interne Sache. Das versteht ein normaler User nicht" · „das ist eine
        * Fachsprache") ────────────────────────────────────────────────────────────────────────
        *
        * HIER STANDEN FÜNF ZEILEN MIT PROZENTEN: Nutzen 20 %, Herkunft, Wirkung 20 %, Beleg,
        * Grenze. Für uns ist das der Arbeitsstand der Maschine. Für einen Restaurantbesitzer
        * sind es fünf Wörter aus einem fremden Fach und drei Zahlen, die nichts erklären — er
        * lernt daraus nichts über sein Geschäft und nichts darüber, was als Nächstes kommt.
        *
        * ICH HATTE ES GESTERN GENAU UMGEKEHRT BEGRÜNDET („fünf Nullen mit einer Überschrift
        * sind ein Plan"). Der Denkfehler: Ein Plan hilft nur, wenn man seine Wörter kennt.
        * Wir kennen sie, weil wir sie erfunden haben.
        *
        * WAS BLEIBT: Der Fortschritt oben („Schritt 2/3") — eine Zahl, die jeder versteht. Und
        * der Fahrplan selbst bleibt DRINNEN: Der Agent arbeitet die fünf Sachen weiter ab, er
        * hängt sie nur nicht mehr an die Wand ([[hook-rezept-vorfuehren]]).
        */}

      {/* ── DER VERLAUF: die einzige Fläche, die scrollt ── */}
      <div className="lb-wisch flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
        {verlauf.map((m, i) => (
          <div key={i} className={m.rolle === "mensch" ? "flex justify-end" : "flex justify-start"}>
            {/**
              * ZWEI FORMEN, NICHT ZWEI FARBEN AUF DERSELBEN FLÄCHE: Seine Nachrichten stehen
              * rechts in der Akzentfarbe, die des Agenten links auf ruhigem Grund. So sieht
              * man beim Überfliegen, wer spricht, ohne ein Etikett zu lesen.
              */}
            <p className={`m-0 max-w-[86%] whitespace-pre-wrap text-[16.5px] leading-[1.5] md:text-[17.5px] ${
              m.rolle === "mensch"
                ? "rounded-2xl rounded-br-md bg-[#1d6fd0] px-4 py-3 font-semibold text-white"
                : "rounded-2xl rounded-bl-md bg-[#f1f4f7] px-4 py-3 text-[#14181c]"}`}>
              {m.text}
            </p>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            {/* DREI PUNKTE STATT EINES BALKENS: In einem Chat wartet man auf eine Antwort,
                nicht auf einen Vorgang. Jeder kennt das Zeichen. */}
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

      {/* ── DER PLAN IST EIN ANGEBOT, KEIN AUTOMATISMUS ──
          Er kostet den teuren Aufruf. Wer ihn will, drückt. */}
      {fertig && !busy && (
        <button
          type="button"
          onClick={() => { setLoeschFragt(false); planBauen(); }}
          className="w-full rounded-xl bg-[#1d6fd0] px-5 py-4 text-[17px] font-extrabold text-white transition active:scale-[.99]"
        >
          {texte.planKnopf}
        </button>
      )}

      {/* ── VORSCHLÄGE: EINSETZEN, NICHT ABSCHICKEN ──
          Antippen legt den Satz ins Feld; abgeschickt wird erst mit dem Knopf. Sonst wäre es
          wieder ein Formular mit Sprechblasen (Owner 09.09.2026: die Faulen klicken nur). */}
      {!busy && !fertig && vorschlaege.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {vorschlaege.map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setEingabe(v)}
              className="rounded-full border-[1.5px] border-[#dfe4e9] bg-[#f5f7f9] px-3.5 py-2 text-[14.5px] font-semibold text-[#14181c] transition hover:border-[#1d6fd0]"
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {fehler && <p className="m-0 text-[15px] font-bold text-[#c02626]">{fehler}</p>}

      {/**
        * ALLES LÖSCHEN — der Ausweg, der hier gefehlt hat (Begründung an `abraeumen` oben).
        *
        * ER STEHT ÜBER DEM FELD, klein und grau: selten gebraucht, und er darf mit dem
        * Sendeknopf nicht um Aufmerksamkeit streiten. Kein Bestätigungsfenster
        * ([[keine-overlay-dialoge]]) — der Knopf selbst stellt die Frage.
        */}
      <p className="m-0 flex items-center">
        <button
          type="button"
          onClick={abraeumen}
          disabled={busy}
          className={`rounded-full px-2 py-0.5 text-[13.5px] font-bold underline transition disabled:opacity-30 ${
            loeschFragt ? "text-[#c02626]" : "text-[#8b959d] hover:text-[#14181c]"}`}
        >
          {loeschFragt ? texte.loeschenBestaetigen : texte.loeschen}
        </button>
      </p>

      {/* ── DIE EINGABELEISTE KLEBT UNTEN ──
          Auch nachdem der Agent „fertig" gemeldet hat: Er darf widersprechen, nachlegen oder
          etwas ändern, statt vor einem einzigen Knopf zu stehen. Genau das kann ein Formular
          nicht, und genau deshalb bauen wir es um. */}
      <div className="sticky bottom-0 flex shrink-0 items-end gap-2 border-t border-[#e4e9ee] bg-white pb-2 pt-3">
        <textarea
          rows={1}
          value={eingabe}
          onChange={e => { setEingabe(e.target.value); setLoeschFragt(false); }}
          onKeyDown={e => {
            /* Enter schickt, Umschalt+Enter macht eine Zeile — wie in jedem Chat. Am Handy
               bleibt der Knopf der Weg, dort gibt es keine Umschalttaste. */
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ab(); }
          }}
          placeholder={texte.platzhalter}
          className="max-h-[160px] min-h-[52px] flex-1 resize-none rounded-2xl border-[1.5px] border-[#dfe4e9] bg-white px-4 py-3.5 text-[16px] leading-[1.45] text-[#14181c] placeholder:text-[#8b959d] outline-none focus:border-[#1d6fd0]"
        />
        {/* RUNDER KNOPF MIT PFEIL — die Form, die jeder aus WhatsApp und ChatGPT kennt.
            Ein Wort daneben („Senden") wäre eine Beschriftung für etwas, das keine braucht. */}
        <button
          type="button"
          onClick={ab}
          disabled={busy || !eingabe.trim()}
          aria-label={texte.senden}
          className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-[#1d6fd0] text-white transition active:scale-95 disabled:opacity-30"
        >
          <ArrowUp className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
