"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ImageUp, Film, Trash2, Image as ImageIcon } from "lucide-react";

// Admin-Tool fürs Kiss-Theme: das Theme-TEASER-BILD (Cover im /themes-Katalog) und die
// BEISPIEL-VIDEOS der Landingpage hochladen/verwalten. Upload läuft direkt zu Supabase
// (signierte URL — kein Vercel-Body-Limit). Weiße Box, blendet sich ohne PIN selbst aus.

type Example = { path: string; url: string };

export default function KissMediaAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [teaserUrl, setTeaserUrl] = useState("");
  const [examples, setExamples] = useState<Example[]>([]);
  const [busy, setBusy] = useState("");    // "teaser" | "video" | Beispiel-Pfad (löschen)
  const [msg, setMsg] = useState("");
  const teaserRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const load = (p: string) => fetch("/api/kiss-config", { headers: { "x-try-look-admin-pin": p }, cache: "no-store" })
    .then(r => r.json())
    .then(d => { setTeaserUrl(d.teaserUrl ?? ""); setExamples(Array.isArray(d.examples) ? d.examples : []); })
    .catch(() => {});

  useEffect(() => {
    let p = "";
    try {
      p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p); setIsAdmin(!!p && !localStorage.getItem("lb_preview_model"));
    } catch { /**/ }
    if (p) void load(p);
  }, []);

  if (!isAdmin) return null;

  const authH = () => ({ "Content-Type": "application/json", "x-try-look-admin-pin": pin });

  // Datei → signierte Upload-URL holen → direkt zu Supabase PUTten → Pfad in die Config.
  const upload = async (file: File, kind: "image" | "video") => {
    setMsg("");
    const ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase();
    const sign = await fetch("/api/kiss-config", { method: "POST", headers: authH(), body: JSON.stringify({ sign: true, kind, ext }) }).then(r => r.json());
    if (!sign?.uploadUrl || !sign?.path) { setMsg(sign?.error ?? "Upload konnte nicht starten."); return null; }
    const put = await fetch(sign.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || (kind === "video" ? "video/mp4" : "image/jpeg"), "x-upsert": "true" }, body: file });
    if (!put.ok) { setMsg(`Upload fehlgeschlagen (${put.status}).`); return null; }
    return sign.path as string;
  };

  // Teaser darf BILD ODER VIDEO sein (die Themes-Karte spielt Videos ab, wie bei Wetter).
  const onTeaser = async (f?: File | null) => {
    if (!f) return;
    setBusy("teaser");
    try {
      const isVideo = (f.type || "").startsWith("video/");
      const path = await upload(f, isVideo ? "video" : "image");
      if (path) {
        const r = await fetch("/api/kiss-config", { method: "POST", headers: authH(), body: JSON.stringify({ teaserPath: path }) });
        if (r.ok) { setMsg(`✅ Teaser-${isVideo ? "Video" : "Bild"} gespeichert.`); await load(pin); }
      }
    } finally { setBusy(""); }
  };

  const onVideo = async (f?: File | null) => {
    if (!f) return;
    setBusy("video");
    try {
      const path = await upload(f, "video");
      if (path) {
        const r = await fetch("/api/kiss-config", { method: "POST", headers: authH(), body: JSON.stringify({ addExample: path }) });
        if (r.ok) { setMsg("✅ Beispiel-Video hinzugefügt."); await load(pin); }
      }
    } finally { setBusy(""); }
  };

  const removeExample = async (path: string) => {
    setBusy(path);
    try {
      const r = await fetch("/api/kiss-config", { method: "POST", headers: authH(), body: JSON.stringify({ removeExample: path }) });
      if (r.ok) setExamples(e => e.filter(x => x.path !== path));
    } finally { setBusy(""); }
  };

  return (
    <div className="rounded-2xl border border-white/15 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/50">Nur für dich sichtbar</p>
      <h2 className="mt-1 flex items-center gap-2 text-[18px] font-black text-white"><ImageIcon className="h-4 w-4 text-black/50" /> Kiss-Medien</h2>
      <p className="mt-0.5 text-[12px] font-semibold text-white/60">Teaser-Bild (Cover im Themes-Katalog) + Beispiel-Videos der Landingpage.</p>

      {/* Teaser (Bild ODER Video — die Themes-Karte spielt Videos automatisch ab) */}
      <p className="mt-3 text-[11px] font-black uppercase tracking-wide text-white/55">Theme-Teaser (Bild oder Video)</p>
      <div className="mt-2 flex items-center gap-3">
        <button type="button" onClick={() => teaserRef.current?.click()} disabled={busy === "teaser"}
          className="relative grid h-28 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-black/15 bg-black/[0.03] active:scale-[0.98] transition"
          style={{ width: "84px" }}>
          {teaserUrl
            ? (/\.(mp4|webm|mov)(\?|$)/i.test(teaserUrl)
              // eslint-disable-next-line jsx-a11y/media-has-caption
              ? <video src={teaserUrl} muted loop playsInline autoPlay preload="metadata" className="h-full w-full object-cover" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={teaserUrl} alt="" className="h-full w-full object-cover" />)
            : (busy === "teaser" ? <Loader2 className="h-5 w-5 animate-spin text-black/40" /> : <ImageUp className="h-6 w-6 text-black/40" />)}
        </button>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-white/70">{teaserUrl ? "Tippen zum Ersetzen." : "Bild oder Video hochladen — wird das Cover der Kiss-Karte im Themes-Katalog."}</p>
        </div>
      </div>
      <input ref={teaserRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => { void onTeaser(e.target.files?.[0]); e.target.value = ""; }} />

      {/* Beispiel-Videos */}
      <p className="mt-4 text-[11px] font-black uppercase tracking-wide text-white/55">Beispiel-Videos (Landing, „See it in action")</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {examples.map(e => (
          <div key={e.path} className="relative overflow-hidden rounded-xl border border-black/10">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={e.url} muted playsInline preload="metadata" className="aspect-[3/4] w-full object-cover" />
            <button type="button" onClick={() => void removeExample(e.path)} disabled={busy === e.path}
              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white active:scale-95">
              {busy === e.path ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </button>
          </div>
        ))}
        <button type="button" onClick={() => videoRef.current?.click()} disabled={busy === "video"}
          className="grid aspect-[3/4] place-items-center rounded-xl border-2 border-dashed border-black/15 bg-black/[0.03] active:scale-[0.98] transition">
          {busy === "video" ? <Loader2 className="h-5 w-5 animate-spin text-black/40" /> : <Film className="h-6 w-6 text-black/40" />}
        </button>
      </div>
      <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={e => { void onVideo(e.target.files?.[0]); e.target.value = ""; }} />

      {msg && <p className="mt-2 rounded-lg bg-black/[0.05] px-3 py-2 text-[12px] font-bold text-black/70">{msg}</p>}
    </div>
  );
}
