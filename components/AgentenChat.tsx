"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Eingabe, Fehlerzeile, Knopf, Laden } from "@/components/CI";
import type { AgentenTexte } from "@/lib/agenten-texte";

/**
 * „TESTE MICH" — LB FÜHRT DAS GESPRÄCH MIT EINER FIRMA (Owner 29.08.2026: „dann ist nicht
 * David, der den Kunden fragt, was sie für Leads haben wollen, sondern LB.").
 *
 * DAS GESPRÄCH IST DIE VORFÜHRUNG: Eine Firma soll nicht LESEN, dass wir Verkaufsstrecken
 * mit einem Gesicht darin bauen — sie soll es an sich selbst erleben. Wer diesen Ablauf
 * durchgeht, hat in anderthalb Minuten verstanden, was seine eigenen Interessenten erleben
 * würden. Das ist die ganze Idee hinter dem Knopf.
 *
 * FESTER TEXT, KEIN MODELL: Der Weg ist immer derselbe, ein Modell könnte davon nur
 * abweichen — und es würde jeden Neugierigen Geld kosten, lange bevor daraus ein Auftrag
 * wird. Bezahlt wird, wenn der Owner den Auftrag hat, nicht wenn jemand neugierig ist.
 *
 * KEIN VOLLBILD-FENSTER (Memory [[keine-overlay-dialoge]]): Das Gespräch klappt an Ort und
 * Stelle auf, mitten in der Rubrik. Es gibt nichts zu schliessen, also kann man auch nichts
 * falsch schliessen — dem Owner ist genau das schon einmal passiert, mitsamt Datenverlust.
 *
 * GEKLICKT STATT GETIPPT, wo es geht (Memory [[chat-no-personal-questions-buttons-only]]).
 * Getippt wird nur, was wir wirklich brauchen: Name, Branche, Adresse, sein Anliegen.
 */
type Stufe = "zu" | "ziel" | "name" | "branche" | "pitch" | "kontakt" | "danke";
type Zeile = { von: "david" | "ich"; text: string };

