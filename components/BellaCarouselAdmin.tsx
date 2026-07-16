"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ModelCard from "@/components/ModelCard";

const PIN_KEY = "luxurybandit-try-look-admin-pin";
const pin = () => { try { return localStorage.getItem("lb_preview_model") ? "" : (localStorage.getItem(PIN_KEY) ?? ""); } catch { return ""; } };

type Slide = { id: string; kind: "image" | "video"; title: string; caption: string; hidden: boolean; pages: string[] | null; customer: string; order: number | null; mediaUrl: string; posterUrl: string };
type Customer = { email: string; name: string; provider?: string; createdAt?: string; videoCredits: number; purchases: { type: string; label: string; date?: string }[]; videoNote: string; emails: { subject: string; sentAt: string }[] };
type Staged = { path: string; url: string };
type SavedPrompt = { id: string; kind: "image" | "video" | "voice"; text: string };
const SURFACES = [{ key: "profile", label: "Profile" }, { key: "lp-journey", label: "LP-Journey" }, { key: "lp-own-model", label: "LP-Own-Model" }];

// Prompt library for one generation kind: save the current prompt, click a saved one to load it,
// ✕ to delete.
function PromptLibrary({ kind, current, prompts, onSave, onPick, onDelete }: {
  kind: "image" | "video"; current: string; prompts: SavedPrompt[];
  onSave: (text: string) => void; onPick: (text: string) => void; onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const list = prompts.filter(p => p.kind === kind);
  const saved = list.some(p => p.text === current.trim());
  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onSave(current)} disabled={!current.trim() || saved}
          className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-black text-amber-300 active:scale-95 disabled:opacity-40">
          {saved ? "✓ Gespeichert" : "💾 Prompt speichern"}
        </button>
        {list.length > 0 && (
          <button type="button" onClick={() => setOpen(v => !v)}
            className="rounded-md border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] font-black text-white/70 active:scale-95">
            📚 Bibliothek ({list.length}) {open ? "▲" : "▼"}
          </button>
        )}
      </div>
      {open && list.length > 0 && (
        <div className="mt-1.5 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-1.5">
          {list.map(p => (
            <div key={p.id} className={`flex items-start gap-1.5 rounded border bg-black/20 p-1.5 ${p.text === current.trim() ? "border-amber-400/50" : "border-white/10"}`}>
              <button type="button" onClick={() => { onPick(p.text); setOpen(false); }} className="min-w-0 flex-1 whitespace-pre-wrap break-words text-left text-[11px] leading-snug text-white/70">{p.text}</button>
              <button type="button" onClick={() => onDelete(p.id)} aria-label="Löschen" className="shrink-0 rounded border border-red-400/40 px-1.5 text-[11px] font-black text-red-300 active:scale-95">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
// Default generation prompts (shown + editable so the admin sees & can extend what's used).
const IMG_PROMPT_DEFAULT = "Editorial boudoir portrait, elegant and tasteful, soft studio lighting, full coverage lingerie.";
const VID_PROMPT_DEFAULT = "Subtle, natural cinematic movement for 5 seconds; gentle breathing and hair motion; keep the face and outfit unchanged.";

// Admin-only "Card Studio": generate/upload media into a LIBRARY, write AI captions, pick which
// go on the card (per surface), hide/show, replace, and turn images into videos.
export default function BellaCarouselAdmin() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState("");   // "" = general card; else a customer email
  const [preview, setPreview] = useState<any>(null);   // live card preview of the current scope
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyDone, setNotifyDone] = useState("");
  const [showEmails, setShowEmails] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("This is Peter");
  const [imgCaption, setImgCaption] = useState("");
  const [vidCaption, setVidCaption] = useState("");
  const [imgPrompt, setImgPrompt] = useState(IMG_PROMPT_DEFAULT);
  const [vidPrompt, setVidPrompt] = useState(VID_PROMPT_DEFAULT);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [lightbox, setLightbox] = useState<{ url: string; kind: "image" | "video" } | null>(null);
  const [stagedImg, setStagedImg] = useState<Staged | null>(null);
  const [stagedVid, setStagedVid] = useState<Staged | null>(null);

  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<{ id: string; kind: "image" | "video" } | null>(null);

  // Lingerie generator
  const [garments, setGarments] = useState<{ id: string; name: string; thumb: string }[]>([]);
  const [garmentId, setGarmentId] = useState("");
  const [gen, setGen] = useState<{ imageUrl: string; path: string; garmentName: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState("");
  const [genVideo, setGenVideo] = useState<Staged | null>(null);
  const [vidBusy, setVidBusy] = useState(false);

  const authH = () => ({ "Content-Type": "application/json", "x-try-look-admin-pin": pin() });
  // Admin GET sends the PIN → returns the FULL library (incl. hidden).
  const load = () => fetch("/api/bella-carousel", { headers: { "x-try-look-admin-pin": pin() } }).then(r => r.json()).then(d => setSlides(d.slides ?? [])).catch(() => {});
  const loadCustomers = () => fetch("/api/customers", { headers: { "x-try-look-admin-pin": pin() } }).then(r => r.json()).then(d => setCustomers(d.customers ?? [])).catch(() => {});
  useEffect(() => {
    setIsAdmin(!!pin());
    load();
    loadCustomers();
    loadPrompts();
    fetch("/api/bella-lingerie", { headers: { "x-try-look-admin-pin": pin() } })
      .then(r => r.json()).then(d => setGarments(d.garments ?? [])).catch(() => {});
  }, []);

  const loadPrompts = () => fetch("/api/prompts", { headers: { "x-try-look-admin-pin": pin() } }).then(r => r.json()).then(d => setPrompts(d.prompts ?? [])).catch(() => {});
  const savePrompt = async (kind: "image" | "video" | "voice", text: string) => {
    if (!text.trim()) return;
    const res = await fetch("/api/prompts", { method: "POST", headers: authH(), body: JSON.stringify({ add: { kind, text } }) }).then(r => r.json());
    if (res?.ok) setPrompts(res.prompts ?? []);
  };
  const deletePrompt = async (id: string) => {
    const res = await fetch("/api/prompts", { method: "POST", headers: authH(), body: JSON.stringify({ remove: id }) }).then(r => r.json());
    if (res?.ok) setPrompts(res.prompts ?? []);
  };

  const loadPreview = (cust: string) => fetch(`/api/bella-card-preview${cust ? `?customer=${encodeURIComponent(cust)}` : ""}`, { headers: { "x-try-look-admin-pin": pin() } })
    .then(r => r.json()).then(d => setPreview(d.card ?? null)).catch(() => {});
  useEffect(() => { if (isAdmin) void loadPreview(customer); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [customer, isAdmin]);

  const post = (payload: object) => fetch("/api/bella-carousel", { method: "POST", headers: authH(), body: JSON.stringify(payload) }).then(r => r.json());
  const applyResult = (res: any) => { if (res?.ok) { setSlides(res.slides ?? []); void loadPreview(customer); router.refresh(); } return res; };

  const notifyCustomer = async () => {
    if (!customer) return;
    setNotifyDone(""); setNotifyBusy(true);
    try {
      const res = await fetch("/api/notify-customer", { method: "POST", headers: authH(), body: JSON.stringify({ email: customer }) }).then(r => r.json());
      setNotifyDone(res?.ok ? "✓ Nachricht gesendet" : (res?.error || "Fehler"));
      if (res?.ok) void loadCustomers();   // refresh the email history
    } catch { setNotifyDone("Fehler"); }
    finally { setNotifyBusy(false); }
  };
  // Slides in the currently-selected scope (general card, or one customer), already sorted by the API.
  const scoped = slides.filter(s => (s.customer || "") === customer).sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));

  // Move a slide up/down within its scope — instant (optimistic), persisted in the background.
  const move = (id: string, dir: "up" | "down") => {
    const ids = scoped.map(s => s.id);
    const i = ids.indexOf(id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const orderMap = new Map(ids.map((sid, idx) => [sid, idx]));
    setSlides(prev => prev.map(s => orderMap.has(s.id) ? { ...s, order: orderMap.get(s.id)! } : s));
    post({ reorder: ids }).catch(() => {});
  };

  // Auto-generate a title + caption from a brief (used when the admin leaves the text empty).
  const autoText = async (brief: string, kind: "image" | "video"): Promise<{ title?: string; caption?: string }> => {
    try {
      const res = await fetch("/api/bella-caption", { method: "POST", headers: authH(), body: JSON.stringify({ brief: brief || "a moment from Bella's journey", kind }) }).then(r => r.json());
      return { title: res?.title || undefined, caption: res?.caption || undefined };
    } catch { return {}; }
  };

  const storageUpload = async (file: File, kind: "image" | "video"): Promise<string | null> => {
    const ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase();
    const sign = await post({ sign: true, kind, ext });
    if (!sign?.uploadUrl) return null;
    const put = await fetch(sign.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || (kind === "video" ? "video/mp4" : "image/jpeg"), "x-upsert": "true" }, body: file });
    return put.ok ? sign.path : null;
  };

  const stageFile = async (file: File, kind: "image" | "video") => {
    setErr("");
    const okType = kind === "video" ? file.type.startsWith("video/") : file.type.startsWith("image/");
    if (!okType) { setErr(`Bitte eine ${kind === "video" ? "Video" : "Bild"}-Datei wählen.`); return; }
    if (file.size > 250 * 1024 * 1024) { setErr("Datei zu groß (max. 250 MB)."); return; }
    setBusy(kind);
    try {
      const path = await storageUpload(file, kind);
      if (!path) throw new Error();
      const st = { path, url: URL.createObjectURL(file) };
      if (kind === "image") setStagedImg(st); else setStagedVid(st);
    } catch { setErr("Upload fehlgeschlagen. Bitte erneut versuchen."); }
    finally { setBusy(""); }
  };

  // Commit a staged upload → add as a VISIBLE slide.
  const commit = async (kind: "image" | "video") => {
    const st = kind === "image" ? stagedImg : stagedVid;
    if (!st) return;
    setBusy("commit-" + kind);
    try {
      let t = kind === "image" ? title : "", c = kind === "image" ? imgCaption : vidCaption;
      // No text written → generate one so no slide stays empty.
      if (!c.trim()) {
        const ai = await autoText(kind === "image" ? (title.trim() || "") : "", kind);
        if (ai.caption) c = ai.caption;
        if (!t.trim() && ai.title) t = ai.title;
      }
      const add = kind === "image"
        ? { kind, path: st.path, title: t, caption: c, customer: customer || undefined }
        : { kind, path: st.path, caption: c, customer: customer || undefined };
      const res = applyResult(await post({ add }));
      if (res?.ok) { if (kind === "image") { setStagedImg(null); setImgCaption(""); } else { setStagedVid(null); setVidCaption(""); } }
    } finally { setBusy(""); }
  };

  // Save a generated/stored media into the LIBRARY (hidden by default) so it can be reviewed.
  const saveToLibrary = async (kind: "image" | "video", path: string, brief?: string) => {
    setBusy("lib");
    try {
      const ai = await autoText(brief || "", kind);   // always give library media a text
      applyResult(await post({ add: { kind, path, title: ai.title, caption: ai.caption || brief, hidden: true, customer: customer || undefined } }));
      setGen(null); setGenVideo(null);
    } finally { setBusy(""); }
  };

  const startReplace = (id: string, kind: "image" | "video") => { setReplaceTarget({ id, kind }); setTimeout(() => replaceRef.current?.click(), 0); };
  const doReplace = async (file: File) => {
    if (!replaceTarget) return;
    const { id, kind } = replaceTarget;
    setErr("");
    const okType = kind === "video" ? file.type.startsWith("video/") : file.type.startsWith("image/");
    if (!okType) { setErr("Falscher Dateityp zum Ersetzen."); setReplaceTarget(null); return; }
    setBusy(id);
    try {
      const path = await storageUpload(file, kind);
      if (!path) throw new Error();
      applyResult(await post({ replace: { id, path, kind } }));
    } catch { setErr("Ersetzen fehlgeschlagen."); }
    finally { setBusy(""); setReplaceTarget(null); if (replaceRef.current) replaceRef.current.value = ""; }
  };

  // Instant (optimistic) field edit — update the row immediately, persist in the background so
  // typing/toggling never waits on the server. No router.refresh here (that was the slowness).
  const updateSlide = (id: string, patch: Record<string, unknown>) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    post({ update: { id, ...patch } }).catch(() => {});
  };
  // Bulk show/hide every slide in the current scope.
  const setAllHidden = async (hidden: boolean) => {
    setBusy("bulk");
    try {
      for (const s of scoped) { if (!!s.hidden !== hidden) await post({ update: { id: s.id, hidden } }); }
      await load(); void loadPreview(customer); router.refresh();
    } finally { setBusy(""); }
  };
  const remove = async (id: string) => { setBusy(id); try { applyResult(await post({ remove: id })); } finally { setBusy(""); } };

  // Force a real download of a signed media URL (fetch → blob → anchor), works cross-origin.
  const downloadMedia = async (url: string, kind: "image" | "video") => {
    try {
      const r = await fetch(url); const b = await r.blob();
      const u = URL.createObjectURL(b); const a = document.createElement("a");
      a.href = u; a.download = `bella-${kind}.${kind === "video" ? "mp4" : "jpg"}`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u);
    } catch { window.open(url, "_blank"); }
  };

  // Turn a LIBRARY image into a video → add it as a new hidden video (review before showing).
  const makeVideoFromSlide = async (s: Slide, prompt: string) => {
    setBusy("vid-" + s.id);
    try {
      const res = await fetch("/api/image-to-video", { method: "POST", headers: authH(), body: JSON.stringify({ imageUrl: s.mediaUrl, prompt: prompt || vidPrompt }) }).then(r => r.json());
      if (res?.ok) {
        let cap = s.caption, ti = s.title;
        if (!cap?.trim()) { const ai = await autoText(s.title || "", "video"); cap = ai.caption || cap; ti = ti || ai.title; }
        applyResult(await post({ add: { kind: "video", path: res.videoPath, title: ti, caption: cap, hidden: true, customer: s.customer || undefined } }));
      }
      else setErr(res?.error || "Video-Erstellung fehlgeschlagen.");
    } finally { setBusy(""); }
  };

  // Make a TALKING video from a library image: PixVerse image→video → lip-sync with the lines.
  const makeTalkVideo = async (s: Slide, lines: string) => {
    if (!lines.trim()) return;
    setBusy("talk-" + s.id);
    try {
      const res = await fetch("/api/talk-video", { method: "POST", headers: authH(), body: JSON.stringify({ imageUrl: s.mediaUrl, lines }) }).then(r => r.json());
      if (res?.ok) applyResult(await post({ add: { kind: "video", path: res.videoPath, title: s.title, caption: s.caption || lines, hidden: true, customer: s.customer || undefined } }));
      else setErr(res?.error || "Sprech-Video fehlgeschlagen.");
    } finally { setBusy(""); }
  };

  const generateLingerie = async () => {
    setGenErr(""); setGen(null); setGenVideo(null); setGenBusy(true);
    try {
      const res = await fetch("/api/bella-lingerie", { method: "POST", headers: authH(), body: JSON.stringify({ garmentLookId: garmentId || undefined, prompt: imgPrompt }) }).then(r => r.json());
      if (!res?.ok) throw new Error((res?.error || "failed") + (res?.detail ? ` — ${res.detail}` : ""));
      setGen({ imageUrl: res.imageUrl, path: res.path, garmentName: res.garmentName });
    } catch (e) { setGenErr(String((e as Error)?.message || "Generierung fehlgeschlagen.")); }
    finally { setGenBusy(false); }
  };
  const makeVideoFromGen = async () => {
    if (!gen) return; setGenErr(""); setVidBusy(true);
    try {
      const res = await fetch("/api/image-to-video", { method: "POST", headers: authH(), body: JSON.stringify({ imagePath: gen.path, prompt: vidPrompt }) }).then(r => r.json());
      if (!res?.ok) throw new Error(res?.error || "failed");
      setGenVideo({ path: res.videoPath, url: res.videoUrl });
    } catch (e) { setGenErr(String((e as Error)?.message || "Video-Erstellung fehlgeschlagen.")); }
    finally { setVidBusy(false); }
  };

  if (!isAdmin) return null;
  const chosen = garments.find(g => g.id === garmentId);

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-amber-400/50 bg-amber-400/[0.04] p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">Admin</span>
        <p className="text-[15px] font-black text-white">🎴 Card Studio</p>
      </div>
      <p className="mt-1 text-[12px] font-medium text-white/50">Generieren/hochladen → in der Bibliothek prüfen → Text, Sichtbarkeit &amp; Seiten pro Media festlegen.</p>

      {/* Scope selector: the general (public) card, or a specific customer's personal card. */}
      <div className="mt-3 rounded-xl border border-amber-400/20 bg-black/20 p-2.5">
        <label className="text-[11px] font-black uppercase tracking-wide text-white/45">Karte für</label>
        <select value={customer} onChange={e => setCustomer(e.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-white/[0.04] px-2.5 text-[13px] font-bold text-white outline-none focus:border-amber-400">
          <option value="">🌐 General Card (öffentlich)</option>
          {customers.length > 0 && <optgroup label={`Alle User (${customers.length})`}>
            {customers.map(c => <option key={c.email} value={c.email}>{c.name ? `${c.name} · ${c.email}` : c.email}</option>)}
          </optgroup>}
        </select>
        {(() => {
          const c = customers.find(x => x.email === customer);
          if (!customer) return <p className="mt-1 text-[11px] font-medium text-white/40">{customers.length} User. Slides hier gelten für alle (öffentlich).</p>;
          return (
            <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2.5 text-[12px]">
              <p className="font-black text-white">{c?.name || "(kein Name)"} <span className="font-medium text-white/45">· {c?.provider || "?"}</span></p>
              <p className="text-white/55">{customer}{c?.createdAt ? ` · registriert ${new Date(c.createdAt).toLocaleDateString("de-DE")}` : ""}</p>
              <p className="mt-1 font-bold text-amber-300">🎬 {c?.videoNote || "—"}</p>
              {(c?.purchases?.length ?? 0) > 0 ? (
                <ul className="mt-1 space-y-0.5 text-white/60">
                  {c!.purchases.map((p, i) => <li key={i}>• {p.label}{p.date ? ` (${new Date(p.date).toLocaleDateString("de-DE")})` : ""}</li>)}
                </ul>
              ) : <p className="mt-1 text-white/35">Noch nichts gekauft.</p>}
            </div>
          );
        })()}
        {customer && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => void notifyCustomer()} disabled={notifyBusy}
                className="rounded-lg bg-[#c9a23f] px-3 py-2 text-[12px] font-black text-black active:scale-95 disabled:opacity-40">
                {notifyBusy ? "Sendet…" : "📧 „Dein Feed ist online“ senden"}
              </button>
              {notifyDone && <span className="text-[12px] font-bold text-amber-300">{notifyDone}</span>}
            </div>
            {(() => {
              const em = customers.find(x => x.email === customer)?.emails ?? [];
              return (
                <div className="mt-2">
                  <button type="button" onClick={() => setShowEmails(v => !v)}
                    className="text-[12px] font-black text-white/70 active:scale-95">📋 Gesendete E-Mails ({em.length}) {showEmails ? "▲" : "▼"}</button>
                  {showEmails && (
                    em.length ? (
                      <ul className="mt-1 space-y-1 rounded-lg border border-white/10 bg-black/20 p-2 text-[12px]">
                        {em.map((m, i) => (
                          <li key={i} className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-white/80">{m.subject}</span>
                            <span className="shrink-0 text-white/40">{new Date(m.sentAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-1 text-[12px] text-white/35">Noch keine E-Mails gesendet.</p>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Live preview of the currently-selected card. */}
      {preview && (
        <div className="mt-4">
          <p className="text-[11px] font-black uppercase tracking-wide text-white/40">Vorschau — {customer || "General Card"}</p>
          <div className="mt-2 rounded-2xl bg-black/20 p-2">
            <ModelCard {...preview} isMember canDownload />
          </div>
        </div>
      )}

      <input ref={replaceRef} type="file" accept={replaceTarget?.kind === "video" ? "video/*" : "image/*"} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) void doReplace(f); }} />

      {/* Lingerie generator */}
      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="text-[12px] font-black text-white/80">✨ Bild generieren — Bella in Gianna-Bellucci-Lingerie</p>
        <p className="mt-0.5 text-[11px] text-white/45">Teil wählen → generieren. Download, oder in die Bibliothek (dann Video/Card).</p>
        <button type="button" onClick={() => setPickerOpen(true)} disabled={garments.length === 0}
          className="mt-2 flex w-full items-center gap-3 rounded-lg border border-white/15 bg-white/[0.04] p-2 text-left transition active:scale-[0.99] disabled:opacity-40">
          {chosen ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={chosen.thumb} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-white">{chosen.name}</span>
              <span className="shrink-0 text-[12px] font-black text-amber-300">ändern</span>
            </>
          ) : (
            <span className="flex-1 text-[13px] font-bold text-white/70">📂 Teil aus Galerie wählen{garments.length ? ` (${garments.length})` : "…"}</span>
          )}
        </button>
        <label className="mt-2 block text-[11px] font-black uppercase tracking-wide text-white/40">Prompt (editierbar)</label>
        <textarea value={imgPrompt} onChange={e => setImgPrompt(e.target.value)}
          className="mt-1 h-16 w-full rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-amber-400" />
        <PromptLibrary kind="image" current={imgPrompt} prompts={prompts} onSave={t => void savePrompt("image", t)} onPick={setImgPrompt} onDelete={id => void deletePrompt(id)} />
        <button type="button" onClick={() => void generateLingerie()} disabled={genBusy || !garmentId}
          className="mt-2 w-full rounded-lg bg-amber-400 py-2.5 text-[13px] font-black text-black active:scale-[0.98] transition disabled:opacity-40">
          {genBusy ? "Generiert… (bis ~1 Min)" : garmentId ? "✨ Generieren" : "Erst ein Teil wählen"}
        </button>
        {genErr && <p className="mt-1 text-[12px] font-bold text-red-400">{genErr}</p>}
        {gen?.imageUrl && (
          <div className="mt-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-white/40">Vorschau · {gen.garmentName}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gen.imageUrl} alt="Bella Lingerie" className="mt-1.5 w-full rounded-lg" />
            <label className="mt-2 block text-[11px] font-black uppercase tracking-wide text-white/40">Video-Prompt (editierbar)</label>
            <textarea value={vidPrompt} onChange={e => setVidPrompt(e.target.value)}
              className="mt-1 h-14 w-full rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-amber-400" />
            <PromptLibrary kind="video" current={vidPrompt} prompts={prompts} onSave={t => void savePrompt("video", t)} onPick={setVidPrompt} onDelete={id => void deletePrompt(id)} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <a href={gen.imageUrl} download="bella-lingerie.png" className="rounded-lg border border-white/20 py-2 text-center text-[12px] font-black text-white/80 active:scale-95">⬇ Download</a>
              <button type="button" onClick={() => void saveToLibrary("image", gen.path, gen.garmentName)} disabled={busy === "lib"}
                className="rounded-lg bg-amber-400 py-2 text-[12px] font-black text-black active:scale-95 disabled:opacity-40">{busy === "lib" ? "…" : "In Bibliothek"}</button>
              <button type="button" onClick={() => void makeVideoFromGen()} disabled={vidBusy}
                className="rounded-lg border border-amber-400/50 bg-amber-400/10 py-2 text-[12px] font-black text-amber-300 active:scale-95 disabled:opacity-40">{vidBusy ? "Macht Video… (~2 Min)" : "🎥 Bewegungs-Video"}</button>
              <button type="button" onClick={() => void generateLingerie()} disabled={genBusy}
                className="rounded-lg border border-white/20 py-2 text-[12px] font-black text-white/80 active:scale-95 disabled:opacity-40">↻ Neu</button>
            </div>
            {genVideo?.url && (
              <div className="mt-3 rounded-lg border border-amber-400/30 bg-black/30 p-2">
                <p className="text-[11px] font-black uppercase tracking-wide text-amber-300/80">Video</p>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video src={genVideo.url} controls playsInline className="mt-1.5 w-full rounded-lg" />
                <div className="mt-2 flex gap-2">
                  <a href={genVideo.url} download="bella-lingerie.mp4" className="flex-1 rounded-lg border border-white/20 py-2 text-center text-[12px] font-black text-white/80 active:scale-95">⬇ Download</a>
                  <button type="button" onClick={() => void saveToLibrary("video", genVideo.path, gen.garmentName)} disabled={busy === "lib"}
                    className="flex-1 rounded-lg bg-amber-400 py-2 text-[12px] font-black text-black active:scale-95 disabled:opacity-40">{busy === "lib" ? "…" : "In Bibliothek"}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload image (Peter) */}
      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="text-[12px] font-black text-white/80">🖼 Bild hochladen (z.B. Peter)</p>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Slide-Text (EN), z.B. „This is Peter“"
          className="mt-2 h-10 w-full rounded-lg border border-white/15 bg-white/[0.04] px-2.5 text-[13px] font-bold text-white outline-none placeholder:text-white/30 focus:border-amber-400" />
        <textarea value={imgCaption} onChange={e => setImgCaption(e.target.value)} placeholder="Kurze Beschreibung"
          className="mt-2 h-16 w-full rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-[13px] font-medium text-white outline-none placeholder:text-white/30 focus:border-amber-400" />
        {stagedImg ? (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={stagedImg.url} alt="" className="w-full rounded-lg" />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => void commit("image")} disabled={busy.startsWith("commit")}
                className="flex-1 rounded-lg bg-amber-400 py-2.5 text-[13px] font-black text-black active:scale-95 disabled:opacity-40">{busy === "commit-image" ? "…" : "✓ In die Card übernehmen"}</button>
              <label className="cursor-pointer rounded-lg border border-white/20 px-3 py-2.5 text-[12px] font-black text-white/80 active:scale-95">Anderes
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void stageFile(f, "image"); }} /></label>
              <button type="button" onClick={() => setStagedImg(null)} className="rounded-lg border border-white/20 px-3 py-2.5 text-[12px] font-black text-white/60 active:scale-95">Verwerfen</button>
            </div>
          </div>
        ) : (
          <label className={`mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-black transition active:scale-[0.98] ${busy === "image" ? "bg-amber-400/50 text-black/60" : "bg-amber-400 text-black"}`}>
            {busy === "image" ? "Lädt hoch…" : "🖼 Bild auswählen & hochladen"}
            <input type="file" accept="image/*" disabled={!!busy} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void stageFile(f, "image"); }} />
          </label>
        )}
      </div>

      {/* Upload video */}
      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="text-[12px] font-black text-white/80">🎬 Video hochladen</p>
        <input value={vidCaption} onChange={e => setVidCaption(e.target.value)} placeholder="Caption (optional)"
          className="mt-2 h-10 w-full rounded-lg border border-white/15 bg-white/[0.04] px-2.5 text-[13px] font-medium text-white outline-none placeholder:text-white/30 focus:border-amber-400" />
        {stagedVid ? (
          <div className="mt-2">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={stagedVid.url} controls playsInline className="w-full rounded-lg" />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => void commit("video")} disabled={busy.startsWith("commit")}
                className="flex-1 rounded-lg bg-amber-400 py-2.5 text-[13px] font-black text-black active:scale-95 disabled:opacity-40">{busy === "commit-video" ? "…" : "✓ In die Card übernehmen"}</button>
              <label className="cursor-pointer rounded-lg border border-white/20 px-3 py-2.5 text-[12px] font-black text-white/80 active:scale-95">Anderes
                <input type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void stageFile(f, "video"); }} /></label>
              <button type="button" onClick={() => setStagedVid(null)} className="rounded-lg border border-white/20 px-3 py-2.5 text-[12px] font-black text-white/60 active:scale-95">Verwerfen</button>
            </div>
          </div>
        ) : (
          <label className={`mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-black transition active:scale-[0.98] ${busy === "video" ? "bg-amber-400/50 text-black/60" : "bg-amber-400 text-black"}`}>
            {busy === "video" ? "Lädt hoch… (etwas Geduld)" : "🎬 Video auswählen & hochladen"}
            <input type="file" accept="video/*" disabled={!!busy} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void stageFile(f, "video"); }} />
          </label>
        )}
      </div>

      {err && <p className="mt-2 text-[12px] font-bold text-red-400">{err}</p>}

      {/* Media library (current scope) */}
      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-black uppercase tracking-wide text-white/40">
            Bibliothek — {customer || "General Card"} ({scoped.length})
          </p>
          {scoped.length > 0 && (
            <span className="ml-auto flex gap-1.5">
              <button type="button" onClick={() => void setAllHidden(false)} disabled={busy === "bulk"}
                className="rounded-full bg-green-500 px-3 py-1.5 text-[12px] font-black text-white shadow ring-1 ring-green-300/40 active:scale-95 disabled:opacity-40">
                {busy === "bulk" ? "…" : "✓ Alle auf Card"}
              </button>
              <button type="button" onClick={() => void setAllHidden(true)} disabled={busy === "bulk"}
                className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-black text-white/60 active:scale-95 disabled:opacity-40">
                Alle ausblenden
              </button>
            </span>
          )}
        </div>
        {scoped.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-white/10 py-4 text-center text-[12px] text-white/35">Noch keine Slides für {customer ? "diesen Kunden" : "die General Card"}. Oben generieren/hochladen.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {scoped.map((s, i) => (
              <SlideRow key={s.id} slide={s} busy={busy} first={i === 0} last={i === scoped.length - 1}
                onUpdate={patch => void updateSlide(s.id, patch)}
                onReplace={() => startReplace(s.id, s.kind)}
                onRemove={() => { if (confirm("Diese Media löschen?")) void remove(s.id); }}
                onMakeVideo={prompt => void makeVideoFromSlide(s, prompt)}
                onTalk={lines => void makeTalkVideo(s, lines)}
                onMove={dir => void move(s.id, dir)}
                onOpen={() => s.mediaUrl && setLightbox({ url: s.mediaUrl, kind: s.kind })}
                videoPromptDefault={vidPrompt} prompts={prompts}
                onSavePrompt={t => void savePrompt("video", t)} onSaveVoice={t => void savePrompt("voice", t)} onDeletePrompt={id => void deletePrompt(id)} />
            ))}
          </div>
        )}
        {/* Bottom bulk bar — apply/hide everything without scrolling back up. */}
        {scoped.length > 0 && (
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => void setAllHidden(false)} disabled={busy === "bulk"}
              className="flex-1 rounded-lg bg-green-500 py-3 text-[14px] font-black text-white shadow ring-1 ring-green-300/40 active:scale-[0.98] disabled:opacity-40">
              {busy === "bulk" ? "…" : "✓ Alle auf Card übernehmen"}
            </button>
            <button type="button" onClick={() => void setAllHidden(true)} disabled={busy === "bulk"}
              className="rounded-lg border border-white/20 px-4 py-3 text-[13px] font-black text-white/60 active:scale-95 disabled:opacity-40">
              Alle ausblenden
            </button>
          </div>
        )}
      </div>

      {/* Lightbox — enlarge a library media + download */}
      {lightbox && (
        <div className="fixed inset-0 z-[95] flex flex-col bg-black/95" onClick={() => setLightbox(null)}>
          <div className="flex items-center justify-end gap-2 p-3" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => void downloadMedia(lightbox.url, lightbox.kind)}
              className="rounded-full bg-[#c9a23f] px-4 py-2 text-[13px] font-black text-black active:scale-95">⬇ Download</button>
            <button type="button" onClick={() => setLightbox(null)} aria-label="Schließen"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg font-black text-white active:scale-90">✕</button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-hidden p-3" onClick={e => e.stopPropagation()}>
            {lightbox.kind === "video"
              // eslint-disable-next-line jsx-a11y/media-has-caption
              ? <video src={lightbox.url} controls autoPlay playsInline className="max-h-full max-w-full rounded-lg" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={lightbox.url} alt="" className="max-h-full max-w-full rounded-lg object-contain" />}
          </div>
        </div>
      )}

      {/* Gallery picker overlay */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-[#0d0b0a]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-[15px] font-black text-white">Lingerie-Teil wählen <span className="text-white/40">({garments.length})</span></p>
            <button type="button" onClick={() => setPickerOpen(false)} aria-label="Schließen"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg font-black text-white active:scale-90">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-3">
              {garments.map(g => {
                const sel = garmentId === g.id;
                return (
                  <button key={g.id} type="button" onClick={() => { setGarmentId(g.id); setPickerOpen(false); }}
                    className={`relative aspect-[3/4] overflow-hidden rounded-lg ring-2 transition active:scale-95 ${sel ? "ring-amber-400" : "ring-white/10"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.thumb} alt={g.name} loading="lazy" className="h-full w-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1.5 py-1 text-center text-[11px] font-black text-white/90">{g.name}</span>
                    {sel && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-[11px] font-black text-black">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// One library media: preview + editable title/caption + AI caption + hide toggle + page targets +
// (for images) make-video + replace + delete. Text edits auto-save on blur.
function SlideRow({ slide, busy, first, last, onUpdate, onReplace, onRemove, onMakeVideo, onTalk, onMove, onOpen, videoPromptDefault, prompts, onSavePrompt, onSaveVoice, onDeletePrompt }: {
  slide: Slide; busy: string; first: boolean; last: boolean;
  onUpdate: (patch: Record<string, unknown>) => void; onReplace: () => void; onRemove: () => void; onMakeVideo: (prompt: string) => void; onTalk: (lines: string) => void; onMove: (dir: "up" | "down") => void; onOpen: () => void;
  videoPromptDefault: string; prompts: SavedPrompt[]; onSavePrompt: (text: string) => void; onSaveVoice: (text: string) => void; onDeletePrompt: (id: string) => void;
}) {
  const [title, setTitle] = useState(slide.title);
  const [caption, setCaption] = useState(slide.caption);
  const [brief, setBrief] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [vidOpen, setVidOpen] = useState(false);
  const [vidText, setVidText] = useState(videoPromptDefault);
  const [lines, setLines] = useState("");
  useEffect(() => { setTitle(slide.title); setCaption(slide.caption); }, [slide.title, slide.caption]);

  const genText = async () => {
    // For an image, the AI looks at the picture (vision) — a brief is optional then.
    if (!brief.trim() && slide.kind !== "image") return;
    setAiBusy(true);
    try {
      const payload: Record<string, unknown> = { brief, kind: slide.kind, context: slide.title };
      if (slide.kind === "image" && slide.mediaUrl) payload.imageUrl = slide.mediaUrl;
      const res = await fetch("/api/bella-caption", { method: "POST", headers: { "Content-Type": "application/json", "x-try-look-admin-pin": pin() }, body: JSON.stringify(payload) }).then(r => r.json());
      if (res?.caption || res?.title) {
        const patch: { title?: string; caption?: string } = {};
        if (res.title) { setTitle(res.title); patch.title = res.title; }
        if (res.caption) { setCaption(res.caption); patch.caption = res.caption; }
        onUpdate(patch);
        setBrief("");
      }
    } finally { setAiBusy(false); }
  };
  const togglePage = (key: string) => {
    // pages undefined = "everywhere" (default). Expand to the full list on first toggle so
    // turning one OFF keeps the others; an explicit empty array = "nowhere".
    const cur = slide.pages ?? SURFACES.map(s => s.key);
    onUpdate({ pages: cur.includes(key) ? cur.filter(x => x !== key) : [...cur, key] });
  };
  const rowBusy = busy === slide.id || busy === "vid-" + slide.id;

  return (
    <div className={`rounded-xl border p-2.5 ${slide.hidden ? "border-white/10 bg-black/10 opacity-70" : "border-amber-400/20 bg-black/20"}`}>
      <div className="flex gap-3">
        <div className="flex flex-col justify-center gap-1">
          <button type="button" onClick={() => onMove("up")} disabled={first || busy === "order-" + slide.id} aria-label="Nach oben"
            className="grid h-7 w-7 place-items-center rounded border border-white/15 text-white/70 active:scale-90 disabled:opacity-25">↑</button>
          <button type="button" onClick={() => onMove("down")} disabled={last || busy === "order-" + slide.id} aria-label="Nach unten"
            className="grid h-7 w-7 place-items-center rounded border border-white/15 text-white/70 active:scale-90 disabled:opacity-25">↓</button>
        </div>
        <button type="button" onClick={onOpen} aria-label="Vergrößern"
          className="group relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-white/10 active:scale-95">
          {slide.mediaUrl && (slide.kind === "video"
            ? <video src={slide.mediaUrl} muted playsInline className="h-full w-full object-cover" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={slide.mediaUrl} alt="" className="h-full w-full object-cover" />)}
          <span className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded bg-black/60 text-[9px] text-white/90">⤢</span>
          <span className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-[8px] font-black uppercase text-white/80">{slide.kind === "video" ? "Video" : "Bild"}</span>
        </button>
        <div className="min-w-0 flex-1">
          <input value={title} onChange={e => setTitle(e.target.value)} onBlur={() => title !== slide.title && onUpdate({ title })} placeholder="Titel (optional)"
            className="h-8 w-full rounded border border-white/15 bg-white/[0.04] px-2 text-[12px] font-bold text-white outline-none placeholder:text-white/30 focus:border-amber-400" />
          <textarea value={caption} onChange={e => setCaption(e.target.value)} onBlur={() => caption !== slide.caption && onUpdate({ caption })} placeholder="Caption"
            className="mt-1.5 h-12 w-full rounded border border-white/15 bg-white/[0.04] px-2 py-1 text-[12px] text-white outline-none placeholder:text-white/30 focus:border-amber-400" />
        </div>
      </div>

      {/* AI caption */}
      <div className="mt-2 flex gap-2">
        <input value={brief} onChange={e => setBrief(e.target.value)} placeholder="Kurz reinschreiben → KI-Text…"
          className="h-8 flex-1 rounded border border-white/15 bg-white/[0.04] px-2 text-[12px] text-white outline-none placeholder:text-white/30 focus:border-amber-400" />
        <button type="button" onClick={() => void genText()} disabled={aiBusy || (!brief.trim() && slide.kind !== "image")}
          className="shrink-0 rounded border border-amber-400/50 bg-amber-400/10 px-2.5 text-[12px] font-black text-amber-300 active:scale-95 disabled:opacity-40">{aiBusy ? "…" : slide.kind === "image" ? "✨ Text (Bild)" : "✨ Text"}</button>
      </div>

      {/* Controls: show/hide · pages · make-video · replace · delete */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => onUpdate({ hidden: !slide.hidden })}
          className={`rounded-full px-2.5 py-1 text-[11px] font-black active:scale-95 ${slide.hidden ? "bg-white/10 text-white/50" : "bg-amber-400 text-black"}`}>
          {slide.hidden ? "🚫 Ausgeblendet" : "✓ Auf Card"}
        </button>
        <span className="text-[10px] font-bold text-white/30">Seiten:</span>
        {SURFACES.map(su => {
          const on = slide.pages == null ? true : slide.pages.includes(su.key);
          return (
            <button key={su.key} type="button" onClick={() => togglePage(su.key)}
              className={`rounded-full px-2 py-1 text-[11px] font-black active:scale-95 ${on ? "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40" : "bg-white/5 text-white/40"}`}>
              {su.label}
            </button>
          );
        })}
        <span className="ml-auto flex gap-1.5">
          {slide.kind === "image" && (
            <button type="button" onClick={() => setVidOpen(v => !v)} disabled={rowBusy}
              className={`rounded border px-2 py-1 text-[11px] font-black active:scale-95 disabled:opacity-40 ${vidOpen ? "border-amber-400 bg-amber-400/20 text-amber-200" : "border-amber-400/40 text-amber-300"}`}>{busy === "vid-" + slide.id ? "Video…" : "🎬 Video machen"}</button>
          )}
          <button type="button" onClick={onReplace} disabled={rowBusy} className="rounded border border-white/20 px-2 py-1 text-[11px] font-black text-white/70 active:scale-95 disabled:opacity-40">↻</button>
          <button type="button" onClick={onRemove} disabled={rowBusy} className="rounded border border-red-400/50 bg-red-500/10 px-2 py-1 text-[11px] font-black text-red-300 active:scale-95 disabled:opacity-40">🗑</button>
        </span>
      </div>

      {/* Make-video panel — enter the MOTION prompt (e.g. "she slowly turns around") before generating. */}
      {slide.kind === "image" && vidOpen && (
        <div className="mt-2 rounded-lg border border-amber-400/25 bg-black/25 p-2">
          <label className="block text-[11px] font-black uppercase tracking-wide text-amber-400/70">🎥 Bewegungs-Video · Bewegungs-Prompt (z.B. „she turns 360 degrees, 8 seconds“)</label>
          <textarea value={vidText} onChange={e => setVidText(e.target.value)}
            className="mt-1 h-14 w-full rounded border border-white/15 bg-white/[0.04] px-2 py-1 text-[12px] text-white outline-none focus:border-amber-400" />
          <PromptLibrary kind="video" current={vidText} prompts={prompts} onSave={onSavePrompt} onPick={setVidText} onDelete={onDeletePrompt} />
          <button type="button" onClick={() => onMakeVideo(vidText)} disabled={rowBusy || !vidText.trim()}
            className="mt-2 w-full rounded-lg bg-amber-400 py-2 text-[12px] font-black text-black active:scale-95 disabled:opacity-40">
            {busy === "vid-" + slide.id ? "Erstellt Bewegungs-Video… (~2 Min)" : "🎥 Bewegungs-Video erstellen (ohne Ton)"}
          </button>

          {/* Human voice — she SPEAKS your lines (PixVerse lip-sync). */}
          <div className="mt-3 border-t border-white/10 pt-2">
            <label className="block text-[11px] font-black uppercase tracking-wide text-amber-400/70">🗣 Sprech-Video · sie spricht deinen Text (mit Stimme)</label>
            <p className="mt-0.5 text-[10px] text-white/35">Pausen mit Satzzeichen: Komma = kurz, Punkt = länger, „…" = deutliche Pause.</p>
            <textarea value={lines} onChange={e => setLines(e.target.value)} placeholder="Zeilen eingeben, z.B. „Hi… I love traveling the world. Would you like to come with me?“"
              className="mt-1 h-16 w-full rounded border border-white/15 bg-white/[0.04] px-2 py-1 text-[12px] text-white outline-none placeholder:text-white/30 focus:border-amber-400" />
            <PromptLibrary kind="voice" current={lines} prompts={prompts} onSave={onSaveVoice} onPick={setLines} onDelete={onDeletePrompt} />
            <button type="button" onClick={() => onTalk(lines)} disabled={busy === "talk-" + slide.id || !lines.trim()}
              className="mt-2 w-full rounded-lg bg-amber-400 py-2 text-[12px] font-black text-black active:scale-95 disabled:opacity-40">
              {busy === "talk-" + slide.id ? "Spricht… (~3-4 Min)" : "🗣 Sprech-Video erstellen"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
