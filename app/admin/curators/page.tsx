"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, Loader2, Instagram, Mail, UserPlus } from "lucide-react";

const ADMIN_PIN_KEY = "luxurybandit-try-look-admin-pin";
function getPin() { try { return localStorage.getItem(ADMIN_PIN_KEY) ?? ""; } catch { return ""; } }

type Curator = {
  id: string; firstName?: string; lastName?: string; email?: string; phone?: string; address?: string;
  instagram?: string; brands?: string; style?: string; genderFocus?: string; colors?: string; fabrics?: string;
  occasions?: string; priceTiers?: string; fitFocus?: string; ageFocus?: string; motto?: string; bio?: string;
  photoUrl?: string; createdAt?: string; credits?: number; creditsSpent?: number; creditsEarned?: number;
};

const STARTER_CREDITS = 30; // mirrors lib/curator-budget.ts

export default function AdminCurators() {
  const [curators, setCurators] = useState<Curator[]>([]);
  const [lookCounts, setLookCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Curator | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/try-this-look?curators=1", { headers: { "x-try-look-admin-pin": getPin() } });
      const data = await res.json();
      setCurators(Array.isArray(data.curators) ? data.curators : []);
      // Published-look counts per curator
      const looksRes = await fetch("/api/try-this-look");
      const looks = (await looksRes.json()).looks ?? [];
      const counts: Record<string, number> = {};
      for (const l of looks) if (l.curatorId) counts[l.curatorId] = (counts[l.curatorId] ?? 0) + 1;
      setLookCounts(counts);
    } catch { setError("Could not load curators."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!edit) return;
    if (!edit.email?.trim()) { setError("Email is required."); return; }
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/curator", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-try-look-admin-pin": getPin() },
        body: JSON.stringify({
          action: "update", id: edit.id,
          email: edit.email, firstName: edit.firstName, lastName: edit.lastName,
          phone: edit.phone, address: edit.address, instagram: edit.instagram,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Save failed."); return; }
      setEdit(null);
      await load();
    } catch { setError("Save failed."); }
    finally { setSaving(false); }
  };

  const setCredits = async (id: string, opts: { credits?: number; resetSpent?: boolean; addCredits?: number }) => {
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/curator", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-try-look-admin-pin": getPin() },
        body: JSON.stringify({ action: "set-credits", id, ...opts }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Credits update failed."); return; }
      const b = data.credits as { credits: number; spent: number };
      setCurators(cs => cs.map(c => c.id === id ? { ...c, credits: b.credits, creditsSpent: b.spent } : c));
      setEdit(e => (e && e.id === id ? { ...e, credits: b.credits, creditsSpent: b.spent } : e));
    } catch { setError("Credits update failed."); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    await fetch("/api/try-this-look", {
      method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": getPin() },
      body: JSON.stringify({ action: "delete-curator", id }),
    });
    setCurators(cs => cs.filter(c => c.id !== id));
  };

  const field = "h-11 w-full rounded-md border border-black/10 bg-white px-3.5 text-sm font-semibold text-ink outline-none focus:border-cobalt";
  const label = "mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-ink/45";
  const tasteLine = (c: Curator) => [c.genderFocus, c.style, c.brands].filter(Boolean).join(" · ");

  return (
    <main className="min-h-screen bg-[#fbfaf7] pb-24 text-ink">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="grid gap-2">
          <a href="/admin" className="inline-flex w-fit items-center gap-1.5 text-xs font-black text-ink/50 transition hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </a>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">LuxuryBandit Admin</div>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-black leading-none text-ink">Models</h1>
            <a href="/admin/curators/apply"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black px-4 py-2.5 text-xs font-black text-white active:scale-95 transition">
              <UserPlus className="h-4 w-4" /> New model
            </a>
          </div>
          <p className="text-sm font-semibold leading-6 text-ink/55">Everyone who applied, plus models you create. Edit their details, or remove them.</p>
        </header>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink/30" /></div>
        ) : (
          <div className="mt-5 grid gap-3">
            {curators.length === 0 && <p className="py-10 text-center text-sm font-bold text-ink/40">No models yet.</p>}
            {curators.map(c => (
              <div key={c.id} className="flex items-start gap-3 rounded-xl border border-black/10 bg-white p-4">
                <a href={`/curator/${c.id}`} title="View their public profile & looks"
                  className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-black/5 active:scale-95 transition">
                  {c.photoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.photoUrl} alt="" className="h-full w-full object-cover" />
                    : <div className="grid h-full w-full place-items-center text-ink/30 text-sm font-black">{(c.firstName ?? "?").slice(0, 1)}</div>}
                </a>
                <div className="min-w-0 flex-1">
                  <a href={`/curator/${c.id}`} className="text-sm font-black text-ink hover:text-cobalt">{c.firstName} {c.lastName}</a>
                  <p className="inline-flex items-center gap-1 text-[12px] font-bold text-cobalt"><Mail className="h-3 w-3" />{c.email}</p>
                  {c.instagram && <p className="inline-flex items-center gap-1 text-[11px] font-bold text-ink/40 ml-2"><Instagram className="h-3 w-3" />@{c.instagram}</p>}
                  {tasteLine(c) && <p className="mt-0.5 line-clamp-1 text-[11px] font-bold text-ink/45">{tasteLine(c)}</p>}
                  <a href={`/curator/${c.id}`} className="mt-0.5 inline-block text-[11px] font-black text-cobalt">{lookCounts[c.id] ?? 0} look{(lookCounts[c.id] ?? 0) === 1 ? "" : "s"} →</a>
                  {(() => {
                    const credits = c.credits ?? STARTER_CREDITS;
                    const spent = c.creditsSpent ?? 0;
                    const earned = c.creditsEarned ?? 0;
                    const out = credits <= 0;
                    return (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${out ? "bg-red-500/10 text-red-600" : credits < 6 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                          🪙 {credits} credit{credits === 1 ? "" : "s"}{out ? " · out" : ""}
                        </span>
                        <span className="text-[10px] font-bold text-ink/35">{spent} spent · {earned} earned</span>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => { setEdit(c); setError(""); }}
                    className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-black text-ink active:scale-95 transition">Edit</button>
                  <button type="button" onClick={() => void remove(c.id)}
                    className="grid h-8 w-8 place-items-center rounded-full border border-black/10 text-ink/40 hover:text-red-500 active:scale-95 transition"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {edit && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={e => { if (e.target === e.currentTarget) setEdit(null); }}>
            <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 sm:rounded-3xl">
              <p className="text-lg font-black text-ink">Edit model</p>
              <div className="mt-4 grid gap-3">
                <div><span className={label}>Email (login)</span><input className={field} value={edit.email ?? ""} onChange={e => setEdit({ ...edit, email: e.target.value })} placeholder="name@email.com" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className={label}>First name</span><input className={field} value={edit.firstName ?? ""} onChange={e => setEdit({ ...edit, firstName: e.target.value })} /></div>
                  <div><span className={label}>Last name</span><input className={field} value={edit.lastName ?? ""} onChange={e => setEdit({ ...edit, lastName: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className={label}>Phone</span><input className={field} value={edit.phone ?? ""} onChange={e => setEdit({ ...edit, phone: e.target.value })} /></div>
                  <div><span className={label}>Instagram</span><input className={field} value={edit.instagram ?? ""} onChange={e => setEdit({ ...edit, instagram: e.target.value })} /></div>
                </div>
                <div><span className={label}>Address</span><input className={field} value={edit.address ?? ""} onChange={e => setEdit({ ...edit, address: e.target.value })} /></div>

                {/* Credits control */}
                <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-3.5">
                  <div className="flex items-center justify-between">
                    <span className={label} style={{ margin: 0 }}>Credits</span>
                    <span className="text-[11px] font-black text-ink/50">{edit.credits ?? STARTER_CREDITS} left · {edit.creditsSpent ?? 0} spent · {edit.creditsEarned ?? 0} earned</span>
                  </div>
                  <p className="mt-1 text-[11px] font-bold leading-4 text-ink/40">Try-on = 2 credits · web search = 1 credit. New creators start with {STARTER_CREDITS}; they earn more from likes & try-ons, or buy more.</p>
                  <div className="mt-2.5 flex items-end gap-2">
                    <div className="flex-1">
                      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-ink/40">Balance (credits)</span>
                      <input type="number" step="1" min="0" className={field}
                        value={edit.credits ?? STARTER_CREDITS}
                        onChange={e => setEdit({ ...edit, credits: Math.max(0, Math.round(parseFloat(e.target.value || "0"))) })} />
                    </div>
                    <button type="button" disabled={saving} onClick={() => void setCredits(edit.id, { credits: edit.credits ?? STARTER_CREDITS })}
                      className="h-11 shrink-0 rounded-md bg-black px-4 text-xs font-black text-white disabled:opacity-50 active:scale-95 transition">Set</button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled={saving} onClick={() => void setCredits(edit.id, { addCredits: 30 })}
                      className="rounded-full border border-black/12 px-3 py-1.5 text-[11px] font-black text-ink active:scale-95 transition disabled:opacity-50">+ 30 credits</button>
                    <button type="button" disabled={saving} onClick={() => void setCredits(edit.id, { resetSpent: true })}
                      className="rounded-full border border-black/12 px-3 py-1.5 text-[11px] font-black text-ink active:scale-95 transition disabled:opacity-50">Reset spent → 0</button>
                  </div>
                </div>
              </div>
              {error && <p className="mt-3 text-xs font-bold text-red-500">{error}</p>}
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => setEdit(null)} className="h-12 flex-1 rounded-2xl border border-black/10 text-sm font-black text-ink/60 active:scale-95 transition">Cancel</button>
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
