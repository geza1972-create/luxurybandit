"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2, Eye, EyeOff, X, Play } from "lucide-react";
import { getStoredAuthSession, getAuthUser } from "@/lib/supabase-auth-client";

type TryOnItem = { id: string; imageUrl: string; videoUrl?: string; genKind?: string; lookName: string; createdAt: string; published?: boolean };

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
  const [viewing, setViewing] = useState<TryOnItem | null>(null);

  // Tap a try-on → play THIS generation's own video (not the source look's curated feed,
  // which excludes hidden/admin try-ons). Falls back to the look feed when there's no video.
  const openTryOn = (t: TryOnItem) => {
    if (t.videoUrl) setViewing(t);
    else router.push(`/look/${t.lookId}`);
  };

  useEffect(() => {
    const s = getStoredAuthSession();

    // No Supabase login? A curator session or the studio admin PIN still counts as
    // signed in — don't bounce them to /seller/login just to view this page.
    if (!s?.access_token) {
      const curator = (() => { try { return JSON.parse(localStorage.getItem("lb_curator") ?? "{}"); } catch { return {} as any; } })();
      const adminPin = (() => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } })();
      if (!curator?.id && !adminPin) { router.replace("/seller/login?returnTo=/user/tryons"); return; }

      const tasks: Promise<void>[] = [];

      // Admin (PIN): the admin-generated try-ons (visitorId "admin-…"), incl. funnel tests.
      if (adminPin) {
        tasks.push(
          fetch("/api/try-this-look?mine=1", { headers: { "x-try-look-admin-pin": adminPin } })
            .then(r => r.json())
            .then((p: any) => { const mine = (p.mine ?? []) as TryOnItem[]; if (mine.length) setTryOns(prev => mergeById(prev, mine)); })
            .catch(() => {})
        );
      }

      // Curator: show their public gallery by username/store slug (best effort).
      const slug = (curator?.username ?? curator?.storeSlug ?? curator?.slug ?? "")
        .toString().trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      if (curator?.id && slug) {
        tasks.push(
          fetch(`/api/try-this-look?username=${encodeURIComponent(slug)}`)
            .then(r => r.json())
            .then((p: any) => { const g = (p.userGallery ?? []) as TryOnItem[]; if (g.length) setTryOns(prev => mergeById(prev, g)); })
            .catch(() => {})
        );
      }

      Promise.all(tasks).finally(() => setLoading(false));
      return;
    }

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
              {/* Tap the tile → play THIS try-on's own video (buttons above stop propagation). */}
              <button type="button" onClick={() => openTryOn(t)}
                aria-label={t.videoUrl ? `Play ${t.lookName || "try-on"} video` : `Open ${t.lookName || "look"} in feed`}
                className="absolute inset-0 z-0" />
              {t.videoUrl && (
                <span className="pointer-events-none absolute inset-0 z-[5] grid place-items-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                    <Play className="h-5 w-5 translate-x-[1px] fill-current" />
                  </span>
                </span>
              )}
              <div className="absolute right-2 top-2 z-10 flex gap-1.5">
                <button type="button" onClick={(e) => { e.stopPropagation(); void handleToggleFeed(t.id, t.published === false); }} disabled={togglingId === t.id}
                  aria-label={t.published === false ? "Show in feed" : "Hide from feed"} title={t.published === false ? "Show in feed" : "Hide from feed"}
                  className="grid h-9 w-9 place-items-center rounded-full bg-black/75 text-white shadow-lg backdrop-blur active:scale-90 transition-transform disabled:opacity-50">
                  {togglingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t.published === false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); void handleDelete(t.id); }} disabled={deletingId === t.id}
                  aria-label="Delete try-on" title="Delete"
                  className="grid h-9 w-9 place-items-center rounded-full bg-black/75 text-white shadow-lg backdrop-blur active:scale-90 transition-transform disabled:opacity-50">
                  {deletingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
              {t.published === false && (
                <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-black text-white shadow-lg backdrop-blur">Hidden</span>
              )}
              <div className="pointer-events-none absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-[10px] font-black text-white truncate">{t.lookName}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen player — the user's own try-on video. */}
      {viewing?.videoUrl && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black"
          onClick={() => setViewing(null)}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={viewing.videoUrl}
            poster={viewing.imageUrl || undefined}
            className="max-h-full max-w-full"
            autoPlay loop playsInline controls
            onClick={(e) => e.stopPropagation()}
          />
          <button type="button" onClick={() => setViewing(null)} aria-label="Close"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur active:scale-90 transition-transform"
            style={{ top: "max(1rem, env(safe-area-inset-top))" }}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </main>
  );
}
