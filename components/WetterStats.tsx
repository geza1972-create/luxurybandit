"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";

// Admin-Panel: Wetter-am-Morgen Insights — Seitenaufrufe + Chats (heute / 7 Tage / gesamt).
// Zahlen aus /api/wetter-stats (eigenes Blob, nicht im 500er-Event-Cap). Admin-only.

type Stats = { viewsByDay: Record<string, number>; chatsByDay: Record<string, number>; viewsTotal: number; chatsTotal: number };

const sumDays = (m: Record<string, number>, days: number) => {
  let total = 0;
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    total += m[d.toISOString().slice(0, 10)] ?? 0;
  }
  return total;
};

export default function WetterStats({ modelId = "curator-1783683672619-td4cy" }: { modelId?: string } = {}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    try {
      const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p);
      setIsAdmin(!!p && !localStorage.getItem("lb_preview_model"));
    } catch { /**/ }
  }, []);

  useEffect(() => {
    if (!isAdmin || !pin) return;
    fetch(`/api/wetter-stats?model=${encodeURIComponent(modelId)}`, { headers: { "x-try-look-admin-pin": pin }, cache: "no-store" })
      .then(r => r.ok ? r.json() : null).then(d => { if (d?.stats) setStats(d.stats); }).catch(() => {});
  }, [isAdmin, pin, modelId]);

  if (!isAdmin) return null;

  const v = stats ?? { viewsByDay: {}, chatsByDay: {}, viewsTotal: 0, chatsTotal: 0 };
  const cell = (label: string, n: number) => (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-center">
      <p className="text-[20px] font-black leading-none text-white">{n.toLocaleString("de-DE")}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/45">{label}</p>
    </div>
  );

  return (
    <div className="mt-4 rounded-2xl border border-white/15 bg-white/[0.04] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c9a23f]">Nur für dich sichtbar</p>
      <h2 className="mt-1 flex items-center gap-2 text-[18px] font-black text-white"><BarChart3 className="h-4 w-4 text-[#c9a23f]" /> Insights</h2>

      <p className="mt-3 text-[12px] font-black uppercase tracking-wide text-white/55">👁 Seitenaufrufe</p>
      <div className="mt-1.5 grid grid-cols-3 gap-2">
        {cell("Heute", sumDays(v.viewsByDay, 1))}
        {cell("7 Tage", sumDays(v.viewsByDay, 7))}
        {cell("Gesamt", v.viewsTotal)}
      </div>

      <p className="mt-4 text-[12px] font-black uppercase tracking-wide text-white/55">💬 Chats</p>
      <div className="mt-1.5 grid grid-cols-3 gap-2">
        {cell("Heute", sumDays(v.chatsByDay, 1))}
        {cell("7 Tage", sumDays(v.chatsByDay, 7))}
        {cell("Gesamt", v.chatsTotal)}
      </div>
      <p className="mt-2 text-[11px] font-semibold text-white/40">Deine eigenen (Admin-)Besuche werden nicht mitgezählt.</p>
    </div>
  );
}
