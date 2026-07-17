"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Loader2, Shirt, MessageCircle, Trash2, Check } from "lucide-react";
import { getStoredAuthSession, signOut, updateUserProfile } from "@/lib/supabase-auth-client";

// Simple, DARK account page for a normal buyer (not a creator/seller). Just who they are,
// a display name, quick links, and the ability to delete their account. Creators keep the
// full seller dashboard.
export default function BuyerAccount() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [subs, setSubs] = useState<{ id: string; name: string; photoUrl?: string }[]>([]);

  // Per-model subscriptions the user has (lb_subs = list of curatorIds) → show names/photos.
  useEffect(() => {
    let ids: string[] = [];
    try { const raw = JSON.parse(localStorage.getItem("lb_subs") || "[]"); if (Array.isArray(raw)) ids = raw.map(String); } catch { /**/ }
    if (!ids.length) { setSubs([]); return; }
    Promise.all(ids.map(id =>
      fetch(`/api/curator?profile=${encodeURIComponent(id)}`).then(r => r.json())
        .then(d => ({ id, name: [d?.profile?.firstName, d?.profile?.lastName].filter(Boolean).join(" ").trim() || d?.profile?.firstName || "Model", photoUrl: d?.profile?.photoUrl as string | undefined }))
        .catch(() => ({ id, name: "Model", photoUrl: undefined }))
    )).then(setSubs).catch(() => {});
  }, []);

  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s) { router.replace("/login?returnTo=/user/myaccount"); return; }
    setEmail(s.user?.email ?? "");
    setToken(s.access_token ?? "");
    try { setName((s.user as { user_metadata?: { username?: string; full_name?: string } })?.user_metadata?.username || ""); } catch { /**/ }
  }, [router]);

  const initial = (name || email || "?").slice(0, 1).toUpperCase();

  const saveName = async () => {
    if (!token) return;
    setSaving(true); setSaved(false); setError("");
    try {
      await updateUserProfile(token, { displayName: name.trim() || undefined });
      setSaved(true); window.setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
    finally { setSaving(false); }
  };

  const logout = () => { signOut(); router.replace("/home"); };

  const deleteAccount = async () => {
    setDeleting(true); setError("");
    try {
      const res = await fetch("/api/account", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(d.error ?? "Could not delete your account.");
      signOut();
      try { localStorage.removeItem("lb_paid"); localStorage.removeItem("lb_paid_email"); localStorage.removeItem("lb_subscribed"); localStorage.removeItem("lb_curator"); } catch { /**/ }
      router.replace("/home");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete your account."); setDeleting(false); }
  };

  return (
    <div className="min-h-[100dvh] lb-bg text-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <button type="button" onClick={() => router.back()} className="grid h-9 w-9 place-items-center rounded-full border border-white/15 text-white/80 active:scale-90 transition"><ArrowLeft className="h-5 w-5" /></button>
        <p className="flex-1 text-center text-base font-black">My Account</p>
        <button type="button" onClick={logout} className="flex items-center gap-1.5 text-[13px] font-black text-white/60 active:scale-95 transition"><LogOut className="h-4 w-4" /> Sign out</button>
      </div>

      <div className="mx-auto max-w-[440px] px-4 py-5">
        {/* Identity */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-black text-lg font-black">{initial}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{email}</p>
            <span className="mt-1 inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white/60">Member</span>
          </div>
        </div>

        {/* Display name */}
        <p className="mt-6 text-[11px] font-black uppercase tracking-widest text-white/35">Display name</p>
        <div className="mt-2 flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="How should we call you?"
            className="h-12 flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 text-sm font-bold text-white outline-none focus:border-amber-400 placeholder:text-white/30" />
          <button type="button" onClick={() => void saveName()} disabled={saving}
            className="lb-gold grid h-12 w-14 place-items-center rounded-2xl text-sm font-black disabled:opacity-50 active:scale-95 transition">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : saved ? <Check className="h-5 w-5" /> : "Save"}
          </button>
        </div>

        {/* Quick links */}
        <div className="mt-6 grid gap-2">
          <button type="button" onClick={() => router.push("/user/tryons")}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left active:scale-[0.99] transition">
            <Shirt className="h-5 w-5 text-white/60" /><span className="text-sm font-black">My try-ons</span>
          </button>
          <button type="button" onClick={() => router.push("/messages")}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-left active:scale-[0.99] transition">
            <MessageCircle className="h-5 w-5 text-white/60" /><span className="text-sm font-black">Messages</span>
          </button>
        </div>

        {/* My subscriptions — one per model (each model is its own subscription). */}
        {subs.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] font-black uppercase tracking-wide text-white/45">My subscriptions ({subs.length})</p>
            <div className="mt-2 grid gap-2">
              {subs.map(s => (
                <button key={s.id} type="button" onClick={() => router.push(`/curator/${s.id}`)}
                  className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] px-3 py-2.5 text-left active:scale-[0.99] transition">
                  {s.photoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={s.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover object-top" />
                    : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-black text-white/60">{s.name.slice(0, 1)}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-white">{s.name}</span>
                    <span className="block text-[11px] font-bold text-amber-300/80">Active subscription</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-center text-[12px] font-bold text-red-400">{error}</p>}

        {/* Delete account */}
        <div className="mt-10 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4">
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-2 text-sm font-black text-red-400 active:scale-95 transition">
              <Trash2 className="h-4 w-4" /> Delete my account
            </button>
          ) : (
            <div className="text-center">
              <p className="text-sm font-black text-white">Delete your account?</p>
              <p className="mt-1 text-[12px] font-bold text-white/55">This removes your account and your try-ons for good. This can&apos;t be undone.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting}
                  className="h-11 flex-1 rounded-full bg-white/10 text-sm font-black text-white active:scale-95 transition">Cancel</button>
                <button type="button" onClick={() => void deleteAccount()} disabled={deleting}
                  className="grid h-11 flex-1 place-items-center rounded-full bg-red-500 text-sm font-black text-white active:scale-95 transition disabled:opacity-60">
                  {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Delete forever"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
