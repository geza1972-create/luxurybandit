"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Plus, Loader2, Pencil, Trash2,
  ExternalLink, CheckCircle2, Store,
} from "lucide-react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

/* ── Types ──────────────────────────────────────────────────────────────── */
type Look = {
  id: string;
  name: string;
  campaignName?: string;
  price?: string;
  published?: boolean;
  imageUrl?: string;
  galleryImageUrls?: string[];
  createdAt: string;
};
type StoreData = { id: string; name: string; slug: string; address?: string; instagram?: string };

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function MyStorePage() {
  const router = useRouter();
  const session = typeof window !== "undefined" ? getStoredAuthSession() : null;

  const [store, setStore] = useState<StoreData | null>(null);
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const authHeader = () => ({ Authorization: `Bearer ${session?.access_token ?? ""}` });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  /* ── Load ── */
  useEffect(() => {
    const s = getStoredAuthSession();
    if (!s?.access_token) { router.push("/stores?panel=account"); return; }
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/seller/me", { headers: { Authorization: `Bearer ${s.access_token}` } });
        if (!res.ok) { setError("Failed to load store."); return; }
        const d = await res.json() as { store: StoreData; looks: Look[] };
        setStore(d.store);
        setLooks(d.looks ?? []);
      } catch { setError("Network error."); }
      finally { setLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Delete ── */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    setDeletingId(id);
    try {
      const fd = new FormData();
      fd.append("action", "delete-look");
      fd.append("id", id);
      const res = await fetch("/api/seller/action", { method: "POST", headers: authHeader(), body: fd });
      if (res.ok) {
        setLooks(prev => prev.filter(l => l.id !== id));
        showToast("Product deleted.");
      } else {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Delete failed.");
      }
    } catch { setError("Network error."); }
    finally { setDeletingId(null); }
  };

  /* ── Render ── */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-black/30" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf8]" style={{ paddingBottom: "max(5rem, env(safe-area-inset-bottom))" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <button type="button" onClick={() => router.push("/stores")}
            className="grid h-9 w-9 place-items-center rounded-full border border-black/10 text-black/50 active:bg-black/5">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-black text-black">My Store</span>
          <button type="button" onClick={() => router.push("/user/mystore/new")}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#f4725a] text-white shadow active:opacity-80">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-5 grid gap-4">
        {/* Store info strip */}
        {store && (
          <div className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.04]">
              <Store className="h-5 w-5 text-black/40" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-black truncate">{store.name}</p>
              <p className="text-xs font-bold text-black/35 truncate">luxurybandit.com/s/{store.slug}</p>
            </div>
            <a href={`/s/${store.slug}`} target="_blank" rel="noopener noreferrer"
              className="grid h-8 w-8 place-items-center rounded-xl border border-black/10 text-black/40 active:bg-black/5">
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">{error}</p>}

        {/* Products list */}
        {looks.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-black/10 bg-white px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/[0.04]">
              <Store className="h-8 w-8 text-black/20" />
            </div>
            <div>
              <p className="text-base font-black text-black">No products yet</p>
              <p className="mt-1 text-sm font-bold text-black/40">Tap + to add your first product</p>
            </div>
            <button type="button" onClick={() => router.push("/user/mystore/new")}
              className="flex h-12 items-center gap-2 rounded-2xl bg-[#f4725a] px-6 text-sm font-black text-white active:opacity-80">
              <Plus className="h-4 w-4" /> Add First Product
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-black/40">
              {looks.length} product{looks.length !== 1 ? "s" : ""}
            </p>
            {looks.map(look => {
              const thumb = look.galleryImageUrls?.[0] ?? look.imageUrl;
              return (
                <div key={look.id} className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white px-3 py-3">
                  {/* Thumbnail */}
                  <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-black/[0.04]">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt={look.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Store className="h-6 w-6 text-black/15" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-black truncate">{look.name}</p>
                    {look.campaignName && <p className="text-xs font-bold text-black/35 truncate">{look.campaignName}</p>}
                    <div className="mt-1 flex items-center gap-2">
                      {look.price && <span className="text-xs font-black text-black/60">€{look.price}</span>}
                      {look.published ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Live
                        </span>
                      ) : (
                        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-black text-black/40">Draft</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={() => router.push(`/user/mystore/edit/${look.id}`)}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 text-black/50 active:bg-black/5">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => void handleDelete(look.id)}
                      disabled={deletingId === look.id}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-400 active:bg-red-100 disabled:opacity-40">
                      {deletingId === look.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 inset-x-4 z-50 flex items-center justify-center pointer-events-none">
          <div className="rounded-2xl bg-black/85 px-5 py-3 text-sm font-black text-white shadow-xl backdrop-blur">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
