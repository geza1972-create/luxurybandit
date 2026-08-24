"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Lock, ExternalLink } from "lucide-react";
import { Eingabe, Knopf, Laden } from "@/components/CI";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

/**
 * DER KONTAKT-UMSCHALTER (Owner 24.08.2026: „Kontakt-Umschalter bauen" — schliesst die
 * offene Baustelle aus Memory `lebenslauf-portal-stand-21-08`, Punkt 1).
 *
 * NUR DER BETREIBER sieht diese Seite: Sie listet jedes Bewerber-Profil und lässt
 * `kontaktSichtbar` je Profil an- und ausschalten — die eine Zahl, die das
 * Vermittlungsmodell trägt (Firma bestätigt Interesse → Kontaktdaten frei).
 *
 * EIGENE, KLEINE SEITE statt ein Tab im grossen `/admin` (3800+ Zeilen für Curator/Try-on) —
 * der Bewerber-Bereich ist bewusst ein eigenes Produkt (Memory `lebenslauf-executive-vorlage`),
 * sein Admin-Werkzeug bleibt es auch.
 */

type Profil = { id: string; erstelltAm: string; name?: string; email?: string; bezahlt: boolean; kontaktSichtbar?: boolean; aboAktiv?: boolean };

export default function LebenslaufAdminSeite() {
  const [pin, setPin] = useState("");
  const [ready, setReady] = useState(false);
  const [darf, setDarf] = useState(false);
  const [liste, setListe] = useState<Profil[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState("");
  const [busyId, setBusyId] = useState("");

  const kopf = () => {
    let tok = "";
    try { tok = getStoredAuthSession()?.access_token ?? ""; } catch { /**/ }
    return { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...(pin ? { "x-try-look-admin-pin": pin } : {}) };
  };

  const laden = async (aktuelleErlaubnis = pin) => {
    setLaedt(true); setFehler("");
    try {
      const r = await fetch("/api/lebenslauf-kontakt", { headers: kopf(), cache: "no-store" });
      if (!r.ok) { setDarf(false); setFehler(r.status === 403 ? "" : "Konnte Liste nicht laden."); setLaedt(false); return; }
      const d = await r.json();
      setDarf(true);
      setListe(Array.isArray(d?.profile) ? d.profile : []);
    } catch { setFehler("Keine Verbindung."); }
    setLaedt(false);
    void aktuelleErlaubnis;
  };

  useEffect(() => {
    let p = "";
    try { p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    setPin(p);
    setReady(true);
    void laden(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pinEingeben = () => {
    try { localStorage.setItem("luxurybandit-try-look-admin-pin", pin); } catch { /**/ }
    void laden(pin);
  };

  const umschalten = async (p: Profil) => {
    const ziel = !p.kontaktSichtbar;
    setBusyId(p.id);
    setListe(l => l.map(x => x.id === p.id ? { ...x, kontaktSichtbar: ziel } : x));
    try {
      const r = await fetch("/api/lebenslauf-kontakt", { method: "POST", headers: kopf(), body: JSON.stringify({ id: p.id, sichtbar: ziel }) });
      if (!r.ok) { setListe(l => l.map(x => x.id === p.id ? { ...x, kontaktSichtbar: !ziel } : x)); setFehler("Hat nicht geklappt — bitte noch einmal."); }
    } catch { setListe(l => l.map(x => x.id === p.id ? { ...x, kontaktSichtbar: !ziel } : x)); setFehler("Keine Verbindung."); }
    setBusyId("");
  };

  if (!ready) return null;

  if (!darf) {
    return (
      <main className="lb-bg flex min-h-screen items-center justify-center px-4 text-white">
        <div className="w-full max-w-xs rounded-2xl border border-white/15 bg-white/[0.04] p-5">
          <p className="text-[13px] font-black text-white/85">Admin-PIN</p>
          <Eingabe type="password" className="mt-3" placeholder="PIN" value={pin}
            onChange={e => setPin(e.target.value)} onKeyDown={e => { if (e.key === "Enter") pinEingeben(); }} />
          <div className="mt-3"><Knopf art="gold" onClick={pinEingeben}>Anmelden</Knopf></div>
        </div>
      </main>
    );
  }

  return (
    <main className="lb-bg min-h-screen px-4 pb-24 pt-8 text-white">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-[22px] font-black">Kontakt-Freigabe</h1>
        <p className="mt-1.5 text-[13px] font-bold leading-snug text-white/60">
          Freigeben, sobald eine Firma konkretes Interesse an genau diesem Kandidaten bestätigt hat.
        </p>

        {laedt && <div className="mt-6"><Laden art="flaeche" text="Lädt …" /></div>}
        {fehler && <p className="mt-4 text-[13px] font-bold text-red-400">{fehler}</p>}

        {!laedt && liste.length === 0 && !fehler && (
          <p className="mt-6 text-[13px] font-bold text-white/50">Noch keine Profile.</p>
        )}

        <div className="mt-6 flex flex-col gap-2.5">
          {liste.map(p => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.04] p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[14px] font-black text-white/90">{p.name || "(ohne Namen)"}</p>
                  {!p.bezahlt && <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] font-black uppercase text-white/50">Unbezahlt</span>}
                  {p.aboAktiv && <span className="shrink-0 rounded-full bg-[#f6cf51]/15 px-2 py-0.5 text-[9.5px] font-black uppercase text-[#f6cf51]">Abo</span>}
                </div>
                <p className="truncate text-[12px] font-bold text-white/50">{p.email || "—"}</p>
                <a href={`/lebenslauf/${p.id}`} target="_blank" rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.08em] text-white/40 transition hover:text-white/80">
                  Profil ansehen<ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <button type="button" disabled={busyId === p.id} onClick={() => void umschalten(p)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11.5px] font-black transition active:scale-95 disabled:opacity-50 ${
                  p.kontaktSichtbar ? "bg-[#2f7d4f] text-white" : "border border-white/20 text-white/70"}`}>
                {p.kontaktSichtbar ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                {p.kontaktSichtbar ? "Kontakt frei" : "Kontakt gesperrt"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
