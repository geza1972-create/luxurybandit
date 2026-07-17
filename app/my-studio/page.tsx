"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Video, Loader2, Trash2, Lock, Globe, ExternalLink } from "lucide-react";
import { getStoredAuthSession, isSessionExpiring, refreshSession } from "@/lib/supabase-auth-client";

// One media post on the model's own card. Mirrors the server's signed slide shape.
type Slide = {
  id: string; kind: "image" | "video"; title: string; caption: string;
  private: boolean; hidden: boolean; mediaUrl: string; posterUrl: string;
  path: string; posterPath: string; createdAt: string; order: number | null;
};

const normFromServer = (s: any): Slide => ({
  id: String(s?.id ?? ""), kind: s?.kind === "video" ? "video" : "image",
  path: s?.path || "", posterPath: s?.posterPath || "",
  title: s?.title || "", caption: s?.caption || "",
  private: s?.private === true, hidden: s?.hidden === true,
  mediaUrl: s?.mediaUrl || "", posterUrl: s?.posterUrl || "",
  createdAt: s?.createdAt || "", order: typeof s?.order === "number" ? s.order : null,
});

// The real model's OWN upload studio: add photos/videos to her card and mark each public or private
// (private = only her subscribers see it). Very simple, self-serve. Everything saves immediately.
// Access is enforced server-side (/api/bella-carousel) — she can only ever touch her own card.
export default function MyStudioPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "noauth" | "notmodel" | "ready">("loading");
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [busy, setBusy] = useState<"" | "image" | "video" | "save">("");
  const [savedAt, setSavedAt] = useState(0);   // bump to flash "Saved ✓"
  const [err, setErr] = useState("");
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);

  const authH = (t: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });
  const token = () => getStoredAuthSession()?.access_token || "";

  useEffect(() => {
    (async () => {
      try { if (isSessionExpiring()) await refreshSession(); } catch { /**/ }
      const t = token();
      if (!t) { setPhase("noauth"); return; }
      try {
        const d = await fetch("/api/curator?me=1", { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json());
        const c = d?.curator;
        const isModel = c?.id && (c.realModel === true || c.imageSource === "own");
        if (!isModel) { setPhase("notmodel"); return; }
        setMe({ id: c.id, name: c.modelName || c.firstName || "Model" });
        const s = await fetch(`/api/bella-carousel?model=${encodeURIComponent(c.id)}`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json());
        setSlides((s.slides || []).map(normFromServer));
        setPhase("ready");
      } catch { setErr("Could not load your studio."); setPhase("ready"); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the WHOLE library (the only save path). `next` is in stored order (oldest→newest);
  // the server re-numbers `order` by array position, so the public card stays newest-first.
  const save = async (next: Slide[]) => {
    if (!me) return;
    setBusy("save"); setErr("");
    try {
      const payload = next.map((s, i) => ({
        id: s.id, kind: s.kind, path: s.path, posterPath: s.posterPath || undefined,
        title: s.title || undefined, caption: s.caption || undefined,
        hidden: s.hidden, private: s.private, pages: null, order: i, createdAt: s.createdAt,
      }));
      const res = await fetch("/api/bella-carousel", { method: "POST", headers: authH(token()), body: JSON.stringify({ commit: payload, model: me.id }) }).then(r => r.json());
      if (res?.ok) { setSlides((res.slides || []).map(normFromServer)); setSavedAt(Date.now()); }
      else setErr(res?.error || "Could not save.");
    } catch { setErr("Could not save."); }
    finally { setBusy(""); }
  };

  // Upload a file straight to storage (signed PUT), then append it as a new slide and save.
  const addFile = async (file: File | undefined, kind: "image" | "video") => {
    if (!file || !me) return;
    setErr("");
    const okType = kind === "video" ? file.type.startsWith("video/") : file.type.startsWith("image/");
    if (!okType) { setErr(`Please pick a ${kind === "video" ? "video" : "photo"} file.`); return; }
    if (file.size > 250 * 1024 * 1024) { setErr("File too large (max 250 MB)."); return; }
    setBusy(kind);
    try {
      const ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase();
      const sign = await fetch("/api/bella-carousel", { method: "POST", headers: authH(token()), body: JSON.stringify({ sign: true, kind, ext, model: me.id }) }).then(r => r.json());
      if (!sign?.uploadUrl) throw new Error();
      const put = await fetch(sign.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || (kind === "video" ? "video/mp4" : "image/jpeg"), "x-upsert": "true" }, body: file });
      if (!put.ok) throw new Error();
      const fresh: Slide = {
        id: crypto.randomUUID(), kind, path: sign.path, posterPath: "", title: "", caption: "",
        private: false, hidden: false, mediaUrl: URL.createObjectURL(file), posterUrl: "",
        createdAt: new Date().toISOString(), order: null,
      };
      const merged = [...slides, fresh];
      setSlides(merged);        // optimistic — shows instantly
      await save(merged);       // persist + swap in the signed URL
    } catch { setErr("Upload failed. Please try again."); }
    finally { setBusy(""); }
  };

  const setPrivate = (id: string, priv: boolean) => {
    const next = slides.map(s => s.id === id ? { ...s, private: priv } : s);
    setSlides(next); void save(next);
  };
  const setCaption = (id: string, caption: string) => setSlides(prev => prev.map(s => s.id === id ? { ...s, caption } : s));
  const remove = (id: string) => {
    if (!confirm("Delete this post?")) return;
    const next = slides.filter(s => s.id !== id);
    setSlides(next); void save(next);
  };

  // Newest first for the model's view (server stores oldest→newest).
  const view = [...slides].reverse();
  const saving = busy === "save";

  if (phase === "loading") return <div className="grid min-h-[100dvh] place-items-center lb-bg text-white"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>;

  if (phase === "noauth" || phase === "notmodel") {
    return (
      <div className="grid min-h-[100dvh] place-items-center lb-bg px-6 text-center text-white">
        <div className="max-w-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.06]"><Lock className="h-7 w-7 text-amber-400" /></span>
          <h1 className="mt-4 text-xl font-black">My Studio</h1>
          {phase === "noauth" ? (
            <>
              <p className="mx-auto mt-2 max-w-xs text-[13px] font-semibold text-white/60">Sign in with your model account to manage your photos & videos.</p>
              <button type="button" onClick={() => router.push(`/login?returnTo=${encodeURIComponent("/my-studio")}`)} className="lb-gold mt-5 rounded-full px-6 py-3 text-sm font-black active:scale-95">Sign in</button>
            </>
          ) : (
            <>
              <p className="mx-auto mt-2 max-w-xs text-[13px] font-semibold text-white/60">This studio is for LuxuryBandit models. Apply with your own photo — it&apos;s free, and you earn 50% of every subscription.</p>
              <button type="button" onClick={() => router.push("/curators/apply")} className="lb-gold mt-5 rounded-full px-6 py-3 text-sm font-black active:scale-95">Become a model</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] lb-bg text-white" style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }}>
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => router.back()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">My Studio</p>
          <p className="truncate text-[11px] font-bold text-white/45">{me?.name} · {slides.length} {slides.length === 1 ? "post" : "posts"}</p>
        </div>
        {saving ? <span className="flex items-center gap-1 text-[11px] font-black text-white/50"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</span>
          : savedAt ? <span className="text-[11px] font-black text-emerald-400">Saved ✓</span> : null}
        {me && <button type="button" onClick={() => router.push(`/curator/${me.id}`)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15" aria-label="View my profile"><ExternalLink className="h-4 w-4" /></button>}
      </div>

      <div className="mx-auto max-w-md px-5 pt-5">
        {/* Add buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => imgRef.current?.click()} disabled={busy === "image"}
            className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-amber-400/40 bg-amber-400/[0.06] text-amber-300 active:scale-95 transition disabled:opacity-60">
            {busy === "image" ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            <span className="text-[13px] font-black">Add photo</span>
          </button>
          <button type="button" onClick={() => vidRef.current?.click()} disabled={busy === "video"}
            className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-violet-400/40 bg-violet-400/[0.06] text-violet-300 active:scale-95 transition disabled:opacity-60">
            {busy === "video" ? <Loader2 className="h-6 w-6 animate-spin" /> : <Video className="h-6 w-6" />}
            <span className="text-[13px] font-black">Add video</span>
          </button>
        </div>
        <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => { void addFile(e.target.files?.[0], "image"); e.target.value = ""; }} />
        <input ref={vidRef} type="file" accept="video/*" className="hidden" onChange={e => { void addFile(e.target.files?.[0], "video"); e.target.value = ""; }} />
        <p className="mt-2 text-center text-[11px] font-bold text-white/40"><Globe className="mr-1 inline h-3 w-3" /> Public = everyone · <Lock className="mx-1 inline h-3 w-3" /> Private = only your subscribers</p>
        {err && <p className="mt-3 text-center text-[13px] font-bold text-red-400">{err}</p>}

        {/* Slides */}
        {view.length === 0 ? (
          <p className="py-16 text-center text-sm font-bold text-white/40">No posts yet — add your first photo or video above.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {view.map(s => (
              <div key={s.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                <div className="relative aspect-[3/4] w-full bg-black">
                  {s.kind === "video"
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    ? <video src={s.mediaUrl} poster={s.posterUrl || undefined} controls playsInline className="h-full w-full object-cover" />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={s.mediaUrl} alt="" className="h-full w-full object-cover" />}
                  <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-black backdrop-blur ${s.private ? "bg-black/60 text-amber-300 ring-1 ring-amber-300/40" : "bg-emerald-500/80 text-black"}`}>
                    {s.private ? <><Lock className="mr-1 inline h-3 w-3" />Private</> : <><Globe className="mr-1 inline h-3 w-3" />Public</>}
                  </span>
                </div>
                <div className="p-3">
                  <textarea rows={2} value={s.caption} onChange={e => setCaption(s.id, e.target.value)} onBlur={() => void save(slides)}
                    placeholder="Add a caption… (optional)"
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[13px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-white/25" />
                  <div className="mt-2.5 flex items-center gap-2">
                    <button type="button" onClick={() => setPrivate(s.id, false)}
                      className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[12px] font-black transition ${!s.private ? "bg-emerald-500 text-black" : "border border-white/15 text-white/60"}`}>
                      <Globe className="h-3.5 w-3.5" /> Public
                    </button>
                    <button type="button" onClick={() => setPrivate(s.id, true)}
                      className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[12px] font-black transition ${s.private ? "bg-amber-400 text-black" : "border border-white/15 text-white/60"}`}>
                      <Lock className="h-3.5 w-3.5" /> Private
                    </button>
                    <button type="button" onClick={() => remove(s.id)} aria-label="Delete"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-red-300 active:scale-90 transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
