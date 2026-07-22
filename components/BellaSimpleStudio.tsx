"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Check, ImageUp, ChevronUp, ChevronDown, Maximize2, X, Sparkles } from "lucide-react";

// Das EINFACHE Bella-Werkzeug. Bewusst nur drei Dinge:
// hochladen · Text schreiben · löschen. Kein Modell-Wähler, keine KI, keine Flächen.
//
// Texte werden NICHT automatisch gespeichert — sie gehen erst mit „Übernehmen" live.
// Hochladen und Löschen wirken sofort (die Datei muss ohnehin gespeichert werden).
// Blendet sich für alle außer dem Admin aus.

// Textfeld, das mit dem Inhalt MITWÄCHST (nichts wird abgeschnitten) — wie im Card Studio.
function AutoTextarea({ value, onChange, className = "", placeholder, minRows = 2 }: {
  value: string; onChange: (v: string) => void; className?: string; placeholder?: string; minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const grow = (el: HTMLTextAreaElement | null) => { if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } };
  useEffect(() => { grow(ref.current); }, [value]);
  return (
    <textarea ref={ref} value={value} rows={minRows} placeholder={placeholder}
      onChange={e => onChange(e.target.value)} onInput={e => grow(e.currentTarget)}
      className={`w-full resize-none overflow-hidden ${className}`} />
  );
}

type Post = {
  id: string; kind: "image" | "video"; title: string; caption: string; day: string; time: string; ad: boolean; context: string; firstMessage: string; mediaUrl: string;
  // Ein getauschtes Bild/Video, das noch NICHT live ist. Die Datei liegt schon im
  // Speicher (anders geht Hochladen nicht), aber der Beitrag zeigt sie erst nach
  // „Übernehmen". `previewUrl` ist die lokale Vorschau aus der gewählten Datei.
  pending?: { kind: "image" | "video"; path: string; previewUrl: string; posterPath?: string };
};

// Erstes Videobild im Browser abgreifen → JPEG-Blob. Wird als Cover (Poster) mitgespeichert,
// damit Video-Slides im Feed nicht schwarz sind. Bei Fehler: null (dann eben ohne Cover).
async function firstFrame(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const v = document.createElement("video");
      v.preload = "metadata"; v.muted = true; (v as HTMLVideoElement & { playsInline?: boolean }).playsInline = true;
      const url = URL.createObjectURL(file);
      const done = (b: Blob | null) => { try { URL.revokeObjectURL(url); } catch { /**/ } resolve(b); };
      v.src = url;
      v.onloadeddata = () => { try { v.currentTime = Math.min(0.1, (v.duration || 1) / 3); } catch { done(null); } };
      v.onseeked = () => {
        try {
          const c = document.createElement("canvas");
          c.width = v.videoWidth || 720; c.height = v.videoHeight || 1280;
          const ctx = c.getContext("2d"); if (!ctx) return done(null);
          ctx.drawImage(v, 0, 0, c.width, c.height);
          c.toBlob(b => done(b), "image/jpeg", 0.82);
        } catch { done(null); }
      };
      v.onerror = () => done(null);
      setTimeout(() => done(null), 8000);   // Sicherheitsnetz
    } catch { resolve(null); }
  });
}

// Supabase nimmt pro Datei standardmäßig 50 MB. Lieber vorher sauber melden,
// als den Nutzer minutenlang hochladen lassen und dann abbrechen.
const MAX_MB = 50;

// Ein Beitrag, den es auf der Seite noch NICHT gibt: Bild ist hochgeladen, Text wird
// gerade getippt. Erst „Übernehmen" legt ihn an.
const DRAFT = "entwurf-";
const istEntwurf = (id: string) => id.startsWith(DRAFT);
const todayISO = () => new Date().toISOString().slice(0, 10);   // YYYY-MM-DD (heute) als Standard-Tag.

