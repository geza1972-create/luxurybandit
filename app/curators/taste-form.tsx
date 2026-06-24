"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Plus, LayoutGrid, X } from "lucide-react";

export const LBL = "mb-1 block text-[11px] font-black uppercase tracking-wider text-black/45";

// Downscale a picked image to keep the payload small.
export function fileToDataUrl(file: File, max = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(String(reader.result)); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Browse the full tag database and toggle selections.
export function TagPicker({ title, all, selected, onToggle, onClose }: {
  title: string; all: string[]; selected: string[]; onToggle: (t: string) => void; onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const sel = new Set(selected.map(s => s.toLowerCase()));
  const list = q.trim() ? all.filter(t => t.toLowerCase().includes(q.trim().toLowerCase())) : all;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center gap-3 border-b border-black/8 px-4 py-3">
        <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 text-black"><X className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-black">{title}</p>
          <p className="text-[11px] font-bold text-black/40">{all.length} in database · {selected.length} selected</p>
        </div>
      </div>
      <div className="border-b border-black/8 px-4 py-2.5">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter…" autoFocus
          className="h-10 w-full rounded-xl border border-black/10 bg-black/[0.03] px-3.5 text-sm font-bold text-black outline-none focus:border-black placeholder:text-black/30" />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-wrap gap-2">
          {list.map(t => {
            const on = sel.has(t.toLowerCase());
            return (
              <button key={t} type="button" onClick={() => onToggle(t)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black transition ${on ? "bg-black text-white" : "border border-black/12 bg-white text-black/70 hover:border-black"}`}>
                {on && <Check className="h-3 w-3" />}{t}
              </button>
            );
          })}
          {list.length === 0 && <p className="py-8 text-center text-sm font-bold text-black/40">Nothing matches “{q}”.</p>}
        </div>
      </div>
      <div className="border-t border-black/8 px-4 py-3">
        <button type="button" onClick={onClose} className="h-12 w-full rounded-2xl bg-black text-sm font-black text-white active:scale-95 transition-transform">Done</button>
      </div>
    </div>
  );
}

// Chip + autocomplete field backed by a growing tag database, with "Browse all".
export function TagField({ label, list, value, onChange, placeholder }: {
  label: string; list: string[]; value: string[]; onChange: (v: string[]) => void; placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [browse, setBrowse] = useState(false);
  const matches = query.trim()
    ? list.filter(b => b.toLowerCase().includes(query.trim().toLowerCase()) && !value.some(c => c.toLowerCase() === b.toLowerCase())).slice(0, 6)
    : [];
  const add = (name: string) => {
    const n = name.trim();
    if (!n || value.some(c => c.toLowerCase() === n.toLowerCase())) { setQuery(""); return; }
    onChange([...value, n]); setQuery("");
  };
  const remove = (name: string) => onChange(value.filter(b => b !== name));
  const toggle = (name: string) => (value.some(c => c.toLowerCase() === name.toLowerCase()) ? remove(name) : add(name));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className={LBL.replace("mb-1 ", "")}>{label}</span>
        <button type="button" onClick={() => setBrowse(true)} className="inline-flex items-center gap-1 text-[11px] font-black text-cobalt active:opacity-70">
          <LayoutGrid className="h-3.5 w-3.5" /> Browse all ({list.length})
        </button>
      </div>
      <div className="relative">
        <div className="flex min-h-12 w-full flex-wrap items-center gap-1.5 rounded-xl border border-black/12 bg-black/[0.02] px-2.5 py-2 focus-within:border-black">
          {value.map(b => (
            <span key={b} className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-1 text-xs font-black text-white">
              {b}<button type="button" onClick={() => remove(b)} className="text-white/60 hover:text-white">×</button>
            </span>
          ))}
          <input value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); add(matches[0] ?? query); }
              else if (e.key === "Backspace" && !query && value.length) remove(value[value.length - 1]);
            }}
            placeholder={value.length ? "" : placeholder}
            className="min-w-[8rem] flex-1 bg-transparent text-sm font-bold text-black outline-none placeholder:text-black/30" />
        </div>
        {open && (matches.length > 0 || query.trim()) && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
            {matches.map(b => (
              <button key={b} type="button" onMouseDown={e => e.preventDefault()} onClick={() => add(b)}
                className="flex w-full items-center px-3.5 py-2.5 text-left text-sm font-bold text-black hover:bg-black/[0.04]">{b}</button>
            ))}
            {query.trim() && !list.some(b => b.toLowerCase() === query.trim().toLowerCase()) && (
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => add(query)}
                className="flex w-full items-center gap-1.5 px-3.5 py-2.5 text-left text-sm font-bold text-cobalt hover:bg-cobalt/[0.05]">
                <Plus className="h-3.5 w-3.5" /> Add &ldquo;{query.trim()}&rdquo;
              </button>
            )}
          </div>
        )}
      </div>
      {browse && <TagPicker title={label} all={list} selected={value} onToggle={toggle} onClose={() => setBrowse(false)} />}
    </div>
  );
}

// Fixed-option pill selector (single or multi).
export function PillRow({ label, options, value, onChange, multi }: {
  label: string; options: string[]; value: string | string[]; onChange: (v: string | string[]) => void; multi?: boolean;
}) {
  const isOn = (o: string) => (multi ? (value as string[]).includes(o) : value === o);
  const toggle = (o: string) => {
    if (multi) { const arr = value as string[]; onChange(arr.includes(o) ? arr.filter(x => x !== o) : [...arr, o]); }
    else onChange(value === o ? "" : o);
  };
  return (
    <div>
      <span className={LBL}>{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o} type="button" onClick={() => toggle(o)}
            className={`rounded-full px-3.5 py-2 text-xs font-black transition ${isOn(o) ? "bg-black text-white" : "border border-black/12 bg-white text-black/60 hover:border-black"}`}>{o}</button>
        ))}
      </div>
    </div>
  );
}

// Drag + zoom an image into a circular avatar, then export a square crop.
export function PhotoCropper({ src, onCancel, onDone }: { src: string; onCancel: () => void; onDone: (dataUrl: string) => void }) {
  const V = 280, OUT = 512;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const base = nat.w && nat.h ? V / Math.min(nat.w, nat.h) : 1;
  const dispW = nat.w * base * zoom;
  const dispH = nat.h * base * zoom;
  const clamp = (o: { x: number; y: number }) => ({
    x: Math.max(-(dispW - V) / 2, Math.min((dispW - V) / 2, o.x)),
    y: Math.max(-(dispH - V) / 2, Math.min((dispH - V) / 2, o.y)),
  });
  useEffect(() => { setOff(o => clamp(o)); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, nat.w, nat.h]);

  const onDown = (e: ReactPointerEvent) => { (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y }; };
  const onMove = (e: ReactPointerEvent) => { if (!drag.current) return; setOff(clamp({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) })); };
  const onUp = () => { drag.current = null; };

  const done = () => {
    const img = imgRef.current; if (!img) return;
    const s = base * zoom;
    const imgLeft = V / 2 + off.x - dispW / 2;
    const imgTop = V / 2 + off.y - dispH / 2;
    const sx = (0 - imgLeft) / s, sy = (0 - imgTop) / s, sw = V / s;
    const c = document.createElement("canvas"); c.width = OUT; c.height = OUT;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sw, 0, 0, OUT, OUT);
    onDone(c.toDataURL("image/jpeg", 0.9));
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/80 px-6" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <p className="mb-4 text-sm font-black text-white">Position your photo</p>
      <div className="relative overflow-hidden rounded-2xl bg-black touch-none" style={{ width: V, height: V }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={src} alt="" draggable={false}
          onLoad={e => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          style={{ position: "absolute", width: dispW, height: dispH, left: V / 2 + off.x - dispW / 2, top: V / 2 + off.y - dispH / 2, maxWidth: "none", userSelect: "none" }} />
        <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)", borderRadius: "50%" }} />
      </div>
      <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="mt-5 w-[280px] accent-white" />
      <div className="mt-5 flex w-[280px] gap-2">
        <button type="button" onClick={onCancel} className="h-12 flex-1 rounded-2xl border border-white/25 text-sm font-black text-white active:scale-95 transition-transform">Cancel</button>
        <button type="button" onClick={done} className="h-12 flex-1 rounded-2xl bg-white text-sm font-black text-black active:scale-95 transition-transform">Use photo</button>
      </div>
    </div>
  );
}

// Validate + read a picked photo file. Returns { src } for the cropper, or { error }.
export async function readPhotoFile(file: File): Promise<{ src?: string; error?: string }> {
  if (!file.type.startsWith("image/")) return { error: "That's not an image — please choose a photo (JPG, PNG or WebP)." };
  const ext = (file.type.split("/")[1] || "").toLowerCase();
  if (!/^(jpe?g|png|webp|heic|heif)$/.test(ext)) return { error: `Unsupported format (.${ext}) — please use JPG, PNG or WebP.` };
  if (file.size > 15 * 1024 * 1024) return { error: "Image is too large (max 15 MB). Try a smaller one." };
  try { return { src: await fileToDataUrl(file, 1400) }; }
  catch { return { error: "Couldn't read that image — try a different one." }; }
}
