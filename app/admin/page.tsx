"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, Trash2, Power, PlayCircle, Users, LayoutGrid, ExternalLink, X, Sparkles } from "lucide-react";

const ADMIN_PIN_KEY = "luxurybandit-try-look-admin-pin";

type Curator = {
  id: string;
  firstName?: string; lastName?: string; email?: string;
  phone?: string; address?: string; instagram?: string;
  brands?: string; style?: string; genderFocus?: string; ageFocus?: string;
  colors?: string; fabrics?: string; occasions?: string; priceTiers?: string; fitFocus?: string;
  motto?: string; bio?: string;
  status?: "active" | "pending" | "deactivated";
  photoUrl?: string; credits?: number; creditsSpent?: number; createdAt?: string;
};

type Look = {
  id: string; name: string; published?: boolean;
  frontImageUrl?: string; imageUrl?: string; videoUrl?: string;
  curatorName?: string; curatorId?: string;
  price?: string; brand?: string; productNote?: string; storeName?: string;
  aiCreated?: boolean; createdAt?: string;
  alternatives?: unknown[];
};

const fullName = (c: Curator) => [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "—";
const initials = (c: Curator) => (`${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase() || "?");
const fmtDate = (s?: string) => { if (!s) return ""; try { return new Date(s).toLocaleDateString(); } catch { return ""; } };

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"looks" | "curators">("looks");
  const [curators, setCurators] = useState<Curator[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [edit, setEdit] = useState<Curator | null>(null); // curator being edited
  const [saving, setSaving] = useState(false);

  const headers = (p = pin) => ({ "Content-Type": "application/json", "x-try-look-admin-pin": p });

  const armOrRun = (id: string, run: () => void) => {
    if (confirmId === id) { setConfirmId(""); run(); }
    else { setConfirmId(id); setTimeout(() => setConfirmId(c => (c === id ? "" : c)), 3500); }
  };

  const load = async (p = pin) => {
    if (!p) return;
    setLoading(true); setError("");
    try {
      const [cr, lr] = await Promise.all([
        fetch("/api/try-this-look?curators=1", { headers: headers(p) }),
        fetch("/api/try-this-look?admin=1", { headers: headers(p) }),
      ]);
      if (cr.status === 401 || lr.status === 401) { setError("Wrong PIN."); setAuthed(false); setLoading(false); return; }
      const cd = await cr.json().catch(() => ({}));
      const ld = await lr.json().catch(() => ({}));
      setCurators(Array.isArray(cd.curators) ? cd.curators : []);
      setLooks(Array.isArray(ld.looks) ? ld.looks : []);
      setAuthed(true);
    } catch { setError("Could not load admin data."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_PIN_KEY) ?? "";
    if (stored) { setPin(stored); void load(stored); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = () => { window.localStorage.setItem(ADMIN_PIN_KEY, pin); void load(pin); };

  const fail = async (r: Response, fallback: string) => {
    const d = await r.json().catch(() => ({}));
    setError(d?.error || `${fallback} (${r.status})`);
    setTimeout(() => setError(""), 4000);
  };

  // ── Curator actions ──
  const setCuratorStatus = async (id: string, status: "active" | "deactivated") => {
    setBusy(id); setError("");
    setCurators(cs => cs.map(c => c.id === id ? { ...c, status } : c));
    try {
      const r = await fetch("/api/curator", { method: "POST", headers: headers(), body: JSON.stringify({ action: "set-curator-status", id, status }) });
      if (!r.ok) { setCurators(cs => cs.map(c => c.id === id ? { ...c, status: status === "active" ? "deactivated" : "active" } : c)); await fail(r, "Could not update curator"); }
    } catch { setError("Network error."); }
    setBusy("");
  };
  const deleteCurator = async (id: string) => {
    setBusy(id); setError("");
    try {
      const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "delete-curator", id }) });
      if (r.ok) { setCurators(cs => cs.filter(c => c.id !== id)); setEdit(null); } else await fail(r, "Could not delete curator");
    } catch { setError("Network error."); }
    setBusy("");
  };
  const saveCurator = async () => {
    if (!edit) return;
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/curator", { method: "POST", headers: headers(), body: JSON.stringify({ action: "update", ...edit, id: edit.id }) });
      if (r.ok) { setCurators(cs => cs.map(c => c.id === edit.id ? { ...c, ...edit } : c)); setEdit(null); }
      else await fail(r, "Could not save curator");
    } catch { setError("Network error."); }
    setSaving(false);
  };

  // ── Look actions ──
  const setLookPublished = async (id: string, published: boolean) => {
    setBusy(id); setError("");
    setLooks(ls => ls.map(l => l.id === id ? { ...l, published } : l));
    try {
      const r = await fetch("/api/curator", { method: "POST", headers: headers(), body: JSON.stringify({ action: "toggle-look", lookId: id, published }) });
      if (!r.ok) { setLooks(ls => ls.map(l => l.id === id ? { ...l, published: !published } : l)); await fail(r, "Could not update listing"); }
    } catch { setError("Network error."); }
    setBusy("");
  };
  const deleteLook = async (id: string) => {
    setBusy(id); setError("");
    try {
      const r = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "delete-look", id }) });
      if (r.ok) setLooks(ls => ls.filter(l => l.id !== id)); else await fail(r, "Could not delete listing");
    } catch { setError("Network error."); }
    setBusy("");
  };

  const looksByCurator = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of looks) if (l.curatorId) m.set(l.curatorId, (m.get(l.curatorId) ?? 0) + 1);
    return m;
  }, [looks]);

  const q = query.trim().toLowerCase();
  const shownCurators = useMemo(() =>
    !q ? curators : curators.filter(c => `${fullName(c)} ${c.email ?? ""} ${c.brands ?? ""} ${c.style ?? ""}`.toLowerCase().includes(q)),
    [curators, q]);
  const shownLooks = useMemo(() =>
    !q ? looks : looks.filter(l => `${l.name} ${l.curatorName ?? ""} ${l.brand ?? ""} ${l.productNote ?? ""}`.toLowerCase().includes(q)),
    [looks, q]);

  const liveLooks = looks.filter(l => l.published !== false).length;
  const activeCurators = curators.filter(c => c.status !== "deactivated").length;

  if (!authed) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#fbfaf7] px-4 text-ink">
        <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-soft">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">LuxuryBandit</div>
          <h1 className="mt-1 text-2xl font-black">Admin</h1>
          <p className="mt-1 text-sm font-bold text-ink/50">Enter the admin PIN to continue.</p>
          <input value={pin} onChange={e => setPin(e.target.value)} type="password" placeholder="Admin PIN"
            onKeyDown={e => { if (e.key === "Enter") signIn(); }}
            className="mt-4 h-12 w-full rounded-xl border border-black/10 bg-panel px-3 text-sm font-bold outline-none focus:border-cobalt" />
          <button type="button" onClick={signIn} className="mt-3 h-12 w-full rounded-xl bg-black text-sm font-black text-white active:scale-95 transition">
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Enter"}
          </button>
          {error && <p className="mt-3 text-center text-xs font-black text-red-500">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbfaf7] px-4 py-5 text-ink">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cobalt">LuxuryBandit</div>
            <h1 className="text-3xl font-black leading-none">Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin/trends" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-xs font-black text-ink active:scale-95 transition">
              Studio <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button type="button" onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 bg-white active:scale-95 transition">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <div className="mt-4 flex items-center gap-1 rounded-xl border border-black/10 bg-white p-1">
          <button type="button" onClick={() => setTab("looks")}
            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-black transition ${tab === "looks" ? "bg-black text-white" : "text-ink/50"}`}>
            <LayoutGrid className="h-4 w-4" /> A List <span className="opacity-60">({liveLooks}/{looks.length})</span>
          </button>
          <button type="button" onClick={() => setTab("curators")}
            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-black transition ${tab === "curators" ? "bg-black text-white" : "text-ink/50"}`}>
            <Users className="h-4 w-4" /> Curators <span className="opacity-60">({activeCurators}/{curators.length})</span>
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3">
          <Search className="h-4 w-4 text-ink/30" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={tab === "looks" ? "Search by name, curator, brand…" : "Search by name, email, brand…"}
            className="h-11 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-ink/30" />
          {query && <button type="button" onClick={() => setQuery("")} className="text-xs font-black text-ink/40">Clear</button>}
        </div>

        {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600">{error}</p>}

        {/* ── A List ── */}
        {tab === "looks" && (
          <div className="mt-3 grid gap-2 pb-16">
            {shownLooks.length === 0 && <p className="py-10 text-center text-sm font-bold text-ink/40">No listings.</p>}
            {shownLooks.map(l => {
              const live = l.published !== false;
              const img = l.frontImageUrl || l.imageUrl;
              return (
                <div key={l.id} className={`flex gap-3 rounded-xl border bg-white p-2.5 ${live ? "border-black/10" : "border-black/10 opacity-70"}`}>
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-black/5">
                    {img ? <img src={img} alt="" className="h-full w-full object-cover object-top" /> : <div className="grid h-full w-full place-items-center text-[10px] font-black text-ink/30">LB</div>}
                    {l.videoUrl && <PlayCircle className="absolute bottom-1 right-1 h-4 w-4 text-white drop-shadow" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-ink">{l.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${live ? "bg-emerald-100 text-emerald-700" : "bg-black/8 text-ink/50"}`}>{live ? "Live" : "Off"}</span>
                      {l.brand && <span className="rounded-full bg-cobalt/10 px-2 py-0.5 text-[10px] font-black text-cobalt">{l.brand}</span>}
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black text-ink/50">{l.aiCreated ? "AI" : "Curated"}</span>
                      {l.videoUrl && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black text-ink/50">Video</span>}
                    </div>
                    <div className="mt-1 truncate text-xs font-bold text-ink/55">
                      <span className="text-ink/70">{l.curatorName ?? "—"}</span>{l.price ? ` · ${l.price}` : ""}{l.createdAt ? ` · ${fmtDate(l.createdAt)}` : ""}
                    </div>
                    {l.productNote && <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-ink/45">{l.productNote}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-1.5">
                    <button type="button" disabled={busy === l.id} onClick={() => void setLookPublished(l.id, !live)} title={live ? "Deactivate" : "Activate"}
                      className={`grid h-9 w-9 place-items-center rounded-lg border active:scale-95 transition ${live ? "border-black/10 text-ink/60" : "border-emerald-200 bg-emerald-50 text-emerald-600"}`}>
                      <Power className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={busy === l.id} onClick={() => armOrRun(l.id, () => void deleteLook(l.id))} title="Delete"
                      className={`grid h-9 place-items-center rounded-lg border active:scale-95 transition ${confirmId === l.id ? "w-full px-1.5 border-red-300 bg-red-500 text-white" : "w-9 border-black/10 text-ink/40 hover:border-red-200 hover:text-red-500"}`}>
                      {confirmId === l.id ? <span className="text-[10px] font-black">Sure?</span> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Curators ── */}
        {tab === "curators" && (
          <div className="mt-3 grid gap-2 pb-16">
            {shownCurators.length === 0 && <p className="py-10 text-center text-sm font-bold text-ink/40">No curators.</p>}
            {shownCurators.map(c => {
              const off = c.status === "deactivated";
              return (
                <div key={c.id} role="button" tabIndex={0} onClick={() => setEdit({ ...c })}
                  onKeyDown={e => { if (e.key === "Enter") setEdit({ ...c }); }}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-white p-2.5 text-left active:scale-[0.99] transition ${off ? "border-black/10 opacity-70" : "border-black/10"}`}>
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-black/5 text-sm font-black text-ink/50">
                    {c.photoUrl ? <img src={c.photoUrl} alt="" className="h-full w-full object-cover" /> : initials(c)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-ink">{fullName(c)}</div>
                    <div className="truncate text-xs font-bold text-ink/45">{c.email ?? "—"}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${off ? "bg-black/8 text-ink/50" : "bg-emerald-100 text-emerald-700"}`}>{off ? "Deactivated" : "Active"}</span>
                      <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black text-ink/50">{looksByCurator.get(c.id) ?? 0} looks</span>
                      {typeof c.credits === "number" && <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black text-ink/50">{c.credits} cr</span>}
                      {c.brands && <span className="truncate rounded-full bg-cobalt/10 px-2 py-0.5 text-[10px] font-black text-cobalt">{c.brands.split(",")[0]}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <span className="rounded-lg border border-black/10 px-2.5 py-1.5 text-[11px] font-black text-ink/60">Edit</span>
                    <button type="button" disabled={busy === c.id} onClick={() => void setCuratorStatus(c.id, off ? "active" : "deactivated")} title={off ? "Activate" : "Deactivate"}
                      className={`grid h-9 w-9 place-items-center rounded-lg border active:scale-95 transition ${off ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-black/10 text-ink/60"}`}>
                      <Power className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Curator edit sheet ── */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={e => { if (e.target === e.currentTarget) setEdit(null); }}>
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl">
            <div className="flex items-center gap-3 border-b border-black/10 px-5 py-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-black/5 text-sm font-black text-ink/50">
                {edit.photoUrl ? <img src={edit.photoUrl} alt="" className="h-full w-full object-cover" /> : initials(edit)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-black">{fullName(edit)}</div>
                <div className="text-[11px] font-bold text-ink/45">
                  {edit.status ?? "active"} · {looksByCurator.get(edit.id) ?? 0} looks · {edit.credits ?? 0} cr{edit.createdAt ? ` · joined ${fmtDate(edit.createdAt)}` : ""}
                </div>
              </div>
              <button type="button" onClick={() => setEdit(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid gap-3 overflow-y-auto px-5 py-4">
              <Field2 label="First name" v={edit.firstName} on={v => setEdit(e => e && { ...e, firstName: v })} label2="Last name" v2={edit.lastName} on2={v => setEdit(e => e && { ...e, lastName: v })} />
              <Field label="Email" v={edit.email} on={v => setEdit(e => e && { ...e, email: v })} />
              <Field2 label="Phone" v={edit.phone} on={v => setEdit(e => e && { ...e, phone: v })} label2="Instagram" v2={edit.instagram} on2={v => setEdit(e => e && { ...e, instagram: v })} />
              <Field label="Address" v={edit.address} on={v => setEdit(e => e && { ...e, address: v })} />
              <div className="my-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-ink/35"><Sparkles className="h-3.5 w-3.5" /> Taste</div>
              <Field label="Brands" v={edit.brands} on={v => setEdit(e => e && { ...e, brands: v })} />
              <Field label="Style" v={edit.style} on={v => setEdit(e => e && { ...e, style: v })} />
              <Field2 label="Gender focus" v={edit.genderFocus} on={v => setEdit(e => e && { ...e, genderFocus: v })} label2="Age focus" v2={edit.ageFocus} on2={v => setEdit(e => e && { ...e, ageFocus: v })} />
              <Field2 label="Colors" v={edit.colors} on={v => setEdit(e => e && { ...e, colors: v })} label2="Fabrics" v2={edit.fabrics} on2={v => setEdit(e => e && { ...e, fabrics: v })} />
              <Field2 label="Occasions" v={edit.occasions} on={v => setEdit(e => e && { ...e, occasions: v })} label2="Price tiers" v2={edit.priceTiers} on2={v => setEdit(e => e && { ...e, priceTiers: v })} />
              <Field label="Fit focus" v={edit.fitFocus} on={v => setEdit(e => e && { ...e, fitFocus: v })} />
              <Field label="Motto" v={edit.motto} on={v => setEdit(e => e && { ...e, motto: v })} />
              <Area label="Bio" v={edit.bio} on={v => setEdit(e => e && { ...e, bio: v })} />
            </div>

            <div className="flex items-center gap-2 border-t border-black/10 px-5 py-4">
              <button type="button" disabled={busy === edit.id} onClick={() => armOrRun(edit.id, () => void deleteCurator(edit.id))}
                className={`h-11 rounded-xl border px-3 text-xs font-black active:scale-95 transition ${confirmId === edit.id ? "border-red-300 bg-red-500 text-white" : "border-black/10 text-red-500"}`}>
                {confirmId === edit.id ? "Tap to confirm" : "Delete"}
              </button>
              <button type="button" onClick={() => setEdit(null)} className="ml-auto h-11 rounded-xl border border-black/10 px-4 text-sm font-black text-ink/60 active:scale-95 transition">Cancel</button>
              <button type="button" disabled={saving} onClick={() => void saveCurator()} className="flex h-11 items-center gap-2 rounded-xl bg-black px-5 text-sm font-black text-white active:scale-95 transition disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, v, on }: { label: string; v?: string; on: (v: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-black uppercase tracking-wider text-ink/40">{label}</span>
      <input value={v ?? ""} onChange={e => on(e.target.value)}
        className="h-10 w-full rounded-lg border border-black/10 bg-panel px-3 text-sm font-bold text-ink outline-none focus:border-cobalt" />
    </label>
  );
}
function Field2(p: { label: string; v?: string; on: (v: string) => void; label2: string; v2?: string; on2: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={p.label} v={p.v} on={p.on} />
      <Field label={p.label2} v={p.v2} on={p.on2} />
    </div>
  );
}
function Area({ label, v, on }: { label: string; v?: string; on: (v: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-black uppercase tracking-wider text-ink/40">{label}</span>
      <textarea value={v ?? ""} onChange={e => on(e.target.value)} rows={3}
        className="w-full rounded-lg border border-black/10 bg-panel px-3 py-2 text-sm font-bold text-ink outline-none focus:border-cobalt" />
    </label>
  );
}
