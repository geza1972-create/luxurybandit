"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { JoburiLead } from "@/lib/joburi-leads";
import { gehaltMitte } from "@/lib/joburi-gehalt";
import { klaerungZuLead } from "@/lib/joburi-klaerung";

/**
 * DIE ANTWORTEN DER STUDIE IM ADMIN (Owner 31.08.2026: „Die neuen Antworten müssen im
 * bestehenden Admin sichtbar und filterbar sein. … Kein neues Analytics-Dashboard bauen.").
 *
 * Also eine LISTE mit Filtern, kein Dashboard: keine Diagramme, keine Zeitreihen, keine
 * gerechneten Kennzahlen ausser den beiden, die die Route ohnehin schon liefert. Wer eine
 * Frage an die Daten hat, filtert und zählt — die Zahl über der Liste ändert sich mit.
 *
 * DIE FILTER SIND GENAU DIE SECHS ANGABEN, die der Owner genannt hat: Land, Deutschlevel,
 * Wechselgehalt, aktiv/passiv, Berufsfeld, Rückkehrbereitschaft. Sie stehen als Auswahl und
 * nicht als Suchfeld — getippte Filter finden Tippfehler, keine Kandidaten.
 *
 * HELL, WIE JEDES ADMIN-WERKZEUG (CI-Regel: „Light box / form / admin tool = schwarz, weiss,
 * grau, KEIN Gold").
 */

type Summe = {
  gesamt: number; mitAdresse: number; hoch: number; mitInteresse: number; mitCv: number;
  aktivSuchend: number; offenFuerAngebote: number; passiv: number;
  mitGehalt: number; gehaltMedian: number | null;
};

const LAND = { ro: "România", de: "Deutschland", at: "Österreich", alta: "Anderes Land" } as const;
const SUCHE = { aktiv: "aktiv suchend", offen: "offen für Angebote", passiv: "passiv" } as const;
const RUECK = { da: "ja", poate: "vielleicht", nu: "nein" } as const;
const FELD = {
  suport: "Support", it: "IT", finante: "Finanzen", logistica: "Logistik",
  inginerie: "Technik", vanzari: "Vertrieb", sanatate: "Gesundheit", altul: "Anderes",
} as const;
const GEHALT = { "800": "ab 800 €", "1200": "ab 1.200 €", "1600": "ab 1.600 €", "2000": "ab 2.000 €", "2500": "ab 2.500 €", "3000+": "über 3.000 €" } as const;
const FAKTOR = {
  salariu: "Gehalt", remote: "Remote", flexibilitate: "Flexibilität",
  cariera: "Karriere", stabilitate: "Sicherheit", echipa: "Team",
} as const;

