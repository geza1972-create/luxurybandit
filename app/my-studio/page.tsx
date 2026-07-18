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
  source: "admin" | "model" | null; pendingApproval: boolean;
};

const normFromServer = (s: any): Slide => ({
  id: String(s?.id ?? ""), kind: s?.kind === "video" ? "video" : "image",
  path: s?.path || "", posterPath: s?.posterPath || "",
  title: s?.title || "", caption: s?.caption || "",
  private: s?.private === true, hidden: s?.hidden === true,
  mediaUrl: s?.mediaUrl || "", posterUrl: s?.posterUrl || "",
  createdAt: s?.createdAt || "", order: typeof s?.order === "number" ? s.order : null,
  source: s?.source === "admin" || s?.source === "model" ? s.source : null,
  pendingApproval: s?.pendingApproval === true,
});

const ADMIN_PIN_KEY = "luxurybandit-try-look-admin-pin";

// The real model's OWN upload studio: add photos/videos to her card and mark each public or private
// (private = only her subscribers see it). Nothing auto-saves — every change (caption, privacy,
// delete, new upload) stays local until she taps "Save changes". Access is enforced server-side
// (/api/bella-carousel) — she can only ever touch her own card. Admin can also open this AS a
// curator (via admin → "Act as" → Open Studio) — the admin PIN + impersonated id substitute for login.
export default function MyStudioPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "noauth" | "notmodel" | "ready">("loading");
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [dirty, setDirty] = useState(false); // unsaved local changes
  const [busy, setBusy] = useState<"" | "image" | "video" | "save">("");
  const [savedAt, setSavedAt] = useState(0);   // bump to flash "Saved ✓"
  const [err, setErr] = useState("");
  const [credits, setCredits] = useState<number | null>(null); // null = admin mode (unlimited gifts)
  const [publicConfirmId, setPublicConfirmId] = useState<string | null>(null); // slide about to go public
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const adminModeRef = useRef(false);

  const authH = (t: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });
  const token = () => getStoredAuthSession()?.access_token || "";
  // Auth headers for API calls — admin-impersonation uses the PIN, a real model uses her Bearer token.
  const authHeaders = () => adminModeRef.current
    ? { "Content-Type": "application/json", "x-try-look-admin-pin": (() => { try { return localStorage.getItem(ADMIN_PIN_KEY) ?? ""; } catch { return ""; } })() }
    : authH(token());

  useEffect(() => {
    (async () => {
      // Admin "Act as" impersonation: PIN + a curator id stashed in localStorage by the admin panel.
      const pin = (() => { try { return localStorage.getItem(ADMIN_PIN_KEY) ?? ""; } catch { return ""; } })();
      const impersonate = (() => { try { return JSON.parse(localStorage.getItem("lb_curator") ?? "{}"); } catch { return {}; } })();
      if (pin && impersonate?.id) {
        adminModeRef.current = true;
        try {
          const s = await fetch(`/api/bella-carousel?model=${encodeURIComponent(impersonate.id)}`, { headers: { "x-try-look-admin-pin": pin } }).then(r => r.json());
          setMe({ id: impersonate.id, name: impersonate.firstName || "Model" });
          setSlides((s.slides || []).map(normFromServer));
          if (typeof s.studioUploadCredits === "number") setCredits(s.studioUploadCredits);
          setPhase("ready");
        } catch { setErr("Could not load her studio."); setPhase("ready"); }
        return;
      }
      try { if (isSessionExpiring()) await refreshSession(); } catch { /**/ }
      const t = token();
      if (!t) { setPhase("noauth"); return; }
      try {
        const d = await fetch("/api/curator?me=1", { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json());
        const c = d?.curator;
        const isModel = c?.id && (c.realModel === true || c.imageSource === "own");
        if (!isModel) { setPhase("notmodel"); return; }
        setMe({ id: c.id, name: c.modelName || c.firstName || "Model" });
        setCredits(typeof c.studioUploadCredits === "number" ? c.studioUploadCredits : 10);
        const s = await fetch(`/api/bella-carousel?model=${encodeURIComponent(c.id)}`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json());
        setSlides((s.slides || []).map(normFromServer));
        setPhase("ready");
      } catch { setErr("Could not load your studio."); setPhase("ready"); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the WHOLE library — the ONLY persistence path, only fired when SHE taps "Save changes".
  // `next` is in stored order (oldest→newest); the server re-numbers `order` by array position.
  const save = async () => {
    if (!me) return;
    setBusy("save"); setErr("");
    try {
      const payload = slides.map((s, i) => ({
        id: s.id, kind: s.kind, path: s.path, posterPath: s.posterPath || undefined,
        title: s.title || undefined, caption: s.caption || undefined,
        hidden: s.hidden, private: s.private, pages: null, order: i, createdAt: s.createdAt,
        source: s.source ?? undefined, pendingApproval: s.pendingApproval,
      }));
      const res = await fetch("/api/bella-carousel", { method: "POST", headers: authHeaders(), body: JSON.stringify({ commit: payload, model: me.id }) }).then(r => r.json());
      if (res?.ok) {
        setSlides((res.slides || []).map(normFromServer));
        setDirty(false);
        setSavedAt(Date.now());
        // Re-check her remaining upload credits after a new upload was committed.
        if (!adminModeRef.current) {
          const d = await fetch("/api/curator?me=1", { headers: { Authorization: `Bearer ${token()}` } }).then(r => r.json()).catch(() => null);
          if (typeof d?.curator?.studioUploadCredits === "number") setCredits(d.curator.studioUploadCredits);
        }
      }
      else setErr(res?.error || "Could not save.");
    } catch { setErr("Could not save."); }
    finally { setBusy(""); }
  };

  // Upload a file straight to storage (signed PUT), suggest a caption for a photo, then add it
  // as a new LOCAL slide — nothing is persisted until she taps "Save changes".
  const addFile = async (file: File | undefined, kind: "image" | "video") => {
    if (!file || !me) return;
    setErr("");
    if (!adminModeRef.current && credits !== null && credits <= 0) {
      setErr("No upload credits left. Contact LuxuryBandit for more.");
      return;
    }
    const okType = kind === "video" ? file.type.startsWith("video/") : file.type.startsWith("image/");
    if (!okType) { setErr(`Please pick a ${kind === "video" ? "video" : "photo"} file.`); return; }
    if (file.size > 250 * 1024 * 1024) { setErr("File too large (max 250 MB)."); return; }
    setBusy(kind);
    try {
      const ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase();
      const sign = await fetch("/api/bella-carousel", { method: "POST", headers: authHeaders(), body: JSON.stringify({ sign: true, kind, ext, model: me.id }) }).then(r => r.json());
      if (!sign?.uploadUrl) { setErr(sign?.error || "Upload failed. Please try again."); setBusy(""); return; }
      const put = await fetch(sign.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || (kind === "video" ? "video/mp4" : "image/jpeg"), "x-upsert": "true" }, body: file });
      if (!put.ok) throw new Error();
      const id = crypto.randomUUID();
      const fresh: Slide = {
        id, kind, path: sign.path, posterPath: "", title: "", caption: "",
        // Always starts PRIVATE — she (or admin) must deliberately choose Public, which then
        // needs admin review. pendingApproval stays false while private.
        private: true, hidden: false, mediaUrl: URL.createObjectURL(file), posterUrl: "",
        createdAt: new Date().toISOString(), order: null,
        source: adminModeRef.current ? "admin" : "model", pendingApproval: false,
      };
      setSlides(prev => [...prev, fresh]);
      setDirty(true);
      // Best-effort auto-caption for a photo — she can edit or clear it before saving.
      if (kind === "image") {
        fetch("/api/caption-suggest", { method: "POST", headers: authHeaders(), body: JSON.stringify({ path: sign.path }) })
          .then(r => r.json())
          .then(d => { if (d?.caption) setSlides(prev => prev.map(s => s.id === id ? { ...s, caption: d.caption } : s)); })
          .catch(() => {});
      }
    } catch { setErr("Upload failed. Please try again."); }
    finally { setBusy(""); }
  };

  // Going PRIVATE is immediate (no review needed). Going PUBLIC asks for confirmation first —
  // she must acknowledge that admin reviews it before it's actually public.
  const requestPublic = (id: string) => setPublicConfirmId(id);
  const confirmPublic = () => {
    if (!publicConfirmId) return;
    setSlides(prev => prev.map(s => s.id === publicConfirmId ? { ...s, private: false, pendingApproval: true } : s));
    setDirty(true);
    setPublicConfirmId(null);
  };
  const setPrivate = (id: string) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, private: true, pendingApproval: false } : s));
    setDirty(true);
  };
  const setCaption = (id: string, caption: string) => { setSlides(prev => prev.map(s => s.id === id ? { ...s, caption } : s)); setDirty(true); };
  const remove = (id: string) => {
    if (!confirm("Delete this post?")) return;
    setSlides(prev => prev.filter(s => s.id !== id));
    setDirty(true);
  };

  // Newest first for the model's view (server stores oldest→newest).
  const view = [...slides].reverse();
  const saving = busy === "save";

  if (phase === "loading") return <div className="grid min-h-[100dvh] place-items-center lb-bg text-white"><Loader2 className="h-6 w-6 animate-spin text-white/70" /></div>;

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
    <div className="min-h-[100dvh] lb-bg text-white" style={{ paddingBottom: "calc(90px + env(safe-area-inset-bottom))" }}>
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => router.back()} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">My Studio</p>
          <p className="truncate text-[11px] font-bold text-white/65">{me?.name} · {slides.length} {slides.length === 1 ? "post" : "posts"}</p>
        </div>
        {savedAt && !dirty ? <span className="text-[11px] font-black text-emerald-400">Saved ✓</span> : null}
        {me && <button type="button" onClick={() => router.push(`/curator/${me.id}`)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15" aria-label="View my profile"><ExternalLink className="h-4 w-4" /></button>}
      </div>

      <div className="mx-auto max-w-md px-5 pt-5">
        {/* Upload credits — she can't upload unlimited photos/videos. Not shown in admin mode (gifts are unlimited). */}
        {credits !== null && (
          <p className={`mb-3 text-center text-[12px] font-black ${credits <= 0 ? "text-red-400" : "text-white/70"}`}>
            {credits} upload{credits === 1 ? "" : "s"} left
          </p>
        )}
        {/* Add buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => imgRef.current?.click()} disabled={busy === "image" || (credits !== null && credits <= 0)}
            className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-amber-400/40 bg-amber-400/[0.06] text-amber-300 active:scale-95 transition disabled:opacity-40">
            {busy === "image" ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            <span className="text-[13px] font-black">Add photo</span>
          </button>
          <button type="button" onClick={() => vidRef.current?.click()} disabled={busy === "video" || (credits !== null && credits <= 0)}
            className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-violet-400/40 bg-violet-400/[0.06] text-violet-300 active:scale-95 transition disabled:opacity-40">
            {busy === "video" ? <Loader2 className="h-6 w-6 animate-spin" /> : <Video className="h-6 w-6" />}
            <span className="text-[13px] font-black">Add video</span>
          </button>
        </div>
        <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => { void addFile(e.target.files?.[0], "image"); e.target.value = ""; }} />
        <input ref={vidRef} type="file" accept="video/*" className="hidden" onChange={e => { void addFile(e.target.files?.[0], "video"); e.target.value = ""; }} />
        <p className="mt-2 text-center text-[11px] font-bold text-white/60"><Globe className="mr-1 inline h-3 w-3" /> Public = everyone (reviewed first) · <Lock className="mx-1 inline h-3 w-3" /> Private = only your subscribers, live instantly</p>
        {err && <p className="mt-3 text-center text-[13px] font-bold text-red-400">{err}</p>}

        {/* Slides */}
        {view.length === 0 ? (
          <p className="py-16 text-center text-sm font-bold text-white/60">No posts yet — add your first photo or video above.</p>
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
                  {s.source === "admin" && (
                    <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-black backdrop-blur">🎁 Gift from LuxuryBandit</span>
                  )}
                  {s.pendingApproval && (
                    <span className="absolute inset-x-2 bottom-2 rounded-full bg-black/70 px-2.5 py-1 text-center text-[10px] font-black text-amber-300 backdrop-blur">⏳ Pending review — not public yet</span>
                  )}
                </div>
                <div className="p-3">
                  <textarea rows={2} value={s.caption} onChange={e => setCaption(s.id, e.target.value)}
                    placeholder="Add a caption… (optional)"
                    className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[13px] font-semibold text-white outline-none placeholder:text-white/55 focus:border-white/25" />
                  <div className="mt-2.5 flex items-center gap-2">
                    <button type="button" onClick={() => requestPublic(s.id)}
                      className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[12px] font-black transition ${!s.private ? "bg-emerald-500 text-black" : "border border-white/15 text-white/60"}`}>
                      <Globe className="h-3.5 w-3.5" /> Public
                    </button>
                    <button type="button" onClick={() => setPrivate(s.id)}
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

      {/* Sticky Save bar — nothing persists until she taps this. */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/90 p-4 backdrop-blur" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
          <button type="button" disabled={saving} onClick={() => void save()}
            className="lb-gold mx-auto flex h-12 w-full max-w-md items-center justify-center gap-2 rounded-full text-[14px] font-black active:scale-95 transition disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save changes
          </button>
        </div>
      )}

      {/* Confirm before going Public — she must acknowledge it's reviewed first. */}
      {publicConfirmId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4" onClick={() => setPublicConfirmId(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-[#161616] p-5 ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
            <p className="text-base font-black text-white">Make this public?</p>
            <p className="mt-2 text-[13px] font-semibold leading-relaxed text-white/60">
              This will first be reviewed by LuxuryBandit — once approved, it goes public for everyone to see.
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setPublicConfirmId(null)}
                className="h-11 flex-1 rounded-full border border-white/15 text-[13px] font-black text-white active:scale-95 transition">
                Cancel
              </button>
              <button type="button" onClick={confirmPublic}
                className="lb-gold h-11 flex-1 rounded-full text-[13px] font-black active:scale-95 transition">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
