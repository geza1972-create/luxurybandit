"use client";

import { useEffect, useState } from "react";
import { Play, Download, X, Loader2 } from "lucide-react";
import TopNav from "@/components/TopNav";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

// „My Gallery" als eigene Seite: ALLE generierten Try-on-Videos (dieselbe Quelle wie
// im Funnel, /api/try-this-look?adminPosts=1) — von überall über das Menü erreichbar.
// Tippen öffnet Vollbild mit Download. Nur für den Admin (PIN aus dem Browser).

type Item = {
  id: string;
  imageUrl: string;
  videoUrl?: string;
  lookName?: string;
  curatorId?: string;
  curatorName?: string;
  feed?: boolean;
  public?: boolean;
};

export default function MyGalleryPage() {
  const [pin, setPin] = useState("");
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Item | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [query, setQuery] = useState("");   // Model-/Look-Suche (z. B. „Bella")

  // Admin: Video öffentlich (gratis Teaser im Chat) ↔ privat (🔒 Abo) schalten.
  const setPublic = async (it: Item, pub: boolean) => {
    if (!pin) return;
    setItems(list => list.map(x => x.id === it.id ? { ...x, public: pub, feed: pub ? true : false } : x));
    const h = { "Content-Type": "application/json", "x-try-look-admin-pin": pin };
    try {
      await fetch("/api/try-this-look", { method: "POST", headers: h, body: JSON.stringify({ action: "set-generation-public", generationId: it.id, public: pub }) });
      if (!pub) await fetch("/api/try-this-look", { method: "POST", headers: h, body: JSON.stringify({ action: "set-generation-feed", generationId: it.id, feed: false }) });
    } catch { /* optimistisch — beim nächsten Laden korrekt */ }
  };

  const q = query.trim().toLowerCase();
  const shown = q ? items.filter(it => (it.curatorName || "").toLowerCase().includes(q) || (it.lookName || "").toLowerCase().includes(q)) : items;

  useEffect(() => {
    let p = "";
    try { p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    setPin(p);
    setToken(getStoredAuthSession()?.access_token ?? "");
    setReady(true);
  }, []);

  // Admin (PIN) → ALLE generierten Videos. Eingeloggter User → NUR seine eigenen Try-ons.
  useEffect(() => {
    if (!ready) return;
    if (!pin && !token) { setLoading(false); return; }
    const url = pin ? "/api/try-this-look?adminPosts=1" : "/api/try-this-look?mine=1";
    const headers: Record<string, string> = pin
      ? { "x-try-look-admin-pin": pin }
      : { Authorization: `Bearer ${token}` };
    fetch(url, { headers, cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        const raw = Array.isArray(d.posts) ? d.posts : Array.isArray(d.userGallery) ? d.userGallery : [];
        setItems((raw as Item[]).filter(v => v.videoUrl || v.imageUrl));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, pin, token]);

  // Cross-origin (Supabase) → per Blob laden, damit der Browser wirklich SPEICHERT
  // statt nur zu öffnen. Fällt auf „in neuem Tab öffnen" zurück, falls CORS blockt.
  const download = async (it: Item) => {
    const url = it.videoUrl || it.imageUrl;
    if (!url) return;
    setDownloading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = obj;
      const base = (it.lookName || "luxurybandit").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      a.download = `${base}-${it.id}.${it.videoUrl ? "mp4" : "jpg"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(obj), 4000);
    } catch {
      window.open(url, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] lb-bg pb-24 text-white">
      <TopNav />

      <div className="px-4 pt-4">
        <h1 className="text-[22px] font-black">
          My Gallery {items.length > 0 && <span className="text-white/70">{items.length}</span>}
        </h1>
        <p className="mt-0.5 text-[13px] font-semibold text-white/60">Tippe ein Video an — Vollbild und Download.{pin && " Toggle: Public = gratis Teaser im Chat, Private = 🔒 Abo."}</p>

        {(pin || token) && items.length > 0 && (
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Model suchen — z. B. Bella"
            className="mt-3 h-11 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[14px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-white/40" />
        )}

        {loading ? (
          <p className="py-16 text-center text-[13px] font-bold text-white/40">Lädt…</p>
        ) : (!pin && !token) ? (
          <p className="py-16 text-center text-[13px] font-bold text-white/50">Melde dich an, um deine Try-ons zu sehen.</p>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-[13px] font-bold text-white/40">Noch keine Videos.</p>
        ) : shown.length === 0 ? (
          <p className="py-16 text-center text-[13px] font-bold text-white/40">Keine Treffer für „{query}".</p>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {shown.map(it => (
              <div key={it.id} onClick={() => setOpen(it)}
                className="relative block aspect-[9/16] cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] active:opacity-80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.imageUrl} alt={it.lookName ?? ""} loading="lazy" className="h-full w-full object-cover object-top" />
                {it.videoUrl && (
                  <span className="pointer-events-none absolute inset-0 grid place-items-center text-white/90">
                    <Play className="h-7 w-7 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]" fill="currentColor" />
                  </span>
                )}
                <span className={`absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[8px] font-black backdrop-blur ${it.public ? "bg-amber-500 text-white" : it.feed ? "bg-amber-400 text-black" : "bg-black/70 text-white"}`}>
                  {it.public ? "Public" : it.feed ? "Show" : "Private"}
                </span>
                {/* Admin: 1-Klick Public ↔ Private (gratis Teaser ↔ Abo). */}
                {pin && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); void setPublic(it, !it.public); }}
                    className={`absolute inset-x-1 bottom-1 rounded-full py-1 text-[9px] font-black backdrop-blur active:scale-95 transition ${it.public ? "bg-black/70 text-white" : "bg-amber-500 text-white"}`}>
                    {it.public ? "→ Privat 🔒" : "→ Public ✓"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vollbild-Ansicht mit Download */}
      {open && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-black/95" onClick={() => setOpen(null)}>
          <div className="flex items-center justify-between p-3">
            <button type="button" onClick={() => setOpen(null)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white active:scale-95">
              <X className="h-5 w-5" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); void download(open); }} disabled={downloading}
              className="flex items-center gap-2 rounded-full bg-[#c9a23f] px-4 py-2 text-[13px] font-black text-black active:scale-95 disabled:opacity-50">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center p-3" onClick={(e) => e.stopPropagation()}>
            {open.videoUrl ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={open.videoUrl} poster={open.imageUrl || undefined} controls autoPlay playsInline
                className="max-h-full max-w-full rounded-2xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={open.imageUrl} alt={open.lookName ?? ""} className="max-h-full max-w-full rounded-2xl object-contain" />
            )}
          </div>
        </div>
      )}
    </main>
  );
}
