"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, MessageCircle, Check, Users, Copy } from "lucide-react";

// Admin-Panel: die Abonnenten von „Wetter am Morgen" PRO MODEL — hinzufügen, löschen,
// abhaken und die tägliche Nachricht MANUELL per WhatsApp senden (wa.me-Link mit dem
// persönlichen /wetter-Link des Abonnenten). Später löst ein Cron das automatisch aus.
// Blendet sich für alle außer dem Admin aus (wie das Beiträge-Werkzeug).

type Sub = { id: string; name: string; email?: string; birthdate?: string; gender?: string; phone?: string; city?: string; country?: string; lang?: string; note?: string; confirmed?: boolean; createdAt: string };

const LANGS = ["ro", "de", "en"] as const;

// Vorbefüllter WhatsApp-Text pro Sprache: kurze Begrüßung + persönlicher Link.
const sendText = (lang: string, name: string, link: string) => {
  const n = name || "";
  if (lang === "de") return `Guten Morgen ${n}! ☀️ Deine Nachricht von heute ist hier: ${link}`;
  if (lang === "en") return `Good morning ${n}! ☀️ Your message for today is here: ${link}`;
  return `Bună dimineața ${n}! ☀️ Mesajul tău de azi e aici: ${link}`;
};

export default function WetterSubscribers({ modelId = "curator-1783683672619-td4cy", modelSlug = "bella", modelName = "Model" }: {
  modelId?: string; modelSlug?: string; modelName?: string;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<Record<string, boolean>>({});   // lokal abgehakt = „heute gesendet"
  const [copiedId, setCopiedId] = useState("");
  const [origin, setOrigin] = useState("");

  // Formular
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [lang, setLang] = useState<string>("ro");
  const [note, setNote] = useState("");

  const apiUrl = `/api/wetter-subscribers?model=${encodeURIComponent(modelId)}`;

  useEffect(() => {
    try {
      const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p);
      setIsAdmin(!!p && !localStorage.getItem("lb_preview_model"));
    } catch { /**/ }
    setOrigin(window.location.origin);
  }, []);

  const headers = () => ({ "Content-Type": "application/json", "x-try-look-admin-pin": pin });

  const load = async () => {
    try {
      const r = await fetch(apiUrl, { headers: { "x-try-look-admin-pin": pin }, cache: "no-store" });
      if (r.ok) { const d = await r.json(); setSubs(d.subscribers ?? []); }
    } catch { /**/ } finally { setLoading(false); }
  };
  useEffect(() => { if (isAdmin && pin) void load(); else setLoading(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isAdmin, pin]);

  const add = async () => {
    if (!name.trim()) { setError("Name fehlt."); return; }
    setBusy(true); setError("");
    try {
      const r = await fetch(apiUrl, { method: "POST", headers: headers(), body: JSON.stringify({ add: { name, phone, city, country, lang, note } }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d?.error ?? "Speichern fehlgeschlagen."); return; }
      setName(""); setPhone(""); setCity(""); setCountry(""); setNote(""); setLang("ro");
      await load();
    } catch { setError("Netzwerkfehler."); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Diesen Abonnenten löschen?")) return;
    setSubs(s => s.filter(x => x.id !== id));
    try { await fetch(apiUrl, { method: "POST", headers: headers(), body: JSON.stringify({ remove: id }) }); }
    catch { setError("Löschen fehlgeschlagen."); void load(); }
  };

  // Persönlicher Link = unsichtbare Kennung `?s=` (kein Name/Telefon in der URL) + WhatsApp-Adresse.
  const personalLink = (s: Sub) => `${origin}/wetter/${encodeURIComponent(modelSlug)}?s=${encodeURIComponent(s.id)}`;
  const waLink = (s: Sub) => {
    const digits = (s.phone || "").replace(/[^\d]/g, "");
    const text = encodeURIComponent(sendText(s.lang || "ro", s.name, personalLink(s)));
    return digits ? `https://wa.me/${digits}?text=${text}` : "";
  };
  const copyLink = async (s: Sub) => {
    try { await navigator.clipboard.writeText(personalLink(s)); setCopiedId(s.id); setTimeout(() => setCopiedId(id => (id === s.id ? "" : id)), 1800); }
    catch { window.prompt("Link kopieren:", personalLink(s)); }
  };

  if (!isAdmin) return null;

  return (
    <div className="mt-4 rounded-2xl border border-white/15 bg-white/[0.04] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c9a23f]">Nur für dich sichtbar</p>
      <h2 className="mt-1 flex items-center gap-2 text-[18px] font-black text-white"><Users className="h-4 w-4 text-[#c9a23f]" /> Abonnenten <span className="text-white/40">({subs.length})</span></h2>
      <p className="mt-0.5 text-[12px] font-semibold text-white/60">Wer bekommt die tägliche Nachricht von {modelName}. Jetzt manuell per WhatsApp senden — später automatisch.</p>

      {/* Hinzufügen */}
      <div className="mt-3 grid gap-2 rounded-xl border border-[#c9a23f]/30 bg-[#c9a23f]/[0.05] p-3">
        <p className="text-[11px] font-black uppercase tracking-wide text-white/55">Neuen Abonnenten hinzufügen</p>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name — z. B. Remus"
          className="h-11 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#c9a23f]" />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefon mit Vorwahl — z. B. +40 712 345 678" inputMode="tel"
          className="h-11 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#c9a23f]" />
        <input value={city} onChange={e => setCity(e.target.value)} placeholder="Stadt (fürs Wetter) — z. B. Timișoara"
          className="h-11 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#c9a23f]" />
        <div className="flex gap-2">
          <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Land — z. B. România"
            className="h-11 min-w-0 flex-1 rounded-lg border border-white/15 bg-white/[0.04] px-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#c9a23f]" />
          <select value={lang} onChange={e => setLang(e.target.value)}
            className="h-11 rounded-lg border border-white/15 bg-white/[0.04] px-2 text-[15px] font-bold text-white outline-none focus:border-[#c9a23f]">
            {LANGS.map(l => <option key={l} value={l} className="bg-[#0d0b0a]">{l.toUpperCase()}</option>)}
          </select>
        </div>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Notiz (optional) — z. B. Freund, Test"
          className="h-11 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 text-[14px] font-medium text-white outline-none placeholder:text-white/35 focus:border-[#c9a23f]" />
        <button type="button" onClick={() => void add()} disabled={busy}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#c9a23f] text-[14px] font-black text-black active:scale-95 transition disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Hinzufügen
        </button>
      </div>

      {error && <p className="mt-2 rounded-lg bg-red-500/15 px-3 py-2 text-[12px] font-bold text-red-300">{error}</p>}

      {/* Liste als Checkliste */}
      {loading ? (
        <p className="py-6 text-center text-[12px] font-bold text-white/40">Lädt…</p>
      ) : subs.length === 0 ? (
        <p className="py-6 text-center text-[12px] font-bold text-white/40">Noch keine Abonnenten. Trag dich oben selbst ein und teste.</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-2">
          {subs.map(s => {
            const wa = waLink(s);
            return (
              <div key={s.id} className={`flex min-w-0 items-center gap-2 overflow-hidden rounded-xl border p-2.5 ${sent[s.id] ? "border-emerald-400/30 bg-emerald-400/[0.06]" : "border-white/10 bg-black/30"}`}>
                {/* Abhaken = „heute gesendet" (lokal). */}
                <button type="button" onClick={() => setSent(m => ({ ...m, [s.id]: !m[s.id] }))} aria-label="Als gesendet markieren"
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 transition ${sent[s.id] ? "border-emerald-400 bg-emerald-400 text-black" : "border-white/30 text-transparent"}`}>
                  <Check className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-black text-white">
                    {s.name} <span className="text-[11px] font-bold text-white/40">{(s.lang || "ro").toUpperCase()}</span>
                    {s.email && (s.confirmed
                      ? <span className="ml-1.5 rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-black text-emerald-400 align-middle">✓ bestätigt</span>
                      : <span className="ml-1.5 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-black text-amber-400 align-middle">⏳ unbestätigt</span>)}
                  </p>
                  <p className="truncate text-[12px] font-semibold text-white/55">
                    {[s.email, s.city, s.country, s.phone, s.note].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                {/* Aktionen als kompakter Icon-Block — schrumpft nicht, läuft nie aus dem Bild. */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {/* Persönlichen Link kopieren — für jeden Kanal (WhatsApp, SMS, überall). */}
                  <button type="button" onClick={() => void copyLink(s)} aria-label="Link kopieren"
                    className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 text-white/75 active:scale-95 transition">
                    {copiedId === s.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                  {/* Manuell senden — öffnet WhatsApp mit vorbefülltem Text + persönlichem Link (Icon-only). */}
                  {wa ? (
                    <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Per WhatsApp senden"
                      onClick={() => setSent(m => ({ ...m, [s.id]: true }))}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-[#25D366] text-black active:scale-95 transition">
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber-400/30 text-[9px] font-black leading-tight text-amber-400/70">Nr?</span>
                  )}
                  <button type="button" onClick={() => void remove(s.id)} aria-label="Löschen"
                    className="grid h-9 w-9 place-items-center rounded-lg border border-red-400/40 text-red-300 active:scale-95 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
