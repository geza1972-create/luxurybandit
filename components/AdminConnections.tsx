"use client";

import { useMemo, useState } from "react";
import { Check, Video, X, Link2, Loader2, Trash2 } from "lucide-react";

type Post = { id?: string; curatorId?: string; lookId?: string; lookName?: string; videoUrl?: string; imageUrl?: string };
type Look = { id: string; name: string; frontImageUrl?: string; imageUrl?: string; videoUrl?: string; category?: string; lingerie?: boolean; featured?: boolean };
type Model = { id: string; firstName?: string; lastName?: string; featured?: boolean };

// Admin: connect a generated VIDEO to a LOOK. For a chosen model, see which looks are a free
// try-on already (a video exists), and attach any generated clip to a look that has none —
// that makes the look a free try-on (look-video fallback, plays for any model).
export default function AdminConnections({ posts, looks, models, onAttach, onDetach }: {
  posts: Post[]; looks: Look[]; models: Model[];
  onAttach: (lookId: string, generationId: string) => Promise<boolean>;
  onDetach: (lookId: string) => Promise<boolean>;
}) {
  const ordered = useMemo(() => [...models].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)), [models]);
  const [modelId, setModelId] = useState<string>(() => ordered.find(m => m.featured)?.id || ordered[0]?.id || "");
  const [filter, setFilter] = useState<"ready" | "missing" | "all">("all");
  const [lingerieOnly, setLingerieOnly] = useState(false);
  const [override, setOverride] = useState<Record<string, "lookvideo" | "none">>({}); // instant reflect after attach/detach
  const [connectFor, setConnectFor] = useState<string>(""); // lookId being connected
  const [busy, setBusy] = useState("");

  const genLooks = useMemo(() => new Set(posts.filter(p => p.curatorId === modelId && p.lookId && p.videoUrl).map(p => p.lookId as string)), [posts, modelId]);
  const modelVideos = useMemo(() => posts.filter(p => p.id && p.videoUrl && p.curatorId === modelId), [posts, modelId]);

  const statusOf = (l: Look): "generated" | "lookvideo" | "none" => {
    if (override[l.id]) return override[l.id];
    return genLooks.has(l.id) ? "generated" : l.videoUrl ? "lookvideo" : "none";
  };

  const rows = useMemo(() => looks
    .filter(l => !lingerieOnly || l.category === "boudoir" || l.lingerie === true)
    .map(l => ({ id: l.id, name: l.name, thumb: l.frontImageUrl || l.imageUrl || l.videoUrl || "", status: statusOf(l) }))
    .filter(r => filter === "all" || (filter === "ready" ? r.status !== "none" : r.status === "none")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [looks, modelId, filter, lingerieOnly, override, genLooks]);

  const readyCount = useMemo(() => {
    const rel = looks.filter(l => !lingerieOnly || l.category === "boudoir" || l.lingerie === true);
    return { ready: rel.filter(l => statusOf(l) !== "none").length, total: rel.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [looks, modelId, lingerieOnly, override, genLooks]);

  const badge = (s: "generated" | "lookvideo" | "none") =>
    s === "generated" ? { t: "Video ✓", c: "bg-emerald-500 text-white" }
    : s === "lookvideo" ? { t: "Look-video", c: "bg-cobalt text-white" }
    : { t: "no video", c: "bg-black/10 text-ink/50" };

  const doAttach = async (lookId: string, genId: string) => {
    setBusy(lookId);
    const ok = await onAttach(lookId, genId).catch(() => false);
    setBusy("");
    if (ok) { setOverride(o => ({ ...o, [lookId]: "lookvideo" })); setConnectFor(""); }
  };
  const doDetach = async (lookId: string) => {
    setBusy(lookId);
    const ok = await onDetach(lookId).catch(() => false);
    setBusy("");
    if (ok) setOverride(o => ({ ...o, [lookId]: "none" }));
  };

  return (
    <section className="rounded-2xl border border-black/8 bg-white p-4">
      <p className="flex items-center gap-1.5 text-sm font-black text-ink"><Video className="h-4 w-4 text-ink/40" /> Try-on connections</p>
      <p className="mt-0.5 text-[11px] font-bold text-ink/45">Attach a generated clip to a look → it becomes a FREE try-on. <b>Video ✓</b> = generated for this model · <b>Look-video</b> = the look&apos;s own clip.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={modelId} onChange={e => setModelId(e.target.value)}
          className="h-9 rounded-lg border border-black/12 bg-black/[0.02] px-3 text-[13px] font-black text-ink outline-none focus:border-black/40">
          {ordered.map(m => <option key={m.id} value={m.id}>{[m.firstName, m.lastName].filter(Boolean).join(" ") || "Model"}{m.featured ? " ★ free" : ""}</option>)}
        </select>
        <div className="flex gap-1 rounded-full bg-black/[0.04] p-1">
          {(["all", "missing", "ready"] as const).map(k => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-black transition ${filter === k ? "bg-black text-white" : "text-ink/50"}`}>
              {k === "ready" ? "Ready" : k === "missing" ? "To connect" : "All"}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setLingerieOnly(v => !v)}
          className={`rounded-full px-2.5 py-1.5 text-[11px] font-black transition ${lingerieOnly ? "bg-black text-white" : "bg-black/[0.06] text-ink/55"}`}>Lingerie only</button>
        <span className="ml-auto text-[12px] font-black text-ink/60">{readyCount.ready}/{readyCount.total} ready</span>
      </div>

      <div className="mt-3 max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[12px] font-bold text-ink/35">Nothing here.</p>
        ) : rows.map(r => {
          const b = badge(r.status);
          return (
            <div key={r.id} className="flex items-center gap-2.5 rounded-xl border border-black/8 bg-white p-2">
              <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.thumb ? <img src={r.thumb} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-ink/20"><X className="h-4 w-4" /></span>}
              </div>
              <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink">{r.name}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${b.c}`}>{r.status === "generated" && <Check className="h-3 w-3" />}{b.t}</span>
              {r.status === "lookvideo" ? (
                <button type="button" disabled={busy === r.id} onClick={() => void doDetach(r.id)} title="Remove the look-video"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-black/10 text-coral disabled:opacity-40 active:scale-95 transition">
                  {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              ) : r.status === "none" ? (
                <button type="button" disabled={busy === r.id} onClick={() => setConnectFor(r.id)} title="Connect a video"
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg bg-cobalt px-2 text-[11px] font-black text-white disabled:opacity-40 active:scale-95 transition">
                  <Link2 className="h-3.5 w-3.5" /> Connect
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Connect picker: pick a generated video for this look. */}
      {connectFor && (
        <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/60 p-3" onClick={() => setConnectFor("")}>
          <div className="w-full max-w-[440px] rounded-2xl bg-white p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-ink">Pick a video for this look</p>
              <button type="button" onClick={() => setConnectFor("")} className="grid h-8 w-8 place-items-center rounded-full bg-black/5"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-0.5 text-[11px] font-bold text-ink/45">Tap the clip that matches this outfit. It becomes the look&apos;s free video.</p>
            {modelVideos.length === 0 ? (
              <p className="py-8 text-center text-[12px] font-bold text-ink/35">This model has no generated videos yet.</p>
            ) : (
              <div className="mt-3 grid max-h-[55vh] grid-cols-3 gap-2 overflow-y-auto">
                {modelVideos.map(p => (
                  <button key={p.id} type="button" disabled={busy === connectFor} onClick={() => void doAttach(connectFor, p.id as string)}
                    className="overflow-hidden rounded-lg border border-black/10 bg-black/5 active:scale-95 transition disabled:opacity-50">
                    <div className="relative aspect-[3/4] w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-ink/20"><Video className="h-5 w-5" /></span>}
                      <span className="absolute right-1 top-1 rounded-full bg-emerald-500 px-1 text-[9px] font-black text-white">🎬</span>
                    </div>
                    <span className="block truncate px-1 py-0.5 text-[9px] font-bold text-ink/55">{p.lookName || "clip"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
