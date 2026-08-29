"use client";

import { useEffect, useMemo, useState } from "react";
import { Eingabe, Knopf, Laden } from "@/components/CI";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

/**
 * DAVID — WAS IM TRICHTER WIRKLICH PASSIERT (Owner 29.08.2026: „ich brauche das auch unter
 * Admin. Ich will analysieren").
 *
 * DIE EINE FRAGE, DIE DIESE SEITE BEANTWORTEN MUSS: Wo hören die Leute auf? Ein Trichter mit
 * sechs Schritten hat sechs Stellen zum Aussteigen, und ohne diese Liste rät man, welche es
 * ist. Deshalb steht die Stufe in jeder Zeile und oben die Summe je Stufe.
 *
 * KOSTEN STEHEN DANEBEN, nicht auf einer eigenen Seite: Jede Sitzung trägt ihren Verbrauch
 * (aus den Antworten von OpenAI selbst, nicht geschätzt). Wer sehen will, ob sich der Gratis-
 * Bericht rechnet, braucht Abschlüsse und Kosten im selben Blick.
 *
 * WAS HIER NICHT STEHT: die Antworten aus dem Gespräch. Dass jemand geantwortet hat, ist eine
 * Kennzahl; WAS er erzählt hat, ist sein Vertrauen. Wer eine Sitzung wirklich lesen muss,
 * öffnet ihren Bericht — eine bewusste Handlung, keine Tabelle zum Überfliegen.
 *
 * PIN-GERÜST WIE IN /admin/kandidaten — dieselbe Prüfung, dieselbe Bedienung.
 */

type Verbrauch = { aufrufe: number; kleinHinein: number; kleinHeraus: number; grossHinein: number; grossHeraus: number };
type Zeile = {
  id: string; erstelltAm: string; vorname: string; email: string; sprache: string;
  stufe: "offen" | "lead" | "lebenslauf" | "stelle" | "gespraech" | "bericht";
  ohneStelle: boolean; jobTitel: string; jobOrt: string; rolle: string;
  layout: string; cvFoto: boolean | null;
  fragenGestellt: number; fragenBeantwortet: number;
  berichtAm: string; berichtGesehenAm: string; mailAm: string;
  nuetzlichkeit: string; feedback: string; interessen: string[]; marketingOptIn: boolean;
  bezahlt: boolean; bezahltAm: string; cvName: string;
  verbrauch: Verbrauch | null; utm: Record<string, string> | null;
};
type Summe = {
  sitzungen: number; leads: number; berichte: number; kaeufe: number; ohneStelle: number;
  tokenKleinHeraus: number; tokenGrossHeraus: number; aufrufe: number;
};

const STUFE_LABEL: Record<Zeile["stufe"], string> = {
  offen: "abgebrochen", lead: "Lead", lebenslauf: "Lebenslauf", stelle: "Stelle",
  gespraech: "im Gespräch", bericht: "Bericht fertig",
};
/* Die Reihenfolge des Trichters — sie bestimmt die Balken oben. */
const STUFEN: Zeile["stufe"][] = ["offen", "lead", "lebenslauf", "stelle", "gespraech", "bericht"];

