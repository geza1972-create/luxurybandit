"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown, Check } from "lucide-react";
import { EingabeMehrzeilig, Fehlerzeile } from "@/components/CI";

/**
 * DER HILFE-CHAT AUF DER SEITE (Owner 25.08.2026: „wir können eine Hilfchat machen auf der
 * Seite. Zum Aus-/Einklappen").
 *
 * EINGEKLAPPT IST DIE VORGABE — und das ist der ganze Unterschied zum Berater, den der
 * Owner am selben Abend wieder abgeräumt hat („unten ist zu viel los im Chat"): Wer nichts
 * fragt, sieht eine Zeile. Wer fragt, klappt auf.
 *
 * KEINE KI DAHINTER, mit Absicht: Drei vorbereitete Fragen beantworten sich sofort und
 * kostenlos — es sind genau die drei, an denen diese Zielgruppe hängen bleibt (Sprache,
 * was kostet es, wie lange dauert es). Eine frei getippte Frage wird WEITERGELEITET
 * (dieselbe Concierge-Strecke wie der Firmen-Chat, /api/contact) statt von einem offenen
 * KI-Endpunkt beantwortet: kein Missbrauchsziel, keine Kosten je Frage, und der Owner
 * erfährt, was die Leute wirklich wissen wollen.
 */

export type HilfeTexte = {
  auf: string; zu: string; titel: string;
  f1: string; a1: string;
  f2: string; a2: string;
  f3: string; a3: string;
  frei: string; platzhalter: string; mailPlatzhalter: string;
  senden: string; danke: string; mailFehler: string;
};

export default function HilfeChat({ texte }: { texte: HilfeTexte }) {
  const [offen, setOffen] = useState(false);
  const [antwort, setAntwort] = useState("");
  const [frage, setFrage] = useState("");
  const [mail, setMail] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");
  const [fertig, setFertig] = useState(false);

  const paare: [string, string][] = [[texte.f1, texte.a1], [texte.f2, texte.a2], [texte.f3, texte.a3]];

  const senden = async () => {
    if (busy || !frage.trim()) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim())) { setFehler(texte.mailFehler); return; }
    setBusy(true); setFehler("");
    try {
      const r = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Hilfe-Chat", email: mail.trim().toLowerCase(), reason: "general",
          message: `[Hilfe-Chat Bewerbung] ${typeof window !== "undefined" ? window.location.href : ""}\n\n${frage.trim()}`,
        }),
      });
      if (r.ok) { setFertig(true); setFrage(""); }
      else setFehler(texte.mailFehler);
    } catch { setFehler(texte.mailFehler); }
    setBusy(false);
  };

  return (
    <section className="mt-10">
      <button type="button" onClick={() => setOffen(o => !o)}
        className="flex w-full items-center gap-2 rounded-2xl border border-white/20 bg-white/[0.05] px-4 py-3 text-left text-[16px] font-black text-white/90 transition hover:border-white/35">
        <HelpCircle className="h-5 w-5 shrink-0 text-[#f6cf51]" />
        <span className="flex-1">{offen ? texte.zu : texte.auf}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-white/50 transition ${offen ? "rotate-180" : ""}`} />
      </button>

      {offen && (
        <div className="mt-2 rounded-2xl border border-white/15 bg-white/[0.03] p-4">
          <p className="text-[13px] font-black uppercase tracking-[0.18em] text-white/40">{texte.titel}</p>

          <div className="mt-3 flex flex-col gap-2">
            {paare.map(([f, a]) => (
              <div key={f}>
                <button type="button" onClick={() => setAntwort(antwort === f ? "" : f)}
                  className="w-full rounded-full border border-white/30 px-4 py-2 text-left text-[16px] font-bold text-white/85 transition hover:border-white/60">
                  {f}
                </button>
                {antwort === f && (
                  <p className="mt-2 px-1 text-[16px] font-bold leading-snug text-white/75">{a}</p>
                )}
              </div>
            ))}
          </div>

          {/* Die freie Frage — weitergeleitet, nicht von einer KI beantwortet. */}
          <p className="mt-5 text-[16px] font-bold leading-snug text-white/70">{texte.frei}</p>
          {fertig ? (
            <p className="mt-2 flex items-center gap-2 text-[16px] font-bold text-white/85">
              <Check className="h-5 w-5 shrink-0 text-[#2f7d4f]" />{texte.danke}
            </p>
          ) : (
            <>
              <EingabeMehrzeilig zeilen={3} className="mt-2" value={frage}
                placeholder={texte.platzhalter} onChange={e => setFrage(e.target.value)} />
              <div className="mt-2 flex items-end gap-2">
                <EingabeMehrzeilig zeilen={1} className="flex-1" value={mail}
                  placeholder={texte.mailPlatzhalter} onChange={e => setMail(e.target.value)} />
                <button type="button" disabled={busy || !frage.trim()} onClick={() => void senden()}
                  className="h-10 shrink-0 rounded-full border border-white/40 px-4 text-[16px] font-black text-white/85 transition hover:border-white/70 disabled:opacity-40">
                  {texte.senden}
                </button>
              </div>
              <Fehlerzeile>{fehler}</Fehlerzeile>
            </>
          )}
        </div>
      )}
    </section>
  );
}
