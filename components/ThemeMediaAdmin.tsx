"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ImageUp, Film, Trash2, Image as ImageIcon, CornerDownRight, GripVertical } from "lucide-react";

/**
 * Admin-Werkzeug für die Medien EINES Themas: Teaser (Cover im /themes-Katalog) und die
 * Beispiel-Videos der Landingpage. Bedienung 1:1 wie bei Kiss — Tippen zum Ersetzen,
 * Papierkorb zum Löschen, letztes Feld zum Hinzufügen.
 *
 * Der Upload geht über eine signierte Adresse DIREKT zu Supabase, nicht durch die eigene
 * API: Vercel bricht Anfragen über ~4,5 MB ab, und daran scheitert jedes echte Video.
 *
 * Blendet sich ohne Admin-PIN selbst aus.
 */

type Example = { path: string; url: string };

export default function ThemeMediaAdmin({
  theme, title, teaserHint,
}: {
  theme: string;
  title: string;
  teaserHint?: string;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [teaserUrl, setTeaserUrl] = useState("");
  const [teaserPath, setTeaserPath] = useState("");
  const [refs, setRefs] = useState<Example[]>([]);
  const [examples, setExamples] = useState<Example[]>([]);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [busy, setBusy] = useState("");    // "teaser" | "video" | Pfad (löschen)
  const [msg, setMsg] = useState("");
  const teaserRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const refFileRef = useRef<HTMLInputElement>(null);
  // ALLE Hooks stehen VOR dem `if (!isAdmin) return null` weiter unten. Standen sie danach,
  // wechselt die Zahl der Hooks zwischen den Renders und React bricht die Komponente ab
  // („Rendered more hooks than during the previous render") — genau so passiert am 29.07.2026.
  const dragFrom = useRef<number | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startXY = useRef<{ x: number; y: number } | null>(null);
  const examplesRef = useRef<Example[]>([]);
  examplesRef.current = examples;

  const api = `/api/theme-media?theme=${encodeURIComponent(theme)}`;

  const load = (p: string) => fetch(api, { headers: { "x-try-look-admin-pin": p }, cache: "no-store" })
    .then(r => r.json())
    .then(d => {
      setTeaserUrl(d.teaserUrl ?? "");
      setTeaserPath(d.teaserPath ?? "");
      setRefs(Array.isArray(d.previewRefs) ? d.previewRefs : []);
      setExamples(Array.isArray(d.examples) ? d.examples : []);
      setUsingDefaults(!!d.usingDefaults);
    })
    .catch(() => {});

  useEffect(() => {
    let p = "";
    try {
      p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p); setIsAdmin(!!p && !localStorage.getItem("lb_preview_model"));
    } catch { /**/ }
    if (p) void load(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // EINFÜGEN AUS DER ZWISCHENABLAGE (Owner 29.07.2026: „mach mir das so dass ich auch
  // screenshots hochladen kann … aus dem Zwischenspeicher").
  //
  // Ein Bildschirmfoto liegt auf dem Mac in der Zwischenablage, nicht als Datei — über einen
  // Dateidialog kommt man nur dran, wenn man es vorher irgendwohin speichert. Deshalb hört
  // das Panel auf Cmd+V und nimmt das Bild direkt an.
  //
  // Der Zuhörer hängt am DOKUMENT, nicht am Kasten: sonst müsste man erst hineinklicken,
  // damit Einfügen ankommt — und genau das vergisst man.
  //
  // Ziel ist IMMER das Referenzfoto. Cover und Galerie behalten ihren Dateidialog, sonst
  // wüsste beim Einfügen niemand, wo das Bild landet.
  const pasteRef = useRef<((f: File) => void) | null>(null);
  useEffect(() => {
    if (!isAdmin) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const img = items.find(i => i.kind === "file" && i.type.startsWith("image/"));
      if (!img) return;                       // Text eingefügt → nichts tun
      const file = img.getAsFile();
      if (!file) return;
      e.preventDefault();
      pasteRef.current?.(file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [isAdmin]);

  if (!isAdmin) return null;

  const authH = () => ({ "Content-Type": "application/json", "x-try-look-admin-pin": pin });

  const upload = async (file: File, kind: "image" | "video") => {
    setMsg("");
    const ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase();
    const sign = await fetch(api, { method: "POST", headers: authH(), body: JSON.stringify({ sign: true, kind, ext }) }).then(r => r.json());
    if (!sign?.uploadUrl || !sign?.path) { setMsg(sign?.error ?? "Upload konnte nicht starten."); return null; }
    const put = await fetch(sign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || (kind === "video" ? "video/mp4" : "image/jpeg"), "x-upsert": "true" },
      body: file,
    });
    if (!put.ok) { setMsg(`Upload fehlgeschlagen (${put.status}).`); return null; }
    return sign.path as string;
  };

  // Teaser darf Bild ODER Video sein — die Themes-Karte spielt Videos ab.
  const onTeaser = async (f?: File | null) => {
    if (!f) return;
    setBusy("teaser");
    try {
      const isVideo = (f.type || "").startsWith("video/");
      const path = await upload(f, isVideo ? "video" : "image");
      if (path) {
        const r = await fetch(api, { method: "POST", headers: authH(), body: JSON.stringify({ teaserPath: path }) });
        if (r.ok) { setMsg(`✅ Teaser-${isVideo ? "Video" : "Bild"} gespeichert.`); await load(pin); }
        else setMsg(`❌ Speichern fehlgeschlagen (${r.status}).`);
      }
    } finally { setBusy(""); }
  };

  const onVideo = async (f?: File | null) => {
    if (!f) return;
    setBusy("video");
    try {
      const path = await upload(f, "video");
      if (path) {
        const r = await fetch(api, { method: "POST", headers: authH(), body: JSON.stringify({ addExample: path }) });
        if (r.ok) { setMsg("✅ Beispiel-Video hinzugefügt."); await load(pin); }
        else setMsg(`❌ Speichern fehlgeschlagen (${r.status}).`);
      }
    } finally { setBusy(""); }
  };

  // REIHENFOLGE PER ZIEHEN (Owner 29.07.2026: „normalerweise macht man das mit drag and
  // drop"). Erst hatte ich Pfeile gebaut — zu Recht als unvollständig zurückgewiesen.
  //
  // WARUM NICHT HTML5-DRAG: `draggable` funktioniert auf Touch-Geräten nicht, und dieses
  // Werkzeug wird am Handy bedient. Also Pointer-Events, die Maus und Finger gleich behandeln.
  //
  // WARUM ERST NACH KURZEM HALTEN (220 ms): Ein Kachelraster steht mitten in einer Seite,
  // die senkrecht scrollt. Würde das Ziehen sofort greifen, könnte man die Seite nicht mehr
  // scrollen, ohne versehentlich umzusortieren. Bewegt sich der Finger vor Ablauf der Zeit,
  // war es eine Scroll-Geste und das Ziehen startet gar nicht erst.
  const cancelPress = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };

  const saveOrder = async (paths: string[]) => {
    setBusy("order"); setMsg("");
    try {
      const r = await fetch(api, { method: "POST", headers: authH(), body: JSON.stringify({ setExamples: paths }) });
      if (!r.ok) { setMsg(`❌ Reihenfolge nicht gespeichert (${r.status}).`); await load(pin); }
      else setMsg("✅ Reihenfolge gespeichert.");
    } catch { setMsg("❌ Netzwerkfehler — Reihenfolge nicht gespeichert."); await load(pin); }
    finally { setBusy(""); }
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>, i: number) => {
    startXY.current = { x: e.clientX, y: e.clientY };
    const el = e.currentTarget;
    const id = e.pointerId;
    cancelPress();
    pressTimer.current = setTimeout(() => {
      dragFrom.current = i;
      setDragging(i);
      try { el.setPointerCapture(id); } catch { /**/ }
      try { navigator.vibrate?.(8); } catch { /**/ }
    }, 220);
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragFrom.current === null) {
      // Noch in der Wartezeit: eine echte Bewegung heißt „scrollen", nicht „ziehen".
      const s = startXY.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) cancelPress();
      return;
    }
    e.preventDefault();
    const over = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)
      ?.closest("[data-tile]") as HTMLElement | null;
    if (!over) return;
    const to = Number(over.dataset.tile);
    if (!Number.isFinite(to) || to === dragFrom.current) return;
    const next = [...examplesRef.current];
    const [moved] = next.splice(dragFrom.current, 1);
    next.splice(to, 0, moved);
    setExamples(next);
    dragFrom.current = to;
    setDragging(to);
  };

  const onUp = () => {
    cancelPress();
    if (dragFrom.current === null) return;
    dragFrom.current = null;
    setDragging(null);
    void saveOrder(examplesRef.current.map(e => e.path));
  };

  // „Auch als Beispiel-Video": rettet einen Upload, der im Teaser-Feld gelandet ist, ohne
  // dass er die Datei ein zweites Mal hochladen muss (genau das ist am 29.07.2026 passiert).
  const teaserToExamples = async () => {
    if (!teaserPath) return;
    setBusy("copy"); setMsg("");
    try {
      const r = await fetch(api, { method: "POST", headers: authH(), body: JSON.stringify({ addExample: teaserPath }) });
      if (r.ok) { setMsg("✅ Auch als Beispiel-Video übernommen."); await load(pin); }
      else setMsg(`❌ Übernehmen fehlgeschlagen (${r.status}).`);
    } finally { setBusy(""); }
  };

  // Das angezogene Referenzfoto der Frau. Eigener Platz, damit das Cover unangetastet bleibt.
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const onRefFile = async (f?: File | null) => {
    if (!f) return;
    setBusy("ref");
    try {
      const path = await upload(f, "image");
      if (path) {
        const r = await fetch(api, { method: "POST", headers: authH(), body: JSON.stringify({ addPreviewRef: path }) });
        if (r.ok) { setMsg("✅ Referenzfoto hinzugefügt — das nächste kannst du direkt einfügen."); await load(pin); }
        else setMsg(`❌ Speichern fehlgeschlagen (${r.status}).`);
      }
    } finally { setBusy(""); }
  };
  // Der Einfüge-Zuhörer oben ruft immer die AKTUELLE Fassung auf.
  pasteRef.current = (f: File) => { void onRefFile(f); };

  const removeRef = async (path: string) => {
    setBusy(path); setMsg("");
    try {
      const r = await fetch(api, { method: "POST", headers: authH(), body: JSON.stringify({ removePreviewRef: path }) });
      if (!r.ok) { setMsg(`❌ Löschen fehlgeschlagen (${r.status}).`); return; }
      setRefs(x => x.filter(y => y.path !== path));
      await load(pin);
    } finally { setBusy(""); }
  };

  // Cover leeren. Die Route deutet einen leeren `teaserPath` ausdrücklich als „entfernen".
  const clearTeaser = async () => {
    setBusy("clear"); setMsg("");
    try {
      const r = await fetch(api, { method: "POST", headers: authH(), body: JSON.stringify({ teaserPath: "" }) });
      if (r.ok) { setMsg("🗑 Cover geleert."); await load(pin); }
      else setMsg(`❌ Leeren fehlgeschlagen (${r.status}).`);
    } finally { setBusy(""); }
  };

  // Fehler NIE verschlucken — sonst wirkt der Klick wirkungslos („kann nicht löschen").
  const removeExample = async (path: string) => {
    setBusy(path); setMsg("");
    try {
      const r = await fetch(api, { method: "POST", headers: authH(), body: JSON.stringify({ removeExample: path }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(`❌ Löschen fehlgeschlagen (${r.status}): ${d?.error ?? "unbekannter Fehler"}`); return; }
      setExamples(e => e.filter(x => x.path !== path));
      await load(pin);            // Serverstand nachziehen
      setMsg("🗑 Beispiel-Video gelöscht.");
    } catch (err) {
      setMsg(`❌ Netzwerkfehler: ${err instanceof Error ? err.message : "unbekannt"}`);
    } finally { setBusy(""); }
  };

  return (
    <div className="rounded-2xl border border-white/15 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/50">Nur für dich sichtbar</p>
      <h2 className="mt-1 flex items-center gap-2 text-[18px] font-black text-black"><ImageIcon className="h-4 w-4 text-black/50" /> {title}</h2>
      <p className="mt-0.5 text-[12px] font-semibold text-black/60">Teaser (Cover im Themes-Katalog) + Beispiel-Videos der Landingpage.</p>

      {/* ABGESETZT, damit die zwei Bereiche nicht mehr verwechselt werden: hier landete am
          29.07.2026 ein Video, das in die Galerie sollte. */}
      <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-black/55">
        1 · Cover — <span className="text-black/40">EIN Bild oder Video, erscheint im Themes-Katalog</span>
      </p>
      <div className="mt-2 flex items-center gap-3 rounded-xl bg-black/[0.03] p-2">
        <button type="button" onClick={() => teaserRef.current?.click()} disabled={busy === "teaser"}
          className="relative grid h-28 w-[84px] shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-black/15 bg-black/[0.03] active:scale-[0.98] transition">
          {teaserUrl
            ? (/\.(mp4|webm|mov)(\?|$)/i.test(teaserUrl)
              // eslint-disable-next-line jsx-a11y/media-has-caption
              ? <video src={teaserUrl} muted loop playsInline autoPlay preload="metadata" className="h-full w-full object-cover" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={teaserUrl} alt="" className="h-full w-full object-cover" />)
            : (busy === "teaser" ? <Loader2 className="h-5 w-5 animate-spin text-black/40" /> : <ImageUp className="h-6 w-6 text-black/40" />)}
        </button>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-black/70">
            {teaserUrl ? "Tippen zum Ersetzen." : (teaserHint ?? "Bild oder Video hochladen — wird das Cover im Themes-Katalog.")}
          </p>
          {/* Rettet einen Upload, der hier statt in der Galerie gelandet ist — und lässt ihn
              danach auch wieder aus dem Cover entfernen. Beide Knöpfe, weil dasselbe Video
              als Cover UND in der Galerie stehen darf, aber nicht muss. */}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {teaserPath && !examples.some(e => e.path === teaserPath) && (
              <button type="button" onClick={() => void teaserToExamples()} disabled={busy === "copy"}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-2.5 py-1 text-[11px] font-black text-black/70 active:scale-95 transition disabled:opacity-60">
                {busy === "copy" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CornerDownRight className="h-3 w-3" />}
                Auch unten in die Galerie
              </button>
            )}
            {teaserPath && (
              <button type="button" onClick={() => void clearTeaser()} disabled={busy === "clear"}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-2.5 py-1 text-[11px] font-black text-black/70 active:scale-95 transition disabled:opacity-60">
                {busy === "clear" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Cover leeren
              </button>
            )}
          </div>
        </div>
      </div>
      <input ref={teaserRef} type="file" accept="image/*,video/*" className="hidden"
        onChange={e => { void onTeaser(e.target.files?.[0]); e.target.value = ""; }} />

      <p className="mt-5 text-[11px] font-black uppercase tracking-wide text-black/55">
        2 · Galerie — <span className="text-black/40">die Videos oben auf der Landingpage. Kachel halten und ziehen zum Umsortieren.</span>
      </p>
      {usingDefaults && (
        <p className="mt-1 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold leading-snug text-amber-700">
          Das sind noch die Vorgaben. Sobald du eines hinzufügst oder löschst, gilt nur noch deine Auswahl.
        </p>
      )}
      <div className="mt-2 grid grid-cols-3 gap-2">
        {examples.map((e, i) => (
          <div key={e.path}
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
            }`}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={e.url} muted playsInline preload="metadata" className="pointer-events-none aspect-[3/4] w-full object-cover" />
            {/* RUHIG HALTEN (Owner 29.07.2026: „das sieht furchtbar aus"). Vorher lagen drei
                Aufkleber auf jeder Kachel — Nummer, ein fetter roter Kreis und eine Leiste
                „halten & ziehen". Auf 100 px Breite erschlägt das das Video, das man
                eigentlich beurteilen will. Jetzt: kleine Nummer, dezenter Löschknopf, sonst
                nichts. Der Zieh-Hinweis steht einmal über dem Raster, nicht zwölfmal darin.
                Farben fest als Style — der `lb-theme`-Kasten überschreibt `text-white` sonst
                mit seinem dunklen Textton, und die Zahl stand schwarz auf schwarz. */}
            <span style={{ color: "#fff" }}
              className="absolute bottom-1 left-1 z-10 grid h-5 w-5 place-items-center rounded-full bg-black/55 text-[10px] font-black backdrop-blur-sm">{i + 1}</span>
            <button type="button" onClick={() => void removeExample(e.path)} disabled={busy === e.path}
              aria-label="Beispiel-Video löschen" style={{ color: "#fff" }}
              className="absolute right-1 top-1 z-10 grid h-6 w-6 place-items-center rounded-full bg-black/55 backdrop-blur-sm active:scale-90 transition disabled:opacity-40">
              {busy === e.path ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </button>
          </div>
        ))}
        <button type="button" onClick={() => videoRef.current?.click()} disabled={busy === "video"}
          className="grid aspect-[3/4] place-items-center rounded-xl border-2 border-dashed border-black/15 bg-black/[0.03] active:scale-[0.98] transition">
          {busy === "video" ? <Loader2 className="h-5 w-5 animate-spin text-black/40" /> : <Film className="h-6 w-6 text-black/40" />}
        </button>
      </div>
      <input ref={videoRef} type="file" accept="video/*" className="hidden"
        onChange={e => { void onVideo(e.target.files?.[0]); e.target.value = ""; }} />

      {/* DRITTER PLATZ: das ANGEZOGENE Referenzfoto von ihr. Eigener Slot, damit das Cover
          unangetastet bleibt (Owner: „stop, das ist das cover"). Gebraucht für die
          Gratis-Vorschau — ihr Katalogfoto ist ein Lingerie-Bild und wird von der
          Bildmoderation am Eingang abgewiesen. */}
      <p className="mt-5 text-[11px] font-black uppercase tracking-wide text-black/55">
        3 · Referenzfoto von ihr — <span className="text-black/40">angezogen, ganze Figur. Für die Gratis-Vorschau. Bildschirmfoto einfach mit ⌘V einfügen.</span>
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {refs.map(r => (
          <div key={r.path} className="relative overflow-hidden rounded-xl border border-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.url} alt="" className="aspect-[2/3] w-full object-cover" />
            <button type="button" onClick={() => void removeRef(r.path)} disabled={busy === r.path}
              aria-label="Referenzfoto löschen" style={{ color: "#fff" }}
              className="absolute right-1 top-1 z-10 grid h-6 w-6 place-items-center rounded-full bg-black/55 backdrop-blur-sm active:scale-90 transition disabled:opacity-40">
              {busy === r.path ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </button>
          </div>
        ))}
        <button type="button" onClick={() => refFileRef.current?.click()} disabled={busy === "ref"}
          className="grid aspect-[2/3] place-items-center rounded-xl border-2 border-dashed border-black/15 bg-black/[0.03] active:scale-[0.98] transition">
          {busy === "ref" ? <Loader2 className="h-5 w-5 animate-spin text-black/40" /> : <ImageUp className="h-6 w-6 text-black/40" />}
        </button>
      </div>
      <p className="mt-1.5 text-[12px] font-bold text-black/70">
        {refs.length
          ? `${refs.length} Vorlage${refs.length === 1 ? "" : "n"} — jedes weitere Bildschirmfoto einfach mit ⌘V einfügen, es wird sofort gespeichert.`
          : "Angezogene Fotos von ihr — Kleid oder Oberteil, ganze Figur. Mit ⌘V einfügen oder antippen."}
      </p>
      <input ref={refFileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { void onRefFile(e.target.files?.[0]); e.target.value = ""; }} />

      {msg && <p className="mt-2 rounded-lg bg-black/[0.05] px-3 py-2 text-[12px] font-bold text-black/70">{msg}</p>}
    </div>
  );
}
