"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Loader2, Save, Upload, Download, Plus, Trash2, Play, Eye } from "lucide-react";

// „Was Bella für dich macht" — eine Szene = ein Instagram-Beitrag.
// Ablauf: Bild/Video hochladen → fertigen Text kopieren → Karte als PNG herunterladen → posten.

const PIN_KEY = "luxurybandit-try-look-admin-pin";
const BELLA_ID = "curator-1783683672619-td4cy";

type Scene = {
  id: string; order: number; title: string; caption: string;
  kind: "image" | "video"; path: string; createdAt: string; mediaUrl?: string;
};

export default function BellaSlidesPage() {
  const [pin, setPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [authError, setAuthError] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [error, setError] = useState("");
  // Kartenvorschau oben: leer = ihre normale Karte, sonst die Karte MIT diesem Szenenbild.
  const [previewPath, setPreviewPath] = useState("");
  const [previewLoading, setPreviewLoading] = useState(true);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const previewSrc = `/api/model-card-image?id=${encodeURIComponent(BELLA_ID)}${previewPath ? `&img=${encodeURIComponent(previewPath)}` : ""}`;
  const showPreview = (path: string) => { if (path === previewPath) return; setPreviewLoading(true); setPreviewPath(path); };

  useEffect(() => { try { setPin(localStorage.getItem(PIN_KEY) ?? ""); } catch { /**/ } }, []);

  useEffect(() => {
    if (!pin) { setLoading(false); return; }
    setLoading(true);
    fetch("/api/bella-scenes", { headers: { "x-try-look-admin-pin": pin } })
      .then(async r => { if (r.status === 401) { setAuthError(true); return null; } return r.json(); })
      .then(d => { if (d?.scenes) { setScenes(d.scenes); setAuthError(false); } })
      .catch(() => setError("Laden fehlgeschlagen."))
      .finally(() => setLoading(false));
  }, [pin]);

  const save = async (list = scenes) => {
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/bella-scenes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-try-look-admin-pin": pin },
        body: JSON.stringify({ scenes: list.map(({ mediaUrl, ...s }) => s) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error ?? "Speichern fehlgeschlagen."); return false; }
      setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
      return true;
    } catch { setError("Netzwerkfehler."); return false; }
    finally { setSaving(false); }
  };

  const update = (id: string, patch: Partial<Scene>) => {
    setScenes(s => s.map(x => x.id === id ? { ...x, ...patch } : x));
    setDirty(true);
  };

  // Datei geht direkt zu Supabase (signierte Adresse) — nicht durch die API, wegen Größenlimit.
  const upload = async (scene: Scene, file: File) => {
    setBusyId(scene.id); setError("");
    try {
      const kind: "image" | "video" = file.type.startsWith("video") ? "video" : "image";
      const ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase();
      const sign = await fetch("/api/bella-scenes", {
        method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": pin },
        body: JSON.stringify({ sign: true, kind, ext }),
      }).then(r => r.json());
      if (!sign?.uploadUrl) { setError(sign?.error ?? "Upload-Adresse fehlgeschlagen."); return; }
      const put = await fetch(sign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || (kind === "video" ? "video/mp4" : "image/jpeg"), "x-upsert": "true" },
        body: file,
      });
      if (!put.ok) { setError("Hochladen fehlgeschlagen."); return; }
      const next = scenes.map(x => x.id === scene.id
        ? { ...x, kind, path: sign.path, mediaUrl: URL.createObjectURL(file) } : x);
      setScenes(next);
      if (kind === "image") showPreview(sign.path); // frisch Hochgeladenes sofort oben zeigen
      await save(next); // sofort sichern, damit ein Upload nie verloren geht
    } catch { setError("Hochladen fehlgeschlagen."); }
    finally { setBusyId(""); }
  };

  const copy = async (s: Scene) => {
    try { await navigator.clipboard.writeText(s.caption); setCopiedId(s.id); setTimeout(() => setCopiedId(""), 1800); }
    catch { setError("Kopieren nicht möglich — bitte den Text markieren."); }
  };

  // Lädt die fertige Karte als PNG (Renderer setzt das Szenenbild statt ihres Profilfotos ein).
  const downloadCard = async (s: Scene) => {
    if (!s.path) { setError("Erst ein Bild hochladen."); return; }
    setBusyId(s.id + "-dl");
    try {
      const r = await fetch(`/api/model-card-image?id=${encodeURIComponent(BELLA_ID)}&img=${encodeURIComponent(s.path)}`);
      if (!r.ok) { setError("Karte konnte nicht erzeugt werden."); return; }
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `bella-${(s.title || "szene").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch { setError("Karte konnte nicht erzeugt werden."); }
    finally { setBusyId(""); }
  };

  const addScene = () => {
    setScenes(s => [...s, {
      id: `neu-${Date.now()}`, order: s.length, title: "", caption: "",
      kind: "image", path: "", createdAt: new Date().toISOString(),
    }]);
    setDirty(true);
  };
  const removeScene = (id: string) => {
    if (!window.confirm("Diese Szene löschen?")) return;
    setScenes(s => s.filter(x => x.id !== id));
    setDirty(true);
  };

  if (!pin || authError) {
    const enter = () => { if (!pinInput.trim()) return; try { localStorage.setItem(PIN_KEY, pinInput.trim()); } catch { /**/ } setAuthError(false); setPin(pinInput.trim()); };
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#faf7f0] px-6">
        <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-600">LuxuryBandit</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Bella-Szenen</h1>
          <p className="mt-1 text-[13px] font-semibold text-slate-500">Admin-PIN eingeben.</p>
          <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") enter(); }}
            className="mt-4 h-12 w-full rounded-xl border-[1.5px] border-slate-400 px-4 text-[15px] font-bold text-slate-900 outline-none focus:border-slate-700" />
          <button type="button" onClick={enter}
            className="mt-3 h-12 w-full rounded-xl bg-slate-800 text-[15px] font-black text-white active:scale-95 transition">Öffnen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#faf7f0] pb-28 text-slate-900">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/10 bg-[#faf7f0]/95 px-4 py-3 backdrop-blur">
        <Link href="/admin" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/15 active:scale-90 transition">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">Bella-Szenen</p>
          <p className="truncate text-[11px] font-bold text-slate-500">{scenes.length} Szenen · {scenes.filter(s => s.path).length} mit Medium</p>
        </div>
        {dirty && (
          <button type="button" onClick={() => void save()} disabled={saving}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-slate-800 px-4 text-[13px] font-black text-white active:scale-95 transition disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Speichern
          </button>
        )}
        {!dirty && saved && <span className="shrink-0 text-[13px] font-black text-emerald-600">✓ Gespeichert</span>}
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 pt-4">
        {/* Kartenvorschau — genau das Bild, das der Herunterladen-Knopf liefert. */}
        <div className="rounded-2xl border border-black/10 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-black uppercase tracking-wide text-slate-500">Vorschau der Karte</p>
            {previewPath
              ? <button type="button" onClick={() => showPreview("")}
                  className="rounded-full border border-black/15 px-2.5 py-1 text-[11px] font-black text-slate-600 active:scale-95">Standardkarte</button>
              : <span className="text-[11px] font-bold text-slate-400">ohne Szene</span>}
          </div>
          <div className="relative mt-2 overflow-hidden rounded-xl bg-slate-100">
            {previewLoading && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-slate-100/80">
                <span className="flex items-center gap-2 text-[12px] font-black text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Karte wird erzeugt…
                </span>
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={previewSrc} src={previewSrc} alt="Kartenvorschau" className="mx-auto block w-full max-w-[320px]"
              onLoad={() => setPreviewLoading(false)}
              onError={() => { setPreviewLoading(false); setError("Vorschau konnte nicht erzeugt werden."); }} />
          </div>
          <p className="mt-1.5 text-center text-[11px] font-bold text-slate-400">Genau dieses Bild lädst du herunter.</p>
        </div>

        <p className="mt-3 rounded-xl border border-black/10 bg-white px-3 py-2 text-[12px] font-semibold text-slate-600">
          Ablauf je Szene: <b>Bild hochladen</b> → <b>Text kopieren</b> → <b>Karte herunterladen</b> → auf Instagram posten.
        </p>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-bold text-red-600">{error}</p>}

        {loading ? (
          <p className="py-16 text-center text-[13px] font-bold text-slate-400">Lädt…</p>
        ) : (
          <div className="mt-4 grid gap-4">
            {scenes.map((s, i) => (
              <div key={s.id} className="rounded-2xl border border-black/10 bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-800 text-[11px] font-black text-white">{i + 1}</span>
                  <input value={s.title} onChange={e => update(s.id, { title: e.target.value })}
                    placeholder="Szene, z. B. Bella weckt dich auf"
                    className="min-w-0 flex-1 bg-transparent text-[14px] font-black text-slate-900 outline-none placeholder:font-bold placeholder:text-slate-400" />
                  <button type="button" onClick={() => removeScene(s.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-300 text-red-600 active:scale-95 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2.5 flex gap-3">
                  {/* Medium */}
                  <div className="shrink-0">
                    <input ref={el => { fileRefs.current[s.id] = el; }} type="file" accept="image/*,video/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) void upload(s, f); e.target.value = ""; }} />
                    <button type="button" onClick={() => fileRefs.current[s.id]?.click()} disabled={busyId === s.id}
                      className="relative grid h-28 w-[84px] place-items-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 active:scale-95 transition disabled:opacity-50">
                      {busyId === s.id ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        : s.mediaUrl ? (
                          s.kind === "video"
                            ? <><video src={s.mediaUrl} className="h-full w-full object-cover" muted playsInline /><span className="absolute grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white"><Play className="h-3.5 w-3.5" fill="currentColor" /></span></>
                            /* eslint-disable-next-line @next/next/no-img-element */
                            : <img src={s.mediaUrl} alt="" className="h-full w-full object-cover" />
                        ) : <span className="flex flex-col items-center gap-1 text-[10px] font-black text-slate-400"><Upload className="h-4 w-4" />Bild<br />/ Video</span>}
                    </button>
                  </div>

                  {/* Text */}
                  <textarea value={s.caption} onChange={e => update(s.id, { caption: e.target.value })}
                    rows={5} placeholder="Text für den Beitrag…"
                    className="min-w-0 flex-1 resize-y rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] font-semibold leading-relaxed text-slate-800 outline-none focus:border-slate-500" />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => void copy(s)}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-800 px-3 text-[12px] font-black text-white active:scale-95 transition">
                    {copiedId === s.id ? <><Check className="h-3.5 w-3.5" /> Kopiert</> : <><Copy className="h-3.5 w-3.5" /> Text kopieren</>}
                  </button>
                  <button type="button" onClick={() => showPreview(s.path)} disabled={!s.path || s.kind === "video"}
                    className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-black active:scale-95 transition disabled:opacity-40 ${previewPath && previewPath === s.path ? "bg-slate-900 text-white" : "border border-black/15 text-slate-700"}`}>
                    <Eye className="h-3.5 w-3.5" /> {previewPath && previewPath === s.path ? "Oben zu sehen" : "Vorschau"}
                  </button>
                  <button type="button" onClick={() => void downloadCard(s)} disabled={!s.path || busyId === s.id + "-dl"}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-amber-400 px-3 text-[12px] font-black text-black active:scale-95 transition disabled:opacity-40">
                    {busyId === s.id + "-dl" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Karte herunterladen
                  </button>
                  {!s.path && <span className="text-[11px] font-bold text-slate-400">erst Bild hochladen</span>}
                </div>
              </div>
            ))}

            <button type="button" onClick={addScene}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/20 text-[13px] font-black text-slate-600 active:scale-95 transition">
              <Plus className="h-4 w-4" /> Weitere Szene
            </button>
          </div>
        )}
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-[#faf7f0]/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <button type="button" onClick={() => void save()} disabled={saving}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 py-3 text-[15px] font-black text-white active:scale-95 transition disabled:opacity-50">
              {saving ? <><Loader2 className="h-5 w-5 animate-spin" /> Speichert…</> : <><Save className="h-5 w-5" /> Änderungen speichern</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
