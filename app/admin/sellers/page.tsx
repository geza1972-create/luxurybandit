"use client";

import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink, Eye, EyeOff, Loader2, Mail, MapPin, Package, Phone, RefreshCw, Sparkles, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Store = {
  id: string;
  name: string;
  slug: string;
  address?: string;
  whatsappNumber?: string;
  ownerUserId?: string;
  ownerEmail?: string;
  aiEnabled?: boolean;
  aiCreditsLimit?: number;
  aiCreditsUsed?: number;
  aiCreditsResetAt?: string;
  pendingAiRequest?: boolean;
  createdAt: string;
};

type Look = {
  id: string;
  storeSlug?: string;
  name: string;
  price?: string;
  inStock?: boolean;
  published?: boolean;
};

const ADMIN_PIN_KEY = "luxurybandit-try-look-admin-pin";

export default function AdminSellersPage() {
  const [pin, setPin] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async (adminPin = pin) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/try-this-look?admin=1", {
        headers: adminPin ? { "x-try-look-admin-pin": adminPin } : {},
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Could not load data.");
      setStores(payload.stores ?? []);
      setLooks(payload.looks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_PIN_KEY) ?? "";
    setPin(stored);
    void loadData(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const callAdmin = async (body: object) => {
    setMessage("");
    const res = await fetch("/api/try-this-look", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(pin ? { "x-try-look-admin-pin": pin } : {}),
      },
      body: JSON.stringify(body),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error ?? "Error.");
    return payload;
  };

  const updateSeller = async (storeSlug: string, fields: { aiEnabled?: boolean; aiCreditsLimit?: number; resetCredits?: boolean }) => {
    try {
      await callAdmin({ action: "update-seller", storeSlug, ...fields });
      setMessage("Gespeichert.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error.");
    }
  };

  const togglePublished = async (lookId: string, published: boolean) => {
    try {
      await callAdmin({ action: "update-look", id: lookId, published });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error.");
    }
  };

  const deleteStore = async (storeSlug: string) => {
    try {
      await callAdmin({ action: "delete-store", storeSlug });
      setMessage("Store gelöscht.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error.");
    }
  };

  const pendingCount = stores.filter((s) => s.pendingAiRequest && !s.aiEnabled).length;

  return (
    <main className="min-h-screen bg-[#fbfaf7] px-4 py-5 text-ink">
      <section className="mx-auto grid w-full max-w-4xl gap-5">

        <header className="grid gap-2">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">LuxuryBandit Admin</div>
          <h1 className="text-5xl font-black leading-none text-ink">Sellers</h1>
          <p className="max-w-2xl text-sm font-bold leading-6 text-ink/60">
            Alle Store-Daten auf einen Blick. AI-Zugang freischalten und Credit-Limits setzen.
          </p>
          <Link href="/admin" className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-black/10 bg-white px-4 text-xs font-black text-ink shadow-soft">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
        </header>

        {error && <div className="rounded-md border border-coral/25 bg-coral/10 p-4 text-sm font-black text-coral">{error}</div>}
        {message && <div className="rounded-md border border-green-300 bg-green-50 p-4 text-sm font-black text-green-700">{message}</div>}

        {/* Summary */}
        {!isLoading && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 shadow-soft">
              <Users className="h-4 w-4 text-cobalt" />
              <span className="text-sm font-black text-ink">{stores.length} seller{stores.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-3 shadow-soft">
              <Package className="h-4 w-4 text-cobalt" />
              <span className="text-sm font-black text-ink">{looks.length} listing{looks.length !== 1 ? "s" : ""}</span>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-black text-amber-700">{pendingCount} pending AI request{pendingCount !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-black/30" />
          </div>
        ) : stores.length === 0 ? (
          <div className="rounded-lg border border-black/10 bg-white p-8 text-center shadow-soft">
            <Users className="mx-auto h-8 w-8 text-black/20 mb-3" />
            <p className="text-sm font-black text-black/40">Noch keine Seller.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {stores.map((s) => (
              <SellerCard
                key={s.slug}
                store={s}
                looks={looks.filter((l) => l.storeSlug === s.slug)}
                onUpdate={updateSeller}
                onTogglePublished={togglePublished}
                onDelete={deleteStore}
              />
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-4 text-xs font-black text-ink shadow-soft"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </section>
    </main>
  );
}

// ── Seller card ──────────────────────────────────────────────────────────────
function SellerCard({
  store,
  looks,
  onUpdate,
  onTogglePublished,
  onDelete,
}: {
  store: Store;
  looks: Look[];
  onUpdate: (slug: string, fields: { aiEnabled?: boolean; aiCreditsLimit?: number; resetCredits?: boolean }) => void;
  onTogglePublished: (lookId: string, published: boolean) => void;
  onDelete: (slug: string) => void;
}) {
  const [limit, setLimit] = useState(String(store.aiCreditsLimit ?? 20));
  const [saving, setSaving] = useState(false);
  const [showNumber, setShowNumber] = useState(false);
  const [showLooks, setShowLooks] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdminStore = !store.ownerEmail && !store.ownerUserId;

  const save = async (fields: { aiEnabled?: boolean; aiCreditsLimit?: number; resetCredits?: boolean }) => {
    setSaving(true);
    await onUpdate(store.slug, fields);
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(store.slug);
    setDeleting(false);
    setConfirmDelete(false);
  };

  const maskedNumber = (n: string) => {
    if (n.length <= 6) return n;
    return n.slice(0, 4) + "•".repeat(n.length - 6) + n.slice(-2);
  };

  const used = store.aiCreditsUsed ?? 0;
  const lim = store.aiCreditsLimit ?? 0;
  const resetDate = store.aiCreditsResetAt ? new Date(store.aiCreditsResetAt).toLocaleDateString("de-DE") : "—";
  const inStockCount = looks.filter((l) => l.inStock !== false).length;
  const publishedCount = looks.filter((l) => l.published !== false).length;

  return (
    <div className={`rounded-xl border bg-white shadow-soft overflow-hidden ${store.pendingAiRequest && !store.aiEnabled ? "border-amber-300" : "border-black/10"}`}>

      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/8 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(store.slug)}&backgroundColor=ffffff&color=000000`}
              alt={store.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-black text-ink">{store.name}</span>
              {isAdminStore && (
                <span className="rounded-full bg-cobalt/10 px-2.5 py-0.5 text-[10px] font-black text-cobalt">Admin store</span>
              )}
              {store.pendingAiRequest && !store.aiEnabled && (
                <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black text-white">AI angefragt</span>
              )}
              {store.aiEnabled && (
                <span className="rounded-full bg-green-500 px-2.5 py-0.5 text-[10px] font-black text-white">AI aktiv</span>
              )}
            </div>
            <div className="text-[11px] font-bold text-ink/35">
              Erstellt {new Date(store.createdAt).toLocaleDateString("de-DE")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI toggle — not shown for admin store */}
          {!isAdminStore && (
            <button
              type="button"
              disabled={saving}
              onClick={() => save({ aiEnabled: !store.aiEnabled, aiCreditsLimit: Number(limit) || 20 })}
              className={`h-9 rounded-lg px-4 text-xs font-black disabled:opacity-50 transition ${
                store.aiEnabled
                  ? "border border-coral/30 bg-coral/10 text-coral hover:bg-coral/20"
                  : "bg-ink text-white hover:bg-ink/80"
              }`}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : store.aiEnabled ? "AI deaktivieren" : "AI freischalten"}
            </button>
          )}

          {/* Delete */}
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-ink/30 hover:border-coral/40 hover:text-coral transition"
              title="Store löschen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-coral">Sicher?</span>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="h-8 rounded-lg bg-coral px-3 text-xs font-black text-white disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Ja, löschen"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-8 rounded-lg border border-black/10 px-3 text-xs font-black text-ink/50"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Info grid ── */}
      <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-black/6 sm:grid-cols-4">
        <div className="flex flex-col gap-1 px-4 py-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-ink/35">
            <Mail className="h-3 w-3" /> E-Mail
          </div>
          {store.ownerEmail ? (
            <a href={`mailto:${store.ownerEmail}`} className="truncate text-xs font-bold text-cobalt hover:underline">
              {store.ownerEmail}
            </a>
          ) : (
            <span className="text-xs font-bold text-ink/25">—</span>
          )}
        </div>

        <div className="flex flex-col gap-1 px-4 py-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-ink/35">
            <Phone className="h-3 w-3" /> WhatsApp
          </div>
          {store.whatsappNumber ? (
            <div className="flex items-center gap-1.5">
              {showNumber ? (
                <a href={`https://wa.me/${store.whatsappNumber.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold text-green-600 hover:underline">{store.whatsappNumber}</a>
              ) : (
                <span className="font-mono text-xs font-bold text-ink/50 tracking-wider">{maskedNumber(store.whatsappNumber)}</span>
              )}
              <button type="button" onClick={() => setShowNumber(v => !v)}
                className="rounded px-1.5 py-0.5 text-[10px] font-black text-ink/40 hover:text-ink border border-black/10 transition">
                {showNumber ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            </div>
          ) : (
            <span className="text-xs font-bold text-ink/25">—</span>
          )}
        </div>

        <div className="flex flex-col gap-1 px-4 py-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-ink/35">
            <MapPin className="h-3 w-3" /> Adresse
          </div>
          <span className="text-xs font-bold text-ink/70">{store.address || <span className="text-ink/25">—</span>}</span>
        </div>

        <div className="flex flex-col gap-1 px-4 py-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-ink/35">
            <Package className="h-3 w-3" /> Listings
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-black text-ink">{looks.length}</span>
            <span className="text-[10px] font-bold text-ink/35">total</span>
            {looks.length > 0 && (
              <>
                <span className="text-[10px] font-bold text-ink/25 mx-0.5">·</span>
                <span className="text-[10px] font-bold text-green-600">{inStockCount} verfügbar</span>
                <span className="text-[10px] font-bold text-ink/25 mx-0.5">·</span>
                <span className="text-[10px] font-bold text-cobalt">{publishedCount} live</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Store link ── */}
      <div className="border-t border-black/6 px-5 py-2 flex items-center justify-between">
        <span className="text-[11px] font-bold text-ink/35">/store/{store.slug}</span>
        <a href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-black text-cobalt hover:underline">
          Store öffnen <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* ── AI credits ── */}
      {!isAdminStore && (
        <div className="border-t border-black/6 bg-black/[0.02] px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
              <span className="text-xs font-black text-ink">AI Credits</span>
            </div>
            {store.aiEnabled ? (
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-ink/60">
                  <span className="font-black text-ink">{used}</span> / {lim} verwendet · Reset {resetDate}
                </span>
                {lim > 0 && (
                  <div className="flex-1 min-w-[60px] h-1.5 overflow-hidden rounded-full bg-black/10">
                    <div className={`h-full rounded-full transition-all ${used >= lim ? "bg-coral" : "bg-violet-500"}`}
                      style={{ width: `${Math.min(100, (used / lim) * 100)}%` }} />
                  </div>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} min={0} max={999}
                    className="h-8 w-20 rounded-md border border-black/10 bg-white px-2 text-sm font-bold outline-none focus:border-cobalt" />
                  <button type="button" disabled={saving} onClick={() => save({ aiCreditsLimit: Number(limit) || lim })}
                    className="h-8 rounded-md bg-cobalt px-3 text-xs font-black text-white disabled:opacity-50">Limit setzen</button>
                  <button type="button" disabled={saving} onClick={() => save({ resetCredits: true })}
                    className="h-8 rounded-md border border-black/10 bg-white px-3 text-xs font-black text-ink/60 hover:text-ink disabled:opacity-50">Reset</button>
                </div>
              </div>
            ) : (
              <span className="text-xs font-bold text-ink/40">
                {store.pendingAiRequest ? "Seller hat AI-Zugang angefragt — oben freischalten." : "AI nicht aktiviert."}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Looks (publish/unpublish) ── */}
      {looks.length > 0 && (
        <div className="border-t border-black/6">
          <button type="button" onClick={() => setShowLooks(v => !v)}
            className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-black/[0.02] transition">
            <span className="text-xs font-black text-ink/60">Listings anzeigen / freigeben ({looks.length})</span>
            {showLooks ? <ChevronUp className="h-4 w-4 text-ink/30" /> : <ChevronDown className="h-4 w-4 text-ink/30" />}
          </button>
          {showLooks && (
            <div className="border-t border-black/6 divide-y divide-black/5">
              {looks.map((look) => (
                <div key={look.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-ink">{look.name}</p>
                    <p className="text-[10px] font-bold text-ink/40">{look.price ?? "—"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTogglePublished(look.id, look.published === false ? true : false)}
                    className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black transition ${
                      look.published !== false
                        ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600"
                        : "bg-black/8 text-ink/40 hover:bg-green-100 hover:text-green-700"
                    }`}
                  >
                    {look.published !== false ? "Live ✓" : "Draft — freigeben"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