export default function AgentenChat({ T, lang, offen }: {
  T: AgentenTexte;
  lang: string;
  /**
   * DER AUSLÖSER SITZT WOANDERS (Owner 29.08.2026: der goldene Knopf gehört auf die
   * Creme-Karte, das Gespräch aber nicht hinein — in `.lb-karte` färbt das Stylesheet jede
   * Schrift auf Dunkelbraun um, die Sprechblasen wären unlesbar). Also entscheidet die
   * Karte, wann geöffnet wird; hier steht nur das Gespräch.
   */
  offen: boolean;
}) {
  const [stufe, setStufe] = useState<Stufe>("zu");
  /* Der Knopf draussen sagt „los" — das Gespräch fängt dann von selbst an. */
  useEffect(() => {
    if (offen && stufe === "zu") { setStufe("ziel"); setVerlauf([{ von: "david", text: T.tmFrage1 }]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offen]);
  const [verlauf, setVerlauf] = useState<Zeile[]>([]);
  const [ziel, setZiel] = useState<"kunden" | "mitarbeiter" | "neugier" | "">("");
  const [name, setName] = useState("");
  const [branche, setBranche] = useState("");
  const [mail, setMail] = useState("");
  const [anliegen, setAnliegen] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");
  const endeRef = useRef<HTMLDivElement>(null);

  /* Der jeweils neueste Satz soll sichtbar sein, ohne dass jemand scrollen muss —
     `nearest`, damit die Seite nicht bei jedem Schritt springt. */
  useEffect(() => {
    if (stufe !== "zu") endeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [stufe, verlauf.length]);

  const sagt = (text: string) => setVerlauf(v => [...v, { von: "david", text }]);
  const ich = (text: string) => setVerlauf(v => [...v, { von: "ich", text }]);

  const zielWaehlen = (z: "kunden" | "mitarbeiter" | "neugier", label: string) => {
    setZiel(z); ich(label);
    sagt(z === "kunden" ? T.tmEchoKunden : z === "mitarbeiter" ? T.tmEchoMitarbeiter : T.tmEchoNeugier);
    sagt(T.tmNameFrage);
    setStufe("name");
  };

  const nameWeiter = () => {
    const n = name.trim();
    if (!n) return;
    ich(n); sagt(T.tmBrancheFrage); setStufe("branche");
  };

  const brancheWeiter = () => {
    const b = branche.trim();
    if (!b) return;
    ich(b);
    /* Der Pitch kommt in vier kurzen Sätzen statt als Block — vier Zeilen liest man, einen
       Absatz überspringt man. */
    sagt(T.tmPitch1); sagt(T.tmPitch2); sagt(T.tmPitch3); sagt(T.tmPitch4);
    setStufe("pitch");
  };

  const interessiert = () => { ich(T.tmJa); sagt(T.tmSchluss); setStufe("kontakt"); };

  const senden = async () => {
    const adresse = mail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adresse)) { setFehler(T.tmFehlerMail); return; }
    setFehler(""); setBusy(true);
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    try {
      const d = await fetch("/api/agent-anfrage", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ziel, name: name.trim(), branche: branche.trim(), email: adresse, anliegen: anliegen.trim(), sprache: lang, device }),
      }).then(r => r.json());
      if (d?.ok) setStufe("danke");
      else setFehler(String(d?.error || T.tmFehler));
    } catch { setFehler(T.tmFehler); }
    setBusy(false);
  };

  /* Zu heisst wirklich zu: kein leerer Kasten, der Platz wegnimmt, bevor jemand tippt. */
  if (stufe === "zu") return null;

  return (
    <div className="mt-4 rounded-[20px] border border-white/12 bg-white/[0.03] p-4">
      {/* ── Der Verlauf: was er gesagt und was die Firma geantwortet hat ── */}
      <div className="flex flex-col gap-2">
        {verlauf.map((z, i) => z.von === "david" ? (
          <div key={i} className="flex items-start gap-2.5">
            {/* HIER SPRICHT DAS HAUS, NICHT DAVID (Owner 29.08.2026: „nicht als David").
                David ist Recruiter — sein Gesicht auf einem Verkaufsgespräch über Funnels
                und Werbung würde beides unglaubwürdig machen. LuxuryBandit ist die Firma,
                die Agenten sind ihr Personal; also spricht hier das Logo. */}
            <span className="relative mt-0.5 grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 ring-2 ring-[#f6cf51]/45">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/lb-logo.png" alt="LuxuryBandit" className="h-6 w-6 object-contain" />
            </span>
            <p className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-white/[0.05] px-3.5 py-2.5 text-[14px] font-semibold leading-relaxed text-white/90">{z.text}</p>
          </div>
        ) : (
          <p key={i} className="ml-auto max-w-[85%] rounded-2xl border border-[#f6cf51]/30 lb-goldhauch px-3.5 py-2.5 text-[14px] font-bold leading-snug text-white/90">{z.text}</p>
        ))}
      </div>

      {/* ── Was gerade dran ist ── */}
      <div className="mt-3">
        {stufe === "ziel" && (
          <div className="flex flex-col gap-2">
            <Knopf art="chip" onClick={() => zielWaehlen("kunden", T.tmKunden)}>{T.tmKunden}</Knopf>
            <Knopf art="chip" onClick={() => zielWaehlen("mitarbeiter", T.tmMitarbeiter)}>{T.tmMitarbeiter}</Knopf>
            <Knopf art="chip" onClick={() => zielWaehlen("neugier", T.tmNeugier)}>{T.tmNeugier}</Knopf>
          </div>
        )}

        {stufe === "name" && (
          <>
            <Eingabe className="w-full" value={name} placeholder={T.tmNamePlatz}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") nameWeiter(); }} />
            <div className="mt-2"><Knopf art="umriss" onClick={nameWeiter}>{T.tmWeiter}</Knopf></div>
          </>
        )}

        {stufe === "branche" && (
          <>
            <Eingabe className="w-full" value={branche} placeholder={T.tmBranchePlatz}
              onChange={e => setBranche(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") brancheWeiter(); }} />
            <div className="mt-2"><Knopf art="umriss" onClick={brancheWeiter}>{T.tmWeiter}</Knopf></div>
          </>
        )}

        {/* DER EINE GOLDKNOPF DIESES GESPRÄCHS (CI-Regel) — hier fällt die Entscheidung. */}
        {stufe === "pitch" && <Knopf art="gold" onClick={interessiert}>{T.tmJa}</Knopf>}

        {stufe === "kontakt" && (
          <>
            <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-[#f6cf51]">{T.tmMailLabel}</label>
            <Eingabe className="mt-1.5 w-full" type="email" inputMode="email" autoComplete="email"
              value={mail} onChange={e => { setMail(e.target.value); setFehler(""); }} />

            <label className="mt-3 block text-[11px] font-black uppercase tracking-[0.14em] text-[#f6cf51]">{T.tmAnliegenLabel}</label>
            <textarea rows={4} value={anliegen} placeholder={T.tmAnliegenPlatz}
              onChange={e => setAnliegen(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-white/30 bg-white/[0.08] px-3.5 py-3 text-[14.5px] font-medium leading-relaxed text-white placeholder:text-white/60 outline-none focus:border-[#f6cf51]/60" />

            <div className="mt-3">
              {busy ? <Laden art="knopf" text={T.tmSendet} /> : <Knopf art="gold" onClick={() => void senden()}>{T.tmSenden}</Knopf>}
            </div>
            <Fehlerzeile>{fehler}</Fehlerzeile>
          </>
        )}

        {stufe === "danke" && (
          <div className="flex items-center gap-3 rounded-2xl border border-[#f6cf51]/30 lb-goldhauch px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f6cf51]/15 text-[#f6cf51]">
              <Check className="h-4 w-4" />
            </span>
            <p className="min-w-0 flex-1 text-[14px] font-black leading-snug text-white">
              {T.tmDanke.replace("{name}", name.trim())}
            </p>
          </div>
        )}
      </div>
      <div ref={endeRef} />
    </div>
  );
}
