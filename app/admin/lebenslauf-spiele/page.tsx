"use client";

import { useEffect, useState } from "react";
import { Eingabe, Knopf, Laden } from "@/components/CI";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

/**
 * DIE SPIELZÜGE DES SPIELPLATZES (Owner 25.08.2026: „Eine Sache muss ich aber doch als
 * Admin sehen: wer alles was probiert hat") — die Ablage aus /api/lebenslauf-spiel,
 * neueste zuerst. Je Gerät: E-Mail (das Tor — jeder Spieler ist ein Lead), Sprache und
 * die Züge im Wortlaut (vom eingefügten Lebenslauf nur die ersten Zeilen als Kostprobe).
 * Nebenbei Marktforschung: Man liest hier, was die Leute wirklich versuchen.
 *
 * Dasselbe kleine PIN-Gerüst wie /admin/lebenslauf (der Bewerber-Bereich bleibt ein
 * eigenes Produkt mit eigenen, kleinen Admin-Seiten).
 */

type Zug = { art: string; ts: string; probe: string };
type Stand = { device: string; email: string; lang: string; zuege: Zug[]; telefon?: string };

export default function LebenslaufSpieleAdminSeite() {
  const [pin, setPin] = useState("");
  const [ready, setReady] = useState(false);
  const [darf, setDarf] = useState(false);
  const [staende, setStaende] = useState<Stand[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState("");

  const kopf = (p = pin) => {
    let tok = "";
    try { tok = getStoredAuthSession()?.access_token ?? ""; } catch { /**/ }
    return { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...(p ? { "x-try-look-admin-pin": p } : {}) };
  };

  const laden = async (p = pin) => {
    setLaedt(true); setFehler("");
    try {
      const r = await fetch("/api/lebenslauf-spiel", { headers: kopf(p), cache: "no-store" });
      if (!r.ok) { setDarf(false); setFehler(r.status === 403 ? "" : "Konnte Liste nicht laden."); setLaedt(false); return; }
      const d = await r.json();
      setDarf(true);
      const liste = (Array.isArray(d?.staende) ? d.staende : []) as Stand[];
      /* Neueste zuerst — nach dem letzten Zug sortiert. */
      liste.sort((a, b) => (b.zuege.at(-1)?.ts ?? "").localeCompare(a.zuege.at(-1)?.ts ?? ""));
      setStaende(liste);
    } catch { setFehler("Keine Verbindung."); }
    setLaedt(false);
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

  const wann = (ts: string) => {
    try { return new Date(ts).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
    catch { return ts; }
  };

  return (
    <main className="lb-bg min-h-screen px-4 pb-24 pt-8 text-white">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-[22px] font-black">Spielplatz — wer hat was probiert</h1>
        <p className="mt-1.5 text-[13px] font-bold leading-snug text-white/60">
          Gespielt wird ohne Anmeldung; die Kontaktdaten stammen aus dem eingefügten Lebenslauf. Vom Lebenslauf selbst stehen hier nur die ersten Zeilen.
        </p>

        {laedt && <div className="mt-6"><Laden art="flaeche" text="Lädt …" /></div>}
        {fehler && <p className="mt-4 text-[13px] font-bold text-red-400">{fehler}</p>}

        {!laedt && staende.length === 0 && !fehler && (
          <p className="mt-6 text-[13px] font-bold text-white/50">Noch hat niemand gespielt.</p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {staende.map(stand => (
            <div key={stand.device} className="rounded-2xl border border-white/15 bg-white/[0.04] p-3.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-[13.5px] font-black text-white/90">{stand.email || "ohne E-Mail"}</p>
                {stand.telefon && <p className="text-[12px] font-bold text-white/60">{stand.telefon}</p>}
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/40">
                  {stand.lang} · {stand.zuege.length}/5 · Gerät {stand.device.slice(0, 8)}
                </p>
              </div>
              <div className="mt-2.5 flex flex-col gap-2">
                {stand.zuege.map((z, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <p className="text-[10.5px] font-black uppercase tracking-[0.12em] text-white/45">
                      {z.art} · {wann(z.ts)}
                    </p>
                    <p className="mt-1 text-[12px] font-medium leading-snug text-white/75">{z.probe}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
