"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, MessageCircle, Check, Users, Copy } from "lucide-react";

// Admin-Panel: die Abonnenten von „Wetter am Morgen" PRO MODEL — hinzufügen, löschen,
// abhaken und die tägliche Nachricht MANUELL per WhatsApp senden (wa.me-Link mit dem
// persönlichen /wetter-Link des Abonnenten). Später löst ein Cron das automatisch aus.
// Blendet sich für alle außer dem Admin aus (wie das Beiträge-Werkzeug).

type Sub = { id: string; name: string; email?: string; birthdate?: string; gender?: string; phone?: string; city?: string; country?: string; lang?: string; note?: string; confirmed?: boolean; unsubscribed?: boolean; createdAt: string };

const LANGS = ["ro", "de", "en"] as const;

// Vorbefüllter WhatsApp-Text pro Sprache: kurze Begrüßung + persönlicher Link.
// Schön formulierte WhatsApp-Nachricht — Bellas Ich-Stimme, Du-Form (Singular),
// mit Zeilenumbrüchen und dem persönlichen Link ganz unten.
const sendText = (lang: string, name: string, link: string) => {
  const n = (name || "").trim();
  if (lang === "de") return (
    `Guten Morgen${n ? `, ${n}` : ""}! ☀️\n\n` +
    `Ich hab dir deine Nachricht für heute vorbereitet — dein Wetter, ein neuer Look und ein lieber Gruß von mir. 💛\n` +
    `Wir schreiben uns dann im Chat.\n\n` +
    `Hier öffnen 👉 ${link}`
  );
  if (lang === "en") return (
    `Good morning${n ? `, ${n}` : ""}! ☀️\n\n` +
    `I've got your message for today ready — your weather, a new look and a little thought from me. 💛\n` +
    `Let's talk in the chat after.\n\n` +
    `Open it here 👉 ${link}`
  );
  return (
    `Bună dimineața${n ? `, ${n}` : ""}! ☀️\n\n` +
    `Ți-am pregătit mesajul de azi — vremea ta, un look nou și un gând bun de la mine. 💛\n` +
    `Vorbim după în chat.\n\n` +
    `Deschide aici 👉 ${link}`
  );
};

// Test abgelaufen? (bestätigt, nicht abgemeldet, älter als trialDays)
const trialExpired = (s: Sub, trialDays: number) =>
  !!s.confirmed && !s.unsubscribed && !!s.createdAt &&
  (Date.now() - new Date(s.createdAt).getTime()) > trialDays * 86_400_000;

