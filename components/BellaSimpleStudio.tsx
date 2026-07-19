"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Check, ImageUp } from "lucide-react";

// Das EINFACHE Bella-Werkzeug. Bewusst nur drei Dinge:
// hochladen · Text schreiben · löschen. Kein Modell-Wähler, keine KI, keine Flächen.
//
// Texte werden NICHT automatisch gespeichert — sie gehen erst mit „Übernehmen" live.
// Hochladen und Löschen wirken sofort (die Datei muss ohnehin gespeichert werden).
// Blendet sich für alle außer dem Admin aus.

type Post = {
  id: string; kind: "image" | "video"; title: string; caption: string; mediaUrl: string;
  // Ein getauschtes Bild/Video, das noch NICHT live ist. Die Datei liegt schon im
  // Speicher (anders geht Hochladen nicht), aber der Beitrag zeigt sie erst nach
  // „Übernehmen". `previewUrl` ist die lokale Vorschau aus der gewählten Datei.
  pending?: { kind: "image" | "video"; path: string; previewUrl: string };
};

// Supabase nimmt pro Datei standardmäßig 50 MB. Lieber vorher sauber melden,
// als den Nutzer minutenlang hochladen lassen und dann abbrechen.
const MAX_MB = 50;

export default function BellaSimpleStudio() {
  // Das Karussell oben wird auf dem Server gebaut. Nach jeder Änderung muss die Seite
  // neu gerendert werden — sonst zeigt die Slide weiter den alten Stand, obwohl
  // gespeichert wurde. Genau das sah aus wie „das Bild wird nicht übernommen".
  const router = useRouter();
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
  const [error, setError] = useState("");
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
      const r = await fetch("/api/bella-simple", { headers: { "x-try-look-admin-pin": pin } });
      if (!r.ok) return;
      const d = await r.json();
      const fresh: Post[] = d.posts ?? [];
      setPosts(prev => keepEdits
        ? fresh.map(f => {
          const local = prev.find(x => x.id === f.id);
          return local ? { ...f, title: local.title, caption: local.caption } : f;
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
    const sign = await fetch("/api/bella-simple", { method: "POST", headers: headers(), body: JSON.stringify({ sign: true, kind, ext: ext || (isVideo ? "mp4" : "jpg") }) }).then(r => r.json());
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

  const addFile = async (file: File) => {
    setUploading(true); setError("");
    try {
      const up = await uploadFile(file);
      if (!up) return;
      const res = await fetch("/api/bella-simple", { method: "POST", headers: headers(), body: JSON.stringify({ add: { ...up, title: "", caption: "" } }) }).then(r => r.json());
      if (!res?.ok) { setError(res?.error ?? "Speichern fehlgeschlagen."); return; }
      await load(true);   // getippte, noch nicht übernommene Texte behalten
      router.refresh();   // Karussell oben neu bauen
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
      const previewUrl = URL.createObjectURL(file);
      setPosts(ps => ps.map(p => {
        if (p.id !== id) return p;
        if (p.pending) URL.revokeObjectURL(p.pending.previewUrl);   // alte Vorschau freigeben
        return { ...p, pending: { ...up, previewUrl } };
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

  // Nur DIESEN einen Beitrag speichern — die anderen bleiben unangetastet.
  const apply = async (id: string) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    setApplyingId(id); setError("");
    try {
      const r = await fetch("/api/bella-simple", {
        method: "POST", headers: headers(),
        // Text UND — falls getauscht — das neue Bild/Video in einem Rutsch.
        body: JSON.stringify({ posts: [{
          id: post.id, title: post.title, caption: post.caption,
          ...(post.pending ? { kind: post.pending.kind, path: post.pending.path } : {}),
        }] }),
      });
      if (!r.ok) { setError("Übernehmen fehlgeschlagen."); return; }
      setDirtyIds(ids => ids.filter(x => x !== id));
      setAppliedId(id); setTimeout(() => setAppliedId(x => (x === id ? "" : x)), 2500);
      if (post.pending) {
        URL.revokeObjectURL(post.pending.previewUrl);
        await load(true);   // frisch signierte Adresse des neuen Bildes holen
      }
      router.refresh();     // Karussell oben zeigt sofort den neuen Stand
    } catch { setError("Netzwerkfehler."); }
    finally { setApplyingId(""); }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Den GANZEN Beitrag löschen — Bild und Text?\n\nNur ein neues Bild? Dann „Bild tauschen“ nehmen.")) return;
    setPosts(ps => ps.filter(p => p.id !== id));
    try {
      await fetch("/api/bella-simple", { method: "POST", headers: headers(), body: JSON.stringify({ remove: id }) });
      router.refresh();
    } catch { setError("Löschen fehlgeschlagen."); void load(); }
  };

  if (!isAdmin) return null;

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c9a23f]">Nur für dich sichtbar</p>
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
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c9a23f] text-[15px] font-black text-black active:scale-95 transition disabled:opacity-50">
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
            <div key={p.id} className="grid gap-2 rounded-xl border border-white/10 bg-black/30 p-2">
              {/* Aufs Bild tippen = neues Bild/Video für DIESEN Beitrag. Text bleibt. */}
              <div>
                <button type="button" disabled={replacingId === p.id}
                  onClick={() => { replaceTarget.current = p.id; replaceRef.current?.click(); }}
                  className={`relative block h-28 w-[84px] overflow-hidden rounded-lg bg-black transition active:scale-95 ${p.pending ? "ring-2 ring-[#c9a23f]" : ""}`}>
                  {/* Nach dem Tauschen die VORSCHAU zeigen — live ist sie erst nach Übernehmen. */}
                  {(p.pending?.kind ?? p.kind) === "video"
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    ? <video src={p.pending?.previewUrl ?? p.mediaUrl} className="h-full w-full object-cover" muted playsInline />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={p.pending?.previewUrl ?? p.mediaUrl} alt="" className="h-full w-full object-cover" />}
                  <span className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 py-1 text-[9px] font-black uppercase tracking-wide ${p.pending ? "bg-[#c9a23f] text-black" : "bg-black/70 text-white"}`}>
                    {replacingId === p.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : p.pending ? "Neu — noch nicht live"
                      : <><ImageUp className="h-3 w-3" /> Tauschen</>}
                  </span>
                </button>
              </div>
              <div className="grid min-w-0 gap-2">
                {/* Titel — erscheint GROSS im Bild, z. B. „Bella ist dein Wecker" */}
                <input value={p.title} placeholder="Titel im Bild, z. B. Bella ist dein Wecker"
                  onChange={e => edit(p.id, { title: e.target.value })}
                  className="h-12 w-full rounded-lg border border-[#c9a23f]/40 bg-[#c9a23f]/10 px-3 text-[15px] font-black text-white outline-none placeholder:text-[13px] placeholder:font-semibold placeholder:text-white/35 focus:border-[#c9a23f]" />
                <textarea value={p.caption} rows={7} placeholder="Text darunter (optional)…"
                  onChange={e => edit(p.id, { caption: e.target.value })}
                  className="w-full resize-y rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2.5 text-[15px] font-semibold leading-relaxed text-white outline-none placeholder:text-[13px] placeholder:text-white/35 focus:border-[#c9a23f]" />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => void remove(p.id)}
                    className="flex h-10 items-center gap-1.5 rounded-lg border border-red-400/40 px-3 text-[12px] font-black text-red-300 active:scale-95 transition">
                    <Trash2 className="h-3.5 w-3.5" /> Beitrag löschen
                  </button>
                  {/* Speichern gilt NUR für diesen Beitrag. */}
                  {/* Solange das Bild noch hochlädt, darf hier NICHT gespeichert werden —
                      sonst ginge nur der Text live und das Bild wäre verloren. */}
                  <button type="button" onClick={() => void apply(p.id)}
                    disabled={!dirtyIds.includes(p.id) || applyingId === p.id || replacingId === p.id}
                    className="ml-auto flex h-10 items-center gap-1.5 rounded-lg bg-[#c9a23f] px-4 text-[13px] font-black text-black transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30">
                    {replacingId === p.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Bild lädt…</>
                      : applyingId === p.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> …</>
                      : appliedId === p.id ? <><Check className="h-3.5 w-3.5" /> Übernommen</>
                      : <><Check className="h-3.5 w-3.5" /> Übernehmen</>}
                  </button>
                </div>
                {dirtyIds.includes(p.id) && (
                  <p className="text-[11px] font-bold text-[#c9a23f]/80">
                    {p.pending ? "Neues Bild und Text — noch nicht übernommen." : "Noch nicht übernommen."}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
