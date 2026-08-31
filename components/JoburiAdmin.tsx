"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Pencil, X } from "lucide-react";
import type { Stelle } from "@/lib/joburi-store";

/**
 * DIE STELLENPFLEGE (Owner 31.08.2026: „Jobliste über ein kleines Admin-Tool, nicht über
 * eine Datei im Repo. Du wirst Stellen hinzufügen, ändern, deaktivieren und irgendwann 20,
 * 50 oder 100 haben.").
 *
 * BEWUSST EIN FORMULAR, KEIN IMPORT: Für den ersten Test werden 10 bis 20 echte Stellen von
 * Hand eingetragen. Keine Schnittstelle, kein Scraping, keine Jobbörse — erst wird gemessen,
 * ob überhaupt Leads kommen.
 *
 * DIESES WERKZEUG IST HELL (Admin-Welt, CI-Regel „Light box / form / admin tool = schwarz,
 * weiss, grau, KEIN Gold") — es steht im Admin neben den anderen Werkzeugen, nicht im
 * Trichter des Kunden.
 */

type Entwurf = Partial<Stelle> & { titel?: string; firma?: string };

const LEER: Entwurf = { arbeitsform: "remote", deutschMin: "B2", waehrung: "EUR", aktiv: true, land: "RO" };

export default function JoburiAdmin({ pin }: { pin: string }) {
  const [stellen, setStellen] = useState<Stelle[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [entwurf, setEntwurf] = useState<Entwurf | null>(null);
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");
  /* Zwei Tipps statt eines Systemdialogs (Hausregel `loeschen-zwei-tipps-rot`). */
  const [scharf, setScharf] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const kopf = { "Content-Type": "application/json", "x-try-look-admin-pin": pin };

  useEffect(() => {
    void (async () => {
      try {
        const d = await fetch("/api/joburi?alle=1", { headers: { "x-try-look-admin-pin": pin }, cache: "no-store" }).then(r => r.json());
        if (Array.isArray(d?.stellen)) setStellen(d.stellen);
      } catch { /* leere Liste ist auch eine Antwort */ }
      setLaedt(false);
    })();
  }, [pin]);

  useEffect(() => {
    if (!scharf) return;
    const u = setTimeout(() => setScharf(""), 3000);
    return () => clearTimeout(u);
  }, [scharf]);

  const speichern = async () => {
    if (!entwurf?.titel || !entwurf?.firma) { setFehler("Titel und Firma sind Pflicht."); return; }
    setBusy(true); setFehler("");
    try {
      const d = await fetch("/api/joburi", { method: "POST", headers: kopf, body: JSON.stringify({ stelle: entwurf }) }).then(r => r.json());
      if (d?.error) { setFehler(String(d.error)); setBusy(false); return; }
      if (Array.isArray(d?.stellen)) setStellen(d.stellen);
      setEntwurf(null);
    } catch { setFehler("Speichern hat nicht geklappt."); }
    setBusy(false);
  };

  const loeschen = async (id: string) => {
    if (scharf !== id) { setScharf(id); return; }
    setScharf(""); setBusy(true);
    try {
      const d = await fetch("/api/joburi", { method: "POST", headers: kopf, body: JSON.stringify({ loeschen: id }) }).then(r => r.json());
      if (Array.isArray(d?.stellen)) setStellen(d.stellen);
    } catch { /**/ }
    setBusy(false);
  };

  const oeffnen = (s?: Stelle) => {
    setFehler("");
    setEntwurf(s ? { ...s } : { ...LEER });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const feld = "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[13px] font-medium text-black outline-none focus:border-black/40";
  const label = "block text-[11px] font-black uppercase tracking-wide text-black/50";
  const setz = (k: keyof Stelle, v: unknown) => setEntwurf(e => ({ ...(e ?? {}), [k]: v }));

  const geld = (s: Stelle) => {
    if (!s.gehaltVon && !s.gehaltBis) return "";
    const w = s.waehrung || "EUR";
    const zahl = s.gehaltVon && s.gehaltBis && s.gehaltVon !== s.gehaltBis
      ? `${s.gehaltVon}–${s.gehaltBis}` : String(s.gehaltBis || s.gehaltVon);
    return `${zahl} ${w}${s.gehaltGeschaetzt ? " (geschätzt)" : ""}`;
  };

  const heute = new Date().toISOString().slice(0, 10);

  return (
    <div className="lb-theme">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-black text-black">Stellen für den Joburi-Trichter</h2>
          <p className="mt-0.5 text-[12.5px] font-medium text-black/55">
            Echte offene Stellen — von Hand gepflegt. Der Trichter zeigt nur aktive, nicht abgelaufene.
          </p>
        </div>
        <button type="button" onClick={() => oeffnen()}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-black px-3 text-[12.5px] font-black text-white transition active:scale-95">
          <Plus className="h-4 w-4" /> Stelle
        </button>
      </div>

      {/* ── Das Formular ── */}
      {entwurf && (
        <div ref={formRef} className="mt-4 rounded-2xl border border-black/12 bg-black/[0.02] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-black text-black">{entwurf.id ? "Stelle ändern" : "Neue Stelle"}</p>
            <button type="button" onClick={() => setEntwurf(null)} aria-label="Schliessen"
              className="grid h-7 w-7 place-items-center rounded-full border border-black/15 text-black/50">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>Jobtitel *</label>
              <input className={feld} value={entwurf.titel ?? ""} onChange={e => setz("titel", e.target.value)}
                placeholder="Customer Care Agent with German" />
            </div>
            <div>
              <label className={label}>Firma *</label>
              <input className={feld} value={entwurf.firma ?? ""} onChange={e => setz("firma", e.target.value)}
                placeholder="Allianz Partners" />
            </div>
            <div>
              <label className={label}>Ort(e)</label>
              <input className={feld} value={entwurf.ort ?? ""} onChange={e => setz("ort", e.target.value)}
                placeholder="Timișoara, București" />
            </div>
            <div>
              <label className={label}>Land</label>
              <input className={feld} value={entwurf.land ?? ""} onChange={e => setz("land", e.target.value)} placeholder="RO" />
            </div>
            <div>
              <label className={label}>Arbeitsform</label>
              <select className={feld} value={entwurf.arbeitsform ?? "remote"} onChange={e => setz("arbeitsform", e.target.value)}>
                <option value="remote">Remote</option>
                <option value="hibrid">Hybrid</option>
                <option value="birou">Vor Ort</option>
              </select>
            </div>
            <div>
              <label className={label}>Deutsch mindestens</label>
              <select className={feld} value={entwurf.deutschMin ?? "B2"} onChange={e => setz("deutschMin", e.target.value)}>
                {["A2", "B1", "B2", "C1", "C2"].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Erfahrung</label>
              <select className={feld} value={entwurf.erfahrung ?? ""} onChange={e => setz("erfahrung", e.target.value || undefined)}>
                <option value="">— egal —</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
              </select>
            </div>
            <div>
              <label className={label}>Gehalt von</label>
              <input className={feld} type="number" value={entwurf.gehaltVon ?? ""} onChange={e => setz("gehaltVon", e.target.value)} placeholder="1000" />
            </div>
            <div>
              <label className={label}>Gehalt bis</label>
              <input className={feld} type="number" value={entwurf.gehaltBis ?? ""} onChange={e => setz("gehaltBis", e.target.value)} placeholder="1200" />
            </div>
            <div className="sm:col-span-2">
              {/* EHRLICH BLEIBEN: Eine geschätzte Zahl muss auch beim Bewerber als Schätzung
                  ankommen — sonst verspricht der Trichter etwas, das kein Arbeitgeber gesagt hat. */}
              <label className="flex items-center gap-2 text-[12.5px] font-bold text-black/70">
                <input type="checkbox" checked={entwurf.gehaltGeschaetzt === true}
                  onChange={e => setz("gehaltGeschaetzt", e.target.checked)} />
                Gehalt ist geschätzt (stand nicht in der Anzeige)
              </label>
            </div>
            <div>
              <label className={label}>Berufsfeld</label>
              <input className={feld} value={entwurf.berufsfeld ?? ""} onChange={e => setz("berufsfeld", e.target.value)} placeholder="Customer Support" />
            </div>
            <div>
              <label className={label}>Vertragsart</label>
              <input className={feld} value={entwurf.vertragsart ?? ""} onChange={e => setz("vertragsart", e.target.value)} placeholder="Vollzeit" />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Kurzbeschreibung</label>
              <textarea className={`${feld} min-h-[70px]`} value={entwurf.kurzbeschreibung ?? ""}
                onChange={e => setz("kurzbeschreibung", e.target.value)} placeholder="Zwei Sätze, was die Stelle ausmacht." />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Original-Stellenlink</label>
              <input className={feld} value={entwurf.link ?? ""} onChange={e => setz("link", e.target.value)}
                placeholder="https://…" />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Logo-Adresse (optional)</label>
              <input className={feld} value={entwurf.logoUrl ?? ""} onChange={e => setz("logoUrl", e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <label className={label}>Läuft ab am</label>
              <input className={feld} type="date" value={entwurf.laeuftAbAm ?? ""} onChange={e => setz("laeuftAbAm", e.target.value)} />
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-[12.5px] font-bold text-black/70">
                <input type="checkbox" checked={entwurf.aktiv !== false} onChange={e => setz("aktiv", e.target.checked)} />
                aktiv
              </label>
              <label className="flex items-center gap-2 text-[12.5px] font-bold text-black/70">
                <input type="checkbox" checked={entwurf.relocation === true} onChange={e => setz("relocation", e.target.checked)} />
                Umzug möglich
              </label>
            </div>
          </div>

          {fehler && <p className="mt-2 text-[12.5px] font-black text-red-600">{fehler}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => void speichern()} disabled={busy}
              className="flex h-9 items-center gap-2 rounded-lg bg-black px-4 text-[12.5px] font-black text-white transition active:scale-95 disabled:opacity-50">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Speichern
            </button>
            <button type="button" onClick={() => setEntwurf(null)}
              className="h-9 rounded-lg border border-black/15 px-4 text-[12.5px] font-black text-black/70">Abbrechen</button>
          </div>
        </div>
      )}

      {/* ── Die Liste ── */}
      {laedt ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-black/30" /></div>
      ) : !stellen.length ? (
        <p className="mt-6 text-[13px] font-medium text-black/50">Noch keine Stelle eingetragen.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {stellen.map(s => {
            const abgelaufen = !!s.laeuftAbAm && s.laeuftAbAm < heute;
            return (
              <div key={s.id} className={`rounded-xl border p-3 ${s.aktiv && !abgelaufen ? "border-black/12 bg-white" : "border-black/10 bg-black/[0.03]"}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-black text-black">{s.titel}</p>
                    <p className="truncate text-[12.5px] font-bold text-black/60">
                      {s.firma}{s.ort ? ` · ${s.ort}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-black">
                      <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-black/60">
                        {s.arbeitsform === "remote" ? "Remote" : s.arbeitsform === "hibrid" ? "Hybrid" : "Vor Ort"}
                      </span>
                      <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-black/60">DE {s.deutschMin}</span>
                      {geld(s) && <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-emerald-700">{geld(s)}</span>}
                      {!s.aktiv && <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-black/45">inaktiv</span>}
                      {abgelaufen && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700">abgelaufen</span>}
                      {!s.link && <span className="rounded-full bg-red-500/12 px-2 py-0.5 text-red-600">kein Link</span>}
                    </div>
                  </div>
                  <button type="button" onClick={() => oeffnen(s)} aria-label="Ändern"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-black/15 text-black/60 transition active:scale-95">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => void loeschen(s.id)}
                    aria-label={scharf === s.id ? "Wirklich löschen" : "Löschen"}
                    style={scharf === s.id ? { background: "#dc2626", color: "#fff" } : undefined}
                    className={`grid h-8 shrink-0 place-items-center rounded-lg border border-red-400/40 transition active:scale-95 ${
                      scharf === s.id ? "w-auto px-2.5 text-[11px] font-black" : "w-8 text-red-500"}`}>
                    {scharf === s.id ? "Wirklich?" : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
