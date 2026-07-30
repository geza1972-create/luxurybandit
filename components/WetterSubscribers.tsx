"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, MessageCircle, Check, Users, Copy, Upload } from "lucide-react";

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

// Die eigene Adresse des Owners — ihr Eintrag steht in der Liste immer an erster Stelle.
const OWNER_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "geza1972@gmail.com").trim().toLowerCase();

// Test abgelaufen? (bestätigt, nicht abgemeldet, älter als trialDays)
const trialExpired = (s: Sub, trialDays: number) =>
  !!s.confirmed && !s.unsubscribed && !!s.createdAt &&
  (Date.now() - new Date(s.createdAt).getTime()) > trialDays * 86_400_000;

export default function WetterSubscribers({ modelId = "curator-1783683672619-td4cy", modelSlug = "bella", modelName = "Model", trialDays = 7, linkPath, sending = true, listLabel }: {
  modelId?: string; modelSlug?: string; modelName?: string; trialDays?: number;
  // EIGENE LISTE OHNE WETTER-VERSAND (Owner-Regel: „Die Wetter Leads sind die Wetter Leads").
  //
  // Die Kissing-Leads haben sich für etwas anderes eingetragen. Ihre Liste liegt deshalb in
  // einer eigenen Datei — und die Versandknöpfe bleiben hier AUS, weil E-Mail, SMS und Bot
  // fest die Wetter-Nachricht bauen (Wetterlage, Wetter-Link). Ein Klick darauf würde
  // ihnen etwas schicken, wofür sie sich nie angemeldet haben.
  linkPath?: string;      // Ziel des persönlichen Links, Vorgabe: /themes/wetter/<slug>
  sending?: boolean;      // false = nur verwalten (ansehen, ergänzen, löschen, importieren)
  listLabel?: string;     // Überschrift, z. B. „Kissing-Leads"
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [subs, setSubs] = useState<Sub[]>([]);
  // wer den Link geöffnet hat — und was danach passiert ist (Chat / Angebots-Karte)
  const [clicks, setClicks] = useState<Record<string, { count: number; lastAt: string; src?: string; chat?: number; chatAt?: string; test?: number; testAt?: string; testWhat?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<Record<string, boolean>>({});   // nach Versand grün markiert = „heute gesendet"
  const [selected, setSelected] = useState<Set<string>>(new Set()); // Kästchen = ausgewählt zum Senden
  const [armSend, setArmSend] = useState("");                       // Zwei-Tipp-Bestätigung (kein window.confirm — Handy)
  const [copiedId, setCopiedId] = useState("");
  const [origin, setOrigin] = useState("");
  const [botBusy, setBotBusy] = useState("");     // subId oder "all", solange der Bot sendet
  const [botMsg, setBotMsg] = useState("");       // Ergebnis-Hinweis nach dem Bot-Versand
  const [mailBusy, setMailBusy] = useState(false); // solange die E-Mail-Blast läuft
  const [mailMsg, setMailMsg] = useState("");      // Ergebnis-Hinweis nach dem E-Mail-Versand
  const [impBusy, setImpBusy] = useState(false);   // Meta-CSV-Import läuft
  const [impMsg, setImpMsg] = useState("");        // Ergebnis des Imports
  const csvRef = useRef<HTMLInputElement>(null);

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
      if (r.ok) { const d = await r.json(); setSubs(d.subscribers ?? []); setClicks(d.clicks ?? {}); }
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
  const personalLink = (s: Sub) =>
    `${origin}${linkPath ?? `/themes/wetter/${encodeURIComponent(modelSlug)}`}?s=${encodeURIComponent(s.id)}`;
  const waLink = (s: Sub) => {
    const digits = (s.phone || "").replace(/[^\d]/g, "");
    const text = encodeURIComponent(sendText(s.lang || "ro", s.name, personalLink(s)));
    return digits ? `https://wa.me/${digits}?text=${text}` : "";
  };
  const copyLink = async (s: Sub) => {
    try { await navigator.clipboard.writeText(personalLink(s)); setCopiedId(s.id); setTimeout(() => setCopiedId(id => (id === s.id ? "" : id)), 1800); }
    catch { window.prompt("Link kopieren:", personalLink(s)); }
  };

  // Auswahl: nur Abonnenten mit Nummer, die nicht abgemeldet sind, sind sendbar.
  const selectable = subs.filter(s => !!s.phone && !s.unsubscribed);
  const allSelected = selectable.length > 0 && selectable.every(s => selected.has(s.id));
  const toggleSel = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map(s => s.id)));

  // Bot-Versand über die WhatsApp Cloud API (Meta) — einzeln ({ s }), an eine Auswahl ({ ids }) oder an alle ({ all:true }).
  const botSend = async (payload: { s?: string; all?: boolean; ids?: string[] }) => {
    const key = payload.all ? "all" : payload.ids ? "selected" : String(payload.s ?? "");
    setBotBusy(key); setBotMsg("");
    try {
      const r = await fetch("/api/wetter-send", { method: "POST", headers: headers(), body: JSON.stringify({ modelId, modelSlug, ...payload }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setBotMsg(d?.error ?? "Bot-Versand fehlgeschlagen."); return; }
      const failed = (d.results ?? []).filter((x: { ok: boolean }) => !x.ok);
      setBotMsg(`✅ ${d.sent}/${d.total} gesendet${failed.length ? ` · ${failed.length} fehlgeschlagen (${failed.map((x: { name: string }) => x.name).join(", ")})` : ""}${d.note ? ` · ${d.note}` : ""}`);
      // Erfolgreich Versendete grün abhaken; bei Auswahl-Versand die Auswahl leeren.
      const doneIds = payload.ids ?? (payload.s ? [payload.s] : []);
      if (d.sent && doneIds.length) setSent(prev => { const n = { ...prev }; doneIds.forEach(i => { n[i] = true; }); return n; });
      if (payload.ids) setSelected(new Set());
    } catch { setBotMsg("Bot-Versand fehlgeschlagen."); }
    finally { setBotBusy(""); }
  };

  // „An N senden": erster Tipp schärft (Handy-sicher, kein window.confirm), zweiter sendet.
  // channel „mail" = E-Mail (funktioniert immer), „bot" = WhatsApp (nur Test-Nummern-Liste).
  const sendSelected = (channel: "mail" | "bot") => {
    if (selected.size === 0) return;
    if (armSend !== channel) { setArmSend(channel); setTimeout(() => setArmSend(a => (a === channel ? "" : a)), 4000); return; }
    setArmSend("");
    if (channel === "mail") void mailSend({ ids: [...selected] });
    else void botSend({ ids: [...selected] });
  };

  // E-Mail-Versand über den Hostinger-SMTP an ALLE aktiven Abonnenten mit E-Mail
  // (die tägliche „Guten Morgen"-Mail mit persönlichem Link). Braucht die SMTP_*-Env.
  const mailSend = async (payload: { ids?: string[]; all?: boolean }) => {
    setMailBusy(true); setMailMsg("");
    try {
      const r = await fetch("/api/wetter-email-blast", { method: "POST", headers: headers(), body: JSON.stringify({ modelId, modelSlug, ...payload }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMailMsg(d?.error ?? "E-Mail-Versand fehlgeschlagen."); return; }
      const failed = (d.results ?? []).filter((x: { ok: boolean }) => !x.ok);
      setMailMsg(`✅ ${d.sent}/${d.total} E-Mails gesendet${failed.length ? ` · ${failed.length} fehlgeschlagen` : ""}${d.note ? ` · ${d.note}` : ""}`);
      const doneIds = payload.ids ?? [];
      if (d.sent && doneIds.length) setSent(prev => { const n = { ...prev }; doneIds.forEach(i => { n[i] = true; }); return n; });
      if (payload.ids) setSelected(new Set());
    } catch { setMailMsg("E-Mail-Versand fehlgeschlagen."); }
    finally { setMailBusy(false); }
  };

  // SMS an die AUSGEWÄHLTEN — ohne Meta, ohne Vorlagen (Owner 28.07.2026). Kostet echtes
  // Geld pro Nachricht, deshalb genau wie beim Mail-Versand: erster Tipp schärft, zweiter sendet.
  const [smsBusy, setSmsBusy] = useState(false);
  const [smsMsg, setSmsMsg] = useState("");
  const smsSend = async (payload: { ids?: string[]; all?: boolean }) => {
    setSmsBusy(true); setSmsMsg("");
    try {
      const r = await fetch("/api/wetter-sms", { method: "POST", headers: headers(), body: JSON.stringify({ modelId, modelSlug, ...payload }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setSmsMsg(d?.error ?? "SMS-Versand fehlgeschlagen."); return; }
      const failed = (d.results ?? []).filter((x: { ok: boolean }) => !x.ok);
      setSmsMsg(`✅ ${d.sent}/${d.total} SMS gesendet${failed.length ? ` · ${failed.length} fehlgeschlagen (${failed[0]?.error ?? ""})` : ""}${d.note ? ` · ${d.note}` : ""}`);
      if (payload.ids) setSelected(new Set());
    } catch { setSmsMsg("SMS-Versand fehlgeschlagen."); }
    finally { setSmsBusy(false); }
  };

  // Meta-Lead-CSV importieren. Metas Export ist UTF-16 + TAB-getrennt (Excel-Variante);
  // Komma-CSV wird ebenfalls erkannt. Spalten: email, full_name, phone_number, city.
  // Der Server dedupliziert per E-Mail/Telefon — dieselbe Datei zweimal schadet nicht.
  const importCsv = async (file: File) => {
    setImpBusy(true); setImpMsg("");
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // UTF-16 erkennen: BOM oder viele Null-Bytes (Metas Excel-Export).
      const isUtf16 = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff)
        || bytes.slice(0, 200).filter(b => b === 0).length > 20;
      const text = new TextDecoder(isUtf16 ? "utf-16" : "utf-8").decode(bytes);
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setImpMsg("Datei enthält keine Zeilen."); return; }
      const sep = lines[0].includes("\t") ? "\t" : ",";
      const strip = (s: string) => s.trim().replace(/^"|"$/g, "").trim();
      const head = lines[0].split(sep).map(h => strip(h).toLowerCase());
      const col = (...names: string[]) => head.findIndex(h => names.includes(h));
      const iMail = col("email", "e-mail"), iName = col("full_name", "name"), iPhone = col("phone_number", "phone"), iCity = col("city");
      if (iMail < 0 && iPhone < 0) { setImpMsg("Weder E-Mail- noch Telefon-Spalte gefunden."); return; }
      const rows = lines.slice(1).map(l => l.split(sep).map(strip));
      const addMany = rows.map(r => ({
        email: iMail >= 0 ? (r[iMail] ?? "") : "",
        name: iName >= 0 ? (r[iName] ?? "") : "",
        // Meta schreibt "p:+40712…" — das Präfix entfernen.
        phone: iPhone >= 0 ? (r[iPhone] ?? "").replace(/^p:/i, "") : "",
        city: iCity >= 0 ? (r[iCity] ?? "") : "",
        note: `Meta-Lead · ${file.name.slice(0, 60)}`,
      })).filter(x => x.email || x.phone);
      if (!addMany.length) { setImpMsg("Keine verwertbaren Zeilen gefunden."); return; }
      const r = await fetch(apiUrl, { method: "POST", headers: headers(), body: JSON.stringify({ addMany }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setImpMsg(d?.error ?? "Import fehlgeschlagen."); return; }
      setImpMsg(`✅ ${d.added} neu importiert · ${d.skipped} übersprungen (schon vorhanden) · ${d.total} gesamt.`);
      await load();
    } catch (e) {
      setImpMsg(`Import fehlgeschlagen: ${e instanceof Error ? e.message : "unbekannt"}`);
    } finally { setImpBusy(false); }
  };

  if (!isAdmin) return null;

  return (
    <div className="rounded-2xl border border-white/15 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/50">Nur für dich sichtbar</p>
      <h2 className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[18px] font-black text-white"><Users className="h-4 w-4 text-black/50" /> {listLabel ?? "Abonnenten"} <span className="text-white/40">({subs.length})</span>
        {(() => {
          // Der Verlauf einer Aussendung in einer Zeile: geöffnet → getestet → geschrieben.
          const opened = subs.filter(s => clicks[s.id]?.count).length;
          const tested = subs.filter(s => clicks[s.id]?.test).length;
          const chatted = subs.filter(s => clicks[s.id]?.chat).length;
          return (
            <>
              {opened > 0 && <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-black text-emerald-400">👁 {opened} geöffnet</span>}
              {tested > 0 && <span className="rounded-full bg-[#f6cf51]/20 px-2 py-0.5 text-[11px] font-black text-[#f6cf51]">✨ {tested} getestet</span>}
              {chatted > 0 && <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[11px] font-black text-sky-400">💬 {chatted} geschrieben</span>}
            </>
          );
        })()}
      </h2>
      {!sending && (
        <p className="mt-0.5 text-[12px] font-semibold text-white/60">
          Eigene Liste — getrennt von den Wetter-Abonnenten. Ansehen, ergänzen, löschen, importieren.
          Der Wetter-Versand ist hier bewusst aus: diese Leute haben sich für etwas anderes eingetragen.
        </p>
      )}
      {sending && <p className="mt-0.5 text-[12px] font-semibold text-white/60">Wer bekommt die tägliche Nachricht von {modelName}. Wähle unten die Empfänger (einzeln oder „Alle") und sende — <b>per E-Mail (empfohlen, geht an alle)</b>. Der WhatsApp-Bot erreicht mit der Test-Nummer nur die bei Meta freigegebenen Nummern.</p>}
      {/* Empfänger-Auswahl (Kästchen unten). „Alle" wählt alle mit Nummer/E-Mail. */}
      {sending && <>
      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={selectAll}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-white/20 px-3 text-[12px] font-black text-white/80 active:scale-95 transition">
          {allSelected ? "Keine" : "Alle"} <span className="text-white/40">({selectable.length})</span>
        </button>
        <span className="text-[12px] font-black text-white/60">{selected.size} ausgewählt</span>
      </div>
      {/* Zwei Kanäle für die AUSGEWÄHLTEN. E-Mail primär (geht wirklich raus), Bot zweitrangig. */}
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => sendSelected("mail")} disabled={selected.size === 0 || mailBusy}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-black active:scale-95 transition disabled:opacity-40 ${armSend === "mail" ? "bg-red-500 text-white" : "lb-onmedia bg-[#1a160f] text-white"}`}>
          {mailBusy ? "Sendet…" : armSend === "mail" ? `Wirklich an ${selected.size}?` : `📧 E-Mail an ${selected.size}`}
        </button>
        <button type="button" onClick={() => { if (selected.size === 0) return; if (armSend !== "sms") { setArmSend("sms"); setTimeout(() => setArmSend(a => (a === "sms" ? "" : a)), 4000); return; } setArmSend(""); void smsSend({ ids: [...selected] }); }}
          disabled={selected.size === 0 || smsBusy}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-black active:scale-95 transition disabled:opacity-40 ${armSend === "sms" ? "bg-red-500 text-white" : "bg-[#f6cf51] text-black"}`}>
          {smsBusy ? "Sendet…" : armSend === "sms" ? `Wirklich an ${selected.size}?` : `💬 SMS an ${selected.size}`}
        </button>
        <button type="button" onClick={() => sendSelected("bot")} disabled={selected.size === 0 || botBusy === "selected"}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-[12px] font-black active:scale-95 transition disabled:opacity-40 ${armSend === "bot" ? "bg-red-500 text-white" : "bg-[#25D366] text-black"}`}>
          {botBusy === "selected" ? "Sendet…" : armSend === "bot" ? `Wirklich an ${selected.size}?` : `🤖 WhatsApp an ${selected.size}`}
        </button>
      </div>
      {/* TEST an mich selbst: schickt die heutige Mail nur an die Owner-Adresse. Ein Tap,
          ohne Auswahl, ohne Risiko, dass versehentlich die ganze Liste losgeht. */}
      <button type="button"
        onClick={() => { const me = subs.find(x => String(x.email ?? "").toLowerCase() === OWNER_EMAIL); if (me) void mailSend({ ids: [me.id] }); else setMailMsg(`${OWNER_EMAIL} steht nicht in der Liste — oben eintragen, dann testen.`); }}
        disabled={mailBusy}
        className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-white/25 px-3 text-[12px] font-black text-white/85 active:scale-95 transition disabled:opacity-40">
        🧪 {mailBusy ? "Sendet…" : "Testmail an mich"}
      </button>
      {smsMsg && <p className="mt-1 text-[12px] font-bold text-[#f6cf51]">{smsMsg}</p>}
      {mailMsg && <p className="mt-1.5 rounded-lg bg-black/[0.05] px-3 py-2 text-[12px] font-bold text-black/70">{mailMsg}</p>}
      {botMsg && <p className="mt-1.5 rounded-lg bg-black/[0.05] px-3 py-2 text-[12px] font-bold text-black/70">{botMsg}</p>}
      </>}
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

      {/* Meta-Lead-CSV importieren (Sammel-Import, dedupliziert serverseitig) */}
      <button type="button" onClick={() => csvRef.current?.click()} disabled={impBusy}
        className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-black/15 bg-black/[0.03] text-[13px] font-black text-white/80 active:scale-95 transition disabled:opacity-50">
        {impBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {impBusy ? "Importiere…" : "Meta-Lead-CSV importieren"}
      </button>
      <input ref={csvRef} type="file" accept=".csv,text/csv,text/plain" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ""; }} />
      {impMsg && <p className="mt-1.5 rounded-lg bg-black/[0.05] px-3 py-2 text-[12px] font-bold text-black/70">{impMsg}</p>}

      {/* Hinzufügen */}
      {/* `grid-cols-1` ist hier PFLICHT, nicht Schmuck: ein Raster ohne Spaltenangabe misst die
          Spalte nach dem breitesten Inhalt, und die langen Platzhaltertexte („Telefon mit
          Vorwahl — z. B. …") haben die Felder 22 px über den Kasten hinausgedrückt. Tailwinds
          grid-cols-1 setzt minmax(0,1fr) und deckelt das. */}
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-3">
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
          {/* Owner-Eintrag (Gerry) steht IMMER oben — er testet den Versand an sich selbst,
              und in einer Liste mit 50 Namen sucht man ihn sonst jedes Mal. */}
          {[...subs].sort((a, b) => {
            const own = (x: typeof a) => (String(x.email ?? "").toLowerCase() === OWNER_EMAIL ? 0 : 1);
            return own(a) - own(b);
          }).map(s => {
            const wa = waLink(s);
            return (
              <div key={s.id} className={`min-w-0 overflow-hidden rounded-xl border p-2.5 ${s.unsubscribed ? "border-red-500/20 bg-red-500/[0.04] opacity-60" : selected.has(s.id) ? "border-emerald-400/60 bg-emerald-400/[0.09]" : sent[s.id] ? "border-emerald-400/30 bg-emerald-400/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
              <div className="flex items-start gap-2">
                {/* Kästchen = zum Senden AUSWÄHLEN. Abgemeldete / ohne Nummer sind nicht wählbar. */}
                <button type="button" onClick={() => toggleSel(s.id)} disabled={!!s.unsubscribed || !s.phone} aria-label="Zum Senden auswählen"
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 transition disabled:opacity-30 ${selected.has(s.id) ? "border-emerald-400 bg-emerald-400 text-black" : sent[s.id] ? "border-emerald-400/50 text-emerald-400" : "border-white/30 text-transparent"}`}>
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
                    {/* Hat den Link (E-Mail/WhatsApp) geöffnet? */}
                    {clicks[s.id]?.chat ? (
                      <span className="rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-black text-sky-500"
                        title={`${clicks[s.id].chat}× geschrieben`}>
                        💬 Chat {new Date(clicks[s.id].chatAt as string).toLocaleDateString()}
                      </span>
                    ) : null}
                    {clicks[s.id]?.test ? (
                      <span className="rounded-full bg-[#f6cf51]/25 px-1.5 py-0.5 text-[9px] font-black text-[#a07b00]"
                        title={`${clicks[s.id].test}× · ${clicks[s.id].testWhat || ""}`}>
                        ✨ {clicks[s.id].testWhat || "getestet"}
                      </span>
                    ) : null}
                    {clicks[s.id]?.count ? (
                      <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-black text-emerald-500" title={`${clicks[s.id].count}× · ${clicks[s.id].src || ""}`}>
                        👁 geöffnet {new Date(clicks[s.id].lastAt).toLocaleDateString()}
                      </span>
                    ) : null}
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
                {!sending ? null : s.unsubscribed ? (
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
                {sending && s.phone && !s.unsubscribed && (
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
