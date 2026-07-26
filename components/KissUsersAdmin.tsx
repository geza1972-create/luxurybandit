"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, Trash2, Play } from "lucide-react";

// Admin-Tool fürs Kiss-Theme: die ECHTEN Kiss-Nutzungen (nicht die Wetter-Abonnenten!) —
// jede fertige Generierung mit Datum, gewähltem Model, bezahlt ja/nein + Video-Link.
// Weiße Box wie alle Admin-Tools; blendet sich ohne Admin-PIN selbst aus.

type Entry = { id: string; createdAt: string; modelId?: string; modelName?: string; videoUrl?: string; paid?: boolean };

export default function KissUsersAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(""); // Zwei-Tap-Löschen (kein window.confirm auf Mobile)

  useEffect(() => {
    let p = "";
    try {
      p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p); setIsAdmin(!!p && !localStorage.getItem("lb_preview_model"));
    } catch { /**/ }
    if (!p) { setLoading(false); return; }
    fetch("/api/kiss-log", { headers: { "x-try-look-admin-pin": p }, cache: "no-store" })
      .then(r => r.ok ? r.json() : { entries: [] })
      .then(d => setEntries(Array.isArray(d.entries) ? d.entries : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!isAdmin) return null;

  const remove = async (id: string) => {
    if (confirmId !== id) { setConfirmId(id); setTimeout(() => setConfirmId(c => (c === id ? "" : c)), 2500); return; }
    setConfirmId("");
    const r = await fetch("/api/kiss-log", { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": pin }, body: JSON.stringify({ remove: id }) }).catch(() => null);
    if (r?.ok) setEntries(e => e.filter(x => x.id !== id));
  };

  const fmt = (iso: string) => {
    try { const d = new Date(iso); return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
    catch { return iso; }
  };
  const paidCount = entries.filter(e => e.paid).length;

  return (
    <div className="rounded-2xl border border-white/15 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/50">Nur für dich sichtbar</p>
      <h2 className="mt-1 flex items-center gap-2 text-[18px] font-black text-white">
        <Users className="h-4 w-4 text-black/50" /> Kiss-Videos <span className="text-white/40">({entries.length})</span>
      </h2>
      <p className="mt-0.5 text-[12px] font-semibold text-white/60">Jede fertige Kiss-Generierung — {paidCount} bezahlt · {entries.length - paidCount} unbezahlt (verpixelt beim Nutzer).</p>

      {loading ? (
        <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-[12px] font-bold text-white/40">Noch keine Kiss-Videos generiert.</p>
      ) : (
        <div className="mt-3 divide-y divide-black/[0.06]">
          {entries.map(e => (
            <div key={e.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-black text-white">{e.modelName || "(Model unbekannt)"}</p>
                <p className="text-[11px] font-bold text-white/50">{fmt(e.createdAt)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${e.paid ? "bg-emerald-500/15 text-emerald-600" : "bg-black/[0.06] text-black/50"}`}>
                {e.paid ? "✓ bezahlt" : "unbezahlt"}
              </span>
              {e.videoUrl && (
                <a href={e.videoUrl} target="_blank" rel="noreferrer"
                  className="lb-onmedia flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#1a160f] px-2.5 text-[11px] font-black text-white active:scale-95 transition">
                  <Play className="h-3 w-3" /> Video
                </a>
              )}
              <button type="button" onClick={() => void remove(e.id)}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition active:scale-95 ${confirmId === e.id ? "bg-red-500 text-white" : "bg-black/[0.05] text-black/40"}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