export default function WetterSubscribers({ modelId = "curator-1783683672619-td4cy", modelSlug = "bella", modelName = "Model", trialDays = 7 }: {
  modelId?: string; modelSlug?: string; modelName?: string; trialDays?: number;
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
  const [botBusy, setBotBusy] = useState("");     // subId oder "all", solange der Bot sendet
  const [botMsg, setBotMsg] = useState("");       // Ergebnis-Hinweis nach dem Bot-Versand

  // Formular
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthdate, setBirthdate] = useState("");   // YYYY-MM-DD (wie im öffentlichen Formular)
  const [gender, setGender] = useState("");          // m | f | x
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [postal, setPostal] = useState("");
  const [lang, setLang] = useState<string>("ro");
  const [note, setNote] = useState("");

  const apiUrl = `/api/wetter-subscribers?model=${encodeURIComponent(modelId)}`;

  useEffect(() => {
    try {
      const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p);
      setIsAdmin(!!p && !localStorage.getItem("lb_preview_model"));
    } catch { /**/ }
    // Geteilte Links (Link kopieren / WhatsApp / Bot) gehen an echte Leute → NIE localhost.
    const raw = window.location.origin;
    setOrigin(/localhost|127\.0\.0\.1/.test(raw) ? "https://luxurybandit.com" : raw);
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
      const r = await fetch(apiUrl, { method: "POST", headers: headers(), body: JSON.stringify({ add: { name, email, birthdate, gender, phone, city, country, postal, lang, note } }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d?.error ?? "Speichern fehlgeschlagen."); return; }
      setName(""); setEmail(""); setBirthdate(""); setGender(""); setPhone(""); setCity(""); setCountry(""); setPostal(""); setNote(""); setLang("ro");
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
  const personalLink = (s: Sub) => `${origin}/themes/wetter/${encodeURIComponent(modelSlug)}?s=${encodeURIComponent(s.id)}`;
  const waLink = (s: Sub) => {
    const digits = (s.phone || "").replace(/[^\d]/g, "");
    const text = encodeURIComponent(sendText(s.lang || "ro", s.name, personalLink(s)));
    return digits ? `https://wa.me/${digits}?text=${text}` : "";
  };
  const copyLink = async (s: Sub) => {
    try { await navigator.clipboard.writeText(personalLink(s)); setCopiedId(s.id); setTimeout(() => setCopiedId(id => (id === s.id ? "" : id)), 1800); }
    catch { window.prompt("Link kopieren:", personalLink(s)); }
  };

  // Bot-Versand über die WhatsApp Cloud API (Meta) — einzeln ({ s }) oder an alle ({ all:true }).
  const botSend = async (payload: { s?: string; all?: boolean }) => {
    const key = payload.all ? "all" : String(payload.s ?? "");
    if (payload.all && !window.confirm("Tägliche Nachricht per WhatsApp-Bot an ALLE aktiven Abonnenten senden?")) return;
    setBotBusy(key); setBotMsg("");
    try {
      const r = await fetch("/api/wetter-send", { method: "POST", headers: headers(), body: JSON.stringify({ modelId, modelSlug, ...payload }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setBotMsg(d?.error ?? "Bot-Versand fehlgeschlagen."); return; }
      const failed = (d.results ?? []).filter((x: { ok: boolean }) => !x.ok);
      setBotMsg(`✅ ${d.sent}/${d.total} gesendet${failed.length ? ` · ${failed.length} fehlgeschlagen (${failed.map((x: { name: string }) => x.name).join(", ")})` : ""}${d.note ? ` · ${d.note}` : ""}`);
      if (payload.s && d.sent) setSent(prev => ({ ...prev, [payload.s as string]: true }));
    } catch { setBotMsg("Bot-Versand fehlgeschlagen."); }
    finally { setBotBusy(""); }
  };

  if (!isAdmin) return null;

  return (
    <div className="rounded-2xl border border-white/15 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/50">Nur für dich sichtbar</p>
      <h2 className="mt-1 flex items-center gap-2 text-[18px] font-black text-white"><Users className="h-4 w-4 text-black/50" /> Abonnenten <span className="text-white/40">({subs.length})</span></h2>
      <p className="mt-0.5 text-[12px] font-semibold text-white/60">Wer bekommt die tägliche Nachricht von {modelName}. Einzeln „Senden" (öffnet WhatsApp) oder „🤖 An alle" per Bot (WhatsApp Cloud API).</p>
      {/* 🤖 Bot: an ALLE aktiven Abonnenten auf einmal (Meta Cloud API). Braucht die WHATSAPP_*-Env. */}
      <button type="button" onClick={() => void botSend({ all: true })} disabled={botBusy === "all"}
        className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-[13px] font-black text-black active:scale-95 transition disabled:opacity-50">
        {botBusy === "all" ? "Sendet…" : "🤖 An alle senden (Bot)"}
      </button>
      {botMsg && <p className="mt-1.5 rounded-lg bg-black/[0.05] px-3 py-2 text-[12px] font-bold text-black/70">{botMsg}</p>}
      {/* Schnell-Überblick: an wen NICHT mehr senden. */}
      {(() => {
        const unsub = subs.filter(s => s.unsubscribed).length;
        const expired = subs.filter(s => trialExpired(s, trialDays)).length;
        return (unsub || expired) ? (
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-black">
            {unsub > 0 && <span className="text-red-400">🔴 {unsub} abgemeldet</span>}
            {expired > 0 && <span className="text-black/50">⌛ {expired} Test abgelaufen</span>}
            <span className="text-white/45">→ diesen NICHT senden</span>
          </p>
        ) : null;
      })()}

      {/* Hinzufügen */}
      <div className="mt-3 grid gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-3">
        <p className="text-[11px] font-black uppercase tracking-wide text-white/55">Neuen Abonnenten hinzufügen</p>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name — z. B. Remus"
          className="h-11 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-black" />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-Mail (z. B. aus FB-Lead) — optional" type="email" inputMode="email"
          className="h-11 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-black" />
        <div className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 focus-within:border-black">
            <span className="shrink-0 text-[11px] font-bold text-white/45">Geburtstag</span>
            <input value={birthdate} onChange={e => setBirthdate(e.target.value)} type="date"
              className="h-11 min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-white outline-none [color-scheme:dark]" />
          </label>
          <select value={gender} onChange={e => setGender(e.target.value)}
            className="h-11 rounded-lg border border-white/15 bg-white/[0.04] px-2 text-[14px] font-bold text-white outline-none focus:border-black">
            <option value="" className="bg-[#0d0b0a]">Geschlecht</option>
            <option value="m" className="bg-[#0d0b0a]">Männlich</option>
            <option value="f" className="bg-[#0d0b0a]">Weiblich</option>
            <option value="x" className="bg-[#0d0b0a]">Divers</option>
          </select>
        </div>
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefon mit Vorwahl — z. B. +40 712 345 678" inputMode="tel"
          className="h-11 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-black" />
        <input value={city} onChange={e => setCity(e.target.value)} placeholder="Stadt (fürs Wetter) — z. B. Timișoara"
          className="h-11 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-black" />
        <div className="flex gap-2">
          <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Land — z. B. România"
            className="h-11 min-w-0 flex-1 rounded-lg border border-white/15 bg-white/[0.04] px-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-black" />
          <select value={lang} onChange={e => setLang(e.target.value)}
            className="h-11 rounded-lg border border-white/15 bg-white/[0.04] px-2 text-[15px] font-bold text-white outline-none focus:border-black">
            {LANGS.map(l => <option key={l} value={l} className="bg-[#0d0b0a]">{l.toUpperCase()}</option>)}
          </select>
        </div>
        <input value={postal} onChange={e => setPostal(e.target.value)} placeholder="Postleitzahl (optional)"
          className="h-11 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-black" />
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Notiz (optional) — z. B. Freund, Test"
          className="h-11 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 text-[14px] font-medium text-white outline-none placeholder:text-white/35 focus:border-black" />
        <button type="button" onClick={() => void add()} disabled={busy}
          className="lb-onmedia flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1a160f] text-[14px] font-black text-white active:scale-95 transition disabled:opacity-50">
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
              <div key={s.id} className={`min-w-0 overflow-hidden rounded-xl border p-2.5 ${s.unsubscribed ? "border-red-500/20 bg-red-500/[0.04] opacity-60" : sent[s.id] ? "border-emerald-400/30 bg-emerald-400/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
              <div className="flex items-start gap-2">
                {/* Abhaken = „heute gesendet" (lokal). */}
                <button type="button" onClick={() => setSent(m => ({ ...m, [s.id]: !m[s.id] }))} aria-label="Als gesendet markieren"
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 transition ${sent[s.id] ? "border-emerald-400 bg-emerald-400 text-black" : "border-white/30 text-transparent"}`}>
                  <Check className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[14px] font-black text-white">
                    <span className="max-w-full break-words">{s.name}</span>
                    <span className="text-[11px] font-bold text-white/40">{(s.lang || "ro").toUpperCase()}</span>
                    {/* Status-Badge (Priorität: abgemeldet → Test abgelaufen → bestätigt/unbestätigt). */}
                    {s.unsubscribed
                      ? <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-black text-red-400">🔴 abgemeldet</span>
                      : trialExpired(s, trialDays)
                        ? <span className="rounded-full bg-black/[0.07] px-1.5 py-0.5 text-[9px] font-black text-black/55">⌛ Test abgelaufen</span>
                        : s.email && (s.confirmed
                          ? <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-black text-emerald-400">✓ bestätigt</span>
                          : <span className="rounded-full bg-black/[0.07] px-1.5 py-0.5 text-[9px] font-black text-black/55">⏳ unbestätigt</span>)}
                  </p>
                  {/* E-Mail + Telefon VOLLSTÄNDIG (umbrechend, nicht abgeschnitten). */}
                  {s.email && <p className="break-all text-[12px] font-semibold text-white/65">✉ {s.email}</p>}
                  {s.phone && <p className="break-all text-[12px] font-bold text-white/75">📞 {s.phone}</p>}
                  {[s.city, s.country, s.note].filter(Boolean).length > 0 && (
                    <p className="break-words text-[12px] font-semibold text-white/45">{[s.city, s.country, s.note].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
              </div>
              {/* Aktionen DARUNTER — volle Breite, mit Beschriftung. */}
              <div className="mt-2.5 flex items-center gap-2 border-t border-white/10 pt-2.5">
                {/* Persönlichen Link kopieren. */}
                <button type="button" onClick={() => void copyLink(s)}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 text-[12px] font-black text-white/80 active:scale-95 transition">
                  {copiedId === s.id ? <><Check className="h-4 w-4 text-emerald-400" /> Kopiert</> : <><Copy className="h-4 w-4" /> Link</>}
                </button>
                {/* Manuell senden — für Abgemeldete gesperrt (nicht weiter senden!). */}
                {s.unsubscribed ? (
                  <span className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 text-[12px] font-black text-white/25">
                    <MessageCircle className="h-4 w-4" /> Abgemeldet
                  </span>
                ) : wa ? (
                  <a href={wa} target="_blank" rel="noopener noreferrer"
                    onClick={() => setSent(m => ({ ...m, [s.id]: true }))}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] text-[12px] font-black text-black active:scale-95 transition">
                    <MessageCircle className="h-4 w-4" /> Senden
                  </a>
                ) : (
                  <span className="flex h-9 flex-1 items-center justify-center rounded-lg border border-black/20 text-[11px] font-black text-black/45">Keine Nr.</span>
                )}
                {/* 🤖 Bot: diesen einen Abonnenten direkt per WhatsApp Cloud API anschreiben. */}
                {s.phone && !s.unsubscribed && (
                  <button type="button" onClick={() => void botSend({ s: s.id })} disabled={botBusy === s.id} aria-label="Per Bot senden"
                    title="Per WhatsApp-Bot senden (kein WhatsApp-Öffnen)"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#25D366]/50 bg-[#25D366]/10 text-[15px] active:scale-95 transition disabled:opacity-40">
                    {botBusy === s.id ? "…" : "🤖"}
                  </button>
                )}
                <button type="button" onClick={() => void remove(s.id)} aria-label="Löschen"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-red-400/40 text-red-300 active:scale-95 transition">
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
