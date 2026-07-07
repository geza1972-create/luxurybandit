"use client";

import { useEffect, useState } from "react";
import { Loader2, Play, X } from "lucide-react";

type Clip = { id: string; poster: string; video: string; name: string; showcase: boolean };

// Direct signed URL + lazy (avoid /_next/image 429 when 100+ posters load at once).
const thumb = (url: string) => url;

// Admin-only picker for the About step-3 "Watch" videos: opens the feed clips,
// admin taps to choose which play in step 3. Toggles set-featured (kind:generation).
export default function AboutVideoPicker() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Clip[]>([]);
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pin = () => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } };
  useEffect(() => { setIsAdmin(!!pin()); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/try-this-look?feedclips=1", { headers: { "x-try-look-admin-pin": pin() } });
      const d = await r.json();
      const list: Clip[] = Array.isArray(d.clips) ? d.clips : [];
      setItems(list);
      setInitial(new Set(list.filter(c => c.showcase).map(c => c.id)));
    } catch { /**/ }
    finally { setLoading(false); }
  };
  const openList = () => { setOpen(true); void load(); };

  // Toggle LOCALLY only — saved on "Apply" so fast taps aren't blocked.
  const toggle = (c: Clip) => setItems(prev => prev.map(x => x.id === c.id ? { ...x, showcase: !x.showcase } : x));

  const apply = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const now = new Set(items.filter(c => c.showcase).map(c => c.id));
      const toAdd = [...now].filter(id => !initial.has(id));
      const toRemove = [...initial].filter(id => !now.has(id));
      const post = (ids: string[], featured: boolean) => ids.length ? fetch("/api/try-this-look", {
        method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": pin() },
        body: JSON.stringify({ action: "set-featured", kind: "generation", ids, featured }),
      }) : Promise.resolve();
      await Promise.all([post(toAdd, true), post(toRemove, false)]);
      setOpen(false);
    } catch { alert("Speichern fehlgeschlagen."); }
    finally { setSaving(false); }
  };

  if (!isAdmin) return null;
  const count = items.filter(i => i.showcase).length;

  return (
    <>
      <button type="button" onClick={openList}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-amber-400/40 bg-amber-400/[0.06] px-4 py-2.5 text-[12px] font-black text-amber-400 active:scale-95 transition-transform">
        ▶ Videos für den Showcase auswählen
      </button>

      {open && (
        <div className="fixed inset-0 z-[95] flex flex-col bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="lb-phone-col mt-auto max-h-[85dvh] overflow-hidden rounded-t-3xl border-t border-white/10 bg-[#141210]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-black text-white">Showcase-Videos {count > 0 && <span className="text-amber-400">· {count} gewählt</span>}</p>
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white"><X className="h-4 w-4" /></button>
            </div>
            <p className="px-4 pt-2 text-[11px] font-bold text-white/45">Tippe die Videos an (mehrere möglich) und dann „Auswahl übernehmen". Die gewählten führen Schritt 3; sonst die Featured-Models.</p>
            {loading ? (
              <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
            ) : (
              <div className="grid max-h-[calc(85dvh-150px)] grid-cols-4 gap-1.5 overflow-y-auto overscroll-contain p-3">
                {items.map(c => (
                  <button key={c.id} type="button" onClick={() => toggle(c)}
                    className={`relative block overflow-hidden rounded-lg border-2 lb-media-bg active:scale-95 transition ${c.showcase ? "border-amber-400 ring-2 ring-amber-400/40" : "border-white/10"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumb(c.poster)} alt={c.name} loading="lazy" decoding="async"
                      onError={(e) => { const im = e.currentTarget; if (im.src !== c.poster) im.src = c.poster; }}
                      className="aspect-[3/4] w-full object-cover object-top" />
                    <span className="absolute inset-0 grid place-items-center"><Play className="h-5 w-5 text-white/80 drop-shadow" fill="currentColor" /></span>
                    {c.showcase && <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-[13px] font-black text-black shadow">✓</span>}
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
