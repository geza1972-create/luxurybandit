"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Loader2, ExternalLink, Check } from "lucide-react";

const ADMIN_PIN_KEY = "luxurybandit-try-look-admin-pin";
function getPin() { try { return localStorage.getItem(ADMIN_PIN_KEY) ?? ""; } catch { return ""; } }

type Store = {
  id: string;
  name: string;
  network?: string;
  homeUrl: string;
  searchUrlTemplate?: string;
  affiliateTemplate?: string;
  enabled: boolean;
  createdAt?: string;
};

const EMPTY: Store = { id: "", name: "", network: "", homeUrl: "", searchUrlTemplate: "", affiliateTemplate: "", enabled: true };

export default function AdminPartners() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Store | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const headers = () => ({ "Content-Type": "application/json", "x-try-look-admin-pin": getPin() });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/try-this-look?partnerStores=1", { headers: { "x-try-look-admin-pin": getPin() } });
      const data = await res.json();
      setStores(data.partnerStores ?? []);
    } catch { setError("Could not load stores."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.homeUrl.trim()) { setError("Name and home URL are required."); return; }
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "save-partner-store", ...draft }) });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Save failed."); return; }
      setStores(data.partnerStores ?? []);
      setDraft(null);
    } catch { setError("Save failed."); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    const res = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "delete-partner-store", id }) });
    const data = await res.json();
    if (data.partnerStores) setStores(data.partnerStores);
  };

  const field = "h-11 w-full rounded-md border border-black/10 bg-white px-3.5 text-sm font-semibold text-ink outline-none focus:border-cobalt";
  const label = "mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-ink/45";

  return (
    <main className="min-h-screen bg-[#fbfaf7] pb-24 text-ink">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="grid gap-2">
          <a href="/admin" className="inline-flex w-fit items-center gap-1.5 text-xs font-black text-ink/50 transition hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </a>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">LuxuryBandit Admin</div>
          <h1 className="text-3xl font-black leading-none text-ink">Partner stores</h1>
          <p className="max-w-2xl text-sm font-semibold leading-6 text-ink/55">
            The affiliate stores curators source from. <span className="font-black text-ink">Search URL</span> drives style discovery (use <code className="rounded bg-black/5 px-1">{"{q}"}</code>).
            <span className="font-black text-ink"> Affiliate template</span> wraps published shop-links (use <code className="rounded bg-black/5 px-1">{"{url}"}</code> + <code className="rounded bg-black/5 px-1">{"{sid}"}</code>) — leave empty until your network account is live.
          </p>
        </header>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={() => { setDraft({ ...EMPTY }); setError(""); }}
            className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-black text-white active:scale-95 transition">
            <Plus className="h-4 w-4" /> Add store
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink/30" /></div>
        ) : (
          <div className="mt-3 grid gap-3">
            {stores.length === 0 && <p className="py-10 text-center text-sm font-bold text-ink/40">No partner stores yet.</p>}
            {stores.map(s => (
              <div key={s.id} className="rounded-xl border border-black/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-ink">{s.name}</p>
                      {!s.enabled && <span className="rounded-full bg-black/8 px-2 py-0.5 text-[10px] font-black text-ink/50">disabled</span>}
                      {s.affiliateTemplate ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">affiliate live</span>
                        : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">no affiliate yet</span>}
                    </div>
                    {s.network && <p className="mt-0.5 text-[11px] font-bold text-ink/40">{s.network}</p>}
                    <a href={s.homeUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-cobalt">
                      {s.homeUrl} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => { setDraft({ ...EMPTY, ...s }); setError(""); }}
                      className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-black text-ink active:scale-95 transition">Edit</button>
                    <button type="button" onClick={() => void remove(s.id)}
                      className="grid h-8 w-8 place-items-center rounded-full border border-black/10 text-ink/40 hover:text-red-500 active:scale-95 transition"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Editor */}
        {draft && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={e => { if (e.target === e.currentTarget) setDraft(null); }}>
            <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 sm:rounded-3xl">
              <p className="text-lg font-black text-ink">{draft.id ? "Edit store" : "Add store"}</p>
              <div className="mt-4 grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className={label}>Name</span><input className={field} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Revolve" /></div>
                  <div><span className={label}>Network</span><input className={field} value={draft.network ?? ""} onChange={e => setDraft({ ...draft, network: e.target.value })} placeholder="CJ Affiliate" /></div>
                </div>
                <div><span className={label}>Home URL</span><input className={field} value={draft.homeUrl} onChange={e => setDraft({ ...draft, homeUrl: e.target.value })} placeholder="https://www.revolve.com/" /></div>
                <div><span className={label}>Search URL ({"{q}"})</span><input className={field} value={draft.searchUrlTemplate ?? ""} onChange={e => setDraft({ ...draft, searchUrlTemplate: e.target.value })} placeholder="https://www.revolve.com/r/Search.jsp?search={q}" /></div>
                <div><span className={label}>Affiliate template ({"{url}"} + {"{sid}"})</span><input className={field} value={draft.affiliateTemplate ?? ""} onChange={e => setDraft({ ...draft, affiliateTemplate: e.target.value })} placeholder="leave empty until account is live" /></div>
                <label className="flex items-center gap-2 text-sm font-black text-ink">
                  <button type="button" onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}
                    className={`grid h-5 w-5 place-items-center rounded border ${draft.enabled ? "border-cobalt bg-cobalt text-white" : "border-black/20 bg-white"}`}>
                    {draft.enabled && <Check className="h-3.5 w-3.5" />}
                  </button>
                  Enabled (shown to curators)
                </label>
              </div>
              {error && <p className="mt-3 text-xs font-bold text-red-500">{error}</p>}
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => setDraft(null)} className="h-12 flex-1 rounded-2xl border border-black/10 text-sm font-black text-ink/60 active:scale-95 transition">Cancel</button>
                <button type="button" onClick={() => void save()} disabled={saving}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-black text-sm font-black text-white disabled:opacity-50 active:scale-95 transition">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
