"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Ban, Eye } from "lucide-react";

// Admin-Tool fürs Thema „Surprise him": jede Sendung mit Datum, Empfänger, Öffnungen und
// Status. Absichtlich OHNE Vorschau des Videos — das ist privater Inhalt echter Menschen;
// der Admin braucht nur den Nachweis und den Not-Aus (Link töten).
// Weiße Box wie alle Admin-Tools; ohne Admin-PIN blendet es sich aus.

type Entry = {
  id: string; createdAt: string; expiresAt: string; toEmail: string;
  fromName?: string; revoked?: boolean; opened?: number; consentText?: string;
};

export default function SurpriseAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let p = "";
    try {
      p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p); setIsAdmin(!!p && !localStorage.getItem("lb_preview_model"));
    } catch { /**/ }
    if (!p) { setLoading(false); return; }
    fetch("/api/surprise-send", { headers: { "x-try-look-admin-pin": p }, cache: "no-store" })
      .then(r => r.ok ? r.json() : { entries: [] })
      .then(d => setEntries(Array.isArray(d.entries) ? d.entries : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!isAdmin) return null;

  const kill = async (id: string) => {
    if (confirmId !== id) { setConfirmId(id); setTimeout(() => setConfirmId(c => (c === id ? "" : c)), 2500); return; }
    setConfirmId(""); setMsg("");
    const r = await fetch("/api/surprise-send", {
      method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": pin },
      body: JSON.stringify({ revoke: id }),
    }).catch(() => null);
    if (r?.ok) { setEntries(e => e.map(x => (x.id === id ? { ...x, revoked: true } : x))); setMsg("Link abgeschaltet."); }
    else setMsg("Hat nicht geklappt.");
  };

  const fmt = (iso: string) => {
    try { const d = new Date(iso); return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
    catch { return iso; }
  };
  const live = entries.filter(e => !e.revoked && Date.parse(e.expiresAt) > Date.now()).length;

  return (
    <div className="rounded-2xl border border-white/15 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/50">Nur für dich sichtbar</p>
      <h2 className="mt-1 flex items-center gap-2 text-[17px] font-black text-black">
        <Mail className="h-4 w-4" /> Surprise-Sendungen
      </h2>
      <p className="mt-1 text-[12px] font-bold text-black/60">
        {entries.length} verschickt · {live} Links noch aktiv. Videos werden hier bewusst NICHT
        angezeigt — das ist privater Inhalt. Bei einer Beschwerde: Link abschalten.
      </p>
      {msg && <p className="mt-2 text-[12px] font-black text-black">{msg}</p>}

      {loading ? (
        <div className="mt-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-black/40" /></div>
      ) : entries.length === 0 ? (
        <p className="mt-4 text-[13px] font-bold text-black/50">Noch nichts verschickt.</p>
      ) : (
        <ul className="mt-3 divide-y divide-black/10">
          {entries.map(e => {
            const dead = e.revoked || Date.parse(e.expiresAt) < Date.now();
            return (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-black text-black">{e.toEmail}</p>
                  <p className="text-[11px] font-bold text-black/55">
                    {fmt(e.createdAt)}{e.fromName ? ` · von ${e.fromName}` : ""} ·{" "}
                    <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{e.opened ?? 0}</span>
                    {dead ? " · abgelaufen/abgeschaltet" : ` · läuft bis ${fmt(e.expiresAt)}`}
                  </p>
                </div>
                {!dead && (
                  <button type="button" onClick={() => void kill(e.id)}
                    className={`flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[11px] font-black transition ${confirmId === e.id ? "bg-red-600 text-white" : "bg-black/5 text-black/70"}`}>
                    <Ban className="h-3.5 w-3.5" /> {confirmId === e.id ? "Wirklich?" : "Abschalten"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
