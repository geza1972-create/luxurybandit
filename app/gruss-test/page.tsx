"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Mic, Plus, RefreshCw, Square, Trash2, Video, X } from "lucide-react";
import { Knopf } from "@/components/CI";
import ImageCropper from "@/components/ImageCropper";
import SortableTiles, { type Tile } from "@/components/SortableTiles";
import LandingHeader from "@/components/LandingHeader";

/**
 * GRUSSKARTEN-PRÜFSTAND (Schritt 1 — das Herzstück, sonst nichts).
 *
 * Ablauf: Karten-Clip wählen → eigenes Foto (mit Zuschnitt) → Stimme LIVE per Mikrofon
 * nach dem festen Skript aufnehmen (kein Datei-Upload — die Aufnahme bindet den Gruß an
 * die real anwesende Person) → aktive Bestätigung (18+, eigenes Bild/Stimme) → genau
 * EIN Video über /api/gruss-test.
 *
 * Admin-PIN-gesperrt wie das Card Studio: Kosten entstehen pro Klick, das bleibt intern,
 * bis das Herzstück freigegeben ist.
 */

const PIN_KEY = "luxurybandit-try-look-admin-pin";
const DEFAULT_SCRIPT =
  "Alles Gute zum Geburtstag! Ich denke heute ganz besonders an dich und schicke dir die allerbesten Wünsche.";
const MAX_RECORD_SECONDS = 30; // Swap/Lip-Sync nehmen max. 30 s — länger wäre verschenktes Geld

type Template = { id: string; videoPath: string; label: string; script: string; videoUrl: string };
type Generation = { id: string; at: string; templateId: string; status: string; error?: string; videoUrl: string };

