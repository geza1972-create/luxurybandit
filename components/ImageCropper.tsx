"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X, ZoomIn } from "lucide-react";

/**
 * ZUSCHNEIDEN VOR DEM SPEICHERN — Pflicht bei jedem Bild-Upload.
 *
 * Owner-Regel vom 29.07.2026: „und auch crop soll immer sein" — zusammen mit
 * „ohne save button" mag er es nicht. Beides steckt hier drin: Das Bild wird erst
 * GEZEIGT, zurechtgeschoben und dann auf Knopfdruck gespeichert. Vorher passiert nichts.
 *
 * WARUM ES NÖTIG IST: Handyfotos sind 3:4 oder 9:16, die Kacheln sind 2:3. Ohne Zuschnitt
 * entscheidet `object-cover` blind, was wegfällt — meistens der Kopf.
 *
 * WARUM SCHIEBEN + SCHIEBEREGLER (statt Zwei-Finger-Zoom): Pointer-Events behandeln Maus
 * und Finger gleich, der Regler funktioniert auf beidem sicher. Ein Zwei-Finger-Zoom, der
 * am Handy manchmal die ganze Seite mitzoomt, wäre schlechter als gar keiner.
 *
 * Ergebnis ist eine JPEG-Datei in Zielauflösung — nicht das Original mit Zusatzangaben.
 * Damit ist der Zuschnitt auch dort gültig, wo das Bild später ohne unsere Oberfläche
 * auftaucht (Trichter, Bildmodelle, Vorschau).
 */

export default function ImageCropper({
  file,
  aspect = 2 / 3,
  title = "Ausschnitt wählen",
  onCancel,
  onSave,
}: {
  file: File;
  aspect?: number;                       // Breite / Höhe der Zielkachel
  title?: string;
  onCancel: () => void;
  onSave: (cropped: File, previewUrl: string) => void | Promise<void>;
}) {
  const [src, setSrc] = useState("");
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameW, setFrameW] = useState(0);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const measure = () => setFrameW(frameRef.current?.clientWidth ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [src]);

  const frameH = frameW / aspect;
  // „Cover"-Grundgröße: das Bild füllt den Rahmen immer aus, egal wie es gedreht ist.
  const base = nat.w && frameW ? Math.max(frameW / nat.w, frameH / nat.h) : 1;
  const dispW = nat.w * base * zoom;
  const dispH = nat.h * base * zoom;

  // Nie eine Lücke zeigen: der Versatz bleibt im erlaubten Bereich.
  const clamp = (o: { x: number; y: number }) => ({
    x: Math.min(0, Math.max(frameW - dispW, o.x)),
    y: Math.min(0, Math.max(frameH - dispH, o.y)),
  });

  useEffect(() => { setOff(o => clamp(o)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [zoom, frameW, nat.w, nat.h]);

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /**/ }
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    e.preventDefault();
    setOff(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }));
  };
  const onUp = () => { drag.current = null; };

  const save = async () => {
    if (!nat.w || !frameW) return;
    setSaving(true);
    try {
      // Vom Rahmen zurück ins Originalbild rechnen: was im Rahmen sichtbar ist, wird
      // ausgeschnitten — in voller Auflösung, nicht in Bildschirmgröße.
      const scale = base * zoom;
      const sx = Math.max(0, -off.x / scale);
      const sy = Math.max(0, -off.y / scale);
      const sw = Math.min(nat.w - sx, frameW / scale);
      const sh = Math.min(nat.h - sy, frameH / scale);

      const outW = Math.min(1200, Math.round(sw));
      const outH = Math.round(outW / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outW; canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setSaving(false); return; }
      const img = new Image();
      img.src = src;
      await new Promise(res => { if (img.complete) res(null); else img.onload = () => res(null); });
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.92));
      if (!blob) { setSaving(false); return; }
      const name = (file.name.replace(/\.[^.]+$/, "") || "foto") + ".jpg";
      await onSave(new File([blob], name, { type: "image/jpeg" }), canvas.toDataURL("image/jpeg", 0.7));
    } finally { setSaving(false); }
  };

  return (
    // Farben fest als Style: der `lb-theme`-Kasten überschreibt `text-white`/`bg-black`,
    // sonst steht die Schrift schwarz auf schwarz (im Projekt mehrfach passiert).
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)" }}>
      <div className="w-full max-w-[380px] rounded-2xl p-4" style={{ background: "#fff" }}>
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-black" style={{ color: "#111" }}>{title}</p>
          <button type="button" onClick={onCancel} aria-label="Abbrechen"
            className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "#eee", color: "#111" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={frameRef}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          style={{ height: frameH || undefined, touchAction: "none", background: "#111" }}
          className="relative mt-3 w-full cursor-grab select-none overflow-hidden rounded-xl active:cursor-grabbing">
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" draggable={false}
              onLoad={e => {
                const el = e.currentTarget;
                setNat({ w: el.naturalWidth, h: el.naturalHeight });
                setOff({ x: 0, y: 0 });
              }}
              style={{
                position: "absolute", left: 0, top: 0,
                width: dispW || undefined, height: dispH || undefined,
                transform: `translate(${off.x}px, ${off.y}px)`,
                maxWidth: "none",
              }} />
          )}
        </div>

        <p className="mt-2 text-[11px] font-bold" style={{ color: "rgba(0,0,0,0.5)" }}>
          Bild verschieben — mit dem Regler näher heran.
        </p>
        <div className="mt-1 flex items-center gap-2">
          <ZoomIn className="h-4 w-4" style={{ color: "rgba(0,0,0,0.4)" }} />
          <input type="range" min={1} max={3} step={0.01} value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-full" style={{ accentColor: "#111" }} />
        </div>

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onCancel}
            className="h-11 flex-1 rounded-full text-[14px] font-black"
            style={{ background: "#eee", color: "#111" }}>
            Abbrechen
          </button>
          <button type="button" onClick={() => void save()} disabled={saving || !nat.w}
            className="flex h-11 flex-[1.4] items-center justify-center gap-2 rounded-full text-[14px] font-black"
            style={{ background: saving || !nat.w ? "#c9c9c9" : "#111", color: "#fff" }}>
            <Check className="h-4 w-4" />
            {saving ? "Speichert …" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
