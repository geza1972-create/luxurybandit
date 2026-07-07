"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2, X, Play, Globe, Lock, Users } from "lucide-react";
import { getStoredAuthSession, getAuthUser } from "@/lib/supabase-auth-client";

type TryOnItem = { id: string; imageUrl: string; videoUrl?: string; genKind?: string; lookName: string; createdAt: string; published?: boolean; public?: boolean; feedRequested?: boolean; publicRequested?: boolean };

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
  const [viewing, setViewing] = useState<TryOnItem | null>(null);
  const [tierMenu, setTierMenu] = useState<TryOnItem | null>(null);
  const [tierBusyId, setTierBusyId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { try { setIsAdmin(!!localStorage.getItem("luxurybandit-try-look-admin-pin")); } catch { /**/ } }, []);

  // Three explicit visibility tiers — so it's always clear WHERE a try-on goes:
  //   private   → only you (feed:false)
  //   community → login-gated Community feed (feed:true, public:false)
  //   public    → the general "All" feed, everyone (public:true) — INSTANT for admins only;
  //               a non-admin's choice becomes a REQUEST an admin approves.
  type Tier = "private" | "community" | "public";
  type DisplayTier = Tier | "community-req" | "public-req";
  // The visible state (incl. pending requests).
  const displayTierOf = (t: TryOnItem): DisplayTier =>
    t.public ? "public"
      : t.publicRequested ? "public-req"
        : t.published ? "community"
          : t.feedRequested ? "community-req"
            : "private";
  // The tier the user last CHOSE (a request counts as choosing that tier) — drives the
  // menu's active marker and the no-op guard.
  const chosenTierOf = (t: TryOnItem): Tier =>
    (t.public || t.publicRequested) ? "public" : (t.published || t.feedRequested) ? "community" : "private";
  const tierMeta = (d: DisplayTier) => ({
    "public": { label: "Public", cls: "bg-emerald-500 text-white", Icon: Globe },
    "public-req": { label: "Public · pending", cls: "bg-amber-500 text-white", Icon: Globe },
    "community": { label: "Community", cls: "bg-black text-white", Icon: Users },
    "community-req": { label: "Pending", cls: "bg-amber-500 text-white", Icon: Users },
    "private": { label: "Private", cls: "bg-black/70 text-white", Icon: Lock },
  }[d]);

  const applyTier = async (t: TryOnItem, tier: Tier) => {
    setTierMenu(null);
    if (chosenTierOf(t) === tier) return;
    setTierBusyId(t.id);
    const snap = { published: t.published, public: t.public, feedRequested: t.feedRequested, publicRequested: t.publicRequested };
    const optimistic: Partial<TryOnItem> =
      tier === "private" ? { published: false, public: false, feedRequested: false, publicRequested: false }
        : tier === "community"
          ? (isAdmin ? { published: true, public: false, feedRequested: false, publicRequested: false }
                     : { published: false, public: false, feedRequested: true, publicRequested: false })
          : (isAdmin ? { published: true, public: true, feedRequested: false, publicRequested: false }
                     : { publicRequested: true }); // non-admin public = a request; stays where it is meanwhile
    setTryOns(prev => prev.map(x => x.id === t.id ? { ...x, ...optimistic } : x));
    try {
      const adminPin = (() => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } })();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      if (adminPin) headers["x-try-look-admin-pin"] = adminPin;
      const body = tier === "public"
        ? { action: "set-generation-public", generationId: t.id, public: true }
        : { action: "set-generation-feed", generationId: t.id, feed: tier !== "private", public: false };
      const res = await fetch("/api/try-this-look", { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Update failed.");
    } catch {
      setTryOns(prev => prev.map(x => x.id === t.id ? { ...x, ...snap } : x));
    } finally { setTierBusyId(null); }
  };

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
            <div key={t.id} className="relative aspect-[9/16] bg-black/5 overflow-hidden">
              {t.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.imageUrl} alt={t.lookName} className={`h-full w-full object-cover object-top ${t.published === false ? "opacity-50" : ""}`} />
              ) : (
                <div className="h-full w-full bg-black/[0.06]" />
              )}
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
              {/* Visibility control — ONE clearly-labeled status pill. It names exactly where
                  the try-on is shown; tap it to change (Private / Community / Public). */}
              {(() => { const m = tierMeta(displayTierOf(t)); const Icon = m.Icon; return (
                <button type="button" onClick={(e) => { e.stopPropagation(); setTierMenu(t); }} disabled={tierBusyId === t.id}
                  aria-label={`Visibility: ${m.label} — change`}
                  className={`absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black shadow-lg backdrop-blur active:scale-95 transition-transform disabled:opacity-50 ${m.cls}`}>
                  {tierBusyId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
                  {m.label}
                </button>
              ); })()}
              <button type="button" onClick={(e) => { e.stopPropagation(); void handleDelete(t.id); }} disabled={deletingId === t.id}
                aria-label="Delete try-on" title="Delete"
                className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/75 text-white shadow-lg backdrop-blur active:scale-90 transition-transform disabled:opacity-50">
                {deletingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
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

      {/* Visibility chooser — makes it explicit WHERE the try-on is shown. */}
      {tierMenu && (() => {
        const chosen = chosenTierOf(tierMenu);
        const pending = displayTierOf(tierMenu).endsWith("-req");
        const options: { key: Tier; label: string; desc: string; Icon: typeof Globe; dot: string }[] = [
          { key: "private", label: "Private", desc: "Only you can see it.", Icon: Lock, dot: "bg-black/70 text-white" },
          { key: "community", label: "Community", desc: isAdmin ? "Signed-in users, Community feed. Instantly visible." : "Signed-in users, Community feed. Submit for admin approval.", Icon: Users, dot: "bg-black text-white" },
          { key: "public", label: "Public", desc: isAdmin ? "Everyone, in the main feed. Instantly visible." : "Everyone, in the main feed. Submit for admin approval.", Icon: Globe, dot: "bg-emerald-500 text-white" },
        ];
        return (
          <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-6"
            onClick={() => setTierMenu(null)}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-1 pb-2">
                <p className="text-base font-black text-black">Where should it appear?</p>
                <button type="button" onClick={() => setTierMenu(null)} aria-label="Close"
                  className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-black/50"><X className="h-4 w-4" /></button>
              </div>
              {!isAdmin && (
                <p className="px-1 pb-2 text-[11px] font-bold leading-4 text-black/40">Community &amp; Public are submitted to an admin for approval.</p>
              )}
              <div className="grid gap-1.5">
                {options.map(o => {
                  const active = o.key === chosen;
                  const Icon = o.Icon;
                  const suffix = active ? (pending ? " · pending" : " · active") : "";
                  return (
                    <button key={o.key} type="button" onClick={() => void applyTier(tierMenu, o.key)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition active:scale-[0.99] ${active ? "border-black bg-black/[0.04]" : "border-black/10 hover:bg-black/[0.02]"}`}>
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${o.dot}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-black">{o.label}{suffix}</span>
                        <span className="block text-[12px] font-medium leading-4 text-black/50">{o.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
