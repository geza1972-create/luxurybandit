"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Eye, EyeOff, Sparkles, Settings, Home, LogOut } from "lucide-react";
import { getStoredAuthSession, getAuthUser, signOut } from "@/lib/supabase-auth-client";
import TopNav from "@/components/TopNav";

type TryOnItem = { id: string; imageUrl: string; lookName: string; createdAt: string; published?: boolean };

const mergeById = (prev: TryOnItem[], add: TryOnItem[]) => {
  const seen = new Set(prev.map(t => t.id));
  return [...prev, ...add.filter(t => !seen.has(t.id))];
};

// The user's DASHBOARD — the post-login landing. An overview of their stuff:
// credits, quick stats and their own try-ons. Account *settings* live separately
// on /user/myaccount (profile only) — try-ons are NOT mixed into settings.
export default function UserDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tryOns, setTryOns] = useState<TryOnItem[]>([]);
  const [accessToken, setAccessToken] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [credits, setCredits] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s?.access_token) { router.replace("/login?returnTo=/user/dashboard"); return; }
    setAccessToken(s.access_token);
    setEmail(s.user?.email ?? "");

    // Credits balance (same source as the account page).
    fetch("/api/gallery", { headers: { "x-shopcut-account-id": `user-${s.user.id}` } })
      .then(r => r.json())
      .then((p: any) => { if (typeof p.credits === "number") setCredits(p.credits); })
      .catch(() => {});

    // Email-bound try-ons (incl. funnel + unpublished).
    fetch("/api/try-this-look?mine=1", { headers: { Authorization: `Bearer ${s.access_token}` } })
      .then(r => r.json())
      .then((p: any) => { const mine = (p.mine ?? []) as TryOnItem[]; if (mine.length) setTryOns(prev => mergeById(prev, mine)); })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Alias-based gallery, merged in. Also gives us the display name.
    getAuthUser(s.access_token).then(u => {
      const display = (u.user_metadata?.username ?? u.user_metadata?.full_name ?? "").trim();
      if (display) setName(display);
      const slug = display.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      if (!slug) return;
      fetch(`/api/try-this-look?username=${encodeURIComponent(slug)}`)
        .then(r => r.json())
        .then((p: any) => { const g = (p.userGallery ?? []) as TryOnItem[]; if (g.length) setTryOns(prev => mergeById(prev, g)); })
        .catch(() => {});
    }).catch(() => {});
  }, [router]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch("/api/try-this-look", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-own-generation", id, accessToken }),
      });
      if (!res.ok) throw new Error("Delete failed.");
      setTryOns(prev => prev.filter(t => t.id !== id));
    } catch { /**/ } finally { setDeletingId(null); }
  };

  const handleToggleFeed = async (id: string, next: boolean) => {
    setTogglingId(id);
    setTryOns(prev => prev.map(t => t.id === id ? { ...t, published: next } : t));
    try {
      const res = await fetch("/api/try-this-look", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-generation-feed", generationId: id, feed: next }),
      });
      if (!res.ok) throw new Error("Toggle failed.");
    } catch {
      setTryOns(prev => prev.map(t => t.id === id ? { ...t, published: !next } : t));
    } finally { setTogglingId(null); }
  };

  const publicCount = tryOns.filter(t => t.published !== false).length;
  const hiddenCount = tryOns.filter(t => t.published === false).length;
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  return (
    <main className="min-h-[100dvh] bg-[#fafaf8] pb-24">
      <TopNav subtitle="Dashboard" actions={
        <button type="button" onClick={() => { signOut(); router.replace("/stores"); }}
          className="flex items-center gap-1.5 text-xs font-black text-white/60 active:opacity-70">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      } />

      <div className="mx-auto max-w-md px-4 pt-4">
        {/* Identity */}
        <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-black text-lg font-black text-white">{initial}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-black">{name || "You"}</p>
            <p className="truncate text-[11px] font-bold text-black/45">{email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            ["Try-ons", String(tryOns.length)],
            ["Public", String(publicCount)],
            ["Hidden", String(hiddenCount)],
            ["Credits", credits === null ? "—" : String(credits)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-black/10 bg-white px-2 py-3 text-center">
              <div className="text-lg font-black text-black">{value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-black/40">{label}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => router.push("/stores")}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white text-sm font-black text-black active:scale-[0.99] transition-transform">
            <Home className="h-4 w-4" /> Explore feed
          </button>
          <button type="button" onClick={() => router.push("/user/myaccount")}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white text-sm font-black text-black active:scale-[0.99] transition-transform">
            <Settings className="h-4 w-4" /> Account settings
          </button>
        </div>

        {/* My try-ons */}
        <div className="mb-2 mt-6 flex items-center justify-between">
          <p className="text-sm font-black text-black">My try-ons</p>
          {tryOns.length > 0 && <span className="text-xs font-black text-black/40">{tryOns.length}</span>}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-black/20" /></div>
      ) : tryOns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <p className="text-sm font-bold text-black/40">No try-ons yet.</p>
          <button type="button" onClick={() => router.push("/stores")} className="flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-black text-white active:scale-95 transition-transform">Try a look</button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-px bg-black/8">
          {tryOns.map(t => (
            <div key={t.id} className="relative aspect-[9/16] bg-black/5 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.imageUrl} alt={t.lookName} className={`h-full w-full object-cover object-top ${t.published === false ? "opacity-50" : ""}`} />
              <div className="absolute right-2 top-2 flex gap-1.5">
                <button type="button" onClick={() => void handleToggleFeed(t.id, t.published === false)} disabled={togglingId === t.id}
                  aria-label={t.published === false ? "Show in feed" : "Hide from feed"} title={t.published === false ? "Show in feed" : "Hide from feed"}
                  className="grid h-9 w-9 place-items-center rounded-full bg-black/75 text-white shadow-lg backdrop-blur active:scale-90 transition-transform disabled:opacity-50">
                  {togglingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t.published === false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => void handleDelete(t.id)} disabled={deletingId === t.id}
                  aria-label="Delete try-on" title="Delete"
                  className="grid h-9 w-9 place-items-center rounded-full bg-black/75 text-white shadow-lg backdrop-blur active:scale-90 transition-transform disabled:opacity-50">
                  {deletingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
              {t.published === false && (
                <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-black text-white shadow-lg backdrop-blur">Hidden</span>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-[10px] font-black text-white truncate">{t.lookName}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
