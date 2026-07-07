"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

type Garment = { id: string; name: string; img: string; featured: boolean };

// Load the signed Supabase URL directly + lazy — going through /_next/image for 60+
// images at once rate-limits Supabase (429). Lazy loading only fetches visible tiles.
const thumb = (url: string) => url;

// Admin-only picker rendered ON the About "3 steps" page: opens a list of ALL
// wardrobe garments and lets the admin choose which appear in step 2 (the
// showcase). Toggling calls set-featured (kind:look). Hidden for non-admins.
export default function AboutGarmentPicker() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Garment[]>([]);
  const [initial, setInitial] = useState<Set<string>>(new Set()); // featured ids at load
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pin = () => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } };
  useEffect(() => { setIsAdmin(!!pin()); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/try-this-look?garments=1", { headers: { "x-try-look-admin-pin": pin() } });
      const d = await r.json();
      const list: Garment[] = Array.isArray(d.garments) ? d.garments : [];
      setItems(list);
      setInitial(new Set(list.filter(g => g.featured).map(g => g.id)));
    } catch { /**/ }
    finally { setLoading(false); }
  };
  const openList = () => { setOpen(true); void load(); };

  // Toggle LOCALLY only — no per-tap API call (that blocked fast taps). Saved on "Apply".
  const toggle = (g: Garment) => setItems(prev => prev.map(x => x.id === g.id ? { ...x, featured: !x.featured } : x));

  // Save the whole selection at once, then close.
  const apply = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const nowFeatured = new Set(items.filter(g => g.featured).map(g => g.id));
      const toAdd = [...nowFeatured].filter(id => !initial.has(id));
      const toRemove = [...initial].filter(id => !nowFeatured.has(id));
      const post = (ids: string[], featured: boolean) => ids.length ? fetch("/api/try-this-look", {
        method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": pin() },
        body: JSON.stringify({ action: "set-featured", kind: "look", ids, featured }),
      }) : Promise.resolve();
      await Promise.all([post(toAdd, true), post(toRemove, false)]);
      setOpen(false);
    } catch { alert("Speichern fehlgeschlagen."); }
    finally { setSaving(false); }
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
          <div className="lb-phone-col mt-auto max-h-[85dvh] overflow-hidden rounded-t-3xl border-t border-white/10 bg-[#141210]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-black text-white">Showcase-Klamotten {count > 0 && <span className="text-amber-400">· {count} gewählt</span>}</p>
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white"><X className="h-4 w-4" /></button>
            </div>
            <p className="px-4 pt-2 text-[11px] font-bold text-white/45">Tippe die Stücke an (mehrere möglich) und dann „Auswahl übernehmen". Die gewählten führen Schritt 2; sonst die ersten paar.</p>
            {loading ? (
              <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
            ) : (
              <div className="grid max-h-[calc(85dvh-150px)] grid-cols-4 gap-1.5 overflow-y-auto overscroll-contain p-3">
                {items.map(g => (
                  <button key={g.id} type="button" onClick={() => toggle(g)}
                    className={`relative block overflow-hidden rounded-lg border-2 bg-white active:scale-95 transition ${g.featured ? "border-amber-400 ring-2 ring-amber-400/40" : "border-black/10"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumb(g.img)} alt={g.name} loading="lazy" decoding="async"
                      onError={(e) => { const im = e.currentTarget; if (im.src !== g.img) im.src = g.img; }}
                      className="aspect-[3/4] w-full object-contain" />
                    {g.featured && <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-[13px] font-black text-black shadow">★</span>}
                  </button>
                ))}
              </div>
            )}
            {/* Sticky footer — save the whole selection at once. */}
            <div className="border-t border-white/10 p-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>
              <button type="button" onClick={() => void apply()} disabled={saving}
                className="lb-gold flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-black active:scale-95 transition disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Auswahl übernehmen{count > 0 ? ` · ${count}` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
