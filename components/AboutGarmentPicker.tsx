"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

type Garment = { id: string; name: string; img: string; featured: boolean };

// Admin-only picker rendered ON the About "3 steps" page: opens a list of ALL
// wardrobe garments and lets the admin choose which appear in step 2 (the
// showcase). Toggling calls set-featured (kind:look). Hidden for non-admins.
export default function AboutGarmentPicker() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");

  const pin = () => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } };
  useEffect(() => { setIsAdmin(!!pin()); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/try-this-look?garments=1", { headers: { "x-try-look-admin-pin": pin() } });
      const d = await r.json();
      setItems(Array.isArray(d.garments) ? d.garments : []);
    } catch { /**/ }
    finally { setLoading(false); }
  };
  const openList = () => { setOpen(true); void load(); };

  const toggle = async (g: Garment) => {
    if (busy) return;
    setBusy(g.id);
    const next = !g.featured;
    setItems(prev => prev.map(x => x.id === g.id ? { ...x, featured: next } : x));
    try {
      await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-try-look-admin-pin": pin() },
        body: JSON.stringify({ action: "set-featured", kind: "look", ids: [g.id], featured: next }),
      });
    } catch { setItems(prev => prev.map(x => x.id === g.id ? { ...x, featured: !next } : x)); }
    finally { setBusy(""); }
  };

  if (!isAdmin) return null;
  const count = items.filter(i => i.featured).length;

  return (
    <>
      <button type="button" onClick={openList}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-amber-400/40 bg-amber-400/[0.06] px-4 py-2.5 text-[12px] font-black text-amber-400 active:scale-95 transition-transform">
        ★ Klamotten für den Showcase auswählen
      </button>

      {open && (
        <div className="fixed inset-0 z-[95] flex flex-col bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="lb-phone-col mt-auto flex max-h-[85dvh] flex-col rounded-t-3xl border-t border-white/10 bg-[#141210]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-black text-white">Showcase-Klamotten {count > 0 && <span className="text-amber-400">· {count} gewählt</span>}</p>
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white"><X className="h-4 w-4" /></button>
            </div>
            <p className="px-4 pt-2 text-[11px] font-bold text-white/45">Tippe ein Stück an, um es im „How it works"-Schritt 2 zu zeigen (die gewählten führen; sonst die ersten paar).</p>
            {loading ? (
              <div className="grid flex-1 place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
            ) : (
              <div className="grid grid-cols-3 gap-2 overflow-y-auto p-4">
                {items.map(g => (
                  <button key={g.id} type="button" onClick={() => void toggle(g)}
                    className={`relative overflow-hidden rounded-xl border-2 bg-white active:scale-95 transition ${g.featured ? "border-amber-400" : "border-transparent"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.img} alt={g.name} loading="lazy" className="aspect-[3/4] w-full object-contain" />
                    {g.featured && <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-[13px] font-black text-black">★</span>}
                    {busy === g.id && <span className="absolute inset-0 grid place-items-center bg-black/40"><Loader2 className="h-4 w-4 animate-spin text-white" /></span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