export default function BellaSimpleStudio({ modelId = "curator-1783683672619-td4cy", modelName = "Model" }: { modelId?: string; modelName?: string } = {}) {
  // Das Karussell oben wird auf dem Server gebaut. Nach jeder Änderung muss die Seite
  // neu gerendert werden — sonst zeigt die Slide weiter den alten Stand, obwohl
  // gespeichert wurde. Genau das sah aus wie „das Bild wird nicht übernommen".
  const router = useRouter();
  const apiUrl = `/api/bella-simple?model=${encodeURIComponent(modelId)}`;   // pro Model gescoped
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [replacingId, setReplacingId] = useState("");
  const [busyNote, setBusyNote] = useState("");   // „video.mp4 · 12,4 MB wird hochgeladen…"
  // Gespeichert wird PRO BEITRAG. Deshalb merken wir uns je Beitrag, ob er geändert
  // wurde, welcher gerade speichert und welcher eben gespeichert hat.
  const [dirtyIds, setDirtyIds] = useState<string[]>([]);
  const [applyingId, setApplyingId] = useState("");
  const [appliedId, setAppliedId] = useState("");
  const [suggestingId, setSuggestingId] = useState("");   // „✨ KI-Vorschlag" läuft für diesen Beitrag
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState<{ url: string; kind: "image" | "video" } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef("");   // welcher Beitrag getauscht wird

  useEffect(() => {
    try {
      const p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? "";
      setPin(p);
      setIsAdmin(!!p && !localStorage.getItem("lb_preview_model"));
    } catch { /**/ }
  }, []);

  const headers = () => ({ "Content-Type": "application/json", "x-try-look-admin-pin": pin });

  // `keepEdits`: beim Nachladen nach einem Upload die noch nicht übernommenen Texte
  // behalten — sonst wären getippte, aber nicht übernommene Änderungen weg.
  const load = async (keepEdits = false) => {
    try {
      const r = await fetch(apiUrl, { headers: { "x-try-look-admin-pin": pin }, cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      const fresh: Post[] = d.posts ?? [];
      setPosts(prev => keepEdits
        ? fresh.map(f => {
          const local = prev.find(x => x.id === f.id);
          return local ? { ...f, title: local.title, caption: local.caption, day: local.day, time: local.time, ad: local.ad, context: local.context, firstMessage: local.firstMessage } : f;
        })
        : fresh);
    } catch { /**/ } finally { setLoading(false); }
  };
  useEffect(() => { if (isAdmin && pin) void load(); else setLoading(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isAdmin, pin]);

  // Datei zu Supabase schaufeln (Vercel nimmt keine grossen Bodys an, deshalb direkt
  // per signierter Adresse). Gibt den Speicherpfad zurück — oder null bei einem Fehler.
  const uploadFile = async (file: File): Promise<{ kind: "image" | "video"; path: string } | null> => {
    // Manche Handys melden bei Videos gar keinen Typ — dann nach der Endung gehen.
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const isVideo = file.type.startsWith("video") || ["mp4", "mov", "webm", "m4v", "avi", "hevc"].includes(ext);
    const kind: "image" | "video" = isVideo ? "video" : "image";

    const mb = file.size / 1024 / 1024;
    if (mb > MAX_MB) {
      setError(`Die Datei ist ${mb.toFixed(0)} MB groß — mehr als ${MAX_MB} MB nimmt der Speicher nicht an. Bitte das Video kürzen oder kleiner exportieren.`);
      return null;
    }

    setBusyNote(`${file.name} · ${mb < 1 ? "<1" : mb.toFixed(1)} MB wird hochgeladen…`);
    const sign = await fetch(apiUrl, { method: "POST", headers: headers(), body: JSON.stringify({ sign: true, kind, ext: ext || (isVideo ? "mp4" : "jpg") }) }).then(r => r.json());
    if (!sign?.uploadUrl) { setError(sign?.error ?? "Upload nicht möglich."); return null; }
    const put = await fetch(sign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || (isVideo ? "video/mp4" : "image/jpeg"), "x-upsert": "true" },
      body: file,
    });
    if (!put.ok) {
      // Den ECHTEN Grund zeigen — „Hochladen fehlgeschlagen" allein hilft niemandem.
      const detail = await put.text().catch(() => "");
      setError(`Hochladen fehlgeschlagen (${put.status}). ${detail.slice(0, 200)}`);
      return null;
    }
    return { kind, path: sign.path as string };
  };

  // Erstes Videobild als Cover erzeugen + hochladen → Speicherpfad (oder "" bei Fehler).
  const captureCover = async (file: File): Promise<string> => {
    try {
      const frame = await firstFrame(file);
      if (!frame) return "";
      const up = await uploadFile(new File([frame], "cover.jpg", { type: "image/jpeg" }));
      return up?.path ?? "";
    } catch { return ""; }
  };

  // Neuer Beitrag: die Datei wandert in den Speicher, der BEITRAG entsteht aber noch
  // nicht. Er liegt als Entwurf oben in der Liste, bis Titel und Text dranstehen —
  // dann geht mit EINEM „Übernehmen" alles zusammen live. Vorher entstand hier sofort
  // ein leerer Beitrag auf der Seite und man musste zweimal speichern.
  const addFile = async (file: File) => {
    setUploading(true); setError("");
    try {
      const up = await uploadFile(file);
      if (!up) return;
      const posterPath = up.kind === "video" ? await captureCover(file) : "";
      const entwurf: Post = {
        id: `${DRAFT}${Date.now()}`,
        kind: up.kind, title: "", caption: "", day: todayISO(), time: "", ad: false, context: "", firstMessage: "", mediaUrl: "",
        pending: { ...up, posterPath, previewUrl: URL.createObjectURL(file) },
      };
      setPosts(ps => [entwurf, ...ps]);
      setDirtyIds(ids => [...ids, entwurf.id]);
    } catch { setError("Hochladen fehlgeschlagen."); }
    finally { setUploading(false); setBusyNote(""); }
  };

  // Bild/Video tauschen: die Datei wandert sofort in den Speicher (anders lässt sie
  // sich nicht hochladen), der BEITRAG bleibt aber unverändert, bis „Übernehmen"
  // gedrückt wird. Bis dahin siehst du nur eine Vorschau.
  const replaceFile = async (id: string, file: File) => {
    setReplacingId(id); setError("");
    try {
      const up = await uploadFile(file);
      if (!up) return;
      const posterPath = up.kind === "video" ? await captureCover(file) : "";
      const previewUrl = URL.createObjectURL(file);
      setPosts(ps => ps.map(p => {
        if (p.id !== id) return p;
        if (p.pending) URL.revokeObjectURL(p.pending.previewUrl);   // alte Vorschau freigeben
        return { ...p, pending: { ...up, posterPath, previewUrl } };
      }));
      setDirtyIds(ids => ids.includes(id) ? ids : [...ids, id]);
    } catch { setError("Tauschen fehlgeschlagen."); }
    finally { setReplacingId(""); setBusyNote(""); }
  };

  // Texte werden NICHT automatisch gespeichert — erst „Übernehmen" macht sie live.
  const edit = (id: string, patch: Partial<Post>) => {
    setPosts(ps => ps.map(x => x.id === id ? { ...x, ...patch } : x));
    setDirtyIds(ids => ids.includes(id) ? ids : [...ids, id]);
  };

  // „✨ KI-Vorschlag": aus dem Foto einen Tages-Text vorschlagen (Kontext + erste Nachricht + Text).
  // Füllt die Felder NUR aus — gespeichert wird wie immer erst mit „Übernehmen".
  // mode "post" = Karussell-Text (Titel+Text, Prompt = Text-Feld); "chat" = Chat-Text
  // (Kontext+Opener, Prompt = „Ihr Tag heute"-Feld). Ergebnis ersetzt den Prompt im selben Feld.
  const suggest = async (id: string, mode: "post" | "chat") => {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    setSuggestingId(`${id}:${mode}`); setError("");
    try {
      const kind = post.pending?.kind ?? post.kind;
      const brief = mode === "chat" ? (post.context ?? "") : (post.caption ?? "");
      const r = await fetch("/api/wetter-suggest", {
        method: "POST", headers: headers(),
        body: JSON.stringify({
          modelName, lang: "ro", kind, mode, brief,
          // Entwurf → Speicherpfad; bestehender Beitrag → signierte Bild-Adresse.
          ...(post.pending ? { path: post.pending.path } : { imageUrl: post.mediaUrl }),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d?.error ?? "KI-Vorschlag fehlgeschlagen."); return; }
      if (mode === "chat") {
        edit(id, { context: String(d.context ?? ""), firstMessage: String(d.firstMessage ?? "") });
      } else {
        edit(id, { ...(String(d.title ?? "").trim() ? { title: String(d.title) } : {}), caption: String(d.caption ?? "") });
      }
    } catch { setError("KI-Vorschlag fehlgeschlagen."); }
    finally { setSuggestingId(""); }
  };

  // Nur DIESEN einen Beitrag speichern — die anderen bleiben unangetastet.
  const apply = async (id: string) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    setApplyingId(id); setError("");
    try {
      // Entwurf → Beitrag ANLEGEN (Bild und Text in einem Rutsch).
      // Bestehender Beitrag → Text speichern, plus getauschtes Bild, falls vorhanden.
      const day = post.day || todayISO();   // nie leer speichern — was der Admin sieht (heute), wird auch gespeichert
      const body = istEntwurf(id)
        ? { add: { kind: post.pending!.kind, path: post.pending!.path, posterPath: post.pending!.posterPath ?? "", title: post.title, caption: post.caption, day, time: post.time, ad: post.ad, context: post.context, firstMessage: post.firstMessage } }
        : { posts: [{
            id: post.id, title: post.title, caption: post.caption,
            day, time: post.time, ad: post.ad, context: post.context, firstMessage: post.firstMessage,
            ...(post.pending ? { kind: post.pending.kind, path: post.pending.path, posterPath: post.pending.posterPath ?? "" } : {}),
          }] };
      const r = await fetch(apiUrl, { method: "POST", headers: headers(), body: JSON.stringify(body) });
      if (!r.ok) { setError("Übernehmen fehlgeschlagen."); return; }
      setDirtyIds(ids => ids.filter(x => x !== id));
      setAppliedId(id); setTimeout(() => setAppliedId(x => (x === id ? "" : x)), 2500);
      if (post.pending) {
        URL.revokeObjectURL(post.pending.previewUrl);
        // Entwurf raus — er kommt gleich als echter Beitrag aus dem Speicher zurück.
        if (istEntwurf(id)) setPosts(ps => ps.filter(x => x.id !== id));
        await load(true);   // frisch signierte Adresse des neuen Bildes holen
      }
      router.refresh();     // Karussell oben zeigt sofort den neuen Stand
    } catch { setError("Netzwerkfehler."); }
    finally { setApplyingId(""); }
  };

  const remove = async (id: string) => {
    // Ein Entwurf steht noch nirgends — einfach verwerfen, ohne Nachfrage an den Server.
    if (istEntwurf(id)) {
      const p = posts.find(x => x.id === id);
      if (p?.pending) URL.revokeObjectURL(p.pending.previewUrl);
      setPosts(ps => ps.filter(x => x.id !== id));
      setDirtyIds(ids => ids.filter(x => x !== id));
      return;
    }
    if (!window.confirm("Den GANZEN Beitrag löschen — Bild und Text?\n\nNur ein neues Bild? Dann „Bild tauschen“ nehmen.")) return;
    setPosts(ps => ps.filter(p => p.id !== id));
    try {
      await fetch(apiUrl, { method: "POST", headers: headers(), body: JSON.stringify({ remove: id }) });
      router.refresh();
    } catch { setError("Löschen fehlgeschlagen."); void load(); }
  };

  // ↑↓ — Reihenfolge der bereits übernommenen Beiträge bestimmen. Entwürfe bleiben oben
  // und werden nicht mitsortiert. Position im Array = Reihenfolge, sofort gespeichert.
  const move = async (id: string, dir: "up" | "down") => {
    const i = posts.findIndex(p => p.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= posts.length || istEntwurf(posts[j].id)) return;
    const next = [...posts];
    [next[i], next[j]] = [next[j], next[i]];
    setPosts(next);
    try {
      const r = await fetch(apiUrl, { method: "POST", headers: headers(), body: JSON.stringify({ reorder: next.filter(p => !istEntwurf(p.id)).map(p => p.id) }) });
      if (!r.ok) throw new Error();
      router.refresh();   // Karussell oben zeigt sofort die neue Reihenfolge
    } catch { setError("Reihenfolge speichern fehlgeschlagen."); void load(); }
  };
  // Nur übernommene Beiträge sind sortierbar → für die ↑↓-Deaktivierung an den Enden.
  const orderIds = posts.filter(p => !istEntwurf(p.id)).map(p => p.id);

  if (!isAdmin) return null;

  return (
    <div className="rounded-2xl border border-white/15 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/50">Nur für dich sichtbar</p>
      <h2 className="mt-1 text-[18px] font-black text-white">Beiträge</h2>
      <p className="mt-0.5 text-[12px] font-semibold text-white/60">Bild oder Video hochladen, Titel und Text dazuschreiben — dann bei dem Beitrag auf <b className="text-white/80">Übernehmen</b>.</p>

      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) void addFile(f); e.target.value = ""; }} />
      {/* Eine gemeinsame Dateiauswahl fürs Tauschen — welcher Beitrag, steht in replaceTarget. */}
      <input ref={replaceRef} type="file" accept="image/*,video/*" className="hidden"
        onChange={e => {
          const f = e.target.files?.[0], id = replaceTarget.current;
          if (f && id) void replaceFile(id, f);
          e.target.value = ""; replaceTarget.current = "";
        }} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
        className="lb-onmedia mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1a160f] text-[15px] font-black text-white active:scale-95 transition disabled:opacity-50">
        {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Lädt hoch…</> : <><Plus className="h-4 w-4" /> Beitrag hinzufügen</>}
      </button>

      {error && <p className="mt-2 whitespace-pre-line rounded-lg bg-red-500/15 px-3 py-2 text-[12px] font-bold text-red-300">{error}</p>}
      {busyNote && <p className="mt-2 rounded-lg bg-white/[0.06] px-3 py-2 text-[12px] font-bold text-white/70">{busyNote}</p>}

      {loading ? (
        <p className="py-6 text-center text-[12px] font-bold text-white/40">Lädt…</p>
      ) : posts.length === 0 ? (
        <p className="py-6 text-center text-[12px] font-bold text-white/40">Noch keine Beiträge.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {posts.map(p => (
            // Bild oben, Textfelder darunter über die volle Breite — nebeneinander
            // waren die Felder auf dem Handy zu schmal zum Schreiben.
            <div key={p.id} className={`grid gap-2 rounded-xl border bg-white/[0.03] p-2 ${istEntwurf(p.id) ? "border-black/40" : "border-white/10"}`}>
              {/* Aufs Bild tippen = neues Bild/Video für DIESEN Beitrag. Text bleibt. */}
              <div className="relative h-28 w-[84px]">
                <button type="button" disabled={replacingId === p.id}
                  onClick={() => { replaceTarget.current = p.id; replaceRef.current?.click(); }}
                  className={`block h-full w-full overflow-hidden rounded-lg bg-black transition active:scale-95 ${p.pending ? "ring-2 ring-black/50" : ""}`}>
                  {/* Nach dem Tauschen die VORSCHAU zeigen — live ist sie erst nach Übernehmen. */}
                  {(p.pending?.kind ?? p.kind) === "video"
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    ? <video src={p.pending?.previewUrl ?? p.mediaUrl} className="h-full w-full object-cover" muted playsInline />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={p.pending?.previewUrl ?? p.mediaUrl} alt="" className="h-full w-full object-cover" />}
                  <span className={`lb-onmedia absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 py-1 text-[9px] font-black uppercase tracking-wide ${p.pending ? "bg-[#1a160f] text-white" : "bg-black/70 text-white"}`}>
                    {replacingId === p.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : p.pending ? (istEntwurf(p.id) ? "Neuer Beitrag" : "Neu — noch nicht live")
                      : <><ImageUp className="h-3 w-3" /> Tauschen</>}
                  </span>
                </button>
                {/* Vergrößern (Vollbild) — eigener Knopf oben rechts, überschreibt „Tauschen" nicht. */}
                <button type="button" aria-label="Groß ansehen"
                  onClick={(e) => { e.stopPropagation(); setZoom({ url: (p.pending?.previewUrl ?? p.mediaUrl) || "", kind: (p.pending?.kind ?? p.kind) === "video" ? "video" : "image" }); }}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md bg-black/60 text-white backdrop-blur transition active:scale-95">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid min-w-0 gap-3">
                {/* 📅 Für welchen Tag + 🕗 Uhrzeit — nie leer: fehlt der Tag, steht HEUTE drin. */}
                <div>
                  <p className="mb-1 text-[11px] font-black uppercase tracking-wide text-white/55">📅 Für welchen Tag · 🕗 Uhrzeit</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="date" value={p.day || todayISO()} onChange={e => edit(p.id, { day: e.target.value })}
                      className="h-10 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 text-[14px] font-bold text-white outline-none focus:border-black" />
                    <input type="time" value={p.time} onChange={e => edit(p.id, { time: e.target.value })}
                      className="h-10 w-[104px] rounded-lg border border-white/15 bg-white/[0.04] px-2.5 text-[14px] font-bold text-white outline-none focus:border-black" />
                    <button type="button" onClick={() => edit(p.id, { day: todayISO() })}
                      className="h-10 rounded-lg border border-white/15 px-3 text-[12px] font-black text-white/75 active:scale-95 transition">Heute</button>
                    {!p.day && <span className="text-[11px] font-bold text-black/45">noch nicht gesetzt</span>}
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-white/40">Uhrzeit nur nötig, wenn du mehrere Beiträge am selben Tag hast.</p>
                </div>

                {/* 📣 Werbung — dieser Beitrag ist die BESUCHER-Vorschau (nicht eingeloggt), nicht der Abo-Alltag. */}
                <button type="button" onClick={() => edit(p.id, { ad: !p.ad })}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition active:scale-[0.99] ${p.ad ? "border-black bg-black/10" : "border-white/15 bg-white/[0.03]"}`}>
                  <span className="text-[13px] font-black text-white">📣 Werbung — Besucher sehen das</span>
                  <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${p.ad ? "bg-[#1a160f]" : "bg-white/20"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${p.ad ? "left-[22px]" : "left-0.5"}`} />
                  </span>
                </button>

                {/* ── SEKTION 1: KARUSSELL-TEXT — was im Beitrag steht (Titel groß + Text). ── */}
                <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3">
                  <p className="mb-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-black/55">🖼 Karussell-Text — im Beitrag</p>
                  {/* Titel — erscheint GROSS im Bild */}
                  <p className="mb-1 text-[11px] font-black uppercase tracking-wide text-white/55">Titel — groß im Bild</p>
                  <input value={p.title} placeholder="z. B. Mesajul de dimineață"
                    onChange={e => edit(p.id, { title: e.target.value })}
                    className="h-12 w-full rounded-lg border border-black/15 bg-white/[0.04] px-3 text-[15px] font-black text-white outline-none placeholder:text-[13px] placeholder:font-semibold placeholder:text-white/35 focus:border-black" />
                  {/* Text unter dem Bild = zugleich Prompt */}
                  <p className="mb-1 mt-3 text-[11px] font-black uppercase tracking-wide text-white/55">Text unter dem Bild · zugleich Prompt</p>
                  <AutoTextarea value={p.caption} minRows={4} onChange={v => edit(p.id, { caption: v })}
                    placeholder="Schreib rein, WORÜBER sie posten soll (z. B. „schreib was Schönes über das blaue Kleid am Meer…“) → ✨ macht Titel + Text draus. Oder tipp den fertigen Text direkt."
                    className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-[15px] font-semibold leading-relaxed text-white outline-none placeholder:text-[13px] placeholder:text-white/35 focus:border-black" />
                  <button type="button" onClick={() => void suggest(p.id, "post")} disabled={suggestingId === `${p.id}:post`}
                    title="Aus deiner Anweisung (Text-Feld) Titel + Text schreiben lassen — sieht auch das Foto"
                    className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-black/20 bg-black/[0.03] text-[13px] font-black text-black active:scale-95 transition disabled:opacity-50">
                    {suggestingId === `${p.id}:post` ? <><Loader2 className="h-4 w-4 animate-spin" /> Schreibt…</> : <><Sparkles className="h-4 w-4" /> Titel + Text schreiben</>}
                  </button>
                </div>

                {/* ── SEKTION 2: CHAT-TEXT — wie sie heute im Chat spricht. ── */}
                <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3">
                  <p className="mb-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-black/55">💬 Chat-Text — steuert den Chat</p>
                  {/* Ihr Tag heute = zugleich Prompt */}
                  <p className="mb-1 text-[11px] font-black uppercase tracking-wide text-white/55">Ihr Tag heute · zugleich Prompt</p>
                  <AutoTextarea value={p.context} minRows={3} onChange={v => edit(p.id, { context: v })}
                    placeholder="Wo ist sie, was macht sie? z. B. Azi sunt în Nisa, plimbare pe faleză… → ✨ schreibt Kontext + erste Nachricht."
                    className="rounded-lg border border-black/15 bg-white/[0.04] px-3 py-2.5 text-[14px] font-semibold leading-relaxed text-white outline-none placeholder:text-[12px] placeholder:text-white/35 focus:border-black" />
                  <button type="button" onClick={() => void suggest(p.id, "chat")} disabled={suggestingId === `${p.id}:chat`}
                    title="Aus deiner Anweisung (Feld oben) den Chat schreiben — Kontext + erste Nachricht"
                    className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-black/20 bg-black/[0.03] text-[13px] font-black text-black active:scale-95 transition disabled:opacity-50">
                    {suggestingId === `${p.id}:chat` ? <><Loader2 className="h-4 w-4 animate-spin" /> Schreibt…</> : <><Sparkles className="h-4 w-4" /> Chat schreiben</>}
                  </button>
                  {/* Erste Chat-Nachricht (optional) — leer = Standard-Gruß. */}
                  <p className="mb-1 mt-3 text-[11px] font-black uppercase tracking-wide text-white/55">Erste Nachricht im Chat</p>
                  <AutoTextarea value={p.firstMessage} minRows={2} onChange={v => edit(p.id, { firstMessage: v })}
                    placeholder="Ihre erste Nachricht am Morgen (optional) — leer = Standard-Gruß"
                    className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-[13px] font-medium leading-snug text-white outline-none placeholder:text-[12px] placeholder:text-white/35 focus:border-black" />
                </div>

                <div className="flex items-center gap-2">
                  {!istEntwurf(p.id) && (
                    <>
                      <button type="button" onClick={() => void move(p.id, "up")} disabled={orderIds.indexOf(p.id) <= 0}
                        aria-label="Nach oben" className="grid h-10 w-9 place-items-center rounded-lg border border-white/15 text-white/85 active:scale-95 transition disabled:opacity-30">
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => void move(p.id, "down")} disabled={orderIds.indexOf(p.id) === orderIds.length - 1}
                        aria-label="Nach unten" className="grid h-10 w-9 place-items-center rounded-lg border border-white/15 text-white/85 active:scale-95 transition disabled:opacity-30">
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => void remove(p.id)}
                    className="flex h-10 items-center gap-1.5 rounded-lg border border-red-400/40 px-3 text-[12px] font-black text-red-300 active:scale-95 transition">
                    <Trash2 className="h-3.5 w-3.5" /> {istEntwurf(p.id) ? "Verwerfen" : "Beitrag löschen"}
                  </button>
                  {/* Speichern gilt NUR für diesen Beitrag. */}
                  {/* Solange das Bild noch hochlädt, darf hier NICHT gespeichert werden —
                      sonst ginge nur der Text live und das Bild wäre verloren. */}
                  <button type="button" onClick={() => void apply(p.id)}
                    disabled={!dirtyIds.includes(p.id) || applyingId === p.id || replacingId === p.id}
                    className="lb-onmedia ml-auto flex h-10 items-center gap-1.5 rounded-lg bg-[#1a160f] px-4 text-[13px] font-black text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30">
                    {replacingId === p.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Bild lädt…</>
                      : applyingId === p.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> …</>
                      : appliedId === p.id ? <><Check className="h-3.5 w-3.5" /> Übernommen</>
                      : <><Check className="h-3.5 w-3.5" /> Übernehmen</>}
                  </button>
                </div>
                {dirtyIds.includes(p.id) && (
                  <p className="text-[11px] font-bold text-black/60">
                    {istEntwurf(p.id) ? "Neu — Text schreiben, dann Übernehmen. Erst dann steht er auf der Seite."
                      : p.pending ? "Neues Bild und Text — noch nicht übernommen."
                      : "Noch nicht übernommen."}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vollbild-Vorschau der Slide — Bild/Video groß ansehen. */}
      {zoom && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/95 p-4" onClick={() => setZoom(null)}>
          <button type="button" onClick={() => setZoom(null)} aria-label="Schließen"
            className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white active:scale-95">
            <X className="h-5 w-5" />
          </button>
          {zoom.kind === "video"
            // eslint-disable-next-line jsx-a11y/media-has-caption
            ? <video src={zoom.url} controls autoPlay playsInline onClick={e => e.stopPropagation()} className="max-h-full max-w-full rounded-2xl" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={zoom.url} alt="" onClick={e => e.stopPropagation()} className="max-h-full max-w-full rounded-2xl object-contain" />}
        </div>
      )}

    </div>
  );
}
