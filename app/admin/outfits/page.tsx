"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2, Upload, ImagePlus, ChevronLeft, ChevronRight, Check, ArrowRight } from "lucide-react";

type Outfit = { id: string; name: string; imageUrl: string; lookId?: string };

// Downscale + JPEG-encode a picked file so admin uploads stay well under the API body
// limit (~4.5MB on Vercel). Longest side capped at 1200px.
async function fileToDataUrl(file: File, max = 1200, quality = 0.85): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function AdminOutfitsPage() {
  const [pin, setPin] = useState("");
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Scope: "" = global (all looks); else a specific look id.
  const [scopeLookId, setScopeLookId] = useState("");
  // The look you came from (feed → "Manage outfits for this look"). Enables the
  // "This look" scope without a dropdown.
  const [urlLookId, setUrlLookId] = useState("");
  const [looks, setLooks] = useState<{ id: string; name: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { setPin(localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""); } catch { /**/ }
    // Scope to the look you clicked in the feed (?look=<id>).
    try { const l = new URLSearchParams(window.location.search).get("look"); if (l) { setUrlLookId(l); setScopeLookId(l); } } catch { /**/ }
  }, []);

  const load = () => fetch("/api/try-this-look").then(r => r.json()).then(d => {
    setOutfits(d.outfits ?? []);
    setLooks((d.looks ?? []).map((l: any) => ({ id: l.id, name: l.name || l.id })));
  }).catch(() => {});
  useEffect(() => { void load(); }, []);

  const lookName = (id?: string) => looks.find(l => l.id === id)?.name;

  const headers = () => ({ "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) });

  const onPick = async (f?: File) => {
    if (!f) return;
    setError("");
    try { setPreview(await fileToDataUrl(f)); } catch { setError("Could not read that image."); }
  };

  const add = async () => {
    if (!preview) { setError("Pick an image first."); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "add-outfit", name: name.trim(), image: preview, lookId: scopeLookId }) });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "Upload failed."); return; }
      setOutfits(d.outfits ?? []);
      setName(""); setPreview(""); if (fileRef.current) fileRef.current.value = "";
    } catch { setError("Upload failed."); } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this outfit from the gallery?")) return;
    try {
      const res = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "delete-outfit", id }) });
      const d = await res.json();
      if (res.ok) setOutfits(d.outfits ?? []);
    } catch { /**/ }
  };

  // Outfits in the current scope (global or the selected look), in display order.
  const shown = outfits.filter(o => (scopeLookId ? o.lookId === scopeLookId : !o.lookId));

  // Explicit "Save" (everything auto-saves, but this persists the current order and
  // gives clear confirmation) + a jump into the funnel to preview the flow.
  const [saved, setSaved] = useState(false);
  const [savingNow, setSavingNow] = useState(false);
  const saveNow = async () => {
    setSavingNow(true); setSaved(false);
    try {
      await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "reorder-outfits", ids: outfits.map(o => o.id) }) });
      setSaved(true); window.setTimeout(() => setSaved(false), 2500);
    } catch { /**/ } finally { setSavingNow(false); }
  };
  // Which look's funnel to preview: the current look scope, else the look you came from.
  const flowTarget = scopeLookId || urlLookId || looks[0]?.id || "";

  // Move an outfit left/right within its scope (order controls what shows first in the
  // funnel). Optimistic reorder, then persist the full order.
  const move = async (id: string, dir: "left" | "right") => {
    const idx = shown.findIndex(o => o.id === id);
    const swap = dir === "left" ? idx - 1 : idx + 1;
    if (idx < 0 || swap < 0 || swap >= shown.length) return;
    const full = [...outfits];
    const ia = full.findIndex(o => o.id === shown[idx].id);
    const ib = full.findIndex(o => o.id === shown[swap].id);
    [full[ia], full[ib]] = [full[ib], full[ia]];
    setOutfits(full);
    try { await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "reorder-outfits", ids: full.map(o => o.id) }) }); } catch { /**/ }
  };

  if (!pin) {
    return <div className="mx-auto max-w-md px-5 py-16 text-center text-sm font-bold text-black/50">Admin only — enter the Studio PIN first.</div>;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-black">Outfit gallery</h1>
      <p className="mt-1 text-[13px] font-bold text-black/45">Upload the clothes users can pick in the Try-On funnel.</p>

      {/* Scope toggle — no dropdown. "This look" comes from the look you opened in the
          feed; "Global" applies to every look. */}
      <div className="mt-4 flex items-center gap-1 rounded-full bg-black/[0.05] p-1 text-sm font-black">
        {urlLookId && (
          <button type="button" onClick={() => setScopeLookId(urlLookId)}
            className={`flex-1 truncate rounded-full px-3 py-2 ${scopeLookId ? "bg-black text-white" : "text-black/50"}`}>
            This look
          </button>
        )}
        <button type="button" onClick={() => setScopeLookId("")}
          className={`flex-1 rounded-full px-3 py-2 ${!scopeLookId ? "bg-black text-white" : "text-black/50"}`}>
          🌐 Global
        </button>
      </div>
      {scopeLookId
        ? <p className="mt-2 line-clamp-1 text-[12px] font-bold text-black/45">This look: <span className="text-black/70">{lookName(scopeLookId) ?? scopeLookId}</span> — shown only in its Try-On funnel.</p>
        : <p className="mt-2 text-[12px] font-bold text-black/40">{urlLookId ? "Global — shown in every look's funnel." : "Global outfits (shown in every funnel). To edit a single look's gallery, open it from the feed → Try On → “Manage outfits for this look”."}</p>}

      {/* Upload card */}
      <div className="mt-4 rounded-2xl border border-black/10 bg-black/[0.02] p-4">
        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-black/15 bg-white p-3 text-left active:opacity-80">
          <span className="grid h-24 w-[72px] shrink-0 place-items-center overflow-hidden rounded-lg bg-black/[0.04]">
            {preview
              ? // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              : <ImagePlus className="h-6 w-6 text-black/40" />}
          </span>
          <span className="text-[13px] font-black text-black/60">{preview ? "Change image" : "Pick an outfit image"}</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => void onPick(e.target.files?.[0])} />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Outfit name (e.g. Black slip dress)"
          className="mt-3 h-11 w-full rounded-xl border border-black/15 px-3 text-sm outline-none focus:border-black" />
        {error && <p className="mt-2 text-[12px] font-bold text-red-600">{error}</p>}
        <button type="button" onClick={() => void add()} disabled={busy || !preview}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white active:scale-95 transition-transform disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Add to {scopeLookId ? "this look" : "global gallery"}
        </button>
      </div>

      {/* Existing outfits in the current scope. First = shows first in the funnel;
          use ‹ › to move an outfit left/right. */}
      {shown.length > 0 && (
        <p className="mt-6 text-[12px] font-bold text-black/40">Order = how they appear in the funnel · use ‹ › to reorder. The first one shows first.</p>
      )}
      <div className="mt-2 grid grid-cols-2 gap-3">
        {shown.map((o, i) => (
          <div key={o.id} className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-black/10 bg-black/[0.03]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={o.imageUrl} alt={o.name} className="h-full w-full object-cover" />
            <span className="absolute left-2 top-2 max-w-[62%] truncate rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
              {o.lookId ? (lookName(o.lookId) ?? "Look") : "Global"}
            </span>
            {i === 0 && <span className="absolute left-2 top-9 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">1st</span>}
            <button type="button" onClick={() => void remove(o.id)}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-red-500/90 text-white active:scale-90">
              <Trash2 className="h-4 w-4" />
            </button>
            {/* Reorder arrows */}
            {i > 0 && (
              <button type="button" onClick={() => void move(o.id, "left")}
                className="absolute left-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white backdrop-blur active:scale-90">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {i < shown.length - 1 && (
              <button type="button" onClick={() => void move(o.id, "right")}
                className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white backdrop-blur active:scale-90">
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
            <div className="absolute inset-x-2 bottom-2 rounded-xl bg-black px-3 py-2">
              <span className="line-clamp-1 text-[12px] font-black text-white">{o.name}</span>
            </div>
          </div>
        ))}
      </div>
      {shown.length === 0 && (
        <p className="mt-8 text-center text-[13px] font-bold text-black/35">
          {scopeLookId ? "No outfits for this look yet — add one above." : "No global outfits yet — add your first above."}
        </p>
      )}

      {/* Sticky action bar — Save, and jump into the funnel to preview the flow. */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex items-center gap-2 border-t border-black/10 bg-white/95 px-4 py-3 backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>
        <button type="button" onClick={() => void saveNow()} disabled={savingNow}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-black/15 bg-white text-sm font-black text-black active:scale-95 transition-transform disabled:opacity-50">
          {savingNow ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4 text-emerald-600" /> : null}
          {saved ? "Gespeichert" : "Speichern"}
        </button>
        <button type="button" disabled={!flowTarget} onClick={() => { if (flowTarget) window.location.href = `/try/${flowTarget}`; }}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white active:scale-95 transition-transform disabled:opacity-40">
          Flow ansehen <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
