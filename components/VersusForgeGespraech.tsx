"use client";

import { useEffect, useRef, useState } from "react";
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
  schicken, planBauen, zurueck,
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
  texte: { platzhalter: string; senden: string; planKnopf: string; zurueck: string; denkt: string };
}) {
  const [eingabe, setEingabe] = useState("");
  const ende = useRef<HTMLDivElement>(null);

  /* Ans Ende scrollen, wenn etwas dazukommt — sonst steht die neue Antwort unter dem Rand. */
  useEffect(() => { ende.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [verlauf.length, busy, fertig]);

  const ab = () => {
    const w = eingabe.trim();
    if (!w || busy) return;
    setEingabe("");
    schicken(w);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── DIE ANZEIGE DER MASCHINE — sie steht oben und bleibt stehen ── */}
      <HebelStand stand={stand} jetzt={hebel} />

      {/* ── DER VERLAUF ── */}
      <div className="flex flex-col gap-3">
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
                : "rounded-2xl rounded-bl-md border border-white/12 bg-white/[0.05] px-4 py-3 text-white/90"}`}>
              {m.text}
            </p>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <p className="m-0 rounded-2xl rounded-bl-md border border-white/12 bg-white/[0.05] px-4 py-3 text-[16px] text-white/55">
              {busyText || texte.denkt}
            </p>
          </div>
        )}
      </div>

      {/* ── DER PLAN IST EIN ANGEBOT, KEIN AUTOMATISMUS ──
          Er kostet den teuren Aufruf. Wer ihn will, drückt. */}
      {fertig && !busy && (
        <button
          type="button"
          onClick={planBauen}
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
              className="rounded-full border border-white/20 px-3.5 py-2 text-[14.5px] font-semibold text-white/70 transition hover:border-[#f6cf51]/50 hover:text-white"
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {fehler && <p className="m-0 text-[15px] font-bold text-[#e0574f]">{fehler}</p>}

      {/* ── DAS EINGABEFELD BLEIBT IMMER DA ──
          Auch nachdem der Agent „fertig" gemeldet hat: Er darf widersprechen, nachlegen oder
          etwas ändern, statt vor einem einzigen Knopf zu stehen. Genau das kann ein Formular
          nicht, und genau deshalb bauen wir es um. */}
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          value={eingabe}
          onChange={e => setEingabe(e.target.value)}
          onKeyDown={e => {
            /* Enter schickt, Umschalt+Enter macht eine Zeile — wie in jedem Chat. Am Handy
               bleibt der Knopf der Weg, dort gibt es keine Umschalttaste. */
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ab(); }
          }}
          placeholder={texte.platzhalter}
          className="min-h-[56px] flex-1 resize-none rounded-xl border-[1.5px] border-white/20 bg-white px-4 py-3.5 text-[16px] leading-[1.45] text-[#14181c] placeholder:text-[#8b959d] outline-none focus:border-[#1d6fd0]"
        />
        <button
          type="button"
          onClick={ab}
          disabled={busy || !eingabe.trim()}
          className="h-[56px] shrink-0 rounded-xl bg-[#1d6fd0] px-5 text-[16px] font-extrabold text-white transition active:scale-[.98] disabled:opacity-40"
        >
          {texte.senden}
        </button>
      </div>

      <button
        type="button"
        onClick={zurueck}
        className="self-start text-[15px] font-semibold text-white/45 transition hover:text-white/80"
      >
        ‹ {texte.zurueck}
      </button>

      <div ref={ende} />
    </div>
  );
}

/**
 * DIE FÜNF STÄNDE (Owner 09.09.2026: „Nutzen identifizieren in Prozent, ob es erfüllt ist
 * oder nicht").
 *
 * Sie zeigt die EIGENEN Namen (`schritt`), nie die echten — die fünf echten nebeneinander
 * sind die Formel (Begründung in `versusforge-hook-rezept.ts`).
 *
 * VOR DER ERSTEN ANTWORT STEHT SIE NICHT DA: Fünf Nullen sind kein Fortschritt, sondern eine
 * Mängelliste über jemanden, der gerade erst angefangen hat.
 */
function HebelStand({ stand, jetzt }: { stand: Record<string, number>; jetzt: string }) {
  const summe = HEBEL.reduce((n, h) => n + (stand[h.schluessel] ?? 0), 0);
  if (!summe) return null;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/12 bg-white/[0.04] p-4">
      {HEBEL.map(h => {
        const wert = Math.max(0, Math.min(100, stand[h.schluessel] ?? 0));
        const dran = h.schluessel === jetzt;
        return (
          <div key={h.schluessel} className="flex items-center gap-3">
            <span className={`w-[92px] shrink-0 text-[13.5px] font-bold ${dran ? "text-[#f6cf51]" : "text-white/55"}`}>
              {h.schritt}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
              <span
                className={`block h-full rounded-full transition-[width] duration-500 ${dran ? "bg-[#f6cf51]" : "bg-white/45"}`}
                style={{ width: `${wert}%` }}
              />
            </span>
            <span className={`w-[42px] shrink-0 text-right text-[13.5px] font-bold ${dran ? "text-[#f6cf51]" : "text-white/45"}`}>
              {wert}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