export default function JoburiLeads({ pin }: { pin: string }) {
  const [leads, setLeads] = useState<JoburiLead[]>([]);
  const [summe, setSumme] = useState<Summe | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [f, setF] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      try {
        const d = await fetch("/api/joburi-lead?alle=1", { headers: { "x-try-look-admin-pin": pin }, cache: "no-store" }).then(r => r.json());
        if (Array.isArray(d?.leads)) setLeads(d.leads);
        if (d?.summe) setSumme(d.summe);
      } catch { /* leere Liste ist auch eine Antwort */ }
      setLaedt(false);
    })();
  }, [pin]);

  const gefiltert = useMemo(() => leads.filter(l =>
    (!f.land || l.land === f.land) &&
    (!f.deutsch || l.deutsch === f.deutsch) &&
    (!f.suche || l.suche === f.suche) &&
    (!f.gehalt || l.wechselGehalt === f.gehalt) &&
    (!f.feld || l.berufsfeld === f.feld) &&
    (!f.rueckkehr || l.rueckkehr === f.rueckkehr) &&
    (!f.mail || (f.mail === "ja" ? !!l.email : !l.email))
  ), [leads, f]);

  const datum = (iso?: string) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }); } catch { return ""; }
  };

  /** Ein Filter — „alle" ist immer der erste Eintrag und setzt ihn zurück. */
  const Filter = ({ feld, titel, werte }: { feld: string; titel: string; werte: Record<string, string> }) => (
    <div className="min-w-0">
      <p className="text-[10.5px] font-black uppercase tracking-wide text-ink/40">{titel}</p>
      <select value={f[feld] ?? ""} onChange={e => setF(x => ({ ...x, [feld]: e.target.value }))}
        className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-[12.5px] font-bold text-ink">
        <option value="">alle</option>
        {Object.entries(werte).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );

  if (laedt) {
    return <p className="flex items-center gap-2 text-[13px] font-bold text-ink/50"><Loader2 className="h-4 w-4 animate-spin" />Antworten werden geladen…</p>;
  }

  return (
    <div>
      <p className="text-sm font-black text-ink">Talent Market Pulse — Antworten</p>
      {/* DIE ZWEI ZAHLEN, DIE DIE STUDIE AUSMACHT: wie viele geantwortet haben, und ab
          welchem Gehalt die MITTE wechseln würde. Median, nicht Durchschnitt — ein einzelnes
          „über 3.000" verschöbe sonst die Aussage, die wir einer Firma gegenüber machen. */}
      {summe && (
        <p className="mt-0.5 text-[12px] font-bold text-ink/50">
          {summe.gesamt} Antworten · {summe.mitAdresse} mit Adresse · {summe.aktivSuchend} aktiv / {summe.offenFuerAngebote} offen / {summe.passiv} passiv
          {summe.gehaltMedian ? ` · Wechselgehalt (Median): ${summe.gehaltMedian} €` : ""}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Filter feld="land" titel="Land" werte={LAND} />
        <Filter feld="deutsch" titel="Deutsch" werte={{ A2: "A2", B1: "B1", B2: "B2", C1: "C1", C2: "C2" }} />
        <Filter feld="gehalt" titel="Wechselgehalt" werte={GEHALT} />
        <Filter feld="suche" titel="Status" werte={SUCHE} />
        <Filter feld="feld" titel="Berufsfeld" werte={FELD} />
        <Filter feld="rueckkehr" titel="Rückkehr" werte={RUECK} />
        <Filter feld="mail" titel="Adresse" werte={{ ja: "vorhanden", nein: "fehlt" }} />
      </div>

      <p className="mt-3 text-[12px] font-black text-ink/70">
        {gefiltert.length} von {leads.length}
        {Object.values(f).some(Boolean) && (
          <button type="button" onClick={() => setF({})} className="ml-2 font-bold text-sky-700 underline">Filter zurücksetzen</button>
        )}
      </p>

      <div className="mt-2 flex flex-col gap-2">
        {gefiltert.map(l => (
          <div key={l.id} className="rounded-xl border border-black/12 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11.5px] font-bold text-ink/45">{datum(l.erstelltAm)}</span>
              {l.land && <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wide text-ink/60">{LAND[l.land]}</span>}
              {l.deutsch && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10.5px] font-black text-sky-800">DE {l.deutsch}</span>}
              {/* Heute → Wechsel ab, in einem Zeichen. Seit dem 31.08. sind es getippte Zahlen;
                  die Stufen der ersten Tage übersetzt `gehaltMitte` mit (lib/joburi-gehalt.ts). */}
              {(l.jetztGehalt || l.wechselGehalt) && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-black text-emerald-800">
                  {gehaltMitte(l.jetztGehalt) ? `${gehaltMitte(l.jetztGehalt).toLocaleString("de-DE")} €` : "?"}
                  {" → "}
                  {gehaltMitte(l.wechselGehalt) ? `${gehaltMitte(l.wechselGehalt).toLocaleString("de-DE")} €` : "?"}
                </span>
              )}
              {l.alter && <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10.5px] font-black text-ink/60">{l.alter}</span>}
              {l.suche && <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10.5px] font-black text-ink/60">{SUCHE[l.suche]}</span>}
            </div>
            <p className="mt-1.5 text-[13px] font-bold text-ink/80">
              {l.berufsfeld ? FELD[l.berufsfeld as keyof typeof FELD] ?? l.berufsfeld : "—"}
              {l.rueckkehr ? ` · Rückkehr: ${RUECK[l.rueckkehr]}` : ""}
            </p>
            {/**
              * DER KLÄRUNGSANLASS KOMMT AUS DEM MUSTER, NICHT AUS EINEM `if` HIER
              * (Owner 31.08.2026: „Sonst hast du in drei Monaten fünfzehn Einzelregeln").
              * Neue Anlässe werden in lib/joburi-klaerung.ts ergänzt; diese Stelle bleibt.
              *
              * Bernstein und nicht Rot: Was hier anspringt, ist meist völlig stimmig —
              * Nachtdienst in der Pflege ist ruhiger als Tagdienst. Es ist eine Aufgabe für
              * uns, keine Wertung über den Menschen.
              */}
            {(() => {
              const anlass = klaerungZuLead(l);
              if (!anlass) return null;
              return (
                <div className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5">
                  <p className="text-[12px] font-black text-amber-800">Nachfragen: {anlass.anlassAdmin}</p>
                  {/* Hat er selbst schon geantwortet, steht die Antwort hier — dann ist die
                      Rückfrage meistens erledigt, bevor jemand zum Hörer greift. */}
                  {l.klaerung && (
                    <p className="mt-1 text-[12.5px] font-medium italic text-amber-900">„{l.klaerung}"</p>
                  )}
                </div>
              );
            })()}

            {/* Was auf Nachfrage herauskommt. Nur für uns — nie in der Studie, nie zu einer
                Firma. Gespeichert wird beim Verlassen des Feldes, nicht bei jedem Zeichen. */}
            <textarea
              defaultValue={l.notiz ?? ""}
              placeholder="Notiz zur Rückfrage…"
              onBlur={async e => {
                const wert = e.target.value.trim();
                if (wert === (l.notiz ?? "")) return;
                try {
                  await fetch("/api/joburi-lead", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
                    body: JSON.stringify({ schritt: "notiz", id: l.id, notiz: wert }),
                  });
                } catch { /* die Liste bleibt stehen; beim nächsten Laden zeigt sie den Stand */ }
              }}
              className="mt-1.5 min-h-[38px] w-full rounded-lg border border-black/12 bg-black/[0.02] px-2.5 py-1.5 text-[12.5px] font-medium text-ink/80 outline-none placeholder:text-ink/30"
            />

            {!!l.faktoren?.length && (
              <p className="mt-0.5 text-[12.5px] font-bold text-ink/55">
                Wichtig: {l.faktoren.map(x => FAKTOR[x] ?? x).join(" · ")}
              </p>
            )}
            {l.email && <p className="mt-1 break-all text-[12.5px] font-bold text-ink/60">{l.email}</p>}
            {l.utm?.utm_campaign && <p className="mt-0.5 text-[11.5px] font-bold text-ink/40">Kampagne: {l.utm.utm_campaign}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
