"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ImageUp, Film, Trash2, Image as ImageIcon } from "lucide-react";

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
  const [examples, setExamples] = useState<Example[]>([]);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [busy, setBusy] = useState("");    // "teaser" | "video" | Pfad (löschen)
  const [msg, setMsg] = useState("");
  const teaserRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const api = `/api/theme-media?theme=${encodeURIComponent(theme)}`;

  const load = (p: string) => fetch(api, { headers: { "x-try-look-admin-pin": p }, cache: "no-store" })
    .then(r => r.json())
    .then(d => {
      setTeaserUrl(d.teaserUrl ?? "");
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

      <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-black/55">Theme-Teaser (Bild oder Video)</p>
      <div className="mt-2 flex items-center gap-3">
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
        <p className="min-w-0 text-[12px] font-bold text-black/70">
          {teaserUrl ? "Tippen zum Ersetzen." : (teaserHint ?? "Bild oder Video hochladen — wird das Cover im Themes-Katalog.")}
        </p>
      </div>
      <input ref={teaserRef} type="file" accept="image/*,video/*" className="hidden"
        onChange={e => { void onTeaser(e.target.files?.[0]); e.target.value = ""; }} />

      <p className="mt-4 text-[11px] font-black uppercase tracking-wide text-black/55">Beispiel-Videos (Landing)</p>
      {usingDefaults && (
        <p className="mt-1 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold leading-snug text-amber-700">
          Das sind noch die Vorgaben. Sobald du eines hinzufügst oder löschst, gilt nur noch deine Auswahl.
        </p>
      )}
      <div className="mt-2 grid grid-cols-3 gap-2">
        {examples.map(e => (
          <div key={e.path} className="relative overflow-hidden rounded-xl border border-black/10">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={e.url} muted playsInline preload="metadata" className="pointer-events-none aspect-[3/4] w-full object-cover" />
            {/* Großer Tap-Bereich + z-10, damit der Klick nie im Video landet. */}
            <button type="button" onClick={() => void removeExample(e.path)} disabled={busy === e.path}
              aria-label="Beispiel-Video löschen"
              className="absolute right-1 top-1 z-10 grid h-9 w-9 place-items-center rounded-full bg-red-600 text-white shadow-lg active:scale-95 disabled:opacity-60">
              {busy === e.path ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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

      {msg && <p className="mt-2 rounded-lg bg-black/[0.05] px-3 py-2 text-[12px] font-bold text-black/70">{msg}</p>}
    </div>
  );
}