// Aufnahme → WAV (16-bit PCM, mono). MediaRecorder liefert je nach Browser webm/opus oder
// mp4/aac — Pixverse nimmt nur mp3/wav/m4a/aac, also rechnen wir clientseitig nach WAV um.
async function blobToWav(blob: Blob): Promise<Blob> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const len = decoded.length;
    const mono = new Float32Array(len);
    for (let c = 0; c < decoded.numberOfChannels; c++) {
      const d = decoded.getChannelData(c);
      for (let i = 0; i < len; i++) mono[i] += d[i] / decoded.numberOfChannels;
    }
    const sr = decoded.sampleRate;
    const buf = new ArrayBuffer(44 + len * 2);
    const v = new DataView(buf);
    const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, "RIFF"); v.setUint32(4, 36 + len * 2, true); str(8, "WAVE");
    str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, "data"); v.setUint32(40, len * 2, true);
    for (let i = 0; i < len; i++) {
      const s = Math.max(-1, Math.min(1, mono[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([buf], { type: "audio/wav" });
  } finally {
    ctx.close().catch(() => {});
  }
}

export default function GrussTestPage() {
  const [pin, setPin] = useState<string | null>(null);
  useEffect(() => {
    try { setPin(localStorage.getItem(PIN_KEY) ?? ""); } catch { setPin(""); }
  }, []);

  return (
    <main className="min-h-screen bg-[#0d0b0a] text-white">
      <LandingHeader />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-6">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">Admin · Prüfstand</p>
        <h1 className="mt-1 text-[26px] font-black leading-tight">Grußkarten-Herzstück</h1>
        <p className="mt-1 text-[14px] font-medium text-white/85">
          Karte wählen, eigenes Foto, Stimme LIVE aufnehmen — ein Video, ansehen, fertig.
        </p>
        {pin === "" && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-[15px] font-bold">Nur für Admins.</p>
            <p className="mt-1 text-[13px] text-white/75">Ohne Admin-PIN im Browser bleibt der Prüfstand zu.</p>
          </div>
        )}
        {!!pin && <Werkbank pin={pin} />}
      </div>
    </main>
  );
}

function Werkbank({ pin }: { pin: string }) {
  const headers = useCallback(
    (json = false): Record<string, string> =>
      json
        ? { "Content-Type": "application/json", "x-try-look-admin-pin": pin }
        : { "x-try-look-admin-pin": pin },
    [pin]
  );

  const [templates, setTemplates] = useState<Template[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [consentText, setConsentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const reload = useCallback(async () => {
    try {
      const r = await fetch("/api/gruss-test", { headers: headers(), cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error ?? `HTTP ${r.status}`);
      setTemplates(d.templates ?? []);
      setGenerations(d.generations ?? []);
      setConsentText(String(d.consentText ?? ""));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [headers]);
  useEffect(() => { void reload(); }, [reload]);

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      const r = await fetch("/api/gruss-test", { method: "POST", headers: headers(true), body: JSON.stringify(body) });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error ?? `HTTP ${r.status}`);
      return d;
    },
    [headers]
  );

  // Direkt-Upload zu Supabase über eine signierte Adresse (Vercel kappt API-Bodies ~4,5 MB).
  const uploadDirect = useCallback(
    async (kind: "video" | "image" | "audio", file: Blob, extension: string): Promise<string> => {
      const { path, uploadUrl } = await post({ action: "signUpload", kind, extension });
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!put.ok) throw new Error(`Upload fehlgeschlagen (HTTP ${put.status}).`);
      return path as string;
    },
    [post]
  );

  // ── Auswahl-Zustand des Prüflaufs ──────────────────────────────────────────
  const [pickedId, setPickedId] = useState("");
  const picked = templates.find(t => t.id === pickedId) ?? null;
  const [facePath, setFacePath] = useState("");
  const [facePreview, setFacePreview] = useState("");
  const [audioPath, setAudioPath] = useState("");
  const [audioPreview, setAudioPreview] = useState("");
  const [consent, setConsent] = useState(false); // NIE vorausgewählt (Pflicht-Schutzschicht)
  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState("");
  const [resultUrl, setResultUrl] = useState("");

  if (loading) return <p className="mt-8 text-center text-[14px] text-white/75">Lade…</p>;

  return (
    <div className="mt-6 space-y-8">
      {!!err && <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-[13px] font-bold text-red-400">{err}</p>}

      <KartenSchritt
        templates={templates}
        pickedId={pickedId}
        onPick={setPickedId}
        onChanged={reload}
        post={post}
        uploadDirect={uploadDirect}
      />

      <FotoSchritt facePath={facePath} facePreview={facePreview} onSaved={(p, u) => { setFacePath(p); setFacePreview(u); }} onDelete={() => { setFacePath(""); setFacePreview(""); }} uploadDirect={uploadDirect} />

      <StimmeSchritt
        script={picked?.script ?? DEFAULT_SCRIPT}
        hasTemplate={!!picked}
        audioPath={audioPath}
        audioPreview={audioPreview}
        onSaved={(p, u) => { setAudioPath(p); setAudioPreview(u); }}
        onDelete={() => { setAudioPath(""); setAudioPreview(""); }}
        uploadDirect={uploadDirect}
      />

      {/* ── Schritt 4: Bestätigung + genau EINE Generierung ─────────────────── */}
      <section>
        <p className="text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">Schritt 4 · Bestätigen &amp; erzeugen</p>
        <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/20 bg-white/[0.05] p-4">
          <input
            type="checkbox"
            checked={consent}
            onChange={e => setConsent(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[#f6cf51]"
          />
          <span className="text-[13px] font-bold leading-snug text-white/85">{consentText || "…"}</span>
        </label>
        <p className="mt-2 text-[12px] font-bold text-white/75">
          Die Bestätigung wird mit Zeitstempel protokolliert. Eine Generierung kostet echtes Geld
          (grob 0,50–1,50 € je nach Cliplänge) — genau EIN Video pro Klick, kein automatischer Neuversuch.
        </p>
        <button
          type="button"
          disabled={!picked || !facePath || !audioPath || !consent || genBusy}
          onClick={async () => {
            setGenBusy(true); setGenError(""); setResultUrl("");
            try {
              const d = await post({
                action: "generate",
                generationId: crypto.randomUUID(),
                templateId: pickedId,
                facePath,
                audioPath,
                consent,
              });
              setResultUrl(String(d.videoUrl ?? ""));
              void reload();
            } catch (e) {
              setGenError((e as Error).message);
              void reload();
            } finally {
              setGenBusy(false);
            }
          }}
          className="lb-gold mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-40"
        >
          {genBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
          {genBusy ? "Wird erzeugt — 2 bis 5 Minuten…" : "Video erzeugen (1×)"}
        </button>
        {!!genError && <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-[13px] font-bold text-red-400">{genError}</p>}
        {!!resultUrl && (
          <div className="mt-4">
            <p className="text-[13px] font-black text-[#f6cf51]">Fertig — das Ergebnis:</p>
            <video src={resultUrl} controls playsInline className="mt-2 w-full rounded-2xl border border-white/15" />
          </div>
        )}
      </section>

      {/* ── Bisherige Läufe (mit „Nachschauen" für hängengebliebene) ─────────── */}
      {generations.length > 0 && (
        <section>
          <p className="text-[12px] font-black uppercase tracking-wide text-white/50">Bisherige Läufe</p>
          <div className="mt-2 space-y-2">
            {generations.map(g => (
              <LaufZeile key={g.id} g={g} post={post} onDone={reload} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Schritt 1: Karten-Clip wählen / hochladen ────────────────────────────────
function KartenSchritt({
  templates, pickedId, onPick, onChanged, post, uploadDirect,
}: {
  templates: Template[];
  pickedId: string;
  onPick: (id: string) => void;
  onChanged: () => Promise<void> | void;
  post: (b: Record<string, unknown>) => Promise<Record<string, unknown>>;
  uploadDirect: (k: "video" | "image" | "audio", f: Blob, ext: string) => Promise<string>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [pendingUrl, setPendingUrl] = useState("");
  const [pendingSecs, setPendingSecs] = useState(0);
  const [label, setLabel] = useState("");
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const tiles: Tile[] = templates.map(t => ({ path: t.id, url: t.videoUrl }));

  const reset = () => {
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    setPending(null); setPendingUrl(""); setPendingSecs(0); setLabel(""); setMsg("");
  };

  return (
    <section>
      <p className="text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">Schritt 1 · Karte wählen</p>
      <p className="mt-1 text-[13px] font-medium text-white/75">
        Vorproduzierter Clip (max. 30 s, eine Person gut sichtbar von vorn). Antippen = wählen.
      </p>
      {templates.length > 0 && (
        <div className="mt-3">
          <SortableTiles
            items={tiles}
            aspect="aspect-[9/16]"
            kind="video"
            onReorder={async paths => { await post({ action: "reorderTemplates", ids: paths }); await onChanged(); }}
            onDelete={async id => { await post({ action: "deleteTemplate", id }); if (id === pickedId) onPick(""); await onChanged(); }}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {templates.map(t => (
              <Knopf key={t.id} art="chip" aktiv={pickedId === t.id} onClick={() => onPick(t.id)}>
                {pickedId === t.id ? "✓ " : ""}{t.label}
              </Knopf>
            ))}
          </div>
        </div>
      )}

      {!pending ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-3 flex h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-[13px] font-black text-white/85 active:scale-95 transition"
        >
          <Plus className="h-4 w-4" /> Karten-Clip hochladen
        </button>
      ) : (
        <div className="mt-3 rounded-2xl border border-white/15 bg-white/[0.04] p-3">
          <video src={pendingUrl} controls playsInline className="w-full rounded-xl"
            onLoadedMetadata={e => setPendingSecs(Math.round((e.target as HTMLVideoElement).duration))} />
          {pendingSecs > MAX_RECORD_SECONDS && (
            <p className="mt-2 text-[12px] font-bold text-red-400">
              {pendingSecs}s — zu lang. Swap/Lip-Sync nehmen höchstens 30 s.
            </p>
          )}
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Name, z. B. Paris — Geburtstag"
            className="mt-3 w-full rounded-xl border border-white/30 bg-white/[0.08] px-3 py-2 text-[14px] font-medium placeholder:text-white/60" />
          <textarea value={script} onChange={e => setScript(e.target.value)} rows={3}
            placeholder="Festes Skript, das der Nutzer abliest"
            className="mt-2 w-full rounded-xl border border-white/30 bg-white/[0.08] px-3 py-2 text-[14px] font-medium placeholder:text-white/60" />
          {!!msg && <p className="mt-2 text-[12px] font-bold text-red-400">{msg}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={saving || !label.trim() || !script.trim() || pendingSecs > MAX_RECORD_SECONDS}
              onClick={async () => {
                if (!pending) return;
                setSaving(true); setMsg("");
                try {
                  const ext = pending.name.toLowerCase().endsWith(".mov") ? "mov" : pending.name.toLowerCase().endsWith(".webm") ? "webm" : "mp4";
                  const path = await uploadDirect("video", pending, ext);
                  await post({ action: "saveTemplate", videoPath: path, label: label.trim(), script: script.trim() });
                  reset();
                  await onChanged();
                } catch (e) { setMsg((e as Error).message); } finally { setSaving(false); }
              }}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white text-[13px] font-black text-black active:scale-95 transition disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Speichern
            </button>
            <button type="button" onClick={reset}
              className="flex h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-[13px] font-black text-white/85 active:scale-95 transition">
              <X className="h-4 w-4" /> Abbrechen
            </button>
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm" hidden
        onChange={e => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setPending(f);
          setPendingUrl(URL.createObjectURL(f));
        }} />
    </section>
  );
}

// ── Schritt 2: Eigenes Foto (Zuschnitt → Speichern, Löschen sichtbar) ────────
function FotoSchritt({
  facePath, facePreview, onSaved, onDelete, uploadDirect,
}: {
  facePath: string;
  facePreview: string;
  onSaved: (path: string, preview: string) => void;
  onDelete: () => void;
  uploadDirect: (k: "video" | "image" | "audio", f: Blob, ext: string) => Promise<string>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  return (
    <section>
      <p className="text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">Schritt 2 · Dein Foto</p>
      <p className="mt-1 text-[13px] font-medium text-white/75">Gesicht gut sichtbar, von vorn, gutes Licht.</p>
      {!facePath ? (
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
          className="mt-3 flex h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-[13px] font-black text-white/85 active:scale-95 transition">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Foto wählen
        </button>
      ) : (
        <div className="relative mt-3 w-32">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={facePreview} alt="Dein Foto" className="aspect-[3/4] w-32 rounded-xl object-cover" />
          <button type="button" onClick={onDelete}
            className="absolute -right-2 -top-2 rounded-full bg-black p-1.5 text-red-400 ring-1 ring-white/20 active:scale-95 transition"
            aria-label="Foto löschen">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
      {!!msg && <p className="mt-2 text-[12px] font-bold text-red-400">{msg}</p>}
      <input ref={fileRef} type="file" accept="image/*" hidden
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setCropFile(f); }} />
      {cropFile && (
        <ImageCropper
          file={cropFile}
          aspect={3 / 4}
          title="Gesicht in den Ausschnitt schieben"
          onCancel={() => setCropFile(null)}
          onSave={async (cropped, previewUrl) => {
            setBusy(true); setMsg("");
            try {
              const path = await uploadDirect("image", cropped, "jpg");
              onSaved(path, previewUrl); // Vorschau sofort aus dem lokalen Bild (Supabase liest ~2 s alt)
              setCropFile(null);
            } catch (er) { setMsg((er as Error).message); } finally { setBusy(false); }
          }}
        />
      )}
    </section>
  );
}

// ── Schritt 3: Stimme LIVE aufnehmen (kein Datei-Upload — bewusst) ───────────
function StimmeSchritt({
  script, hasTemplate, audioPath, audioPreview, onSaved, onDelete, uploadDirect,
}: {
  script: string;
  hasTemplate: boolean;
  audioPath: string;
  audioPreview: string;
  onSaved: (path: string, preview: string) => void;
  onDelete: () => void;
  uploadDirect: (k: "video" | "image" | "audio", f: Blob, ext: string) => Promise<string>;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [takeBlob, setTakeBlob] = useState<Blob | null>(null);
  const [takeUrl, setTakeUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => { if (tick.current) { clearInterval(tick.current); tick.current = null; } };

  const stop = useCallback(() => {
    rec.current?.stop();
    rec.current?.stream.getTracks().forEach(t => t.stop());
    setRecording(false);
    stopTimer();
  }, []);

  const start = async () => {
    setMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        setTakeBlob(blob);
        setTakeUrl(URL.createObjectURL(blob));
      };
      rec.current = mr;
      mr.start();
      setRecording(true);
      setSeconds(0);
      tick.current = setInterval(() => {
        setSeconds(s => {
          if (s + 1 >= MAX_RECORD_SECONDS) stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setMsg("Mikrofon nicht erlaubt — bitte Zugriff freigeben.");
    }
  };
  useEffect(() => () => { stopTimer(); rec.current?.stream.getTracks().forEach(t => t.stop()); }, []);

  const discardTake = () => { if (takeUrl) URL.revokeObjectURL(takeUrl); setTakeBlob(null); setTakeUrl(""); setSeconds(0); };

  return (
    <section>
      <p className="text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">Schritt 3 · Deine Stimme</p>
      <p className="mt-1 text-[13px] font-medium text-white/75">
        Nur LIVE-Aufnahme, kein Datei-Upload — der Gruß gehört zur Person, die hier sitzt.
      </p>
      <div className="mt-3 rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/10 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">Bitte genau das sprechen</p>
        <p className="mt-1 text-[15px] font-bold leading-snug">{hasTemplate ? script : "Erst oben eine Karte wählen — jede Karte hat ihr festes Skript."}</p>
      </div>

      {!audioPath ? (
        <div className="mt-3">
          {!recording && !takeBlob && (
            <button type="button" onClick={start} disabled={!hasTemplate}
              className="flex h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-[13px] font-black text-white/85 active:scale-95 transition disabled:opacity-40">
              <Mic className="h-4 w-4" /> Aufnahme starten
            </button>
          )}
          {recording && (
            <button type="button" onClick={stop}
              className="flex h-11 items-center gap-2 rounded-full bg-red-500 px-4 text-[13px] font-black text-white active:scale-95 transition">
              <Square className="h-4 w-4" /> Stopp ({seconds}s / {MAX_RECORD_SECONDS}s)
            </button>
          )}
          {!!takeBlob && !recording && (
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-3">
              <audio src={takeUrl} controls className="w-full" />
              {!!msg && <p className="mt-2 text-[12px] font-bold text-red-400">{msg}</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={busy}
                  onClick={async () => {
                    if (!takeBlob) return;
                    setBusy(true); setMsg("");
                    try {
                      const wav = await blobToWav(takeBlob);
                      const path = await uploadDirect("audio", wav, "wav");
                      onSaved(path, takeUrl);
                      setTakeBlob(null);
                    } catch (er) { setMsg((er as Error).message); } finally { setBusy(false); }
                  }}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white text-[13px] font-black text-black active:scale-95 transition disabled:opacity-40">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aufnahme speichern
                </button>
                <button type="button" onClick={discardTake}
                  className="flex h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-[13px] font-black text-white/85 active:scale-95 transition">
                  <RefreshCw className="h-4 w-4" /> Neu
                </button>
              </div>
            </div>
          )}
          {!!msg && !takeBlob && <p className="mt-2 text-[12px] font-bold text-red-400">{msg}</p>}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-white/15 bg-white/[0.04] p-3">
          <div className="flex items-center gap-3">
            <audio src={audioPreview} controls className="min-w-0 flex-1" />
            <button type="button" onClick={onDelete}
              className="rounded-full bg-black p-2 text-red-400 ring-1 ring-white/20 active:scale-95 transition" aria-label="Aufnahme löschen">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-[12px] font-bold text-[#f6cf51]">Gespeichert ✓</p>
        </div>
      )}
    </section>
  );
}

// ── Eine Zeile „Bisherige Läufe" mit Nachschauen (resume, ohne Neustart) ─────
function LaufZeile({
  g, post, onDone,
}: {
  g: Generation;
  post: (b: Record<string, unknown>) => Promise<Record<string, unknown>>;
  onDone: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const wann = new Date(g.at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-bold text-white/85">
          {wann} ·{" "}
          {g.status === "done" ? <span className="text-[#f6cf51]">fertig</span>
            : g.status === "failed" ? <span className="text-red-400">fehlgeschlagen</span>
            : <span className="text-white/70">läuft…</span>}
        </p>
        {g.status !== "done" && (
          <button type="button" disabled={busy}
            onClick={async () => {
              setBusy(true); setMsg("");
              try { await post({ action: "resume", id: g.id }); await onDone(); }
              catch (e) { setMsg((e as Error).message); }
              finally { setBusy(false); }
            }}
            className="flex h-9 items-center gap-1.5 rounded-full border border-white/20 px-3 text-[12px] font-black text-white/85 active:scale-95 transition disabled:opacity-40">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Nachschauen
          </button>
        )}
      </div>
      {!!g.error && <p className="mt-1 text-[12px] font-bold text-red-400">{g.error}</p>}
      {!!msg && <p className="mt-1 text-[12px] font-bold text-red-400">{msg}</p>}
      {!!g.videoUrl && <video src={g.videoUrl} controls playsInline className="mt-2 w-full rounded-xl border border-white/10" />}
    </div>
  );
}
