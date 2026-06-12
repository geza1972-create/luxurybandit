"use client";
export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Plus, Loader2, Pencil, Trash2, X,
  ExternalLink, Sparkles, CheckCircle2, ImagePlus, Store,
} from "lucide-react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

/* ── Types ──────────────────────────────────────────────────────────────── */
type Look = {
  id: string;
  name: string;
  price?: string;
  salePrice?: string;
  productNote?: string;
  hashtags?: string;
  inStock?: boolean;
  published?: boolean;
  imageUrl?: string;
  createdAt: string;
};
type StoreData = { id: string; name: string; slug: string; address?: string; instagram?: string };

type FormState = {
  name: string;
  price: string;
  productNote: string;
  hashtags: string;
  inStock: boolean;
  imageFile: File | null;
  imagePreview: string | null;
};
const emptyForm = (): FormState => ({
  name: "", price: "", productNote: "", hashtags: "",
  inStock: true, imageFile: null, imagePreview: null,
});

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function MyStorePage() {
  const router = useRouter();
  const session =
    typeof window !== "undefined" ? getStoredAuthSession() : null;

  const [store, setStore] = useState<StoreData | null>(null);
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Product form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Auth guard ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!session?.access_token) {
      router.push("/stores?panel=account");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Scroll lock when form open ─────────────────────────────────────── */
  useEffect(() => {
    if (!showForm) return;
    const y = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.left = "0"; document.body.style.right = "0";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = ""; document.body.style.right = "";
      window.scrollTo(0, y);
    };
  }, [showForm]);

  const authHeader = () => ({ Authorization: `Bearer ${session?.access_token ?? ""}` });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/me", { headers: authHeader() });
      if (res.status === 401) { router.push("/stores?panel=account"); return; }
      if (res.ok) {
        const d = await res.json() as { store: StoreData; looks: Look[] };
        setStore(d.store);
        setLooks(d.looks ?? []);
      }
      // 404 = no store yet — show empty state
    } catch { /**/ }
    finally { setLoading(false); }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  /* ── AI description helper ──────────────────────────────────────────── */
  const runAiDescription = async (file: File) => {
    setAiLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/generate-product-description", { method: "POST", body: fd });
      if (!res.ok) return;
      const d = await res.json() as { title?: string; description?: string; hashtags?: string };
      setForm(f => ({
        ...f,
        name: f.name || (d.title ?? ""),
        productNote: f.productNote || (d.description ?? ""),
        hashtags: f.hashtags || (d.hashtags ?? ""),
      }));
    } catch { /**/ }
    finally { setAiLoading(false); }
  };

  /* ── Image selection ─────────────────────────────────────────────────── */
  const handleImageChange = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      setForm(f => ({ ...f, imageFile: file, imagePreview: e.target?.result as string }));
      // Auto-run AI if name not yet filled
      void runAiDescription(file);
    };
    reader.readAsDataURL(file);
  };

  /* ── Open forms ──────────────────────────────────────────────────────── */
  const openCreate = () => { setEditId(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (look: Look) => {
    setEditId(look.id);
    setForm({
      name: look.name, price: look.price ?? "", productNote: look.productNote ?? "",
      hashtags: look.hashtags ?? "", inStock: look.inStock !== false,
      imageFile: null, imagePreview: look.imageUrl ?? null,
    });
    setShowForm(true);
  };

  /* ── Save product ────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!form.name.trim()) { setError("Produktname ist Pflicht."); return; }
    setSaving(true); setError("");
    try {
      const fd = new FormData();
      fd.append("action", editId ? "update-look" : "upload-look");
      if (editId) fd.append("id", editId);
      fd.append("name", form.name);
      fd.append("price", form.price);
      fd.append("productNote", form.productNote);
      fd.append("hashtags", form.hashtags);
      fd.append("inStock", String(form.inStock));
      if (form.imageFile) fd.append("image", form.imageFile);

      const res = await fetch("/api/seller/action", {
        method: "POST",
        headers: authHeader(),
        body: fd,
      });
      const payload = await res.json() as { error?: string };
      if (!res.ok) { setError(payload.error ?? "Fehler beim Speichern."); return; }
      setShowForm(false);
      showToast(editId ? "Produkt aktualisiert ✓" : "Produkt erstellt ✓");
      await loadData();
    } catch { setError("Netzwerkfehler."); }
    finally { setSaving(false); }
  };

  /* ── Delete product ──────────────────────────────────────────────────── */
  const handleDelete = async (id: string) => {
    if (!confirm("Produkt löschen?")) return;
    setDeleting(id);
    try {
      const fd = new FormData();
      fd.append("action", "delete-look");
      fd.append("id", id);
      await fetch("/api/seller/action", { method: "POST", headers: authHeader(), body: fd });
      setLooks(prev => prev.filter(l => l.id !== id));
      showToast("Produkt gelöscht");
    } catch { /**/ }
    finally { setDeleting(null); }
  };

  /* ── Render ──────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-black/30" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] pb-24">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <button type="button" onClick={() => router.back()}
            className="grid h-9 w-9 place-items-center rounded-full border border-black/10 text-black/50 active:bg-black/5">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-black text-black">My Store</span>
          <button type="button" onClick={openCreate}
            className="grid h-9 w-9 place-items-center rounded-full bg-black text-white active:opacity-75 transition-opacity">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-16 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="flex items-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-black text-white shadow-xl">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            {toast}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-lg px-4 py-5 grid gap-5">

        {/* ── Store info strip (if store exists) ── */}
        {store && (
          <div className="flex items-center justify-between rounded-2xl border border-black/8 bg-white px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black text-white">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-black">{store.name}</p>
                <a href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-bold text-black/40 hover:text-black transition">
                  <ExternalLink className="h-3 w-3" />
                  luxurybandit.com/store/{store.slug}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {looks.length === 0 && (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-black/15 py-16 px-6 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-black text-white text-4xl">
              🛍️
            </div>
            <div>
              <p className="text-base font-black text-black">Noch keine Produkte</p>
              <p className="mt-1.5 text-sm font-bold text-black/45 max-w-xs leading-relaxed">
                Lade ein Foto hoch — AI erstellt automatisch Titel und Beschreibung.
                In einer Minute ist dein Produkt auf LuxuryBandit.
              </p>
            </div>
            <button type="button" onClick={openCreate}
              className="flex h-13 items-center gap-2 rounded-2xl bg-black px-8 py-3.5 text-sm font-black text-white active:scale-95 transition-transform">
              <Plus className="h-4 w-4" /> Erstes Produkt erstellen
            </button>
          </div>
        )}

        {/* ── Products grid ── */}
        {looks.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-black/40">
                Produkte <span className="text-black/25">({looks.length})</span>
              </p>
              <button type="button" onClick={openCreate}
                className="flex h-8 items-center gap-1.5 rounded-xl bg-black px-3 text-xs font-black text-white active:opacity-75">
                <Plus className="h-3.5 w-3.5" /> Hinzufügen
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {looks.map(look => (
                <div key={look.id}
                  className="relative overflow-hidden rounded-2xl border border-black/8 bg-white">
                  {/* Image */}
                  <div className="aspect-square bg-black/5 overflow-hidden">
                    {look.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={look.imageUrl} alt={look.name}
                        className="h-full w-full object-cover object-top" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl opacity-20">🖼️</div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3 grid gap-1">
                    <p className="text-xs font-black text-black truncate leading-tight">{look.name}</p>
                    <div className="flex items-center justify-between">
                      {look.price ? (
                        <p className="text-xs font-black text-black">€{look.price}</p>
                      ) : (
                        <p className="text-[10px] font-bold text-black/30">Kein Preis</p>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                        look.published ? "bg-emerald-100 text-emerald-700" : "bg-black/8 text-black/40"
                      }`}>
                        {look.published ? "Live" : "Review"}
                      </span>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex border-t border-black/5">
                    <button type="button" onClick={() => openEdit(look)}
                      className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-black text-black/50 active:bg-black/5 transition border-r border-black/5">
                      <Pencil className="h-3.5 w-3.5" /> Bearbeiten
                    </button>
                    <button type="button" onClick={() => void handleDelete(look.id)}
                      disabled={deleting === look.id}
                      className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-black text-red-400 active:bg-red-50 transition disabled:opacity-40">
                      {deleting === look.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <><Trash2 className="h-3.5 w-3.5" /> Löschen</>
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── Product form sheet ── */}
      {showForm && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
            onClick={() => { if (!saving && !aiLoading) setShowForm(false); }} />
          {/* Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-[56] rounded-t-3xl bg-white shadow-2xl overflow-y-auto overscroll-contain"
            style={{ maxHeight: "92dvh", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
              <div className="h-1 w-10 rounded-full bg-black/15" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 sticky top-5 bg-white z-10">
              <p className="text-base font-black text-black">
                {editId ? "Produkt bearbeiten" : "Neues Produkt"}
              </p>
              <button type="button" onClick={() => setShowForm(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-black/50 active:bg-black/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 px-5 pt-4">

              {/* Image upload */}
              <label className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-black/15 bg-black/[0.02] cursor-pointer overflow-hidden min-h-[180px] active:bg-black/5 transition-colors">
                {form.imagePreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.imagePreview} alt="Preview"
                      className="h-52 w-full object-contain" />
                    <p className="text-[10px] font-bold text-black/30 py-2">Tippe zum Ändern</p>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-10 text-center px-6">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-black/5 text-2xl">📸</div>
                    <p className="text-sm font-black text-black">Produktbild hochladen</p>
                    <p className="text-xs font-bold text-black/40">
                      AI erstellt automatisch Titel und Beschreibung
                    </p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={e => handleImageChange(e.target.files?.[0] ?? null)} />
              </label>

              {/* AI loading indicator */}
              {aiLoading && (
                <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-3">
                  <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
                  <p className="text-xs font-black text-violet-700">KI analysiert dein Produkt…</p>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">
                  Produktname *
                </label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="z.B. Oversized Vintage Hoodie"
                  className="h-12 w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold text-black placeholder:text-black/25 outline-none focus:border-black" />
              </div>

              {/* Price */}
              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">
                  Preis (€)
                </label>
                <div className="flex items-center gap-3 h-12 rounded-2xl border border-black/10 bg-black/[0.02] px-4 focus-within:border-black">
                  <span className="text-sm font-black text-black/30">€</span>
                  <input type="number" inputMode="decimal" value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-sm font-bold text-black placeholder:text-black/25 outline-none" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">
                  Beschreibung
                </label>
                <textarea value={form.productNote}
                  onChange={e => setForm(f => ({ ...f, productNote: e.target.value }))}
                  placeholder="Kurze Beschreibung des Produkts…" rows={3}
                  className="w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm font-bold text-black placeholder:text-black/25 outline-none focus:border-black resize-none" />
              </div>

              {/* Hashtags */}
              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-black/40">
                  Hashtags
                </label>
                <input type="text" value={form.hashtags}
                  onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))}
                  placeholder="#fashion #vintage #streetwear"
                  className="h-12 w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-sm font-bold text-black placeholder:text-black/25 outline-none focus:border-black" />
              </div>

              {/* In stock toggle */}
              <button type="button"
                onClick={() => setForm(f => ({ ...f, inStock: !f.inStock }))}
                className="flex items-center justify-between rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3">
                <span className="text-sm font-black text-black">Auf Lager</span>
                <div className={`relative h-6 w-11 rounded-full transition-colors ${form.inStock ? "bg-black" : "bg-black/15"}`}>
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.inStock ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
              </button>

              {/* Error */}
              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">{error}</p>
              )}

              {/* Save */}
              <button type="button" onClick={() => void handleSave()}
                disabled={saving || aiLoading || !form.name.trim()}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-black text-base font-black text-white disabled:opacity-30 active:scale-95 transition-transform mb-2">
                {saving
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : editId ? "Änderungen speichern" : "Produkt veröffentlichen ⚡"
                }
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
