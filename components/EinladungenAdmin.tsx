"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Eye, Trash2, ExternalLink } from "lucide-react";

/**
 * DIE EINLADUNGEN — und die eine Zahl, die über den Kanal entscheidet.
 *
 * Owner 31.07.2026. Eine Hochzeitseinladung geht an 50 bis 150 Menschen; jede Öffnung ist ein
 * Besucher, den wir nicht bezahlt haben. Ob daraus wirklich ein Kanal wird, steht in genau
 * einer Spalte: **Öffnungen je Einladung**.
 *
 * Deshalb steht hier oben die Summe und nicht die Anzahl der Einladungen — verkaufte
 * Einladungen zählen schon woanders. Interessant ist, wie viele Menschen sie erreicht haben.
 */

type Einladung = {
  id: string; createdAt: string; sie?: string; er?: string; datum?: string; ort?: string;
  opens?: number; lastOpenAt?: string; revoked?: boolean; email?: string; lang?: string;
};

export default function EinladungenAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [rows, setRows] = useState<Einladung[]>([]);
  const [loading, setLoading] = useState(true);
  const [arm, setArm] = useState("");

  useEffect(() => {
    let p = "";
    try { p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    setPin(p); setIsAdmin(!!p);
    if (!p) { setLoading(false); return; }
    fetch("/api/einladung", { headers: { "x-try-look-admin-pin": p }, cache: "no-store" })
      .then(r => r.json())
      .then(d => setRows(Array.isArray(d?.entries) ? d.entries : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!isAdmin) return null;

  const zurueckziehen = async (id: string) => {
    // Zwei Tipps statt window.confirm — der Dialog erscheint auf dem Handy nicht.
    if (arm !== id) { setArm(id); setTimeout(() => setArm(a => (a === id ? "" : a)), 4000); return; }
    setArm("");
    const r = await fetch("/api/einladung", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-try-look-admin-pin": pin },
      body: JSON.stringify({ revoke: id }),
    }).catch(() => null);
    if (r?.ok) setRows(rs => rs.map(x => (x.id === id ? { ...x, revoked: true } : x)));
  };

  const zeit = (s?: string) => {
    try { return s ? new Date(s).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"; }
    catch { return "—"; }
  };

  const aktive = rows.filter(r => !r.revoked);
  const oeffnungen = rows.reduce((n, r) => n + (r.opens ?? 0), 0);
  const schnitt = aktive.length ? Math.round(oeffnungen / aktive.length) : 0;

  return (
    <div className="rounded-2xl border border-white/15 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/50">Nur für dich sichtbar</p>
      <h2 className="mt-1 flex items-center gap-2 text-[18px] font-black text-black">
        <Mail className="h-4 w-4 text-black/50" /> Einladungen <span className="text-black/40">({aktive.length})</span>
      </h2>
      {/* DIE ZAHL, AUF DIE ES ANKOMMT. Tor 2 aus dem Konzept: ab 15 Öffnungen je Einladung
          verschickt sie das Ding wirklich — darunter liegt es an der Seite, nicht an ihr. */}
      <p className="mt-0.5 text-[12px] font-semibold text-black/60">
        {oeffnungen} Öffnungen insgesamt · <span className="font-black text-black">{schnitt} je Einladung</span> im Schnitt.
        Ab 15 im Schnitt verschicken sie sie wirklich.
      </p>

      {loading ? (
        <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-black/30" /></div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-[13px] font-bold text-black/40">Noch keine Einladung erstellt.</p>
      ) : (
        <div className="mt-3 divide-y divide-black/[0.06]">
          {rows.map(e => (
            <div key={e.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[13px] font-black ${e.revoked ? "text-black/35 line-through" : "text-black"}`}>
                  {e.sie} &amp; {e.er}
                </p>
                <p className="truncate text-[11px] font-bold text-black/50">
                  {e.datum || "ohne Datum"}{e.ort ? ` · ${e.ort}` : ""} · erstellt {zeit(e.createdAt)}
                </p>
                {e.email && <p className="truncate text-[10px] font-bold text-black/35">{e.email}</p>}
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-black text-emerald-700">
                <Eye className="h-3 w-3" /> {e.opens ?? 0}
              </span>
              {!e.revoked && (
                <a href={`/einladung/${e.id}`} target="_blank" rel="noreferrer"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/[0.05] text-black/50 transition active:scale-95">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {!e.revoked && (
                <button type="button" onClick={() => void zurueckziehen(e.id)}
                  aria-label={arm === e.id ? "Wirklich zurückziehen" : "Zurückziehen"}
                  style={arm === e.id ? { background: "#dc2626", color: "#fff" } : undefined}
                  className={`grid h-8 shrink-0 place-items-center rounded-lg border border-red-400/40 transition active:scale-95 ${
                    arm === e.id ? "w-auto px-2.5 text-[11px] font-black" : "w-8 text-red-500"
                  }`}>
                  {arm === e.id ? "Wirklich?" : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
