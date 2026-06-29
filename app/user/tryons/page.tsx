"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2, Eye, EyeOff } from "lucide-react";
import { getStoredAuthSession, getAuthUser } from "@/lib/supabase-auth-client";

type TryOnItem = { id: string; imageUrl: string; lookName: string; createdAt: string; published?: boolean };

const mergeById = (prev: TryOnItem[], add: TryOnItem[]) => {
  const seen = new Set(prev.map(t => t.id));
  return [...prev, ...add.filter(t => !seen.has(t.id))];
};

// The user's own try-ons — a dedicated page, separate from account settings.
export default function MyTryOnsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tryOns, setTryOns] = useState<TryOnItem[]>([]);
  const [accessToken, setAccessToken] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s?.access_token) { router.replace("/seller/login?returnTo=/user/tryons"); return; }
    setAccessToken(s.access_token);

    // Email-bound try-ons (incl. funnel + unpublished).
    fetch("/api/try-this-look?mine=1", { headers: { Authorization: `Bearer ${s.access_token}` } })
      .then(r => r.json())
      .then((p: any) => { const mine = (p.mine ?? []) as TryOnItem[]; if (mine.length) setTryOns(prev => mergeById(prev, mine)); })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Alias-based gallery, merged in.
    getAuthUser(s.access_token).then(u => {
      const slug = (u.user_metadata?.username ?? u.user_metadata?.full_name ?? "")
        .trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
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

  return (
    <main className="min-h-[100dvh] bg-[#fafaf8] pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => router.back()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10"><ArrowLeft className="h-4 w-4" /></button>
        <p className="flex-1 text-sm font-black text-black">My try-ons</p>
        {tryOns.length > 0 && <span className="text-xs font-black text-black/40">{tryOns.length}</span>}
      </header>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-black/20" /></div>
      ) : tryOns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="text-sm font-bold text-black/40">No try-ons yet.</p>
          <button type="button" onClick={() => router.push("/stores")} className="flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-black text-white active:scale-95 transition-transform">Try a look</button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-px bg-black/8">
          {tryOns.map(t => (
            <div key={t.id} className="relative aspect-[3/4] bg-black/5 overflow-hidden">
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
