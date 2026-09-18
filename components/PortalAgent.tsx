"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import AgentChat from "@/components/AgentChat";
import type { AgentChatTexte } from "@/lib/agent-chat-texte";
import type { Lang } from "@/lib/lang";

/**
 * UNSER AGENT AUF LAKATOSBANDI.COM (Owner 10.09.2026: „hier brauchen wir unseren eigenen Agenten
 * noch auf der Seite, der mit den Leuten redet eigentlich. Der sofort aufklappt beim Besuch.").
 *
 * DERSELBE KÜNSTLER-AGENT WIE UNTER /engine — `AgentChat` im Fenster-Modus. Keine zweite Fassung
 * des Gesprächs: Eine zweite wäre die Stelle, an der in vier Wochen zwei Begrüßungen stünden.
 *
 * ── WIE ER AUFGEHT (entschieden mit dem Owner, 10.09.2026) ────────────────────────────────
 *
 *  · DESKTOP: sofort offen, rechts unten, 400 px breit — die Seite bleibt daneben lesbar.
 *  · HANDY: sofort eine Sprechblase mit seinem ersten Satz; ein Tipp öffnet den Chat groß. Ganz
 *    aufgeklappt deckte er die Seite zu, bevor jemand eine Zeile gelesen hat.
 *  · ZUGEKLAPPT bleibt er zu, solange der Tab offen ist (sessionStorage) — sonst springt er bei
 *    jedem Seitenwechsel wieder auf, und das ist Gängelei statt Einladung.
 *
 * DAS GESPRÄCH BLEIBT BEIM ZUKLAPPEN ERHALTEN: Das Fenster wird nur versteckt, nicht abgebaut.
 * Kein Token, bevor er nicht Ja sagt — der Gruss ist fester Text (Skill `agenten`, Regel 2).
 */
export default function PortalAgent({ S, lang, blase }: {
  S: AgentChatTexte;
  lang: Lang;
  /** Der erste Satz des Agenten für die Sprechblase auf dem Handy. */
  blase: string;
}) {
  /* Vor dem ersten Rendern im Browser weiss niemand, wie breit der Bildschirm ist — deshalb
     startet alles unsichtbar und entscheidet im Effekt. Kein Aufblitzen des falschen Zustands. */
  const [zustand, setZustand] = useState<"start" | "zu" | "blase" | "offen">("start");
  const [gebaut, setGebaut] = useState(false);

  useEffect(() => {
    /* ── NICHTS KLAPPT VON SELBST AUF (Owner 17.09.2026: „überall ausschalten, das
       automatische Ausklappen") ──────────────────────────────────────────────────────────
       Am Rechner ging das Fenster beim Laden auf, am Handy sprang eine Sprechblase hoch —
       beide legten sich über das, was der Besucher gerade ansieht. Der Kreis unten rechts
       genügt: Wer reden will, tippt ihn an. */
    setZustand("zu");
  }, []);

  const oeffnen = () => { setZustand("offen"); setGebaut(true); };
  const zuklappen = () => {
    setZustand("zu");
    try { sessionStorage.setItem("lb_portal_agent", "zu"); } catch { /* egal */ }
  };
  const ersterSatz = (blase.split(/(?<=[.!?])\s/)[0] ?? blase).slice(0, 160);

  return (
    <>
      {gebaut && (
        <div
          role="dialog"
          aria-label="Agent"
          className={zustand === "offen"
            ? "fixed inset-0 z-[70] flex flex-col overflow-hidden bg-white md:inset-auto md:bottom-5 md:right-5 md:h-[min(660px,calc(100dvh-40px))] md:w-[400px] md:rounded-2xl md:border md:border-[#e5e5e5] md:shadow-[0_24px_70px_rgba(0,0,0,0.18)]"
            : "hidden"}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[#e5e5e5] px-4 py-3">
            <span>
              <span className="block text-[15px] font-bold leading-none tracking-[-0.01em] text-[#111]">lakatosbandi · Agent</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase leading-none tracking-[0.18em] text-[#888]">powered by VersusForge</span>
            </span>
            <button type="button" onClick={zuklappen} aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full text-[#555] hover:bg-[#f2f2f2] hover:text-[#111]">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <AgentChat S={S} lang={lang} gewaehlt fenster />
          </div>
        </div>
      )}

      {zustand === "blase" && (
        <div className="fixed bottom-20 right-4 z-[70] w-[min(300px,calc(100vw-32px))] rounded-2xl border border-[#e5e5e5] bg-white p-4 shadow-[0_16px_50px_rgba(0,0,0,0.16)]">
          <button type="button" onClick={zuklappen} aria-label="Close"
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-[#888] hover:text-[#111]">
            <X className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" onClick={oeffnen} className="block w-full pr-6 text-left">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#888]">lakatosbandi · Agent</span>
            <span className="mt-1.5 block text-[15px] leading-[1.45] text-[#111]">{ersterSatz}</span>
            <span className="mt-3 inline-block bg-[#111] px-4 py-2 text-[14px] font-semibold text-white">Chat</span>
          </button>
        </div>
      )}

      {zustand === "zu" && (
        <button type="button" onClick={oeffnen} aria-label="Agent"
          className="fixed bottom-20 right-4 z-[70] grid h-14 w-14 place-items-center rounded-full bg-[#111] text-white shadow-[0_12px_36px_rgba(0,0,0,0.25)] md:bottom-5 md:right-5">
          <MessageCircle className="h-6 w-6" aria-hidden />
        </button>
      )}
    </>
  );
}
