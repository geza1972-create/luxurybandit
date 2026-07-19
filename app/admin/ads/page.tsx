"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Trash2, Plus, Loader2, Save } from "lucide-react";

// Werbetext-Sammlung: Anzeigentexte, Sätze die Bella im Video spricht, Beispiel-Nachrichten.
// Bearbeitbar und dauerhaft gespeichert (eigenes Blob), damit diese Texte nicht verloren gehen.

const PIN_KEY = "luxurybandit-try-look-admin-pin";

type Kind = "ad" | "spoken" | "message";
type Script = { id: string; kind: Kind; title: string; text: string; createdAt: string };

const GROUPS: { kind: Kind; label: string; hint: string; accent: string }[] = [
  { kind: "ad", label: "📣 Anzeigentexte", hint: "Für Meta/Instagram — Primärtext der Anzeige. Direkt kopieren und einfügen.", accent: "border-amber-300 bg-amber-50/60" },
  { kind: "spoken", label: "🎤 Bella spricht", hint: "Was Bella im Werbevideo sagt (Sprech-Skript für die Lippensynchronisation).", accent: "border-violet-300 bg-violet-50/60" },
  { kind: "message", label: "💬 Beispiel-Nachrichten", hint: "Wie die täglichen Nachrichten klingen — für Anzeigenbilder und die Landingpage.", accent: "border-sky-300 bg-sky-50/60" },
];

export default function AdScriptsPage() {
  const [pin, setPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try { setPin(localStorage.getItem(PIN_KEY) ?? ""); } catch { /**/ }
  }, []);

  useEffect(() => {
    if (!pin) { setLoading(false); return; }
    setLoading(true);
    fetch("/api/ad-scripts", { headers: { "x-try-look-admin-pin": pin } })
      .then(async r => {
        if (r.status === 401) { setAuthError(true); return null; }
        return r.json();
      })
      .then(d => { if (d?.scripts) { setScripts(d.scripts); setAuthError(false); } })
      .catch(() => setError("Laden fehlgeschlagen."))
      .finally(() => setLoading(false));
  }, [pin]);

  const save = async () => {
    setSaving(true); setError("");
    try {
      const r = await fetch("/api/ad-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-try-look-admin-pin": pin },
        body: JSON.stringify({ scripts }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error ?? "Speichern fehlgeschlagen."); return; }
      setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch { setError("Netzwerkfehler."); }
    finally { setSaving(false); }
  };

  const update = (id: string, patch: Partial<Script>) => {
    setScripts(s => s.map(x => x.id === id ? { ...x, ...patch } : x));
    setDirty(true);
  };
  const remove = (id: string) => {
    if (!window.confirm("Diesen Text löschen?")) return;
    setScripts(s => s.filter(x => x.id !== id));
    setDirty(true);
  };
  const add = (kind: Kind) => {
    setScripts(s => [
      { id: `neu-${Date.now()}`, kind, title: "", text: "", createdAt: new Date().toISOString() },
      ...s,
    ]);
    setDirty(true);
  };
  const copy = async (sc: Script) => {
    try { await navigator.clipboard.writeText(sc.text); setCopiedId(sc.id); setTimeout(() => setCopiedId(""), 1800); }
    catch { setError("Kopieren nicht möglich — bitte manuell markieren."); }
  };

  // PIN-Abfrage
  if (!pin || authError) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#faf7f0] px-6">
        <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-600">LuxuryBandit</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Werbetexte</h1>
          <p className="mt-1 text-[13px] font-semibold text-slate-500">Admin-PIN eingeben.</p>
          <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && pinInput.trim()) { try { localStorage.setItem(PIN_KEY, pinInput.trim()); } catch { /**/ } setAuthError(false); setPin(pinInput.trim()); } }}
            className="mt-4 h-12 w-full rounded-xl border-[1.5px] border-slate-400 px-4 text-[15px] font-bold text-slate-900 outline-none focus:border-slate-700" />
          <button type="button"
            onClick={() => { if (!pinInput.trim()) return; try { localStorage.setItem(PIN_KEY, pinInput.trim()); } catch { /**/ } setAuthError(false); setPin(pinInput.trim()); }}
            className="mt-3 h-12 w-full rounded-xl bg-slate-800 text-[15px] font-black text-white active:scale-95 transition">
            Öffnen
          </button>
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
          <p className="text-sm font-black">Werbetexte & Bella-Sätze</p>
          <p className="truncate text-[11px] font-bold text-slate-500">{scripts.length} Texte · dauerhaft gespeichert</p>
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
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-bold text-red-600">{error}</p>}
        {loading ? (
          <p className="py-16 text-center text-[13px] font-bold text-slate-400">Lädt…</p>
        ) : GROUPS.map(g => {
          const items = scripts.filter(s => s.kind === g.kind);
          return (
            <section key={g.kind} className="mb-8">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[16px] font-black">{g.label}</h2>
                  <p className="mt-0.5 text-[12px] font-semibold text-slate-500">{g.hint}</p>
                </div>
                <button type="button" onClick={() => add(g.kind)}
                  className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-black/15 bg-white px-3 text-[12px] font-black active:scale-95 transition">
                  <Plus className="h-3.5 w-3.5" /> Neu
                </button>
              </div>

              {items.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-black/15 py-6 text-center text-[12px] font-bold text-slate-400">
                  Noch nichts hier. Mit „Neu" anlegen.
                </p>
              ) : (
                <div className="mt-3 grid gap-3">
                  {items.map(sc => (
                    <div key={sc.id} className={`rounded-2xl border p-3 ${g.accent}`}>
                      <input value={sc.title} onChange={e => update(sc.id, { title: e.target.value })}
                        placeholder="Titel — z. B. A: Der Kontrast"
                        className="w-full bg-transparent text-[14px] font-black text-slate-900 outline-none placeholder:font-bold placeholder:text-slate-400" />
                      <textarea value={sc.text} onChange={e => update(sc.id, { text: e.target.value })}
                        rows={Math.min(14, Math.max(3, sc.text.split("\n").length + 1))}
                        placeholder="Text…"
                        className="mt-2 w-full resize-y rounded-lg border border-black/10 bg-white px-3 py-2 text-[14px] font-semibold leading-relaxed text-slate-800 outline-none focus:border-slate-500" />
                      <div className="mt-2 flex items-center gap-2">
                        <button type="button" onClick={() => void copy(sc)}
                          className="flex h-9 items-center gap-1.5 rounded-lg bg-slate-800 px-3 text-[12px] font-black text-white active:scale-95 transition">
                          {copiedId === sc.id ? <><Check className="h-3.5 w-3.5" /> Kopiert</> : <><Copy className="h-3.5 w-3.5" /> Kopieren</>}
                        </button>
                        <span className="text-[11px] font-bold text-slate-400">{sc.text.length} Zeichen</span>
                        <button type="button" onClick={() => remove(sc.id)}
                          className="ml-auto flex h-9 items-center gap-1 rounded-lg border border-red-300 bg-white px-3 text-[12px] font-black text-red-600 active:scale-95 transition">
                          <Trash2 className="h-3.5 w-3.5" /> Löschen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
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
