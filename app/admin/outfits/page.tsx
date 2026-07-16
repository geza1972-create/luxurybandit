"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2, Upload, ImagePlus, Check, ArrowRight, ChevronUp, ChevronDown } from "lucide-react";

type Outfit = { id: string; name: string; imageUrl: string; lookId?: string };

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
  const [scopeLookId, setScopeLookId] = useState("");
  const [urlLookId, setUrlLookId] = useState("");
  const [looks, setLooks] = useState<{ id: string; name: string }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Wardrobe";
    try { setPin(localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""); } catch { /**/ }
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
    if (!name.trim()) { setError("Enter an outfit name."); return; }
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
    if (!window.confirm("Delete this outfit?")) return;
    try {
      const res = await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "delete-outfit", id }) });
      const d = await res.json();
      if (res.ok) setOutfits(d.outfits ?? []);
    } catch { /**/ }
  };

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const saveEdit = async (id: string) => {
    if (!editingName.trim()) { setEditingId(null); return; }
    setOutfits(outfits.map(o => o.id === id ? { ...o, name: editingName.trim() } : o));
    setEditingId(null);
  };

  const shown = outfits.filter(o => (scopeLookId ? o.lookId === scopeLookId : !o.lookId));

  const [saved, setSaved] = useState(false);
  const [savingNow, setSavingNow] = useState(false);
  const saveNow = async () => {
    setSavingNow(true); setSaved(false);
    try {
      await fetch("/api/try-this-look", { method: "POST", headers: headers(), body: JSON.stringify({ action: "reorder-outfits", ids: outfits.map(o => o.id) }) });
      setSaved(true); window.setTimeout(() => setSaved(false), 2500);
    } catch { /**/ } finally { setSavingNow(false); }
  };

  const flowTarget = scopeLookId || urlLookId || looks[0]?.id || "";

  const move = async (id: string, dir: "up" | "down") => {
    const idx = shown.findIndex(o => o.id === id);
    const swap = dir === "up" ? idx - 1 : idx + 1;
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
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-black">Wardrobe</h1>
      <p className="mt-1 text-sm font-bold text-black/45">Upload clothes for the Try-On funnel.</p>

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

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Upload card */}
        <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4">
          <h2 className="text-sm font-black">Add outfit</h2>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="mt-3 flex items-center gap-3 rounded-xl border-2 border-dashed border-black/15 bg-white p-3 text-left">
            <span className="grid h-20 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-black/[0.04]">
              {preview
                ? // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                : <ImagePlus className="h-5 w-5 text-black/40" />}
            </span>
            <span className="text-[12px] font-bold text-black/60">{preview ? "Change" : "Pick image"}</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => void onPick(e.target.files?.[0])} />
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Outfit name"
            className="mt-3 h-9 w-full rounded-lg border border-black/15 px-2 text-[13px] outline-none focus:border-black" />
          {error && <p className="mt-2 text-[11px] font-bold text-red-600">{error}</p>}
          <button type="button" onClick={() => void add()} disabled={busy || !preview}
            className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-black text-[12px] font-black text-white active:scale-95 disabled:opacity-40">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Add
          </button>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          {shown.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-black/10">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-black/10 bg-black/[0.04]">
                  <tr>
                    <th className="px-4 py-3 font-bold text-black/60">Image</th>
                    <th className="px-4 py-3 font-bold text-black/60">Name</th>
                    <th className="px-4 py-3 font-bold text-black/60">Scope</th>
                    <th className="px-4 py-3 font-bold text-black/60 text-center">Order</th>
                    <th className="px-4 py-3 font-bold text-black/60 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((o, i) => (
                    <tr key={o.id} className="border-b border-black/10 hover:bg-black/[0.02]">
                      <td className="px-4 py-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={o.imageUrl} alt={o.name} className="h-12 w-9 rounded-lg object-cover" />
                      </td>
                      <td className="px-4 py-3">
                        {editingId === o.id ? (
                          <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)} onBlur={() => void saveEdit(o.id)} autoFocus
                            className="h-7 w-full rounded-md border border-black/20 px-2 text-[12px] outline-none focus:border-black" onKeyDown={e => { if (e.key === "Enter") void saveEdit(o.id); if (e.key === "Escape") setEditingId(null); }} />
                        ) : (
                          <span className="font-bold text-black">{o.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-black/60">{o.lookId ? lookName(o.lookId) : "Global"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-bold text-black">{i + 1}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {i > 0 && (
                            <button type="button" onClick={() => void move(o.id, "up")}
                              className="grid h-7 w-7 place-items-center rounded-md hover:bg-black/10 text-black/60 active:scale-90" title="Move up">
                              <ChevronUp className="h-4 w-4" />
                            </button>
                          )}
                          {i < shown.length - 1 && (
                            <button type="button" onClick={() => void move(o.id, "down")}
                              className="grid h-7 w-7 place-items-center rounded-md hover:bg-black/10 text-black/60 active:scale-90" title="Move down">
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          )}
                          <button type="button" onClick={() => startEdit(o.id, o.name)}
                            className="grid h-7 w-7 place-items-center rounded-md hover:bg-black/10 text-black/60 active:scale-90" title="Edit name">
                            <Upload className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => void remove(o.id)}
                            className="grid h-7 w-7 place-items-center rounded-md hover:bg-red-100 text-red-600 active:scale-90" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-[13px] font-bold text-black/35">
              {scopeLookId ? "No outfits for this look — add one →" : "No global outfits — add one →"}
            </p>
          )}

          <div className="sticky bottom-0 z-10 mt-6 flex gap-2 border-t border-black/10 bg-white/95 pt-4 backdrop-blur">
            <button type="button" onClick={() => void saveNow()} disabled={savingNow}
              className="flex flex-1 items-center justify-center gap-2 h-9 rounded-lg border border-black/15 text-[12px] font-bold active:scale-95 disabled:opacity-50">
              {savingNow ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <Check className="h-3 w-3 text-emerald-600" /> : null}
              {saved ? "Saved" : "Save"}
            </button>
            <button type="button" disabled={!flowTarget} onClick={() => { if (flowTarget) window.location.href = `/try/${flowTarget}`; }}
              className="flex flex-1 items-center justify-center gap-2 h-9 rounded-lg bg-black text-[12px] font-bold text-white active:scale-95 disabled:opacity-40">
              Preview <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
