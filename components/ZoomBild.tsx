"use client";

import { useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Scheibe } from "@/components/CI";

/**
 * EIN BILD MIT PLUS UND MINUS IN DER ECKE (Owner 28.09.2026: „es sollte ein Plus und Minus in der
 * Ecke des Bildes sein" — nicht eine Lupe, nicht ein Vollbild).
 *
 * Plus vergrössert im Bild selbst, zur Mitte hin; vergrössert lässt es sich mit Maus oder Finger
 * verschieben. Ab der ersten Stufe kommt die hochaufgelöste Fassung (`gross`), damit der Druck
 * scharf bleibt. Minus geht zurück, auf Stufe 1 steht alles wie vorher.
 */
const STUFEN = [1, 1.8, 2.8, 4];

export default function ZoomBild({ src, gross, alt, className = "", fokusY = 0.5 }: {
  src: string;
  /** Wohin der erste Schritt zoomt, als Anteil der Höhe (0 oben, 1 unten) — beim Shirt der Druck. */
  fokusY?: number;
  gross?: string;
  alt: string;
  className?: string;
}) {
  const [stufe, setStufe] = useState(0);
  const [ver, setVer] = useState({ x: 0, y: 0 });
  const zug = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const z = STUFEN[stufe];

  /* Nie so weit schieben, dass neben dem Bild Leere erscheint. */
  const begrenzen = (x: number, y: number, zoom: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return { x, y };
    const mx = (r.width * (zoom - 1)) / 2;
    const my = (r.height * (zoom - 1)) / 2;
    return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  };
  const setzeStufe = (n: number) => {
    const neu = Math.max(0, Math.min(STUFEN.length - 1, n));
    setStufe(neu);
    const h = box.current?.getBoundingClientRect().height ?? 0;
    setVer(v => {
      if (neu === 0) return { x: 0, y: 0 };
      /* Vom ungezoomten Bild aus: den Fokus in die Mitte holen. Danach bleibt, wo er verschoben hat. */
      const start = stufe === 0 ? { x: 0, y: (0.5 - fokusY) * h * STUFEN[neu] } : { x: v.x * STUFEN[neu] / z, y: v.y * STUFEN[neu] / z };
      return begrenzen(start.x, start.y, STUFEN[neu]);
    });
  };

  return (
    <div ref={box} className={`relative overflow-hidden bg-[#f3f3f3] ${className}`}
      style={{ touchAction: z > 1 ? "none" : "pan-y", cursor: z > 1 ? "grab" : "default" }}
      onPointerDown={e => {
        if (z <= 1) return;
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        zug.current = { x: e.clientX, y: e.clientY, vx: ver.x, vy: ver.y };
      }}
      onPointerMove={e => {
        const s = zug.current;
        if (!s) return;
        setVer(begrenzen(s.vx + e.clientX - s.x, s.vy + e.clientY - s.y, z));
      }}
      onPointerUp={() => { zug.current = null; }}
      onPointerCancel={() => { zug.current = null; }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={z > 1 && gross ? gross : src} alt={alt} draggable={false}
        className="block aspect-square w-full select-none object-cover transition-transform duration-200"
        style={{ transform: `translate(${ver.x}px, ${ver.y}px) scale(${z})` }} />
      <div className="absolute bottom-3 right-3 flex flex-col gap-2">
        <Scheibe label="Vergrössern" onClick={e => { e.stopPropagation(); setzeStufe(stufe + 1); }}
          durchsichtig={stufe === STUFEN.length - 1}>
          <Plus className="h-5 w-5" aria-hidden />
        </Scheibe>
        <Scheibe label="Verkleinern" onClick={e => { e.stopPropagation(); setzeStufe(stufe - 1); }}
          durchsichtig={stufe === 0}>
          <Minus className="h-5 w-5" aria-hidden />
        </Scheibe>
      </div>
    </div>
  );
}
