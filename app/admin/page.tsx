"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, Trash2, Power, PlayCircle, Users, LayoutGrid, ExternalLink } from "lucide-react";

const ADMIN_PIN_KEY = "luxurybandit-try-look-admin-pin";

type Curator = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: "active" | "pending" | "deactivated";
  photoUrl?: string;
  credits?: number;
  creditsSpent?: number;
};

type Look = {
  id: string;
  name: string;
  published?: boolean;
  frontImageUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  curatorName?: string;
  curatorId?: string;
  price?: string;
};

const fullName = (c: Curator) => [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "—";
const initials = (c: Curator) => (`${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase() || "?");

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"curators" | "looks">("looks");
  const [curators, setCurators] = useState<Curator[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [confirmId, setConfirmId] = useState<string>(""); // armed delete (two-tap)

  // Two-tap delete: first tap arms (shows "Delete?"), second tap within 3.5s deletes.
  const armOrRun = (id: string, run: () => void) => {
    if (confirmId === id) { setConfirmId(""); run(); }
    else { setConfirmId(id); setTimeout(() => setConfirmId(c => (c === id ? "" : c)), 3500); }
  };

  const headers = (p = pin) => ({ "Content-Type": "application/json", "x-try-look-admin-pin": p });

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
      if (r.ok) setCurators(cs => cs.filter(c => c.id !== id)); else await fail(r, "Could not delete curator");
    } catch { setError("Network error."); }
    setBusy("");
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
    !q ? curators : curators.filter(c => `${fullName(c)} ${c.email ?? ""}`.toLowerCase().includes(q)),
    [curators, q]);
  const shownLooks = useMemo(() =>
    !q ? looks : looks.filter(l => `${l.name} ${l.curatorName ?? ""}`.toLowerCase().includes(q)),
    [looks, q]);

  const liveLooks = looks.filter(l => l.published !== false).length;
  const activeCurators = curators.filter(c => c.status !== "deactivated").length;

  // ── PIN gate ──
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

        {/* Tabs */}
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

        {/* Search */}
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3">
          <Search className="h-4 w-4 text-ink/30" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={tab === "looks" ? "Search listings…" : "Search curators…"}
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
                <div key={l.id} className={`flex items-center gap-3 rounded-xl border bg-white p-2.5 ${live ? "border-black/10" : "border-black/10 opacity-60"}`}>
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-black/5">
                    {img ? <img src={img} alt="" className="h-full w-full object-cover object-top" /> : <div className="grid h-full w-full place-items-center text-[10px] font-black text-ink/30">LB</div>}
                    {l.videoUrl && <PlayCircle className="absolute bottom-1 right-1 h-4 w-4 text-white drop-shadow" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-ink">{l.name}</div>
                    <div className="truncate text-xs font-bold text-ink/45">{l.curatorName ?? "—"}{l.price ? ` · ${l.price}` : ""}</div>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${live ? "bg-emerald-100 text-emerald-700" : "bg-black/8 text-ink/50"}`}>
                      {live ? "Live" : "Off"}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button type="button" disabled={busy === l.id} onClick={() => void setLookPublished(l.id, !live)}
                      title={live ? "Deactivate" : "Activate"}
                      className={`grid h-9 w-9 place-items-center rounded-lg border active:scale-95 transition ${live ? "border-black/10 text-ink/60" : "border-emerald-200 bg-emerald-50 text-emerald-600"}`}>
                      <Power className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={busy === l.id} onClick={() => armOrRun(l.id, () => void deleteLook(l.id))}
                      title="Delete"
                      className={`grid h-9 place-items-center rounded-lg border active:scale-95 transition ${confirmId === l.id ? "w-auto px-2.5 border-red-300 bg-red-500 text-white" : "w-9 border-black/10 text-ink/40 hover:border-red-200 hover:text-red-500"}`}>
                      {confirmId === l.id ? <span className="text-[11px] font-black">Delete?</span> : <Trash2 className="h-4 w-4" />}
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
                <div key={c.id} className={`flex items-center gap-3 rounded-xl border bg-white p-2.5 ${off ? "border-black/10 opacity-60" : "border-black/10"}`}>
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
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button type="button" disabled={busy === c.id} onClick={() => void setCuratorStatus(c.id, off ? "active" : "deactivated")}
                      title={off ? "Activate" : "Deactivate"}
                      className={`grid h-9 w-9 place-items-center rounded-lg border active:scale-95 transition ${off ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-black/10 text-ink/60"}`}>
                      <Power className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={busy === c.id} onClick={() => armOrRun(c.id, () => void deleteCurator(c.id))}
                      title="Delete"
                      className={`grid h-9 place-items-center rounded-lg border active:scale-95 transition ${confirmId === c.id ? "w-auto px-2.5 border-red-300 bg-red-500 text-white" : "w-9 border-black/10 text-ink/40 hover:border-red-200 hover:text-red-500"}`}>
                      {confirmId === c.id ? <span className="text-[11px] font-black">Delete?</span> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
