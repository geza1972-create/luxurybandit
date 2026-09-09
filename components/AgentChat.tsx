"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Wrench } from "lucide-react";
import { Wortmarke } from "@/components/VersusForgeMarke";

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

type Nachricht = { rolle: "mensch" | "agent"; text: string; benutzt?: string[]; bild?: string };

/* Der Anzeigename — die internen Namen sind Werkzeugkennungen, keine Wörter für Menschen. */
const WERKZEUG_WORT: Record<string, string> = {
  website_lesen: "Website gelesen",
  hook_pruefen: "Hook geprüft",
  bild_bauen: "Bild gebaut",
};

export default function AgentChat() {
  const [verlauf, setVerlauf] = useState<Nachricht[]>([]);
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
      setVerlauf([...naechster, {
        rolle: "agent",
        text: String(d.antwort ?? ""),
        benutzt: Array.isArray(d.benutzt) ? (d.benutzt as string[]) : [],
        bild: String(d.bild ?? ""),
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
          {verlauf.length === 0 && (
            <div className="m-auto max-w-[440px] text-center">
              <p className="m-0 text-[22px] font-extrabold leading-[1.25] tracking-[-0.02em]">
                Sag mir, was du anbietest.
              </p>
              <p className="mt-2.5 text-[15.5px] leading-[1.5] text-[#5b666f]">
                Nenn deine Website, wenn du eine hast — ich schau selbst nach. Am Ende steht
                dein Hook als fertiges Bild.
              </p>
            </div>
          )}

          {verlauf.map((m, i) => (
            <div key={i} className={m.rolle === "mensch" ? "flex justify-end" : "flex flex-col items-start gap-2"}>
              <p className={`m-0 max-w-[86%] whitespace-pre-wrap text-[16.5px] leading-[1.5] md:text-[17.5px] ${
                m.rolle === "mensch"
                  ? "rounded-2xl rounded-br-md bg-[#1d6fd0] px-4 py-3 font-semibold text-white"
                  : "rounded-2xl rounded-bl-md bg-[#f1f4f7] px-4 py-3"}`}>
                {m.text}
              </p>

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
            placeholder="Schreib einfach."
            className="max-h-[160px] min-h-[52px] flex-1 resize-none rounded-2xl border-[1.5px] border-[#dfe4e9] bg-white px-4 py-3.5 text-[16px] leading-[1.45] text-[#14181c] placeholder:text-[#8b959d] outline-none focus:border-[#1d6fd0]"
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
