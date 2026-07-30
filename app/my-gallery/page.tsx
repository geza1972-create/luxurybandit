"use client";

import { useEffect, useState } from "react";
import { fillPrices } from "@/lib/pricing";
import { Play, Download, X, Loader2 } from "lucide-react";
import TopNav from "@/components/TopNav";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

// „My Gallery" als eigene Seite: ALLE generierten Try-on-Videos (dieselbe Quelle wie
// im Funnel, /api/try-this-look?adminPosts=1) — von überall über das Menü erreichbar.
// Tippen öffnet Vollbild mit Download. Nur für den Admin (PIN aus dem Browser).

type Item = {
  id: string;
  type?: "video" | "slide";   // Try-on-Video vs. Card-Studio-Slide (Urlaub/Peter-Fotos)
  imageUrl: string;
  videoUrl?: string;
  lookName?: string;
  curatorId?: string;
  curatorName?: string;
  garment?: string;   // manuell zugewiesen: "lingerie" | "normal"
  source?: string;    // "kiss" | "kiss-upload" — nur die darf der Besitzer selbst löschen
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

  // Mehrfachauswahl: auswählen → Bulk Public/Private oder Löschen. Nur VIDEOS (Slides = Card Studio).
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSel = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const clearSel = () => { setSelected(new Set()); setSelectMode(false); };
  const hdr = () => ({ "Content-Type": "application/json", "x-try-look-admin-pin": pin });
  // Ausgewählte Slides (id = "slide:<cid>:<sid>") nach Model gruppieren + gepatcht committen.
  const patchSlides = async (ids: string[], patch: { private?: boolean; garmentCat?: string; remove?: boolean }) => {
    const byCid = new Map<string, string[]>();
    ids.forEach(id => { const m = /^slide:([^:]+):(.+)$/.exec(id); if (m) { const a = byCid.get(m[1]) ?? []; a.push(m[2]); byCid.set(m[1], a); } });
    for (const [cid, sids] of byCid) {
      try { await fetch("/api/bella-carousel", { method: "POST", headers: hdr(), body: JSON.stringify({ model: cid, bulkSlides: { ids: sids, patch } }) }); } catch { /**/ }
    }
  };
  const splitSel = () => { const sel = [...selected]; return { sel, vids: sel.filter(id => items.find(it => it.id === id)?.type !== "slide"), slds: sel.filter(id => items.find(it => it.id === id)?.type === "slide") }; };

  const bulkPublic = async (pub: boolean) => {
    if (!pin) return;
    const { sel, vids, slds } = splitSel();
    if (!sel.length) return;
    setItems(list => list.map(x => sel.includes(x.id) ? { ...x, public: pub } : x));
    for (const id of vids) {
      try {
        await fetch("/api/try-this-look", { method: "POST", headers: hdr(), body: JSON.stringify({ action: "set-generation-public", generationId: id, public: pub }) });
        if (!pub) await fetch("/api/try-this-look", { method: "POST", headers: hdr(), body: JSON.stringify({ action: "set-generation-feed", generationId: id, feed: false }) });
      } catch { /**/ }
    }
    await patchSlides(slds, { private: !pub });   // Slide: public = nicht privat
    clearSel();
  };
  const bulkDelete = async () => {
    if (!pin) return;
    const { sel, vids, slds } = splitSel();
    if (!sel.length) return;
    if (typeof window !== "undefined" && !window.confirm(`${sel.length} Element(e) endgültig löschen?`)) return;
    setItems(list => list.filter(x => !sel.includes(x.id)));
    for (const id of vids) { try { await fetch("/api/try-this-look", { method: "POST", headers: hdr(), body: JSON.stringify({ action: "delete-generation", id }) }); } catch { /**/ } }
    await patchSlides(slds, { remove: true });
    clearSel();
  };

  /**
   * SEIN EIGENES LÖSCHEN (Owner 30.07.2026: „kann er sie auch löschen?").
   *
   * Der Sammel-Löscher darüber ist admin-gebunden. Ein Kunde muss seine eigenen Stücke
   * loswerden können, ohne uns zu fragen — die Route lässt es zu, wenn Gerät oder
   * angemeldete Adresse zum Eintrag passen.
   */
  const eigenesLoeschen = async (it: Item) => {
    const id = it.id.replace(/-foto$/, "");
    if (typeof window !== "undefined" && !window.confirm("Dieses Bild endgültig löschen?")) return;
    setItems(list => list.filter(x => x.id !== it.id && x.id !== `${id}-foto` && x.id !== id));
    try {
      let device = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
      const tok = getStoredAuthSession()?.access_token ?? "";
      await fetch("/api/kiss-log", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: JSON.stringify({ remove: id, device }),
      });
    } catch { /**/ }
  };

  const [statusFilter, setStatusFilter] = useState<"all" | "public" | "private">("all");   // Freigabe-Status
  const [typeFilter, setTypeFilter] = useState<"all" | "video" | "slide">("all");          // Videos vs. Slides
  const [catFilter, setCatFilter] = useState<"all" | "lingerie" | "normal" | "reise">("all");
  // Kategorie ≈ Theme: manuelles Tag gewinnt; Card-Slides = Reise (Story-Tool); sonst Video-Heuristik.
  const catOf = (it: Item): "lingerie" | "normal" | "reise" => {
    if (it.garment === "lingerie") return "lingerie";
    if (it.garment === "normal") return "normal";
    if (it.type === "slide") return "reise";   // Card-Studio-Content ist Reise/Story — außer manuell umgetaggt
    const s = `${it.lookName || ""}`.toLowerCase();
    if (/lingerie|boudoir|dessous|lace|thong|underwear|unterwäsche|bikini|swim|bh\b/.test(s)) return "lingerie";
    return "normal";
  };
  const bulkGarment = async (garment: "lingerie" | "normal") => {
    if (!pin) return;
    const { sel, vids, slds } = splitSel();
    if (!sel.length) return;
    setItems(list => list.map(x => sel.includes(x.id) ? { ...x, garment } : x));
    for (const id of vids) { try { await fetch("/api/try-this-look", { method: "POST", headers: hdr(), body: JSON.stringify({ action: "set-generation-garment", generationId: id, garment }) }); } catch { /**/ } }
    await patchSlides(slds, { garmentCat: garment });
    clearSel();
  };
  const q = query.trim().toLowerCase();
  const shown = items.filter(it => {
    if (q && !((it.curatorName || "").toLowerCase().includes(q) || (it.lookName || "").toLowerCase().includes(q))) return false;
    if (typeFilter !== "all" && (it.type ?? "video") !== typeFilter) return false;
    if (catFilter !== "all" && catOf(it) !== catFilter) return false;
    if (statusFilter === "public") return it.public === true;
    if (statusFilter === "private") return it.public !== true;
    return true;
  });
  const pubCount = items.filter(it => it.public === true).length;
  const vidCount = items.filter(it => (it.type ?? "video") === "video").length;
  const catCount = (c: "lingerie" | "normal" | "reise") => items.filter(it => catOf(it) === c).length;

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
    // EIGENE VIDEOS (Chat/Try-on ohne Konto): haengen am Geraet — und zusaetzlich an der
    // E-Mail, sobald er angemeldet ist (Owner 28.07.2026). Laeuft unabhaengig vom Admin-Weg.
    const device = (() => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } })();
    const mail = getStoredAuthSession()?.user?.email ?? "";
    if (device || mail) {
      fetch(`/api/my-videos?device=${encodeURIComponent(device)}&email=${encodeURIComponent(mail)}`, { cache: "no-store" })
        .then(r => r.json())
        .then(d => {
          const own: Item[] = (Array.isArray(d?.videos) ? d.videos : []).map((v: { id: string; videoUrl: string; posterUrl?: string; name?: string }) => ({
            id: v.id, type: "video" as const, imageUrl: v.posterUrl || "", videoUrl: v.videoUrl, lookName: v.name || "",
          }));
          // DIE KISS-BILDER GEHÖREN HIER HIN (Owner 30.07.2026: „seine Galerie ist leer,
          // seine Bilder sind nicht da"). Sie liegen im Kiss-Log; die Route liefert sie jetzt
          // als `pictures` mit — zugeordnet über E-Mail oder Gerät.
          const bilder: Item[] = (Array.isArray(d?.pictures) ? d.pictures : [])
            .map((b: { id: string; imageUrl?: string; videoUrl?: string; name?: string; source?: string }) => ({
              id: b.id,
              type: (b.videoUrl ? "video" : "image") as "video" | "image",
              imageUrl: b.imageUrl || "",
              videoUrl: b.videoUrl || "",
              lookName: b.name || "",
              source: b.source || "kiss",
            }))
            .filter((b: Item) => b.imageUrl || b.videoUrl);
          own.push(...bilder);
          if (own.length) setItems(prev => [...own, ...prev.filter(x => !own.some(o => o.id === x.id))]);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    if (!pin && !token) { setLoading(false); return; }
    const url = pin ? "/api/try-this-look?adminPosts=1" : "/api/try-this-look?mine=1";
    const headers: Record<string, string> = pin
      ? { "x-try-look-admin-pin": pin }
      : { Authorization: `Bearer ${token}` };
    fetch(url, { headers, cache: "no-store" })
      .then(r => r.json())
      .then(async d => {
        const raw = Array.isArray(d.posts) ? d.posts : Array.isArray(d.userGallery) ? d.userGallery : [];
        const vids: Item[] = (raw as Item[]).filter(v => v.videoUrl || v.imageUrl).map(v => ({ ...v, type: "video" as const }));
        setItems(vids);
        // Admin: zusätzlich die Card-Studio-Slides (Urlaub/Peter-Fotos) je Model anhängen —
        // damit ALLE Inhalte + Freigabe an EINEM Ort stehen. Slide: public = nicht privat.
        if (!pin) return;
        const nameById = new Map<string, string>();
        vids.forEach(v => { if (v.curatorId) nameById.set(v.curatorId, v.curatorName || ""); });
        const slideItems: Item[] = [];
        for (const cid of [...nameById.keys()].filter(Boolean)) {
          try {
            const sd = await fetch(`/api/bella-carousel?model=${encodeURIComponent(cid)}`, { headers: { "x-try-look-admin-pin": pin }, cache: "no-store" }).then(r => r.json());
            const slides: Array<Record<string, unknown>> = Array.isArray(sd?.slides) ? sd.slides : [];
            slides.filter(s => !s.customer && (s.mediaUrl || s.posterUrl)).forEach(s => {
              slideItems.push({
                id: `slide:${cid}:${String(s.id)}`, type: "slide", curatorId: cid, curatorName: nameById.get(cid) || "",
                lookName: String(s.title || ""),
                imageUrl: String(s.kind === "video" ? (s.posterUrl || s.mediaUrl) : s.mediaUrl),
                videoUrl: s.kind === "video" ? String(s.mediaUrl || "") : undefined,
                garment: String(s.garmentCat || ""),
                public: s.private !== true,
              });
            });
          } catch { /**/ }
        }
        if (slideItems.length) setItems(prev => [...prev, ...slideItems]);
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
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[22px] font-black">
            My Gallery {items.length > 0 && <span className="text-white/70">{items.length}</span>}
          </h1>
          {pin && items.length > 0 && (
            <button type="button" onClick={() => { if (selectMode) clearSel(); else setSelectMode(true); }}
              className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-black transition ${selectMode ? "bg-white/85 text-black" : "bg-white/10 text-white/80"}`}>
              {selectMode ? "Fertig" : "Auswählen"}
            </button>
          )}
        </div>
        <p className="mt-0.5 text-[13px] font-semibold text-white/60">Tippe ein Video an — Vollbild und Download.{pin && " Toggle: Public = gratis Teaser im Chat, Private = 🔒 Abo."}</p>

        {/* WERBUNG FÜRS VIDEO, direkt hier (Owner 30.07.2026: „dort machen wir Werbung noch
            für turn into Video"). Wer aus der Mail kommt, hat sein Bild vor sich — das ist
            der Moment für den nächsten Schritt, nicht die Themenübersicht. Nur zeigen, wenn
            er auch etwas hat; eine leere Galerie mit Werbung wäre nur Lärm. */}
        {!pin && items.length > 0 && (
          <a href="/themes/kiss"
            className="mt-3 flex items-center gap-3 rounded-2xl border border-[#f6cf51]/35 bg-[#f6cf51]/[0.07] p-3.5 active:scale-[0.99] transition">
            <span className="text-[22px]">🔥</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-black text-white">Turn it into a hot video</span>
              <span className="mt-0.5 block text-[12px] font-bold leading-snug text-white/70">
                {fillPrices("See the two of you move — {once}, one-off.")}
              </span>
            </span>
            <span className="lb-gold shrink-0 rounded-full px-3.5 py-2 text-[12px] font-black">Go →</span>
          </a>
        )}

        {(pin || token) && items.length > 0 && (
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Model suchen — z. B. Bella"
            className="mt-3 h-11 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 text-[14px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-white/40" />
        )}
        {pin && items.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-[12px] font-black">
            {([["all", `Alle ${items.length}`], ["public", `Public ${pubCount}`], ["private", `Private ${items.length - pubCount}`]] as const).map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => setStatusFilter(k)}
                className={`rounded-full px-3.5 py-1.5 transition ${statusFilter === k ? "bg-amber-500 text-white" : "bg-white/10 text-white/70"}`}>{lbl}</button>
            ))}
            <span className="w-px self-stretch bg-white/10" />
            {([["all", "Alle Typen"], ["video", `Videos ${vidCount}`], ["slide", `Slides ${items.length - vidCount}`]] as const).map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => setTypeFilter(k)}
                className={`rounded-full px-3.5 py-1.5 transition ${typeFilter === k ? "bg-white/85 text-black" : "bg-white/10 text-white/70"}`}>{lbl}</button>
            ))}
            <span className="w-full" />
            {([["all", "Alle"], ["lingerie", `Lingerie ${catCount("lingerie")}`], ["normal", `Normal ${catCount("normal")}`], ["reise", `Reise ${catCount("reise")}`]] as const).map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => setCatFilter(k)}
                className={`rounded-full px-3.5 py-1.5 transition ${catFilter === k ? "bg-violet-500 text-white" : "bg-white/10 text-white/70"}`}>{lbl}</button>
            ))}
          </div>
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
            {shown.map(it => {
              const isSel = selected.has(it.id);
              return (
              <div key={it.id} onClick={() => selectMode ? toggleSel(it.id) : setOpen(it)}
                className={`relative block aspect-[9/16] cursor-pointer overflow-hidden rounded-xl border bg-white/[0.04] active:opacity-80 ${isSel ? "border-amber-400 ring-2 ring-amber-400" : "border-white/10"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.imageUrl} alt={it.lookName ?? ""} loading="lazy" className="h-full w-full object-cover object-top" />
                {/* Auswahl-Häkchen (Videos UND Slides). */}
                {selectMode && (
                  <span className={`absolute right-1 top-1 z-10 grid h-5 w-5 place-items-center rounded-full text-[11px] font-black ${isSel ? "bg-amber-400 text-black" : "bg-black/60 text-white ring-1 ring-white/60"}`}>{isSel ? "✓" : ""}</span>
                )}
                {it.videoUrl && (
                  <span className="pointer-events-none absolute inset-0 grid place-items-center text-white/90">
                    <Play className="h-7 w-7 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]" fill="currentColor" />
                  </span>
                )}
                <span className={`absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[8px] font-black backdrop-blur ${it.public ? "bg-amber-500 text-white" : it.feed ? "bg-amber-400 text-black" : "bg-black/70 text-white"}`}>
                  {it.public ? "Public" : it.feed ? "Show" : "Private"}
                </span>
                {/* Typ-Tag: Card-Slide (Urlaub/Peter) unterscheiden. Im Auswahl-Modus weg (Häkchen). */}
                {it.type === "slide" && !selectMode && (
                  <span className="absolute right-1 top-1 rounded-full bg-white/85 px-1.5 py-0.5 text-[8px] font-black text-black backdrop-blur">Slide</span>
                )}
                {/* Kategorie-Tag (Lingerie) als kleiner Hinweis. */}
                {catOf(it) === "lingerie" && !selectMode && (
                  <span className="absolute left-1 bottom-1 rounded-full bg-violet-500/90 px-1.5 py-0.5 text-[8px] font-black text-white backdrop-blur">Lingerie</span>
                )}
                {/* Admin: 1-Klick Public ↔ Private — nur bei VIDEOS, außerhalb des Auswahl-Modus. */}
                {pin && !selectMode && it.type !== "slide" && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); void setPublic(it, !it.public); }}
                    className={`absolute inset-x-1 bottom-6 rounded-full py-1 text-[9px] font-black backdrop-blur active:scale-95 transition ${it.public ? "bg-black/70 text-white" : "bg-amber-500 text-white"}`}>
                    {it.public ? "→ Privat 🔒" : "→ Public ✓"}
                  </button>
                )}
                {pin && !selectMode && it.type === "slide" && (
                  <span className="pointer-events-none absolute inset-x-1 bottom-1 rounded-full bg-black/60 py-1 text-center text-[8px] font-black text-white/80 backdrop-blur">Im Card Studio</span>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk-Aktionsleiste (Auswahl-Modus) — verschieben (Lingerie/Normal), Freigabe, Löschen. */}
      {selectMode && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[110] border-t border-white/10 bg-[#0d0b0a]/95 px-3 py-3 backdrop-blur">
          <div className="mb-2 text-center text-[12px] font-black text-white/70">{selected.size} ausgewählt</div>
          <div className="flex flex-wrap justify-center gap-2 text-[12px] font-black">
            <button type="button" onClick={() => void bulkGarment("lingerie")} className="rounded-full bg-violet-500 px-3.5 py-2 text-white active:scale-95">→ Lingerie</button>
            <button type="button" onClick={() => void bulkGarment("normal")} className="rounded-full bg-white/15 px-3.5 py-2 text-white active:scale-95">→ Normal</button>
            <button type="button" onClick={() => void bulkPublic(true)} className="rounded-full bg-amber-500 px-3.5 py-2 text-white active:scale-95">Public</button>
            <button type="button" onClick={() => void bulkPublic(false)} className="rounded-full bg-white/15 px-3.5 py-2 text-white active:scale-95">Private</button>
            <button type="button" onClick={() => void bulkDelete()} className="rounded-full bg-red-500/90 px-3.5 py-2 text-white active:scale-95">Löschen</button>
          </div>
        </div>
      )}

      {/* Vollbild-Ansicht mit Download */}
      {open && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-black/95" onClick={() => setOpen(null)}>
          <div className="flex items-center justify-between p-3">
            <button type="button" onClick={() => setOpen(null)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white active:scale-95">
              <X className="h-5 w-5" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); void download(open); }} disabled={downloading}
              className="flex items-center gap-2 rounded-full bg-[#f6cf51] px-4 py-2 text-[13px] font-black text-black active:scale-95 disabled:opacity-50">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-3" onClick={(e) => e.stopPropagation()}>
            {open.videoUrl ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={open.videoUrl} poster={open.imageUrl || undefined} controls autoPlay playsInline
                className="max-h-full max-w-full rounded-2xl object-contain" />
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
