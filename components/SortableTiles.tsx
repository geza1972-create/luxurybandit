"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

export type Tile = { path: string; url: string; pending?: boolean };

/**
 * KACHELRASTER MIT ZIEHEN UND LÖSCHEN — für JEDE Medienliste im Projekt.
 *
 * Owner-Dauerregel vom 29.07.2026: „in der galerie ein bild nicht löschen kann und die
 * reihenfolge nicht ändern kann" — genau das darf nirgends mehr vorkommen. Deshalb steht
 * das hier einmal als Baustein und wird überall eingehängt, statt es je Liste neu zu bauen
 * (vorher konnte man Videos sortieren, Fotos aber nicht — ein halbes System).
 *
 * WARUM POINTER-EVENTS: `draggable` aus HTML5 reagiert am Touch-Gerät nicht, und dieses
 * Werkzeug wird am Handy bedient.
 *
 * WARUM ERST NACH KURZEM HALTEN (220 ms): Das Raster steht in einer Seite, die senkrecht
 * scrollt. Griffe das Ziehen sofort, könnte man nicht mehr scrollen, ohne umzusortieren.
 * Bewegt sich der Finger vorher, war es eine Scroll-Geste und das Ziehen startet nicht.
 */

export default function SortableTiles({
  items,
  aspect,
  kind,
  busyPath,
  onReorder,
  onDelete,
  deleteLabel = "Löschen",
  children,
}: {
  items: Tile[];
  aspect: string;                                   // z. B. "aspect-[2/3]"
  kind: "image" | "video";
  busyPath?: string;
  onReorder: (paths: string[]) => void | Promise<void>;
  onDelete: (path: string) => void | Promise<void>;
  deleteLabel?: string;
  children?: React.ReactNode;                        // die „Hinzufügen"-Kachel
}) {
  const [order, setOrder] = useState<Tile[] | null>(null);   // nur WÄHREND des Ziehens
  const [dragging, setDragging] = useState<number | null>(null);
  const from = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const live = useRef<Tile[]>([]);

  const list = order ?? items;
  live.current = list;

  const cancelPress = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };

  const onDown = (e: React.PointerEvent<HTMLDivElement>, i: number) => {
    start.current = { x: e.clientX, y: e.clientY };
    const el = e.currentTarget, id = e.pointerId;
    cancelPress();
    timer.current = setTimeout(() => {
      from.current = i;
      setOrder([...items]);
      setDragging(i);
      try { el.setPointerCapture(id); } catch { /**/ }
      try { navigator.vibrate?.(8); } catch { /**/ }
    }, 220);
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (from.current === null) {
      const s = start.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) cancelPress();
      return;
    }
    e.preventDefault();
    const over = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)
      ?.closest("[data-tile]") as HTMLElement | null;
    if (!over) return;
    const to = Number(over.dataset.tile);
    if (!Number.isFinite(to) || to === from.current) return;
    const next = [...live.current];
    const [moved] = next.splice(from.current, 1);
    next.splice(to, 0, moved);
    setOrder(next);
    from.current = to;
    setDragging(to);
  };

  const onUp = () => {
    cancelPress();
    if (from.current === null) return;
    from.current = null;
    setDragging(null);
    const paths = live.current.map(t => t.path);
    setOrder(null);                       // ab jetzt gilt wieder die Liste von oben
    void onReorder(paths);
  };

  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {list.map((t, i) => (
        <div key={t.path}
          data-tile={i}
          onPointerDown={ev => onDown(ev, i)}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          // `touch-action: none` NUR während des Ziehens — sonst liesse sich die Seite an
          // dieser Stelle nicht mehr mit dem Finger scrollen.
          style={{ touchAction: dragging !== null ? "none" : "manipulation" }}
          className={`relative select-none overflow-hidden rounded-xl border transition ${
            dragging === i ? "scale-105 border-[#f6cf51] opacity-90 shadow-lg" : "border-black/10"
          } ${t.pending ? "opacity-70" : ""}`}>
          {kind === "video"
            // eslint-disable-next-line jsx-a11y/media-has-caption
            ? <video src={t.url} muted playsInline preload="metadata" className={`pointer-events-none ${aspect} w-full object-cover`} />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={t.url} alt="" className={`pointer-events-none ${aspect} w-full object-cover`} />}

          {/* Klein halten: Nummer + Löschknopf, sonst nichts. Farben fest als Style — der
              `lb-theme`-Kasten überschreibt `text-white`, sonst stand die Zahl schwarz auf
              schwarz (Owner: „ich sehe die zahlen nicht"). */}
          <span style={{ color: "#fff" }}
            className="absolute bottom-1 left-1 z-10 grid h-5 w-5 place-items-center rounded-full bg-black/55 text-[10px] font-black backdrop-blur-sm">
            {i + 1}
          </span>
          {t.pending
            ? <span className="absolute inset-0 z-10 grid place-items-center bg-black/25">
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#fff" }} />
              </span>
            : <button type="button" onClick={() => void onDelete(t.path)} disabled={busyPath === t.path}
                aria-label={deleteLabel} style={{ color: "#fff" }}
                className="absolute right-1 top-1 z-10 grid h-6 w-6 place-items-center rounded-full bg-black/55 backdrop-blur-sm active:scale-90 transition disabled:opacity-40">
                {busyPath === t.path ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </button>}
        </div>
      ))}
      {children}
    </div>
  );
}
