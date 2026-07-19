"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Check } from "lucide-react";

// Das EINFACHE Bella-Werkzeug. Bewusst nur drei Dinge:
// hochladen · Text schreiben · löschen. Kein Modell-Wähler, keine KI, keine Flächen.
//
// Texte werden NICHT automatisch gespeichert — sie gehen erst mit „Übernehmen" live.
// Hochladen und Löschen wirken sofort (die Datei muss ohnehin gespeichert werden).
// Blendet sich für alle außer dem Admin aus.

type Text = { title?: string; caption?: string } | null;
type Post = {
  id: string; kind: "image" | "video"; title: string; caption: string; mediaUrl: string;
  ro?: Text; en?: Text;   // automatisch uebersetzt, nur zur Anzeige
};

export default function BellaSimpleStudio() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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

  const addFile = async (file: File) => {
    setUploading(true); setError("");
    try {
      const kind: "image" | "video" = file.type.startsWith("video") ? "video" : "image";
      const ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase();
      const sign = await fetch("/api/bella-simple", { method: "POST", headers: headers(), body: JSON.stringify({ sign: true, kind, ext }) }).then(r => r.json());
      if (!sign?.uploadUrl) { setError(sign?.error ?? "Upload nicht möglich."); return; }
      const put = await fetch(sign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || (kind === "video" ? "video/mp4" : "image/jpeg"), "x-upsert": "true" },
        body: file,
      });
      if (!put.ok) { setError("Hochladen fehlgeschlagen."); return; }
      const res = await fetch("/api/bella-simple", { method: "POST", headers: headers(), body: JSON.stringify({ add: { kind, path: sign.path, title: "", caption: "" } }) }).then(r => r.json());
      if (!res?.ok) { setError(res?.error ?? "Speichern fehlgeschlagen."); return; }
      await load(true);   // getippte, noch nicht übernommene Texte behalten
    } catch { setError("Hochladen fehlgeschlagen."); }
    finally { setUploading(false); }
  };

  // Texte werden NICHT automatisch gespeichert — erst „Übernehmen" macht sie live.
  const edit = (id: string, patch: Partial<Post>) => {
    setPosts(ps => ps.map(x => x.id === id ? { ...x, ...patch } : x));
    setDirty(true);
  };

  const applyAll = async () => {
    setApplying(true); setError("");
    try {
      const r = await fetch("/api/bella-simple", {
        method: "POST", headers: headers(),
        body: JSON.stringify({ posts: posts.map(p => ({ id: p.id, title: p.title, caption: p.caption })) }),
      });
      if (!r.ok) { setError("Übernehmen fehlgeschlagen."); return; }
      setDirty(false); setApplied(true); setTimeout(() => setApplied(false), 2500);
      await load();   // holt die frisch erzeugten Übersetzungen

    } catch { setError("Netzwerkfehler."); }
    finally { setApplying(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Diesen Beitrag löschen?")) return;
    setPosts(ps => ps.filter(p => p.id !== id));
    try { await fetch("/api/bella-simple", { method: "POST", headers: headers(), body: JSON.stringify({ remove: id }) }); }
    catch { setError("Löschen fehlgeschlagen."); void load(); }
  };

  if (!isAdmin) return null;

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c9a23f]">Nur für dich sichtbar</p>
      <h2 className="mt-1 text-[18px] font-black text-white">Beiträge</h2>
      <p className="mt-0.5 text-[12px] font-semibold text-white/60">Bild oder Video hochladen, Titel und Text dazuschreiben — dann <b className="text-white/80">Übernehmen</b>.</p>

      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) void addFile(f); e.target.value = ""; }} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c9a23f] text-[15px] font-black text-black active:scale-95 transition disabled:opacity-50">
        {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Lädt hoch…</> : <><Plus className="h-4 w-4" /> Beitrag hinzufügen</>}
      </button>

      {error && <p className="mt-2 rounded-lg bg-red-500/15 px-3 py-2 text-[12px] font-bold text-red-300">{error}</p>}

      {loading ? (
        <p className="py-6 text-center text-[12px] font-bold text-white/40">Lädt…</p>
      ) : posts.length === 0 ? (
        <p className="py-6 text-center text-[12px] font-bold text-white/40">Noch keine Beiträge.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {posts.map(p => (
            <div key={p.id} className="flex gap-3 rounded-xl border border-white/10 bg-black/30 p-2">
              <div className="h-24 w-[72px] shrink-0 overflow-hidden rounded-lg bg-black">
                {p.kind === "video"
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  ? <video src={p.mediaUrl} className="h-full w-full object-cover" muted playsInline />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {/* Titel — erscheint GROSS im Bild, z. B. „Bella ist dein Wecker" */}
                <input value={p.title} placeholder="Titel im Bild, z. B. Bella ist dein Wecker"
                  onChange={e => edit(p.id, { title: e.target.value })}
                  className="w-full rounded-lg border border-[#c9a23f]/40 bg-[#c9a23f]/10 px-2.5 py-2 text-[13px] font-black text-white outline-none placeholder:font-semibold placeholder:text-white/35 focus:border-[#c9a23f]" />
                <textarea value={p.caption} rows={2} placeholder="Text darunter (optional)…"
                  onChange={e => edit(p.id, { caption: e.target.value })}
                  className="w-full flex-1 resize-none rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-2 text-[13px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#c9a23f]" />
                {/* Was der Übersetzer daraus gemacht hat — nur zur Kontrolle. */}
                {(p.ro?.title || p.ro?.caption || p.en?.title || p.en?.caption) && (
                  <div className="mt-1 grid gap-1 rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                    {([["RO", p.ro], ["EN", p.en]] as const).map(([label, t]) => (t?.title || t?.caption) ? (
                      <p key={label} className="text-[11px] font-semibold leading-snug text-white/45">
                        <span className="font-black text-[#c9a23f]">{label}</span>{" "}
                        {[t?.title, t?.caption].filter(Boolean).join(" — ").slice(0, 110)}
                      </p>
                    ) : null)}
                  </div>
                )}

                <div className="mt-1.5 flex items-center gap-2">
                  <button type="button" onClick={() => void remove(p.id)}
                    className="ml-auto flex h-7 items-center gap-1 rounded-lg border border-red-400/40 px-2.5 text-[11px] font-black text-red-300 active:scale-95 transition">
                    <Trash2 className="h-3 w-3" /> Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Übernehmen — nichts an den Texten geht live, bevor du hier tippst. */}
      {posts.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <button type="button" onClick={() => void applyAll()} disabled={!dirty || applying}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c9a23f] text-[15px] font-black text-black transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35">
            {applying ? <><Loader2 className="h-4 w-4 animate-spin" /> Übernimmt…</>
              : applied ? <><Check className="h-4 w-4" /> Übernommen</>
              : <><Check className="h-4 w-4" /> Übernehmen</>}
          </button>
          <p className="mt-1.5 text-center text-[11px] font-bold text-white/40">
            {dirty ? "Ungespeicherte Änderungen — erst mit Übernehmen sind sie live."
              : "Alles übernommen."}
          </p>
        </div>
      )}
    </div>
  );
}