const datum = (s: string) => (s ? new Date(s).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");

export default function DavidAdmin() {
  const [pin, setPin] = useState("");
  const [zeilen, setZeilen] = useState<Zeile[]>([]);
  const [summe, setSumme] = useState<Summe | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState("");
  const [suche, setSuche] = useState("");
  const [nurBezahlt, setNurBezahlt] = useState(false);

  const kopf = (p = pin): Record<string, string> => {
    const tok = (() => { try { return getStoredAuthSession()?.access_token ?? ""; } catch { return ""; } })();
    return { ...(p ? { "x-try-look-admin-pin": p } : {}), ...(tok ? { Authorization: `Bearer ${tok}` } : {}) };
  };

  const holen = async (p = pin) => {
    setLaedt(true); setFehler("");
    try {
      const r = await fetch("/api/david", { headers: kopf(p), cache: "no-store" });
      if (!r.ok) { setFehler(r.status === 403 ? "PIN stimmt nicht." : `Fehler ${r.status}`); setLaedt(false); return; }
      const d = await r.json();
      setZeilen(Array.isArray(d?.sitzungen) ? d.sitzungen : []);
      setSumme(d?.summe ?? null);
      try { localStorage.setItem("luxurybandit-try-look-admin-pin", p); } catch { /**/ }
    } catch { setFehler("Netzfehler."); }
    setLaedt(false);
  };

  useEffect(() => {
    let p = "";
    try { p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    setPin(p);
    void holen(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return zeilen.filter(z => {
      if (nurBezahlt && !z.bezahlt) return false;
      if (!q) return true;
      return [z.vorname, z.email, z.jobTitel, z.rolle, z.id].some(x => String(x).toLowerCase().includes(q));
    });
  }, [zeilen, suche, nurBezahlt]);

  /* Je Stufe zählen — daraus wird der Trichter über der Liste. */
  const proStufe = useMemo(() => {
    const m = new Map<string, number>();
    for (const z of zeilen) m.set(z.stufe, (m.get(z.stufe) ?? 0) + 1);
    return m;
  }, [zeilen]);

  return (
    <main className="min-h-screen bg-[#0b0a09] px-4 py-6 text-white">
      <div className="mx-auto w-full max-w-[1100px]">
        <h1 className="text-[26px] font-black">David · Pre-Screenings</h1>
        <p className="mt-1 text-[13px] font-medium text-white/60">
          Wo die Leute aussteigen, was sie kosten, wer kauft.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Eingabe className="w-[190px]" value={pin} onChange={e => setPin(e.target.value)} placeholder="Admin-PIN" />
          <Knopf art="umriss" onClick={() => void holen()}>Laden</Knopf>
          <Eingabe className="w-[240px]" value={suche} onChange={e => setSuche(e.target.value)} placeholder="Name, Adresse, Stelle …" />
          <button type="button" onClick={() => setNurBezahlt(v => !v)}
            className={`h-11 rounded-full border px-4 text-[13px] font-black transition ${nurBezahlt
              ? "border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[#f6cf51]"
              : "border-white/20 bg-white/5 text-white/85"}`}>
            Nur Käufe
          </button>
        </div>
        {fehler && <p className="mt-3 text-[13px] font-bold text-[#ef4444]">{fehler}</p>}

        {/* ── DER TRICHTER IN ZAHLEN — die eine Auskunft, für die es die Seite gibt ── */}
        {summe && (
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {STUFEN.map(st => (
              <div key={st} className="rounded-2xl border border-white/12 bg-white/[0.04] px-3 py-2.5">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/50">{STUFE_LABEL[st]}</p>
                <p className="mt-0.5 text-[20px] font-black text-white">{proStufe.get(st) ?? 0}</p>
              </div>
            ))}
          </div>
        )}
        {summe && (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kachel titel="Sitzungen" wert={String(summe.sitzungen)} />
            <Kachel titel="Käufe" wert={String(summe.kaeufe)} gold />
            <Kachel titel="Ohne Stelle" wert={String(summe.ohneStelle)} />
            {/* Ausgabe-Token sind der Kostentreiber — klein und gross getrennt, weil sie
                verschieden viel kosten. */}
            <Kachel titel="Token heraus (klein / gross)"
              wert={`${(summe.tokenKleinHeraus / 1000).toFixed(1)}k / ${(summe.tokenGrossHeraus / 1000).toFixed(1)}k`} />
          </div>
        )}

        {laedt && <div className="mt-6"><Laden art="flaeche" text="Sitzungen werden geladen …" /></div>}

        <div className="mt-5 flex flex-col gap-2">
          {gefiltert.map(z => (
            <div key={z.id} className="rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[15px] font-black text-white">{z.vorname || "—"}</span>
                <span className="text-[12.5px] font-medium text-white/60">{z.email || "keine Adresse"}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${z.stufe === "bericht"
                  ? "bg-[#f6cf51]/15 text-[#f6cf51]"
                  : "bg-white/8 text-white/70"}`}>{STUFE_LABEL[z.stufe]}</span>
                {z.bezahlt && <span className="rounded-full bg-[#f6cf51] px-2.5 py-0.5 text-[11px] font-black text-[#1a160f]">bezahlt</span>}
                {z.ohneStelle && <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-[11px] font-black text-white/70">ohne Stelle</span>}
                <span className="ml-auto text-[12px] font-bold text-white/45">{datum(z.erstelltAm)}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] font-medium text-white/65">
                {z.rolle && <span>Rolle: <b className="text-white/85">{z.rolle}</b></span>}
                {z.jobTitel && <span>Stelle: <b className="text-white/85">{z.jobTitel}</b>{z.jobOrt ? ` · ${z.jobOrt}` : ""}</span>}
                {z.layout && <span>Layout: {z.layout}</span>}
                <span>Fragen: {z.fragenBeantwortet}/{z.fragenGestellt}</span>
                {z.nuetzlichkeit && <span>Nutzen: <b className="text-white/85">{z.nuetzlichkeit}</b></span>}
                {z.verbrauch && <span>Aufrufe: {z.verbrauch.aufrufe} · Token heraus: {z.verbrauch.kleinHeraus + z.verbrauch.grossHeraus}</span>}
                {z.utm?.utm_source && <span>Quelle: {z.utm.utm_source}</span>}
              </div>
              {z.feedback && (
                <p className="mt-1.5 text-[12.5px] font-medium leading-snug text-white/55">„{z.feedback}"</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {z.stufe === "bericht" && (
                  <a href={`/david/${encodeURIComponent(z.id)}`} target="_blank" rel="noreferrer"
                    className="rounded-full border border-white/20 px-3 py-1 text-[12px] font-black text-white/85 hover:border-white/40">
                    Bericht öffnen
                  </a>
                )}
                {z.bezahlt && (
                  <a href={`/api/bewerbung-pdf?id=${encodeURIComponent(z.id)}&ansehen=1`} target="_blank" rel="noreferrer"
                    className="rounded-full border border-white/20 px-3 py-1 text-[12px] font-black text-white/85 hover:border-white/40">
                    Bewerbung ansehen
                  </a>
                )}
              </div>
            </div>
          ))}
          {!laedt && gefiltert.length === 0 && (
            <p className="py-12 text-center text-[13px] font-bold text-white/40">Nichts gefunden.</p>
          )}
        </div>
      </div>
    </main>
  );
}

function Kachel({ titel, wert, gold = false }: { titel: string; wert: string; gold?: boolean }) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${gold ? "border-[#f6cf51]/40 bg-[#f6cf51]/10" : "border-white/12 bg-white/[0.04]"}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/50">{titel}</p>
      <p className={`mt-0.5 text-[20px] font-black ${gold ? "text-[#f6cf51]" : "text-white"}`}>{wert}</p>
    </div>
  );
}
