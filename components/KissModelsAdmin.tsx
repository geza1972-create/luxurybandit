"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, Heart } from "lucide-react";

// Admin-Tool fürs Kiss-Theme: WELCHE Models stehen im Kiss-Funnel-Grid zur Auswahl?
// Häkchen setzen → Speichern (leer = alle Models). Weiße Box wie alle Admin-Tools;
// blendet sich ohne Admin-PIN selbst aus (wie WetterSubscribers).

type Model = { id: string; name: string; photoUrl: string };

export default function KissModelsAdmin({ theme = "kiss" }: {
  /**
   * WELCHES THEMA (Owner 31.07.2026: „ich will die Wedding-Seite managen wie Kiss").
   *
   * Vorher schrieb dieses Werkzeug fest in die Kiss-Auswahl — wer auf der Hochzeitsseite
   * Models anhakte, aenderte damit das Kuss-Karussell. Jetzt hat jedes Thema seine eigene.
   */
  theme?: string;
} = {}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p); setIsAdmin(!!p && !localStorage.getItem("lb_preview_model"));
    } catch { /**/ }
    Promise.all([
      fetch("/api/try-this-look?models=1").then(r => r.json()).catch(() => ({})),
      fetch(`/api/theme-media?theme=${encodeURIComponent(theme)}`).then(r => r.json()).catch(() => ({})),
    ]).then(([m, c]) => {
      setModels((Array.isArray(m.models) ? m.models : []).filter((x: Model) => !!x.photoUrl));
      setSelected(new Set(Array.isArray(c.modelIds) ? c.modelIds : []));
    }).finally(() => setLoading(false));
  }, []);

  if (!isAdmin) return null;

  const toggle = (id: string) => {
    setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setMsg("");
  };

  const save = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await fetch(`/api/theme-media?theme=${encodeURIComponent(theme)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-try-look-admin-pin": pin },
        body: JSON.stringify({ modelIds: [...selected] }),
      });
      const d = await r.json().catch(() => ({}));
      setMsg(r.ok ? `✅ Gespeichert — ${selected.size === 0 ? "alle Models" : `${selected.size} Models`} im Kiss-Grid.` : (d?.error ?? "Speichern fehlgeschlagen."));
    } catch { setMsg("Netzwerkfehler."); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-white/15 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/50">Nur für dich sichtbar</p>
      <h2 className="mt-1 flex items-center gap-2 text-[18px] font-black text-white"><Heart className="h-4 w-4 text-black/50" /> Kiss-Models</h2>
      <p className="mt-0.5 text-[12px] font-semibold text-white/60">Welche Models im Kiss-Funnel angeboten werden. Keine Auswahl = alle.</p>

      {loading ? (
        <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {models.map(m => {
            const on = selected.has(m.id);
            return (
              <button key={m.id} type="button" onClick={() => toggle(m.id)}
                className={`relative overflow-hidden rounded-xl border-2 transition active:scale-[0.98] ${on ? "border-emerald-500" : "border-black/10"}`}>
                <div className="relative aspect-[3/4] w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.photoUrl} alt={m.name} className={`h-full w-full object-cover object-top ${on ? "" : "opacity-60"}`} />
                  {on && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500"><Check className="h-3.5 w-3.5 text-white" /></span>}
                </div>
                <div className="px-1 py-1"><span className="line-clamp-1 text-[10px] font-black text-white">{m.name}</span></div>
              </button>
            );
          })}
        </div>
      )}

      <button type="button" onClick={() => void save()} disabled={busy || loading}
        className="lb-onmedia mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1a160f] text-[14px] font-black text-white active:scale-95 transition disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Auswahl speichern
      </button>
      {msg && <p className="mt-2 rounded-lg bg-black/[0.05] px-3 py-2 text-[12px] font-bold text-black/70">{msg}</p>}
    </div>
  );
}
